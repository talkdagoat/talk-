import {
  auth, db, rtdb, googleProvider,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendEmailVerification, updateProfile, signOut,
  signInWithPopup, sendPasswordResetEmail,
  collection, doc, setDoc, getDoc,
  ref, set as rtdbSet
} from './firebase.js';

export function renderAuth() {
  return `
  <div class="auth-screen">
    <div class="auth-card">
      <div class="auth-logo">Talk</div>
      <div class="auth-subtitle" id="auth-subtitle">Sign in to your account</div>
      <div class="auth-message" id="auth-subtitle">we are sorry for the inconvinience but for adding email verificaton we had to delete account only on aug 4 2026</div>
      <form id="auth-form">
        <div class="auth-field" id="name-field" style="display:none;">
          <label>Name</label>
          <input type="text" id="auth-name" placeholder="Your name" autocomplete="name" />
        </div>
        <div class="auth-field">
          <label>Email</label>
          <input type="email" id="auth-email" placeholder="you@example.com" autocomplete="email" required />
        </div>
        <div class="auth-field">
          <label>Password</label>
          <input type="password" id="auth-password" placeholder="••••••••" autocomplete="current-password" required />
        </div>
        <button type="submit" class="auth-btn" id="auth-submit">Sign in</button>
      </form>
      <div class="auth-error" id="auth-error"></div>
      <div class="auth-success" id="auth-success"></div>
      <div class="auth-divider">or</div>
      <button class="btn-outline" id="google-btn" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;">
        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Continue with Google
      </button>
      <div class="auth-toggle" id="auth-toggle">
        <span id="toggle-text">Don't have an account?</span>
        <a href="#" id="toggle-link">Sign up</a>
      </div>
      <div class="auth-toggle">
        <a href="#" id="forgot-link">Forgot password?</a>
      </div>
    </div>
  </div>
  `;
}

export function renderVerify(email) {
  return `
  <div class="auth-screen">
    <div class="auth-card" style="text-align:center;">
      <div class="auth-logo">Talk</div>
      <h2 style="font-size:20px;font-weight:700;margin:16px 0 8px;">Verify your email</h2>
      <p style="color:var(--neutral-500);font-size:15px;margin-bottom:20px;">
        We sent a verification link to <strong>${email}</strong>. Click the link to confirm your account.
      </p>
      <button class="auth-btn" id="check-verified-btn">I've verified — continue</button>
      <button class="btn-outline" id="resend-verify-btn" style="width:100%;margin-top:8px;">Resend verification email</button>
      <div class="auth-error" id="verify-error"></div>
      <div class="auth-success" id="verify-success"></div>
      <div class="auth-toggle"><a href="#" id="verify-back-link">Back to sign in</a></div>
    </div>
  </div>
  `;
}

export async function saveUserToDb(user) {
  const userRef = doc(db, 'users', user.uid);
  const userData = {
    uid: user.uid,
    email: user.email,
    name: user.displayName || user.email.split('@')[0],
    photoURL: user.photoURL || null,
    createdAt: new Date().toISOString()
  };
  await setDoc(userRef, userData, { merge: true });
  try {
    await rtdbSet(ref(rtdb, 'users/' + user.uid), {
      email: user.email,
      name: user.displayName || user.email.split('@')[0],
      photoURL: user.photoURL || null
    });
  } catch {}
  return userData;
}

