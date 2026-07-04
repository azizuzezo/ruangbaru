import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { googleConfigured, buildAuthUrl, redirectUri, GOOGLE_OAUTH_NONCE_COOKIE } from '@/lib/google/calendar';

/** Kick off the Google OAuth flow. The calendar page links here. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const workspace = url.searchParams.get('workspace') || '';
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL(`/${workspace}/calendar?google=not_configured`, req.url));
  }

  // Bind this flow to the browser that started it, so a crafted callback
  // hit from elsewhere can't link an attacker's Google account into this
  // session's workspace (OAuth login/consent CSRF).
  const nonce = randomBytes(24).toString('base64url');
  const state = Buffer.from(JSON.stringify({ w: workspace, n: nonce })).toString('base64url');

  const res = NextResponse.redirect(buildAuthUrl(state, redirectUri(req)));
  res.cookies.set(GOOGLE_OAUTH_NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/api/google',
  });
  return res;
}
