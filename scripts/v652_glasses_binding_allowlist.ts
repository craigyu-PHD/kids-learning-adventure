import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
export const V652_GLASSES_AUDIT = 'qa/v652/astra/glasses-preintegration-hash-audit.json';
export const V652_GLASSES_AUDIT_SHA256 = '02a8c1d1293c6fe3b45a0f792487db4619c18b68e79137fb28d340dce2bfc06a';
export const V652_GLASSES_ITEM_IDS = [
  'starter-sky-glasses', 'sky-view-glasses', 'glasses-racer', 'glasses-star',
  'glasses-holo', 'glasses-legend', 'sister-heart-glasses',
] as const;

type AuditTarget = { itemId?: string; target?: string; sha256?: string };
type Audit = { status?: string; counts?: { baseOverlays?: number; skinOverlays?: number; catalogs?: number }; permittedTargets?: AuditTarget[] };
export type HashFile = (relativePath: string) => string | undefined;

export function sha256File(relativePath: string) {
  const file = path.join(ROOT, relativePath);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return undefined;
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function approvedV652GlassesBinding(
  actualPath: string | undefined,
  itemId: string,
  avatarId: string,
  hashFile: HashFile = sha256File,
) {
  const expectedPath = `public/assets/v6.5.2/runtime/${avatarId}/${itemId}.webp`;
  if (!V652_GLASSES_ITEM_IDS.includes(itemId as typeof V652_GLASSES_ITEM_IDS[number])) return { ok: false, reason: 'unknown-item' };
  if (actualPath !== expectedPath) return { ok: false, reason: 'unexpected-path' };
  if (hashFile(V652_GLASSES_AUDIT) !== V652_GLASSES_AUDIT_SHA256) return { ok: false, reason: 'audit-pin-drift' };
  let audit: Audit;
  try { audit = JSON.parse(fs.readFileSync(path.join(ROOT, V652_GLASSES_AUDIT), 'utf8')) as Audit; }
  catch { return { ok: false, reason: 'audit-unreadable' }; }
  if (audit.status !== 'PASS_LOCAL_INTEGRATION_ONLY' || audit.counts?.baseOverlays !== 28 || audit.counts?.skinOverlays !== 35 || audit.counts?.catalogs !== 7 || audit.permittedTargets?.length !== 70) {
    return { ok: false, reason: 'audit-contract-invalid' };
  }
  const rows = audit.permittedTargets.filter(row => row.itemId === itemId && row.target === actualPath);
  if (rows.length !== 1 || !rows[0].sha256 || !/^[0-9a-f]{64}$/.test(rows[0].sha256)) return { ok: false, reason: 'target-not-allowlisted' };
  if (hashFile(actualPath) !== rows[0].sha256) return { ok: false, reason: 'asset-hash-drift' };
  return { ok: true as const, reason: 'stage-ledger-allowlist' };
}

export function allowedRuntimeDetailsBinding(
  actualPath: string | undefined,
  historicalPath: string,
  itemId: string,
  avatarId: string,
  hashFile: HashFile = sha256File,
) {
  if (!actualPath) return { ok: false, reason: 'missing-current-binding' };
  const legacyPromotedPrefix = `public/assets/v6.5/runtime/${avatarId}/${itemId}`;
  if (actualPath === historicalPath || (actualPath.startsWith(legacyPromotedPrefix) && actualPath.endsWith('.webp'))) {
    return { ok: true as const, reason: 'historical-or-v65-binding' };
  }
  return approvedV652GlassesBinding(actualPath, itemId, avatarId, hashFile);
}
