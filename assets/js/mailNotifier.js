// Global email notification badge updater
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Helper: Build character email address from name
function emailFromName(name){
  if(!name) return '';
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ? parts[0].toLowerCase().replace(/[^a-z]/g,'') : '';
  const last = parts.length>1 ? parts[parts.length-1].toLowerCase().replace(/[^a-z]/g,'') : first;
  return `${last}.${first}@site89.org`;
}

function initMailNotifier() {
  const auth = getAuth();
  const db = getFirestore();
  const navMailBadge = document.getElementById('navMailBadge');
  
  let unsubscribe = null;

  onAuthStateChanged(auth, (user) => {
    // Clean up previous listener
    if(unsubscribe){ 
      unsubscribe(); 
      unsubscribe = null; 
    }
    
    if(!user || !navMailBadge) return;
    
    // Get character email
    let myAddress = '';
    try {
      const selected = JSON.parse(localStorage.getItem('selectedCharacter'));
      if(selected && selected.name){
        myAddress = emailFromName(selected.name);
      } else if(user.email){
        myAddress = user.email;
      }
    } catch(e){ 
      if(user.email) myAddress = user.email;
    }
    
    if(!myAddress) {
      navMailBadge.style.display = 'none';
      return;
    }
    
    // Set up real-time listener for unread messages
    const q = query(
      collection(db, 'emails'),
      where('recipients', 'array-contains', myAddress)
    );
    
    unsubscribe = onSnapshot(q, (snapshot) => {
      let unreadCount = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        // Count if: recipient matches, not in trash, not draft, and not read
        if(data.recipients && data.recipients.includes(myAddress) && 
           data.folder !== 'trash' && 
           data.status !== 'draft' && 
           !data.read){
          unreadCount++;
        }
      });
      
      // Update badge
      if(unreadCount > 0){
        navMailBadge.textContent = unreadCount;
        navMailBadge.style.display = 'flex';
      } else {
        navMailBadge.textContent = '';
        navMailBadge.style.display = 'none';
      }
    }, (err) => {
      console.error('MailNotifier error:', err);
    });
  });
}

// Try multiple initialization methods
let initialized = false;

document.addEventListener('includesLoaded', () => {
  if(!initialized){
    initialized = true;
    initMailNotifier();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  if(!initialized){
    initialized = true;
    initMailNotifier();
  }
});

// Fallback: try after a short delay
setTimeout(() => {
  if(!initialized){
    initialized = true;
    initMailNotifier();
  }
}, 1000);

