// Employee of the Month Management
import { app, auth } from '/assets/js/auth.js';
import { getFirestore, collection, getDocs, addDoc, query, orderBy, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';

const db = getFirestore(app);
let currentUser = null;
let allPersonnel = [];
let allEOTMs = [];
let currentEOTMIndex = 0;

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    initializeEOTM();
  }
});

async function initializeEOTM() {
  await loadPersonnel();
  await loadEOTMs();
  setupEventListeners();
  checkUserLevel();
}

async function loadPersonnel() {
  try {
    const querySnapshot = await getDocs(collection(db, 'characters'));
    allPersonnel = [];
    querySnapshot.forEach((doc) => {
      const char = doc.data();
      allPersonnel.push({
        id: doc.id,
        name: char.name || 'Unknown',
        department: char.department || 'Unassigned',
        rank: char.rank || ''
      });
    });
    populatePersonnelSelect();
  } catch (e) {
    console.error('Error loading personnel:', e);
  }
}

function populatePersonnelSelect() {
  const select = document.getElementById('eotmPersonnelSelect');
  select.innerHTML = '<option value="">— Select Personnel —</option>';
  
  allPersonnel
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(person => {
      const option = document.createElement('option');
      option.value = person.id;
      option.textContent = `${person.name} (${person.department})`;
      select.appendChild(option);
    });
}

async function loadEOTMs() {
  try {
    const q = query(collection(db, 'eotm'), orderBy('monthYear', 'desc'));
    const querySnapshot = await getDocs(q);
    allEOTMs = [];
    querySnapshot.forEach((doc) => {
      allEOTMs.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    if (allEOTMs.length === 0) {
      showNoEOTM();
    } else {
      currentEOTMIndex = 0;
      displayCurrentEOTM();
    }
  } catch (e) {
    console.error('Error loading EOTMs:', e);
    showNoEOTM();
  }
}

function displayCurrentEOTM() {
  if (allEOTMs.length === 0) {
    showNoEOTM();
    return;
  }

  const eotm = allEOTMs[currentEOTMIndex];
  
  // Parse month/year string directly to avoid timezone issues
  const [year, month] = eotm.monthYear.split('-');
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const monthStr = `${monthNames[parseInt(month) - 1]} ${year}`;

  // Update sidebar display
  document.getElementById('eotmName').textContent = eotm.name;
  document.getElementById('eotmPosition').textContent = eotm.department;
  document.getElementById('eotmAchievement').textContent = eotm.reason;
  document.getElementById('eotmMonth').textContent = monthStr;

  // Update modal display
  document.getElementById('eotmDisplayMonth').textContent = monthStr;
  document.getElementById('eotmDisplayName').textContent = eotm.name;
  document.getElementById('eotmDisplayDept').textContent = eotm.department;
  document.getElementById('eotmDisplayReason').textContent = eotm.reason;

  // Update navigation
  document.getElementById('eotmIndex').textContent = currentEOTMIndex + 1;
  document.getElementById('eotmTotal').textContent = allEOTMs.length;
  document.getElementById('eotmPrevBtn').disabled = currentEOTMIndex === 0;
  document.getElementById('eotmNextBtn').disabled = currentEOTMIndex === allEOTMs.length - 1;
}

function showNoEOTM() {
  document.getElementById('eotmName').textContent = 'No Employee Selected';
  document.getElementById('eotmPosition').textContent = '—';
  document.getElementById('eotmAchievement').textContent = '';
  document.getElementById('eotmMonth').textContent = 'No record';

  document.getElementById('eotmDisplayName').textContent = 'No Employee Selected';
  document.getElementById('eotmDisplayDept').textContent = '—';
  document.getElementById('eotmDisplayReason').textContent = 'No employee of the month has been set yet.';
  document.getElementById('eotmDisplayMonth').textContent = '—';

  document.getElementById('eotmIndex').textContent = '0';
  document.getElementById('eotmTotal').textContent = '0';
  document.getElementById('eotmPrevBtn').disabled = true;
  document.getElementById('eotmNextBtn').disabled = true;
}

function setupEventListeners() {
  document.getElementById('eotmWindow')?.addEventListener('click', () => {
    document.getElementById('eotmModal').style.display = 'flex';
  });

  document.getElementById('eotmPrevBtn')?.addEventListener('click', () => {
    if (currentEOTMIndex > 0) {
      currentEOTMIndex--;
      displayCurrentEOTM();
    }
  });

  document.getElementById('eotmNextBtn')?.addEventListener('click', () => {
    if (currentEOTMIndex < allEOTMs.length - 1) {
      currentEOTMIndex++;
      displayCurrentEOTM();
    }
  });

  document.getElementById('eotmAddBtn')?.addEventListener('click', () => {
    document.getElementById('eotmAddForm').style.display = 'block';
  });

  document.getElementById('eotmCancelBtn')?.addEventListener('click', () => {
    document.getElementById('eotmAddForm').style.display = 'none';
    clearAddForm();
  });

  document.getElementById('eotmPersonnelSelect')?.addEventListener('change', (e) => {
    const selectedId = e.target.value;
    const selected = allPersonnel.find(p => p.id === selectedId);
    if (selected) {
      document.getElementById('eotmSelectedDept').textContent = `Department: ${selected.department}`;
    } else {
      document.getElementById('eotmSelectedDept').textContent = 'Department: —';
    }
  });

  document.getElementById('eotmSubmitBtn')?.addEventListener('click', submitEOTM);

  // Close modal on background click
  document.getElementById('eotmModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'eotmModal') {
      document.getElementById('eotmModal').style.display = 'none';
    }
  });
}

