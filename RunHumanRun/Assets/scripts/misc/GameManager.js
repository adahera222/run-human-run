#pragma strict

import client_server;

// numer gracza: jesli gra czlowiek vs komputer, to czlowiek jest graczem nr 1,
// jesli gra czlowiek vs czlowiek, to graczem nr 1 jest ten gracz, do ktorego gry
// dolaczyl sie drugi gracz
private var playerNr: int;
// numer rundy: runda pierwsza: I gracz goni II, runda druga: II gracz goni I
private var roundNr: int;
// czy jest to gra single player
private var isSinglePlayer: boolean;

function Awake() {
	var clientServerObj = GameObject.Find("AllJoynClientServer");
	if (clientServerObj == null) {
		isSinglePlayer = true;
		playerNr = 1;
	} else {
		isSinglePlayer = false;
		var clientServer = clientServerObj.GetComponent("AllJoynClientServer") as AllJoynClientServer;
		playerNr = clientServer.GetPlayerNr();
	}
	StartGame();
}

function Start () {
}

function Update () {
}

function GetPlayerNr(nr: int) : int {
	return playerNr;
}

function StartGame() {
	roundNr = 1;
}

function NextRound() {
	roundNr += 1;
}

function AmIHuman() : boolean {
	return roundNr % 2 == playerNr % 2;
}

function GetHuman() : GameObject {
	return GameObject.Find("Human");
}

function GetZombie() : GameObject {
	return GameObject.Find("Zombie");
}

function GetPlayer() : GameObject {
	return AmIHuman() ? GetHuman() : GetZombie();
}

function GetEnemy() : GameObject {
	return AmIHuman() ? GetZombie() : GetHuman();
}

function IsSinglePlayerGame() : boolean {
	return isSinglePlayer;
}