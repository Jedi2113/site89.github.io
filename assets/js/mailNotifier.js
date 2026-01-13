// Global email notification badge updater
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, query, where, onSnapshot, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Normalize a name into a base local-part "lastname.firstname"
function baseLocalFromName(name){
  if(!name) return '';
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ? parts[0].toLowerCase().replace(/[^a-z]/g,'') : '';
  const last = parts.length>1 ? parts[parts.length-1].toLowerCase().replace(/[^a-z]/g,'') : first;
  return last && first ? `${last}.${first}` : '';
}

// Given a base local and counts, return a unique email with numeric suffixes for duplicates
function makeUniqueEmail(baseLocal, counts){
  if(!baseLocal) return '';
  const current = counts.get(baseLocal) || 0;
  const next = current + 1;
  counts.set(baseLocal, next);
  const localPart = next === 1 ? baseLocal : `${baseLocal}${next}`;
  return `${localPart}@site89.org`.toLowerCase();
}

let emailDirectoryPromise = null;
let emailDirectory = null;

async function getEmailDirectory(db){
  if(emailDirectory) return emailDirectory;
  if(emailDirectoryPromise) return emailDirectoryPromise;

  emailDirectoryPromise = (async ()=>{
    const raw = [];
    try {
      const snap = await getDocs(collection(db,'characters'));
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if(data && data.name) raw.push(data);
      });
    } catch(err) {
      console.error('Failed to load characters for email directory:', err);
      return { entries: [], byPid: new Map(), byBase: new Map(), countsSnapshot: new Map() };
    }

    raw.sort((a,b)=>{
      const aName = (a.name||'').toLowerCase();
      const bName = (b.name||'').toLowerCase();
      if(aName !== bName) return aName.localeCompare(bName);
      const aPid = (a.pid||'').toString();
      const bPid = (b.pid||'').toString();
      return aPid.localeCompare(bPid);
    });

    const counts = new Map();
    const entries = raw.map(char => {
      const baseLocal = baseLocalFromName(char.name);
      const email = makeUniqueEmail(baseLocal, counts);
      return {
        email,
        baseLocal,
        pid: char.pid ? String(char.pid) : '',
        department: char.department || '',
        name: char.name || '',
        pfp: char.pfp || char.image || char.photo || char.photoUrl || char.photoURL || char.profileImage || char.avatar || char.picture || '/assets/img/logo.png'
      };
    }).filter(entry => !!entry.email);

    const byPid = new Map();
    const byBase = new Map();
    entries.forEach(entry => {
      if(entry.pid) byPid.set(entry.pid, entry.email);
      const list = byBase.get(entry.baseLocal) || [];
      list.push(entry);
      byBase.set(entry.baseLocal, list);
    });

    emailDirectory = { entries, byPid, byBase, countsSnapshot: new Map(counts) };
    return emailDirectory;
  })();

  return emailDirectoryPromise;
}

function resolveEmailForCharacter(char, directory){
  if(!char || !char.name) return '';
  const baseLocal = baseLocalFromName(char.name);
  if(!baseLocal) return '';

  const pidKey = char.pid ? String(char.pid) : '';
  if(pidKey && directory.byPid.has(pidKey)) return directory.byPid.get(pidKey);

  const bucket = directory.byBase.get(baseLocal);
  if(bucket && bucket.length){
    if(bucket.length === 1) return bucket[0].email;
    const dept = (char.department || '').toLowerCase();
    const match = bucket.find(entry => (entry.department || '').toLowerCase() === dept);
    return match ? match.email : bucket[0].email;
  }

  const snapshotCount = (directory.countsSnapshot.get(baseLocal) || 0) + 1;
  const localPart = snapshotCount === 1 ? baseLocal : `${baseLocal}${snapshotCount}`;
  return `${localPart}@site89.org`.toLowerCase();
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
  const normalized = (senderEmail || '').toLowerCase();
  try {
    const directory = await getEmailDirectory(db);
    const match = (directory.entries || []).find(entry => entry.email === normalized);
    if(match && match.pfp) return match.pfp;
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

  onAuthStateChanged(auth, async (user) => {
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
        try {
          const directory = await getEmailDirectory(db);
          myAddress = resolveEmailForCharacter(selected, directory);
        } catch(dirErr) {
          console.warn('Directory resolution failed, using fallback:', dirErr);
          const baseLocal = baseLocalFromName(selected.name);
          myAddress = baseLocal ? `${baseLocal}@site89.org` : '';
        }
      } else if(user.email){
        myAddress = user.email;
      }
    } catch(e){ 
      if(user.email) myAddress = user.email;
    }

    myAddress = (myAddress || '').toLowerCase();
    
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

