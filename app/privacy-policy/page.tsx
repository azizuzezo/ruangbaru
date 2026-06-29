'use client';

import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';

const FONT = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
const FONT_BODY = "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";

const BLUE = '#106CD8';
const YEAR = new Date().getFullYear();

const SECTIONS: { h: string; p: string[] }[] = [
  {
    h: 'Data yang kami kumpulkan',
    p: [
      'Kami mengumpulkan data akun yang Anda berikan saat mendaftar dan menggunakan RuangBaru, seperti nama dan alamat email. Data ini diperlukan untuk membuat akun, mengidentifikasi Anda di dalam workspace, dan mengirimkan komunikasi penting terkait layanan.',
      'Kami juga menyimpan konten workspace yang Anda dan tim Anda buat, termasuk proyek, tugas, catatan, komentar, serta lampiran yang diunggah. Konten ini adalah milik Anda dan kami simpan agar layanan dapat berfungsi.',
      'Selain itu, kami mengumpulkan data teknis secara otomatis, seperti log aktivitas, alamat IP, jenis perangkat, dan informasi peramban. Data ini membantu kami menjaga keamanan, mendiagnosis masalah, dan memahami cara layanan digunakan.',
    ],
  },
  {
    h: 'Cara kami menggunakan data',
    p: [
      'Data Anda kami gunakan terutama untuk menyediakan dan menjalankan layanan RuangBaru, seperti menyimpan pekerjaan tim, menampilkan tugas, dan menjaga sinkronisasi antar anggota workspace.',
      'Kami juga menggunakan data untuk meningkatkan layanan, memperbaiki bug, mengembangkan fitur baru, serta menjaga keamanan platform dari penyalahgunaan dan akses tidak sah.',
      'Sebagian data digunakan untuk komunikasi penting, misalnya verifikasi akun, pemberitahuan terkait keamanan, perubahan layanan, atau tagihan. Kami tidak menggunakan data Anda untuk iklan pihak ketiga.',
    ],
  },
  {
    h: 'Autentikasi dan penyimpanan data',
    p: [
      'RuangBaru menggunakan penyedia infrastruktur cloud tepercaya untuk autentikasi pengguna dan penyimpanan data. Artinya, proses login, pengelolaan sesi, serta penyimpanan data akun dan konten workspace dijalankan di atas infrastruktur yang memenuhi standar keamanan industri.',
      'Data disimpan dengan aman sesuai praktik keamanan standar industri. Penyedia infrastruktur tersebut bertindak sebagai pemroses data atas nama kami, dan kami hanya membagikan data seperlunya agar layanan dapat berfungsi.',
    ],
  },
  {
    h: 'Pengiriman email',
    p: [
      'Kami menggunakan layanan pengiriman email pihak ketiga tepercaya untuk mengirim email transaksional. Ini mencakup email verifikasi akun, undangan ke workspace, notifikasi penting, dan permintaan setel ulang kata sandi.',
      'Untuk mengirim email tersebut, alamat email Anda diproses oleh penyedia layanan pengiriman email sebagai pemroses data. Kami tidak menggunakan layanan ini untuk mengirim materi pemasaran tanpa persetujuan Anda.',
    ],
  },
  {
    h: 'Cookie dan sesi',
    p: [
      'Kami menggunakan cookie dan teknologi serupa untuk menjaga sesi login Anda tetap aktif, mengingat preferensi dasar, dan memastikan layanan berfungsi dengan benar.',
      'Cookie sesi ini bersifat esensial untuk pengoperasian RuangBaru. Tanpa cookie tersebut, Anda perlu masuk berulang kali dan beberapa fitur mungkin tidak berfungsi sebagaimana mestinya.',
    ],
  },
  {
    h: 'Keamanan',
    p: [
      'Kami menerapkan langkah keamanan teknis dan organisasi untuk melindungi data Anda, termasuk enkripsi data saat transit, isolasi antar workspace, dan kontrol akses berdasarkan peran agar hanya anggota yang berwenang dapat mengakses data tertentu.',
      'Meskipun kami berupaya melindungi data dengan sebaik-baiknya, tidak ada sistem yang sepenuhnya kebal. Kami mendorong Anda untuk menjaga kerahasiaan kata sandi dan segera memberi tahu kami jika menemukan aktivitas mencurigakan.',
    ],
  },
  {
    h: 'Penyimpanan dan retensi data',
    p: [
      'Kami menyimpan data Anda selama akun masih aktif dan selama diperlukan untuk menyediakan layanan. Konten workspace tetap tersimpan agar tim Anda dapat terus mengaksesnya.',
      'Jika Anda menghapus akun, kami akan menghapus atau menganonimkan data pribadi Anda dalam jangka waktu yang wajar, kecuali jika kami diwajibkan menyimpannya untuk memenuhi kewajiban hukum. Anda dapat meminta penghapusan akun kapan saja melalui kontak kami.',
    ],
  },
  {
    h: 'Berbagi data',
    p: [
      'Kami tidak menjual data pribadi Anda kepada siapa pun. Data Anda hanya dibagikan kepada penyedia layanan tepercaya yang membantu kami menjalankan RuangBaru, misalnya untuk infrastruktur penyimpanan dan autentikasi serta pengiriman email transaksional.',
      'Pembagian tersebut dilakukan seperlunya dan hanya untuk tujuan menjalankan layanan. Kami juga dapat mengungkapkan data jika diwajibkan oleh hukum atau untuk melindungi hak dan keamanan pengguna.',
    ],
  },
  {
    h: 'Hak Anda',
    p: [
      'Anda memiliki hak untuk mengakses data pribadi yang kami simpan, memperbaiki data yang tidak akurat, meminta penghapusan data, serta meminta ekspor data Anda dalam format yang dapat dibaca.',
      'Untuk menggunakan hak-hak tersebut, silakan hubungi kami melalui email. Kami akan menanggapi permintaan Anda sesuai dengan ketentuan yang berlaku.',
    ],
  },
  {
    h: 'Perubahan kebijakan dan kontak',
    p: [
      'Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu seiring berkembangnya layanan. Jika terdapat perubahan penting, kami akan memberi tahu Anda melalui email atau pemberitahuan di dalam aplikasi.',
      'Jika Anda memiliki pertanyaan tentang kebijakan ini atau cara kami menangani data, hubungi kami di halo@ruangbaru.my.id.',
    ],
  },
];

export default function PrivacyPolicyPage() {
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
              <Shield className="h-4 w-4" />
              Kebijakan Privasi
            </div>
            <h1
              className="mt-3 text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl"
              style={{ fontFamily: FONT, letterSpacing: '-0.02em' }}
            >
              Kebijakan Privasi
            </h1>
            <p className="mt-3 text-sm text-neutral-500">Terakhir diperbarui: {YEAR}</p>
            <p className="mt-5 text-base leading-7 text-neutral-600">
              Kebijakan ini menjelaskan data apa yang kami kumpulkan saat Anda menggunakan
              RuangBaru, bagaimana kami menggunakannya, dan pilihan yang Anda miliki. RuangBaru
              adalah ruang kerja kolaboratif untuk tim, dan kami berkomitmen menjaga data Anda
              dengan transparan.
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
