import { issueFamilySession } from './family-auth.js';

const MAX_BODY_BYTES = 2_048;
const AUTH_WINDOW_MS = 10 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 10;
const AUTH_BLOCK_MS = 15 * 60 * 1000;

type AuthBucket = { attempts: number; windowStartedAt: number; blockedUntil: number };
const authBuckets = new Map<string, AuthBucket>();

function requestSource(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || request.headers.get('cf-connecting-ip')
    || 'unknown'
  ).slice(0, 128);
}

function consumeAuthAttempt(source: string, now = Date.now()) {
  // This application-level limiter is deliberately lightweight; production edge/WAF rate limiting may add another layer.
  if (authBuckets.size > 1_000) {
    for (const [key, bucket] of authBuckets) {
      if (bucket.blockedUntil <= now && now - bucket.windowStartedAt > AUTH_WINDOW_MS) authBuckets.delete(key);
    }
  }
  const current = authBuckets.get(source);
  if (current?.blockedUntil && current.blockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.blockedUntil - now) / 1_000)) };
  }
  const bucket = !current || now - current.windowStartedAt >= AUTH_WINDOW_MS
    ? { attempts: 0, windowStartedAt: now, blockedUntil: 0 }
    : current;
  bucket.attempts += 1;
  if (bucket.attempts > AUTH_MAX_ATTEMPTS) {
    bucket.blockedUntil = now + AUTH_BLOCK_MS;
    authBuckets.set(source, bucket);
    return { allowed: false, retryAfterSeconds: Math.ceil(AUTH_BLOCK_MS / 1_000) };
  }
  authBuckets.set(source, bucket);
  return { allowed: true, retryAfterSeconds: 0 };
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: corsHeaders() });
}

export default {
  async fetch(request: Request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const rate = consumeAuthAttempt(requestSource(request));
    if (!rate.allowed) {
      const headers = { ...corsHeaders(), 'Retry-After': String(rate.retryAfterSeconds) };
      return Response.json({ error: 'Too many PIN attempts. Try again later.' }, { status: 429, headers });
    }

    try {
      const raw = await request.text();
      if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: 'Payload too large' }, 413);
      const payload = JSON.parse(raw) as { pin?: unknown };
      const session = issueFamilySession(typeof payload.pin === 'string' ? payload.pin : '');
      if (!session) return json({ error: 'PIN must contain 4–6 digits' }, 400);
      return json(session);
    } catch (error) {
      console.error('family-session-error', error);
      return json({ error: 'Unable to create family session' }, 500);
    }
  },
};
