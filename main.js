import { supabase } from './supabaseClient.js';

const el = (id) => document.getElementById(id);
const loginForm = el('loginForm');
const statusEl = el('status');
const postLogin = el('postLogin');
const who = el('who');
const logoutBtn = el('logoutBtn');
const authState = el('authState');
const rolePill = el('rolePill');

function setStatus(msg, type = 'info') {
  statusEl.textContent = msg;
  statusEl.classList.remove('ok', 'err');
  if (type === 'ok') statusEl.classList.add('ok');
  if (type === 'err') statusEl.classList.add('err');
}

function showSignedOut() {
  authState.textContent = 'Signed out';
  loginForm.classList.remove('hidden');
  postLogin.classList.add('hidden');
}

function showSignedIn(email, role = 'member') {
  authState.textContent = 'Signed in';
  who.textContent = email || 'unknown';
  rolePill.textContent = `role: ${role}`;
  loginForm.classList.add('hidden');
  postLogin.classList.remove('hidden');
}

/** Fetch role from profiles */
async function fetchRole(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('profile error', error);
    return { role: 'member', email: null };
  }
  return { role: data?.role ?? 'member', email: data?.email ?? null };
}

/** On load: restore session */
(async () => {
  setStatus('Checking session…');
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    const { role, email } = await fetchRole(session.user.id);
    showSignedIn(email || session.user.email, role);
    setStatus('Session restored', 'ok');
  } else {
    showSignedOut();
    setStatus('Ready');
  }
})();

/** Login submit (admin email+password) */
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus('Signing in…');

  const email = el('email').value.trim();
  const password = el('password').value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    setStatus(error.message || 'Login failed', 'err');
    return;
  }

  // Get role and show state
  const user = data.user;
  const { role } = await fetchRole(user.id);

  // For now: only allow admin to proceed (members will use magic links later)
  if (role !== 'admin') {
    await supabase.auth.signOut();
    setStatus('Access denied. Ask admin for an invite (magic link).', 'err');
    showSignedOut();
    return;
  }

  showSignedIn(email, role);
  setStatus('Signed in as admin', 'ok');
});

/** Logout */
logoutBtn?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  showSignedOut();
  setStatus('Signed out', 'ok');
});

/** Listen to auth changes (keeps UI in sync) */
supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session?.user) {
    const { role, email } = await fetchRole(session.user.id);
    showSignedIn(email || session.user.email, role);
  } else {
    showSignedOut();
  }
});
