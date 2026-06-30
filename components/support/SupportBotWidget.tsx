'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, X, Send, Bot, User, Sparkles,
  CheckCircle2, Mail, Building, HelpCircle, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Message = {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: Date;
};

type Step = 'greeting' | 'ask_name' | 'ask_email' | 'ask_company' | 'submitting' | 'success';

export function SupportBotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>('greeting');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Halo! Selamat datang di RuangBaru. Saya asisten bot Anda. Silakan ketikkan pertanyaan atau kendala yang sedang Anda hadapi di bawah ini.',
      timestamp: new Date(),
    },
  ]);

  // Collected data
  const [question, setQuestion] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');

  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const addMessage = (sender: 'bot' | 'user', text: string) => {
    const newMsg: Message = {
      id: Math.random().toString(36).substring(2, 9),
      sender,
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  const validateEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userText = input.trim();
    setInput('');
    addMessage('user', userText);

    if (step === 'greeting') {
      setQuestion(userText);
      setIsTyping(true);
      setStep('ask_name');
      setTimeout(() => {
        setIsTyping(false);
        addMessage('bot', 'Baik, pertanyaan Anda telah saya catat. Untuk membantu Anda lebih lanjut, boleh tahu siapa nama lengkap Anda?');
      }, 1000);
    } else if (step === 'ask_name') {
      setName(userText);
      setIsTyping(true);
      setStep('ask_email');
      setTimeout(() => {
        setIsTyping(false);
        addMessage('bot', `Salam kenal, ${userText}! Selanjutnya, mohon masukkan alamat email aktif Anda agar kami dapat menghubungi Anda kembali.`);
      }, 1000);
    } else if (step === 'ask_email') {
      if (!validateEmail(userText)) {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          addMessage('bot', 'Maaf, format email Anda sepertinya kurang tepat. Silakan masukkan alamat email yang valid (contoh: nama@perusahaan.com).');
        }, 800);
        return;
      }
      setEmail(userText);
      setIsTyping(true);
      setStep('ask_company');
      setTimeout(() => {
        setIsTyping(false);
        addMessage('bot', 'Terakhir, apa nama perusahaan atau organisasi Anda? (Ketik "tidak ada" jika tidak ada).');
      }, 1000);
    } else if (step === 'ask_company') {
      const companyName = userText.toLowerCase() === 'tidak ada' ? '' : userText;
      setCompany(companyName);
      setIsTyping(true);
      setStep('submitting');

      // Prepare submission
      setTimeout(async () => {
        try {
          const response = await fetch('/api/support/ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              email,
              company: companyName,
              question,
            }),
          });

          const data = await response.json();
          setIsTyping(false);

          if (response.ok) {
            setStep('success');
            addMessage(
              'bot',
              `Tiket Anda berhasil dibuat! 🎉\n\nDetail tiket telah dikirimkan ke halo@ruangbaru.my.id. Tim dukungan kami akan segera menghubungi Anda kembali melalui email di ${email}.\n\nAda hal lain yang ingin Anda tanyakan?`
            );
          } else {
            addMessage('bot', `Maaf, terjadi kesalahan saat mengirim tiket: ${data.error || 'Silakan coba lagi beberapa saat lagi.'}`);
            setStep('ask_company'); // Let them try submitting again
          }
        } catch (err) {
          setIsTyping(false);
          addMessage('bot', 'Maaf, terjadi kesalahan koneksi. Pastikan Anda terhubung ke internet dan coba kirim kembali pesan terakhir Anda.');
          setStep('ask_company');
        }
      }, 1500);
    } else if (step === 'success') {
      // If they ask a new question after success, reset the flow
      setQuestion(userText);
      setName('');
      setEmail('');
      setCompany('');
      setIsTyping(true);
      setStep('ask_name');
      setTimeout(() => {
        setIsTyping(false);
        addMessage('bot', 'Saya telah mencatat pertanyaan baru Anda. Siapa nama lengkap Anda?');
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const resetChat = () => {
    setStep('greeting');
    setQuestion('');
    setName('');
    setEmail('');
    setCompany('');
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'bot',
        text: 'Halo kembali! Silakan ketikkan pertanyaan atau kendala baru Anda di bawah ini.',
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="mb-4 flex h-[520px] w-[360px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-md sm:w-[400px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-primary to-violet-600 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                  <Bot className="h-5 w-5 text-white" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold tracking-wide">Asisten RuangBaru</h3>
                  <p className="text-[10px] text-white/80">Online · Siap membantu</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((msg) => {
                const isBot = msg.sender === 'bot';
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex items-start gap-2.5 max-w-[85%]',
                      isBot ? 'self-start' : 'self-end ml-auto flex-row-reverse'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold shadow-sm',
                        isBot
                          ? 'bg-primary/10 text-primary'
                          : 'bg-gradient-to-tr from-primary to-violet-600 text-white'
                      )}
                    >
                      {isBot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>
                    <div className="space-y-1">
                      <div
                        className={cn(
                          'rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed shadow-sm whitespace-pre-wrap',
                          isBot
                            ? 'bg-muted/50 text-foreground rounded-tl-none border border-border/40'
                            : 'bg-primary text-white rounded-tr-none'
                        )}
                      >
                        {msg.text}
                      </div>
                      <span className="block text-[9px] text-muted-foreground/60 px-1">
                        {msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex items-start gap-2.5 max-w-[85%]">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-sm">
                    <Bot className="h-4 w-4 animate-pulse" />
                  </div>
                  <div className="rounded-2xl rounded-tl-none bg-muted/50 border border-border/40 px-4 py-3 text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    <span>Sedang menulis...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Footer / Input */}
            <div className="border-t border-border/60 bg-muted/20 p-4">
              <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-background px-3 py-1.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={
                    step === 'greeting'
                      ? 'Tulis pertanyaan Anda...'
                      : step === 'ask_name'
                      ? 'Nama lengkap Anda...'
                      : step === 'ask_email'
                      ? 'Alamat email Anda...'
                      : step === 'ask_company'
                      ? 'Nama perusahaan Anda...'
                      : 'Ketik pesan...'
                  }
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/65 focus:outline-none"
                  disabled={step === 'submitting'}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || step === 'submitting'}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 disabled:bg-muted-foreground/20 disabled:text-muted-foreground/40 transition-colors shadow-sm"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-2.5 flex items-center justify-between px-1">
                <p className="text-[9px] text-muted-foreground/60 flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5 text-primary" /> Tiket akan dikirim ke halo@ruangbaru.my.id
                </p>
                {step !== 'greeting' && step !== 'submitting' && (
                  <button
                    onClick={resetChat}
                    className="text-[9px] font-bold text-primary hover:underline"
                  >
                    Mulai Ulang
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex h-12 items-center gap-2 rounded-full px-4 text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300',
          isOpen
            ? 'bg-muted text-muted-foreground'
            : 'bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90'
        )}
      >
        {isOpen ? (
          <>
            <X className="h-5 w-5" />
            <span className="text-xs font-bold">Tutup</span>
          </>
        ) : (
          <>
            <MessageSquare className="h-5 w-5 animate-pulse" />
            <span className="text-xs font-bold">Tanya Asisten</span>
          </>
        )}
      </motion.button>
    </div>
  );
}
