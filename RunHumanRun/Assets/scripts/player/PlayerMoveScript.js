// Skrypt obslugujacy ruch postaci gracza

#pragma strict

import System.Collections.Generic;


// TRASA

// punkt sciezki, do ktorego w danej chwili dazy gracz
var targetPoint: Vector3;
// lista kolejnych punktow trasy, pierwszy na liscie to aktualny cel
var targetPoints = new List.<Vector3>();

// czy maja byc rysowane w scenie linie ulatwiajace debugowanie
var debugDraw = true;

// RUCH WZDLUZ TRASY

// poczatkowy kierunek, w ktorym zwrocony jest gracz
var initDirection = Vector3.forward;

// predkosc na poczatku
var initSpeed = 2.5;
// predkosc maksymalna
var maxSpeed = 5.0;
// przyspieszenie
var acceleration = 0.3;
// aktualna predkosc gracza
private var speed = 0.0;
// szybkosc zmiany kata ruchu
var angleAcceleration = 0.03;

// ZDERZENIA

// wspolczynnik kary za dotkniecie przeszkody
var hitPenealty = 2.0;


// RUCH W PIONIE

// sila grawitacji
var gravity = 10.0;
// szybkosc od razu po wyskoku
var initJumpSpeed = 5.0;
// szybkosc w pionie (najpierw wznoszenia, potem spadania)
private var vSpeed = Vector3.zero;
// czy osiagnal szczyt podczas skoku
private var jumpingReachedApex = false;


// UNIKI

// Enumerator sluzacy do opisu, czy postac jest w trakcie uniku i jesli tak,
// to w ktora strone unika
enum DodgeState {
	Straight,
	Left,
	Right
}

// maksymalny zasieg uniku
var maxDodgeRange = 2.0;
// zasieg aktualnego uniku
private var currentDodgeRange = 0.0;
// czas trwania uniku
var maxDodgeTime = 1.0;
// czas trwania aktualnego uniku
private var currentDodgeTime: float;
// czy jest unik i jesli tak, to w ktora strone
private var currentDodgeState = DodgeState.Straight;

private var isJumping = false;

private var gameManager: GameManager;

/*****************************************************************************/
/*****************************************************************************/

function Awake () {
	transform.LookAt(transform.position + initDirection);
	targetPoint = transform.position;
	speed = initSpeed;
}

function Start () {
	var playerStatus : ThirdPersonStatus = GetComponent(ThirdPersonStatus);
	playerStatus.SetUp();
	var gameManagerObj = GameObject.Find("GameManager");
	gameManager = gameManagerObj.GetComponent("GameManager") as GameManager;
}

function Update () {
	if (!HasAnyTarget()) {
		return;
	}
	var playerInput = GetPlayerInput();

	if (IsJumping() && IsTouchingGround()) {
		isJumping = false;
		SendMessage("DidLand", SendMessageOptions.DontRequireReceiver);
	}

	if (playerInput.isJumping && CanJump()) {
		Jump();
	}
	if (playerInput.isDodgingLeft && CanDodge()) {
		Dodge(DodgeState.Left);
	} else if (playerInput.isDodgingRight && CanDodge()) {
		Dodge(DodgeState.Right);
	}
	
	if (ShouldSendInput(playerInput)) {
		SendInput(playerInput);
	}
	if (ShouldSendPos()) {
		SendPos();
	}
	
	var playerStatus : ThirdPersonStatus = GetComponent(ThirdPersonStatus);
	var mobileInputController : MobileInputController = GetComponent(MobileInputController);
	var moveBonus = mobileInputController.GetMoveBonus() + playerStatus.GetMoveBonus();;
	Move(moveBonus);
	playerStatus.AddPoints(Time.deltaTime);
	playerStatus.AddBonusPoints(moveBonus);
}

function GetPlayerInput() : PlayerInputState {
	if (ShouldGetInputDirectly()) {
		// jednoczesna obsluga dla klawiatury i telefonu
		var mobileInputController : MobileInputController = GetComponent(MobileInputController);
		var isJumping = Input.GetKeyDown(KeyCode.J) || mobileInputController.shouldJump();
		var isDodgingLeft = Input.GetKeyDown(KeyCode.Q) || mobileInputController.shouldDodgeLeft();
		var isDodgingRight = Input.GetKeyDown(KeyCode.E) ||  mobileInputController.shouldDodgeRight();
		return  PlayerInputState(isJumping, isDodgingLeft, isDodgingRight);
		
	} else if (ShouldGenerateInput()) {
		return GenerateInput();
		
	} else { // ShouldGetInputFromServer
		return gameManager.GetEnemyInput();
	}
}

