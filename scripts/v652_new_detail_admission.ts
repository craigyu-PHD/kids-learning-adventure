import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readAdmissionFile, type ReadAdmissionFile } from './v652_current_detail_admission';

type Link = { path: string; sha256: string };
type Detail = { overlay: string; canvasTopPadding?: number; hairVisibilityMask?: string; evidence?: Link };
type Entry = { id: string; catalogPath?: string; defaultSkinDetails?: Record<string, Detail>;
  skinDetails?: Record<string, Record<string, Detail>>; [key: string]: unknown };
type Row = { item: string; avatar: string; skin: string; detail: Detail;
  assetHashes: Record<string, string>; capture: string; captureSHA256: string; runtimeBinding: string };
type Capture = { manifestSHA256: string; errors: unknown[]; rows: { itemId: string; skin: string;
  screenshot: string; proof: { className: string; detail: string | null; padding: string | null;
    images: { src: string; width: number; height: number; mask: string; visible: string }[] }[] }[] };
const ROOT = 'qa/v652/root/20260927-shop-quality-reopen/';
const AVATARS = ['brother', 'younger', 'sister', 'younger-sister'];
const SKINS = ['base', 'outfit-cadet', 'outfit-racer', 'outfit-mecha', 'outfit-ocean', 'outfit-mage', 'outfit-legend', 'sister-bloom-outfit'];
const RACER_ITEMS = ['sunny-explorer-hat', 'hat-ocean', 'hat-mage', 'sister-lavender-hat', 'hair-cloud', 'hair-nebula', 'hair-legend'];
const NATIVE_ITEMS = ['starter-sun-cap', 'hat-rocket'];
export const V652_NEW_DETAIL_BATCH = {
  baseline: { path: ROOT + 'racer-hats-integration-r1/manifest-before.json', sha256: '671cc75daa6460f8eefd0ab8b795fcef6d49b2b37aec563a4554cf435115bbb1' },
  intermediateSHA256: '4a583b5a6b2c94e493a0940bcab61e113250948cbb8fa25094e236ba52e8d5e2',
  manifestSHA256: 'd53de4cad8a91392263ab5507b9cefaa62790157acd3f5530b5462fe2081d6b6',
  integrations: [
    { path: ROOT + 'racer-hats-integration-r1/integration.json', sha256: 'a1c96241055d1cea995dc8c62aa67dbf50799a3470710092cbd0fb1d2a2487bb' },
    { path: ROOT + 'native-hats-racer-hair-integration-r1/integration.json', sha256: 'e6a4185b5aea48217225fab8661aa2e063b414a6b0c771cf0334870ab6635315' },
  ],
  review: { path: ROOT + 'native-hats-racer-hair-integration-r1/scoped-review.json', sha256: '0736b9f4133a36a4f432cdfd959ccea72bef4e65cda8c6e585e5a5b8b3943cf3' },
  captures: [
    { path: ROOT + 'native-hats-integrated-r1/capture.json', sha256: 'd33e03ab5bcd49a5b009a9ff53f43bdb2f3ddaaf9443fe118430364d0baee145' },
    { path: ROOT + 'racer-hair-integrated-r1/capture.json', sha256: 'dc6d84d7509fbb8c6649ae20d1eb7ff38b447933f3a485152f529baf4523f587' },
  ],
} as const;

function dimensions(bytes: Buffer): number[] {
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF'); assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  const kind = bytes.toString('ascii', 12, 16);
  if (kind === 'VP8X') return [bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1];
  if (kind === 'VP8L') { const value = bytes.readUInt32LE(21); return [(value & 0x3fff) + 1, ((value >>> 14) & 0x3fff) + 1]; }
  assert.equal(kind, 'VP8 '); return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
}

/** Validate this immutable delta before projecting its prior bindings into the legacy gates.
 * Other entries and every non-detail field retain the live values: projection cannot hide
 * unrelated changes. Future batches can compose another validated projection before this one.
 * This admits scoped single-item bindings, never mixed-equipment or release acceptance.
 */
