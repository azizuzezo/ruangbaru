import { cn } from '@/lib/utils';

/**
 * Consistent loading placeholder. Use instead of ad-hoc `animate-pulse` divs so
 * every loading state across the app shares the same look and motion.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md bg-muted/60', className)}
      {...props}
    />
  );
}

export { Skeleton };
