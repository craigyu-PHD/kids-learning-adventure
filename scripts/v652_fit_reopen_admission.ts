import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { avatarBodyAlignment, avatarBodyOffsetY } from '../src/avatarBodyAlignment';
import { assertV652StableWearablesAdmission } from './v652_stable_wearables_admission';
import { readAdmissionFile, type ReadAdmissionFile } from './v652_current_detail_admission';

type Link = { path: string; sha256: string };
type Entry = { id: string; [key: string]: unknown };
type Manifest = { accessories: Entry[] };
type Patch = { itemId: string; keys: string[]; before: unknown; after: unknown };
type Lock = {
  status: string; before: Link; after: Link; files: Link[]; patches: Patch[];
  sourceChanges: { path: string; before?: Link; after: Link }[];
  reviews: Link[];
};

export const V652_FIT_REOPEN_LOCK = {
  path: 'qa/v652/root/20260927-fit-reopen/admission-lock.json',
  sha256: 'f58b02c14bc981501210eb0c3aab7faf4b80cf6a7b64778bd01f7cf23a6fe7df',
};
const roles = ['brother', 'younger', 'sister', 'younger-sister'];
const bodies = ['outfit-cadet', 'outfit-racer', 'outfit-mecha', 'outfit-ocean', 'outfit-mage', 'outfit-legend', 'sister-bloom-outfit'];
const hats = ['sunny-explorer-hat', 'hat-ocean', 'hat-rocket'];
const glasses = ['glasses-holo', 'starter-sky-glasses', 'sky-view-glasses', 'glasses-legend', 'sister-heart-glasses'];

function allowedPatch(p: Patch) {
  const [field, role, skin] = p.keys;
  if (field === 'catalogPath') return p.keys.length === 1 && ['hat-rocket', 'glasses-holo'].includes(p.itemId);
  if (field === 'catalogVariants') return p.keys.length === 2 && (p.itemId === 'hair-wave' && role === 'younger' || p.itemId === 'hair-nebula' && role === 'brother');
  if (!roles.includes(role)) return false;
  if (field === 'variants') return p.keys.length === 2 && (glasses.includes(p.itemId) || (p.itemId === 'hair-wave' && role === 'younger' || p.itemId === 'hair-nebula' && role === 'brother'));
  if (field === 'skinVariants') return p.keys.length === 3 && bodies.includes(skin) && glasses.includes(p.itemId);
  if (field !== 'defaultSkinDetails' && field !== 'skinDetails') return false;
  if (field === 'defaultSkinDetails' ? p.keys.length !== 2 : p.keys.length !== 3 || !bodies.includes(skin)) return false;
  if (p.itemId === 'sunny-explorer-hat') return ['younger', 'younger-sister'].includes(role);
  if (p.itemId === 'hat-ocean') return role !== 'younger';
  if (p.itemId === 'hat-rocket') return true;
  if (p.itemId === 'hair-cloud') return ['sister', 'younger-sister'].includes(role);
  return (p.itemId === 'hair-wave' && role === 'younger' || p.itemId === 'hair-nebula' && role === 'brother');
}

/** Replays only accepted wearable leaves. Earlier evidence is checked against
 * its original source bytes; all new renderer, layout and artwork bytes are pinned. */
