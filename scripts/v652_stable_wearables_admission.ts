import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { assertV652FinalIncrementalAdmission } from './v652_final_incremental_admission';
import { readAdmissionFile, type ReadAdmissionFile } from './v652_current_detail_admission';

type Link = { path: string; sha256: string };
type Detail = { overlay: string; canvasTopPadding?: number; hairVisibilityMask?: string; underHeadwearVisibilityMask?: string; evidence?: unknown };
type Entry = { id: string; catalogPath?: string; defaultSkinDetails?: Record<string, Detail>; skinDetails?: Record<string, Record<string, Detail>> };
type Manifest = { accessories: Entry[] };
type Pair = { itemId: string; avatarId: string; skinId: string; before: Detail; after: Detail };
type Lock = {
  status: string; before: Link; after: Link; files: Link[]; pairs: Pair[];
  catalog: { itemId: string; before: string; after: string };
  sourceChanges: { path: string; before: Link; after: Link }[];
  reviews: Link[];
};

export const V652_STABLE_WEARABLES_LOCK = {
  path: 'qa/v652/root/20260927-wearable-drift-fix/admission-lock.json',
  sha256: 'a69eb58db9a75ec978b6732ab53a2b25d9c5c1a14ac5cbf6feeea0ab3449df17',
};
const roles = ['brother', 'younger', 'sister', 'younger-sister'];
const bodies = ['base', 'outfit-cadet', 'outfit-racer', 'outfit-mecha', 'outfit-ocean', 'outfit-mage', 'outfit-legend', 'sister-bloom-outfit'];
const identity = (p: Pick<Pair, 'itemId' | 'avatarId' | 'skinId'>) => [p.itemId, p.avatarId, p.skinId].join(':');
const entry = (m: Manifest, item: string) => {
  const matches = m.accessories.filter(e => e.id === item); assert.equal(matches.length, 1); return matches[0];
};
const detail = (m: Manifest, p: Pair) => {
  const e = entry(m, p.itemId);
  const d = p.skinId === 'base' ? e.defaultSkinDetails?.[p.avatarId] : e.skinDetails?.[p.avatarId]?.[p.skinId];
  assert(d, `missing stable wearable ${identity(p)}`); return d;
};

/** Admit only the reviewed hat leaves and renderer correction, then validate the
 * unchanged prior evidence against its exact historical source snapshot. */
export function assertV652StableWearablesAdmission<T extends Manifest>(manifest: T, options: { readFile?: ReadAdmissionFile } = {}) {
  const read = options.readFile ?? ((path: string) => path.startsWith('src/') ? fs.readFileSync(path) : readAdmissionFile(path));
  const cache = new Map<string, Buffer>();
  const exact = (link: Link) => {
    assert(/^[a-f0-9]{64}$/.test(link.sha256), 'unfrozen stable wearable evidence');
    assert(/^(qa\/v652\/|src\/|public\/assets\/)/.test(link.path) && !link.path.split('/').includes('..'));
    if (!cache.has(link.path)) cache.set(link.path, read(link.path));
    const bytes = cache.get(link.path)!;
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), link.sha256, `stable wearable drift: ${link.path}`);
    return bytes;
  };
  const parse = <U,>(link: Link) => JSON.parse(exact(link).toString()) as U;
  const lock = parse<Lock>(V652_STABLE_WEARABLES_LOCK);
  assert.equal(lock.status, 'FROZEN_REVIEWED_STABLE_WEARABLES');
  assert.equal(lock.before.sha256, 'f916170eb5c86f31128c22468870e84bb7c476ed13fb866d3a8d0a1cdfdf3a90');
  const before = parse<T>(lock.before), after = parse<T>(lock.after);
  assert.deepEqual(manifest, after, 'unreviewed live manifest');
  assert.equal(new Set(lock.files.map(f => f.path)).size, lock.files.length);
  for (const file of lock.files) exact(file);
  const pinned = new Set(lock.files.map(f => f.path));
  const expected = roles.flatMap(avatarId => bodies.map(skinId => identity({ itemId: 'hat-mage', avatarId, skinId })));
  const ocean = lock.pairs.filter(p => p.itemId === 'hat-ocean');
  assert(ocean.length >= 2 && ocean.length <= 8);
  for (const p of ocean) { assert.equal(p.avatarId, 'younger'); assert(bodies.includes(p.skinId)); expected.push(identity(p)); }
  assert(ocean.some(p => p.skinId === 'base') && ocean.some(p => p.skinId === 'outfit-racer'));
  assert.equal(new Set(lock.pairs.map(identity)).size, lock.pairs.length);
  assert.deepEqual(lock.pairs.map(identity).sort(), expected.sort(), 'wrong hat pair inventory');
  const replay = structuredClone(before);
  for (const p of lock.pairs) {
    assert.deepEqual(detail(before, p), p.before);
    assert.deepEqual(detail(after, p), p.after);
    assert.equal(p.after.canvasTopPadding, 256);
    for (const field of ['overlay', 'hairVisibilityMask', 'underHeadwearVisibilityMask'] as const) {
      const path = p.after[field];
      if (field === 'hairVisibilityMask' && !path && p.itemId === 'hat-ocean') continue;
      assert(path && pinned.has(path), `unfixed ${field} ${identity(p)}`);
      assert(path.startsWith(`public/assets/v6.5.2/${field === 'overlay' ? 'runtime' : 'runtime-masks'}/${p.avatarId}/`), 'wrong avatar or layer directory');
    }
    Object.assign(detail(replay, p), structuredClone(p.after));
  }
  assert.equal(lock.catalog.itemId, 'hat-mage');
  assert.equal(entry(before, 'hat-mage').catalogPath, lock.catalog.before);
  assert.equal(entry(after, 'hat-mage').catalogPath, lock.catalog.after);
  assert(pinned.has(lock.catalog.after));
  entry(replay, 'hat-mage').catalogPath = lock.catalog.after;
  assert.deepEqual(replay, after, 'unapproved manifest field changed');
  assert.deepEqual(lock.sourceChanges.map(s => s.path), ['src/components/AvatarRenderer.tsx']);
  for (const source of lock.sourceChanges) { exact(source.before); exact(source.after); assert.equal(source.after.path, source.path); }
  assert(lock.reviews.length >= 3, 'missing geometry/art/runtime evidence');
  for (const review of lock.reviews) { assert(pinned.has(review.path)); exact(review); }
  const sourceSnapshots = new Map(lock.sourceChanges.map(s => [s.path, s.before]));
  const prior = assertV652FinalIncrementalAdmission(before, { readFile: path => {
    const historical = sourceSnapshots.get(path); return historical ? exact(historical) : read(path);
  } });
  return { ...prior, stableManifestSHA256: lock.after.sha256, stablePairCount: lock.pairs.length, stableCheckedFileCount: cache.size };
}
