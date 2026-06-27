// ─────────────────────────────────────────────────────────────────────────────
// Global emergency numbers, keyed by ISO-3166 alpha-2 country code (lowercase).
// SafeCity reverse-geocodes the user's GPS to a country and shows the correct
// local numbers automatically — 911 in the US, 112 across the EU, 110/119 in
// Japan, and so on. Fully offline; no API or AI needed for this critical data.
// ─────────────────────────────────────────────────────────────────────────────

// Each entry: { name, flag, police, ambulance, fire, general }
// `general` is the single all-services number (e.g. 911 / 112) where one exists.
const DB = {
  us: { name: "United States", flag: "🇺🇸", general: "911" },
  ca: { name: "Canada", flag: "🇨🇦", general: "911" },
  mx: { name: "Mexico", flag: "🇲🇽", general: "911" },
  jp: { name: "Japan", flag: "🇯🇵", police: "110", ambulance: "119", fire: "119", general: "" },
  gb: { name: "United Kingdom", flag: "🇬🇧", general: "999", alt: "112" },
  ie: { name: "Ireland", flag: "🇮🇪", general: "112", alt: "999" },
  au: { name: "Australia", flag: "🇦🇺", general: "000", alt: "112" },
  nz: { name: "New Zealand", flag: "🇳🇿", general: "111" },
  in: { name: "India", flag: "🇮🇳", general: "112", police: "100", ambulance: "102", fire: "101" },
  cn: { name: "China", flag: "🇨🇳", police: "110", ambulance: "120", fire: "119" },
  kr: { name: "South Korea", flag: "🇰🇷", police: "112", ambulance: "119", fire: "119" },
  sg: { name: "Singapore", flag: "🇸🇬", police: "999", ambulance: "995", fire: "995" },
  hk: { name: "Hong Kong", flag: "🇭🇰", general: "999", alt: "112" },
  tw: { name: "Taiwan", flag: "🇹🇼", police: "110", ambulance: "119", fire: "119" },
  th: { name: "Thailand", flag: "🇹🇭", general: "191", ambulance: "1669", police: "191" },
  ph: { name: "Philippines", flag: "🇵🇭", general: "911" },
  id: { name: "Indonesia", flag: "🇮🇩", police: "110", ambulance: "118", fire: "113", general: "112" },
  my: { name: "Malaysia", flag: "🇲🇾", general: "999", alt: "112" },
  vn: { name: "Vietnam", flag: "🇻🇳", police: "113", ambulance: "115", fire: "114" },
  de: { name: "Germany", flag: "🇩🇪", general: "112", police: "110" },
  fr: { name: "France", flag: "🇫🇷", general: "112", police: "17", ambulance: "15", fire: "18" },
  es: { name: "Spain", flag: "🇪🇸", general: "112" },
  it: { name: "Italy", flag: "🇮🇹", general: "112" },
  nl: { name: "Netherlands", flag: "🇳🇱", general: "112" },
  be: { name: "Belgium", flag: "🇧🇪", general: "112" },
  pt: { name: "Portugal", flag: "🇵🇹", general: "112" },
  ch: { name: "Switzerland", flag: "🇨🇭", general: "112", police: "117", ambulance: "144", fire: "118" },
  at: { name: "Austria", flag: "🇦🇹", general: "112" },
  se: { name: "Sweden", flag: "🇸🇪", general: "112" },
  no: { name: "Norway", flag: "🇳🇴", general: "112", police: "112", ambulance: "113", fire: "110" },
  dk: { name: "Denmark", flag: "🇩🇰", general: "112" },
  fi: { name: "Finland", flag: "🇫🇮", general: "112" },
  pl: { name: "Poland", flag: "🇵🇱", general: "112" },
  cz: { name: "Czechia", flag: "🇨🇿", general: "112" },
  gr: { name: "Greece", flag: "🇬🇷", general: "112" },
  ru: { name: "Russia", flag: "🇷🇺", general: "112", police: "102", ambulance: "103", fire: "101" },
  ua: { name: "Ukraine", flag: "🇺🇦", general: "112" },
  tr: { name: "Türkiye", flag: "🇹🇷", general: "112" },
  br: { name: "Brazil", flag: "🇧🇷", police: "190", ambulance: "192", fire: "193" },
  ar: { name: "Argentina", flag: "🇦🇷", general: "911", ambulance: "107", fire: "100" },
  cl: { name: "Chile", flag: "🇨🇱", police: "133", ambulance: "131", fire: "132" },
  co: { name: "Colombia", flag: "🇨🇴", general: "123" },
  za: { name: "South Africa", flag: "🇿🇦", general: "112", police: "10111", ambulance: "10177" },
  ng: { name: "Nigeria", flag: "🇳🇬", general: "112", alt: "199" },
  ke: { name: "Kenya", flag: "🇰🇪", general: "999", alt: "112" },
  eg: { name: "Egypt", flag: "🇪🇬", police: "122", ambulance: "123", fire: "180" },
  ae: { name: "UAE", flag: "🇦🇪", police: "999", ambulance: "998", fire: "997" },
  sa: { name: "Saudi Arabia", flag: "🇸🇦", police: "999", ambulance: "997", fire: "998", general: "911" },
  il: { name: "Israel", flag: "🇮🇱", police: "100", ambulance: "101", fire: "102" },
};

const SERVICE_META = {
  general:   { label: "Emergency",  color: "#dc2626" },
  police:    { label: "Police",     color: "#1d4ed8" },
  ambulance: { label: "Ambulance",  color: "#dc2626" },
  fire:      { label: "Fire",       color: "#ea580c" },
};

const FALLBACK = { name: "International", flag: "🌐", general: "112", note: "112 reaches emergency services across the EU and many countries worldwide. In North America, dial 911." };

/** Country record for a given ISO-2 code (lowercase). */
export function countryInfo(code) {
  return DB[(code || "").toLowerCase()] || FALLBACK;
}

/**
 * Normalised list of distinct emergency services for a country, ready to render.
 * Collapses duplicate numbers (e.g. one "911" instead of three).
 * Returns [{ key, label, number, color, sub }]
 */
export function emergencyServices(code) {
  const c = countryInfo(code);
  const out = [];
  const seen = new Set();

  const push = (key, number, sub) => {
    if (!number || seen.has(number)) return;
    seen.add(number);
    out.push({ key, number, sub, label: SERVICE_META[key]?.label || "Emergency", color: SERVICE_META[key]?.color || "#dc2626" });
  };

  if (c.general) push("general", c.general, "All services");
  push("police", c.police, "Police");
  push("ambulance", c.ambulance, "Medical");
  push("fire", c.fire, "Fire / rescue");
  if (c.alt) push("general", c.alt, "Also works");

  // Absolute fallback so the screen is never empty.
  if (!out.length) push("general", "112", "International");
  return out;
}

/** The single best number to dial in a panic (the all-services line, else police). */
export function primaryNumber(code) {
  const s = emergencyServices(code);
  return s[0]?.number || "112";
}
