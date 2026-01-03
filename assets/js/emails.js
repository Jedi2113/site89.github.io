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

// Helper: Get divisions a character can send from (clearance 5+ for their division)
function getDirectorDivisions(){
  try {
    const ch = JSON.parse(localStorage.getItem('selectedCharacter'));
    if(!ch) return [];
    
    // Check if character has directorOf array (explicit permission)
    if(ch.directorOf && Array.isArray(ch.directorOf)){
      return ch.directorOf;
    }
    
    // Check clearance level - must be 5 or higher to send from division addresses
    const clearance = ch.clearance || 0;
    const department = ch.department || '';
    
    if(clearance >= 5 && department){
      const divisions = [];
      const deptUpper = department.toUpperCase();
      
      // Map departments to email divisions
      if(deptUpper.includes('AD/BOD')) divisions.push('bod');
      if(deptUpper.includes('AD/IO')) divisions.push('io');
      if(deptUpper.includes('SD/') || deptUpper.startsWith('SD')) divisions.push('sd');
      if(deptUpper.includes('SCD/') || deptUpper.startsWith('SCD')) divisions.push('scd');
      if(deptUpper.includes('DEO/') || deptUpper.startsWith('DEO')) divisions.push('deo');
      if(deptUpper.includes('MTF')) divisions.push('mtf');
      if(deptUpper.includes('IA')) divisions.push('ia');
      
      return [...new Set(divisions)];
    }
    
    return [];
  } catch(e){ 
    console.error('getDirectorDivisions error:', e);
    return []; 
  }
}

