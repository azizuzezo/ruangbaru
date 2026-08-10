'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

// Deliberately opacity-only — no `y`/`filter`. Framer Motion keeps whichever
// transform/filter properties a variant ever touches as a permanent inline
// style at rest (e.g. `transform: translateY(0px)`), and a transformed or
// filtered ancestor creates a new containing block for `position: fixed`
// descendants. dnd-kit's DragOverlay is exactly such a descendant, so a
// slide+blur transition here silently detached every drag preview from the
// cursor by a constant offset — reported as Kanban cards not tracking the
// pointer. Keep this animation limited to opacity so no page under this
// wrapper ever re-introduces that class of bug.
const variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
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
