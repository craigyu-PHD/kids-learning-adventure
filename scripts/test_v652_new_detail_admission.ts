import assert from 'node:assert/strict';
import fs from 'node:fs';
import manifest from '../src/data/avatarAssetManifest.json';
import { assertV652NewDetailAdmission, V652_NEW_DETAIL_BATCH } from './v652_new_detail_admission';
import { readAdmissionFile, type ReadAdmissionFile } from './v652_current_detail_admission';
type Detail = { overlay: string; canvasTopPadding?: number; hairVisibilityMask?: string; evidence?: { path: string; sha256: string } };
type Entry = { id: string; catalogPath?: string; variants: Record<string, string>; defaultSkinDetails?: Record<string, Detail>; skinDetails: Record<string, Record<string, Detail>> };
const cache = new Map<string, Buffer>();
const read: ReadAdmissionFile = file => { if (!cache.has(file)) cache.set(file, readAdmissionFile(file)); return cache.get(file)!; };
const admitted = assertV652NewDetailAdmission(manifest, { readFile: read });
assert.equal(admitted.detailCount, 92); assert.equal(admitted.releaseAcceptance, false);
const baseline = JSON.parse(read(V652_NEW_DETAIL_BATCH.baseline.path).toString());
for (const item of admitted.affectedItemIds) {
  assert.deepEqual(admitted.historicalManifest.accessories.find(entry => entry.id === item),
    baseline.accessories.find((entry: Entry) => entry.id === item), 'projection reconstructs each pinned prior entry');
}
assert.deepEqual(admitted.historicalManifest.accessories.filter(entry => !admitted.affectedItemIds.has(entry.id)),
  manifest.accessories.filter(entry => !admitted.affectedItemIds.has(entry.id)), 'unrelated live entries remain unchanged');
const negatives: string[] = [];
function rejects(label: string, mutate: (m: { accessories: Entry[] }, overrides: Map<string, Buffer>) => void, error = /new-detail current admission mismatch/) {
  const m = structuredClone(manifest) as unknown as { accessories: Entry[] }; const overrides = new Map<string, Buffer>();
  mutate(m, overrides);
  assert.throws(() => assertV652NewDetailAdmission(m, { readFile: file => overrides.get(file) ?? read(file) }), error, label);
  negatives.push(label);
}
for (const item of admitted.affectedItemIds) {
  const entry = (m: { accessories: Entry[] }) => m.accessories.find(e => e.id === item)!;
  const detail = (m: { accessories: Entry[] }, role = 'brother') => entry(m).skinDetails[role]['outfit-racer'];
  rejects(`${item}:wrong-avatar`, m => { entry(m).skinDetails.younger['outfit-racer'] = structuredClone(detail(m, 'sister')); });
  rejects(`${item}:missing-pair`, m => { delete entry(m).skinDetails.younger['outfit-racer']; });
  rejects(`${item}:swapped-item`, m => { detail(m).overlay = m.accessories.find(e => e.id !== item && e.skinDetails?.brother?.['outfit-racer'])!.skinDetails.brother['outfit-racer'].overlay; });
  rejects(`${item}:padding`, m => { detail(m).canvasTopPadding = (detail(m).canvasTopPadding ?? 0) === 0 ? 256 : 0; });
  rejects(`${item}:catalog`, m => { entry(m).catalogPath = detail(m).overlay; });
  rejects(`${item}:stale-current-bytes`, (m, overrides) => { overrides.set(detail(m).overlay, read(entry(m).variants.brother)); }, /new-detail hash drift/);
  rejects(`${item}:legacy-binding`, m => { entry(m).variants.brother = entry(m).variants.younger; });
}
for (const [name, link] of [
  ['baseline', V652_NEW_DETAIL_BATCH.baseline], ['review', V652_NEW_DETAIL_BATCH.review],
  ['integration-one', V652_NEW_DETAIL_BATCH.integrations[0]], ['integration-two', V652_NEW_DETAIL_BATCH.integrations[1]],
  ['fresh-hat-capture', V652_NEW_DETAIL_BATCH.captures[0]], ['fresh-hair-capture', V652_NEW_DETAIL_BATCH.captures[1]],
] as const) rejects(`${name}:stale-evidence`, (_m, overrides) => { overrides.set(link.path, Buffer.from('{}')); }, /new-detail hash drift/);
const review = JSON.parse(read(V652_NEW_DETAIL_BATCH.review.path).toString());
rejects('missing-capture-image', (_m, overrides) => overrides.set(review.rows[0].capture, Buffer.alloc(0)), /new-detail hash drift/);
rejects('source-review-drift', (_m, overrides) => overrides.set(review.sourceReviewEvidence[0].path, Buffer.from('changed')), /new-detail hash drift/);
const integration = JSON.parse(read(V652_NEW_DETAIL_BATCH.integrations[1].path).toString());
rejects('native-source-drift', (_m, overrides) => overrides.set(integration.assets[0].source, Buffer.from('changed')), /new-detail hash drift/);
const catalog = integration.assets.find((a: { path: string }) => a.path.includes('/catalog/'));
rejects('catalog-bytes-drift', (_m, overrides) => overrides.set(catalog.path, Buffer.from('changed')), /new-detail hash drift/);
rejects('null-mask', m => { (m.accessories.find(e => e.id === 'starter-sun-cap')!.skinDetails.brother['outfit-racer'] as unknown as { hairVisibilityMask: null }).hairVisibilityMask = null; });
rejects('missing-item', m => { m.accessories = m.accessories.filter(e => e.id !== 'hat-rocket'); }, /missing\/duplicate current item/);
rejects('duplicate-item', m => { m.accessories.push(structuredClone(m.accessories.find(e => e.id === 'hat-rocket')!)); }, /missing\/duplicate current item/);
const unrelated = structuredClone(manifest) as unknown as { accessories: (Entry & { qaProbe?: string })[] };
unrelated.accessories.find(e => e.id === 'glasses-star')!.qaProbe = 'must-reach-legacy-validator';
assert.equal(assertV652NewDetailAdmission(unrelated, { readFile: read }).historicalManifest.accessories.find(e => e.id === 'glasses-star')!.qaProbe, 'must-reach-legacy-validator');
assert.deepEqual(manifest.accessories.find(e => e.id === 'starter-sun-cap')?.skinDetails?.brother?.['outfit-racer'], (JSON.parse(fs.readFileSync('src/data/avatarAssetManifest.json', 'utf8'))).accessories.find((e: Entry) => e.id === 'starter-sun-cap').skinDetails.brother['outfit-racer'], 'validator never mutates the product manifest');
console.log(JSON.stringify({ status: 'PASS_ENGINEERING_NEW_92_DETAIL_ADMISSION', detailCount: admitted.detailCount,
  checkedFileCount: admitted.checkedFileCount, negativeCount: negatives.length, negatives, releaseAcceptance: false }, null, 2));
