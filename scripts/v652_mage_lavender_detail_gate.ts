import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const INVENTORY = 'qa/v652/sol/20260926-hats-integration-r1/inventory.json';
const INVENTORY_SHA = '6f25b97b78818b87a50ddc1f8763cc92cdb0565b7c26512e387f61817f868607';
const AVATARS = ['brother', 'younger', 'sister', 'younger-sister'] as const;
const SKINS = ['base', 'outfit-cadet', 'outfit-legend', 'outfit-mage',
  'sister-bloom-outfit', 'outfit-mecha', 'outfit-ocean'] as const;
const ITEMS = ['hat-mage', 'sister-lavender-hat'] as const;
const SHA = /^[0-9a-f]{64}$/;

type Link = { path: string; sha256: string };
type Pair = {
  itemId: string; avatarId: string; skinId: string;
  overlay: Link; mask: Link; sourceReport: Link; acceptedReview: Link;
  qaDelivery: { overlay: string; mask: string };
  proposedPublic: { overlay: string; mask: string };
};
type Catalog = { itemId: string; source: Link; acceptedReview: Link;
  qaDelivery: string; proposedPublic: string };
type Inventory = { schemaVersion: string; status: string; avatars: string[]; skins: string[];
  excluded: string[]; pairs: Pair[]; catalogs: Catalog[] };
type Detail = { overlay: string; hairVisibilityMask: string };
type Entry = { id?: string; slot?: string; renderer?: string; supportedAvatars?: string[];
  variants?: Record<string, string>; defaultSkinDetails?: Record<string, Detail>;
  skinDetails?: Record<string, Record<string, Detail>>; catalogPath?: string;
  skinVariants?: unknown };
export type HashFile = (relative: string) => string | undefined;

