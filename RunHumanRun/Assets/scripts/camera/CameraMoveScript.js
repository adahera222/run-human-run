#pragma strict

// INTRO

// czy intro jest jeszcze odtwarzane
var introPlaying = true;
var introLookAtZombieTime: float;
var introTurnStateTime: float;
private var lookAtZombieAngle: float = 180f;
private var introTime: float;
private var stepTurnOverAngle: float;

private var player: Transform;

var height: float;
private var offset: Vector3;

// sredni kat pochlenia glowy
var inclineAngle = 30;

// skok glowy podczas biegu i czestosc tego ruchu
var maxHeadJump = 0.1; 
var maxJumpFrequency = 10.0;

private var headJump: float;
private var jumpFrequency: float;

private var angle = 0.0;

private var hasJustLanded = false;

private var gameManager: GameManager;


function Start () {
	lookAtZombieAngle = 180f;
	introTime = introLookAtZombieTime + introTurnStateTime;
	stepTurnOverAngle = lookAtZombieAngle / introTurnStateTime;
	var gameManagerObj = GameObject.Find("GameManager");
	gameManager = gameManagerObj.GetComponent("GameManager") as GameManager;
	player = gameManager.GetPlayer().transform;
	offset = Vector3(0.0, height + 2.0, -3.0);//0.5);
	transform.position = player.position + offset;
	transform.rotation = player.rotation;
}

function ShouldMoveHead() {
	var playerMoveScript : PlayerMoveScript = player.GetComponent(PlayerMoveScript);
	return !playerMoveScript.IsJumping();
}

function LateUpdate () {
	transform.position = player.position;
	transform.rotation = player.rotation;
	
	var playerMove : PlayerMoveScript = player.GetComponent(PlayerMoveScript);
	var moveFactor = playerMove.GetSpeed() / playerMove.GetMaxSpeed();
	headJump = moveFactor * maxHeadJump;
	jumpFrequency = moveFactor * maxJumpFrequency;
	
	
	if (ShouldMoveHead()) {
		angle += jumpFrequency * Time.deltaTime;
	} else {
		angle = Mathf.Lerp(angle, Mathf.PI, 0.1);
	}
	
	if (angle > 2 * Mathf.PI) {
		angle -= 2 * Mathf.PI;
	}
	
	transform.Translate(offset + Vector3(0, headJump * Mathf.Sin(angle), 0));
	if (introPlaying) {
		if (Time.time < introLookAtZombieTime) {
			transform.Rotate(inclineAngle, lookAtZombieAngle, 0);
		} else if (Time.time < introTime) {
			transform.Rotate(inclineAngle, stepTurnOverAngle*(introTime-Time.time), 0);
		} else {
			introPlaying = false;	
			
		}
	} else {
		transform.Rotate(inclineAngle, 0, 0);
	}
}
