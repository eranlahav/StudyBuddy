
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configuration from your Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyASARoD0v0HCOnUaS5ksspxgoJby7vZigc",
  authDomain: "study-buddy-family.firebaseapp.com",
  projectId: "study-buddy-family",
  storageBucket: "study-buddy-family.firebasestorage.app",
  messagingSenderId: "791316912240",
  appId: "1:791316912240:web:5fa28f1f2ea8c2f57e3cb5",
  measurementId: "G-VSV1X7QE04"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (Database)
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);