function SendInput(input: PlayerInputState) {
	//Debug.Log("Send nonempty input = " + input.isJumping + "|" + input.isDodgingLeft + "|" + input.isDodgingRight);
	var clientServerObj = GameObject.Find("ClientServer");
	if (clientServerObj == null) {
		Debug.LogError("PlayerMoveScript: unable to find second player proxy");
	} else {
		var clientServer = clientServerObj.GetComponent("ClientServer") as ClientServer;
		var packed = PlayerInputState.Pack(input.isJumping, input.isDodgingLeft, input.isDodgingRight);
		clientServer.SendPlayerInput(packed);
	}
}

function ShouldSendInput(input: PlayerInputState) : boolean {
	return ShouldGetInputDirectly() &&
			   !gameManager.IsSinglePlayerGame() &&
			   input != PlayerInputState.Empty();
}

function SendPos() {
	var clientServerObj = GameObject.Find("ClientServer");
	if (clientServerObj == null) {
		Debug.LogError("PlayerMoveScript: unable to find second player proxy");
	} else {
		var clientServer = clientServerObj.GetComponent("ClientServer") as ClientServer;
		var pos = new double[3];
		pos[0] = transform.position[0];
		pos[1] = transform.position[1];
		pos[2] = transform.position[2];
		clientServer.SendPlayerPos(pos);
	}
}

function ShouldSendPos() : boolean {
	return !gameManager.IsSinglePlayerGame() &&
			   !gameManager.IsDummyPlayer(gameObject);
}

// Czy pobrac wejscie bezposrednio od gracza
function ShouldGetInputDirectly() : boolean {
	return !ShouldGenerateInput() && !ShouldGetInputFromServer();
}

// Czy pobrac wejscie od postaci sterowanej przez komputer
function ShouldGenerateInput() : boolean {
	return gameManager.IsSinglePlayerGame() && gameManager.IsComputerControlled(gameObject);
}

// Czy pobrac wejscie od polaczonego gracza
function ShouldGetInputFromServer() : boolean {
	return !gameManager.IsSinglePlayerGame() && gameManager.IsDummyPlayer(gameObject);
}

// Wejscie od postaci sterowanej przez komputer
function GenerateInput() : PlayerInputState {
	return PlayerInputState(true, false, false);
}

function HasAnyTarget() : boolean {
	return targetPoints.Count > 1;
}

// Aktualizacja listy kolejnych punktow sciezki
function UpdateTargets (targets: List.<Vector3>) {
	for (var point in targets) {
		targetPoints.Add(point);
	}
	targetPoint = targetPoints[0];
}

// Funkcja zmieniajaca wspolrzedna y punktu sciezki na
// rowna wspolrzednej y aktualnego polozenia gracza
function NormalizeTargetPoint(point: Vector3) {
	var normalizedPoint = point;
	normalizedPoint.y = transform.position.y;
	return normalizedPoint;
}

// Funkcja przemieszczajaca gracza, dokonuje ewentualnej aktualizacji
// celu ruchu.
function Move (bonusSpeed: float) {
	// "normalizacja" celu => przeniesienie go na te sama wysokosc, co gracz
	var normalizedTargetPoint = NormalizeTargetPoint(targetPoint);
	// roznica miedzy aktualnym polozeniem a "znormalizowanym" celem
	var transl = normalizedTargetPoint - transform.position;
	
	// automatyczne przyspieszenie
	speed = Mathf.Lerp(speed, maxSpeed + bonusSpeed, Time.deltaTime * acceleration);
	
	// zmiana celu tak dlugo, az cel jest wystarczajaco daleko, czyli
	// okolo sekundy ruchu z aktualna predkoscia od gracza
	while (transl.magnitude < speed) {
		targetPoints.RemoveAt(0);
		normalizedTargetPoint = NormalizeTargetPoint(targetPoints[0]);
		transl = normalizedTargetPoint - transform.position;
	}
	targetPoint = targetPoints[0];
	
	// jesli gracz wykonuje unik, to nalezy cel przemiescic tak, aby gracz
	// byl odpowiednio odwrocony
	if (IsDodging()) {
		targetPoint = GetTargetPointWithDodge(targetPoint);
	}
	
	// jesli gracz nie skacze, to nastepuje aktualizacja kierunku ruchu
	if (!IsJumping()) {
		var prevRot = transform.rotation;
		var rot = prevRot;
		rot.SetLookRotation(transl);
		transform.rotation = Quaternion.Slerp(prevRot, rot, angleAcceleration);
	}
	else if (!jumpingReachedApex && vSpeed.y <= 0.0) {
		jumpingReachedApex = true;
	}
	
	// wyznaczanie ruchu
	var prevPos = transform.position;
	var movement = transform.rotation * (speed * Vector3.forward * Time.deltaTime);
	
	// ruch uwzgledniajacy ruch w pionie
	ApplyGravity();
	movement = movement + Time.deltaTime * vSpeed;
	
	// aktualizacja parametrow unikania i korekta kierunku, jesli
	// gracz jest w trakcie uniku
	if (ShouldEndDodge()) {
		EndDodge();
	} else if (IsDodging()) {
		ApplyDodge();
		movement = GetMovementWithDodge(movement);
	}
	
	var controller : CharacterController = GetComponent(CharacterController);
	controller.Move(movement);
	
	if (debugDraw) {
		Debug.DrawLine(prevPos - Vector3(0, 0.4, 0), transform.position - Vector3(0, 0.4, 0), Color.red, 10000.0);
	}
}

