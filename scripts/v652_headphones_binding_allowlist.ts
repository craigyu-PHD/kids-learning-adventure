import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHA256 = /^[0-9a-f]{64}$/;

export const V652_HEADPHONES_PLAN = 'qa/v652/terra/headphones-local-integration-plan-r1.json';
export const V652_HEADPHONES_AUDIT = 'qa/v652/astra/headphones-preintegration-audit-r1.json';
// Root-pinned exact independent local-integration approval; not release approval.
export const V652_HEADPHONES_AUDIT_SHA256 = '2cfc776c5793092d51822be48d1b3c2236a7642edfdf94d5128706d68c13cbf8';
export const V652_HEADPHONES_ITEM_IDS = [
  'starter-buddy-headphones', 'phones-legend', 'phones-sky', 'phones-racer',
  'sister-cat-headphones', 'story-headphones', 'phones-ai',
] as const;
export const V652_HEADPHONES_AVATAR_IDS = ['brother', 'younger', 'sister', 'younger-sister'] as const;
export const V652_HEADPHONES_SKIN_PROFILES = [
  'brother:outfit-racer', 'younger:outfit-cadet', 'younger:outfit-legend',
  'sister:outfit-mecha', 'younger-sister:outfit-racer',
] as const;

type ItemId = typeof V652_HEADPHONES_ITEM_IDS[number];
type AvatarId = typeof V652_HEADPHONES_AVATAR_IDS[number];
type OperationKind = 'base' | 'skin' | 'catalog' | 'headwear';
export type HeadphonesOperation = {
  kind?: string;
  itemId?: string;
  avatarId?: string;
  skinId?: string;
  headwearId?: string;
  source?: string;
  sha256?: string;
  target?: string;
};
export type HeadphonesAudit = {
  status?: string;
  planSha256?: string;
  permittedOperations?: HeadphonesOperation[];
  manifestBefore?: { path?: string; sha256?: string };
};
export type HashFile = (relativePath: string) => string | undefined;
export type BindingSelector = { kind: 'base' } | { kind: 'headwear'; headwearId: 'starter-sun-cap' };
type Result = { ok: true; reason: string } | { ok: false; reason: string };

