'use client';

import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';

const E = [0.22, 1, 0.36, 1] as [number, number, number, number];

// Marketing + auth surfaces get a quick macOS-style enter transition.
// The authenticated app ([workspace], dashboard, etc.) is left untouched so
// its own loading/layout behavior isn't double-animated.
const ANIMATED = new Set([
  '/', '/fitur', '/cara-kerja', '/harga', '/about', '/contact',
  '/privacy', '/terms', '/features', '/pricing', '/how-it-works',
  '/login', '/register', '/forgot-password', '/reset-password',
]);

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  if (reduce || !ANIMATED.has(pathname)) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: E }}
    >
      {children}
    </motion.div>
  );
}
