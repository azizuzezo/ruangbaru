import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RuangBaru — Workspace untuk Tim Indonesia',
    short_name: 'RuangBaru',
    description: 'Proyek, tugas, kalender, catatan, dan rapat video dalam satu workspace untuk tim Indonesia.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#106CD8',
    lang: 'id',
    icons: [
      { src: '/favicon.png', sizes: '512x512', type: 'image/png' },
      { src: '/logo-icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
