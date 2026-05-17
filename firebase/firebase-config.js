// firebase/firebase-config.js

// Import Firebase (versi CDN)

// Firebase App
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// Firebase Auth
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firestore
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Storage
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";


const firebaseConfig = {
  apiKey: "AIzaSyC-HzamjP9H8bZbTbsiYjdXutpx9Y6AbQM",
  authDomain: "lms-kebun-ilmu-2026.firebaseapp.com",
  projectId: "lms-kebun-ilmu-2026",
  storageBucket: "lms-kebun-ilmu-2026.firebasestorage.app",
  messagingSenderId: "921557086874",
  appId: "1:921557086874:web:91a67a58044ca02e3a2523",
  measurementId: "G-EZ12LWMZF8"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export supaya bisa dipakai file lain
export { auth, db, storage };