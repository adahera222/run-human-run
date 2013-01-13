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

// liczba punktow trasy, do ktorych gracz jeszcze nie doszedl,
// a ktore chcialby znac
private var knownPathPointsCount = 10;


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
}

function Update () {
	if (Input.GetKeyDown(KeyCode.J) && CanJump()) {
		Jump();
	}
	if (Input.GetKeyDown(KeyCode.Q) && CanDodge()) {
		Dodge(DodgeState.Left);
	} else if (Input.GetKeyDown(KeyCode.E) && CanDodge()) {
		Dodge(DodgeState.Right);
	}
	
	var mobileInputController : MobileInputController = GetComponent(MobileInputController);
	var playerStatus : ThirdPersonStatus = GetComponent(ThirdPersonStatus);
	
	if (mobileInputController.shouldJump() && CanJump()) {
		Jump();
	}
	if (mobileInputController.shouldDodgeLeft() && CanDodge()) {
		Dodge(DodgeState.Left);
	} else if (mobileInputController.shouldDodgeRight() && CanDodge()) {
		Dodge(DodgeState.Right);
	}
	
	var moveBonus = mobileInputController.GetMoveBonus();
	Move(moveBonus);
	playerStatus.AddPoints(Time.deltaTime);
	playerStatus.AddBonusPoints(moveBonus);
	if (targetPoints.Count < knownPathPointsCount) {
		SendMessage("SendNextPoints");
	}
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

// Wykrywane jest, czy kontroler koliduje z podlozem. Jesli tak, to predkosc
// pozioma jest zerowana.
function OnControllerColliderHit (hit : ControllerColliderHit) {
	if (hit.controller.collisionFlags) {
		Land();
	}
	
	// celem debugowania
	if (hit.gameObject.name != "PathPadPrefab(Clone)")
		Debug.Log("HIT FROM BOTTOM: " + hit.gameObject.name);
}

// RUCH W PIONIE

function Jump () {
	vSpeed = Vector3(0.0, initJumpSpeed, 0.0);
}

function Land () {
	vSpeed = Vector3.zero;
}

function CanJump () : boolean {
	return IsTouchingGround() && !IsDodging();
}

function IsJumping () : boolean {
	return !IsTouchingGround();
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
