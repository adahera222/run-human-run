#pragma strict

// Plik zawiera definicje struktur przesylanych podczas gry w trybie
// multiplayer. Wlasciwie przesylana jest tablica wartosci double,
// ale przed wyslaniem i po nim, sa one przeksztalcane do obiektow,
// ktorych typy sa tutaj zdefiniowane.


// POSTAC DANYCH PRZESYLANYCH OD GRACZA 1. DO 2. O WYGENEROWANYM OTOCZENIU
// || liczba kladek || nr typu kladki || liczba punktow trasy || dla kazdego punktu: wsp. x | wsp. y | wsp. z || liczba przeszkod || dla kazdej przeszkody: nr kladki na ktorej jest | nr typu przeszkody | wsp. x | wsp. y | wsp. z

// Opis terenu: kladki + punkty trasy + przeszkody na kladkach
public class PathStateRaw extends System.ValueType {
	public static var DoublesPerPad: int = 1;
	public static var DoublesPerPoint: int = 3;
	public static var DoublesPerObstacle: int = 5;
	
    public var PadsCount: int;
    public var PointsCount: int;
    public var ObstaclesCount: int;
    
    public var PadsTypes: double[];
    public var PathPoints: double[];
    public var ObstaclesData: double[];
    
    // Konstruktor wykorzystywany przy pobieraniu danych od I gracza
	public function PathStateRaw(data: double[]) {
		PathStateRaw.Validate(data);
		var padsCountIndex = 0;
		this.PadsCount = data[padsCountIndex];
		var pointsCountIndex = 1 + padsCountIndex + DoublesPerPad * this.PadsCount;
		this.PointsCount = data[pointsCountIndex];
		var obstaclesCountIndex = 1 + pointsCountIndex + DoublesPerPoint * this.PointsCount;
		this.ObstaclesCount = data[obstaclesCountIndex];
		
		var i = 0;
		var j = 0;
		this.PadsTypes = new double[DoublesPerPad * this.PadsCount];
		for (i = padsCountIndex + 1; i < pointsCountIndex; i++)
			this.PadsTypes[j++] = data[i];
		
		this.PathPoints = new double[DoublesPerPoint * this.PointsCount];
		j = 0;
		for (i = pointsCountIndex + 1; i < obstaclesCountIndex; i++)
			this.PathPoints[j++] = data[i];
		
		this.ObstaclesData = new double[DoublesPerObstacle * this.ObstaclesCount];
		j = 0;
		for (i = obstaclesCountIndex + 1; i < data.Length; i++)
			this.ObstaclesData[j++] = data[i];
	}
	
	public static function Pack(pads: PadState[], points: Vector3[]) : double[] {
		var size = CalculateSizeForData(pads, points);
		var data = new double[size];
		var i = 0;
		data[i++] = pads.Length;
		i = SavePadsTypes(pads, data, i);
		data[i++] = points.Length;
		i = SavePoints(points, data, i);
		SaveObstacles(pads, data, i);
		
		return data;
	}
	
	public static function Validate(data: double[]) {
		var size = data.Length;
		var padsCount: int = data[0];
		var pointsCount: int = data[padsCount + 1];
		Debug.Log("SIZE: " + size);
		Debug.Log("Pads count: " + padsCount);
		Debug.Log("Points count: " + pointsCount);
		Debug.Log("Obst count: " + (size - (2 + 3 * pointsCount + 1 * padsCount)) / DoublesPerObstacle);
	}
	
	private static function CalculateSizeForData(pads: PadState[], points: Vector3[]) : int {
		var size = 3; // liczby kladek, punktow, przeszkod
		// dane kladek i przeszkod
		for (var pad: PadState in pads) {
			size += DoublesPerPad + DoublesPerObstacle * pad.ObstaclesStates.Length;
		}
		// dane punktow
		size += 3 * points.Length;
		
		return size;
	}
	
	private static function SavePadsTypes(pads: PadState[], data: double[], start: int) : int {
		var i = start;
		for (var pad: PadState in pads) {
			data[i++] = pad.PadType;
		}
		return i;
	}
	
	private static function SavePoints(points: Vector3[], data: double[], start: int) : int {
		var i = start;
		for (var point: Vector3 in points) {
			data[i++] = point.x;
			data[i++] = point.y;
			data[i++] = point.z;
		}
		return i;
	}
	
	private static function SaveObstacles(pads: PadState[], data: double[], start: int) : int {
		var i = start + 1;
		var padNr = 0;
		var obstCount = 0;
		for (var pad: PadState in pads) {
			for (var obst: ObstacleState in pad.ObstaclesStates) {
				obstCount += 1;
				data[i++] = padNr;
				data[i++] = obst.ObstacleType;
				data[i++] = obst.Position.x;
				data[i++] = obst.Position.y;
				data[i++] = obst.Position.z;
			}
			padNr += 1;
		}
		data[start] = obstCount;
		
		return i;
	}
}

// Opis jednej kladki + opisy przeszkod, ktore sie na niej znajduja
public class PadState extends System.ValueType {
	public var PadType: int;
	public var ObstaclesStates: ObstacleState[];
	
	public function PadState(padType: double, obstaclesData: ObstacleState[]) {
		this.PadType = padType;
		this.ObstaclesStates = obstaclesData;
	}
}

// Opis przeszkody
public class ObstacleState extends System.ValueType {
	public var ObstacleType: int;
	public var Position: Vector3;
	public var Type: int;
	
	public function ObstacleState(data: double[]) {
		this.ObstacleType = data[1];
		this.Position = Vector3(data[2], data[3], data[4]);
		this.Type = data[5];
	}
	
	public function ObstacleState(obstacleType: int, position: Vector3, type: int) {
		this.ObstacleType = obstacleType;
		this.Position = position;
		this.Type = type;
	}
}


function Start () {

}

function Update () {

}