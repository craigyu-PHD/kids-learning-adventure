import assert from 'node:assert/strict';
import currentManifest from '../src/data/avatarAssetManifest.json';
import { assertV652NewDetailAdmission } from './v652_new_detail_admission';
import { assertV652NativeRepairAdmission } from './v652_native_repair_admission';
import { assertV652MaskCorsAdmission } from './v652_mask_cors_admission';
import {
  assertV652OceanDetailContract,
  expectedV652OceanManifestFields,
  sha256OceanFile,
  V652_OCEAN_AVATARS,
  V652_OCEAN_ITEM_ID,
  V652_OCEAN_LEGACY_VARIANTS,
  V652_OCEAN_PLAN,
  type OceanManifestEntry,
} from './v652_ocean_detail_gate';

const { historicalManifest: manifest } = assertV652NewDetailAdmission(assertV652NativeRepairAdmission(assertV652MaskCorsAdmission(currentManifest).historicalManifest).historicalManifest);

let assertions = 0;
function check(condition: unknown, message: string): asserts condition {
  assertions += 1;
  assert(condition, message);
}
function rejects(run: () => unknown, pattern: RegExp, message: string) {
  assertions += 1;
  assert.throws(run, pattern, message);
}

const current = manifest.accessories.find(entry => entry.id === V652_OCEAN_ITEM_ID) as OceanManifestEntry | undefined;
check(current, 'current manifest contains hat-ocean');
if (['defaultSkinDetails', 'skinDetails', 'catalogPath'].some(key => Object.hasOwn(current, key))) {
  check(assertV652OceanDetailContract(current).detailCount === 28,
    'integrated current entry must verify exact live targets');
} else {
  rejects(() => assertV652OceanDetailContract(current, { verifyTargets: false }),
    /actual|Expected values to be strictly deep-equal/, 'current non-integrated entry rejects');
}

const expected = expectedV652OceanManifestFields();
const fixture: OceanManifestEntry = {
  id: V652_OCEAN_ITEM_ID,
  slot: 'headwear',
  renderer: 'aligned-overlay',
  supportedAvatars: [...V652_OCEAN_AVATARS],
  variants: { ...V652_OCEAN_LEGACY_VARIANTS },
  defaultSkinDetails: structuredClone(expected.defaultSkinDetails),
  skinDetails: structuredClone(expected.skinDetails),
  catalogPath: expected.catalogPath,
};
check(assertV652OceanDetailContract(fixture, { verifyTargets: false }).detailCount === 28,
  'complete fixture exercises and passes the Ocean runtime-details branch');

const targetHashes = new Map(expected.plan.operations.map(row => [row.target!, row.sha256!]));
const fixtureHash = (relativePath: string) => targetHashes.get(relativePath) ?? sha256OceanFile(relativePath);
check(assertV652OceanDetailContract(fixture, { hashFile: fixtureHash }).detailCount === 28,
  'complete fixture with exact target hashes passes');

const missingBase = structuredClone(fixture);
delete missingBase.defaultSkinDetails!.brother;
rejects(() => assertV652OceanDetailContract(missingBase, { verifyTargets: false }),
  /deep-equal/, 'missing base detail rejects');

const missingSkin = structuredClone(fixture);
delete missingSkin.skinDetails!.sister['outfit-mecha'];
rejects(() => assertV652OceanDetailContract(missingSkin, { verifyTargets: false }),
  /deep-equal/, 'missing skin detail rejects');

const wrongPadding = structuredClone(fixture);
wrongPadding.skinDetails!.younger['outfit-cadet'].canvasTopPadding = 0;
rejects(() => assertV652OceanDetailContract(wrongPadding, { verifyTargets: false }),
  /deep-equal/, 'wrong canvasTopPadding rejects');

const unexpectedMask = structuredClone(fixture);
unexpectedMask.defaultSkinDetails!.brother.hairVisibilityMask = 'qa/v652/not-approved-mask.png';
rejects(() => assertV652OceanDetailContract(unexpectedMask, { verifyTargets: false }),
  /deep-equal/, 'unreviewed mask rejects');

