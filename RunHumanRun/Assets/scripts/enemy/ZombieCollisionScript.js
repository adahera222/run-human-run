// Skrypt obslugujacy kolizje gracza z zombiakiem - koniec gry



private var hitTime : float;

function Start () {
}

function Update () {
}

function OnTriggerEnter (other : Collider) {
	if (other.CompareTag("Zombie")) {
		Application.LoadLevel("GameOverSingle");
	}
}