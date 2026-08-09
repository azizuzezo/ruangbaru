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
    title: 'Buat workspace, undang tim lewat satu tautan',
    desc: 'Isi nama workspace, bagikan tautan undangan ke grup WA tim Anda. Tidak ada persetujuan admin IT, tidak ada formulir approval — begitu klik tautannya, mereka sudah masuk.',
    color: BLUE,
    details: ['Tanpa kartu kredit', 'Gratis untuk 5 anggota', 'Tautan undangan, bukan email satu-satu'],
  },
  {
    n: '02',
    icon: <FolderKanban className="h-6 w-6" />,
    title: 'Pindahkan proyek yang lagi berjalan sekarang',
    desc: 'Bukan proyek contoh — proyek yang sedang Anda kerjakan hari ini. Buat kartu untuk tiap tugas, tempel tenggat waktu, lalu lihat papannya langsung terisi.',
    color: TEAL,
    details: ['Papan kanban, drag untuk pindah status', 'Prioritas dan label', 'Tenggat waktu nempel ke kalender'],
  },
  {
    n: '03',
    icon: <Zap className="h-6 w-6" />,
    title: 'Berhenti bikin rapat cuma buat lapor progres',
    desc: 'Siapa pun bisa buka papan dan langsung tahu status tanpa nanya. Rapat yang tersisa jadi rapat yang benar-benar butuh diskusi, bukan sekadar update status.',
    color: '#8B5CF6',
    details: ['Catatan bisa diedit bersama', 'Kalender tim satu tampilan', 'Progres kelihatan tanpa lapor manual'],
  },
];

export default function CaraKerjaPage() {
  return (
    <div className="min-h-screen bg-white antialiased">
      <MarketingHeader />

      {/* Hero */}
      <section className="border-b border-neutral-100 bg-[#F9FAFB] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: E }}>
            <h1 className="text-[clamp(1.9rem,3.6vw,2.75rem)] font-semibold tracking-tight text-neutral-900" style={{ lineHeight: 1.2 }}>
              Tiga langkah. Tidak ada langkah keempat.
            </h1>
            <p className="mt-4 text-lg text-neutral-600 max-w-xl mx-auto">
              Tidak ada video onboarding 40 menit atau kelas training. Baca ini,
              lalu langsung praktik dengan proyek yang sedang Anda kerjakan.
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
                    <span className="text-4xl font-bold tracking-tight"
                      style={{ color: `${step.color}30`, lineHeight: 1 }}>
                      {step.n}
                    </span>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-neutral-900">
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
              <p className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-2">Yang belum kami sebut di atas</p>
              <p className="text-neutral-600 leading-7">
                RuangBaru masih tahap awal. Beberapa sudut fitur belum sehalus
                yang kami mau, dan tim kami kecil — jadi kalau nemu bug, kabari
                lewat kontak dan biasanya langsung kami tangani, bukan masuk
                antrean tiket berbulan-bulan.
              </p>
              <Link href="/contact" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold"
                style={{ color: BLUE }}>
                Lapor bug atau kasih masukan <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* FAQ teaser */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <FadeIn className="mb-10 max-w-xl">
            <h2 className="text-[clamp(1.5rem,2.6vw,2.15rem)] font-semibold text-neutral-900">
              Sebelum Anda tanya di kolom kontak
            </h2>
          </FadeIn>
          <div className="space-y-4">
            {[
              { q: 'Apakah gratis selamanya?', a: 'Plan Gratis tidak punya tanggal habis. Selama tim Anda di bawah 5 orang dan 3 proyek aktif, tidak akan ada tagihan tiba-tiba.' },
              { q: 'Apakah data saya aman?', a: 'Data tersimpan terenkripsi, dan workspace Anda terisolasi dari workspace tim lain — bahkan kalau satu server yang sama.' },
              { q: 'Bisakah saya mengundang tim lebih dari 5 orang?', a: 'Bisa, dengan upgrade ke plan Pro. Tim yang sudah jalan tetap utuh, tidak perlu setup ulang.' },
              { q: 'Di mana saya bisa mendapat bantuan?', a: 'Lewat halaman kontak. Tim kami masih kecil, jadi balasannya personal — bukan template auto-reply.' },
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
            <h2 className="text-[clamp(1.5rem,2.6vw,2.15rem)] font-semibold text-neutral-900">
              Langkah 01 dimulai sekarang, bukan setelah demo call.
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