function clearAddForm() {
  document.getElementById('eotmPersonnelSelect').value = '';
  document.getElementById('eotmMonthInput').value = '';
  document.getElementById('eotmReasonInput').value = '';
  document.getElementById('eotmSelectedDept').textContent = 'Department: —';
}

async function submitEOTM() {
  const personnelSelect = document.getElementById('eotmPersonnelSelect');
  const monthInput = document.getElementById('eotmMonthInput');
  const reasonInput = document.getElementById('eotmReasonInput');
  const submitBtn = document.getElementById('eotmSubmitBtn');

  if (!personnelSelect.value || !monthInput.value || !reasonInput.value.trim()) {
    alert('Please fill in all fields');
    return;
  }

  const selected = allPersonnel.find(p => p.id === personnelSelect.value);
  
  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    console.log('Submitting EOTM:', {
      name: selected.name,
      department: selected.department,
      monthYear: monthInput.value,
      reason: reasonInput.value.trim(),
      createdBy: currentUser.uid
    });

    await addDoc(collection(db, 'eotm'), {
      name: selected.name,
      department: selected.department,
      monthYear: monthInput.value,
      reason: reasonInput.value.trim(),
      createdBy: currentUser.uid,
      createdAt: new Date()
    });

    alert('Employee of the Month added successfully!');
    clearAddForm();
    document.getElementById('eotmAddForm').style.display = 'none';
    await loadEOTMs();
  } catch (e) {
    console.error('Error adding EOTM:', e);
    console.error('Error code:', e.code);
    console.error('Error message:', e.message);
    alert(`Error saving employee of the month: ${e.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Employee of the Month';
  }
}

function checkUserLevel() {
  if (!currentUser) return;

  // Get user clearance level from localStorage (set by auth.js)
  const selectedCharRaw = localStorage.getItem('selectedCharacter');
  if (selectedCharRaw) {
    try {
      const char = JSON.parse(selectedCharRaw);
      const isLevel5 = char.clearance >= 5;
      const addContainer = document.getElementById('eotmAddContainer');
      if (addContainer) {
        addContainer.style.display = isLevel5 ? 'block' : 'none';
      }
    } catch (e) {
      console.error('Error checking user level:', e);
    }
  }
}
