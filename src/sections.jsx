import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Droplets, Wind, Sun, FileText, Phone, AlertTriangle, Globe, ShieldCheck,
  ChevronRight, Train, Zap, Leaf, Newspaper, RefreshCw, Trash2, Bell, BellOff,
  Pencil, Check, Sparkles, Send, Bot, Cpu, ExternalLink, Search,
} from "lucide-react";
import { Panel, Label, Badge, MetricBar, ScoreRing, WeatherIcon, Spinner, SectionHeader, LinkRow, cx } from "./components/ui";
import { ISSUE_CATEGORIES } from "./lib/constants";
import { fetchNews, NEWS_TOPICS, ollamaChat, listOllamaModels } from "./lib/sources";
import { emergencyServices, countryInfo } from "./lib/emergency";
import {
  WASTE_CATEGORIES, WEEKDAYS, WEEKDAYS_JA, saveSchedule,
  categoriesFor, nextCollection, upcomingWeek,
} from "./lib/garbage";

const stagger = { animate: { transition: { staggerChildren: 0.06 } } };

function aqiLevel(v) {
  if (v == null) return { label: "Unknown", color: "#94a3b8" };
  if (v <= 50) return { label: "Good", color: "#16a34a" };
  if (v <= 100) return { label: "Moderate", color: "#d97706" };
  if (v <= 150) return { label: "Unhealthy (Sensitive)", color: "#ea580c" };
  return { label: "Unhealthy", color: "#dc2626" };
}

