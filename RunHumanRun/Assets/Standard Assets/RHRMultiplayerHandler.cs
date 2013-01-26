//-----------------------------------------------------------------------
// <copyright file="BasicChat.cs" company="Qualcomm Innovation Center, Inc.">
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
using System.Runtime.InteropServices;
using System.Collections;
using System.Threading;

namespace basic_clientserver
{
	class RHRMultiplayerHandler : MonoBehaviour
	{
		private const string INTERFACE_NAME = "org.alljoyn.bus.rhrmulti";
		private const string SERVICE_NAME = "org.alljoyn.bus.rhrmulti";
		private const string SERVICE_PATH = "/rhrmulti";
		private const ushort SERVICE_PORT = 25;
		
		private static readonly string[] connectArgs = {"unix:abstract=alljoyn",
														"tcp:addr=127.0.0.1,port=9955",
														"launchd:"};
		private string connectedVal;
        

		private static AllJoyn.BusAttachment msgBus;
		private MyBusListener busListener;
		private MySessionPortListener sessionPortListener;
		private static MySessionListener sessionListener;
		private static TestBusObject testObj;
		private AllJoyn.InterfaceDescription testIntf;
		public static string chatText = "";
        public AllJoyn.SessionOpts opts;
		
		public static ArrayList sFoundName = new ArrayList();
		public static string currentJoinedSession = null;
		private static uint currentSessionId = 0;
		private static string myAdvertisedName = null;
		
		public static bool AllJoynStarted = false;
		
		private string playerNick = "";
		private string connectedPlayerNick = "";
		
		private bool isDuringGame = false;
		
		private double[] envBuffer = new double[0];
		private static Mutex mutex = new Mutex();
       
		class TestBusObject : AllJoyn.BusObject
		{
			private AllJoyn.InterfaceDescription.Member chatMember;
			private AllJoyn.InterfaceDescription.Member vectorMember;
			
			public TestBusObject(AllJoyn.BusAttachment bus, string path) : base(path, false)
			{
			
				AllJoyn.InterfaceDescription exampleIntf = bus.GetInterface(INTERFACE_NAME);
				AllJoyn.QStatus status = AddInterface(exampleIntf);
				if(!status)
				{
					chatText = "RHR Failed to add interface " + status.ToString() + "\n" + chatText;
					Debug.Log("RHR Failed to add interface " + status.ToString());
				}
				
				chatMember = exampleIntf.GetMember("chat");
				vectorMember = exampleIntf.GetMember("vector");
			}

			protected override void OnObjectRegistered ()
			{
			
				chatText = "RHR ObjectRegistered has been called\n" + chatText;
				Debug.Log("RHR ObjectRegistered has been called");
			}
			
			public void SendChatSignal(string msg) {
				AllJoyn.MsgArgs payload = new AllJoyn.MsgArgs(1);
				payload[0].Set(msg);
				AllJoyn.QStatus status = Signal(null, currentSessionId, chatMember, payload, 0, 64);
				if(!status) {
					Debug.Log("RHR failed to send signal: "+status.ToString());	
				}
			}
			
			public void SendArraySignal(double[] data) {
				AllJoyn.MsgArgs payload = new AllJoyn.MsgArgs((uint)1);
				payload[0].Set((double[])data);
				AllJoyn.QStatus status = Signal(null, currentSessionId, vectorMember, payload, 0, 64);
				if(!status) {
					Debug.Log("RHR failed to send vector signal: "+status.ToString());	
					chatText += "RHR failed to send vector signal: "+status.ToString() + "\n" + chatText;
				}
			}
		}

		class MyBusListener : AllJoyn.BusListener
		{
			protected override void FoundAdvertisedName(string name, AllJoyn.TransportMask transport, string namePrefix)
			{
				chatText = "RHR FoundAdvertisedName(name=" + name + ", prefix=" + namePrefix + ")\n" + chatText;
				Debug.Log("RHR FoundAdvertisedName(name=" + name + ", prefix=" + namePrefix + ")");
				if(string.Compare(myAdvertisedName, name) == 0)
				{
					chatText = "Ignoring my advertisement\n" + chatText;
					Debug.Log("Ignoring my advertisement");
				} else if(string.Compare(SERVICE_NAME, namePrefix) == 0)
				{
					sFoundName.Add(name);
				}
			}

