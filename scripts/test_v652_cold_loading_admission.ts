import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { assertColdLoadingAtomicGuard, assertV652ColdLoadingAdmission, coldLoadingCompileInventory, V652_COLD_LOADING_LOCK } from './v652_cold_loading_admission';
import { assertV652NativeRepairAdmission } from './v652_native_repair_admission';
import { assertV652NewDetailAdmission } from './v652_new_detail_admission';

const manifest = JSON.parse(fs.readFileSync('src/data/avatarAssetManifest.json', 'utf8'));
const cache = new Map<string, Buffer>();
const read = (path: string) => { if (!cache.has(path)) cache.set(path, fs.readFileSync(path)); return cache.get(path)!; };
const positive = assertV652ColdLoadingAdmission(manifest, { readFile: read });
const defaultPositive = assertV652ColdLoadingAdmission(manifest);
assert.equal(defaultPositive.coldRendererSHA256, positive.coldRendererSHA256);
const lock = JSON.parse(read(V652_COLD_LOADING_LOCK.path).toString());
const negatives: string[] = [];
const reject = (name: string, run: () => unknown) => { assert.throws(run, name); negatives.push(name); };
const runRead = (path: string, bytes: Buffer) => assertV652ColdLoadingAdmission(manifest, { readFile: p => p === path ? bytes : read(p) });
reject('stale-live-renderer', () => runRead(lock.renderer.path, read(lock.beforeRenderer.path)));
reject('missing-atomic-guard-byte', () => assertColdLoadingAtomicGuard(Buffer.from(read(lock.renderer.path).toString().replace('visible={!detail || activeDetailIds.has(item.id)}', 'visible={true}'))));
reject('missing-mounted-element-guard', () => assertColdLoadingAtomicGuard(Buffer.from(read(lock.renderer.path).toString().replace('mountedDetails[detailKey(detail)]?.isConnected', 'true'))));
reject('guard-mutated-live-renderer', () => runRead(lock.renderer.path, Buffer.from(read(lock.renderer.path).toString().replace('visible={!detail || activeDetailIds.has(item.id)}', 'visible={true}'))));
for (const [name, path] of [
  ['tampered-before-renderer', lock.beforeRenderer.path],
  ['compile-baseline-drift', lock.compileBaseline.path],
  ['immutable-fit-lock-drift', lock.fitLock.path],
  ['immutable-fit-helper-drift', lock.fitHelper.path],
  ['unrelated-source-drift', 'src/App.tsx'],
  ['api-source-drift', 'api/state.ts'],
  ['layout-source-drift', 'src/styles/components/shop.css'],
  ['art-overlay-drift', manifest.accessories.find((e: { id: string }) => e.id === 'hat-rocket').defaultSkinDetails.brother.overlay],
  ['art-mask-drift', manifest.accessories.find((e: { id: string }) => e.id === 'hat-rocket').defaultSkinDetails.brother.hairVisibilityMask],
  ['catalog-drift', manifest.accessories.find((e: { id: string }) => e.id === 'hair-nebula').catalogVariants.brother],
  ['cold-review-drift', lock.evidence[0].path],
]) reject(name, () => runRead(path, Buffer.concat([read(path), Buffer.from('tamper')])));
reject('missing-cold-evidence', () => assertV652ColdLoadingAdmission(manifest, { readFile: path => { if (path === lock.evidence[0].path) throw Error('missing evidence'); return read(path); } }));
const paths = coldLoadingCompileInventory();
reject('extra-compile-input', () => assertV652ColdLoadingAdmission(manifest, { readFile: read, compileInventory: () => [...paths, 'src/unreviewed.ts'] }));
reject('missing-compile-input', () => assertV652ColdLoadingAdmission(manifest, { readFile: read, compileInventory: () => paths.filter(p => p !== 'src/App.tsx') }));
reject('duplicate-compile-input', () => assertV652ColdLoadingAdmission(manifest, { readFile: read, compileInventory: () => [...paths, paths[0]] }));
const changed = structuredClone(manifest); changed.accessories[0].id += '-unreviewed';
reject('manifest-retarget', () => assertV652ColdLoadingAdmission(changed, { readFile: read }));
const prior400 = assertV652NativeRepairAdmission(positive.historicalManifest);
const prior92 = assertV652NewDetailAdmission(prior400.historicalManifest);
const result = { status: 'PASS_CODE_ONLY_COLD_LOADING_ADMISSION', manifestSHA256: positive.coldManifestSHA256,
  rendererSHA256: positive.coldRendererSHA256, lockSHA256: positive.coldLockSHA256,
  compileInputCount: positive.coldCompileInputCount, checkedFileCount: positive.coldCheckedFileCount,
  fitFilesChecked: positive.fitCheckedFileCount, fitLeafCount: positive.fitLeafCount,
  prior400: prior400.pairCount, prior92: prior92.detailCount, negativeControls: negatives,
  helperSHA256: crypto.createHash('sha256').update(fs.readFileSync('scripts/v652_cold_loading_admission.ts')).digest('hex'),
  scope: 'One live renderer change; exact historical renderer bytes only inside the prior immutable fit gate. Browser and independent visual evidence remain separately pinned.' };
fs.writeFileSync('qa/v652/root/20260927-cold-loading-fix/admission-test.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
