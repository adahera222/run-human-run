#pragma strict

// Plik zawiera definicje struktur przesylanych miedzy graczami
// opisujacych wejscie kontrolera - akcje gracza, na tej podstawie
// mozna przyblizyc ruch drugiego gracza.

public class PlayerInputState extends System.ValueType {
	public static var FieldsCount = 3;
	
	public var isJumping: boolean;
	public var isDodgingLeft: boolean;
	public var isDodgingRight: boolean;
	
	public function PlayerInputState(data: double[]) {
		this.isJumping = data[0] != 0.0;
		this.isDodgingLeft = data[1] != 0.0;
		this.isDodgingRight = data[2] != 0.0;
	}
	
	public function PlayerInputState(jump: boolean, dLeft: boolean, dRight: boolean) {
		this.isJumping = jump;
		this.isDodgingLeft = dLeft;
		this.isDodgingRight = dRight;
	}
	
	public function Merge(other: PlayerInputState): PlayerInputState {
		return PlayerInputState(
				this.isJumping || other.isJumping,
				this.isDodgingLeft || other.isDodgingLeft,
				this.isDodgingRight || other.isDodgingRight);
	}
	
	public static function Pack(jump: boolean, dLeft: boolean, dRight: boolean): double[] {
		var data = new double[FieldsCount];
		
		data[0] = (jump) ? 1.0 : 0.0;
		data[1] = (dLeft) ? 1.0 : 0.0;
		data[2] = (dRight) ? 1.0 : 0.0;
		
		return data;
	}
	
	public static function Empty() : PlayerInputState {
		return PlayerInputState(false, false, false);
	}
}

/*
function Start () {

}

function Update () {

}
*/