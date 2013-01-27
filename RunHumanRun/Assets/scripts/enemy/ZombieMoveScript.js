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
// czy osiagnal szczyt podczas skoku
private var jumpingReachedApex = false;

private var isJumping = false;

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
	if (targetPoints.Count <= 1) {
		return;
	}

	if (IsJumping() && IsTouchingGround()) {
		isJumping = false;
		SendMessage("DidLand", SendMessageOptions.DontRequireReceiver);
	}
	
	Move();
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
function Move () {
	// "normalizacja" celu => przeniesienie go na te sama wysokosc, co gracz
	var normalizedTargetPoint = NormalizeTargetPoint(targetPoint);
	// roznica miedzy aktualnym polozeniem a "znormalizowanym" celem
	var transl = normalizedTargetPoint - transform.position;
	
	// automatyczne przyspieszenie
	speed = Mathf.Lerp(speed, maxSpeed, Time.deltaTime * acceleration);
	
	// zmiana celu tak dlugo, az cel jest wystarczajaco daleko, czyli
	// okolo sekundy ruchu z aktualna predkoscia od gracza
	while (transl.magnitude < speed) {
		targetPoints.RemoveAt(0);
		normalizedTargetPoint = NormalizeTargetPoint(targetPoints[0]);
		transl = normalizedTargetPoint - transform.position;
	}
	targetPoint = targetPoints[0];
	
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
	return IsTouchingGround();
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