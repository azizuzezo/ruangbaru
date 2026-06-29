'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState, useRef } from 'react';
import {
  motion, AnimatePresence,
  useScroll, useTransform, useMotionValue, useSpring, useReducedMotion,
} from 'framer-motion';
import {
  ArrowRight, X, Check,
  FolderKanban, CheckSquare, CalendarDays, StickyNote, Users,
  ChevronDown,
} from 'lucide-react';
import { HeroPreview } from '@/components/landing/HeroPreview';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';

// Three.js ambient field — client-only, kept out of SSR & initial bundle.
const CollabField = dynamic(
  () => import('@/components/landing/CollabField').then((m) => m.CollabField),
  { ssr: false },
);

const BLUE = '#106CD8';
const TEAL = '#10B29F';
const YELLOW = '#FDB31A';
const FONT = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
const FONT_BODY = "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
const E = [0.22, 1, 0.36, 1] as [number, number, number, number];

/* ─── Reveal helper ──────────────────────────────────────────── */
function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
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
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  // Scroll parallax — background field drifts down, preview lifts up.
  const { scrollY } = useScroll();
  const fieldY = useTransform(scrollY, [0, 700], [0, 140]);
  const previewScrollY = useTransform(scrollY, [0, 700], [0, -48]);

  // Mouse parallax — normalized [-0.5, 0.5] with spring smoothing.
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
      {/* Ambient Three.js field (scroll + mouse parallax) */}
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
            className="mt-6 text-4xl font-black tracking-tight text-neutral-950 sm:text-5xl lg:text-[3.6rem]"
            style={{ fontFamily: FONT, lineHeight: 1.04, letterSpacing: '-0.025em' }}
          >
            Tempat tim Anda merencanakan, bekerja, dan{' '}
            <span style={{ color: BLUE }}>berkembang bersama.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.13, ease: E }}
            className="mt-5 max-w-xl text-base leading-7 text-neutral-600 sm:text-lg"
          >
            RuangBaru menyatukan proyek, tugas, kalender, dan catatan dalam satu
            ruang yang sederhana — supaya tim bisa fokus pada pekerjaannya, bukan
            pada alatnya.
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
                Mulai gratis
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </Link>
            <Link href="/fitur" prefetch>
              <button className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 shadow-sm transition-colors hover:border-neutral-400">
                Lihat semua fitur
              </button>
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-5 text-sm text-neutral-400"
          >
            Gratis untuk tim hingga 5 anggota · Setup dalam 2 menit · Tanpa kartu kredit
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
            Pratinjau interaktif — klik kartu, seret untuk mengatur ulang, ganti workspace.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Problem ────────────────────────────────────────────────── */
