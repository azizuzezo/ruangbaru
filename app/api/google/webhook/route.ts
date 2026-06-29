import { NextResponse } from 'next/server';

/**
 * Google Calendar push-notification receiver. Google POSTs here when a watched
 * calendar changes (headers: X-Goog-Channel-ID, X-Goog-Resource-State, ...).
 *
 * Channels require a publicly reachable HTTPS URL and an explicit watch()
 * registration, which only happens once Google OAuth is configured and a
 * channel is created. Until then this simply acknowledges so Google doesn't
 * retry. Actual incremental pulls are driven by /api/google/sync.
 */
export async function POST(req: Request) {
  const state = req.headers.get('x-goog-resource-state');
  // 'sync' is the initial handshake; 'exists'/'update' signal real changes.
  // We acknowledge fast; the client/cron triggers /api/google/sync to apply.
  return NextResponse.json({ ok: true, state });
}
