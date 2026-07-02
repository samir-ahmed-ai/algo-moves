import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Lazy Supabase client. The arcade is fully playable without Supabase (LAN,
 * zero-config); persistence features simply switch off. `isSupabaseConfigured`
 * gates every data call so nothing throws when the env is unset.
 *
 * Only the anon public key ships to the browser — never the service-role key.
 */

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'algo-moves-games-auth',
      },
    });
  }
  return client;
}
