import { renderLanding, attachLandingEvents } from './landing.js';
import { renderAuth, attachAuthEvents, saveUserToDb } from './auth.js';
import { loadContacts, addContact, removeContact, renderContactsView, attachContactsEvents, loadTalkUsers, renderTalkUsersDirectory, attachDirectoryEvents } from './contacts.js';
import { loadChatList, subscribeToMessages, sendMessage, renderChatView, attachChatEvents, emailKey } from './chat.js';
import { rtdb, ref, onValue } from './firebase.js';
import { renderGamesView, attachGamesEvents } from './games.js';
import { auth, signOut, onAuthStateChanged, updateProfile, db, doc, setDoc } from './firebase.js';
import { initPushNotifications, subscribeUserToPush, unsubscribeUserFromPush, setCallNotificationHandler } from './push.js';

let currentUser = null;
let activeView = 'contacts';
let deviceMode = 'desktop';
let contacts = [];
let chatList = [];
let activeChat = null;
let chatMessages = [];
let chatUnsub = null;
let inboxUnsub = null;

const app = document.getElementById('app');

function avatarDisplay(user) {
  return user.emoji || (user.name || user.email || '?')[0]?.toUpperCase() || '?';
}

function showLanding() {
  app.innerHTML = renderLanding();
  attachLandingEvents(showAuth);
}

function showAuth() {
  app.innerHTML = renderAuth();
  attachAuthEvents(enterApp);
}

function showDeviceSelect() {
  app.innerHTML = `
  <div class="device-select-screen">
    <div class="device-select-card">
      <div class="device-select-logo">Talk</div>
 <h2>What device are you using?</h2>
      <p>This helps us give you the best experience.</p>
      <div class="device-select-options">
        <button class="device-option" data-device="phone">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
          <span>Phone</span>
        </button>
        <button class="device-option" data-device="tablet">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="4" y1="14" x2="20" y2="14"/></svg>
          <span>Tablet</span>
        </button>
        <button class="device-option" data-device="desktop">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="18" x2="12" y2="21"/></svg>
          <span>Computer</span>
        </button>
      </div>
    </div>
  </div>`;
  document.querySelectorAll('.device-option').forEach(btn => {
    btn.addEventListener('click', () => {
      deviceMode = btn.dataset.device;
      localStorage.setItem('talk_device', deviceMode);
      renderShell();
      switchView('contacts');
    });
  });
}

function enterApp(user) {
  currentUser = user;
  setCallNotificationHandler(handleCallNotification);
  initPushNotifications().then(() => subscribeUserToPush(user.email));
  const saved = localStorage.getItem('talk_device');
  if (saved) {
    deviceMode = saved;
    renderShell();
    switchView('contacts');
  } else {
    showDeviceSelect();
  }
}

function renderShell() {
  const initial = avatarDisplay(currentUser);
  const isPhone = deviceMode === 'phone';
  const navItems = `
    <button class="app-nav-item ${activeView === 'contacts' ? 'active' : ''}" data-view="contacts">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      <span>Contacts</span>
    </button>
    <button class="app-nav-item ${activeView === 'chat' ? 'active' : ''}" data-view="chat">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <span>Chat</span>
    </button>
    <button class="app-nav-item ${activeView === 'games' ? 'active' : ''}" data-view="games">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4M8 10v4M15 11h.01M18 13h.01"/></svg>
      <span>Games</span>
    </button>`;

  if (isPhone) {
    app.innerHTML = `
    <div class="app-shell phone-mode">
      <div class="app-main">
        <div class="app-main-header">
          <h2 id="main-title">Contacts</h2>
          <button class="app-user-avatar clickable" id="profile-btn">${initial}</button>
        </div>
        <div class="app-main-content" id="main-content"></div>
      </div>
      <nav class="app-bottom-nav">${navItems}</nav>
    </div>`;
  } else {
    app.innerHTML = `
    <div class="app-shell">
      <div class="app-sidebar">
        <div class="app-sidebar-header">
          <div class="app-sidebar-logo">Talk</div>
        </div>
        <nav class="app-nav">${navItems}</nav>
        <div class="app-sidebar-footer">
          <div class="app-user-avatar clickable" id="profile-btn">${initial}</div>
          <div class="app-user-info">
            <div class="app-user-name">${currentUser.name || currentUser.email}</div>
            <div class="app-user-email">${currentUser.email}</div>
          </div>
          <button class="app-logout-btn" id="logout-btn" title="Sign out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>
      <div class="app-main">
        <div class="app-main-header">
          <h2 id="main-title">Contacts</h2>
        </div>
        <div class="app-main-content" id="main-content"></div>
      </div>
    </div>`;
  }

  document.querySelectorAll('.app-nav-item').forEach(item => {
    item.addEventListener('click', () => switchView(item.dataset.view));
  });
  document.getElementById('profile-btn').addEventListener('click', openProfileModal);
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (chatUnsub) { chatUnsub(); chatUnsub = null; }
      if (inboxUnsub) { inboxUnsub(); inboxUnsub = null; }
      if (currentUser) await unsubscribeUserFromPush(currentUser.email);
      await signOut(auth);
      currentUser = null;
      location.reload();
    });
  }
}

