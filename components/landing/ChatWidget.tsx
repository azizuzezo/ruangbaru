'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles, Loader2, Check } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';

const BLUE = '#106CD8';
const TEAL = '#10B29F';
const FONT_BODY = "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif";
const E = [0.22, 1, 0.36, 1] as [number, number, number, number];

type Msg = { id: number; from: 'bot' | 'user'; text: string };

// `answerKey` is a translation key resolved with t() inside the component
// (via answerFor) so the bot's replies follow the active locale. `patterns`
// stay Indonesian — they only drive keyword matching against raw user input
// and are never rendered.
type Entry = { patterns: string[]; answerKey: string };

const KB: Entry[] = [
  {
    patterns: ['halo', 'hai', 'hi', 'hello', 'pagi', 'siang', 'sore', 'malam', 'assalam'],
    answerKey: 'chatKbGreeting',
  },
  {
    patterns: ['apa itu', 'apa sih', 'tentang ruangbaru', 'ruangbaru itu', 'fungsi ruangbaru', 'kegunaan'],
    answerKey: 'chatKbAbout',
  },
  {
    patterns: ['fitur', 'bisa apa', 'kemampuan', 'modul', 'apa saja'],
    answerKey: 'chatKbFeatures',
  },
  {
    patterns: ['harga', 'biaya', 'bayar', 'gratis', 'langganan', 'paket', 'berapa', 'mahal'],
    answerKey: 'chatKbPricing',
  },
  {
    patterns: ['mulai', 'daftar', 'register', 'coba', 'buat akun', 'sign up', 'memulai', 'gimana caranya pakai'],
    answerKey: 'chatKbGetStarted',
  },
  {
    patterns: ['aman', 'keamanan', 'privasi', 'enkripsi', 'data saya', 'keamanan data'],
    answerKey: 'chatKbSecurity',
  },
  {
    patterns: ['install', 'download', 'unduh', 'aplikasi', 'web', 'browser', 'hp', 'ponsel', 'mobile'],
    answerKey: 'chatKbInstall',
  },
  {
    patterns: ['bahasa', 'indonesia', 'english', 'inggris'],
    answerKey: 'chatKbLanguage',
  },
  {
    patterns: ['kontak', 'bantuan', 'hubungi', 'email', 'support', 'cs', 'tanya orang', 'admin', 'tiket'],
    answerKey: 'chatKbContact',
  },
  {
    patterns: ['siapa', 'pembuat', 'dibuat', 'duacincin', 'pemilik', 'siapa yang buat'],
    answerKey: 'chatKbCreator',
  },
  {
    patterns: ['tim besar', 'enterprise', 'banyak anggota', 'perusahaan besar', 'skala besar', 'khusus'],
    answerKey: 'chatKbEnterprise',
  },
  {
    patterns: ['terima kasih', 'makasih', 'thanks', 'thank', 'oke', 'ok', 'sip', 'mantap'],
    answerKey: 'chatKbThanks',
  },
];

const QUICK_REPLY_KEYS = ['chatQuickReply1', 'chatQuickReply2', 'chatQuickReply3', 'chatQuickReply4'];

function answerFor(input: string, t: (key: string) => string): string {
  const q = input.toLowerCase();
  let best: Entry | null = null;
  let bestScore = 0;
  for (const entry of KB) {
    const score = entry.patterns.reduce((n, p) => (q.includes(p) ? n + 1 : n), 0);
    if (score > bestScore) { bestScore = score; best = entry; }
  }
  return t(best ? best.answerKey : 'chatFallback');
}

type TicketStep = 'none' | 'ask_question' | 'ask_name' | 'ask_email' | 'ask_company' | 'submitting';