const racerLeak = structuredClone(fixture);
racerLeak.skinDetails!.brother['outfit-racer'] = structuredClone(racerLeak.skinDetails!.brother['outfit-cadet']);
rejects(() => assertV652OceanDetailContract(racerLeak, { verifyTargets: false }),
  /deep-equal|Racer/, 'Racer detail leak rejects');

const changedFallback = structuredClone(fixture);
changedFallback.variants!.brother = 'public/assets/v6.5.2/runtime/brother/hat-ocean--detail.webp';
rejects(() => assertV652OceanDetailContract(changedFallback, { verifyTargets: false }),
  /legacy 1536px variants changed/, '1792 detail cannot replace legacy variant');

const missingCatalog = structuredClone(fixture);
delete missingCatalog.catalogPath;
rejects(() => assertV652OceanDetailContract(missingCatalog, { verifyTargets: false }),
  /strictly equal/, 'missing catalog rejects');

rejects(() => assertV652OceanDetailContract(fixture, {
  verifyTargets: false,
  hashFile: relativePath => relativePath === V652_OCEAN_PLAN ? '0'.repeat(64) : sha256OceanFile(relativePath),
}), /Ocean plan hash drift/, 'plan hash drift rejects');

const masterPath = 'qa/v652/generated-masters/hat-ocean-complete-v1.png';
rejects(() => assertV652OceanDetailContract(fixture, {
  verifyTargets: false,
  hashFile: relativePath => relativePath === masterPath ? '0'.repeat(64) : sha256OceanFile(relativePath),
}), /hash drift: inventory.master/, 'live master drift rejects');

const sisterCadetSource = 'public/assets/v6.5/runtime/sister/outfit-cadet.webp';
rejects(() => assertV652OceanDetailContract(fixture, {
  verifyTargets: false,
  hashFile: relativePath => relativePath === sisterCadetSource ? '0'.repeat(64) : sha256OceanFile(relativePath),
}), /hash drift: inventory.sister.outfit-cadet.source/, 'fullskin source drift rejects');

const sisterCadetOverlay = 'qa/v652/terra/ocean-cadet-legend-eight-r1/outfit-cadet/sister/hat-ocean-overlay-1024x1792.png';
rejects(() => assertV652OceanDetailContract(fixture, {
  verifyTargets: false,
  hashFile: relativePath => relativePath === sisterCadetOverlay ? '0'.repeat(64) : sha256OceanFile(relativePath),
}), /hash drift: inventory.sister.outfit-cadet.overlay/, 'overlay source drift rejects');

const sisterCadetReview = 'qa/v652/astra/ocean-cadet-legend-eight-r1-review.md';
rejects(() => assertV652OceanDetailContract(fixture, {
  verifyTargets: false,
  hashFile: relativePath => relativePath === sisterCadetReview ? '0'.repeat(64) : sha256OceanFile(relativePath),
}), /hash drift: inventory\.(brother|younger|sister|younger-sister)\.outfit-cadet\.independentReview/, 'independent review drift rejects');

const catalogOutput = 'qa/v652/ocean-catalog-same-source-r1/hat-ocean.webp';
rejects(() => assertV652OceanDetailContract(fixture, {
  verifyTargets: false,
  hashFile: relativePath => relativePath === catalogOutput ? '0'.repeat(64) : sha256OceanFile(relativePath),
}), /hash drift: inventory.catalog.output/, 'catalog drift rejects');

const firstTarget = expected.plan.operations[0].target!;
rejects(() => assertV652OceanDetailContract(fixture, {
  hashFile: relativePath => relativePath === firstTarget ? '0'.repeat(64) : fixtureHash(relativePath),
}), /Ocean target hash drift/, 'staged target drift rejects');

console.log(JSON.stringify({
  status: 'PASS', assertions, fixtureDetailPairs: 28,
  scope: 'Exact Ocean plan/live-lineage/detail metadata fixture; no staging, manifest write, visual or release claim',
}));
