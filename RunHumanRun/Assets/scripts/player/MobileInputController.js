var canJump = true;

var smoothSensor = false;

var speedBonusFactor : float = 2.0f;

// czy ma skakac
private var doJump = false;
// czy ma robic unik w lewo
private var doDodgeLeft = false;
// czy ma robic unik w prawo
private var doDodgeRight = false;
// bonus predkosciowy za szuranie palcami
private var moveBonus : float = 0.0;

// The last collision flags returned from controller.Move
private var collisionFlags : CollisionFlags; 

private var lastDodgeTime = -1.0;
private var betweenDodgePeriod = 1.0;
private var canDodge = true;

private var AccelerometerUpdateInterval : float = 1.0 / 60.0;
private var LowPassKernelWidthInSeconds : float = 1.0;

// wygladzanie wejscia sensora (usuniecie jitteringu)
private var LowPassFilterFactor : float = AccelerometerUpdateInterval / LowPassKernelWidthInSeconds; // tweakable
private var lowPassValue : Vector3 = Vector3.zero;
private var accelerometerEdge = 0.30;
private var tmpX : float = 0.0;
private var tmpZ : float = 0.0;

// input z sensorow telefonu
// czy gracz musi wyprostowac telefon z powrotem do powycji poziomej (po skoku)
private var hasToReturnPostionAfterJump : boolean = false;
// granica, jak bardzo gracz musi wyprostowac telefon po skoku
private var jumpBackEdge : float = -0.2;
// granica, jak bardzo gracz musi przechylic do siebie telefon, by wykonac skok
private var jumpUpEdge : float = -0.5;

// czy gracz musi wyprostowac telefon po wykonaniu uniku w lewa strone
private var hasToReturnPositionAfterTurnLeft : boolean = false;
// czy gracz musi wyprostowac telefon po wykonaniu uniku w prawa strone
private var hasToReturnPositionAfterTurnRight : boolean = false;
// jak bardzo gracz musi wyprostowac telefon po wykonaniu uniku z lewej strony, (by moc wykonywac kolejne akcje zwiazane z unikami)
private var turnBackFromLeftEdge : float = 0.2;
// jak bardzo gracz musi wyprostowac telefon po wykonaniu uniku z prawej strony, -//-
private var turnBackFromRightEdge : float = -turnBackFromLeftEdge;
// jak bardzo gracz musi przechylic/przesunac telefon w ktoras ze stron by wykonac unik
private var turnEdge : float = 0.7f;
// podczas unikow nie mozna za bardzo przechylac telefonu na bok!!
private var turnAngleEdge : float = -0.7f;
// maksymalny kat nachylenia telefonu na bok, by skok mogl sie wykonac. Chodzi o to, by przypadkiem nie skakac podczas robienia uniku.
private var jumpSideMaxAngle : float = 0.3f;

private var startedLeg : boolean = false;
private var leftLegTurn : boolean = true;
private var halfWidth : int = Screen.width / 2;
private var lastTouchPos : Vector2;
private var movingFingerId : int;
private var maxMoveBonus : int = 100;
private var actualMoveBonus : int = 0;

function Start () {
	lowPassValue = Input.acceleration;
}

function LowPassFilterAccelerometer() : Vector3 {
	lowPassValue = new Vector3(Mathf.Lerp(lowPassValue.x, Input.acceleration.x, LowPassFilterFactor),
								Mathf.Lerp(lowPassValue.y, Input.acceleration.y, LowPassFilterFactor),
								0);
	
	return lowPassValue;
}

