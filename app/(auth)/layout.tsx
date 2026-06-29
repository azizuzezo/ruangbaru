import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { AuthShowcase } from '@/components/landing/AuthShowcase';

const FONT = "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: FONT }}>
      <div className="flex min-h-screen">

        {/* ── Left panel — animated product showcase ─────────── */}
        <div className="hidden lg:block lg:w-[48%] xl:w-[46%]">
          <AuthShowcase />
        </div>

        {/* ── Right panel — auth form ────────────────────────── */}
        <div className="flex flex-1 flex-col bg-white">
          {/* Top nav */}
          <div className="flex items-center justify-between px-6 py-5 sm:px-10">
            <Link href="/" className="flex items-center transition-transform hover:scale-[1.03]" aria-label="RuangBaru — beranda">
              <Logo variant="wordmark" tone="light" height={30} priority />
            </Link>
            <Link href="/" className="text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-800">
              ← Kembali ke beranda
            </Link>
          </div>

          {/* Form content */}
          <div className="flex flex-1 items-center justify-center px-6 py-8">
            <div className="w-full max-w-[380px]">
              {children}
            </div>
          </div>

          {/* Bottom */}
          <div className="px-6 py-5 sm:px-10">
            <p className="text-center text-xs text-neutral-400">
              &copy; {new Date().getFullYear()} RuangBaru &mdash; ruangbaru.my.id
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
