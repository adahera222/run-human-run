using UnityEngine;
using AllJoynUnity;
using System.Collections;

namespace rhr_multi
{
	public class ClientServer : MonoBehaviour
	{
		
		private bool isWorking = false;
		private string playerNick = "";
		// domyslnie nr gracza to 1, jak dolacza do sesji, staje sie graczem nr 2
		private int playerNr = 1;
		
		public string GetDebugText()
		{
			return RHRMultiplayerHandler.debugText;	
		}
		
		void Start()
		{
			DontDestroyOnLoad(this);
		}
	
	    void Update()
		{
			if (!isWorking)
				return;
	        if (Input.GetKeyDown(KeyCode.Escape)) {
				multiplayerHandler.CloseDown();
				Application.Quit();
			}
		}
		
		public void Init(string nick)
		{
			isWorking = true;
			playerNick = nick;
			playerNr = 1;
			Debug.Log("Starting up AllJoyn service and client");
			multiplayerHandler = new RHRMultiplayerHandler(playerNick);
		}
		
		public bool HasEnvData()
		{
			return multiplayerHandler.HasEnvData();	
		}
		
		public double[] GetEnvData()
		{
			return multiplayerHandler.GetEnvData();	
		}
		
		public bool IsDuringGame()
		{
			return multiplayerHandler.IsDuringGame();
		}
		
		public void SetTestStart()
		{
			multiplayerHandler.GameStarted();	
		}
		
		public void SendUpdateState(double[] state)
		{
			Debug.Log ("ClientServer: SHOULD sent data to P2");
			multiplayerHandler.SendDoubleArray(state);
		}
		
		public int GetPlayerNr()
		{
			return playerNr;	
		}
		
		public bool isAllJoynStarted()
		{
			return RHRMultiplayerHandler.AllJoynStarted;
		}
		
		public void StartUp()
		{
			multiplayerHandler.StartUp();
		}
		
		public void JoinSession(string session)
		{
			multiplayerHandler.JoinSession(session);
			playerNr = 2;
		}
		
		public void LeaveSession()
		{
			multiplayerHandler.LeaveSession();
			playerNr = 1;
		}
		
		public void CloseDown()
		{
			multiplayerHandler.CloseDown();	
		}
		
		public bool HasJoinedSession()
		{
			return RHRMultiplayerHandler.currentJoinedSession != null;
		}
		
		public string GetConnectedPlayerName()
		{
			return multiplayerHandler.GetConnectedPlayerNick();
		}
		
		public ArrayList GetPlayersNicks()
		{
			ArrayList nicks = new ArrayList();
			foreach (string name in RHRMultiplayerHandler.sFoundName)
			{
				nicks.Add(multiplayerHandler.RetrievePlayerNick(name));
			}
			
			return nicks;
		}
		
		public ArrayList GetSessions()
		{
			return RHRMultiplayerHandler.sFoundName;
		}
		
		public string FoundNameToNick(string foundName)
		{
			return multiplayerHandler.RetrievePlayerNick(foundName);	
		}
	
		RHRMultiplayerHandler multiplayerHandler;
	}
}