const EMOJI_CHOICES = [
  '😀','😎','🤩','😇','🤓','😜','🥳','😴','🤯','🥶',
  '🐱','🐶','🦊','🐼','🐨','🦁','🐸','🐵','🐙','🦄',
  '🌸','🌟','🔥','⚡','🌈','💎','🎯','🎮','🍕','🍔',
  '⚽','🏀','🚀','✈️','🎸','🎨','📚','☕','🍿','🧊'
];

function openProfileModal() {
  const existing = document.getElementById('profile-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'profile-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-card profile-modal-card">
      <div class="profile-modal-header">
        <h3>Edit Profile</h3>
        <button class="profile-modal-close" id="profile-close">&times;</button>
      </div>
      <div class="profile-modal-body">
        <div class="profile-avatar-preview" id="avatar-preview">${avatarDisplay(currentUser)}</div>
        <div class="profile-section-label">Choose an emoji</div>
        <div class="emoji-grid" id="emoji-grid">
          ${EMOJI_CHOICES.map(e => `<button class="emoji-choice ${currentUser.emoji === e ? 'selected' : ''}" data-emoji="${e}">${e}</button>`).join('')}
        </div>
        <div class="profile-section-label" style="margin-top:16px;">Your name</div>
        <input type="text" class="profile-name-input" id="profile-name-input" value="${currentUser.name || ''}" placeholder="Your name" maxlength="30" />
      </div>
      <div class="profile-modal-footer">
        <button class="profile-modal-cancel" id="profile-cancel">Cancel</button>
        <button class="profile-modal-save" id="profile-save">Save</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  let selectedEmoji = currentUser.emoji || '';

  const preview = document.getElementById('avatar-preview');
  const nameInput = document.getElementById('profile-name-input');

  document.querySelectorAll('.emoji-choice').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedEmoji = btn.dataset.emoji;
      preview.textContent = selectedEmoji;
      document.querySelectorAll('.emoji-choice').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  const close = () => modal.remove();
  document.getElementById('profile-close').addEventListener('click', close);
  document.getElementById('profile-cancel').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  document.getElementById('profile-save').addEventListener('click', async () => {
    const name = nameInput.value.trim() || currentUser.email.split('@')[0];
    const saveBtn = document.getElementById('profile-save');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    try {
      await saveProfile(name, selectedEmoji);
      close();
    } catch (err) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
      alert('Failed to save profile: ' + err.message);
    }
  });
}

async function saveProfile(name, emoji) {
  const user = auth.currentUser;
  if (user) {
    await updateProfile(user, { displayName: name });
  }
  const updates = { name, emoji: emoji || null };
  await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true });
  currentUser.name = name;
  currentUser.emoji = emoji || null;
  renderShell();
  switchView(activeView);
}

async function switchView(view) {
  activeView = view;
  document.querySelectorAll('.app-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === view);
  });
  const title = document.getElementById('main-title');
  const content = document.getElementById('main-content');

  if (view === 'contacts') {
    title.textContent = 'Contacts';
    content.innerHTML = `
    <div class="contacts-toolbar">
      <div class="contacts-tabs">
        <button class="contacts-tab active" data-tab="my">My Contacts</button>
        <button class="contacts-tab" data-tab="dir">Talk Users</button>
      </div>
      <input type="text" class="contacts-search" id="contacts-search" placeholder="Search..." />
    </div>
    <div id="contacts-list"></div>`;
    await refreshContacts();
    const searchEl = document.getElementById('contacts-search');
    if (searchEl) {
      searchEl.addEventListener('input', (e) => {
        filterContacts(e.target.value);
      });
    }
    document.querySelectorAll('.contacts-tab').forEach(tab => {
      tab.addEventListener('click', () => switchContactsTab(tab.dataset.tab));
    });
  } else if (view === 'chat') {
    title.textContent = 'Chat';
    chatList = await loadChatList(currentUser, contacts);
    renderChat();
    subscribeToInbox();
  } else if (view === 'games') {
    title.textContent = 'Games';
    content.innerHTML = renderGamesView();
    attachGamesEvents();
  }
}

