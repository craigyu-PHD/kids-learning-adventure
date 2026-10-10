import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { assertV652FitReopenAdmission, V652_FIT_REOPEN_LOCK } from './v652_fit_reopen_admission';
import { readAdmissionFile, type ReadAdmissionFile } from './v652_current_detail_admission';

type Link = { path: string; sha256: string };
type Manifest = { accessories: { id: string; [key: string]: unknown }[] };
type Lock = {
  status: string; manifest: Link; beforeRenderer: Link; renderer: Link;
  compileBaseline: Link; fitHelper: Link; fitLock: Link;
  evidence: Link[]; reviewedCases: string[];
  proofs: { coldBrowser: Link; oldRendererNegative: Link; independentReview: Link };
};
const rendererPath = 'src/components/AvatarRenderer.tsx';
const beforeRendererSHA256 = '7be67e8bcf453c351961305e32fe8a87a1a1ec0b2d904316e01599cca6c93fdb';
const manifestSHA256 = '1414e4226a2ecd5599da579711df7096dc893416c73c6c6ccf8f3f961fdbd622';
// Frozen only after final cold-browser and independent cached-remount review.
export const V652_COLD_LOADING_LOCK = {
  path: 'qa/v652/root/20260927-cold-loading-fix/admission-lock.json',
  sha256: '6fa758cd45e4f53bc28ac8633d7eabbd5ef9179698f8e4ec71e5b09926afd1ef',
};

/** Byte checks complement the immutable hash; they do not replace browser proof. */
export function assertColdLoadingAtomicGuard(bytes: Buffer) {
  const source = bytes.toString();
  for (const required of [
    'void image.decode().then(() => {',
    'if (image.isConnected) callbacks.current.onDecoded?.(image);',
    'candidateDetails.filter(detail => mountedDetails[detailKey(detail)]?.isConnected',
    'decodedHeadwearMask === maskKey',
    'const activeDetailIds = new Set(activeDetails.map(detail => detail.itemId));',
    'const bodyMasks = [...new Set(activeDetails.flatMap(',
    'activeDetailIds.has(hatDetail.itemId) && underHeadwearMaskPath',
    'visible={!detail || activeDetailIds.has(item.id)}',
    'eager={eager || Boolean(detail)}',
    '[detailKey(detail)]: image',
  ]) assert(source.includes(required), `missing cold atomic guard: ${required}`);
}

