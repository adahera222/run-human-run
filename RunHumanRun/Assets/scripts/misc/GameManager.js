#pragma strict

import rhr_multi;

// numer gracza: jesli gra czlowiek vs komputer, to czlowiek jest graczem nr 1,
// jesli gra czlowiek vs czlowiek, to graczem nr 1 jest ten gracz, do ktorego gry
// dolaczyl sie drugi gracz
private var playerNr: int;
// numer rundy: runda pierwsza: I gracz goni II, runda druga: II gracz goni I
private var roundNr: int;
// czy jest to gra single player
private var isSinglePlayer: boolean;

private var clientServer: ClientServer;

private var log = "";

function Awake() {
	var clientServerObj = GameObject.Find("ClientServer");
	if (clientServerObj == null) {
		isSinglePlayer = true;
		playerNr = 1;
	} else {
		isSinglePlayer = false;
		clientServer = clientServerObj.GetComponent("ClientServer") as ClientServer;
		playerNr = clientServer.GetPlayerNr();
	}
	StartGame();
}

function Start () {
	log = "Player pos: " + GetPlayer().transform.position + "\n" + log;
}

function GetLog() {
	return log;
}

// do debugowania
function Update () {
	if (!IsSinglePlayerGame() && clientServer.HasEnvData())
	{
		var data = clientServer.GetEnvData();
		var tmp = "";
		for (var i = 0; i < 15; i ++) {
			tmp = tmp + "d[" + i + "]=" + data[i] + " | ";
			if (i % 5 == 4)
				log = tmp + "\n" + log;
		}
		GetFirstProxy().UpdateState(data);
	}
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

// uzyteczne jedynie w trybie multi
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

function IsObjGenerating(obj: GameObject) : boolean {
	if (isSinglePlayer) {
		return obj == GetHuman();
	} else {
		var isThisPlayerGenerating = AmIHuman();
		return isThisPlayerGenerating && obj == GetHuman();
	}
}

function IsProxyObjGenerating(obj: GameObject) : boolean {
	return obj == GetHuman();
}

function GetFirstProxy() : ProxyEnvironmentGenerator {
	return GetHuman().GetComponent("ProxyEnvironmentGenerator") as ProxyEnvironmentGenerator;
}
