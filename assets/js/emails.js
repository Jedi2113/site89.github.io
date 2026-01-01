import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, query, where, orderBy, getDocs, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Helper: Build character email address from name: lastname.firstname@site89.org
function emailFromName(name){
  if(!name) return '';
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ? parts[0].toLowerCase().replace(/[^a-z]/g,'') : '';
  const last = parts.length>1 ? parts[parts.length-1].toLowerCase().replace(/[^a-z]/g,'') : first;
  return `${last}.${first}@site89.org`;
}

// Friendly date (handles Firestore Timestamp objects too)
function fmtDate(ts){
  if(!ts) return '';
  if (ts && typeof ts.toDate === 'function') return ts.toDate().toLocaleString();
  return new Date(ts).toLocaleString();
}

document.addEventListener('includesLoaded', () => {
  const auth = getAuth();
  const db = getFirestore();

  const myAddressEl = document.getElementById('myAddress');
  const messagesContainer = document.getElementById('messagesContainer');
  const folderEls = Array.from(document.querySelectorAll('.folder'));
  const composeBtn = document.getElementById('composeBtn');
  const composeModal = document.getElementById('composeModal');
  const composeClose = document.getElementById('composeClose');
  const sendBtn = document.getElementById('sendBtn');
  const saveDraftBtn = document.getElementById('saveDraftBtn');
  const composeTo = document.getElementById('composeTo');
  const composeSubject = document.getElementById('composeSubject');
  const composeBody = document.getElementById('composeBody');
  const mailSearch = document.getElementById('mailSearch');
  const mailSubject = document.getElementById('mailSubject');
  const mailContent = document.getElementById('mailContent');
  const mailSender = document.getElementById('mailSender');
  const mailMeta = document.getElementById('mailMeta');
  const btnReply = document.getElementById('btnReply');
  const btnForward = document.getElementById('btnForward');
  const btnDelete = document.getElementById('btnDelete');

  let currentFolder = 'inbox';
  let myAddress = '';
  let currentMessage = null;
  let allMessages = [];
  let emailsUnsubscribe = null; // for real-time listener

  function isValidEmail(e){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  function setActiveFolder(name){
    folderEls.forEach(f => f.classList.toggle('active', f.dataset.folder === name));
    currentFolder = name;
    renderList();
  }

  folderEls.forEach(f => f.addEventListener('click', ()=> setActiveFolder(f.dataset.folder)));

  composeBtn.addEventListener('click', ()=> { composeModal.style.display = 'block'; composeTo.focus(); });
  composeClose.addEventListener('click', ()=> { composeModal.style.display = 'none'; clearCompose(); });

  function clearCompose(){ composeTo.value=''; composeSubject.value=''; composeBody.value=''; }

  async function sendMessage(status='sent'){
    const toRaw = (composeTo.value||'').split(',').map(s=>s.trim()).filter(Boolean);
    if (!toRaw.length) return alert('Add at least one recipient');
    // Basic validation
    for (const r of toRaw){ if(!isValidEmail(r)) return alert('Invalid recipient email: ' + r); }
    if(!myAddress) return alert('No sender address set. Select a character or sign in.');

    // disable buttons while sending
    sendBtn.disabled = true; saveDraftBtn.disabled = true;

    const payload = {
      sender: myAddress,
      recipients: toRaw,
      subject: composeSubject.value || '(no subject)',
      body: composeBody.value || '',
      status: status, // 'sent' or 'draft'
      folder: status === 'draft' ? 'drafts' : '',
      ts: serverTimestamp()
    };

    try {
      await addDoc(collection(db,'emails'), payload);
    } catch(e){
      console.error('send failed', e); alert('Failed to send message');
    } finally {
      sendBtn.disabled = false; saveDraftBtn.disabled = false;
      composeModal.style.display = 'none';
      clearCompose();
    }
  }

  sendBtn.addEventListener('click', ()=> sendMessage('sent'));
  saveDraftBtn.addEventListener('click', ()=> sendMessage('draft'));

  mailSearch.addEventListener('input', ()=> renderList());

  btnDelete.addEventListener('click', async ()=>{
    if(!currentMessage) return;
    try{
      if(currentMessage.folder === 'trash'){
        await deleteDoc(doc(db,'emails',currentMessage.id));
      } else {
        await updateDoc(doc(db,'emails',currentMessage.id), { folder: 'trash' });
      }
      currentMessage = null; mailSubject.textContent='Select a message'; mailContent.textContent='';
    } catch(e){ console.warn('delete failed', e); alert('Could not delete message'); }
  });

  btnReply.addEventListener('click', ()=>{
    if(!currentMessage) return;
    composeModal.style.display='block';
    composeTo.value = currentMessage.sender;
    composeSubject.value = 'Re: ' + (currentMessage.subject||'');
    composeBody.value = `\n\n--- On ${fmtDate(currentMessage.ts)} ${currentMessage.sender} wrote: ---\n${currentMessage.body}`;
  });

  btnForward.addEventListener('click', ()=>{
    if(!currentMessage) return;
    composeModal.style.display='block';
    composeTo.value = '';
    composeSubject.value = 'Fwd: ' + (currentMessage.subject||'');
    composeBody.value = `\n\n--- Forwarded message ---\nFrom: ${currentMessage.sender}\nDate: ${fmtDate(currentMessage.ts)}\n\n${currentMessage.body}`;
  });

  // Render list depending on folder
  function renderList(){
    const q = (mailSearch.value||'').toLowerCase();
    const list = allMessages.filter(m => {
      if (currentFolder === 'inbox') return (m.recipients || []).includes(myAddress) && m.folder !== 'trash' && m.status !== 'draft';
      if (currentFolder === 'drafts') return m.status === 'draft' && m.sender === myAddress;
      if (currentFolder === 'sent') return m.sender === myAddress && m.folder !== 'trash' && m.status !== 'draft';
      if (currentFolder === 'trash') return m.folder === 'trash' && (m.sender === myAddress || (m.recipients || []).includes(myAddress));
      return false;
    }).filter(m => (m.subject||'').toLowerCase().includes(q) || (m.body||'').toLowerCase().includes(q) || (m.sender||'').toLowerCase().includes(q));

    // counts
    document.getElementById('countInbox').textContent = allMessages.filter(m => (m.recipients||[]).includes(myAddress) && m.folder !== 'trash' && m.status !== 'draft').length;
    document.getElementById('countDrafts').textContent = allMessages.filter(m => m.status === 'draft' && m.sender === myAddress).length;
    document.getElementById('countSent').textContent = allMessages.filter(m => m.sender === myAddress && m.folder !== 'trash').length;
    document.getElementById('countTrash').textContent = allMessages.filter(m => m.folder === 'trash' && (m.sender === myAddress || (m.recipients||[]).includes(myAddress))).length;

    messagesContainer.innerHTML = '';
    list.sort((a,b)=> (b.ts||0) - (a.ts||0));
    list.forEach(m => {
      const el = document.createElement('div');
      el.className = 'message-item'+ (m.read ? '' : ' unread');
      el.innerHTML = `<div style="width:44px;height:44px;border-radius:6px;background:linear-gradient(135deg,var(--accent-mint),var(--accent-teal));display:flex;align-items:center;justify-content:center;color:#081413;font-weight:700">${(m.sender||'').charAt(0)||''}</div>
        <div class="meta">
          <div style="display:flex;justify-content:space-between;align-items:center"><div class="subject">${m.subject}</div><div style="font-size:.85rem;color:var(--text-light);opacity:.8">${fmtDate(m.ts)}</div></div>
          <div style="margin-top:.25rem"><div style="color:var(--text-light);opacity:.9">${m.sender}</div><div class="snippet">${(m.body||'').slice(0,120)}</div></div>
        </div>`;
      el.addEventListener('click', ()=> openMessage(m));
      messagesContainer.appendChild(el);
    });
  }

  async function openMessage(m){
    currentMessage = m;
    mailSubject.textContent = m.subject;
    mailContent.textContent = m.body;
    mailSender.textContent = `${m.sender} → ${ (m.recipients||[]).join(', ') }`;
    mailMeta.textContent = fmtDate(m.ts);
    const md = document.getElementById('mailDate'); if(md) md.textContent = fmtDate(m.ts);

    // mark read if I'm recipient
    if ((m.recipients||[]).includes(myAddress) && !m.read){
      try { await updateDoc(doc(db,'emails',m.id), { read: true }); }
      catch(e){ console.warn('mark read failed', e); }
    }
  }

  // Real-time listener for emails collection
  function startRealtimeMessages(){
    if (emailsUnsubscribe) emailsUnsubscribe();
    const q = query(collection(db,'emails'), orderBy('ts','desc'));
    emailsUnsubscribe = onSnapshot(q, (snapshot) => {
      allMessages = [];
      snapshot.forEach(s => { allMessages.push({ id: s.id, ...s.data() }); });
      renderList();
    }, (err) => { console.warn('emails listener error', err); });
  }

  // If DB empty, create a tiny demo exchange
  async function ensureSampleData(){
    const snaps = await getDocs(collection(db,'emails'));
    if (snaps.empty){
      await addDoc(collection(db,'emails'), { sender: 'director@site89.org', recipients: [myAddress], subject: 'Welcome to Site‑89 Mail', body: 'This is a demo message. Use Compose to send test emails between characters.', status: 'sent', ts: serverTimestamp() });
      await addDoc(collection(db,'emails'), { sender: myAddress, recipients: ['director@site89.org'], subject: 'Re: Welcome', body: 'Thanks — message received.', status: 'sent', ts: serverTimestamp() });
    }
  }

  // Auth and address detection
  onAuthStateChanged(auth, async (user) => {
    // Use selectedCharacter if present, otherwise fallback to user email
    let selected = null;
    try { selected = JSON.parse(localStorage.getItem('selectedCharacter')); } catch(e){ selected = null; }
    if (selected && selected.name){
      myAddress = emailFromName(selected.name);
    } else if (user && user.email){
      myAddress = user.email;
    } else {
      myAddress = '';
    }

    myAddressEl.innerHTML = `Signed in as — <strong>${myAddress || 'anonymous'}</strong>`;

    if(!myAddress){
      // no identity; show notice and stop any active listener
      messagesContainer.innerHTML = '<div style="padding:1rem;color:var(--text-light);opacity:.9">Select a character from your account first to use Mail.</div>';
      if (emailsUnsubscribe){ emailsUnsubscribe(); emailsUnsubscribe = null; }
      return;
    }

    await ensureSampleData();
    startRealtimeMessages();
  });

});