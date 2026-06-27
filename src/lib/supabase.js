// ─────────────────────────────────────────────────────────────────────────────
// Supabase browser client + anonymous-session helper.
// SafeCity is a client-only SPA, so we use the standard JS client (not @supabase/ssr).
// Each device signs in anonymously → gets a private auth.uid() that RLS scopes
// all rows to. If env keys are missing the app keeps working fully offline.
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
}) : null;

let _session = null;

/** Ensure an (anonymous) auth user exists; resolves to the user or null. */
export async function ensureSession() {
  if (!supabase) return null;
  if (_session) return _session;
  _session = (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) return session.user;
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) { console.warn("[SafeCity] Supabase anon sign-in failed:", error.message); return null; }
      return data.user;
    } catch (e) {
      console.warn("[SafeCity] Supabase unavailable:", e?.message);
      return null;
    }
  })();
  return _session;
}
