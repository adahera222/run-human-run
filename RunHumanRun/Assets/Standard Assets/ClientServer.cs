using UnityEngine;
using AllJoynUnity;
using basic_clientserver;
using System.Collections;

namespace client_server
{
	public class ClientServer : MonoBehaviour
	{
		
		private bool isWorking = false;
		private string playerNick = "";
		// domyslnie nr gracza to 1, jak dolacza do sesji, staje sie graczem nr 2
		private int playerNr = 1;
		
		public string GetChatText()
		{
			return RHRMultiplayerHandler.chatText;	
		}
		
		// Use this for initialization
		void Start()
		{
			DontDestroyOnLoad(this);
		}
	
		// Update is called once per frame
	    void Update()
		{
			if (!isWorking)
				return;
	        if (Input.GetKeyDown(KeyCode.Escape)) {
				basicChat.CloseDown();
				Application.Quit();
			}
		}
		
		public void Init(string nick)
		{
			isWorking = true;
			playerNick = nick;
			playerNr = 1;
			Debug.Log("Starting up AllJoyn service and client");
			basicChat = new RHRMultiplayerHandler(playerNick);
		}
		
		public bool HasEnvData()
		{
			return basicChat.HasEnvData();	
		}
		
		public double[] GetEnvData()
		{
			return basicChat.GetEnvData();	
		}
		
		public bool IsDuringGame()
		{
			return basicChat.IsDuringGame();
		}
		
		public void SetTestStart()
		{
			basicChat.GameStarted();	
		}
		
		public void SendUpdateState(double[] state)
		{
			Debug.Log ("AllJoynClientServer: SHOULD sent data to P2");
			basicChat.SendDoubleArray(state);
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
			basicChat.StartUp();
		}
		
		public void JoinSession(string session)
		{
			basicChat.JoinSession(session);
			playerNr = 2;
		}
		
		public void LeaveSession()
		{
			basicChat.LeaveSession();
			playerNr = 1;
		}
		
		public void CloseDown()
		{
			basicChat.CloseDown();	
		}
		
		public bool HasJoinedSession()
		{
			return RHRMultiplayerHandler.currentJoinedSession != null;
		}
		
		public string GetConnectedPlayerName()
		{
			return basicChat.GetConnectedPlayerNick();
		}
		
		public ArrayList GetPlayersNicks()
		{
			ArrayList nicks = new ArrayList();
			foreach (string name in RHRMultiplayerHandler.sFoundName)
			{
				nicks.Add(basicChat.RetrievePlayerNick(name));
			}
			
			return nicks;
		}
		
		public ArrayList GetSessions()
		{
			return RHRMultiplayerHandler.sFoundName;
		}
		
		public string FoundNameToNick(string foundName)
		{
			return basicChat.RetrievePlayerNick(foundName);	
		}
	
		RHRMultiplayerHandler basicChat;
	}
}