import { app } from "./auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);

// Helper functions
function getSelectedCharacter(){ try { return JSON.parse(localStorage.getItem('selectedCharacter')); } catch(e){ return null; } }
function parseClearance(v){ if(v === undefined || v === null) return NaN; if(typeof v === 'number') return v; const s = String(v); const m = s.match(/\d+/); return m ? parseInt(m[0],10) : NaN; }
function userClearance(){ const ch = getSelectedCharacter(); return ch ? parseClearance(ch.clearance) : NaN; }
function userDepartment(){ const ch = getSelectedCharacter(); return ch && ch.department ? ch.department : ''; }
function isDeptAllowed(dept){ 
  if(!dept) return false; 
  const d = dept.toLowerCase().replace(/[^a-z0-9]/g, ''); 
  return d.includes('ia') || d.includes('internalaffairs') || d.includes('raisa'); 
}
function canEdit(){ const c = userClearance(); if(!isNaN(c) && c >= 5) return true; return isDeptAllowed(userDepartment()); }
function displayName(){ const ch = getSelectedCharacter(); return ch ? (ch.name || auth.currentUser?.email || 'Unknown') : (auth.currentUser?.email || 'Unknown'); }
function formatDate(ts){ if(!ts) return ''; try { return new Date(ts.seconds * 1000).toLocaleDateString(); } catch(e){ return ''; } }

// State
let cases = [];
let currentCaseId = null;
let versions = []; // Array of {clearance: number, content: string}

// DOM elements
const searchInput = document.getElementById('cfSearch');
const newBtn = document.getElementById('cfNewBtn');
const modal = document.getElementById('cfModal');
const modalTitle = document.getElementById('cfModalTitle');
const closeBtn = document.getElementById('cfCloseBtn');
const cancelBtn = document.getElementById('cfCancelBtn');
const loadBtn = document.getElementById('cfLoadBtn');
const addVersionBtn = document.getElementById('cfAddVersion');
const versionsContainer = document.getElementById('cfVersionsContainer');
const form = document.getElementById('cfForm');
const caseIdInput = document.getElementById('cfCaseId');
const dateInput = document.getElementById('cfDate');
const clearanceInput = document.getElementById('cfClearance');
const subjectInput = document.getElementById('cfSubject');
const statusDiv = document.getElementById('cfStatus');
const tableBody = document.getElementById('cfTableBody');

const viewModal = document.getElementById('cfViewModal');
const viewTitle = document.getElementById('cfViewTitle');
const viewMeta = document.getElementById('cfViewMeta');
const viewContent = document.getElementById('cfViewContent');
const viewCloseBtn = document.getElementById('cfViewCloseBtn');
const editBtn = document.getElementById('cfEditBtn');

function setStatus(msg, isError = false){
  statusDiv.textContent = msg;
  statusDiv.style.color = isError ? 'var(--accent-red)' : 'var(--accent-mint)';
}

function resetForm(){
  form.reset();
  currentCaseId = null;
  modalTitle.textContent = 'New Case Report';
  versions = [];
  renderVersions();
  setStatus('');
}

// Version management
function addVersion(){
  const defaultContent = `# SUMMARY
Brief overview of the case...

# SUBJECT
Details about the subject...

# AGENTS INVOLVED
List of agents involved in the case...

# INVOLVED DEPARTMENT
Departments involved in the investigation...

# DESCRIPTION

## Initial Investigation
Details about the initial investigation phase...

## Findings
Key findings and evidence...`;
  
  versions.push({ clearance: 1, content: defaultContent });
  renderVersions();
}

function removeVersion(index){
  versions.splice(index, 1);
  renderVersions();
}

// Expose removeVersion globally for inline handlers
window.cfRemoveVersion = removeVersion;

function renderVersions(){
  if(!versionsContainer) return;
  
  versionsContainer.innerHTML = versions.map((v, i) => `
    <div class="cf-version-block">
      <div class="cf-version-header">
        <div class="cf-version-label">Version ${i + 1} - Clearance Level</div>
        <button type="button" class="cf-version-remove" onclick="window.cfRemoveVersion(${i})">✕ Remove</button>
      </div>
      <select class="cf-version-clearance" data-index="${i}" style="width:100%;padding:.6rem;margin-bottom:.5rem;background:var(--bg-card);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:var(--text-primary)">
        <option value="0" ${v.clearance === 0 ? 'selected' : ''}>Level 0 (Public)</option>
        <option value="1" ${v.clearance === 1 ? 'selected' : ''}>Level 1</option>
        <option value="2" ${v.clearance === 2 ? 'selected' : ''}>Level 2</option>
        <option value="3" ${v.clearance === 3 ? 'selected' : ''}>Level 3</option>
        <option value="4" ${v.clearance === 4 ? 'selected' : ''}>Level 4</option>
        <option value="5" ${v.clearance === 5 ? 'selected' : ''}>Level 5 (Restricted)</option>
      </select>
      <div class="cf-version-grid">
        <div class="cf-version-editor">
          <div style="font-weight:600;margin-bottom:.5rem">Markdown Editor</div>
          <textarea class="cf-version-content" data-index="${i}" placeholder="Content for this clearance level...">${v.content}</textarea>
        </div>
        <div>
          <div style="font-weight:600;margin-bottom:.5rem">Live Preview</div>
          <div class="cf-version-preview" id="cfpreview-${i}"></div>
        </div>
      </div>
    </div>
  `).join('');
  
  // Wire up event listeners
  document.querySelectorAll('.cf-version-clearance').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.index);
      versions[index].clearance = parseInt(e.target.value);
    });
  });
  
  document.querySelectorAll('.cf-version-content').forEach(textarea => {
    textarea.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.index);
      versions[index].content = e.target.value;
      updateVersionPreview(index);
    });
  });
  
  // Update all previews
  versions.forEach((v, i) => updateVersionPreview(i));
}

