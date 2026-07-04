"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { person } from "@/lib/content/profile";

export function MonogramAvatar() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
      className="relative mx-auto flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64"
    >
      <div className="animate-spin-slow absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,_var(--color-aurora-violet),_var(--color-aurora-cyan),_var(--color-aurora-rose),_var(--color-aurora-gold),_var(--color-aurora-violet))] opacity-70 blur-md" />
      <div className="glass-panel-strong animate-float absolute inset-[6px] rounded-full" />
      <div className="relative flex h-[calc(100%-24px)] w-[calc(100%-24px)] items-center justify-center overflow-hidden rounded-full bg-surface">
        {person.hasPhoto ? (
          <Image
            src={person.photoUrl}
            alt={person.name}
            fill
            sizes="256px"
            className="object-cover"
            priority
          />
        ) : (
          <span className="font-display text-6xl font-semibold text-gradient-aurora">
            {person.initials}
          </span>
        )}
      </div>
    </motion.div>
  );
}
