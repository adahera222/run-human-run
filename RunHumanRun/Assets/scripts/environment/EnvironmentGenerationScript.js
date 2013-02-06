// Skrypt obslugujacy przekazywanie punktow tworzacych sciezke
// do gracza oraz tworzenie srodowiska, w ktorym biegnie gracz:
// tzn. kladek, po ktorych biegnie oraz przeszkod na kladkach, ktore
// musi omijac.

#pragma strict

import System.Collections.Generic;
import rhr_multi;

enum ObstacleType {
	Slow,
	Speed,
	Points
}

// Klasa przechowujaca informacje o kladce tworzacej sciezke,
// po ktorej biegnie gracz
public class PathPad extends System.ValueType {
    public var Position: Vector3;
    public var Rotation: Quaternion;
    public var Prefab: Transform;
    public var Points: List.<Vector3>;
    public var Obstacles: List.<Obstacle>;
    
	public function PathPad(pos:Vector3, rot:Quaternion, pre:Transform) {
		this.Position = pos;
		this.Rotation = rot;
		this.Prefab = pre;
		this.Points = new List.<Vector3>();
		this.Obstacles = new List.<Obstacle>();
	}
}

// Klasa reprezentujaca przeszkode na drodze
public class Obstacle extends System.ValueType {
	public var Position: Vector3;
    public var Rotation: Quaternion;
    public var Prefab: Transform;
    public var Pad: Transform;
    public var Type: ObstacleType;
    
	public function Obstacle(pos:Vector3, rot:Quaternion, pre:Transform, pad:Transform, type: ObstacleType) {
		this.Position = pos;
		this.Rotation = rot;
		this.Prefab = pre;
		this.Pad = pad;
		this.Type = type;
	}
}

// tablica prefabow, z ktorych buduje sie sciezke
var pathPrefabs: Transform[];

// tablica prefabow, z ktorych tworzy sie przeszkody
var obstaclesPrefabs: Transform[];

// czy maja byc rysowane w scenie linie ulatwiajace debugowanie
var debugDraw = true;

// liczba punktow, ktore maja byc naraz generowane
private var batchPointsCount = 20;
// odleglosc, na jaka widzi gracz, musza byc generowane punkty
// jesli sciezka konczy sie przed linia wzroku gracza
var sightDistance: double = 50.0;

// lista utworzonych kladek
private var pads: List.<PathPad> = new List.<PathPad>();

// ostatnio wygenerowany punkt
private var lastGeneratedPoint: Vector3;

// offset gracza w normalnej, poczatkowej pozycji
private var playerOffset: Vector3;

// generator sciezki
private var pathGenerator: PathGenerator;

// liczba generowanych przeszkod na kladce
var obstaclesPerPad = 1;

// tryb gry: single/multi
private var singlePlayerMode: boolean;

// czy ten generator ma generowac punkty (czy jest przyczepiony do I gracza)
private var meGenerating: boolean;

// zarzadca gry
private var gameManager: GameManager;

/*****************************************************************************/
/*****************************************************************************/

function Awake () {
	playerOffset = Vector3(0.0, -transform.lossyScale.y, 0.0);
	pathGenerator = gameObject.GetComponent(PathGenerator);
	if (pathGenerator == null) {
		Debug.LogError("PathGenerator is null in EnvironmentGenerationScript");
	}
}

// Zapisanie przesuniecia gracza na poczatku (powinien byc w normalnej pozycji)
// oraz sprawdzenie prefabow.
function Start () {
	var gameManagerObj = GameObject.Find("GameManager");
	gameManager = gameManagerObj.GetComponent("GameManager") as GameManager;
	if (!gameManager) {
		Debug.LogError("Env Gen: unable to find GameManager in Awake()");
	}
	
	CheckPrefabs();
	singlePlayerMode = gameManager.IsSinglePlayerGame();
	meGenerating = gameManager.IsObjGenerating(gameObject);
	
	if (gameManager.IsProxyObjGenerating(gameObject)) {
		var firstProxy = gameManager.GetFirstProxy();
		firstProxy.CopyPrefabs(pathPrefabs, obstaclesPrefabs);
		firstProxy.Init();
		
		var secondProxy = gameManager.GetSecondProxy();
		secondProxy.CopyPrefabs(pathPrefabs, obstaclesPrefabs);
		secondProxy.Init();
	}
	
	if (meGenerating) {
		UpdatePath(pathGenerator.GenerateInitialPath());
	}
}

