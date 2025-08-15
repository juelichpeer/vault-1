import { supabase } from './supabaseClient.js';
import { toast } from './notify.js';

const el = (id) => document.getElementById(id);
const loginForm = el('loginForm');
const statusEl = el('status');
const postLogin = el('postLogin');
const who = el('who');
const logoutBtn = el('logoutBtn');
const authState = el('authState');
const rolePill = el('rolePill');

function setStatus(msg, type = 'info') {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.classList.remove('ok', 'err');
  if (type === 'ok') statusEl.classList.add('ok');
  if (type === 'err') statusEl.classList.add('err');
}

function showSignedOut() {
  if (authState) authState.textContent = 'Signed out';
  loginForm?.classList.remove('hidden');
  postLogin?.classList.add('hidden');
}

function showSignedIn(email, role = 'member') {
  if (authState) authState.textContent = 'Signed in';
  if (who) who.textContent = email || 'unknown';
  if (rolePill) rolePill.textContent = `role: ${role}`;
  loginForm?.classList.add('hidden');
  postLogin?.classList.remove('hidden');
}

async function fetchRole(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', userId)
    .maybeSingle();
  if (error) return { role: 'member', email: null };
  return { role: data?.role ?? 'member', email: data?.email ?? null };
}

async function logEvent(event_type, details = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;
  await supabase.from('audit_log').insert({
    user_id: session.user.id,
    event_type,
    details
  });
}

// On load: if already signed in and owner/admin -> go to dashboard
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const { role, email } = await fetchRole(session.user.id);
    if (role === 'admin' || role === 'owner') {
      window.location.href = 'dashboard.html';
      return;
    }
    showSignedIn(email || session.user.email, role);
    setStatus('Signed in', 'ok');
  } else {
    showSignedOut();
    setStatus('Ready');
  }
})();

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus('Signing in…');

  const email = el('email').value.trim();
  const password = el('password').value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setStatus(error.message || 'Login failed', 'err');
    toast('Login failed', 'err');
    return;
  }

  const user = data.user;
  const { role } = await fetchRole(user.id);
  if (!['admin','owner'].includes(role)) {
    await supabase.auth.signOut();
    setStatus('Access denied. Ask admin for invite (magic link).', 'err');
    toast('Access denied', 'err');
    showSignedOut();
    return;
  }

  await logEvent('login', { method: 'password' });
  toast('Welcome back', 'ok');
  window.location.href = 'dashboard.html';
});

logoutBtn?.addEventListener('click', async () => {
  await logEvent('logout', {});
  await supabase.auth.signOut();
  toast('Signed out', 'ok');
  showSignedOut();
});

supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session?.user) {
    const { role, email } = await fetchRole(session.user.id);
    if (role === 'admin' || role === 'owner') {
      window.location.href = 'dashboard.html';
    } else {
      showSignedIn(email || session.user.email, role);
    }
  } else {
    showSignedOut();
  }
});
