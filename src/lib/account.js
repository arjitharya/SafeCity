// ─────────────────────────────────────────────────────────────────────────────
// SafeCity account store. localStorage is the instant/offline cache; Supabase is
// the cloud source of truth (write-through on save, pull on startup). Callers can
// stay synchronous — cloud sync happens in the background.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase, ensureSession } from "./supabase";

const KEY = "safecity-account";

export function loadAccount() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; }
  catch { return null; }
}

export function saveAccount(account) {
  try { localStorage.setItem(KEY, JSON.stringify(account)); } catch { /* ignore */ }
  pushProfile(account); // fire-and-forget cloud sync
  return account;
}

export function clearAccount() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

async function pushProfile(account) {
  const user = await ensureSession();
  if (!user || !supabase || !account) return;
  try {
    await supabase.from("profiles").upsert({
      id: user.id,
      name: account.name || null,
      email: account.email || null,
      phone: account.phone || null,
      blood_type: account.bloodType || null,
      country: account.country || null,
      notif_pref: account.prefNotifs ?? true,
    });
  } catch (e) { console.warn("[SafeCity] profile sync failed:", e?.message); }
}

/** Pull the cloud profile into localStorage; returns the account or null. */
export async function pullAccount() {
  const user = await ensureSession();
  if (!user || !supabase) return null;
  try {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (!data) return null;
    const account = {
      name: data.name || "", email: data.email || "", phone: data.phone || "",
      bloodType: data.blood_type || "", country: data.country || "", prefNotifs: data.notif_pref ?? true,
    };
    try { localStorage.setItem(KEY, JSON.stringify(account)); } catch { /* ignore */ }
    return account;
  } catch { return null; }
}
