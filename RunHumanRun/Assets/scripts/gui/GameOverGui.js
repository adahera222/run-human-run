@script ExecuteInEditMode()

var background : GUIStyle;
var gameOverText : GUIStyle;

var backdrop : Texture2D;

var gameOverScale = 1.5;

function OnGUI()
{
	background.normal.background = backdrop;
	GUI.Label(Rect((Screen.width - (Screen.height * 2)) * 0.75, 0, Screen.height * 2, Screen.height), "", background);
	
	GUI.matrix = Matrix4x4.TRS(Vector3(0, 0, 0), Quaternion.identity, Vector3.one * gameOverScale);
	GUI.Label(Rect((Screen.width / (2 * gameOverScale)) - 250, (Screen.height / (2 * gameOverScale)) - 40, 300, 100), 
		"Game Over. You have collected\n" + ThirdPersonStatus.GetPoints() + " points.", 
		gameOverText);
}