import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Phone, User, Check, Send, MapPin, Bell, ShieldCheck, AlertTriangle, Sparkles,
} from "lucide-react";
import { ISSUE_CATEGORIES } from "../lib/constants";
import { emergencyServices, countryInfo } from "../lib/emergency";
import { Spinner } from "./ui";

// ── Shared modal shell ────────────────────────────────────────────────────────
function Shell({ children, onClose, max = 420 }) {
  return (
    <motion.div
      className="fixed inset-0 z-[9990] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl"
        style={{ maxWidth: max }}
        initial={{ scale: 0.94, y: 18, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 10, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function CloseBtn({ onClose }) {
  return (
    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition hover:bg-gray-200">
      <X size={16} />
    </button>
  );
}

// ── Permission onboarding ─────────────────────────────────────────────────────
export function OnboardingModal({ onRequestLocation, onRequestNotifications, onClose, locationState, notifState, loading }) {
  return (
    <Shell onClose={onClose} max={440}>
      <div className="mb-5 flex flex-col items-center text-center">
        <motion.div
          className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-teal-500 text-white shadow-lg"
          animate={{ rotate: [0, -6, 6, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }}
        >
          <Sparkles size={30} />
        </motion.div>
        <h2 className="text-xl font-extrabold text-gray-900">Welcome to SafeCity</h2>
        <p className="mt-1 text-sm text-gray-500">Your personal safety companion in Japan. Grant two quick permissions to unlock live, location-aware emergency help.</p>
      </div>

      <div className="grid gap-3">
        <PermCard
          icon={MapPin} color="#1a56db" title="Location access"
          desc="Real-time weather, air quality, local news & nearest services for exactly where you are."
          state={locationState} loading={loading} onClick={onRequestLocation}
          cta="Enable location"
        />
        <PermCard
          icon={Bell} color="#7c3aed" title="Notifications"
          desc="Garbage collection reminders the night before, plus disaster & weather alerts."
          state={notifState} onClick={onRequestNotifications}
          cta="Enable alerts"
        />
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-gray-500">
        <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-600" />
        <span>Everything runs in your browser. Location and AI requests stay on your device — nothing is sent to a third-party server.</span>
      </div>

      <button onClick={onClose} className="mt-4 w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-500 transition hover:bg-slate-50">
        Continue to dashboard
      </button>
    </Shell>
  );
}

function PermCard({ icon: IconC, color, title, desc, state, loading, onClick, cta }) {
  const granted = state === "granted";
  const denied = state === "denied";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-slate-50 p-3.5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}18`, color }}>
        <IconC size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-gray-900">{title}</p>
        <p className="text-xs leading-snug text-gray-500">{desc}</p>
      </div>
      {granted ? (
        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800"><Check size={12} /> On</span>
      ) : (
        <button
          onClick={onClick} disabled={loading || denied}
          className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
          style={{ background: denied ? "#94a3b8" : color }}
        >
          {loading ? <Spinner size={13} /> : denied ? "Blocked" : cta}
        </button>
      )}
    </div>
  );
}

// ── Emergency (auto-localised to the user's country) ──────────────────────────
export function EmergencyModal({ country, onClose }) {
  const [calling, setCalling] = useState(null);
  const info = countryInfo(country);
  const services = emergencyServices(country);
  const call = (num, label) => { setCalling(label); setTimeout(() => window.open(`tel:${num}`, "_self"), 300); };
  return (
    <Shell onClose={onClose} max={420}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600"><Phone size={20} /></span>
          <div>
            <p className="text-base font-extrabold text-gray-900">Emergency Services</p>
            <p className="text-xs text-gray-500">{info.flag} {info.name}{country ? "" : " · default"}</p>
          </div>
        </div>
        <CloseBtn onClose={onClose} />
      </div>
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
        <AlertTriangle size={14} className="shrink-0" /> Only call for genuine emergencies. False calls are a crime in most countries.
      </div>
      <div className="grid gap-2.5">
        {services.map((e) => (
          <button
            key={e.number + e.key} onClick={() => call(e.number, e.label)}
            className={`flex items-center gap-3.5 rounded-2xl border-2 p-3.5 text-left transition ${calling === e.label ? "border-red-500 bg-red-50" : "border-gray-200 bg-slate-50 hover:border-gray-300"}`}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-black" style={{ background: `${e.color}14`, color: e.color }}>{e.number}</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">{e.label}</p>
              <p className="text-xs text-gray-500">{e.sub}</p>
            </div>
            <Phone size={16} className="text-gray-400" />
          </button>
        ))}
      </div>
      {info.note && <p className="mt-3 text-[11px] text-gray-400">{info.note}</p>}
    </Shell>
  );
}

// ── Account ───────────────────────────────────────────────────────────────────
export function AccountModal({ account, onSave, onClose }) {
  const [form, setForm] = useState(account || { name: "", email: "", phone: "", bloodType: "", prefNotifs: true });
  const fields = [
    { key: "name", label: "Full Name", ph: "Your name", type: "text" },
    { key: "phone", label: "Your Phone Number", ph: "For emergency callbacks", type: "tel" },
    { key: "email", label: "Email Address", ph: "you@example.com", type: "email" },
    { key: "bloodType", label: "Blood Type (optional)", ph: "e.g. O+", type: "text" },
  ];
  return (
    <Shell onClose={onClose} max={440}>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><User size={20} /></span>
          <p className="text-base font-extrabold text-gray-900">{account ? "My Account" : "Create Account"}</p>
        </div>
        <CloseBtn onClose={onClose} />
      </div>
      <div className="grid gap-3.5">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500">{f.label}</label>
            <input
              type={f.type} value={form[f.key]} placeholder={f.ph}
              onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
              className="w-full rounded-xl border-[1.5px] border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        ))}
        <label className="flex items-center gap-2.5 text-sm text-gray-600">
          <input type="checkbox" checked={form.prefNotifs} onChange={(e) => setForm((p) => ({ ...p, prefNotifs: e.target.checked }))} className="h-4 w-4 accent-blue-600" />
          Receive local safety & disaster alerts
        </label>
      </div>
      <div className="mt-5 flex gap-2.5">
        <button onClick={onClose} className="flex-1 rounded-xl border-[1.5px] border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-500 transition hover:bg-slate-50">Cancel</button>
        <button onClick={() => { onSave(form); onClose(); }} className="flex-[2] rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700">
          {account ? "Save Changes" : "Create Account"}
        </button>
      </div>
    </Shell>
  );
}

// ── Municipal issue report ────────────────────────────────────────────────────
export function ReportForm({ location, account, onClose, onSubmit }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    category: "", title: "", description: "", address: location?.district || "",
    urgency: "medium", name: account?.name || "", contact: account?.email || "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [refNo, setRefNo] = useState("");
  const dept = ISSUE_CATEGORIES.find((c) => c.id === form.category);

  const doSubmit = () => {
    const ref = `MR-${Date.now().toString().slice(-6)}`;
    setRefNo(ref);
    setSubmitted(true);
    onSubmit?.({ ...form, refNo: ref, submittedAt: new Date().toISOString() });
  };

  if (submitted) return (
    <Shell onClose={onClose} max={400}>
      <div className="text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Check size={32} />
        </motion.div>
        <p className="mb-1.5 text-lg font-extrabold text-gray-900">Report Submitted</p>
        <p className="mb-3 text-sm text-gray-500">Forwarded to {dept?.dept || "City Hall"}</p>
        <div className="mb-5 rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-semibold text-gray-400">REFERENCE NUMBER</p>
          <p className="text-xl font-extrabold text-blue-700">{refNo}</p>
        </div>
        <button onClick={onClose} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700">Done</button>
      </div>
    </Shell>
  );

  return (
    <Shell onClose={onClose} max={460}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-base font-extrabold text-gray-900">Report Municipal Issue</p>
          <p className="text-xs text-gray-500">Step {step} of 3</p>
        </div>
        <CloseBtn onClose={onClose} />
      </div>
      <div className="mb-5 flex gap-1.5">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-1 flex-1 rounded-full transition-colors" style={{ background: n <= step ? "#1a56db" : "#e2e8f0" }} />
        ))}
      </div>

      {step === 1 && (
        <div className="grid gap-3">
          <p className="text-sm font-semibold text-gray-600">What type of issue are you reporting?</p>
          <div className="grid grid-cols-2 gap-2">
            {ISSUE_CATEGORIES.map((c) => {
              const Ic = c.icon; const on = form.category === c.id;
              return (
                <button key={c.id} onClick={() => setForm((p) => ({ ...p, category: c.id }))}
                  className={`rounded-xl border-2 p-3 text-left transition ${on ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-slate-50 hover:border-gray-300"}`}>
                  <Ic size={18} className={on ? "text-blue-700" : "text-gray-500"} />
                  <p className={`mt-1.5 text-xs font-bold ${on ? "text-blue-700" : "text-gray-900"}`}>{c.label}</p>
                </button>
              );
            })}
          </div>
          <button disabled={!form.category} onClick={() => setStep(2)}
            className="mt-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition enabled:hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400">Next</button>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-3.5">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
            Forwarding to: <strong>{dept?.dept}</strong>
          </div>
          {[
            { key: "title", label: "Issue Title", ph: "e.g. Pothole near the station", multi: false },
            { key: "description", label: "Detailed Description", ph: "Location, severity, relevant details...", multi: true },
            { key: "address", label: "Exact Address / Location", ph: location?.displayName?.slice(0, 50) || "Street or landmark", multi: false },
          ].map((f) => (
            <div key={f.key}>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500">{f.label}</label>
              {f.multi ? (
                <textarea rows={4} value={form[f.key]} placeholder={f.ph} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full resize-y rounded-xl border-[1.5px] border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              ) : (
                <input type="text" value={form[f.key]} placeholder={f.ph} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full rounded-xl border-[1.5px] border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              )}
            </div>
          ))}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500">Urgency Level</label>
            <div className="flex gap-2">
              {[{ v: "low", l: "Low", c: "#16a34a" }, { v: "medium", l: "Medium", c: "#d97706" }, { v: "high", l: "High", c: "#dc2626" }].map((u) => (
                <button key={u.v} onClick={() => setForm((p) => ({ ...p, urgency: u.v }))}
                  className="flex-1 rounded-xl border-2 py-2 text-sm font-bold transition"
                  style={{ borderColor: form.urgency === u.v ? u.c : "#e2e8f0", background: form.urgency === u.v ? `${u.c}15` : "transparent", color: form.urgency === u.v ? u.c : "#94a3b8" }}>
                  {u.l}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2.5">
            <button onClick={() => setStep(1)} className="flex-1 rounded-xl border-[1.5px] border-gray-200 bg-white py-3 text-sm font-semibold text-gray-500">Back</button>
            <button disabled={!form.title || !form.description} onClick={() => setStep(3)}
              className="flex-[2] rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition enabled:hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400">Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-3.5">
          <p className="text-sm font-semibold text-gray-600">Your contact details (for follow-up)</p>
          {[
            { key: "name", label: "Full Name", ph: "Your name" },
            { key: "contact", label: "Email or Phone", ph: "For status updates" },
          ].map((f) => (
            <div key={f.key}>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500">{f.label}</label>
              <input type="text" value={form[f.key]} placeholder={f.ph} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                className="w-full rounded-xl border-[1.5px] border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            </div>
          ))}
          <div className="rounded-xl bg-slate-50 p-3.5">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">Summary</p>
            <p className="text-sm font-bold text-gray-900">{form.title}</p>
            <p className="text-xs text-gray-500">{dept?.label} · {form.urgency} urgency</p>
            <p className="mt-1 text-xs text-gray-400">{form.address}</p>
          </div>
          <div className="flex gap-2.5">
            <button onClick={() => setStep(2)} className="flex-1 rounded-xl border-[1.5px] border-gray-200 bg-white py-3 text-sm font-semibold text-gray-500">Back</button>
            <button onClick={doSubmit} className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700">
              <Send size={15} /> Submit Report
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}

// Convenience wrapper so App can mount modals inside one AnimatePresence.
export { AnimatePresence };