// Wyslanie zapytania do generatora sciezki o nowe punkty, jesli sa potrzebne
function Update () {
	if (meGenerating && AreNewPointsNeeded()) {
		UpdatePath(pathGenerator.GeneratePath(batchPointsCount, true));
	}
}

// Sprawdzenie, czy potrzebne sa nowe punkty sciezki
function AreNewPointsNeeded() : boolean {
	return (transform.position - lastGeneratedPoint).magnitude < sightDistance;
}

// Sprawdzenie, czy wszystkie prefaby nie sa nullami oraz czy istnieje
// przynajmniej jeden prefab kazdego rodzaju
function CheckPrefabs() {
	if (pathPrefabs.Length == 0)
		Debug.LogError("Path prefab count is 0");
	if (obstaclesPrefabs.Length == 0)
		Debug.LogError("Obstacles prefabs count is 0");
		
	for (var i = 0; i < pathPrefabs.Length; i++)
		if (!pathPrefabs[i])
			Debug.LogError("Path prefab nr " + i + " is null");
	
	for (var j = 0; j < obstaclesPrefabs.Length; j++)
		if (!obstaclesPrefabs[j])
			Debug.LogError("Obstacle prefab nr " + j + " is null");
}

// Wygenerowanie nowej kladki tworzacej sciezke razem z przeszkodami
function GeneratePadState (next: Vector3) : PadState {
	var prev = (pads.Count == 0) ?
							next + transform.rotation * (0.01 * Vector3.back) : lastGeneratedPoint;
	var border = (prev + next) / 2;
	var trans = next - prev;
	trans.Normalize();
	trans.y = 0;
	
	var index = Random.Range(0, pathPrefabs.Length);
	var newElement = pathPrefabs[index];
	var padOffset = Vector3(0, - newElement.lossyScale.y / 2, 0);
	var position = border + trans * (newElement.lossyScale.z / 2) + padOffset;
	var rotation: Quaternion = (trans != Vector3.zero) ? Quaternion.LookRotation(trans) : Quaternion.identity;
	
	var pad = new PathPad(position, rotation, newElement);
	pads.Add(pad);
	
	var obstacles: ObstacleState[] = GenerateObstacles(pad);
	return PadState(index, obstacles);
}

// Wygenerowanie nowych kladek, jesli sa potrzebne
function GeneratePadsStates(positions: Vector3[]) : PadState[] {
	var padsStates: PadState[];
	if (positions.Length > 0) {
		var padsStatesList: List.<PadState> = new List.<PadState>();
		for (position in positions) {
			if (ShouldGeneratePad(position)) {
				padsStatesList.Add(GeneratePadState(position));
			}
			lastGeneratedPoint = position;
			var padOffset = Vector3(0, - pads[pads.Count - 1].Prefab.lossyScale.y / 2, 0);
			var generatedPosition = position + padOffset;
			pads[pads.Count - 1].Points.Add(generatedPosition);
		}
		padsStates = new PadState[padsStatesList.Count];
		for (var i = 0; i < padsStatesList.Count; i++) {
			padsStates[i] = padsStatesList[i];
		}
	} else {
		Debug.Log("Empty list of pads' positions in generator");
		padsStates = new PadState[0];
	}
	return padsStates;
}

