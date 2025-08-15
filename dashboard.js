// dashboard.js
import { supabase } from './supabaseClient.js';
import { requireAdmin } from './authGuard.js';
import { toast } from './notify.js';

const who = document.getElementById('who');
const role = document.getElementById('role');
const logoutBtn = document.getElementById('logoutBtn');

const makeAdminBtn = document.getElementById('makeAdminBtn');
const makeMemberBtn = document.getElementById('makeMemberBtn');
const manageEmail = document.getElementById('manageEmail');

const navButtons = document.querySelectorAll('[data-target]');
navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-target');
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

document.addEventListener('DOMContentLoaded', init);

async function init() {
  const me = await requireAdmin(); // kicks out non-admins
  if (!me) return;

  who.textContent = me.email;
  role.textContent = `role: ${me.role}`;

  // Only OWNER can use role buttons
  const owner = me.role === 'owner';
  [makeAdminBtn, makeMemberBtn, manageEmail].forEach(el => {
    if (!owner) el?.setAttribute('disabled','true');
  });

  logoutBtn?.addEventListener('click', async () => {
    try {
      await supabase.from('audit_log').insert({
        user_id: me.userId, event_type: 'logout', details: {}
      });
    } catch {}
    await supabase.auth.signOut();
    toast('Signed out', 'ok');
    window.location.href = 'index.html';
  });

  makeAdminBtn?.addEventListener('click', () => pretendRoleChange('admin'));
  makeMemberBtn?.addEventListener('click', () => pretendRoleChange('member'));
}

async function pretendRoleChange(newRole) {
  const email = manageEmail?.value.trim();
  if (!email) return toast('Enter an email first', 'err');
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await supabase.from('audit_log').insert({
      user_id: session.user.id,
      event_type: 'role_change_requested',
      details: { target_email: email, new_role: newRole }
    });
  }
  toast(`Requested: ${email} → ${newRole}`, 'ok');
}
