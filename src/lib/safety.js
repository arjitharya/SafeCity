// ─────────────────────────────────────────────────────────────────────────────
// SafeCity — core safety services
// Emergency siren (Web Audio), nearby help (OpenStreetMap / Overpass),
// recent earthquakes (USGS), personal emergency contacts, and location sharing.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase, ensureSession } from "./supabase";

// ── Distance (haversine, km) ─────────────────────────────────────────────────
export function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function fmtDistance(km) {
  if (km == null) return "";
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

// ── Emergency siren (Web Audio API) ──────────────────────────────────────────
// A loud, attention-grabbing two-tone siren that sweeps between two pitches.
// No audio files needed — synthesised on the fly so it always works offline.
let _ctx = null;
let _osc = null;
let _gain = null;
let _sweep = null;

export function startSiren() {
  try {
    _ctx = _ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === "suspended") _ctx.resume();
    if (_osc) return; // already running

    _osc = _ctx.createOscillator();
    _gain = _ctx.createGain();
    _osc.type = "sawtooth";
    _osc.frequency.value = 700;
    _gain.gain.value = 0.0001;
    _osc.connect(_gain).connect(_ctx.destination);
    _osc.start();
    // ramp up to a loud-but-safe level
    _gain.gain.exponentialRampToValueAtTime(0.6, _ctx.currentTime + 0.15);

    // sweep the pitch up and down like an emergency siren
    let up = true;
    _sweep = setInterval(() => {
      if (!_osc) return;
      _osc.frequency.linearRampToValueAtTime(up ? 1050 : 600, _ctx.currentTime + 0.45);
      up = !up;
    }, 450);
  } catch {
    /* audio not available */
  }
  // haptic buzz on phones
  try { navigator.vibrate?.([400, 120, 400, 120, 400]); } catch { /* ignore */ }
}

export function stopSiren() {
  try {
    if (_sweep) { clearInterval(_sweep); _sweep = null; }
    if (_gain && _ctx) _gain.gain.exponentialRampToValueAtTime(0.0001, _ctx.currentTime + 0.1);
    if (_osc) {
      const osc = _osc;
      setTimeout(() => { try { osc.stop(); osc.disconnect(); } catch { /* ignore */ } }, 150);
      _osc = null;
    }
    try { navigator.vibrate?.(0); } catch { /* ignore */ }
  } catch {
    /* ignore */
  }
}

// ── Nearby help via OpenStreetMap Overpass API ───────────────────────────────
export const PLACE_TYPES = {
  hospital:  { label: "Hospitals",    color: "#dc2626", query: 'nwr["amenity"="hospital"]' },
  police:    { label: "Police",       color: "#1d4ed8", query: 'nwr["amenity"="police"]' },
  fire:      { label: "Fire Station", color: "#ea580c", query: 'nwr["amenity"="fire_station"]' },
  shelter:   { label: "Evac Shelter", color: "#7c3aed", query: 'nwr["emergency"="assembly_point"]' },
  pharmacy:  { label: "Pharmacy",     color: "#0d9488", query: 'nwr["amenity"="pharmacy"]' },
};

const OVERPASS = "https://overpass-api.de/api/interpreter";

