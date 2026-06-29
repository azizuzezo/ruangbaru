'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface LogoProps {
  /** 'wordmark' shows the full RuangBaru lockup; 'icon' shows just the RB mark. */
  variant?: 'wordmark' | 'icon';
  /** Rendered height in px; width scales to the logo's aspect ratio. */
  height?: number;
  className?: string;
  priority?: boolean;
}

// Trimmed asset aspect ratios (width / height)
const WORDMARK_RATIO = 755 / 191;
const ICON_RATIO = 658 / 586;

export function Logo({ variant = 'wordmark', height = 30, className, priority }: LogoProps) {
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
  // Use the white silhouette in dark mode for legibility. Before mount we don't
  // know the theme, so render the colorful version (matches SSR / light default).
  const src = mounted && resolvedTheme === 'dark' ? '/logo-wordmark-dark.png' : '/logo-wordmark.png';

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