            protected override void ListenerRegistered(AllJoyn.BusAttachment busAttachment)
            {
                chatText = "RHR ListenerRegistered: busAttachment=" + busAttachment + "\n" + chatText;
                Debug.Log("RHR ListenerRegistered: busAttachment=" + busAttachment);
            }

			protected override void NameOwnerChanged(string busName, string previousOwner, string newOwner)
			{
				//if(string.Compare(SERVICE_NAME, busName) == 0)
				{
					chatText = "RHR NameOwnerChanged: name=" + busName + ", oldOwner=" +
						previousOwner + ", newOwner=" + newOwner + "\n" + chatText;
					Debug.Log("RHR NameOwnerChanged: name=" + busName + ", oldOwner=" +
						previousOwner + ", newOwner=" + newOwner);
				}
			}
			
			protected override void LostAdvertisedName(string name, AllJoyn.TransportMask transport, string namePrefix)
			{
				chatText = "RHR LostAdvertisedName(name=" + name + ", prefix=" + namePrefix + ")\n" + chatText;
				Debug.Log("RHR LostAdvertisedName(name=" + name + ", prefix=" + namePrefix + ")");
				sFoundName.Remove(name);
			}
		}

		class MySessionPortListener : AllJoyn.SessionPortListener
		{
			private RHRMultiplayerHandler chat;
			
			public MySessionPortListener(RHRMultiplayerHandler chat)
			{
				this.chat = chat;
			}
			
			protected override bool AcceptSessionJoiner(ushort sessionPort, string joiner, AllJoyn.SessionOpts opts)
			{
			
				if (sessionPort != SERVICE_PORT)
				{
					chatText = "RHR Rejecting join attempt on unexpected session port " + sessionPort + "\n" + chatText;
					Debug.Log("RHR Rejecting join attempt on unexpected session port " + sessionPort);
					return false;
				}
				chatText = "RHR Accepting join session request from " + joiner + 
					" (opts.proximity=" + opts.Proximity + ", opts.traffic=" + opts.Traffic + 
					", opts.transports=" + opts.Transports + ")\n" + chatText;
				Debug.Log("RHR Accepting join session request from " + joiner + 
					" (opts.proximity=" + opts.Proximity + ", opts.traffic=" + opts.Traffic + 
					", opts.transports=" + opts.Transports + ")");
				return true;
			}
					
			protected override void SessionJoined(ushort sessionPort, uint sessionId, string joiner)
			{
				Debug.Log("Session Joined!!!!!!");
				chatText = "Session Joined!!!!!! \n" + chatText;
				currentSessionId = sessionId;
				currentJoinedSession = myAdvertisedName;
				chat.SetConnectedPlayerNick(joiner);
				chat.GameStarted();
				if(sessionListener == null) {
					sessionListener = new MySessionListener(chat);
					msgBus.SetSessionListener(sessionListener, sessionId);
				}
			}
		}
		
		class MySessionListener : AllJoyn.SessionListener
		{
			private RHRMultiplayerHandler chat;
			
			public MySessionListener(RHRMultiplayerHandler chat)
			{
				this.chat = chat;	
			}
			protected override void	SessionLost(uint sessionId)
			{
				chat.SetConnectedPlayerNick("");
				chat.GameEnded();
				chatText = "SessionLost ("+sessionId+") \n" + chatText;	
				Debug.Log("SessionLost ("+sessionId+")");
			}
			
			protected override void SessionMemberAdded(uint sessionId, string uniqueName)
			{
				chatText = "SessionMemberAdded ("+sessionId+","+uniqueName+") \n" + chatText;	
				Debug.Log("SessionMemberAdded ("+sessionId+","+uniqueName+")");
			}

