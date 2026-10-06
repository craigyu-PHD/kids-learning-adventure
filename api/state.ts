import { createHash } from 'node:crypto';
import { BlobPreconditionFailedError, del, get, list, put } from '@vercel/blob';
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
    'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
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

async function allBlobs(prefix: string) {
  const blobs: Awaited<ReturnType<typeof list>>['blobs'] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, limit: 200, cursor });
    blobs.push(...page.blobs);
    if (page.hasMore && (!page.cursor || page.cursor === cursor)) throw new Error('Incomplete cloud listing');
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

async function readBlob(pathname: string) {
  // A cached snapshot/ETag must never authorize an overwrite of newer progress.
  const result = await get(pathname, { access: 'private', useCache: false,
    // Compression can turn a strong origin ETag into a weak HTTP validator.
    // Read the identity representation so body and conditional-write ETag match.
    headers: { 'Accept-Encoding': 'identity' } });
  if (!result) return null;
  if (result.statusCode !== 200 || !result.stream) throw new Error('Incomplete cloud read');
  const raw = await new Response(result.stream).text();
  const snapshot = JSON.parse(raw) as Record<string, unknown>;
  if (!snapshot || snapshot.version !== 2 || typeof snapshot.updatedAt !== 'string'
    || !Number.isFinite(Date.parse(snapshot.updatedAt))) throw new Error('Invalid stored snapshot');
  return { snapshot, raw, etag: result.blob.etag };
}

function latestLegacy(blobs: Awaited<ReturnType<typeof allBlobs>>, prefix: string) {
  // Old timestamped snapshots remain readable and are not migration candidates
  // to delete. History is never promoted merely because it was uploaded later.
  return blobs.filter(blob => {
    const name = blob.pathname.slice(prefix.length);
    return name.endsWith('.json') && !name.includes('/') && name !== 'current.json';
  })
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0] ?? null;
}

async function readLatest(familyId: string) {
  const prefix = familyPrefix(familyId);
  let current = await readBlob(`${prefix}current.json`);
  const blobs = current ? [] : await allBlobs(prefix);
  if (!current && blobs.some(blob => blob.pathname === `${prefix}current.json`
    || blob.pathname.startsWith(`${prefix}history/`))) {
    // First creation may complete between get and list. Re-read from origin;
    // never resurrect old progress if a migrated family's current file is gone.
    current = await readBlob(`${prefix}current.json`);
    if (!current) throw new Error('Current cloud snapshot missing; history requires recovery');
  }
  if (current) {
    if (!current.etag || current.etag.startsWith('W/')) {
      throw new Error('Current cloud snapshot has no strong ETag');
    }
    return current;
  }
  const oldPrefix = familyPrefix(familyId, 'v21');
  const latest = latestLegacy(blobs, prefix) ?? latestLegacy(await allBlobs(oldPrefix), oldPrefix);
  if (!latest) return null;
  const legacy = await readBlob(latest.pathname);
  if (!legacy) throw new Error('Listed cloud snapshot could not be read');
  return { ...legacy, etag: null };
}

const snapshotOptions = {
  access: 'private' as const,
  contentType: 'application/json; charset=utf-8',
  addRandomSuffix: false,
  cacheControlMaxAge: 60,
};

async function preserveCurrent(familyId: string, previous: NonNullable<Awaited<ReturnType<typeof readLatest>>>) {
  const hash = createHash('sha256').update(previous.raw).digest('hex');
  const version = String(Date.parse(previous.snapshot.updatedAt as string)).padStart(13, '0');
  const pathname = `${familyPrefix(familyId)}history/${version}-${hash}.json`;
  try {
    await put(pathname, previous.raw, { ...snapshotOptions, allowOverwrite: false });
  } catch (error) {
    // Concurrent writers may both archive the same committed version. Only an
    // exact existing copy is acceptable; archive failures must prevent overwrite.
    const existing = await readBlob(pathname);
    if (existing?.raw !== previous.raw) throw error;
  }
}

async function prune(familyId: string) {
  const history = await allBlobs(`${familyPrefix(familyId)}history/`);
  // Version order, not upload order: an older concurrent request may archive late.
  const ordered = history.sort((a, b) => b.pathname.localeCompare(a.pathname));
  const stale = ordered.slice(KEEP_SNAPSHOTS - 1);
  if (stale.length) await del(stale.map((blob) => blob.url));
}

async function deleteV22Family(familyId: string) {
  const blobs = await allBlobs(familyPrefix(familyId, 'v22'));
  if (blobs.length) await del(blobs.map((blob) => blob.url));
  return blobs.length;
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
        return json(snapshot.snapshot);
      }

      if (request.method === 'PUT' || request.method === 'POST') {
        const raw = await request.text();
        if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: 'Payload too large' }, 413);
        const payload = JSON.parse(raw) as Record<string, unknown>;
        const resetting = request.method === 'POST';
        if (resetting) {
          if (payload.operation !== 'reset-progress' || typeof payload.operationId !== 'string'
            || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(payload.operationId)
            || Object.keys(payload).some(key => key !== 'operation' && key !== 'operationId')) {
            return json({ error: 'Invalid explicit progress reset command' }, 400);
          }
        } else if (payload.version !== 2 || typeof payload.updatedAt !== 'string') return json({ error: 'Invalid snapshot format' }, 400);

        const previous = await readLatest(familyId);
        if (resetting && !previous) return json({ error: 'Load and save family state before resetting progress' }, 409);
        // A lost response may be retried with the same operation ID. Never
        // clear new work written after that reset has already succeeded.
        if (resetting && previous && previous.snapshot.progressResetId === payload.operationId) {
          return json({ ok: true, updatedAt: previous.snapshot.updatedAt, snapshot: previous.snapshot, alreadyApplied: true });
        }
        const baseUpdatedAt = request.headers.get('x-family-base-updated-at')?.trim() ?? '';
        if (previous && !baseUpdatedAt) throw new GuardConflictError('Load current cloud state before saving');
        guardBaseVersion(previous?.snapshot, baseUpdatedAt);
        const sanitized = resetting ? {
          ...previous!.snapshot, progress: {}, attendance: {}, reflections: {}, progressResetId: payload.operationId,
        } : guardSanitizeSnapshot(payload);
        if (!resetting) guardImmutableEvents(previous?.snapshot, sanitized);
        const previousTime = previous ? Date.parse(previous.snapshot.updatedAt as string) : 0;
        const serverUpdatedAt = new Date(Math.max(Date.now(), previousTime + 1)).toISOString();
        const snapshot = { ...sanitized, updatedAt: serverUpdatedAt };
        const pathname = `${familyPrefix(familyId)}current.json`;
        if (previous?.etag) await preserveCurrent(familyId, previous);
        try {
          await put(pathname, JSON.stringify(snapshot), {
            ...snapshotOptions,
            ...(previous?.etag ? { ifMatch: previous.etag } : { allowOverwrite: false }),
          });
        } catch (error) {
          // The origin performs the comparison atomically, across serverless
          // instances. First creation uses create-only, subsequent writes ETag.
          if (error instanceof BlobPreconditionFailedError
            || (!previous?.etag && await readBlob(pathname))) {
            throw new GuardConflictError('Cloud state changed since the client last loaded it');
          }
          throw error;
        }
        // A committed write must not become a false 500 because retention failed.
        try { await prune(familyId); } catch { console.error('family-snapshot-retention-failed'); }
        return json({ ok: true, updatedAt: serverUpdatedAt, ...(resetting ? { snapshot } : {}) });
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
