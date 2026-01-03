import { app } from "./auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// Get references from the shared app
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

  // Helper: render logs into table with optional search filter
  let logsCache = [];
  const tableBody = document.getElementById('logsTableBody');
  const viewModal = document.getElementById('viewModal');
  const viewModalTitle = document.getElementById('viewModalTitle');
  const viewModalBody = document.getElementById('viewModalBody');
  const viewModalMeta = document.getElementById('viewModalMeta');
  const viewModalClose = document.getElementById('viewModalClose');

  function renderLogs(arr){
    const q = (searchInput && searchInput.value || '').trim().toLowerCase();
    // Users need clearance >= 1 to view research logs (enforced by secure-access.js, but check here too)
    if(isNaN(userClearance()) || userClearance() < 1){ tableBody.innerHTML = '<tr><td colspan="2" class="empty">You need clearance >= 1 to view research logs.</td></tr>'; return; }
    const filtered = (!q) ? arr : arr.filter(d => (d.title||'').toLowerCase().includes(q) || (d.tags||[]).join(' ').toLowerCase().includes(q));
    if(filtered.length === 0){ tableBody.innerHTML = '<tr><td colspan="2" class="empty">No entries match.</td></tr>'; return; }
    tableBody.innerHTML = '';
    filtered.forEach(d => {
      const row = document.createElement('tr');
      const titleCell = document.createElement('td');
      const link = document.createElement('a'); link.className = 'click-row'; link.href = '#'; link.textContent = d.title || '(untitled)';
      link.addEventListener('click', (e)=>{ e.preventDefault(); openViewModal(d); });
      titleCell.appendChild(link);

      const tagsCell = document.createElement('td');
      if(d.tags && d.tags.length){ tagsCell.innerHTML = d.tags.map(t => `<span class="pill" style="margin-right:.4rem">${t}</span>`).join(''); }
      else { tagsCell.innerHTML = '<span style="color:var(--text-light);opacity:.7">—</span>'; }

      row.appendChild(titleCell); row.appendChild(tagsCell);
      tableBody.appendChild(row);
    });
  }

  if(searchInput){ searchInput.addEventListener('input', ()=> renderLogs(logsCache)); }

  // View modal handlers
  function openViewModal(d){
    viewModalTitle.textContent = d.title || '(untitled)';
    viewModalMeta.textContent = `${d.author || 'Unknown'} • ${d.department || ''} • ${formatDate(d.createdAt)}`;
    if(d.docUrl){
      const safeUrl = String(d.docUrl);
      viewModalBody.innerHTML = `<p><a href="${safeUrl}" target="_blank" rel="noopener">Open Document →</a></p><p style="margin-top:.6rem;color:var(--text-light);opacity:.9">${safeUrl}</p>`;
    } else {
      viewModalBody.innerHTML = '<em>No document link provided.</em>';
    }
    viewModal.setAttribute('aria-hidden','false');
  }
  function closeViewModal(){ viewModal.setAttribute('aria-hidden','true'); }
  if(viewModalClose) viewModalClose.addEventListener('click', closeViewModal);
  if(viewModal) viewModal.addEventListener('click', (ev)=>{ if(ev.target === viewModal) closeViewModal(); });

  // Wire create form
  if(createForm){
    createForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      feedback.textContent = '';
      if(!auth.currentUser){ feedback.textContent = 'You must be signed in to create logs.'; return; }
      if(!canCreate()){ feedback.textContent = 'You do not have permission to create research logs.'; return; }
      const title = document.getElementById('logTitle').value.trim();
      const tags = document.getElementById('logTags').value.split(',').map(s=>s.trim()).filter(Boolean);
      const docUrl = document.getElementById('logDocUrl').value.trim();
      if(!title || !docUrl) { feedback.textContent = 'Title and document link required.'; return; }
      try{
        const ch = getSelectedCharacter();
        const author = ch ? (ch.name || auth.currentUser.email) : auth.currentUser.email;
        const authorPid = ch ? (ch.pid || '') : '';
        await addDoc(collection(db,'researchLogs'), {
          title, tags, docUrl, author, authorPid, department: ch ? ch.department || '' : '', createdAt: serverTimestamp(), createdByUid: auth.currentUser.uid
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