// Sprawdzenie, czy potrzeba stworzyc nowa kladke, czyli czy
// roznica miedzy srodkiem ostatniej kladki a nowym punktem
// jest wieksza niz polowa dlugosci ostatniej kladki
function ShouldGeneratePad (newPos: Vector3): boolean {
	if (pads.Count == 0) {
		return true;
	} else {
		var lastPad = pads[pads.Count - 1];
		var padLength = lastPad.Prefab.transform.lossyScale.z;
		var distance = newPos - lastPad.Position;
		distance.y = 0;
		return distance.magnitude > padLength / 2;
	}
}

// Aktualizacja punktow sciezki: dodanie przesuniecia zwiazanego z graczem
// oraz ewentualne wygenerowanie nowych kladek.
function UpdatePath(positions: Vector3[]) {
	var translatedPositions = new Vector3[positions.Length];
	for (var i = 0; i < positions.Length; i++) {
		translatedPositions[i] = positions[i] + playerOffset;
	}
	
	//var padsStates: PadState[] = GeneratePadsStates(translatedPositions);
	var padsStates: PadState[] = GeneratePadsStates(positions);
	
	SendData(positions, padsStates);
}

function SendData(positions: Vector3[], padsStates: PadState[]) {
	gameManager.GetFirstProxy().UpdateState(padsStates, positions);
	
	gameManager.GetSecondProxy().CopyPrefabs(pathPrefabs, obstaclesPrefabs);
	gameManager.GetSecondProxy().Init();
	gameManager.GetSecondProxy().UpdateState(padsStates, positions);
	
	if (!singlePlayerMode) {
		var data: double[] = PathStateRaw.Pack(padsStates, positions);
		
		var clientServerObj = GameObject.Find("ClientServer");
		if (clientServerObj == null) {
			Debug.LogError("EnvGenScript: unable to find second player proxy");
		} else {
			var clientServer = clientServerObj.GetComponent("ClientServer") as ClientServer;
			clientServer.SendUpdateState(data);
		}
	}
}

// Wygenerowanie przeszkod na kladce
function GenerateObstacles(pad: PathPad) : ObstacleState[] {
	var obstacles: ObstacleState[];
	var padWidth = pad.Prefab.transform.lossyScale.x;
	var padHeight = pad.Prefab.transform.lossyScale.y;
	var padLength = pad.Prefab.transform.lossyScale.z;
	
	var j : int;
	var obstaclePref: Transform;
	var obsWidth: float;
	var obsHeight: float;
	var obsLength: float;
	var translation: Vector3;
	var position: Vector3;
	var obsType: int;
	
	obstacles = new ObstacleState[obstaclesPerPad];
	for (var i = 0; i < obstaclesPerPad; i++) {
		j = Random.Range(0, obstaclesPrefabs.Length);
		obstaclePref = obstaclesPrefabs[j];
		obsWidth = obstaclePref.transform.lossyScale.x;
		obsHeight = obstaclePref.transform.lossyScale.y;
		obsLength = obstaclePref.transform.lossyScale.z;
		obsType = Random.Range(0, System.Enum.GetValues(ObstacleType).Length);
		
		translation = Vector3(0.0, 0.0, 0.0);
		translation.x = Random.Range((-padWidth + obsWidth) / 2.0, (padWidth - obsWidth) / 2.0);
		translation.y = (padHeight + obsHeight) / 2.0;
		translation.z = Random.Range((-padLength + obsLength) / 2.0, (padLength - obsLength) / 2.0);
		
		translation = pad.Rotation * translation;
		position = pad.Position + translation;
		
		pad.Obstacles.Add(new Obstacle(position, pad.Rotation, obstaclePref, pad.Prefab, obsType));
		obstacles[i] = ObstacleState(j, position, obsType);
	}
	
	return obstacles;
}

function GetPathPrefabs() : Transform[] {
	return pathPrefabs;
}

function GetObstaclesPrefabs() : Transform[] {
	return obstaclesPrefabs;
}
