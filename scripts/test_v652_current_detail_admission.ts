import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import currentManifest from '../src/data/avatarAssetManifest.json';
import { assertV652NewDetailAdmission } from './v652_new_detail_admission';
import { assertV652CurrentDetailAdmission, readAdmissionFile,
  V652_CURRENT_DETAIL_CONTRACTS, type ReadAdmissionFile } from './v652_current_detail_admission';

const { historicalManifest: manifest } = assertV652NewDetailAdmission(currentManifest);

type TestDetail = { overlay: string; canvasTopPadding: number; hairVisibilityMask?: string | null };
type TestEntry = { id: string; variants: Record<string, string>; catalogPath: string;
  defaultSkinDetails: Record<string, TestDetail>; skinDetails: Record<string, Record<string, TestDetail>> };
const cache = new Map<string, Buffer>();
const readCached: ReadAdmissionFile = file => {
  if (!cache.has(file)) cache.set(file, readAdmissionFile(file));
  return cache.get(file)!;
};
const baseline = assertV652CurrentDetailAdmission(manifest.accessories, { readFile: readCached });
assert.equal(baseline.detailCount, 112); assert.equal(baseline.releaseAcceptance, false);
assert.deepEqual([...baseline.admittedItemIds], ['sunny-explorer-hat', 'hair-cloud', 'hair-nebula', 'hair-legend']);

const results: string[] = [];
function rejects(name: string, change: (entries: TestEntry[], overrides: Map<string, Buffer>) => void,
  expected: RegExp) {
  const entries = structuredClone(manifest.accessories) as unknown as TestEntry[];
  const overrides = new Map<string, Buffer>(); change(entries, overrides);
  assert.throws(() => assertV652CurrentDetailAdmission(entries,
    { readFile: file => overrides.get(file) ?? readCached(file) }), expected, name);
  results.push(name);
}
for (const contract of V652_CURRENT_DETAIL_CONTRACTS) {
  const item = contract.itemId;
  const entry = (entries: TestEntry[]) => entries.find(value => value.id === item)!;
  rejects(`${item}:wrong-avatar`, entries => {
    entry(entries).defaultSkinDetails.younger = structuredClone(entry(entries).defaultSkinDetails.sister);
  }, /base detail admission mismatch/);
  rejects(`${item}:missing-pair`, entries => {
    delete entry(entries).skinDetails.younger['outfit-cadet'];
  }, /skin detail admission mismatch/);
  rejects(`${item}:swapped-item`, entries => {
    entry(entries).defaultSkinDetails.brother.overlay = entry(entries).defaultSkinDetails.brother.overlay
      .replace(item, item === 'hair-cloud' ? 'sunny-explorer-hat' : 'hair-cloud');
  }, /base detail admission mismatch/);
  rejects(`${item}:valid-stale-hash-map`, (_entries, overrides) => {
    const mapping = JSON.parse(readCached(contract.mapping.path).toString('utf8'));
    const oldBytes = readCached(`public/assets/v6.4/runtime/brother/${item}.webp`);
    mapping.pairs[0].detail.overlay.sha256 = crypto.createHash('sha256').update(oldBytes).digest('hex');
    overrides.set(contract.mapping.path, Buffer.from(JSON.stringify(mapping)));
  }, /hash drift/);
  rejects(`${item}:null-mask`, entries => {
    entry(entries).defaultSkinDetails.younger.hairVisibilityMask = null;
  }, /base detail admission mismatch/);
  rejects(`${item}:padding`, entries => {
    entry(entries).defaultSkinDetails.brother.canvasTopPadding =
      entry(entries).defaultSkinDetails.brother.canvasTopPadding === 0 ? 256 : 0;
  }, /base detail admission mismatch/);
  rejects(`${item}:catalog`, entries => {
    entry(entries).catalogPath = `public/assets/v6.4/runtime/brother/${item}.webp`;
  }, /catalog admission mismatch/);
  rejects(`${item}:public-target`, entries => {
    entry(entries).skinDetails.sister['outfit-legend'].overlay =
      entry(entries).skinDetails.sister['outfit-legend'].overlay.replace('/sister/', '/brother/');
  }, /skin detail admission mismatch/);
  rejects(`${item}:stale-public-bytes`, (entries, overrides) => {
    overrides.set(entry(entries).defaultSkinDetails.brother.overlay,
      readCached(`public/assets/v6.4/runtime/brother/${item}.webp`));
  }, /hash drift/);
  rejects(`${item}:legacy-path`, entries => {
    entry(entries).variants.brother = entry(entries).variants.younger;
  }, /legacy variants changed/);
  rejects(`${item}:legacy-byte-drift`, (_entries, overrides) => {
    overrides.set(`public/assets/v6.4/runtime/brother/${item}.webp`, Buffer.from('changed legacy'));
  }, /hash drift/);
  rejects(`${item}:Racer`, entries => {
    entry(entries).skinDetails.brother['outfit-racer'] = structuredClone(entry(entries).defaultSkinDetails.brother);
  }, /skin detail admission mismatch/);
  rejects(`${item}:duplicate-item`, entries => { entries.push(structuredClone(entry(entries))); }, /missing\/duplicate item/);
  rejects(`${item}:review-drift`, (_entries, overrides) => {
    const completion = JSON.parse(readCached(contract.completion.path).toString('utf8'));
    overrides.set(contract.integratedCompletion ? completion.freshCompletion.path : completion.evidence[0].path, Buffer.from('review bytes changed'));
  }, /hash drift/);
  rejects(`${item}:completion-boundary`, (_entries, overrides) => {
    const completion = JSON.parse(readCached(contract.completion.path).toString('utf8'));
    completion.releaseAcceptance = true;
    overrides.set(contract.completion.path, Buffer.from(JSON.stringify(completion)));
  }, /hash drift/);
  rejects(`${item}:map-pair-removal`, (_entries, overrides) => {
    const mapping = JSON.parse(readCached(contract.mapping.path).toString('utf8'));
    mapping.pairs.pop(); overrides.set(contract.mapping.path, Buffer.from(JSON.stringify(mapping)));
  }, /hash drift/);
}
console.log(JSON.stringify({ status: 'PASS_ENGINEERING_CURRENT_DETAIL_ADMISSION',
  detailCount: baseline.detailCount, pinnedFileCount: baseline.checkedFileCount,
  negativeCount: results.length, negatives: results, releaseAcceptance: false }, null, 2));
