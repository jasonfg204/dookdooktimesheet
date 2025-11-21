// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDaxBlDh_kCwYf9o_mgWg04GV-yqrfb80w",
  authDomain: "dookdooktimesheet.firebaseapp.com",
  projectId: "dookdooktimesheet",
  storageBucket: "dookdooktimesheet.firebasestorage.app",
  messagingSenderId: "145152639288",
  appId: "1:145152639288:web:3e2a9798dd9b1f2e6381cd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Initialize Firebase Functions
const functions = getFunctions(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider, functions };