export function sha256HeadphonesFile(relativePath: string) {
  const file = path.join(ROOT, relativePath);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return undefined;
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function isItemId(value: string | undefined): value is ItemId {
  return V652_HEADPHONES_ITEM_IDS.includes(value as ItemId);
}

function isAvatarId(value: string | undefined): value is AvatarId {
  return V652_HEADPHONES_AVATAR_IDS.includes(value as AvatarId);
}

function safeRelative(value: string | undefined) {
  return Boolean(value && !path.isAbsolute(value) && !value.split('/').includes('..'));
}

function expectedTarget(row: HeadphonesOperation) {
  if (!isItemId(row.itemId)) return undefined;
  if (row.kind === 'catalog') return `public/assets/v6.5.2/catalog/headphones/${row.itemId}.webp`;
  if (!isAvatarId(row.avatarId)) return undefined;
  if (row.kind === 'base') return `public/assets/v6.5.2/runtime/${row.avatarId}/${row.itemId}.webp`;
  if (row.kind === 'skin' && V652_HEADPHONES_SKIN_PROFILES.includes(`${row.avatarId}:${row.skinId}` as typeof V652_HEADPHONES_SKIN_PROFILES[number])) {
    return `public/assets/v6.5.2/runtime/${row.avatarId}/${row.itemId}--${row.skinId}.webp`;
  }
  if (row.kind === 'headwear' && row.itemId === 'starter-buddy-headphones' && row.headwearId === 'starter-sun-cap') {
    return `public/assets/v6.5.2/runtime/${row.avatarId}/starter-buddy-headphones--starter-sun-cap-front.webp`;
  }
  return undefined;
}

function identity(row: HeadphonesOperation) {
  return `${row.kind}:${row.itemId ?? ''}:${row.avatarId ?? ''}:${row.skinId ?? ''}:${row.headwearId ?? ''}`;
}

export function validateV652HeadphonesAudit(audit: HeadphonesAudit): Result {
  if (audit.status !== 'PASS_LOCAL_INTEGRATION_ONLY' || !SHA256.test(audit.planSha256 ?? '')) return { ok: false, reason: 'audit-contract-invalid' };
  if (!safeRelative(audit.manifestBefore?.path) || !SHA256.test(audit.manifestBefore?.sha256 ?? '')) return { ok: false, reason: 'audit-contract-invalid' };
  const operations = audit.permittedOperations;
  if (!Array.isArray(operations) || operations.length !== 74) return { ok: false, reason: 'audit-contract-invalid' };

  const counts: Record<OperationKind, number> = { base: 0, skin: 0, catalog: 0, headwear: 0 };
  const identities = new Set<string>();
  const targets = new Set<string>();
  for (const row of operations) {
    if (!(row.kind && Object.hasOwn(counts, row.kind))) return { ok: false, reason: 'audit-contract-invalid' };
    const target = expectedTarget(row);
    if (!target || row.target !== target || !safeRelative(row.source) || !SHA256.test(row.sha256 ?? '')) return { ok: false, reason: 'audit-contract-invalid' };
    const rowIdentity = identity(row);
    if (identities.has(rowIdentity) || targets.has(target)) return { ok: false, reason: 'audit-contract-invalid' };
    identities.add(rowIdentity);
    targets.add(target);
    counts[row.kind as OperationKind] += 1;
  }
  if (counts.base !== 28 || counts.skin !== 35 || counts.catalog !== 7 || counts.headwear !== 4) return { ok: false, reason: 'audit-contract-invalid' };
  return { ok: true, reason: 'audit-contract-valid' };
}

export function approvedV652HeadphonesBindingAgainstAudit(
  actualPath: string | undefined,
  itemId: string,
  avatarId: string,
  selector: BindingSelector,
  audit: HeadphonesAudit,
  hashFile: HashFile,
): Result {
  if (!isItemId(itemId)) return { ok: false, reason: 'unknown-item' };
  if (!isAvatarId(avatarId)) return { ok: false, reason: 'unknown-avatar' };
  if (selector.kind === 'headwear' && itemId !== 'starter-buddy-headphones') return { ok: false, reason: 'unexpected-headwear-item' };
  const expected = selector.kind === 'base'
    ? `public/assets/v6.5.2/runtime/${avatarId}/${itemId}.webp`
    : `public/assets/v6.5.2/runtime/${avatarId}/starter-buddy-headphones--${selector.headwearId}-front.webp`;
  if (actualPath !== expected) return { ok: false, reason: 'unexpected-path' };
  const contract = validateV652HeadphonesAudit(audit);
  if (!contract.ok) return contract;
  const rows = audit.permittedOperations!.filter(row => row.kind === selector.kind && row.itemId === itemId
    && row.avatarId === avatarId && (selector.kind === 'base' || row.headwearId === selector.headwearId)
    && row.target === actualPath);
  if (rows.length !== 1 || !rows[0].source || !rows[0].sha256) return { ok: false, reason: 'target-not-allowlisted' };
  if (hashFile(rows[0].source) !== rows[0].sha256) return { ok: false, reason: 'source-hash-drift' };
  if (hashFile(actualPath) !== rows[0].sha256) return { ok: false, reason: 'asset-hash-drift' };
  return { ok: true, reason: 'headphones-audit-allowlist' };
}

export function approvedV652HeadphonesBinding(
  actualPath: string | undefined,
  itemId: string,
  avatarId: string,
  selector: BindingSelector,
  hashFile: HashFile = sha256HeadphonesFile,
): Result {
  if (!SHA256.test(V652_HEADPHONES_AUDIT_SHA256)) return { ok: false, reason: V652_HEADPHONES_AUDIT_SHA256.startsWith('PENDING') ? 'audit-pin-pending' : 'audit-pin-invalid' };
  if (hashFile(V652_HEADPHONES_AUDIT) !== V652_HEADPHONES_AUDIT_SHA256) return { ok: false, reason: 'audit-pin-drift' };
  let audit: HeadphonesAudit;
  try { audit = JSON.parse(fs.readFileSync(path.join(ROOT, V652_HEADPHONES_AUDIT), 'utf8')) as HeadphonesAudit; }
  catch { return { ok: false, reason: 'audit-unreadable' }; }
  if (hashFile(V652_HEADPHONES_PLAN) !== audit.planSha256) return { ok: false, reason: 'plan-hash-drift' };
  if (!audit.manifestBefore?.path || hashFile(audit.manifestBefore.path) !== audit.manifestBefore.sha256) return { ok: false, reason: 'manifest-before-hash-drift' };
  return approvedV652HeadphonesBindingAgainstAudit(actualPath, itemId, avatarId, selector, audit, hashFile);
}

export function allowedRuntimeDetailsHeadphonesBinding(
  actualPath: string | undefined,
  historicalPath: string,
  itemId: string,
  avatarId: string,
  hashFile: HashFile = sha256HeadphonesFile,
): Result {
  if (!actualPath) return { ok: false, reason: 'missing-current-binding' };
  const legacyPromotedPrefix = `public/assets/v6.5/runtime/${avatarId}/${itemId}`;
  if (actualPath === historicalPath || (actualPath.startsWith(legacyPromotedPrefix) && actualPath.endsWith('.webp'))) {
    return { ok: true, reason: 'historical-or-v65-binding' };
  }
  return approvedV652HeadphonesBinding(actualPath, itemId, avatarId, { kind: 'base' }, hashFile);
}

export function allowedRuntimeDetailsHeadphonesHeadwearBinding(
  actualPath: string | undefined,
  historicalPath: string,
  itemId: string,
  avatarId: string,
  headwearId: 'starter-sun-cap',
  hashFile: HashFile = sha256HeadphonesFile,
): Result {
  if (!actualPath) return { ok: false, reason: 'missing-current-binding' };
  if (actualPath === historicalPath) return { ok: true, reason: 'historical-headwear-binding' };
  return approvedV652HeadphonesBinding(actualPath, itemId, avatarId, { kind: 'headwear', headwearId }, hashFile);
}
