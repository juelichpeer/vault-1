import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://juqujzxqljocfhyzubgs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1cXVqenhxbGpvY2ZoeXp1YmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyMDc4MzUsImV4cCI6MjA3MDc4MzgzNX0._ISzq-5JFxH6f7LK0u7JjP91KQVAhU-x4aA9qgjjC6w';

// Persist sessions across reloads (so "remember device" works)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'vault-auth-v1',
  },
});
