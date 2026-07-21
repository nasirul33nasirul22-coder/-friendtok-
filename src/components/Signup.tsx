import React, { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ref, set, get } from "firebase/database";
import friendTokLogo from "../assets/images/friendtok_logo_1784568481312.jpg";

interface SignupProps {
  onNavigateToLogin: () => void;
  onSignupSuccess: () => void;
}

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

export default function Signup({ onNavigateToLogin, onSignupSuccess }: SignupProps) {
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [day, setDay] = useState("20");
  const [month, setMonth] = useState("Jul");
  const [year, setYear] = useState("1996");
  const [gender, setGender] = useState("Female");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Generate date selectors
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 110 }, (_, i) => String(currentYear - i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !surname || !emailOrPhone || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    setError("");

    const formattedEmail = convertInputToEmail(emailOrPhone);

    try {
      const birthdayStr = `${year}-${month}-${day}`;
      const userCredential = await createUserWithEmailAndPassword(auth, formattedEmail, password);
      
      // Generate a unique 6-digit numeric UID
      let numericUid = "";
      let attempts = 0;
      while (attempts < 15) {
        const potential = Math.floor(100000 + Math.random() * 900000).toString();
        const checkRef = ref(db, `uids/${potential}`);
        const snap = await get(checkRef);
        if (!snap.exists()) {
          numericUid = potential;
          break;
        }
        attempts++;
      }
      if (!numericUid) {
        numericUid = Math.floor(100000 + Math.random() * 900000).toString();
      }

      // Update Auth display name
      const displayName = `${firstName} ${surname}`;
      await updateProfile(userCredential.user, {
        displayName: displayName,
        photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
      });

      // Write profile to Realtime Database
      const userRef = ref(db, `users/${numericUid}`);
      const profile = {
        uid: numericUid,
        email: formattedEmail,
        firstName,
        surname,
        displayName,
        photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
        coverURL: "https://images.unsplash.com/photo-1707343843437-caacff5cfa74?auto=format&fit=crop&w=1000&q=80",
        bio: "Just joined FriendTok! 👋 Feel free to add me using my UID.",
        location: "Silicon Valley, CA",
        education: "Stanford University",
        gender,
        birthday: birthdayStr,
        joinedDate: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      };
      
      await set(userRef, profile);
      await set(ref(db, `uid_map/${userCredential.user.uid}`), numericUid);
      await set(ref(db, `uids/${numericUid}`), userCredential.user.uid);

      onSignupSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="signup-container" className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 py-8">
      {/* Brand Header */}
      <div id="signup-header" className="text-center mb-6 select-none flex flex-col items-center">
        <img 
          src={friendTokLogo} 
          alt="FriendTok Logo" 
          className="w-20 h-20 rounded-2xl shadow-lg mb-3 hover:scale-105 transition-all duration-300 border border-[#1877F2]/10"
          referrerPolicy="no-referrer"
        />
        <h1 id="signup-logo" className="text-5xl font-extrabold text-[#1877F2] tracking-tight mb-2">
          FriendTok
        </h1>
        <p id="signup-subtitle" className="text-gray-500 text-sm font-medium">
          Create an account to join the fast-growing social world.
        </p>
      </div>

      {/* Signup Form Card */}
      <div id="signup-card" className="w-full max-w-[430px] bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div id="card-header-bar" className="border-b border-gray-200 pb-3 mb-4">
          <h2 className="text-xl font-bold text-gray-900">Create a New Account</h2>
          <p className="text-xs text-gray-500">It's quick and easy.</p>
        </div>

        <form id="signup-form" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div id="signup-error-alert" className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
              {error}
            </div>
          )}

          {/* Name Row */}
          <div id="name-row-grid" className="grid grid-cols-2 gap-3">
            <div id="fn-container">
              <input
                id="signup-first-name"
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1877F2] text-sm text-gray-900 bg-white"
                disabled={isLoading}
              />
            </div>
            <div id="sn-container">
              <input
                id="signup-surname"
                type="text"
                placeholder="Surname"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1877F2] text-sm text-gray-900 bg-white"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Email / Password */}
          <div id="email-pass-container" className="space-y-3">
            <div>
              <input
                id="signup-email"
                type="text"
                placeholder="Mobile number or email address"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1877F2] text-sm text-gray-900 bg-white"
                disabled={isLoading}
              />
            </div>
            <div>
              <input
                id="signup-password"
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1877F2] text-sm text-gray-900 bg-white"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Birthday Selectors */}
          <div id="birthday-section">
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Date of birth <span className="text-gray-400">ℹ️</span>
            </label>
            <div id="birthday-selectors-grid" className="grid grid-cols-3 gap-2">
              <select
                id="select-day"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                disabled={isLoading}
              >
                {days.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                id="select-month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                disabled={isLoading}
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                id="select-year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                disabled={isLoading}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Gender Selector */}
          <div id="gender-section">
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Gender <span className="text-gray-400">ℹ️</span>
            </label>
            <div id="gender-radios-grid" className="grid grid-cols-3 gap-2">
              <label className="flex items-center justify-between p-2.5 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-800 bg-white">
                <span>Female</span>
                <input
                  type="radio"
                  name="gender"
                  value="Female"
                  checked={gender === "Female"}
                  onChange={() => setGender("Female")}
                  className="accent-[#1877F2]"
                  disabled={isLoading}
                />
              </label>
              <label className="flex items-center justify-between p-2.5 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-800 bg-white">
                <span>Male</span>
                <input
                  type="radio"
                  name="gender"
                  value="Male"
                  checked={gender === "Male"}
                  onChange={() => setGender("Male")}
                  className="accent-[#1877F2]"
                  disabled={isLoading}
                />
              </label>
              <label className="flex items-center justify-between p-2.5 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-800 bg-white">
                <span>Custom</span>
                <input
                  type="radio"
                  name="gender"
                  value="Custom"
                  checked={gender === "Custom"}
                  onChange={() => setGender("Custom")}
                  className="accent-[#1877F2]"
                  disabled={isLoading}
                />
              </label>
            </div>
          </div>

          <div id="terms-fine-print" className="text-[10px] text-gray-500 leading-tight">
            People who use our service may have uploaded your contact information to FriendTok. By clicking
            Sign Up, you agree to our Terms, Privacy Policy and Cookies Policy.
          </div>

          {/* Submit Button */}
          <div id="signup-btn-container" className="text-center pt-2">
            <button
              id="signup-submit-button"
              type="submit"
              className="px-12 py-2.5 bg-[#42B72A] hover:bg-[#36A420] active:bg-[#2F931A] text-white font-bold text-lg rounded-lg transition-all cursor-pointer disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? "Signing Up..." : "Sign Up"}
            </button>
          </div>
        </form>

        <div id="back-to-login-link" className="text-center mt-4">
          <button
            id="btn-back-to-login"
            onClick={onNavigateToLogin}
            className="text-sm text-[#1877F2] font-semibold hover:underline cursor-pointer"
          >
            Already have an account?
          </button>
        </div>
      </div>
    </div>
  );
}
