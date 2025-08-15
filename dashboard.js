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

(async () => {
  const me = await requireAdmin(); // allows admin or owner (guard handles non-admins)
  if (!me) return;

  // Owner gets the role controls; admins see them disabled
  const owner = me.role === 'owner';
  if (!owner) {
    makeAdminBtn?.setAttribute('disabled', 'true');
    makeMemberBtn?.setAttribute('disabled', 'true');
    manageEmail?.setAttribute('disabled', 'true');
  }

  who.textContent = me.email;
  role.textContent = `role: ${me.role}`;
})();

logoutBtn?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  toast('Signed out', 'ok');
  window.location.href = 'index.html';
});

// TEMP (UI-only): Record intent to change roles; real change will be a Netlify Function with service_role
async function pretendRoleChange(newRole) {
  const email = manageEmail?.value.trim();
  if (!email) {
    toast('Enter an email first', 'err');
    return;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await supabase.from('audit_log').insert({
      user_id: session.user.id,
      event_type: 'role_change_requested',
      details: { target_email: email, new_role: newRole }
    });
  }
  toast(`Requested role change: ${email} → ${newRole}`, 'ok');
}

makeAdminBtn?.addEventListener('click', () => pretendRoleChange('admin'));
makeMemberBtn?.addEventListener('click', () => pretendRoleChange('member'));
