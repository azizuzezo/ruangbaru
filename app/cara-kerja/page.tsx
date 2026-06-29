'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, CheckCircle2, Users, FolderKanban, Zap } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';

const BLUE = '#106CD8';
const TEAL = '#10B29F';
const E = [0.22, 1, 0.36, 1] as [number, number, number, number];
const FONT = "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
const DFONT = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";

function FadeIn({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: E }}
      className={className}>
      {children}
    </motion.div>
  );
}

const STEPS = [
  {
    n: '01',
    icon: <Users className="h-6 w-6" />,
    title: 'Buat workspace tim',
    desc: 'Daftarkan akun dan buat workspace pertama Anda dalam hitungan menit. Pilih nama workspace dan undang anggota tim melalui tautan atau email.',
    color: BLUE,
    details: ['Tidak perlu kartu kredit', 'Gratis untuk 5 anggota', 'Setup kurang dari 5 menit'],
  },
  {
    n: '02',
    icon: <FolderKanban className="h-6 w-6" />,
    title: 'Tambahkan proyek dan tugas',
    desc: 'Buat proyek, isi dengan tugas-tugas yang perlu diselesaikan, dan atur prioritas serta tenggat waktu. Semua langsung terlihat oleh seluruh anggota tim.',
    color: TEAL,
    details: ['Papan kanban visual', 'Prioritas dan label', 'Tenggat waktu terintegrasi'],
  },
  {
    n: '03',
    icon: <Zap className="h-6 w-6" />,
    title: 'Bekerja bersama tim',
    desc: 'Tulis catatan, pantau kalender tim, dan lihat progress pekerjaan secara keseluruhan dalam satu tampilan. Tim tetap sinkron tanpa perlu rapat panjang.',
    color: '#8B5CF6',
    details: ['Catatan kolaboratif', 'Kalender bersama', 'Dashboard progress real-time'],
  },
];

export default function CaraKerjaPage() {
  return (
    <div className="min-h-screen bg-white antialiased" style={{ fontFamily: FONT }}>
      <MarketingHeader />

      {/* Hero */}
      <section className="border-b border-neutral-100 bg-[#F9FAFB] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: E }}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-neutral-600 shadow-sm mb-5">
              <Zap className="h-3.5 w-3.5" style={{ color: TEAL }} />
              Cara Kerja RuangBaru
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl"
              style={{ fontFamily: DFONT }}>
              Mulai dalam tiga langkah
            </h1>
            <p className="mt-4 text-lg text-neutral-600 max-w-xl mx-auto">
              Dari mendaftar hingga tim bekerja bersama — hanya perlu beberapa menit tanpa setup yang rumit.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Steps */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-12">
          {STEPS.map((step, i) => (
            <FadeIn key={step.n} delay={i * 0.1}>
              <div className="grid gap-8 lg:grid-cols-[auto_1fr] items-start">
                {/* Step number + connector */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md"
                    style={{ background: step.color }}>
                    {step.icon}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="h-16 w-px" style={{ background: `linear-gradient(to bottom, ${step.color}50, transparent)` }} />
                  )}
                </div>
                {/* Content */}
                <div className="rounded-2xl border border-neutral-200 bg-white p-8 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <span className="text-4xl font-black tracking-tighter"
                      style={{ color: `${step.color}20`, fontFamily: DFONT, lineHeight: 1 }}>
                      {step.n}
                    </span>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-neutral-900" style={{ fontFamily: DFONT }}>
                        {step.title}
                      </h2>
                      <p className="mt-3 text-base text-neutral-600 leading-7">{step.desc}</p>
                      <ul className="mt-5 space-y-2">
                        {step.details.map(d => (
                          <li key={d} className="flex items-center gap-2.5">
                            <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: step.color }} />
                            <span className="text-sm text-neutral-700">{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Honest note */}
      <section className="border-t border-neutral-100 bg-[#F9FAFB] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <FadeIn>
            <div className="rounded-2xl border border-neutral-200 bg-white p-8">
              <p className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-2">Catatan jujur</p>
              <p className="text-neutral-600 leading-7">
                RuangBaru saat ini dalam <strong>tahap awal pengembangan</strong>. Beberapa fitur mungkin belum sempurna.
                Dengan bergabung sekarang, Anda membantu kami membentuk produk yang lebih baik untuk tim Indonesia.
              </p>
              <Link href="/register" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold"
                style={{ color: BLUE }}>
                Bergabung dan bantu kami <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* FAQ teaser */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <FadeIn className="mb-10 text-center">
            <h2 className="text-3xl font-extrabold text-neutral-900" style={{ fontFamily: DFONT }}>
              Pertanyaan umum
            </h2>
          </FadeIn>
          <div className="space-y-4">
            {[
              { q: 'Apakah gratis selamanya?', a: 'Plan Gratis tersedia tanpa batas waktu untuk tim hingga 5 anggota dan 3 proyek aktif.' },
              { q: 'Apakah data saya aman?', a: 'Data disimpan di server yang aman. Kami menggunakan enkripsi untuk semua data yang tersimpan dan dalam perjalanan.' },
              { q: 'Bisakah saya mengundang tim lebih dari 5 orang?', a: 'Ya, dengan upgrade ke plan Pro Anda bisa mengundang anggota tidak terbatas.' },
              { q: 'Di mana saya bisa mendapat bantuan?', a: 'Anda bisa menghubungi kami melalui halaman kontak. Kami akan merespons secepatnya.' },
            ].map((item, i) => (
              <FadeIn key={item.q} delay={i * 0.06}>
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 hover:shadow-sm transition-shadow">
                  <h3 className="font-semibold text-neutral-900">{item.q}</h3>
                  <p className="mt-2 text-sm text-neutral-600 leading-6">{item.a}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-neutral-100 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <FadeIn>
            <h2 className="text-3xl font-extrabold text-neutral-900" style={{ fontFamily: DFONT }}>
              Siap memulai?
            </h2>
            <p className="mt-3 text-neutral-600">Buat workspace pertama Anda sekarang, gratis.</p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register">
                <motion.button
                  className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white"
                  style={{ background: BLUE }}
                  whileHover={{ opacity: 0.88 }} whileTap={{ scale: 0.97 }}>
                  Mulai gratis <ArrowRight className="h-4 w-4" />
                </motion.button>
              </Link>
              <Link href="/fitur" className="text-sm font-medium text-neutral-500 hover:text-neutral-800 transition-colors">
                Lihat semua fitur →
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