function Problem() {
  const pains = [
    { title: 'Pekerjaan tersebar', desc: 'Tugas di chat, catatan di dokumen, jadwal di tempat lain. Tidak ada satu sumber kebenaran.' },
    { title: 'Status tidak jelas', desc: 'Siapa mengerjakan apa? Sudah sampai mana? Butuh rapat hanya untuk tahu progres.' },
    { title: 'Terlalu banyak alat', desc: 'Berlangganan banyak aplikasi yang tidak saling terhubung — mahal dan membingungkan.' },
  ];
  return (
    <section className="border-t border-neutral-100 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-wider" style={{ color: YELLOW }}>Masalahnya</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl" style={{ fontFamily: FONT, letterSpacing: '-0.02em' }}>
            Kerja tim jadi berat ketika semuanya berserakan.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {pains.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08}>
              <div className="card-interactive h-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400">
                  <X className="h-4 w-4" />
                </div>
                <h3 className="mt-4 text-base font-bold text-neutral-900">{p.title}</h3>
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
  const points = [
    'Satu tempat untuk proyek, tugas, kalender, catatan, dan tim',
    'Progres terlihat real-time tanpa perlu rapat status',
    'Cukup satu langganan — bukan lima aplikasi terpisah',
  ];
  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <p className="text-sm font-bold uppercase tracking-wider" style={{ color: TEAL }}>Solusinya</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl" style={{ fontFamily: FONT, letterSpacing: '-0.02em' }}>
            RuangBaru menyatukan semuanya dalam satu alur kerja.
          </h2>
          <p className="mt-4 text-base leading-7 text-neutral-600">
            Dari perencanaan hingga selesai — tim Anda bekerja di satu ruang yang
            tenang, terstruktur, dan selalu sinkron.
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

        <Reveal delay={0.1}>
          <div className="relative rounded-3xl border border-neutral-200 bg-gradient-to-br from-neutral-50 to-white p-6 shadow-sm">
            <div className="space-y-3">
              {[
                { label: 'Proyek aktif', value: '12', color: BLUE },
                { label: 'Tugas selesai minggu ini', value: '48', color: TEAL },
                { label: 'Anggota tim', value: '6', color: YELLOW },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between rounded-xl border border-neutral-100 bg-white px-4 py-3 shadow-sm">
                  <span className="text-sm text-neutral-600">{s.label}</span>
                  <span className="text-xl font-black" style={{ color: s.color, fontFamily: FONT }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Compact feature teaser (full demos live at /fitur) ─────── */
function FeatureTeaser() {
  const items = [
    { icon: FolderKanban, label: 'Papan Kanban', color: BLUE },
    { icon: CheckSquare, label: 'Manajemen Tugas', color: TEAL },
    { icon: CalendarDays, label: 'Kalender Tim', color: YELLOW },
    { icon: StickyNote, label: 'Catatan', color: '#8B5CF6' },
    { icon: Users, label: 'Manajemen Tim', color: BLUE },
  ];
  return (
    <section className="border-y border-neutral-100 bg-neutral-50/60 px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider" style={{ color: BLUE }}>Fitur</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-neutral-950 sm:text-3xl" style={{ fontFamily: FONT, letterSpacing: '-0.02em' }}>
              Semua yang dibutuhkan tim, dalam satu tempat.
            </h2>
          </div>
          <Link href="/fitur" prefetch className="group inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: BLUE }}>
            Lihat semua fitur
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((item, i) => (
            <Reveal key={item.label} delay={i * 0.05}>
              <Link href="/fitur" prefetch className="card-interactive flex h-full flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${item.color}14`, color: item.color }}>
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-neutral-900">{item.label}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ ────────────────────────────────────────────────────── */
const FAQS = [
  { q: 'Apakah RuangBaru benar-benar gratis?', a: 'Ya. Paket gratis mendukung hingga 5 anggota dan 3 proyek aktif, tanpa kartu kredit. Anda bisa upgrade kapan saja saat tim berkembang.' },
  { q: 'Apakah saya perlu menginstal aplikasi?', a: 'Tidak. RuangBaru berbasis web dan langsung bisa dibuka di browser mana pun, baik di desktop maupun ponsel.' },
  { q: 'Apakah data tim saya aman?', a: 'Data Anda disimpan dengan aman dan terenkripsi. Setiap workspace terisolasi, dan Anda mengatur sendiri siapa yang punya akses.' },
  { q: 'Bahasa apa yang didukung?', a: 'Antarmuka RuangBaru sepenuhnya dalam Bahasa Indonesia, dirancang untuk cara kerja tim di Indonesia.' },
];

function Faq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <p className="text-sm font-bold uppercase tracking-wider" style={{ color: BLUE }}>FAQ</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl" style={{ fontFamily: FONT, letterSpacing: '-0.02em' }}>
            Pertanyaan yang sering diajukan.
          </h2>
        </Reveal>
        <div className="mt-10 space-y-3">
          {FAQS.map((f, i) => {
            const open = openIdx === i;
            return (
              <Reveal key={f.q} delay={i * 0.05}>
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
  return (
    <section className="px-4 py-20 sm:px-6">
      <Reveal className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl px-8 py-14 text-center sm:px-12" style={{ background: BLUE }}>
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-30 blur-3xl" style={{ background: TEAL }} />
          <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full opacity-20 blur-3xl" style={{ background: YELLOW }} />
          <h2 className="relative text-3xl font-black tracking-tight text-white sm:text-4xl" style={{ fontFamily: FONT, letterSpacing: '-0.02em' }}>
            Siap menyatukan kerja tim Anda?
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-base text-blue-100">
            Buat workspace pertama Anda hari ini — gratis untuk tim hingga 5 anggota.
          </p>
          <div className="relative mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" prefetch>
              <button className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold shadow-lg transition-transform hover:scale-[1.02]" style={{ color: BLUE }}>
                Buat workspace gratis
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </Link>
            <Link href="/login" prefetch className="text-sm font-medium text-blue-100 transition-colors hover:text-white">
              Sudah punya akun? Masuk →
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white antialiased" style={{ fontFamily: FONT_BODY }}>
      <MarketingHeader />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <FeatureTeaser />
        <Faq />
        <Cta />
      </main>
      <SiteFooter />
    </div>
  );
}
