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

function requireOwnerOrAdmin(role) {
  return role === 'owner' || role === 'admin';
}

// --- init ---
document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Guard: must be signed in
  const session = await getSession();
  if (!session?.user) {
    window.location.href = 'index.html';
    return;
  }

  // Guard: must be owner/admin
  const me = await getMyProfile(session.user.id);
  if (!requireOwnerOrAdmin(me.role)) {
    // Kick out hard if someone guesses the URL
    await supabase.auth.signOut();
    window.location.href = 'index.html';
    return;
  }

  // Populate header
  who.textContent = me.email ?? 'unknown';
  roleEl.textContent = `role: ${me.role}`;

  // Only OWNER can use role-change UI
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
    } catch (_) {
      // ignore audit failures
    }
    await supabase.auth.signOut();
    localStorage.removeItem('vault-webauthn-id'); // clear device lock key
    toast('Signed out', 'ok');
    window.location.href = 'index.html';
  });

  // TEMP owner-tools: record intent only (secure server action comes later)
  makeAdminBtn?.addEventListener('click', () => pretendRoleChange('admin', session.user.id));
  makeMemberBtn?.addEventListener('click', () => pretendRoleChange('member', session.user.id));
}

async function pretendRoleChange(newRole, actorUserId) {
  const targetEmail = manageEmail?.value.trim();
  if (!targetEmail) return toast('Enter an email first', 'err');

  try {
    await supabase.from('audit_log').insert({
      user_id: actorUserId,
      event_type: 'role_change_requested',
      details: { target_email: targetEmail, new_role: newRole }
    });
    toast(`Requested: ${targetEmail} → ${newRole}`, 'ok');
  } catch (e) {
    toast('Could not log request', 'err');
    console.warn(e);
  }
}