			protected override void SessionMemberRemoved(uint sessionId, string uniqueName)
			{	
				chatText = "SessionMemberRemoved ("+sessionId+","+uniqueName+") \n" + chatText;	
				Debug.Log("SessionMemberRemoved ("+sessionId+","+uniqueName+")");
			}
		}
		
		public RHRMultiplayerHandler(string nick)
		{
			playerNick = nick;
			StartUp();
		}
		
		public bool IsDuringGame()
		{
			return isDuringGame;
		}
		
		public void GameStarted()
		{
			isDuringGame	= true;
		}
		
		public void GameEnded()
		{
			isDuringGame = false;	
		}
		
		public string RetrievePlayerNick(string advertisedName)
			{
			int delimiterIndex = advertisedName.IndexOf("._") + 2 +
												msgBus.GlobalGUIDString.Length;
			return advertisedName.Substring(delimiterIndex);
		}
		
		public void SetConnectedPlayerNick(string nick)
		{
			connectedPlayerNick = nick;
		}
		
		public string GetConnectedPlayerNick()
		{
			return connectedPlayerNick;
		}
		
		public void Start()
		{
			DontDestroyOnLoad(this);
		}
		
		public double[] GetEnvData()
		{
			mutex.WaitOne();
			double[] data = envBuffer;
			envBuffer = new double[0];
			mutex.ReleaseMutex();
			
			return data;
		}
		
		public void AddEnvData(double[] newData)
		{
			mutex.WaitOne();
			
			double[] tmpBuffer = new double[envBuffer.Length + newData.Length];
			for (int i = 0; i < envBuffer.Length; i++)
			{
				tmpBuffer[i] = envBuffer[i];
			}
			for (int i = envBuffer.Length, j = 0; j < newData.Length; i++, j++)
			{
				tmpBuffer[i] = newData[j];
			}
			envBuffer = tmpBuffer;
			
			mutex.ReleaseMutex();
		}
		
		public bool HasEnvData()
		{
			mutex.WaitOne();
			int envLength = envBuffer.Length;
			mutex.ReleaseMutex();
			
			return envLength > 0;	
		}
		
