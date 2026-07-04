"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const sections = [
  { id: "hero", label: "Home" },
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "skills", label: "Skills" },
  { id: "achievements", label: "Achievements" },
  { id: "credentials", label: "Credentials" },
  { id: "contact", label: "Contact" },
];

export function SectionNav() {
  const [active, setActive] = useState("hero");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <motion.nav
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 1.4 }}
      className="fixed right-4 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-end gap-3 lg:flex"
      aria-label="Section navigation"
    >
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          data-cursor-hover
          className="group flex items-center gap-3"
        >
          <span
            className={cn(
              "translate-x-2 whitespace-nowrap rounded-full bg-surface/90 px-3 py-1 text-xs text-mist opacity-0 shadow-lg transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100",
              active === section.id && "text-white"
            )}
          >
            {section.label}
          </span>
          <span
            className={cn(
              "h-2 w-2 rounded-full border border-white/40 transition-all",
              active === section.id
                ? "scale-125 bg-aurora-cyan"
                : "bg-transparent group-hover:bg-white/40"
            )}
          />
        </a>
      ))}
    </motion.nav>
  );
}
