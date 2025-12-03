import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

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

  // Auth state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      navLoginText.textContent = user.email;
    } else {
      navLoginText.textContent = "Login";
    }
  });

  // Navbar button behavior
  if (navLogin) {
    navLogin.addEventListener("click", () => {
      if (auth.currentUser) {
        window.location.href = "accounts.html";
      } else {
        window.location.href = "login.html";
      }
    });
  }

  // LOGIN FORM (if exists)
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      signInWithEmailAndPassword(auth, email, password)
        .then(() => window.location.href = "index.html")
        .catch(err => {
          document.getElementById("loginFeedback").textContent = err.message;
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
        .then(() => window.location.href = "index.html")
        .catch(err => {
          document.getElementById("registerFeedback").textContent = err.message;
        });
    });
  }
});
