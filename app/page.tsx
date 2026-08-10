'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState, useRef } from 'react';
import {
  motion, AnimatePresence,
  useScroll, useTransform, useMotionValue, useSpring, useReducedMotion,
} from 'framer-motion';
import {
  ArrowRight, Check,
  FolderKanban, CheckSquare, CalendarDays, StickyNote, Users,
  ChevronDown, MessageCircleWarning,
} from 'lucide-react';
import { HeroPreview } from '@/components/landing/HeroPreview';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { JsonLd } from '@/components/seo/JsonLd';
import { SITE_URL, SITE_NAME } from '@/lib/seo';
import { useT } from '@/lib/i18n/useT';

// Three.js ambient field — client-only, kept out of SSR & initial bundle.
const CollabField = dynamic(
  () => import('@/components/landing/CollabField').then((m) => m.CollabField),
  { ssr: false },
);

const BLUE = '#106CD8';
const TEAL = '#10B29F';
const YELLOW = '#FDB31A';
const E = [0.22, 1, 0.36, 1] as [number, number, number, number];

/* ─── Reveal helper — direction varies by section so the page doesn't
   read as one animation copy-pasted five times ─────────────────── */
function Reveal({
  children, delay = 0, className, dir = 'up',
}: {
  children: React.ReactNode; delay?: number; className?: string;
  dir?: 'up' | 'left' | 'right' | 'scale';
}) {
  const offsets = {
    up: { y: 20, x: 0, scale: 1 },
    left: { y: 0, x: -24, scale: 1 },
    right: { y: 0, x: 24, scale: 1 },
    scale: { y: 0, x: 0, scale: 0.96 },
  }[dir];
  return (
    <motion.div
      initial={{ opacity: 0, ...offsets }}
      whileInView={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: E }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Hero (LEFT text / RIGHT interactive) with parallax depth ── */
function Hero() {
  const t = useT('landing');
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollY } = useScroll();
  const fieldY = useTransform(scrollY, [0, 700], [0, 140]);
  const previewScrollY = useTransform(scrollY, [0, 700], [0, -48]);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18, mass: 0.4 });
  const sy = useSpring(my, { stiffness: 60, damping: 18, mass: 0.4 });
  const previewX = useTransform(sx, [-0.5, 0.5], [-14, 14]);
  const previewY = useTransform(sy, [-0.5, 0.5], [-10, 10]);
  const glowX = useTransform(sx, [-0.5, 0.5], [22, -22]);
  const glowY = useTransform(sy, [-0.5, 0.5], [16, -16]);
  const fieldX = useTransform(sx, [-0.5, 0.5], [12, -12]);

  const onMouseMove = (e: React.MouseEvent) => {
    if (reduce) return;
    const r = sectionRef.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <section ref={sectionRef} onMouseMove={onMouseMove} className="relative overflow-hidden">
      <motion.div style={{ y: reduce ? 0 : fieldY, x: reduce ? 0 : fieldX }} className="pointer-events-none absolute inset-0 -z-10">
        <CollabField className="h-full w-full opacity-70" />
      </motion.div>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-white/40 via-white/70 to-white" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1.1fr] lg:gap-8 lg:pt-20">
        {/* LEFT */}
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.06, ease: E }}
            className="text-[clamp(1.9rem,3.6vw,3rem)] font-semibold tracking-tight text-neutral-950"
            style={{ lineHeight: 1.18, letterSpacing: '-0.015em' }}
          >
            {t('heroTitlePre')}
            <span style={{ color: BLUE }}>{t('heroTitleHighlight')}</span>
            {t('heroTitlePost')}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.13, ease: E }}
            className="mt-5 max-w-xl text-base leading-7 text-neutral-600 sm:text-lg"
          >
            {t('heroSubtitle')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: E }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link href="/register" prefetch>
              <button
                className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg"
                style={{ background: BLUE }}
              >
                {t('heroCtaStart')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </Link>
            <Link href="/fitur" prefetch>
              <button className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 shadow-sm transition-colors hover:border-neutral-400">
                {t('heroCtaFeatures')}
              </button>
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-5 text-sm text-neutral-400"
          >
            {t('heroTagline')}
          </motion.p>
        </div>

        {/* RIGHT — interactive preview floats with scroll + mouse */}
        <motion.div
          style={{ y: reduce ? 0 : previewScrollY }}
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: E }}
          className="relative"
        >
          <motion.div
            aria-hidden
            style={{ x: reduce ? 0 : glowX, y: reduce ? 0 : glowY }}
            className="absolute -inset-6 -z-10 rounded-[40px] opacity-50 blur-3xl"
          >
            <div className="h-full w-full rounded-[40px]" style={{ background: `radial-gradient(circle at 60% 40%, ${BLUE}22, transparent 70%)` }} />
          </motion.div>

          <motion.div style={{ x: reduce ? 0 : previewX, y: reduce ? 0 : previewY }}>
            <HeroPreview />
          </motion.div>

          <p className="mt-3 text-center text-xs text-neutral-400">
            {t('heroPreviewCaption')}
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Reality check — blunt, specific complaints, not icon cards ── */
function RealityCheck() {
  const t = useT('landing');
  const pains = [
    {
      n: '01', color: BLUE,
      title: t('realityCheckPain1Title'),
      desc: t('realityCheckPain1Desc'),
    },
    {
      n: '02', color: TEAL,
      title: t('realityCheckPain2Title'),
      desc: t('realityCheckPain2Desc'),
    },
    {
      n: '03', color: YELLOW,
      title: t('realityCheckPain3Title'),
      desc: t('realityCheckPain3Desc'),
    },
  ];
  return (
    <section className="border-t border-neutral-100 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal dir="left" className="max-w-xl">
          <h2 className="text-[clamp(1.5rem,2.6vw,2.15rem)] font-semibold tracking-tight text-neutral-950" style={{ lineHeight: 1.25, letterSpacing: '-0.01em' }}>
            {t('realityCheckHeading')}
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-x-8 gap-y-8 md:grid-cols-3">
          {pains.map((p, i) => (
            <Reveal key={p.n} delay={i * 0.1} dir="up">
              <div className="h-full border-l-2 pl-5" style={{ borderColor: p.color }}>
                <span className="text-2xl font-bold tracking-tight" style={{ color: `${p.color}35`, lineHeight: 1 }}>
                  {p.n}
                </span>
                <h3 className="mt-2 text-base font-bold text-neutral-900">{p.title}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-500">{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Solution ───────────────────────────────────────────────── */
function Solution() {
  const t = useT('landing');
  const points = [
    t('solutionPoint1'),
    t('solutionPoint2'),
    t('solutionPoint3'),
  ];
  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <Reveal dir="right">
          <h2 className="text-[clamp(1.5rem,2.6vw,2.15rem)] font-semibold tracking-tight text-neutral-950" style={{ lineHeight: 1.25, letterSpacing: '-0.01em' }}>
            {t('solutionHeading')}
          </h2>
          <p className="mt-4 text-base leading-7 text-neutral-600">
            {t('solutionDesc')}
          </p>
          <ul className="mt-6 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: `${TEAL}1A`, color: TEAL }}>
                  <Check className="h-3 w-3" />
                </span>
                <span className="text-sm leading-6 text-neutral-700">{p}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.1} dir="scale">
          <div className="relative rounded-3xl border p-6 shadow-sm" style={{ borderColor: `${BLUE}30`, background: `linear-gradient(155deg, ${BLUE}0A, white 55%)` }}>
            <div className="space-y-3">
              {[
                { label: t('solutionStatActiveProjects'), value: '12', color: BLUE },
                { label: t('solutionStatClosedTasks'), value: '48', color: TEAL },
                { label: t('solutionStatViewers'), value: '6', color: YELLOW },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between rounded-xl border border-neutral-100 bg-white px-4 py-3 shadow-sm">
                  <span className="text-sm text-neutral-600">{s.label}</span>
                  <span className="text-xl font-bold" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Module strip — a list, not another icon-square grid ─────── */
function ModuleStrip() {
  const t = useT('landing');
  const items = [
    { icon: FolderKanban, label: t('moduleStripKanbanLabel'), color: BLUE, desc: t('moduleStripKanbanDesc') },
    { icon: CheckSquare, label: t('moduleStripTasksLabel'), color: TEAL, desc: t('moduleStripTasksDesc') },
    { icon: CalendarDays, label: t('moduleStripCalendarLabel'), color: YELLOW, desc: t('moduleStripCalendarDesc') },
    { icon: StickyNote, label: t('moduleStripNotesLabel'), color: '#8B5CF6', desc: t('moduleStripNotesDesc') },
    { icon: Users, label: t('moduleStripTeamLabel'), color: BLUE, desc: t('moduleStripTeamDesc') },
  ];
  return (
    <section className="border-y border-neutral-100 bg-neutral-50/60 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal dir="up" className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <h2 className="text-[clamp(1.25rem,2vw,1.6rem)] font-semibold tracking-tight text-neutral-950">
            {t('moduleStripHeading')}
          </h2>
          <Link href="/fitur" prefetch className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold" style={{ color: BLUE }}>
            {t('heroCtaFeatures')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>

        <div className="mt-8 divide-y divide-neutral-200 border-t border-neutral-200">
          {items.map((item, i) => (
            <Reveal key={item.label} delay={i * 0.04} dir="left">
              <Link
                href="/fitur"
                prefetch
                className="group flex items-center gap-4 py-4 transition-colors hover:bg-white/70"
              >
                <item.icon className="h-4 w-4 shrink-0" style={{ color: item.color }} />
                <span className="w-40 shrink-0 text-sm font-semibold text-neutral-900 sm:w-48">{item.label}</span>
                <span className="hidden flex-1 text-sm text-neutral-500 sm:block">{item.desc}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-neutral-300 transition-transform group-hover:translate-x-1 group-hover:text-neutral-500" />
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Honest note — same device used on /cara-kerja and /harga ─── */
function HonestNote() {
  const t = useT('landing');
  return (
    <section className="px-4 py-16 sm:px-6">
      <Reveal dir="scale" className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
          <MessageCircleWarning className="mx-auto h-6 w-6" style={{ color: YELLOW }} />
          <p className="mt-3 text-sm font-bold uppercase tracking-wider text-neutral-400">{t('honestNoteTag')}</p>
          <p className="mt-3 text-neutral-600 leading-7">
            {t('honestNoteBody')}
          </p>
          <Link href="/contact" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: BLUE }}>
            {t('honestNoteCta')} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

/* ─── FAQ ────────────────────────────────────────────────────── */
// Keys only — the actual q/a text is resolved with t() inside LandingPage so
// it can be shared between the rendered <Faq> list and the JSON-LD below,
// keeping the structured data from ever drifting from what's on the page.
const FAQ_KEYS = [
  { qKey: 'faqQ1', aKey: 'faqA1' },
  { qKey: 'faqQ2', aKey: 'faqA2' },
  { qKey: 'faqQ3', aKey: 'faqA3' },
  { qKey: 'faqQ4', aKey: 'faqA4' },
] as const;

type Faq = { q: string; a: string };

function Faq({ faqs }: { faqs: Faq[] }) {
  const t = useT('landing');
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Reveal dir="up" className="text-center">
          <h2 className="text-[clamp(1.5rem,2.6vw,2.15rem)] font-semibold tracking-tight text-neutral-950" style={{ lineHeight: 1.25, letterSpacing: '-0.01em' }}>
            {t('faqHeading')}
          </h2>
        </Reveal>
        <div className="mt-10 space-y-3">
          {faqs.map((f, i) => {
            const open = openIdx === i;
            return (
              <Reveal key={f.q} delay={i * 0.05} dir="up">
                <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                  <button onClick={() => setOpenIdx(open ? null : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
                    <span className="text-sm font-semibold text-neutral-900">{f.q}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: E }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-4 text-sm leading-6 text-neutral-500">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ────────────────────────────────────────────────────── */
function Cta() {
  const t = useT('landing');
  return (
    <section className="px-4 py-20 sm:px-6">
      <Reveal dir="scale" className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl px-8 py-14 text-center sm:px-12" style={{ background: BLUE }}>
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-30 blur-3xl" style={{ background: TEAL }} />
          <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full opacity-20 blur-3xl" style={{ background: YELLOW }} />
          <h2 className="relative text-[clamp(1.5rem,2.6vw,2.15rem)] font-semibold tracking-tight text-white" style={{ lineHeight: 1.25 }}>
            {t('ctaHeading')}
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-base text-blue-100">
            {t('ctaBody')}
          </p>
          <div className="relative mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" prefetch>
              <button className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold shadow-lg transition-transform hover:scale-[1.02]" style={{ color: BLUE }}>
                {t('ctaButton')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </Link>
            <Link href="/login" prefetch className="text-sm font-medium text-blue-100 transition-colors hover:text-white">
              {t('ctaLoginLink')}
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function LandingPage() {
  const t = useT('landing');

  // Homepage-specific structured data. No aggregateRating/review data is
  // fabricated here — only facts that are actually true of the product.
  const softwareAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: SITE_URL,
    description: t('landingJsonLdDescription'),
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'IDR', description: t('landingJsonLdOfferDescription') },
  };

  const faqs = FAQ_KEYS.map((k) => ({ q: t(k.qKey), a: t(k.aKey) }));

  // Derived from faqs so the structured data can never drift from what's
  // actually visible on the page (a Google structured-data policy requirement).
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-white antialiased">
      <JsonLd data={softwareAppJsonLd} />
      <JsonLd data={faqJsonLd} />
      <MarketingHeader />
      <main>
        <Hero />
        <RealityCheck />
        <Solution />
        <ModuleStrip />
        <HonestNote />
        <Faq faqs={faqs} />
        <Cta />
      </main>
      <SiteFooter />
    </div>
  );
}
