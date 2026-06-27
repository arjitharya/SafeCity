import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Siren, Navigation, Activity, BellRing, Newspaper, FileText, Sparkles,
  Menu, User, Phone, ShieldCheck, Moon, Sun, AlertTriangle, RefreshCw,
} from "lucide-react";
import { useTheme } from "./context/ThemeContext";
import { reverseGeocode, fetchWeather, fetchAQI } from "./lib/sources";
import { stopSiren } from "./lib/safety";
import { countryInfo, primaryNumber } from "./lib/emergency";
import { loadAccount, saveAccount, pullAccount } from "./lib/account";
import { cx } from "./components/ui";
import { OnboardingModal, EmergencyModal, AccountModal, ReportForm } from "./components/modals";
import {
  EmergencySignal, SafetyHomeSection, NearbyMapSection, EarthquakeSection, PreparednessSection,
} from "./safety";
import { ServicesSection, NewsSection, AssistantSection } from "./sections";

// Primary = personal safety. "More" = a couple of useful civic extras.
const SAFETY_NAV = [
  { id: "home", icon: Siren, label: "SOS", full: "Safety Home" },
  { id: "map", icon: Navigation, label: "Nearby", full: "Nearby Help" },
  { id: "quakes", icon: Activity, label: "Quakes", full: "Earthquakes" },
  { id: "news", icon: Newspaper, label: "Alerts", full: "Alerts & News" },
  { id: "prepare", icon: BellRing, label: "Prepare", full: "Be Prepared" },
];
const MORE_NAV = [
  { id: "services", icon: FileText, label: "Report", full: "Report an Issue" },
  { id: "assistant", icon: Sparkles, label: "AI", full: "AI Assistant" },
];
const NAV = [...SAFETY_NAV, ...MORE_NAV];
const BOTTOM_NAV = ["home", "map", "quakes", "news", "prepare"];

const DEFAULT_COORDS = { lat: 35.6762, lon: 139.6503 }; // Tokyo fallback

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return now;
}

