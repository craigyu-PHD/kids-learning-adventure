import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { assertMaskCorsProbeGuard, assertV652MaskCorsAdmission, V652_MASK_CORS_LOCK } from './v652_mask_cors_admission';
import { coldLoadingCompileInventory } from './v652_cold_loading_admission';
import { assertV652NativeRepairAdmission } from './v652_native_repair_admission';
import { assertV652NewDetailAdmission } from './v652_new_detail_admission';

const manifest = JSON.parse(fs.readFileSync('src/data/avatarAssetManifest.json', 'utf8'));
const cache = new Map<string, Buffer>();
const read = (path: string) => { if (!cache.has(path)) cache.set(path, fs.readFileSync(path)); return cache.get(path)!; };
const positive = assertV652MaskCorsAdmission(manifest, { readFile: read });
assert.deepEqual(assertV652MaskCorsAdmission(manifest).maskCorsSourceSHA256, positive.maskCorsSourceSHA256);
const lock = JSON.parse(read(V652_MASK_CORS_LOCK.path).toString());
const renderer = read('src/components/AvatarRenderer.tsx'), readiness = read('src/useAvatarDetailReadiness.ts');
const negatives: string[] = [];
const reject = (name: string, run: () => unknown) => { assert.throws(run, name); negatives.push(name); };
const runRead = (path: string, bytes: Buffer) => assertV652MaskCorsAdmission(manifest, { readFile: p => p === path ? bytes : read(p) });
for (const row of lock.sourceChanges) {
  reject(`stale-source:${row.path}`, () => runRead(row.path, read(row.before.path)));
  reject(`tampered-before:${row.path}`, () => runRead(row.before.path, Buffer.concat([read(row.before.path), Buffer.from('tamper')])));
}
reject('missing-headwear-cors', () => assertMaskCorsProbeGuard(Buffer.from(renderer.toString().replace("probe.crossOrigin = 'anonymous';", '')), readiness));
reject('missing-body-cors', () => assertMaskCorsProbeGuard(renderer, Buffer.from(readiness.toString().replace("if (cssMask) image.crossOrigin = 'anonymous';", ''))));
for (const [name, path] of [
  ['immutable-cold-lock-drift', lock.coldLock.path],
  ['immutable-cold-helper-drift', lock.coldHelper.path],
  ['unrelated-product-source-drift', 'src/App.tsx'],
  ['art-mask-drift', manifest.accessories.find((e: { id: string }) => e.id === 'hat-mage').defaultSkinDetails.brother.hairVisibilityMask],
  ['independent-review-drift', lock.proofs.independent.path],
]) reject(name, () => runRead(path, Buffer.concat([read(path), Buffer.from('tamper')])));
reject('missing-review', () => assertV652MaskCorsAdmission(manifest, { readFile: path => { if (path === lock.proofs.positive.path) throw Error('missing evidence'); return read(path); } }));
const paths = coldLoadingCompileInventory();
reject('extra-compile-input', () => assertV652MaskCorsAdmission(manifest, { readFile: read, compileInventory: () => [...paths, 'src/unreviewed.ts'] }));
reject('missing-compile-input', () => assertV652MaskCorsAdmission(manifest, { readFile: read, compileInventory: () => paths.filter(p => p !== 'src/App.tsx') }));
const changed = structuredClone(manifest); changed.accessories[0].id += '-unreviewed';
reject('manifest-retarget', () => assertV652MaskCorsAdmission(changed, { readFile: read }));
const prior400 = assertV652NativeRepairAdmission(positive.historicalManifest);
const prior92 = assertV652NewDetailAdmission(prior400.historicalManifest);
const result = { status: 'PASS_TWO_SOURCE_MASK_CORS_ADMISSION', manifestSHA256: positive.maskCorsManifestSHA256,
  sources: positive.maskCorsSourceSHA256, lockSHA256: positive.maskCorsLockSHA256,
  compileInputCount: positive.maskCorsCompileInputCount, checkedFileCount: positive.maskCorsCheckedFileCount,
  coldCheckedFileCount: positive.coldCheckedFileCount, fitFilesChecked: positive.fitCheckedFileCount,
  fitLeafCount: positive.fitLeafCount, prior400: prior400.pairCount, prior92: prior92.detailCount, negativeControls: negatives,
  helperSHA256: crypto.createHash('sha256').update(fs.readFileSync('scripts/v652_mask_cors_admission.ts')).digest('hex'),
  scope: 'Exactly two live files; previous cold helper/lock and fit/art chain unchanged. Browser/visual proof pinned separately.' };
fs.writeFileSync('qa/v652/root/20260927-css-mask-ready-fix/admission-test.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
