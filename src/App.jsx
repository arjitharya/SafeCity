import { useState, useEffect, useRef, useCallback } from "react";

// ── Design tokens (light theme — clean government-grade UI) ──────────────────
// bg: #f0f2f5  surface: #ffffff  surface2: #f7f8fa
// navy: #0f2557  blue: #1a56db  accent: #e53935  green: #0d9488  amber: #d97706
// text: #0f172a  muted: #64748b  border: #e2e8f0

const EMERGENCY = {
  police: { number: "110", label: "Police", desc: "110 — Keisatsu" },
  fire: { number: "119", label: "Fire / Ambulance", desc: "119 — Shobo / Kyukyu" },
  coast: { number: "118", label: "Coast Guard", desc: "118 — Kaijo Hoan" },
  disaster: { number: "171", label: "Disaster Info", desc: "171 — Saigai Dengon" },
};

const PREF_REGIONS = {
  "Hokkaido": "hokkaido", "Aomori": "tohoku", "Iwate": "tohoku", "Miyagi": "tohoku",
  "Akita": "tohoku", "Yamagata": "tohoku", "Fukushima": "tohoku",
  "Ibaraki": "kanto", "Tochigi": "kanto", "Gunma": "kanto", "Saitama": "kanto",
  "Chiba": "kanto", "Tokyo": "kanto", "Kanagawa": "kanto",
  "Niigata": "chubu", "Toyama": "chubu", "Ishikawa": "chubu", "Fukui": "chubu",
  "Yamanashi": "chubu", "Nagano": "chubu", "Gifu": "chubu", "Shizuoka": "chubu", "Aichi": "chubu",
  "Mie": "kansai", "Shiga": "kansai", "Kyoto": "kansai", "Osaka": "kansai",
  "Hyogo": "kansai", "Nara": "kansai", "Wakayama": "kansai",
  "Tottori": "chugoku", "Shimane": "chugoku", "Okayama": "chugoku", "Hiroshima": "chugoku", "Yamaguchi": "chugoku",
  "Tokushima": "shikoku", "Kagawa": "shikoku", "Ehime": "shikoku", "Kochi": "shikoku",
  "Fukuoka": "kyushu", "Saga": "kyushu", "Nagasaki": "kyushu", "Kumamoto": "kyushu",
  "Oita": "kyushu", "Miyazaki": "kyushu", "Kagoshima": "kyushu", "Okinawa": "okinawa",
};

const ISSUE_CATEGORIES = [
  { id: "road", label: "Road & Pavement", icon: "🛣", dept: "道路課 (Road Division)" },
  { id: "water", label: "Water & Sewage", icon: "💧", dept: "上下水道課 (Water Dept)" },
  { id: "trash", label: "Waste & Illegal Dumping", icon: "🗑", dept: "廃棄物対策課 (Waste Mgmt)" },
  { id: "park", label: "Park & Green Space", icon: "🌳", dept: "公園課 (Parks Division)" },
  { id: "light", label: "Street Lighting", icon: "💡", dept: "道路維持課 (Road Maintenance)" },
  { id: "noise", label: "Noise Complaint", icon: "📢", dept: "生活環境課 (Living Environment)" },
  { id: "flood", label: "Flooding / Drain", icon: "🌊", dept: "治水課 (Flood Control)" },
  { id: "sign", label: "Traffic Sign / Signal", icon: "🚦", dept: "交通対策課 (Traffic Division)" },
  { id: "building", label: "Building / Construction", icon: "🏗", dept: "建築指導課 (Building Control)" },
  { id: "other", label: "Other", icon: "📝", dept: "市民相談課 (Citizen Services)" },
];

const cx = (...args) => args.filter(Boolean).join(" ");

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

async function fetchWeather(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,uv_index&timezone=Asia%2FTokyo&forecast_days=1`;
    const r = await fetch(url);
    const d = await r.json();
    const c = d.current;
    const wmo = {
      0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
      45: "Foggy", 51: "Light drizzle", 61: "Light rain", 63: "Moderate rain",
      71: "Light snow", 73: "Moderate snow", 80: "Rain showers", 95: "Thunderstorm",
    };
    const desc = wmo[c.weather_code] || `Code ${c.weather_code}`;
    return {
      temp: Math.round(c.temperature_2m),
      feels: Math.round(c.apparent_temperature),
      humidity: c.relative_humidity_2m,
      uv: Math.round(c.uv_index ?? 0),
      wind: `${Math.round(c.wind_speed_10m)} km/h`,
      windDir: c.wind_direction_10m,
      cond: desc,
      code: c.weather_code,
    };
  } catch {
    return null;
  }
}

async function fetchAQI(lat, lon) {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,us_aqi,nitrogen_dioxide,ozone&timezone=Asia%2FTokyo`;
    const r = await fetch(url);
    const d = await r.json();
    const c = d.current;
    return {
      aqi: Math.round(c.us_aqi ?? 0),
      pm25: Math.round(c.pm2_5 ?? 0),
      pm10: Math.round(c.pm10 ?? 0),
      no2: Math.round(c.nitrogen_dioxide ?? 0),
      o3: Math.round(c.ozone ?? 0),
    };
  } catch {
    return null;
  }
}

