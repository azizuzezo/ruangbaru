'use client';

import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';

const FONT = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
const FONT_BODY = "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";

const BLUE = '#106CD8';
const YEAR = new Date().getFullYear();

const SECTIONS: { h: string; p: string[] }[] = [
  {
    h: 'Penerimaan ketentuan',
    p: [
      'Dengan membuat akun atau menggunakan RuangBaru, Anda menyetujui Ketentuan Layanan ini. Jika Anda menggunakan RuangBaru atas nama sebuah tim atau organisasi, Anda menyatakan memiliki wewenang untuk menyetujui ketentuan ini atas nama mereka.',
      'Jika Anda tidak menyetujui sebagian atau seluruh ketentuan ini, mohon untuk tidak menggunakan layanan. Ketentuan ini dapat kami perbarui dari waktu ke waktu, dan penggunaan Anda yang berkelanjutan berarti Anda menerima versi terbaru.',
    ],
  },
  {
    h: 'Akun dan tanggung jawab pengguna',
    p: [
      'Anda bertanggung jawab menjaga kerahasiaan kata sandi dan keamanan akun Anda. Segala aktivitas yang terjadi melalui akun Anda menjadi tanggung jawab Anda, jadi pastikan untuk tidak membagikan kredensial kepada pihak yang tidak berwenang.',
      'Anda juga bertanggung jawab atas konten dan aktivitas di dalam workspace Anda, termasuk anggota yang Anda undang. Jika Anda menduga adanya akses tidak sah ke akun Anda, segera hubungi kami.',
    ],
  },
  {
    h: 'Penggunaan yang dapat diterima',
    p: [
      'Anda setuju untuk tidak menyalahgunakan RuangBaru. Ini termasuk larangan mengunggah atau menyebarkan konten ilegal, melanggar hak orang lain, atau menggunakan layanan untuk tujuan yang melanggar hukum.',
      'Anda juga dilarang melakukan upaya yang dapat merusak, mengganggu, atau membebani layanan secara tidak wajar, seperti percobaan peretasan, akses tidak sah ke sistem, atau penyebaran perangkat lunak berbahaya.',
    ],
  },
  {
    h: 'Paket dan langganan',
    p: [
      'RuangBaru menyediakan paket gratis yang ditujukan untuk tim kecil, serta paket berbayar dengan fitur tambahan. Paket berbayar ditagih sesuai dengan paket yang Anda pilih dan siklus penagihan yang berlaku.',
      'Anda dapat membatalkan langganan kapan saja, dan pembatalan akan berlaku pada akhir periode penagihan berjalan. Jika ada perubahan harga, kami akan memberitahukannya kepada Anda terlebih dahulu sebelum perubahan tersebut berlaku.',
    ],
  },
  {
    h: 'Konten dan kepemilikan',
    p: [
      'Anda memiliki konten yang Anda dan tim Anda buat di dalam RuangBaru, termasuk proyek, tugas, catatan, dan lampiran. Kami tidak mengklaim kepemilikan atas konten tersebut.',
      'Dengan menggunakan layanan, Anda memberikan RuangBaru lisensi terbatas yang diperlukan semata-mata untuk menyimpan, menampilkan, dan mengoperasikan layanan bagi Anda dan tim Anda. Lisensi ini tidak memberi kami hak untuk menggunakan konten Anda di luar tujuan menjalankan layanan.',
    ],
  },
  {
    h: 'Ketersediaan dan perubahan layanan',
    p: [
      'RuangBaru masih berada di tahap awal pengembangan. Karena itu, fitur dapat berubah, ditambah, atau dihapus seiring berkembangnya produk, dan kami akan berupaya mengomunikasikan perubahan penting.',
      'Kami berusaha menjaga layanan tetap tersedia, tetapi tidak menjamin layanan akan selalu bebas gangguan. Sesekali mungkin ada pemeliharaan terjadwal atau gangguan tak terduga.',
    ],
  },
  {
    h: 'Penghentian dan penangguhan akun',
    p: [
      'Anda dapat berhenti menggunakan RuangBaru dan menghapus akun Anda kapan saja. Kami juga berhak menangguhkan atau menghentikan akun yang melanggar ketentuan ini atau menyalahgunakan layanan.',
      'Jika memungkinkan, kami akan memberi pemberitahuan sebelum penangguhan, kecuali dalam kasus yang membutuhkan tindakan segera untuk melindungi pengguna lain atau integritas layanan.',
    ],
  },
  {
    h: 'Batasan tanggung jawab dan penafian jaminan',
    p: [
      'Layanan disediakan "sebagaimana adanya" tanpa jaminan tersurat maupun tersirat. Kami tidak menjamin bahwa layanan akan selalu memenuhi kebutuhan spesifik Anda atau bebas dari kesalahan.',
      'Sepanjang diizinkan oleh hukum yang berlaku, RuangBaru dan Duacincin tidak bertanggung jawab atas kerugian tidak langsung, insidental, atau konsekuensial yang timbul dari penggunaan atau ketidakmampuan menggunakan layanan.',
    ],
  },
  {
    h: 'Hukum yang berlaku',
    p: [
      'Ketentuan Layanan ini diatur dan ditafsirkan berdasarkan hukum yang berlaku di Republik Indonesia.',
      'Setiap perselisihan yang timbul terkait penggunaan RuangBaru akan diupayakan diselesaikan secara musyawarah terlebih dahulu sebelum ditempuh jalur hukum sesuai ketentuan yang berlaku.',
    ],
  },
  {
    h: 'Kontak',
    p: [
      'Jika Anda memiliki pertanyaan mengenai Ketentuan Layanan ini, silakan hubungi kami di halo@ruangbaru.my.id.',
      'RuangBaru adalah produk yang dibuat oleh Duacincin. Kami akan dengan senang hati membantu menjawab pertanyaan Anda terkait penggunaan layanan.',
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white antialiased" style={{ fontFamily: FONT_BODY }}>
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
              Ketentuan Layanan
            </div>
            <h1
              className="mt-3 text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl"
              style={{ fontFamily: FONT, letterSpacing: '-0.02em' }}
            >
              Ketentuan Layanan
            </h1>
            <p className="mt-3 text-sm text-neutral-500">Terakhir diperbarui: {YEAR}</p>
            <p className="mt-5 text-base leading-7 text-neutral-600">
              Ketentuan ini mengatur penggunaan RuangBaru, ruang kerja kolaboratif untuk tim. Mohon
              baca dengan saksama sebelum menggunakan layanan kami.
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
                  className="text-xl font-black tracking-tight text-neutral-950"
                  style={{ fontFamily: FONT, letterSpacing: '-0.02em' }}
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
