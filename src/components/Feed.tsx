import React, { useState, useEffect, useRef } from "react";
import { db, storage, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue, push, set, update, get } from "firebase/database";
import { ref as sRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Post, Story, UserProfile, compressImageToBase64, compressImageToBlob } from "../types";

const INITIAL_POSTS: Post[] = [
  {
    id: "post_1",
    userId: "system_mark",
    authorName: "Mark Zuckerberg",
    authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    text: "Building the future of social connection. Welcome to FriendTok! What do you think of the custom real-time sync?",
    likes: ["system_sheryl", "system_elon"],
    comments: [
      {
        id: "comment_1",
        authorName: "Sheryl Sandberg",
        authorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
        text: "This is incredibly fast and responsive! The Realtime Database synchronization is brilliant.",
        timestamp: Date.now() - 3600000,
      }
    ],
    timestamp: Date.now() - 7200000,
  },
  {
    id: "post_2",
    userId: "system_sheryl",
    authorName: "Sheryl Sandberg",
    authorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
    text: "Excited to see everyone using the real-time voice messaging in Messenger. Make sure to try the custom audio story engine too! 🎵✨",
    imageUrl: "https://images.unsplash.com/photo-1516280440614-37939bbacd6a?auto=format&fit=crop&w=800&q=80",
    likes: ["system_mark"],
    comments: [],
    timestamp: Date.now() - 14400000,
  }
];