export function coldLoadingCompileInventory(): string[] {
  const walk = (directory: string): string[] => fs.readdirSync(directory, { withFileTypes: true })
    .flatMap(entry => entry.isDirectory() ? walk(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`]);
  return [...walk('src'), ...walk('api'), 'index.html', 'package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json'].sort();
}

/** The historical override is confined to the old helper invocation and one path.
 * Live code, manifest, other compile inputs and every old art/evidence pin still fail closed. */
export function assertV652ColdLoadingAdmission<T extends Manifest>(manifest: T, options: {
  readFile?: ReadAdmissionFile; compileInventory?: () => string[];
} = {}) {
  const read = options.readFile ?? ((path: string) => path.startsWith('src/') || path.startsWith('api/') || !path.includes('/')
    ? fs.readFileSync(path) : readAdmissionFile(path));
  const cache = new Map<string, Buffer>();
  const exact = (link: Link) => {
    assert(/^[a-f0-9]{64}$/.test(link.sha256), 'unfrozen cold-loading evidence');
    assert(!link.path.startsWith('/') && !link.path.split('/').includes('..'), 'unsafe cold-loading path');
    if (!cache.has(link.path)) cache.set(link.path, read(link.path));
    const bytes = cache.get(link.path)!;
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), link.sha256, `cold-loading evidence drift: ${link.path}`);
    return bytes;
  };
  assert(typeof V652_COLD_LOADING_LOCK.sha256 === 'string', 'cold-loading admission awaits final reviewed freeze');
  const lock = JSON.parse(exact({ ...V652_COLD_LOADING_LOCK, sha256: V652_COLD_LOADING_LOCK.sha256 }).toString()) as Lock;
  assert.equal(lock.status, 'FROZEN_REVIEWED_CODE_ONLY_COLD_LOADING');
  assert.deepEqual(lock.manifest, { path: 'src/data/avatarAssetManifest.json', sha256: manifestSHA256 });
  assert.deepEqual(manifest, JSON.parse(exact(lock.manifest).toString()), 'unreviewed cold-loading manifest');
  assert.deepEqual(lock.fitLock, V652_FIT_REOPEN_LOCK); exact(lock.fitLock);
  assert.equal(lock.fitHelper.path, 'scripts/v652_fit_reopen_admission.ts'); exact(lock.fitHelper);
  assert.equal(lock.beforeRenderer.path, 'qa/v652/astra/20260927-mounted-detail-readiness/before/AvatarRenderer.tsx');
  assert.equal(lock.beforeRenderer.sha256, beforeRendererSHA256);
  const before = exact(lock.beforeRenderer);
  assert.equal(lock.renderer.path, rendererPath);
  assert.notEqual(lock.renderer.sha256, beforeRendererSHA256, 'stale cold-loading renderer');
  const liveRenderer = exact(lock.renderer); assertColdLoadingAtomicGuard(liveRenderer);
  assert.equal(lock.compileBaseline.path, 'qa/v652/release90/fit-reopen-20260927-r1/inputs-after.json');
  const baseline = JSON.parse(exact(lock.compileBaseline).toString()) as { compileInputSHA256: Record<string, string> };
  assert.equal(baseline.compileInputSHA256[rendererPath], beforeRendererSHA256);
  assert.equal(baseline.compileInputSHA256[lock.manifest.path], manifestSHA256);
  const expectedPaths = Object.keys(baseline.compileInputSHA256).sort();
  const actualPaths = (options.compileInventory ?? coldLoadingCompileInventory)().sort();
  assert.equal(new Set(actualPaths).size, actualPaths.length, 'duplicate compile input');
  assert.deepEqual(actualPaths, expectedPaths, 'added or missing compile inputs');
  for (const [path, sha256] of Object.entries(baseline.compileInputSHA256)) {
    if (path !== rendererPath) exact({ path, sha256 });
  }
  assert(lock.evidence.length >= 3, 'missing cold browser, negative or independent review evidence');
  assert.equal(new Set(lock.evidence.map(row => row.path)).size, lock.evidence.length);
  lock.evidence.forEach(exact);
  for (const proof of Object.values(lock.proofs)) assert(lock.evidence.some(row => row.path === proof.path && row.sha256 === proof.sha256), 'unfrozen cold proof');
  type BrowserReport = { status: string; negative: boolean; rendererSHA256: string; pass: boolean; errors: unknown[]; blocked: unknown[]; rows: { role: string; pass: boolean }[] };
  const cold = JSON.parse(exact(lock.proofs.coldBrowser).toString()) as BrowserReport;
  assert.equal(cold.status, 'PASS'); assert.equal(cold.negative, false); assert.equal(cold.pass, true);
  assert.equal(cold.rendererSHA256, lock.renderer.sha256); assert.equal(cold.rows.length, 28);
  assert(cold.rows.every(row => row.pass)); assert.deepEqual(cold.errors, []); assert.deepEqual(cold.blocked, []);
  const negative = JSON.parse(exact(lock.proofs.oldRendererNegative).toString()) as BrowserReport;
  assert.equal(negative.status, 'EXPECTED_FAIL'); assert.equal(negative.negative, true); assert.equal(negative.pass, false);
  assert.equal(negative.rows.length, 4); assert(negative.rows.every(row => row.pass === false));
  assert.deepEqual(negative.errors, []); assert.deepEqual(negative.blocked, []);
  assert.deepEqual(negative.rows.map(row => row.role).sort(), ['brother', 'younger', 'sister', 'younger-sister'].sort());
  const independent = JSON.parse(exact(lock.proofs.independentReview).toString()) as { status: string; rendererSHA256: string; cachedRuntime: { result: string; cachedRemounts: number }; independentRuntime: { cases: number } };
  assert.equal(independent.status, 'PASS_SCOPED_CODE_AND_COLD_READINESS');
  assert.equal(independent.rendererSHA256, lock.renderer.sha256);
  assert.equal(independent.independentRuntime.cases, 7);
  assert.equal(independent.cachedRuntime.result, 'PASS'); assert.equal(independent.cachedRuntime.cachedRemounts, 35);
  assert.deepEqual([...lock.reviewedCases].sort(), ['cold-dom-decode', 'independent-visual', 'old-renderer-negative'].sort());
  // Never supply historical bytes to live checks above; only the immutable old gate sees this one override.
  const prior = assertV652FitReopenAdmission(manifest, { readFile: path => path === rendererPath ? before : read(path) });
  return { ...prior, coldManifestSHA256: manifestSHA256, coldRendererSHA256: lock.renderer.sha256,
    coldCheckedFileCount: cache.size, coldCompileInputCount: expectedPaths.length, coldLockSHA256: V652_COLD_LOADING_LOCK.sha256 };
}
