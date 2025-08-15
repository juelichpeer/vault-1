// netlify/functions/set-role.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://juqujzxqljocfhyzubgs.supabase.co';

// IMPORTANT: set this in Netlify env, never commit it
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE;

export async function handler(event) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  // Must have service role for admin client
  if (!SERVICE_ROLE_KEY) {
    return json(500, { error: 'Missing server configuration' });
  }

  // Get the caller's Supabase access token from Authorization header
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return json(401, { error: 'Missing auth token' });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Get the caller (user making the request)
  const { data: userResult, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userResult?.user) return json(401, { error: 'Invalid token' });
  const actorId = userResult.user.id;

  // Check caller is OWNER
  const { data: actorProfile, error: profileErr } = await admin
    .from('profiles')
    .select('role,email')
    .eq('id', actorId)
    .maybeSingle();

  if (profileErr) return json(500, { error: 'Profile lookup failed' });
  if (!actorProfile || actorProfile.role !== 'owner') {
    return json(403, { error: 'Only owner can change roles' });
  }

  // Parse body
  let payload = {};
  try { payload = JSON.parse(event.body || '{}'); } catch (_) {}
  const { targetEmail, newRole } = payload;

  const allowed = ['member','admin'];
  if (!targetEmail || !allowed.includes(newRole)) {
    return json(400, { error: 'Provide targetEmail and newRole in {member|admin}' });
  }

  // Find the target user
  const { data: targetUser, error: targetErr } = await admin
    .from('profiles')
    .select('id,email,role')
    .eq('email', targetEmail)
    .maybeSingle();

  if (targetErr) return json(500, { error: 'Target lookup failed' });
  if (!targetUser) return json(404, { error: 'Target not found in profiles' });

  // Update role
  const { error: updErr } = await admin
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUser.id);

  if (updErr) return json(500, { error: 'Role update failed' });

  // Audit log (best effort)
  await admin.from('audit_log').insert({
    user_id: actorId,
    event_type: 'role_changed',
    details: { target_email: targetEmail, new_role: newRole }
  });

  return json(200, { ok: true, targetEmail, newRole });
}

function json(status, body) {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}
