'use client';

import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useT } from '@/lib/i18n/useT';

/**
 * Route-level fallback for every workspace page. Without it a click in the
 * sidebar waited on the server with nothing on screen; now the new page's
 * frame appears at once with a labelled spinner while its data loads.
 */
export default function WorkspaceLoading() {
  const t = useT('common');
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="flex items-center gap-2.5 text-xs font-semibold text-primary">
        <Spinner className="size-4" label={t('loadingPage')} />
        <span aria-hidden="true">{t('loadingPage')}</span>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-3 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
