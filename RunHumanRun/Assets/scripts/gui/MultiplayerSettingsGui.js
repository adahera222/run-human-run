#pragma strict

import System.Collections.Generic;
import rhr_multi;

enum MultiplayerState {
	InitState,
	FindGameState,
	ConnectState
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
var searchingPlayersMsg = "Searching for available players...";

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

private var gameManager: GameManager;


function OnGUI () {
	InitValues();
	
	if (settingsState == MultiplayerState.InitState) {
		ShowBackground();
		InitState();
	} else if (settingsState == MultiplayerState.FindGameState) {
		ShowBackground();
		FindGameState();
	} else if (settingsState == MultiplayerState.ConnectState) {
		ConnectState();
	} else {
		Debug.LogError("Unknown game state in MultiplayerSettings");
	}
}

function InitValues () {
	DontDestroyOnLoad(gameObject);
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
	if (clientServer.IsDuringGame()) {
		Application.LoadLevel("Chase");
		settingsState = MultiplayerState.ConnectState;
		return;
	}
	
	var sessions = clientServer.GetSessions();
	var i = 0;
	var namePos = (Screen.height / 2)+10+ ((i++) * buttonSize);
	
	if (sessions.Count > 0) {
		for (var nameObj in sessions) {
			var name = nameObj as String;
			namePos = (Screen.height / 2)+10+((i++) * buttonSize);
			var nick = clientServer.FoundNameToNick(name) as String;
			if (GUI.Button(new Rect(10, namePos, (Screen.width-20), buttonSize), nick)) {	
				clientServer.JoinSession(name);
			}
		}
	}
	else {
		GUI.Box(Rect(Screen.width / 4, 100, Screen.width / 2, 110), searchingPlayersMsg);
	}
}

function ConnectState () {
	GUI.skin = null;
	
	if (gameManager == null) {
		var gameManagerObj = GameObject.Find("GameManager");
		if (gameManagerObj != null) {
			gameManager = gameManagerObj.GetComponent("GameManager") as GameManager;
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

function ShowBackground () {
	GUI.Label( Rect( (Screen.width - (Screen.height * 2)) * 0.75, 0, Screen.height * 2, Screen.height), "", backgroundStyle);
	GUI.Label(Rect(10, 50, Screen.width - 20, titleHeight), titleTex);
}

function GetRectForPlayer (y : int) : Rect {
	return Rect((Screen.width / 2 - playerButtonWidth / 2), y,
					    playerButtonWidth, playerButtonHeight);
}