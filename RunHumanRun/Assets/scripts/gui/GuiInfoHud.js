// This script handles the in-game HUD

var guiSkin: GUISkin;
var nativeVerticalResolution = 1200.0;

// the lives count is displayed in the health image as a text counter
var pointsOffset = Vector2(10, 10);

private var playerInfo : ThirdPersonStatus;

// Cache link to player's state management script for later use.
function Awake()
{
	playerInfo = FindObjectOfType(ThirdPersonStatus);

	if (!playerInfo)
		Debug.Log("No link to player's state manager.");
}

function OnGUI ()
{

	var points = playerInfo.GetPoints();

	// Set up gui skin
	GUI.skin = guiSkin;

	// Our GUI is laid out for a 1920 x 1200 pixel display (16:10 aspect). The next line makes sure it rescales nicely to other resolutions.
	GUI.matrix = Matrix4x4.TRS (Vector3(0, 0, 0), Quaternion.identity, Vector3 (Screen.height / nativeVerticalResolution, Screen.height / nativeVerticalResolution, 1)); 

	// Displays lives left as a number.	
	DrawLabelUpLeftAligned( pointsOffset, "points: " + points.ToString() );	
}

function DrawLabelUpLeftAligned (pos: Vector2, text: String) {
	GUI.Label(Rect (pos.x, pos.y, 300, 100), text);
}