// x odpowiada za skoki, -0.6 lub mniej oznacza skok. Po skoku należy wrócić do przynajmniej -0.2 (aby móc wykonać ponowny skok). Skręt w lewo do 0.6, w prawo do 0.6. Powrót analogicznie.
// pozniej jeszcze pomysle, co lepiej (czy przechylenia, czy ruchy posuwiczne), na razie będzie to i to
function Update() {
	var dir : Vector3 = Vector3.zero;

	// we assume that the device is held parallel to the ground
	// and the Home button is in the right hand

	// remap the device acceleration axis to game coordinates:
	//  1) XY plane of the device is mapped onto XZ plane
	//  2) rotated 90 degrees around Y axis
	if (smoothSensor) {
		dir.x = LowPassFilterAccelerometer().y;
		dir.z = -LowPassFilterAccelerometer().x;
		dir.y = LowPassFilterAccelerometer().z;
	}
	else {
		dir.x = Input.acceleration.y;
		dir.z = -Input.acceleration.x;
		dir.y = Input.acceleration.z;
	}
	
	// jumping
	if (hasToReturnPostionAfterJump) {
		if (dir.x > jumpBackEdge) {
			hasToReturnPostionAfterJump = false;
		}
	}
	else if (dir.x < jumpUpEdge && Mathf.Abs(dir.z) < jumpSideMaxAngle) {
		hasToReturnPostionAfterJump = true;
		Debug.Log("skacze!!!!!!!!!!!");
		doJump = true;
	}
	
	// turning
	if (hasToReturnPositionAfterTurnLeft) {
		if (dir.z < turnBackFromLeftEdge) {
			hasToReturnPositionAfterTurnLeft = false;
		}
	}
	else if (hasToReturnPositionAfterTurnRight) {
		if (dir.z > turnBackFromRightEdge) {
			hasToReturnPositionAfterTurnRight = false;
		}
	}

	if ( ! canDodge && Time.time > lastDodgeTime + betweenDodgePeriod) {
		canDodge = true;
	}
	if (canDodge && Mathf.Abs(dir.z) > turnEdge && dir.y < turnAngleEdge) {
		if (dir.z < 0.0f) {
			hasToReturnPositionAfterTurnLeft = true;
			Debug.Log("skreca w lewo!!!!!!");
			canDodge = false;
			lastDodgeTime = Time.time;
			doDodgeRight = false;
			doDodgeLeft = true;
		}
		else {
			hasToReturnPositionAfterTurnRight = true;
			Debug.Log("skreca w prawo!!!!!!");
			canDodge = false;
			lastDodgeTime = Time.time;
			doDodgeRight = true;
			doDodgeLeft = false;
		}
	}
	
	
//	if (dir.x > tmpX + accelerometerEdge ||
//		dir.x < tmpX - accelerometerEdge ||
//		dir.z > tmpZ + accelerometerEdge ||
//		dir.z < tmpZ - accelerometerEdge) {
//		Debug.Log("new value x z i trzecie = " + dir.x + ", " + dir.z + " i " + Input.acceleration.z);
//		tmpX = dir.x;
//		tmpZ = dir.z;
//	}
	
	// wspolrzedne musza byc w podobnym miejscu co poprzednie i delta musi razem osiagnac -100, wspolrzedne y-owe musza byc tez po odpowiedniej stronie		
	moveBonus = 0.0;
	for (var touch : Touch in Input.touches) {
		//Debug.Log("touch state " + touch.phase + " " + touch.fingerId + " " + touch.position);
		if (startedLeg) {
			if (movingFingerId == touch.fingerId) {
				moveBonus = (touch.position.y <= lastTouchPos.y) ? lastTouchPos.y - touch.position.y : 0.0;
				actualMoveBonus = Mathf.Min(actualMoveBonus + moveBonus, maxMoveBonus);
				lastTouchPos = touch.position;
				//Debug.Log("move coords " + touch.position + " " + touch.deltaPosition);
				
				if (actualMoveBonus == maxMoveBonus || touch.phase == TouchPhase.Ended || touch.phase == TouchPhase.Canceled) {
					startedLeg = false;
					//Debug.Log("started leg changed to false " + actualMoveBonus + " " + touch.fingerId + " for leg left ? " + !leftLegTurn);
				}
			}
		}
		else if (leftLegTurn) {
			if (IsInLeftSide(touch.position)) {
				movingFingerId = touch.fingerId;
				startedLeg = true;
				//Debug.Log("started leg changed to true and right leg turn");
				actualMoveBonus = 0;
				leftLegTurn = !leftLegTurn;
				lastTouchPos = touch.position;
			}
		}
		else {
			if ( ! IsInLeftSide(touch.position) ) {
				movingFingerId = touch.fingerId;
				startedLeg = true;
				actualMoveBonus = 0;
				leftLegTurn = !leftLegTurn;
				lastTouchPos = touch.position;
				//Debug.Log("started leg changed to true and left leg turn");
			}
		}
	}
}

function shouldJump() {
	var tmp = doJump;
	doJump = false;
	return tmp;
}

function shouldDodgeLeft() {
	var tmp = doDodgeLeft;
	doDodgeLeft = false;
	return tmp;
}

function shouldDodgeRight() {
	var tmp = doDodgeRight;
	doDodgeRight = false;
	return tmp;
}

function GetMoveBonus() {
	var tmp = moveBonus;
	moveBonus = 0.0;
	return tmp * speedBonusFactor;
}

function IsInLeftSide(pos : Vector2)
{
	//Debug.Log("is in left side? : " + pos + " " + (pos.x < halfWidth));
	return pos.x < halfWidth;
}

function IsGrounded () {
	return (collisionFlags & CollisionFlags.CollidedBelow) != 0;
}

function Reset ()
{
	gameObject.tag = "Player";
}
// Require a character controller to be attached to the same game object
@script RequireComponent(CharacterController)
@script AddComponentMenu("FPS/Third Person Controller")