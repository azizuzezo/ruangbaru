"use client";

import { motion } from "framer-motion";
import { about } from "@/lib/content/profile";
import { SectionHeading } from "@/components/ui/section-heading";

const industryAccent: Record<string, string> = {
  Transportation: "from-aurora-cyan/60 to-transparent",
  Hospitality: "from-aurora-rose/60 to-transparent",
  Fintech: "from-aurora-violet/60 to-transparent",
};

export function AboutJourney() {
  return (
    <section id="about" className="section-shell">
      <SectionHeading
        eyebrow="About"
        title="A career built on serving people well"
        description="From railway platforms to residential lobbies to fintech help desks — the throughline is always the same: solve it, calmly and completely."
      />

      <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-5">
          {about.paragraphs.map((paragraph, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="text-base leading-relaxed text-mist sm:text-lg"
            >
              {paragraph}
            </motion.p>
          ))}
        </div>

        <div className="relative flex flex-col gap-6">
          <div className="absolute bottom-4 left-4 top-4 hidden w-px bg-gradient-to-b from-aurora-violet/40 via-aurora-cyan/40 to-aurora-rose/40 sm:block" />
          {about.arc.map((stage, i) => (
            <motion.div
              key={stage.industry}
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="glass-panel relative rounded-2xl p-6 sm:ml-10"
            >
              <div
                className={`absolute -left-10 top-6 hidden h-3 w-3 rounded-full bg-gradient-to-br sm:block ${
                  industryAccent[stage.industry] ?? "from-white/60 to-transparent"
                }`}
              />
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-aurora-cyan">
                {stage.years}
              </span>
              <h3 className="mt-2 font-display text-xl font-semibold text-white">
                {stage.industry}
              </h3>
              <p className="mt-2 text-sm text-mist">{stage.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