const INITIAL_STORIES: Story[] = [
  {
    id: "story_1",
    userId: "system_mark",
    authorName: "Mark Zuckerberg",
    authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    songTitle: "Waves of Silicon - Synthwave",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    timestamp: Date.now() - 3600000,
  },
  {
    id: "story_2",
    userId: "system_sheryl",
    authorName: "Sheryl Sandberg",
    authorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
    imageUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80",
    songTitle: "Chill Nature Ambient",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    timestamp: Date.now() - 7200000,
  }
];
import { 
  Plus, 
  Image as ImageIcon, 
  Smile, 
  Music, 
  ThumbsUp, 
  MessageSquare, 
  Share2, 
  X, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Send,
  UserPlus,
  Check,
  Video as VideoIcon,
  Loader2,
  Search,
  Sparkles,
  Youtube,
  Link as LinkIcon
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { ActionSheet, ActionSheetButtonStyle } from "@capacitor/action-sheet";

// Pre-configured list of beautiful ambient audio tracks for quick story creation
const MUSIC_PRESETS = [
  { name: "Chill Lofi Beats", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { name: "Acoustic Sunset Mood", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  { name: "Retro Synthwave 1984", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
  { name: "Inspiring Piano", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" }
];

const MUSIC_SEARCH_CATALOG = [
  { name: "Chill Lofi Beats", artist: "Lofi Dreamer", tags: "lofi, chill, relaxed, study, beat", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", duration: "6:12" },
  { name: "Ocean Breeze Acoustic", artist: "Guitar Vibes", tags: "acoustic, guitar, ocean, summer, slow", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", duration: "7:05" },
  { name: "Acoustic Sunset Mood", artist: "Folk Horizon", tags: "acoustic, sunset, warm, guitar, calm", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", duration: "5:44" },
  { name: "Midnight Cafe Jazz", artist: "Blue Sax", tags: "jazz, sax, midnight, cafe, slow, relaxing", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", duration: "5:02" },
  { name: "Retro Synthwave 1984", artist: "Neon Rider", tags: "synthwave, retro, 80s, electronic, gaming", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", duration: "6:02" },
  { name: "Electric Summer Vibe", artist: "DJ Solar", tags: "electronic, summer, upbeat, dance, party, techno", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", duration: "5:38" },
  { name: "Deep Focus Ambient", artist: "Zen Space", tags: "ambient, focus, deep, study, sleep, meditation", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", duration: "4:47" },
  { name: "Inspiring Piano Sonata", artist: "Amadeus Keys", tags: "piano, classic, inspiring, elegant, sad, instruments", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", duration: "5:18" },
  { name: "Dreamy Rain Guitar", artist: "Cozy Strings", tags: "guitar, rain, cozy, calm, acoustic, nature", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3", duration: "6:54" },
  { name: "Morning Coffee Folk", artist: "Willow & Oak", tags: "folk, morning, coffee, acoustic, happy, nature", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3", duration: "5:23" },
  { name: "Cyberpunk Night Drive", artist: "Grid Runner", tags: "synthwave, cyber, electronic, gaming, driving, fast", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3", duration: "6:31" },
  { name: "Golden Hour Acoustic", artist: "Sunny Frets", tags: "acoustic, warm, summer, guitar, light", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3", duration: "4:59" },
  { name: "Smooth Chill Sax", artist: "Jazz Lounge", tags: "jazz, sax, romantic, slow, instrumental", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3", duration: "5:15" },
  { name: "Upbeat Uplifting Pop", artist: "Beat Makers", tags: "pop, happy, energetic, dance, summer, vocal", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3", duration: "6:08" },
  { name: "Solfeggio Healing Ambient", artist: "Chakra Balance", tags: "healing, ambient, sleep, meditation, sound bath, wellness", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3", duration: "5:53" },
  { name: "Warm Cozy Fireplace", artist: "Nature Sounds", tags: "ambient, cozy, fireplace, wood, relaxing, crackle", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3", duration: "6:40" }
];

const VIDEO_SEARCH_CATALOG = [
  {
    id: "vid_lofi",
    title: "Lofi Retro Cyberpunk Highway Loop",
    channelTitle: "Synthwave Beats",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-retro-futuristic-grid-and-mountains-background-34289-large.mp4",
    thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=80",
    tags: "lofi, chill, synthwave, retro, mountain, highway, grid, neon, cyberpunk"
  },
  {
    id: "vid_fireplace",
    title: "Cozy Log Cabin Fireplace Loop",
    channelTitle: "Warm Ambiences",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-fire-burning-in-a-cozy-fireplace-39947-large.mp4",
    thumbnail: "https://images.unsplash.com/photo-1545224456-9e8a7199c0d3?w=300&q=80",
    tags: "fireplace, cozy, warm, fire, wood, bonfire, winter, cabin"
  },
  {
    id: "vid_rain",
    title: "Peaceful Rain Drops on Window",
    channelTitle: "Nature Sounds",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-rain-falling-on-a-window-1118-large.mp4",
    thumbnail: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=300&q=80",
    tags: "rain, rainy, storm, window, drops, weather, chill, sleep, thunderstorm"
  },
  {
    id: "vid_ocean",
    title: "Beautiful Ocean Waves Crashing",
    channelTitle: "Paradise Relaxation",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-sea-waves-crashing-on-rocks-43093-large.mp4",
    thumbnail: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&q=80",
    tags: "ocean, beach, sea, waves, nature, water, vacation, summer, island"
  },
  {
    id: "vid_sunset",
    title: "Majestic Sunset with Golden Clouds",
    channelTitle: "Cinematic Horizon",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-beautiful-sunset-with-clouds-clouds-over-the-ocean-43282-large.mp4",
    thumbnail: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300&q=80",
    tags: "sunset, clouds, golden, sky, ocean, landscape, cinematic"
  },
  {
    id: "vid_snow",
    title: "Deep Snowy Forest Drone Shot",
    channelTitle: "Drone Journeys",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-drone-view-of-a-forest-with-snow-42797-large.mp4",
    thumbnail: "https://images.unsplash.com/photo-1482862549707-f63cb32c5fd9?w=300&q=80",
    tags: "mountain, forest, snow, winter, drone, travel, flight, trees"
  },
  {
    id: "vid_typing",
    title: "Slow-paced Cozy Coffee Shop Studying",
    channelTitle: "Cafe Vibe Lo-Fi",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-woman-typing-on-a-laptop-40348-large.mp4",
    thumbnail: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=300&q=80",
    tags: "coffee, cafe, shop, laptop, typing, work, study, typing, writer"
  },
  {
    id: "vid_river",
    title: "Crystal Clear Forest River Stream",
    channelTitle: "Deep Nature",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-river-in-a-forest-with-clear-water-43391-large.mp4",
    thumbnail: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=300&q=80",
    tags: "river, stream, forest, woods, water, nature, trees, green"
  }
];

const REACTIONS = [
  { key: "like", emoji: "👍", label: "Like" },
  { key: "love", emoji: "❤️", label: "Love" },
  { key: "haha", emoji: "😂", label: "Haha" },
  { key: "wow", emoji: "😮", label: "Wow" },
  { key: "sad", emoji: "😢", label: "Sad" },
  { key: "angry", emoji: "😡", label: "Angry" }
];

const getReactionColorClass = (reaction: string) => {
  switch (reaction) {
    case "like": return "text-[#1877F2]";
    case "love": return "text-red-500";
    case "haha": return "text-amber-500";
    case "wow": return "text-amber-500";
    case "sad": return "text-amber-500";
    case "angry": return "text-orange-600";
    default: return "text-gray-600";
  }
};

const getReactionEmoji = (reaction: string) => {
  switch (reaction) {
    case "like": return "👍";
    case "love": return "❤️";
    case "haha": return "😂";
    case "wow": return "😮";
    case "sad": return "😢";
    case "angry": return "😡";
    default: return "👍";
  }
};

export default function Feed({ onSearchUserById }: { onSearchUserById?: (uid: string) => void }) {
  const [user, setUser] = useState<UserProfile | null>(auth.currentUser);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  
  // Post Creator States
  const [newPostText, setNewPostText] = useState("");
  const [postFile, setPostFile] = useState<File | Blob | null>(null);
  const [postFileType, setPostFileType] = useState<"image" | "video" | null>(null);
  const [postFilePreview, setPostFilePreview] = useState<string | null>(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [postUploadProgress, setPostUploadProgress] = useState<number | null>(null);

  // Attached song/video state on Post Creator
  const [attachedSongTitle, setAttachedSongTitle] = useState<string | null>(null);
  const [attachedAudioUrl, setAttachedAudioUrl] = useState<string | null>(null);
  const [attachedVideoUrl, setAttachedVideoUrl] = useState<string | null>(null);
  const [attachedVideoTitle, setAttachedVideoTitle] = useState<string | null>(null);

  // Global Music Search Engine states
  const [musicSearchQuery, setMusicSearchQuery] = useState("");
  const [playingSearchTrackUrl, setPlayingSearchTrackUrl] = useState<string | null>(null);
  const [musicSearchProgress, setMusicSearchProgress] = useState(0);
  const [musicSearchDuration, setMusicSearchDuration] = useState(0);
  const musicSearchAudioRef = useRef<HTMLAudioElement | null>(null);

  // Ambient Direct Video Search states
  const [videoSearchQuery, setVideoSearchQuery] = useState("");
  const [videoSearchResults, setVideoSearchResults] = useState<any[]>([]);
  const [isSearchingVideo, setIsSearchingVideo] = useState(false);
  const [searchTab, setSearchTab] = useState<"local" | "video">("local");
  const [playingVideoPreviewUrl, setPlayingVideoPreviewUrl] = useState<string | null>(null);

  // Post Audio Player states
  const [playingPostAudioId, setPlayingPostAudioId] = useState<string | null>(null);
  const [playingPostAudioUrl, setPlayingPostAudioUrl] = useState<string | null>(null);
  const [postAudioProgress, setPostAudioProgress] = useState(0);
  const [postAudioDuration, setPostAudioDuration] = useState(0);
  const postAudioEngineRef = useRef<HTMLAudioElement | null>(null);

  // Story Creator States
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [storyFile, setStoryFile] = useState<File | Blob | null>(null);
  const [storyFileType, setStoryFileType] = useState<"image" | "video" | null>(null);
  const [storyFilePreview, setStoryFilePreview] = useState<string | null>(null);
  const [storyAudio, setStoryAudio] = useState<File | null>(null);
  const [selectedMusicPreset, setSelectedMusicPreset] = useState(MUSIC_PRESETS[0]);
  const [customAudioName, setCustomAudioName] = useState("");
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [storyUploadProgress, setStoryUploadProgress] = useState<number | null>(null);

  // Story Viewer States
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [storyProgress, setStoryProgress] = useState(0);
  
  // Audio Ref for story viewer
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const storyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Inline comment inputs mapped by postId
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});

  // People you may know / Friend Suggestions
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);

  // Blocks support
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [whoBlockedMe, setWhoBlockedMe] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<{ [uid: string]: UserProfile }>({});

  // Reaction & sharing states
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null);
  const [sharingPostId, setSharingPostId] = useState<string | null>(null);

  // Sync All Users for real-time name & photo resolution in posts/comments
  useEffect(() => {
    const usersRef = ref(db, "users");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAllUsers(data);
      } else {
        setAllUsers({});
      }
    });
    return () => unsubscribe();
  }, []);

  // Native Ambient Video Search execution
  const handleVideoSearchQuery = (queryStr: string) => {
    if (!queryStr.trim()) {
      setVideoSearchResults(VIDEO_SEARCH_CATALOG);
      return;
    }
    setIsSearchingVideo(true);
    setTimeout(() => {
      const query = queryStr.toLowerCase();
      const filtered = VIDEO_SEARCH_CATALOG.filter(video => 
        video.title.toLowerCase().includes(query) || 
        video.channelTitle.toLowerCase().includes(query) ||
        video.tags.toLowerCase().includes(query)
      );
      setVideoSearchResults(filtered);
      setIsSearchingVideo(false);
    }, 300);
  };

  // Populate initial results for video searches
  useEffect(() => {
    setVideoSearchResults(VIDEO_SEARCH_CATALOG);
  }, []);

  // Pause other players if direct video preview starts
  useEffect(() => {
    if (playingVideoPreviewUrl) {
      if (musicSearchAudioRef.current) {
        musicSearchAudioRef.current.pause();
        setPlayingSearchTrackUrl(null);
      }
      if (postAudioEngineRef.current) {
        postAudioEngineRef.current.pause();
        setPlayingPostAudioId(null);
        setPlayingPostAudioUrl(null);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [playingVideoPreviewUrl]);

  // Music Search Engine Audio Player effects
  useEffect(() => {
    if (playingSearchTrackUrl) {
      // Pause any post audio player
      if (postAudioEngineRef.current) {
        postAudioEngineRef.current.pause();
        setPlayingPostAudioId(null);
        setPlayingPostAudioUrl(null);
      }
      // Pause story viewer audio if any
      if (audioRef.current) {
        audioRef.current.pause();
      }

      if (!musicSearchAudioRef.current) {
        musicSearchAudioRef.current = new Audio(playingSearchTrackUrl);
      } else {
        musicSearchAudioRef.current.src = playingSearchTrackUrl;
      }

      const audio = musicSearchAudioRef.current;
      audio.currentTime = 0;
      setMusicSearchProgress(0);

      const handleTimeUpdate = () => {
        setMusicSearchProgress(audio.currentTime);
      };
      const handleLoadedMetadata = () => {
        setMusicSearchDuration(audio.duration || 0);
      };
      const handleEnded = () => {
        setPlayingSearchTrackUrl(null);
        setMusicSearchProgress(0);
      };

      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audio.addEventListener("ended", handleEnded);

      audio.play().catch((err) => console.log("Music search track play deferred:", err));

      return () => {
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("ended", handleEnded);
        audio.pause();
      };
    } else {
      if (musicSearchAudioRef.current) {
        musicSearchAudioRef.current.pause();
      }
    }
  }, [playingSearchTrackUrl]);

  // Post Audio Player effects
  useEffect(() => {
    if (playingPostAudioId && playingPostAudioUrl) {
      // Pause search engine music if playing
      if (musicSearchAudioRef.current) {
        musicSearchAudioRef.current.pause();
        setPlayingSearchTrackUrl(null);
      }
      // Pause story viewer audio if any
      if (audioRef.current) {
        audioRef.current.pause();
      }

      if (!postAudioEngineRef.current) {
        postAudioEngineRef.current = new Audio(playingPostAudioUrl);
      } else {
        if (postAudioEngineRef.current.src !== playingPostAudioUrl) {
          postAudioEngineRef.current.src = playingPostAudioUrl;
        }
      }

      const audio = postAudioEngineRef.current;
      
      const handleTimeUpdate = () => {
        setPostAudioProgress(audio.currentTime);
      };
      const handleLoadedMetadata = () => {
        setPostAudioDuration(audio.duration || 0);
      };
      const handleEnded = () => {
        setPlayingPostAudioId(null);
        setPlayingPostAudioUrl(null);
        setPostAudioProgress(0);
      };

      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audio.addEventListener("ended", handleEnded);

      audio.play().catch((err) => console.log("Post audio play deferred:", err));

      return () => {
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("ended", handleEnded);
      };
    } else {
      if (postAudioEngineRef.current) {
        postAudioEngineRef.current.pause();
      }
    }
  }, [playingPostAudioId, playingPostAudioUrl]);

  useEffect(() => {
    if (!user) return;
    const blocksRef = ref(db, `blocks/${user.uid}`);
    const unsubMyBlocks = onValue(blocksRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setBlockedUsers(Object.keys(data));
      } else {
        setBlockedUsers([]);
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
        setWhoBlockedMe(list);
      } else {
        setWhoBlockedMe([]);
      }
    });

    return () => {
      unsubMyBlocks();
      unsubAllBlocks();
    };
  }, [user?.uid]);

  // Sync auth state
  useEffect(() => {
    let unsubscribeDb: (() => void) | null = null;
    const unsub = onAuthStateChanged(auth, async (currUser) => {
      if (unsubscribeDb) {
        unsubscribeDb();
        unsubscribeDb = null;
      }
      if (currUser) {
        try {
          const mapRef = ref(db, `uid_map/${currUser.uid}`);
          const mapSnap = await get(mapRef);
          const numericUid = mapSnap.val() || currUser.uid;

          // Load custom user profile from Realtime Database
          const userRef = ref(db, `users/${numericUid}`);
          unsubscribeDb = onValue(userRef, (snap) => {
            if (snap.val()) {
              setUser(snap.val() as UserProfile);
            }
          });
        } catch (err) {
          console.error("Feed auth state error:", err);
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

  // Sync Posts in Real Time
  useEffect(() => {
    const postsRef = ref(db, "posts");
    const unsubscribe = onValue(postsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const postsList = Object.entries(data).map(([key, val]: [string, any]) => ({
          id: key,
          ...val,
          likes: val.likes || [],
          comments: val.comments || []
        })).sort((a, b) => b.timestamp - a.timestamp);
        setPosts(postsList);
      } else {
        // Seed if completely empty
        const initialMap: { [key: string]: any } = {};
        INITIAL_POSTS.forEach((p) => {
          initialMap[p.id] = p;
        });
        set(postsRef, initialMap);
        setPosts(INITIAL_POSTS);
      }
    });
    return () => unsubscribe();
  }, []);

  // Manage revoke of post file preview ObjectURL to optimize 4GB RAM devices and avoid memory leaks
  const prevPostFilePreviewRef = useRef<string | null>(null);
  useEffect(() => {
    const prevUrl = prevPostFilePreviewRef.current;
    if (prevUrl && prevUrl !== postFilePreview && prevUrl.startsWith("blob:")) {
      URL.revokeObjectURL(prevUrl);
    }
    prevPostFilePreviewRef.current = postFilePreview;
  }, [postFilePreview]);

  useEffect(() => {
    return () => {
      if (prevPostFilePreviewRef.current && prevPostFilePreviewRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(prevPostFilePreviewRef.current);
      }
    };
  }, []);

  // Manage revoke of story file preview ObjectURL to optimize 4GB RAM devices and avoid memory leaks
  const prevStoryFilePreviewRef = useRef<string | null>(null);
  useEffect(() => {
    const prevUrl = prevStoryFilePreviewRef.current;
    if (prevUrl && prevUrl !== storyFilePreview && prevUrl.startsWith("blob:")) {
      URL.revokeObjectURL(prevUrl);
    }
    prevStoryFilePreviewRef.current = storyFilePreview;
  }, [storyFilePreview]);

  useEffect(() => {
    return () => {
      if (prevStoryFilePreviewRef.current && prevStoryFilePreviewRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(prevStoryFilePreviewRef.current);
      }
    };
  }, []);

  // Sync Stories in Real Time
  useEffect(() => {
    const storiesRef = ref(db, "stories");
    const unsubscribe = onValue(storiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const storiesList = Object.entries(data).map(([key, val]: [string, any]) => ({
          id: key,
          ...val,
        })).sort((a, b) => b.timestamp - a.timestamp);
        setStories(storiesList);
      } else {
        // Seed if completely empty
        const initialMap: { [key: string]: any } = {};
        INITIAL_STORIES.forEach((s) => {
          initialMap[s.id] = s;
        });
        set(storiesRef, initialMap);
        setStories(INITIAL_STORIES);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync Friend Suggestions (People You May Know) in Real Time
  useEffect(() => {
    if (!user) return;

    const usersRef = ref(db, "users");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const allUsers = snapshot.val();
      if (!allUsers) {
        setSuggestions([]);
        return;
      }

      // Check current friendships
      const friendshipsRef = ref(db, `friendships/${user.uid}`);
      get(friendshipsRef).then((friendshipsSnap) => {
        const friendsList = friendshipsSnap.val() ? Object.keys(friendshipsSnap.val()) : [];

        // Check sent requests
        const outgoingRef = ref(db, `friend_requests_sent/${user.uid}`);
        get(outgoingRef).then((outgoingSnap) => {
          const outgoingList = outgoingSnap.val() ? Object.keys(outgoingSnap.val()) : [];

          // Check received requests
          const incomingRef = ref(db, `friend_requests/${user.uid}`);
          get(incomingRef).then((incomingSnap) => {
            const incomingList = incomingSnap.val() ? Object.keys(incomingSnap.val()) : [];

            const filtered = Object.values(allUsers).filter((u: any) => {
              return (
                u.uid !== user.uid &&
                !friendsList.includes(u.uid) &&
                !outgoingList.includes(u.uid) &&
                !incomingList.includes(u.uid) &&
                !blockedUsers.includes(u.uid) &&
                !whoBlockedMe.includes(u.uid) &&
                !u.uid.startsWith("system_") // skip mock system users
              );
            }) as UserProfile[];

            setSuggestions(filtered);
          });
        });
      });
    });

    return () => unsubscribe();
  }, [user, blockedUsers, whoBlockedMe]);

  const handleSendFriendRequest = async (target: UserProfile) => {
    if (!user) return;
    try {
      // 1. Set friend_requests node for target user
      await set(ref(db, `friend_requests/${target.uid}/${user.uid}`), {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        timestamp: Date.now()
      });
      // 2. Set friend_requests_sent node for us
      await set(ref(db, `friend_requests_sent/${user.uid}/${target.uid}`), {
        uid: target.uid,
        displayName: target.displayName,
        photoURL: target.photoURL,
        timestamp: Date.now()
      });

      // 3. Save a real-time notification for the receiver
      const notifId = "notif_" + Math.random().toString(36).substring(2, 11);
      await set(ref(db, `notifications/${target.uid}/${notifId}`), {
        id: notifId,
        type: "friend_request",
        text: `${user.displayName} sent you a Friend Request! Go to the top bar dropdown to accept.`,
        timestamp: Date.now(),
        seen: false
      });

      alert(`✓ Friend request sent to ${target.displayName}!`);
    } catch (err: any) {
      alert("Error sending request: " + err.message);
    }
  };

  // Story Viewer Playback controls & Timeline
  useEffect(() => {
    if (activeStory) {
      setStoryProgress(0);
      setIsPlaying(true);
      
      // Auto-advance story after 15 seconds if playing
      const interval = setInterval(() => {
        if (isPlaying) {
          setStoryProgress((prev) => {
            if (prev >= 100) {
              clearInterval(interval);
              handleCloseStory();
              return 100;
            }
            return prev + (100 / 150); // Updates every 100ms, total 15s (150 steps)
          });
        }
      }, 100);

      return () => {
        clearInterval(interval);
      };
    }
  }, [activeStory, isPlaying]);

  // Sync Audio Play/Pause based on state
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch((err) => console.log("Audio play deferred:", err));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, activeStory]);

  // Sync Audio Mute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted, activeStory]);

  const handlePostFileSelected = (file: File) => {
    try {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isImage && !isVideo) {
        alert("Please upload an image or video file.");
        return;
      }
      setPostFile(file);
      setPostFileType(isVideo ? "video" : "image");
      setPostFilePreview(URL.createObjectURL(file));
    } catch (err) {
      console.error("Error setting post file:", err);
    }
  };

  const handleStoryFileSelected = (file: File) => {
    try {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isImage && !isVideo) {
        alert("Please upload an image or video file.");
        return;
      }
      setStoryFile(file);
      setStoryFileType(isVideo ? "video" : "image");
      setStoryFilePreview(URL.createObjectURL(file));
    } catch (err) {
      console.error("Error setting story file:", err);
    }
  };

  const triggerPostFileUpload = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await ActionSheet.showActions({
          title: "Select Post Attachment",
          message: "Choose media type",
          options: [
            { title: "Take Photo (Camera)" },
            { title: "Choose from Gallery" },
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
            setPostFile(blob);
            setPostFileType("image");
            setPostFilePreview(photo.webPath);
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
            setPostFile(blob);
            setPostFileType("image");
            setPostFilePreview(photo.webPath);
          }
        } else if (result.index === 2) {
          const inputEl = document.getElementById("file-input-post-photo") as HTMLInputElement;
          inputEl?.click();
        }
        return;
      } catch (err) {
        console.warn("Capacitor action sheet failed, falling back to standard file picker:", err);
      }
    }
    const inputEl = document.getElementById("file-input-post-photo") as HTMLInputElement;
    inputEl?.click();
  };

  const triggerStoryFileUpload = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await ActionSheet.showActions({
          title: "Select Story Media",
          message: "Choose media type",
          options: [
            { title: "Take Photo (Camera)" },
            { title: "Choose from Gallery" },
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
            setStoryFile(blob);
            setStoryFileType("image");
            setStoryFilePreview(photo.webPath);
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
            setStoryFile(blob);
            setStoryFileType("image");
            setStoryFilePreview(photo.webPath);
          }
        } else if (result.index === 2) {
          const inputEl = document.getElementById("file-input-story-photo") as HTMLInputElement;
          inputEl?.click();
        }
        return;
      } catch (err) {
        console.warn("Capacitor action sheet failed, falling back to standard file picker:", err);
      }
    }
    const inputEl = document.getElementById("file-input-story-photo") as HTMLInputElement;
    inputEl?.click();
  };

  const handlePostImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handlePostFileSelected(e.target.files[0]);
    }
  };

  const handleStoryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleStoryFileSelected(e.target.files[0]);
    }
  };

  const handleStoryAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setStoryAudio(file);
      setCustomAudioName(file.name);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim() && !postFile) return;
    if (!user) return;

    setIsCreatingPost(true);
    setPostUploadProgress(0);

    // Simulated progress to guarantee progress bar updates smoothly
    let simulatedProgress = 0;
    const progressInterval = setInterval(() => {
      simulatedProgress += Math.max(1, Math.floor((95 - simulatedProgress) / 8));
      setPostUploadProgress((prev) => Math.max(prev || 0, simulatedProgress));
    }, 150);

    let imageUrl = null;
    let videoUrl = null;

    try {
      if (postFile) {
        let fileToUpload = postFile;
        if (postFileType === "image" && postFile instanceof File) {
          try {
            // Compress image to small blob to make upload super fast and reliable
            fileToUpload = await compressImageToBlob(postFile);
          } catch (compressErr) {
            console.warn("Failed to compress image before upload, using raw file:", compressErr);
          }
        }

        try {
          const fileRef = sRef(storage, `posts/${Date.now()}_${(postFile as File).name || "upload"}`);
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
                setPostUploadProgress((prev) => Math.max(prev || 0, progress));
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
          if (postFileType === "video") {
            videoUrl = downloadURL;
          } else {
            imageUrl = downloadURL;
          }
        } catch (storageErr) {
          console.warn("Storage post media upload failed, trying base64 image fallback:", storageErr);
          if (postFileType === "image" && postFile && postFile.size <= 10 * 1024 * 1024) {
            imageUrl = await compressImageToBase64(postFile as File);
          } else {
            throw new Error("Cloud upload failed or timed out. Media is too large for local base64 fallback. Please verify connection.");
          }
        }
      }

      const newPostRef = push(ref(db, "posts"));
      const newPost = {
        id: newPostRef.key,
        userId: user.uid,
        authorName: user.displayName,
        authorAvatar: user.photoURL,
        text: newPostText,
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || attachedVideoUrl || null,
        audioUrl: attachedAudioUrl || null,
        songTitle: attachedSongTitle || null,
        likes: [],
        comments: [],
        timestamp: Date.now(),
      };

      await set(newPostRef, newPost);
      
      // Reset post creator
      setNewPostText("");
      setPostFile(null);
      setPostFileType(null);
      setPostFilePreview(null);
      setAttachedSongTitle(null);
      setAttachedAudioUrl(null);
      setAttachedVideoUrl(null);
      setAttachedVideoTitle(null);
    } catch (err: any) {
      console.error("Error creating post:", err);
      alert("Error posting content: " + err.message);
    } finally {
      clearInterval(progressInterval);
      setPostUploadProgress(100);
      setTimeout(() => {
        setIsCreatingPost(false);
        setPostUploadProgress(null);
      }, 400);
    }
  };

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyFilePreview || !user) return;

    setIsCreatingStory(true);
    setStoryUploadProgress(0);
    let finalImageUrl = null;
    let finalVideoUrl = null;
    let finalAudioUrl = selectedMusicPreset.url;
    let finalSongTitle = selectedMusicPreset.name;

    try {
      // 1. Upload story file
      if (storyFile) {
        let fileToUpload = storyFile;
        if (storyFileType === "image" && storyFile instanceof File) {
          try {
            fileToUpload = await compressImageToBlob(storyFile);
          } catch (compressErr) {
            console.warn("Failed to compress story image, using raw file:", compressErr);
          }
        }

        try {
          const fileRef = sRef(storage, `stories/${Date.now()}_${(storyFile as File).name || "upload"}`);
          const uploadTask = uploadBytesResumable(fileRef, fileToUpload);
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
              try {
                uploadTask.cancel();
              } catch (e) {}
              reject(new Error("Story media upload timed out (10s limit)"));
            }, 10000); // 10s timeout

            uploadTask.on(
              "state_changed",
              (snapshot) => {
                const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                setStoryUploadProgress(progress);
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
          if (storyFileType === "video") {
            finalVideoUrl = downloadURL;
          } else {
            finalImageUrl = downloadURL;
          }
        } catch (storageErr) {
          console.warn("Storage story media upload failed, trying base64 image fallback:", storageErr);
          if (storyFileType === "image" && storyFile && storyFile.size <= 10 * 1024 * 1024) {
            finalImageUrl = await compressImageToBase64(storyFile as File);
          } else {
            throw new Error("Cloud upload failed or timed out. Story media is too large for local base64 fallback. Please verify connection.");
          }
        }
      } else {
        finalImageUrl = storyFilePreview;
      }

      // 2. Upload custom song if uploaded
      if (storyAudio) {
        try {
          const fileRef = sRef(storage, `audio/${Date.now()}_${storyAudio.name}`);
          const uploadTask = uploadBytesResumable(fileRef, storyAudio);
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
              try {
                uploadTask.cancel();
              } catch (e) {}
              reject(new Error("Story audio upload timed out (10s limit)"));
            }, 10000); // 10s timeout

            uploadTask.on(
              "state_changed",
              (snapshot) => {
                const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                setStoryUploadProgress(progress);
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
          finalAudioUrl = await getDownloadURL(fileRef);
        } catch (storageErr) {
          console.warn("Storage story audio upload failed, falling back to base64 encoding:", storageErr);
          if (storyAudio.size <= 10 * 1024 * 1024) {
            finalAudioUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(storyAudio);
            });
          } else {
            throw new Error("Cloud upload failed or timed out. Story audio is too large for local base64 fallback. Please verify connection.");
          }
        }
        finalSongTitle = customAudioName || storyAudio.name;
      }

      const newStoryRef = push(ref(db, "stories"));
      const newStory = {
        id: newStoryRef.key,
        userId: user.uid,
        authorName: user.displayName,
        authorAvatar: user.photoURL,
        imageUrl: finalImageUrl || null,
        videoUrl: finalVideoUrl || null,
        audioUrl: finalAudioUrl || null,
        songTitle: finalSongTitle || null,
        timestamp: Date.now(),
      };

      await set(newStoryRef, newStory);

      // Reset story creator
      setStoryFile(null);
      setStoryFileType(null);
      setStoryFilePreview(null);
      setStoryAudio(null);
      setCustomAudioName("");
      setIsStoryModalOpen(false);
    } catch (err: any) {
      console.error("Error creating story:", err);
      alert("Error sharing story: " + err.message);
    } finally {
      setIsCreatingStory(false);
      setStoryUploadProgress(null);
    }
  };

  const handleLikePost = async (post: Post) => {
    if (!user) return;
    const likes = post.likes || [];
    const isLiked = likes.includes(user.uid);
    const updatedLikes = isLiked
      ? likes.filter((uid) => uid !== user.uid)
      : [...likes, user.uid];

    await update(ref(db, `posts/${post.id}`), { likes: updatedLikes });

    // Send real-time notification to post owner if someone else liked their post
    if (!isLiked && post.userId !== user.uid) {
      const notifId = "notif_" + Math.random().toString(36).substring(2, 11);
      const excerpt = post.text ? (post.text.length > 30 ? post.text.substring(0, 30) + "..." : post.text) : "your photo";
      await set(ref(db, `notifications/${post.userId}/${notifId}`), {
        id: notifId,
        type: "post_like",
        text: `${user.displayName} liked your post: "${excerpt}"`,
        timestamp: Date.now(),
        seen: false
      });
    }
  };

  const handleReactPost = async (post: Post, reactionType: string) => {
    if (!user) return;
    const likes = post.likes || [];
    const reactions = post.reactions || {};
    
    const existingReaction = reactions[user.uid];
    let updatedLikes = [...likes];
    let updatedReactions = { ...reactions };
    
    if (existingReaction === reactionType) {
      // Toggle off completely
      updatedLikes = updatedLikes.filter((uid) => uid !== user.uid);
      delete updatedReactions[user.uid];
    } else {
      // Set new reaction type
      if (!updatedLikes.includes(user.uid)) {
        updatedLikes.push(user.uid);
      }
      updatedReactions[user.uid] = reactionType;
    }

    await update(ref(db, `posts/${post.id}`), { 
      likes: updatedLikes,
      reactions: updatedReactions
    });

    // Send real-time notification to post owner if someone else reacted and it's a new interaction
    if (existingReaction !== reactionType && reactionType && post.userId !== user.uid) {
      const notifId = "notif_" + Math.random().toString(36).substring(2, 11);
      const excerpt = post.text ? (post.text.length > 30 ? post.text.substring(0, 30) + "..." : post.text) : "your photo";
      
      const reactionNames: Record<string, string> = {
        like: "liked",
        love: "loved",
        haha: "haha-reacted to",
        wow: "wow-reacted to",
        sad: "sad-reacted to",
        angry: "angry-reacted to"
      };
      const actionName = reactionNames[reactionType] || "reacted to";

      await set(ref(db, `notifications/${post.userId}/${notifId}`), {
        id: notifId,
        type: "post_like",
        text: `${user.displayName} ${actionName} your post: "${excerpt}"`,
        timestamp: Date.now(),
        seen: false
      });
    }
  };

  const handleRepost = async (originalPost: Post) => {
    if (!user) return;
    try {
      const postId = "post_" + Math.random().toString(36).substr(2, 9);
      const newPost = {
        id: postId,
        userId: user.uid,
        authorName: user.displayName || "Anonymous User",
        authorAvatar: user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
        text: `♻️ Shared ${originalPost.authorName}'s post:\n\n${originalPost.text || ""}`,
        imageUrl: originalPost.imageUrl || null,
        videoUrl: originalPost.videoUrl || null,
        audioUrl: originalPost.audioUrl || null,
        songTitle: originalPost.songTitle || null,
        youtubeId: originalPost.youtubeId || null,
        youtubeTitle: originalPost.youtubeTitle || null,
        likes: [],
        comments: [],
        timestamp: Date.now(),
      };

      await set(ref(db, `posts/${postId}`), newPost);
      alert("✓ Post successfully shared to your timeline!");
    } catch (err: any) {
      console.error("Error sharing post:", err);
      alert("Error sharing post: " + err.message);
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId];
    if (!text || !text.trim() || !user) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const newComment = {
      id: "comment_" + Math.random().toString(36).substr(2, 9),
      authorId: user.uid,
      authorName: user.displayName,
      authorAvatar: user.photoURL,
      text: text.trim(),
      timestamp: Date.now(),
    };

    const comments = post.comments || [];
    const updatedComments = [...comments, newComment];
    await update(ref(db, `posts/${postId}`), { comments: updatedComments });

    // Send real-time notification to post owner if someone else commented on their post
    if (post.userId !== user.uid) {
      const notifId = "notif_" + Math.random().toString(36).substring(2, 11);
      const excerpt = text.length > 30 ? text.substring(0, 30) + "..." : text;
      await set(ref(db, `notifications/${post.userId}/${notifId}`), {
        id: notifId,
        type: "post_comment",
        text: `${user.displayName} commented on your post: "${excerpt}"`,
        timestamp: Date.now(),
        seen: false
      });
    }

    // Clear comment input
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
  };

  const handleOpenStory = (story: Story) => {
    setActiveStory(story);
  };

  const handleCloseStory = () => {
    setActiveStory(null);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return "Just now";
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div id="feed-root-view" className="space-y-5 max-w-[500px] mx-auto pb-10">
      
      {/* 1. Stories row container */}
      <div id="stories-section-container" className="bg-white rounded-lg p-3.5 shadow-sm border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 select-none flex items-center gap-1.5">
          <span>Stories</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#1877F2]"></span>
        </h3>
        <div id="stories-flex-row" className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          {/* Create story trigger box */}
          <div
            id="create-story-box"
            onClick={() => setIsStoryModalOpen(true)}
            className="flex-shrink-0 w-28 h-40 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative cursor-pointer hover:shadow transition-all group"
          >
            <img
              src={user?.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"}
              alt="You"
              className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-[#1877F2] p-1.5 rounded-full border-4 border-white shadow-md">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <div className="absolute bottom-0 inset-x-0 h-11 bg-white flex items-end justify-center pb-1.5">
              <span className="text-[10px] font-semibold text-gray-800">Create Story</span>
            </div>
          </div>

          {/* Active Stories List */}
          {stories.map((story) => (
            <div
              key={story.id}
              onClick={() => handleOpenStory(story)}
              className="flex-shrink-0 w-28 h-40 rounded-lg overflow-hidden relative cursor-pointer hover:brightness-95 transition border border-gray-200"
            >
              {/* Story Content image or video */}
              {story.videoUrl ? (
                <video
                  src={story.videoUrl}
                  muted
                  playsInline
                  autoPlay
                  loop
                  className="w-full h-full object-cover pointer-events-none"
                />
              ) : (
                <img
                  src={story.imageUrl || ""}
                  alt={story.authorName}
                  className="w-full h-full object-cover"
                />
              )}
              
              {/* Creator DP overlay */}
              <div className="absolute top-2 left-2 ring-2 ring-[#1877F2] rounded-full overflow-hidden w-8 h-8">
                <img
                  src={story.authorAvatar}
                  alt={story.authorName}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Soundtrack label */}
              {story.songTitle && (
                <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-xs p-1 rounded-full flex items-center justify-center">
                  <Music className="w-3 h-3 text-white animate-bounce" />
                </div>
              )}

              {/* Creator Name text */}
              <div className="absolute bottom-1.5 left-2 right-2">
                <p className="text-[10px] font-bold text-white drop-shadow-md truncate">
                  {story.authorName}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🎵 Ambient Music Search Engine & Streamer Widget */}
      <div id="music-engine-widget" className="bg-white rounded-lg p-3.5 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-2.5 border-b border-gray-100 pb-2">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 select-none">
            <Sparkles className="w-4 h-4 text-[#1877F2] animate-pulse" />
            <span>Sound & Video Engine</span>
            <span className="text-[10px] bg-[#1877F2]/10 text-[#1877F2] px-1.5 py-0.5 rounded font-mono font-semibold">LIVE</span>
          </h3>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Google Sync</span>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-gray-100 mb-3 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setSearchTab("local")}
            className={`flex-1 pb-2 transition-all border-b-2 text-center cursor-pointer ${
              searchTab === "local"
                ? "border-[#1877F2] text-[#1877F2]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            🎵 Focus Sounds
          </button>
          <button
            type="button"
            onClick={() => setSearchTab("video")}
            className={`flex-1 pb-2 transition-all border-b-2 text-center cursor-pointer flex items-center justify-center gap-1 ${
              searchTab === "video"
                ? "border-[#1877F2] text-[#1877F2]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <VideoIcon className="w-3.5 h-3.5 fill-[#1877F2]/20 text-[#1877F2]" />
            <span>Cozy Clips</span>
          </button>
        </div>

        {searchTab === "local" ? (
          <>
            {/* Search bar inside widget */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search songs, genres, or moods (e.g. lofi, acoustic, guitar, piano)..."
                value={musicSearchQuery}
                onChange={(e) => setMusicSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-800 placeholder-gray-400 focus:outline-hidden focus:ring-1 focus:ring-[#1877F2] focus:border-[#1877F2] transition"
              />
              {musicSearchQuery && (
                <button
                  type="button"
                  onClick={() => setMusicSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Search results loop */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {MUSIC_SEARCH_CATALOG.filter((track) => {
                if (!musicSearchQuery) return true; // show all when empty
                const query = musicSearchQuery.toLowerCase();
                return (
                  track.name.toLowerCase().includes(query) ||
                  track.artist.toLowerCase().includes(query) ||
                  track.tags.toLowerCase().includes(query)
                );
              }).map((track) => {
                const isPlayingThis = playingSearchTrackUrl === track.url;
                return (
                  <div
                    key={track.name}
                    className={`flex items-center justify-between p-2 rounded-lg border transition ${
                      isPlayingThis 
                        ? "border-[#1877F2] bg-[#1877F2]/5 shadow-xs" 
                        : "border-gray-100 hover:bg-gray-50 bg-gray-50/50"
                    }`}
                  >
                    {/* Left: Play button & Track Info */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => setPlayingSearchTrackUrl(isPlayingThis ? null : track.url)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                          isPlayingThis
                            ? "bg-[#1877F2] text-white animate-pulse"
                            : "bg-white border border-gray-200 hover:border-gray-300 text-gray-700 shadow-2xs"
                        }`}
                      >
                        {isPlayingThis ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{track.name}</p>
                        <p className="text-[10px] text-gray-500 font-medium truncate">
                          {track.artist} • <span className="italic text-gray-400">{track.duration}</span>
                        </p>
                      </div>
                    </div>

                    {/* Right: Quick actions */}
                    <div className="flex items-center gap-1 ml-2">
                      {/* Share to feed as post */}
                      <button
                        type="button"
                        onClick={() => {
                          setAttachedSongTitle(track.name);
                          setAttachedAudioUrl(track.url);
                          setNewPostText((prev) => 
                            prev.trim() 
                              ? `${prev}\n\nListening to 🎵 ${track.name}`
                              : `Listening to 🎵 ${track.name}`
                          );
                          // Scroll to composer
                          const composer = document.getElementById("post-composer-box");
                          if (composer) {
                            composer.scrollIntoView({ behavior: "smooth" });
                          }
                        }}
                        title="Share to timeline as audio post"
                        className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-[#1877F2] transition cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Set as story preset */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMusicPreset({ name: track.name, url: track.url });
                          alert(`✓ "${track.name}" has been locked as your active story background track! Open 'Create Story' to post it.`);
                        }}
                        title="Set as active background track for next Story"
                        className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-green-600 transition cursor-pointer"
                      >
                        <Music className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom playing bar if playing */}
            {playingSearchTrackUrl && (
              <div className="mt-3 bg-gray-50 rounded-lg p-2 border border-gray-100 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px] text-gray-500 font-semibold px-0.5">
                  <span className="truncate max-w-[200px]">
                    🎵 Now Playing: <span className="text-gray-800">{MUSIC_SEARCH_CATALOG.find(t => t.url === playingSearchTrackUrl)?.name}</span>
                  </span>
                  <span>
                    {Math.floor(musicSearchProgress / 60)}:{(musicSearchProgress % 60 < 10 ? '0' : '')}{Math.floor(musicSearchProgress % 60)} / {MUSIC_SEARCH_CATALOG.find(t => t.url === playingSearchTrackUrl)?.duration}
                  </span>
                </div>
                {/* Simple audio wave effect */}
                <div className="flex items-center gap-0.5 h-3 justify-center">
                  <div className="w-0.5 bg-[#1877F2] rounded-full animate-bounce" style={{ height: '60%' }}></div>
                  <div className="w-0.5 bg-[#1877F2] rounded-full animate-bounce" style={{ height: '90%', animationDelay: '0.15s' }}></div>
                  <div className="w-0.5 bg-[#1877F2] rounded-full animate-bounce" style={{ height: '40%', animationDelay: '0.3s' }}></div>
                  <div className="w-0.5 bg-[#1877F2] rounded-full animate-bounce" style={{ height: '75%', animationDelay: '0.45s' }}></div>
                  <div className="w-0.5 bg-[#1877F2] rounded-full animate-bounce" style={{ height: '50%', animationDelay: '0.6s' }}></div>
                </div>
                {/* Audio slider */}
                <input
                  type="range"
                  min="0"
                  max={musicSearchDuration || 100}
                  value={musicSearchProgress}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setMusicSearchProgress(val);
                    if (musicSearchAudioRef.current) {
                      musicSearchAudioRef.current.currentTime = val;
                    }
                  }}
                  className="w-full h-1 accent-[#1877F2] bg-gray-200 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </>
        ) : (
          <>
            {/* Direct Video Search Panel */}
            <div className="flex gap-1.5 mb-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search cozy clips (lofi, fireplace, rain, ocean...)"
                  value={videoSearchQuery}
                  onChange={(e) => setVideoSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleVideoSearchQuery(videoSearchQuery);
                    }
                  }}
                  className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-800 placeholder-gray-400 focus:outline-hidden focus:ring-1 focus:ring-[#1877F2] focus:border-[#1877F2] transition"
                />
                {videoSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setVideoSearchQuery("");
                      setVideoSearchResults(VIDEO_SEARCH_CATALOG);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleVideoSearchQuery(videoSearchQuery)}
                className="px-3.5 py-1.5 bg-[#1877F2] text-white font-bold text-xs rounded-full hover:bg-[#1565C0] transition cursor-pointer flex-shrink-0"
              >
                Search
              </button>
            </div>

            {/* Loader */}
            {isSearchingVideo && (
              <div className="flex flex-col items-center justify-center py-6 text-gray-400 text-xs gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#1877F2]" />
                <span className="font-semibold text-[10px] animate-pulse">Filtering cozy loops...</span>
              </div>
            )}

            {/* Results */}
            {!isSearchingVideo && videoSearchResults.length === 0 && (
              <div className="text-center py-6 text-gray-400 text-[11px] select-none">
                <VideoIcon className="w-8 h-8 text-gray-300 mx-auto mb-1.5 fill-gray-50" />
                <p>No matching cozy clips found</p>
              </div>
            )}

            {!isSearchingVideo && videoSearchResults.length > 0 && (
              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {videoSearchResults.map((track) => {
                  const isPlayingThis = playingVideoPreviewUrl === track.videoUrl;
                  return (
                    <div
                      key={track.id}
                      className={`p-2 rounded-lg border transition flex flex-col gap-2 ${
                        isPlayingThis
                          ? "border-[#1877F2] bg-[#1877F2]/5 shadow-xs"
                          : "border-gray-100 hover:bg-gray-50 bg-gray-50/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        {/* Thumbnail & Title info */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <img
                            src={track.thumbnail}
                            alt={track.title}
                            className="w-12 h-9 rounded object-cover border border-gray-200 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p 
                              className="text-xs font-bold text-gray-900 line-clamp-1 leading-snug cursor-pointer hover:text-[#1877F2] transition"
                              title={track.title}
                              onClick={() => setPlayingVideoPreviewUrl(isPlayingThis ? null : track.videoUrl)}
                            >
                              {track.title}
                            </p>
                            <p className="text-[10px] text-gray-500 font-semibold truncate leading-tight">
                              {track.channelTitle}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 ml-1.5">
                          {/* Play inline video button */}
                          <button
                            type="button"
                            onClick={() => setPlayingVideoPreviewUrl(isPlayingThis ? null : track.videoUrl)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer flex-shrink-0 ${
                              isPlayingThis
                                ? "bg-[#1877F2] text-white"
                                : "bg-white border border-gray-200 hover:border-gray-300 text-gray-700 shadow-2xs"
                            }`}
                            title={isPlayingThis ? "Close Player" : "Watch & Hear Video"}
                          >
                            {isPlayingThis ? (
                              <X className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3 h-3 fill-current ml-0.5 text-[#1877F2]" />
                            )}
                          </button>

                          {/* Share to composer */}
                          <button
                            type="button"
                            onClick={() => {
                              setAttachedVideoUrl(track.videoUrl);
                              setAttachedVideoTitle(track.title);
                              setNewPostText((prev) =>
                                prev.trim()
                                  ? `${prev}\n\nWatching 🎬 ${track.title}`
                                  : `Watching 🎬 ${track.title}`
                              );
                              const composer = document.getElementById("post-composer-box");
                              if (composer) {
                                composer.scrollIntoView({ behavior: "smooth" });
                              }
                            }}
                            title="Share to timeline as video post"
                            className="p-1.5 rounded bg-white border border-gray-200 hover:border-[#1877F2] text-gray-600 hover:text-[#1877F2] transition cursor-pointer flex-shrink-0 shadow-2xs"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Embed playing player inline! */}
                      {isPlayingThis && (
                        <div className="w-full aspect-video bg-black rounded overflow-hidden shadow-md mt-1 border border-[#1877F2]">
                          <video
                            src={track.videoUrl}
                            controls
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Friend Suggestions / People You May Know slider */}
      {suggestions.length > 0 && (
        <div id="people-you-may-know-container" className="bg-white rounded-lg p-3.5 shadow-sm border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 select-none flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>People You May Know</span>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            </span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Suggestions</span>
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {suggestions.map((suggestion) => (
              <div 
                key={suggestion.uid}
                className="flex-shrink-0 w-36 bg-gray-50 rounded-lg p-3 border border-gray-100 flex flex-col items-center text-center justify-between shadow-2xs hover:border-gray-200 transition-colors"
              >
                <div 
                  onClick={() => onSearchUserById?.(suggestion.uid)}
                  className="cursor-pointer group flex flex-col items-center"
                >
                  <img 
                    src={suggestion.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"}
                    alt={suggestion.displayName}
                    className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-xs group-hover:scale-105 transition duration-250"
                  />
                  <h4 className="text-xs font-bold text-gray-900 mt-2 line-clamp-1 group-hover:text-[#1877F2] transition duration-250">
                    {suggestion.displayName}
                  </h4>
                  <p className="text-[9px] text-gray-400 font-mono mt-0.5">UID: {suggestion.uid}</p>
                </div>
                <button
                  onClick={() => handleSendFriendRequest(suggestion)}
                  className="mt-3 w-full py-1.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold text-[10px] rounded-md transition shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Friend</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Post Composer box */}
      <div id="post-composer-box" className="bg-white rounded-lg p-3.5 shadow-sm border border-gray-200">
        <form id="post-composer-form" onSubmit={handleCreatePost} className="space-y-3.5">
          <div className="flex gap-2.5 items-center">
            <img
              src={user?.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"}
              alt="You"
              className="w-10 h-10 rounded-full object-cover"
            />
            <input
              id="composer-text-input"
              type="text"
              placeholder={`What's on your mind, ${user?.firstName || "friend"}?`}
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              className="flex-1 py-2.5 px-3.5 bg-gray-100 hover:bg-gray-200 focus:bg-gray-100 rounded-full text-sm text-gray-900 border-none outline-none transition-colors"
            />
          </div>

          {/* Attached Music Preview */}
          {attachedSongTitle && (
            <div className="flex items-center justify-between p-2 bg-[#1877F2]/5 border border-[#1877F2]/20 rounded-lg text-xs">
              <div className="flex items-center gap-2 text-[#1877F2] font-semibold">
                <Music className="w-4 h-4 animate-bounce" />
                <span>Attached Track: {attachedSongTitle}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAttachedSongTitle(null);
                  setAttachedAudioUrl(null);
                }}
                className="text-gray-400 hover:text-red-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Attached Direct Video Preview */}
          {attachedVideoUrl && attachedVideoTitle && (
            <div className="flex items-center justify-between p-2.5 bg-[#1877F2]/5 border border-[#1877F2]/20 rounded-lg text-xs">
              <div className="flex items-center gap-2 text-[#1877F2] font-semibold min-w-0 flex-1">
                <VideoIcon className="w-4 h-4 text-[#1877F2] flex-shrink-0 animate-pulse" />
                <span className="truncate">Attached Cozy Clip: {attachedVideoTitle}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAttachedVideoUrl(null);
                  setAttachedVideoTitle(null);
                }}
                className="text-gray-400 hover:text-red-500 transition cursor-pointer ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Post File Preview (Image or Video) */}
          {postFilePreview && (
            <div id="post-image-preview-wrapper" className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 max-h-60 flex justify-center items-center">
              {postFileType === "video" ? (
                <video
                  src={postFilePreview}
                  controls
                  className="max-h-60 object-contain w-full"
                />
              ) : (
                <img
                  src={postFilePreview}
                  alt="Post Preview"
                  className="max-h-60 object-contain"
                />
              )}
              <button
                id="btn-remove-post-image"
                type="button"
                onClick={() => {
                  setPostFile(null);
                  setPostFileType(null);
                  setPostFilePreview(null);
                }}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-all cursor-pointer z-10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Upload Progress Bar */}
          {postUploadProgress !== null && (
            <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 overflow-hidden">
              <div 
                className="bg-[#1877F2] h-1.5 rounded-full transition-all duration-300" 
                style={{ width: `${postUploadProgress}%` }}
              ></div>
              <p className="text-[10px] text-gray-500 font-bold mt-1">Uploading: {postUploadProgress}%</p>
            </div>
          )}

          <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
            {/* Upload image trigger */}
            <button
              id="btn-post-upload-media-trigger"
              type="button"
              onClick={triggerPostFileUpload}
              className="flex items-center gap-1.5 text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded-md cursor-pointer transition text-xs font-semibold select-none border-none outline-none"
            >
              <ImageIcon className="w-4 h-4 text-[#45BD62]" />
              <span>Photo / Video</span>
            </button>
            <input
              id="file-input-post-photo"
              type="file"
              accept="image/*,video/*"
              onChange={handlePostImageChange}
              className="hidden"
            />

            {/* Feelings trigger */}
            <button
              id="btn-feeling-activity"
              type="button"
              className="flex items-center gap-1.5 text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded-md cursor-pointer transition text-xs font-semibold"
            >
              <Smile className="w-4 h-4 text-[#F7B928]" />
              <span>Feeling/activity</span>
            </button>

            {/* Submit post button */}
            <button
              id="btn-submit-post"
              type="submit"
              disabled={isCreatingPost || (!newPostText.trim() && !postFile)}
              className="px-4 py-1.5 bg-[#1877F2] text-white font-semibold text-xs rounded-md hover:bg-[#1565C0] transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
            >
              {isCreatingPost ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{postUploadProgress !== null ? `${postUploadProgress}%` : "Publishing..."}</span>
                </>
              ) : (
                <span>Post</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Feeds Display */}
      <div id="posts-feed-container" className="space-y-4">
        {posts
          .filter((post) => !blockedUsers.includes(post.userId) && !whoBlockedMe.includes(post.userId))
          .map((post) => {
            const isLikedByMe = user ? post.likes.includes(user.uid) : false;
            const myReaction = (user && post.reactions) ? (post.reactions as Record<string, string>)[user.uid] : (isLikedByMe ? "like" : null);

            // Calculate reaction summary details
            const reactions = (post.reactions || {}) as Record<string, string>;
            const counts: Record<string, number> = {};
            Object.values(reactions).forEach((type) => {
              counts[type] = (counts[type] || 0) + 1;
            });
            const likesList = post.likes || [];
            likesList.forEach((uid) => {
              if (!reactions[uid]) {
                counts["like"] = (counts["like"] || 0) + 1;
              }
            });
            const sortedReactionTypes = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
            const topReactionTypes = sortedReactionTypes.slice(0, 3);
            const totalReactionCount = likesList.length;

            const resolvedPostAuthorName = allUsers[post.userId]?.displayName || post.authorName || `User ${post.userId}`;
            const resolvedPostAuthorAvatar = allUsers[post.userId]?.photoURL || post.authorAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";

          return (
            <div
              key={post.id}
              id={`post-card-${post.id}`}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Post Author info */}
              <div className="p-3.5 flex items-center justify-between">
                <div 
                  onClick={() => onSearchUserById?.(post.userId)}
                  className="flex gap-2.5 items-center cursor-pointer group"
                >
                  <img
                    src={resolvedPostAuthorAvatar}
                    alt={resolvedPostAuthorName}
                    className="w-10 h-10 rounded-full object-cover group-hover:scale-105 transition duration-200"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 leading-tight group-hover:text-[#1877F2] transition duration-200">
                      {resolvedPostAuthorName}
                    </h4>
                    <p className="text-xs text-gray-500 font-medium">
                      {formatTimeAgo(post.timestamp)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Post Text content */}
              <div className="px-3.5 pb-2">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-normal">
                  {post.text}
                </p>
              </div>

              {/* Post Shared Audio Player */}
              {post.audioUrl && post.songTitle && (
                <div className="mx-3.5 mb-3.5 p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col gap-2 shadow-2xs">
                  <div className="flex items-center justify-between text-[11px] text-gray-500 font-semibold">
                    <span className="flex items-center gap-1.5 text-gray-700 font-bold truncate max-w-[250px]">
                      <Music className="w-4 h-4 text-[#1877F2]" />
                      <span>{post.songTitle}</span>
                    </span>
                    {playingPostAudioId === post.id && (
                      <span className="text-[10px] text-gray-400 font-medium">
                        {Math.floor(postAudioProgress / 60)}:{(postAudioProgress % 60 < 10 ? '0' : '')}{Math.floor(postAudioProgress % 60)} / {Math.floor(postAudioDuration / 60)}:{(postAudioDuration % 60 < 10 ? '0' : '')}{Math.floor(postAudioDuration % 60)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Play/Pause Button */}
                    <button
                      onClick={() => {
                        if (playingPostAudioId === post.id) {
                          setPlayingPostAudioId(null);
                          setPlayingPostAudioUrl(null);
                        } else {
                          setPlayingPostAudioId(post.id);
                          setPlayingPostAudioUrl(post.audioUrl!);
                        }
                      }}
                      className="w-8 h-8 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:bg-[#1565C0] shadow-xs cursor-pointer transition flex-shrink-0"
                    >
                      {playingPostAudioId === post.id ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      )}
                    </button>

                    {/* Progress Slider */}
                    <div className="flex-1 min-w-0">
                      {playingPostAudioId === post.id ? (
                        <input
                          type="range"
                          min="0"
                          max={postAudioDuration || 100}
                          value={postAudioProgress}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setPostAudioProgress(val);
                            if (postAudioEngineRef.current) {
                              postAudioEngineRef.current.currentTime = val;
                            }
                          }}
                          className="w-full h-1 accent-[#1877F2] bg-gray-200 rounded-lg cursor-pointer"
                        />
                      ) : (
                        <div className="w-full h-1 bg-gray-200 rounded-lg relative overflow-hidden">
                          <div className="absolute inset-y-0 left-0 bg-[#1877F2]/30 w-0"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Post YouTube Video Embed */}
              {post.youtubeId && (
                <div id={`post-youtube-${post.id}`} className="bg-black aspect-video w-full border-y border-gray-100 overflow-hidden relative">
                  <iframe
                    src={`https://www.youtube.com/embed/${post.youtubeId}?autoplay=0&rel=0`}
                    title={post.youtubeTitle || "YouTube Video Player"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    className="w-full h-full border-0 absolute inset-0"
                  />
                </div>
              )}

              {/* Post Image/Video element */}
              {(post.imageUrl || post.videoUrl) && (
                <div id={`post-media-box-${post.id}`} className="bg-gray-50 max-h-[450px] overflow-hidden flex justify-center items-center border-y border-gray-100">
                  {post.videoUrl ? (
                    <video
                      src={post.videoUrl}
                      controls
                      playsInline
                      className="w-full max-h-[450px] object-contain bg-black"
                    />
                  ) : (
                    <img
                      src={post.imageUrl || ""}
                      alt="Post media content"
                      className="w-full max-h-[450px] object-cover"
                    />
                  )}
                </div>
              )}

              {/* Engagement Stats row */}
              <div className="px-3.5 py-2.5 flex items-center justify-between text-xs text-gray-500 border-b border-gray-100 select-none">
                <div className="flex items-center gap-1.5">
                  {topReactionTypes.length > 0 ? (
                    <div className="flex items-center -space-x-1">
                      {topReactionTypes.map((type) => (
                        <span 
                          key={type} 
                          className="text-sm bg-white rounded-full w-5 h-5 flex items-center justify-center border border-gray-100 shadow-2xs"
                          title={type}
                        >
                          {getReactionEmoji(type)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-[#1877F2] p-1 rounded-full">
                      <ThumbsUp className="w-2.5 h-2.5 text-white fill-white" />
                    </div>
                  )}
                  <span className="font-semibold">
                    {totalReactionCount} {totalReactionCount === 1 ? 'reaction' : 'reactions'}
                  </span>
                </div>
                <div className="hover:underline cursor-pointer">
                  {post.comments.length} {post.comments.length === 1 ? 'comment' : 'comments'}
                </div>
              </div>

              {/* Action Buttons row */}
              <div className="px-1.5 py-1 grid grid-cols-3 gap-1 text-gray-600 border-b border-gray-100 text-xs font-semibold select-none">
                <div 
                  className="relative"
                  onMouseEnter={() => setHoveredPostId(post.id)}
                  onMouseLeave={() => setHoveredPostId(null)}
                >
                  {/* Reaction Popover */}
                  {hoveredPostId === post.id && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-white shadow-xl border border-gray-100 rounded-full py-1.5 px-3 flex items-center gap-2.5 z-40 animate-in fade-in slide-in-from-bottom-2 duration-150">
                      {REACTIONS.map((r) => (
                        <button
                          key={r.key}
                          type="button"
                          onClick={() => {
                            handleReactPost(post, r.key);
                            setHoveredPostId(null);
                          }}
                          className="text-lg hover:scale-135 transition duration-100 cursor-pointer active:scale-95"
                          title={r.label}
                        >
                          {r.emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    id={`btn-like-${post.id}`}
                    type="button"
                    onClick={() => handleReactPost(post, myReaction || "like")}
                    className={`w-full flex items-center justify-center gap-1.5 py-2 hover:bg-gray-100 rounded-md cursor-pointer transition ${
                      myReaction ? getReactionColorClass(myReaction) + " font-bold" : ""
                    }`}
                  >
                    {myReaction ? (
                      <span className="text-sm leading-none">{getReactionEmoji(myReaction)}</span>
                    ) : (
                      <ThumbsUp className="w-4 h-4" />
                    )}
                    <span className="capitalize">{myReaction || "Like"}</span>
                  </button>
                </div>

                <button
                  id={`btn-comment-focus-${post.id}`}
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(`comment-input-${post.id}`);
                    el?.focus();
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 hover:bg-gray-100 rounded-md cursor-pointer transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Comment</span>
                </button>

                <div className="relative">
                  <button
                    id={`btn-share-${post.id}`}
                    type="button"
                    onClick={() => setSharingPostId(sharingPostId === post.id ? null : post.id)}
                    className={`w-full flex items-center justify-center gap-1.5 py-2 hover:bg-gray-100 rounded-md cursor-pointer transition ${
                      sharingPostId === post.id ? "text-[#1877F2]" : ""
                    }`}
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>

                  {sharingPostId === post.id && (
                    <div className="absolute right-0 bottom-full mb-1.5 bg-white shadow-xl border border-gray-200 rounded-lg py-1.5 min-w-44 z-40 text-left animate-in fade-in slide-in-from-bottom-2 duration-150">
                      <button
                        type="button"
                        onClick={async () => {
                          await handleRepost(post);
                          setSharingPostId(null);
                        }}
                        className="w-full px-4 py-2 hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center gap-2 cursor-pointer transition"
                      >
                        <Share2 className="w-3.5 h-3.5 text-[#1877F2]" />
                        <span>Share Now (Repost)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const postUrl = `${window.location.origin}${window.location.pathname}?post=${post.id}`;
                          navigator.clipboard.writeText(postUrl);
                          alert("✓ Post link copied to clipboard!");
                          setSharingPostId(null);
                        }}
                        className="w-full px-4 py-2 hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center gap-2 cursor-pointer transition border-t border-gray-100"
                      >
                        <LinkIcon className="w-3.5 h-3.5 text-green-600" />
                        <span>Copy Link</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Comments list & input panel */}
              <div className="bg-gray-50/50 p-3 space-y-3">
                {/* Active Comments */}
                {post.comments.length > 0 && (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {post.comments.map((comm: any) => {
                      const resolvedCommName = allUsers[comm.authorId]?.displayName || comm.authorName || `User ${comm.authorId || ""}`;
                      const resolvedCommAvatar = allUsers[comm.authorId]?.photoURL || comm.authorAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";

                      return (
                        <div key={comm.id} className="flex gap-2 items-start text-xs">
                          <img
                            src={resolvedCommAvatar}
                            alt={resolvedCommName}
                            onClick={() => comm.authorId && onSearchUserById?.(comm.authorId)}
                            className="w-8 h-8 rounded-full object-cover mt-0.5 cursor-pointer hover:ring-2 hover:ring-[#1877F2]/30 transition"
                          />
                          <div className="flex-1 bg-gray-100 rounded-2xl px-3 py-2 border border-gray-200">
                            <span 
                              onClick={() => comm.authorId && onSearchUserById?.(comm.authorId)}
                              className="font-bold text-gray-900 block mb-0.5 cursor-pointer hover:text-[#1877F2] transition"
                            >
                              {resolvedCommName}
                            </span>
                            <p className="text-gray-800 leading-normal">{comm.text}</p>
                            <span className="text-[9px] text-gray-400 font-medium block mt-1">
                              {formatTimeAgo(comm.timestamp)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Comment input field */}
                <div className="flex gap-2 items-center">
                  <img
                    src={user?.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"}
                    alt="You"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex-1 flex bg-white border border-gray-200 rounded-full px-3 py-1 items-center">
                    <input
                      id={`comment-input-${post.id}`}
                      type="text"
                      placeholder="Write a comment..."
                      value={commentInputs[post.id] || ""}
                      onChange={(e) =>
                        setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddComment(post.id);
                      }}
                      className="flex-1 text-xs text-gray-800 bg-transparent border-none outline-none py-1"
                    />
                    <button
                      id={`btn-send-comment-${post.id}`}
                      onClick={() => handleAddComment(post.id)}
                      className="text-[#1877F2] p-1 hover:bg-gray-50 rounded-full transition cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ==================== CREATE STORY DIALOG MODAL ==================== */}
      {isStoryModalOpen && (
        <div id="create-story-modal" className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg max-w-[420px] w-full border border-gray-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Create Music Story</h3>
              <button
                id="btn-close-story-composer"
                onClick={() => setIsStoryModalOpen(false)}
                className="text-gray-500 hover:bg-gray-100 p-1.5 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStory} className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Photo/Video Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">Story background picture or video</label>
                {storyFilePreview ? (
                  <div className="relative rounded-lg overflow-hidden border border-gray-200 max-h-40 flex justify-center items-center bg-gray-50">
                    {storyFileType === "video" ? (
                      <video
                        src={storyFilePreview}
                        controls
                        className="max-h-40 object-contain w-full"
                      />
                    ) : (
                      <img
                        src={storyFilePreview}
                        alt="Story Preview"
                        className="max-h-40 object-contain"
                      />
                    )}
                    <button
                      id="btn-remove-story-preview"
                      type="button"
                      onClick={() => {
                        setStoryFile(null);
                        setStoryFileType(null);
                        setStoryFilePreview(null);
                      }}
                      className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white cursor-pointer z-10"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div 
                      onClick={triggerStoryFileUpload}
                      className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition"
                    >
                      <ImageIcon className="w-7 h-7 text-gray-400 mb-1" />
                      <span className="text-xs text-gray-500 font-semibold">Select an image or video</span>
                    </div>
                    <input
                      id="file-input-story-photo"
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleStoryImageChange}
                      className="hidden"
                    />
                  </>
                )}
              </div>

              {/* Story Upload Progress Bar */}
              {storyUploadProgress !== null && (
                <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 overflow-hidden">
                  <div 
                    className="bg-[#1877F2] h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${storyUploadProgress}%` }}
                  ></div>
                  <p className="text-[10px] text-gray-500 font-bold mt-1">Uploading story: {storyUploadProgress}%</p>
                </div>
              )}

              {/* Music / Soundtrack Selection */}
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <label className="block text-xs font-bold text-gray-700">Story Background Music</label>
                
                {/* File Uploader for Custom Audio */}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 py-1.5 px-3 bg-gray-100 hover:bg-gray-200 rounded-md text-xs font-semibold text-gray-700 cursor-pointer transition select-none">
                    <Music className="w-3.5 h-3.5 text-[#1877F2]" />
                    <span>Upload Custom Audio (MP3)</span>
                    <input
                      id="story-audio-uploader"
                      type="file"
                      accept="audio/*"
                      onChange={handleStoryAudioChange}
                      className="hidden"
                    />
                  </label>
                  {customAudioName && (
                    <span className="text-[10px] text-gray-500 truncate max-w-[150px]">
                      ✔️ {customAudioName}
                    </span>
                  )}
                </div>

                {/* Preset List */}
                {!customAudioName && (
                  <div className="space-y-1.5">
                    <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Or select an atmospheric preset:</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {MUSIC_PRESETS.map((track) => {
                        const isSelected = selectedMusicPreset.name === track.name;
                        return (
                          <button
                            key={track.name}
                            type="button"
                            onClick={() => setSelectedMusicPreset(track)}
                            className={`flex items-center justify-between p-2 rounded-md border text-left text-xs font-medium transition cursor-pointer ${
                              isSelected 
                                ? "border-[#1877F2] bg-[#1877F2]/5 text-[#1877F2]" 
                                : "border-gray-200 hover:bg-gray-50 text-gray-700"
                            }`}
                          >
                            <span className="truncate">{track.name}</span>
                            <Play className="w-3 h-3 flex-shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 flex gap-2">
                <button
                  id="btn-cancel-story"
                  type="button"
                  onClick={() => setIsStoryModalOpen(false)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-md transition"
                >
                  Cancel
                </button>
                <button
                  id="btn-post-story"
                  type="submit"
                  disabled={isCreatingStory || !storyFilePreview}
                  className="flex-1 py-2 bg-[#1877F2] text-white font-semibold text-sm rounded-md hover:bg-[#1565C0] transition disabled:opacity-50"
                >
                  {isCreatingStory ? "Uploading..." : "Share to Story"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== IMMERSIVE STORY VIEWER MODAL ==================== */}
      {activeStory && (
        <div id="story-playback-viewer" className="fixed inset-0 z-50 bg-black flex items-center justify-center p-0 select-none">
          {/* HTML5 Audio engine */}
          {activeStory.audioUrl && (
            <audio
              ref={audioRef}
              src={activeStory.audioUrl}
              autoPlay={isPlaying}
              loop
            />
          )}

          <div className="relative w-full max-w-[450px] h-screen bg-neutral-900 flex flex-col justify-between overflow-hidden shadow-2xl">
            {/* 1. Header with story progress bars & Author info */}
            <div className="absolute top-0 inset-x-0 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-3.5 space-y-3.5">
              {/* Timing progress line */}
              <div className="flex gap-1 h-1 w-full bg-white/20 rounded-full overflow-hidden">
                <div
                  className="bg-white h-full transition-all duration-100 ease-linear rounded-full"
                  style={{ width: `${storyProgress}%` }}
                ></div>
              </div>

              {/* Author & controls */}
              <div className="flex justify-between items-center text-white">
                <div className="flex gap-2.5 items-center">
                  <img
                    src={activeStory.authorAvatar}
                    alt={activeStory.authorName}
                    className="w-9 h-9 rounded-full object-cover border border-[#1877F2]"
                  />
                  <div>
                    <h4 className="text-xs font-bold leading-tight">
                      {activeStory.authorName}
                    </h4>
                    <p className="text-[10px] opacity-75">
                      {formatTimeAgo(activeStory.timestamp)}
                    </p>
                  </div>
                </div>

                {/* Top-Right Control Actions */}
                <div className="flex gap-2.5 items-center">
                  <button
                    id="btn-play-pause-story"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-1.5 hover:bg-white/20 rounded-full transition"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    id="btn-mute-toggle-story"
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1.5 hover:bg-white/20 rounded-full transition"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <button
                    id="btn-exit-story-viewer"
                    onClick={handleCloseStory}
                    className="p-1.5 hover:bg-white/20 rounded-full transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Main story image/video card */}
            <div className="w-full h-full flex justify-center items-center bg-black">
              {activeStory.videoUrl ? (
                <video
                  src={activeStory.videoUrl}
                  autoPlay={isPlaying}
                  controls={false}
                  playsInline
                  loop
                  className="w-full max-h-screen object-contain"
                />
              ) : (
                <img
                  src={activeStory.imageUrl || ""}
                  alt="Story artwork"
                  className="w-full max-h-screen object-contain"
                />
              )}
            </div>

            {/* 3. Bottom overlay displaying Soundtrack with rotating icon */}
            {activeStory.songTitle && (
              <div className="absolute bottom-6 inset-x-4 z-20 bg-black/60 backdrop-blur-md rounded-2xl p-3 flex items-center justify-between border border-white/10 text-white animate-pulse">
                <div className="flex gap-2.5 items-center truncate">
                  <div className="p-2.5 bg-[#1877F2] rounded-full flex items-center justify-center animate-spin" style={{ animationDuration: "6s" }}>
                    <Music className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="text-[9px] text-white/60 uppercase font-bold tracking-wider block">Soundtrack playing</span>
                    <span className="text-xs font-bold text-white truncate block">{activeStory.songTitle}</span>
                  </div>
                </div>
                
                {/* Visual equalizer lines */}
                <div className="flex gap-0.5 items-end h-6">
                  <div className="w-0.5 bg-white rounded-full animate-bounce h-4" style={{ animationDelay: "0.1s" }}></div>
                  <div className="w-0.5 bg-[#1877F2] rounded-full animate-bounce h-5" style={{ animationDelay: "0.3s" }}></div>
                  <div className="w-0.5 bg-white rounded-full animate-bounce h-3" style={{ animationDelay: "0.5s" }}></div>
                  <div className="w-0.5 bg-white rounded-full animate-bounce h-5" style={{ animationDelay: "0.2s" }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
