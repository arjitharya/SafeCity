// ─────────────────────────────────────────────────────────────────────────────
// External data sources for CityOS Japan
// Weather + Air Quality (Open-Meteo), reverse geocoding (Nominatim),
// location-based news (Google News RSS via CORS proxy), and a local Ollama
// chat bridge for the civic AI assistant.
// ─────────────────────────────────────────────────────────────────────────────

const WMO = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle",
  61: "Light rain", 63: "Moderate rain", 65: "Heavy rain",
  71: "Light snow", 73: "Moderate snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Rain showers", 81: "Heavy showers", 82: "Violent showers",
  85: "Snow showers", 86: "Heavy snow showers", 95: "Thunderstorm",
  96: "Thunderstorm + hail", 99: "Severe thunderstorm",
};

export async function fetchWeather(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,uv_index,precipitation` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max` +
      `&timezone=Asia%2FTokyo&forecast_days=5`;
    const r = await fetch(url);
    const d = await r.json();
    const c = d.current;
    const daily = (d.daily?.time || []).map((t, i) => ({
      date: t,
      max: Math.round(d.daily.temperature_2m_max[i]),
      min: Math.round(d.daily.temperature_2m_min[i]),
      code: d.daily.weather_code[i],
      cond: WMO[d.daily.weather_code[i]] || "—",
      rain: d.daily.precipitation_probability_max?.[i] ?? null,
    }));
    return {
      temp: Math.round(c.temperature_2m),
      feels: Math.round(c.apparent_temperature),
      humidity: c.relative_humidity_2m,
      uv: Math.round(c.uv_index ?? 0),
      wind: `${Math.round(c.wind_speed_10m)} km/h`,
      windDir: c.wind_direction_10m,
      precip: c.precipitation ?? 0,
      cond: WMO[c.weather_code] || `Code ${c.weather_code}`,
      code: c.weather_code,
      daily,
    };
  } catch {
    return null;
  }
}

export async function fetchAQI(lat, lon) {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
      `&current=pm10,pm2_5,us_aqi,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide&timezone=Asia%2FTokyo`;
    const r = await fetch(url);
    const d = await r.json();
    const c = d.current;
    return {
      aqi: Math.round(c.us_aqi ?? 0),
      pm25: Math.round(c.pm2_5 ?? 0),
      pm10: Math.round(c.pm10 ?? 0),
      no2: Math.round(c.nitrogen_dioxide ?? 0),
      o3: Math.round(c.ozone ?? 0),
      so2: Math.round(c.sulphur_dioxide ?? 0),
      co: Math.round(c.carbon_monoxide ?? 0),
    };
  } catch {
    return null;
  }
}

export async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`;
    const r = await fetch(url, { headers: { "Accept": "application/json" } });
    const d = await r.json();
    const a = d.address || {};
    return {
      city: a.city || a.town || a.village || a.county || "Unknown",
      cityJa: a["city:ja"] || "",
      prefecture: a.state || a.province || "",
      district: a.suburb || a.neighbourhood || a.quarter || a.city_district || "",
      postcode: a.postcode || "",
      country: a.country_code || "",
      displayName: d.display_name || "",
    };
  } catch {
    return null;
  }
}

// ── Location-based news via Google News RSS (proxied for CORS) ────────────────
// Public CORS proxies get rate-limited, so we try several in turn and keep the
// first that returns parseable items. We also cache the last good result per
// topic so a transient failure still shows something useful.
const NEWS_PROXIES = [
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
  (u) => `https://thingproxy.freeboard.io/fetch/${u}`,
];

const _newsCache = {};

export const NEWS_TOPICS = [
  { id: "disaster", label: "Disaster & Safety" },
  { id: "local", label: "Local" },
  { id: "national", label: "National" },
  { id: "weather", label: "Weather" },
];

const COUNTRY_NAMES = {
  jp: "Japan", us: "United States", gb: "UK", au: "Australia", ca: "Canada", in: "India",
  de: "Germany", fr: "France", kr: "South Korea", cn: "China", br: "Brazil", mx: "Mexico",
};

function buildNewsQuery(topic, location) {
  const nation = COUNTRY_NAMES[(location?.country || "").toLowerCase()] || location?.prefecture || "world";
  const place = location?.city && location.city !== "Unknown"
    ? `${location.city} ${location.prefecture || ""}`.trim()
    : nation;
  switch (topic) {
    case "local": return place;
    case "disaster": return `${nation} disaster OR earthquake OR storm OR emergency OR safety`.trim();
    case "weather": return `${nation} severe weather warning`.trim();
    case "national":
    default: return `${nation} breaking news`;
  }
}

function parseRss(text) {
  const xml = new DOMParser().parseFromString(text, "text/xml");
  return Array.from(xml.querySelectorAll("item")).slice(0, 16).map((it) => {
    const title = it.querySelector("title")?.textContent || "";
    const link = it.querySelector("link")?.textContent || "";
    const pub = it.querySelector("pubDate")?.textContent || "";
    const descRaw = it.querySelector("description")?.textContent || "";
    const source = it.getElementsByTagName("source")[0]?.textContent ||
      (title.includes(" - ") ? title.split(" - ").pop() : "News");
    return {
      title: title.replace(/ - [^-]*$/, ""),
      link, source, pub,
      desc: descRaw.replace(/<[^>]+>/g, "").slice(0, 160),
    };
  });
}

export async function fetchNews(topic, location) {
  const q = buildNewsQuery(topic, location);
  const gl = (location?.country || "US").toUpperCase();
  const rss = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en&gl=${gl}&ceid=${gl}:en`;

  for (const proxy of NEWS_PROXIES) {
    try {
      const r = await fetch(proxy(rss));
      if (!r.ok) continue;
      const text = await r.text();
      if (!text || text.length < 100) continue;
      const items = parseRss(text);
      if (items.length) { _newsCache[topic] = items; return items; }
    } catch {
      /* try next proxy */
    }
  }
  // all proxies failed — fall back to the last good batch if we have one
  return _newsCache[topic] || null;
}

// ── Local Ollama bridge ───────────────────────────────────────────────────────
export const OLLAMA_BASE = "http://localhost:11434";

export async function listOllamaModels() {
  try {
    const r = await fetch(`${OLLAMA_BASE}/api/tags`);
    const d = await r.json();
    return (d.models || []).map((m) => m.name);
  } catch {
    return [];
  }
}

/**
 * Stream a chat completion from a local Ollama model.
 * @param {{model:string, messages:Array<{role:string,content:string}>, onToken:(t:string)=>void, signal?:AbortSignal}} opts
 * @returns {Promise<string>} full text
 */
export async function ollamaChat({ model, messages, onToken, signal }) {
  const r = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true, options: { temperature: 0.6 } }),
    signal,
  });
  if (!r.ok || !r.body) throw new Error(`Ollama responded ${r.status}`);

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const json = JSON.parse(trimmed);
        const tok = json.message?.content || "";
        if (tok) { full += tok; onToken?.(tok); }
      } catch { /* skip partial */ }
    }
  }
  return full;
}
