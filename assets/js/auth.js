// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBaNDQOu9Aq5pcWJsfgIIj1SSeAbHI-VRg",
  authDomain: "site-89-2d768.firebaseapp.com",
  projectId: "site-89-2d768",
  storageBucket: "site-89-2d768.firebasestorage.app",
  messagingSenderId: "851485754416",
  appId: "1:851485754416:web:aefbe8aa2a7d1f334799f5",
  measurementId: "G-EDX3DLNV52"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.addEventListener('includesLoaded', () => {
  const navLoginText = document.getElementById("navLoginText");
  const navLogin = document.getElementById("navLogin");

  if (!navLogin) return;

  // Check auth state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Logged in -> redirect to index when clicked
      navLoginText.textContent = user.email; // or later: character name
      navLogin.addEventListener("click", () => {
        window.location.href = "index.html";
      });
    } else {
      // Not logged in -> redirect to login when clicked
      navLoginText.textContent = "Login";
      navLogin.addEventListener("click", () => {
        window.location.href = "login.html";
      });
    }
  });
});