// ════════════════════════════════════════════════════════════════ OVERVIEW ═══
export function OverviewSection({ location, weather, aqi, healthScore, onReport, account, schedule, setActiveSection }) {
  const lvl = aqiLevel(aqi?.aqi);
  const uvColor = !weather ? "#94a3b8" : weather.uv <= 2 ? "#16a34a" : weather.uv <= 5 ? "#d97706" : weather.uv <= 7 ? "#ea580c" : "#dc2626";
  const next = nextCollection(schedule);

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="grid gap-4">
      <Panel accent>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="mb-1.5 flex items-center gap-2">
              <MapPin size={14} className="text-blue-700" />
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-blue-700">Your Location</span>
            </div>
            {location ? (
              <>
                <h2 className="mb-1 text-2xl font-extrabold leading-none text-gray-900">{location.city}</h2>
                <p className="text-sm text-gray-500">{location.prefecture}{location.district ? ` · ${location.district}` : ""}</p>
                {location.postcode && <p className="mt-0.5 text-[11px] text-gray-400">〒{location.postcode}</p>}
              </>
            ) : <p className="text-sm italic text-gray-400">Detecting location…</p>}
            {account && (
              <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                <Check size={12} /> Signed in as {account.name}
              </span>
            )}
          </div>
          <ScoreRing score={healthScore} size={100} color={healthScore > 80 ? "#16a34a" : healthScore > 60 ? "#d97706" : "#dc2626"} />
        </div>
      </Panel>

      {weather ? (
        <Panel>
          <Label>Current Weather</Label>
          <div className="mb-4 flex items-center gap-4">
            <WeatherIcon code={weather.code} size={48} />
            <div>
              <div className="text-4xl font-extrabold leading-none text-gray-900">{weather.temp}°C</div>
              <div className="text-sm text-gray-500">{weather.cond} · Feels {weather.feels}°C</div>
            </div>
          </div>
          <div className="mb-4 grid grid-cols-3 gap-2.5">
            {[
              { Ic: Droplets, label: "Humidity", value: `${weather.humidity}%`, color: "#1a56db" },
              { Ic: Wind, label: "Wind", value: weather.wind, color: "#0d9488" },
              { Ic: Sun, label: "UV Index", value: weather.uv, color: uvColor },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-slate-50 p-2.5 text-center">
                <s.Ic size={18} style={{ color: s.color }} className="mx-auto" />
                <p className="mt-1 text-[11px] text-gray-400">{s.label}</p>
                <p className="text-sm font-bold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>
          {weather.daily?.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {weather.daily.map((d, i) => (
                <div key={d.date} className="flex min-w-[64px] flex-1 flex-col items-center gap-1 rounded-xl bg-slate-50 p-2">
                  <span className="text-[11px] font-semibold text-gray-500">{i === 0 ? "Today" : new Date(d.date).toLocaleDateString("en", { weekday: "short" })}</span>
                  <WeatherIcon code={d.code} size={20} />
                  <span className="text-xs font-bold text-gray-900">{d.max}°</span>
                  <span className="text-[11px] text-gray-400">{d.min}°</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      ) : (
        <Panel><Label>Weather</Label><p className="text-sm italic text-gray-400">Enable location to see real-time weather.</p></Panel>
      )}

      {aqi && (
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <Label className="mb-0">Air Quality Index</Label>
            <Badge type={aqi.aqi <= 50 ? "success" : aqi.aqi <= 100 ? "warning" : "danger"}>{lvl.label}</Badge>
          </div>
          <div className="mb-3 flex items-center gap-4">
            <div className="text-5xl font-extrabold leading-none" style={{ color: lvl.color }}>{aqi.aqi}</div>
            <div className="flex-1">
              <p className="mb-1 text-xs text-gray-500">US AQI Scale</p>
              <MetricBar value={Math.min(aqi.aqi, 200)} unit="" color={lvl.color} warn={50} danger={100} showLabel={false} />
            </div>
          </div>
        </Panel>
      )}

      {/* Next garbage collection */}
      {next && (
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <Label className="mb-0">Next Garbage Collection</Label>
            <button onClick={() => setActiveSection("waste")} className="text-[11px] font-bold text-blue-700">View all ›</button>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: next.categories[0].color }}>
              {(() => { const Ic = next.categories[0].icon || Trash2; return <Ic size={22} />; })()}
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">{next.categories.map((c) => c.label).join(" + ")}</p>
              <p className="text-xs text-gray-500">{next.categories.map((c) => c.ja).join("・")}</p>
            </div>
            <Badge type={next.daysUntil <= 1 ? "danger" : "info"}>
              {next.daysUntil === 1 ? "Tomorrow" : next.date.toLocaleDateString("en", { weekday: "short" })}
            </Badge>
          </div>
        </Panel>
      )}

      <Panel>
        <Label>Quick Actions</Label>
        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={onReport} className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-3.5 text-left transition hover:-translate-y-0.5">
            <FileText size={20} className="text-blue-700" />
            <p className="mt-1.5 text-sm font-bold text-blue-700">Report Issue</p>
            <p className="text-[11px] text-blue-600/70">Municipal complaint</p>
          </button>
          <button onClick={() => setActiveSection("assistant")} className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-3.5 text-left transition hover:-translate-y-0.5">
            <Bot size={20} className="text-violet-700" />
            <p className="mt-1.5 text-sm font-bold text-violet-700">Ask City AI</p>
            <p className="text-[11px] text-violet-600/70">Local civic assistant</p>
          </button>
        </div>
      </Panel>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════ SAFETY ═════
export function SafetySection({ onCallEmergency, reports = [] }) {
  return (
    <div className="grid gap-4">
      <SectionHeader icon={ShieldCheck} title="Safety & Emergency" subtitle="Japan emergency services" color="#dc2626" />
      <Panel accent>
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          <AlertTriangle size={14} className="shrink-0" /> Only call in genuine emergencies. False calls are a crime.
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {[{ num: "110", label: "Police · 警察", bg: "#dc2626" }, { num: "119", label: "Fire / Ambulance", bg: "#ea580c" }].map((e) => (
            <button key={e.num} onClick={onCallEmergency} className="flex flex-col items-center gap-2 rounded-2xl p-4 text-white transition hover:brightness-110" style={{ background: e.bg }}>
              <Phone size={24} />
              <div className="text-center">
                <p className="text-3xl font-black leading-none">{e.num}</p>
                <p className="text-[11px] font-semibold opacity-85">{e.label}</p>
              </div>
            </button>
          ))}
        </div>
        <button onClick={onCallEmergency} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-gray-200 bg-slate-50 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100">
          <Phone size={14} /> View all emergency numbers
        </button>
      </Panel>

      <Panel>
        <Label>Disaster Preparedness Resources</Label>
        <div className="grid gap-2">
          {[
            { label: "Japan Meteorological Agency", url: "https://www.jma.go.jp/jma/indexe.html", desc: "Earthquakes, tsunamis, warnings" },
            { label: "J-Alert System (FDMA)", url: "https://www.fdma.go.jp/en/", desc: "National early warning broadcasts" },
            { label: "Safety Tips (JNTO)", url: "https://www.jnto.go.jp/safety-tips/eng/", desc: "Disaster info in English" },
            { label: "NHK World Emergency Info", url: "https://www3.nhk.or.jp/nhkworld/en/information/", desc: "Real-time disaster broadcasts" },
          ].map((r) => <LinkRow key={r.label} icon={Globe} title={r.label} desc={r.desc} url={r.url} color="#dc2626" />)}
        </div>
      </Panel>

      {reports.length > 0 && (
        <Panel>
          <Label>My Submitted Reports</Label>
          <div className="grid gap-2">
            {reports.map((r) => <ReportRow key={r.refNo} r={r} />)}
          </div>
        </Panel>
      )}
    </div>
  );
}

function ReportRow({ r }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-slate-50 p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-bold text-blue-700">{r.refNo}</span>
        <Badge type={r.urgency === "high" ? "danger" : r.urgency === "medium" ? "warning" : "success"}>{r.urgency}</Badge>
      </div>
      <p className="text-sm font-bold text-gray-900">{r.title}</p>
      <p className="text-[11px] text-gray-400">{ISSUE_CATEGORIES.find((c) => c.id === r.category)?.label}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════ ENVIRONMENT ═════
export function EnvironmentSection({ aqi, weather, location }) {
  if (!aqi && !weather) return (
    <Panel>
      <div className="py-8 text-center">
        <Leaf size={40} className="mx-auto text-gray-400" />
        <p className="mt-3 text-sm text-gray-400">Enable location for real-time environmental data.</p>
      </div>
    </Panel>
  );
  const color = aqiLevel(aqi?.aqi).color;
  return (
    <div className="grid gap-4">
      <SectionHeader icon={Leaf} title="Environment" subtitle={location?.city || "Your area"} color="#0d9488" />
      {aqi && (
        <Panel>
          <Label>Air Quality — Pollutants</Label>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: "US AQI", value: aqi.aqi, color, large: true },
              { label: "PM2.5", value: `${aqi.pm25} µg/m³`, color: aqi.pm25 > 25 ? "#dc2626" : "#16a34a" },
              { label: "PM10", value: `${aqi.pm10} µg/m³`, color: aqi.pm10 > 50 ? "#d97706" : "#16a34a" },
              { label: "NO₂", value: `${aqi.no2} µg/m³`, color: aqi.no2 > 40 ? "#d97706" : "#16a34a" },
              { label: "Ozone", value: `${aqi.o3} µg/m³`, color: "#1a56db" },
              { label: "SO₂", value: `${aqi.so2} µg/m³`, color: "#7c3aed" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-slate-50 p-3">
                <p className="mb-1 text-[11px] text-gray-400">{s.label}</p>
                <p className={cx("font-extrabold", s.large ? "text-2xl" : "text-base")} style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {weather && (
        <Panel>
          <Label>Atmospheric Conditions</Label>
          <div className="grid gap-2.5">
            {[
              { label: "Temperature", value: `${weather.temp}°C`, bar: weather.temp, color: weather.temp > 35 ? "#dc2626" : "#1a56db" },
              { label: "Humidity", value: `${weather.humidity}%`, bar: weather.humidity, color: "#0d9488" },
              { label: "UV Index", value: weather.uv, bar: (weather.uv / 11) * 100, color: weather.uv > 7 ? "#dc2626" : "#d97706" },
            ].map((s) => (
              <MetricBar key={s.label} label={s.label} value={s.label === "UV Index" ? s.bar : s.value.toString().replace(/[^\d.]/g, "")} unit="" color={s.color} warn={70} danger={90} />
            ))}
          </div>
        </Panel>
      )}
      <Panel>
        <Label>External Data Sources</Label>
        <div className="grid gap-2">
          {[
            { label: "Open-Meteo Weather", url: "https://open-meteo.com", desc: "Real-time weather data" },
            { label: "Open-Meteo Air Quality", url: "https://air-quality-api.open-meteo.com", desc: "PM2.5, AQI, pollutants" },
            { label: "JMA Weather Warnings", url: "https://www.jma.go.jp/bosai/warning/#lang=en", desc: "Japan Met Agency" },
            { label: "Soramame AQI", url: "https://soramame.env.go.jp/", desc: "Ministry of Environment" },
          ].map((r) => <LinkRow key={r.label} icon={Globe} title={r.label} desc={r.desc} url={r.url} color="#0d9488" />)}
        </div>
      </Panel>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════ SERVICES ═══
export function ServicesSection({ location, onReport, reports = [] }) {
  const [search, setSearch] = useState("");
  const filtered = ISSUE_CATEGORIES.filter((c) => (c.label + c.dept).toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="grid gap-4">
      <SectionHeader icon={FileText} title="Municipal Services" subtitle="Report issues to city hall" color="#1a56db" />
      <Panel>
        <Label>Report a Municipal Issue</Label>
        <p className="mb-3 text-sm text-gray-500">Submit complaints directly to the relevant city department. Each report is logged with a reference number.</p>
        {location && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2">
            <MapPin size={13} className="text-blue-700" />
            <span className="text-xs font-semibold text-blue-700">{location.city}{location.prefecture ? `, ${location.prefecture}` : ""}</span>
          </div>
        )}
        <button onClick={onReport} className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-blue-600 py-3.5 text-base font-bold text-white transition hover:bg-blue-700">
          <FileText size={18} /> Start New Report
        </button>
      </Panel>

      <Panel>
        <Label>City Departments</Label>
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search departments…"
            className="w-full rounded-xl border-[1.5px] border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-blue-400" />
        </div>
        <div className="grid gap-2">
          {filtered.map((c) => {
            const Ic = c.icon;
            return (
              <button key={c.id} onClick={onReport} className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-slate-50 p-3 text-left transition hover:border-gray-300">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700"><Ic size={16} /></span>
                <div className="flex-1"><p className="text-sm font-bold text-gray-900">{c.label}</p><p className="text-[11px] text-gray-500">{c.dept}</p></div>
                <ChevronRight size={14} className="text-gray-400" />
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel>
        <Label>My Reports ({reports.length})</Label>
        {reports.length === 0 ? <p className="py-4 text-center text-sm text-gray-400">No reports submitted yet</p> : (
          <div className="grid gap-2">{reports.map((r) => <ReportRow key={r.refNo} r={r} />)}</div>
        )}
      </Panel>

      <Panel>
        <Label>Government Portals</Label>
        <div className="grid gap-2">
          {[
            { label: "e-Gov Japan", url: "https://www.e-gov.go.jp/", desc: "Online service applications" },
            { label: "My Number Portal", url: "https://myna.go.jp/", desc: "Resident card & tax filing" },
            { label: "National Tax Agency", url: "https://www.nta.go.jp/english/", desc: "e-Tax filing" },
            { label: "Japan Post", url: "https://www.post.japanpost.jp/", desc: "Address changes, forwarding" },
          ].map((r) => <LinkRow key={r.label} icon={Globe} title={r.label} desc={r.desc} url={r.url} />)}
        </div>
      </Panel>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════ TRANSPORT ═══
export function TransportSection() {
  return (
    <div className="grid gap-4">
      <SectionHeader icon={Train} title="Transport" subtitle="Live transit & ride services" color="#1a56db" />
      <Panel accent>
        <Label>Live Transit Sources</Label>
        <p className="mb-3 text-sm text-gray-500">Japan's transit APIs require carrier agreements. These connect to certified live providers.</p>
        <div className="grid gap-2">
          {[
            { label: "Jorudan Route Search", url: "https://www.jorudan.co.jp/eng/", desc: "Train & bus route planner" },
            { label: "JR East Train Info", url: "https://www.jreast.co.jp/e/", desc: "Delays & service status" },
            { label: "Tokyo Metro Status", url: "https://www.tokyometro.jp/lang_en/", desc: "Subway line status" },
            { label: "Navitime Japan", url: "https://www.navitime.co.jp/", desc: "Multi-modal navigation" },
            { label: "Yahoo! Transit", url: "https://transit.yahoo.co.jp/", desc: "Disruption alerts" },
          ].map((r) => <LinkRow key={r.label} icon={Train} title={r.label} desc={r.desc} url={r.url} />)}
        </div>
      </Panel>
      <Panel>
        <Label>Taxi & Ride Services</Label>
        <div className="grid gap-2">
          {[
            { label: "GO Taxi", url: "https://go.mo-t.com/", desc: "Japan's largest taxi app" },
            { label: "S.RIDE", url: "https://sride.jp/", desc: "Sony / Sumitomo platform" },
            { label: "Uber Japan", url: "https://www.uber.com/jp/ja/", desc: "Ride & food delivery" },
          ].map((r) => <LinkRow key={r.label} icon={MapPin} title={r.label} desc={r.desc} url={r.url} />)}
        </div>
      </Panel>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════ ENERGY ═══
export function EnergySection() {
  return (
    <div className="grid gap-4">
      <SectionHeader icon={Zap} title="Energy Grid" subtitle="Live regional power data" color="#d97706" />
      <Panel accent>
        <Label>Regional Utilities</Label>
        <p className="mb-3 text-sm text-gray-500">Japan's grid is run by regional utilities. These portals show live supply, demand & renewable ratios.</p>
        <div className="grid gap-2">
          {[
            { label: "TEPCO (Tokyo Electric)", url: "https://www.tepco.co.jp/en/", desc: "Tokyo grid demand & outages" },
            { label: "Kansai Electric (KEPCO)", url: "https://www.kepco.co.jp/english/", desc: "Osaka/Kansai supply" },
            { label: "OCCTO Grid Monitor", url: "https://www.occto.or.jp/en/", desc: "National grid dashboard" },
            { label: "Chubu Electric", url: "https://www.chuden.co.jp/english/", desc: "Nagoya area supply" },
            { label: "METI Energy Data", url: "https://www.enecho.meti.go.jp/en/", desc: "Energy statistics" },
          ].map((r) => <LinkRow key={r.label} icon={Zap} title={r.label} desc={r.desc} url={r.url} color="#d97706" />)}
        </div>
      </Panel>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════ NEWS ═══
export function NewsSection({ location }) {
  const [topic, setTopic] = useState("disaster");
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadedAt, setLoadedAt] = useState(0);

  const load = useCallback(async (t) => {
    setLoading(true); setItems(null);
    const res = await fetchNews(t, location);
    setItems(res); setLoadedAt(Date.now()); setLoading(false);
  }, [location]);

  useEffect(() => { load(topic); }, [topic, load]);

  const timeAgo = (pub) => {
    if (!pub || !loadedAt) return "";
    const diff = (loadedAt - new Date(pub).getTime()) / 36e5;
    if (diff < 1) return `${Math.round(diff * 60)}m ago`;
    if (diff < 24) return `${Math.round(diff)}h ago`;
    return `${Math.round(diff / 24)}d ago`;
  };

  return (
    <div className="grid gap-4">
      <SectionHeader icon={Newspaper} title="Alerts & News" subtitle={location?.city ? `Safety & news near ${location.city}` : "Japan safety alerts"} color="#be123c" />
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {NEWS_TOPICS.map((t) => (
          <button key={t.id} onClick={() => setTopic(t.id)}
            className={cx("shrink-0 rounded-full border-[1.5px] px-3.5 py-1.5 text-xs font-bold transition",
              topic === t.id ? "border-rose-500 bg-rose-50 text-rose-700" : "border-gray-200 text-gray-500 hover:bg-slate-50")}>
            {t.label}
          </button>
        ))}
        <button onClick={() => load(topic)} className="ml-auto flex shrink-0 items-center gap-1 rounded-full border-[1.5px] border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-slate-50">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {loading && <Panel><div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400"><Spinner /> Fetching latest headlines…</div></Panel>}

      {!loading && items === null && (
        <Panel>
          <div className="py-6 text-center">
            <AlertTriangle size={32} className="mx-auto text-amber-500" />
            <p className="mt-2 text-sm text-gray-500">Couldn't load news right now. The news proxy may be rate-limited — try Refresh.</p>
          </div>
        </Panel>
      )}

      {!loading && items?.length === 0 && <Panel><p className="py-6 text-center text-sm text-gray-400">No headlines found for this topic.</p></Panel>}

      {!loading && items?.length > 0 && (
        <motion.div variants={stagger} initial="initial" animate="animate" className="grid gap-2.5">
          {items.map((n, i) => (
            <motion.a key={i} href={n.link} target="_blank" rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="group block rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">{n.source}</span>
                <span className="text-[11px] text-gray-400">{timeAgo(n.pub)}</span>
                <ExternalLink size={12} className="ml-auto text-gray-400 transition group-hover:text-rose-600" />
              </div>
              <p className="text-sm font-bold leading-snug text-gray-900">{n.title}</p>
              {n.desc && <p className="mt-1 line-clamp-2 text-xs text-gray-500">{n.desc}</p>}
            </motion.a>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════ WASTE ═══
export function WasteSection({ schedule, setSchedule, notifPermission, onRequestNotif }) {
  const [editing, setEditing] = useState(false);
  const today = categoriesFor(schedule);
  const week = upcomingWeek(schedule);

  const toggle = (dayIdx, catId) => {
    setSchedule((prev) => {
      const cur = prev[dayIdx] || [];
      const updated = cur.includes(catId) ? cur.filter((c) => c !== catId) : [...cur, catId];
      const updatedSchedule = { ...prev, [dayIdx]: updated };
      saveSchedule(updatedSchedule);
      return updatedSchedule;
    });
  };

  const IconFor = (cat) => cat.icon || Trash2;

  return (
    <div className="grid gap-4">
      <SectionHeader icon={Trash2} title="Waste Collection" subtitle="Garbage schedule & sorting guide" color="#16a34a" />

      {/* Today */}
      <Panel accent>
        <Label>Today — {new Date().toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })}</Label>
        {today.length ? (
          <div className="grid gap-2">
            {today.map((c) => { const Ic = IconFor(c); return (
              <div key={c.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: `${c.color}12` }}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ background: c.color }}><Ic size={20} /></span>
                <div className="flex-1"><p className="text-sm font-extrabold text-gray-900">{c.label} <span className="font-medium text-gray-400">{c.ja}</span></p><p className="text-[11px] text-gray-500">{c.note}</p></div>
              </div>
            ); })}
          </div>
        ) : (
          <p className="py-3 text-center text-sm text-gray-400">No collection scheduled today. Enjoy the break.</p>
        )}
      </Panel>

      {/* Notification reminder */}
      <Panel>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            {notifPermission === "granted" ? <Bell size={18} /> : <BellOff size={18} />}
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">Collection reminders</p>
            <p className="text-[11px] text-gray-500">{notifPermission === "granted" ? "You'll be notified about collection days." : "Enable notifications to get reminders."}</p>
          </div>
          {notifPermission !== "granted" && (
            <button onClick={onRequestNotif} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-700">Enable</button>
          )}
        </div>
      </Panel>

      {/* Weekly view + edit */}
      <Panel>
        <div className="mb-3 flex items-center justify-between">
          <Label className="mb-0">Weekly Schedule</Label>
          <button onClick={() => setEditing((e) => !e)} className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-gray-600 transition hover:bg-gray-200">
            {editing ? <><Check size={12} /> Done</> : <><Pencil size={12} /> Edit</>}
          </button>
        </div>

        {!editing ? (
          <div className="grid gap-2">
            {week.map((d) => (
              <div key={d.date.toISOString()} className={cx("flex items-center gap-3 rounded-xl border p-2.5", d.isToday ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-slate-50")}>
                <div className="w-12 shrink-0 text-center">
                  <p className="text-[10px] font-bold uppercase text-gray-400">{WEEKDAYS[d.date.getDay()]}</p>
                  <p className="text-base font-extrabold text-gray-900">{d.date.getDate()}</p>
                </div>
                <div className="flex flex-1 flex-wrap gap-1.5">
                  {d.categories.length ? d.categories.map((c) => { const Ic = IconFor(c); return (
                    <span key={c.id} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold text-white" style={{ background: c.color }}><Ic size={11} /> {c.label}</span>
                  ); }) : <span className="text-xs text-gray-400">—</span>}
                </div>
                {d.isToday && <Badge type="info">Today</Badge>}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-3">
            <p className="text-xs text-gray-500">Tap categories to set what's collected each weekday. Saved automatically.</p>
            {WEEKDAYS.map((wd, idx) => (
              <div key={wd}>
                <p className="mb-1.5 text-xs font-bold text-gray-600">{wd} <span className="text-gray-400">{WEEKDAYS_JA[idx]}</span></p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.values(WASTE_CATEGORIES).map((c) => {
                    const on = (schedule[idx] || []).includes(c.id);
                    const Ic = IconFor(c);
                    return (
                      <button key={c.id} onClick={() => toggle(idx, c.id)}
                        className={cx("inline-flex items-center gap-1 rounded-full border-[1.5px] px-2.5 py-1 text-[11px] font-bold transition")}
                        style={on ? { background: c.color, borderColor: c.color, color: "#fff" } : { borderColor: "#e2e8f0", color: "#94a3b8" }}>
                        <Ic size={11} /> {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Sorting guide */}
      <Panel>
        <Label>Sorting Guide</Label>
        <div className="grid gap-2">
          {Object.values(WASTE_CATEGORIES).map((c) => { const Ic = IconFor(c); return (
            <div key={c.id} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: c.color }}><Ic size={16} /></span>
              <div><p className="text-sm font-bold text-gray-900">{c.label} <span className="font-medium text-gray-400">{c.ja}</span></p><p className="text-[11px] text-gray-500">{c.note}</p></div>
            </div>
          ); })}
        </div>
      </Panel>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════ ASSISTANT ═══
export function AssistantSection({ location, weather, aqi }) {
  const [models, setModels] = useState([]);
  const [model, setModel] = useState("llama3.2:3b");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    listOllamaModels().then((m) => {
      setModels(m);
      if (m.length && !m.includes(model)) setModel(m[0]);
      if (!m.length) setError("Ollama isn't reachable at localhost:11434. Start it with `ollama serve`.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const systemPrompt = () => {
    const country = countryInfo(location?.country);
    const numbers = emergencyServices(location?.country).map((e) => `${e.label} ${e.number}`).join(", ");
    const ctx = [
      "You are SafeCity, a concise, friendly personal-safety assistant.",
      "Adapt all advice to the user's country shown below — do not assume Japan unless that is their location.",
      "Answer questions about staying safe, emergencies, disasters, first aid, and what to do in a crisis.",
      "Keep answers short and practical. Use the live context below when relevant.",
      "--- LIVE CONTEXT ---",
      `Country: ${country.name}`,
      location ? `Location: ${location.city}${location.prefecture ? ", " + location.prefecture : ""} ${location.postcode || ""}`.trim() : "Location: unknown",
      weather ? `Weather: ${weather.temp}°C, ${weather.cond}, humidity ${weather.humidity}%, UV ${weather.uv}` : "",
      aqi ? `Air quality: US AQI ${aqi.aqi} (PM2.5 ${aqi.pm25})` : "",
      `Local emergency numbers: ${numbers}.`,
    ].filter(Boolean).join("\n");
    return ctx;
  };

  const send = async (preset) => {
    const text = (preset ?? input).trim();
    if (!text || streaming) return;
    setError(null);
    setInput("");
    const userMsg = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "" }]);
    setStreaming(true);
    abortRef.current = new AbortController();
    try {
      await ollamaChat({
        model,
        messages: [{ role: "system", content: systemPrompt() }, ...history],
        signal: abortRef.current.signal,
        onToken: (tok) => setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: copy[copy.length - 1].content + tok };
          return copy;
        }),
      });
    } catch (e) {
      if (e.name !== "AbortError") setError("Couldn't reach the model. Is Ollama running and the model pulled?");
      setMessages((m) => m[m.length - 1]?.content === "" ? m.slice(0, -1) : m);
    } finally {
      setStreaming(false);
    }
  };

  const stop = () => { abortRef.current?.abort(); setStreaming(false); };

  const suggestions = [
    "What should I do in an earthquake?",
    "How do I perform CPR?",
    "What's the emergency number here?",
    "How do I make a home emergency kit?",
  ];

  return (
    <div className="grid gap-4">
      <SectionHeader icon={Sparkles} title="Safety Assistant" subtitle="Powered by local Ollama — private & on-device" color="#7c3aed" />

      <Panel className="flex flex-col" delay={0.05}>
        <div className="mb-3 flex items-center gap-2">
          <Cpu size={14} className="text-violet-700" />
          <span className="text-xs font-semibold text-gray-500">Model</span>
          <select value={model} onChange={(e) => setModel(e.target.value)}
            className="ml-auto rounded-lg border-[1.5px] border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 outline-none">
            {(models.length ? models : ["llama3.2:3b"]).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Conversation */}
        <div ref={scrollRef} className="flex max-h-[46vh] min-h-[180px] flex-col gap-3 overflow-y-auto rounded-xl bg-slate-50 p-3">
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white"><Bot size={24} /></span>
              <p className="text-sm text-gray-500">Ask me anything about life in {location?.city || "your city"}.</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-600 transition hover:border-violet-300 hover:text-violet-700">{s}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cx("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "assistant" && <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><Bot size={14} /></span>}
              <div className={cx("max-w-[78%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                m.role === "user" ? "bg-violet-600 text-white" : "border border-gray-200 bg-white text-gray-800")}>
                {m.content || <span className="inline-flex gap-1"><Spinner size={12} /> thinking…</span>}
              </div>
            </div>
          ))}
        </div>

        {error && <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700"><AlertTriangle size={13} /> {error}</div>}

        {/* Composer */}
        <div className="mt-3 flex items-end gap-2">
          <textarea
            value={input} onChange={(e) => setInput(e.target.value)} rows={1} placeholder="Type your question…"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            className="max-h-28 flex-1 resize-none rounded-xl border-[1.5px] border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          {streaming ? (
            <button onClick={stop} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-200 text-gray-600">■</button>
          ) : (
            <button onClick={() => send()} disabled={!input.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-700 disabled:opacity-40"><Send size={16} /></button>
          )}
        </div>
      </Panel>
    </div>
  );
}
