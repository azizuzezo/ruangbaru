import type { SkillCategory } from "@/lib/content/profile";

export const categoryColor: Record<SkillCategory, string> = {
  "Customer Experience": "#4fd8e0",
  Communication: "#8b7cf6",
  "Fintech Support": "#f5c04a",
  Hospitality: "#f68b9d",
  "Digital & AI": "#34d1a0",
};

export const categoryClass: Record<SkillCategory, string> = {
  "Customer Experience": "border-aurora-cyan/40 text-aurora-cyan",
  Communication: "border-aurora-violet/40 text-aurora-violet",
  "Fintech Support": "border-aurora-gold/40 text-aurora-gold",
  Hospitality: "border-aurora-rose/40 text-aurora-rose",
  "Digital & AI": "border-aurora-emerald/40 text-aurora-emerald",
};
