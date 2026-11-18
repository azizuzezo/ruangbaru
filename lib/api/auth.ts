import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export interface ApiKeyContext {
  workspaceId: string;
  workspaceSlug: string;
  keyId: string;
  /** The admin who created the key; records created through it are attributed to them. */
  createdBy: string | null;
}

/**
 * Resolves the `Authorization: Bearer <key>` header on a /api/v1/* request
 * to the workspace it belongs to. Returns null for anything invalid or
 * revoked — callers should respond 401. Bumps `last_used_at` best-effort
 * (not awaited — a stats column shouldn't block or fail the actual request).
 */
export async function resolveApiKey(request: Request): Promise<ApiKeyContext | null> {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const key = header.slice(7).trim();
  if (!key) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from('api_keys')
    .select('id, workspace_id, revoked_at, created_by, workspace:workspaces(slug)')
    .eq('key_hash', hashApiKey(key))
    .maybeSingle();

  if (!data || data.revoked_at) return null;

  admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id).then(() => {});

  const ws = data.workspace as { slug?: string } | { slug?: string }[] | null;
  const workspaceSlug = (Array.isArray(ws) ? ws[0]?.slug : ws?.slug) || data.workspace_id;

  return { workspaceId: data.workspace_id, workspaceSlug, keyId: data.id, createdBy: data.created_by ?? null };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

export function corsJson(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...CORS_HEADERS, ...(init?.headers || {}) },
  });
}

export function corsOptionsResponse() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export function unauthorized() {
  return corsJson({ error: 'Invalid or missing API key. Pass it as "Authorization: Bearer <key>".' }, { status: 401 });
}
