"use client";

import { motion } from "framer-motion";
import { Copy, Download, Linkedin, Mail } from "lucide-react";
import { useState } from "react";
import { person } from "@/lib/content/profile";
import { Button } from "@/components/ui/button";

export function ContactSection() {
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(person.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — the visible email text is still selectable
    }
  };

  return (
    <section id="contact" className="section-shell">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
        className="glass-panel-strong relative overflow-hidden rounded-[2.5rem] px-6 py-16 text-center sm:px-16"
      >
        <div className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-aurora-violet/25 blur-[100px]" />

        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-aurora-cyan">
          Let&apos;s talk
        </span>
        <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-semibold text-white sm:text-4xl md:text-5xl">
          Looking for a customer experience professional who adapts fast?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-mist">
          Open to customer experience, guest service, and support-operations roles.
          Reach out on email or LinkedIn — I reply quickly.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button onClick={copyEmail}>
            {copied ? "Copied!" : <><Mail className="h-4 w-4" /> {person.email}</>}
            {!copied && <Copy className="h-3.5 w-3.5 opacity-70" />}
          </Button>
          <Button href={person.linkedin} external variant="outline">
            <Linkedin className="h-4 w-4" />
            LinkedIn
          </Button>
          <Button href={person.cvUrl} external variant="outline">
            <Download className="h-4 w-4" />
            Download CV
          </Button>
        </div>
      </motion.div>

      <footer className="mt-12 flex flex-col items-center gap-2 text-center text-xs text-mist/70">
        <p>{person.location}</p>
        <p>&copy; {new Date().getFullYear()} {person.name}. Built with intent.</p>
      </footer>
    </section>
  );
}
