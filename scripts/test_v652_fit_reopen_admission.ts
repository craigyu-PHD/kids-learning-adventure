import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { assertV652FitReopenAdmission, V652_FIT_REOPEN_LOCK } from './v652_fit_reopen_admission';
import { assertV652NativeRepairAdmission } from './v652_native_repair_admission';
import { assertV652NewDetailAdmission } from './v652_new_detail_admission';

const manifest = JSON.parse(fs.readFileSync('src/data/avatarAssetManifest.json', 'utf8'));
const cache = new Map<string, Buffer>();
const read = (path: string) => { if (!cache.has(path)) cache.set(path, fs.readFileSync(path)); return cache.get(path)!; };
const positive = assertV652FitReopenAdmission(manifest, { readFile: read });
const prior400 = assertV652NativeRepairAdmission(positive.historicalManifest);
const prior92 = assertV652NewDetailAdmission(prior400.historicalManifest);
const negatives: string[] = [];
const reject = (name: string, run: () => unknown) => { assert.throws(run, name); negatives.push(name); };
for (const [name, mutate] of [
  ['wrong-avatar', (m: typeof manifest) => { const h = m.accessories.find((e: { id: string }) => e.id === 'hat-rocket'); h.defaultSkinDetails.brother.overlay = h.defaultSkinDetails.younger.overlay; }],
  ['missing-layer', (m: typeof manifest) => { delete m.accessories.find((e: { id: string }) => e.id === 'glasses-holo').variants.sister; }],
  ['missing-mask', (m: typeof manifest) => { delete m.accessories.find((e: { id: string }) => e.id === 'hair-cloud').defaultSkinDetails.sister.hairVisibilityMask; }],
  ['swapped-item', (m: typeof manifest) => { m.accessories.find((e: { id: string }) => e.id === 'hat-rocket').defaultSkinDetails.brother = m.accessories.find((e: { id: string }) => e.id === 'hat-mage').defaultSkinDetails.brother; }],
  ['unreviewed-body', (m: typeof manifest) => { m.skins[0].path += '?unreviewed'; }],
] as const) {
  const candidate = structuredClone(manifest);
  mutate(candidate);
  reject(name, () => assertV652FitReopenAdmission(candidate, { readFile: read }));
}
const lock = JSON.parse(read(V652_FIT_REOPEN_LOCK.path).toString());
reject('stale-candidate', () => assertV652FitReopenAdmission(JSON.parse(read(lock.before.path).toString()), { readFile: read }));
for (const [name, path] of [
  ['renderer-reverted', 'src/components/AvatarRenderer.tsx'],
  ['layout-reverted', 'src/styles/components/shop.css'],
  ['summary-layout-reverted', 'src/components/TreasureShowcase.tsx'],
  ['body-alignment-source-tamper', 'src/avatarBodyAlignment.ts'],
  ['overlay-bytes-drift', manifest.accessories.find((e: { id: string }) => e.id === 'glasses-holo').variants.brother],
  ['catalog-bytes-drift', manifest.accessories.find((e: { id: string }) => e.id === 'hat-rocket').catalogPath],
  ['historical-source-tamper', lock.sourceChanges.find((s: { path: string }) => s.path === 'src/components/AvatarRenderer.tsx').before.path],
  ['stale-visual-evidence', lock.reviews[0].path],
]) reject(name, () => assertV652FitReopenAdmission(manifest, { readFile: p => p === path ? Buffer.concat([read(p), Buffer.from('tamper')]) : read(p) }));
const result = {
  status: 'PASS_FIT_REOPEN_ADMISSION', manifestSHA256: positive.fitManifestSHA256,
  lockSHA256: V652_FIT_REOPEN_LOCK.sha256, leafCount: positive.fitLeafCount,
  currentFilesChecked: positive.fitCheckedFileCount, priorFilesChecked: positive.checkedFileCount,
  priorStablePairs: positive.stablePairCount, prior400: prior400.pairCount, prior92: prior92.detailCount,
  negativeControls: negatives,
  helperSHA256: crypto.createHash('sha256').update(fs.readFileSync('scripts/v652_fit_reopen_admission.ts')).digest('hex'),
  scope: 'Exact reviewed art, layout and renderer inputs; functional and visual reports remain separate evidence.',
};
fs.writeFileSync('qa/v652/root/20260927-fit-reopen/admission-test.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
