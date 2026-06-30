'use client';

import { useEffect, useState } from 'react';
import { motion as m, AnimatePresence } from 'framer-motion';
import { Check, Loader2, ShieldAlert } from 'lucide-react';
import { useUIStore as useUI } from '@/lib/stores/ui-store';
import { createClient } from '@/lib/supabase/client';

export function LogoutOverlay() {
  const isLoggingOut = useUI((state) => state.isLoggingOut);
  const setIsLoggingOut = useUI((state) => state.setIsLoggingOut);
  const [phase, setPhase] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    if (!isLoggingOut) {
      setPhase('loading');
      return;
    }

    async function performLogout() {
      try {
        const supabase = createClient();
        // Wait at least 1.2s for the beautiful loading animation to be appreciated
        const minWait = new Promise((resolve) => setTimeout(resolve, 1200));
        
        // Call Supabase signOut
        const logoutPromise = supabase.auth.signOut();
        
        await Promise.all([logoutPromise, minWait]);
        
        // Transition to success phase
        setPhase('success');
        
        // Show success phase for 1.5 seconds before redirecting
        setTimeout(() => {
          setIsLoggingOut(false);
          window.location.href = '/login';
        }, 1500);
      } catch (err) {
        console.error('Logout error:', err);
        setIsLoggingOut(false);
        window.location.href = '/login'; // Fallback redirect anyway
      }
    }

    performLogout();
  }, [isLoggingOut, setIsLoggingOut]);

  return (
    <AnimatePresence>
      {isLoggingOut && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-xl"
        >
          <m.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-8 text-center shadow-2xl"
          >
            <AnimatePresence mode="wait">
              {phase === 'loading' ? (
                <m.div
                  key="loading"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center space-y-5"
                >
                  {/* Premium Spinner */}
                  <div className="relative flex h-16 w-16 items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-display text-lg font-extrabold text-foreground tracking-tight">
                      Mengamankan Sesi Anda
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed px-4">
                      Sedang keluar dari akun RuangBaru Anda dengan aman...
                    </p>
                  </div>
                </m.div>
              ) : (
                <m.div
                  key="success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center space-y-5"
                >
                  {/* Glowing Success Checkmark */}
                  <m.div
                    initial={{ scale: 0.5, rotate: -10 }}
                    animate={{ scale: [1, 1.1, 1], rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  >
                    <Check className="h-8 w-8 stroke-[3]" />
                  </m.div>

                  <div className="space-y-2">
                    <h3 className="font-display text-lg font-extrabold text-foreground tracking-tight">
                      Keluar Berhasil
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed px-4">
                      Terima kasih atas dedikasi dan kerja keras Anda hari ini. Sampai jumpa kembali!
                    </p>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
