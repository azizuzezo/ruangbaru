"use client";

import { motion } from "framer-motion";
import { GraduationCap, Languages, ShieldCheck } from "lucide-react";
import { certifications, education, languages } from "@/lib/content/profile";
import { SectionHeading } from "@/components/ui/section-heading";

export function CertificationsSection() {
  return (
    <section id="credentials" className="section-shell">
      <SectionHeading
        eyebrow="Credentials"
        title="Education, certifications & languages"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="glass-panel rounded-3xl p-6 lg:col-span-2"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="glass-panel-strong flex h-10 w-10 items-center justify-center rounded-xl text-aurora-cyan">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-semibold text-white">Certifications</h3>
          </div>
          <ul className="space-y-3">
            {certifications.map((cert) => (
              <li key={cert} className="flex gap-3 text-sm text-mist">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aurora-cyan" />
                {cert}
              </li>
            ))}
          </ul>
        </motion.div>

        <div className="flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="glass-panel rounded-3xl p-6"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="glass-panel-strong flex h-10 w-10 items-center justify-center rounded-xl text-aurora-rose">
                <GraduationCap className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold text-white">Education</h3>
            </div>
            <p className="text-sm font-medium text-fog">{education.school}</p>
            <p className="mt-1 text-sm text-mist">{education.degree}</p>
            <p className="mt-1 text-xs text-mist/70">{education.period}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="glass-panel rounded-3xl p-6"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="glass-panel-strong flex h-10 w-10 items-center justify-center rounded-xl text-aurora-emerald">
                <Languages className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold text-white">Languages</h3>
            </div>
            <ul className="space-y-2">
              {languages.map((lang) => (
                <li key={lang.name} className="flex items-center justify-between text-sm">
                  <span className="text-fog">{lang.name}</span>
                  <span className="text-xs text-mist">{lang.level}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