export function assertV652FitReopenAdmission<T extends Manifest>(manifest: T, options: { readFile?: ReadAdmissionFile } = {}) {
  const read = options.readFile ?? ((path: string) => path.startsWith('src/') ? fs.readFileSync(path) : readAdmissionFile(path));
  const cache = new Map<string, Buffer>();
  const exact = (link: Link) => {
    assert(/^[a-f0-9]{64}$/.test(link.sha256), 'unfrozen fit evidence');
    assert(/^(qa\/v65(?:2)?\/|src\/|public\/assets\/)/.test(link.path) && !link.path.split('/').includes('..'));
    if (!cache.has(link.path)) cache.set(link.path, read(link.path));
    const bytes = cache.get(link.path)!;
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), link.sha256, `fit evidence drift: ${link.path}`);
    return bytes;
  };
  const parse = <U,>(link: Link) => JSON.parse(exact(link).toString()) as U;
  const lock = parse<Lock>(V652_FIT_REOPEN_LOCK);
  assert.equal(lock.status, 'FROZEN_REVIEWED_FIT_REPAIR');
  assert.equal(lock.before.sha256, '44c633f33a837e2498d3560438daec682bb4f1167dce55cd0e1efb340025df3f');
  const before = parse<T>(lock.before), after = parse<T>(lock.after);
  assert.deepEqual(manifest, after, 'unreviewed fit manifest');
  assert.equal(new Set(lock.files.map(f => f.path)).size, lock.files.length);
  lock.files.forEach(exact);
  const pinned = new Set(lock.files.map(f => f.path));
  const replay = structuredClone(before);
  const seen = new Set<string>();
  const assetPaths = (value: unknown): string[] => typeof value === 'string' && value.startsWith('public/assets/') ? [value]
    : value && typeof value === 'object' ? Object.values(value).flatMap(assetPaths) : [];
  for (const patch of lock.patches) {
    assert(allowedPatch(patch), `unapproved wearable leaf: ${patch.itemId}/${patch.keys.join('/')}`);
    const id = `${patch.itemId}/${patch.keys.join('/')}`;
    assert(!seen.has(id), `duplicate wearable leaf ${id}`); seen.add(id);
    const entries = replay.accessories.filter(e => e.id === patch.itemId);
    assert.equal(entries.length, 1);
    let node: Record<string, unknown> = entries[0];
    for (const key of patch.keys.slice(0, -1)) {
      if (node[key] === undefined) node[key] = {};
      assert(node[key] && typeof node[key] === 'object');
      node = node[key] as Record<string, unknown>;
    }
    const key = patch.keys.at(-1)!;
    assert.deepEqual(node[key] ?? null, patch.before, `incorrect before leaf ${id}`);
    assert.notDeepEqual(patch.before, patch.after, `no-op wearable patch ${id}`);
    for (const path of assetPaths(patch.after)) assert(pinned.has(path), `unfrozen wearable layer ${path}`);
    if (patch.keys[0].endsWith('SkinDetails') || patch.keys[0] === 'skinDetails') {
      const detail = patch.after as Record<string, unknown>;
      assert(typeof detail.overlay === 'string');
      assert([0, 256].includes((detail.canvasTopPadding ?? 0) as number));
      for (const path of assetPaths(detail)) assert(path.includes(`/${patch.keys[1]}/`), `wrong avatar layer ${id}`);
      if (hats.includes(patch.itemId)) assert(detail.hairVisibilityMask && detail.underHeadwearVisibilityMask);
      if (['hair-cloud', 'hair-wave'].includes(patch.itemId)) assert(detail.hairVisibilityMask);
    }
    node[key] = structuredClone(patch.after);
  }
  assert.deepEqual(replay, after, 'unapproved manifest fields changed');
  assert.deepEqual(lock.sourceChanges.map(s => s.path).sort(), [
    'src/components/AvatarRenderer.tsx', 'src/components/TreasureShowcase.tsx',
    'src/styles/components/shop.css', 'src/avatarBodyAlignment.ts',
  ].sort());
  for (const source of lock.sourceChanges) {
    if (source.before) exact(source.before);
    assert.equal(source.after.path, source.path); exact(source.after);
  }
  for (const row of avatarBodyAlignment) {
    const path = 'public/' + row.path;
    assert(pinned.has(path)); exact({ path, sha256: row.sourceSHA256 });
    assert.equal(avatarBodyOffsetY('/' + row.path), row.offsetY);
  }
  assert.equal(avatarBodyOffsetY('/assets/unreviewed-body.webp'), 0);
  assert(lock.reviews.length >= 4, 'missing final geometry, art or runtime evidence');
  for (const review of lock.reviews) { assert(pinned.has(review.path)); exact(review); }
  const historicalSources = new Map(lock.sourceChanges.filter(s => s.before).map(s => [s.path, s.before!]));
  historicalSources.set('src/data/avatarAssetManifest.json', lock.before);
  const prior = assertV652StableWearablesAdmission(before, { readFile: path => {
    const historical = historicalSources.get(path); return historical ? exact(historical) : read(path);
  } });
  return { ...prior, fitManifestSHA256: lock.after.sha256, fitLeafCount: lock.patches.length, fitCheckedFileCount: cache.size };
}
