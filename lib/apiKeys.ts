// Client-side API key generation. The plaintext key never touches the
// server except in the one INSERT that stores its hash — this function
// generates it, hashes it, and the caller shows the plaintext to the user
// exactly once before it's gone for good (the DB only ever holds the hash).

const KEY_PREFIX = 'rb_live_';

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function generateApiKey(): Promise<{ key: string; hash: string; prefix: string }> {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const secret = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const key = `${KEY_PREFIX}${secret}`;
  const hash = await sha256Hex(key);
  const prefix = key.slice(0, 16);
  return { key, hash, prefix };
}
