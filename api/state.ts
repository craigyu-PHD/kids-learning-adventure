import { createHmac } from 'node:crypto';
import { del, get, list, put } from '@vercel/blob';

const PIN_RE = /^\d{4,6}$/;
const MAX_BODY_BYTES = 700_000;
const KEEP_SNAPSHOTS = 12;

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function getFamilyPin(request: Request) {
  const pin = request.headers.get('x-family-pin')?.trim() ?? '';
  return PIN_RE.test(pin) ? pin : null;
}

function familyNamespace(pin: string) {
  const pepper = process.env.FAMILY_PIN_PEPPER;
  if (!pepper || pepper.length < 24) throw new Error('FAMILY_PIN_PEPPER is not configured');
  return createHmac('sha256', pepper).update(`kids-learning:${pin}`).digest('hex');
}

function familyPrefix(pin: string, generation: 'v21' | 'v22' = 'v22') {
  return `families-${generation}/${familyNamespace(pin)}/`;
}

async function latestBlob(pin: string, generation: 'v21' | 'v22' = 'v22') {
  const result = await list({ prefix: familyPrefix(pin, generation), limit: 200 });
  return result.blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0] ?? null;
}

async function readLatest(pin: string) {
  const latest = await latestBlob(pin, 'v22') ?? await latestBlob(pin, 'v21');
  if (!latest) return null;
  const result = await get(latest.pathname, { access: 'private' });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const text = await new Response(result.stream).text();
  return JSON.parse(text) as unknown;
}

async function prune(pin: string) {
  const result = await list({ prefix: familyPrefix(pin, 'v22'), limit: 200 });
  const ordered = result.blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  const stale = ordered.slice(KEEP_SNAPSHOTS);
  if (stale.length) await del(stale.map((blob) => blob.url));
}

async function deleteV22Family(pin: string) {
  const result = await list({ prefix: familyPrefix(pin, 'v22'), limit: 200 });
  if (result.blobs.length) await del(result.blobs.map((blob) => blob.url));
  return result.blobs.length;
}

function sanitizeSnapshot(payload: Record<string, unknown>) {
  const settings = payload.settings && typeof payload.settings === 'object'
    ? { ...(payload.settings as Record<string, unknown>) }
    : {};
  if (settings.cloudSync && typeof settings.cloudSync === 'object') {
    settings.cloudSync = { enabled: true, familyCode: '' };
  }
  return { ...payload, settings };
}

export default {
  async fetch(request: Request) {
    const pin = getFamilyPin(request);
    if (!pin) return json({ error: 'PIN must contain 4–6 digits' }, 400);

    try {
      if (request.method === 'GET') {
        const snapshot = await readLatest(pin);
        if (!snapshot) return json({ error: 'Not found' }, 404);
        return json(snapshot);
      }

      if (request.method === 'PUT') {
        const raw = await request.text();
        if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
          return json({ error: 'Payload too large' }, 413);
        }

        const payload = JSON.parse(raw) as Record<string, unknown>;
        if (payload.version !== 2 || typeof payload.updatedAt !== 'string') {
          return json({ error: 'Invalid snapshot format' }, 400);
        }

        const serverUpdatedAt = new Date().toISOString();
        const snapshot = { ...sanitizeSnapshot(payload), updatedAt: serverUpdatedAt };
        const pathname = `${familyPrefix(pin, 'v22')}${Date.now()}-${crypto.randomUUID()}.json`;
        await put(pathname, JSON.stringify(snapshot), {
          access: 'private',
          contentType: 'application/json; charset=utf-8',
          addRandomSuffix: false,
          cacheControlMaxAge: 60,
        });
        await prune(pin);
        return json({ ok: true, updatedAt: serverUpdatedAt });
      }

      if (request.method === 'DELETE') {
        if (request.headers.get('x-family-confirm') !== 'delete-v22-family-state') {
          return json({ error: 'Explicit deletion confirmation required' }, 400);
        }
        const deleted = await deleteV22Family(pin);
        return json({ ok: true, deleted });
      }

      return json({ error: 'Method not allowed' }, 405);
    } catch (error) {
      console.error('family-pin-sync-error', error);
      return json({ error: 'Cloud sync failed' }, 500);
    }
  },
};
