'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';

const BLUE = '#106CD8';
const TEAL = '#10B29F';
const FONT_BODY = "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
const E = [0.22, 1, 0.36, 1] as [number, number, number, number];

type Msg = { id: number; from: 'bot' | 'user'; text: string };

/* ── Knowledge base (rule-based; runs fully in the browser) ──────
   Note: answers intentionally never reference internal tech/backend. */
type Entry = { patterns: string[]; answer: string };

const KB: Entry[] = [
  {
    patterns: ['halo', 'hai', 'hi', 'hello', 'pagi', 'siang', 'sore', 'malam', 'assalam'],
    answer: 'Halo! 👋 Saya asisten RuangBaru. Ada yang ingin Anda tahu tentang produk kami? Pilih pertanyaan di bawah atau ketik langsung ya.',
  },
  {
    patterns: ['apa itu', 'apa sih', 'tentang ruangbaru', 'ruangbaru itu', 'fungsi ruangbaru', 'kegunaan'],
    answer: 'RuangBaru adalah workspace kolaborasi untuk tim Indonesia. Ia menyatukan proyek, tugas, kalender, catatan, dan manajemen tim dalam satu tempat — supaya tim bisa fokus bekerja, bukan berpindah-pindah aplikasi.',
  },
  {
    patterns: ['fitur', 'bisa apa', 'kemampuan', 'modul', 'apa saja'],
    answer: 'Fitur utama RuangBaru: 📋 Papan Kanban, ✅ Manajemen Tugas, 📅 Kalender Tim, 📝 Catatan kolaboratif, dan 👥 Manajemen Tim. Semuanya saling terhubung. Lihat detailnya di halaman Fitur.',
  },
  {
    patterns: ['harga', 'biaya', 'bayar', 'gratis', 'langganan', 'paket', 'berapa', 'mahal'],
    answer: 'RuangBaru bisa dipakai gratis untuk tim hingga 5 anggota dan 3 proyek aktif — tanpa kartu kredit. Untuk tim yang lebih besar, tersedia paket Pro. Detail lengkapnya ada di halaman Harga.',
  },
  {
    patterns: ['mulai', 'daftar', 'register', 'coba', 'buat akun', 'sign up', 'memulai', 'gimana caranya pakai'],
    answer: 'Mudah! Klik "Coba Gratis" atau "Mulai gratis", buat akun, lalu bikin workspace pertama Anda dan undang anggota tim. Setup-nya sekitar 2 menit. 🚀',
  },
  {
    patterns: ['aman', 'keamanan', 'privasi', 'enkripsi', 'data saya', 'keamanan data'],
    answer: 'Keamanan kami utamakan. Data dienkripsi saat transit, setiap workspace terisolasi, dan akses diatur berdasarkan peran sehingga hanya anggota berwenang yang bisa melihat data tertentu. Selengkapnya di Kebijakan Privasi.',
  },
  {
    patterns: ['install', 'download', 'unduh', 'aplikasi', 'web', 'browser', 'hp', 'ponsel', 'mobile'],
    answer: 'Tidak perlu instalasi. RuangBaru berbasis web dan langsung bisa dibuka dari browser apa pun, baik di desktop maupun ponsel.',
  },
  {
    patterns: ['bahasa', 'indonesia', 'english', 'inggris'],
    answer: 'Antarmuka RuangBaru sepenuhnya dalam Bahasa Indonesia, dirancang khusus untuk cara kerja tim dan UMKM di Indonesia. 🇮🇩',
  },
  {
    patterns: ['kontak', 'bantuan', 'hubungi', 'email', 'support', 'cs', 'tanya orang', 'admin'],
    answer: 'Tim kami siap membantu di halo@ruangbaru.my.id. Anda juga bisa mengisi formulir di halaman Kontak. 😊',
  },
  {
    patterns: ['siapa', 'pembuat', 'dibuat', 'duacincin', 'pemilik', 'siapa yang buat'],
    answer: 'RuangBaru dibuat oleh Duacincin (duacincin.id), dengan fokus membantu tim dan UMKM Indonesia bekerja lebih teratur.',
  },
  {
    patterns: ['tim besar', 'enterprise', 'banyak anggota', 'perusahaan besar', 'skala besar', 'khusus'],
    answer: 'Untuk tim besar atau kebutuhan khusus, tersedia paket Khusus dengan onboarding dan dukungan tambahan. Hubungi kami di halo@ruangbaru.my.id untuk mengaturnya.',
  },
  {
    patterns: ['terima kasih', 'makasih', 'thanks', 'thank', 'oke', 'ok', 'sip', 'mantap'],
    answer: 'Sama-sama! 🙌 Kalau ada pertanyaan lain tentang RuangBaru, saya siap membantu.',
  },
];

