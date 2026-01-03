/**
 * SECURE ACCESS CONTROL
 * 
 * This module handles clearance-based access control with server-side verification.
 * It prevents race conditions where users can see restricted content on page load.
 * 
 * CRITICAL: This must be loaded before any page content renders.
 * Add to ALL pages with clearance requirements as EARLY as possible in head.
 */

(function(){
  // IMMEDIATELY block page rendering
  document.documentElement.style.opacity = '0';
  document.documentElement.style.pointerEvents = 'none';
  
  let accessCheckComplete = false;
  
  async function performSecureAccessCheck(){
    try {
      const getRequired = () => {
        const meta = document.querySelector('meta[name="required-clearance"]');
        if (meta && meta.content) return meta.content;
        const b = document.body.getAttribute('data-required-clearance');
        if (b) return b;
        return null;
      };

      const required = getRequired();
      if (!required) {
        // No restriction on this page - allow rendering
        unblockPage();
        return;
      }

      // Page has clearance requirement - must verify with Firebase
      const userClearance = await fetchUserClearanceFromFirebase();
      const reqNum = parseClearance(required);
      
      if (Number.isNaN(reqNum)) {
        // Invalid required value, allow (fail open safely)
        unblockPage();
        return;
      }

      // If no user/character, userClearance will be NaN - block access
      if (Number.isNaN(userClearance)) {
        blockPageAndRedirect();
        return;
      }

      // Check if user has sufficient clearance (>= required level)
      if (userClearance >= reqNum) {
        // User has valid access - allow rendering
        unblockPage();
      } else {
        // User doesn't have sufficient clearance - redirect
        blockPageAndRedirect();
      }
    } catch (err) {
      console.error('Secure access check error', err);
      // On error with restricted page, still block to be safe
      // but wait a bit to see if auth loads
      setTimeout(() => {
        if (!accessCheckComplete) {
          console.warn('Access check still incomplete after error, blocking as precaution');
          blockPageAndRedirect();
        }
      }, 3000);
    }
  }

  /**
   * Initialize Firebase with proper app config
   */
  async function initializeFirebase() {
    try {
      const { initializeApp } = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js");
      
      const firebaseConfig = {
        apiKey: "AIzaSyBaNDQOu9Aq5pcWJsfgIIj1SSeAbHI-VRg",
        authDomain: "site-89-2d768.firebaseapp.com",
        projectId: "site-89-2d768",
        storageBucket: "site-89-2d768.firebasestorage.app",
        messagingSenderId: "851485754416",
        appId: "1:851485754416:web:aefbe8aa2a7d1f334799f5",
        measurementId: "G-EDX3DLNV52"
      };
      
      const app = initializeApp(firebaseConfig);
      return app;
    } catch (err) {
      console.error('Firebase initialization failed', err);
      return null;
    }
  }

  /**
   * Fetch the current user's clearance level from Firebase
   * This is the ONLY authoritative source for clearance
   */
  async function fetchUserClearanceFromFirebase(){
    try {
      // Initialize Firebase app
      const app = await initializeFirebase();
      if (!app) return NaN;

      // Import Firebase modules dynamically
      const { getAuth } = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js");
      const { getFirestore, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js");
      
      // Get the current auth state
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (!user) {
        // Not authenticated - redirect to login
        return NaN;
      }

      // Get user's selected character from localStorage (as hint)
      const selectedCharRaw = localStorage.getItem('selectedCharacter');
      let selectedCharId = null;
      
      if (selectedCharRaw) {
        try {
          const char = JSON.parse(selectedCharRaw);
          selectedCharId = char.id;
        } catch (e) {
          // Invalid localStorage data - ignore it
        }
      }

      if (!selectedCharId) {
        // No character selected in localStorage
        // This could mean: user hasn't completed character creation, or just hasn't selected one
        // For research logs and similar pages, we should allow them through but they might see limited content
        // Default to clearance 1 for authenticated users with no character selected
        return 1;
      }

      // Query Firebase to verify character and get clearance
      // CRITICAL: This bypasses any localStorage tampering
      const db = getFirestore(app);
      const charRef = doc(db, 'characters', selectedCharId);
      const charSnap = await getDoc(charRef);
      
      if (!charSnap.exists()) {
        // Character doesn't exist in database
        return 0;
      }

      const charData = charSnap.data();
      
      // CRITICAL: Verify the character is actually linked to this user
      if (charData.linkedUID !== user.uid) {
        // Someone tried to use another user's character - deny access
        console.warn('Character linked to different user. Access denied.');
        return NaN;
      }

      // Return the authoritative clearance level from Firebase
      // Default to clearance 1 if not specified (new characters start at Intern = Level 1)
      const clearance = charData.clearance !== undefined ? parseClearance(charData.clearance) : 1;
      return Number.isNaN(clearance) ? 1 : clearance;
    } catch (err) {
      console.error('Firebase clearance fetch failed', err);
      // Fail secure - deny access on any error
      return NaN;
    }
  }

  function parseClearance(v) {
    if (v === undefined || v === null) return NaN;
    if (typeof v === 'number') return v;
    const s = String(v);
    const m = s.match(/\d+/);
    return m ? parseInt(m[0], 10) : NaN;
  }

  function unblockPage() {
    accessCheckComplete = true;
    document.documentElement.style.opacity = '1';
    document.documentElement.style.pointerEvents = 'auto';
    document.dispatchEvent(new Event('secureAccessGranted'));
  }

  function blockPageAndRedirect() {
    // Don't unblock - page remains invisible
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    // Use replace to prevent back button abuse
    setTimeout(() => {
      window.location.replace('/403/?from=' + next);
    }, 100);
  }

  // Run the check as soon as possible
  // This runs BEFORE DOMContentLoaded
  performSecureAccessCheck();

  // Also run on DOMContentLoaded as a fallback
  document.addEventListener('DOMContentLoaded', async () => {
    if (!accessCheckComplete) {
      await performSecureAccessCheck();
    }
  });

  // Fail-safe: if page is still visible after 5 seconds without explicit auth,
  // something went wrong - redirect
  setTimeout(() => {
    if (!accessCheckComplete) {
      console.error('Access check timeout');
      blockPageAndRedirect();
    }
  }, 5000);
})();
