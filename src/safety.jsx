import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Phone, Siren, MapPin, Navigation, Share2, AlertTriangle, Activity, ShieldCheck,
  Globe, RefreshCw, Hospital, Shield, Flame, Tent, Pill, Plus, Trash2, User,
  Waves, Wind, BellRing, Heart, ChevronRight, Flashlight, Timer, Footprints, XCircle,
} from "lucide-react";
import { Panel, Label, Badge, SectionHeader, LinkRow, Spinner, cx } from "./components/ui";
import {
  PLACE_TYPES, fetchNearby, fetchEarthquakes, magColor, fmtDistance,
  loadContacts, saveContacts, pullContacts, shareLocation, mapsLink, startSiren, stopSiren, logSosEvent,
} from "./lib/safety";
import { emergencyServices, countryInfo } from "./lib/emergency";

const PLACE_ICONS = { hospital: Hospital, police: Shield, fire: Flame, shelter: Tent, pharmacy: Pill };

// ── Morse "SOS" timing (visual light beacon) ─────────────────────────────────
const U = 220; // base unit (ms)
function buildSOS() {
  const seq = [];
  const sym = (on, units) => seq.push([on, units * U]);
  const letter = (code) => code.split("").forEach((ch) => { sym(true, ch === "." ? 1 : 3); sym(false, 1); });
  ["...", "---", "..."].forEach((c, i) => { letter(c); sym(false, (i < 2 ? 3 : 7)); });
  return seq;
}

// ═════════════════════════════════════ FULL-SCREEN PANIC ALARM / SOS BEACON ═══
// mode: null = hidden, "alarm" = loud red siren, "beacon" = silent Morse-SOS light.
export function EmergencySignal({ mode, onStop }) {
  const [lit, setLit] = useState(true);

  useEffect(() => {
    if (!mode) return;
    const onKey = (e) => { if (e.key === "Escape") onStop(); };
    window.addEventListener("keydown", onKey);

    if (mode === "alarm") {
      startSiren();
      return () => { stopSiren(); window.removeEventListener("keydown", onKey); };
    }
    // beacon: flash white screen in Morse SOS, looping
    const seq = buildSOS();
    let i = 0, timer;
    const step = () => {
      const [on, dur] = seq[i % seq.length];
      setLit(on);
      try { if (on) navigator.vibrate?.(dur); } catch { /* ignore */ }
      i += 1;
      timer = setTimeout(step, dur);
    };
    step();
    return () => { clearTimeout(timer); window.removeEventListener("keydown", onKey); };
  }, [mode, onStop]);

  const beacon = mode === "beacon";
  return (
    <AnimatePresence>
      {mode && (
        <motion.div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {beacon ? (
            <div className="absolute inset-0 transition-colors duration-75" style={{ background: lit ? "#ffffff" : "#000000" }} />
          ) : (
            <motion.div className="absolute inset-0"
              animate={{ backgroundColor: ["#dc2626", "#ffffff", "#dc2626"] }}
              transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }} />
          )}
          <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
            <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 0.7, repeat: Infinity }}>
              {beacon ? <Flashlight size={84} style={{ color: lit ? "#111" : "#fff" }} strokeWidth={2.4} />
                      : <Siren size={88} className="text-white drop-shadow-lg" strokeWidth={2.4} />}
            </motion.div>
            <p className={cx("text-3xl font-black drop-shadow", beacon ? "" : "text-white")} style={beacon ? { color: lit ? "#111" : "#fff" } : undefined}>
              {beacon ? "SOS BEACON" : "ALARM ACTIVE"}
            </p>
            <p className={cx("max-w-xs text-sm font-semibold", beacon ? "" : "text-white/90")} style={beacon ? { color: lit ? "#333" : "#eee" } : undefined}>
              {beacon ? "Your screen is flashing “SOS” in Morse code to signal rescuers — point it toward help."
                      : "A loud siren is sounding to attract attention and deter threats. Get to safety."}
            </p>
            <button onClick={onStop}
              className={cx("mt-2 rounded-2xl px-10 py-4 text-lg font-black shadow-xl active:scale-95",
                beacon ? "bg-gray-900 text-white" : "bg-white text-red-600")}>
              STOP
            </button>
            <p className={cx("text-xs font-medium", beacon ? "text-gray-500" : "text-white/70")}>Press ESC or the button to stop</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════ SOS HOME ════