export function assertV652NewDetailAdmission<T extends { accessories: unknown[] }>(
  manifest: T, options: { readFile?: ReadAdmissionFile } = {},
) {
  const readFile = options.readFile ?? readAdmissionFile;
  const cache = new Map<string, Buffer>();
  const exact = (link: Link) => {
    assert(link && /^[0-9a-f]{64}$/.test(link.sha256), 'invalid new-detail link');
    assert(/^(qa\/v652\/|public\/assets\/)/.test(link.path) && !link.path.split('/').includes('..'), 'unscoped new-detail link');
    if (!cache.has(link.path)) cache.set(link.path, readFile(link.path));
    const bytes = cache.get(link.path)!;
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), link.sha256, `new-detail hash drift: ${link.path}`);
    return bytes;
  };
  const parsed = <U,>(link: Link): U => JSON.parse(exact(link).toString('utf8')) as U;
  const batch = V652_NEW_DETAIL_BATCH;
  const baseline = parsed<{ accessories: Entry[] }>(batch.baseline);
  const review = parsed<{ status: string; releaseAcceptance: boolean; manifestSHA256: string; captureManifestMatches: boolean;
    rowCount: number; rows: Row[]; sourceReviewEvidence: Link[]; limitations: string[] }>(batch.review);
  assert.equal(review.status, 'PASS_SCOPED_LOCAL_92_DETAIL_BINDINGS');
  assert.equal(review.releaseAcceptance, false); assert(review.limitations.length > 0);
  assert.equal(review.manifestSHA256, batch.manifestSHA256); assert.equal(review.captureManifestMatches, true);
  assert.equal(review.rowCount, 92); assert.equal(review.rows.length, 92);
  assert.equal(review.sourceReviewEvidence.length, 3);
  for (const link of review.sourceReviewEvidence) exact(link);
  const captures = batch.captures.map(link => parsed<Capture>(link));
  for (const capture of captures) { assert.equal(capture.manifestSHA256, batch.manifestSHA256); assert.deepEqual(capture.errors, []); }
  const first = parsed<{ beforeSHA256: string; afterSHA256: string; pairs: { itemId: string; avatarId: string; skinId: string; detail: Detail; candidateOutputSHA256: Record<string, string> }[] }>(batch.integrations[0]);
  const second = parsed<{ manifestBeforeSHA256: string; manifestAfterSHA256: string; pairCount: number;
    pairs: { item: string; avatar: string; skin: string; detail: Detail }[];
    assets: { source: string; sourceSHA256: string; path: string; sha256: string; rgbaIdentical: boolean }[] }>(batch.integrations[1]);
  assert.equal(first.beforeSHA256, batch.baseline.sha256); assert.equal(first.afterSHA256, batch.intermediateSHA256);
  assert.equal(second.manifestBeforeSHA256, first.afterSHA256); assert.equal(second.manifestAfterSHA256, batch.manifestSHA256);
  assert.equal(first.pairs.length, 16); assert.equal(second.pairs.length, 76); assert.equal(second.pairCount, 76);
  for (const asset of second.assets) {
    exact({ path: asset.source, sha256: asset.sourceSHA256 }); exact(asset);
    assert.equal(asset.rgbaIdentical, true, 'delivery changed reviewed pixels');
  }
  const integrated = [
    ...first.pairs.map(row => ({ item: row.itemId, avatar: row.avatarId, skin: row.skinId, detail: row.detail })),
    ...second.pairs,
  ];
  const expectedIdentities = new Set([
    ...NATIVE_ITEMS.flatMap(item => AVATARS.flatMap(avatar => SKINS.map(skin => `${item}:${avatar}:${skin}`))),
    ...RACER_ITEMS.flatMap(item => AVATARS.map(avatar => `${item}:${avatar}:outfit-racer`)),
  ]);
  const expected = structuredClone(baseline.accessories);
  const seen = new Set<string>();
  for (const row of review.rows) {
    const key = `${row.item}:${row.avatar}:${row.skin}`;
    assert(expectedIdentities.has(key) && !seen.has(key), `wrong/duplicate new-detail pair: ${key}`); seen.add(key);
    const original = integrated.filter(value => `${value.item}:${value.avatar}:${value.skin}` === key);
    assert.equal(original.length, 1, 'integration identity mismatch'); assert.deepEqual(row.detail, original[0].detail, 'integration detail mismatch');
    const racerHat = first.pairs.find(value => value.itemId === row.item && value.avatarId === row.avatar && value.skinId === row.skin);
    if (racerHat) assert.deepEqual(row.assetHashes, racerHat.candidateOutputSHA256, 'candidate output hash mismatch');
    assert.equal(row.runtimeBinding, 'PASS');
    const padding = row.detail.canvasTopPadding ?? 0; assert([0,256].includes(padding));
    assert(row.detail.overlay.startsWith(`public/assets/v6.5.2/runtime/${row.avatar}/`), 'wrong avatar overlay');
    assert.deepEqual(dimensions(exact({ path: row.detail.overlay, sha256: row.assetHashes.overlay })), [1024,1536 + padding]);
    if (row.detail.hairVisibilityMask) {
      assert(row.detail.hairVisibilityMask.startsWith(`public/assets/v6.5.2/runtime-masks/${row.avatar}/`), 'wrong avatar mask');
      assert.deepEqual(dimensions(exact({ path: row.detail.hairVisibilityMask, sha256: row.assetHashes.hairVisibilityMask })), [1024,1536]);
    } else assert.equal(row.assetHashes.hairVisibilityMask, undefined);
    if (row.detail.evidence) exact(row.detail.evidence);
    exact({ path: row.capture, sha256: row.captureSHA256 });
    const frames = captures.flatMap(c => c.rows).filter(frame => frame.screenshot === row.capture && frame.itemId === row.item && frame.skin === row.skin);
    assert.equal(frames.length, 1, 'missing exact fresh runtime frame');
    const actors = frames[0].proof.filter(actor => actor.className.split(' ').includes(`avatar-${row.avatar}`));
    assert.equal(actors.length, 1); const actor = actors[0];
    assert.equal(actor.detail, row.item); assert.equal(Number(actor.padding), padding);
    assert(actor.images.some(img => new URL(img.src).pathname === row.detail.overlay.replace(/^public/, '') && img.visible === 'visible'), 'fresh runtime overlay mismatch');
    if (row.detail.hairVisibilityMask) assert(actor.images.some(img => img.mask.includes(row.detail.hairVisibilityMask!.replace(/^public/, ''))), 'fresh runtime mask mismatch');
    const entry = expected.find(value => value.id === row.item)!;
    if (row.skin === 'base') (entry.defaultSkinDetails ??= {})[row.avatar] = row.detail;
    else ((entry.skinDetails ??= {})[row.avatar] ??= {})[row.skin] = row.detail;
  }
  assert.deepEqual(seen, expectedIdentities, 'missing new-detail pair');
  // Catalog changes are explicit and hash-bound to the integration's original native source.
  for (const item of NATIVE_ITEMS) {
    const catalogPath = `public/assets/v6.5.2/catalog/${item}--native-20260927.webp`;
    const assets = second.assets.filter(asset => asset.path === catalogPath); assert.equal(assets.length, 1, 'missing native catalog evidence');
    exact(assets[0]); expected.find(entry => entry.id === item)!.catalogPath = catalogPath;
  }
  const affected = new Set([...NATIVE_ITEMS, ...RACER_ITEMS]);
  for (const item of affected) {
    const live = (manifest.accessories as Entry[]).filter(entry => entry.id === item);
    assert.equal(live.length, 1, `missing/duplicate current item ${item}`);
    assert.deepEqual(live[0], expected.find(entry => entry.id === item), `new-detail current admission mismatch: ${item}`);
  }
  const historicalManifest = structuredClone(manifest);
  historicalManifest.accessories = (historicalManifest.accessories as Entry[]).map(entry => {
    if (!affected.has(entry.id)) return entry;
    const old = baseline.accessories.find(value => value.id === entry.id)!;
    // Only restore fields changed by this validated delta; legacy metadata stays current.
    for (const field of ['defaultSkinDetails', 'skinDetails', 'catalogPath']) {
      if (Object.hasOwn(old, field)) entry[field] = structuredClone(old[field]); else delete entry[field];
    }
    return entry;
  });
  return { historicalManifest, detailCount: seen.size, checkedFileCount: cache.size, affectedItemIds: affected,
    releaseAcceptance: false as const, scope: 'single-item fit only; mixed equipment and hair catalog identity remain unaccepted' };
}
