"use client";

import { motion } from "framer-motion";
import { ArrowDown, Download, Linkedin, Mail } from "lucide-react";
import { person, stats } from "@/lib/content/profile";
import { Button } from "@/components/ui/button";
import { StatCounter } from "@/components/ui/stat-counter";
import { MonogramAvatar } from "@/components/hero/monogram-avatar";
import { RoleRotator } from "@/components/hero/role-rotator";

export function Hero() {
  return (
    <section
      id="hero"
      className="section-shell flex min-h-[100svh] flex-col items-center justify-center text-center"
    >
      <MonogramAvatar />

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4 }}
        className="mt-8 text-xs font-semibold uppercase tracking-[0.35em] text-aurora-cyan"
      >
        {person.location}
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="mt-4 font-display text-4xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl"
      >
        {person.name}
      </motion.h1>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="mt-5"
      >
        <RoleRotator />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 1 }}
        className="mt-10 flex flex-wrap items-center justify-center gap-4"
      >
        <Button href="#experience">
          Explore the Journey
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button href={person.cvUrl} external variant="outline">
          <Download className="h-4 w-4" />
          Download CV
        </Button>
        <Button href={`mailto:${person.email}`} variant="ghost" size="sm">
          <Mail className="h-4 w-4" />
        </Button>
        <Button href={person.linkedin} external variant="ghost" size="sm">
          <Linkedin className="h-4 w-4" />
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 1.2 }}
        className="glass-panel mt-16 grid w-full max-w-3xl grid-cols-2 gap-6 rounded-3xl px-6 py-8 sm:grid-cols-4"
      >
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-1">
            <span className="font-display text-3xl font-semibold text-white sm:text-4xl">
              <StatCounter value={stat.value} suffix={stat.suffix} />
            </span>
            <span className="text-center text-xs text-mist sm:text-sm">{stat.label}</span>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
