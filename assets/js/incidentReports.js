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

function isDeptAllowedForIncident(dept){
  if(!dept) return false;
  const d = dept.toLowerCase();
  // Check for SD (Security Department) instead of ScD
  return d.includes('sd/') || d.includes('security');
}

function canCreateIncident(){
  // Only SD members can create incident reports
  const dept = userDepartment();
  return isDeptAllowedForIncident(dept);
}

function formatDate(ts){
  if(!ts) return '';
  try { return new Date(ts.seconds * 1000).toLocaleString(); } catch(e){ return ts.toString(); }
}

// TinyMCE instance holder
let editorInstance = null;

// Main
document.addEventListener('includesLoaded', ()=>{
  const newBtn = document.getElementById('newIncidentBtn');
  const createModal = document.getElementById('createIncidentModal');
  const closeIncidentModal = document.getElementById('closeIncidentModal');
  const cancelIncidentBtn = document.getElementById('cancelIncidentBtn');
  const createForm = document.getElementById('createIncidentForm');
  const tableBody = document.getElementById('incTableBody');
  const viewModal = document.getElementById('viewIncidentModal');
  const viewModalTitle = document.getElementById('viewIncidentTitle');
  const viewModalBody = document.getElementById('viewIncidentBody');
  const viewModalMeta = document.getElementById('viewIncidentMeta');
  const viewModalClose = document.getElementById('viewIncidentClose');
  const searchInput = document.getElementById('incidentSearch');
  const feedback = document.getElementById('incFeedback');

  // Show 'New' for authorized
  if(newBtn){
    if(canCreateIncident()) newBtn.style.display = 'inline-block'; else newBtn.style.display = 'none';
    newBtn.addEventListener('click', ()=>{ 
      if(canCreateIncident()){ 
        createModal.style.display = 'flex'; 
        createModal.setAttribute('aria-hidden','false'); 
        document.getElementById('incReportId').focus(); 
        // Initialize TinyMCE
        if(!editorInstance){
          tinymce.init({
            selector: '#incContent',
            height: 400,
            menubar: false,
            plugins: 'lists link table code',
            toolbar: 'undo redo | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist | link table | code',
            skin: 'oxide-dark',
            content_css: 'dark',
            setup: (editor) => { editorInstance = editor; }
          });
        }
      } else alert('You do not have permission to create incident reports. SD membership required.'); 
    });
  }
  if(closeIncidentModal) closeIncidentModal.addEventListener('click', ()=>{ 
    createModal.style.display='none'; 
    createModal.setAttribute('aria-hidden','true'); 
    feedback.textContent=''; 
    if(editorInstance) { editorInstance.remove(); editorInstance = null; }
  });
  if(cancelIncidentBtn) cancelIncidentBtn.addEventListener('click', ()=>{ 
    createModal.style.display='none'; 
    createModal.setAttribute('aria-hidden','true'); 
    feedback.textContent=''; 
    if(editorInstance) { editorInstance.remove(); editorInstance = null; }
  });

  // render
  let cache = [];
  function render(list){
    const q = (searchInput && searchInput.value || '').trim().toLowerCase();
    if(isNaN(userClearance()) || userClearance() <= 0){ tableBody.innerHTML = '<tr><td colspan="2" class="empty">You need clearance &gt; 0 to view incident reports.</td></tr>'; return; }
    const filtered = (!q) ? list : list.filter(d => (d.title||'').toLowerCase().includes(q) || (d.tags||[]).join(' ').toLowerCase().includes(q));
    if(filtered.length === 0){ tableBody.innerHTML = '<tr><td colspan="2" class="empty">No entries match.</td></tr>'; return; }
    tableBody.innerHTML = '';
    filtered.forEach(d => {
      const row = document.createElement('tr');
      const titleCell = document.createElement('td');
      const link = document.createElement('a'); link.className = 'click-row'; link.href = '#'; link.textContent = d.title || '(untitled)';
      link.addEventListener('click', (e)=>{ e.preventDefault(); openView(d); });
      titleCell.appendChild(link);

      const tagsCell = document.createElement('td');
      tagsCell.innerHTML = (d.tags && d.tags.length) ? d.tags.map(t => `<span class="pill" style="margin-right:.4rem">${t}</span>`).join('') : '<span style="color:var(--text-light);opacity:.7">—</span>';

      row.appendChild(titleCell); row.appendChild(tagsCell);
      tableBody.appendChild(row);
    });
  }

  if(searchInput) searchInput.addEventListener('input', ()=> render(cache));

  // create
  if(createForm){
    createForm.addEventListener('submit', async (e)=>{
      e.preventDefault(); feedback.textContent = '';
      if(!auth.currentUser){ feedback.textContent = 'You must be signed in to create incident reports.'; return; }
      if(!canCreateIncident()){ feedback.textContent = 'You do not have permission to create incident reports. SD membership required.'; return; }
      
      const reportId = document.getElementById('incReportId').value.trim();
      const title = document.getElementById('incTitle').value.trim();
      const tags = document.getElementById('incTags').value.split(',').map(s=>s.trim()).filter(Boolean);
      const content = editorInstance ? editorInstance.getContent() : document.getElementById('incContent').value;
      
      // Validate report ID format
      const pattern = /^IR-\d{2}\.\d{2}\.\d{2}-\d{3}$/;
      if (!pattern.test(reportId)) {
        feedback.style.color = 'var(--accent-red)';
        feedback.textContent = 'Invalid format. Use: IR-MM.DD.YY-###';
        return;
      }
      
      if(!reportId || !title || !content) { feedback.textContent = 'Report ID, title and content required.'; return; }
      try{
        const ch = getSelectedCharacter();
        const author = ch ? (ch.name || auth.currentUser.email) : auth.currentUser.email;
        const authorPid = ch ? (ch.pid || '') : '';
        await addDoc(collection(db,'incidentReports'), { 
          reportId, 
          title, 
          tags, 
          content, 
          author, 
          authorPid,
          department: ch ? ch.department || '' : '', 
          createdAt: serverTimestamp(), 
          createdByUid: auth.currentUser.uid 
        });
        feedback.style.color='var(--accent-mint)'; 
        feedback.textContent = 'Report created.'; 
        createForm.reset(); 
        if(editorInstance) { editorInstance.setContent(''); }
        setTimeout(() => {
          createModal.style.display='none'; 
          createModal.setAttribute('aria-hidden','true');
        }, 1500);
      } catch(err){ feedback.style.color='var(--accent-red)'; feedback.textContent = 'Error: ' + err.message; }
    });
  }

  // view modal
  function openView(d){
    viewModalTitle.textContent = (d.reportId ? d.reportId + ': ' : '') + (d.title || '(untitled)');
    viewModalMeta.textContent = `${d.author || 'Unknown'} • ${d.department || ''} • ${formatDate(d.createdAt)}`;
    if(d.content){
      viewModalBody.innerHTML = d.content;
    } else if(d.docUrl){
      // Legacy support for old doc links
      const safeUrl = String(d.docUrl);
      viewModalBody.innerHTML = `<p><a href="${safeUrl}" target="_blank" rel="noopener">Open Document →</a></p>`;
    } else {
      viewModalBody.innerHTML = '<em>No content available.</em>';
    }
    viewModal.setAttribute('aria-hidden','false');
  }
  function closeView(){ viewModal.setAttribute('aria-hidden','true'); }
  if(viewModalClose) viewModalClose.addEventListener('click', closeView);
  if(viewModal) viewModal.addEventListener('click', (ev)=>{ if(ev.target === viewModal) closeView(); });

  // live subscribe
  const q = query(collection(db,'incidentReports'), orderBy('createdAt','desc'));
  onSnapshot(q, snap => { cache = []; snap.forEach(s => cache.push({ id: s.id, ...(s.data()||{}) })); render(cache); }, (err)=>{ tableBody.innerHTML = '<tr><td colspan="2" class="empty">Error loading incident reports: ' + err.message + '</td></tr>'; });
});