// ThirdPersonStatus: Handles the player's state machine.

// Keeps track of inventory, health, lives, etc.



private static var points : float = 0.0;
private static var moveBonus : float = 0.0;

private var playerNr: int;

function Awake()
{
}

// Utility function used by HUD script:
static function GetPoints() : int
{
	return points;
}

function AddPoints (no : float)
{
	points += no;
}

function AddBonusPoints (no : float)
{
	if (no > 0.0f) {
		points += 1;
	}
}

function SetUp ()
{
	points = 0;
}

function SetNr(nr : int) {
	playerNr = nr;
}

function GetNr() {
	return playerNr;
}

function AddMoveBonus (no : float)
{
	moveBonus += no;
}

function GetMoveBonus()
{
	var tmp = moveBonus;
	if (moveBonus > 10) {
		moveBonus /= 2;
	} else {
		moveBonus = 0;
	}
	return tmp;
}