import type { Metadata } from 'next';
import { AuthShowcase } from '@/components/landing/AuthShowcase';
import { AuthTopBar, AuthFooterNote } from '@/components/auth/AuthLayoutChrome';
import { NOINDEX } from '@/lib/seo';

// Account/auth flows have no unique content for search engines and reset
// links carry sensitive tokens — keep them out of the index (still crawlable).
export const metadata: Metadata = NOINDEX;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen">

        {/* ── Left panel — animated product showcase ─────────── */}
        <div className="hidden lg:block lg:w-[48%] xl:w-[46%]">
          <AuthShowcase />
        </div>

        {/* ── Right panel — auth form ────────────────────────── */}
        <div className="flex flex-1 flex-col bg-white">
          {/* Top nav */}
          <AuthTopBar />

          {/* Form content */}
          <div className="flex flex-1 items-center justify-center px-6 py-8">
            <div className="w-full max-w-[380px]">
              {children}
            </div>
          </div>

          {/* Bottom */}
          <div className="px-6 py-5 sm:px-10">
            <AuthFooterNote />
          </div>
        </div>

      </div>
    </div>
  );
}
