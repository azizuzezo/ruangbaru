"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { roleRotator } from "@/lib/content/profile";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

export function RoleRotator() {
  const [index, setIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % roleRotator.length);
    }, 2600);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  return (
    <div className="relative flex h-9 items-center justify-center overflow-hidden sm:h-10">
      <AnimatePresence mode="wait">
        <motion.span
          key={roleRotator[index]}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -24, opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className="absolute font-display text-lg font-medium text-aurora-cyan sm:text-xl"
        >
          {roleRotator[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
