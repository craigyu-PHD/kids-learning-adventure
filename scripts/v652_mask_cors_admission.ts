import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { assertColdLoadingAtomicGuard, assertV652ColdLoadingAdmission, coldLoadingCompileInventory, V652_COLD_LOADING_LOCK } from './v652_cold_loading_admission';
import { readAdmissionFile, type ReadAdmissionFile } from './v652_current_detail_admission';

type Link = { path: string; sha256: string };
type Manifest = { accessories: { id: string; [key: string]: unknown }[] };
type SourceChange = { path: string; before: Link; after: Link };
type Lock = {
  status: string; manifest: Link; coldHelper: Link; coldLock: Link; compileBaseline: Link;
  sourceChanges: SourceChange[]; evidence: Link[];
  proofs: { positive: Link; negative: Link; independent: Link };
};
const rendererPath = 'src/components/AvatarRenderer.tsx';
const readinessPath = 'src/useAvatarDetailReadiness.ts';
const expectedBefore: Record<string, string> = {
  [rendererPath]: '60a386fb95896bb851d928a9d3158b5951ac835379bf640f3b309f28da8cd747',
  [readinessPath]: '63159d04b9edfe10bb8e33f2627226bd3aea28490e3fbd0d033c771604e46c9e',
};
const manifestSHA256 = '1414e4226a2ecd5599da579711df7096dc893416c73c6c6ccf8f3f961fdbd622';
// Frozen after final two-source browser and independent CORS review.
export const V652_MASK_CORS_LOCK = {
  path: 'qa/v652/root/20260927-css-mask-ready-fix/admission-lock.json',
  sha256: 'ae3d9ae1d4b076a6a6ddc9352b1aeadf1a481791a566e6c8a72a24ebafd0bf7d',
};

export function assertMaskCorsProbeGuard(renderer: Buffer, readiness: Buffer) {
  assertColdLoadingAtomicGuard(renderer);
  const source = renderer.toString(), hook = readiness.toString();
  const headwearCors = source.indexOf("probe.crossOrigin = 'anonymous';");
  assert(headwearCors >= 0 && headwearCors < source.indexOf('probe.src = underHeadwearMaskPath;'), 'headwear mask CORS must precede src');
  const bodyCors = hook.indexOf("if (cssMask) image.crossOrigin = 'anonymous';");
  assert(bodyCors >= 0 && bodyCors < hook.indexOf('image.src = url;'), 'body mask CORS must precede src');
  assert(hook.includes('cssMask = false'), 'ordinary overlay probe mode changed');
  assert(hook.includes('load(detail.hairVisibilityMask,'), 'missing body mask probe');
  assert(hook.includes('height: AVATAR_CANVAS_HEIGHT } : undefined, true)'), 'body mask probe must opt into CSS CORS mode');
  assert(hook.includes('void image.decode().then(resolve, reject);'), 'mask decode guard missing');
}

/** The only historical substitutions are the two reviewed predecessor source files,
 * exclusively inside the immutable cold admission call. Live checks use live bytes. */
