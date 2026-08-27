import { del, get, list, put } from '@vercel/blob';
import { verifyFamilySessionToken } from './family-auth.js';
import {
  SnapshotConflictError as GuardConflictError,
  SnapshotValidationError as GuardValidationError,
  assertBaseVersion as guardBaseVersion,
  assertImmutableEventsCompatible as guardImmutableEvents,
  sanitizeSnapshot as guardSanitizeSnapshot,
} from './state-guards.js';

const MAX_BODY_BYTES = 700_000;
const KEEP_SNAPSHOTS = 12;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, X-Family-Base-Updated-At, X-Family-Confirm',
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: corsHeaders() });
}

function getFamilyId(request: Request) {
  const authorization = request.headers.get('authorization')?.trim() ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) return null;
  return verifyFamilySessionToken(match[1])?.familyId ?? null;
}

function familyPrefix(familyId: string, generation: 'v21' | 'v22' = 'v22') {
  return `families-${generation}/${familyId}/`;
}

async function latestBlob(familyId: string, generation: 'v21' | 'v22' = 'v22') {
  const result = await list({ prefix: familyPrefix(familyId, generation), limit: 200 });
  return result.blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0] ?? null;
}

async function readLatest(familyId: string) {
  const latest = await latestBlob(familyId, 'v22') ?? await latestBlob(familyId, 'v21');
  if (!latest) return null;
  const result = await get(latest.pathname, { access: 'private' });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const text = await new Response(result.stream).text();
  return JSON.parse(text) as unknown;
}

async function prune(familyId: string) {
  const result = await list({ prefix: familyPrefix(familyId, 'v22'), limit: 200 });
  const ordered = result.blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  const stale = ordered.slice(KEEP_SNAPSHOTS);
  if (stale.length) await del(stale.map((blob) => blob.url));
}

async function deleteV22Family(familyId: string) {
  const result = await list({ prefix: familyPrefix(familyId, 'v22'), limit: 200 });
  if (result.blobs.length) await del(result.blobs.map((blob) => blob.url));
  return result.blobs.length;
}

export default {
  async fetch(request: Request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
    const familyId = getFamilyId(request);
    if (!familyId) return json({ error: 'Valid family session required' }, 401);

    try {
      if (request.method === 'GET') {
        const snapshot = await readLatest(familyId);
        if (!snapshot) return json({ error: 'Not found' }, 404);
        return json(snapshot);
      }

      if (request.method === 'PUT') {
        const raw = await request.text();
        if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: 'Payload too large' }, 413);
        const payload = JSON.parse(raw) as Record<string, unknown>;
        if (payload.version !== 2 || typeof payload.updatedAt !== 'string') return json({ error: 'Invalid snapshot format' }, 400);

        const previous = await readLatest(familyId);
        const baseUpdatedAt = request.headers.get('x-family-base-updated-at')?.trim() ?? '';
        guardBaseVersion(previous, baseUpdatedAt);
        const sanitized = guardSanitizeSnapshot(payload);
        if (previous) guardImmutableEvents(previous, sanitized);
        const serverUpdatedAt = new Date().toISOString();
        const snapshot = { ...sanitized, updatedAt: serverUpdatedAt };
        const pathname = `${familyPrefix(familyId, 'v22')}${Date.now()}-${crypto.randomUUID()}.json`;
        await put(pathname, JSON.stringify(snapshot), {
          access: 'private',
          contentType: 'application/json; charset=utf-8',
          addRandomSuffix: false,
          cacheControlMaxAge: 60,
        });
        await prune(familyId);
        return json({ ok: true, updatedAt: serverUpdatedAt });
      }

      if (request.method === 'DELETE') {
        if (request.headers.get('x-family-confirm') !== 'delete-v22-family-state') return json({ error: 'Explicit deletion confirmation required' }, 400);
        const deleted = await deleteV22Family(familyId);
        return json({ ok: true, deleted });
      }

      return json({ error: 'Method not allowed' }, 405);
    } catch (error) {
      if (error instanceof GuardConflictError) return json({ error: error.message }, 409);
      if (error instanceof GuardValidationError) return json({ error: error.message }, 400);
      console.error('family-session-sync-error', error);
      return json({ error: 'Cloud sync failed' }, 500);
    }
  },
};
