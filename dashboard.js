// dashboard.js
import { supabase } from './supabaseClient.js';
import { toast } from './notify.js';

const $ = (id) => document.getElementById(id);

// UI refs
const who = $('who');
const roleEl = $('role');
const logoutBtn = $('logoutBtn');

const makeAdminBtn = $('makeAdminBtn');
const makeMemberBtn = $('makeMemberBtn');
const manageEmail = $('manageEmail');

// Side-nav smooth scroll
const navButtons = document.querySelectorAll('[data-target]');
navButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-target');
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// --- helpers ---
async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session ?? null;
}
async function getMyProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('email, role')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return { email: null, role: 'member' };
  return data;
}
const isOwnerOrAdmin = (r) => r === 'owner' || r === 'admin';

// --- init ---
document.addEventListener('DOMContentLoaded', init);

async function init() {
  const session = await getSession();
  if (!session?.user) {
    window.location.href = 'index.html';
    return;
  }

  const me = await getMyProfile(session.user.id);
  if (!isOwnerOrAdmin(me.role)) {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
    return;
  }

  who.textContent = me.email ?? 'unknown';
  roleEl.textContent = `role: ${me.role}`;

  // Only OWNER gets active role-change controls in UI
  const isOwner = me.role === 'owner';
  [makeAdminBtn, makeMemberBtn, manageEmail].forEach((el) => {
    if (!isOwner) el?.setAttribute('disabled', 'true');
  });

  // Logout
  logoutBtn?.addEventListener('click', async () => {
    try {
      await supabase.from('audit_log').insert({
        user_id: session.user.id,
        event_type: 'logout',
        details: {}
      });
    } catch {}
    await supabase.auth.signOut();
    localStorage.removeItem('vault-webauthn-id');
    toast('Signed out', 'ok');
    window.location.href = 'index.html';
  });

  // Owner role changes (now LIVE via Netlify Function)
  makeAdminBtn?.addEventListener('click', () => setRole('admin'));
  makeMemberBtn?.addEventListener('click', () => setRole('member'));
}

async function setRole(newRole) {
  const targetEmail = manageEmail?.value.trim();
  if (!targetEmail) return toast('Enter an email first', 'err');

  // Get caller token for the function
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    toast('Not authenticated', 'err');
    window.location.href = 'index.html';
    return;
  }

  // Disable buttons while processing
  const prevAdminDisabled = makeAdminBtn.disabled;
  const prevMemberDisabled = makeMemberBtn.disabled;
  makeAdminBtn.disabled = true;
  makeMemberBtn.disabled = true;

  try {
    const res = await fetch('/.netlify/functions/set-role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ targetEmail, newRole }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      toast(body?.error || 'Role update failed', 'err');
      return;
    }

    toast(`Role updated: ${targetEmail} → ${newRole}`, 'ok');
  } catch (e) {
    console.error(e);
    toast('Network or server error', 'err');
  } finally {
    makeAdminBtn.disabled = prevAdminDisabled;
    makeMemberBtn.disabled = prevMemberDisabled;
  }
}