export function ChatWidget() {
  const t = useT('landing');
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { id: 0, from: 'bot', text: t('chatGreeting') },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const idRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Ticketing Flow State
  const [ticketStep, setTicketStep] = useState<TicketStep>('none');
  const [ticketData, setTicketData] = useState({
    question: '',
    name: '',
    email: '',
    company: '',
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [messages, typing, reduce]);

  const validateEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const startTicketFlow = (initialQuestion: string = '') => {
    setTicketStep(initialQuestion ? 'ask_name' : 'ask_question');
    setTicketData({
      question: initialQuestion,
      name: '',
      email: '',
      company: '',
    });

    if (initialQuestion) {
      setMessages((m) => [
        ...m,
        { id: idRef.current++, from: 'user', text: t('chatTicketUserMsgWithQuestion') },
        { id: idRef.current++, from: 'bot', text: t('chatTicketQuestionIntro').replace('{question}', initialQuestion) }
      ]);
    } else {
      setMessages((m) => [
        ...m,
        { id: idRef.current++, from: 'user', text: t('chatTicketUserMsgGeneric') },
        { id: idRef.current++, from: 'bot', text: t('chatTicketAskQuestion') }
      ]);
    }
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || typing) return;

    // Add user message
    const userMsg: Msg = { id: idRef.current++, from: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    // 1. If in Ticketing Flow
    if (ticketStep !== 'none') {
      setTimeout(async () => {
        if (ticketStep === 'ask_question') {
          setTicketData((prev) => ({ ...prev, question: text }));
          setTicketStep('ask_name');
          setMessages((m) => [...m, { id: idRef.current++, from: 'bot', text: t('chatTicketAskName') }]);
          setTyping(false);
        } else if (ticketStep === 'ask_name') {
          setTicketData((prev) => ({ ...prev, name: text }));
          setTicketStep('ask_email');
          setMessages((m) => [...m, { id: idRef.current++, from: 'bot', text: t('chatTicketAskEmail').replace('{name}', text) }]);
          setTyping(false);
        } else if (ticketStep === 'ask_email') {
          if (!validateEmail(text)) {
            setMessages((m) => [...m, { id: idRef.current++, from: 'bot', text: t('chatTicketInvalidEmail') }]);
            setTyping(false);
            return;
          }
          setTicketData((prev) => ({ ...prev, email: text }));
          setTicketStep('ask_company');
          setMessages((m) => [...m, { id: idRef.current++, from: 'bot', text: t('chatTicketAskCompany') }]);
          setTyping(false);
        } else if (ticketStep === 'ask_company') {
          const companyVal = text.toLowerCase() === 'tidak ada' ? '' : text;
          const finalData = { ...ticketData, company: companyVal };
          setTicketData(finalData);
          setTicketStep('submitting');
          setMessages((m) => [...m, { id: idRef.current++, from: 'bot', text: t('chatTicketSubmitting') }]);

          try {
            const res = await fetch('/api/support/ticket', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: finalData.name,
                email: finalData.email,
                company: finalData.company,
                question: finalData.question,
              }),
            });

            if (res.ok) {
              setMessages((m) => [
                ...m,
                {
                  id: idRef.current++,
                  from: 'bot',
                  text: t('chatTicketSuccess').replace('{email}', finalData.email)
                }
              ]);
            } else {
              setMessages((m) => [...m, { id: idRef.current++, from: 'bot', text: t('chatTicketError') }]);
            }
          } catch (err) {
            setMessages((m) => [...m, { id: idRef.current++, from: 'bot', text: t('chatTicketNetworkError') }]);
          } finally {
            setTicketStep('none');
            setTyping(false);
          }
        }
      }, 1000);
      return;
    }

    // 2. If in normal AI Chat mode
    let reply = '';
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].slice(-8).map((m) => ({
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
    if (!reply) reply = answerFor(text, t);

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
            className="mb-3 flex h-[32rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ background: `linear-gradient(135deg, ${BLUE}, #0D59B4)` }}>
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <Sparkles className="h-4 w-4" />
                <span className="absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full border-2 border-[#106CD8] bg-emerald-400" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold leading-tight">{t('chatHeaderTitle')}</p>
                <p className="text-[11px] text-blue-100">{t('chatHeaderSubtitle')}</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label={t('chatCloseAria')} className="rounded-md p-1 transition-colors hover:bg-white/15">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-neutral-50/60 px-4 py-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap"
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
                    {ticketStep === 'submitting' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      [0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-neutral-300"
                          animate={reduce ? undefined : { y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Quick replies (shown until the user asks something) */}
              {messages.length <= 1 && !typing && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {QUICK_REPLY_KEYS.map((qKey) => (
                    <button
                      key={qKey}
                      onClick={() => send(t(qKey))}
                      className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-600 transition-colors hover:border-[#106CD8] hover:text-[#106CD8]"
                    >
                      {t(qKey)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Ticket Shortcut Button */}
            {ticketStep === 'none' && (
              <div className="px-4 pb-2 bg-white">
                <button
                  type="button"
                  onClick={() => startTicketFlow()}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary/30 bg-primary/5 py-2 text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
                >
                  {t('chatTicketButton')}
                </button>
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex items-center gap-2 border-t border-neutral-100 bg-white p-2.5"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  ticketStep === 'ask_question'
                    ? t('chatPlaceholderQuestion')
                    : ticketStep === 'ask_name'
                    ? t('chatPlaceholderName')
                    : ticketStep === 'ask_email'
                    ? t('chatPlaceholderEmail')
                    : ticketStep === 'ask_company'
                    ? t('chatPlaceholderCompany')
                    : t('chatPlaceholderDefault')
                }
                className="min-w-0 flex-1 rounded-full bg-neutral-100 px-4 py-2.5 text-[13px] text-neutral-800 outline-none placeholder:text-neutral-400 focus:bg-neutral-50 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="submit"
                disabled={!input.trim() || typing}
                aria-label={t('chatSendAria')}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
                style={{ background: BLUE }}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>

            <p className="bg-white pb-2 text-center text-[10px] text-neutral-300">{t('chatFooterNote')}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating launcher */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? t('chatCloseChatAria') : t('chatOpenAria')}
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
