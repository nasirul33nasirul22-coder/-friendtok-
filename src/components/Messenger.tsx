import React, { useState, useEffect, useRef } from "react";
import { db, storage, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue, push, set, get, update } from "firebase/database";
import { ref as sRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { ChatThread, Message, UserProfile, compressImageToBase64, compressImageToBlob } from "../types";
import { Capacitor } from "@capacitor/core";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { ActionSheet, ActionSheetButtonStyle } from "@capacitor/action-sheet";
import { VoiceRecorder } from "capacitor-voice-recorder";
import { 
  Mic, 
  Image as ImageIcon, 
  Send, 
  Phone, 
  Video, 
  Info, 
  Play, 
  Pause, 
  StopCircle, 
  Trash2, 
  CheckCheck, 
  Check, 
  ArrowLeft, 
  ShieldAlert,
  Loader2
} from "lucide-react";

export default function Messenger() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [chats, setChats] = useState<ChatThread[]>([]);
  const [chatUploadProgress, setChatUploadProgress] = useState<number | null>(null);

  // Mobile responsiveness layout tracker
  const [mobileShowThread, setMobileShowThread] = useState(false);

  // Users Status & Blocks states
  const [usersStatusMap, setUsersStatusMap] = useState<{[uid: string]: any}>({});
  const [myBlockedUsers, setMyBlockedUsers] = useState<string[]>([]);
  const [blockedMeUsers, setBlockedMeUsers] = useState<string[]>([]);

  const [selectedFriend, setSelectedFriend] = useState({
    uid: "system_mark",
    name: "Mark Zuckerberg",
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    status: "Active now",
    chatId: "chat_system_mark"
  });
  const [activeChat, setActiveChat] = useState<ChatThread | null>(null);
  
  // Message Inputs
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio players states inside chat bubbles (mapped by messageId)
  const [playingAudios, setPlayingAudios] = useState<{ [messageId: string]: boolean }>({});
  const audioElementsRef = useRef<{ [messageId: string]: HTMLAudioElement }>({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Dynamic accepted friendships from database
  const [dbFriends, setDbFriends] = useState<any[]>([]);

  // Sync users status map in real-time
  useEffect(() => {
    const usersRef = ref(db, "users");
    const unsubStatus = onValue(usersRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setUsersStatusMap(val);
      }
    });
    return () => unsubStatus();
  }, []);

  // Sync blocking status list in real-time
  useEffect(() => {
    if (!user) return;
    const blocksRef = ref(db, `blocks/${user.uid}`);
    const unsubMyBlocks = onValue(blocksRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setMyBlockedUsers(Object.keys(data));
      } else {
        setMyBlockedUsers([]);
      }
    });

    const allBlocksRef = ref(db, "blocks");
    const unsubAllBlocks = onValue(allBlocksRef, (snapshot) => {
      const allBlocks = snapshot.val();
      if (allBlocks) {
        const list: string[] = [];
        Object.entries(allBlocks).forEach(([blockerUid, blockedMap]: [string, any]) => {
          if (blockedMap && blockedMap[user.uid]) {
            list.push(blockerUid);
          }
        });
        setBlockedMeUsers(list);
      } else {
        setBlockedMeUsers([]);
      }
    });

    return () => {
      unsubMyBlocks();
      unsubAllBlocks();
    };
  }, [user]);

  // Sync accepted friendships from database
  useEffect(() => {
    if (!user) return;
    const friendshipsRef = ref(db, `friendships/${user.uid}`);
    const unsub = onValue(friendshipsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.values(data).map((val: any) => {
          const combinedChatId = user.uid < val.uid ? `chat_${user.uid}_${val.uid}` : `chat_${val.uid}_${user.uid}`;
          return {
            uid: val.uid,
            name: val.displayName || "Unknown User",
            photo: val.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
            status: "offline",
            chatId: combinedChatId
          };
        });
        setDbFriends(list);
      } else {
        setDbFriends([]);
      }
    });
    return () => unsub();
  }, [user]);

  const getFriendOnlineStatus = (friendUid: string) => {
    if (friendUid.startsWith("system_")) return "Active now";
    const matchedUser = usersStatusMap[friendUid];
    if (!matchedUser) return "offline";
    return matchedUser.status === "online" ? "Active now" : "offline";
  };

  // Dynamically build friends list template (accepted friends + preseeded support bots)
  const friends = [
    ...dbFriends.map(f => ({
      ...f,
      status: myBlockedUsers.includes(f.uid) ? "Blocked" : getFriendOnlineStatus(f.uid)
    })),
    ...(user ? [
      {
        uid: "system_mark",
        name: "Mark Zuckerberg",
        photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
        status: myBlockedUsers.includes("system_mark") ? "Blocked" : "Active now",
        chatId: user.uid < "system_mark" ? `chat_${user.uid}_system_mark` : `chat_system_mark_${user.uid}`
      },
      {
        uid: "system_sheryl",
        name: "Sheryl Sandberg",
        photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
        status: myBlockedUsers.includes("system_sheryl") ? "Blocked" : "Active now",
        chatId: user.uid < "system_sheryl" ? `chat_${user.uid}_system_sheryl` : `chat_system_sheryl_${user.uid}`
      }
    ] : [
      {
        uid: "system_mark",
        name: "Mark Zuckerberg",
        photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
        status: "Active now",
        chatId: "chat_system_mark"
      },
      {
        uid: "system_sheryl",
        name: "Sheryl Sandberg",
        photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
        status: "Active 5m ago",
        chatId: "chat_system_sheryl"
      }
    ])
  ];

  // Sync current user
  useEffect(() => {
    let unsubscribeDb: (() => void) | null = null;
    const unsub = onAuthStateChanged(auth, async (curr) => {
      if (unsubscribeDb) {
        unsubscribeDb();
        unsubscribeDb = null;
      }
      if (curr) {
        try {
          const mapRef = ref(db, `uid_map/${curr.uid}`);
          const mapSnap = await get(mapRef);
          const numericUid = mapSnap.val() || curr.uid;

          const userRef = ref(db, `users/${numericUid}`);
          unsubscribeDb = onValue(userRef, (snap) => {
            if (snap.val()) {
              setUser(snap.val() as UserProfile);
            }
          });
        } catch (err) {
          console.error("Messenger user load error:", err);
        }
      } else {
        setUser(null);
      }
    });
    return () => {
      unsub();
      if (unsubscribeDb) {
        unsubscribeDb();
      }
    };
  }, []);

  // Update selected friend chatId once user loads
  useEffect(() => {
    if (user) {
      const combinedChatId = user.uid < selectedFriend.uid ? `chat_${user.uid}_${selectedFriend.uid}` : `chat_${selectedFriend.uid}_${user.uid}`;
      setSelectedFriend((prev) => ({
        ...prev,
        chatId: combinedChatId
      }));
    }
  }, [user]);

  // Sync Chats Real-time
  useEffect(() => {
    if (!user) return;

    const chatsRef = ref(db, "chats");
    const unsub = onValue(chatsRef, (snapshot) => {
      const data = snapshot.val();
      const loadedThreads: ChatThread[] = [];

      friends.forEach((f) => {
        const threadData = data?.[f.chatId];
        if (threadData) {
          loadedThreads.push({
            id: f.chatId,
            ...threadData,
            messages: threadData.messages ? Object.values(threadData.messages) : []
          });
        } else {
          // Initialize empty chat thread with preseeded welcome message
          const newThread: ChatThread = {
            id: f.chatId,
            participants: [user.uid, f.uid],
            messages: [
              {
                id: `welcome_${f.uid}`,
                senderId: f.uid,
                text: f.uid.startsWith("system_") 
                  ? (f.uid === "system_mark" 
                    ? "Hey! Welcome to FriendTok Messenger. Check out the voice messages and image share features below! 🎙️📸" 
                    : "Hi there! Feel free to send me a text, picture, or record a quick voice snippet. It all syncs instantly!")
                  : `You are now connected with ${f.name} on FriendTok! Say hello to your new friend. 👋`,
                timestamp: Date.now() - 3600 * 1000,
                seen: false,
              }
            ],
            lastUpdated: Date.now() - 3600 * 1000
          };
          set(ref(db, `chats/${f.chatId}`), newThread);
          loadedThreads.push(newThread);
        }
      });

      setChats(loadedThreads);

      // Find the active chat thread matching the selected friend
      const matched = loadedThreads.find((c) => c.id === selectedFriend.chatId);
      if (matched) {
        setActiveChat(matched);
        // Auto-mark all messages in active chat from friend as "seen"
        matched.messages.forEach((m) => {
          if (m.senderId === selectedFriend.uid && !m.seen) {
            update(ref(db, `chats/${selectedFriend.chatId}/messages/${m.id}`), { seen: true });
          }
        });
      }
    });
    return () => unsub();
  }, [selectedFriend, user, dbFriends]);

  // Scroll to bottom whenever messages list changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  // Voice Recording Timer hook
  useEffect(() => {
    if (isRecording) {
      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
      setRecordingSeconds(0);
    }
    return () => {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
    };
  }, [isRecording]);

  const simulateAgentReply = (chatId: string, replyFromId: string, userMessageText: string) => {
    setTimeout(async () => {
      let replyText = `Hey! Thanks for messaging. This is a real-time simulator mimicking server-side sockets. You said: "${userMessageText}"`;
      if (userMessageText.toLowerCase().includes("hello") || userMessageText.toLowerCase().includes("hi")) {
        replyText = `Hello! How are you doing today? Check out my updated profile info! 😊`;
      } else if (userMessageText.toLowerCase().includes("voice")) {
        replyText = `That voice note is awesome! Voice sharing makes this Facebook & Messenger Clone extremely complete! 🎤🔊`;
      } else if (userMessageText.toLowerCase().includes("image") || userMessageText.toLowerCase().includes("photo")) {
        replyText = `What a beautiful photo! Instant image rendering inside chat works smoothly! 📸💙`;
      }

      const replyMsgRef = push(ref(db, `chats/${chatId}/messages`));
      const newMsg: Message = {
        id: replyMsgRef.key || "reply_" + Math.random().toString(36).substr(2, 9),
        senderId: replyFromId,
        text: replyText,
        timestamp: Date.now(),
        seen: false,
      };

      await set(replyMsgRef, newMsg);
      await set(ref(db, `chats/${chatId}/lastUpdated`), Date.now());
    }, 2000);
  };

  // Core Text Send
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !user || !activeChat) return;

    setIsSending(true);
    const msgText = inputText.trim();
    setInputText("");

    try {
      const messagesRef = ref(db, `chats/${activeChat.id}/messages`);
      const newMsgRef = push(messagesRef);
      const newMsg: Message = {
        id: newMsgRef.key || "msg_" + Math.random().toString(36).substr(2, 9),
        senderId: user.uid,
        text: msgText,
        timestamp: Date.now(),
        seen: false,
      };

      await set(newMsgRef, newMsg);
      await set(ref(db, `chats/${activeChat.id}/lastUpdated`), Date.now());
      
      // Simulate real-time response from Mark or Sheryl
      simulateAgentReply(activeChat.id, selectedFriend.uid, msgText);
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Attachment upload and messaging logic
  const uploadAttachmentToFirebase = async (fileOrBlob: File | Blob, name: string) => {
    if (!user || !activeChat) return;
    setIsSending(true);
    setChatUploadProgress(0);

    // Simulated progress to guarantee progress bar updates smoothly
    let simulatedProgress = 0;
    const progressInterval = setInterval(() => {
      simulatedProgress += Math.max(1, Math.floor((95 - simulatedProgress) / 8));
      setChatUploadProgress((prev) => Math.max(prev || 0, simulatedProgress));
    }, 150);

    const isVideo = fileOrBlob.type.startsWith("video/");
    let fileToUpload = fileOrBlob;

    if (!isVideo) {
      try {
        const fileObj = fileOrBlob instanceof File 
          ? fileOrBlob 
          : new File([fileOrBlob], "image.jpg", { type: fileOrBlob.type || "image/jpeg" });
        fileToUpload = await compressImageToBlob(fileObj);
      } catch (compressErr) {
        console.warn("Failed to compress image before chat upload, using original:", compressErr);
      }
    }

    const refPath = isVideo ? "chats/videos" : "chats/images";
    const fileRef = sRef(storage, `${refPath}/${Date.now()}_${name || "attachment"}`);

    try {
      const uploadTask = uploadBytesResumable(fileRef, fileToUpload);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          try {
            uploadTask.cancel();
          } catch (e) {}
          reject(new Error("Storage upload timed out (10s limit)"));
        }, 10000); // 10s timeout

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setChatUploadProgress((prev) => Math.max(prev || 0, progress));
          },
          (err) => {
            clearTimeout(timer);
            reject(err);
          },
          () => {
            clearTimeout(timer);
            resolve();
          }
        );
      });

      const downloadURL = await getDownloadURL(fileRef);
      const newMsgRef = push(ref(db, `chats/${activeChat.id}/messages`));
      const newMsg: Message = {
        id: newMsgRef.key || "msg_" + Math.random().toString(36).substr(2, 9),
        senderId: user.uid,
        text: isVideo ? "Shared a video 📹" : "Shared a photo 📸",
        imageUrl: isVideo ? null : downloadURL,
        videoUrl: isVideo ? downloadURL : null,
        timestamp: Date.now(),
        seen: false,
      };

      await set(newMsgRef, newMsg);
      await set(ref(db, `chats/${activeChat.id}/lastUpdated`), Date.now());
      simulateAgentReply(activeChat.id, selectedFriend.uid, isVideo ? "[Video shared]" : "[Image shared]");
    } catch (err: any) {
      console.warn("Storage upload failed, trying base64 fallback for images:", err);
      if (fileOrBlob.size > 10 * 1024 * 1024) {
        alert("Upload failed. Media is too large (>10MB) for local base64 fallback. Please verify cloud storage or connection.");
        clearInterval(progressInterval);
        setIsSending(false);
        setChatUploadProgress(null);
        return;
      }
      if (!isVideo && (fileOrBlob instanceof File || fileOrBlob instanceof Blob)) {
        try {
          const base64 = await compressImageToBase64(fileOrBlob);
          const newMsgRef = push(ref(db, `chats/${activeChat.id}/messages`));
          const newMsg: Message = {
            id: newMsgRef.key || "msg_" + Math.random().toString(36).substr(2, 9),
            senderId: user.uid,
            text: "Shared a photo 📸",
            imageUrl: base64,
            timestamp: Date.now(),
            seen: false,
          };
          await set(newMsgRef, newMsg);
          await set(ref(db, `chats/${activeChat.id}/lastUpdated`), Date.now());
          simulateAgentReply(activeChat.id, selectedFriend.uid, "[Image shared]");
        } catch (fallbackErr: any) {
          alert("Upload failed completely: " + fallbackErr.message);
        }
      } else {
        alert("Upload failed: " + err.message);
      }
    } finally {
      clearInterval(progressInterval);
      setChatUploadProgress(100);
      setTimeout(() => {
        setIsSending(false);
        setChatUploadProgress(null);
      }, 400);
    }
  };

  const triggerChatAttachmentUpload = async () => {
    if (!user || !activeChat) return;

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await ActionSheet.showActions({
          title: "Send Chat Attachment",
          message: "Choose media type",
          options: [
            { title: "Take Photo (Camera)" },
            { title: "Choose Photo from Gallery" },
            { title: "Choose Video / File" },
            { title: "Cancel", style: ActionSheetButtonStyle.Cancel }
          ]
        });

        if (result.index === 0) {
          const photo = await CapCamera.getPhoto({
            quality: 90,
            allowEditing: true,
            resultType: CameraResultType.Uri,
            source: CameraSource.Camera
          });
          if (photo.webPath) {
            const res = await fetch(photo.webPath);
            const blob = await res.blob();
            await uploadAttachmentToFirebase(blob, `camera_${Date.now()}.jpg`);
          }
        } else if (result.index === 1) {
          const photo = await CapCamera.getPhoto({
            quality: 90,
            allowEditing: true,
            resultType: CameraResultType.Uri,
            source: CameraSource.Photos
          });
          if (photo.webPath) {
            const res = await fetch(photo.webPath);
            const blob = await res.blob();
            await uploadAttachmentToFirebase(blob, `gallery_${Date.now()}.jpg`);
          }
        } else if (result.index === 2) {
          const inputEl = document.getElementById("chat-attachment-file-input") as HTMLInputElement;
          inputEl?.click();
        }
        return;
      } catch (err) {
        console.warn("Capacitor action sheet failed, falling back to file picker:", err);
      }
    }

    const inputEl = document.getElementById("chat-attachment-file-input") as HTMLInputElement;
    inputEl?.click();
  };

  const handleImageShareChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && user && activeChat) {
      const file = e.target.files[0];
      await uploadAttachmentToFirebase(file, file.name);
      e.target.value = "";
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file && user && activeChat) {
          e.preventDefault();
          await uploadAttachmentToFirebase(file, `pasted_image_${Date.now()}.jpg`);
        }
      } else if (items[i].type.indexOf("video") !== -1) {
        const file = items[i].getAsFile();
        if (file && user && activeChat) {
          e.preventDefault();
          await uploadAttachmentToFirebase(file, `pasted_video_${Date.now()}.mp4`);
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (user && activeChat) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0] && user && activeChat) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        await uploadAttachmentToFirebase(file, file.name);
      }
    }
  };

  const handleSimulateVoiceSend = async () => {
    if (!user || !activeChat) return;
    setIsSending(true);
    try {
      // High-quality public ambient audio clip
      const simulatedAudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3";
      const newMsgRef = push(ref(db, `chats/${activeChat.id}/messages`));
      const newMsg: Message = {
        id: newMsgRef.key || "msg_" + Math.random().toString(36).substr(2, 9),
        senderId: user.uid,
        text: "Voice message 🎙️",
        voiceUrl: simulatedAudioUrl,
        timestamp: Date.now(),
        seen: false,
      };

      await set(newMsgRef, newMsg);
      await set(ref(db, `chats/${activeChat.id}/lastUpdated`), Date.now());
      simulateAgentReply(activeChat.id, selectedFriend.uid, "That voice note is awesome! Voice sharing makes this Facebook & Messenger Clone extremely complete! 🎤🔊");
      alert("✓ Simulated high-quality voice note sent successfully!");
    } catch (err) {
      console.error("Error sending simulated voice:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Capacitor or MediaRecorder Voice Start Recording
  const startVoiceRecording = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const hasPermission = await VoiceRecorder.hasAudioRecordingPermission();
        if (!hasPermission.value) {
          const req = await VoiceRecorder.requestAudioRecordingPermission();
          if (!req.value) {
            alert("Microphone permission denied. Cannot record voice.");
            return;
          }
        }
        await VoiceRecorder.startRecording();
        setIsRecording(true);
      } catch (err: any) {
        console.error("Capacitor start recording error:", err);
        alert("Failed to start native recording: " + err.message);
      }
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const confirmSimulate = window.confirm(
        "Microphone capture is not supported in this iframe environment or is running on a non-secure connection.\n\nWould you like to send a simulated high-quality voice clip instead to test the audio player engine?"
      );
      if (confirmSimulate) {
        handleSimulateVoiceSend();
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        await handleSendVoiceMessage(audioBlob);
        
        // Terminate mic streams gracefully
        stream.getTracks().forEach((track) => track.stop());
      };

      setAudioChunks([]);
      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone capture error:", err);
      const confirmSimulate = window.confirm(
        "Failed to access your microphone. Frame permissions might be restricted.\n\nWould you like to send a simulated high-quality voice clip instead to test the audio player engine?"
      );
      if (confirmSimulate) {
        handleSimulateVoiceSend();
      }
    }
  };

  const stopVoiceRecording = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await VoiceRecorder.stopRecording();
        setIsRecording(false);
        if (result.value && result.value.recordDataBase64) {
          const mimeType = result.value.mimeType || "audio/aac";
          const res = await fetch(`data:${mimeType};base64,${result.value.recordDataBase64}`);
          const audioBlob = await res.blob();
          await handleSendVoiceMessage(audioBlob);
        } else {
          alert("No recording data captured.");
        }
      } catch (err: any) {
        console.error("Capacitor stop recording error:", err);
        alert("Failed to stop voice recording: " + err.message);
        setIsRecording(false);
      }
      return;
    }

    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const cancelVoiceRecording = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await VoiceRecorder.stopRecording();
      } catch (err) {
        console.warn("Error stopping voice recording for cancel:", err);
      }
      setIsRecording(false);
      return;
    }

    if (mediaRecorder) {
      mediaRecorder.onstop = null; // drop payload
      mediaRecorder.stop();
    }
    setIsRecording(false);
    setAudioChunks([]);
  };

  // Convert Voice Blob to URL & upload
  const handleSendVoiceMessage = async (blob: Blob) => {
    if (!user || !activeChat) return;
    setIsSending(true);
    setChatUploadProgress(0);

    // Simulated progress to guarantee progress bar updates smoothly
    let simulatedProgress = 0;
    const progressInterval = setInterval(() => {
      simulatedProgress += Math.max(1, Math.floor((95 - simulatedProgress) / 8));
      setChatUploadProgress((prev) => Math.max(prev || 0, simulatedProgress));
    }, 150);

    try {
      let voiceUrl = "";
      try {
        // Cast voice note to file
        const voiceFile = new File([blob], `voice_note_${Date.now()}.webm`, { type: "audio/webm" });
        const fileRef = sRef(storage, `chats/voice/${Date.now()}_voice.webm`);
        const uploadTask = uploadBytesResumable(fileRef, voiceFile);
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            try {
              uploadTask.cancel();
            } catch (e) {}
            reject(new Error("Voice upload timed out (6s limit)"));
          }, 6000); // 6s timeout

          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              setChatUploadProgress((prev) => Math.max(prev || 0, progress));
            },
            (err) => {
              clearTimeout(timer);
              reject(err);
            },
            () => {
              clearTimeout(timer);
              resolve();
            }
          );
        });
        voiceUrl = await getDownloadURL(fileRef);
      } catch (storageErr) {
        console.warn("Storage voice upload failed, falling back to base64 encoding:", storageErr);
        voiceUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      const newMsgRef = push(ref(db, `chats/${activeChat.id}/messages`));
      const newMsg: Message = {
        id: newMsgRef.key || "msg_" + Math.random().toString(36).substr(2, 9),
        senderId: user.uid,
        text: "Voice message 🎙️",
        voiceUrl,
        timestamp: Date.now(),
        seen: false,
      };

      await set(newMsgRef, newMsg);
      await set(ref(db, `chats/${activeChat.id}/lastUpdated`), Date.now());
      simulateAgentReply(activeChat.id, selectedFriend.uid, "[Sent a voice note]");
    } catch (err: any) {
      console.error("Error saving voice message:", err);
      alert("Error saving voice note: " + err.message);
    } finally {
      clearInterval(progressInterval);
      setChatUploadProgress(100);
      setTimeout(() => {
        setIsSending(false);
        setChatUploadProgress(null);
      }, 400);
    }
  };

  // Custom Audio player engine trigger for individual bubble play buttons
  const togglePlayAudio = (messageId: string, url: string) => {
    const isPlaying = playingAudios[messageId];
    
    // Stop all other playing audios
    Object.keys(audioElementsRef.current).forEach((mid) => {
      if (mid !== messageId) {
        audioElementsRef.current[mid].pause();
        setPlayingAudios((prev) => ({ ...prev, [mid]: false }));
      }
    });

    if (isPlaying) {
      audioElementsRef.current[messageId]?.pause();
      setPlayingAudios((prev) => ({ ...prev, [messageId]: false }));
    } else {
      if (!audioElementsRef.current[messageId]) {
        const el = new Audio(url);
        el.onended = () => {
          setPlayingAudios((prev) => ({ ...prev, [messageId]: false }));
        };
        audioElementsRef.current[messageId] = el;
      }
      audioElementsRef.current[messageId].play();
      setPlayingAudios((prev) => ({ ...prev, [messageId]: true }));
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatChatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getLastMessageText = (friendUid: string) => {
    const matchedThread = chats.find((c) => c.participants.includes(friendUid));
    if (!matchedThread || matchedThread.messages.length === 0) return "No messages yet";
    const last = matchedThread.messages[matchedThread.messages.length - 1];
    return last.senderId === user?.uid ? `You: ${last.text}` : last.text;
  };

  const isCurrentlyBlocked = myBlockedUsers.includes(selectedFriend.uid);
  const hasBlockedMe = blockedMeUsers.includes(selectedFriend.uid);

  const handleToggleBlock = async () => {
    if (!user) return;
    try {
      if (isCurrentlyBlocked) {
        await set(ref(db, `blocks/${user.uid}/${selectedFriend.uid}`), null);
        alert(`✓ Unblocked ${selectedFriend.name}.`);
      } else {
        if (confirm(`Are you sure you want to block ${selectedFriend.name}? This will prevent all messages and social interactions.`)) {
          // Break friendship and cancel requests
          await set(ref(db, `friendships/${user.uid}/${selectedFriend.uid}`), null);
          await set(ref(db, `friendships/${selectedFriend.uid}/${user.uid}`), null);
          await set(ref(db, `friend_requests/${user.uid}/${selectedFriend.uid}`), null);
          await set(ref(db, `friend_requests/${selectedFriend.uid}/${user.uid}`), null);
          await set(ref(db, `friend_requests_sent/${user.uid}/${selectedFriend.uid}`), null);
          await set(ref(db, `friend_requests_sent/${selectedFriend.uid}/${user.uid}`), null);

          await set(ref(db, `blocks/${user.uid}/${selectedFriend.uid}`), true);
          alert(`✓ Blocked ${selectedFriend.name}.`);
        }
      }
    } catch (err: any) {
      alert("Error toggle blocking: " + err.message);
    }
  };

  return (
    <div id="messenger-layout-card" className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex h-[620px] max-w-[900px] mx-auto w-full">
      
      {/* 1. Chats list - Left Sidebar */}
      <div 
        id="messenger-sidebar" 
        className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col bg-white ${
          mobileShowThread ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 select-none">Chats</h2>
          <div className="mt-3">
            <input
              type="text"
              placeholder="Search Messenger"
              className="w-full bg-gray-100 rounded-full px-4 py-2 text-xs text-gray-800 border-none outline-none focus:ring-1 focus:ring-[#1877F2]"
            />
          </div>
        </div>

        {/* Conversation Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {friends.map((f) => {
            const isSelected = selectedFriend.uid === f.uid;
            return (
              <div
                key={f.uid}
                onClick={() => {
                  setSelectedFriend(f);
                  setMobileShowThread(true);
                }}
                className={`flex gap-3 items-center p-3.5 cursor-pointer transition select-none ${
                  isSelected ? "bg-[#1877F2]/5 border-l-4 border-[#1877F2]" : "hover:bg-gray-50"
                }`}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={f.photo}
                    alt={f.name}
                    className="w-11 h-11 rounded-full object-cover"
                  />
                  {f.status === "Active now" && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#42B72A] border-2 border-white rounded-full"></span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-gray-900 truncate">{f.name}</h4>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {getLastMessageText(f.uid)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Messages Panel - Right View */}
      <div 
        id="chat-thread-panel" 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 flex flex-col bg-white relative ${
          mobileShowThread ? "flex" : "hidden md:flex"
        }`}
      >
        {/* Drag & Drop overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-[#1877F2]/90 backdrop-blur-xs z-50 flex flex-col items-center justify-center text-white p-6 transition-all duration-200 select-none pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-white/25 flex items-center justify-center mb-3 animate-bounce">
              <ImageIcon className="w-8 h-8 text-white" />
            </div>
            <p className="text-base font-bold">Drop photo or video here</p>
            <p className="text-xs text-white/80 mt-1">Sends automatically to {selectedFriend.name}</p>
          </div>
        )}

        {/* Chat Header */}
        <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-white select-none">
          <div className="flex gap-2.5 items-center">
            {mobileShowThread && (
              <button
                onClick={() => setMobileShowThread(false)}
                className="md:hidden p-1.5 hover:bg-gray-100 rounded-full text-[#1877F2] transition mr-1 cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="relative">
              <img
                src={selectedFriend.photo}
                alt={selectedFriend.name}
                className="w-9 h-9 rounded-full object-cover"
              />
              {selectedFriend.status === "Active now" && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#42B72A] border-2 border-white rounded-full"></span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 leading-tight">
                {selectedFriend.name}
              </h3>
              <p className="text-[10px] text-gray-500 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${selectedFriend.status === "Active now" ? "bg-[#42B72A]" : "bg-gray-400"}`}></span>
                <span>{selectedFriend.status}</span>
              </p>
            </div>
          </div>

          {/* Actions bar including Toggle Block user */}
          <div className="flex gap-2 md:gap-4 text-[#1877F2] items-center">
            {selectedFriend.uid && !selectedFriend.uid.startsWith("system_") && (
              <button
                onClick={handleToggleBlock}
                title={isCurrentlyBlocked ? "Unblock user" : "Block user"}
                className={`p-1.5 rounded-full transition cursor-pointer hover:bg-gray-100 ${
                  isCurrentlyBlocked ? "text-red-500 bg-red-50 hover:bg-red-100" : "text-gray-500 hover:text-red-600"
                }`}
              >
                <ShieldAlert className="w-4.5 h-4.5" />
              </button>
            )}
            <button className="hover:bg-gray-100 p-1.5 rounded-full transition cursor-pointer">
              <Phone className="w-4 h-4" />
            </button>
            <button className="hover:bg-gray-100 p-1.5 rounded-full transition cursor-pointer">
              <Video className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div id="messages-container-scroll" className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
          {activeChat?.messages.map((msg, index) => {
            const isMe = msg.senderId === user?.uid;
            const isLastMessage = index === activeChat.messages.length - 1;

            return (
              <div
                key={msg.id}
                className={`flex gap-2 max-w-[85%] ${isMe ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {/* Friend Avatar for received messages */}
                {!isMe && (
                  <img
                    src={selectedFriend.photo}
                    alt={selectedFriend.name}
                    className="w-7 h-7 rounded-full object-cover mt-1 flex-shrink-0"
                  />
                )}

                <div className="space-y-1">
                  {/* Message Bubble */}
                  <div
                    className={`p-3 rounded-2xl text-sm ${
                      isMe 
                        ? "bg-[#1877F2] text-white rounded-br-none" 
                        : "bg-gray-200 text-gray-800 rounded-bl-none"
                    }`}
                  >
                    {/* Render Image or Video content if exists */}
                    {(msg.imageUrl || msg.videoUrl) && (
                      <div className="mb-2 max-w-[240px] rounded-lg overflow-hidden border border-white/20">
                        {msg.videoUrl ? (
                          <video
                            src={msg.videoUrl}
                            controls
                            playsInline
                            className="w-full rounded-lg bg-black"
                          />
                        ) : (
                          <img
                            src={msg.imageUrl || ""}
                            alt="shared photo"
                            className="w-full object-cover"
                          />
                        )}
                      </div>
                    )}

                    {/* Render Voice Message audio controls if exists */}
                    {msg.voiceUrl ? (
                      <div className="flex items-center gap-3.5 pr-1 py-1 min-w-[170px] select-none">
                        <button
                          onClick={() => togglePlayAudio(msg.id, msg.voiceUrl!)}
                          className={`p-2 rounded-full flex items-center justify-center transition cursor-pointer ${
                            isMe ? "bg-white text-[#1877F2]" : "bg-[#1877F2] text-white"
                          }`}
                        >
                          {playingAudios[msg.id] ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>
                        <div className="flex-1">
                          <span className="text-[11px] font-semibold block uppercase tracking-wider">Voice message</span>
                          {/* Animated sound line wave */}
                          <div className="flex gap-0.5 items-end h-3 mt-1 w-full max-w-[100px]">
                            <div className={`w-0.5 h-2 rounded ${isMe ? "bg-white/40" : "bg-gray-400"} ${playingAudios[msg.id] ? "animate-pulse" : ""}`}></div>
                            <div className={`w-0.5 h-3 rounded ${isMe ? "bg-white" : "bg-gray-700"} ${playingAudios[msg.id] ? "animate-pulse" : ""}`}></div>
                            <div className={`w-0.5 h-1 rounded ${isMe ? "bg-white/40" : "bg-gray-400"} ${playingAudios[msg.id] ? "animate-pulse" : ""}`}></div>
                            <div className={`w-0.5 h-2 rounded ${isMe ? "bg-white" : "bg-gray-700"} ${playingAudios[msg.id] ? "animate-pulse" : ""}`}></div>
                            <div className={`w-0.5 h-3 rounded ${isMe ? "bg-white/40" : "bg-gray-400"} ${playingAudios[msg.id] ? "animate-pulse" : ""}`}></div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Text content */
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>

                  {/* Timestamp and seen details */}
                  <div className={`flex items-center gap-1.5 text-[9px] text-gray-400 font-semibold px-1 ${isMe ? "justify-end" : "justify-start"}`}>
                    <span>{formatChatTime(msg.timestamp)}</span>
                    {isMe && (
                      <span>
                        {msg.seen ? (
                          <div className="flex items-center gap-0.5">
                            <span>Seen</span>
                            <CheckCheck className="w-3 h-3 text-[#1877F2]" />
                          </div>
                        ) : (
                          <Check className="w-3 h-3 text-gray-400" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Active Voice Recorder Overlay Bar */}
        {isRecording && (
          <div id="voice-recording-overlay" className="bg-[#1877F2]/5 border-t border-[#1877F2]/20 p-3.5 flex justify-between items-center select-none animate-pulse">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping"></span>
              <span className="text-xs font-bold text-gray-700">Recording Voice Note:</span>
              <span className="text-xs font-mono font-bold text-gray-900 bg-gray-200 px-2 py-0.5 rounded-md">
                {formatSeconds(recordingSeconds)}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                id="btn-cancel-voice"
                onClick={cancelVoiceRecording}
                className="flex items-center gap-1.5 px-3 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-bold rounded-md cursor-pointer transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button
                id="btn-stop-send-voice"
                onClick={stopVoiceRecording}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#42B72A] hover:bg-[#36A420] text-white text-xs font-bold rounded-md cursor-pointer transition shadow-xs"
              >
                <StopCircle className="w-3.5 h-3.5" />
                Stop & Send
              </button>
            </div>
          </div>
        )}

        {/* Input Controls Bar */}
        {isCurrentlyBlocked || hasBlockedMe ? (
          <div className="p-4 bg-gray-50 border-t border-gray-200 text-center select-none text-xs font-bold text-gray-500">
            {isCurrentlyBlocked 
              ? "You have blocked this user. Unblock them to resume messaging."
              : "This user is currently unavailable."
            }
          </div>
        ) : (
          <div className="p-3 border-t border-gray-200 bg-white">
            {chatUploadProgress !== null && (
              <div className="p-2 mb-2 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1877F2]" />
                  <span>Uploading message attachment...</span>
                </div>
                <span className="text-xs font-mono font-bold text-[#1877F2]">{chatUploadProgress}%</span>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2.5"
            >
              {/* Gallery Image/Video input button */}
              <button
                id="btn-trigger-chat-attachment"
                type="button"
                onClick={triggerChatAttachmentUpload}
                className="text-[#1877F2] p-2 hover:bg-gray-100 rounded-full transition cursor-pointer select-none flex-shrink-0 border-none outline-none"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <input
                id="chat-attachment-file-input"
                type="file"
                accept="image/*,video/*"
                onChange={handleImageShareChange}
                className="hidden"
                disabled={isSending || isRecording}
              />

              {/* Voice record microphone button */}
              <button
                id="btn-record-voice-init"
                type="button"
                onClick={startVoiceRecording}
                disabled={isSending || isRecording}
                className="text-[#1877F2] p-2 hover:bg-gray-100 rounded-full transition cursor-pointer flex-shrink-0 disabled:opacity-30"
              >
                <Mic className="w-5 h-5" />
              </button>

              {/* Message input text */}
              <input
                id="chat-text-input-field"
                type="text"
                placeholder="Aa"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onPaste={handlePaste}
                disabled={isSending || isRecording}
                className="flex-1 bg-gray-100 hover:bg-gray-200 focus:bg-gray-100 py-2.5 px-4 rounded-full text-sm text-gray-900 border-none outline-none focus:ring-1 focus:ring-[#1877F2] transition"
              />

              {/* Message submit button */}
              <button
                id="btn-send-chat-msg"
                type="submit"
                disabled={isSending || !inputText.trim() || isRecording}
                className="text-[#1877F2] p-2 hover:bg-gray-100 rounded-full transition cursor-pointer disabled:opacity-30 flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}
      </div>

    </div>
  );
}
