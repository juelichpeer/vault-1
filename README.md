# VAULT — Private Workspace

Goal: Secure private app (admin-controlled sign-in, groups, chats, docs, location tags, temporary shares).
Stack: Netlify (hosting + functions), Supabase (DB + auth), GitHub (versioning), VS Code (editing).

Security: Never expose the Supabase **service_role** key in browser code or in Git.  
Only the public **anon** key is used client-side. The service key lives only in Netlify Functions env vars.
