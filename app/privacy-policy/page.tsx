'use client';

import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { useT } from '@/lib/i18n/useT';

const BLUE = '#106CD8';
const YEAR = new Date().getFullYear();

export default function PrivacyPolicyPage() {
  const t = useT('marketingPages');

  const SECTIONS: { h: string; p: string[] }[] = [
    {
      h: t('privacySection1Title'),
      p: [t('privacySection1Body1'), t('privacySection1Body2'), t('privacySection1Body3')],
    },
    {
      h: t('privacySection2Title'),
      p: [t('privacySection2Body1'), t('privacySection2Body2'), t('privacySection2Body3')],
    },
    {
      h: t('privacySection3Title'),
      p: [t('privacySection3Body1'), t('privacySection3Body2')],
    },
    {
      h: t('privacySection4Title'),
      p: [t('privacySection4Body1'), t('privacySection4Body2')],
    },
    {
      h: t('privacySection5Title'),
      p: [t('privacySection5Body1'), t('privacySection5Body2')],
    },
    {
      h: t('privacySection6Title'),
      p: [t('privacySection6Body1'), t('privacySection6Body2')],
    },
    {
      h: t('privacySection7Title'),
      p: [t('privacySection7Body1'), t('privacySection7Body2')],
    },
    {
      h: t('privacySection8Title'),
      p: [t('privacySection8Body1'), t('privacySection8Body2')],
    },
    {
      h: t('privacySection9Title'),
      p: [t('privacySection9Body1'), t('privacySection9Body2')],
    },
    {
      h: t('privacySection10Title'),
      p: [t('privacySection10Body1'), t('privacySection10Body2')],
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
              <Shield className="h-4 w-4" />
              {t('privacyEyebrow')}
            </div>
            <h1
              className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl"
              style={{ letterSpacing: '-0.02em' }}
            >
              {t('privacyTitle')}
            </h1>
            <p className="mt-3 text-sm text-neutral-500">{t('privacyLastUpdated')} {YEAR}</p>
            <p className="mt-5 text-base leading-7 text-neutral-600">
              {t('privacyIntro')}
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
