using UnityEngine;
using AllJoynUnity;
using System.Runtime.InteropServices;
using System.Collections;
using System.Threading;

namespace rhr_multi
{
	class RHRMultiplayerHandler : ScriptableObject
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
		private double[] enemyPos = new double[0];
		private static Mutex mutex = new Mutex();
		
		private static bool allJoynDebugOn = false;
       
		public RHRMultiplayerHandler()
		{
			sFoundName = new ArrayList();
		}
		
		public RHRMultiplayerHandler(string nick)
		{
			sFoundName = new ArrayList();
			playerNick = nick;
		}
		
		public void Start()
		{
			// Obiekt uruchamiany w scenie ladujacej ustawienia multiplayera,
			// a potem uzywany w scenie poscigu
			DontDestroyOnLoad(this);
		}
		
		// Funkcja przekazujaca obiektowi dane do wyslania
		public void SendData(double[] playerInput, double[] playerPos, double[] envData)
		{
			if (currentSessionId != 0) {
				testObj.SendData(playerInput, playerPos, envData);	
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
		
		// Setter, getter i funkcja sprawdzajaca obecnosc pozycji przeciwnika
		public double[] GetEnemyPos()
		{
			mutex.WaitOne();
			double[] tmp = enemyPos;
			enemyInput = new double[0];
			mutex.ReleaseMutex();
			
			return tmp;	
		}
		
		public void SetEnemyPos(double[] enemyPos)
		{
			mutex.WaitOne();
			this.enemyPos = enemyPos;
			mutex.ReleaseMutex();
		}
		
		public bool HasEnemyPos()
		{
			mutex.WaitOne();
			int enemyPosLength = enemyPos.Length;
			mutex.ReleaseMutex();
			
			return enemyPosLength > 0;
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
		
		public void SetPlayerNick(string nick)
		{
			playerNick = nick;
		}
		
		public void SetConnectedPlayerNick(string nick)
		{
			connectedPlayerNick = nick;
		}
		
		public string GetConnectedPlayerNick()
		{
			return connectedPlayerNick;
		}
		
		private static void DebugLog(string msg) {
			if (allJoynDebugOn)
			{
				Debug.Log(msg);
				debugText = msg + "\n" + debugText;
			}
		}
		
		// FUNKCJE OBSLUGUJACE WIADOMOSCI
		// OTRZYMYWANE OD DRUGIEGO GRACZA
		
		public void VectorSignalHandler(AllJoyn.InterfaceDescription.Member member, string srcPath, AllJoyn.Message message)
		{
			double[] enemyInput = (double[])message[0];
			double[] enemyPos = (double[])message[1];
			double[] envData = (double[])message[2];
			
			if (enemyInput.Length > 0)
			{
				DebugLog("VSH: enemy Input not empty");	
				SetEnemyInput(enemyInput);
			}
			if (enemyPos.Length > 0)
			{
				SetEnemyPos(enemyPos);	
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
			private AllJoyn.InterfaceDescription.Member vectorMember;
			
			public TestBusObject(AllJoyn.BusAttachment bus, string path) : base(path, false)
			{
				AllJoyn.InterfaceDescription exampleIntf = bus.GetInterface(INTERFACE_NAME);
				AllJoyn.QStatus status = AddInterface(exampleIntf);
				if(!status)
				{
					DebugLog("RHR Failed to add interface " + status.ToString());
				}
				
				vectorMember = exampleIntf.GetMember("vector");
			}

			protected override void OnObjectRegistered ()
			{
				DebugLog("RHR ObjectRegistered has been called");
			}
			
			public void SendData(double[] playerInput, double[] playerPos, double[] envData)
			{
				AllJoyn.MsgArgs payload = new AllJoyn.MsgArgs((uint)3);
				payload[0].Set((double[])playerInput);
				payload[1].Set ((double[])playerPos);
				payload[2].Set((double[])envData);
				
				AllJoyn.QStatus status = Signal(null, currentSessionId, vectorMember, payload, 0, 64);
				if (!status) {
					DebugLog("RHR failed to send vector(data) signal: "+status.ToString());	
				}
			}
		}

		class MyBusListener : AllJoyn.BusListener
		{
			protected override void FoundAdvertisedName(string name, AllJoyn.TransportMask transport, string namePrefix)
			{
				DebugLog("RHR FoundAdvertisedName(name=" + name + ", prefix=" + namePrefix + ")");
				if (string.Compare(myAdvertisedName, name) == 0)
				{
					DebugLog("Ignoring my advertisement");
				}
				else if (string.Compare(SERVICE_NAME, namePrefix) == 0)
				{
					sFoundName.Add(name);
				}
			}

            protected override void ListenerRegistered(AllJoyn.BusAttachment busAttachment)
            {
                DebugLog("RHR ListenerRegistered: busAttachment=" + busAttachment);
            }

			protected override void NameOwnerChanged(string busName, string previousOwner, string newOwner)
			{
				DebugLog("RHR NameOwnerChanged: name=" + busName + ", oldOwner=" +
					previousOwner + ", newOwner=" + newOwner);
			}
			
			protected override void LostAdvertisedName(string name, AllJoyn.TransportMask transport, string namePrefix)
			{
				DebugLog("RHR LostAdvertisedName(name=" + name + ", prefix=" + namePrefix + ")");
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
					DebugLog("RHR Rejecting join attempt on unexpected session port " + sessionPort);
					return false;
				}
				DebugLog("RHR Accepting join session request from " + joiner + 
					" (opts.proximity=" + opts.Proximity + ", opts.traffic=" + opts.Traffic + 
					", opts.transports=" + opts.Transports + ")");
				return true;
			}
					
			protected override void SessionJoined(ushort sessionPort, uint sessionId, string joiner)
			{
				DebugLog("Session Joined!!!!!!");
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
				DebugLog("SessionLost ("+sessionId+")");
			}
			
			protected override void SessionMemberAdded(uint sessionId, string uniqueName)
			{
				DebugLog("SessionMemberAdded ("+sessionId+","+uniqueName+")");
			}

			protected override void SessionMemberRemoved(uint sessionId, string uniqueName)
			{	
				DebugLog("SessionMemberRemoved ("+sessionId+","+uniqueName+")");
			}
		}
		
		
		
		// FUNKCJE ODPOWIADAJACE ZA URUCHAMIANIE ALLJOYNA,
		// DOLACZANIE DO SESJI Z INNYM GRACZEM,
		// KONCZENIE SESJI ORAZ WYLACZANIE ALLJOYNA
		
		
		public void StartUp()
		{
			DebugLog("Starting AllJoyn");
			AllJoynStarted = true;
			AllJoyn.QStatus status = AllJoyn.QStatus.OK;
			{
				DebugLog("Creating BusAttachment");
				msgBus = new AllJoyn.BusAttachment("myApp", true);
	
				status = msgBus.CreateInterface(INTERFACE_NAME, false, out testIntf);
				if (status)
				{
					DebugLog("RHR Interface Created.");
					testIntf.AddSignal ("vector", "adadad", "points", 0);
					testIntf.Activate();
				}
				else
				{
					DebugLog("Failed to create interface 'org.alljoyn.Bus.chat'");
				}
	
				busListener = new MyBusListener();
				if (status)
				{
					msgBus.RegisterBusListener(busListener);
					DebugLog("RHR BusListener Registered.");
				}
				
				
				if (testObj == null)
					testObj = new TestBusObject(msgBus, SERVICE_PATH);
				
				if (status)
				{
					status = msgBus.Start();
					if (status)
					{
						DebugLog("RHR BusAttachment started.");
						
						msgBus.RegisterBusObject(testObj);
						for (int i = 0; i < connectArgs.Length; ++i)
						{
							DebugLog("RHR Connect trying: "+connectArgs[i]);
							status = msgBus.Connect(connectArgs[i]);
							if (status)
							{
								DebugLog("BusAttchement.Connect(" + connectArgs[i] + ") SUCCEDED.");
								connectedVal = connectArgs[i];
								break;
							}
							else
							{
								DebugLog("BusAttachment.Connect(" + connectArgs[i] + ") failed.");
							}
						}
						if (!status)
						{
							DebugLog("BusAttachment.Connect failed.");
						}
					}
					else
					{
						DebugLog("RHR BusAttachment.Start failed.");
					}
				}
				
				myAdvertisedName = SERVICE_NAME+ "._" + msgBus.GlobalGUIDString + playerNick;
				
				AllJoyn.InterfaceDescription.Member vectorMember = testIntf.GetMember ("vector");
				status = msgBus.RegisterSignalHandler(this.VectorSignalHandler, vectorMember, null);
				if (!status)
				{
					DebugLog("RHR Failed to add vector signal handler " + status);
				}
				else
				{			
					DebugLog("RHR add vector signal handler " + status);
				}
				
				status = msgBus.AddMatch("type='signal',member='vector'");
				if (!status)
				{
					DebugLog("RHR Failed to add vector Match " + status.ToString());
				}
				else
				{			
					DebugLog("RHR add vector Match " + status.ToString());
				}
			}
			
			if (status)
			{
				status = msgBus.RequestName(myAdvertisedName,
					AllJoyn.DBus.NameFlags.ReplaceExisting | AllJoyn.DBus.NameFlags.DoNotQueue);
				if (!status)
				{
					DebugLog("RHR RequestName(" + SERVICE_NAME + ") failed (status=" + status + ")");
				}
			}

			opts = new AllJoyn.SessionOpts(AllJoyn.SessionOpts.TrafficType.Messages, false,
					AllJoyn.SessionOpts.ProximityType.Any, AllJoyn.TransportMask.Any);
			if (status)
			{
				ushort sessionPort = SERVICE_PORT;
				sessionPortListener = new MySessionPortListener(this);
				status = msgBus.BindSessionPort(ref sessionPort, opts, sessionPortListener);
				if (!status || sessionPort != SERVICE_PORT)
				{
					DebugLog("RHR BindSessionPort failed (" + status + ")");
				}
				DebugLog("RHR BBindSessionPort on port (" + sessionPort + ")");;
			}

			if (status)
			{
				status = msgBus.AdvertiseName(myAdvertisedName, opts.Transports);
				if (!status)
				{
					DebugLog("RHR Failed to advertise name " + myAdvertisedName + " (" + status + ")");
				}
			}
			
			status = msgBus.FindAdvertisedName(SERVICE_NAME);
			if (!status)
			{
				DebugLog("RHR org.alljoyn.Bus.FindAdvertisedName failed.");
			}
		}
		
		public bool JoinSession(string session)
		{
			if (currentJoinedSession != null)
				LeaveSession();
			AllJoyn.QStatus status = AllJoyn.QStatus.NONE;
			if (sessionListener != null) {
				status = msgBus.SetSessionListener(null, currentSessionId);
				sessionListener = null;
				if (!status) {
					DebugLog("SetSessionListener status(" + status.ToString() + ")");
				}
			}
			sessionListener = new MySessionListener(this);
			DebugLog("About to call JoinSession (Session=" + session + ")");
			status = msgBus.JoinSession(session, SERVICE_PORT, sessionListener, out currentSessionId, opts);
			if(status)
			{
				DebugLog("Client JoinSession SUCCESS (Session id=" + currentSessionId + ")");
				currentJoinedSession = session;
			}
			else
			{
				DebugLog("RHR JoinSession failed (status=" + status.ToString() + ")");
			}
			
			return status ? true : false;
		}
		
		public void LeaveSession()
		{
			DebugLog("in LeaveSession.");
			if (currentSessionId != 0) {
				AllJoyn.QStatus status = AllJoyn.QStatus.NONE;
				if (sessionListener != null) {
					DebugLog("clear session listener");
					status = msgBus.SetSessionListener(null, currentSessionId);
					sessionListener = null;
					if (!status) {
						DebugLog("SetSessionListener status(" + status.ToString() + ")");
					}
				}
				DebugLog("about to leave session");
				status = msgBus.LeaveSession(currentSessionId);
				if (status)
				{
					DebugLog("RHR LeaveSession SUCCESS (Session id=" + currentSessionId + ")");
					currentSessionId = 0;
					currentJoinedSession = null;
				}
				else
				{
					DebugLog("RHR LeaveSession failed (status=" + status.ToString() + ")");
				}
			} else {
				currentJoinedSession = null;
			}
			DebugLog("done LeaveSession.");
		}
		
		public void CloseDown()
		{	
			if (msgBus == null)
				return;
			AllJoynStarted = false;
			LeaveSession();
			AllJoyn.QStatus status = msgBus.CancelFindAdvertisedName(SERVICE_NAME);
			if (!status){
				DebugLog("CancelAdvertisedName failed status(" + status.ToString() + ")");
			}
			status = msgBus.CancelAdvertisedName(myAdvertisedName, opts.Transports);
			if (!status) {
				DebugLog("CancelAdvertisedName failed status(" + status.ToString() + ")");
			}
			status = msgBus.ReleaseName(myAdvertisedName);
			if (!status) {
				DebugLog("ReleaseName status(" + status.ToString() + ")");
			}
			status = msgBus.UnbindSessionPort(SERVICE_PORT);
			if (!status) {
				DebugLog("UnbindSessionPort status(" + status.ToString() + ")");
			}
			
			status = msgBus.Disconnect(connectedVal);
			if (!status) {
				DebugLog("Disconnect status(" + status.ToString() + ")");
			}
			
			AllJoyn.InterfaceDescription.Member vectorMember = testIntf.GetMember("vector");
			status = msgBus.UnregisterSignalHandler(this.VectorSignalHandler, vectorMember, null);
			vectorMember = null;
			if (!status) {
				DebugLog("UnregisterSignalHandler Vector status(" + status.ToString() + ")");
			}
			if (sessionListener != null) {
				status = msgBus.SetSessionListener(null, currentSessionId);
				sessionListener = null;
				if (!status) {
					DebugLog("SetSessionListener status(" + status.ToString() + ")");
				}
			}
			DebugLog("No Exceptions(" + status.ToString() + ")");
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
			
			sFoundName = new ArrayList();
			
			AllJoyn.StopAllJoynProcessing();
		}
	}
}
