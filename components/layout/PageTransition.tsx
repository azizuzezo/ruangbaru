'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

const variants = {
  initial: { opacity: 0, y: 10, filter: 'blur(2px)' },
  enter: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as [number,number,number,number] } },
  exit: { opacity: 0, y: -6, filter: 'blur(1px)', transition: { duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] as [number,number,number,number] } },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={variants}
        initial="initial"
        animate="enter"
        exit="exit"
        className="h-full w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