export function assertV652MaskCorsAdmission<T extends Manifest>(manifest: T, options: {
  readFile?: ReadAdmissionFile; compileInventory?: () => string[];
} = {}) {
  const read = options.readFile ?? ((path: string) => path.startsWith('src/') || path.startsWith('api/') || path.startsWith('scripts/') || path.startsWith('qa/v65/') || !path.includes('/')
    ? fs.readFileSync(path) : readAdmissionFile(path));
  const cache = new Map<string, Buffer>();
  const exact = (link: Link) => {
    assert(/^[a-f0-9]{64}$/.test(link.sha256), 'unfrozen mask CORS evidence');
    assert(!link.path.startsWith('/') && !link.path.split('/').includes('..'), 'unsafe mask CORS path');
    if (!cache.has(link.path)) cache.set(link.path, read(link.path));
    const bytes = cache.get(link.path)!;
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), link.sha256, `mask CORS evidence drift: ${link.path}`);
    return bytes;
  };
  assert(typeof V652_MASK_CORS_LOCK.sha256 === 'string', 'mask CORS admission awaits final reviewed freeze');
  const lock = JSON.parse(exact({ ...V652_MASK_CORS_LOCK, sha256: V652_MASK_CORS_LOCK.sha256 }).toString()) as Lock;
  assert.equal(lock.status, 'FROZEN_REVIEWED_TWO_SOURCE_CSS_MASK_CORS');
  assert.deepEqual(lock.manifest, { path: 'src/data/avatarAssetManifest.json', sha256: manifestSHA256 });
  assert.deepEqual(manifest, JSON.parse(exact(lock.manifest).toString()), 'unreviewed mask CORS manifest');
  assert.deepEqual(lock.coldLock, V652_COLD_LOADING_LOCK); exact(lock.coldLock);
  assert.equal(lock.coldHelper.path, 'scripts/v652_cold_loading_admission.ts'); exact(lock.coldHelper);
  assert.deepEqual(lock.sourceChanges.map(row => row.path).sort(), Object.keys(expectedBefore).sort());
  const before = new Map<string, Buffer>(), live = new Map<string, Buffer>();
  for (const row of lock.sourceChanges) {
    assert.equal(row.before.path, `qa/v652/astra/20260927-mask-cors-readiness/before/${row.path.split('/').at(-1)}`);
    assert.equal(row.before.sha256, expectedBefore[row.path]);
    assert.equal(row.after.path, row.path); assert.notEqual(row.after.sha256, row.before.sha256, 'stale mask CORS source');
    before.set(row.path, exact(row.before)); live.set(row.path, exact(row.after));
  }
  assertMaskCorsProbeGuard(live.get(rendererPath)!, live.get(readinessPath)!);
  assert.equal(lock.compileBaseline.path, 'qa/v652/release90/fit-reopen-20260927-r1/inputs-after.json');
  const baseline = JSON.parse(exact(lock.compileBaseline).toString()) as { compileInputSHA256: Record<string, string> };
  assert.equal(baseline.compileInputSHA256[readinessPath], expectedBefore[readinessPath]);
  assert.equal(baseline.compileInputSHA256[lock.manifest.path], manifestSHA256);
  const expectedPaths = Object.keys(baseline.compileInputSHA256).sort();
  const inventory = (options.compileInventory ?? coldLoadingCompileInventory)().sort();
  assert.equal(new Set(inventory).size, inventory.length, 'duplicate compile inputs');
  assert.deepEqual(inventory, expectedPaths, 'added or missing compile inputs');
  for (const [path, sha256] of Object.entries(baseline.compileInputSHA256)) if (!(path in expectedBefore)) exact({ path, sha256 });
  assert(lock.evidence.length >= 3, 'missing mask CORS review evidence');
  assert.equal(new Set(lock.evidence.map(row => row.path)).size, lock.evidence.length);
  lock.evidence.forEach(exact);
  for (const proof of Object.values(lock.proofs)) assert(lock.evidence.some(row => row.path === proof.path && row.sha256 === proof.sha256), 'unfrozen mask CORS proof');
  type Positive = { pass: boolean; sourceSHA256: string; errors: unknown[]; requestFailures: unknown[];
    checks: { pass: boolean }[]; maskRequestChecks: { pass: boolean; requests: Record<string, string[]> }[] };
  const positive = JSON.parse(exact(lock.proofs.positive).toString()) as Positive;
  assert.equal(positive.pass, true);
  assert.equal(positive.sourceSHA256, lock.sourceChanges.find(row => row.path === rendererPath)!.after.sha256);
  assert.equal(positive.checks.length, 8); assert(positive.checks.every(row => row.pass));
  assert.deepEqual(positive.errors, []); assert.deepEqual(positive.requestFailures, []);
  assert.equal(positive.maskRequestChecks.length, 8);
  const requests = positive.maskRequestChecks.flatMap(row => {
    assert(row.pass); return Object.values(row.requests);
  });
  assert.equal(requests.length, 20); requests.forEach(modes => assert.deepEqual(modes, ['cors'], 'CSS mask must reuse exactly one CORS request'));
  const negative = JSON.parse(exact(lock.proofs.negative).toString()) as { status: string; sourceSHA256: string };
  assert.equal(negative.status, 'RETURN_CSS_MASK_SECOND_FETCH_WINDOW');
  assert.equal(negative.sourceSHA256, expectedBefore[rendererPath]);
  const independent = JSON.parse(exact(lock.proofs.independent).toString()) as { status: string; finalSourcePins: Record<string, string>; manifestSHA256: string; reviewerProductWrites: boolean };
  assert.equal(independent.status, 'PASS_SCOPED_MASK_REQUEST_MODE_FIX');
  assert.deepEqual(independent.finalSourcePins, Object.fromEntries(lock.sourceChanges.map(row => [row.path, row.after.sha256])));
  assert.equal(independent.manifestSHA256, manifestSHA256); assert.equal(independent.reviewerProductWrites, false);
  // Immutable cold admission then invokes the immutable fit/art chain itself.
  const prior = assertV652ColdLoadingAdmission(manifest, { readFile: path => before.get(path) ?? read(path) });
  return { ...prior, maskCorsManifestSHA256: manifestSHA256, maskCorsSourceSHA256: Object.fromEntries(lock.sourceChanges.map(row => [row.path, row.after.sha256])),
    maskCorsCheckedFileCount: cache.size, maskCorsCompileInputCount: expectedPaths.length, maskCorsLockSHA256: V652_MASK_CORS_LOCK.sha256 };
}
