'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Check, Tag } from 'lucide-react';
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

const PLANS = [
  {
    name: 'Gratis',
    price: 'Rp 0',
    per: '/ selamanya',
    highlight: false,
    tagline: 'Untuk tim kecil memulai',
    features: [
      'Hingga 5 anggota',
      '3 proyek aktif',
      'Tugas & catatan dasar',
      'Kalender tim',
      'Dukungan komunitas',
    ],
    cta: 'Mulai gratis',
    href: '/register',
    note: null,
  },
  {
    name: 'Pro',
    price: 'Rp 99.000',
    per: '/ bulan',
    highlight: true,
    tagline: 'Untuk tim yang sedang berkembang',
    features: [
      'Anggota tidak terbatas',
      'Proyek tidak terbatas',
      'Semua fitur Gratis',
      'Riwayat aktivitas lengkap',
      'Ekspor data (CSV)',
      'Prioritas respons dukungan',
    ],
    cta: 'Coba Pro',
    href: '/register',
    note: 'Harga dapat berubah selama tahap awal pengembangan',
  },
  {
    name: 'Khusus',
    price: 'Hubungi',
    per: 'kami',
    highlight: false,
    tagline: 'Untuk perusahaan & enterprise',
    features: [
      'Semua fitur Pro',
      'SLA dukungan dedikasi',
      'Onboarding terdampingi',
      'Pelatihan tim',
      'Opsi privat deployment',
      'Kontrak khusus',
    ],
    cta: 'Hubungi kami',
    href: '/contact',
    note: null,
  },
];

export default function HargaPage() {
  return (
    <div className="min-h-screen bg-white antialiased" style={{ fontFamily: FONT }}>
      <MarketingHeader />

      {/* Hero */}
      <section className="border-b border-neutral-100 bg-[#F9FAFB] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: E }}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-neutral-600 shadow-sm mb-5">
              <Tag className="h-3.5 w-3.5" style={{ color: BLUE }} />
              Harga Transparan
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl"
              style={{ fontFamily: DFONT }}>
              Harga yang jujur sejak awal
            </h1>
            <p className="mt-4 text-lg text-neutral-600 max-w-xl mx-auto">
              Tidak ada biaya tersembunyi. Plan Gratis tersedia tanpa batas waktu. Bayar lebih hanya jika tim Anda tumbuh.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Plans */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 md:grid-cols-3 items-start">
            {PLANS.map((plan, i) => (
              <FadeIn key={plan.name} delay={i * 0.08}>
                <div className={`relative flex flex-col rounded-2xl p-8 h-full ${
                  plan.highlight
                    ? 'border-2 bg-white shadow-xl'
                    : 'border border-neutral-200 bg-white hover:shadow-md'
                } transition-shadow`}
                  style={{ borderColor: plan.highlight ? BLUE : undefined }}>
                  {plan.highlight && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold text-white whitespace-nowrap"
                      style={{ background: BLUE }}>
                      Direkomendasikan
                    </span>
                  )}

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">{plan.name}</p>
                    <p className="mt-1 text-sm text-neutral-500">{plan.tagline}</p>
                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span className="text-4xl font-black tracking-tight text-neutral-900"
                        style={{ fontFamily: DFONT }}>
                        {plan.price}
                      </span>
                      <span className="text-sm text-neutral-500">{plan.per}</span>
                    </div>
                    {plan.note && (
                      <p className="mt-1.5 text-[11px] text-neutral-400">* {plan.note}</p>
                    )}
                  </div>

                  <ul className="mt-7 flex-1 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: plan.highlight ? BLUE : TEAL }} />
                        <span className="text-sm text-neutral-700">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <Link href={plan.href}>
                      <motion.button
                        className={`w-full rounded-xl py-3 text-sm font-semibold transition-colors ${
                          plan.highlight
                            ? 'text-white'
                            : 'border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
                        }`}
                        style={{ background: plan.highlight ? BLUE : undefined }}
                        whileHover={{ opacity: plan.highlight ? 0.9 : 1, scale: plan.highlight ? 1.01 : 1 }}
                        whileTap={{ scale: 0.99 }}>
                        {plan.cta}
                      </motion.button>
                    </Link>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="border-t border-neutral-100 bg-[#F9FAFB] px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <FadeIn className="mb-10 text-center">
            <h2 className="text-2xl font-extrabold text-neutral-900" style={{ fontFamily: DFONT }}>
              Perbandingan lengkap
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100">
                    <th className="px-6 py-4 text-left font-semibold text-neutral-900">Fitur</th>
                    {['Gratis', 'Pro', 'Khusus'].map(p => (
                      <th key={p} className="px-6 py-4 text-center font-semibold text-neutral-900"
                        style={{ color: p === 'Pro' ? BLUE : undefined }}>{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Anggota tim', values: ['Maks. 5', 'Tidak terbatas', 'Tidak terbatas'] },
                    { label: 'Proyek aktif', values: ['3', 'Tidak terbatas', 'Tidak terbatas'] },
                    { label: 'Papan kanban', values: ['✓', '✓', '✓'] },
                    { label: 'Catatan & editor', values: ['✓', '✓', '✓'] },
                    { label: 'Kalender tim', values: ['✓', '✓', '✓'] },
                    { label: 'Riwayat aktivitas', values: ['30 hari', 'Tidak terbatas', 'Tidak terbatas'] },
                    { label: 'Ekspor data', values: ['—', 'CSV', 'CSV + JSON'] },
                    { label: 'Dukungan', values: ['Komunitas', 'Prioritas', 'Dedikasi'] },
                    { label: 'SLA', values: ['—', '—', '✓'] },
                  ].map((row, i) => (
                    <tr key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}>
                      <td className="px-6 py-3.5 text-neutral-700">{row.label}</td>
                      {row.values.map((v, vi) => (
                        <td key={vi} className="px-6 py-3.5 text-center"
                          style={{ color: v === '✓' ? TEAL : v === '—' ? '#D1D5DB' : '#374151', fontWeight: v === '✓' ? 700 : 400 }}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Honest section */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <FadeIn>
            <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-3">Transparan sejak awal</p>
              <p className="text-neutral-600 leading-7">
                Harga Pro sebesar <strong>Rp 99.000/bulan</strong> adalah harga awal yang dapat berubah.
                Kami berkomitmen untuk selalu memberikan notifikasi minimal 30 hari sebelum ada perubahan harga.
                Tim yang bergabung di fase awal akan mendapat <strong>harga spesial</strong>.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-neutral-100 bg-[#F9FAFB] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <FadeIn>
            <h2 className="text-3xl font-extrabold text-neutral-900" style={{ fontFamily: DFONT }}>
              Mulai dengan plan Gratis
            </h2>
            <p className="mt-3 text-neutral-600">Tidak perlu kartu kredit. Upgrade kapan saja jika tim Anda tumbuh.</p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register">
                <motion.button
                  className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white"
                  style={{ background: BLUE }}
                  whileHover={{ opacity: 0.88 }} whileTap={{ scale: 0.97 }}>
                  Buat workspace gratis <ArrowRight className="h-4 w-4" />
                </motion.button>
              </Link>
              <Link href="/cara-kerja" className="text-sm font-medium text-neutral-500 hover:text-neutral-800 transition-colors">
                Cara kerja RuangBaru →
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