/** Fetch nearby emergency-relevant places within `radius` metres. */
export async function fetchNearby(lat, lon, radius = 3000, types = Object.keys(PLACE_TYPES)) {
  const blocks = types
    .map((t) => `${PLACE_TYPES[t].query}(around:${radius},${lat},${lon});`)
    .join("\n");
  const q = `[out:json][timeout:25];(${blocks});out center 60;`;
  try {
    const r = await fetch(OVERPASS, { method: "POST", body: `data=${encodeURIComponent(q)}` });
    const d = await r.json();
    const typeOf = (tags = {}) => {
      if (tags.amenity === "hospital" || tags.healthcare === "hospital") return "hospital";
      if (tags.amenity === "police") return "police";
      if (tags.amenity === "fire_station") return "fire";
      if (tags.emergency === "assembly_point") return "shelter";
      if (tags.amenity === "pharmacy") return "pharmacy";
      return "other";
    };
    return (d.elements || [])
      .map((el) => {
        const elLat = el.lat ?? el.center?.lat;
        const elLon = el.lon ?? el.center?.lon;
        if (elLat == null || elLon == null) return null;
        const t = typeOf(el.tags);
        if (!PLACE_TYPES[t]) return null;
        return {
          id: `${el.type}/${el.id}`,
          name: el.tags?.name || el.tags?.["name:en"] || PLACE_TYPES[t].label,
          type: t,
          lat: elLat,
          lon: elLon,
          phone: el.tags?.phone || el.tags?.["contact:phone"] || "",
          dist: distanceKm(lat, lon, elLat, elLon),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.dist - b.dist);
  } catch {
    return null;
  }
}

// ── Recent earthquakes via USGS ──────────────────────────────────────────────
/** Recent quakes within `radiusKm`, last `days` days, magnitude >= minMag. */
export async function fetchEarthquakes(lat, lon, { radiusKm = 800, days = 30, minMag = 3 } = {}) {
  const start = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const url =
    `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${start}` +
    `&latitude=${lat}&longitude=${lon}&maxradiuskm=${radiusKm}&minmagnitude=${minMag}` +
    `&orderby=time&limit=30`;
  try {
    const r = await fetch(url);
    const d = await r.json();
    return (d.features || []).map((f) => {
      const [qlon, qlat, depth] = f.geometry.coordinates;
      return {
        id: f.id,
        mag: f.properties.mag,
        place: f.properties.place || "Unknown location",
        time: f.properties.time,
        depth: Math.round(depth),
        url: f.properties.url,
        tsunami: !!f.properties.tsunami,
        lat: qlat,
        lon: qlon,
        dist: distanceKm(lat, lon, qlat, qlon),
      };
    });
  } catch {
    return null;
  }
}

export function magColor(m) {
  if (m == null) return "#94a3b8";
  if (m >= 6) return "#dc2626";
  if (m >= 5) return "#ea580c";
  if (m >= 4) return "#d97706";
  return "#16a34a";
}

// ── Personal emergency contacts (ICE) — local cache + cloud mirror ────────────
const CONTACTS_KEY = "safecity-contacts";

export function loadContacts() {
  try { return JSON.parse(localStorage.getItem(CONTACTS_KEY)) || []; }
  catch { return []; }
}

export function saveContacts(list) {
  try { localStorage.setItem(CONTACTS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  pushContacts(list); // fire-and-forget cloud sync
}

async function pushContacts(list) {
  const user = await ensureSession();
  if (!user || !supabase) return;
  try {
    await supabase.from("emergency_contacts").delete().eq("user_id", user.id);
    if (list.length) {
      await supabase.from("emergency_contacts").insert(
        list.map((c) => ({ user_id: user.id, name: c.name, phone: c.phone, relation: c.relation || null }))
      );
    }
  } catch (e) { console.warn("[SafeCity] contacts sync failed:", e?.message); }
}

/** Pull cloud contacts into localStorage; returns the list or null. */
export async function pullContacts() {
  const user = await ensureSession();
  if (!user || !supabase) return null;
  try {
    const { data } = await supabase.from("emergency_contacts").select("*").eq("user_id", user.id).order("created_at");
    if (!data) return null;
    const list = data.map((d) => ({ id: d.id, name: d.name, phone: d.phone, relation: d.relation || "" }));
    try { localStorage.setItem(CONTACTS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
    return list;
  } catch { return null; }
}

/** Log an SOS action (share / alarm / missed check-in) to the cloud audit trail. */
export async function logSosEvent(kind, coords, message) {
  const user = await ensureSession();
  if (!user || !supabase) return;
  try {
    await supabase.from("sos_events").insert({
      user_id: user.id, kind, lat: coords?.lat ?? null, lon: coords?.lon ?? null, message: message || null,
    });
  } catch (e) { console.warn("[SafeCity] sos_events log failed:", e?.message); }
}

// ── Share live location ──────────────────────────────────────────────────────
/** Build a Google Maps pin link for the given coordinates. */
export function mapsLink(lat, lon) {
  return `https://www.google.com/maps?q=${lat},${lon}`;
}

/**
 * Share an "I need help" message + live location via the native share sheet,
 * falling back to opening an SMS to the first contact, then clipboard.
 */
export async function shareLocation(coords, location, contacts = []) {
  if (!coords) return { ok: false, reason: "no-location" };
  const where = location ? `${location.city}${location.prefecture ? ", " + location.prefecture : ""}` : "";
  const link = mapsLink(coords.lat, coords.lon);
  const text = `🆘 I need help. My location${where ? ` (${where})` : ""}: ${link}`;

  logSosEvent("share", coords, text); // audit trail (cloud)

  if (navigator.share) {
    try { await navigator.share({ title: "SafeCity SOS", text }); return { ok: true, via: "share" }; }
    catch { /* user cancelled or unsupported — fall through */ }
  }
  const numbers = contacts.map((c) => c.phone).filter(Boolean);
  if (numbers.length) {
    window.open(`sms:${numbers.join(",")}?&body=${encodeURIComponent(text)}`, "_self");
    return { ok: true, via: "sms" };
  }
  try { await navigator.clipboard.writeText(text); return { ok: true, via: "clipboard" }; }
  catch { return { ok: false, reason: "no-channel" }; }
}
