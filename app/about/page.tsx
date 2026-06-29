'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Heart, Building2, MessageSquare } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';

const FONT = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
const FONT_BODY = "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";

const BLUE = '#106CD8';
const TEAL = '#10B29F';

const SECTIONS = [
  {
    h: 'Kenapa RuangBaru ada',
    body: [
      'Banyak tim kecil dan UMKM di Indonesia kehilangan waktu bukan karena kurang bekerja keras, tetapi karena pekerjaan mereka tersebar di banyak alat yang berbeda. Daftar tugas ada di satu aplikasi, catatan rapat di tempat lain, jadwal di kalender pribadi, dan diskusi tim berpindah-pindah antara chat dan email.',
      'RuangBaru hadir untuk menyatukan semuanya. Proyek, tugas, kalender, catatan, dan tim berada dalam satu ruang yang sama, sehingga semua orang tahu apa yang sedang dikerjakan, oleh siapa, dan kapan harus selesai — tanpa harus berpindah-pindah aplikasi sepanjang hari.',
    ],
  },
  {
    h: 'Filosofi produk',
    body: [
      'Kami percaya alat kerja yang baik seharusnya mengurangi kebisingan, bukan menambahnya. Karena itu RuangBaru kami rancang agar sederhana dan tenang: lebih sedikit tab, lebih sedikit notifikasi yang tidak perlu, dan tampilan yang membantu Anda fokus pada pekerjaan, bukan pada cara mengoperasikan aplikasinya.',
      'Seluruh antarmuka menggunakan Bahasa Indonesia karena tim yang menggunakannya berbahasa Indonesia. Kami juga berkomitmen pada harga yang masuk akal untuk tim lokal — bukan harga yang dibuat untuk pasar luar negeri lalu sekadar dikonversi ke rupiah.',
    ],
  },
  {
    h: 'Fokus pada tim Indonesia',
    body: [
      'RuangBaru dibangun untuk cara kerja tim dan UMKM Indonesia, bukan sebagai terjemahan dari produk asing. Antarmuka dan dukungan kami sepenuhnya dalam Bahasa Indonesia, sehingga setiap anggota tim bisa langsung paham tanpa hambatan bahasa.',
      'Kami mendengarkan kebutuhan nyata tim lokal dan mengutamakannya dalam pengembangan, mulai dari hal-hal kecil sehari-hari sampai cara tim berkolaborasi dan membagi tanggung jawab.',
    ],
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white antialiased" style={{ fontFamily: FONT_BODY }}>
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
              Tentang RuangBaru
            </p>
            <h1
              className="mt-3 text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl"
              style={{ fontFamily: FONT, letterSpacing: '-0.02em' }}
            >
              Satu ruang kerja untuk tim Indonesia
            </h1>
            <p className="mt-5 text-base leading-7 text-neutral-600">
              RuangBaru adalah ruang kerja kolaboratif yang menyatukan proyek, tugas, kalender,
              catatan, dan tim Anda di satu tempat. Kami masih berada di tahap awal pengembangan,
              dan kami membangunnya secara terbuka bersama tim-tim yang menggunakannya.
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
                  className="text-xl font-black tracking-tight text-neutral-950 sm:text-2xl"
                  style={{ fontFamily: FONT, letterSpacing: '-0.02em' }}
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
              Tentang Duacincin
            </div>
            <h2
              className="mt-4 text-xl font-black tracking-tight text-neutral-950 sm:text-2xl"
              style={{ fontFamily: FONT, letterSpacing: '-0.02em' }}
            >
              RuangBaru dibuat oleh Duacincin
            </h2>
            <div className="mt-4 space-y-4">
              <p className="text-sm leading-7 text-neutral-600 sm:text-base">
                RuangBaru adalah produk yang dibuat oleh Duacincin. Sebagai pembuat produk, Duacincin
                bertanggung jawab atas pengembangan, pemeliharaan, dan arah RuangBaru ke depan.
              </p>
              <p className="text-sm leading-7 text-neutral-600 sm:text-base">
                Untuk mengenal lebih jauh siapa yang berada di balik produk ini, Anda bisa
                mengunjungi situs resmi Duacincin.
              </p>
            </div>
            <a
              href="https://duacincin.id"
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:opacity-80"
              style={{ color: BLUE }}
            >
              Kunjungi duacincin.id
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
              className="mt-5 text-2xl font-black tracking-tight text-neutral-950 sm:text-3xl"
              style={{ fontFamily: FONT, letterSpacing: '-0.02em' }}
            >
              Coba RuangBaru bersama tim Anda
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-neutral-600">
              Mulai gratis dan rasakan bagaimana pekerjaan tim terasa lebih ringan saat semuanya
              berada di satu ruang. Punya pertanyaan? Kami senang mendengar dari Anda.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
                style={{ background: BLUE }}
              >
                Coba Gratis
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
