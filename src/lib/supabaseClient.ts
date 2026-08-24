import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

if (!supabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
      '(see .env.example) — the app will show a setup screen until then.',
  );
}

// Falls back to placeholder strings so createClient doesn't throw when unconfigured;
// supabaseConfigured gates all real usage (see App.tsx's setup-required screen).
export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder');
