// dashboard.js
import { supabase } from './supabaseClient.js';
import { requireAdmin } from './authGuard.js';

const who = document.getElementById('who');
const role = document.getElementById('role');
const logoutBtn = document.getElementById('logoutBtn');

(async () => {
  const me = await requireAdmin();
  if (!me) return; // redirected already

  who.textContent = me.email;
  role.textContent = `role: ${me.role}`;
})();

logoutBtn?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
});
