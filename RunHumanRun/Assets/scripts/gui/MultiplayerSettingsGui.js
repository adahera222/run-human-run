#pragma strict

import System.Collections.Generic;
import rhr_multi;

enum MultiplayerState {
	InitState,
	FindGameState,
	ConnectState,
	ResultState
}

var gSkin : GUISkin;

var backdrop : Texture2D;

var enterNameTex : Texture2D;
var findTex : Texture2D;

var playersTex : Texture2D;

var titleTex : Texture2D;

var maxNickLength = 30;

private var playerNick = "";

var displayMsgTime = 3.0f;
private var displayMsgTimeLeft = 0.0f;

var missingNickMsg = "Enter your nickname";
var availableGames = "Available games:";
var searchingPlayersMsg = "Searching for\navailable players...";
var enemyDCMsg = "Connection lost...";

private var settingsState = MultiplayerState.InitState;

private var backgroundStyle : GUIStyle;

private var titleRatio: float;
private var titleHeight: int;

private var selectedPlayer = "";

var playerButtonHeight = 50;
var playerButtonWidth = 100;

var maxConnectTime = 4.0;
private var currentConnectTime = 0.0;

private var clientServer: ClientServer;
private var buttonSize = 75;
private var nameSize = 50;

private var dcMsgTime = 2.0;
private var currentDcTime = 0.0;

private var gameManager: GameManager;

private var nextScene = "";

function Start() {
	DontDestroyOnLoad(gameObject);
}


function OnGUI () {
	InitValues();
	
	if (settingsState == MultiplayerState.InitState) {
		InitState();
	} else if (settingsState == MultiplayerState.FindGameState) {
		FindGameState();
	} else if (settingsState == MultiplayerState.ConnectState) {
		ConnectState();
	} else if (settingsState == MultiplayerState.ResultState) {
		ResultState();
	} else {
		Debug.LogError("Unknown game state in MultiplayerSettings");
	}
}

function Update () {
	if (nextScene != "") {
		switch (nextScene) {
			case "StartMenu":
				EndMulti();
				Application.LoadLevel("StartMenu");
				break;
			case "Chase":
				Application.LoadLevel("Chase");
				break;
			case "GameOverSingle":
				clientServer.Destroy();
				EndMulti();
				Application.LoadLevel("GameOverSingle");
				break;
			default:
				Debug.LogWarning("MultiplayerSettingsGUI: Unknow scene");
		}
		nextScene = "";
	}
}

function InitValues () {
	if (gSkin) {
		GUI.skin = gSkin;
	}
	else {
		Debug.Log("MultiPlayerSettingsGUI: GUI Skin object missing!");
	}
	
	titleRatio = titleTex.width / (Screen.width - 20.0f);
	titleHeight = 300.0f * titleRatio;
	
	if (!backgroundStyle) {
		backgroundStyle = new GUIStyle();
	}
	backgroundStyle.normal.background = backdrop;
}

function InitState () {
	if (Input.GetKey(KeyCode.Escape)) {
		nextScene = "StartMenu";
		//Application.LoadLevel("StartMenu");
		//EndMulti();
	}
	
	ShowBackground();
	
	var nextItemPosY = 110 + titleHeight;
	GUI.Label(Rect((Screen.width - enterNameTex.width) / 2, nextItemPosY, enterNameTex.width, enterNameTex.height*2), enterNameTex);
	
	nextItemPosY += 100;
	playerNick = GUI.TextField(Rect((Screen.width / 2 - enterNameTex.width), nextItemPosY, enterNameTex.width*2, enterNameTex.height*2), playerNick, maxNickLength);
	
	nextItemPosY += 100;
	if (GUI.Button(Rect((Screen.width / 2 - findTex.width), nextItemPosY, findTex.width*2, findTex.height*2), findTex)) {
		if (playerNick != "") {
			settingsState = MultiplayerState.FindGameState;
			selectedPlayer = "";
			
			var clientServerObject = GameObject.Find("ClientServer");
			clientServer = clientServerObject.GetComponent("ClientServer") as ClientServer;
			if (clientServer == null)
				Debug.LogError("clientServer is null in MultiplayerSettings");
			clientServer.Init(playerNick);
		} else {
			displayMsgTimeLeft = displayMsgTime;
		}
	}
	
	if (displayMsgTimeLeft > 0.0f) {
		displayMsgTimeLeft -= Time.deltaTime;
		GUI.Box(Rect(Screen.width / 4, 10, Screen.width / 2, 110), missingNickMsg);
	}
}

