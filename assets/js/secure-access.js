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

      if (Number.isNaN(userClearance) || userClearance < reqNum) {
        // User doesn't have access - redirect BEFORE rendering
        blockPageAndRedirect();
      } else {
        // User has valid access - allow rendering
        unblockPage();
      }
    } catch (err) {
      console.error('Secure access check error', err);
      // On error, redirect to safe state (fail secure)
      blockPageAndRedirect();
    }
  }

  /**
   * Fetch the current user's clearance level from Firebase
   * This is the ONLY authoritative source for clearance
   */
  async function fetchUserClearanceFromFirebase(){
    try {
      // Import Firebase modules dynamically if not already loaded
      const { getAuth, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js");
      const { getFirestore, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js");
      
      // Get the current auth state
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        // Not authenticated
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
        // No character selected
        return NaN;
      }

      // Query Firebase to verify character and get clearance
      // CRITICAL: This bypasses any localStorage tampering
      const db = getFirestore();
      const charRef = doc(db, 'characters', selectedCharId);
      const charSnap = await getDoc(charRef);
      
      if (!charSnap.exists()) {
        // Character doesn't exist
        return NaN;
      }

      const charData = charSnap.data();
      
      // CRITICAL: Verify the character is actually linked to this user
      if (charData.linkedUID !== user.uid) {
        // Someone tried to use another user's character - deny access
        console.warn('Character linked to different user. Access denied.');
        return NaN;
      }

      // Return the authoritative clearance level from Firebase
      const clearance = parseClearance(charData.clearance);
      return clearance;
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
