#pragma strict

import System.Collections.Generic;
import client_server;

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
	GUI.skin = null;
	
	if (clientServer.IsDuringGame()) {
		Application.LoadLevel("Chase");
		settingsState = MultiplayerState.ConnectState;
		return;
	}
	
	if (clientServer.GetChatText() != null) {
		GUI.TextArea(new Rect (0, 0, Screen.width, (Screen.height / 2)), clientServer.GetChatText());
	}
	var i = 0;
	var xStart = (Screen.height / 2)+10+ ((i++) * buttonSize);
	var isAllJoynStarted = clientServer.isAllJoynStarted();
	
	if (isAllJoynStarted) {
		if (GUI.Button(new Rect(0,xStart,(Screen.width)/3, buttonSize), "STOP ALLJOYN")) {	
			clientServer.CloseDown();
		}
	}
	
	if (clientServer.HasJoinedSession() != null) {
		if (GUI.Button(new Rect(((Screen.width)/3),xStart,(Screen.width)/3, buttonSize),
			"Leave \n"+ clientServer.GetConnectedPlayerName())) {
			clientServer.LeaveSession();
		}
	}
	
	if (!isAllJoynStarted) {
		if (GUI.Button(new Rect(((Screen.width)/3)*2,xStart,(Screen.width)/3, buttonSize), "START ALLJOYN")) {	
			clientServer.StartUp();
		}
	}
	
	for (var nameObj in clientServer.GetSessions()) {
		var name = nameObj as String;
		xStart = (Screen.height / 2)+10+((i++)*buttonSize);
		var nick = clientServer.FoundNameToNick(name) as String;
		if (GUI.Button(new Rect(10,xStart,(Screen.width-20), buttonSize), nick)) {	
			clientServer.JoinSession(name);
		}
	}
	
	/*
	msgText = GUI.TextField(new Rect (0, Screen.height-buttonSize, (Screen.width/4) * 3, buttonSize), msgText);
	if (GUI.Button(new Rect(Screen.width - (Screen.width/4),Screen.height-buttonSize, (Screen.width/4), buttonSize),"Send"))
	{	
		ArrayList points = new ArrayList();
		points.Add(new Vector3(1.0f, 2.0f, 3.0f));
		points.Add(new Vector3(-1.0f, 0.0f, 200.0f));
		points.Add(new Vector3(-93.2f, 23.99f, 200.99f));
		basicChat.SendVector(points);
		//basicChat.SendTheMsg(msgText);
	}
	*/
	/*
	var nextItemPosY = 110 + titleHeight;
	GUI.Label(Rect((Screen.width - playersTex.width) / 2, nextItemPosY, playersTex.width, playersTex.height*2), playersTex);
	
	var multiplayerSettings : MultiPlayerSettings = GetComponent(MultiPlayerSettings);
	var waitingPlayers = multiplayerSettings.GetWaitingPlayers();
	
	for (waitingPlayer in waitingPlayers) {
		nextItemPosY += 100;
		if (GUI.Button(GetRectForPlayer(nextItemPosY), waitingPlayer)) {
			selectedPlayer = waitingPlayer;
			settingsState = MultiplayerState.ConnectState;
			currentConnectTime = 0.0;
		}
	}
	*/
}

function ConnectState () {
	GUI.skin = null;
	
	if (gameManager == null) {
		var gameManagerObj = GameObject.Find("GameManager");
		if (gameManagerObj != null) {
			gameManager = gameManagerObj.GetComponent("GameManager") as GameManager;
		}
	}
	var logText = (gameManager != null) ? gameManager.GetLog() : "";
	GUI.TextArea(new Rect (0, 0, Screen.width, (Screen.height / 2)), logText);
/*	if (currentConnectTime < maxConnectTime) {
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