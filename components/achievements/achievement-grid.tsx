"use client";

import { motion } from "framer-motion";
import { achievements } from "@/lib/content/profile";
import { SectionHeading } from "@/components/ui/section-heading";

export function AchievementGrid() {
  return (
    <section id="achievements" className="section-shell">
      <SectionHeading
        eyebrow="Achievements"
        title="Impact, in numbers and moments"
        description="A snapshot of what nine years of showing up for customers actually adds up to."
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {achievements.map((achievement, i) => (
          <motion.div
            key={achievement.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: (i % 3) * 0.1 }}
            className="glass-panel group relative overflow-hidden rounded-3xl p-6 transition-colors hover:border-white/25"
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-aurora-violet/20 blur-2xl transition-opacity group-hover:opacity-80" />
            <span className="font-display text-3xl font-bold text-gradient-aurora">
              {achievement.stat}
            </span>
            {achievement.statLabel && (
              <span className="ml-2 text-xs uppercase tracking-wide text-mist">
                {achievement.statLabel}
              </span>
            )}
            <h3 className="mt-4 font-display text-lg font-semibold text-white">
              {achievement.title}
            </h3>
            <p className="mt-2 text-sm text-mist">{achievement.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
