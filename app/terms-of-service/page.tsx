'use client';

import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { useT } from '@/lib/i18n/useT';

const BLUE = '#106CD8';
const YEAR = new Date().getFullYear();

export default function TermsOfServicePage() {
  const t = useT('marketingPages');

  const SECTIONS: { h: string; p: string[] }[] = [
    {
      h: t('termsSection1Title'),
      p: [t('termsSection1Body1'), t('termsSection1Body2')],
    },
    {
      h: t('termsSection2Title'),
      p: [t('termsSection2Body1'), t('termsSection2Body2')],
    },
    {
      h: t('termsSection3Title'),
      p: [t('termsSection3Body1'), t('termsSection3Body2')],
    },
    {
      h: t('termsSection4Title'),
      p: [t('termsSection4Body1'), t('termsSection4Body2')],
    },
    {
      h: t('termsSection5Title'),
      p: [t('termsSection5Body1'), t('termsSection5Body2')],
    },
    {
      h: t('termsSection6Title'),
      p: [t('termsSection6Body1'), t('termsSection6Body2')],
    },
    {
      h: t('termsSection7Title'),
      p: [t('termsSection7Body1'), t('termsSection7Body2')],
    },
    {
      h: t('termsSection8Title'),
      p: [t('termsSection8Body1'), t('termsSection8Body2')],
    },
    {
      h: t('termsSection9Title'),
      p: [t('termsSection9Body1'), t('termsSection9Body2')],
    },
    {
      h: t('termsSection10Title'),
      p: [t('termsSection10Body1'), t('termsSection10Body2')],
    },
  ];

  return (
    <div className="min-h-screen bg-white antialiased">
      <MarketingHeader />
      <main>
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2.5 text-sm font-semibold" style={{ color: BLUE }}>
              <FileText className="h-4 w-4" />
              {t('termsEyebrow')}
            </div>
            <h1
              className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl"
              style={{ letterSpacing: '-0.02em' }}
            >
              {t('termsTitle')}
            </h1>
            <p className="mt-3 text-sm text-neutral-500">{t('termsLastUpdated')} {YEAR}</p>
            <p className="mt-5 text-base leading-7 text-neutral-600">
              {t('termsIntro')}
            </p>
          </motion.div>

          <div className="mt-12 space-y-10">
            {SECTIONS.map((s, i) => (
              <motion.section
                key={s.h}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, delay: Math.min(i, 3) * 0.03 }}
              >
                <h2
                  className="text-xl font-semibold tracking-tight text-neutral-950"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  {s.h}
                </h2>
                <div className="mt-3 space-y-3.5">
                  {s.p.map((para, j) => (
                    <p key={j} className="text-sm leading-7 text-neutral-600 sm:text-base">
                      {para}
                    </p>
                  ))}
                </div>
              </motion.section>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
