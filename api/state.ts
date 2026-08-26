import { del, get, list, put } from '@vercel/blob';

const CODE_RE = /^[A-Z2-9]{10,24}$/;
const MAX_BODY_BYTES = 700_000;
const KEEP_SNAPSHOTS = 12;

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function getFamilyCode(request: Request) {
  const code = new URL(request.url).searchParams.get('familyCode')?.toUpperCase() ?? '';
  return CODE_RE.test(code) ? code : null;
}

async function latestBlob(code: string) {
  const result = await list({ prefix: `families/${code}/`, limit: 200 });
  return result.blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0] ?? null;
}

async function readLatest(code: string) {
  const latest = await latestBlob(code);
  if (!latest) return null;
  const result = await get(latest.pathname, { access: 'private' });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const text = await new Response(result.stream).text();
  return JSON.parse(text) as unknown;
}

async function prune(code: string) {
  const result = await list({ prefix: `families/${code}/`, limit: 200 });
  const ordered = result.blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  const stale = ordered.slice(KEEP_SNAPSHOTS);
  if (stale.length) await del(stale.map((blob) => blob.url));
}

export default {
  async fetch(request: Request) {
    const code = getFamilyCode(request);
    if (!code) return json({ error: 'Invalid family code' }, 400);

    try {
      if (request.method === 'GET') {
        const snapshot = await readLatest(code);
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
        const snapshot = { ...payload, updatedAt: serverUpdatedAt };
        const pathname = `families/${code}/${Date.now()}-${crypto.randomUUID()}.json`;
        await put(pathname, JSON.stringify(snapshot), {
          access: 'private',
          contentType: 'application/json; charset=utf-8',
          addRandomSuffix: false,
          cacheControlMaxAge: 60,
        });
        await prune(code);
        return json({ ok: true, updatedAt: serverUpdatedAt });
      }

      return json({ error: 'Method not allowed' }, 405);
    } catch (error) {
      console.error('family-sync-error', error);
      return json({ error: 'Cloud sync failed' }, 500);
    }
  },
};
