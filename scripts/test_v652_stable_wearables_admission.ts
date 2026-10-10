import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { assertV652StableWearablesAdmission, V652_STABLE_WEARABLES_LOCK } from './v652_stable_wearables_admission';
import { assertV652NativeRepairAdmission } from './v652_native_repair_admission';
import { assertV652NewDetailAdmission } from './v652_new_detail_admission';

const manifest = JSON.parse(fs.readFileSync('src/data/avatarAssetManifest.json', 'utf8'));
const positive = assertV652StableWearablesAdmission(manifest);
assert.equal(positive.stablePairCount, 40);
const prior400 = assertV652NativeRepairAdmission(positive.historicalManifest);
const prior92 = assertV652NewDetailAdmission(prior400.historicalManifest);
const negatives: string[] = [];
const reject = (name: string, run: () => unknown) => { assert.throws(run, name); negatives.push(name); };
for (const [name, mutate] of [
  ['wrong-avatar', (m: typeof manifest) => { const h = m.accessories.find((e: { id: string }) => e.id === 'hat-mage'); h.defaultSkinDetails.brother.overlay = h.defaultSkinDetails.younger.overlay; }],
  ['missing-layer', (m: typeof manifest) => { delete m.accessories.find((e: { id: string }) => e.id === 'hat-mage').defaultSkinDetails.sister.overlay; }],
  ['missing-mask', (m: typeof manifest) => { delete m.accessories.find((e: { id: string }) => e.id === 'hat-mage').defaultSkinDetails.sister.underHeadwearVisibilityMask; }],
  ['wrong-canvas', (m: typeof manifest) => { m.accessories.find((e: { id: string }) => e.id === 'hat-mage').defaultSkinDetails.brother.canvasTopPadding = 0; }],
  ['swapped-item', (m: typeof manifest) => { m.accessories.find((e: { id: string }) => e.id === 'hat-ocean').defaultSkinDetails.younger = m.accessories.find((e: { id: string }) => e.id === 'hat-mage').defaultSkinDetails.younger; }],
  ['unreviewed-other-role', (m: typeof manifest) => { m.accessories.find((e: { id: string }) => e.id === 'hat-ocean').defaultSkinDetails.brother.canvasTopPadding = 0; }],
] as const) reject(name, () => { const candidate = structuredClone(manifest); mutate(candidate); return assertV652StableWearablesAdmission(candidate); });
const lock = JSON.parse(fs.readFileSync(V652_STABLE_WEARABLES_LOCK.path, 'utf8'));
const before = JSON.parse(fs.readFileSync(lock.before.path, 'utf8'));
reject('stale-candidate', () => assertV652StableWearablesAdmission(before));
const cache = new Map<string, Buffer>();
const read = (path: string) => { if (!cache.has(path)) cache.set(path, fs.readFileSync(path)); return cache.get(path)!; };
for (const [name, path] of [
  ['renderer-reverted', 'src/components/AvatarRenderer.tsx'],
  ['overlay-bytes-drift', lock.pairs[0].after.overlay],
  ['catalog-bytes-drift', lock.catalog.after],
  ['historical-source-tamper', lock.sourceChanges[0].before.path],
]) reject(name, () => assertV652StableWearablesAdmission(manifest, { readFile: p => p === path ? Buffer.concat([read(p), Buffer.from('tamper')]) : read(p) }));
const result = { status: 'PASS_STABLE_WEARABLES_ADMISSION', manifestSHA256: positive.stableManifestSHA256,
  lockSHA256: V652_STABLE_WEARABLES_LOCK.sha256, pairCount: positive.stablePairCount,
  currentFilesChecked: positive.stableCheckedFileCount, priorFilesChecked: positive.checkedFileCount,
  priorCapes: positive.capePairCount, priorMaskFields: positive.maskFieldCount, negativeControls: negatives,
  prior400: prior400.pairCount, prior92: prior92.detailCount,
  helperSHA256: crypto.createHash('sha256').update(fs.readFileSync('scripts/v652_stable_wearables_admission.ts')).digest('hex'),
  releaseAcceptance: false };
fs.writeFileSync('qa/v652/root/20260927-wearable-drift-fix/admission-test.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
