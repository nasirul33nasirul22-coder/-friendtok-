import React, { useState, useEffect } from "react";
import { db, storage, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue, update, get } from "firebase/database";
import { ref as sRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Post, UserProfile, compressImageToBase64, compressImageToBlob } from "../types";
import { Capacitor } from "@capacitor/core";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { ActionSheet, ActionSheetButtonStyle } from "@capacitor/action-sheet";
import { 
  Camera, 
  MapPin, 
  GraduationCap, 
  Calendar, 
  User, 
  Edit2, 
  LogOut, 
  X, 
  Save, 
  Heart, 
  Smile, 
  Cake,
  Copy,
  Check,
  Loader2
} from "lucide-react";

interface ProfileProps {
  onLogoutSuccess: () => void;
}

export default function Profile({ onLogoutSuccess }: ProfileProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit fields
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [education, setEducation] = useState("");

  // Sync auth updates
  useEffect(() => {
    let unsubscribeDb: (() => void) | null = null;
    const unsub = onAuthStateChanged(auth, async (currUser) => {
      if (unsubscribeDb) {
        unsubscribeDb();
        unsubscribeDb = null;
      }
      if (currUser) {
        // Load custom user profile from Realtime Database using the 6-digit mapping
        try {
          const mapRef = ref(db, `uid_map/${currUser.uid}`);
          const mapSnap = await get(mapRef);
          const numericUid = mapSnap.val() || currUser.uid;

          const userRef = ref(db, `users/${numericUid}`);
          unsubscribeDb = onValue(userRef, (snap) => {
            const val = snap.val();
            if (val) {
              setUser({ ...val, uid: numericUid });
              setFirstName(val.firstName || "");
              setSurname(val.surname || "");
              setBio(val.bio || "");
              setLocation(val.location || "");
              setEducation(val.education || "");
            } else {
              const defaultUser: UserProfile = {
                uid: numericUid,
                email: currUser.email || "",
                firstName: currUser.displayName?.split(" ")[0] || "User",
                surname: currUser.displayName?.split(" ")[1] || "",
                displayName: currUser.displayName || currUser.email || "User",
                photoURL: currUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
                coverURL: "https://images.unsplash.com/photo-1707343843437-caacff5cfa74?auto=format&fit=crop&w=1000&q=80",
                bio: "Just joined FriendTok! 👋 Feel free to add me using my UID.",
                location: "Silicon Valley, CA",
                education: "Stanford University",
                gender: "Not Specified",
                birthday: "1996-01-01",
                joinedDate: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
              };
              setUser(defaultUser);
              setFirstName(defaultUser.firstName || "");
              setSurname(defaultUser.surname || "");
              setBio(defaultUser.bio || "");
              setLocation(defaultUser.location || "");
              setEducation(defaultUser.education || "");
            }
          });
        } catch (err) {
          console.error("Profile auth sync error:", err);
        }
      } else {
        setUser(null);
      }
    });
    return () => {
      unsub();
      if (unsubscribeDb) unsubscribeDb();
    };
  }, []);

  // Sync posts and filter current user posts
  useEffect(() => {
    if (!user) return;
    const postsRef = ref(db, "posts");
    const unsubscribe = onValue(postsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const postsList = Object.entries(data).map(([key, val]: [string, any]) => ({
          id: key,
          ...val,
          likes: val.likes || [],
          comments: val.comments || []
        }));
        const filtered = postsList
          .filter((p) => p.userId === user.uid)
          .sort((a, b) => b.timestamp - a.timestamp);
        setUserPosts(filtered);
      } else {
        setUserPosts([]);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      onLogoutSuccess();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const uploadFileToFirebase = async (fileOrBlob: File | Blob, name: string, type: "profile" | "cover") => {
    if (!user) return;
    setIsLoading(true);
    setUploadProgress(0);

    let fileToUpload = fileOrBlob;
    try {
      const fileObj = fileOrBlob instanceof File 
        ? fileOrBlob 
        : new File([fileOrBlob], "image.jpg", { type: fileOrBlob.type || "image/jpeg" });
      fileToUpload = await compressImageToBlob(fileObj);
    } catch (compressErr) {
      console.warn("Failed to compress image before profile/cover upload, using original file/blob:", compressErr);
    }

    const path = type === "profile" ? "profile_pics" : "covers";
    const fileRef = sRef(storage, `${path}/${user.uid}_${Date.now()}_${name || "upload"}`);
    
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
            setUploadProgress(progress);
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
      if (type === "profile") {
        await update(ref(db, `users/${user.uid}`), { photoURL: downloadURL });
      } else {
        await update(ref(db, `users/${user.uid}`), { coverURL: downloadURL });
      }
    } catch (err: any) {
      console.warn(`Firebase Storage upload failed, trying local compression/base64 fallback:`, err);
      if (fileOrBlob.size > 10 * 1024 * 1024) {
        alert("Upload failed. Files larger than 10MB require a functioning cloud storage connection and cannot be converted to offline base64 fallback.");
        setIsLoading(false);
        setUploadProgress(null);
        return;
      }
      // fallback to base64 if storage failed
      try {
        if (fileOrBlob instanceof File) {
          const base64 = await compressImageToBase64(fileOrBlob);
          if (type === "profile") {
            await update(ref(db, `users/${user.uid}`), { photoURL: base64 });
          } else {
            await update(ref(db, `users/${user.uid}`), { coverURL: base64 });
          }
        } else {
          // It's a blob from camera, read as DataURL directly
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(fileOrBlob);
          });
          if (type === "profile") {
            await update(ref(db, `users/${user.uid}`), { photoURL: base64 });
          } else {
            await update(ref(db, `users/${user.uid}`), { coverURL: base64 });
          }
        }
      } catch (fallbackErr: any) {
        alert("Upload failed completely: " + fallbackErr.message);
      }
    } finally {
      setIsLoading(false);
      setUploadProgress(null);
    }
  };

  const triggerPhotoUpload = async (type: "profile" | "cover") => {
    if (!user) return;
    try {
      let fileToUpload: File | Blob | null = null;
      let fileName = "";

      if (Capacitor.isNativePlatform()) {
        try {
          const result = await ActionSheet.showActions({
            title: `Upload ${type === "profile" ? "Profile" : "Cover"} Photo`,
            message: "Select image source",
            options: [
              { title: "Take Photo (Camera)" },
              { title: "Choose from Gallery" },
              { title: "Cancel", style: ActionSheetButtonStyle.Cancel }
            ]
          });

          if (result.index === 0) {
            // Camera
            const photo = await CapCamera.getPhoto({
              quality: 90,
              allowEditing: true,
              resultType: CameraResultType.Uri,
              source: CameraSource.Camera
            });
            if (photo.webPath) {
              const res = await fetch(photo.webPath);
              fileToUpload = await res.blob();
              fileName = `camera_${Date.now()}.jpg`;
            }
          } else if (result.index === 1) {
            // Gallery
            const photo = await CapCamera.getPhoto({
              quality: 90,
              allowEditing: true,
              resultType: CameraResultType.Uri,
              source: CameraSource.Photos
            });
            if (photo.webPath) {
              const res = await fetch(photo.webPath);
              fileToUpload = await res.blob();
              fileName = `gallery_${Date.now()}.jpg`;
            }
          } else {
            return; // Cancelled
          }
        } catch (capErr) {
          console.warn("Capacitor action sheet / camera error, falling back to standard input trigger:", capErr);
        }
      }

      // If we didn't get any file from Capacitor (either we are on web, or it was canceled/failed),
      // we fallback to triggering the standard hidden file input!
      if (!fileToUpload) {
        const inputId = type === "profile" ? "avatar-uploader-input" : "cover-uploader-input";
        const inputEl = document.getElementById(inputId) as HTMLInputElement;
        if (inputEl) {
          inputEl.click();
        }
        return;
      }

      await uploadFileToFirebase(fileToUpload, fileName, type);
    } catch (err: any) {
      alert("Error handling upload: " + err.message);
    }
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && user) {
      const file = e.target.files[0];
      await uploadFileToFirebase(file, file.name, "profile");
    }
  };

  const handleCoverPictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && user) {
      const file = e.target.files[0];
      await uploadFileToFirebase(file, file.name, "cover");
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);

    try {
      const displayName = `${firstName} ${surname}`.trim() || user.displayName;
      await update(ref(db, `users/${user.uid}`), {
        firstName,
        surname,
        displayName,
        bio,
        location,
        education,
      });
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving profile details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBirthday = (bdayStr?: string) => {
    if (!bdayStr) return "Not specified";
    try {
      const date = new Date(bdayStr);
      return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } catch (e) {
      return bdayStr;
    }
  };

  return (
    <div id="profile-layout-root" className="max-w-[850px] mx-auto bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden pb-10">
      
      {/* 1. Header Media section */}
      <div id="profile-media-header" className="relative h-64 md:h-72 w-full bg-gray-200">
        {/* Cover Photo */}
        <img
          src={user?.coverURL || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80"}
          alt="Cover Banner"
          className="w-full h-full object-cover"
        />

        {/* Change Cover Trigger */}
        <button
          id="btn-trigger-cover-upload"
          type="button"
          onClick={() => triggerPhotoUpload("cover")}
          className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 backdrop-blur-xs text-white p-2 px-3 rounded-md text-xs font-bold cursor-pointer transition flex items-center gap-1.5 select-none border-none outline-none"
        >
          <Camera className="w-4 h-4" />
          <span className="hidden sm:inline">Edit Cover Photo</span>
        </button>
        <input
          id="cover-uploader-input"
          type="file"
          accept="image/*"
          onChange={handleCoverPictureChange}
          className="hidden"
          disabled={isLoading}
        />

        {/* Upload Progress Overlay */}
        {uploadProgress !== null && (
          <div className="absolute top-4 left-4 z-30 bg-black/80 backdrop-blur-md text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg">
            <Loader2 className="w-4 h-4 animate-spin text-[#1877F2]" />
            <span>Uploading: {uploadProgress}%</span>
          </div>
        )}

        {/* Profile Avatar & Metadata Block */}
        <div id="profile-avatar-row" className="absolute -bottom-16 left-4 sm:left-8 flex flex-col sm:flex-row items-center sm:items-end gap-4">
          <div className="relative w-36 h-36 rounded-full border-4 border-white bg-gray-100 shadow-md flex-shrink-0">
            <div className="w-full h-full rounded-full overflow-hidden">
              <img
                src={user?.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Real-time online active dot */}
            <span className="absolute bottom-1 left-1 bg-[#42B72A] border-3 border-white w-5.5 h-5.5 rounded-full shadow-md" title="Active now"></span>
            
            {/* Camera Overlapping Icon for DP */}
            <button
              id="btn-trigger-avatar-upload"
              type="button"
              onClick={() => triggerPhotoUpload("profile")}
              className="absolute bottom-1 right-1 bg-gray-100 hover:bg-gray-200 p-2 rounded-full border border-gray-300 cursor-pointer shadow transition flex items-center justify-center border-none outline-none"
            >
              <Camera className="w-4 h-4 text-gray-700" />
            </button>
            <input
              id="avatar-uploader-input"
              type="file"
              accept="image/*"
              onChange={handleProfilePictureChange}
              className="hidden"
              disabled={isLoading}
            />
          </div>

          <div className="text-center sm:text-left sm:pb-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-none">
              {user?.displayName}
            </h2>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
              <span className="text-xs text-gray-500 font-semibold">
                {userPosts.length} posts
              </span>
              <span className="text-xs text-gray-300">|</span>
              <span className="text-xs font-mono bg-gray-100 text-[#1877F2] font-semibold px-2 py-0.5 rounded border border-gray-200">
                UID: {user?.uid}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer to push content down past floating DP */}
      <div className="h-20 sm:h-20"></div>

      {/* Main Action buttons row */}
      <div id="profile-action-controls" className="border-b border-gray-200 pb-4 px-4 sm:px-8 flex flex-wrap gap-2.5 justify-center sm:justify-end">
        <button
          id="btn-copy-uid"
          onClick={async () => {
            if (user?.uid) {
              try {
                await navigator.clipboard.writeText(user.uid);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch (err) {
                console.error("Clipboard copy failed:", err);
                alert(`Your UID is: ${user.uid}. Please copy it manually.`);
              }
            }
          }}
          className="flex items-center gap-1.5 p-2 px-4 bg-[#1877F2] hover:bg-[#1565C0] text-white text-xs font-bold rounded-md cursor-pointer transition shadow-xs"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-300 animate-bounce" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy My UID</span>
            </>
          )}
        </button>
        <button
          id="btn-trigger-edit-profile"
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1.5 p-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-md cursor-pointer transition"
        >
          <Edit2 className="w-4 h-4 text-gray-600" />
          Edit Profile
        </button>
        <button
          id="btn-trigger-logout"
          onClick={handleLogout}
          className="flex items-center gap-1.5 p-2 px-4 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 text-xs font-bold rounded-md cursor-pointer transition"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>

      {/* 2. Lower Profile Layout Grid */}
      <div id="profile-grid-container" className="grid grid-cols-1 md:grid-cols-3 gap-5 px-4 sm:px-8 pt-5">
        
        {/* Intro - Left Panel */}
        <div id="profile-intro-card" className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 mb-3.5 flex items-center gap-1.5 select-none">
              <span>Intro</span>
              <Smile className="w-4 h-4 text-[#1877F2]" />
            </h3>

            {/* Bio */}
            <div className="text-center pb-3 border-b border-gray-100 mb-3.5">
              <p className="text-xs text-gray-700 italic leading-relaxed">
                {user?.bio || "No bio added yet."}
              </p>
            </div>

            {/* Structured details list */}
            <div className="space-y-3 text-xs text-gray-700 font-medium">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>Lives in <span className="font-bold">{user?.location || "Silicon Valley, CA"}</span></span>
              </div>
              <div className="flex items-center gap-2.5">
                <GraduationCap className="w-4 h-4 text-gray-400" />
                <span>Studied at <span className="font-bold">{user?.education || "Stanford University"}</span></span>
              </div>
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>Joined <span className="font-bold">{user?.joinedDate}</span></span>
              </div>
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-gray-400" />
                <span>Gender: <span className="font-bold">{user?.gender || "Female"}</span></span>
              </div>
              <div className="flex items-center gap-2.5">
                <Cake className="w-4 h-4 text-gray-400" />
                <span>Born on <span className="font-bold">{formatBirthday(user?.birthday)}</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* User's posts - Right 2/3 Panel */}
        <div id="profile-posts-stream" className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-xs">
            <h3 className="text-sm font-bold text-gray-900">Your Posts</h3>
          </div>

          {userPosts.length === 0 ? (
            <div id="empty-user-posts-alert" className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-10 text-center">
              <p className="text-xs text-gray-500 font-bold">You haven't posted anything yet.</p>
              <p className="text-[11px] text-gray-400 mt-1">Head to the News Feed to share your first post!</p>
            </div>
          ) : (
            userPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* Author Info */}
                <div className="p-3.5 flex items-center justify-between">
                  <div className="flex gap-2.5 items-center">
                    <img
                      src={post.authorAvatar}
                      alt={post.authorName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 leading-tight">
                        {post.authorName}
                      </h4>
                      <p className="text-[10px] text-gray-500 font-semibold">
                        {new Date(post.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Text Body */}
                <div className="px-3.5 pb-2">
                  <p className="text-xs text-gray-800 whitespace-pre-wrap leading-normal">
                    {post.text}
                  </p>
                </div>

                {/* Photo Element */}
                {post.imageUrl && (
                  <div className="bg-gray-50 max-h-[300px] overflow-hidden flex justify-center items-center border-y border-gray-100">
                    <img
                      src={post.imageUrl}
                      alt="Post content"
                      className="w-full max-h-[300px] object-cover"
                    />
                  </div>
                )}

                {/* Likes / Comments Summary */}
                <div className="p-3 bg-gray-50/40 flex justify-between items-center text-[10px] text-gray-500 font-bold border-t border-gray-100">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                    {post.likes.length} likes
                  </span>
                  <span>{post.comments.length} comments</span>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* ==================== EDIT PROFILE DIALOG MODAL ==================== */}
      {isEditing && (
        <div id="edit-profile-modal" className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg max-w-[450px] w-full border border-gray-200 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Edit Profile</h3>
              <button
                id="btn-close-profile-editor"
                onClick={() => setIsEditing(false)}
                className="text-gray-500 hover:bg-gray-100 p-1.5 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveChanges} className="p-4 space-y-4">
              {/* Names row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-600">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm text-gray-900 focus:ring-2 focus:ring-[#1877F2]"
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-600">Surname</label>
                  <input
                    type="text"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm text-gray-900 focus:ring-2 focus:ring-[#1877F2]"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              {/* Bio Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-600">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm text-gray-900 focus:ring-2 focus:ring-[#1877F2] h-20 resize-none"
                  placeholder="Describe who you are..."
                  disabled={isLoading}
                />
              </div>

              {/* Location Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-600">Current Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm text-gray-900 focus:ring-2 focus:ring-[#1877F2]"
                  placeholder="e.g. Palo Alto, California"
                  disabled={isLoading}
                />
              </div>

              {/* Education Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-600">Education</label>
                <input
                  type="text"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm text-gray-900 focus:ring-2 focus:ring-[#1877F2]"
                  placeholder="e.g. Stanford University"
                  disabled={isLoading}
                />
              </div>

              {/* Form Actions */}
              <div className="pt-3 border-t border-gray-100 flex gap-2">
                <button
                  id="btn-dismiss-editor"
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-md transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-profile-data"
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold text-sm rounded-md transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {isLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
