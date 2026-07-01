import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'RuangBaru — Workspace untuk Tim Indonesia';

const BLUE = '#106CD8';
const TEAL = '#10B29F';

// Default branded OG image for every page (nested routes can override by
// adding their own opengraph-image.tsx). Ensures link previews on
// WhatsApp/X/LinkedIn/Google always show a proper 1200×630 branded card
// instead of a cropped square logo.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '80px',
          background: '#FFFFFF',
          backgroundImage: `radial-gradient(circle at 85% 20%, ${BLUE}1A, transparent 55%), radial-gradient(circle at 10% 90%, ${TEAL}14, transparent 50%)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 20, height: 20, borderRadius: 6, background: BLUE, display: 'flex' }} />
          <span style={{ fontSize: 40, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.02em' }}>RuangBaru</span>
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 64,
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            color: '#0A0A0A',
            maxWidth: 900,
            display: 'flex',
          }}
        >
          Satu workspace untuk tim Indonesia.
        </div>
        <div style={{ marginTop: 28, fontSize: 28, color: '#525252', maxWidth: 780, display: 'flex' }}>
          Proyek, tugas, kalender, catatan, dan rapat video — dalam satu ruang.
        </div>
      </div>
    ),
    { ...size },
  );
}
