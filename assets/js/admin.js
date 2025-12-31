import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDocs, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const ADMIN_EMAIL = 'jedi21132@gmail.com';

document.addEventListener('includesLoaded', () => {
  const auth = getAuth();
  const db = getFirestore();

  onAuthStateChanged(auth, async (user) => {
    if (!user || user.email !== ADMIN_EMAIL) {
      // redirect non-admins
      window.location.replace('/403/');
      return;
    }

    // wired
    const pid = document.getElementById('pid');
    const pidName = document.getElementById('pidName');
    const pidClass = document.getElementById('pidClass');
    const pidClearance = document.getElementById('pidClearance');
    const pidDepartment = document.getElementById('pidDepartment');
    const pidRank = document.getElementById('pidRank');
    const pidSave = document.getElementById('pidSave');
    const pidDelete = document.getElementById('pidDelete');
    const pidFeedback = document.getElementById('pidFeedback');
    const personnelList = document.getElementById('personnelList');
    const accountsList = document.getElementById('accountsList');

    async function loadPersonnel() {
      const snaps = await getDocs(collection(db,'personnel'));
      const arr = [];
      snaps.forEach(s => arr.push({ id: s.id, ...s.data() }));
      arr.sort((a,b)=> a.id.localeCompare(b.id));
      personnelList.innerHTML = '';
      arr.forEach(p => {
        const el = document.createElement('div');
        el.style.padding = '.6rem';
        el.style.borderBottom = '1px solid rgba(255,255,255,0.02)';
        el.innerHTML = `<strong>${p.id}</strong> — ${p.name} &nbsp; <small style="opacity:.8">clear:${p.clearance} dept:${p.department} rank:${p.rank}</small> <button data-pid="${p.id}" class="pid-edit" style="margin-left:.6rem">Edit</button>`;
        personnelList.appendChild(el);
      });

      // wire edit buttons
      Array.from(document.querySelectorAll('.pid-edit')).forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = btn.dataset.pid;
          const s = await getDoc(doc(db,'personnel',id));
          if (!s.exists()) return;
          const data = s.data();
          pid.value = id;
          pidName.value = data.name || '';
          pidClass.value = data['class'] || '';
          pidClearance.value = data.clearance || '';
          pidDepartment.value = data.department || '';
          pidRank.value = data.rank || '';
        });
      });
    }

    pidSave.addEventListener('click', async () => {
      const id = (pid.value || '').trim();
      if (!id) return pidFeedback.textContent = 'Enter a Personnel ID.';
      try {
        await setDoc(doc(db,'personnel',id), {
          name: (pidName.value || '').trim(),
          class: (pidClass.value || '').trim(),
          clearance: parseInt(pidClearance.value || '0',10) || 0,
          department: (pidDepartment.value || '').trim(),
          rank: (pidRank.value || '').trim()
        });
        pidFeedback.style.color = 'var(--accent-mint)';
        pidFeedback.textContent = 'Saved.';
        loadPersonnel();
      } catch (err) {
        pidFeedback.style.color = 'var(--accent-red)';
        pidFeedback.textContent = 'Error: ' + err.message;
      }
    });

    pidDelete.addEventListener('click', async () => {
      const id = (pid.value || '').trim();
      if (!id) return pidFeedback.textContent = 'Enter a Personnel ID to delete.';
      try {
        await deleteDoc(doc(db,'personnel',id));
        pidFeedback.style.color = 'var(--accent-mint)';
        pidFeedback.textContent = 'Deleted.';
        pid.value = ''; pidName.value = ''; pidClass.value = ''; pidClearance.value = ''; pidDepartment.value = ''; pidRank.value = '';
        loadPersonnel();
      } catch (err) {
        pidFeedback.style.color = 'var(--accent-red)';
        pidFeedback.textContent = 'Error: ' + err.message;
      }
    });

    async function loadAccounts(){
      const snaps = await getDocs(collection(db,'users'));
      accountsList.innerHTML = '';
      snaps.forEach(s => {
        const data = s.data();
        const el = document.createElement('div');
        el.style.padding = '.5rem';
        el.innerHTML = `<strong>${s.id}</strong> &nbsp; ${data.email || ''}`;
        accountsList.appendChild(el);
      });
    }

    // initial load
    loadPersonnel();
    loadAccounts();
  });
});