import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCKvp59c5dMzE3ceDcusnCmFkUOx0f4-sA",
  authDomain: "messenger-clone-dc805.firebaseapp.com",
  projectId: "messenger-clone-dc805",
  storageBucket: "messenger-clone-dc805.firebasestorage.app",
  messagingSenderId: "24546973866",
  appId: "1:24546973866:web:69a63a05587ae271e3d8d3",
  measurementId: "G-8725Z74NYF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);