		public void StartUp()
		{
			chatText = "Starting AllJoyn\n\n\n" + chatText;
			AllJoynStarted = true;
			AllJoyn.QStatus status = AllJoyn.QStatus.OK;
			{
				chatText = "Creating BusAttachment\n" + chatText;
				// Create message bus
				msgBus = new AllJoyn.BusAttachment("myApp", true);
	
				// Add org.alljoyn.Bus.method_sample interface
				status = msgBus.CreateInterface(INTERFACE_NAME, false, out testIntf);
				if(status)
				{
				
					chatText = "RHR Interface Created.\n" + chatText;
					Debug.Log("RHR Interface Created.");
					testIntf.AddSignal("chat", "s", "msg", 0);
					testIntf.AddSignal ("vector", "ad", "points", 0);
					testIntf.Activate();
				}
				else
				{
					chatText = "Failed to create interface 'org.alljoyn.Bus.chat'\n" + chatText;
					Debug.Log("Failed to create interface 'org.alljoyn.Bus.chat'");
				}
	
				// Create a bus listener
				busListener = new MyBusListener();
				if(status)
				{
				
					msgBus.RegisterBusListener(busListener);
					chatText = "RHR BusListener Registered.\n" + chatText;
					Debug.Log("RHR BusListener Registered.");
				}
				
				
				if(testObj == null)
					testObj = new TestBusObject(msgBus, SERVICE_PATH);
				
				// Start the msg bus
				if(status)
				{
				
					status = msgBus.Start();
					if(status)
					{
						chatText = "RHR BusAttachment started.\n" + chatText;
						Debug.Log("RHR BusAttachment started.");
						
						msgBus.RegisterBusObject(testObj);
						for (int i = 0; i < connectArgs.Length; ++i)
						{
							chatText = "RHR Connect trying: "+connectArgs[i]+"\n" + chatText;
							Debug.Log("RHR Connect trying: "+connectArgs[i]);
							status = msgBus.Connect(connectArgs[i]);
							if (status)
							{
								chatText = "BusAttchement.Connect(" + connectArgs[i] + ") SUCCEDED.\n" + chatText;
								Debug.Log("BusAttchement.Connect(" + connectArgs[i] + ") SUCCEDED.");
								connectedVal = connectArgs[i];
								break;
							}
							else
							{
								chatText = "BusAttachment.Connect(" + connectArgs[i] + ") failed.\n" + chatText;
								Debug.Log("BusAttachment.Connect(" + connectArgs[i] + ") failed.");
							}
						}
						if(!status)
						{
							chatText = "BusAttachment.Connect failed.\n" + chatText;
							Debug.Log("BusAttachment.Connect failed.");
						}
					}
					else
					{
						chatText = "RHR BusAttachment.Start failed.\n" + chatText;
						Debug.Log("RHR BusAttachment.Start failed.");
					}
				}
				
				myAdvertisedName = SERVICE_NAME+ "._" + msgBus.GlobalGUIDString + playerNick;
				
				AllJoyn.InterfaceDescription.Member chatMember = testIntf.GetMember("chat");
				status = msgBus.RegisterSignalHandler(this.ChatSignalHandler, chatMember, null);
				if(!status)
				{
					chatText ="RHR Failed to add signal handler " + status + "\n" + chatText;
					Debug.Log("RHR Failed to add signal handler " + status);
				}
				else {			
					chatText ="RHR add signal handler " + status + "\n" + chatText;
					Debug.Log("RHR add signal handler " + status);
				}
				
				AllJoyn.InterfaceDescription.Member vectorMember = testIntf.GetMember ("vector");
				status = msgBus.RegisterSignalHandler(this.VectorSignalHandler, vectorMember, null);
				if(!status)
				{
					chatText ="RHR Failed to add vector signal handler " + status + "\n" + chatText;
					Debug.Log("RHR Failed to add vector signal handler " + status);
				}
				else {			
					chatText ="RHR add vector signal handler " + status + "\n" + chatText;
					Debug.Log("RHR add vector signal handler " + status);
				}
				
				status = msgBus.AddMatch("type='signal',member='chat'");
				if(!status)
				{
					chatText ="RHR Failed to add Match " + status.ToString() + "\n" + chatText;
					Debug.Log("RHR Failed to add Match " + status.ToString());
				}
				else {			
					chatText ="RHR add Match " + status.ToString() + "\n" + chatText;
					Debug.Log("RHR add Match " + status.ToString());
				}
				
				
				status = msgBus.AddMatch("type='signal',member='vector'");
				if(!status)
				{
					chatText ="RHR Failed to add vector Match " + status.ToString() + "\n" + chatText;
					Debug.Log("RHR Failed to add vector Match " + status.ToString());
				}
				else {			
					chatText ="RHR add vector Match " + status.ToString() + "\n" + chatText;
					Debug.Log("RHR add vector Match " + status.ToString());
				}
			}
			
			// Request name
			if(status)
			{
			
				status = msgBus.RequestName(myAdvertisedName,
					AllJoyn.DBus.NameFlags.ReplaceExisting | AllJoyn.DBus.NameFlags.DoNotQueue);
				if(!status)
				{
					chatText ="RHR RequestName(" + SERVICE_NAME + ") failed (status=" + status + ")\n" + chatText;
					Debug.Log("RHR RequestName(" + SERVICE_NAME + ") failed (status=" + status + ")");
				}
			}

			// Create session
			opts = new AllJoyn.SessionOpts(AllJoyn.SessionOpts.TrafficType.Messages, false,
					AllJoyn.SessionOpts.ProximityType.Any, AllJoyn.TransportMask.Any);
			if(status)
			{
			
				ushort sessionPort = SERVICE_PORT;
				sessionPortListener = new MySessionPortListener(this);
				status = msgBus.BindSessionPort(ref sessionPort, opts, sessionPortListener);
				if(!status || sessionPort != SERVICE_PORT)
				{
					chatText = "RHR BindSessionPort failed (" + status + ")\n" + chatText;
					Debug.Log("RHR BindSessionPort failed (" + status + ")");
				}
				chatText = "RHR BindSessionPort on port (" + sessionPort + ")\n" + chatText;
				Debug.Log("RHR BBindSessionPort on port (" + sessionPort + ")");;
			}

			// Advertise name
			if(status)
			{
				status = msgBus.AdvertiseName(myAdvertisedName, opts.Transports);
				if(!status)
				{
					chatText = "RHR Failed to advertise name " + myAdvertisedName + " (" + status + ")\n" + chatText;
					Debug.Log("RHR Failed to advertise name " + myAdvertisedName + " (" + status + ")");
				}
			}
			
			status = msgBus.FindAdvertisedName(SERVICE_NAME);
			if(!status)
			{
				chatText = "RHR org.alljoyn.Bus.FindAdvertisedName failed.\n" + chatText;
				Debug.Log("RHR org.alljoyn.Bus.FindAdvertisedName failed.");
			}
			
			Debug.Log("Completed ChatService Constructor");
		}
		
