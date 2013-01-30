// Skrypt obslugujacy kolizje przeszkod na trasie z graczem

#pragma strict

// Sa dwie wersje obslugi ekslplozji: moja intuicyjna oraz wykorzystujaca
// eksplozje.

var hitSpeed = 5.0;
var acceleration = 15;

private var currentSpeed = Vector3.zero;
private var targetSpeed: Vector3;
private var apexReached = false;
private var flightTime = 2.0;

private var wasHit = false;
private var hitTime : float;

function Start () {
}

function Update () {
	updateExploImpl();
}

function updateExploImpl () {
	if (wasHit) {
		collider.attachedRigidbody.useGravity = Time.time - hitTime > flightTime;
	}
}

function updateMyImpl () {
	if (targetSpeed != Vector3.zero) {
		var currentFlightTime: float;
		
		if (!apexReached) {
			currentFlightTime = acceleration * Time.deltaTime + currentSpeed.magnitude / targetSpeed.magnitude;
			currentSpeed = Vector3.Lerp(currentSpeed, targetSpeed, currentFlightTime) ;
			apexReached = currentSpeed == targetSpeed;
		} else {
			collider.attachedRigidbody.useGravity = true;
			currentFlightTime = 1 - Time.deltaTime - currentSpeed.magnitude / targetSpeed.magnitude;
			currentSpeed = Vector3.Lerp(currentSpeed, Vector3.zero, currentFlightTime);
		}
									
		transform.position += Time.deltaTime * currentSpeed;
		
		if (apexReached && currentSpeed == Vector3.zero)
			targetSpeed = Vector3.zero;
	}
}

function OnTriggerEnter (other : Collider) {
	exploImpl(other);
	//myImpl(other);
	var controller : PlayerMoveSingle = other.GetComponent(PlayerMoveSingle);
	if (controller != null) {
		controller.SlowDown(transform.rigidbody.mass);
	}
	
}

function exploImpl (other : Collider) {
	if(other.CompareTag("Player")) {
		var explosionCenter = other.transform.position;
		explosionCenter.y = collider.transform.position.y;
		collider.attachedRigidbody.AddExplosionForce(500.0, explosionCenter, 3.0, 0.3);
		
		wasHit = true;
		hitTime = Time.time;
	}
}

function myImpl (other : Collider) {
	// kolizja z kladka
	if (other.transform.position.y < transform.position.y)
		return;
	
	targetSpeed = hitSpeed * transform.position - other.transform.position;
	targetSpeed.y = Mathf.Max( Mathf.Abs(targetSpeed.x), Mathf.Abs(targetSpeed.z) );
	currentSpeed = Vector3.zero;
	
	Debug.Log(targetSpeed);

	apexReached = false;
}