#pragma strict

// tablica prefabow, z ktorych buduje sie sciezke
private var pathPrefabs: Transform[];

// tablica prefabow, z ktorych tworzy sie przeszkody
private var obstaclesPrefabs: Transform[];

// czy maja byc rysowane w scenie linie ulatwiajace debugowanie
var debugDraw = true;

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

// czy ten generator ma tworzyc obiekty w scenie
private var meGenerating: boolean;

// zarzadca gry
private var gameManager: GameManager;

function Awake() {
	playerOffset = Vector3(0.0, -transform.lossyScale.y, 0.0);
}

function Start() {
	Init();
}

function Init() {
	var gameManagerObj = GameObject.Find("GameManager");
	gameManager = gameManagerObj.GetComponent("GameManager") as GameManager;
	if (!gameManager) {
		Debug.LogError("Proxy Env Gen: unable to find GameManager in Awake()");
	}
	meGenerating = gameManager.IsProxyObjGenerating(gameObject);
}

function Update() {
	// nie rob nic sam
}

function UpdateState(data: double[]) {
	var rawData: PathStateRaw = PathStateRaw(data);
	var i: int;
	var pads = new PadState[rawData.PadsCount];
	var points = new Vector3[rawData.PointsCount];
	if (rawData.PadsCount > 0) {
		var obstacles: ObstacleState[];
		var padType: int;
		var start = 0;
		
		for (i = 0; i < rawData.PadsCount; i++) {
			padType = rawData.PadsTypes[i];
			obstacles = MakeObstacles(rawData.ObstaclesData, start, i);
			pads[i] = PadState(padType, obstacles);
			start += obstacles.Length * PathStateRaw.DoublesPerObstacle;
		}
	}
	
	if (rawData.PointsCount > 0) {
		var pData = rawData.PathPoints;
		for (i = 0; i < rawData.PointsCount; i += 1) {
			points[i] = Vector3(pData[3 * i], pData[3 * i+1], pData[3 * i+2]);
		}
	}
	
	if (debugDraw) {
		DrawDebugLine(points);
	}
	
	UpdateState(pads, points);
}

function UpdateState(pads: PadState[], positions: Vector3[]) {
	if (debugDraw) {
		DrawDebugLine(positions);
	}
	
	GeneratePads(pads, positions);
	// usuniecie dodatkowych punktow stworzonych dla drugiego gracza
	if (meGenerating && sentPadIndex == -1) {
		MoveToCorrectInitIndexes(positions);
	}
	UpdatePlayerPath();
}

// Przesuwa wskazniki polozenia na pozycje poczatkowa dla I gracza
function MoveToCorrectInitIndexes(positions: Vector3[]) {
	var humanZPos = gameManager.GetHuman().transform.position.z;
	UpdatePathIndexes();
	lastSentPoint = pads[sentPadIndex].Points[sentPointIndex];
	while (lastSentPoint.z < humanZPos) {
		UpdatePathIndexes();
		lastSentPoint = pads[sentPadIndex].Points[sentPointIndex];
	}
}

function DrawDebugLine(points: Vector3[]) {
	var lineOffset = Vector3(0, 0.6, 0);
	for (var i = 1; i < points.Length; i++) {
		Debug.DrawLine(points[i - 1] + lineOffset, points[i] + lineOffset, Color.green, 1000.0);
	}
}

function FindObstacleCount(data: double[], start: int, padNr: int) : int {
	var count = 0;
	while (data.Length > start + count * PathStateRaw.DoublesPerObstacle &&
				data[start + count * PathStateRaw.DoublesPerObstacle] == padNr) {
		count += 1;
	}
	
	return count;
}

function MakeObstacle(data: double[], start: int) : ObstacleState {
	var obstData = new double[PathStateRaw.DoublesPerObstacle];
	for (var i = 0; i < PathStateRaw.DoublesPerObstacle; i++) {
		obstData[i] = data[start + i];
	}
	return ObstacleState(obstData);
}

