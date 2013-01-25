#pragma strict

var initHeight = 10.0;
var speed = 10.0;

function Start () {
	var gameManagerObj = GameObject.Find("GameManager");
	var gameManager = gameManagerObj.GetComponent("GameManager") as GameManager;
	var player = gameManager.GetPlayer();
	if (!player) {
		Debug.LogError("Observator camera unable to find player");
	}
	transform.position = player.transform.position + Vector3(0.0, initHeight, 0.0);
	transform.LookAt(player.transform);
	
}

function Update () {
	if (camera.enabled) {
		var h = Input.GetAxisRaw("Horizontal");
		var v = Input.GetAxisRaw("Vertical");
		
		var normSpeed = Time.deltaTime * speed;
		if (h < -0.5)
			transform.Translate(normSpeed * Vector3.left);
		else if (h > 0.5)
			transform.Translate(normSpeed * Vector3.right );
		
		if (v < -0.5)
			transform.Translate(normSpeed * Vector3.down);
		else if (v > 0.5)
			transform.Translate(normSpeed * Vector3.up);
	}
}