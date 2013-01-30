var runSpeedScale = 1.0;
var walkSpeedScale = 1.0;

function Start ()
{
	// By default loop all animations
	animation.wrapMode = WrapMode.Loop;

	animation["run"].layer = -1;
	animation["idle"].layer = -1;
	animation.SyncLayer(-1);

	// The jump animation is clamped and overrides all others
	animation["jump"].layer = 10;
	animation["jump"].wrapMode = WrapMode.ClampForever;

	animation["jumpfall"].layer = 10;	
	animation["jumpfall"].wrapMode = WrapMode.ClampForever;

	animation["jumpland"].layer = 10;	
	animation["jumpland"].wrapMode = WrapMode.Once;
	
	animation["dodgeleft"].layer = 5;
	animation["dodgeleft"].wrapMode = WrapMode.Once;
	animation["dodgeright"].layer = 5;
	animation["dodgeright"].wrapMode = WrapMode.Once;

	// We are in full control here - don't let any other animations play when we start
	animation.Stop();
	animation.Play("run");
}

function Update ()
{
	var playerController : PlayerMoveSingle = GetComponent(PlayerMoveSingle);
	var currentSpeed = playerController.GetSpeed();

	// Fade in run
	//if (currentSpeed >= playerController.GetMaxSpeed())
	//{
	animation.CrossFade("run");
	// We fade out jumpland quick otherwise we get sliding feet
	animation.Blend("jumpland", 0);
	//}
	// Fade in walk
//	else if (currentSpeed > 0.1)
//	{
//		animation.CrossFade("idle");
//		// We fade out jumpland realy quick otherwise we get sliding feet
//		animation.Blend("jumpland", 0);
//	}
	// Fade out walk and run
//	else
//	{
//		animation.Blend("walk", 0.0, 0.3);
//		animation.Blend("run", 0.0, 0.3);
//		animation.Blend("run", 0.0, 0.3);
//	}
	
	animation["run"].normalizedSpeed = runSpeedScale;
	animation["idle"].normalizedSpeed = walkSpeedScale;
	
	if (playerController.IsJumping ())
	{
		if (playerController.HasJumpReachedApex())
		{
			animation.CrossFade ("jumpfall", 0.2);
		}
		else
		{
			animation.CrossFade ("jump", 0.2);
		}
	}
//	// We fell down somewhere
//	else if (!playerController.IsGroundedWithTimeout())
//	{
//		animation.CrossFade ("ledgefall", 0.2);
//	}
//	// We are not falling down anymore
//	else
//	{
//		animation.Blend ("ledgefall", 0.0, 0.2);
//	}
}

function DidLand () {
	animation.Play("jumpland");
}

function DodgeLeft () {
	animation.Play("dodgeleft");
}

function DodgeRight () {
	animation.Play("dodgeright");
}

@script AddComponentMenu ("Third Person Player/Third Person Player Animation")