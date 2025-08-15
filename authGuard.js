// authGuard.js
import { supabase } from './supabaseClient.js';

export async function requireAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    window.location.href = 'index.html';
    return null;
  }

  const userId = session.user.id;
  const { data, error } = await supabase
    .from('profiles')
    .select('email, role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
    return null;
  }

  if (data.role !== 'admin') {
    // Not admin? back to login for now (members will get their own area later)
    await supabase.auth.signOut();
    window.location.href = 'index.html';
    return null;
  }

  return { email: data.email, role: data.role, userId };
}
