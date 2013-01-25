#pragma strict

import System.Collections.Generic;

private var playerNick: String;

function Start() {
	//var connector: GameObject = GameObject.Find("Connector");
	//clientServer = connector.GetComponent("ClientServer") as ClientServer;
}

function LateUpdate() {
    if (Application.platform == RuntimePlatform.Android) {
		if (Input.GetKey(KeyCode.Escape)) {
			Application.LoadLevel("StartMenu");
		}
	}
}

function InitConnections (name: String) {
	playerNick = name;
	//clientServer.Init(playerNick);
}

function GetWaitingPlayers () : List.<String> {
	var waitingPlayers = new List.<String>();
	//waitingPlayers = clientServer.GetNames();
	//waitingPlayers.Add("Michalek");
	//waitingPlayers.Add("LOLA");
	return waitingPlayers;
}