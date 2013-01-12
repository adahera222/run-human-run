// Skrypt obslugujacy ruch postaci gracza

#pragma strict

import System.Collections.Generic;

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
var maxDodgeRange = 0.5;
// szerokosc aktualnego uniku
private var currentDodgeSize = 0.0;
// czas trwania uniku
var maxDodgeTime = 1.0;
// czas trwania aktualnego uniku
private var currentDodgeTime;


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
	return isTouchingGround();
}

function isJumping () : boolean {
	return !isTouchingGround();
}

function ApplyGravity () {
	vSpeed.y -= gravity * Time.deltaTime;
}

function Dodge (right: boolean) {
	// TODO
}

function canDodge () {

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
	
	if (!isJumping() && transl != Vector3.zero) {
		var prevRot = transform.rotation;
		var rot = prevRot;
		rot.SetLookRotation(transl);
		transform.rotation = Quaternion.Slerp(prevRot, rot, angleAcceleration);
	}

	var prevPos = transform.position;
	var movement = transform.rotation * (speed * Vector3.forward * Time.deltaTime);
	var movementWithJump = GetMovementWithJump(movement);
	
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
