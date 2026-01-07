// Global email notification badge updater
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, query, where, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Helper: Build character email address from name
function emailFromName(name){
  if(!name) return '';
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ? parts[0].toLowerCase().replace(/[^a-z]/g,'') : '';
  const last = parts.length>1 ? parts[parts.length-1].toLowerCase().replace(/[^a-z]/g,'') : first;
  return `${last}.${first}@site89.org`;
}

// Request desktop notification permission on first load
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// Play notification sound
async function playNotificationSound() {
  try {
    const audio = new Audio('/assets/sound/mail.mp3');
    audio.volume = 0.5;
    await audio.play();
  } catch(e) {
    console.log('Audio notification failed:', e);
    throw e;
  }
}

// Enable audio on first user interaction (required by browsers)
let audioEnabled = false;
function enableAudioOnInteraction() {
  if (!audioEnabled) {
    document.addEventListener('click', async () => {
      if (!audioEnabled) {
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          await audioContext.resume();
          audioEnabled = true;
        } catch(e) {
          console.log('Could not enable audio:', e);
        }
      }
    }, { once: true });
  }
}

// Get sender's profile picture from character database
async function getSenderPfp(senderEmail, db) {
  try {
    const q = query(
      collection(db, 'characters'),
      where('name', '!=', null)
    );
    const snapshot = await getDocs(q);
    
    for (const doc of snapshot.docs) {
      const char = doc.data();
      const charEmail = emailFromName(char.name);
      if (charEmail === senderEmail && char.pfp) {
        return char.pfp;
      }
    }
  } catch(e) {
    console.log('Could not fetch sender pfp:', e);
  }
  return '/assets/img/logo.png'; // Fallback to logo
}

// Show desktop notification
async function showDesktopNotification(sender, subject, senderEmail, db) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const icon = await getSenderPfp(senderEmail, db);
    
    const notification = new Notification('New Email - Site-89', {
      body: `From: ${sender}\n${subject}`,
      icon: icon,
      badge: icon,
      tag: 'site89-email',
      requireInteraction: false,
      silent: true // Disable Windows notification sound
    });
    
    notification.onclick = function() {
      window.focus();
      window.location.href = '/emails/';
      notification.close();
    };
    
    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  }
}

function initMailNotifier() {
  const auth = getAuth();
  const db = getFirestore();
  const navMailBadge = document.getElementById('navMailBadge');
  
  let unsubscribe = null;
  let previousUnreadCount = 0;
  let isFirstLoad = true;

  // Request notification permission
  requestNotificationPermission();
  
  // Enable audio on user interaction
  enableAudioOnInteraction();

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
      let newestEmail = null;
      let newestTimestamp = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        // Count if: recipient matches, not in trash, not draft, and not read
        if(data.recipients && data.recipients.includes(myAddress) && 
           data.folder !== 'trash' && 
           data.status !== 'draft' && 
           !data.read){
          unreadCount++;
          
          // Track newest unread email (using 'ts' field from emails.js)
          const emailTime = data.ts?.toMillis() || 0;
          if(emailTime > newestTimestamp) {
            newestTimestamp = emailTime;
            newestEmail = data;
          }
        }
      });
      
      // Check if we got a NEW email (count increased)
      if(!isFirstLoad && unreadCount > previousUnreadCount && newestEmail) {
        // Try to play sound (may be blocked by browser autoplay policy on first interaction)
        playNotificationSound().catch(err => {
          console.log('Audio notification blocked:', err);
        });
        
        showDesktopNotification(
          newestEmail.sender || 'Unknown Sender',
          newestEmail.subject || '(No Subject)',
          newestEmail.sender || '',
          db
        );
      }
      
      previousUnreadCount = unreadCount;
      isFirstLoad = false;
      
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

