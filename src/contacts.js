import { db, collection, doc, setDoc, getDocs, deleteDoc } from './firebase.js';

export async function loadContacts(user) {
  const contactsRef = collection(db, 'users', user.uid, 'contacts');
  const snap = await getDocs(contactsRef);
  return snap.docs.map(d => d.data());
}

export async function addContact(user, contactEmail, contactName) {
  const contactRef = doc(db, 'users', user.uid, 'contacts', contactEmail);
  await setDoc(contactRef, {
    email: contactEmail,
    name: contactName || contactEmail.split('@')[0],
    avatar: null,
    addedAt: new Date().toISOString()
  }, { merge: true });
}

export async function removeContact(user, contactEmail) {
  const contactRef = doc(db, 'users', user.uid, 'contacts', contactEmail);
  await deleteDoc(contactRef);
}

export function renderContactsView(contacts, onMessage, onRemove) {
  if (contacts.length === 0) {
    return `
    <div class="contacts-empty">
      <h3>No contacts yet</h3>
      <p>Add people by email to start chatting.</p>
    </div>`;
  }

  return `
  <div class="contacts-grid">
    ${contacts.map(c => {
      const initial = (c.name || c.email)[0].toUpperCase();
      return `
      <div class="contact-card">
        <div class="contact-avatar">${initial}</div>
        <div class="contact-info">
          <div class="contact-name">${c.name || c.email}</div>
          <div class="contact-email">${c.email}</div>
        </div>
        <div class="contact-actions">
          <button class="contact-action-btn message" data-email="${c.email}" data-name="${c.name || c.email}" title="Message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>
          <button class="contact-action-btn remove" data-email="${c.email}" title="Remove">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

export function attachContactsEvents(onMessage, onRemove) {
  document.querySelectorAll('.contact-action-btn.message').forEach(btn => {
    btn.addEventListener('click', () => {
      onMessage(btn.dataset.email, btn.dataset.name);
    });
  });
  document.querySelectorAll('.contact-action-btn.remove').forEach(btn => {
    btn.addEventListener('click', () => {
      onRemove(btn.dataset.email);
    });
  });
}
