using UnityEngine;
using AllJoynUnity;
using System.Runtime.InteropServices;
using System.Collections;
using System.Threading;

namespace rhr_multi
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
		public static string debugText = "";
        public AllJoyn.SessionOpts opts;
		
		public static ArrayList sFoundName = new ArrayList();
		public static string currentJoinedSession = null;
		private static uint currentSessionId = 0;
		private static string myAdvertisedName = null;
		
		public static bool AllJoynStarted = false;
		
		private string playerNick = "";
		private string connectedPlayerNick = "";
		
		private bool isDuringGame = false;
		
		private ArrayList envBuffers = new ArrayList();
		private double[] enemyInput = new double[0];
		private static Mutex mutex = new Mutex();
       
		
		public RHRMultiplayerHandler(string nick)
		{
			playerNick = nick;
			StartUp();
		}
		
		public void Start()
		{
			// Obiekt uruchamiany w scenie ladujacej ustawienia multiplayera,
			// a potem uzywany w scenie poscigu
			DontDestroyOnLoad(this);
		}
		
		// Funkcja przekazujaca obiektowi dane do wyslania
		public void SendData(double[] playerInput, double[] envData)
		{
			if (currentSessionId != 0) {
				testObj.SendData(playerInput, envData);	
			}
		}
		
		// Setter, getter i funkcja sprawdzajaca obecnosc bufora danych otoczenia
		public double[] GetEnvData()
		{
			mutex.WaitOne();
			if (envBuffers.Count == 0)
			{
				mutex.ReleaseMutex();
				return new double[0];
			}
			double[] data = (double[])envBuffers[0];
			envBuffers.RemoveAt(0);
			mutex.ReleaseMutex();
			
			return data;
		}
		
		public void AddEnvData(double[] newData)
		{
			mutex.WaitOne();
			envBuffers.Add (newData);
			
			mutex.ReleaseMutex();
		}
		
		public bool HasEnvData()
		{
			mutex.WaitOne();
			int envLength = envBuffers.Count;
			mutex.ReleaseMutex();
			
			return envLength > 0;	
		}
		
		// Setter, getter i funkcja sprawdzajaca obecnosc wejscia przeciwnika
		public double[] GetEnemyInput()
		{
			mutex.WaitOne();
			double[] tmp = enemyInput;
			enemyInput = new double[0];
			mutex.ReleaseMutex();
			
			return tmp;	
		}
		
		public void SetEnemyInput(double[] enemyInput)
		{
			mutex.WaitOne();
			Debug.Log("SetEnemyInput");
			this.enemyInput = enemyInput;
			mutex.ReleaseMutex();
		}
		
		public bool HasEnemyInput()
		{
			mutex.WaitOne();
			int enemyInputLength = enemyInput.Length;
			mutex.ReleaseMutex();
			
			return enemyInputLength > 0;
		}
		
		
		// FUNKCJE POMOCNICZE
		
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
		
		
		// FUNKCJE OBSLUGUJACE WIADOMOSCI
		// OTRZYMYWANE OD DRUGIEGO GRACZA
		
		public void ChatSignalHandler(AllJoyn.InterfaceDescription.Member member, string srcPath, AllJoyn.Message message)
		{
			Debug.Log("Client Chat msg - : "+ message[0]);
			debugText = "Client Chat msg: ("+message[0]+ ")\n" + debugText;
		}
		
		public void VectorSignalHandler(AllJoyn.InterfaceDescription.Member member, string srcPath, AllJoyn.Message message)
		{
			double[] enemyInput = (double[])message[0];
			double[] envData = (double[])message[1];
			
			if (enemyInput.Length > 0)
			{
				Debug.Log("VSH: enemy Input not empty");	
				SetEnemyInput(enemyInput);
			}
			if (envData.Length > 0)
			{
				AddEnvData(envData);
			}
		}
		
		// KLASY POMOCNICZE
		// DZIEDZICZACE PO KLASACH Z ALLJOYNA W CELU
		// DOSTARCZENIA FUNKCJI CHARAKTERYSTYCZNYCH DLA TEJ GRY
		
		// KLASA WYSYLAJACA WIADOMOSCI
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
					debugText = "RHR Failed to add interface " + status.ToString() + "\n" + debugText;
					Debug.Log("RHR Failed to add interface " + status.ToString());
				}
				
				chatMember = exampleIntf.GetMember("chat");
				vectorMember = exampleIntf.GetMember("vector");
			}

			protected override void OnObjectRegistered ()
			{
			
				debugText = "RHR ObjectRegistered has been called\n" + debugText;
				Debug.Log("RHR ObjectRegistered has been called");
			}
			
			public void SendChatSignal(string msg)
			{
				AllJoyn.MsgArgs payload = new AllJoyn.MsgArgs(1);
				payload[0].Set(msg);
				AllJoyn.QStatus status = Signal(null, currentSessionId, chatMember, payload, 0, 64);
				if(!status) {
					Debug.Log("RHR failed to send signal: "+status.ToString());	
				}
			}
			
			public void SendArraySignal(double[] data)
			{
				AllJoyn.MsgArgs payload = new AllJoyn.MsgArgs((uint)1);
				payload[0].Set((double[])data);
				AllJoyn.QStatus status = Signal(null, currentSessionId, vectorMember, payload, 0, 64);
				if(!status) {
					Debug.Log("RHR failed to send vector signal: "+status.ToString());	
					debugText += "RHR failed to send vector signal: "+status.ToString() + "\n" + debugText;
				}
			}
			
			public void SendData(double[] playerInput, double[] envData)
			{
				AllJoyn.MsgArgs payload = new AllJoyn.MsgArgs((uint)2);
				payload[0].Set((double[])playerInput);
				payload[1].Set((double[])envData);
				AllJoyn.QStatus status = Signal(null, currentSessionId, vectorMember, payload, 0, 64);
				if(!status) {
					Debug.Log("RHR failed to send vector(data) signal: "+status.ToString());	
					debugText += "RHR failed to send vector(data) signal: "+status.ToString() + "\n" + debugText;
				}
			}
		}

		class MyBusListener : AllJoyn.BusListener
		{
			protected override void FoundAdvertisedName(string name, AllJoyn.TransportMask transport, string namePrefix)
			{
				debugText = "RHR FoundAdvertisedName(name=" + name + ", prefix=" + namePrefix + ")\n" + debugText;
				Debug.Log("RHR FoundAdvertisedName(name=" + name + ", prefix=" + namePrefix + ")");
				if(string.Compare(myAdvertisedName, name) == 0)
				{
					debugText = "Ignoring my advertisement\n" + debugText;
					Debug.Log("Ignoring my advertisement");
				} else if(string.Compare(SERVICE_NAME, namePrefix) == 0)
				{
					sFoundName.Add(name);
				}
			}

            protected override void ListenerRegistered(AllJoyn.BusAttachment busAttachment)
            {
                debugText = "RHR ListenerRegistered: busAttachment=" + busAttachment + "\n" + debugText;
                Debug.Log("RHR ListenerRegistered: busAttachment=" + busAttachment);
            }

			protected override void NameOwnerChanged(string busName, string previousOwner, string newOwner)
			{
				debugText = "RHR NameOwnerChanged: name=" + busName + ", oldOwner=" +
					previousOwner + ", newOwner=" + newOwner + "\n" + debugText;
				Debug.Log("RHR NameOwnerChanged: name=" + busName + ", oldOwner=" +
					previousOwner + ", newOwner=" + newOwner);
			}
			
			protected override void LostAdvertisedName(string name, AllJoyn.TransportMask transport, string namePrefix)
			{
				debugText = "RHR LostAdvertisedName(name=" + name + ", prefix=" + namePrefix + ")\n" + debugText;
				Debug.Log("RHR LostAdvertisedName(name=" + name + ", prefix=" + namePrefix + ")");
				sFoundName.Remove(name);
			}
		}

		class MySessionPortListener : AllJoyn.SessionPortListener
		{
			private RHRMultiplayerHandler multiplayerHandler;
			
			public MySessionPortListener(RHRMultiplayerHandler multiplayerHandler)
			{
				this.multiplayerHandler = multiplayerHandler;
			}
			
			protected override bool AcceptSessionJoiner(ushort sessionPort, string joiner, AllJoyn.SessionOpts opts)
			{
			
				if (sessionPort != SERVICE_PORT)
				{
					debugText = "RHR Rejecting join attempt on unexpected session port " + sessionPort + "\n" + debugText;
					Debug.Log("RHR Rejecting join attempt on unexpected session port " + sessionPort);
					return false;
				}
				debugText = "RHR Accepting join session request from " + joiner + 
					" (opts.proximity=" + opts.Proximity + ", opts.traffic=" + opts.Traffic + 
					", opts.transports=" + opts.Transports + ")\n" + debugText;
				Debug.Log("RHR Accepting join session request from " + joiner + 
					" (opts.proximity=" + opts.Proximity + ", opts.traffic=" + opts.Traffic + 
					", opts.transports=" + opts.Transports + ")");
				return true;
			}
					
			protected override void SessionJoined(ushort sessionPort, uint sessionId, string joiner)
			{
				Debug.Log("Session Joined!!!!!!");
				debugText = "Session Joined!!!!!! \n" + debugText;
				currentSessionId = sessionId;
				currentJoinedSession = myAdvertisedName;
				multiplayerHandler.SetConnectedPlayerNick(joiner);
				multiplayerHandler.GameStarted();
				if(sessionListener == null) {
					sessionListener = new MySessionListener(multiplayerHandler);
					msgBus.SetSessionListener(sessionListener, sessionId);
				}
			}
		}
		
		class MySessionListener : AllJoyn.SessionListener
		{
			private RHRMultiplayerHandler multiplayerHandler;
			
			public MySessionListener(RHRMultiplayerHandler multiplayerHandler)
			{
				this.multiplayerHandler = multiplayerHandler;	
			}
			protected override void	SessionLost(uint sessionId)
			{
				multiplayerHandler.SetConnectedPlayerNick("");
				multiplayerHandler.GameEnded();
				debugText = "SessionLost ("+sessionId+") \n" + debugText;	
				Debug.Log("SessionLost ("+sessionId+")");
			}
			
			protected override void SessionMemberAdded(uint sessionId, string uniqueName)
			{
				debugText = "SessionMemberAdded ("+sessionId+","+uniqueName+") \n" + debugText;	
				Debug.Log("SessionMemberAdded ("+sessionId+","+uniqueName+")");
			}

			protected override void SessionMemberRemoved(uint sessionId, string uniqueName)
			{	
				debugText = "SessionMemberRemoved ("+sessionId+","+uniqueName+") \n" + debugText;	
				Debug.Log("SessionMemberRemoved ("+sessionId+","+uniqueName+")");
			}
		}
		
		
		
		// FUNKCJE ODPOWIADAJACE ZA URUCHAMIANIE ALLJOYNA,
		// DOLACZANIE DO SESJI Z INNYM GRACZEM,
		// KONCZENIE SESJI ORAZ WYLACZANIE ALLJOYNA
		
		
		public void StartUp()
		{
			debugText = "Starting AllJoyn\n\n\n" + debugText;
			AllJoynStarted = true;
			AllJoyn.QStatus status = AllJoyn.QStatus.OK;
			{
				debugText = "Creating BusAttachment\n" + debugText;
				msgBus = new AllJoyn.BusAttachment("myApp", true);
	
				status = msgBus.CreateInterface(INTERFACE_NAME, false, out testIntf);
				if(status)
				{
					debugText = "RHR Interface Created.\n" + debugText;
					Debug.Log("RHR Interface Created.");
					testIntf.AddSignal("chat", "s", "msg", 0);
					testIntf.AddSignal ("vector", "adad", "points", 0);
					testIntf.Activate();
				}
				else
				{
					debugText = "Failed to create interface 'org.alljoyn.Bus.chat'\n" + debugText;
					Debug.Log("Failed to create interface 'org.alljoyn.Bus.chat'");
				}
	
				busListener = new MyBusListener();
				if(status)
				{
					msgBus.RegisterBusListener(busListener);
					debugText = "RHR BusListener Registered.\n" + debugText;
					Debug.Log("RHR BusListener Registered.");
				}
				
				
				if(testObj == null)
					testObj = new TestBusObject(msgBus, SERVICE_PATH);
				
				if(status)
				{
					status = msgBus.Start();
					if(status)
					{
						debugText = "RHR BusAttachment started.\n" + debugText;
						Debug.Log("RHR BusAttachment started.");
						
						msgBus.RegisterBusObject(testObj);
						for (int i = 0; i < connectArgs.Length; ++i)
						{
							debugText = "RHR Connect trying: "+connectArgs[i]+"\n" + debugText;
							Debug.Log("RHR Connect trying: "+connectArgs[i]);
							status = msgBus.Connect(connectArgs[i]);
							if (status)
							{
								debugText = "BusAttchement.Connect(" + connectArgs[i] + ") SUCCEDED.\n" + debugText;
								Debug.Log("BusAttchement.Connect(" + connectArgs[i] + ") SUCCEDED.");
								connectedVal = connectArgs[i];
								break;
							}
							else
							{
								debugText = "BusAttachment.Connect(" + connectArgs[i] + ") failed.\n" + debugText;
								Debug.Log("BusAttachment.Connect(" + connectArgs[i] + ") failed.");
							}
						}
						if(!status)
						{
							debugText = "BusAttachment.Connect failed.\n" + debugText;
							Debug.Log("BusAttachment.Connect failed.");
						}
					}
					else
					{
						debugText = "RHR BusAttachment.Start failed.\n" + debugText;
						Debug.Log("RHR BusAttachment.Start failed.");
					}
				}
				
				myAdvertisedName = SERVICE_NAME+ "._" + msgBus.GlobalGUIDString + playerNick;
				
				AllJoyn.InterfaceDescription.Member chatMember = testIntf.GetMember("chat");
				status = msgBus.RegisterSignalHandler(this.ChatSignalHandler, chatMember, null);
				if(!status)
				{
					debugText ="RHR Failed to add signal handler " + status + "\n" + debugText;
					Debug.Log("RHR Failed to add signal handler " + status);
				}
				else {			
					debugText ="RHR add signal handler " + status + "\n" + debugText;
					Debug.Log("RHR add signal handler " + status);
				}
				
				AllJoyn.InterfaceDescription.Member vectorMember = testIntf.GetMember ("vector");
				status = msgBus.RegisterSignalHandler(this.VectorSignalHandler, vectorMember, null);
				if(!status)
				{
					debugText ="RHR Failed to add vector signal handler " + status + "\n" + debugText;
					Debug.Log("RHR Failed to add vector signal handler " + status);
				}
				else {			
					debugText ="RHR add vector signal handler " + status + "\n" + debugText;
					Debug.Log("RHR add vector signal handler " + status);
				}
				
				status = msgBus.AddMatch("type='signal',member='chat'");
				if(!status)
				{
					debugText ="RHR Failed to add Match " + status.ToString() + "\n" + debugText;
					Debug.Log("RHR Failed to add Match " + status.ToString());
				}
				else {			
					debugText ="RHR add Match " + status.ToString() + "\n" + debugText;
					Debug.Log("RHR add Match " + status.ToString());
				}
				
				
				status = msgBus.AddMatch("type='signal',member='vector'");
				if(!status)
				{
					debugText ="RHR Failed to add vector Match " + status.ToString() + "\n" + debugText;
					Debug.Log("RHR Failed to add vector Match " + status.ToString());
				}
				else {			
					debugText ="RHR add vector Match " + status.ToString() + "\n" + debugText;
					Debug.Log("RHR add vector Match " + status.ToString());
				}
			}
			
			if(status)
			{
			
				status = msgBus.RequestName(myAdvertisedName,
					AllJoyn.DBus.NameFlags.ReplaceExisting | AllJoyn.DBus.NameFlags.DoNotQueue);
				if(!status)
				{
					debugText ="RHR RequestName(" + SERVICE_NAME + ") failed (status=" + status + ")\n" + debugText;
					Debug.Log("RHR RequestName(" + SERVICE_NAME + ") failed (status=" + status + ")");
				}
			}

			opts = new AllJoyn.SessionOpts(AllJoyn.SessionOpts.TrafficType.Messages, false,
					AllJoyn.SessionOpts.ProximityType.Any, AllJoyn.TransportMask.Any);
			if(status)
			{
			
				ushort sessionPort = SERVICE_PORT;
				sessionPortListener = new MySessionPortListener(this);
				status = msgBus.BindSessionPort(ref sessionPort, opts, sessionPortListener);
				if(!status || sessionPort != SERVICE_PORT)
				{
					debugText = "RHR BindSessionPort failed (" + status + ")\n" + debugText;
					Debug.Log("RHR BindSessionPort failed (" + status + ")");
				}
				debugText = "RHR BindSessionPort on port (" + sessionPort + ")\n" + debugText;
				Debug.Log("RHR BBindSessionPort on port (" + sessionPort + ")");;
			}

			if(status)
			{
				status = msgBus.AdvertiseName(myAdvertisedName, opts.Transports);
				if(!status)
				{
					debugText = "RHR Failed to advertise name " + myAdvertisedName + " (" + status + ")\n" + debugText;
					Debug.Log("RHR Failed to advertise name " + myAdvertisedName + " (" + status + ")");
				}
			}
			
			status = msgBus.FindAdvertisedName(SERVICE_NAME);
			if(!status)
			{
				debugText = "RHR org.alljoyn.Bus.FindAdvertisedName failed.\n" + debugText;
				Debug.Log("RHR org.alljoyn.Bus.FindAdvertisedName failed.");
			}
			
			Debug.Log("Completed ChatService Constructor");
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
	            	debugText = "SetSessionListener failed status(" + status.ToString() + ")\n" + debugText;
					Debug.Log("SetSessionListener status(" + status.ToString() + ")");
				}
			}
			sessionListener = new MySessionListener(this);
			debugText = "About to call JoinSession (Session=" + session + ")\n" + debugText;
			Debug.Log("About to call JoinSession (Session=" + session + ")");
			status = msgBus.JoinSession(session, SERVICE_PORT, sessionListener, out currentSessionId, opts);
			if(status)
			{
				debugText = "Client JoinSession SUCCESS (Session id=" + currentSessionId + ")\n" + debugText;
				Debug.Log("Client JoinSession SUCCESS (Session id=" + currentSessionId + ")");
				currentJoinedSession = session;
			}
			else
			{
				debugText = "RHR JoinSession failed (status=" + status.ToString() + ")\n" + debugText;
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
		            	debugText = "SetSessionListener failed status(" + status.ToString() + ")\n" + debugText;
						Debug.Log("SetSessionListener status(" + status.ToString() + ")");
					}
				}
				Debug.Log("about to leave session");
				status = msgBus.LeaveSession(currentSessionId);
				if(status)
				{
					debugText = "RHR LeaveSession SUCCESS (Session id=" + currentSessionId + ")\n" + debugText;
					Debug.Log("RHR LeaveSession SUCCESS (Session id=" + currentSessionId + ")");
					currentSessionId = 0;
					currentJoinedSession = null;
				}
				else
				{
					debugText = "RHR LeaveSession failed (status=" + status.ToString() + ")\n" + debugText;
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
				return;
			AllJoynStarted = false;
			LeaveSession();
			AllJoyn.QStatus status = msgBus.CancelFindAdvertisedName(SERVICE_NAME);
			if(!status) {
            	debugText = "CancelAdvertisedName failed status(" + status.ToString() + ")\n" + debugText;
				Debug.Log("CancelAdvertisedName failed status(" + status.ToString() + ")");
			}
			status = msgBus.CancelAdvertisedName(myAdvertisedName, opts.Transports);
			if(!status) {
            	debugText = "CancelAdvertisedName failed status(" + status.ToString() + ")\n" + debugText;
				Debug.Log("CancelAdvertisedName failed status(" + status.ToString() + ")");
			}
			status = msgBus.ReleaseName(myAdvertisedName);
			if(!status) {
            	debugText = "ReleaseName failed status(" + status.ToString() + ")\n" + debugText;
				Debug.Log("ReleaseName status(" + status.ToString() + ")");
			}
			status = msgBus.UnbindSessionPort(SERVICE_PORT);
			if(!status) {
            	debugText = "UnbindSessionPort failed status(" + status.ToString() + ")\n" + debugText;
				Debug.Log("UnbindSessionPort status(" + status.ToString() + ")");
			}
			
			status = msgBus.Disconnect(connectedVal);
			if(!status) {
            	debugText = "Disconnect failed status(" + status.ToString() + ")\n" + debugText;
				Debug.Log("Disconnect status(" + status.ToString() + ")");
			}
			
			AllJoyn.InterfaceDescription.Member chatMember = testIntf.GetMember("chat");
			status = msgBus.UnregisterSignalHandler(this.ChatSignalHandler, chatMember, null);
			chatMember = null;
			if(!status) {
            	debugText = "UnregisterSignalHandler failed status(" + status.ToString() + ")\n" + debugText;
				Debug.Log("UnregisterSignalHandler status(" + status.ToString() + ")");
			}
			
			AllJoyn.InterfaceDescription.Member vectorMember = testIntf.GetMember("vector");
			status = msgBus.UnregisterSignalHandler(this.VectorSignalHandler, vectorMember, null);
			vectorMember = null;
			if(!status) {
            	debugText = "UnregisterSignalHandler Vector failed status(" + status.ToString() + ")\n" + debugText;
				Debug.Log("UnregisterSignalHandler Vector status(" + status.ToString() + ")");
			}
			if(sessionListener != null) {
				status = msgBus.SetSessionListener(null, currentSessionId);
				sessionListener = null;
				if(!status) {
	            	debugText = "SetSessionListener failed status(" + status.ToString() + ")\n" + debugText;
					Debug.Log("SetSessionListener status(" + status.ToString() + ")");
				}
			}
			debugText = "No Exceptions(" + status.ToString() + ")\n" + debugText;
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
			
			AllJoyn.StopAllJoynProcessing();
		}
	}
}
