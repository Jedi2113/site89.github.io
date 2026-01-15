import { app } from '/assets/js/auth.js';
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';
import { marked } from 'https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js';

const db = getFirestore(app);
const auth = getAuth(app);

function getSelectedCharacter(){ try { return JSON.parse(localStorage.getItem('selectedCharacter')); } catch(e){ return null; } }
function parseClearance(v){ if(v === undefined || v === null) return NaN; if(typeof v === 'number') return v; const s = String(v); const m = s.match(/\d+/); return m ? parseInt(m[0],10) : NaN; }
function userClearance(){ const ch = getSelectedCharacter(); return ch ? parseClearance(ch.clearance) : NaN; }
function userDepartment(){ const ch = getSelectedCharacter(); return ch && ch.department ? ch.department : ''; }
function isDeptAllowed(dept){ if(!dept) return false; const d = dept.toLowerCase(); return d.includes('research') || d.includes('r&d') || d.includes('scien') || d.includes('scd') || d.includes('rnd'); }
function canEdit(){ const c = userClearance(); if(!isNaN(c) && c >= 5) return true; return isDeptAllowed(userDepartment()); }
function displayName(){ const ch = getSelectedCharacter(); if(ch && ch.name) return ch.name; if(auth.currentUser && auth.currentUser.email) return auth.currentUser.email; return 'Unknown'; }