		public void ChatSignalHandler(AllJoyn.InterfaceDescription.Member member, string srcPath, AllJoyn.Message message)
		{
			Debug.Log("Client Chat msg - : "+ message[0]);
			chatText = "Client Chat msg: ("+message[0]+ ")\n" + chatText;
		}
		
		public void VectorSignalHandler(AllJoyn.InterfaceDescription.Member member, string srcPath, AllJoyn.Message message)
		{
			Debug.Log ("VectorSignalHandler: new message");
			
			Debug.Log ("AllJoynClientServer: ReceivedUpdateState");
			double[] state = (double[])message[0];
			
			AddEnvData(state);
		}
		
		public void SendTheMsg(string msg) {
			if(currentSessionId != 0) {
				testObj.SendChatSignal(msg);
			}
		}
		
		public void SendDoubleArray(double[] data) {
			Debug.Log ("SEND VECTOR");
			if (currentSessionId != 0) {
				testObj.SendArraySignal(data);
			}
		}
		
		public bool JoinSession(string session)
		{
			if(currentJoinedSession != null)
				LeaveSession();
			AllJoyn.QStatus status = AllJoyn.QStatus.NONE;
			if(sessionListener != null) {
				status = msgBus.SetSessionListener(null, currentSessionId);
				sessionListener = null;
				if(!status) {
	            	chatText = "SetSessionListener failed status(" + status.ToString() + ")\n" + chatText;
					Debug.Log("SetSessionListener status(" + status.ToString() + ")");
				}
			}
			sessionListener = new MySessionListener(this);
			chatText = "About to call JoinSession (Session=" + session + ")\n" + chatText;
			Debug.Log("About to call JoinSession (Session=" + session + ")");
			status = msgBus.JoinSession(session, SERVICE_PORT, sessionListener, out currentSessionId, opts);
			if(status)
			{
				chatText = "Client JoinSession SUCCESS (Session id=" + currentSessionId + ")\n" + chatText;
				Debug.Log("Client JoinSession SUCCESS (Session id=" + currentSessionId + ")");
				currentJoinedSession = session;
			}
			else
			{
				chatText = "RHR JoinSession failed (status=" + status.ToString() + ")\n" + chatText;
				Debug.Log("RHR JoinSession failed (status=" + status.ToString() + ")");
			}
			
			return status ? true : false;
		}
		
		public void LeaveSession()
		{
			Debug.Log("in LeaveSession.");
			if(currentSessionId != 0) {
				AllJoyn.QStatus status = AllJoyn.QStatus.NONE;
				if(sessionListener != null) {
					Debug.Log("clear session listener");
					status = msgBus.SetSessionListener(null, currentSessionId);
					sessionListener = null;
					if(!status) {
		            	chatText = "SetSessionListener failed status(" + status.ToString() + ")\n" + chatText;
						Debug.Log("SetSessionListener status(" + status.ToString() + ")");
					}
				}
				Debug.Log("about to leave session");
				status = msgBus.LeaveSession(currentSessionId);
				if(status)
				{
					chatText = "RHR LeaveSession SUCCESS (Session id=" + currentSessionId + ")\n" + chatText;
					Debug.Log("RHR LeaveSession SUCCESS (Session id=" + currentSessionId + ")");
					currentSessionId = 0;
					currentJoinedSession = null;
				}
				else
				{
					chatText = "RHR LeaveSession failed (status=" + status.ToString() + ")\n" + chatText;
					Debug.Log("RHR LeaveSession failed (status=" + status.ToString() + ")");
				}
			} else {
				currentJoinedSession = null;
			}
			Debug.Log("done LeaveSession.");
		}
		
