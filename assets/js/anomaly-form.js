import { app, auth, onAuthStateChanged } from '/assets/js/auth.js';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';
import { marked } from 'https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js';
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify@3.1.2/dist/purify.es.js';

const db = getFirestore(app);
const form = document.getElementById('anomalyForm');
const statusEl = document.getElementById('formStatus');
const proceduresInput = document.getElementById('procedures');
const descriptionInput = document.getElementById('description');
const proceduresPreview = document.getElementById('proceduresPreview');
const descriptionPreview = document.getElementById('descriptionPreview');
const loadBtn = document.getElementById('loadBtn');
const clearanceInput = document.getElementById('clearanceLevel');

let currentUser = null;

function getSelectedCharacter(){ try { return JSON.parse(localStorage.getItem('selectedCharacter')); } catch(e){ return null; } }
function parseClearance(v){ if(v === undefined || v === null) return NaN; if(typeof v === 'number') return v; const s = String(v); const m = s.match(/\d+/); return m ? parseInt(m[0],10) : NaN; }
function userClearance(){ const ch = getSelectedCharacter(); return ch ? parseClearance(ch.clearance) : NaN; }
function userDepartment(){ const ch = getSelectedCharacter(); return ch && ch.department ? ch.department : ''; }
function isDeptAllowed(dept){ if(!dept) return false; const d = dept.toLowerCase().replace(/[^a-z0-9]/g, ''); return d.includes('research') || d.includes('rd') || d.includes('scien') || d.includes('scd') || d.includes('scientificdepartment'); }
function canSubmit(){ const c = userClearance(); if(!isNaN(c) && c >= 5) return true; return isDeptAllowed(userDepartment()); }
function displayName(){ const ch = getSelectedCharacter(); if(ch && ch.name) return ch.name; if(currentUser && currentUser.email) return currentUser.email; return 'Unknown'; }

function formatItemNumber(raw){ const s = (raw || '').toUpperCase().replace(/\s+/g,''); const digits = s.match(/\d+/); if(!digits) return s || 'SCP-000'; const padded = digits[0].padStart(3,'0'); return `SCP-${padded}`; }
function docIdFromItemNumber(itemNumber){ const m = (itemNumber || '').match(/\d+/); if(m) return m[0]; return (itemNumber || 'scp-000').replace(/[^A-Za-z0-9]/g,'-'); }

function renderMarkdown(md){ return DOMPurify.sanitize(marked.parse(md || '')); }
function refreshPreview(){ proceduresPreview.innerHTML = renderMarkdown(proceduresInput.value); descriptionPreview.innerHTML = renderMarkdown(descriptionInput.value); }
function setStatus(msg, isError=false){ statusEl.textContent = msg || ''; statusEl.style.color = isError ? 'var(--accent-red)' : 'var(--text-light)'; }

async function loadExisting(){ const formatted = formatItemNumber(form.itemNumber.value || ''); if(!formatted){ setStatus('Enter an item number to load.', true); return; } const docId = docIdFromItemNumber(formatted); const ref = doc(db,'anomalies',docId); const snap = await getDoc(ref); if(!snap.exists()){ setStatus('No anomaly found for that item number.', true); return; } const data = snap.data(); form.itemNumber.value = data.itemNumber || formatted; form.photoUrl.value = data.photoUrl || ''; form.containmentClass.value = data.containmentClass || ''; form.riskClass.value = data.riskClass || ''; form.disruptionClass.value = data.disruptionClass || ''; clearanceInput.value = data.clearanceLevel || ''; form.procedures.value = data.proceduresMd || ''; form.description.value = data.descriptionMd || ''; refreshPreview(); setStatus('Loaded existing entry.'); }

async function handleSubmit(e){ e.preventDefault(); if(!currentUser){ setStatus('Login is required to save.', true); return; } if(!canSubmit()){ setStatus('Only Level 5 or ScD/R&D characters can edit.', true); return; }
  const formatted = formatItemNumber(form.itemNumber.value || ''); form.itemNumber.value = formatted;
  const docId = docIdFromItemNumber(formatted);
  const ref = doc(db,'anomalies',docId);
  const snap = await getDoc(ref);

  const clearanceLevel = parseClearance(clearanceInput.value || '');
  if(Number.isNaN(clearanceLevel)){ setStatus('Select a clearance level for viewing.', true); return; }

  const payload = {
    itemNumber: formatted,
    containmentClass: form.containmentClass.value,
    riskClass: form.riskClass.value,
    disruptionClass: form.disruptionClass.value,
    clearanceLevel,
    photoUrl: (form.photoUrl.value || '').trim(),
    proceduresMd: form.procedures.value || '',
    descriptionMd: form.description.value || '',
    updatedAt: serverTimestamp(),
    createdByUid: snap.exists() ? (snap.data().createdByUid || currentUser.uid) : currentUser.uid,
    createdByEmail: snap.exists() ? (snap.data().createdByEmail || currentUser.email || '') : (currentUser.email || ''),
    createdByDisplay: snap.exists() ? (snap.data().createdByDisplay || displayName()) : displayName(),
    updatedByUid: currentUser.uid,
    updatedByEmail: currentUser.email,
    updatedByDisplay: displayName()
  };

  if(!snap.exists()) payload.createdAt = serverTimestamp();

  try{
    await setDoc(ref, payload, { merge:true });
    const viewUrl = `/anomalies/view/?id=${encodeURIComponent(docId)}`;
    statusEl.innerHTML = `Saved. <a href="${viewUrl}">Open entry</a>`;
  } catch(err){
    console.error('Error saving anomaly', err);
    setStatus(`Error: ${err.message}`, true);
  }
}

function init(){ if(!form) return; refreshPreview();
  [proceduresInput, descriptionInput].forEach(el=> el.addEventListener('input', refreshPreview));
  loadBtn?.addEventListener('click', loadExisting);
  form.addEventListener('submit', handleSubmit);

  onAuthStateChanged(auth, (user)=>{ currentUser = user; if(!user){ setStatus('Login is required to save.', true); } else { setStatus(''); } });

  const params = new URLSearchParams(window.location.search);
  const idParam = params.get('id') || params.get('item');
  if(idParam){ form.itemNumber.value = formatItemNumber(idParam); loadExisting(); }
}
let booted = false;
function kickoff(){ if(booted) return; booted = true; init(); }

document.addEventListener('includesLoaded', kickoff);
document.addEventListener('DOMContentLoaded', kickoff);
