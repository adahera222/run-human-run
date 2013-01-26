//-----------------------------------------------------------------------
// <copyright file="AllJoynClientServer.cs" company="Qualcomm Innovation Center, Inc.">
// Copyright 2012, Qualcomm Innovation Center, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// </copyright>
//-----------------------------------------------------------------------

using UnityEngine;
using AllJoynUnity;
using basic_clientserver;
using System.Collections;

namespace client_server
{
	public class AllJoynClientServer : MonoBehaviour
	{
		
		private bool isWorking = false;
		private string playerNick = "";
		
		private long spamCount = 0;
		
		private bool spamMessages = false;
		
		private int playerNr;
		
		public string GetChatText()
		{
			return BasicChat.chatText;	
		}
		
		// Use this for initialization
		void Start()
		{
			DontDestroyOnLoad(this);
			//basicChat = new BasicChat();
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
			if(spamMessages) {
				basicChat.SendTheMsg("("+(spamCount++)+") Spam: "+System.DateTime.Today.Millisecond);
			}
		}
		
		public void Init(string nick)
		{
			isWorking = true;
			playerNick = nick;
			playerNr = 1;
			Debug.Log("Starting up AllJoyn service and client");
			basicChat = new BasicChat(playerNick);
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
			return BasicChat.AllJoynStarted;
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
			return BasicChat.currentJoinedSession != null;
		}
		
		public string GetConnectedPlayerName()
		{
			return basicChat.GetConnectedPlayerNick();
		}
		
		public ArrayList GetPlayersNicks()
		{
			ArrayList nicks = new ArrayList();
			foreach (string name in BasicChat.sFoundName)
			{
				nicks.Add(basicChat.RetrievePlayerNick(name));
			}
			
			return nicks;
		}
		
		public ArrayList GetSessions()
		{
			return BasicChat.sFoundName;
		}
		
		public string FoundNameToNick(string foundName)
		{
			return basicChat.RetrievePlayerNick(foundName);	
		}
	
		BasicChat basicChat;
	}
}