// ZDERZENIA

function IsTouchingGround () : boolean {
	var controller : CharacterController = GetComponent(CharacterController);
	return (controller.collisionFlags & CollisionFlags.Below) != 0;
}

// Zmniejszenie predkosci w wyniku uderzenia gracza w przeszkode.
function SlowDown(obstacleMass: float) {
	var totalMass = obstacleMass + transform.rigidbody.mass;
	var slowFactor = (transform.rigidbody.mass / totalMass) / hitPenealty;
	speed = slowFactor * speed;
}

// RUCH W PIONIE

function Jump () {
	jumpingReachedApex = false;
	isJumping = true;
	vSpeed = Vector3(0.0, initJumpSpeed, 0.0);
}

function Land () {
	vSpeed = Vector3.zero;
}

function CanJump () : boolean {
	return IsTouchingGround() && !IsDodging();
}

function IsJumping () : boolean {
	return isJumping;
}

function ApplyGravity () {
	vSpeed.y -= gravity * Time.deltaTime;
}

// Aktualizacja stanu zwiazanego ze skokiem i obliczenie predkosci
// po skoku (sumarycznej z predkoscia w pionie)
function GetMovementWithJump(movement: Vector3) {
	ApplyGravity();
	return movement + Time.deltaTime * vSpeed;
}

// UNIKI

function Dodge (dodgeState: DodgeState) {
	currentDodgeState = dodgeState;
	currentDodgeRange = 0.0;
	currentDodgeTime = 0.0;
	if (dodgeState == DodgeState.Left) {
		SendMessage("DodgeLeft", SendMessageOptions.DontRequireReceiver);
	} else {
		SendMessage("DodgeRight", SendMessageOptions.DontRequireReceiver);
	}
	
}

function ShouldEndDodge () : boolean {
	return currentDodgeTime >= maxDodgeTime;
}

function EndDodge () {
	currentDodgeState = DodgeState.Straight;
	currentDodgeRange = 0.0;
	currentDodgeTime = 0.0;
}

function CanDodge () : boolean {
	return IsTouchingGround();
}

function IsDodging () : boolean {
	return currentDodgeState != DodgeState.Straight;
}

// Aktualizacja parametrow uniku
function ApplyDodge () {
	currentDodgeTime += Time.deltaTime;
	var normalizedCurrentTime = currentDodgeTime / maxDodgeTime;
	if (normalizedCurrentTime < 0.5) {
		currentDodgeRange = Mathf.Lerp(0, maxDodgeRange, 2 * normalizedCurrentTime);
	} else {
		currentDodgeRange = Mathf.Lerp(0, maxDodgeRange, 2 * (1 - normalizedCurrentTime));
	}
}

// Obliczenie skladowej wektora predkosci odpowiadajacej przesunieciu
// wynikajacemu z aktualnego uniku
function GetDodgeVector(movement: Vector3) : Vector3 {
	var dodgeVector: Vector3;
	if (!IsDodging()) {
		dodgeVector = movement;
	} else {
		var rotationAngle = (currentDodgeState == DodgeState.Right) ? 90 : -90;
		var dodgeRotation = Quaternion.AngleAxis(rotationAngle, Vector3.up);
		dodgeVector = dodgeRotation * movement;
		dodgeVector.Normalize();
		dodgeVector *= Time.deltaTime * currentDodgeRange;
	}
	return dodgeVector;
}

// Zsumowanie wektora predkosci z wektorem przesuniecia uniku
// i zwrocenie znormalizowanej (do aktualnej predkosci) wersji
function GetMovementWithDodge (movement: Vector3) : Vector3 {
	var dodgeVector = GetDodgeVector(movement);
	var resultVector = movement + dodgeVector;
	// krok opcjonalny, zapobiega skracaniu drogi na zakretach przy unikaniu
	resultVector *=  movement.magnitude/ resultVector.magnitude;
	return resultVector;
}

// Obliczenie punktu celu zmodyfikowanego przez unik
function GetTargetPointWithDodge (targetPoint: Vector3) : Vector3 {
	var prevDirection = transform.rotation * Vector3.forward;
	var dodgeVector = GetDodgeVector(prevDirection) / Time.deltaTime;
	return targetPoint + dodgeVector;
}


function GetSpeed () {
	return speed;
}

function GetMaxSpeed () {
	return maxSpeed;
}

function HasJumpReachedApex ()
{
	return jumpingReachedApex;
}