import {
  rtdb, ref, push, set, get, rtdbQuery,
  orderByChild, limitToLast, onValue, remove, update, rtdbServerTimestamp
} from './firebase.js';

const MESSAGE_LIMIT = 50;
const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

function emailKey(email) {
  return (email || '').toLowerCase().replace(/\./g, ',');
}

function chatId(email1, email2) {
  return [emailKey(email1), emailKey(email2)].sort().join('__');
}

export async function loadChatList(user, contacts) {
  const inboxRef = ref(rtdb, `userChats/${emailKey(user.email)}`);
  const snap = await get(inboxRef);
  if (!snap.exists()) return [];
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
  return chats;
}

export function subscribeToMessages(user, contactEmail, callback) {
  const cid = chatId(user.email, contactEmail);
  const messagesRef = ref(rtdb, `chats/${cid}/messages`);
  const q = rtdbQuery(messagesRef, orderByChild('createdAt'), limitToLast(MESSAGE_LIMIT));

  cleanupOldMessages(cid);

  return onValue(q, (snap) => {
    const messages = [];
    snap.forEach((child) => {
      messages.push({ id: child.key, ...child.val() });
    });
    callback(messages);
  });
}

export async function sendMessage(user, contactEmail, text) {
  const cid = chatId(user.email, contactEmail);
  const messagesRef = ref(rtdb, `chats/${cid}/messages`);
  const newMsgRef = push(messagesRef);
  const now = Date.now();
  await set(newMsgRef, {
    text,
    sender: user.uid,
    senderEmail: user.email,
    createdAt: now,
    id: newMsgRef.key
  });

  const inboxEntry = {
    email: contactEmail,
    name: (user.name || user.email),
    lastMessage: text,
    lastAt: now
  };
  const reverseEntry = {
    email: user.email,
    name: user.name || user.email,
    lastMessage: text,
    lastAt: now
  };

  try {
    await update(ref(rtdb, `userChats/${emailKey(user.email)}`), { [cid]: inboxEntry });
    await update(ref(rtdb, `userChats/${emailKey(contactEmail)}`), { [cid]: reverseEntry });
  } catch {}

  enforceMessageLimit(cid);
}

async function enforceMessageLimit(cid) {
  try {
    const messagesRef = ref(rtdb, `chats/${cid}/messages`);
    const snap = await get(messagesRef);
    if (!snap.exists()) return;
    const all = [];
    snap.forEach((child) => all.push({ key: child.key, createdAt: child.val().createdAt || 0 }));
    if (all.length <= MESSAGE_LIMIT) return;
    all.sort((a, b) => a.createdAt - b.createdAt);
    const toRemove = all.slice(0, all.length - MESSAGE_LIMIT);
    for (const m of toRemove) {
      await remove(ref(rtdb, `chats/${cid}/messages/${m.key}`));
    }
  } catch {}
}

async function cleanupOldMessages(cid) {
  try {
    const messagesRef = ref(rtdb, `chats/${cid}/messages`);
    const snap = await get(messagesRef);
    if (!snap.exists()) return;
    const cutoff = Date.now() - SIX_MONTHS_MS;
    const toRemove = [];
    snap.forEach((child) => {
      const val = child.val();
      if (val.createdAt && val.createdAt < cutoff) toRemove.push(child.key);
    });
    for (const key of toRemove) {
      await remove(ref(rtdb, `chats/${cid}/messages/${key}`));
    }
  } catch {}
}

export function renderChatView(chatList, activeEmail, messages, user) {
  const activeContact = chatList.find(c => c.email === activeEmail);
  const sidebarHtml = `
  <div class="chat-sidebar">
    <div class="chat-sidebar-header">
      <h3>Conversations</h3>
      <input type="text" class="contacts-search" id="chat-search" placeholder="Search..." style="margin-top:8px;" />
    </div>
    <div class="chat-list" id="chat-list">
      ${chatList.length === 0 ? '<div style="padding:24px;text-align:center;color:var(--neutral-400);font-size:14px;">No conversations yet</div>' : ''}
      ${chatList.map(c => {
        const initial = (c.name || c.email)[0].toUpperCase();
        const preview = c.lastMessage ? escapeHtml(c.lastMessage).slice(0, 40) : '';
        return `
        <div class="chat-list-item ${activeEmail === c.email ? 'active' : ''}" data-email="${c.email}" data-name="${c.name || c.email}">
          <div class="chat-list-avatar">${initial}</div>
          <div class="chat-list-info">
            <div class="chat-list-name">${c.name || c.email}</div>
            ${preview ? `<div class="chat-list-preview">${preview}</div>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;

  const mainHtml = activeEmail && activeContact ? `
  <div class="chat-main">
    <div class="chat-header">
      <div class="chat-list-avatar">${(activeContact.name || activeContact.email)[0]?.toUpperCase() || '?'}</div>
      <div class="chat-header-name">${activeContact.name || activeContact.email}</div>
    </div>
    <div class="chat-messages" id="chat-messages">
      ${messages.map(m => {
        const sent = m.senderEmail === user.email || m.sender === user.uid;
        return `
        <div class="chat-bubble ${sent ? 'sent' : 'received'}">
          ${escapeHtml(m.text)}
          <div class="chat-bubble-time">${formatTime(m.createdAt)}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="chat-input-bar">
      <input type="text" class="chat-input" id="chat-input" placeholder="Type a message..." />
      <button class="chat-send-btn" id="chat-send-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  </div>` : `
  <div class="chat-empty">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    <p>Select a conversation to start chatting</p>
  </div>`;

  return `<div class="chat-layout">${sidebarHtml}${mainHtml}</div>`;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function attachChatEvents(onSelectChat, onSendMessage) {
  document.querySelectorAll('.chat-list-item').forEach(item => {
    item.addEventListener('click', () => {
      onSelectChat(item.dataset.email, item.dataset.name);
    });
  });

  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');
  if (input && sendBtn) {
    const send = () => {
      const text = input.value.trim();
      if (text) {
        onSendMessage(text);
        input.value = '';
      }
    };
    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
  }

  const search = document.getElementById('chat-search');
  if (search) {
    search.addEventListener('input', () => {
      const q = search.value.toLowerCase();
      document.querySelectorAll('.chat-list-item').forEach(item => {
        const name = item.dataset.name.toLowerCase();
        const email = item.dataset.email.toLowerCase();
        item.style.display = (name.includes(q) || email.includes(q)) ? '' : 'none';
      });
    });
  }
}

export { chatId, emailKey };
