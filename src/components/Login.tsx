import React, { useState } from "react";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";
import friendTokLogo from "../assets/images/friendtok_logo_1784568481312.jpg";

interface LoginProps {
  onNavigateToSignup: () => void;
  onLoginSuccess: () => void;
}

const DEMO_PROFILES: { [key: string]: any } = {
  "mark@fb.com": {
    email: "mark@fb.com",
    firstName: "Mark",
    surname: "Zuckerberg",
    displayName: "Mark Zuckerberg",
    photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    coverURL: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
    bio: "Working to give people the power to share and make the world more open and connected.",
    location: "Palo Alto, California",
    education: "Harvard University",
    gender: "Male",
    birthday: "1984-05-14",
    joinedDate: "Feb 2004",
  },
  "sheryl@fb.com": {
    email: "sheryl@fb.com",
    firstName: "Sheryl",
    surname: "Sandberg",
    displayName: "Sheryl Sandberg",
    photoURL: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
    coverURL: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80",
    bio: "Author of Lean In. Building communities and driving global operations.",
    location: "Atherton, California",
    education: "Harvard Business School",
    gender: "Female",
    birthday: "1969-08-28",
    joinedDate: "Mar 2008",
  }
};

const convertInputToEmail = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (!trimmed.includes("@")) {
    const cleanPhone = trimmed.replace(/[^0-9+]/g, "");
    if (cleanPhone.length >= 5) {
      return `${cleanPhone}@friendtok.com`;
    }
  }
  return trimmed;
};

export default function Login({ onNavigateToSignup, onLoginSuccess }: LoginProps) {
  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !password) {
      setError("Please enter both email/phone and password.");
      return;
    }

    setIsLoading(true);
    setError("");

    const formattedEmail = convertInputToEmail(emailInput);

    try {
      await signInWithEmailAndPassword(auth, formattedEmail, password);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to log in.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (quickEmail: string) => {
    setIsLoading(true);
    setError("");
    const demoPassword = "demo_password_123_abc";
    try {
      await signInWithEmailAndPassword(auth, quickEmail, demoPassword);
      onLoginSuccess();
    } catch (err: any) {
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.message?.includes("not-found") || err.message?.includes("credential")) {
        try {
          // If the demo user doesn't exist yet, register them on-the-fly!
          const userCredential = await createUserWithEmailAndPassword(auth, quickEmail, demoPassword);
          const uid = userCredential.user.uid;
          const profileTemplate = DEMO_PROFILES[quickEmail];
          if (profileTemplate) {
            const profile = {
              ...profileTemplate,
              uid,
            };
            await set(ref(db, `users/${uid}`), profile);
          }
          onLoginSuccess();
        } catch (signupErr: any) {
          setError(signupErr.message || "Failed to initialize demo account.");
        }
      } else {
        setError(err.message || "Failed to log in.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError("");
    const guestId = Math.floor(100000 + Math.random() * 900000);
    const guestEmail = `guest_${guestId}@friendtok.com`;
    const guestPassword = "guest_password_123_abc";
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, guestEmail, guestPassword);
      const uid = userCredential.user.uid;
      const profile = {
        uid,
        email: guestEmail,
        firstName: "Guest",
        surname: `#${guestId}`,
        displayName: `Guest #${guestId}`,
        photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=guest_${guestId}`,
        coverURL: "https://images.unsplash.com/photo-1707343843437-caacff5cfa74?auto=format&fit=crop&w=1000&q=80",
        bio: "Browsing FriendTok as a Guest! Feel free to customize my profile.",
        location: "Explore Mode",
        education: "Guest University",
        gender: "Guest",
        birthday: "2000-01-01",
        joinedDate: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      };
      await set(ref(db, `users/${uid}`), profile);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to enter as Guest.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="login-container" className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 py-8">
      {/* Brand Header */}
      <div id="login-header" className="text-center mb-8 max-w-md flex flex-col items-center">
        <img 
          src={friendTokLogo} 
          alt="FriendTok Logo" 
          className="w-24 h-24 rounded-2xl shadow-lg mb-4 hover:scale-105 transition-all duration-300 border border-[#1877F2]/10"
          referrerPolicy="no-referrer"
        />
        <h1 id="friendtok-logo-text" className="text-5xl font-extrabold text-[#1877F2] tracking-tight mb-2 select-none">
          FriendTok
        </h1>
        <p id="friendtok-tagline" className="text-gray-600 text-lg leading-snug">
          Connect with friends in real time, listen to music stories, and chat securely with UID sharing.
        </p>
      </div>

      {/* Login Card */}
      <div id="login-card" className="w-full max-w-[420px] bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div id="login-error-alert" className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
              {error}
            </div>
          )}

          <div id="email-field-container">
            <input
              id="login-email-input"
              type="text"
              placeholder="Email address or mobile number"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1877F2] text-sm text-gray-900 bg-white"
              disabled={isLoading}
            />
          </div>

          <div id="password-field-container">
            <input
              id="login-password-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1877F2] text-sm text-gray-900 bg-white"
              disabled={isLoading}
            />
          </div>

          <button
            id="login-submit-button"
            type="submit"
            className="w-full py-3 bg-[#1877F2] text-white font-bold text-lg rounded-lg hover:bg-[#1565C0] active:bg-[#0D47A1] transition-all cursor-pointer disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? "Logging In..." : "Log In"}
          </button>
        </form>

        <div id="login-divider" className="flex items-center my-4">
          <div className="flex-1 border-t border-gray-200"></div>
          <span className="px-3 text-xs text-gray-400 uppercase font-semibold">or</span>
          <div className="flex-1 border-t border-gray-200"></div>
        </div>

        {/* Guest Instant Mode Button */}
        <div id="guest-login-container" className="mb-4">
          <button
            id="btn-guest-login"
            onClick={handleGuestLogin}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-sm transition-all cursor-pointer border border-gray-300"
            disabled={isLoading}
          >
            ⚡ Enter Instantly as Guest
          </button>
        </div>

        {/* Create New Account Button */}
        <div id="create-account-container" className="text-center">
          <button
            id="btn-create-account"
            onClick={onNavigateToSignup}
            className="px-5 py-2.5 bg-[#42B72A] hover:bg-[#36A420] text-white font-bold rounded-lg text-sm transition-all cursor-pointer"
            disabled={isLoading}
          >
            Create New Account
          </button>
        </div>
      </div>

      {/* Quick Access Profiles for testing */}
      <div id="quick-access-panel" className="w-full max-w-[420px] bg-white rounded-xl shadow-sm border border-gray-200 mt-6 p-4 text-center">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Demo Admin Accounts (Instant Login)
        </h3>
        <div className="flex justify-center gap-2.5">
          <button
            id="btn-quick-mark"
            onClick={() => handleQuickLogin("mark@fb.com")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-700 font-medium transition cursor-pointer"
          >
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
              alt="Mark"
              className="w-4 h-4 rounded-full object-cover"
            />
            Mark Zuckerberg
          </button>
          <button
            id="btn-quick-sheryl"
            onClick={() => handleQuickLogin("sheryl@fb.com")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-700 font-medium transition cursor-pointer"
          >
            <img
              src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80"
              alt="Sheryl"
              className="w-4 h-4 rounded-full object-cover"
            />
            Sheryl Sandberg
          </button>
        </div>
      </div>
    </div>
  );
}
