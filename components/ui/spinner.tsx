import { cn } from '@/lib/utils';

/**
 * The one spinner used across the app: a faint full ring with a rounded
 * arc travelling over it, inheriting `currentColor` so it reads on any
 * surface (buttons, cards, the blue hero). Pass `label` when the spinner
 * is the only thing announcing the wait to screen readers.
 */
export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span
      data-spinner=""
      role={label ? 'status' : undefined}
      className={cn('inline-flex size-4 shrink-0', className)}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="size-full animate-spin motion-reduce:animate-[spin_1.6s_linear_infinite]"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.22" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
