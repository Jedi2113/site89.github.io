import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Minimal helper functions for character/clearance
function getSelectedCharacter(){ try { return JSON.parse(localStorage.getItem('selectedCharacter')); } catch(e){ return null; } }
function parseClearance(v){ if(v === undefined || v === null) return NaN; if(typeof v === 'number') return v; const s = String(v); const m = s.match(/\d+/); return m ? parseInt(m[0],10) : NaN; }
function userClearance(){ const ch = getSelectedCharacter(); return ch ? parseClearance(ch.clearance) : NaN; }
function userDepartment(){ const ch = getSelectedCharacter(); return ch && ch.department ? ch.department : ''; }
function isDeptAllowed(dept){ if(!dept) return false; const d = dept.toLowerCase(); return d.includes('research') || d.includes('r&d') || d.includes('scien') || d.includes('scd') || d.includes('rnd'); }
function canEdit(){ const c = userClearance(); if(!isNaN(c) && c >= 4) return true; return isDeptAllowed(userDepartment()); }

// Local storage key
const KEY = 'anomaly-131-draft';

// Serialize current page state
function collectData(){
  const data = {
    overview: document.getElementById('overview').innerHTML,
    containment: document.getElementById('containment').innerHTML,
    description: document.getElementById('description').innerHTML,
    incidents: Array.from(document.querySelectorAll('#incidentLogs .log-entry')).map(el=>({ meta: el.querySelector('.log-meta').innerText, body: el.querySelector('.log-body').innerHTML })),
    experiments: Array.from(document.querySelectorAll('#experimentLogs .log-entry')).map(el=>({ meta: el.querySelector('.log-meta').innerText, body: el.querySelector('.log-body').innerHTML })),
    photos: Array.from(document.querySelectorAll('#photoGrid .photo')).map(p=>p.dataset.src || ''),
    notes: Array.from(document.querySelectorAll('#notesList li')).map(li=>li.innerHTML),
    meta: {
      class: document.getElementById('metaClass').innerText,
      risk: document.getElementById('metaRisk').innerText,
      location: document.getElementById('metaLocation').innerText,
      responsible: document.getElementById('metaResponsible').innerText
    }
  };
  return data;
}

function applyData(data){
  if(!data) return;
  document.getElementById('overview').innerHTML = data.overview || '';
  document.getElementById('containment').innerHTML = data.containment || '';
  document.getElementById('description').innerHTML = data.description || '';

  const incidentRoot = document.getElementById('incidentLogs'); incidentRoot.innerHTML = '';
  (data.incidents||[]).forEach(i=>{
    const el = createLogEntry(i.meta,i.body,'incident'); incidentRoot.appendChild(el);
  });

  const expRoot = document.getElementById('experimentLogs'); expRoot.innerHTML = '';
  (data.experiments||[]).forEach(i=>{ const el = createLogEntry(i.meta,i.body,'experiment'); expRoot.appendChild(el); });

  const photoRoot = document.getElementById('photoGrid'); photoRoot.innerHTML = '';
  (data.photos||[]).forEach(src=>{
    const d = document.createElement('div'); d.className='photo'; d.dataset.src=src; d.style.backgroundImage = `url('${src}')`; d.innerHTML = `<button class="remove-photo" style="display:none">✕</button>`; photoRoot.appendChild(d);
  });

  const notesRoot = document.getElementById('notesList'); notesRoot.innerHTML=''; (data.notes||[]).forEach(n=>{ const li = document.createElement('li'); li.contentEditable=false; li.innerHTML = n; notesRoot.appendChild(li); });

  document.getElementById('metaClass').innerText = data.meta?.class || '';
  document.getElementById('metaRisk').innerText = data.meta?.risk || '';
  document.getElementById('metaLocation').innerText = data.meta?.location || '';
  document.getElementById('metaResponsible').innerText = data.meta?.responsible || '';
}

function createLogEntry(meta, body, type){
  const wrap = document.createElement('div'); wrap.className='log-entry'; wrap.dataset.type=type;
  const metaEl = document.createElement('div'); metaEl.className='log-meta'; metaEl.contentEditable=false; metaEl.innerText = meta || '';
  const bodyEl = document.createElement('div'); bodyEl.className='log-body'; bodyEl.contentEditable=false; bodyEl.innerHTML = body || '';
  const rem = document.createElement('button'); rem.className='remove-log'; rem.style.display='none'; rem.textContent='Remove'; rem.addEventListener('click', ()=>wrap.remove());
  wrap.appendChild(metaEl); wrap.appendChild(bodyEl); wrap.appendChild(rem);
  return wrap;
}

function enableEditing(){
  // make fields editable
  document.querySelectorAll('.editable, .log-meta, .log-body, #notesList li, #metaClass, #metaRisk, #metaLocation, #metaResponsible').forEach(el=> el.contentEditable = true);
  document.querySelectorAll('.remove-log, .remove-photo').forEach(b=> b.style.display='inline-block');
  document.getElementById('addIncidentBtn').style.display='inline-block';
  document.getElementById('addExperimentBtn').style.display='inline-block';
  document.getElementById('addPhotoBtn').style.display='inline-block';
  document.getElementById('photoAddArea').style.display='block';
  document.getElementById('notesControls').style.display='block';
  showEditorToolbar(true);
}
function disableEditing(){
  document.querySelectorAll('.editable, .log-meta, .log-body, #notesList li, #metaClass, #metaRisk, #metaLocation, #metaResponsible').forEach(el=> el.contentEditable = false);
  document.querySelectorAll('.remove-log, .remove-photo').forEach(b=> b.style.display='none');
  document.getElementById('addIncidentBtn').style.display='none';
  document.getElementById('addExperimentBtn').style.display='none';
  document.getElementById('addPhotoBtn').style.display='none';
  document.getElementById('photoAddArea').style.display='none';
  document.getElementById('notesControls').style.display='none';
  showEditorToolbar(false);
}

