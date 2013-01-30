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

private var enemyInput: PlayerInputState; 

function Awake() {
	var clientServerObj = GameObject.Find("ClientServer");
	if (clientServerObj == null) {
		isSinglePlayer = true;
		playerNr = 1;
	} else {
		isSinglePlayer = false;
		clientServer = clientServerObj.GetComponent("ClientServer") as ClientServer;
		playerNr = clientServer.GetPlayerNr();
		Debug.Log("Starting MULTI as player nr " + playerNr);
	}
	StartGame();
}

function Start () {
	log = "Player pos: " + GetPlayer().transform.position + "\n" + log;
}

// do debugowania
function GetLog() {
	return log;
}

// LateUpdate poniewaz trzeba wysylac dopiero po aktualizacji
// stanu gracza
function LateUpdate () {
	if (!IsSinglePlayerGame()) {
		if (!AmIHuman()) {
			// pobierane punkty wygenerowane w jednej iteracji, a moze byc
			// kilka iteracji "zaleglych"
			while (clientServer.HasEnvData()) {
					var data = clientServer.GetEnvData();
					
					GetFirstProxy().UpdateState(data);
					GetSecondProxy().UpdateState(data);
			}
		}
		
		if (clientServer.HasEnemyInput()) {
			var tmpInput = clientServer.GetEnemyInput();
			DebugLogData(tmpInput);
			enemyInput = PlayerInputState(tmpInput);
		} else {
			enemyInput = PlayerInputState.Empty();
		}
	}
}

function GetEnemyInput() : PlayerInputState {
	return enemyInput;
}

function DebugLogData(data: double[]) {
	var tmp = "";
	if (data.Length > 0) {
		tmp = "d[0]=" + data[0] + "; d[1]" + data[1] + "; d[2]" + data[2] + "\n";
	} else {
		tmp = "empty\n";
	}
	log = tmp + log;
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

// przyjmuje zalozenie, ze funkcja odwoluje sie z perspektywy gracza-czlowieka,
// dlatego trzeba uwazac w pojedynczego gracza
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

function IsComputerControlled(obj: GameObject) : boolean {
	if (isSinglePlayer) {
		return (roundNr % 2 == 1 && obj == GetZombie()) || (roundNr % 2 == 0 && obj == GetHuman());
	} else {
		return false;
	}
}

function IsDummyPlayer(obj: GameObject) : boolean {
	return obj == GetEnemy();
}

function IsProxyObjGenerating(obj: GameObject) : boolean {
	return obj == GetHuman();
}

function GetFirstProxy() : ProxyEnvironmentGenerator {
	return GetHuman().GetComponent("ProxyEnvironmentGenerator") as ProxyEnvironmentGenerator;
}

function GetSecondProxy() : ProxyEnvironmentGenerator {
	return GetZombie().GetComponent("ProxyEnvironmentGenerator") as ProxyEnvironmentGenerator;
}