async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`;
    const r = await fetch(url, { headers: { "User-Agent": "CityOS-Japan/1.0" } });
    const d = await r.json();
    return {
      city: d.address?.city || d.address?.town || d.address?.village || d.address?.county || "Unknown",
      prefecture: d.address?.state || d.address?.province || "",
      district: d.address?.suburb || d.address?.neighbourhood || d.address?.quarter || "",
      postcode: d.address?.postcode || "",
      country: d.address?.country_code || "",
      displayName: d.display_name || "",
    };
  } catch {
    return null;
  }
}

function WeatherIcon({ code, size = 20, color = "#1a56db" }) {
  const s = { width: size, height: size, display: "inline-block", flexShrink: 0 };
  if (code === 0 || code === 1) return (
    <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
  if (code === 2 || code === 3) return (
    <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
    </svg>
  );
  if (code >= 60 && code <= 67) return (
    <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/>
      <line x1="8" y1="19" x2="8" y2="21"/><line x1="8" y1="13" x2="8" y2="15"/>
      <line x1="16" y1="19" x2="16" y2="21"/><line x1="16" y1="13" x2="16" y2="15"/>
      <line x1="12" y1="21" x2="12" y2="23"/><line x1="12" y1="15" x2="12" y2="17"/>
    </svg>
  );
  if (code >= 95) return (
    <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <polyline points="13 2 13 9 19 9"/><path d="M20.88 18.09A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/>
      <line x1="8" y1="19" x2="8" y2="21"/><line x1="12" y1="17" x2="12" y2="19"/>
    </svg>
  );
  return (
    <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
    </svg>
  );
}

const Icon = {
  Shield: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Phone: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 9.8a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.06a16 16 0 0 0 6.06 6.06l1.42-1.41a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  MapPin: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  User: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  AlertTriangle: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Activity: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  Wind: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
    </svg>
  ),
  Droplets: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/>
      <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/>
    </svg>
  ),
  Thermometer: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
    </svg>
  ),
  Sun: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  ),
  Menu: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  X: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  ChevronRight: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  Check: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Wifi: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>
    </svg>
  ),
  Train: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2"/><path d="M16 2v20M8 2v20M4 10h16M4 14h16"/>
      <circle cx="8.5" cy="17" r="1.5" fill={color}/><circle cx="15.5" cy="17" r="1.5" fill={color}/>
    </svg>
  ),
  Zap: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  Leaf: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 8C8 10 5.9 16.17 3.82 19c.09-3.42 1.58-11.78 13.18-11z"/>
      <path d="M3.82 19C4 17.5 5 16.5 6 15"/>
    </svg>
  ),
  Settings: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  Globe: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  Send: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Home: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Map: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
      <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
  ),
  FileText: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  RefreshCw: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  ),
};

function Panel({ children, className = "", accent }) {
  return (
    <div
      className={cx("rounded-2xl border p-4 relative overflow-hidden", className)}
      style={{
        background: "#ffffff",
        borderColor: accent ? "#1a56db" : "#e2e8f0",
        borderWidth: accent ? "2px" : "1px",
        boxShadow: accent ? "0 0 0 3px rgba(26,86,219,0.08)" : "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      {children}
    </div>
  );
}

function Label({ children, style = {} }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 8, ...style }}>
      {children}
    </p>
  );
}

function Badge({ type = "info", children }) {
  const map = {
    info: { bg: "#eff6ff", color: "#1d4ed8" },
    success: { bg: "#f0fdf4", color: "#166534" },
    warning: { bg: "#fffbeb", color: "#b45309" },
    danger: { bg: "#fef2f2", color: "#b91c1c" },
    neutral: { bg: "#f1f5f9", color: "#475569" },
  };
  const s = map[type] || map.info;
  return (
    <span style={{ background: s.bg, color: s.color, fontWeight: 700, fontSize: 11, padding: "2px 8px", borderRadius: 20, display: "inline-flex", alignItems: "center" }}>
      {children}
    </span>
  );
}

function MetricBar({ label, value, unit = "%", color = "#1a56db", warn = 75, danger = 90, showLabel = true }) {
  const pct = unit === "%" ? value : Math.min(100, value);
  const barColor = value > danger ? "#dc2626" : value > warn ? "#d97706" : color;
  return (
    <div style={{ display: "grid", gap: 3 }}>
      {showLabel && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: "#64748b" }}>{label}</span>
          <span style={{ fontWeight: 700, color: barColor }}>{value}{unit}</span>
        </div>
      )}
      <div style={{ height: 6, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 3, transition: "width 0.7s ease" }} />
      </div>
    </div>
  );
}

function KpiCard({ IconComponent, label, value, sub, color = "#1a56db", trend }) {
  return (
    <Panel>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <IconComponent size={18} color={color} />
        </div>
        {trend !== undefined && (
          <Badge type={trend === "up" ? "success" : trend === "warn" ? "warning" : "neutral"}>
            {trend}
          </Badge>
        )}
      </div>
      <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", lineHeight: 1.1, marginTop: 2 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{sub}</p>}
    </Panel>
  );
}

function ScoreRing({ score, size = 100, color = "#1a56db" }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="9" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 700ms ease" }} />
      </svg>
      <div style={{ position: "absolute", textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em" }}>HEALTH</div>
      </div>
    </div>
  );
}

function EmergencyModal({ onClose }) {
  const [calling, setCalling] = useState(null);
  const call = (num, label) => {
    setCalling(label);
    setTimeout(() => window.open(`tel:${num}`, "_self"), 300);
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon.Phone size={20} color="#dc2626" />
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>Emergency Services</p>
              <p style={{ fontSize: 12, color: "#64748b" }}>Japan emergency numbers</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Icon.X size={16} color="#64748b" />
          </button>
        </div>

        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 12, color: "#b91c1c", fontWeight: 600 }}>
          Only call emergency services for real emergencies. False calls are a criminal offence in Japan.
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {Object.values(EMERGENCY).map(e => (
            <button
              key={e.number}
              onClick={() => call(e.number, e.label)}
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                background: calling === e.label ? "#fef2f2" : "#f8fafc",
                border: `2px solid ${calling === e.label ? "#dc2626" : "#e2e8f0"}`,
                borderRadius: 14, cursor: "pointer", transition: "all 0.15s", textAlign: "left",
              }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 12, background: e.label === "Police" ? "#eff6ff" : "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 24, fontWeight: 900, color: e.label === "Police" ? "#1d4ed8" : "#dc2626" }}>{e.number}</span>
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{e.label}</p>
                <p style={{ fontSize: 12, color: "#64748b" }}>{e.desc}</p>
              </div>
              <Icon.Phone size={16} color="#94a3b8" style={{ marginLeft: "auto" }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AccountModal({ account, onSave, onClose }) {
  const [form, setForm] = useState(account || { name: "", email: "", phone: "", ward: "", prefNotifs: true });
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon.User size={20} color="#1a56db" />
            </div>
            <p style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>{account ? "My Account" : "Create Account"}</p>
          </div>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon.X size={16} color="#64748b" />
          </button>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {[
            { key: "name", label: "Full Name", ph: "Tanaka Hiroshi", type: "text" },
            { key: "email", label: "Email Address", ph: "hiroshi@example.com", type: "email" },
            { key: "phone", label: "Phone Number", ph: "090-XXXX-XXXX", type: "tel" },
            { key: "ward", label: "Ward / Ku / Machi (区・町)", ph: "e.g. 水戸市東水戸, Mito-shi...", type: "text" },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>{f.label}</label>
              <input
                type={f.type}
                value={form[f.key]}
                placeholder={f.ph}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                style={{
                  width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10,
                  fontSize: 14, outline: "none", boxSizing: "border-box", color: "#0f172a",
                  fontFamily: "inherit",
                }}
              />
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              id="notifs"
              checked={form.prefNotifs}
              onChange={e => setForm(p => ({ ...p, prefNotifs: e.target.checked }))}
              style={{ width: 16, height: 16, accentColor: "#1a56db" }}
            />
            <label htmlFor="notifs" style={{ fontSize: 13, color: "#475569", fontWeight: 500 }}>
              Receive local alerts for my ward
            </label>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px", border: "1.5px solid #e2e8f0", borderRadius: 12, background: "#fff", color: "#64748b", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
            Cancel
          </button>
          <button
            onClick={() => { onSave(form); onClose(); }}
            style={{ flex: 2, padding: "11px", border: "none", borderRadius: 12, background: "#1a56db", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}
          >
            {account ? "Save Changes" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportForm({ location, account, onClose, onSubmit }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    category: "", title: "", description: "", address: location?.district || "",
    urgency: "medium", name: account?.name || "", contact: account?.email || "",
    photo: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [refNo] = useState(`MR-${Date.now().toString().slice(-6)}`);

  const doSubmit = () => {
    setSubmitted(true);
    onSubmit && onSubmit({ ...form, refNo, submittedAt: new Date().toISOString() });
  };

  if (submitted) return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9997, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 400, textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Icon.Check size={32} color="#16a34a" />
        </div>
        <p style={{ fontWeight: 800, fontSize: 18, color: "#0f172a", marginBottom: 6 }}>Report Submitted</p>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
          Your issue has been forwarded to {ISSUE_CATEGORIES.find(c => c.id === form.category)?.dept || "City Hall"}
        </p>
        <div style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>REFERENCE NUMBER</p>
          <p style={{ fontWeight: 800, fontSize: 20, color: "#1a56db" }}>{refNo}</p>
        </div>
        <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>Keep this number to track your report. Response expected within 5 business days.</p>
        <button onClick={onClose} style={{ width: "100%", padding: "12px", background: "#1a56db", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
          Done
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9997, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <p style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>Report Municipal Issue</p>
            <p style={{ fontSize: 12, color: "#64748b" }}>Step {step} of 3</p>
          </div>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon.X size={16} color="#64748b" />
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {[1,2,3].map(n => (
            <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: n <= step ? "#1a56db" : "#e2e8f0", transition: "background 0.3s" }} />
          ))}
        </div>

        {step === 1 && (
          <div style={{ display: "grid", gap: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>What type of issue are you reporting?</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {ISSUE_CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setForm(p => ({ ...p, category: c.id }))}
                  style={{
                    padding: "12px 10px", border: `2px solid ${form.category === c.id ? "#1a56db" : "#e2e8f0"}`,
                    borderRadius: 12, background: form.category === c.id ? "#eff6ff" : "#f8fafc",
                    cursor: "pointer", textAlign: "left",
                  }}>
                  <p style={{ fontSize: 18, marginBottom: 4 }}>{c.icon}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: form.category === c.id ? "#1d4ed8" : "#0f172a" }}>{c.label}</p>
                </button>
              ))}
            </div>
            <button
              disabled={!form.category}
              onClick={() => setStep(2)}
              style={{ marginTop: 8, padding: "12px", background: form.category ? "#1a56db" : "#e2e8f0", border: "none", borderRadius: 12, color: form.category ? "#fff" : "#94a3b8", fontWeight: 700, cursor: form.category ? "pointer" : "not-allowed", fontSize: 14 }}>
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "10px 12px", fontSize: 12, color: "#166534" }}>
              Forwarding to: <strong>{ISSUE_CATEGORIES.find(c => c.id === form.category)?.dept}</strong>
            </div>
            {[
              { key: "title", label: "Issue Title", ph: "e.g. Pothole on main street near station", multi: false },
              { key: "description", label: "Detailed Description", ph: "Describe the location, severity, and any relevant details...", multi: true },
              { key: "address", label: "Exact Address / Location", ph: location?.displayName?.slice(0, 60) || "Street address or landmark", multi: false },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>{f.label}</label>
                {f.multi ? (
                  <textarea
                    value={form[f.key]}
                    placeholder={f.ph}
                    rows={4}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", color: "#0f172a" }}
                  />
                ) : (
                  <input
                    type="text" value={form[f.key]} placeholder={f.ph}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit", color: "#0f172a" }}
                  />
                )}
              </div>
            ))}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>Urgency Level</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[{ v: "low", l: "Low", c: "#16a34a" }, { v: "medium", l: "Medium", c: "#d97706" }, { v: "high", l: "High", c: "#dc2626" }].map(u => (
                  <button key={u.v} onClick={() => setForm(p => ({ ...p, urgency: u.v }))}
                    style={{ flex: 1, padding: "9px", border: `2px solid ${form.urgency === u.v ? u.c : "#e2e8f0"}`, borderRadius: 10, background: form.urgency === u.v ? `${u.c}15` : "#f8fafc", color: form.urgency === u.v ? u.c : "#94a3b8", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                    {u.l}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: "12px", border: "1.5px solid #e2e8f0", borderRadius: 12, background: "#fff", color: "#64748b", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Back</button>
              <button disabled={!form.title || !form.description} onClick={() => setStep(3)} style={{ flex: 2, padding: "12px", background: form.title && form.description ? "#1a56db" : "#e2e8f0", border: "none", borderRadius: 12, color: form.title && form.description ? "#fff" : "#94a3b8", fontWeight: 700, cursor: form.title && form.description ? "pointer" : "not-allowed", fontSize: 14 }}>
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: "grid", gap: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Your contact details (for follow-up)</p>
            {[
              { key: "name", label: "Full Name", ph: "Your name", type: "text" },
              { key: "contact", label: "Email or Phone", ph: "For status updates", type: "text" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>{f.label}</label>
                <input
                  type={f.type} value={form[f.key]} placeholder={f.ph}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit", color: "#0f172a" }}
                />
              </div>
            ))}
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 16px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Summary</p>
              <p style={{ fontSize: 13, color: "#0f172a", fontWeight: 600, marginBottom: 2 }}>{form.title}</p>
              <p style={{ fontSize: 12, color: "#64748b" }}>{ISSUE_CATEGORIES.find(c => c.id === form.category)?.label} · {form.urgency} urgency</p>
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{form.address}</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: "12px", border: "1.5px solid #e2e8f0", borderRadius: 12, background: "#fff", color: "#64748b", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Back</button>
              <button onClick={doSubmit} style={{ flex: 2, padding: "12px", background: "#1a56db", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Icon.Send size={15} color="#fff" /> Submit Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OverviewSection({ location, weather, aqi, healthScore, onReport, account }) {
  const getAQILevel = (v) => {
    if (!v) return { label: "Unknown", color: "#94a3b8" };
    if (v <= 50) return { label: "Good", color: "#16a34a" };
    if (v <= 100) return { label: "Moderate", color: "#d97706" };
    if (v <= 150) return { label: "Unhealthy for Sensitive", color: "#ea580c" };
    return { label: "Unhealthy", color: "#dc2626" };
  };
  const aqiLevel = getAQILevel(aqi?.aqi);
  const uvColor = !weather ? "#94a3b8" : weather.uv <= 2 ? "#16a34a" : weather.uv <= 5 ? "#d97706" : weather.uv <= 7 ? "#ea580c" : "#dc2626";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Panel accent>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Icon.MapPin size={14} color="#1a56db" />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#1a56db", textTransform: "uppercase", letterSpacing: "0.08em" }}>Your Location</span>
            </div>
            {location ? (
              <>
                <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1, marginBottom: 4 }}>
                  {location.city}
                </h2>
                <p style={{ fontSize: 13, color: "#64748b" }}>{location.prefecture}{location.district ? ` · ${location.district}` : ""}</p>
                {location.postcode && <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>〒{location.postcode}</p>}
              </>
            ) : (
              <p style={{ fontSize: 14, color: "#94a3b8", fontStyle: "italic" }}>Detecting location...</p>
            )}
            {account && (
              <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, background: "#f0fdf4", padding: "4px 10px", borderRadius: 20, border: "1px solid #86efac" }}>
                <Icon.Check size={12} color="#16a34a" />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#166534" }}>Signed in as {account.name}</span>
              </div>
            )}
          </div>
          <ScoreRing score={healthScore} size={100} color={healthScore > 80 ? "#16a34a" : healthScore > 60 ? "#d97706" : "#dc2626"} />
        </div>
      </Panel>

      {weather ? (
        <Panel>
          <Label>Current Weather</Label>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <WeatherIcon code={weather.code} size={48} color="#1a56db" />
            <div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{weather.temp}°C</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>{weather.cond} · Feels {weather.feels}°C</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { IconC: Icon.Droplets, label: "Humidity", value: `${weather.humidity}%`, color: "#1a56db" },
              { IconC: Icon.Wind, label: "Wind", value: weather.wind, color: "#0d9488" },
              { IconC: Icon.Sun, label: "UV Index", value: weather.uv, color: uvColor },
            ].map(s => (
              <div key={s.label} style={{ background: "#f8fafc", borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
                <s.IconC size={18} color={s.color} />
                <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{s.label}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{s.value}</p>
              </div>
            ))}
          </div>
        </Panel>
      ) : (
        <Panel>
          <Label>Weather</Label>
          <p style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>Enable location to see real-time weather for your area</p>
        </Panel>
      )}

      {aqi ? (
        <Panel>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Label style={{ marginBottom: 0 }}>Air Quality Index</Label>
            <Badge type={aqi.aqi <= 50 ? "success" : aqi.aqi <= 100 ? "warning" : "danger"}>{aqiLevel.label}</Badge>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: aqiLevel.color, lineHeight: 1 }}>{aqi.aqi}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>US AQI Scale</p>
              <MetricBar label="" value={Math.min(aqi.aqi, 200)} unit="" color={aqiLevel.color} warn={50} danger={100} showLabel={false} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "PM2.5", value: `${aqi.pm25} µg/m³` },
              { label: "PM10", value: `${aqi.pm10} µg/m³` },
              { label: "NO₂", value: `${aqi.no2} µg/m³` },
              { label: "Ozone", value: `${aqi.o3} µg/m³` },
            ].map(s => (
              <div key={s.label} style={{ background: "#f8fafc", borderRadius: 10, padding: "8px 12px" }}>
                <p style={{ fontSize: 11, color: "#94a3b8" }}>{s.label}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{s.value}</p>
              </div>
            ))}
          </div>
        </Panel>
      ) : (
        <Panel>
          <Label>Air Quality</Label>
          <p style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>Enable location to see real-time AQI for your area</p>
        </Panel>
      )}

      <Panel>
        <Label>Quick Actions</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button onClick={onReport}
            style={{ padding: "14px 12px", background: "#eff6ff", border: "2px solid #bfdbfe", borderRadius: 14, cursor: "pointer", textAlign: "left" }}>
            <Icon.FileText size={20} color="#1d4ed8" />
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8", marginTop: 6 }}>Report Issue</p>
            <p style={{ fontSize: 11, color: "#60a5fa" }}>Municipal complaint</p>
          </button>
          <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: "14px 12px" }}>
            <Icon.Activity size={20} color="#0d9488" />
            <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 6 }}>Local Stats</p>
            <p style={{ fontSize: 11, color: "#94a3b8" }}>Based on your GPS</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function SafetySection({ onCallEmergency, location, reports }) {
  const myReports = reports || [];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Panel accent>
        <Label>Emergency Services Japan</Label>
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "12px 14px", marginBottom: 12, fontSize: 12, color: "#b91c1c", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon.AlertTriangle size={14} color="#dc2626" />
          Only call in genuine emergencies. False calls are a crime.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button onClick={onCallEmergency}
            style={{ padding: "16px 12px", background: "#dc2626", border: "none", borderRadius: 14, cursor: "pointer", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Icon.Phone size={24} color="#fff" />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontWeight: 800, fontSize: 28, lineHeight: 1 }}>110</p>
              <p style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>Police · 警察</p>
            </div>
          </button>
          <button onClick={onCallEmergency}
            style={{ padding: "16px 12px", background: "#ea580c", border: "none", borderRadius: 14, cursor: "pointer", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Icon.Phone size={24} color="#fff" />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontWeight: 800, fontSize: 28, lineHeight: 1 }}>119</p>
              <p style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>Fire / Ambulance</p>
            </div>
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          {[
            { num: "118", label: "Coast Guard", desc: "海上保安庁", color: "#0d9488" },
            { num: "171", label: "Disaster Voicemail", desc: "災害用伝言", color: "#7c3aed" },
          ].map(e => (
            <button key={e.num} onClick={() => window.open(`tel:${e.num}`, "_self")}
              style={{ padding: "12px", background: `${e.color}10`, border: `1.5px solid ${e.color}30`, borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
              <span style={{ fontWeight: 800, fontSize: 22, color: e.color }}>{e.num}</span>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{e.label}</p>
                <p style={{ fontSize: 10, color: "#94a3b8" }}>{e.desc}</p>
              </div>
            </button>
          ))}
        </div>
        <button onClick={onCallEmergency} style={{ width: "100%", marginTop: 12, padding: "12px", background: "#f1f5f9", border: "1.5px solid #e2e8f0", borderRadius: 12, cursor: "pointer", color: "#475569", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Icon.Phone size={14} color="#475569" /> View all emergency numbers
        </button>
      </Panel>

      <Panel>
        <Label>Disaster Preparedness Resources</Label>
        <div style={{ display: "grid", gap: 8 }}>
          {[
            { label: "Japan Meteorological Agency", url: "https://www.jma.go.jp/jma/indexe.html", desc: "Earthquakes, tsunamis, weather warnings" },
            { label: "J-Alert System", url: "https://www.fdma.go.jp/en/", desc: "National early warning broadcasts" },
            { label: "Safety Tips App (観光庁)", url: "https://www.jnto.go.jp/safety-tips/eng/", desc: "Tourist safety and disaster info in English" },
            { label: "NHK World Emergency Info", url: "https://www3.nhk.or.jp/nhkworld/en/information/", desc: "Real-time news and disaster broadcasts" },
          ].map(r => (
            <a key={r.label} href={r.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, textDecoration: "none" }}>
              <Icon.Globe size={16} color="#1a56db" />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#1a56db" }}>{r.label}</p>
                <p style={{ fontSize: 11, color: "#64748b" }}>{r.desc}</p>
              </div>
              <Icon.ChevronRight size={14} color="#94a3b8" />
            </a>
          ))}
        </div>
      </Panel>

      {myReports.length > 0 && (
        <Panel>
          <Label>My Submitted Reports</Label>
          <div style={{ display: "grid", gap: 8 }}>
            {myReports.map(r => (
              <div key={r.refNo} style={{ padding: "12px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#1a56db" }}>{r.refNo}</span>
                  <Badge type={r.urgency === "high" ? "danger" : r.urgency === "medium" ? "warning" : "success"}>{r.urgency}</Badge>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{r.title}</p>
                <p style={{ fontSize: 11, color: "#94a3b8" }}>{ISSUE_CATEGORIES.find(c => c.id === r.category)?.label}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function ServicesSection({ location, account, onReport, reports }) {
  const [search, setSearch] = useState("");
  const filtered = ISSUE_CATEGORIES.filter(c => c.label.toLowerCase().includes(search.toLowerCase()) || c.dept.toLowerCase().includes(search.toLowerCase()));
  const myReports = reports || [];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Panel>
        <Label>Report a Municipal Issue</Label>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
          Submit complaints and service requests directly to the relevant city department. Your report is logged with a reference number.
        </p>
        {location && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#eff6ff", borderRadius: 10, padding: "8px 12px", marginBottom: 14 }}>
            <Icon.MapPin size={13} color="#1a56db" />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8" }}>
              {location.city}{location.prefecture ? `, ${location.prefecture}` : ""}
            </span>
          </div>
        )}
        <button onClick={onReport}
          style={{ width: "100%", padding: "14px", background: "#1a56db", border: "none", borderRadius: 14, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <Icon.FileText size={18} color="#fff" /> Start New Report
        </button>
      </Panel>

      <Panel>
        <Label>City Departments</Label>
        <div style={{ marginBottom: 12 }}>
          <input
            type="text" placeholder="Search departments..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit", color: "#0f172a" }}
          />
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map(c => (
            <button key={c.id} onClick={onReport}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, cursor: "pointer", textAlign: "left", width: "100%" }}>
              <span style={{ fontSize: 22 }}>{c.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{c.label}</p>
                <p style={{ fontSize: 11, color: "#64748b" }}>{c.dept}</p>
              </div>
              <Icon.ChevronRight size={14} color="#94a3b8" />
            </button>
          ))}
        </div>
      </Panel>

      <Panel>
        <Label>My Reports ({myReports.length})</Label>
        {myReports.length === 0 ? (
          <p style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "16px 0" }}>No reports submitted yet</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {myReports.map(r => (
              <div key={r.refNo} style={{ padding: "12px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 800, fontSize: 12, color: "#1a56db" }}>{r.refNo}</span>
                  <Badge type={r.urgency === "high" ? "danger" : r.urgency === "medium" ? "warning" : "success"}>{r.urgency}</Badge>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{r.title}</p>
                <p style={{ fontSize: 11, color: "#94a3b8" }}>{r.description?.slice(0, 60)}...</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel>
        <Label>Useful Government Portals</Label>
        <div style={{ display: "grid", gap: 8 }}>
          {[
            { label: "e-Gov Japan (e-Gov電子申請)", url: "https://www.e-gov.go.jp/", desc: "Online government service applications" },
            { label: "My Number Portal (マイナポータル)", url: "https://myna.go.jp/", desc: "Resident card services & tax filing" },
            { label: "National Tax Agency", url: "https://www.nta.go.jp/english/", desc: "Tax information and e-Tax filing" },
            { label: "Japan Post (日本郵便)", url: "https://www.post.japanpost.jp/", desc: "Address changes, mail forwarding" },
          ].map(r => (
            <a key={r.label} href={r.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, textDecoration: "none" }}>
              <Icon.Globe size={16} color="#1a56db" />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#1a56db" }}>{r.label}</p>
                <p style={{ fontSize: 11, color: "#64748b" }}>{r.desc}</p>
              </div>
              <Icon.ChevronRight size={14} color="#94a3b8" />
            </a>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function EnvironmentSection({ aqi, weather, location }) {
  if (!aqi && !weather) return (
    <div style={{ display: "grid", gap: 16 }}>
      <Panel>
        <Label>Environment & Air Quality</Label>
        <div style={{ textAlign: "center", padding: "32px 16px" }}>
          <Icon.Leaf size={40} color="#94a3b8" />
          <p style={{ fontSize: 14, color: "#94a3b8", marginTop: 12 }}>Enable location access to see real-time environmental data for your exact area</p>
        </div>
      </Panel>
    </div>
  );

  const aqiColor = !aqi ? "#94a3b8" : aqi.aqi <= 50 ? "#16a34a" : aqi.aqi <= 100 ? "#d97706" : "#dc2626";
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {aqi && (
        <Panel>
          <Label>Air Quality — {location?.city || "Your Location"}</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "US AQI", value: aqi.aqi, color: aqiColor, large: true },
              { label: "PM2.5", value: `${aqi.pm25} µg/m³`, color: aqi.pm25 > 25 ? "#dc2626" : "#16a34a" },
              { label: "PM10", value: `${aqi.pm10} µg/m³`, color: aqi.pm10 > 50 ? "#d97706" : "#16a34a" },
              { label: "NO₂", value: `${aqi.no2} µg/m³`, color: aqi.no2 > 40 ? "#d97706" : "#16a34a" },
              { label: "Ozone", value: `${aqi.o3} µg/m³`, color: "#1a56db" },
              { label: "Standard", value: aqi.aqi <= 50 ? "Good" : aqi.aqi <= 100 ? "Moderate" : "Poor", color: aqiColor },
            ].map(s => (
              <div key={s.label} style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 14px" }}>
                <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>{s.label}</p>
                <p style={{ fontSize: s.large ? 28 : 16, fontWeight: 800, color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {weather && (
        <Panel>
          <Label>Atmospheric Conditions</Label>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { label: "Temperature", value: `${weather.temp}°C`, bar: weather.temp, max: 45, color: weather.temp > 35 ? "#dc2626" : "#1a56db" },
              { label: "Humidity", value: `${weather.humidity}%`, bar: weather.humidity, max: 100, color: "#0d9488" },
              { label: "UV Index", value: weather.uv, bar: (weather.uv / 11) * 100, max: 100, color: weather.uv > 7 ? "#dc2626" : "#d97706" },
            ].map(s => (
              <div key={s.label} style={{ display: "grid", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#64748b", fontWeight: 500 }}>{s.label}</span>
                  <span style={{ fontWeight: 700, color: s.color }}>{s.value}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "#f1f5f9" }}>
                  <div style={{ height: "100%", width: `${Math.min(s.bar, 100)}%`, background: s.color, borderRadius: 3, transition: "width 0.7s" }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <Panel>
        <Label>External Data Sources</Label>
        <div style={{ display: "grid", gap: 8 }}>
          {[
            { label: "Open-Meteo Weather API", url: "https://open-meteo.com", note: "Real-time weather data" },
            { label: "Open-Meteo Air Quality", url: "https://air-quality-api.open-meteo.com", note: "PM2.5, AQI, pollutants" },
            { label: "JMA Weather Warnings", url: "https://www.jma.go.jp/bosai/warning/#lang=en", note: "Japan Met Agency" },
            { label: "Soramame AQI (Japan)", url: "https://soramame.env.go.jp/", note: "Ministry of Environment" },
          ].map(r => (
            <a key={r.label} href={r.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, textDecoration: "none" }}>
              <Icon.Globe size={14} color="#1a56db" />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#1a56db" }}>{r.label}</p>
                <p style={{ fontSize: 11, color: "#94a3b8" }}>{r.note}</p>
              </div>
            </a>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Sidebar({ open, onClose, activeSection, setActiveSection, account, onAccount, location }) {
  const nav = [
    { id: "overview", IconC: Icon.Home, label: "Overview" },
    { id: "safety", IconC: Icon.Shield, label: "Safety & Emergency" },
    { id: "environment", IconC: Icon.Leaf, label: "Environment" },
    { id: "services", IconC: Icon.Settings, label: "Municipal Services" },
    { id: "transport", IconC: Icon.Train, label: "Transport" },
    { id: "energy", IconC: Icon.Zap, label: "Energy" },
  ];
  return (
    <>
      {open && (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.35)" }} />
      )}
      <aside style={{
        position: "fixed", top: 0, left: 0, height: "100%", zIndex: 50, width: 272,
        background: "#ffffff", borderRight: "1px solid #e2e8f0",
        boxShadow: "4px 0 24px rgba(0,0,0,0.08)",
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column", gap: 0,
        overflowY: "auto",
      }}>
        <div style={{ padding: "20px 20px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#1a56db,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon.Globe size={20} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#1a56db", letterSpacing: "0.1em", textTransform: "uppercase" }}>Urban Intelligence</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>CityOS Japan</p>
            </div>
          </div>

          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 12px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: location ? "#16a34a" : "#d97706", display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: location ? "#166534" : "#b45309" }}>
                {location ? "Location active" : "Location pending"}
              </span>
            </div>
            {location && <p style={{ fontSize: 12, color: "#64748b", paddingLeft: 14 }}>{location.city}, {location.prefecture}</p>}
          </div>

          {/* Nav */}
          <div style={{ display: "grid", gap: 4 }}>
            {nav.map(s => (
              <button
                key={s.id}
                onClick={() => { setActiveSection(s.id); onClose(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                  borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left", width: "100%",
                  background: activeSection === s.id ? "#eff6ff" : "transparent",
                  color: activeSection === s.id ? "#1d4ed8" : "#475569",
                  fontWeight: activeSection === s.id ? 700 : 500, fontSize: 14,
                }}
              >
                <s.IconC size={17} color={activeSection === s.id ? "#1d4ed8" : "#94a3b8"} />
                {s.label}
                {activeSection === s.id && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#1a56db" }} />}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: "auto", padding: "16px 20px", borderTop: "1px solid #f1f5f9" }}>
          <button onClick={onAccount}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", width: "100%", textAlign: "left" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: account ? "#1a56db" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon.User size={16} color={account ? "#fff" : "#94a3b8"} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{account?.name || "Sign in / Register"}</p>
              <p style={{ fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{account?.ward || "Set your ward for local stats"}</p>
            </div>
            <Icon.ChevronRight size={14} color="#94a3b8" />
          </button>
        </div>
      </aside>
    </>
  );
}

function TransportSection({ location }) {
  const links = [
    { label: "Jorudan Route Search", url: "https://www.jorudan.co.jp/eng/", desc: "Japan train & bus route planner" },
    { label: "HyperDia", url: "https://www.hyperdia.com/en/", desc: "Real-time train schedules" },
    { label: "JR East Train Info", url: "https://www.jreast.co.jp/e/", desc: "Delays, cancellations, service status" },
    { label: "Tokyo Metro Status", url: "https://www.tokyometro.jp/lang_en/", desc: "Real-time subway line status" },
    { label: "Navitime Japan", url: "https://www.navitime.co.jp/", desc: "Multi-modal transit navigation" },
    { label: "Yahoo! Japan Transit", url: "https://transit.yahoo.co.jp/", desc: "Transit disruption alerts" },
    { label: "Google Maps Japan", url: "https://www.google.co.jp/maps", desc: "Real-time traffic & transit" },
  ];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Panel accent>
        <Label>Live Transit — Real-Time Sources</Label>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
          Japan's transit APIs require official carrier agreements. These curated links connect directly to live data from certified providers.
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          {links.map(r => (
            <a key={r.label} href={r.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, textDecoration: "none" }}>
              <Icon.Train size={16} color="#1a56db" />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#1a56db" }}>{r.label}</p>
                <p style={{ fontSize: 11, color: "#64748b" }}>{r.desc}</p>
              </div>
              <Icon.ChevronRight size={14} color="#94a3b8" />
            </a>
          ))}
        </div>
      </Panel>
      <Panel>
        <Label>Taxi & Ride Services</Label>
        <div style={{ display: "grid", gap: 8 }}>
          {[
            { label: "GO Taxi (GO タクシー)", url: "https://go.mo-t.com/", desc: "Japan's largest taxi app" },
            { label: "S.RIDE", url: "https://sride.jp/", desc: "Sony / Sumitomo taxi platform" },
            { label: "Uber Japan", url: "https://www.uber.com/jp/ja/", desc: "Ride & food delivery" },
          ].map(r => (
            <a key={r.label} href={r.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, textDecoration: "none" }}>
              <Icon.MapPin size={16} color="#1a56db" />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#1a56db" }}>{r.label}</p>
                <p style={{ fontSize: 11, color: "#64748b" }}>{r.desc}</p>
              </div>
              <Icon.ChevronRight size={14} color="#94a3b8" />
            </a>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function EnergySection({ location }) {
  const links = [
    { label: "TEPCO (Tokyo Electric)", url: "https://www.tepco.co.jp/en/", desc: "Live Tokyo grid demand & outages" },
    { label: "Kansai Electric (KEPCO)", url: "https://www.kepco.co.jp/english/", desc: "Osaka/Kansai power supply" },
    { label: "OCCTO Grid Monitor", url: "https://www.occto.or.jp/en/", desc: "National power grid dashboard" },
    { label: "Chubu Electric (CEPCO)", url: "https://www.chuden.co.jp/english/", desc: "Nagoya area power supply" },
    { label: "Electricity Data Platform", url: "https://www.enecho.meti.go.jp/en/", desc: "METI energy statistics" },
  ];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Panel accent>
        <Label>Energy Grid — Live Regional Data</Label>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
          Japan's power grid is managed by regional utilities. These portals show live supply, demand, and renewable ratios for your area.
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          {links.map(r => (
            <a key={r.label} href={r.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, textDecoration: "none" }}>
              <Icon.Zap size={16} color="#d97706" />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#1a56db" }}>{r.label}</p>
                <p style={{ fontSize: 11, color: "#64748b" }}>{r.desc}</p>
              </div>
              <Icon.ChevronRight size={14} color="#94a3b8" />
            </a>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function BottomNav({ active, setActive }) {
  const tabs = [
    { id: "overview", IconC: Icon.Home, label: "Home" },
    { id: "safety", IconC: Icon.Shield, label: "Safety" },
    { id: "environment", IconC: Icon.Leaf, label: "Air" },
    { id: "services", IconC: Icon.FileText, label: "Report" },
    { id: "transport", IconC: Icon.Train, label: "Transit" },
  ];
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30,
      background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)",
      borderTop: "1px solid #e2e8f0", display: "flex",
      paddingBottom: "max(8px, env(safe-area-inset-bottom))", paddingTop: 6,
    }} className="lg:hidden">
      {tabs.map(t => (
        <button key={t.id} onClick={() => setActive(t.id)}
          style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            padding: "4px 2px", border: "none", background: "none", cursor: "pointer",
            color: active === t.id ? "#1a56db" : "#94a3b8",
          }}>
          <t.IconC size={20} color={active === t.id ? "#1a56db" : "#94a3b8"} />
          <span style={{ fontSize: 10, fontWeight: active === t.id ? 700 : 500 }}>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [showEmergency, setShowEmergency] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [account, setAccount] = useState(null);
  const [reports, setReports] = useState([]);
  const [location, setLocation] = useState(null);
  const [coords, setCoords] = useState(null);
  const [weather, setWeather] = useState(null);
  const [aqi, setAqi] = useState(null);
  const [locError, setLocError] = useState(null);
  const [loading, setLoading] = useState(false);
  const now = useLiveClock();

  const healthScore = (() => {
    if (!aqi && !weather) return 72;
    const aqiScore = aqi ? Math.max(0, 100 - aqi.aqi) : 70;
    const tempScore = weather ? (weather.temp < 35 ? 90 : 60) : 70;
    const uvScore = weather ? Math.max(0, 100 - weather.uv * 10) : 80;
    return Math.round((aqiScore * 0.5 + tempScore * 0.3 + uvScore * 0.2));
  })();

  const loadLocationData = useCallback(async (lat, lon) => {
    setLoading(true);
    try {
      const [geo, wx, aq] = await Promise.all([
        reverseGeocode(lat, lon),
        fetchWeather(lat, lon),
        fetchAQI(lat, lon),
      ]);
      if (geo) setLocation(geo);
      if (wx) setWeather(wx);
      if (aq) setAqi(aq);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocError("Geolocation not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setCoords({ lat, lon });
        loadLocationData(lat, lon);
      },
      (err) => {
        setLocError("Location access denied. Enable GPS for local stats.");
        // Default to Ibaraki (per user location hint)
        loadLocationData(36.3418, 140.4468);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [loadLocationData]);

  const handleReport = (data) => {
    setReports(r => [data, ...r]);
    setShowReport(false);
  };

  const topNavItems = [
    { id: "overview", IconC: Icon.Home, label: "Overview" },
    { id: "safety", IconC: Icon.Shield, label: "Safety" },
    { id: "environment", IconC: Icon.Leaf, label: "Environment" },
    { id: "services", IconC: Icon.FileText, label: "Services" },
    { id: "transport", IconC: Icon.Train, label: "Transport" },
    { id: "energy", IconC: Icon.Zap, label: "Energy" },
  ];

  return (
    <div style={{ background: "#f0f2f5", minHeight: "100vh", color: "#0f172a", fontFamily: "'Inter', -apple-system, system-ui, sans-serif" }}>
      {showEmergency && <EmergencyModal onClose={() => setShowEmergency(false)} />}
      {showAccount && <AccountModal account={account} onSave={(a) => setAccount(a)} onClose={() => setShowAccount(false)} />}
      {showReport && <ReportForm location={location} account={account} onClose={() => setShowReport(false)} onSubmit={handleReport} />}

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        account={account}
        onAccount={() => { setShowAccount(true); setSidebarOpen(false); }}
        location={location}
      />

      <div style={{ marginLeft: 0 }} className="lg:ml-[272px]">
        <header style={{
          position: "sticky", top: 0, zIndex: 20,
          background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)",
          borderBottom: "1px solid #e2e8f0",
          display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
        }}>
          <button onClick={() => setSidebarOpen(true)}
            style={{ width: 38, height: 38, borderRadius: 10, background: "#f1f5f9", border: "1.5px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
            className="lg:hidden">
            <Icon.Menu size={18} color="#475569" />
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 800, fontSize: 15, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {location ? `${location.city}${location.prefecture ? `, ${location.prefecture}` : ""}` : "CityOS Japan"}
            </p>
            <p style={{ fontSize: 11, color: "#94a3b8" }}>
              {now.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} JST
              {loading && " · Loading..."}
            </p>
          </div>

          <button onClick={() => setShowEmergency(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#dc2626", border: "none", borderRadius: 10, cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
            <Icon.Phone size={14} color="#fff" />
            <span className="hidden sm:inline">Emergency</span>
            <span style={{ fontSize: 13, fontWeight: 800 }}>110</span>
          </button>

          <button onClick={() => setShowAccount(true)}
            style={{ width: 36, height: 36, borderRadius: "50%", background: account ? "#1a56db" : "#f1f5f9", border: "1.5px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <Icon.User size={16} color={account ? "#fff" : "#94a3b8"} />
          </button>
        </header>

        <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "6px 16px", display: "flex", gap: 6, overflowX: "auto" }}>
          {topNavItems.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10,
                border: "1.5px solid", flexShrink: 0, cursor: "pointer",
                borderColor: activeSection === s.id ? "#1a56db" : "transparent",
                background: activeSection === s.id ? "#eff6ff" : "transparent",
                color: activeSection === s.id ? "#1d4ed8" : "#64748b",
                fontWeight: activeSection === s.id ? 700 : 500, fontSize: 13,
                transition: "all 0.15s",
              }}>
              <s.IconC size={14} color={activeSection === s.id ? "#1d4ed8" : "#94a3b8"} />
              {s.label}
            </button>
          ))}
        </div>

        {locError && (
          <div style={{ background: "#fffbeb", borderBottom: "1px solid #fcd34d", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <Icon.AlertTriangle size={15} color="#d97706" />
            <span style={{ fontSize: 13, color: "#92400e" }}>{locError}</span>
            {coords && (
              <button onClick={() => loadLocationData(coords.lat, coords.lon)} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#1a56db", fontWeight: 600, border: "none", background: "none", cursor: "pointer" }}>
                <Icon.RefreshCw size={12} color="#1a56db" /> Retry
              </button>
            )}
          </div>
        )}

        <main style={{ padding: 16, paddingBottom: 88, maxWidth: 720, margin: "0 auto" }}>
          {activeSection === "overview" && (
            <OverviewSection location={location} weather={weather} aqi={aqi} healthScore={healthScore} onReport={() => setShowReport(true)} account={account} />
          )}
          {activeSection === "safety" && (
            <SafetySection onCallEmergency={() => setShowEmergency(true)} location={location} reports={reports} />
          )}
          {activeSection === "environment" && (
            <EnvironmentSection aqi={aqi} weather={weather} location={location} />
          )}
          {activeSection === "services" && (
            <ServicesSection location={location} account={account} onReport={() => setShowReport(true)} reports={reports} />
          )}
          {activeSection === "transport" && <TransportSection location={location} />}
          {activeSection === "energy" && <EnergySection location={location} />}
        </main>
      </div>

      <BottomNav active={activeSection} setActive={setActiveSection} />
    </div>
  );
}
