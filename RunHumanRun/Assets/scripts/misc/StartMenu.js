function LateUpdate()
{
    if (Application.platform == RuntimePlatform.Android) {
		if (Input.GetKey(KeyCode.Escape)) {
			Application.Quit();
		}
	}
}