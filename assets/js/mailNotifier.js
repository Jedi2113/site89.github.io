// Global email notification badge updater
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

console.log('[MailNotifier] Script loaded');

// Helper: Build character email address from name
function emailFromName(name){
  if(!name) return '';
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ? parts[0].toLowerCase().replace(/[^a-z]/g,'') : '';
  const last = parts.length>1 ? parts[parts.length-1].toLowerCase().replace(/[^a-z]/g,'') : first;
  return `${last}.${first}@site89.org`;
}

function initMailNotifier() {
  console.log('[MailNotifier] Initializing...');
  const auth = getAuth();
  const db = getFirestore();
  const navMailBadge = document.getElementById('navMailBadge');
  
  console.log('[MailNotifier] Badge element found:', !!navMailBadge);
  
  let unsubscribe = null;

  onAuthStateChanged(auth, (user) => {
    console.log('[MailNotifier] Auth state changed. User:', user ? user.email : 'null');
    
    // Clean up previous listener
    if(unsubscribe){ 
      console.log('[MailNotifier] Cleaning up previous listener');
      unsubscribe(); 
      unsubscribe = null; 
    }
    
    if(!user || !navMailBadge) {
      console.log('[MailNotifier] No user or badge element, exiting');
      return;
    }
    
    // Get character email
    let myAddress = '';
    try {
      const selected = JSON.parse(localStorage.getItem('selectedCharacter'));
      console.log('[MailNotifier] Selected character:', selected);
      if(selected && selected.name){
        myAddress = emailFromName(selected.name);
      } else if(user.email){
        myAddress = user.email;
      }
    } catch(e){ 
      console.warn('[MailNotifier] Error getting character:', e);
      if(user.email) myAddress = user.email;
    }
    
    console.log('[MailNotifier] My email address:', myAddress);
    
    if(!myAddress) {
      console.log('[MailNotifier] No address found, hiding badge');
      navMailBadge.style.display = 'none';
      return;
    }
    
    // Set up real-time listener for unread messages
    console.log('[MailNotifier] Setting up Firestore listener for:', myAddress);
    const q = query(
      collection(db, 'emails'),
      where('recipients', 'array-contains', myAddress)
    );
    
    unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('[MailNotifier] Snapshot received. Total docs:', snapshot.size);
      let unreadCount = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log('[MailNotifier] Email doc:', doc.id, 'read:', data.read, 'folder:', data.folder, 'status:', data.status);
        // Count if: recipient matches, not in trash, not draft, and not read
        if(data.recipients && data.recipients.includes(myAddress) && 
           data.folder !== 'trash' && 
           data.status !== 'draft' && 
           !data.read){
          unreadCount++;
        }
      });
      
      console.log('[MailNotifier] Total unread count:', unreadCount);
      
      // Update badge
      if(unreadCount > 0){
        navMailBadge.textContent = unreadCount;
        navMailBadge.style.display = 'flex';
        console.log('[MailNotifier] Badge shown with count:', unreadCount);
      } else {
        navMailBadge.textContent = '';
        navMailBadge.style.display = 'none';
        console.log('[MailNotifier] Badge hidden (no unread)');
      }
    }, (err) => {
      console.error('[MailNotifier] Snapshot error:', err);
    });
  });
}

// Try multiple initialization methods
let initialized = false;

document.addEventListener('includesLoaded', () => {
  console.log('[MailNotifier] includesLoaded event fired');
  if(!initialized){
    initialized = true;
    initMailNotifier();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  console.log('[MailNotifier] DOMContentLoaded event fired');
  if(!initialized){
    initialized = true;
    initMailNotifier();
  }
});

// Fallback: try after a short delay
setTimeout(() => {
  console.log('[MailNotifier] Timeout fallback triggered');
  if(!initialized){
    initialized = true;
    initMailNotifier();
  }
}, 1000);
