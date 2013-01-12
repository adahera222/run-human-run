#pragma strict

var mainCamera: Camera;
var secondCamera: Camera;

var mainActive = true;

function Start () {
	secondCamera.enabled = !mainActive;
	mainCamera.enabled = mainActive;
}

function Update () {
	if (Input.GetKeyDown(KeyCode.C)) {
		mainActive = !mainActive;
		mainCamera.enabled = mainActive;
		secondCamera.enabled = !mainActive;
	}
	
}