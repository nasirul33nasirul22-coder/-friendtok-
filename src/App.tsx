import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue, set, get, onDisconnect } from "firebase/database";
import { UserProfile } from "./types";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Feed from "./components/Feed";
import Messenger from "./components/Messenger";
import Profile from "./components/Profile";
import friendTokLogo from "./assets/images/friendtok_logo_1784568481312.jpg";
import { 
  Home, 
  MessageCircle, 
  User, 
  Search, 
  Bell, 
  Menu,
  UserPlus,
  Users,
  Check,
  X,
  Sparkles,
  Share2,
  Copy,
  Moon,
  Sun,
  ShieldAlert
} from "lucide-react";

function FriendTokLogoSVG({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={`${className} hover:rotate-6 transition-transform duration-300`} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Speech bubble outline */}
      <path 
        d="M20 48 C20 30, 30 20, 50 20 C70 20, 80 30, 80 48 C80 66, 70 76, 50 76 C45 76, 42 78, 36 84 C33 87, 28 85, 28 80 L28 73 C23 69, 20 60, 20 48 Z" 
        stroke="#1877F2" 
        strokeWidth="6.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      {/* Left User (Mint-green) */}
      <circle cx="40" cy="42" r="6" stroke="#4ade80" strokeWidth="4.5" fill="none" />
      <path d="M29 60 C29 53, 34 51, 40 51 C46 51, 51 53, 51 60" stroke="#4ade80" strokeWidth="4.5" strokeLinecap="round" fill="none" />

      {/* Right User (Orange-peach) */}
      <circle cx="60" cy="42" r="6" stroke="#fb923c" strokeWidth="4.5" fill="none" />
      <path d="M49 60 C49 53, 54 51, 60 51 C66 51, 71 53, 71 60" stroke="#fb923c" strokeWidth="4.5" strokeLinecap="round" fill="none" />

      {/* Smiling connection line */}
      <path d="M37 64 C44 70, 56 70, 63 64" stroke="#fb923c" strokeWidth="4.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [screen, setScreen] = useState<"login" | "signup" | "app">("login");
  const [activeTab, setActiveTab] = useState<"feed" | "messenger" | "profile">("feed");

  // Theme support
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("theme") === "dark";
  });

  // Friend System States
  const [searchUid, setSearchUid] = useState("");
  const [searchedUser, setSearchedUser] = useState<UserProfile | null>(null);
  const [searchError, setSearchError] = useState("");
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [friendships, setFriendships] = useState<any[]>([]);
  const [isRequestsDropdownOpen, setIsRequestsDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsDropdownOpen, setIsNotificationsDropdownOpen] = useState(false);
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);

  // Blocks list state
  const [myBlocks, setMyBlocks] = useState<string[]>([]);

  // Sync auth state listener
  useEffect(() => {
    let unsubscribeDb: (() => void) | null = null;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeDb) {
        unsubscribeDb();
        unsubscribeDb = null;
      }
      if (firebaseUser) {
        try {
          // Check if numeric UID exists in mapping
          const mapRef = ref(db, `uid_map/${firebaseUser.uid}`);
          const mapSnap = await get(mapRef);
          let numericUid = mapSnap.val();

          if (!numericUid) {
            // Generate unique 6-digit numeric UID
            let potential = "";
            let attempts = 0;
            while (attempts < 15) {
              const testVal = Math.floor(100000 + Math.random() * 900000).toString();
              const uidCheckRef = ref(db, `uids/${testVal}`);
              const uidSnap = await get(uidCheckRef);
              if (!uidSnap.exists()) {
                potential = testVal;
                break;
              }
              attempts++;
            }
            if (!potential) {
              potential = Math.floor(100000 + Math.random() * 900000).toString();
            }
            numericUid = potential;

            // Save the mappings
            await set(ref(db, `uid_map/${firebaseUser.uid}`), numericUid);
            await set(ref(db, `uids/${numericUid}`), firebaseUser.uid);

            // Fetch any legacy user details or set a new one
            const legacyUserRef = ref(db, `users/${firebaseUser.uid}`);
            const legacySnap = await get(legacyUserRef);
            const legacyProfile = legacySnap.val();

            const profile = {
              uid: numericUid,
              email: firebaseUser.email || legacyProfile?.email || `${numericUid}@friendtok.com`,
              firstName: legacyProfile?.firstName || firebaseUser.displayName?.split(" ")[0] || "User",
              surname: legacyProfile?.surname || firebaseUser.displayName?.split(" ")[1] || "",
              displayName: legacyProfile?.displayName || firebaseUser.displayName || `User ${numericUid}`,
              photoURL: legacyProfile?.photoURL || firebaseUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
              coverURL: legacyProfile?.coverURL || "https://images.unsplash.com/photo-1707343843437-caacff5cfa74?auto=format&fit=crop&w=1000&q=80",
              bio: legacyProfile?.bio || "Just joined FriendTok! 👋 Feel free to add me using my UID.",
              location: legacyProfile?.location || "Silicon Valley, CA",
              education: legacyProfile?.education || "Stanford University",
              gender: legacyProfile?.gender || "Not Specified",
              birthday: legacyProfile?.birthday || "1996-01-01",
              joinedDate: legacyProfile?.joinedDate || new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
            };

            await set(ref(db, `users/${numericUid}`), profile);
          }

          // Real-time listener on profile using numericUid
          const profileRef = ref(db, `users/${numericUid}`);
          unsubscribeDb = onValue(profileRef, (snapshot) => {
            const val = snapshot.val();
            if (val) {
              setUser(val as UserProfile);
            } else {
              setUser({
                uid: numericUid,
                email: firebaseUser.email || `${numericUid}@friendtok.com`,
                firstName: firebaseUser.displayName?.split(" ")[0] || "User",
                surname: firebaseUser.displayName?.split(" ")[1] || "",
                displayName: firebaseUser.displayName || `User ${numericUid}`,
                photoURL: firebaseUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
                coverURL: "https://images.unsplash.com/photo-1707343843437-caacff5cfa74?auto=format&fit=crop&w=1000&q=80",
                bio: "Just joined FriendTok! 👋 Feel free to add me using my UID.",
                location: "Silicon Valley, CA",
                education: "Stanford University",
                gender: "Not Specified",
                birthday: "1996-01-01",
                joinedDate: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
              });
            }
            setScreen("app");
          });
        } catch (err) {
          console.error("Auth state initialization error:", err);
          setScreen("login");
        }
      } else {
        setUser(null);
        setScreen("login");
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeDb) {
        unsubscribeDb();
      }
    };
  }, []);

  // Theme Toggle Effect - persistent
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  // Manage user online/offline status in Realtime Database
  useEffect(() => {
    if (!user?.uid) return;

    const myStatusRef = ref(db, `users/${user.uid}/status`);
    const myLastActiveRef = ref(db, `users/${user.uid}/lastActive`);
    const connectedRef = ref(db, ".info/connected");

    const unsubConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // When disconnected, mark status as offline
        onDisconnect(myStatusRef).set("offline");
        onDisconnect(myLastActiveRef).set(Date.now());

        // Set status to online
        set(myStatusRef, "online");
        set(myLastActiveRef, Date.now());
      }
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        set(myStatusRef, "online");
        set(myLastActiveRef, Date.now());
      } else {
        set(myStatusRef, "offline");
        set(myLastActiveRef, Date.now());
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      unsubConnected();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // Clean up on log out or unmount
      set(myStatusRef, "offline");
      set(myLastActiveRef, Date.now());
    };
  }, [user?.uid]);

  // Sync friend requests, friendships, notifications and blocks real-time
  useEffect(() => {
    if (!user) return;

    // Listen to incoming friend requests
    const incomingRef = ref(db, `friend_requests/${user.uid}`);
    const unsubIncoming = onValue(incomingRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setIncomingRequests(Object.values(val));
      } else {
        setIncomingRequests([]);
      }
    });

    // Listen to outgoing requests sent
    const outgoingRef = ref(db, `friend_requests_sent/${user.uid}`);
    const unsubOutgoing = onValue(outgoingRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setOutgoingRequests(Object.values(val));
      } else {
        setOutgoingRequests([]);
      }
    });

    // Listen to accepted friendships
    const friendshipsRef = ref(db, `friendships/${user.uid}`);
    const unsubFriendships = onValue(friendshipsRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setFriendships(Object.values(val));
      } else {
        setFriendships([]);
      }
    });

    // Listen to real-time notifications
    const notificationsRef = ref(db, `notifications/${user.uid}`);
    const unsubNotifications = onValue(notificationsRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setNotifications(Object.values(val).sort((a: any, b: any) => b.timestamp - a.timestamp));
      } else {
        setNotifications([]);
      }
    });

    // Listen to real-time blocks
    const blocksRef = ref(db, `blocks/${user.uid}`);
    const unsubBlocks = onValue(blocksRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setMyBlocks(Object.keys(val));
      } else {
        setMyBlocks([]);
      }
    });

    return () => {
      unsubIncoming();
      unsubOutgoing();
      unsubFriendships();
      unsubNotifications();
      unsubBlocks();
    };
  }, [user?.uid]);

  const triggerUserSearch = (uid: string) => {
    const trimmed = uid.trim();
    if (!trimmed) return;

    setSearchUid(trimmed);
    setIsSearchingUser(true);
    setSearchError("");
    setSearchedUser(null);
    setIsSearchModalOpen(true);

    const targetUserRef = ref(db, `users/${trimmed}`);
    onValue(targetUserRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setSearchedUser(val as UserProfile);
      } else {
        setSearchError(`No user found with UID "${trimmed}". Please copy and paste a valid 6-digit numeric UID.`);
      }
      setIsSearchingUser(false);
    }, {
      onlyOnce: true
    });
  };

  const handleSearchUser = () => {
    triggerUserSearch(searchUid);
  };

  const handleToggleBlockUser = async (targetUid: string) => {
    if (!user) return;
    const currentlyBlocked = myBlocks.includes(targetUid);
    try {
      if (currentlyBlocked) {
        await set(ref(db, `blocks/${user.uid}/${targetUid}`), null);
        alert(`✓ User ${targetUid} has been unblocked.`);
      } else {
        // Break friendship and cancel requests if blocking
        await set(ref(db, `friendships/${user.uid}/${targetUid}`), null);
        await set(ref(db, `friendships/${targetUid}/${user.uid}`), null);
        await set(ref(db, `friend_requests/${user.uid}/${targetUid}`), null);
        await set(ref(db, `friend_requests/${targetUid}/${user.uid}`), null);
        await set(ref(db, `friend_requests_sent/${user.uid}/${targetUid}`), null);
        await set(ref(db, `friend_requests_sent/${targetUid}/${user.uid}`), null);

        await set(ref(db, `blocks/${user.uid}/${targetUid}`), true);
        alert(`✓ User ${targetUid} has been blocked successfully.`);
      }
    } catch (err: any) {
      alert("Error blocking user: " + err.message);
    }
  };

  const handleSendRequest = async (target: UserProfile) => {
    if (!user) return;
    try {
      await set(ref(db, `friend_requests/${target.uid}/${user.uid}`), {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        timestamp: Date.now()
      });
      await set(ref(db, `friend_requests_sent/${user.uid}/${target.uid}`), {
        uid: target.uid,
        displayName: target.displayName,
        photoURL: target.photoURL,
        timestamp: Date.now()
      });
      alert(`✓ Friend request sent to ${target.displayName}!`);
    } catch (err: any) {
      alert("Error sending request: " + err.message);
    }
  };

  const handleAcceptRequest = async (senderUid: string, senderName: string, senderPhoto: string) => {
    if (!user) return;
    try {
      // Create mutual friendships
      await set(ref(db, `friendships/${user.uid}/${senderUid}`), {
        uid: senderUid,
        displayName: senderName,
        photoURL: senderPhoto,
        timestamp: Date.now()
      });
      await set(ref(db, `friendships/${senderUid}/${user.uid}`), {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        timestamp: Date.now()
      });
      // Delete incoming & outgoing nodes
      await set(ref(db, `friend_requests/${user.uid}/${senderUid}`), null);
      await set(ref(db, `friend_requests_sent/${senderUid}/${user.uid}`), null);

      // Save a real-time notification for the requester
      const notifId = Math.random().toString(36).substring(2, 11);
      await set(ref(db, `notifications/${senderUid}/${notifId}`), {
        id: notifId,
        type: "friend_accepted",
        text: `${user.displayName} accepted your friend request! You are now connected.`,
        timestamp: Date.now(),
        seen: false
      });

      alert(`✓ You are now friends with ${senderName}!`);
    } catch (err: any) {
      alert("Error accepting request: " + err.message);
    }
  };

  const handleDeclineRequest = async (senderUid: string) => {
    if (!user) return;
    try {
      await set(ref(db, `friend_requests/${user.uid}/${senderUid}`), null);
      await set(ref(db, `friend_requests_sent/${senderUid}/${user.uid}`), null);
    } catch (err: any) {
      alert("Error declining request: " + err.message);
    }
  };

  const handleLogoutSuccess = () => {
    setScreen("login");
    setActiveTab("feed");
  };

  const handleLoginSuccess = () => {
    setScreen("app");
  };

  const handleSignupSuccess = () => {
    setScreen("app");
  };

  if (screen === "login") {
    return (
      <Login
        onNavigateToSignup={() => setScreen("signup")}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  if (screen === "signup") {
    return (
      <Signup
        onNavigateToLogin={() => setScreen("login")}
        onSignupSuccess={handleSignupSuccess}
      />
    );
  }

  return (
    <div id="app-root-shell" className="min-h-screen bg-[#F0F2F5] flex flex-col font-sans">
      
      {/* ================== STYLISH FRIENDTOK NAV BAR ================== */}
      <header id="fb-navigation-header" className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm px-4 py-2 flex items-center justify-between">
        
        {/* Left Area: FriendTok Brand Logo & Search */}
        <div className="flex items-center gap-3">
          <div 
            onClick={() => setActiveTab("feed")} 
            className="flex items-center gap-2 text-[#1877F2] hover:scale-105 transition duration-150 cursor-pointer select-none"
          >
            <FriendTokLogoSVG className="w-10 h-10 animate-logo-pulse" />
            <span className="text-xl font-black tracking-tight text-[#1877F2] hidden sm:block">FriendTok</span>
          </div>
          
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              id="search-box-header"
              type="text"
              placeholder="Search user by UID..."
              value={searchUid}
              onChange={(e) => setSearchUid(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchUser()}
              className="bg-gray-100 rounded-full pl-9 pr-12 py-1.5 text-xs text-gray-800 border-none outline-none focus:ring-2 focus:ring-[#1877F2] w-40 sm:w-60 transition-all"
            />
            <button 
              onClick={handleSearchUser}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-bold text-[#1877F2] hover:text-[#1565C0] px-2"
            >
              Go
            </button>
          </div>
        </div>

        {/* Center Area: Active View Tabs */}
        <nav id="fb-tab-bar" className="flex items-center gap-1 sm:gap-6 md:gap-10">
          <button
            id="tab-news-feed"
            onClick={() => {
              setActiveTab("feed");
              setIsRequestsDropdownOpen(false);
            }}
            className={`relative py-2 px-4 sm:px-10 flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === "feed" ? "text-[#1877F2]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Home className="w-6 h-6" />
            {activeTab === "feed" && (
              <span className="absolute bottom-[-9px] inset-x-0 h-1 bg-[#1877F2] rounded-t-full"></span>
            )}
          </button>

          <button
            id="tab-messenger"
            onClick={() => {
              setActiveTab("messenger");
              setIsRequestsDropdownOpen(false);
            }}
            className={`relative py-2 px-4 sm:px-10 flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === "messenger" ? "text-[#1877F2]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <MessageCircle className="w-6 h-6" />
            {activeTab === "messenger" && (
              <span className="absolute bottom-[-9px] inset-x-0 h-1 bg-[#1877F2] rounded-t-full"></span>
            )}
          </button>

          <button
            id="tab-profile"
            onClick={() => {
              setActiveTab("profile");
              setIsRequestsDropdownOpen(false);
            }}
            className={`relative py-2 px-4 sm:px-10 flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === "profile" ? "text-[#1877F2]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <User className="w-6 h-6" />
            {activeTab === "profile" && (
              <span className="absolute bottom-[-9px] inset-x-0 h-1 bg-[#1877F2] rounded-t-full"></span>
            )}
          </button>
        </nav>

        {/* Right Area: Profile widget & friend requests tab */}
        <div className="flex items-center gap-2 sm:gap-3 select-none">
          {/* Small Profile Widget */}
          <button
            id="widget-user-profile"
            onClick={() => {
              setActiveTab("profile");
              setIsRequestsDropdownOpen(false);
              setIsNotificationsDropdownOpen(false);
            }}
            className="hidden md:flex items-center gap-1.5 p-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full transition cursor-pointer"
          >
            <img
              src={user?.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"}
              alt="You"
              className="w-7 h-7 rounded-full object-cover"
            />
            <span className="text-xs font-bold text-gray-800 pr-2 truncate max-w-[100px]">
              {user?.firstName}
            </span>
          </button>

          {/* 1. FRIEND REQUESTS DROPDOWN */}
          <div className="relative">
            <button 
              onClick={() => {
                setIsRequestsDropdownOpen(!isRequestsDropdownOpen);
                setIsNotificationsDropdownOpen(false);
              }}
              className={`p-2 rounded-full transition cursor-pointer relative ${
                isRequestsDropdownOpen ? "bg-[#1877F2]/10 text-[#1877F2]" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
              title="Friend Requests"
            >
              <UserPlus className="w-5 h-5" />
              {incomingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                  {incomingRequests.length}
                </span>
              )}
            </button>

            {isRequestsDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-250">
                <div className="p-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Friend Requests</h3>
                  <span className="text-xs text-gray-500 font-semibold">{incomingRequests.length} pending</span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                  {incomingRequests.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-xs font-medium">
                      No incoming requests. Search users by UID at the top to add friends!
                    </div>
                  ) : (
                    incomingRequests.map((req) => (
                      <div key={req.uid} className="p-3 flex items-center gap-3 hover:bg-gray-50 transition">
                        <img 
                          src={req.photoURL} 
                          alt={req.displayName} 
                          className="w-10 h-10 rounded-full object-cover" 
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-gray-900 truncate">{req.displayName}</h4>
                          <span className="text-[10px] text-gray-400 block font-semibold truncate">wants to connect</span>
                          <div className="flex gap-2 mt-1.5">
                            <button
                              onClick={() => handleAcceptRequest(req.uid, req.displayName, req.photoURL)}
                              className="bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold text-[10px] px-2.5 py-1 rounded-md transition cursor-pointer"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleDeclineRequest(req.uid)}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[10px] px-2.5 py-1 rounded-md transition cursor-pointer"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. NOTIFICATIONS BELL DROPDOWN */}
          <div className="relative">
            <button 
              onClick={() => {
                setIsNotificationsDropdownOpen(!isNotificationsDropdownOpen);
                setIsRequestsDropdownOpen(false);
              }}
              className={`p-2 rounded-full transition cursor-pointer relative ${
                isNotificationsDropdownOpen ? "bg-[#1877F2]/10 text-[#1877F2]" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                  {notifications.length}
                </span>
              )}
            </button>

            {isNotificationsDropdownOpen && (
              <div className="absolute right-[-60px] sm:right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-250">
                <div className="p-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                  <button 
                    onClick={async () => {
                      if (!user) return;
                      await set(ref(db, `notifications/${user.uid}`), null);
                    }}
                    className="text-xs text-[#1877F2] font-semibold hover:underline"
                  >
                    Clear All
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-xs font-medium">
                      No notifications yet. Send friend requests and stay updated!
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif.id} className="p-3 hover:bg-gray-50 transition flex items-start gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-[#1877F2] mt-1.5 shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 leading-normal">{notif.text}</p>
                          <span className="text-[9px] text-gray-400 mt-1 block">
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. THREE-LINE MENU BUTTON */}
          <button 
            onClick={() => setIsMenuDrawerOpen(true)}
            className="bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition cursor-pointer text-gray-700"
            title="Menu & Settings"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

      </header>

      {/* ================== UID SEARCH MODAL POPUP ================== */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">User UID Search Result</h3>
              <button 
                onClick={() => {
                  setIsSearchModalOpen(false);
                  setSearchedUser(null);
                  setSearchError("");
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {isSearchingUser ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="w-8 h-8 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-gray-500 mt-2 font-semibold">Searching Database...</span>
                </div>
              ) : searchError ? (
                <div className="text-center py-4">
                  <p className="text-xs text-red-600 font-semibold bg-red-50 p-3 rounded-lg border border-red-100">{searchError}</p>
                </div>
              ) : searchedUser ? (
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full ring-4 ring-offset-2 ring-[#1877F2] overflow-hidden mb-3.5 shadow">
                      <img 
                        src={searchedUser.photoURL} 
                        alt={searchedUser.displayName} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    {searchedUser.status === "online" && (
                      <span className="absolute bottom-3 right-0.5 w-4.5 h-4.5 bg-[#42B72A] border-2 border-white rounded-full shadow-sm" title="Active now"></span>
                    )}
                  </div>
                  <h4 className="text-base font-extrabold text-gray-950">{searchedUser.displayName}</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-[240px] italic">"{searchedUser.bio}"</p>
                  <p className="text-[10px] text-gray-400 mt-2 font-mono bg-gray-50 px-2 py-0.5 rounded border">UID: {searchedUser.uid}</p>

                  <div className="w-full mt-6 pt-4 border-t border-gray-100">
                    {searchedUser.uid === user?.uid ? (
                      <span className="text-xs text-[#1877F2] dark:text-blue-400 font-bold py-1.5 px-4 bg-blue-50 dark:bg-zinc-800 rounded-full">This is You</span>
                    ) : (
                      <div className="space-y-3 w-full">
                        {/* Friend Action */}
                        <div>
                          {friendships.some((f) => f.uid === searchedUser.uid) ? (
                            <span className="text-xs text-green-600 dark:text-green-400 font-bold py-1.5 px-4 bg-green-50 dark:bg-zinc-800 rounded-full flex items-center justify-center gap-1.5">
                              <Check className="w-4 h-4" /> Friends
                            </span>
                          ) : incomingRequests.some((r) => r.uid === searchedUser.uid) ? (
                            <div className="flex flex-col gap-2 w-full">
                              <p className="text-xs text-gray-500 dark:text-zinc-400 font-semibold mb-1">Sent you a Friend Request:</p>
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={() => {
                                    handleAcceptRequest(searchedUser.uid, searchedUser.displayName, searchedUser.photoURL);
                                    setIsSearchModalOpen(false);
                                  }}
                                  className="bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold text-xs px-4 py-2 rounded-lg transition cursor-pointer"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => {
                                    handleDeclineRequest(searchedUser.uid);
                                    setIsSearchModalOpen(false);
                                  }}
                                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs px-4 py-2 rounded-lg transition cursor-pointer"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          ) : outgoingRequests.some((r) => r.uid === searchedUser.uid) ? (
                            <span className="text-xs text-gray-500 dark:text-zinc-400 font-bold py-1.5 px-4 bg-gray-100 dark:bg-zinc-800 rounded-full">Request Pending...</span>
                          ) : myBlocks.includes(searchedUser.uid) ? (
                            <span className="text-xs text-red-600 dark:text-red-400 font-bold py-1.5 px-4 bg-red-50 dark:bg-zinc-850 rounded-full">User Blocked</span>
                          ) : (
                            <button
                              onClick={() => {
                                handleSendRequest(searchedUser);
                                setIsSearchModalOpen(false);
                              }}
                              className="w-full py-2 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <UserPlus className="w-4 h-4" /> Send Friend Request
                            </button>
                          )}
                        </div>

                        {/* Block/Unblock Action */}
                        <div className="pt-2 border-t border-gray-100 dark:border-zinc-800">
                          <button
                            onClick={() => {
                              handleToggleBlockUser(searchedUser.uid);
                              setIsSearchModalOpen(false);
                            }}
                            className={`w-full py-2 font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                              myBlocks.includes(searchedUser.uid)
                                ? "bg-green-100 dark:bg-zinc-800 hover:bg-green-200 text-green-700 dark:text-green-400"
                                : "bg-red-50 dark:bg-zinc-900/55 hover:bg-red-100 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40"
                            }`}
                          >
                            <ShieldAlert className="w-4 h-4" />
                            {myBlocks.includes(searchedUser.uid) ? "Unblock User" : "Block User"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ================== ACTIVE CONTENT VIEWPORT ================== */}
      <main id="active-viewport-body" className="flex-1 p-3 sm:p-5">
        <div className="max-w-[1200px] mx-auto">
          {activeTab === "feed" && <Feed onSearchUserById={triggerUserSearch} />}
          {activeTab === "messenger" && <Messenger />}
          {activeTab === "profile" && <Profile onLogoutSuccess={handleLogoutSuccess} />}
        </div>
      </main>
       {/* ================== THREE-LINE MENU DRAWER ================== */}
      {isMenuDrawerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-end z-50 animate-in fade-in duration-200">
          <div className="w-80 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 h-full shadow-2xl p-6 flex flex-col justify-between animate-in slide-in-from-right duration-250 border-l border-gray-100 dark:border-zinc-800">
            <div>
              <div className="flex items-center justify-between pb-5 border-b border-gray-100 dark:border-zinc-800 mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100">Menu & Settings</h3>
                <button 
                  onClick={() => setIsMenuDrawerOpen(false)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-200 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
 
              {/* User Profile Mini Card */}
              <div 
                onClick={() => {
                  setActiveTab("profile");
                  setIsMenuDrawerOpen(false);
                }}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 rounded-xl cursor-pointer transition mb-6"
              >
                <img 
                  src={user?.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"} 
                  alt={user?.displayName || "You"} 
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-[#1877F2]/20"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate">{user?.displayName}</h4>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 font-mono">UID: {user?.uid}</p>
                </div>
              </div>
 
              {/* Navigation & Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setActiveTab("profile");
                    setIsMenuDrawerOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg text-sm font-bold transition text-left cursor-pointer"
                >
                  <User className="w-5 h-5 text-[#1877F2] dark:text-blue-400" />
                  My Profile
                </button>
                <button
                  onClick={() => {
                    alert("Settings feature under construction. All standard real-time syncs, notifications, and configurations are active!");
                  }}
                  className="w-full flex items-center gap-3 p-3 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg text-sm font-bold transition text-left cursor-pointer"
                >
                  <Sparkles className="w-5 h-5 text-[#1877F2] dark:text-blue-400" />
                  Settings & Privacy
                </button>

                {/* Dark Mode Theme Switch */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl mt-4 select-none">
                  <span className="text-sm font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-2.5">
                    {isDarkMode ? <Moon className="w-4 h-4 text-yellow-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                    <span>Dark Theme</span>
                  </span>
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={`w-11 h-6 rounded-full transition-colors duration-250 relative cursor-pointer outline-none ${
                      isDarkMode ? "bg-[#1877F2]" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 bg-white w-5 h-5 rounded-full transition-transform duration-250 shadow-xs ${
                        isDarkMode ? "left-[22px]" : "left-0.5"
                      }`}
                    ></span>
                  </button>
                </div>
              </div>
            </div>
 
            {/* Logout Footer */}
            <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
              <button
                onClick={async () => {
                  await auth.signOut();
                  setIsMenuDrawerOpen(false);
                  handleLogoutSuccess();
                }}
                className="w-full py-2.5 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/25 text-red-600 dark:text-red-400 font-bold text-sm rounded-lg transition cursor-pointer"
              >
                Log Out of FriendTok
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