export function attachAuthEvents(onAuthSuccess, onNewSignup) {
  let mode = 'login';
  const form = document.getElementById('auth-form');
  const submitBtn = document.getElementById('auth-submit');
  const nameField = document.getElementById('name-field');
  const subtitle = document.getElementById('auth-subtitle');
  const errorEl = document.getElementById('auth-error');
  const successEl = document.getElementById('auth-success');
  const toggleLink = document.getElementById('toggle-link');
  const toggleText = document.getElementById('toggle-text');
  const forgotLink = document.getElementById('forgot-link');
  const googleBtn = document.getElementById('google-btn');

  function setMode(m) {
    mode = m;
    errorEl.textContent = '';
    successEl.textContent = '';
    if (m === 'login') {
      subtitle.textContent = 'Sign in to your account';
      submitBtn.textContent = 'Sign in';
      nameField.style.display = 'none';
      document.getElementById('auth-password').required = true;
      toggleText.textContent = "Don't have an account?";
      toggleLink.textContent = 'Sign up';
      forgotLink.style.display = '';
    } else if (m === 'signup') {
      subtitle.textContent = 'Create your free account';
      submitBtn.textContent = 'Sign up';
      nameField.style.display = '';
      forgotLink.style.display = 'none';
      toggleText.textContent = 'Already have an account?';
      toggleLink.textContent = 'Sign in';
    }
  }

  toggleLink.addEventListener('click', (e) => { e.preventDefault(); setMode(mode === 'login' ? 'signup' : 'login'); });
  forgotLink.addEventListener('click', (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    if (!email) { errorEl.textContent = 'Enter your email first'; return; }
    sendPasswordResetEmail(auth, email)
      .then(() => { successEl.textContent = 'Password reset email sent!'; })
      .catch((err) => { errorEl.textContent = err.message; });
  });

  googleBtn.addEventListener('click', async () => {
    errorEl.textContent = '';
    googleBtn.disabled = true;
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userData = await saveUserToDb(result.user);
      onAuthSuccess(userData);
    } catch (err) {
      errorEl.textContent = err.message || 'Google sign-in failed';
    } finally {
      googleBtn.disabled = false;
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    successEl.textContent = '';
    submitBtn.disabled = true;

    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    try {
      if (mode === 'signup') {
        const name = document.getElementById('auth-name').value.trim() || email.split('@')[0];
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        const userData = await saveUserToDb(cred.user);
        try {
          await fetch('/api/send-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name })
          });
        } catch {}
        if (onNewSignup) {
          onNewSignup(email, userData);
        } else {
          onAuthSuccess(userData);
        }
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const userData = await saveUserToDb(cred.user);
        onAuthSuccess(userData);
      }
    } catch (err) {
      const msg = err.code === 'auth/invalid-email' ? 'Invalid email address'
        : err.code === 'auth/missing-password' ? 'Enter a password'
        : err.code === 'auth/invalid-credential' ? 'Wrong email or password'
        : err.code === 'auth/email-already-in-use' ? 'Email already registered'
        : err.code === 'auth/weak-password' ? 'Password should be at least 6 characters'
        : err.message || 'Something went wrong';
      errorEl.textContent = msg;
    } finally {
      submitBtn.disabled = false;
    }
  });
}

export function attachVerifyEvents(email, onAuthSuccess) {
  const checkBtn = document.getElementById('check-verified-btn');
  const resendBtn = document.getElementById('resend-verify-btn');
  const backLink = document.getElementById('verify-back-link');
  const errorEl = document.getElementById('verify-error');
  const successEl = document.getElementById('verify-success');

  checkBtn.addEventListener('click', async () => {
    errorEl.textContent = '';
    try {
      const res = await fetch('/api/check-verified?email=' + encodeURIComponent(email));
      const result = await res.json();
      if (result.verified) {
        successEl.textContent = 'Email verified! Signing you in...';
        const user = auth.currentUser;
        if (user) {
          const userData = await saveUserToDb(user);
          onAuthSuccess(userData);
        } else {
          successEl.textContent = 'Email verified! Please sign in.';
        }
      } else {
        errorEl.textContent = 'Email not verified yet. Click the link in your email first.';
      }
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  resendBtn.addEventListener('click', async () => {
    errorEl.textContent = '';
    successEl.textContent = '';
    try {
      const res = await fetch('/api/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const result = await res.json();
      if (result.success) {
        successEl.textContent = 'Verification email resent!';
      } else {
        errorEl.textContent = result.error || 'Failed to resend';
      }
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  backLink.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth).then(() => location.reload());
  });
}
