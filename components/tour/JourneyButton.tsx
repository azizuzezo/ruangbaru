'use client';

import { Compass } from 'lucide-react';
import { useTour } from './TourProvider';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/useT';

/** Always-accessible button to (re)play the guided product tour. */
export function JourneyButton({ className }: { className?: string }) {
  const { start } = useTour();
  const t = useT('tour');
  return (
    <button
      data-tour="journey"
      onClick={start}
      className={cn(
        'group inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-all hover:border-primary/40 hover:shadow-md active:scale-95',
        className,
      )}
    >
      <Compass className="h-3.5 w-3.5 text-primary transition-transform group-hover:rotate-[20deg]" />
      {t('tourJourneyButtonLabel')}
    </button>
  );
}
