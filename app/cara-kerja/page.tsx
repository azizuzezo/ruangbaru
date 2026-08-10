'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, CheckCircle2, Users, FolderKanban, Zap } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { useT } from '@/lib/i18n/useT';

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
    title: 'howStep1Title',
    desc: 'howStep1Desc',
    color: BLUE,
    details: ['howStep1Detail1', 'howStep1Detail2', 'howStep1Detail3'],
  },
  {
    n: '02',
    icon: <FolderKanban className="h-6 w-6" />,
    title: 'howStep2Title',
    desc: 'howStep2Desc',
    color: TEAL,
    details: ['howStep2Detail1', 'howStep2Detail2', 'howStep2Detail3'],
  },
  {
    n: '03',
    icon: <Zap className="h-6 w-6" />,
    title: 'howStep3Title',
    desc: 'howStep3Desc',
    color: '#8B5CF6',
    details: ['howStep3Detail1', 'howStep3Detail2', 'howStep3Detail3'],
  },
];

export default function CaraKerjaPage() {
  const t = useT('marketingFeatures');
  return (
    <div className="min-h-screen bg-white antialiased">
      <MarketingHeader />

      {/* Hero */}
      <section className="border-b border-neutral-100 bg-[#F9FAFB] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: E }}>
            <h1 className="text-[clamp(1.9rem,3.6vw,2.75rem)] font-semibold tracking-tight text-neutral-900" style={{ lineHeight: 1.2 }}>
              {t('howHeroTitle')}
            </h1>
            <p className="mt-4 text-lg text-neutral-600 max-w-xl mx-auto">
              {t('howHeroSubtitle')}
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
                        {t(step.title)}
                      </h2>
                      <p className="mt-3 text-base text-neutral-600 leading-7">{t(step.desc)}</p>
                      <ul className="mt-5 space-y-2">
                        {step.details.map(d => (
                          <li key={d} className="flex items-center gap-2.5">
                            <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: step.color }} />
                            <span className="text-sm text-neutral-700">{t(d)}</span>
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
              <p className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-2">{t('howHonestLabel')}</p>
              <p className="text-neutral-600 leading-7">
                {t('howHonestText')}
              </p>
              <Link href="/contact" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold"
                style={{ color: BLUE }}>
                {t('howHonestLink')} <ArrowRight className="h-4 w-4" />
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
              {t('howFaqSectionTitle')}
            </h2>
          </FadeIn>
          <div className="space-y-4">
            {[
              { q: 'howFaqQ1', a: 'howFaqA1' },
              { q: 'howFaqQ2', a: 'howFaqA2' },
              { q: 'howFaqQ3', a: 'howFaqA3' },
              { q: 'howFaqQ4', a: 'howFaqA4' },
            ].map((item, i) => (
              <FadeIn key={item.q} delay={i * 0.06}>
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 hover:shadow-sm transition-shadow">
                  <h3 className="font-semibold text-neutral-900">{t(item.q)}</h3>
                  <p className="mt-2 text-sm text-neutral-600 leading-6">{t(item.a)}</p>
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
              {t('howCtaTitle')}
            </h2>
            <p className="mt-3 text-neutral-600">{t('howCtaSubtitle')}</p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register">
                <motion.button
                  className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white"
                  style={{ background: BLUE }}
                  whileHover={{ opacity: 0.88 }} whileTap={{ scale: 0.97 }}>
                  {t('howCtaButton')} <ArrowRight className="h-4 w-4" />
                </motion.button>
              </Link>
              <Link href="/fitur" className="text-sm font-medium text-neutral-500 hover:text-neutral-800 transition-colors">
                {t('howCtaFeaturesLink')}
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
