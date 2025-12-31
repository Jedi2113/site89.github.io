import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// Firebase config (same as other modules)
const firebaseConfig = {
  apiKey: "AIzaSyBaNDQOu9Aq5pcWJsfgIIj1SSeAbHI-VRg",
  authDomain: "site-89-2d768.firebaseapp.com",
  projectId: "site-89-2d768",
  storageBucket: "site-89-2d768.firebasestorage.app",
  messagingSenderId: "851485754416",
  appId: "1:851485754416:web:aefbe8aa2a7d1f334799f5",
  measurementId: "G-EDX3DLNV52"
};

// Init
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

function getSelectedCharacter(){
  try { return JSON.parse(localStorage.getItem('selectedCharacter')); } catch(e){ return null; }
}

function parseClearance(v){
  if(v === undefined || v === null) return NaN;
  if(typeof v === 'number') return v;
  const s = String(v);
  const m = s.match(/\d+/);
  return m ? parseInt(m[0],10) : NaN;
}

function userClearance(){
  const ch = getSelectedCharacter();
  return ch ? parseClearance(ch.clearance) : NaN;
}

function userDepartment(){
  const ch = getSelectedCharacter();
  return ch && ch.department ? ch.department : '';
}

function isDeptAllowed(dept){
  if(!dept) return false;
  const d = dept.toLowerCase();
  return d.includes('research') || d.includes('r&d') || d.includes('scien') || d.includes('scd') || d.includes('rnd');
}

function canCreate(){
  const c = userClearance();
  if(!isNaN(c) && c > 4) return true;
  const dept = userDepartment();
  return isDeptAllowed(dept);
}

function formatDate(ts){
  if(!ts) return '';
  try { return new Date(ts.seconds * 1000).toLocaleString(); } catch(e){ return ts.toString(); }
}

document.addEventListener('includesLoaded', ()=>{
  const newBtn = document.getElementById('newLogBtn');
  const modal = document.getElementById('createModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelLogBtn = document.getElementById('cancelLogBtn');
  const createForm = document.getElementById('createLogForm');
  const logsList = document.getElementById('logsList');
  const feedback = document.getElementById('logFeedback');
  const searchInput = document.getElementById('logSearch');

  // Show 'New' button only to authorized users
  if(newBtn){
    if(canCreate()) newBtn.style.display = 'inline-block'; else newBtn.style.display = 'none';
    newBtn.addEventListener('click', ()=>{ if(canCreate()) { modal.style.display='flex'; modal.setAttribute('aria-hidden','false'); document.getElementById('logTitle').focus(); } else alert('You do not have permission to create research logs.'); });
  }
  if(closeModalBtn) closeModalBtn.addEventListener('click', ()=>{ modal.style.display='none'; modal.setAttribute('aria-hidden','true'); feedback.textContent=''; });
  if(cancelLogBtn) cancelLogBtn.addEventListener('click', ()=>{ modal.style.display='none'; modal.setAttribute('aria-hidden','true'); feedback.textContent=''; });

  // Helper: render logs with optional search filter
  let logsCache = [];
  function renderLogs(arr){
    const q = (searchInput && searchInput.value || '').trim().toLowerCase();
    if(isNaN(userClearance()) || userClearance() <= 0){ logsList.innerHTML = '<p>You need clearance &gt; 0 to view research logs.</p>'; return; }
    const filtered = (!q) ? arr : arr.filter(d => (d.title||'').toLowerCase().includes(q) || (d.content||'').toLowerCase().includes(q) || (d.tags||[]).join(' ').toLowerCase().includes(q));
    if(filtered.length === 0){ logsList.innerHTML = '<p>No entries match.</p>'; return; }
    logsList.innerHTML = '';
    filtered.forEach(d => {
      const item = document.createElement('div');
      item.className = 'log-card';
      const titleEl = document.createElement('div'); titleEl.style.fontWeight = '700'; titleEl.textContent = d.title || '(untitled)';
      const metaEl = document.createElement('div'); metaEl.className = 'meta'; metaEl.textContent = `${d.author || 'Unknown'} • ${d.department || ''} • ${formatDate(d.createdAt)}`;
      const contentEl = document.createElement('div'); contentEl.className = 'content'; contentEl.innerHTML = (d.content || '').replace(/\n/g,'<br>');
      item.appendChild(titleEl); item.appendChild(metaEl); item.appendChild(contentEl);
      if(d.tags && d.tags.length){ const tagsEl = document.createElement('div'); tagsEl.style.marginTop = '.6rem'; tagsEl.innerHTML = d.tags.map(t => `<span class="tag" style="display:inline-block;padding:.15rem .4rem;border-radius:4px;background:rgba(255,255,255,0.03);margin-right:.4rem;font-size:.85rem">${t}</span>`).join(''); item.appendChild(tagsEl); }
      logsList.appendChild(item);
    });
  }

  if(searchInput){ searchInput.addEventListener('input', ()=> renderLogs(logsCache)); }

  // Wire create form
  if(createForm){
    createForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      feedback.textContent = '';
      if(!auth.currentUser){ feedback.textContent = 'You must be signed in to create logs.'; return; }
      if(!canCreate()){ feedback.textContent = 'You do not have permission to create research logs.'; return; }
      const title = document.getElementById('logTitle').value.trim();
      const tags = document.getElementById('logTags').value.split(',').map(s=>s.trim()).filter(Boolean);
      const content = document.getElementById('logContent').value.trim();
      if(!title || !content) { feedback.textContent = 'Title and content required.'; return; }
      try{
        const ch = getSelectedCharacter();
        const author = ch ? (ch.name || auth.currentUser.email) : auth.currentUser.email;
        const authorPid = ch ? (ch.pid || '') : '';
        await addDoc(collection(db,'researchLogs'), {
          title, tags, content, author, authorPid, department: ch ? ch.department || '' : '', createdAt: serverTimestamp(), createdByUid: auth.currentUser.uid
        });
        feedback.style.color = 'var(--accent-mint)'; feedback.textContent = 'Entry created.';
        createForm.reset();
        modal.style.display='none'; modal.setAttribute('aria-hidden','true');
      } catch(err){ feedback.style.color='var(--accent-red)'; feedback.textContent = 'Error: ' + err.message; }
    });
  }

  // Subscribe to logs (live)
  const q = query(collection(db,'researchLogs'), orderBy('createdAt','desc'));
  onSnapshot(q, (snap)=>{
    logsCache = [];
    snap.forEach(docSnap => logsCache.push({ id: docSnap.id, ...(docSnap.data()||{}) }));
    renderLogs(logsCache);
  }, (err)=>{
    logsList.innerHTML = '<p>Error loading logs: ' + err.message + '</p>';
  });
});
