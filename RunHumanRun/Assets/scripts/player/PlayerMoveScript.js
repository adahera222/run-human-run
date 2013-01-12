// Skrypt obslugujacy ruch postaci gracza

#pragma strict

import System.Collections.Generic;

// Enumerator sluzacy do opisu, czy postac jest w trakcie uniku i jesli tak,
// to w ktora strone unika
enum DodgeState {
	Straight,
	Left,
	Right
}

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

// sila grawitacji
var gravity = 10.0;
// szybkosc od razu po wyskoku
var initJumpSpeed = 5.0;
// szybkosc w pionie (najpierw wznoszenia, potem spadania)
private var vSpeed = Vector3.zero;

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


// punkt sciezki, do ktorego w danej chwili dazy gracz
var targetPoint: Vector3;
var targetPoints = new List.<Vector3>();

// wspolczynnik kary za dotkniecie przeszkody
var hitPenealty = 2.0;

// czy maja byc rysowane w scenie linie ulatwiajace debugowanie
var debugDraw = true;

// liczba punktow trasy, do ktorych gracz jeszcze nie doszedl,
// a ktore chcialby znac
private var knownPathPointsCount = 10;

/*****************************************************************************/
/*****************************************************************************/

function Awake () {
	transform.LookAt(transform.position + initDirection);
	targetPoint = transform.position;
	speed = initSpeed;
}

function Start () {
}

function Update () {
	if (Input.GetKeyDown(KeyCode.J) && canJump()) {
		Jump();
	}
	if (Input.GetKeyDown(KeyCode.Q) && canDodge()) {
		Dodge(DodgeState.Left);
	} else if (Input.GetKeyDown(KeyCode.E) && canDodge()) {
		Dodge(DodgeState.Right);
	}
	Move();
	if (targetPoints.Count < knownPathPointsCount) {
		SendMessage("SendNextPoints");
	}
}

function Jump () {
	vSpeed = Vector3(0.0, initJumpSpeed, 0.0);
}

function Land () {
	vSpeed = Vector3.zero;
}

function canJump () : boolean {
	return isTouchingGround() && !isDodging();
}

function isJumping () : boolean {
	return !isTouchingGround();
}

function ApplyGravity () {
	vSpeed.y -= gravity * Time.deltaTime;
}

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

function canDodge () : boolean {
	return isTouchingGround();
}

function isDodging () : boolean {
	return currentDodgeState != DodgeState.Straight;
}

function ApplyDodge () {
	var pNR = currentDodgeTime / maxDodgeTime;
	currentDodgeTime += Time.deltaTime;
	var normalizedCurrentTime = currentDodgeTime / maxDodgeTime;
	if (pNR <= 0.5 && normalizedCurrentTime > 0.5) {
		Debug.Log("ZMIANA");
	}
	if (normalizedCurrentTime < 0.5) {
		currentDodgeRange = Mathf.Lerp(0, maxDodgeRange, 2 * normalizedCurrentTime);
	} else {
		currentDodgeRange = Mathf.Lerp(0, maxDodgeRange, 2 - 2 * normalizedCurrentTime);
	}
	
	return pNR <= 0.5 && normalizedCurrentTime > 0.5;
}

function GetDodgeVector(movement: Vector3) : Vector3 {
	var dodgeVector: Vector3;
	if (!isDodging()) {
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

function GetMovementWithDodge (movement: Vector3) : Vector3 {
	var dodgeVector = GetDodgeVector(movement);
	var resultVector = movement + dodgeVector;
	// krok opcjonalny, zapobiega skracaniu drogi na zakretach przy unikaniu
	resultVector *=  movement.magnitude/ resultVector.magnitude;
	return resultVector;
}

function GetTargetPointWithDodge (targetPoint: Vector3) : Vector3 {
	var prevDirection = transform.rotation * Vector3.forward;
	var dodgeVector = GetDodgeVector(prevDirection);
	Debug.Log("DV: " + dodgeVector);
	Debug.Log("x: " + dodgeVector.x + ", y: " + dodgeVector.y + ", z: " + dodgeVector.z);
	return targetPoint + dodgeVector;
}

function isTouchingGround () : boolean {
	var controller : CharacterController = GetComponent(CharacterController);
	return (controller.collisionFlags & CollisionFlags.Below) != 0;
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
function normalizeTargetPoint(point: Vector3) {
	var normalizedPoint = point;
	normalizedPoint.y = transform.position.y;
	return normalizedPoint;
}

// Funkcja przemieszczajaca gracza, dokonuje ewentualnej aktualizacji
// celu ruchu.
function Move () {
	var normalizedTargetPoint = normalizeTargetPoint(targetPoint);
	var transl = normalizedTargetPoint - transform.position;
	speed = Mathf.Lerp(speed, maxSpeed, Time.deltaTime * acceleration);
	
	while (transl.magnitude < speed) {
		targetPoints.RemoveAt(0);
		normalizedTargetPoint = normalizeTargetPoint(targetPoints[0]);
		transl = normalizedTargetPoint - transform.position;
	}
	targetPoint = targetPoints[0];
	
	if (isDodging()) {
		//Debug.Log("PRE: " + targetPoint);
		targetPoint = GetTargetPointWithDodge(targetPoint);
		//Debug.Log("POST: " + targetPoint);
	}
	
	if (!isJumping() && transl != Vector3.zero) {
		var prevRot = transform.rotation;
		var rot = prevRot;
		rot.SetLookRotation(transl);
		transform.rotation = Quaternion.Slerp(prevRot, rot, angleAcceleration);
	}
	
	var prevPos = transform.position;
	var movement = transform.rotation * (speed * Vector3.forward * Time.deltaTime);
	var movementWithJump = GetMovementWithJump(movement);
	
	if (ShouldEndDodge()) {
		EndDodge();
		Debug.Log("DODGE END");
	} else if (isDodging()) {
		var x = ApplyDodge();
		if (x && debugDraw) {
			Debug.DrawLine(transform.position, targetPoint, Color.blue, 100);
		}
		movementWithJump = GetMovementWithDodge(movementWithJump);
	}
	
	var controller : CharacterController = GetComponent(CharacterController);
	controller.Move(movementWithJump);
	
	if (debugDraw) {
		Debug.DrawLine(prevPos - Vector3(0, 0.4, 0), transform.position - Vector3(0, 0.4, 0), Color.red, 10000.0);
	}
}

// Aktualizacja stanu zwiazanego ze skokiem i obliczenie predkosci
// po skoku (sumarycznej z predkoscia w pionie)
function GetMovementWithJump(movement: Vector3) {
	ApplyGravity();
	return movement + Time.deltaTime * vSpeed;
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

function GetSpeed () {
	return speed;
}

function GetMaxSpeed () {
	return maxSpeed;
}