export function sha256MageLavenderFile(relative: string) {
  assert(relative.startsWith('qa/v652/') || relative.startsWith('public/assets/v6.5.2/'));
  const file = path.resolve(ROOT, relative);
  assert(file.startsWith(`${ROOT}${path.sep}`));
  if (!fs.existsSync(file)) return undefined;
  const stat = fs.statSync(file);
  if (!stat.isFile()) return undefined;
  assert(!(stat.size > 0 && stat.blocks === 0), `dataless file: ${relative}`);
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function exact(link: Link, hashFile: HashFile) {
  assert(link?.path && SHA.test(link.sha256), 'invalid pinned link');
  assert.equal(hashFile(link.path), link.sha256, `hash drift: ${link.path}`);
}
function inventory(hashFile: HashFile): Inventory {
  assert.equal(hashFile(INVENTORY), INVENTORY_SHA, 'Mage/Lavender inventory drift');
  const inv = JSON.parse(fs.readFileSync(path.join(ROOT, INVENTORY), 'utf8')) as Inventory;
  assert.equal(inv.schemaVersion, 'v652-mage-lavender-qa-delivery-r1');
  assert.equal(inv.status, 'QA_ONLY_PENDING_INDEPENDENT_INTEGRATION_AUDIT');
  assert.deepEqual(inv.avatars, [...AVATARS]);
  assert.deepEqual(inv.skins, [...SKINS]);
  assert.deepEqual(inv.excluded, ['outfit-racer', 'Lavender younger outfit-legend R1']);
  assert.equal(inv.pairs.length, 56);
  assert.equal(inv.catalogs.length, 2);
  const identities = new Set<string>();
  const targets = new Set<string>();
  for (const row of inv.pairs) {
    assert(ITEMS.includes(row.itemId as typeof ITEMS[number]));
    assert(AVATARS.includes(row.avatarId as typeof AVATARS[number]));
    assert(SKINS.includes(row.skinId as typeof SKINS[number]));
    const identity = `${row.itemId}:${row.avatarId}:${row.skinId}`;
    assert(!identities.has(identity), `duplicate detail: ${identity}`);
    identities.add(identity);
    const suffix = row.skinId === 'base' ? '' : `--${row.skinId}`;
    assert.equal(row.proposedPublic.overlay,
      `public/assets/v6.5.2/runtime/${row.avatarId}/${row.itemId}${suffix}--detail.png`);
    assert.equal(row.proposedPublic.mask,
      `public/assets/v6.5.2/runtime-masks/${row.avatarId}/${row.itemId}${suffix}--hair-visibility-mask.png`);
    for (const key of ['overlay', 'mask'] as const) {
      const qaTarget = `qa/v652/sol/20260926-hats-integration-r1/${row.itemId}/${row.avatarId}/${row.skinId}/`
        + (key === 'overlay' ? 'overlay.png' : 'hair-visibility-mask.png');
      assert.equal(row.qaDelivery[key], qaTarget);
      assert(!targets.has(row.proposedPublic[key]), 'duplicate public target');
      targets.add(row.proposedPublic[key]);
      exact(row[key], hashFile);
      exact({ path: qaTarget, sha256: row[key].sha256 }, hashFile);
    }
    exact(row.sourceReport, hashFile);
    exact(row.acceptedReview, hashFile);
    if (row.itemId === 'sister-lavender-hat' && row.avatarId === 'younger'
      && row.skinId === 'outfit-legend') {
      assert(row.overlay.path.includes('/lavender-younger-legend-r2/'));
      assert(row.mask.path.includes('/lavender-younger-legend-r2/'));
      assert(row.acceptedReview.path.endsWith('/lavender-younger-legend-r2-review.md'));
    }
  }
  for (const item of ITEMS) for (const avatar of AVATARS) for (const skin of SKINS) {
    assert(identities.has(`${item}:${avatar}:${skin}`), `missing detail ${item}:${avatar}:${skin}`);
  }
  for (const item of ITEMS) {
    const row = inv.catalogs.find(value => value.itemId === item);
    assert(row);
    assert.equal(row.proposedPublic, `public/assets/v6.5.2/catalog/hats/${item}.webp`);
    assert.equal(row.qaDelivery, `qa/v652/sol/20260926-hats-integration-r1/${item}/catalog.webp`);
    assert(!targets.has(row.proposedPublic), 'duplicate catalog target');
    targets.add(row.proposedPublic);
    exact(row.source, hashFile);
    exact({ path: row.qaDelivery, sha256: row.source.sha256 }, hashFile);
    exact(row.acceptedReview, hashFile);
  }
  assert.equal(targets.size, 114);
  return inv;
}

export function assertV652MageLavenderDetailContract(
  entryValue: unknown,
  options: { hashFile?: HashFile; verifyTargets?: boolean } = {},
) {
  const entry = entryValue as Entry;
  const hashFile = options.hashFile ?? sha256MageLavenderFile;
  assert(ITEMS.includes(entry.id as typeof ITEMS[number]));
  assert.equal(entry.slot, 'headwear');
  assert.equal(entry.renderer, 'aligned-overlay');
  assert.deepEqual(entry.supportedAvatars, [...AVATARS]);
  assert.deepEqual(entry.variants, Object.fromEntries(AVATARS.map(avatar =>
    [avatar, `public/assets/v6.4/runtime/${avatar}/${entry.id}.webp`])),
  'legacy variants changed');
  assert.equal(Object.hasOwn(entry, 'skinVariants'), false);
  const hasNew = ['defaultSkinDetails', 'skinDetails', 'catalogPath']
    .some(key => Object.hasOwn(entry, key));
  if (!hasNew) return { detailCount: 0, itemId: entry.id };

  const inv = inventory(hashFile);
  const pairs = inv.pairs.filter(row => row.itemId === entry.id);
  const bases: Record<string, Detail> = {};
  const skins: Record<string, Record<string, Detail>> = {};
  for (const row of pairs) {
    const detail = { overlay: row.proposedPublic.overlay,
      hairVisibilityMask: row.proposedPublic.mask };
    if (row.skinId === 'base') bases[row.avatarId] = detail;
    else (skins[row.avatarId] ??= {})[row.skinId] = detail;
    if (options.verifyTargets ?? true) {
      exact({ path: detail.overlay, sha256: row.overlay.sha256 }, hashFile);
      exact({ path: detail.hairVisibilityMask, sha256: row.mask.sha256 }, hashFile);
    }
  }
  assert.deepEqual(entry.defaultSkinDetails, bases, 'base detail admission mismatch');
  assert.deepEqual(entry.skinDetails, skins, 'skin detail admission mismatch');
  const catalog = inv.catalogs.find(row => row.itemId === entry.id)!;
  assert.equal(entry.catalogPath, catalog.proposedPublic, 'catalog admission mismatch');
  if (options.verifyTargets ?? true) exact({ path: catalog.proposedPublic,
    sha256: catalog.source.sha256 }, hashFile);
  assert.equal(entry.skinDetails?.brother?.['outfit-racer'], undefined, 'Racer detail leak');
  return { detailCount: pairs.length, itemId: entry.id };
}

export function assertV652MageLavenderAdmissionSet(
  entries: unknown[],
  options: { hashFile?: HashFile; verifyTargets?: boolean } = {},
) {
  let detailCount = 0;
  for (const item of ITEMS) {
    const matches = entries.filter(value => (value as Entry).id === item);
    assert.equal(matches.length, 1, `missing or duplicate ${item}`);
    detailCount += assertV652MageLavenderDetailContract(matches[0], options).detailCount;
  }
  assert([0, 56].includes(detailCount),
    'Mage and Lavender details must both be absent or both have exact 28-pair admission');
  return { detailCount };
}