		public void CloseDown()
		{	
			if(msgBus == null)
				return; //no need to clean anything up
			AllJoynStarted = false;
			LeaveSession();
			AllJoyn.QStatus status = msgBus.CancelFindAdvertisedName(SERVICE_NAME);
			if(!status) {
            	chatText = "CancelAdvertisedName failed status(" + status.ToString() + ")\n" + chatText;
				Debug.Log("CancelAdvertisedName failed status(" + status.ToString() + ")");
			}
			status = msgBus.CancelAdvertisedName(myAdvertisedName, opts.Transports);
			if(!status) {
            	chatText = "CancelAdvertisedName failed status(" + status.ToString() + ")\n" + chatText;
				Debug.Log("CancelAdvertisedName failed status(" + status.ToString() + ")");
			}
			status = msgBus.ReleaseName(myAdvertisedName);
			if(!status) {
            	chatText = "ReleaseName failed status(" + status.ToString() + ")\n" + chatText;
				Debug.Log("ReleaseName status(" + status.ToString() + ")");
			}
			status = msgBus.UnbindSessionPort(SERVICE_PORT);
			if(!status) {
            	chatText = "UnbindSessionPort failed status(" + status.ToString() + ")\n" + chatText;
				Debug.Log("UnbindSessionPort status(" + status.ToString() + ")");
			}
			
			status = msgBus.Disconnect(connectedVal);
			if(!status) {
            	chatText = "Disconnect failed status(" + status.ToString() + ")\n" + chatText;
				Debug.Log("Disconnect status(" + status.ToString() + ")");
			}
			
			AllJoyn.InterfaceDescription.Member chatMember = testIntf.GetMember("chat");
			status = msgBus.UnregisterSignalHandler(this.ChatSignalHandler, chatMember, null);
			chatMember = null;
			if(!status) {
            	chatText = "UnregisterSignalHandler failed status(" + status.ToString() + ")\n" + chatText;
				Debug.Log("UnregisterSignalHandler status(" + status.ToString() + ")");
			}
			
			AllJoyn.InterfaceDescription.Member vectorMember = testIntf.GetMember("vector");
			status = msgBus.UnregisterSignalHandler(this.VectorSignalHandler, vectorMember, null);
			vectorMember = null;
			if(!status) {
            	chatText = "UnregisterSignalHandler Vector failed status(" + status.ToString() + ")\n" + chatText;
				Debug.Log("UnregisterSignalHandler Vector status(" + status.ToString() + ")");
			}
			if(sessionListener != null) {
				status = msgBus.SetSessionListener(null, currentSessionId);
				sessionListener = null;
				if(!status) {
	            	chatText = "SetSessionListener failed status(" + status.ToString() + ")\n" + chatText;
					Debug.Log("SetSessionListener status(" + status.ToString() + ")");
				}
			}
			chatText = "No Exceptions(" + status.ToString() + ")\n" + chatText;
			Debug.Log("No Exceptions(" + status.ToString() + ")");
			currentSessionId = 0;
			currentJoinedSession = null;
			sFoundName.Clear();
			
			connectedVal = null;
        	msgBus = null;
			busListener = null;
			sessionPortListener = null;
			testObj = null;
			testIntf = null;
	        opts = null;
			myAdvertisedName = null;
			
			AllJoynStarted = false;
			
			AllJoyn.StopAllJoynProcessing(); //Stop processing alljoyn callbacks
		}
	}
}