function updateVersionPreview(index){
  const previewEl = document.getElementById(`cfpreview-${index}`);
  if(!previewEl || !window.marked) return;
  const content = versions[index]?.content || '';
  previewEl.innerHTML = content ? window.marked.parse(content) : '<em>Preview will appear here...</em>';
}

// Helper to get appropriate version for user
function getVersionForUser(caseReport){
  console.log('🔍 getVersionForUser called', { 
    caseId: caseReport.caseId, 
    hasVersions: !!caseReport.versions, 
    versionCount: caseReport.versions?.length 
  });
  
  if(!caseReport.versions || caseReport.versions.length === 0) {
    console.log('📜 No versions available');
    return { clearance: 0, content: '' };
  }

  const uClear = userClearance();
  console.log('👤 User clearance:', uClear);
  
  // Sort versions by clearance (descending)
  const sorted = [...caseReport.versions].sort((a, b) => b.clearance - a.clearance);
  console.log('📊 Sorted versions:', sorted.map(v => ({ clearance: v.clearance, contentLength: v.content?.length })));
  
  // Find highest version user can access
  for(const ver of sorted){
    if(ver.clearance <= uClear){
      console.log('✅ Found accessible version at clearance:', ver.clearance);
      return ver;
    }
  }
  
  // Fallback to lowest clearance version
  const lowest = sorted[sorted.length - 1];
  console.log('⚠️ No accessible version, using lowest:', lowest.clearance);
  return lowest;
}

// Render table
function renderTable(){
  if(!tableBody) return;
  
  const searchTerm = searchInput?.value.toLowerCase() || '';
  const filtered = cases.filter(c => {
    if(!searchTerm) return true;
    return (
      c.caseId?.toLowerCase().includes(searchTerm) ||
      c.subject?.toLowerCase().includes(searchTerm) ||
      c.department?.toLowerCase().includes(searchTerm)
    );
  });

  if(filtered.length === 0){
    tableBody.innerHTML = '<tr><td colspan="4" class="cf-empty">No case reports found.</td></tr>';
    return;
  }

  tableBody.innerHTML = filtered.map(c => {
    const date = c.date || 'N/A';
    const dept = c.department || 'N/A';
    return `
      <tr onclick="window.cfViewCase('${c.id}')">
        <td><span class="cf-link">${c.caseId || 'N/A'}</span></td>
        <td>${c.subject || 'Untitled'}</td>
        <td>${dept}</td>
        <td>${date}</td>
      </tr>
    `;
  }).join('');
}

// Load cases from Firestore
async function loadCases(){
  try {
    const q = query(collection(db, 'caseFiles'), orderBy('createdAt', 'desc'));
    onSnapshot(q, (snapshot) => {
      cases = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('📁 Loaded cases:', cases.length);
      renderTable();
    }, (error) => {
      console.error('Error loading cases:', error);
      tableBody.innerHTML = '<tr><td colspan="4" class="cf-empty">Error loading case reports.</td></tr>';
    });
  } catch(error){
    console.error('Error setting up cases listener:', error);
    tableBody.innerHTML = '<tr><td colspan="4" class="cf-empty">Error loading case reports.</td></tr>';
  }
}

// View case
async function viewCase(caseId){
  const caseReport = cases.find(c => c.id === caseId);
  if(!caseReport) return;

  const version = getVersionForUser(caseReport);
  
  viewTitle.textContent = `${caseReport.caseId || 'Case Report'}`;
  viewMeta.innerHTML = `
    <strong>Date:</strong> ${caseReport.date || 'N/A'} | 
    <strong>Subject:</strong> ${caseReport.subject || 'N/A'} | 
    <strong>Author:</strong> ${caseReport.author || 'Unknown'} | 
    <strong>Viewing Clearance Level:</strong> ${version.clearance}
  `;
  
  // Format content with case report structure
  let html = '';
  if(version.content && window.marked){
    html = `
      <div class="case-header">
        <div class="case-id">${caseReport.caseId || 'Case Report'}</div>
        <div class="case-date">${caseReport.date || 'Date Unknown'}</div>
      </div>
    `;
    
    // Parse markdown and wrap sections
    const parsed = window.marked.parse(version.content);
    html += parsed;
  } else {
    html = '<em>No content available at your clearance level.</em>';
  }
  
  viewContent.innerHTML = html;

  // Show edit button if user can edit
  if(canEdit()){
    editBtn.style.display = 'inline-block';
    editBtn.onclick = () => {
      closeViewModal();
      openEditModal(caseId);
    };
  } else {
    editBtn.style.display = 'none';
  }

  viewModal.setAttribute('aria-hidden', 'false');
}

