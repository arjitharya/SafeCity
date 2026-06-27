// ─────────────────────────────────────────────────────────────────────────────
// Garbage / waste collection schedule for CityOS Japan
// Japanese municipalities collect different waste types on fixed weekdays.
// We model an editable weekly schedule (persisted locally) and derive
// "today" / "next collection" + reminder logic from it.
// ─────────────────────────────────────────────────────────────────────────────

import { Flame, Hammer, Package, Milk, CupSoda, Newspaper, Recycle, Sofa } from "lucide-react";

// Category metadata. `icon` is a lucide-react component reference.
export const WASTE_CATEGORIES = {
  burnable:    { id: "burnable",    label: "Burnable",        ja: "燃やすゴミ",     color: "#dc2626", icon: Flame,     note: "Kitchen scraps, food waste, small paper, diapers. Use designated burnable bags." },
  nonburnable: { id: "nonburnable", label: "Non-Burnable",    ja: "燃やさないゴミ", color: "#64748b", icon: Hammer,    note: "Glass, ceramics, small metal, light bulbs, batteries (bagged separately)." },
  plastic:     { id: "plastic",     label: "Plastic Packaging", ja: "プラ容器包装", color: "#0d9488", icon: Package,   note: "Rinsed plastic wrappers, trays, containers marked プラ." },
  pet:         { id: "pet",         label: "PET Bottles",     ja: "ペットボトル",   color: "#0ea5e9", icon: Milk,      note: "Remove caps & labels, rinse, crush. Caps go with plastic." },
  cansbottles: { id: "cansbottles", label: "Cans & Bottles",  ja: "缶・ビン",       color: "#d97706", icon: CupSoda,   note: "Rinse aluminium/steel cans and glass bottles. Separate by color where required." },
  paper:       { id: "paper",       label: "Paper & Cardboard", ja: "古紙・段ボール", color: "#a16207", icon: Newspaper, note: "Flatten cardboard, bundle newspapers and magazines with string." },
  recyclable:  { id: "recyclable",  label: "Recyclables",     ja: "資源ゴミ",       color: "#7c3aed", icon: Recycle,   note: "Mixed recyclables — check your ward leaflet for specifics." },
  oversized:   { id: "oversized",   label: "Oversized (Sodai)", ja: "粗大ゴミ",     color: "#be123c", icon: Sofa,      note: "Furniture & appliances — requires advance booking and a paid sticker." },
};

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];

// Default weekly pattern (index 0 = Sunday). Realistic Japanese ward cadence.
export const DEFAULT_SCHEDULE = {
  0: [],
  1: ["burnable"],
  2: ["plastic"],
  3: ["cansbottles", "pet"],
  4: ["burnable"],
  5: ["paper"],
  6: ["recyclable"],
};

const STORAGE_KEY = "cityos-garbage-schedule";

export function loadSchedule() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SCHEDULE };
    const parsed = JSON.parse(raw);
    // sanity: ensure all 7 days present
    const out = { ...DEFAULT_SCHEDULE, ...parsed };
    return out;
  } catch {
    return { ...DEFAULT_SCHEDULE };
  }
}

export function saveSchedule(schedule) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule)); } catch { /* ignore */ }
}

export function categoriesFor(schedule, date = new Date()) {
  const ids = schedule[date.getDay()] || [];
  return ids.map((id) => WASTE_CATEGORIES[id]).filter(Boolean);
}

/** Next day (within 7) that has any collection. Returns {date, daysUntil, categories} or null. */
export function nextCollection(schedule, from = new Date()) {
  for (let i = 1; i <= 7; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    const cats = categoriesFor(schedule, d);
    if (cats.length) return { date: d, daysUntil: i, categories: cats };
  }
  return null;
}

/** The coming 7 days with their collections. */
export function upcomingWeek(schedule, from = new Date()) {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    out.push({ date: d, isToday: i === 0, categories: categoriesFor(schedule, d) });
  }
  return out;
}
