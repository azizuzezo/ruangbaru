'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface LogoProps {
  /** 'wordmark' shows the full RuangBaru lockup; 'icon' shows just the RB mark. */
  variant?: 'wordmark' | 'icon';
  /**
   * Which wordmark to render.
   * - 'auto' (default): follow the theme — colorful on light, white on dark.
   * - 'light': always the colorful wordmark (use on surfaces that stay light
   *   regardless of theme, e.g. the marketing header/footer and auth nav).
   * - 'dark': always the white silhouette (use on permanently dark surfaces).
   */
  tone?: 'auto' | 'light' | 'dark';
  /** Rendered height in px; width scales to the logo's aspect ratio. */
  height?: number;
  className?: string;
  priority?: boolean;
}

// Trimmed asset aspect ratios (width / height)
const WORDMARK_RATIO = 755 / 191;
const ICON_RATIO = 658 / 586;

export function Logo({ variant = 'wordmark', tone = 'auto', height = 30, className, priority }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (variant === 'icon') {
    const width = Math.round(height * ICON_RATIO);
    return (
      <Image
        src="/logo-icon.png"
        alt="RuangBaru"
        width={width}
        height={height}
        priority={priority}
        className={cn('object-contain', className)}
      />
    );
  }

  const width = Math.round(height * WORDMARK_RATIO);
  // Pick the wordmark asset. With tone='auto' we follow the theme (white
  // silhouette in dark mode for legibility); 'light'/'dark' pin it explicitly
  // for surfaces whose background doesn't track the theme. Before mount we
  // don't know the theme, so 'auto' renders the colorful version (matches SSR /
  // light default) to avoid a white-on-white flash.
  const useDarkWordmark =
    tone === 'dark' || (tone === 'auto' && mounted && resolvedTheme === 'dark');
  const src = useDarkWordmark ? '/logo-wordmark-dark.png' : '/logo-wordmark.png';

  return (
    <Image
      src={src}
      alt="RuangBaru — UMKM Workspace"
      width={width}
      height={height}
      priority={priority}
      className={cn('object-contain', className)}
    />
  );
}

export default Logo;
