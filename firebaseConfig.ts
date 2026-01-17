
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configuration from your Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCtbysBShdr6tF9rp62e36wAPr8RYkJXcg",
  authDomain: "study-buddy-lahav.firebaseapp.com",
  projectId: "study-buddy-lahav",
  storageBucket: "study-buddy-lahav.firebasestorage.app",
  messagingSenderId: "494863301381",
  appId: "1:494863301381:web:1546a96891648ec485556c",
  measurementId: "G-8PKSRZKG9G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (Database)
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);