window.cfViewCase = viewCase;

function closeViewModal(){
  viewModal.setAttribute('aria-hidden', 'true');
}

// Open modal for new case
function openNewModal(){
  resetForm();
  // Set default date to today
  if(dateInput){
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }
  // Add one default version
  if(versions.length === 0){
    addVersion();
  }
  modal.setAttribute('aria-hidden', 'false');
}

// Open modal for editing
async function openEditModal(caseId){
  const caseReport = cases.find(c => c.id === caseId);
  if(!caseReport) return;

  currentCaseId = caseId;
  modalTitle.textContent = 'Edit Case Report';
  
  caseIdInput.value = caseReport.caseId || '';
  dateInput.value = caseReport.date || '';
  clearanceInput.value = caseReport.clearance || '1';
  subjectInput.value = caseReport.subject || '';
  
  versions = caseReport.versions || [];
  if(versions.length === 0){
    addVersion();
  }
  renderVersions();
  
  modal.setAttribute('aria-hidden', 'false');
}

// Load existing case
async function loadExisting(){
  const caseId = prompt('Enter case ID to load:');
  if(!caseId) return;
  
  const caseReport = cases.find(c => c.id === caseId || c.caseId === caseId);
  if(caseReport){
    openEditModal(caseReport.id);
  } else {
    alert('Case report not found.');
  }
}

// Save case
async function saveCase(e){
  e.preventDefault();
  if(!auth.currentUser){
    setStatus('You must be logged in to save case reports.', true);
    return;
  }

  if(!canEdit()){
    setStatus('You do not have permission to create/edit case reports. Requires IA or RAISA department membership.', true);
    return;
  }

  const caseIdVal = caseIdInput.value.trim();
  const dateVal = dateInput.value;
  const clearanceVal = parseInt(clearanceInput.value);
  const subjectVal = subjectInput.value.trim();

  if(!caseIdVal || !dateVal || !subjectVal){
    setStatus('Please fill in all required fields.', true);
    return;
  }

  if(versions.length === 0){
    setStatus('Please add at least one content version.', true);
    return;
  }

  // Extract department from case content for metadata
  let department = 'Internal Affairs';
  const firstVersion = versions[0];
  if(firstVersion && firstVersion.content){
    const deptMatch = firstVersion.content.match(/# INVOLVED DEPARTMENT\s*\n\s*([^\n]+)/i);
    if(deptMatch){
      department = deptMatch[1].trim();
    }
  }

  const docId = currentCaseId || caseIdVal.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  
  try {
    setStatus('Saving...');
    
    const data = {
      caseId: caseIdVal,
      date: dateVal,
      clearance: clearanceVal,
      subject: subjectVal,
      department: department,
      author: displayName(),
      versions: versions.map(v => ({ clearance: v.clearance, content: v.content })),
      updatedAt: serverTimestamp()
    };

    if(!currentCaseId){
      data.createdAt = serverTimestamp();
    }

    await setDoc(doc(db, 'caseFiles', docId), data, { merge: true });
    
    setStatus('✓ Case report saved successfully!');
    setTimeout(() => {
      modal.setAttribute('aria-hidden', 'true');
      resetForm();
    }, 1500);
  } catch(error){
    console.error('Error saving case:', error);
    setStatus('Error saving case report: ' + error.message, true);
  }
}

// Event listeners
if(searchInput) searchInput.addEventListener('input', renderTable);
if(newBtn) newBtn.addEventListener('click', openNewModal);
if(closeBtn) closeBtn.addEventListener('click', () => modal.setAttribute('aria-hidden', 'true'));
if(viewCloseBtn) viewCloseBtn.addEventListener('click', closeViewModal);
if(cancelBtn) cancelBtn.addEventListener('click', () => modal.setAttribute('aria-hidden', 'true'));
if(loadBtn) loadBtn.addEventListener('click', loadExisting);
if(addVersionBtn) addVersionBtn.addEventListener('click', addVersion);
if(form) form.addEventListener('submit', saveCase);

// Close modals on outside click
if(modal) modal.addEventListener('click', (e) => {
  if(e.target === modal) modal.setAttribute('aria-hidden', 'true');
});
if(viewModal) viewModal.addEventListener('click', (e) => {
  if(e.target === viewModal) closeViewModal();
});

// Initialize
auth.onAuthStateChanged(() => {
  const canUserEdit = canEdit();
  if(newBtn) newBtn.style.display = canUserEdit ? 'inline-block' : 'none';
  loadCases();
});