// Helper: Validate email format
function isValidEmail(email){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Helper: Expand mailing lists (e.g., "SD@site89.org" → all characters with "SD/" in dept)
async function expandMailingLists(recipients, db){
  const expanded = [];
  // Match division addresses (case-insensitive): bod@, io@, sd@, scd@, deo@, mtf@, ia@ followed by site89.org
  const mailingLists = recipients.filter(r => /^(bod|io|sd|scd|deo|mtf|ia)@site89\.org$/i.test(r));
  const personalEmails = recipients.filter(r => !/^(bod|io|sd|scd|deo|mtf|ia)@site89\.org$/i.test(r));
  
  console.log('Mailing lists detected:', mailingLists);
  console.log('Personal emails:', personalEmails);
  
  // Add personal emails as-is
  expanded.push(...personalEmails);
  
  // For each mailing list, expand to matching characters
  for(const list of mailingLists){
    const divCode = list.split('@')[0].toLowerCase(); // "SD@" → "sd"
    const deptPrefixes = divCode === 'bod' ? ['AD/BOD', 'AD/BOD/'] : 
                         divCode === 'io' ? ['AD/IO', 'AD/IO/'] : 
                         divCode === 'sd' ? ['SD/', 'SD'] : 
                         divCode === 'scd' ? ['ScD/', 'ScD'] : 
                         divCode === 'deo' ? ['DEO/', 'DEO'] : 
                         divCode === 'mtf' ? ['DEO/MTF', 'DEO/MTF/'] : 
                         divCode === 'ia' ? ['DEO/IA', 'DEO/IA/'] : null;
    
    if(deptPrefixes){
      try {
        const charsSnap = await getDocs(collection(db, 'characters'));
        charsSnap.forEach(snap => {
          const ch = snap.data();
          if(ch.department && ch.name){
            const dept = String(ch.department).toUpperCase();
            // Check if any prefix matches (case-insensitive)
            if(deptPrefixes.some(prefix => dept.indexOf(prefix.toUpperCase()) !== -1)){
              expanded.push(emailFromName(ch.name));
            }
          }
        });
        console.log('Mailing list', list, 'expanded to', expanded.length, 'total recipients');
      } catch(e){ console.error('Mailing list expansion failed for', list, e); }
    }
  }
  
  // Remove duplicates
  return [...new Set(expanded)];
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
  const composeSendAs = document.getElementById('composeSendAs');
  const composeSuggestions = document.getElementById('composeSuggestions');

  // Initialize TinyMCE for rich text email composition
  console.log('[TinyMCE] Initializing editor on composeBody');
  tinymce.init({
    selector: '#composeBody',
    height: 400,
    menubar: false,
    plugins: 'link lists code emoticons table',
    toolbar: 'undo redo | blocks | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright | bullist numlist | link emoticons | code removeformat',
    content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif; font-size: 14px; }',
    skin: (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'oxide-dark' : 'oxide',
    content_css: (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'default',
    promotion: false, // Hide upgrade prompts
    branding: false, // Remove "Powered by TinyMCE" branding
    setup: function(editor) {
      editor.on('init', function() {
        console.log('[TinyMCE] Editor initialized successfully');
      });
    }
  });

  let currentFolder = 'inbox';
  let myAddress = '';
  let currentUser = null; // Store current user for emails
  let currentMessage = null;
  let allMessages = [];
  let emailsUnsubscribe = null; // for real-time listener
  let directorDivisions = []; // Current character's director divisions
  let directorSendAddr = ''; // Currently selected send-as address
  let locallyMarkedRead = new Set(); // Track messages we've marked as read locally
  let contactsList = new Set(); // Track known email addresses for autocomplete
  let charactersCache = {}; // Cache character data for profile pictures

  function isValidEmail(e){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  function setActiveFolder(name){
    folderEls.forEach(f => f.classList.toggle('active', f.dataset.folder === name));
    currentFolder = name;
    renderList();
  }

  folderEls.forEach(f => f.addEventListener('click', ()=> setActiveFolder(f.dataset.folder)));

  // Update Send As dropdown when compose opens
  function updateSendAsOptions(){
    composeSendAs.innerHTML = '<option value="">Send as personal account</option>';
    if(directorDivisions && directorDivisions.length > 0){
      const divisionMap = {
        'bod': 'Board of Directors (bod@site89.org)',
        'io': 'Internal Operations (io@site89.org)',
        'sd': 'Security Department (sd@site89.org)',
        'scd': 'Scientific Department (scd@site89.org)',
        'deo': 'External Operations (deo@site89.org)',
        'mtf': 'Mobile Task Force (mtf@site89.org)',
        'ia': 'Intelligence Agency (ia@site89.org)'
      };
      directorDivisions.forEach(div => {
        const opt = document.createElement('option');
        opt.value = div + '@site89.org';
        opt.textContent = divisionMap[div] || div + '@site89.org';
        composeSendAs.appendChild(opt);
      });
    }
  }

  composeSendAs.addEventListener('change', ()=>{
    directorSendAddr = composeSendAs.value;
  });

  // Autocomplete for recipient field
  composeTo.addEventListener('input', ()=>{
    const value = composeTo.value;
    const lastComma = value.lastIndexOf(',');
    const currentInput = lastComma >= 0 ? value.substring(lastComma + 1).trim() : value.trim();
    
    if(currentInput.length >= 2){
      const suggestions = showContactSuggestions(currentInput);
      if(suggestions.length > 0){
        composeSuggestions.innerHTML = suggestions.map(s => `<div data-email="${s}">${s}</div>`).join('');
        composeSuggestions.style.display = 'block';
      } else {
        composeSuggestions.style.display = 'none';
      }
    } else {
      composeSuggestions.style.display = 'none';
    }
  });

  composeSuggestions.addEventListener('click', (e)=>{
    if(e.target.dataset.email){
      const value = composeTo.value;
      const lastComma = value.lastIndexOf(',');
      if(lastComma >= 0){
        composeTo.value = value.substring(0, lastComma + 1) + ' ' + e.target.dataset.email;
      } else {
        composeTo.value = e.target.dataset.email;
      }
      composeSuggestions.style.display = 'none';
      composeTo.focus();
    }
  });

  // Hide suggestions when clicking outside
  document.addEventListener('click', (e)=>{
    if(!composeTo.contains(e.target) && !composeSuggestions.contains(e.target)){
      composeSuggestions.style.display = 'none';
    }
  });

  composeBtn.addEventListener('click', ()=> { 
    updateSendAsOptions();
    composeModal.style.display = 'block'; 
    composeTo.focus(); 
  });
  composeClose.addEventListener('click', ()=> { 
    composeModal.style.display = 'none'; 
    clearCompose();
    directorSendAddr = '';
    composeSendAs.value = '';
  });

  function clearCompose(){ 
    composeTo.value=''; 
    composeSubject.value=''; 
    const editor = tinymce.get('composeBody');
    if(editor){
      editor.setContent('');
    } else {
      composeBody.value='';
    }
  }

  // Contacts autocomplete helpers
  function saveContact(email){
    if(email && isValidEmail(email)){
      contactsList.add(email);
      try {
        localStorage.setItem('emailContacts', JSON.stringify([...contactsList]));
      } catch(e){ console.warn('Failed to save contacts', e); }
    }
  }

  function loadContacts(){
    try {
      const saved = localStorage.getItem('emailContacts');
      if(saved){
        const contacts = JSON.parse(saved);
        contacts.forEach(c => contactsList.add(c));
      }
    } catch(e){ console.warn('Failed to load contacts', e); }
  }

  function showContactSuggestions(input){
    const query = input.toLowerCase();
    const suggestions = [...contactsList].filter(c => c.toLowerCase().includes(query));
    return suggestions.slice(0, 10); // Limit to 10 suggestions
  }

  // Get character profile image
  async function getCharacterImage(email){
    // Check cache first
    if(charactersCache[email]) return charactersCache[email];
    
    try {
      const charsSnap = await getDocs(collection(db, 'characters'));
      charsSnap.forEach(snap => {
        const ch = snap.data();
        if(ch.name){
          const charEmail = emailFromName(ch.name);
          const image = ch.image || ch.photo || ch.photoUrl || ch.photoURL || ch.profileImage || ch.avatar || ch.picture || null;
          charactersCache[charEmail] = image;
        }
      });
    } catch(e){ 
      console.error('Failed to fetch character images:', e); 
    }
    
    return charactersCache[email] || null;
  }

  async function sendMessage(status='sent'){
    const toRaw = (composeTo.value||'').split(',').map(s=>s.trim()).filter(Boolean);
    if (!toRaw.length) return alert('Add at least one recipient');
    // Basic validation
    for (const r of toRaw){ if(!isValidEmail(r)) return alert('Invalid recipient email: ' + r); }
    
    // Check if sending to mailing lists - requires clearance 4+
    const hasMailingList = toRaw.some(r => /^(bod|io|sd|scd|deo|mtf|ia)@site89\.org$/i.test(r));
    if(hasMailingList){
      try {
        const ch = JSON.parse(localStorage.getItem('selectedCharacter'));
        const clearance = ch ? (ch.clearance || 0) : 0;
        if(clearance < 4){
          return alert('Clearance Level 4 or higher required to send to division mailing lists.');
        }
      } catch(e){
        return alert('Unable to verify clearance level. Please select a character.');
      }
    }
    
    // Determine sender: use selected director address or personal address
    let sender = directorSendAddr || myAddress;
    if(!sender) return alert('No sender address set. Select a character or sign in.');
    
    // Validate director is allowed to send from chosen address
    if(directorSendAddr && !directorDivisions.includes(directorSendAddr.split('@')[0].toLowerCase())){
      return alert('You do not have permission to send from ' + directorSendAddr);
    }

    // disable buttons while sending
    sendBtn.disabled = true; saveDraftBtn.disabled = true;
    
    // Expand mailing lists
    let recipients = toRaw;
    try {
      recipients = await expandMailingLists(toRaw, db);
    } catch(e){ console.warn('Mailing list expansion error', e); recipients = toRaw; }

    // Get rich text content from TinyMCE
    console.log('[TinyMCE] Getting editor content for send');
    const editor = tinymce.get('composeBody');
    const bodyContent = editor ? editor.getContent() : composeBody.value || '';
    console.log('[TinyMCE] Body content length:', bodyContent.length);

    const payload = {
      sender: sender,
      senderEmail: currentUser ? currentUser.email : '',
      recipients: recipients,
      subject: composeSubject.value || '(no subject)',
      body: bodyContent,
      status: status, // 'sent' or 'draft'
      folder: status === 'draft' ? 'drafts' : '',
      ts: serverTimestamp()
    };

    try {
      await addDoc(collection(db,'emails'), payload);
      console.log('[Email] Message sent successfully');
    } catch(e){
      console.error('send failed', e); alert('Failed to send message');
    } finally {
      sendBtn.disabled = false; saveDraftBtn.disabled = false;
      composeModal.style.display = 'none';
      clearCompose();
      directorSendAddr = '';
      composeSendAs.value = '';
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
    const editor = tinymce.get('composeBody');
    const replyContent = `<br><br><hr><p><em>On ${fmtDate(currentMessage.ts)} ${currentMessage.sender} wrote:</em></p><blockquote>${currentMessage.body}</blockquote>`;
    if(editor){
      editor.setContent(replyContent);
    } else {
      composeBody.value = replyContent;
    }
  });

  btnForward.addEventListener('click', ()=>{
    if(!currentMessage) return;
    composeModal.style.display='block';
    composeTo.value = '';
    composeSubject.value = 'Fwd: ' + (currentMessage.subject||'');
    const editor = tinymce.get('composeBody');
    const forwardContent = `<br><br><hr><p><strong>Forwarded message</strong></p><p>From: ${currentMessage.sender}<br>Date: ${fmtDate(currentMessage.ts)}</p><br>${currentMessage.body}`;
    if(editor){
      editor.setContent(forwardContent);
    } else {
      composeBody.value = forwardContent;
    }
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

    // counts and unread badge on navbar
    const inboxMsgs = allMessages.filter(m => (m.recipients||[]).includes(myAddress) && m.folder !== 'trash' && m.status !== 'draft');
    // Count unread: neither m.read nor in locallyMarkedRead
    const unreadCount = inboxMsgs.filter(m => !m.read && !locallyMarkedRead.has(m.id)).length;
    document.getElementById('countInbox').textContent = inboxMsgs.length;
    const navMailBadge = document.getElementById('navMailBadge');
    if(navMailBadge){
      if(unreadCount > 0){
        navMailBadge.textContent = unreadCount;
        navMailBadge.style.display = 'flex';
      } else {
        navMailBadge.textContent = '';
        navMailBadge.style.display = 'none';
      }
    }
    document.getElementById('countDrafts').textContent = allMessages.filter(m => m.status === 'draft' && m.sender === myAddress).length;
    document.getElementById('countSent').textContent = allMessages.filter(m => m.sender === myAddress && m.folder !== 'trash').length;
    document.getElementById('countTrash').textContent = allMessages.filter(m => m.folder === 'trash' && (m.sender === myAddress || (m.recipients||[]).includes(myAddress))).length;

    messagesContainer.innerHTML = '';
    list.sort((a,b)=> (b.ts||0) - (a.ts||0));
    list.forEach(async (m) => {
      const el = document.createElement('div');
      // Check if message is unread: neither m.read nor in locallyMarkedRead Set
      const isUnread = !m.read && !locallyMarkedRead.has(m.id) && (m.recipients||[]).includes(myAddress);
      el.className = 'message-item'+ (isUnread ? ' unread' : '');
      
      // Save contacts for autocomplete
      if(m.sender) saveContact(m.sender);
      if(m.recipients) m.recipients.forEach(r => saveContact(r));
      
      // Try to get profile picture
      const profileImage = await getCharacterImage(m.sender);
      const avatarHtml = profileImage && !profileImage.includes('placeholder') 
        ? `<img src="${profileImage}" style="width:44px;height:44px;border-radius:6px;object-fit:cover" alt="Profile">`
        : `<div style="width:44px;height:44px;border-radius:6px;background:linear-gradient(135deg,var(--accent-mint),var(--accent-teal));display:flex;align-items:center;justify-content:center;color:#081413;font-weight:700">${(m.sender||'').charAt(0)||''}</div>`;
      
      el.innerHTML = `${avatarHtml}
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
    
    // Render HTML content for rich text emails
    console.log('[Email] Rendering message body as HTML');
    mailContent.innerHTML = m.body;
    
    mailSender.textContent = `${m.sender} → ${ (m.recipients||[]).join(', ') }`;
    mailMeta.textContent = fmtDate(m.ts);
    const md = document.getElementById('mailDate'); if(md) md.textContent = fmtDate(m.ts);

    // mark read if I'm recipient and not already read or locally marked
    if ((m.recipients||[]).includes(myAddress) && !m.read && !locallyMarkedRead.has(m.id)){
      // Immediately add to locally marked set for optimistic UI update
      locallyMarkedRead.add(m.id);
      // Re-render to update UI immediately
      renderList();
      
      // Then update Firestore in background
      try { 
        await updateDoc(doc(db,'emails',m.id), { read: true });
        console.log('[Email] Message marked as read');
      }
      catch(e){ 
        console.error('mark read failed', e);
        // If update fails, remove from local set
        locallyMarkedRead.delete(m.id);
        renderList();
      }
    }
  }

  // Real-time listener for emails collection
  function startRealtimeMessages(){
    if (emailsUnsubscribe) emailsUnsubscribe();
    const q = query(collection(db,'emails'), orderBy('ts','desc'));
    emailsUnsubscribe = onSnapshot(q, (snapshot) => {
      allMessages = [];
      snapshot.forEach(s => { allMessages.push({ id: s.id, ...s.data() }); });
      
      // Preload character images for all senders
      const senders = [...new Set(allMessages.map(m => m.sender).filter(Boolean))];
      senders.forEach(sender => getCharacterImage(sender));
      
      renderList();
    }, (err) => { console.warn('emails listener error', err); });
  }

  // If DB empty, create a tiny demo exchange
  async function ensureSampleData(){
    const snaps = await getDocs(collection(db,'emails'));
    if (snaps.empty){
      const demoSenderEmail = currentUser ? currentUser.email : 'demo@site89.org';
      await addDoc(collection(db,'emails'), { sender: 'director@site89.org', senderEmail: 'demo@site89.org', recipients: [myAddress], subject: 'Welcome to Site‑89 Mail', body: 'This is a demo message. Use Compose to send test emails between characters.', status: 'sent', ts: serverTimestamp() });
      await addDoc(collection(db,'emails'), { sender: myAddress, senderEmail: demoSenderEmail, recipients: ['director@site89.org'], subject: 'Re: Welcome', body: 'Thanks — message received.', status: 'sent', ts: serverTimestamp() });
    }
  }

  // Auth and address detection
  onAuthStateChanged(auth, async (user) => {
    currentUser = user; // Store current user for UID in emails
    // Load contacts from localStorage
    loadContacts();
    
    // Use selectedCharacter if present, otherwise fallback to user email
    let selected = null;
    try { selected = JSON.parse(localStorage.getItem('selectedCharacter')); } catch(e){ selected = null; }
    if (selected && selected.name){
      myAddress = emailFromName(selected.name);
      // Get director divisions for this character
      directorDivisions = getDirectorDivisions();
      updateSendAsOptions();
    } else if (user && user.email){
      myAddress = user.email;
      directorDivisions = [];
    } else {
      myAddress = '';
      directorDivisions = [];
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