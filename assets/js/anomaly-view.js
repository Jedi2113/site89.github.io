import { app } from '/assets/js/auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';
import { marked } from 'https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js';

const db = getFirestore(app);
const titleEl = document.getElementById('anomalyTitle');
const itemNumEl = document.getElementById('itemNum');
const clearanceTextEl = document.getElementById('clearanceText');
const clearanceLinesContainer = document.getElementById('clearanceLinesContainer');
const classesGridEl = document.getElementById('classesGrid');
const proceduresRender = document.getElementById('proceduresRender');
const descriptionRender = document.getElementById('descriptionRender');
const photoArea = document.getElementById('photoArea');
const creditsRender = document.getElementById('creditsRender');

function getSelectedCharacter(){ try { return JSON.parse(localStorage.getItem('selectedCharacter')); } catch(e){ return null; } }
function parseClearance(v){ if(v === undefined || v === null) return NaN; if(typeof v === 'number') return v; const s = String(v); const m = s.match(/\d+/); return m ? parseInt(m[0],10) : NaN; }
function userClearance(){ const ch = getSelectedCharacter(); return ch ? parseClearance(ch.clearance) : NaN; }
function userDepartment(){ const ch = getSelectedCharacter(); return ch && ch.department ? ch.department : ''; }
function isDeptAllowed(dept){ if(!dept) return false; const d = dept.toLowerCase(); return d.includes('research') || d.includes('r&d') || d.includes('scien') || d.includes('scd') || d.includes('rnd'); }
function displayName(){ const ch = getSelectedCharacter(); if(ch && ch.name) return ch.name; return 'Unknown'; }

function formatItemNumber(raw){ const s = (raw || '').toUpperCase().replace(/\s+/g,''); const digits = s.match(/\d+/); if(!digits) return s || 'SCP-000'; const padded = digits[0].padStart(3,'0'); return `SCP-${padded}`; }
function docIdFromItemNumber(itemNumber){ const m = (itemNumber || '').match(/\d+/); if(m) return m[0]; return (itemNumber || 'scp-000').replace(/[^A-Za-z0-9]/g,'-'); }
function renderMarkdown(md){ return marked.parse(md || ''); }

function renderMeta(data){
  const itemNum = (data.itemNumber || 'SCP-000').replace(/[^\d]/g, '').padStart(3, '0');
  itemNumEl.textContent = itemNum;
  const clearanceLevel = data.clearanceLevel || 0;
  clearanceTextEl.textContent = `LEVEL ${clearanceLevel} RESTRICTED`;
  
  // Create clearance lines based on level
  clearanceLinesContainer.innerHTML = '';
  for(let i = 0; i < clearanceLevel; i++){
    const line = document.createElement('div');
    line.className = `an-clearance-line level-${clearanceLevel}`;
    clearanceLinesContainer.appendChild(line);
  }
  
  classesGridEl.innerHTML = '';
  const classes = [
    { label: 'Containment Class', value: data.containmentClass || '?' },
    { label: 'Risk Class', value: data.riskClass || '?' },
    { label: 'Disruption Class', value: data.disruptionClass || '?' }
  ];
  
  classes.forEach(cls => {
    const box = document.createElement('div');
    box.className = 'an-class-box';
    box.innerHTML = `<div class="an-class-label">${cls.label}</div><div class="an-class-value">${cls.value}</div>`;
    classesGridEl.appendChild(box);
  });
}

function renderPhoto(url){ if(url){ const img = document.createElement('img'); img.src = url; img.alt = 'Anomaly photo'; photoArea.innerHTML=''; photoArea.appendChild(img); } else { photoArea.textContent = 'No photo provided.'; } }

function formatDate(ts){ try{ if(!ts) return 'Unknown'; const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleString(); } catch(e){ return 'Unknown'; } }

function renderCredits(data){ if(!creditsRender) return; const createdBy = data.createdByDisplay || data.createdByEmail || 'Unknown'; const updatedBy = data.updatedByDisplay || data.updatedByEmail || createdBy; const createdAt = formatDate(data.createdAt); const updatedAt = formatDate(data.updatedAt); creditsRender.innerHTML = `Created by <strong>${createdBy}</strong> on ${createdAt}. Last updated by <strong>${updatedBy}</strong> on ${updatedAt}.`; }

async function loadAnomaly(){ const params = new URLSearchParams(window.location.search); const rawId = params.get('id') || ''; if(!rawId){ titleEl.textContent = 'Missing anomaly id'; proceduresRender.textContent = 'Provide an id query parameter, e.g., ?id=131'; return; }
  try{
    const itemNumber = formatItemNumber(rawId);
    const docId = docIdFromItemNumber(itemNumber);
    const ref = doc(db,'anomalies',docId);
    const snap = await getDoc(ref);
    if(!snap.exists()){ titleEl.textContent = `${itemNumber} not found`; proceduresRender.textContent = 'No entry found. Use the create page to add one.'; descriptionRender.textContent = ''; classesGridEl.innerHTML=''; renderPhoto(''); return; }
    const data = snap.data();

    // clearance gate
    const required = parseClearance(data.clearanceLevel || 1);
    const userC = userClearance();
    if(required && (!isDeptAllowed(userDepartment()) && (Number.isNaN(userC) || userC < required))){
      titleEl.textContent = 'Restricted file';
      proceduresRender.textContent = `Requires clearance Level ${required} or ScD/R&D assignment.`;
      descriptionRender.textContent = '';
      classesGridEl.innerHTML = '';
      renderPhoto('');
      creditsRender.innerHTML = '';
      return;
    }

    titleEl.textContent = data.itemNumber || itemNumber;
    proceduresRender.innerHTML = renderMarkdown(data.proceduresMd);
    descriptionRender.innerHTML = renderMarkdown(data.descriptionMd);
    renderMeta(data);
    renderPhoto(data.photoUrl);
    renderCredits(data);
  } catch(err){
    titleEl.textContent = 'Error loading anomaly';
    proceduresRender.textContent = err.message;
    descriptionRender.textContent = '';
    classesGridEl.innerHTML='';
    renderPhoto('');
    if(creditsRender) creditsRender.textContent = '';
  }
}
let booted = false;
function kickoff(){ if(booted) return; booted = true; loadAnomaly(); }

document.addEventListener('includesLoaded', kickoff);
document.addEventListener('DOMContentLoaded', kickoff);
