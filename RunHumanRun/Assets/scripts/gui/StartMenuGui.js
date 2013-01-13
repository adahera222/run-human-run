@script ExecuteInEditMode()

var gSkin : GUISkin;

var backdrop : Texture2D;

var buttonSingleTex : Texture2D;
var buttonMultiTex : Texture2D;
var buttonQuitTex : Texture2D;

var titleTex : Texture2D;

private var isLoading = false;

function OnGUI()
{
	if (gSkin) {
		GUI.skin = gSkin;
	}
	else {
		Debug.Log("StartMenuGUI: GUI Skin object missing!");
	}
	
	var titleRatio : float = titleTex.width / (Screen.width - 20.0f);
	var titleHeight : int = 300.0f * titleRatio;
	
	var backgroundStyle : GUIStyle = new GUIStyle();
	backgroundStyle.normal.background = backdrop;
	GUI.Label( Rect( (Screen.width - (Screen.height * 2)) * 0.75, 0, Screen.height * 2, Screen.height), "", backgroundStyle);
	GUI.Label(Rect(10, 50, Screen.width - 20, titleHeight), titleTex);
	//GUI.matrix = Matrix4x4.TRS(Vector3(0, 0, 0), Quaternion.identity, Vector3.one * 1.5f;
	
	var nextItemPosY = 110 + titleHeight;
	if (GUI.Button(Rect((Screen.width / 2 - buttonSingleTex.width), nextItemPosY, buttonSingleTex.width*2, buttonSingleTex.height*2), buttonSingleTex)) {
		isLoading = true;
		Application.LoadLevel("sc1");
	}
	
	nextItemPosY += 100;
	if (GUI.Button(Rect((Screen.width / 2 - buttonMultiTex.width), nextItemPosY, buttonMultiTex.width*2, buttonMultiTex.height*2), buttonMultiTex)) {
		isLoading = true;
		//TODO
	}
	
	nextItemPosY += 100;
	var isWebPlayer = (Application.platform == RuntimePlatform.OSXWebPlayer || Application.platform == RuntimePlatform.WindowsWebPlayer);
	if ( ! isWebPlayer ) {
		if (GUI.Button(Rect((Screen.width / 2 - buttonQuitTex.width), nextItemPosY, buttonQuitTex.width * 2, buttonQuitTex.height * 2), buttonQuitTex)) {
			Application.Quit();
		}
	}
	
	if (isLoading) {
		GUI.Label(Rect((Screen.width / 2) - 110, (Screen.height / 2) - 60, 400, 70), "Loading...", "mainMenuTitle");
	}
}