function showEditorToolbar(show){
  let tb = document.getElementById('editorToolbar');
  if(show && !tb){
    tb = document.createElement('div'); tb.id='editorToolbar'; tb.style.margin='8px 0'; tb.innerHTML = `<button id="tbBold" class="btn-secondary">B</button> <button id="tbItalic" class="btn-secondary">I</button> <button id="tbLink" class="btn-secondary">Link</button>`;
    document.querySelector('.an-article').insertBefore(tb, document.querySelector('.an-article').firstChild.nextSibling);
    document.getElementById('tbBold').addEventListener('click', ()=>document.execCommand('bold'));
    document.getElementById('tbItalic').addEventListener('click', ()=>document.execCommand('italic'));
    document.getElementById('tbLink').addEventListener('click', ()=>{ const url = prompt('Link URL'); if(url) document.execCommand('createLink', false, url); });
  } else if(!show && tb){ tb.remove(); }
}

// Save to localStorage and optional Firestore (if available)
async function saveDraft(){
  const data = collectData();
  try{ localStorage.setItem(KEY, JSON.stringify(data)); }
  catch(e){ console.error('save failed', e); }

  // try Firestore if configured
  try{
    if(window.firebase && window.firebase.app){
      const db = getFirestore();
      await setDoc(doc(db,'anomalies','131'), data, { merge:true });
    }
  } catch(e){ /* ignore firestore errors for now */ }
  alert('Saved locally. Use Export to download a JSON backup.');
}

function loadDraft(){
  try{
    const s = localStorage.getItem(KEY);
    if(s){ applyData(JSON.parse(s)); }
  } catch(e){ console.error('load draft failed', e); }
}

function exportJSON(){
  const data = collectData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download = `anomaly-131-${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// Add handlers
function setupHandlers(){
  const editBtn = document.getElementById('editBtn');
  const exportBtn = document.getElementById('exportBtn');
  const addIncidentBtn = document.getElementById('addIncidentBtn');
  const addExperimentBtn = document.getElementById('addExperimentBtn');
  const addPhotoBtn = document.getElementById('addPhotoBtn');
  const confirmAddPhoto = document.getElementById('confirmAddPhoto');
  const newPhotoUrl = document.getElementById('newPhotoUrl');
  const addNoteBtn = document.getElementById('addNoteBtn');

  let editing = false;
  editBtn.addEventListener('click', ()=>{
    if(!editing){
      if(!canEdit()){ alert('You are not authorized to edit this page.'); return; }
      editing = true; editBtn.textContent = 'Save';
      const cancel = document.createElement('button'); cancel.id='cancelEdit'; cancel.className='btn-secondary'; cancel.textContent='Cancel'; editBtn.parentNode.insertBefore(cancel, editBtn.nextSibling);
      cancel.addEventListener('click', ()=>{ editing=false; editBtn.textContent='Edit'; cancel.remove(); disableEditing(); loadDraft(); });
      enableEditing();
    } else {
      // Save
      saveDraft(); editing=false; editBtn.textContent='Edit'; const c = document.getElementById('cancelEdit'); if(c) c.remove(); disableEditing();
    }
  });

  exportBtn.addEventListener('click', exportJSON);

  addIncidentBtn && addIncidentBtn.addEventListener('click', ()=>{ const root = document.getElementById('incidentLogs'); const el = createLogEntry('New Incident — YYYY-MM-DD','Describe incident...','incident'); el.querySelector('.log-meta').contentEditable=true; el.querySelector('.log-body').contentEditable=true; root.appendChild(el); });
  addExperimentBtn && addExperimentBtn.addEventListener('click', ()=>{ const root = document.getElementById('experimentLogs'); const el = createLogEntry('Experiment — YYYY-MM-DD','Describe experiment...','experiment'); el.querySelector('.log-meta').contentEditable=true; el.querySelector('.log-body').contentEditable=true; root.appendChild(el); });

  addPhotoBtn && addPhotoBtn.addEventListener('click', ()=>{ document.getElementById('photoAddArea').style.display='block'; });
  confirmAddPhoto && confirmAddPhoto.addEventListener('click', ()=>{
    const url = newPhotoUrl.value.trim(); if(!url) return alert('Add a photo URL'); const root = document.getElementById('photoGrid'); const d = document.createElement('div'); d.className='photo'; d.dataset.src=url; d.style.backgroundImage = `url('${url}')`; d.innerHTML = `<button class=\"remove-photo\" style=\"display:inline-block\">✕</button>`; root.appendChild(d); newPhotoUrl.value='';
  });

  addNoteBtn && addNoteBtn.addEventListener('click', ()=>{ const li = document.createElement('li'); li.contentEditable=true; li.innerText='New note'; document.getElementById('notesList').appendChild(li); });

  // delegate remove photo
  document.getElementById('photoGrid').addEventListener('click', (e)=>{ if(e.target.classList.contains('remove-photo')) e.target.parentElement.remove(); });

  // init load draft
  loadDraft();
}

// Initialize after includesLoaded
document.addEventListener('includesLoaded', ()=>{ setupHandlers(); });

// Expose for console debugging
window._anomaly131 = { collectData, applyData, saveDraft, exportJSON };