export function SafetyHomeSection({ coords, location, account, onAlarm, onBeacon, onCallEmergency, onAccount, setActiveSection }) {
  const [contacts, setContacts] = useState(loadContacts);
  const [editing, setEditing] = useState(false);
  const [nearest, setNearest] = useState(null);
  const [quake, setQuake] = useState(null);
  const [shareMsg, setShareMsg] = useState("");
  const country = countryInfo(location?.country);
  const services = emergencyServices(location?.country);

  // Hydrate contacts from the cloud (cross-device) once on mount.
  useEffect(() => { pullContacts().then((l) => { if (l) setContacts(l); }); }, []);

  useEffect(() => {
    if (!coords) return;
    fetchNearby(coords.lat, coords.lon, 3000, ["hospital", "police", "shelter"]).then((p) => {
      if (!p) return;
      const pick = (t) => p.find((x) => x.type === t);
      setNearest({ hospital: pick("hospital"), police: pick("police"), shelter: pick("shelter") });
    });
    fetchEarthquakes(coords.lat, coords.lon, { radiusKm: 600, days: 7, minMag: 3 }).then((q) => {
      if (q?.length) setQuake(q[0]);
    });
  }, [coords]);

  const doShare = async () => {
    const res = await shareLocation(coords, location, contacts);
    setShareMsg(
      res.ok
        ? res.via === "clipboard" ? "Location copied to clipboard — paste it to anyone."
        : res.via === "sms" ? "Opening a message to your emergency contacts…"
        : "Sharing your location…"
        : res.reason === "no-location" ? "Enable location first to share it."
        : "Add an emergency contact or enable sharing on this device."
    );
    setTimeout(() => setShareMsg(""), 4000);
  };

  return (
    <div className="grid gap-4">
      {/* Greeting */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-red-600">{country.flag} {country.name}</p>
          <h1 className="truncate text-xl font-black text-gray-900">{account?.name ? `Stay safe, ${account.name.split(" ")[0]}` : "Stay safe"}</h1>
        </div>
        {!account && (
          <button onClick={onAccount} className="shrink-0 rounded-full border-[1.5px] border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
            Set up profile
          </button>
        )}
      </div>

      {/* Big SOS / panic alarm + silent SOS beacon */}
      <div className="flex gap-3">
        <motion.button
          onClick={onAlarm} whileTap={{ scale: 0.97 }}
          className="relative min-w-0 flex-1 overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 to-rose-700 p-6 text-center text-white shadow-lg"
        >
          <motion.span className="pointer-events-none absolute inset-0 bg-white/10"
            animate={{ opacity: [0, 0.3, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
          <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.6, repeat: Infinity }}>
            <Siren size={40} className="mx-auto" />
          </motion.div>
          <p className="mt-2 text-2xl font-black tracking-tight">PANIC ALARM</p>
          <p className="text-sm font-semibold text-white/85">Tap to sound a loud siren</p>
        </motion.button>
        <motion.button
          onClick={onBeacon} whileTap={{ scale: 0.97 }}
          className="flex w-[104px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-3xl bg-gray-900 p-3 text-center text-white shadow-lg"
        >
          <Flashlight size={26} />
          <p className="text-sm font-black leading-tight">SOS<br />LIGHT</p>
          <p className="text-[10px] font-medium text-white/60">Silent</p>
        </motion.button>
      </div>

      {/* Quick emergency calls — auto-localised to your country */}
      <Panel accent>
        <div className="mb-2 flex items-center justify-between">
          <Label className="mb-0">Emergency — One Tap</Label>
          <span className="text-[11px] font-bold text-gray-500">{country.flag} {country.name}</span>
        </div>
        <div className={cx("grid gap-2.5", services.length >= 3 ? "grid-cols-3" : services.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
          {services.map((e) => (
            <a key={e.number + e.key} href={`tel:${e.number}`}
              className="flex flex-col items-center gap-1 rounded-2xl p-3 text-white transition active:scale-95" style={{ background: e.color }}>
              <Phone size={18} />
              <span className="text-2xl font-black leading-none">{e.number}</span>
              <span className="text-[10px] font-semibold opacity-85">{e.label}</span>
            </a>
          ))}
        </div>
        {country.note && <p className="mt-2 text-[11px] text-gray-400">{country.note}</p>}
        <button onClick={onCallEmergency} className="mt-2.5 w-full rounded-xl border-[1.5px] border-gray-200 bg-slate-50 py-2.5 text-xs font-semibold text-gray-600">
          All emergency numbers & disaster lines
        </button>
      </Panel>

      {/* Walk-with-me safety check-in */}
      <CheckInPanel coords={coords} location={location} contacts={contacts} onAlarm={onAlarm} />


      {/* Share my location */}
      <Panel>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Share2 size={20} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900">Share my live location</p>
            <p className="text-[11px] text-gray-500">{contacts.length ? `SOS pin to ${contacts.length} saved contact${contacts.length > 1 ? "s" : ""}.` : "Send an SOS pin via your phone's share sheet."}</p>
          </div>
          <button onClick={doShare} className="shrink-0 rounded-xl bg-blue-600 px-3.5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700">Send</button>
        </div>
        {shareMsg && <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">{shareMsg}</p>}
      </Panel>

      {/* Nearest help */}
      <Panel>
        <div className="mb-3 flex items-center justify-between">
          <Label className="mb-0">Nearest Help</Label>
          <button onClick={() => setActiveSection("map")} className="flex items-center gap-1 text-[11px] font-bold text-blue-700">Open map <ChevronRight size={12} /></button>
        </div>
        {!coords ? (
          <p className="py-3 text-center text-sm text-gray-400">Enable location to find nearby help.</p>
        ) : !nearest ? (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-400"><Spinner /> Locating services…</div>
        ) : (
          <div className="grid gap-2">
            {[
              { t: "hospital", label: "Hospital" },
              { t: "police", label: "Police" },
              { t: "shelter", label: "Evacuation shelter" },
            ].map(({ t, label }) => {
              const p = nearest[t]; const Ic = PLACE_ICONS[t]; const c = PLACE_TYPES[t].color;
              return (
                <a key={t} href={p ? mapsLink(p.lat, p.lon) : undefined} target="_blank" rel="noopener noreferrer"
                  className={cx("flex items-center gap-3 rounded-xl border border-gray-200 bg-slate-50 p-3", !p && "pointer-events-none opacity-60")}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ background: c }}><Ic size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-900">{p?.name || label}</p>
                    <p className="text-[11px] text-gray-500">{p ? `Nearest ${label.toLowerCase()}` : `No ${label.toLowerCase()} found nearby`}</p>
                  </div>
                  {p && <Badge type="info">{fmtDistance(p.dist)}</Badge>}
                </a>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Latest quake banner */}
      {quake && (
        <button onClick={() => setActiveSection("quakes")} className="text-left">
          <Panel>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black text-white" style={{ background: magColor(quake.mag) }}>
                {quake.mag?.toFixed(1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900">Recent quake · {quake.place}</p>
                <p className="text-[11px] text-gray-500">{fmtDistance(quake.dist)} away · {new Date(quake.time).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              {quake.tsunami ? <Badge type="danger">Tsunami</Badge> : <ChevronRight size={16} className="text-gray-400" />}
            </div>
          </Panel>
        </button>
      )}

      {/* Emergency contacts */}
      <ContactsPanel contacts={contacts} setContacts={setContacts} editing={editing} setEditing={setEditing} />
    </div>
  );
}

function ContactsPanel({ contacts, setContacts, editing, setEditing }) {
  const [form, setForm] = useState({ name: "", phone: "", relation: "" });
  const add = () => {
    if (!form.name || !form.phone) return;
    const next = [...contacts, { ...form, id: Date.now() }];
    setContacts(next); saveContacts(next); setForm({ name: "", phone: "", relation: "" });
  };
  const remove = (id) => { const next = contacts.filter((c) => c.id !== id); setContacts(next); saveContacts(next); };

  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between">
        <Label className="mb-0">Emergency Contacts (ICE)</Label>
        <button onClick={() => setEditing((e) => !e)} className="text-[11px] font-bold text-blue-700">{editing ? "Done" : "Edit"}</button>
      </div>
      {contacts.length === 0 && !editing && (
        <p className="py-2 text-sm text-gray-400">No contacts yet. Tap Edit to add the people SafeCity should alert.</p>
      )}
      <div className="grid gap-2">
        {contacts.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-slate-50 p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700"><User size={16} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-gray-900">{c.name} {c.relation && <span className="font-normal text-gray-400">· {c.relation}</span>}</p>
              <p className="text-[11px] text-gray-500">{c.phone}</p>
            </div>
            <a href={`tel:${c.phone}`} className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><Phone size={15} /></a>
            {editing && <button onClick={() => remove(c.id)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600"><Trash2 size={15} /></button>}
          </div>
        ))}
      </div>
      {editing && (
        <div className="mt-3 grid gap-2 rounded-xl border border-dashed border-gray-300 p-3">
          <div className="grid grid-cols-2 gap-2">
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Name"
              className="rounded-lg border-[1.5px] border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400" />
            <input value={form.relation} onChange={(e) => setForm((p) => ({ ...p, relation: e.target.value }))} placeholder="Relation"
              className="rounded-lg border-[1.5px] border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400" />
          </div>
          <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone number" type="tel"
            className="rounded-lg border-[1.5px] border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400" />
          <button onClick={add} className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white"><Plus size={15} /> Add contact</button>
        </div>
      )}
    </Panel>
  );
}

// ── "Walk with me" safety check-in ───────────────────────────────────────────
// Set a timer; if you don't tap "I'm safe" before it ends, SafeCity shares your
// live location with your emergency contacts and sounds the alarm.
function CheckInPanel({ coords, location, contacts, onAlarm }) {
  const [left, setLeft] = useState(0); // seconds remaining; 0 = inactive
  const [done, setDone] = useState(false);
  const tick = useRef(null);

  useEffect(() => () => clearInterval(tick.current), []);

  const start = (mins) => {
    setDone(false);
    setLeft(mins * 60);
    clearInterval(tick.current);
    tick.current = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(tick.current);
          setDone(true);
          logSosEvent("checkin_missed", coords, "Walk-with-me timer expired");
          shareLocation(coords, location, contacts);
          onAlarm?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const cancel = () => { clearInterval(tick.current); setLeft(0); setDone(false); };

  const mmss = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;

  return (
    <Panel>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Footprints size={20} /></span>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900">Walk-with-me check-in</p>
          <p className="text-[11px] text-gray-500">{left > 0 ? "Tap “I'm safe” before the timer ends." : "Auto-alerts your contacts if you don't check in."}</p>
        </div>
        {left > 0 && <span className="flex items-center gap-1 font-mono text-lg font-black text-amber-600"><Timer size={16} /> {mmss}</span>}
      </div>

      {left > 0 ? (
        <button onClick={cancel} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-700">
          <ShieldCheck size={16} /> I'm safe — cancel
        </button>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[15, 30, 60].map((m) => (
            <button key={m} onClick={() => start(m)} className="rounded-xl border-[1.5px] border-amber-200 bg-amber-50 py-2.5 text-sm font-bold text-amber-700 transition hover:bg-amber-100">{m} min</button>
          ))}
        </div>
      )}

      {done && (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          <XCircle size={14} /> Time's up — alerting your emergency contacts now.
        </p>
      )}
    </Panel>
  );
}

// ════════════════════════════════════════════════════════════ NEARBY MAP ═════
export function NearbyMapSection({ coords, location }) {
  const [places, setPlaces] = useState(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState("all");
  const [radius, setRadius] = useState(3000);
  const mapRef = useRef(null);
  const mapEl = useRef(null);
  const layerRef = useRef(null);

  const load = useCallback(async () => {
    if (!coords) return;
    setLoading(true);
    const p = await fetchNearby(coords.lat, coords.lon, radius);
    setPlaces(p); setLoading(false);
  }, [coords, radius]);

  useEffect(() => { load(); }, [load]);

  // init map once
  useEffect(() => {
    if (!coords || mapRef.current || !mapEl.current) return;
    const map = L.map(mapEl.current, { zoomControl: true, attributionControl: false }).setView([coords.lat, coords.lon], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    // "you are here"
    L.marker([coords.lat, coords.lon], {
      icon: L.divIcon({
        className: "", html: `<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,.3)"></div>`,
        iconSize: [18, 18], iconAnchor: [9, 9],
      }),
    }).addTo(map).bindPopup("You are here");
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);
  }, [coords]);

  // re-plot markers when places / filter change
  useEffect(() => {
    const lg = layerRef.current; if (!lg || !places) return;
    lg.clearLayers();
    const shown = places.filter((p) => active === "all" || p.type === active);
    shown.forEach((p) => {
      const color = PLACE_TYPES[p.type].color;
      L.marker([p.lat, p.lon], {
        icon: L.divIcon({
          className: "",
          html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
          iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24],
        }),
      }).addTo(lg).bindPopup(
        `<strong>${p.name}</strong><br/>${PLACE_TYPES[p.type].label} · ${fmtDistance(p.dist)}` +
        (p.phone ? `<br/>📞 ${p.phone}` : "") +
        `<br/><a href="${mapsLink(p.lat, p.lon)}" target="_blank" rel="noopener">Directions ›</a>`
      );
    });
  }, [places, active]);

  const filtered = (places || []).filter((p) => active === "all" || p.type === active);

  return (
    <div className="grid gap-4">
      <SectionHeader icon={Navigation} title="Nearby Safety" subtitle={location?.city ? `Help around ${location.city}` : "Help around you"} color="#1d4ed8" />

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {["all", ...Object.keys(PLACE_TYPES)].map((t) => {
          const on = active === t;
          const label = t === "all" ? "All" : PLACE_TYPES[t].label;
          const color = t === "all" ? "#1d4ed8" : PLACE_TYPES[t].color;
          return (
            <button key={t} onClick={() => setActive(t)}
              className={cx("shrink-0 rounded-full border-[1.5px] px-3.5 py-1.5 text-xs font-bold transition")}
              style={on ? { background: color, borderColor: color, color: "#fff" } : { borderColor: "#e2e8f0", color: "#64748b" }}>
              {label}
            </button>
          );
        })}
        <button onClick={load} className="ml-auto flex shrink-0 items-center gap-1 rounded-full border-[1.5px] border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-500">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {!coords ? (
        <Panel><div className="py-10 text-center"><MapPin size={36} className="mx-auto text-gray-400" /><p className="mt-2 text-sm text-gray-400">Enable location to map nearby help.</p></div></Panel>
      ) : (
        <>
          <div className="relative z-0 isolate overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
            <div ref={mapEl} style={{ height: 320, width: "100%" }} />
            <div className="flex items-center justify-between gap-2 border-t border-gray-200 bg-white px-3 py-2">
              <span className="text-[11px] text-gray-400">Search radius</span>
              <div className="flex gap-1.5">
                {[1000, 3000, 5000].map((r) => (
                  <button key={r} onClick={() => setRadius(r)}
                    className={cx("rounded-lg px-2.5 py-1 text-[11px] font-bold", radius === r ? "bg-blue-600 text-white" : "bg-slate-100 text-gray-500")}>
                    {r / 1000} km
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading && <Panel><div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400"><Spinner /> Searching OpenStreetMap…</div></Panel>}
          {!loading && places === null && <Panel><div className="py-6 text-center"><AlertTriangle size={28} className="mx-auto text-amber-500" /><p className="mt-2 text-sm text-gray-500">Couldn't reach the map service. Try Refresh.</p></div></Panel>}
          {!loading && places && (
            <div className="grid gap-2">
              {filtered.length === 0 && <Panel><p className="py-4 text-center text-sm text-gray-400">Nothing found in this radius.</p></Panel>}
              {filtered.slice(0, 30).map((p) => {
                const Ic = PLACE_ICONS[p.type]; const c = PLACE_TYPES[p.type].color;
                return (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: c }}><Ic size={18} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-gray-900">{p.name}</p>
                      <p className="text-[11px] text-gray-500">{PLACE_TYPES[p.type].label} · {fmtDistance(p.dist)}{p.phone ? ` · ${p.phone}` : ""}</p>
                    </div>
                    <a href={mapsLink(p.lat, p.lon)} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700"><Navigation size={15} /></a>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════ EARTHQUAKES ════
export function EarthquakeSection({ coords, location }) {
  const [quakes, setQuakes] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!coords) return;
    setLoading(true);
    const q = await fetchEarthquakes(coords.lat, coords.lon, { radiusKm: 800, days: 30, minMag: 2.5 });
    setQuakes(q); setLoading(false);
  }, [coords]);

  useEffect(() => { load(); }, [load]);

  const timeAgo = (t) => {
    const h = (Date.now() - t) / 36e5;
    if (h < 1) return `${Math.round(h * 60)}m ago`;
    if (h < 24) return `${Math.round(h)}h ago`;
    return `${Math.round(h / 24)}d ago`;
  };

  return (
    <div className="grid gap-4">
      <SectionHeader icon={Activity} title="Earthquakes" subtitle={location?.city ? `Within ~800 km of ${location.city}` : "Seismic activity near you"} color="#ea580c" />

      <Panel accent>
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <ShieldCheck size={15} className="mt-0.5 shrink-0" />
          <span>In a quake: <strong>Drop, Cover, Hold On.</strong> Stay away from windows; protect your head; do not rush outside. After shaking stops, head to your nearest evacuation shelter.</span>
        </div>
      </Panel>

      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500">Last 30 days · USGS live feed</p>
        <button onClick={load} className="flex items-center gap-1 rounded-full border-[1.5px] border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-500">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {!coords && <Panel><p className="py-6 text-center text-sm text-gray-400">Enable location to see nearby seismic activity.</p></Panel>}
      {loading && <Panel><div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400"><Spinner /> Loading USGS data…</div></Panel>}
      {!loading && quakes === null && coords && <Panel><div className="py-6 text-center"><AlertTriangle size={28} className="mx-auto text-amber-500" /><p className="mt-2 text-sm text-gray-500">Couldn't load earthquake data. Try Refresh.</p></div></Panel>}
      {!loading && quakes?.length === 0 && <Panel><div className="py-8 text-center"><ShieldCheck size={36} className="mx-auto text-emerald-500" /><p className="mt-2 text-sm text-gray-500">No notable earthquakes nearby in the last 30 days.</p></div></Panel>}

      {!loading && quakes?.length > 0 && (
        <div className="grid gap-2">
          {quakes.map((q) => (
            <a key={q.id} href={q.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl font-black text-white" style={{ background: magColor(q.mag) }}>
                <span className="text-lg leading-none">{q.mag?.toFixed(1)}</span>
                <span className="text-[8px] font-bold opacity-80">MAG</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900">{q.place}</p>
                <p className="text-[11px] text-gray-500">{fmtDistance(q.dist)} away · {q.depth} km deep · {timeAgo(q.time)}</p>
              </div>
              {q.tsunami ? <Badge type="danger"><Waves size={11} /> Tsunami</Badge> : <Badge type={q.mag >= 5 ? "warning" : "neutral"}>M{q.mag?.toFixed(1)}</Badge>}
            </a>
          ))}
        </div>
      )}

      <Panel>
        <Label>Official Alert Sources</Label>
        <div className="grid gap-2">
          {[
            { label: "JMA Earthquake Info", url: "https://www.jma.go.jp/bosai/map.html#5/34.5/137/&elem=int&contents=earthquake_map", desc: "Japan Meteorological Agency live map" },
            { label: "JMA Tsunami Warnings", url: "https://www.jma.go.jp/bosai/map.html#5/34.5/137/&elem=warn&contents=tsunami", desc: "Official tsunami advisories" },
            { label: "USGS Latest Earthquakes", url: "https://earthquake.usgs.gov/earthquakes/map/", desc: "Global seismic monitoring" },
          ].map((r) => <LinkRow key={r.label} icon={Globe} title={r.label} desc={r.desc} url={r.url} color="#ea580c" />)}
        </div>
      </Panel>
    </div>
  );
}

// ══════════════════════════════════════════════════════════ PREPAREDNESS ═════
const GUIDES = [
  { id: "quake", icon: Activity, color: "#ea580c", title: "Earthquake", steps: ["Drop, Cover, Hold On under a sturdy table.", "Stay away from windows, shelves and heavy objects.", "Do not run outside during shaking.", "After shaking: turn off gas, grab your emergency bag, head to a shelter."] },
  { id: "tsunami", icon: Waves, color: "#0ea5e9", title: "Tsunami", steps: ["If near the coast and you feel a strong quake, evacuate to high ground immediately.", "Do not wait for an official warning.", "Follow 津波避難 (tsunami evacuation) signs uphill.", "Stay away from the shore until authorities say it's safe."] },
  { id: "fire", icon: Flame, color: "#dc2626", title: "Fire", steps: ["Stay low under smoke; cover your nose and mouth.", "Call 119. Shout 火事だ！(Fire!) to alert others.", "Use stairs, never elevators.", "Once out, stay out — do not go back in."] },
  { id: "typhoon", icon: Wind, color: "#7c3aed", title: "Typhoon / Flood", steps: ["Charge devices and prepare water & food in advance.", "Move to higher floors if flooding is likely.", "Avoid rivers, drains and underpasses.", "Follow local 避難指示 (evacuation orders) promptly."] },
  { id: "firstaid", icon: Heart, color: "#16a34a", title: "First Aid / CPR", steps: ["Check responsiveness and breathing.", "Call 119 and ask a bystander to find an AED.", "Push hard and fast in the centre of the chest (~100–120/min).", "Continue until help or the AED arrives."] },
];

const KIT_ITEMS = ["Water (3 days)", "Non-perishable food", "Flashlight + batteries", "First-aid kit", "Portable charger", "Cash & ID copies", "Whistle", "Medications", "Warm blanket", "Radio"];

const RESOURCES = {
  jp: [
    { label: "Japan Meteorological Agency", url: "https://www.jma.go.jp/jma/indexe.html", desc: "Earthquakes, tsunamis, warnings" },
    { label: "Safety Tips (JNTO)", url: "https://www.jnto.go.jp/safety-tips/eng/", desc: "Disaster info in English" },
    { label: "NHK World Emergency Info", url: "https://www3.nhk.or.jp/nhkworld/en/information/", desc: "Real-time disaster broadcasts" },
  ],
  us: [
    { label: "Ready.gov", url: "https://www.ready.gov/", desc: "Official US disaster preparedness" },
    { label: "FEMA", url: "https://www.fema.gov/", desc: "Federal emergency management" },
    { label: "National Weather Service", url: "https://www.weather.gov/", desc: "Watches, warnings & alerts" },
  ],
};
const RESOURCES_GLOBAL = [
  { label: "Red Cross / Red Crescent", url: "https://www.ifrc.org/", desc: "Disaster relief worldwide" },
  { label: "WHO Emergencies", url: "https://www.who.int/emergencies", desc: "Health emergency guidance" },
];

export function PreparednessSection({ country = { name: "your area", code: "" } }) {
  const [open, setOpen] = useState("quake");
  const [kit, setKit] = useState(() => { try { return JSON.parse(localStorage.getItem("safecity-kit")) || {}; } catch { return {}; } });
  const code = (country.code || country.name || "").toLowerCase();
  const cc = code === "japan" ? "jp" : code === "united states" ? "us" : code;
  const resources = [...(RESOURCES[cc] || []), ...RESOURCES_GLOBAL];
  const toggleKit = (item) => setKit((prev) => { const n = { ...prev, [item]: !prev[item] }; try { localStorage.setItem("safecity-kit", JSON.stringify(n)); } catch { /* ignore */ } return n; });
  const packed = Object.values(kit).filter(Boolean).length;

  return (
    <div className="grid gap-4">
      <SectionHeader icon={BellRing} title="Be Prepared" subtitle="What to do when seconds count" color="#16a34a" />

      <Panel accent>
        <Label>Emergency Action Guides</Label>
        <div className="grid gap-2">
          {GUIDES.map((g) => {
            const Ic = g.icon; const isOpen = open === g.id;
            return (
              <div key={g.id} className="overflow-hidden rounded-xl border border-gray-200">
                <button onClick={() => setOpen(isOpen ? "" : g.id)} className="flex w-full items-center gap-3 bg-slate-50 p-3 text-left">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ background: g.color }}><Ic size={16} /></span>
                  <span className="flex-1 text-sm font-bold text-gray-900">{g.title}</span>
                  <ChevronRight size={16} className={cx("text-gray-400 transition", isOpen && "rotate-90")} />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.ol initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="list-none bg-white px-3 py-1">
                      {g.steps.map((s, i) => (
                        <li key={i} className="flex gap-2.5 border-b border-gray-100 py-2.5 last:border-0">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: g.color }}>{i + 1}</span>
                          <span className="text-sm text-gray-700">{s}</span>
                        </li>
                      ))}
                    </motion.ol>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel>
        <div className="mb-2 flex items-center justify-between">
          <Label className="mb-0">Emergency Kit Checklist</Label>
          <span className="text-[11px] font-bold text-emerald-700">{packed}/{KIT_ITEMS.length} packed</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {KIT_ITEMS.map((item) => (
            <label key={item} className={cx("flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition", kit[item] ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-gray-700")}>
              <input type="checkbox" checked={!!kit[item]} onChange={() => toggleKit(item)} className="h-4 w-4 accent-emerald-600" /> {item}
            </label>
          ))}
        </div>
      </Panel>

      <Panel>
        <Label>Official Disaster Resources — {country.name}</Label>
        <div className="grid gap-2">
          {resources.map((r) => <LinkRow key={r.label} icon={Globe} title={r.label} desc={r.desc} url={r.url} color="#16a34a" />)}
        </div>
      </Panel>
    </div>
  );
}