function MakeObstacles(data: double[], start: int, padNr: int) : ObstacleState[] {
	var obstCount = FindObstacleCount(data, start, padNr);
	var obstacles = new ObstacleState[obstCount];
	
	for (var i = 0; i < obstCount; i++) {
		obstacles[i] = MakeObstacle(data, start);
		start += PathStateRaw.DoublesPerObstacle;
	}
	return obstacles;
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

// Funkcja sprawdzajaca, czy sa jeszcze punkty, ktore nie zostaly wyslane do gracza
function HasMoreToSend() {
	if (pads.Count == 0) {
		// brak zadnych punktow
		return false;
	} else if (sentPadIndex == -1) {
		// sa punkty, ale zaden nie wyslany
		return true;
	} else {
		// sa punkty i wczesniej juz zostaly jakies wyslane
		var hasMorePads = sentPadIndex < pads.Count - 1;
		var hasMorePoints = sentPointIndex < pads[sentPadIndex].Points.Count - 1;
		return hasMorePads || hasMorePoints;
	}
}

function UpdatePlayerPath () {
	var points = new List.<Vector3>();
	while ( HasMoreToSend() ) {
		UpdatePathIndexes();
		lastSentPoint = pads[sentPadIndex].Points[sentPointIndex];
		var padOffset = Vector3(0, - pads[sentPadIndex].Prefab.lossyScale.y / 2, 0);
		points.Add(lastSentPoint - playerOffset - padOffset);
	}
	SendMessage("UpdateTargets", points);
}

// Skopiowanie typow prefabow z Generatora otoczenia
function CopyPrefabs(envPathPrefabs: Transform[], envObstaclesPrefabs: Transform[]) {
	if (envPathPrefabs.Length == 0)
		Debug.LogError("ProxyEnvGenerator: Path prefab count is 0");
	pathPrefabs = new Transform[envPathPrefabs.Length];
	for (var i = 0; i < envPathPrefabs.Length; i++)
		pathPrefabs[i] = envPathPrefabs[i];
	
	obstaclesPrefabs = new Transform[envObstaclesPrefabs.Length];
	if (envObstaclesPrefabs.Length == 0)
		Debug.LogError("ProxyEnvGenerator: Obstacles prefabs count is 0");
	for (var j = 0; j < obstaclesPrefabs.Length; j++)
		obstaclesPrefabs[j] = envObstaclesPrefabs[j];
}

// Wygenerowanie nowej kladki tworzacej sciezke razem z przeszkodami
function GeneratePad(padState: PadState, next: Vector3) {
	var prev = (pads.Count == 0) ?
							next + transform.rotation * (0.01 * Vector3.back) : lastGeneratedPoint;
	var border = (prev + next) / 2;
	var trans = next - prev;
	trans.Normalize();
	trans.y = 0;
	
	var newElement = pathPrefabs[padState.PadType];
	var padOffset = Vector3(0, - newElement.lossyScale.y / 2, 0);
	var position = border + trans * (newElement.lossyScale.z / 2) + padOffset;
	var rotation: Quaternion = (trans != Vector3.zero) ? Quaternion.LookRotation(trans) : Quaternion.identity;
	if (meGenerating) {
		Instantiate(newElement, position, rotation);
	}
	var pad = new PathPad(position, rotation, newElement);
	pads.Add(pad);
	
	GenerateObstacles(pad, padState.ObstaclesStates);
}

//skasowac ewentualne losowanie
// Wygenerowanie nowych kladek, jesli sa potrzebne
function GeneratePads (padStates: PadState[], positions: Vector3[]) {
	var currentPad = 0;
	if (positions.Length > 0) {
		for (position in positions) {
			if (ShouldGeneratePad(position)) {
				GeneratePad(padStates[currentPad], position);
				currentPad += 1;
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

//chyba bez zmian
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

// Wygenerowanie przeszkod na kladce
function GenerateObstacles(pad: PathPad, obstaclesStates: ObstacleState[]) {
	var obstaclePref: Transform;
	
	for (obstState in obstaclesStates) {
		obstaclePref = obstaclesPrefabs[obstState.ObstacleType];
		if (meGenerating) {
			Instantiate(obstaclePref, obstState.Position, pad.Rotation);
		}
		pad.Obstacles.Add(new Obstacle(obstState.Position, pad.Rotation, obstaclePref, pad.Prefab));
	}
}