function FindGameState () {
	if (Input.GetKey(KeyCode.Escape)) {
		settingsState = MultiplayerState.InitState;
		return;
	}
	
	ShowBackground();
	
	if (clientServer.IsDuringGame()) {
		var audioListener = GetComponent("AudioListener") as AudioListener;
		audioListener.enabled = false;
		settingsState = MultiplayerState.ConnectState;
		//Application.LoadLevel("Chase");
		nextScene = "Chase";
		return;
	}
	
	var sessions = clientServer.GetSessions();
	
	if (sessions.Count > 0) {
		var namePos = (Screen.height / 4);
		GUI.Button(Rect(10, namePos, (Screen.width-20), nameSize), availableGames);
		
		for (var nameObj in sessions) {
			var name = nameObj as String;
			namePos += nameSize;
			var nick = clientServer.FoundNameToNick(name) as String;
			if (GUI.Button(new Rect(10, namePos, (Screen.width-20), nameSize), nick)) {	
				clientServer.JoinSession(name);
			}
		}
	}
	else {
		GUI.Box(Rect(Screen.width / 4, Screen.height / 4, Screen.width / 2, 2 * nameSize), searchingPlayersMsg);
	}
}

function ConnectState () {
	// sami zrywamy polaczenie
	if (Input.GetKey(KeyCode.Escape)) {
		//Application.LoadLevel("GameOverSingle");
		nextScene = "GameOverSingle";
	}
	
	GUI.skin = null;
	
	if (gameManager == null) {
		var gameManagerObj = GameObject.Find("GameManager");
		if (gameManagerObj != null) {
			gameManager = gameManagerObj.GetComponent("GameManager") as GameManager;
		}
	} else {
		// przeciwnik zerwal polaczenie
		if (!gameManager.IsDuringGame()) {
			//ShowBackground();
			currentDcTime += Time.deltaTime;
			GUI.Box(Rect(Screen.width / 4, Screen.height / 4, Screen.width / 2, nameSize), enemyDCMsg);
			if (currentDcTime > dcMsgTime) {
				currentDcTime = 0.0;
				EndMulti();
				nextScene = "GameOverSingle";
				//Application.LoadLevel("GameOverSingle");
			}
		}
	}
	
	/*
	// debug, w razie ostatecznosci
	var logText = (gameManager != null) ? gameManager.GetLog() : "";
	GUI.TextArea(new Rect (0, 0, Screen.width, (Screen.height / 2)), logText);
	*/
	
	/*
	if (currentConnectTime < maxConnectTime) {
		var connectingMsg = "Connecting to\n" + selectedPlayer;
		GUI.Box(Rect(Screen.width / 4, Screen.height / 2 - 50, Screen.width / 2, 100), connectingMsg);
	} else if (currentConnectTime < 2 * maxConnectTime) {
		var unableMsg = "Unable to connect to\n" + selectedPlayer;
		GUI.Box(Rect(Screen.width / 4, Screen.height / 2 - 50, Screen.width / 2, 100), unableMsg);
	} else {
		selectedPlayer = "";
		settingsState = MultiplayerState.FindGameState;
	}
	currentConnectTime += Time.deltaTime;*/
}

function ResultState() {
	ShowBackground();
	
	var resultsMsg = "Results after round " + gameManager.GetRoundNr() + ".";
	GUI.Label(Rect(10, buttonSize, (Screen.width-20), buttonSize), resultsMsg);
	
	var playerMsg = gameManager.GetPlayerNick() + ": " + gameManager.GetPlayerPoints();
	GUI.Button(Rect(10, 2 * buttonSize + 10, (Screen.width-20), buttonSize), playerMsg);
	
	var enemyMsg = gameManager.GetEnemyNick() + ": " + gameManager.GetEnemyPoints();
	GUI.Button(Rect(10, 3 * buttonSize + 10, (Screen.width-20), buttonSize), enemyMsg);
	
	var nextRoundMsg = "Next round";
	GUI.Button(Rect(10, 2 * buttonSize + 10, (Screen.width-20), buttonSize), nextRoundMsg);
}

function ShowBackground () {
	GUI.Label( Rect( (Screen.width - (Screen.height * 2)) * 0.75, 0, Screen.height * 2, Screen.height), "", backgroundStyle);
	GUI.Label(Rect(10, 50, Screen.width - 20, titleHeight), titleTex);
}

function GetRectForPlayer (y : int) : Rect {
	return Rect((Screen.width / 2 - playerButtonWidth / 2), y,
					    playerButtonWidth, playerButtonHeight);
}

function EndMulti() {
	var clientServerObj = GameObject.Find("ClientServer");
	var allJoynAgentObj = GameObject.Find("AllJoynAgent");
	
	if (clientServerObj != null) {
		Destroy(clientServerObj);
	}
	if (allJoynAgentObj != null) {
		Destroy(allJoynAgentObj);
	}
	
	Destroy(gameObject);
}