async function refreshContacts() {
  try {
    contacts = await loadContacts(currentUser);
  } catch {}
  try {
    await refreshTalkUsers();
  } catch {}
  renderContactsList();
}

let contactsTab = 'my';
let talkUsers = [];

function switchContactsTab(tab) {
  contactsTab = tab;
  document.querySelectorAll('.contacts-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  renderContactsList(document.getElementById('contacts-search')?.value || '');
}

async function refreshTalkUsers() {
  talkUsers = await loadTalkUsers(currentUser);
}

function renderContactsList(filter = '') {
  const list = document.getElementById('contacts-list');
  if (!list) return;
  const q = filter.toLowerCase();

  if (contactsTab === 'dir') {
    const filtered = q
      ? talkUsers.filter(u => (u.name || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      : talkUsers;
    const existingEmails = contacts.map(c => c.email);
    list.innerHTML = renderTalkUsersDirectory(filtered, existingEmails);
    attachDirectoryEvents(handleAddFromDirectory);
  } else {
    const filtered = q
      ? contacts.filter(c => (c.name || c.email).toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      : contacts;
    list.innerHTML = renderContactsView(filtered, startChatFromContact, handleRemoveContact);
    attachContactsEvents(startChatFromContact, handleRemoveContact);
  }
}

function filterContacts(q) {
  renderContactsList(q);
}

async function handleAddFromDirectory(email, name) {
  try {
    await addContact(currentUser, email, name);
    await refreshContacts();
    renderContactsList(document.getElementById('contacts-search')?.value || '');
  } catch (err) {
    alert('Failed to add contact: ' + err.message);
  }
}

async function handleRemoveContact(email) {
  await removeContact(currentUser, email);
  contacts = contacts.filter(c => c.email !== email);
  renderContactsList(document.getElementById('contacts-search')?.value || '');
  if (activeChat?.email === email) {
    activeChat = null;
    chatMessages = [];
  }
}

function startChatFromContact(email, name) {
  handleSelectChat(email, name);
  switchView('chat');
}

function backToChatList() {
  activeChat = null;
  if (chatUnsub) { chatUnsub(); chatUnsub = null; }
  chatMessages = [];
  renderChat();
}

function renderChat() {
  const content = document.getElementById('main-content');
  content.innerHTML = renderChatView(chatList, activeChat, chatMessages, currentUser, deviceMode);
  attachChatEvents(handleSelectChat, handleSendMessage, backToChatList);
  scrollChatToBottom();
}

function subscribeToInbox() {
  if (inboxUnsub) { inboxUnsub(); inboxUnsub = null; }
  const inboxRef = ref(rtdb, `userChats/${emailKey(currentUser.email)}`);
  inboxUnsub = onValue(inboxRef, (snap) => {
    const chats = [];
    snap.forEach((child) => {
      const val = child.val();
      if (val && val.email) {
        chats.push({
          email: val.email,
          name: val.name || val.email,
          chatId: child.key,
          lastMessage: val.lastMessage || '',
          lastAt: val.lastAt || 0
        });
      }
    });
    chats.sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
    chatList = chats;
    renderChat();
  });
}

function handleSelectChat(email, name) {
  if (chatUnsub) { chatUnsub(); chatUnsub = null; }
  activeChat = { email, name };
  chatMessages = [];
  chatUnsub = subscribeToMessages(currentUser, email, (msgs) => {
    chatMessages = msgs;
    renderChat();
  });
  renderChat();
}

function handleCallNotification(msg) {
  if (!currentUser || !msg.from) return;
  const contact = chatList.find(c => c.email === msg.from);
  handleSelectChat(msg.from, contact?.name || msg.fromName || msg.from);
}

async function handleSendMessage(text) {
  if (!activeChat) return;
  await sendMessage(currentUser, activeChat.email, text);
}

function scrollChatToBottom() {
  const msgs = document.getElementById('chat-messages');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userData = await saveUserToDb(user);
    enterApp(userData);
  } else {
    showLanding();
  }
});