const FALLBACK =
  'Hmm, saya belum punya jawaban pasti untuk itu. Untuk pertanyaan lebih spesifik, tim kami senang membantu di halo@ruangbaru.my.id. Sementara itu, Anda bisa coba salah satu pertanyaan ini:';

const QUICK_REPLIES = ['Apa itu RuangBaru?', 'Apakah gratis?', 'Fitur apa saja?', 'Bagaimana cara mulai?'];

function answerFor(input: string): string {
  const q = input.toLowerCase();
  let best: Entry | null = null;
  let bestScore = 0;
  for (const entry of KB) {
    const score = entry.patterns.reduce((n, p) => (q.includes(p) ? n + 1 : n), 0);
    if (score > bestScore) { bestScore = score; best = entry; }
  }
  return best ? best.answer : FALLBACK;
}

export function ChatWidget() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { id: 0, from: 'bot', text: 'Halo! 👋 Saya asisten RuangBaru. Mau tanya apa tentang produk kami?' },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const idRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [messages, typing, reduce]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || typing) return;
    const userMsg: Msg = { id: idRef.current++, from: 'user', text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setTyping(true);

    // Ask the AI proxy; gracefully fall back to the local knowledge base.
    let reply = '';
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.slice(-8).map((m) => ({
            role: m.from === 'user' ? 'user' : 'assistant',
            content: m.text,
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.reply && !data?.fallback) reply = String(data.reply);
      }
    } catch {
      /* network error → fallback below */
    }
    if (!reply) reply = answerFor(text);

    setMessages((m) => [...m, { id: idRef.current++, from: 'bot', text: reply }]);
    setTyping(false);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[90] flex flex-col items-end" style={{ fontFamily: FONT_BODY }}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.25, ease: E }}
            className="mb-3 flex h-[30rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ background: `linear-gradient(135deg, ${BLUE}, #0D59B4)` }}>
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <Sparkles className="h-4 w-4" />
                <span className="absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full border-2 border-[#106CD8] bg-emerald-400" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold leading-tight">Asisten RuangBaru</p>
                <p className="text-[11px] text-blue-100">Biasanya membalas instan</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Tutup" className="rounded-md p-1 transition-colors hover:bg-white/15">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-neutral-50/60 px-4 py-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed shadow-sm"
                    style={m.from === 'user'
                      ? { background: BLUE, color: '#fff', borderBottomRightRadius: 4 }
                      : { background: '#fff', color: '#374151', border: '1px solid #F0F0F0', borderBottomLeftRadius: 4 }}
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {typing && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1 rounded-2xl border border-neutral-100 bg-white px-3.5 py-2.5 shadow-sm" style={{ borderBottomLeftRadius: 4 }}>
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-neutral-300"
                        animate={reduce ? undefined : { y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Quick replies (shown until the user asks something) */}
              {messages.length <= 1 && !typing && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {QUICK_REPLIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-600 transition-colors hover:border-[#106CD8] hover:text-[#106CD8]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex items-center gap-2 border-t border-neutral-100 bg-white p-2.5"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tulis pertanyaan…"
                className="min-w-0 flex-1 rounded-full bg-neutral-100 px-4 py-2.5 text-[13px] text-neutral-800 outline-none placeholder:text-neutral-400 focus:bg-neutral-50 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="submit"
                disabled={!input.trim() || typing}
                aria-label="Kirim"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
                style={{ background: BLUE }}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>

            <p className="bg-white pb-2 text-center text-[10px] text-neutral-300">Asisten otomatis · untuk bantuan lanjut: halo@ruangbaru.my.id</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating launcher */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Tutup chat' : 'Tanya tentang RuangBaru'}
        whileHover={reduce ? undefined : { scale: 1.06 }}
        whileTap={reduce ? undefined : { scale: 0.94 }}
        className="relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg"
        style={{ background: `linear-gradient(135deg, ${BLUE}, ${TEAL})` }}
      >
        {!reduce && !open && (
          <span className="absolute inset-0 rounded-full" style={{ animation: 'pulse-ring 2.4s cubic-bezier(0.455,0.03,0.515,0.955) infinite' }} />
        )}
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <MessageCircle className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

export default ChatWidget;
