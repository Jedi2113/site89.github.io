import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDocs, getDoc, deleteDoc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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
    const charactersList = document.getElementById('charactersList');
    const charSearchInput = document.getElementById('charSearchInput');

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

    // Load and display all characters with their account links
    async function loadCharacters() {
      try {
        const snaps = await getDocs(collection(db, 'characters'));
        const characters = [];
        snaps.forEach(s => {
          characters.push({ id: s.id, ...s.data() });
        });
        
        // Sort by name
        characters.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        
        displayCharacters(characters);
      } catch (err) {
        console.error("Error loading characters:", err);
        charactersList.innerHTML = `<div style="color:var(--accent-red)">Error loading characters</div>`;
      }
    }

    function displayCharacters(characters) {
      charactersList.innerHTML = '';
      if (characters.length === 0) {
        charactersList.innerHTML = '<div>No characters found.</div>';
        return;
      }

      characters.forEach(char => {
        const el = document.createElement('div');
        el.style.cssText = 'padding:0.8rem;border-bottom:1px solid rgba(255,255,255,0.02);display:flex;justify-content:space-between;align-items:center;gap:1rem;';
        
        const linkedUID = char.linkedUID || 'Not linked';
        const displayUID = linkedUID === 'Not linked' ? linkedUID : linkedUID.substring(0, 12) + '...';
        
        el.innerHTML = `
          <div style="flex:1;">
            <strong>${char.name || 'Unknown'}</strong> 
            <small style="opacity:0.8;display:block;margin-top:0.2rem;">
              ID: ${char.id.substring(0, 8)}... | Linked: ${displayUID} | Dept: ${char.department || 'N/A'}
            </small>
          </div>
          <button class="char-unlink-btn" data-char-id="${char.id}" data-char-name="${char.name || 'Unknown'}" style="padding:0.4rem 0.8rem;background:var(--accent-red);border:none;border-radius:4px;color:white;cursor:pointer;font-size:0.85rem;">Unlink</button>
        `;
        charactersList.appendChild(el);
      });

      // Wire up unlink buttons
      document.querySelectorAll('.char-unlink-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const charId = btn.dataset.charId;
          const charName = btn.dataset.charName;
          
          if (!confirm(`Unlink character "${charName}" from its account? This will allow it to be linked to another account.`)) {
            return;
          }

          try {
            await updateDoc(doc(db, 'characters', charId), {
              linkedUID: null
            });
            alert(`Character "${charName}" has been unlinked.`);
            loadCharacters();
          } catch (err) {
            alert(`Error unlinking character: ${err.message}`);
          }
        });
      });
    }

    // Search/filter characters
    charSearchInput?.addEventListener('input', async () => {
      const searchTerm = charSearchInput.value.toLowerCase().trim();
      
      try {
        const snaps = await getDocs(collection(db, 'characters'));
        let characters = [];
        snaps.forEach(s => {
          characters.push({ id: s.id, ...s.data() });
        });

        if (searchTerm) {
          characters = characters.filter(char => 
            (char.name || '').toLowerCase().includes(searchTerm) ||
            (char.linkedUID || '').toLowerCase().includes(searchTerm)
          );
        }

        // Sort by name
        characters.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        displayCharacters(characters);
      } catch (err) {
        console.error("Error searching characters:", err);
      }
    });

    // initial load
    loadPersonnel();
    loadAccounts();
    loadCharacters();
  });
});