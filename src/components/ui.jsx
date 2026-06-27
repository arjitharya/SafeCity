// Shared, theme-aware UI primitives built on Tailwind + framer-motion + lucide.
import { motion } from "framer-motion";
import {
  Sun, CloudSun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, CloudDrizzle,
} from "lucide-react";

export const cx = (...a) => a.filter(Boolean).join(" ");

// ── Animated card surface ─────────────────────────────────────────────────────
export function Panel({ children, className = "", accent = false, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cx(
        "relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm",
        accent ? "border-blue-300 ring-2 ring-blue-500/10" : "border-gray-200",
        className
      )}
    >
      {accent && (
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
      )}
      {children}
    </motion.div>
  );
}

export function Label({ children, className = "" }) {
  return (
    <p className={cx("mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400", className)}>
      {children}
    </p>
  );
}

export function SectionHeader({ icon: IconC, title, subtitle, color = "#1a56db" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mb-1 flex items-center gap-3"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${color}18`, color }}
      >
        {IconC && <IconC size={20} strokeWidth={2.2} />}
      </span>
      <div>
        <h2 className="text-lg font-extrabold leading-tight text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </motion.div>
  );
}

const BADGE = {
  info: "bg-blue-100 text-blue-800",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
  neutral: "bg-gray-100 text-gray-600",
};

export function Badge({ type = "info", children, className = "" }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", BADGE[type] || BADGE.info, className)}>
      {children}
    </span>
  );
}

export function MetricBar({ label, value, unit = "%", color = "#1a56db", warn = 75, danger = 90, showLabel = true }) {
  const pct = unit === "%" ? value : Math.min(100, value);
  const barColor = value > danger ? "#dc2626" : value > warn ? "#d97706" : color;
  return (
    <div className="grid gap-1">
      {showLabel && (
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">{label}</span>
          <span className="font-bold" style={{ color: barColor }}>{value}{unit}</span>
        </div>
      )}
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <motion.div
          className="h-full rounded-full"
          style={{ background: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export function ScoreRing({ score, size = 100, color = "#1a56db", label = "HEALTH" }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="9" className="dark:opacity-30" />
        <motion.circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-xl font-extrabold leading-none" style={{ color }}>{score}</div>
        <div className="text-[9px] font-bold tracking-wide text-gray-400">{label}</div>
      </div>
    </div>
  );
}

export function KpiCard({ icon: IconC, label, value, sub, color = "#1a56db", delay = 0 }) {
  return (
    <Panel delay={delay}>
      <div className="mb-2 flex items-start justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ background: `${color}18`, color }}>
          {IconC && <IconC size={18} />}
        </span>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 text-2xl font-extrabold leading-none text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </Panel>
  );
}

export function Spinner({ size = 16, className = "" }) {
  return (
    <span
      className={cx("inline-block animate-spin rounded-full border-2 border-current border-t-transparent", className)}
      style={{ width: size, height: size }}
    />
  );
}

// External-link row used across resource lists.
export function LinkRow({ icon: IconC, title, desc, url, color = "#1a56db" }) {
  return (
    <a
      href={url} target="_blank" rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-slate-50 p-3 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `${color}14`, color }}>
        {IconC && <IconC size={16} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-blue-700">{title}</p>
        {desc && <p className="truncate text-xs text-gray-500">{desc}</p>}
      </div>
      <span className="text-gray-400 transition group-hover:translate-x-0.5">›</span>
    </a>
  );
}

// ── Weather icon (lucide, code-driven) ────────────────────────────────────────
export function WeatherIcon({ code, size = 24, color = "#1a56db" }) {
  const p = { size, color, strokeWidth: 2 };
  if (code === 0 || code === 1) return <Sun {...p} />;
  if (code === 2) return <CloudSun {...p} />;
  if (code === 3) return <Cloud {...p} />;
  if (code === 45 || code === 48) return <CloudFog {...p} />;
  if (code >= 51 && code <= 55) return <CloudDrizzle {...p} />;
  if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82)) return <CloudRain {...p} />;
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return <CloudSnow {...p} />;
  if (code >= 95) return <CloudLightning {...p} />;
  return <Cloud {...p} />;
}