export default function App() {
  const { isDark, toggleTheme } = useTheme();
  const now = useLiveClock();

  const [splash, setSplash] = useState(() => {
    try { return !sessionStorage.getItem("safecity-splash"); } catch { return true; }
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [modal, setModal] = useState(null); // 'onboarding' | 'emergency' | 'account' | 'report' | null
  const [signal, setSignal] = useState(null); // 'alarm' | 'beacon' | null

  const [account, setAccount] = useState(loadAccount);
  const [reports, setReports] = useState([]);

  const [location, setLocation] = useState(null);
  const [coords, setCoords] = useState(null);
  const [weather, setWeather] = useState(null);
  const [aqi, setAqi] = useState(null);
  const [locError, setLocError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [locPerm, setLocPerm] = useState("prompt");
  const [notifPerm, setNotifPerm] = useState(typeof Notification !== "undefined" ? Notification.permission : "denied");

  const country = countryInfo(location?.country);

  const persistAccount = useCallback((a) => {
    const merged = { ...a, country: location?.country || a.country || null };
    setAccount(merged); saveAccount(merged);
  }, [location]);

  // Pull the cloud profile once on startup (cross-device), falling back to cache.
  useEffect(() => { pullAccount().then((a) => { if (a) setAccount(a); }); }, []);

  const loadLocationData = useCallback(async (lat, lon) => {
    setLoading(true);
    try {
      const [geo, wx, aq] = await Promise.all([reverseGeocode(lat, lon), fetchWeather(lat, lon), fetchAQI(lat, lon)]);
      if (geo) setLocation(geo);
      if (wx) setWeather(wx);
      if (aq) setAqi(aq);
    } finally {
      setLoading(false);
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocError("Geolocation not supported — showing Tokyo as a fallback."); setLocPerm("denied"); setCoords(DEFAULT_COORDS); loadLocationData(DEFAULT_COORDS.lat, DEFAULT_COORDS.lon); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { const { latitude: lat, longitude: lon } = pos.coords; setCoords({ lat, lon }); setLocPerm("granted"); setLocError(null); loadLocationData(lat, lon); },
      () => { setLocPerm("denied"); setLocError("Location access denied — showing Tokyo as a fallback. Enable GPS for local safety data."); setCoords(DEFAULT_COORDS); loadLocationData(DEFAULT_COORDS.lat, DEFAULT_COORDS.lon); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [loadLocationData]);

  const requestNotifications = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    try { const p = await Notification.requestPermission(); setNotifPerm(p); } catch { /* ignore */ }
  }, []);

  // Dismiss the splash after its animation.
  useEffect(() => {
    if (!splash) return;
    const t = setTimeout(() => { setSplash(false); try { sessionStorage.setItem("safecity-splash", "1"); } catch { /* ignore */ } }, 2000);
    return () => clearTimeout(t);
  }, [splash]);

  // First-run onboarding (asks for location + notifications). Otherwise auto-load location.
  useEffect(() => {
    const demo = new URLSearchParams(window.location.search).has("demo");
    const seen = (() => { try { return localStorage.getItem("safecity-onboarded"); } catch { return null; } })();
    if (demo) { requestLocation(); return; }
    if (!seen) setModal("onboarding");
    else requestLocation();
  }, [requestLocation]);

  // Make sure the siren never keeps running if the component unmounts.
  useEffect(() => () => stopSiren(), []);

  const closeOnboarding = () => { try { localStorage.setItem("safecity-onboarded", "1"); } catch { /* ignore */ } setModal(null); if (!coords) requestLocation(); };
  const handleReport = (data) => { setReports((r) => [data, ...r]); setModal(null); };

  return (
    <div data-theme={isDark ? "dark" : "light"} className="min-h-dvh overflow-x-clip bg-slate-50 font-sans text-gray-900">
      <Splash show={splash} />

      {/* Panic alarm / SOS beacon overlay */}
      <EmergencySignal mode={signal} onStop={() => setSignal(null)} />

      {/* Modals */}
      <AnimatePresence>
        {modal === "onboarding" && (
          <OnboardingModal
            key="onboarding"
            locationState={locPerm} notifState={notifPerm} loading={loading}
            onRequestLocation={requestLocation} onRequestNotifications={requestNotifications}
            onClose={closeOnboarding}
          />
        )}
        {modal === "emergency" && <EmergencyModal key="emergency" country={location?.country} onClose={() => setModal(null)} />}
        {modal === "account" && <AccountModal key="account" account={account} country={country} onSave={persistAccount} onClose={() => setModal(null)} />}
        {modal === "report" && <ReportForm key="report" location={location} account={account} onClose={() => setModal(null)} onSubmit={handleReport} />}
      </AnimatePresence>

      <Sidebar
        open={sidebarOpen} onClose={() => setSidebarOpen(false)}
        active={activeSection} setActive={setActiveSection}
        account={account} onAccount={() => { setModal("account"); setSidebarOpen(false); }}
        location={location} country={country}
      />

      <div className="lg:ml-[272px]">
        {/* Header */}
        <header className="safe-top sticky top-0 z-20 flex items-center gap-2.5 border-b border-gray-200 bg-white/90 px-3 py-2.5 backdrop-blur-xl sm:px-4">
          <button onClick={() => setSidebarOpen(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border-[1.5px] border-gray-200 bg-slate-50 text-gray-600 lg:hidden">
            <Menu size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-gray-900">{location ? `${location.city}${location.prefecture ? `, ${location.prefecture}` : ""}` : "SafeCity"}</p>
            <p className="truncate text-[11px] text-gray-400">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {country.flag} {country.name}{loading && " · syncing…"}</p>
          </div>
          <button onClick={toggleTheme} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border-[1.5px] border-gray-200 bg-slate-50 text-gray-600">
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <a href={`tel:${primaryNumber(location?.country)}`} className="flex shrink-0 items-center gap-1.5 rounded-[10px] bg-red-600 px-2.5 py-2 text-sm font-bold text-white transition hover:bg-red-700">
            <Phone size={14} /> <span className="hidden sm:inline">Emergency</span> {primaryNumber(location?.country)}
          </a>
          <button onClick={() => setModal("account")} className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] border-gray-200", account ? "bg-blue-600 text-white" : "bg-slate-50 text-gray-400")}>
            <User size={16} />
          </button>
        </header>

        {/* Top tab strip — scrollable on every size so all sections stay reachable */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-gray-200 bg-white px-3 py-2 sm:px-4">
          {SAFETY_NAV.map((s) => <TabBtn key={s.id} s={s} active={activeSection} onClick={setActiveSection} />)}
          <span className="mx-1 h-5 w-px shrink-0 bg-gray-200" />
          {MORE_NAV.map((s) => <TabBtn key={s.id} s={s} active={activeSection} onClick={setActiveSection} muted />)}
        </div>

        {locError && (
          <div className="flex items-center gap-2.5 border-b border-amber-300 bg-amber-50 px-4 py-2.5">
            <AlertTriangle size={15} className="shrink-0 text-amber-600" />
            <span className="text-[13px] text-amber-700">{locError}</span>
            <button onClick={() => requestLocation()} className="ml-auto flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-700"><RefreshCw size={12} /> Retry</button>
          </div>
        )}

        <main className="mx-auto w-full max-w-2xl px-3 pb-28 pt-4 sm:px-4">
          <AnimatePresence mode="wait">
            <motion.div key={activeSection} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
              {activeSection === "home" && <SafetyHomeSection coords={coords} location={location} account={account} onAlarm={() => setSignal("alarm")} onBeacon={() => setSignal("beacon")} onCallEmergency={() => setModal("emergency")} onAccount={() => setModal("account")} setActiveSection={setActiveSection} />}
              {activeSection === "map" && <NearbyMapSection coords={coords} location={location} />}
              {activeSection === "quakes" && <EarthquakeSection coords={coords} location={location} />}
              {activeSection === "news" && <NewsSection location={location} />}
              {activeSection === "prepare" && <PreparednessSection country={country} />}
              {activeSection === "services" && <ServicesSection location={location} onReport={() => setModal("report")} reports={reports} />}
              {activeSection === "assistant" && <AssistantSection location={location} weather={weather} aqi={aqi} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom nav — z above the map's Leaflet panes */}
      <nav className="fixed inset-x-0 bottom-0 z-[1200] flex border-t border-gray-200 bg-white/95 pt-1.5 backdrop-blur-xl lg:hidden" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
        {BOTTOM_NAV.map((id) => {
          const s = NAV.find((n) => n.id === id); const Ic = s.icon; const on = activeSection === id;
          return (
            <button key={id} onClick={() => setActiveSection(id)} className="relative flex flex-1 flex-col items-center gap-0.5 px-1 py-1">
              {on && <motion.span layoutId="navpill" className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-red-600" />}
              <motion.span animate={{ scale: on ? 1.12 : 1, y: on ? -1 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 22 }}>
                <Ic size={20} className={on ? "text-red-600" : "text-gray-400"} />
              </motion.span>
              <span className={cx("text-[10px]", on ? "font-bold text-red-600" : "text-gray-400")}>{s.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ── Animated splash / app intro ───────────────────────────────────────────────
function Splash({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[10001] flex flex-col items-center justify-center bg-gradient-to-br from-red-600 via-rose-600 to-rose-800"
          initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.5 }}
        >
          <motion.div
            initial={{ scale: 0.4, rotate: -25, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 14 }}
            className="relative flex h-24 w-24 items-center justify-center rounded-[28px] bg-white/15 backdrop-blur"
          >
            <motion.span className="absolute inset-0 rounded-[28px] border-2 border-white/40"
              animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 1.8, repeat: Infinity }} />
            <ShieldCheck size={52} className="text-white" strokeWidth={2.4} />
          </motion.div>
          <div className="mt-6 overflow-hidden">
            <motion.h1
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25, type: "spring", stiffness: 220, damping: 20 }}
              className="flex text-4xl font-black tracking-tight text-white"
            >
              {"SafeCity".split("").map((ch, i) => (
                <motion.span key={i} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.05, type: "spring", stiffness: 300, damping: 18 }}>
                  {ch}
                </motion.span>
              ))}
            </motion.h1>
          </div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
            className="mt-1.5 text-sm font-semibold tracking-wide text-white/80">
            Your safety, everywhere.
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TabBtn({ s, active, onClick, muted = false }) {
  const Ic = s.icon; const on = active === s.id;
  return (
    <button onClick={() => onClick(s.id)}
      className={cx("flex shrink-0 items-center gap-1.5 rounded-[10px] border-[1.5px] px-3.5 py-1.5 text-[13px] font-semibold transition active:scale-95",
        on ? "border-red-500 bg-red-50 text-red-700" : muted ? "border-transparent text-gray-400 hover:bg-slate-50" : "border-transparent text-gray-500 hover:bg-slate-50")}>
      <Ic size={14} /> {s.label}
    </button>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ open, onClose, active, setActive, account, onAccount, location, country }) {
  return (
    <>
      <AnimatePresence>
        {open && <motion.div onClick={onClose} className="fixed inset-0 z-40 bg-black/35 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}
      </AnimatePresence>
      <aside className={cx("fixed left-0 top-0 z-50 flex h-full w-[272px] flex-col overflow-y-auto border-r border-gray-200 bg-white transition-transform duration-300 lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full")}>
        <div className="p-5">
          <div className="mb-5 flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-rose-500 text-white"><ShieldCheck size={20} /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-red-600">Citizen Safety</p>
              <p className="truncate text-base font-extrabold leading-tight text-gray-900">SafeCity {country.name}</p>
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-gray-200 bg-slate-50 p-3">
            <div className="flex items-center gap-1.5">
              <span className={cx("h-2 w-2 rounded-full", location ? "bg-emerald-500" : "bg-amber-500")} />
              <span className={cx("text-[11px] font-bold", location ? "text-emerald-700" : "text-amber-700")}>{location ? "Location active" : "Location pending"}</span>
            </div>
            {location && <p className="mt-0.5 pl-3.5 text-xs text-gray-500">{location.city}{location.prefecture ? `, ${location.prefecture}` : ""}</p>}
          </div>

          <NavGroup title="Safety" items={SAFETY_NAV} active={active} setActive={setActive} onClose={onClose} />
          <NavGroup title="More" items={MORE_NAV} active={active} setActive={setActive} onClose={onClose} muted />
        </div>

        <div className="mt-auto border-t border-gray-100 p-5">
          <button onClick={onAccount} className="flex w-full items-center gap-3 rounded-xl border-[1.5px] border-gray-200 bg-slate-50 p-2.5 text-left">
            <span className={cx("flex h-8 w-8 items-center justify-center rounded-full", account ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-400")}><User size={16} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-gray-900">{account?.name || "Sign in / Register"}</p>
              <p className="truncate text-[11px] text-gray-400">{account?.phone || "Save your details & contacts"}</p>
            </div>
          </button>
        </div>
      </aside>
    </>
  );
}

function NavGroup({ title, items, active, setActive, onClose, muted = false }) {
  return (
    <div className="mb-4">
      <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">{title}</p>
      <nav className="grid gap-1">
        {items.map((s) => {
          const Ic = s.icon; const on = active === s.id;
          return (
            <button key={s.id} onClick={() => { setActive(s.id); onClose(); }}
              className={cx("flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm transition",
                on ? "bg-red-50 font-bold text-red-700" : muted ? "font-medium text-gray-500 hover:bg-slate-50" : "font-medium text-gray-600 hover:bg-slate-50")}>
              <Ic size={17} className={on ? "text-red-600" : "text-gray-400"} />
              {s.full}
              {on && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-red-600" />}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