function docIdFromItemNumber(itemNumber){ const m = (itemNumber || '').match(/\d+/); if(m) return m[0]; return (itemNumber || 'scp-000').replace(/[^A-Za-z0-9]/g,'-'); }
function formatItemNumber(raw){ const s = (raw || '').toUpperCase().replace(/\s+/g,''); const digits = s.match(/\d+/); if(!digits) return s || 'SCP-000'; const padded = digits[0].padStart(3,'0'); return `SCP-${padded}`; }
function renderMarkdown(md){ return marked.parse(md || ''); }
function summarize(md){ const plain = (md || '').replace(/[\n\r]+/g,' ').replace(/[#*_`>\[\]]/g,' ').trim(); return plain.length > 140 ? plain.slice(0,140) + '…' : (plain || 'No description yet.'); }

// Elements
const newBtn = document.getElementById('newAnomalyBtn');
const modal = document.getElementById('createModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const loadExistingBtn = document.getElementById('loadExistingBtn');
const form = document.getElementById('anomalyForm');
const proceduresInput = document.getElementById('procedures');
const descriptionInput = document.getElementById('description');
const proceduresPreview = document.getElementById('proceduresPreview');
const descriptionPreview = document.getElementById('descriptionPreview');
const formStatus = document.getElementById('formStatus');
const searchInput = document.getElementById('anomalySearch');
const classFilter = document.getElementById('classFilter');
const riskFilter = document.getElementById('riskFilter');
const disruptionFilter = document.getElementById('disruptionFilter');
const tableBody = document.getElementById('anomalyTableBody');

let anomalies = [];

function setStatus(msg, isError=false){ if(!formStatus) return; formStatus.textContent = msg || ''; formStatus.style.color = isError ? 'var(--accent-red)' : 'var(--text-light)'; }
function refreshPreview(){ if(proceduresPreview) proceduresPreview.innerHTML = renderMarkdown(proceduresInput.value); if(descriptionPreview) descriptionPreview.innerHTML = renderMarkdown(descriptionInput.value); }

function resetForm(){ form.reset(); refreshPreview(); }

async function loadExisting(){ 
  const formatted = formatItemNumber(document.getElementById('itemNumber').value || ''); 
  if(!formatted){ setStatus('Enter an item number to load.', true); return; } 
  const docId = docIdFromItemNumber(formatted); 
  const ref = doc(db,'anomalies',docId); 
  const snap = await getDoc(ref); 
  if(!snap.exists()){ setStatus('No anomaly found for that item number.', true); return; } 
  const data = snap.data(); 
  
  // Clearance check - prevent loading anomalies above user's clearance
  const required = parseClearance(data.clearanceLevel || 0);
  const userC = userClearance();
  const deptOk = isDeptAllowed(userDepartment());
  const userHasClearance = !Number.isNaN(userC) && userC >= required;
  const allowed = deptOk || userHasClearance;
  
  if(!allowed){
    setStatus(`Access denied: Requires Level ${required} clearance or ScD/R&D assignment.`, true);
    return;
  }
  
  document.getElementById('itemNumber').value = data.itemNumber || formatted; 
  document.getElementById('nickname').value = data.nickname || ''; 
  document.getElementById('photoUrl').value = data.photoUrl || ''; 
  document.getElementById('containmentClass').value = data.containmentClass || ''; 
  document.getElementById('riskClass').value = data.riskClass || ''; 
  document.getElementById('disruptionClass').value = data.disruptionClass || ''; 
  document.getElementById('clearanceLevel').value = data.clearanceLevel || ''; 
  proceduresInput.value = data.proceduresMd || ''; 
  descriptionInput.value = data.descriptionMd || ''; 
  refreshPreview(); 
  setStatus('Loaded existing entry.'); 
}

async function handleSubmit(e){ e.preventDefault(); setStatus(''); if(!auth.currentUser){ setStatus('Login is required.', true); return; } if(!canEdit()){ setStatus('Only ScD/R&D or Level 5 may edit.', true); return; }
  const formatted = formatItemNumber(document.getElementById('itemNumber').value || ''); if(!formatted){ setStatus('Item number required.', true); return; }
  const clearanceLevel = parseClearance(document.getElementById('clearanceLevel').value || ''); if(Number.isNaN(clearanceLevel)){ setStatus('Select a clearance level.', true); return; }
  const docId = docIdFromItemNumber(formatted);
  const ref = doc(db,'anomalies',docId);
  const snap = await getDoc(ref);
  const payload = {
    itemNumber: formatted,
    nickname: (document.getElementById('nickname').value || '').trim(),
    containmentClass: document.getElementById('containmentClass').value,
    riskClass: document.getElementById('riskClass').value,
    disruptionClass: document.getElementById('disruptionClass').value,
    clearanceLevel,
    photoUrl: (document.getElementById('photoUrl').value || '').trim(),
    proceduresMd: proceduresInput.value || '',
    descriptionMd: descriptionInput.value || '',
    updatedAt: serverTimestamp(),
    createdByUid: snap.exists() ? (snap.data().createdByUid || auth.currentUser.uid) : auth.currentUser.uid,
    createdByEmail: snap.exists() ? (snap.data().createdByEmail || auth.currentUser.email || '') : (auth.currentUser.email || ''),
    createdByDisplay: snap.exists() ? (snap.data().createdByDisplay || displayName()) : displayName(),
    updatedByUid: auth.currentUser.uid,
    updatedByEmail: auth.currentUser.email || '',
    updatedByDisplay: displayName()
  };
  if(!snap.exists()) payload.createdAt = serverTimestamp();
  try{
    await setDoc(ref, payload, { merge:true });
    setStatus('Saved.');
    modal.style.display='none'; modal.setAttribute('aria-hidden','true');
    resetForm();
  } catch(err){ console.error('Error saving anomaly', err); setStatus('Error: ' + err.message, true); }
}

function renderList(){
  const q = (searchInput?.value || '').toLowerCase().trim();
  const cls = classFilter?.value || 'all';
  const risk = riskFilter?.value || 'all';
  const dis = disruptionFilter?.value || 'all';
  const userC = userClearance();
  const deptOk = isDeptAllowed(userDepartment());
  
  console.log('📋 Rendering list - User Clearance:', userC, 'Dept OK:', deptOk, 'Dept:', userDepartment());
  
  const filtered = anomalies.filter(a => {
    // clearance gate per item: user can view if dept is allowed OR user clearance >= required
    const req = parseClearance(a.clearanceLevel);
    
    // ScD/R&D departments can see all clearance levels
    if(!deptOk) {
      // Not in special dept, must have sufficient clearance
      // Both userC and req must be valid numbers, and userC must be >= req
      if(Number.isNaN(userC) || Number.isNaN(req)) {
        console.log(`❌ ${a.itemNumber}: Invalid clearance (userC=${userC}, req=${req})`);
        return false;
      }
      if(userC < req) {
        console.log(`❌ ${a.itemNumber}: Insufficient clearance (userC=${userC} < req=${req})`);
        return false;
      }
      console.log(`✅ ${a.itemNumber}: Clearance OK (userC=${userC} >= req=${req})`);
    } else {
      console.log(`✅ ${a.itemNumber}: ScD/R&D bypass`);
    }
    
    if(cls !== 'all' && a.containmentClass !== cls) return false;
    if(risk !== 'all' && a.riskClass !== risk) return false;
    if(dis !== 'all' && a.disruptionClass !== dis) return false;
    if(q){
      const hay = `${a.itemNumber||''} ${a.descriptionMd||''} ${a.containmentClass||''}`.toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });

  if(!filtered.length){ tableBody.innerHTML = '<tr><td colspan="5" class="empty">No anomalies visible for your clearance.</td></tr>'; return; }
  tableBody.innerHTML = '';
  filtered.forEach(a => {
    const docId = docIdFromItemNumber(a.itemNumber || a.docId || '');
    const url = `/anomalies/view/?id=${encodeURIComponent(docId)}`;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><a class="click-row" href="${url}">${a.itemNumber || 'SCP-000'}</a></td>
      <td><a class="click-row" href="${url}"><span class="pill ${a.containmentClass||''}">${a.containmentClass || '?'}</span></a></td>
      <td><a class="click-row" href="${url}">${a.riskClass || '?'}</a></td>
      <td><a class="click-row" href="${url}">${a.disruptionClass || '?'}</a></td>
      <td><a class="click-row" href="${url}">${a.nickname || '(No nickname)'}</a></td>
    `;
    tableBody.appendChild(row);
  });
}

function wireModal(){
  const updateButtonVisibility = () => {
    if(newBtn){ newBtn.style.display = canEdit() ? 'inline-block' : 'none'; }
  };
  
  if(newBtn){ 
    updateButtonVisibility();
    newBtn.addEventListener('click', ()=>{ if(!canEdit()) return alert('Only ScD/R&D or Level 5 may edit.'); modal.style.display='flex'; modal.setAttribute('aria-hidden','false'); document.getElementById('itemNumber').focus(); refreshPreview(); }); 
  }
  if(closeModalBtn) closeModalBtn.addEventListener('click', ()=>{ modal.style.display='none'; modal.setAttribute('aria-hidden','true'); setStatus(''); });
  if(loadExistingBtn) loadExistingBtn.addEventListener('click', loadExisting);
  [proceduresInput, descriptionInput].forEach(el=> el && el.addEventListener('input', refreshPreview));
  if(form) form.addEventListener('submit', handleSubmit);
  
  // Update button visibility when character selection changes
  window.addEventListener('storage', updateButtonVisibility);
}

function subscribe(){
  const q = collection(db,'anomalies');
  onSnapshot(q, (snap)=>{
    anomalies = [];
    snap.forEach(docSnap => anomalies.push({ docId: docSnap.id, ...(docSnap.data()||{}) }));
    anomalies.sort((a,b)=> (a.itemNumber||'').localeCompare(b.itemNumber||''));
    renderList();
  }, (err)=>{
    console.error('Firestore error:', err);
    tableBody.innerHTML = '<tr><td colspan="5" class="empty">Error loading anomalies: ' + err.message + '</td></tr>';
  });
}

function kickoff(){ if(window.__anomalyIndexReady) return; window.__anomalyIndexReady=true; refreshPreview(); subscribe(); if(searchInput) searchInput.addEventListener('input', renderList); classFilter?.addEventListener('change', renderList); riskFilter?.addEventListener('change', renderList); disruptionFilter?.addEventListener('change', renderList); 
  // Wire modal after a small delay to ensure character is loaded
  setTimeout(() => { wireModal(); }, 50);
  // auto-load anomaly if id or item param provided
  const params = new URLSearchParams(window.location.search);
  const idParam = params.get('id') || params.get('item');
  if(idParam){ 
    modal.style.display='flex'; 
    modal.setAttribute('aria-hidden','false'); 
    document.getElementById('itemNumber').value = formatItemNumber(idParam); 
    setTimeout(() => loadExisting(), 100); 
  }
}

document.addEventListener('includesLoaded', kickoff);
document.addEventListener('DOMContentLoaded', kickoff);
