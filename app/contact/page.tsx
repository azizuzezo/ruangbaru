'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Building2, Send, Check, MessageSquare } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';

const FONT = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
const FONT_BODY = "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";

const BLUE = '#106CD8';
const TEAL = '#10B29F';

export default function ContactPage() {
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [pesan, setPesan] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !pesan.trim()) {
      setError('Mohon lengkapi nama dan pesan Anda.');
      return;
    }
    if (!email.includes('@')) {
      setError('Alamat email tidak valid.');
      return;
    }
    setError('');
    setSent(true);
  };

  const inputClass =
    'h-11 w-full rounded-xl border border-neutral-200 px-3.5 text-sm focus:border-[#106CD8] focus:outline-none';

  return (
    <div className="min-h-screen bg-white antialiased" style={{ fontFamily: FONT_BODY }}>
      <MarketingHeader />
      <main>
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sm font-semibold" style={{ color: BLUE }}>
              Kontak
            </p>
            <h1
              className="mt-3 text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl"
              style={{ fontFamily: FONT, letterSpacing: '-0.02em' }}
            >
              Hubungi Kami
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-600">
              Punya pertanyaan, masukan, atau ingin menjajaki kerja sama? Kami senang mendengar dari
              Anda. RuangBaru masih di tahap awal pengembangan, jadi setiap masukan sangat berarti
              untuk arah produk ke depan.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            {/* Info (left) */}
            <div className="space-y-5">
              <div className="rounded-2xl border border-neutral-200 p-6">
                <div className="flex items-center gap-2.5 text-sm font-semibold" style={{ color: BLUE }}>
                  <Mail className="h-4 w-4" />
                  Dukungan
                </div>
                <p className="mt-3 text-sm leading-7 text-neutral-600">
                  Butuh bantuan menggunakan RuangBaru atau menemukan kendala? Kirim email ke tim
                  dukungan kami dan kami akan membalas secepat yang kami bisa.
                </p>
                <a
                  href="mailto:halo@ruangbaru.my.id"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#EBF3FD] px-3.5 py-2.5 text-sm font-semibold transition-colors hover:opacity-90"
                  style={{ color: BLUE }}
                >
                  <Mail className="h-4 w-4" />
                  halo@ruangbaru.my.id
                </a>
              </div>

              <div className="rounded-2xl border border-neutral-200 p-6">
                <div className="flex items-center gap-2.5 text-sm font-semibold" style={{ color: TEAL }}>
                  <Building2 className="h-4 w-4" />
                  Pertanyaan bisnis & kerja sama
                </div>
                <p className="mt-3 text-sm leading-7 text-neutral-600">
                  Untuk pertanyaan bisnis, kemitraan, atau peluang kerja sama, hubungi kami juga
                  melalui email yang sama. RuangBaru adalah produk yang dibuat oleh{' '}
                  <a
                    href="https://duacincin.id"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-neutral-800 underline-offset-2 hover:underline"
                  >
                    Duacincin (duacincin.id)
                  </a>
                  .
                </p>
                <a
                  href="mailto:halo@ruangbaru.my.id"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold transition-colors hover:opacity-80"
                  style={{ color: BLUE }}
                >
                  <MessageSquare className="h-4 w-4" />
                  halo@ruangbaru.my.id
                </a>
              </div>
            </div>

            {/* Form (right) */}
            <div className="rounded-3xl border border-neutral-200 bg-neutral-50/60 p-7 sm:p-8">
              <h2
                className="text-lg font-black tracking-tight text-neutral-950 sm:text-xl"
                style={{ fontFamily: FONT, letterSpacing: '-0.02em' }}
              >
                Kirim pesan
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Isi formulir di bawah ini dan kami akan menghubungi Anda kembali melalui email.
              </p>

              <AnimatePresence mode="wait">
                {sent ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="mt-6 flex flex-col items-center rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 18 }}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white"
                    >
                      <Check className="h-6 w-6" />
                    </motion.div>
                    <p className="mt-4 text-base font-semibold text-emerald-800">
                      Terima kasih! Pesan Anda sudah kami terima.
                    </p>
                    <p className="mt-1.5 text-sm leading-6 text-emerald-700">
                      Kami akan membalas melalui email yang Anda berikan secepatnya.
                    </p>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={submit}
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mt-6 space-y-4"
                    noValidate
                  >
                    <div>
                      <label htmlFor="nama" className="mb-1.5 block text-sm font-medium text-neutral-700">
                        Nama
                      </label>
                      <input
                        id="nama"
                        type="text"
                        value={nama}
                        onChange={(e) => setNama(e.target.value)}
                        placeholder="Nama Anda"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-neutral-700">
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@perusahaan.com"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="pesan" className="mb-1.5 block text-sm font-medium text-neutral-700">
                        Pesan
                      </label>
                      <textarea
                        id="pesan"
                        value={pesan}
                        onChange={(e) => setPesan(e.target.value)}
                        placeholder="Tuliskan pesan Anda di sini..."
                        rows={5}
                        className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm focus:border-[#106CD8] focus:outline-none"
                      />
                    </div>

                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm font-medium text-red-600"
                      >
                        {error}
                      </motion.p>
                    )}

                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
                      style={{ background: BLUE }}
                    >
                      <Send className="h-4 w-4" />
                      Kirim Pesan
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
