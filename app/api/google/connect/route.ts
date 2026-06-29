import { NextResponse } from 'next/server';
import { googleConfigured, buildAuthUrl, redirectUri } from '@/lib/google/calendar';

/** Kick off the Google OAuth flow. The calendar page links here. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const workspace = url.searchParams.get('workspace') || '';
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL(`/${workspace}/calendar?google=not_configured`, req.url));
  }
  const state = Buffer.from(JSON.stringify({ w: workspace })).toString('base64url');
  return NextResponse.redirect(buildAuthUrl(state, redirectUri(req)));
}
