'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Check, Tag } from 'lucide-react';
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

const PLANS = [
  {
    name: 'pricingPlanFreeName',
    price: 'pricingPlanFreePrice',
    per: 'pricingPlanFreePer',
    highlight: false,
    tagline: 'pricingPlanFreeTagline',
    features: [
      'pricingPlanFreeFeature1',
      'pricingPlanFreeFeature2',
      'pricingPlanFreeFeature3',
      'pricingPlanFreeFeature4',
      'pricingPlanFreeFeature5',
    ],
    cta: 'pricingPlanFreeCta',
    href: '/register',
    note: null,
  },
  {
    name: 'pricingPlanProName',
    price: 'pricingPlanProPrice',
    per: 'pricingPlanProPer',
    highlight: true,
    tagline: 'pricingPlanProTagline',
    features: [
      'pricingPlanProFeature1',
      'pricingPlanProFeature2',
      'pricingPlanProFeature3',
      'pricingPlanProFeature4',
      'pricingPlanProFeature5',
      'pricingPlanProFeature6',
    ],
    cta: 'pricingPlanProCta',
    href: '/register',
    note: 'pricingPlanProNote',
  },
  {
    name: 'pricingPlanCustomName',
    price: 'pricingPlanCustomPrice',
    per: 'pricingPlanCustomPer',
    highlight: false,
    tagline: 'pricingPlanCustomTagline',
    features: [
      'pricingPlanCustomFeature1',
      'pricingPlanCustomFeature2',
      'pricingPlanCustomFeature3',
      'pricingPlanCustomFeature4',
      'pricingPlanCustomFeature5',
      'pricingPlanCustomFeature6',
    ],
    cta: 'pricingPlanCustomCta',
    href: '/contact',
    note: null,
  },
];

export default function HargaPage() {
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
              {t('pricingHeroTitle')}
            </h1>
            <p className="mt-4 text-lg text-neutral-600 max-w-xl mx-auto">
              {t('pricingHeroSubtitle')}
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
                      {t('pricingBadgeRecommended')}
                    </span>
                  )}

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">{t(plan.name)}</p>
                    <p className="mt-1 text-sm text-neutral-500">{t(plan.tagline)}</p>
                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span className="text-4xl font-bold tracking-tight text-neutral-900">
                        {t(plan.price)}
                      </span>
                      <span className="text-sm text-neutral-500">{t(plan.per)}</span>
                    </div>
                    {plan.note && (
                      <p className="mt-1.5 text-[11px] text-neutral-400">* {t(plan.note)}</p>
                    )}
                  </div>

                  <ul className="mt-7 flex-1 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: plan.highlight ? BLUE : TEAL }} />
                        <span className="text-sm text-neutral-700">{t(f)}</span>
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
                        {t(plan.cta)}
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
            <h2 className="text-[clamp(1.3rem,2.2vw,1.7rem)] font-semibold text-neutral-900">
              {t('pricingTableSectionTitle')}
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100">
                    <th className="px-6 py-4 text-left font-semibold text-neutral-900">{t('pricingTableColFeature')}</th>
                    {['pricingPlanFreeName', 'pricingPlanProName', 'pricingPlanCustomName'].map(p => (
                      <th key={p} className="px-6 py-4 text-center font-semibold text-neutral-900"
                        style={{ color: p === 'pricingPlanProName' ? BLUE : undefined }}>{t(p)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'pricingTableRowMembersLabel', values: ['pricingTableMembersMax5', 'pricingTableUnlimited', 'pricingTableUnlimited'] },
                    { label: 'pricingTableRowProjectsLabel', values: ['3', 'pricingTableUnlimited', 'pricingTableUnlimited'] },
                    { label: 'pricingTableRowKanbanLabel', values: ['✓', '✓', '✓'] },
                    { label: 'pricingTableRowNotesLabel', values: ['✓', '✓', '✓'] },
                    { label: 'pricingTableRowCalendarLabel', values: ['✓', '✓', '✓'] },
                    { label: 'pricingTableRowHistoryLabel', values: ['pricingTableHistory30Days', 'pricingTableUnlimited', 'pricingTableUnlimited'] },
                    { label: 'pricingTableRowExportLabel', values: ['—', 'CSV', 'CSV + JSON'] },
                    { label: 'pricingTableRowSupportLabel', values: ['pricingTableSupportCommunity', 'pricingTableSupportPriority', 'pricingTableSupportDedicated'] },
                    { label: 'pricingTableRowSlaLabel', values: ['—', '—', '✓'] },
                  ].map((row, i) => (
                    <tr key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}>
                      <td className="px-6 py-3.5 text-neutral-700">{t(row.label)}</td>
                      {row.values.map((v, vi) => (
                        <td key={vi} className="px-6 py-3.5 text-center"
                          style={{ color: v === '✓' ? TEAL : v === '—' ? '#D1D5DB' : '#374151', fontWeight: v === '✓' ? 700 : 400 }}>
                          {t(v)}
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
              <p className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-3">{t('pricingHonestLabel')}</p>
              <p className="text-neutral-600 leading-7">
                {t('pricingHonestText1')}<strong>{t('pricingHonestTextStrong')}</strong>{t('pricingHonestText2')}
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-neutral-100 bg-[#F9FAFB] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <FadeIn>
            <h2 className="text-[clamp(1.5rem,2.6vw,2.15rem)] font-semibold text-neutral-900">
              {t('pricingCtaTitle')}
            </h2>
            <p className="mt-3 text-neutral-600">{t('pricingCtaSubtitle')}</p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register">
                <motion.button
                  className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white"
                  style={{ background: BLUE }}
                  whileHover={{ opacity: 0.88 }} whileTap={{ scale: 0.97 }}>
                  {t('pricingCtaButton')} <ArrowRight className="h-4 w-4" />
                </motion.button>
              </Link>
              <Link href="/cara-kerja" className="text-sm font-medium text-neutral-500 hover:text-neutral-800 transition-colors">
                {t('pricingCtaHowLink')}
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
