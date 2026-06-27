// Shared civic constants. Icons are lucide-react component references.
import {
  Construction, Droplets, Trash2, Trees, Lightbulb, Volume2, Waves,
  TrafficCone, Building2, FileText,
} from "lucide-react";

export const EMERGENCY = {
  police:   { number: "110", label: "Police",            desc: "110 — Keisatsu",       color: "#1d4ed8" },
  fire:     { number: "119", label: "Fire / Ambulance",  desc: "119 — Shobo / Kyukyu", color: "#dc2626" },
  coast:    { number: "118", label: "Coast Guard",       desc: "118 — Kaijo Hoan",     color: "#0d9488" },
  disaster: { number: "171", label: "Disaster Voicemail", desc: "171 — Saigai Dengon", color: "#7c3aed" },
};

export const ISSUE_CATEGORIES = [
  { id: "road",     label: "Road & Pavement",        icon: Construction, dept: "道路課 (Road Division)" },
  { id: "water",    label: "Water & Sewage",         icon: Droplets,     dept: "上下水道課 (Water Dept)" },
  { id: "trash",    label: "Waste & Illegal Dumping", icon: Trash2,      dept: "廃棄物対策課 (Waste Mgmt)" },
  { id: "park",     label: "Park & Green Space",     icon: Trees,        dept: "公園課 (Parks Division)" },
  { id: "light",    label: "Street Lighting",        icon: Lightbulb,    dept: "道路維持課 (Road Maintenance)" },
  { id: "noise",    label: "Noise Complaint",        icon: Volume2,      dept: "生活環境課 (Living Environment)" },
  { id: "flood",    label: "Flooding / Drain",       icon: Waves,        dept: "治水課 (Flood Control)" },
  { id: "sign",     label: "Traffic Sign / Signal",  icon: TrafficCone,  dept: "交通対策課 (Traffic Division)" },
  { id: "building", label: "Building / Construction", icon: Building2,    dept: "建築指導課 (Building Control)" },
  { id: "other",    label: "Other",                  icon: FileText,     dept: "市民相談課 (Citizen Services)" },
];
