"use client";

import { motion } from "framer-motion";
import {
  Award,
  Building2,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Rocket,
  ShoppingBag,
  TrainFront,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { ExperienceEntry, Industry } from "@/lib/content/profile";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const industryIcon: Record<Industry, React.ComponentType<{ className?: string }>> = {
  retail: ShoppingBag,
  administration: ClipboardList,
  transportation: TrainFront,
  hospitality: Building2,
  fintech: CreditCard,
  venture: Rocket,
};

const industryLabel: Record<Industry, string> = {
  retail: "Retail",
  administration: "Administration",
  transportation: "Transportation",
  hospitality: "Hospitality",
  fintech: "Fintech",
  venture: "Venture",
};

export function ExperienceCard({
  entry,
  index,
}: {
  entry: ExperienceEntry;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const Icon = industryIcon[entry.industry];

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay: (index % 4) * 0.08 }}
      className={cn(
        "glass-panel relative rounded-3xl p-6 transition-colors hover:border-white/25 sm:p-8",
        entry.milestone && "border-aurora-gold/40 shadow-[0_0_60px_-15px_var(--color-aurora-gold)]"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="glass-panel-strong flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-aurora-cyan">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-white sm:text-xl">
              {entry.role}
            </h3>
            <p className="text-sm text-mist">{entry.company}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <Badge>{industryLabel[entry.industry]}</Badge>
          <span className="text-xs text-mist">{entry.period}</span>
          <span className="text-xs text-mist/70">{entry.duration}</span>
        </div>
      </div>

      {entry.images && entry.images.length > 0 && (
        <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
          {entry.images.map((src) => (
            <div
              key={src}
              className="relative h-28 w-40 shrink-0 overflow-hidden rounded-xl border border-white/10"
            >
              <Image
                src={src}
                alt={`${entry.company} — ${entry.role}`}
                fill
                sizes="160px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {entry.milestone && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-aurora-gold/30 bg-aurora-gold/10 p-4">
          <Award className="mt-0.5 h-5 w-5 shrink-0 text-aurora-gold" />
          <p className="text-sm text-fog">{entry.milestone}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-cursor-hover
        className="mt-5 flex items-center gap-2 text-sm font-medium text-aurora-cyan transition-colors hover:text-white"
        aria-expanded={open}
      >
        {open ? "Hide responsibilities" : "Show responsibilities"}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>

      <motion.ul
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className="mt-3 space-y-2 overflow-hidden"
      >
        {entry.bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2 text-sm text-mist">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-aurora-cyan" />
            {bullet}
          </li>
        ))}
      </motion.ul>
    </motion.div>
  );
}
