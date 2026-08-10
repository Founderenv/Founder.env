import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const requestedMode = (import.meta.env.VITE_DATA_MODE ?? 'auto').trim().toLowerCase();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const dataMode: 'supabase' | 'mock' = requestedMode === 'mock' ? 'mock' : isSupabaseConfigured ? 'supabase' : 'mock';

if (requestedMode === 'supabase' && !isSupabaseConfigured) {
  throw new Error('Supabase mode requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured. Add the public URL and anon key to .env.local.');
  return supabase;
}
