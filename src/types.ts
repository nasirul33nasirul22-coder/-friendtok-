export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  surname: string;
  displayName: string;
  photoURL: string;
  coverURL: string;
  bio: string;
  location: string;
  education: string;
  gender: string;
  birthday: string;
  joinedDate: string;
}

export interface Comment {
  id: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  timestamp: number;
}

export interface Post {
  id: string;
  userId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  imageUrl?: string;
  videoUrl?: string; // Support video post uploads
  audioUrl?: string; // Support sharing tracks
  songTitle?: string; // Shared track title
  youtubeId?: string; // Shared YouTube video ID
  youtubeTitle?: string; // Shared YouTube video Title
  likes: string[]; // List of user IDs who liked the post
  reactions?: Record<string, string>; // Map of user ID to reaction type (e.g. 'like', 'love', 'haha', 'wow', 'sad', 'angry')
  comments: Comment[];
  timestamp: number;
}

export interface Story {
  id: string;
  userId: string;
  authorName: string;
  authorAvatar: string;
  imageUrl?: string; // Optional if video is uploaded instead
  videoUrl?: string; // Support video story uploads
  audioUrl?: string; // Optional audio background track
  songTitle?: string;
  timestamp: number;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  imageUrl?: string;
  videoUrl?: string; // Support video attachment uploads
  voiceUrl?: string; // Audio URL for voice messages
  timestamp: number;
  seen: boolean;
}

export interface ChatThread {
  id: string;
  participants: string[]; // uid array
  messages: Message[];
  lastUpdated: number;
}

/**
 * Compresses an image file to a lightweight JPEG Base64 string.
 * This ensures successful storage in Realtime Database fallback,
 * even with large files up to 10MB+.
 */
export function compressImageToBase64(file: File | Blob, maxWidth = 800, maxHeight = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Compress to JPEG with 0.7 quality to keep file size tiny (~30-70KB)
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
        resolve(compressedBase64);
      };
      img.onerror = () => {
        reject(new Error("Failed to load image for compression"));
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an image File/Blob and returns a compressed Blob.
 * Extremely useful for making uploads 100x faster by shrinking file sizes before transmission.
 */
export async function compressImageToBlob(file: File | Blob, maxWidth = 800, maxHeight = 800): Promise<Blob> {
  const base64 = await compressImageToBase64(file, maxWidth, maxHeight);
  const response = await fetch(base64);
  return await response.blob();
}


