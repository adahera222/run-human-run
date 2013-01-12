// Skrypt obslugujacy przekazywanie punktow tworzacych sciezke
// do gracza oraz tworzenie srodowiska, w ktorym biegnie gracz:
// tzn. kladek, po ktorych biegnie oraz przeszkod na kladkach, ktore
// musi omijac.

#pragma strict

import System.Collections.Generic;

// Klasa przechowujaca informacje o kladce tworzacej sciezke,
// po ktorej biegnie gracz
public class PathPad extends System.ValueType
{
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
public class Obstacle extends System.ValueType
{
	public var Position: Vector3;
    public var Rotation: Quaternion;
    public var Prefab: Transform;
    public var Pad: Transform;
    
	public function Obstacle(pos:Vector3, rot:Quaternion, pre:Transform, pad:Transform) {
		this.Position = pos;
		this.Rotation = rot;
		this.Prefab = pre;
		this.Pad = pad;
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
// liczba punktow, ktore zostaly wyslane do gracza, a nie zostaly
// w ich miejsce wygenerowane nowe
private var missingPointsCount = 0;

// lista utworzonych kladek
private var pads: List.<PathPad> = new List.<PathPad>();

// indeksy kladki i punktu na tej kladce, ktory byl ostatnio wyslany do gracza
private var sentPadIndex = -1;
private var sentPointIndex = -1;

// ostatnio wyslany do gracza punkt
private var lastSentPoint: Vector3;

// ostatnio wygenerowany punkt
private var lastGeneratedPoint: Vector3;

// offset gracza w normalnej, poczatkowej pozycji
private var playerOffset: Vector3;

// generator sciezki
private var pathGenerator: PathGenerator;

// liczba generowanych przeszkod na kladce
var obstaclesPerPad = 1;

var dh = 0.0;

/*****************************************************************************/
/*****************************************************************************/

function Awake () {
	//playerOffset = Vector3(0.0, -transform.lossyScale.y - 0.01, 0.0);
	playerOffset = Vector3(0.0, -transform.lossyScale.y, 0.0);
	pathGenerator = gameObject.GetComponent(PathGenerator);
	if (pathGenerator == null) {
		Debug.LogError("PathGenerator is null in EnvironmentGenerationScript");
	}
}

// Zapisanie przesuniecia gracza na poczatku (powinien byc w normalnej pozycji)
// oraz sprawdzenie prefabow.
function Start () {
	CheckPrefabs();
	UpdatePath(pathGenerator.GenerateInitialPath());
	SendNextPoints();
}

// Wyslanie zapytania do generatora sciezki o nowe punkty, jesli sa potrzebne
function Update () {
	if (areNewPointsNeeded()) {
		UpdatePath(pathGenerator.GeneratePath(batchPointsCount));
		missingPointsCount = 0;
	}
}

// Sprawdzenie, czy jest mozliwosc wyslania punktu.
// Nie mozna wyslac punktu, jesli brak kladek LUB
// postac jest na ostatniej kladce i brak kolejnych punktow
function IsUnableToSendNextPoint() : boolean {
	return pads.Count == 0 || (pads.Count == sentPadIndex + 1 &&
												pads[sentPadIndex].Points.Count == sentPointIndex + 1);
}

// Sprawdzenie, czy potrzebne sa nowe punkty sciezki
function areNewPointsNeeded() : boolean {
	return missingPointsCount == batchPointsCount;
}

// Aktualizacja/inkrementacja indeksow ostatnio wyslanego punktu i kladki
function UpdatePathIndexes() {
	if (sentPadIndex == -1) {
		sentPadIndex = sentPointIndex = 0;
	} else if (pads[sentPadIndex].Points.Count == sentPointIndex + 1) {
		sentPadIndex += 1;
		sentPointIndex = 0;
	} else {
		sentPointIndex += 1;
	}
}

// Wyslanie nowego punktu sciezki do gracza
/*function SendNextPoint() {
	if (IsUnableToSendNextPoint()) {
		Debug.LogError("Cannot send next point");
	} else {
		UpdatePathIndexes();
		lastSentPoint = pads[sentPadIndex].Points[sentPointIndex];
		var padOffset = Vector3(0, - pads[sentPadIndex].Prefab.lossyScale.y / 2, 0);
		SendMessage("UpdateTarget", lastSentPoint - playerOffset - padOffset);
		missingPointsCount += 1;
	}
}*/

function SendNextPoints () {
	var points = new List.<Vector3>();
	for (var i = 0; i < batchPointsCount; i++) {
		UpdatePathIndexes();
		lastSentPoint = pads[sentPadIndex].Points[sentPointIndex];
		var padOffset = Vector3(0, - pads[sentPadIndex].Prefab.lossyScale.y / 2, 0);
		points.Add(lastSentPoint - playerOffset - padOffset);
		missingPointsCount += 1;
	}
	SendMessage("UpdateTargets", points);
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
function GeneratePad (next: Vector3) {
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
	
	
	Instantiate(newElement, position, rotation);
	var pad = new PathPad(position, rotation, newElement);
	pads.Add(pad);
	
	GenerateObstacles(pad);
}

// Wygenerowanie nowych kladek, jesli sa potrzebne
function GeneratePads (positions: Vector3[]) {
	if (positions.Length > 0) {
		for (position in positions) {
			if (ShouldGeneratePad(position)) {
				GeneratePad(position);
			}
			lastGeneratedPoint = position;
			var padOffset = Vector3(0, - pads[pads.Count - 1].Prefab.lossyScale.y / 2, 0);
			var generatedPosition = position + padOffset;
			pads[pads.Count - 1].Points.Add(generatedPosition);
		}
	} else {
		Debug.Log("Empty list of pads' positions in generator");
	}
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
		if (debugDraw && i > 0) {
			Debug.DrawLine(translatedPositions[i - 1] + Vector3(0, 0.6, 0),
										translatedPositions[i] + Vector3(0, 0.6, 0), Color.green, 1000.0);
		}
	}
	
	GeneratePads(translatedPositions);
}

// Wygenerowanie przeszkod na kladce
function GenerateObstacles(pad: PathPad) {
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
	for (var i = 0; i < obstaclesPerPad; i++) {
		j = Random.Range(0, obstaclesPrefabs.Length);
		obstaclePref = obstaclesPrefabs[j];
		obsWidth = obstaclePref.transform.lossyScale.x;
		obsHeight = obstaclePref.transform.lossyScale.y;
		obsLength = obstaclePref.transform.lossyScale.z;
		
		translation = Vector3(0.0, 0.0, 0.0);
		translation.x = Random.Range((-padWidth + obsWidth) / 2.0, (padWidth - obsWidth) / 2.0);
		translation.y = (padHeight + obsHeight) / 2.0;
		translation.z = Random.Range((-padLength + obsLength) / 2.0, (padLength - obsLength) / 2.0);
		
		translation = pad.Rotation * translation;
		position = pad.Position + translation;
		
		Instantiate(obstaclePref, position, pad.Rotation);
		pad.Obstacles.Add(new Obstacle(position, pad.Rotation, obstaclePref, pad.Prefab));
	}
}
