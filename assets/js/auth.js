import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const firebaseConfig = {
  // If you're reading this you are very naughty, please go back to your own project :)
  //Seriously, get out of here, this is not your code to see.
  apiKey: "AIzaSyBaNDQOu9Aq5pcWJsfgIIj1SSeAbHI-VRg",
  authDomain: "site-89-2d768.firebaseapp.com",
  projectId: "site-89-2d768",
  storageBucket: "site-89-2d768.firebasestorage.app",
  messagingSenderId: "851485754416",
  appId: "1:851485754416:web:aefbe8aa2a7d1f334799f5",
  measurementId: "G-EDX3DLNV52"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export { app, auth, onAuthStateChanged };

document.addEventListener("includesLoaded", () => {
  const navAccountsText = document.querySelector("#navAccountsBtn span");
  const navAccountsDropdown = document.getElementById("navAccountsDropdown");

  // Function to position dropdown correctly below button
  function positionDropdown(btn) {
    if (!btn || !navAccountsDropdown) return;
    
    const btnRect = btn.getBoundingClientRect();
    const dropdownWidth = 280;
    
    // Align dropdown's right edge with button's right edge
    let left = btnRect.right - dropdownWidth;
    
    // Ensure it doesn't go off the left edge
    if (left < 10) {
      left = 10;
    }
    
    // Ensure it doesn't go off the right edge
    if (left + dropdownWidth > window.innerWidth - 10) {
      left = window.innerWidth - dropdownWidth - 10;
    }
    
    navAccountsDropdown.style.left = left + 'px';
    navAccountsDropdown.style.top = (btnRect.bottom + 8) + 'px';
  }

  onAuthStateChanged(auth, (user) => {
    let displayName = "Login";
    let isLoggedIn = false;
    
    if (user) {
      isLoggedIn = true;
      const selectedChar = localStorage.getItem("selectedCharacter");
      if (selectedChar) {
        try {
          const charObj = JSON.parse(selectedChar);
          const parts = charObj.name.split(" ");
          displayName = parts.length >= 2 ? `${parts[0][0]}. ${parts[parts.length - 1]}` : charObj.name;
        } catch {
          displayName = user.email;
        }
      } else {
        displayName = user.email;
      }
    }
    if (navAccountsText) navAccountsText.textContent = displayName;
    
    // Update button behavior based on login status
    let navAccountsBtn = document.getElementById("navAccountsBtn");
    if (navAccountsBtn) {
      // Remove previous click handlers by cloning the element
      const newBtn = navAccountsBtn.cloneNode(true);
      navAccountsBtn.parentNode.replaceChild(newBtn, navAccountsBtn);
      navAccountsBtn = newBtn;
      
      navAccountsBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (isLoggedIn) {
          // Show dropdown for logged-in users
          if (navAccountsDropdown) {
            navAccountsDropdown.classList.toggle('hidden');
            if (!navAccountsDropdown.classList.contains('hidden')) {
              positionDropdown(navAccountsBtn);
            }
          }
        } else {
          // Navigate to login for non-logged-in users
          window.location.href = '/login/';
        }
      });
    }
  });

  Array.from(document.querySelectorAll('#logoutBtn')).forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try { localStorage.removeItem('selectedCharacter'); } catch (err) { }
      signOut(auth).then(() => window.location.href = '/login/').catch(() => window.location.href = '/login/');
    });
  });

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
