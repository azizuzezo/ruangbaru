'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Heart, Building2, MessageSquare } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { useT } from '@/lib/i18n/useT';

const BLUE = '#106CD8';
const TEAL = '#10B29F';

export default function AboutPage() {
  const t = useT('marketingPages');

  const SECTIONS = [
    {
      h: t('aboutSection1Title'),
      body: [t('aboutSection1Body1'), t('aboutSection1Body2')],
    },
    {
      h: t('aboutSection2Title'),
      body: [t('aboutSection2Body1'), t('aboutSection2Body2')],
    },
    {
      h: t('aboutSection3Title'),
      body: [t('aboutSection3Body1'), t('aboutSection3Body2')],
    },
  ];

  return (
    <div className="min-h-screen bg-white antialiased">
      <MarketingHeader />
      <main>
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sm font-semibold" style={{ color: BLUE }}>
              {t('aboutEyebrow')}
            </p>
            <h1
              className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl"
              style={{ letterSpacing: '-0.02em' }}
            >
              {t('aboutHeroTitle')}
            </h1>
            <p className="mt-5 text-base leading-7 text-neutral-600">
              {t('aboutHeroBody')}
            </p>
          </motion.div>
        </section>

        {/* Content sections */}
        <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
          <div className="space-y-12">
            {SECTIONS.map((s, i) => (
              <motion.div
                key={s.h}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: i * 0.04 }}
              >
                <h2
                  className="text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  {s.h}
                </h2>
                <div className="mt-4 space-y-4">
                  {s.body.map((p, j) => (
                    <p key={j} className="text-sm leading-7 text-neutral-600 sm:text-base">
                      {p}
                    </p>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Tentang Duacincin */}
        <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45 }}
            className="rounded-3xl border border-neutral-200 bg-neutral-50/70 p-7 sm:p-9"
          >
            <div className="flex items-center gap-2.5 text-sm font-semibold" style={{ color: TEAL }}>
              <Building2 className="h-4 w-4" />
              {t('aboutDuacincinEyebrow')}
            </div>
            <h2
              className="mt-4 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl"
              style={{ letterSpacing: '-0.02em' }}
            >
              {t('aboutDuacincinTitle')}
            </h2>
            <div className="mt-4 space-y-4">
              <p className="text-sm leading-7 text-neutral-600 sm:text-base">
                {t('aboutDuacincinBody1')}
              </p>
              <p className="text-sm leading-7 text-neutral-600 sm:text-base">
                {t('aboutDuacincinBody2')}
              </p>
            </div>
            <a
              href="https://duacincin.id"
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:opacity-80"
              style={{ color: BLUE }}
            >
              {t('aboutDuacincinLink')}
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </motion.div>
        </section>

        {/* Penutup CTA */}
        <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45 }}
            className="rounded-3xl border border-neutral-100 p-8 text-center sm:p-10"
            style={{ background: 'linear-gradient(180deg,#F4F8FE 0%,#FFFFFF 100%)' }}
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full" style={{ background: '#EBF3FD', color: BLUE }}>
              <Heart className="h-5 w-5" />
            </div>
            <h2
              className="mt-5 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl"
              style={{ letterSpacing: '-0.02em' }}
            >
              {t('aboutCtaTitle')}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-neutral-600">
              {t('aboutCtaBody')}
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
                style={{ background: BLUE }}
              >
                {t('aboutCtaButton')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <a
                href="mailto:halo@ruangbaru.my.id"
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-300"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                halo@ruangbaru.my.id
              </a>
            </div>
          </motion.div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
