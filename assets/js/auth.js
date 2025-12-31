import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { 
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

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

document.addEventListener("includesLoaded", () => {
  const navLogin = document.getElementById("navLogin");
  const navLoginText = document.getElementById("navLoginText");

  function formatCharacterName(fullName) {
    const parts = fullName.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}. ${parts[parts.length - 1]}`;
    }
    return fullName;
  }

  // Auth state
  onAuthStateChanged(auth, (user) => {
    let displayName = "Login";

    if (user) {
      const selectedChar = localStorage.getItem("selectedCharacter");
      if (selectedChar) {
        try {
          const charObj = JSON.parse(selectedChar);
          displayName = formatCharacterName(charObj.name);
        } catch {
          displayName = user.email;
        }
      } else {
        displayName = user.email;
      }
    }

    navLoginText.textContent = displayName;
  });

  // Navbar button behavior
  if (navLogin) {
    navLogin.addEventListener("click", () => {
      if (auth.currentUser) {
        window.location.href = "/accounts/";
      } else {
        window.location.href = "/login/";
      }
    });
  }

  // Global logout handling: clear selectedCharacter and sign out
  const logoutButtons = Array.from(document.querySelectorAll('#logoutBtn'));
  logoutButtons.forEach(btn => btn.addEventListener('click', (e) => {
    e.preventDefault();
    try { localStorage.removeItem('selectedCharacter'); } catch (err) { /* ignore */ }
    signOut(auth).then(() => window.location.href = '/login/').catch(() => window.location.href = '/login/');
  }));

  // LOGIN FORM (if exists)
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      signInWithEmailAndPassword(auth, email, password)
        .then(() => window.location.href = "/")
        .catch(err => {
          const feedback = document.getElementById("loginFeedback");
          if (feedback) feedback.textContent = err.message;
        });
    });
  }

  // REGISTER FORM (if exists)
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("regEmail").value;
      const password = document.getElementById("regPassword").value;

      createUserWithEmailAndPassword(auth, email, password)
        .then(() => window.location.href = "/")
        .catch(err => {
          const feedback = document.getElementById("registerFeedback");
          if (feedback) feedback.textContent = err.message;
        });
    });
  }
});
