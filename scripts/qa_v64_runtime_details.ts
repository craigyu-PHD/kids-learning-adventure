import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import currentManifest from '../src/data/avatarAssetManifest.json';
import { assertV652NewDetailAdmission } from './v652_new_detail_admission';
import { assertV652NativeRepairAdmission } from './v652_native_repair_admission';
import { assertV652MaskCorsAdmission } from './v652_mask_cors_admission';
import { sha, validScore, SCORE_KEYS } from './v64_art_contract';
import { allowedRuntimeDetailsBinding } from './v652_glasses_binding_allowlist';
import {
  allowedRuntimeDetailsHeadphonesBinding,
  allowedRuntimeDetailsHeadphonesHeadwearBinding,
  V652_HEADPHONES_ITEM_IDS,
} from './v652_headphones_binding_allowlist';
import { assertV652OceanDetailContract } from './v652_ocean_detail_gate';
import { assertV652MageLavenderAdmissionSet } from './v652_mage_lavender_detail_gate';
import { assertV652CurrentDetailAdmission } from './v652_current_detail_admission';

const { historicalManifest: manifest } = assertV652NewDetailAdmission(assertV652NativeRepairAdmission(assertV652MaskCorsAdmission(currentManifest).historicalManifest).historicalManifest);

function read(link: { path: string; sha256: string }) {
  assert.equal(sha(link.path), link.sha256, `Changed evidence: ${link.path}`);
  return JSON.parse(fs.readFileSync(link.path, 'utf8'));
}
function assertCurrentOrHistoricalBinding(actual: string | undefined, historical: string, itemId: string, avatar: string) {
  const binding = V652_HEADPHONES_ITEM_IDS.includes(itemId as typeof V652_HEADPHONES_ITEM_IDS[number])
    ? allowedRuntimeDetailsHeadphonesBinding(actual, historical, itemId, avatar)
    : allowedRuntimeDetailsBinding(actual, historical, itemId, avatar);
  assert(binding.ok, `Unexpected current manifest binding for ${itemId}/${avatar}: ${actual} (${binding.reason})`);
  assert(actual, `Missing current manifest binding: ${itemId}/${avatar}`);
  assert(fs.existsSync(actual), `Current manifest asset missing: ${actual}`);
}
function assertCurrentOrHistoricalHeadphonesHeadwearBinding(actual: string | undefined, historical: string, avatar: string) {
  const binding = allowedRuntimeDetailsHeadphonesHeadwearBinding(
    actual, historical, 'starter-buddy-headphones', avatar, 'starter-sun-cap',
  );
  assert(binding.ok, `Unexpected current headphones+cap binding for ${avatar}: ${actual} (${binding.reason})`);
  assert(actual, `Missing current headphones+cap binding: ${avatar}`);
  assert(fs.existsSync(actual), `Current headphones+cap asset missing: ${actual}`);
}
const admitted = {
  brother: '16ddec245f697c8c1a498ea4ee9138055192d8434749d6d29f2abf3898ac52d0',
  younger: 'a0afbff169d8ce9fe87cc01e2d9af8fb396093c5c6dd7dbd89ad42f2268e4f8e',
  sister: 'd184dc6539d2e7e74141a56acbbae2ba6c83e95a7f40275ab69c061dab87e13b',
  'younger-sister': 'dc21d8e9e2a19589db0a91862b1aa48900468aada4aa1e79ef7df25884317e15',
};
let count = 0;
let oceanDetailCount = 0;
const mageLavenderDetailCount = assertV652MageLavenderAdmissionSet(manifest.accessories).detailCount;
const currentDetailAdmission = assertV652CurrentDetailAdmission(manifest.accessories);
assert.equal(currentDetailAdmission.detailCount, 112);
console.log('PASS: Sunny/Cloud/Nebula/Legend exact 112 V6.5.2 detail bindings, final maps, source/review/public hashes and scoped completion boundaries.');
for (const accessory of manifest.accessories) {
  // Sunny is admitted only after the full pinned current contract above passes.
  if (accessory.id === 'sunny-explorer-hat') {
    assert(currentDetailAdmission.admittedItemIds.has(accessory.id));
    continue;
  }
  if (accessory.id === 'hat-ocean' && ['defaultSkinDetails', 'skinDetails', 'catalogPath']
    .some(key => Object.hasOwn(accessory, key))) {
    assert.equal(oceanDetailCount, 0, 'duplicate Ocean detail contract');
    oceanDetailCount = assertV652OceanDetailContract(accessory).detailCount;
    continue;
  }
  if (['hat-mage', 'sister-lavender-hat'].includes(accessory.id)) {
    continue;
  }
  if (!('defaultSkinDetails' in accessory) || !accessory.defaultSkinDetails) continue;
  if (['hair-comet', 'hair-wave', 'hair-spike', 'hair-cloud', 'hair-nebula', 'hair-legend', 'sister-starlight-clip', 'sister-mint-bow'].includes(accessory.id)) continue; // Hair contracts are validated separately below.
  assert.equal(accessory.id, 'starter-sun-cap');
  assert.equal(accessory.renderer, 'aligned-overlay');
  assert.deepEqual(Object.keys(accessory.defaultSkinDetails).sort(), Object.keys(admitted).sort());
  for (const avatar of Object.keys(admitted) as (keyof typeof admitted)[]) {
    const detail: { overlay: string; hairVisibilityMask?: string; evidence?: { path: string; sha256: string } } | undefined = accessory.defaultSkinDetails[avatar];
    assert(detail?.evidence);
    assert.equal(detail.overlay, `public/assets/v6.4/runtime/${avatar}/starter-sun-cap.webp`);
    const needsMask = avatar === 'brother' || avatar === 'younger';
    assert.equal(detail.hairVisibilityMask, needsMask ? `public/assets/v6.4/runtime-masks/${avatar}/starter-sun-cap-base-hair.png` : undefined);
    const e = read(detail.evidence);
    assert.equal(e.itemId, accessory.id); assert.equal(e.avatarId, avatar);
    for (const a of [e.source, e.rawNativeOutput, e.delivery, ...(needsMask ? [e.mask, e.maskOriginal] : []),
      e.identityMaster, e.runtimeBase, e.prompt, ...e.originalInputs]) {
      assert.equal(sha(a.path), a.sha256, `Changed art: ${a.path}`);
    }
    assert.equal(e.source.path, `public/assets/v6.4/runtime-source/${avatar}/starter-sun-cap.png`);
    assert.equal(e.source.sha256, e.rawNativeOutput.sha256);
    if (needsMask) assert.equal(e.mask.sha256, e.maskOriginal.sha256);
    else { assert.equal(e.mask, null); assert.equal(e.maskOriginal, null); assert.equal(e.maskPolicy, 'REVIEWED_NOT_NEEDED'); }
    assert.equal(e.delivery.path, detail.overlay); if (needsMask) assert.equal(e.mask.path, detail.hairVisibilityMask);
    assert.equal(e.identityMaster.path, `public/assets/v5/characters/${avatar}/wardrobe/base-body.png`);
    assert.equal(e.identityMaster.sha256, admitted[avatar]);
    assert.equal(e.runtimeBase.path, `public/assets/v5/characters/${avatar}/wardrobe/base-body.webp`);
    if (avatar === 'brother') {
      assert.equal(e.assetReuse, undefined);
      assert.equal(e.originalInputs[0].sha256, e.identityMaster.sha256);
    } else {
      // The same hat may fit another original body. Trace accessory reuse explicitly;
      // never claim that the original generation received the destination avatar.
      assert.equal(e.assetReuse.sourceAvatarId, 'brother');
      assert.equal(e.assetReuse.sourceItemId, accessory.id);
      assert.equal(e.assetReuse.sameAccessory, true);
      assert.equal(e.assetReuse.identitySubstitution, false);
      assert.equal(e.assetReuse.newGeneration, false);
      const origin = read(e.assetReuse.sourceEvidence);
      assert.equal(origin.avatarId, 'brother'); assert.equal(origin.itemId, accessory.id);
      assert(accessory.defaultSkinDetails.brother);
      assert.deepEqual(e.assetReuse.sourceEvidence, accessory.defaultSkinDetails.brother.evidence);
      assert.equal(origin.source.sha256, e.source.sha256);
      assert.equal(origin.delivery.sha256, e.delivery.sha256);
      for (const key of ['rawNativeOutput', 'originalNativeTrace', 'prompt', 'originalInputs']) {
        assert.deepEqual(e[key], origin[key], `Reuse must retain actual native ${key}`);
      }
      assert.equal(e.originalInputs[0].sha256, admitted.brother);
      if (needsMask) assert.notEqual(e.mask.sha256, origin.mask.sha256, 'Destination needs its own reviewed mask');
    }
    const originalTrace = read(e.originalNativeTrace);
    assert.equal(originalTrace.tool, 'ChatGPT web built-in image editing through authenticated native UI');
    assert.equal(originalTrace.outputSha256, e.source.sha256);
    assert.equal(originalTrace.downloadUnchanged, true);
    const review = read(e.pngReview);
    assert.equal(review.status, 'PASS_SCOPED_SINGLE_CAP_ART');
    assert.equal(review.sourceSha256, e.source.sha256); assert.equal(review.maskSha256, e.mask?.sha256 ?? null);
    assert.equal(review.baseSha256, e.identityMaster.sha256);
    assert.equal(review.reviewer?.canViewImages, true);
    for (const key of SCORE_KEYS) {
      assert(validScore(review.scores[key], key === 'overallPolish'), key);
      assert(typeof review.reasons[key] === 'string' && review.reasons[key].trim(), key);
    }
    assert(Object.keys(review.viewed).length > 0);
    for (const [path, hash] of Object.entries(review.viewed)) assert.equal(sha(path), hash);
    const pair = read(e.pairing);
    assert.equal(pair.sourceSha256, e.source.sha256); assert.equal(pair.deliverySha256, e.delivery.sha256);
    assert.equal(pair.status, 'PASS');
    if (needsMask) {
      const measurement = read(e.maskMeasurement);
      assert.equal(measurement.baseSha256, e.identityMaster.sha256); assert.equal(measurement.maskSha256, e.mask.sha256);
    } else {
      assert.equal(review.maskPolicy, 'No extra mask required: original hair does not protrude beyond crown/brim. Do not substitute another avatar mask.');
      assert.equal(e.maskMeasurement, null);
    }
    for (const command of [
      ['scripts/qa_v64_image_pair.py', e.source.path, e.delivery.path, '--wearable'],
      ...(needsMask ? [['scripts/qa_v64_cap_visibility.py', e.identityMaster.path, e.runtimeBase.path, e.mask.path, avatar]] : []),
    ]) {
      const fresh = spawnSync('python3', command, { encoding: 'utf8' });
      assert.equal(fresh.status, 0, fresh.stdout);
    }
    count++;
  }
}
assert.equal(count, 4);
assert([0, 28].includes(oceanDetailCount), 'Ocean detail contract must be absent or complete');
console.log('PASS: 4 scoped default-body cap lineages (2 own masks, 2 reviewed without mask); full wardrobe and production remain separate.');
if (oceanDetailCount) console.log('PASS: 28 exact Ocean 256px headroom detail bindings; legacy variants remain fallback and Racer remains unadmitted.');
if (mageLavenderDetailCount) console.log('PASS: 56 exact Mage/Lavender detail bindings and two catalogs; Racer remains unadmitted.');

const hair = manifest.accessories.find(item => item.id === 'hair-comet');
assert(hair?.runtimeEvidence && hair.defaultSkinDetails && hair.variants);
assert.deepEqual(Object.keys(hair.runtimeEvidence).sort(), Object.keys(admitted).sort());
assert.deepEqual(Object.keys(hair.defaultSkinDetails).sort(), ['sister', 'younger-sister']);
for (const avatar of Object.keys(admitted) as (keyof typeof admitted)[]) {
  const link: { path: string; sha256: string } | undefined = hair.runtimeEvidence[avatar];
  assert(link);
  const e = read(link);
  assert.equal(e.avatarId, avatar); assert.equal(e.itemId, 'hair-comet');
  for (const asset of [e.rawNative, e.derivedPng, e.delivery, e.identityMaster, e.transform,
    e.originalNativeTrace, ...(e.mask ? [e.mask, e.maskConstruction] : [])]) assert.equal(sha(asset.path), asset.sha256);
  assert.equal(e.identityMaster.sha256, admitted[avatar]);
  assert.equal(e.delivery.path, hair.variants[avatar]);
  const native = read(e.originalNativeTrace);
  assert.equal(native.runtimeAttempt.output.sha256, e.rawNative.sha256);
  assert.equal(native.runtimeAttempt.tool, 'chatgpt_web_native_image_editor');
  assert.equal(native.runtimeAttempt.status, 'FINAL_EXPORTED_PENDING_VISUAL_STAGE_REVIEW');
  for (const input of native.runtimeAttempt.inputHashes) assert.equal(sha(input.path), input.sha256);
  const review = read(e.artReview);
  assert.equal(review.reviewer.canViewImages, true);
  assert.equal(review.sourceSha256, e.rawNative.sha256);
  assert.equal(review.derivedSha256, e.derivedPng.sha256);
  assert.equal(review.baseSha256, admitted[avatar]);
  assert.equal(review.transformEvidenceSha256, e.transform.sha256);
  const requiresMask = avatar === 'sister' || avatar === 'younger-sister';
  assert.equal(review.status, requiresMask ? 'PASS_SCOPED_SINGLE_HAIR_WITH_OWN_MASK_QA' : 'PASS_SCOPED_SINGLE_HAIR_RUNTIME_ART');
  if (avatar === 'sister' || avatar === 'younger-sister') {
    const detail: { overlay: string; hairVisibilityMask?: string; evidence?: { path: string; sha256: string } } | undefined = hair.defaultSkinDetails[avatar];
    assert(detail?.evidence);
    assert.equal(detail.overlay, e.delivery.path); assert.equal(detail.hairVisibilityMask, e.mask.path);
    assert.deepEqual(detail.evidence, link); assert.equal(review.maskSha256, e.mask.sha256);
    assert.equal(review.maskEvidenceSha256, e.maskConstruction.sha256);
  } else assert.equal(e.mask, null);
  for (const key of SCORE_KEYS) {
    assert(validScore(review.scores[key], key === 'overallPolish'), key);
    assert(typeof review.reasons[key] === 'string' && review.reasons[key].trim(), key);
  }
  for (const [path, hash] of Object.entries(review.viewed)) assert.equal(sha(path), hash);
  const fresh = spawnSync('python3', ['scripts/qa_v64_runtime_transform.py', link.path], { encoding: 'utf8' });
  assert.equal(fresh.status, 0, fresh.stdout + fresh.stderr);
}
console.log('PASS: four traced single-hair derivatives and two own-body masks; integrated combinations and release remain separate.');

const wave = manifest.accessories.find(item => item.id === 'hair-wave');
assert(wave?.runtimeEvidence && wave.defaultSkinDetails && wave.variants);
assert.deepEqual(Object.keys(wave.runtimeEvidence), ['sister']);
assert.deepEqual(Object.keys(wave.defaultSkinDetails).sort(), Object.keys(admitted).sort());
const waveLink = wave.runtimeEvidence.sister;
assert(waveLink);
const waveEvidence = read(waveLink);
assert.equal(waveEvidence.status, 'PASS_SCOPED_SISTER_HAIR_WAVE_RUNTIME');
assert.equal(waveEvidence.avatarId, 'sister'); assert.equal(waveEvidence.itemId, 'hair-wave');
assert.equal(waveEvidence.nativeIndependentOutput, true);
assert.equal(waveEvidence.chatCleanupStatus, 'DELETED_AND_RETURNED_HOME');
assert.equal(wave.variants.sister, waveEvidence.delivery.path);
const waveDetail = wave.defaultSkinDetails.sister;
assert(waveDetail);
assert.equal(waveDetail.overlay, waveEvidence.delivery.path);
assert.equal(waveDetail.hairVisibilityMask, waveEvidence.mask.path);
assert.deepEqual(waveDetail.evidence, waveLink);
for (const asset of [waveEvidence.originalHero, waveEvidence.source, waveEvidence.derived,
  waveEvidence.delivery, waveEvidence.identityMaster, waveEvidence.mask, waveEvidence.nativeExecution,
  waveEvidence.fitEvidence, waveEvidence.artReview, waveEvidence.capReview, waveEvidence.sourceReview,
  waveEvidence.websiteCapture, waveEvidence.chatCleanup, waveEvidence.integratedBrowser,
  waveEvidence.integrationReview]) assert.equal(sha(asset.path), asset.sha256);
assert.equal(waveEvidence.identityMaster.sha256, admitted.sister);
const waveNative = read(waveEvidence.nativeExecution);
assert.equal(waveNative.tool, 'chatgpt_web_native_image_editor');
assert.equal(waveNative.nativeExecution.rawOutputSha256, waveEvidence.source.sha256);
const waveFit = read(waveEvidence.fitEvidence);
const selectedWaveFit = waveFit.fits.find((fit: { name: string }) => fit.name === 'fit-01');
assert(selectedWaveFit);
assert.equal(selectedWaveFit.derivedSha256, waveEvidence.derived.sha256);
assert.deepEqual(selectedWaveFit.transform, {
  uniformScale: 0.51, translateX: 262, translateY: -108, resampling: 'LANCZOS', canvas: [1024, 1536],
});
const waveReview = read(waveEvidence.artReview);
assert.equal(waveReview.status, 'PASS_SCOPED_SINGLE_AND_HEADPHONES_CAP_QA_REWORK');
assert.equal(waveReview.candidateSha256, waveEvidence.derived.sha256);
assert.equal(waveReview.reviewer.canViewImages, true);
const waveCapReview = read(waveEvidence.capReview);
assert.equal(waveCapReview.status, 'PASS_SCOPED_CAP_PRIORITY_QA_CORRECTION');
for (const key of SCORE_KEYS) {
  assert(validScore(waveReview.scores[key], key === 'overallPolish'), key);
  assert(typeof waveReview.reasons[key] === 'string' && waveReview.reasons[key].trim(), key);
  assert(validScore(waveCapReview.scores[key], key === 'overallPolish'), key);
}
assert(typeof waveCapReview.reason === 'string' && waveCapReview.reason.trim());
for (const review of [waveReview, waveCapReview]) {
  for (const [path, hash] of Object.entries(review.viewed)) assert.equal(sha(path), hash);
}
const waveCleanup = read(waveEvidence.chatCleanup);
assert.equal(waveCleanup.status, 'PASS_EXACT_ALLOWLIST_CHAT_CLEANUP');
assert(waveCleanup.deleted.some((entry: { conversationId: string; verifiedHomepage: boolean }) =>
  entry.conversationId === waveEvidence.chatConversationId && entry.verifiedHomepage));
const waveBrowser = read(waveEvidence.integratedBrowser);
assert.equal(waveBrowser.status, 'PASS');
assert.equal(waveBrowser.rows.length, 9);
assert(waveBrowser.rows.every((row: { passed: boolean }) => row.passed));
const waveIntegrationReview = read(waveEvidence.integrationReview);
assert.equal(waveIntegrationReview.status, 'PASS_SCOPED_INTEGRATED_ART');
assert.equal(waveIntegrationReview.reviewer, 'worker-c independently viewed all 18 screenshots with view_image');
assert.equal(waveIntegrationReview.resultsSha256, waveEvidence.integratedBrowser.sha256);
assert.equal(waveIntegrationReview.reviewedScreenshots.length, 18);
for (const key of SCORE_KEYS) assert(validScore(waveIntegrationReview.scores[key], key === 'overallPolish'), key);
for (const screenshot of waveIntegrationReview.reviewedScreenshots) assert.equal(sha(screenshot.path), screenshot.sha256);
const reproduceWave = spawnSync('python3', ['qa/art-gate/attempts/20260910_032101/worker-b4/sister/hair-wave/runtime/reproduce-fit.py'], { encoding: 'utf8' });
assert.equal(reproduceWave.status, 0, reproduceWave.stdout + reproduceWave.stderr);
assert.equal(sha('qa/art-gate/attempts/20260910_032101/worker-b4/sister/hair-wave/runtime/fit-01.png'), waveEvidence.derived.sha256);
const wavePair = spawnSync('python3', ['scripts/qa_v64_image_pair.py', waveEvidence.derived.path, waveEvidence.delivery.path, '--wearable'], { encoding: 'utf8' });
assert.equal(wavePair.status, 0, wavePair.stdout + wavePair.stderr);
console.log('PASS: sister hair-wave native Runtime, exact fit, own-bob mask, single/headphones/cap-priority website review, and exact chat cleanup; other avatars remain pending.');

const cloud = manifest.accessories.find(item => item.id === 'hair-cloud');
assert(cloud?.runtimeEvidence && cloud.defaultSkinDetails && cloud.variants);
assert.deepEqual(Object.keys(cloud.runtimeEvidence), ['brother']);
assert.deepEqual(Object.keys(cloud.defaultSkinDetails).sort(), Object.keys(admitted).sort());
const cloudLink = cloud.runtimeEvidence.brother;
assert(cloudLink);
const cloudEvidence = read(cloudLink);
assert.equal(cloudEvidence.status, 'PASS_SCOPED_BROTHER_HAIR_CLOUD_RUNTIME');
assert.equal(cloudEvidence.avatarId, 'brother'); assert.equal(cloudEvidence.itemId, 'hair-cloud');
assert.equal(cloudEvidence.nativeIndependentOutput, true);
assert.equal(cloudEvidence.chatCleanupStatus, 'DELETED_AND_RETURNED_HOME');
assert.equal(cloud.variants.brother, cloudEvidence.delivery.path);
const cloudDetail = cloud.defaultSkinDetails.brother;
assert(cloudDetail);
// The current Cloud details are checked as all 28 exact V6.5.2 bindings above.
// Historical native art, delivery, reviews and integration lineage below remain mandatory.
if (!currentDetailAdmission.admittedItemIds.has('hair-cloud')) {
  assert.equal(cloudDetail.overlay, cloudEvidence.delivery.path);
  assert.equal(cloudDetail.hairVisibilityMask, 'public/assets/v6.4/runtime-masks/brother/starter-sun-cap-base-hair.png');
  assert.deepEqual(cloudDetail.evidence, cloudLink);
}
for (const asset of [cloudEvidence.source, cloudEvidence.derived, cloudEvidence.delivery,
  cloudEvidence.identityMaster, cloudEvidence.nativeExecution, cloudEvidence.alphaClean,
  cloudEvidence.fitEvidence, cloudEvidence.preIntegrationEvidence,
  cloudEvidence.preIntegrationReview, cloudEvidence.websiteCapture,
  cloudEvidence.chatCleanup, cloudEvidence.integratedBrowser,
  cloudEvidence.integrationReview]) assert.equal(sha(asset.path), asset.sha256);
assert.equal(cloudEvidence.identityMaster.sha256, admitted.brother);
assert.equal(cloudEvidence.mask, null);
assert.equal(cloudEvidence.maskPolicy, 'REVIEWED_NOT_NEEDED_FOR_SINGLE_HAIR; starter-sun-cap renderer priority removes hair DOM and uses its own accepted base-hair mask.');
const cloudNative = read(cloudEvidence.nativeExecution);
assert.equal(cloudNative.chatgpt_conversation_id, cloudEvidence.chatConversationId);
assert.equal(cloudNative.raw_sha256, cloudEvidence.source.sha256);
const cloudFits = read(cloudEvidence.fitEvidence);
const selectedCloudFit = cloudFits.candidates.position03;
assert.equal(selectedCloudFit.sha256, cloudEvidence.derived.sha256);
assert.deepEqual(selectedCloudFit.translate_to, [300, 10]);
assert.equal(selectedCloudFit.scale, 1);
const cloudReview = read(cloudEvidence.preIntegrationReview);
assert.equal(cloudReview.status, 'PASS_SCOPED_QA_ACTUAL_RUNTIME');
assert.equal(cloudReview.candidateSha256, cloudEvidence.derived.sha256);
assert.equal(cloudReview.sourceRawSha256, cloudEvidence.source.sha256);
for (const key of SCORE_KEYS) assert(validScore(cloudReview.scores[key], key === 'overallPolish'), key);
for (const viewed of cloudReview.viewed) assert.equal(sha(viewed.path), viewed.sha256);
const cloudCleanup = read(cloudEvidence.chatCleanup);
assert.equal(cloudCleanup.chatgpt_conversation_id, cloudEvidence.chatConversationId);
assert.equal(cloudCleanup.post_delete_home_verified, true);
assert.equal(cloudCleanup.other_conversations_touched, false);
const cloudBrowser = read(cloudEvidence.integratedBrowser);
assert.equal(cloudBrowser.status, 'PASS');
assert.equal(cloudBrowser.rows.length, 9);
assert(cloudBrowser.rows.every((row: { passed: boolean }) => row.passed));
const cloudIntegrationReview = read(cloudEvidence.integrationReview);
assert.equal(cloudIntegrationReview.status, 'PASS_SCOPED_INTEGRATED_ART');
assert.equal(cloudIntegrationReview.reviewer, 'worker-c independently viewed all 18 screenshots with view_image');
assert.equal(cloudIntegrationReview.resultsSha256, cloudEvidence.integratedBrowser.sha256);
assert.equal(cloudIntegrationReview.reviewedScreenshots.length, 18);
for (const key of SCORE_KEYS) assert(validScore(cloudIntegrationReview.scores[key], key === 'overallPolish'), key);
for (const screenshot of cloudIntegrationReview.reviewedScreenshots) assert.equal(sha(screenshot.path), screenshot.sha256);
const cloudPair = spawnSync('python3', ['scripts/qa_v64_image_pair.py', cloudEvidence.derived.path, cloudEvidence.delivery.path, '--wearable'], { encoding: 'utf8' });
assert.equal(cloudPair.status, 0, cloudPair.stdout + cloudPair.stderr);
console.log('PASS: brother hair-cloud native Runtime, translate-only fit, exact chat cleanup, three-engine integration and 18-shot true visual review; historical lineage retained.');

// P08b Batch01 extends reviewed hair-wave/hair-cloud art to four roles and admits
// hair-spike only after isolated static visual review. Validate the CURRENT manifest
// contract independently from the historical single-role evidence above.
const p08bItems = ['hair-wave', 'hair-spike', 'hair-cloud'] as const;
const p08bMasks = {
  brother: 'public/assets/v6.4/runtime-masks/brother/starter-sun-cap-base-hair.png',
  younger: 'public/assets/v6.4/runtime-masks/younger/starter-sun-cap-base-hair.png',
  sister: 'public/assets/v6.4/runtime-masks/sister/hair-comet-base-hair.png',
  'younger-sister': 'public/assets/v6.4/runtime-masks/younger-sister/hair-comet-base-hair.png',
} as const;
const p08bDerivation = JSON.parse(fs.readFileSync('qa/art-gate/attempts/20260915_p08b_batch01/phase2-role-derivation.json', 'utf8'));
assert.equal(p08bDerivation.status, 'PASS');
assert.equal(p08bDerivation.rows.length, 12);
for (const itemId of p08bItems) {
  const item = manifest.accessories.find(entry => entry.id === itemId);
  assert(item?.variants && item.defaultSkinDetails, `Missing P08b manifest contract: ${itemId}`);
  assert.deepEqual(Object.keys(item.variants).sort(), Object.keys(admitted).sort());
  assert.deepEqual(Object.keys(item.defaultSkinDetails).sort(), Object.keys(admitted).sort());
  for (const avatar of Object.keys(admitted) as (keyof typeof admitted)[]) {
    const expectedOverlay = `public/assets/v6.4/runtime/${avatar}/${itemId}.webp`;
    const expectedSource = `qa/art-gate/attempts/20260915_p08b_batch01/reviewed-runtime-source/${avatar}/${itemId}.png`;
    assertCurrentOrHistoricalBinding(item.variants[avatar], expectedOverlay, itemId, avatar);
    const detail: { overlay: string; hairVisibilityMask?: string } | undefined = item.defaultSkinDetails[avatar];
    assert(detail);
    if (!currentDetailAdmission.admittedItemIds.has(itemId)) {
      assertCurrentOrHistoricalBinding(detail.overlay, expectedOverlay, itemId, avatar);
      assert.equal(detail.hairVisibilityMask, p08bMasks[avatar]);
    } // Admitted Cloud uses the exact current contract; historical row hashes below still run.
    const row = p08bDerivation.rows.find((candidate: { itemId: string; avatarId: string }) => candidate.itemId === itemId && candidate.avatarId === avatar);
    assert(row, `Missing P08b derivation row: ${itemId}/${avatar}`);
    assert.equal(row.runtimeSource, expectedSource);
    assert.equal(row.runtimeAsset, expectedOverlay);
    assert.equal(row.hairVisibilityMask, p08bMasks[avatar]);
    assert.equal(sha(row.runtimeSource), row.runtimeSourceSha256);
    assert.equal(sha(row.runtimeAsset), row.runtimeSha256);
    assert.equal(sha(row.hairVisibilityMask), row.hairVisibilityMaskSha256);
    assert.equal(row.alphaPixelIdentical, true);
    assert.equal(row.visibleRgbPixelIdentical, true);
    const review = JSON.parse(fs.readFileSync(row.staticVisualReview, 'utf8'));
    assert.equal(sha(row.staticVisualReview), row.staticVisualReviewSha256);
    assert.equal(review.response?.decision, 'PASS');
    assert.equal(review.response?.blocking_issues?.length, 0);
  }
}
console.log('PASS: P08b Batch01 3 hairstyles x 4 roles current V6.4 detail/mask bindings, lineage hashes and static visual admissions.');

// P08b Batch02 admits hair-nebula and hair-legend only after a fresh static
// admission summary resolves historical Runtime REWORK through bounded geometry repair.
const p08bBatch02Items = ['hair-nebula', 'hair-legend'] as const;
const p08bBatch02Derivation = JSON.parse(fs.readFileSync('qa/art-gate/attempts/20260915_p08b_batch02/phase2-role-derivation.json', 'utf8'));
const p08bBatch02Admission = JSON.parse(fs.readFileSync('qa/art-gate/attempts/20260915_p08b_batch02/static-admission-summary.json', 'utf8'));
assert.equal(p08bBatch02Derivation.status, 'PASS');
assert.equal(p08bBatch02Derivation.rows.length, 8);
assert.equal(p08bBatch02Admission.status, 'PASS');
assert.equal(p08bBatch02Admission.result, 'PASS-8-of-8-static-admission');
assert.equal(p08bBatch02Admission.rows.length, 8);
assert(p08bBatch02Admission.rows.every((row: { decision: string }) => row.decision === 'PASS'));
for (const itemId of p08bBatch02Items) {
  const item = manifest.accessories.find(entry => entry.id === itemId);
  assert(item?.variants && item.defaultSkinDetails, `Missing P08b Batch02 manifest contract: ${itemId}`);
  assert.deepEqual(Object.keys(item.variants).sort(), Object.keys(admitted).sort());
  assert.deepEqual(Object.keys(item.defaultSkinDetails).sort(), Object.keys(admitted).sort());
  for (const avatar of Object.keys(admitted) as (keyof typeof admitted)[]) {
    const expectedOverlay = `public/assets/v6.4/runtime/${avatar}/${itemId}.webp`;
    const expectedSource = `qa/art-gate/attempts/20260915_p08b_batch02/reviewed-runtime-source/${avatar}/${itemId}.png`;
    assertCurrentOrHistoricalBinding(item.variants[avatar], expectedOverlay, itemId, avatar);
    const detail: { overlay: string; hairVisibilityMask?: string } | undefined = item.defaultSkinDetails[avatar];
    assert(detail);
    if (!currentDetailAdmission.admittedItemIds.has(itemId)) {
      assertCurrentOrHistoricalBinding(detail.overlay, expectedOverlay, itemId, avatar);
      assert.equal(detail.hairVisibilityMask, p08bMasks[avatar]);
    }
    const row = p08bBatch02Derivation.rows.find((candidate: { itemId: string; avatarId: string }) => candidate.itemId === itemId && candidate.avatarId === avatar);
    assert(row, `Missing P08b Batch02 derivation row: ${itemId}/${avatar}`);
    assert.equal(row.runtimeSource, expectedSource);
    assert.equal(row.runtimeAsset, expectedOverlay);
    assert.equal(row.hairVisibilityMask, p08bMasks[avatar]);
    assert.equal(sha(row.runtimeSource), row.runtimeSourceSha256);
    assert.equal(sha(row.runtimeAsset), row.runtimeSha256);
    assert.equal(sha(row.hairVisibilityMask), row.hairVisibilityMaskSha256);
    assert.equal(row.alphaPixelIdentical, true);
    assert.equal(row.visibleRgbPixelIdentical, true);
    assert.equal(row.staticAdmissionSummary, 'qa/art-gate/attempts/20260915_p08b_batch02/static-admission-summary.json');
    assert.equal(sha(row.staticAdmissionSummary), row.staticAdmissionSummarySha256);
  }
}
console.log('PASS: P08b Batch02 hair-nebula + hair-legend x 4 roles current bindings, lossless lineage and 8-row static admission.');

// P08b Batch03 retains the existing role-aligned hair accessories byte-for-byte.
// Unlike replacement hairstyles, these overlays must preserve the base hair and therefore must not define a hairVisibilityMask.
const p08bBatch03Items = ['sister-starlight-clip', 'sister-mint-bow'] as const;
const p08bBatch03Derivation = JSON.parse(fs.readFileSync('qa/art-gate/attempts/20260915_p08b_batch03/phase2-role-derivation.json', 'utf8'));
const p08bBatch03Admission = JSON.parse(fs.readFileSync('qa/art-gate/attempts/20260915_p08b_batch03/static-admission-summary.json', 'utf8'));
assert.equal(p08bBatch03Derivation.status, 'PASS');
assert.equal(p08bBatch03Derivation.rows.length, 8);
assert.equal(p08bBatch03Admission.status, 'PASS');
assert.equal(p08bBatch03Admission.result, 'PASS-8-of-8-static-admission');
assert.equal(p08bBatch03Admission.rows.length, 8);
assert(p08bBatch03Admission.rows.every((row: { decision: string }) => row.decision === 'PASS'));
for (const itemId of p08bBatch03Items) {
  const item = manifest.accessories.find(entry => entry.id === itemId);
  assert(item?.variants && item.defaultSkinDetails, `Missing P08b Batch03 manifest contract: ${itemId}`);
  assert.deepEqual(Object.keys(item.variants).sort(), Object.keys(admitted).sort());
  assert.deepEqual(Object.keys(item.defaultSkinDetails).sort(), Object.keys(admitted).sort());
  for (const avatar of Object.keys(admitted) as (keyof typeof admitted)[]) {
    const expectedOverlay = `public/assets/v6.4/runtime/${avatar}/${itemId}.webp`;
    const expectedSource = `qa/art-gate/attempts/20260915_p08b_batch03/reviewed-runtime-source/${avatar}/${itemId}.webp`;
    assertCurrentOrHistoricalBinding(item.variants[avatar], expectedOverlay, itemId, avatar);
    const detail: { overlay: string; hairVisibilityMask?: string } | undefined = item.defaultSkinDetails[avatar];
    assert(detail);
    assertCurrentOrHistoricalBinding(detail.overlay, expectedOverlay, itemId, avatar);
    assert.equal(detail.hairVisibilityMask, undefined);
    const row = p08bBatch03Derivation.rows.find((candidate: { itemId: string; avatarId: string }) => candidate.itemId === itemId && candidate.avatarId === avatar);
    assert(row, `Missing P08b Batch03 derivation row: ${itemId}/${avatar}`);
    assert.equal(row.runtimeSource, expectedSource);
    assert.equal(row.runtimeAsset, expectedOverlay);
    assert.equal(row.hairVisibilityMask, null);
    assert.equal(sha(row.source), row.sourceSha256);
    assert.equal(sha(row.runtimeSource), row.runtimeSourceSha256);
    assert.equal(sha(row.runtimeAsset), row.runtimeSha256);
    assert.equal(row.runtimeSourceSha256, row.sourceSha256);
    assert.equal(row.runtimeSha256, row.sourceSha256);
    assert.equal(row.byteIdenticalToRetainedV5RoleOverlay, true);
    assert.equal(row.geometryTransform, 'none');
    assert.equal(row.staticAdmissionSummary, 'qa/art-gate/attempts/20260915_p08b_batch03/static-admission-summary.json');
    assert.equal(sha(row.staticAdmissionSummary), row.staticAdmissionSummarySha256);
  }
}
console.log('PASS: P08b Batch03 starlight-clip + mint-bow x 4 roles V6.4 bindings retain V5 pixels exactly, preserve base hair, and have 8-row static admission.');

type LegacyHeadphoneRole = 'brother' | 'younger' | 'sister' | 'younger-sister';
type LegacyHeadphones = {
  id: 'starter-buddy-headphones';
  runtimeEvidence: Record<LegacyHeadphoneRole, { path: string; sha256: string }>;
  variants: Record<LegacyHeadphoneRole, string>;
  headwearVariants: Record<LegacyHeadphoneRole, Record<string, { overlay: string; foreground: boolean }>>;
};
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function hasLegacyHeadphoneContract(value: unknown): value is LegacyHeadphones {
  if (!isRecord(value) || value.id !== 'starter-buddy-headphones'
    || !isRecord(value.runtimeEvidence) || !isRecord(value.variants) || !isRecord(value.headwearVariants)) return false;
  const { runtimeEvidence, variants, headwearVariants } = value;
  return ['brother', 'younger', 'sister', 'younger-sister'].every(role => {
    const link = runtimeEvidence[role];
    const hats = headwearVariants[role];
    if (!isRecord(link) || typeof link.path !== 'string' || typeof link.sha256 !== 'string'
      || typeof variants[role] !== 'string' || !isRecord(hats)) return false;
    const cap = hats['starter-sun-cap'];
    return isRecord(cap) && typeof cap.overlay === 'string' && typeof cap.foreground === 'boolean';
  });
}
// Restored historical evidence has its own schema. Do not infer its optional
// fields from the shape of today's renderer JSON, and do not skip any role.
const headphoneCandidate: unknown = manifest.accessories.find(item => item.id === 'starter-buddy-headphones');
assert(hasLegacyHeadphoneContract(headphoneCandidate), 'Missing four-role historical headphone/cap evidence contract');
const headphones = headphoneCandidate;
const headphoneLink: { path: string; sha256: string } = headphones.runtimeEvidence.brother;
const headphoneEvidence = read(headphoneLink);
assert.equal(headphoneEvidence.status, 'PASS_SCOPED_BROTHER_DEFAULT_BODY_RUNTIME');
assert.equal(headphoneEvidence.avatarId, 'brother');
assert.equal(headphoneEvidence.itemId, 'starter-buddy-headphones');
assert.equal(headphoneEvidence.nativeIndependentOutput, false);
assertCurrentOrHistoricalBinding(headphones.variants.brother, headphoneEvidence.delivery.path, headphones.id, 'brother');
for (const asset of [headphoneEvidence.nativeHero, headphoneEvidence.extractionEvidence,
  headphoneEvidence.derivedPng, headphoneEvidence.delivery]) assert.equal(sha(asset.path), asset.sha256);
const extraction = read(headphoneEvidence.extractionEvidence);
assert.equal(extraction.source.sha256, headphoneEvidence.nativeHero.sha256);
assert.equal(extraction.output.sha256, headphoneEvidence.derivedPng.sha256);
assert.equal(extraction.nativeIndependentOutput, false);
const headphoneReview = read(headphoneEvidence.artReview);
assert.equal(headphoneReview.status, 'PASS_SCOPED_SINGLE_AND_HAIR_HEADPHONES');
assert.equal(headphoneReview.reviewer.canViewImages, true);
assert.equal(headphoneReview.sourceSha256, headphoneEvidence.nativeHero.sha256);
assert.equal(headphoneReview.derivedSha256, headphoneEvidence.derivedPng.sha256);
for (const key of SCORE_KEYS) {
  assert(validScore(headphoneReview.scores[key], key === 'overallPolish'), key);
  assert(typeof headphoneReview.reasons[key] === 'string' && headphoneReview.reasons[key].trim(), key);
}
for (const [path, hash] of Object.entries(headphoneReview.viewed)) assert.equal(sha(path), hash);
const hatVariant = headphoneEvidence.headwearVariants['starter-sun-cap'];
const manifestHatVariant = headphones.headwearVariants.brother['starter-sun-cap'];
assertCurrentOrHistoricalHeadphonesHeadwearBinding(manifestHatVariant.overlay, hatVariant.delivery.path, 'brother');
assert.equal(manifestHatVariant.foreground, true);
for (const asset of [hatVariant.derivedPng, hatVariant.delivery, hatVariant.derivationEvidence,
  hatVariant.artReview]) assert.equal(sha(asset.path), asset.sha256);
const hatDerivation = read(hatVariant.derivationEvidence);
assert.equal(hatDerivation.source.sha256, headphoneEvidence.derivedPng.sha256);
assert.equal(hatDerivation.output.sha256, hatVariant.derivedPng.sha256);
assert.equal(hatDerivation.nativeIndependentOutput, false);
const hatReview = read(hatVariant.artReview);
assert.equal(hatReview.status, 'PASS_SCOPED_STARTER_SUN_CAP_HEADPHONES_QA');
assert.equal(hatReview.reviewer.canViewImages, true);
assert.equal(hatReview.derivedSha256, hatVariant.derivedPng.sha256);
for (const key of SCORE_KEYS) {
  assert(validScore(hatReview.scores[key], key === 'overallPolish'), key);
  assert(typeof hatReview.reasons[key] === 'string' && hatReview.reasons[key].trim(), key);
}
for (const [path, hash] of Object.entries(hatReview.viewed)) assert.equal(sha(path), hash);
for (const [png, webp] of [[headphoneEvidence.derivedPng.path, headphoneEvidence.delivery.path],
  [hatVariant.derivedPng.path, hatVariant.delivery.path]]) {
  const fresh = spawnSync('python3', ['scripts/qa_v64_image_pair.py', png, webp, '--wearable'], { encoding: 'utf8' });
  assert.equal(fresh.status, 0, fresh.stdout + fresh.stderr);
}
console.log('PASS: brother default-body headphones with a reviewed starter-sun-cap foreground variant; other avatars, hats and skins remain pending.');

const youngerHeadphoneLink: { path: string; sha256: string } = headphones.runtimeEvidence.younger;
const youngerHeadphoneEvidence = read(youngerHeadphoneLink);
assert.equal(youngerHeadphoneEvidence.status, 'PASS_SCOPED_YOUNGER_DEFAULT_BODY_RUNTIME');
assert.equal(youngerHeadphoneEvidence.avatarId, 'younger'); assert.equal(youngerHeadphoneEvidence.accessoryReuse, true);
assertCurrentOrHistoricalBinding(headphones.variants.younger, youngerHeadphoneEvidence.delivery.path, headphones.id, 'younger');
for (const asset of [youngerHeadphoneEvidence.sourceAccessory, youngerHeadphoneEvidence.transformEvidence,
  youngerHeadphoneEvidence.derivationIntegrity, youngerHeadphoneEvidence.derivedPng,
  youngerHeadphoneEvidence.delivery, youngerHeadphoneEvidence.artReview]) assert.equal(sha(asset.path), asset.sha256);
const youngerTransform = read(youngerHeadphoneEvidence.transformEvidence);
assert.equal(youngerTransform.source.sha256, youngerHeadphoneEvidence.sourceAccessory.sha256);
assert.equal(youngerTransform.ownBody.sha256, admitted.younger);
const selectedFit = youngerTransform.candidates.find((candidate: { path: string }) => candidate.path.endsWith('/fit-02.png'));
assert(selectedFit); assert.equal(selectedFit.sha256, youngerHeadphoneEvidence.derivedPng.sha256);
assert.equal(selectedFit.uniformScale, 1.18); assert.equal(selectedFit.translateX, -91); assert.equal(selectedFit.translateY, 27);
const youngerReview = read(youngerHeadphoneEvidence.artReview);
assert.equal(youngerReview.status, 'PASS_SCOPED_FIT02_SINGLE_AND_HAIR');
assert.equal(youngerReview.reviewer.canViewImages, true); assert.equal(youngerReview.derivedSha256, youngerHeadphoneEvidence.derivedPng.sha256);
for (const key of SCORE_KEYS) {
  assert(validScore(youngerReview.scores[key], key === 'overallPolish'), key);
  assert(typeof youngerReview.reasons[key] === 'string' && youngerReview.reasons[key].trim(), key);
}
const youngerHat = youngerHeadphoneEvidence.headwearVariants['starter-sun-cap'];
assertCurrentOrHistoricalHeadphonesHeadwearBinding(
  headphones.headwearVariants.younger['starter-sun-cap'].overlay, youngerHat.delivery.path, 'younger',
);
assert.equal(headphones.headwearVariants.younger['starter-sun-cap'].foreground, true);
for (const asset of [youngerHat.derivedPng, youngerHat.delivery, youngerHat.derivationEvidence,
  youngerHat.artReview]) assert.equal(sha(asset.path), asset.sha256);
const youngerHatReview = read(youngerHat.artReview);
assert.equal(youngerHatReview.status, 'PASS_SCOPED_STARTER_SUN_CAP_HEADPHONES_QA');
assert.equal(youngerHatReview.reviewer.canViewImages, true); assert.equal(youngerHatReview.derivedSha256, youngerHat.derivedPng.sha256);
for (const key of SCORE_KEYS) assert(validScore(youngerHatReview.scores[key], key === 'overallPolish'), key);
const temp = fs.mkdtempSync('/tmp/v64-younger-headphones-');
try {
  const reproduce = spawnSync('python3', [
    'qa/art-gate/attempts/20260910_020137/worker-a2/younger/headphones-accessory-reuse/reproduce-fit.py', '--out', `${temp}/out`,
  ], { encoding: 'utf8' });
  assert.equal(reproduce.status, 0, reproduce.stdout + reproduce.stderr);
  assert.deepEqual(fs.readFileSync(`${temp}/out/fit-02.png`), fs.readFileSync(youngerHeadphoneEvidence.derivedPng.path));
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
for (const [png, webp] of [[youngerHeadphoneEvidence.derivedPng.path, youngerHeadphoneEvidence.delivery.path],
  [youngerHat.derivedPng.path, youngerHat.delivery.path]]) {
  const fresh = spawnSync('python3', ['scripts/qa_v64_image_pair.py', png, webp, '--wearable'], { encoding: 'utf8' });
  assert.equal(fresh.status, 0, fresh.stdout + fresh.stderr);
}
console.log('PASS: younger default-body headphones reuse with one reproduced transform and reviewed cap variant; other hats and skins remain pending.');

const sisterHeadphoneLink: { path: string; sha256: string } = headphones.runtimeEvidence.sister;
const sisterHeadphoneEvidence = read(sisterHeadphoneLink);
assert.equal(sisterHeadphoneEvidence.status, 'PASS_SCOPED_SISTER_DEFAULT_BODY_RUNTIME');
assert.equal(sisterHeadphoneEvidence.avatarId, 'sister'); assert.equal(sisterHeadphoneEvidence.accessoryReuse, true);
assertCurrentOrHistoricalBinding(headphones.variants.sister, sisterHeadphoneEvidence.delivery.path, headphones.id, 'sister');
for (const asset of [sisterHeadphoneEvidence.sourceAccessory, sisterHeadphoneEvidence.transformEvidence,
  sisterHeadphoneEvidence.derivationIntegrity, sisterHeadphoneEvidence.reproductionScript,
  sisterHeadphoneEvidence.derivedPng, sisterHeadphoneEvidence.delivery,
  sisterHeadphoneEvidence.artReview]) assert.equal(sha(asset.path), asset.sha256);
const sisterTransform = read(sisterHeadphoneEvidence.transformEvidence);
assert.equal(sisterTransform.source.sha256, sisterHeadphoneEvidence.sourceAccessory.sha256);
assert.equal(sisterTransform.ownBody.sha256, admitted.sister);
const sisterSelectedFit = sisterTransform.candidates.find((candidate: { path: string }) => candidate.path.endsWith('/fit-02.png'));
assert(sisterSelectedFit); assert.equal(sisterSelectedFit.sha256, sisterHeadphoneEvidence.derivedPng.sha256);
assert.equal(sisterSelectedFit.uniformScale, 1.04); assert.equal(sisterSelectedFit.translateX, -11); assert.equal(sisterSelectedFit.translateY, 16);
const sisterReview = read(sisterHeadphoneEvidence.artReview);
assert.equal(sisterReview.status, 'PASS_SCOPED_FIT02_SINGLE_AND_HAIR');
assert.equal(sisterReview.reviewer.canViewImages, true); assert.equal(sisterReview.derivedSha256, sisterHeadphoneEvidence.derivedPng.sha256);
for (const key of SCORE_KEYS) {
  assert(validScore(sisterReview.scores[key], key === 'overallPolish'), key);
  assert(typeof sisterReview.reasons[key] === 'string' && sisterReview.reasons[key].trim(), key);
}
const sisterHat = sisterHeadphoneEvidence.headwearVariants['starter-sun-cap'];
assertCurrentOrHistoricalHeadphonesHeadwearBinding(
  headphones.headwearVariants.sister['starter-sun-cap'].overlay, sisterHat.delivery.path, 'sister',
);
assert.equal(headphones.headwearVariants.sister['starter-sun-cap'].foreground, true);
for (const asset of [sisterHat.derivedPng, sisterHat.delivery, sisterHat.derivationEvidence,
  sisterHat.artReview]) assert.equal(sha(asset.path), asset.sha256);
const sisterHatReview = read(sisterHat.artReview);
assert.equal(sisterHatReview.status, 'PASS_SCOPED_STARTER_SUN_CAP_HEADPHONES_QA');
assert.equal(sisterHatReview.reviewer.canViewImages, true); assert.equal(sisterHatReview.derivedSha256, sisterHat.derivedPng.sha256);
for (const key of SCORE_KEYS) assert(validScore(sisterHatReview.scores[key], key === 'overallPolish'), key);
const sisterTemp = fs.mkdtempSync('/tmp/v64-sister-headphones-');
try {
  const reproduce = spawnSync('python3', [sisterHeadphoneEvidence.reproductionScript.path, '--out', `${sisterTemp}/out`], { encoding: 'utf8' });
  assert.equal(reproduce.status, 0, reproduce.stdout + reproduce.stderr);
  assert.deepEqual(fs.readFileSync(`${sisterTemp}/out/fit-02.png`), fs.readFileSync(sisterHeadphoneEvidence.derivedPng.path));
} finally { fs.rmSync(sisterTemp, { recursive: true, force: true }); }
for (const [png, webp] of [[sisterHeadphoneEvidence.derivedPng.path, sisterHeadphoneEvidence.delivery.path],
  [sisterHat.derivedPng.path, sisterHat.delivery.path]]) {
  const fresh = spawnSync('python3', ['scripts/qa_v64_image_pair.py', png, webp, '--wearable'], { encoding: 'utf8' });
  assert.equal(fresh.status, 0, fresh.stdout + fresh.stderr);
}
console.log('PASS: sister default-body headphones reuse with one reproduced transform and reviewed cap variant; other hats and skins remain pending.');

const youngerSisterHeadphoneLink: { path: string; sha256: string } = headphones.runtimeEvidence['younger-sister'];
const youngerSisterHeadphoneEvidence = read(youngerSisterHeadphoneLink);
assert.equal(youngerSisterHeadphoneEvidence.status, 'PASS_SCOPED_YOUNGER_SISTER_DEFAULT_BODY_RUNTIME');
assert.equal(youngerSisterHeadphoneEvidence.avatarId, 'younger-sister'); assert.equal(youngerSisterHeadphoneEvidence.accessoryReuse, true);
assertCurrentOrHistoricalBinding(headphones.variants['younger-sister'], youngerSisterHeadphoneEvidence.delivery.path, headphones.id, 'younger-sister');
for (const asset of [youngerSisterHeadphoneEvidence.sourceAccessory, youngerSisterHeadphoneEvidence.transformEvidence,
  youngerSisterHeadphoneEvidence.derivationIntegrity, youngerSisterHeadphoneEvidence.reproductionScript,
  youngerSisterHeadphoneEvidence.derivedPng, youngerSisterHeadphoneEvidence.delivery,
  youngerSisterHeadphoneEvidence.artReview]) assert.equal(sha(asset.path), asset.sha256);
const youngerSisterTransform = read(youngerSisterHeadphoneEvidence.transformEvidence);
assert.equal(youngerSisterTransform.source.sha256, youngerSisterHeadphoneEvidence.sourceAccessory.sha256);
assert.equal(youngerSisterTransform.ownBody.sha256, admitted['younger-sister']);
const youngerSisterFit = youngerSisterTransform.candidates.find((candidate: { path: string }) => candidate.path.endsWith('/fit-01.png'));
assert(youngerSisterFit); assert.equal(youngerSisterFit.sha256, youngerSisterHeadphoneEvidence.derivedPng.sha256);
assert.equal(youngerSisterFit.uniformScale, 1.02); assert.equal(youngerSisterFit.translateX, -44); assert.equal(youngerSisterFit.translateY, 27);
const youngerSisterHeadphoneReview = read(youngerSisterHeadphoneEvidence.artReview);
assert.equal(youngerSisterHeadphoneReview.status, 'PASS_SCOPED_SINGLE_AND_HAIR_CAP_REWORK');
assert.equal(youngerSisterHeadphoneReview.reviewer.canViewImages, true);
assert.equal(youngerSisterHeadphoneReview.selectedCandidate.sha256, youngerSisterHeadphoneEvidence.derivedPng.sha256);
for (const key of SCORE_KEYS) assert(validScore(youngerSisterHeadphoneReview.scores[key], key === 'overallPolish'), key);
const youngerSisterHat = youngerSisterHeadphoneEvidence.headwearVariants['starter-sun-cap'];
assertCurrentOrHistoricalHeadphonesHeadwearBinding(
  headphones.headwearVariants['younger-sister']['starter-sun-cap'].overlay, youngerSisterHat.delivery.path, 'younger-sister',
);
assert.equal(headphones.headwearVariants['younger-sister']['starter-sun-cap'].foreground, true);
for (const asset of [youngerSisterHat.derivedPng, youngerSisterHat.delivery,
  youngerSisterHat.derivationEvidence, youngerSisterHat.artReview]) assert.equal(sha(asset.path), asset.sha256);
const youngerSisterHatReview = read(youngerSisterHat.artReview);
assert.equal(youngerSisterHatReview.status, 'PASS_SCOPED_YOUNGER_SISTER_HEADPHONES_CAP_FRONT_FIT01');
assert.equal(youngerSisterHatReview.reviewer.canViewImages, true);
assert.equal(youngerSisterHatReview.candidateSha256, youngerSisterHat.derivedPng.sha256);
for (const key of SCORE_KEYS) assert(validScore(youngerSisterHatReview.scores[key], key === 'overallPolish'), key);
const youngerSisterTemp = fs.mkdtempSync('/tmp/v64-younger-sister-headphones-');
try {
  const reproduce = spawnSync('python3', [youngerSisterHeadphoneEvidence.reproductionScript.path, '--out', `${youngerSisterTemp}/out`], { encoding: 'utf8' });
  assert.equal(reproduce.status, 0, reproduce.stdout + reproduce.stderr);
  assert.deepEqual(fs.readFileSync(`${youngerSisterTemp}/out/fit-01.png`), fs.readFileSync(youngerSisterHeadphoneEvidence.derivedPng.path));
} finally { fs.rmSync(youngerSisterTemp, { recursive: true, force: true }); }
for (const [png, webp] of [[youngerSisterHeadphoneEvidence.derivedPng.path, youngerSisterHeadphoneEvidence.delivery.path],
  [youngerSisterHat.derivedPng.path, youngerSisterHat.delivery.path]]) {
  const fresh = spawnSync('python3', ['scripts/qa_v64_image_pair.py', png, webp, '--wearable'], { encoding: 'utf8' });
  assert.equal(fresh.status, 0, fresh.stdout + fresh.stderr);
}
console.log('PASS: younger-sister default-body headphones reuse with one reproduced transform and reviewed cap variant; other hats and skins remain pending.');

const glasses = manifest.accessories.find(item => item.id === 'starter-sky-glasses');
assert(glasses?.runtimeEvidence && glasses.variants);
const glassesLink = glasses.runtimeEvidence.brother;
assert(glassesLink);
const glassesEvidence = read(glassesLink);
assert.equal(glassesEvidence.status, 'PASS_SCOPED_BROTHER_DEFAULT_BODY_RUNTIME');
assert.equal(glassesEvidence.avatarId, 'brother'); assert.equal(glassesEvidence.itemId, 'starter-sky-glasses');
assertCurrentOrHistoricalBinding(glasses.variants.brother, glassesEvidence.delivery.path, glasses.id, 'brother');
for (const asset of [glassesEvidence.native, glassesEvidence.nativeTrace, glassesEvidence.generationEvidence,
  glassesEvidence.mask, glassesEvidence.maskAndTransformEvidence, glassesEvidence.derivedPng,
  glassesEvidence.delivery, glassesEvidence.artReview]) assert.equal(sha(asset.path), asset.sha256);
const maskTransform = read(glassesEvidence.maskAndTransformEvidence);
assert.equal(maskTransform.raw.sha256, glassesEvidence.native.sha256);
assert.equal(maskTransform.mask.sha256, glassesEvidence.mask.sha256);
assert.equal(maskTransform.delivery.sha256, glassesEvidence.derivedPng.sha256);
assert.equal(maskTransform.rgbPreserved, true); assert.equal(maskTransform.equationExact, true);
const glassesReview = read(glassesEvidence.artReview);
assert.equal(glassesReview.status, 'PASS_SCOPED_RUNTIME_MASK01_QA');
assert.equal(glassesReview.reviewer.canViewImages, true);
assert.equal(glassesReview.derivedSha256, glassesEvidence.derivedPng.sha256);
for (const key of SCORE_KEYS) {
  assert(validScore(glassesReview.scores[key], key === 'overallPolish'), key);
  assert(typeof glassesReview.reasons[key] === 'string' && glassesReview.reasons[key].trim(), key);
}
for (const [path, hash] of Object.entries(glassesReview.viewed)) assert.equal(sha(path), hash);
for (const command of [
  ['scripts/qa_v64_masked_runtime.py', glassesEvidence.maskAndTransformEvidence.path],
  ['scripts/qa_v64_image_pair.py', glassesEvidence.derivedPng.path, glassesEvidence.delivery.path, '--wearable'],
]) {
  const fresh = spawnSync('python3', command, { encoding: 'utf8' });
  assert.equal(fresh.status, 0, fresh.stdout + fresh.stderr);
}
console.log('PASS: brother default-body starter glasses with reproduced mask and transform; headphones, other avatars and release remain pending.');

const youngerGlassesLink = glasses.runtimeEvidence.younger;
assert(youngerGlassesLink);
const youngerGlassesEvidence = read(youngerGlassesLink);
assert.equal(youngerGlassesEvidence.status, 'PASS_SCOPED_YOUNGER_DEFAULT_BODY_RUNTIME');
assert.equal(youngerGlassesEvidence.avatarId, 'younger'); assert.equal(youngerGlassesEvidence.sameAccessoryReuse, true);
assertCurrentOrHistoricalBinding(glasses.variants.younger, youngerGlassesEvidence.delivery.path, glasses.id, 'younger');
for (const asset of [youngerGlassesEvidence.native, youngerGlassesEvidence.nativeTrace,
  youngerGlassesEvidence.mask, youngerGlassesEvidence.transformAndAlphaEvidence,
  youngerGlassesEvidence.derivedPng, youngerGlassesEvidence.delivery,
  youngerGlassesEvidence.identityMaster, youngerGlassesEvidence.artReview]) assert.equal(sha(asset.path), asset.sha256);
assert.equal(youngerGlassesEvidence.identityMaster.sha256, admitted.younger);
const youngerGlassesTransform = read(youngerGlassesEvidence.transformAndAlphaEvidence);
assert.equal(youngerGlassesTransform.raw.sha256, youngerGlassesEvidence.native.sha256);
assert.equal(youngerGlassesTransform.mask.sha256, youngerGlassesEvidence.mask.sha256);
assert.equal(youngerGlassesTransform.derived.sha256, youngerGlassesEvidence.derivedPng.sha256);
assert.equal(youngerGlassesTransform.ownMaster.sha256, admitted.younger);
assert.equal(youngerGlassesTransform.sameAccessoryReuse, true);
const youngerGlassesReview = read(youngerGlassesEvidence.artReview);
assert.equal(youngerGlassesReview.status, 'PASS_SCOPED_RUNTIME_FIT01_QA');
assert.equal(youngerGlassesReview.reviewer.canViewImages, true);
assert.equal(youngerGlassesReview.derivedSha256, youngerGlassesEvidence.derivedPng.sha256);
for (const key of SCORE_KEYS) {
  assert(validScore(youngerGlassesReview.scores[key], key === 'overallPolish'), key);
  assert(typeof youngerGlassesReview.reasons[key] === 'string' && youngerGlassesReview.reasons[key].trim(), key);
}
for (const [path, hash] of Object.entries(youngerGlassesReview.viewed)) assert.equal(sha(path), hash);
for (const command of [
  ['scripts/qa_v64_masked_runtime.py', youngerGlassesEvidence.transformAndAlphaEvidence.path],
  ['scripts/qa_v64_image_pair.py', youngerGlassesEvidence.derivedPng.path, youngerGlassesEvidence.delivery.path, '--wearable'],
]) {
  const fresh = spawnSync('python3', command, { encoding: 'utf8' });
  assert.equal(fresh.status, 0, fresh.stdout + fresh.stderr);
}
console.log('PASS: younger default-body starter glasses reuse with reproduced mask and transform; headphones combinations and release remain pending.');

const sisterGlassesLink: { path: string; sha256: string } = glasses.runtimeEvidence.sister;
const sisterGlassesEvidence = read(sisterGlassesLink);
assert.equal(sisterGlassesEvidence.status, 'PASS_SCOPED_SISTER_DEFAULT_BODY_RUNTIME');
assert.equal(sisterGlassesEvidence.avatarId, 'sister'); assert.equal(sisterGlassesEvidence.sameAccessoryReuse, true);
assertCurrentOrHistoricalBinding(glasses.variants.sister, sisterGlassesEvidence.delivery.path, glasses.id, 'sister');
for (const asset of [sisterGlassesEvidence.native, sisterGlassesEvidence.nativeTrace,
  sisterGlassesEvidence.mask, sisterGlassesEvidence.transformAndAlphaEvidence,
  sisterGlassesEvidence.derivedPng, sisterGlassesEvidence.delivery,
  sisterGlassesEvidence.identityMaster, sisterGlassesEvidence.artReview]) assert.equal(sha(asset.path), asset.sha256);
assert.equal(sisterGlassesEvidence.identityMaster.sha256, admitted.sister);
const sisterGlassesTransform = read(sisterGlassesEvidence.transformAndAlphaEvidence);
assert.equal(sisterGlassesTransform.raw.sha256, sisterGlassesEvidence.native.sha256);
assert.equal(sisterGlassesTransform.mask.sha256, sisterGlassesEvidence.mask.sha256);
assert.equal(sisterGlassesTransform.derived.sha256, sisterGlassesEvidence.derivedPng.sha256);
assert.equal(sisterGlassesTransform.ownMaster.sha256, admitted.sister);
assert.equal(sisterGlassesTransform.sameAccessoryReuse, true);
const sisterGlassesReview = read(sisterGlassesEvidence.artReview);
assert.equal(sisterGlassesReview.status, 'PASS_SCOPED_SISTER_SKY_GLASSES_RUNTIME_FIT01');
assert.equal(sisterGlassesReview.reviewer.canViewImages, true);
assert.equal(sisterGlassesReview.candidateSha256, sisterGlassesEvidence.derivedPng.sha256);
for (const key of SCORE_KEYS) {
  assert(validScore(sisterGlassesReview.scores[key], key === 'overallPolish'), key);
  assert(typeof sisterGlassesReview.reasons[key] === 'string' && sisterGlassesReview.reasons[key].trim(), key);
}
for (const [path, hash] of Object.entries(sisterGlassesReview.viewed)) assert.equal(sha(path), hash);
for (const command of [
  ['scripts/qa_v64_masked_runtime.py', sisterGlassesEvidence.transformAndAlphaEvidence.path],
  ['scripts/qa_v64_image_pair.py', sisterGlassesEvidence.derivedPng.path, sisterGlassesEvidence.delivery.path, '--wearable'],
]) {
  const fresh = spawnSync('python3', command, { encoding: 'utf8' });
  assert.equal(fresh.status, 0, fresh.stdout + fresh.stderr);
}
console.log('PASS: sister default-body starter glasses reuse with reproduced mask and transform; Pilot integration and release remain pending.');

const youngerSisterGlassesLink = glasses.runtimeEvidence['younger-sister'];
assert(youngerSisterGlassesLink);
const youngerSisterGlassesEvidence = read(youngerSisterGlassesLink);
assert.equal(youngerSisterGlassesEvidence.status, 'PASS_SCOPED_YOUNGER_SISTER_DEFAULT_BODY_RUNTIME');
assert.equal(youngerSisterGlassesEvidence.avatarId, 'younger-sister'); assert.equal(youngerSisterGlassesEvidence.sameAccessoryReuse, true);
assertCurrentOrHistoricalBinding(glasses.variants['younger-sister'], youngerSisterGlassesEvidence.delivery.path, glasses.id, 'younger-sister');
for (const asset of [youngerSisterGlassesEvidence.native, youngerSisterGlassesEvidence.nativeTrace,
  youngerSisterGlassesEvidence.mask, youngerSisterGlassesEvidence.transformAndAlphaEvidence,
  youngerSisterGlassesEvidence.derivedPng, youngerSisterGlassesEvidence.delivery,
  youngerSisterGlassesEvidence.identityMaster, youngerSisterGlassesEvidence.artReview]) assert.equal(sha(asset.path), asset.sha256);
assert.equal(youngerSisterGlassesEvidence.identityMaster.sha256, admitted['younger-sister']);
const youngerSisterGlassesTransform = read(youngerSisterGlassesEvidence.transformAndAlphaEvidence);
assert.equal(youngerSisterGlassesTransform.raw.sha256, youngerSisterGlassesEvidence.native.sha256);
assert.equal(youngerSisterGlassesTransform.mask.sha256, youngerSisterGlassesEvidence.mask.sha256);
assert.equal(youngerSisterGlassesTransform.derived.sha256, youngerSisterGlassesEvidence.derivedPng.sha256);
assert.equal(youngerSisterGlassesTransform.ownMaster.sha256, admitted['younger-sister']);
assert.equal(youngerSisterGlassesTransform.sameAccessoryReuse, true);
const youngerSisterGlassesReview = read(youngerSisterGlassesEvidence.artReview);
assert.equal(youngerSisterGlassesReview.status, 'PASS_SCOPED_YOUNGER_SISTER_SKY_GLASSES_RUNTIME_FIT01');
assert.equal(youngerSisterGlassesReview.reviewer.canViewImages, true);
assert.equal(youngerSisterGlassesReview.candidateSha256, youngerSisterGlassesEvidence.derivedPng.sha256);
for (const key of SCORE_KEYS) {
  assert(validScore(youngerSisterGlassesReview.scores[key], key === 'overallPolish'), key);
  assert(typeof youngerSisterGlassesReview.reasons[key] === 'string' && youngerSisterGlassesReview.reasons[key].trim(), key);
}
for (const [path, hash] of Object.entries(youngerSisterGlassesReview.viewed)) assert.equal(sha(path), hash);
for (const command of [
  ['scripts/qa_v64_masked_runtime.py', youngerSisterGlassesEvidence.transformAndAlphaEvidence.path],
  ['scripts/qa_v64_image_pair.py', youngerSisterGlassesEvidence.derivedPng.path, youngerSisterGlassesEvidence.delivery.path, '--wearable'],
]) {
  const fresh = spawnSync('python3', command, { encoding: 'utf8' });
  assert.equal(fresh.status, 0, fresh.stdout + fresh.stderr);
}
console.log('PASS: younger-sister default-body starter glasses reuse with reproduced mask and transform; Pilot integration and release remain pending.');

// P08c Batch01 retains three existing role-aligned glasses overlays byte-for-byte
// and binds dedicated V6.4 runtime copies without introducing hair/detail masks.
const p08cBatch01Items = ['sky-view-glasses', 'glasses-racer', 'glasses-star'] as const;
const p08cBatch01Derivation = JSON.parse(fs.readFileSync('qa/art-gate/attempts/20260915_p08c_batch01/phase2-role-derivation.json', 'utf8'));
const p08cBatch01Admission = JSON.parse(fs.readFileSync('qa/art-gate/attempts/20260915_p08c_batch01/static-admission-summary.json', 'utf8'));
assert.equal(p08cBatch01Derivation.status, 'PASS');
assert.equal(p08cBatch01Derivation.rows.length, 12);
assert.equal(p08cBatch01Admission.status, 'PASS');
assert.equal(p08cBatch01Admission.result, 'PASS-12-of-12-static-admission');
assert.equal(p08cBatch01Admission.rows.length, 12);
assert(p08cBatch01Admission.rows.every((row: { decision: string }) => row.decision === 'PASS'));
for (const itemId of p08cBatch01Items) {
  const item = manifest.accessories.find(entry => entry.id === itemId);
  assert(item?.variants, `Missing P08c Batch01 manifest contract: ${itemId}`);
  assert.equal('defaultSkinDetails' in item, false, `Glasses must not create defaultSkinDetails: ${itemId}`);
  assert.deepEqual(Object.keys(item.variants).sort(), Object.keys(admitted).sort());
  for (const avatar of Object.keys(admitted) as (keyof typeof admitted)[]) {
    const expectedOverlay = `public/assets/v6.4/runtime/${avatar}/${itemId}.webp`;
    const expectedSource = `qa/art-gate/attempts/20260915_p08c_batch01/reviewed-runtime-source/${avatar}/${itemId}.webp`;
    assertCurrentOrHistoricalBinding(item.variants[avatar], expectedOverlay, itemId, avatar);
    const row = p08cBatch01Derivation.rows.find((candidate: { itemId: string; avatarId: string }) => candidate.itemId === itemId && candidate.avatarId === avatar);
    assert(row, `Missing P08c Batch01 derivation row: ${itemId}/${avatar}`);
    assert.equal(row.runtimeSource, expectedSource);
    assert.equal(row.runtimeAsset, expectedOverlay);
    assert.equal(row.byteIdenticalToRetainedV5RoleOverlay, true);
    assert.equal(row.geometryTransform, 'none');
    assert.equal(sha(row.source), row.sourceSha256);
    assert.equal(sha(row.runtimeSource), row.runtimeSourceSha256);
    assert.equal(sha(row.runtimeAsset), row.runtimeSha256);
    assert.equal(row.sourceSha256, row.runtimeSourceSha256);
    assert.equal(row.runtimeSourceSha256, row.runtimeSha256);
    assert.equal(row.staticAdmissionSummary, 'qa/art-gate/attempts/20260915_p08c_batch01/static-admission-summary.json');
    assert.equal(sha(row.staticAdmissionSummary), row.staticAdmissionSummarySha256);
  }
}
console.log('PASS: P08c Batch01 sky-view/racer/star glasses x 4 roles retain V5 pixels exactly and have 12-row static admission + V6.4 bindings.');

const p08cBatch02Items = ['glasses-holo', 'glasses-legend', 'sister-heart-glasses'] as const;
const p08cBatch02Derivation = JSON.parse(fs.readFileSync('qa/art-gate/attempts/20260915_p08c_batch02/phase2-role-derivation.json', 'utf8'));
const p08cBatch02Admission = JSON.parse(fs.readFileSync('qa/art-gate/attempts/20260915_p08c_batch02/static-admission-summary.json', 'utf8'));
assert.equal(p08cBatch02Derivation.status, 'PASS');
assert.equal(p08cBatch02Derivation.rows.length, 12);
assert.equal(p08cBatch02Admission.status, 'PASS');
assert.equal(p08cBatch02Admission.result, 'PASS-12-of-12-static-admission');
assert.equal(p08cBatch02Admission.rows.length, 12);
assert(p08cBatch02Admission.rows.every((row: { decision: string }) => row.decision === 'PASS'));
for (const itemId of p08cBatch02Items) {
  const item = manifest.accessories.find(entry => entry.id === itemId);
  assert(item?.variants, `Missing P08c Batch02 manifest contract: ${itemId}`);
  assert.equal('defaultSkinDetails' in item, false, `Glasses must not create defaultSkinDetails: ${itemId}`);
  assert.deepEqual(Object.keys(item.variants).sort(), Object.keys(admitted).sort());
  for (const avatar of Object.keys(admitted) as (keyof typeof admitted)[]) {
    const expectedOverlay = `public/assets/v6.4/runtime/${avatar}/${itemId}.webp`;
    const expectedSource = `qa/art-gate/attempts/20260915_p08c_batch02/reviewed-runtime-source/${avatar}/${itemId}.webp`;
    assertCurrentOrHistoricalBinding(item.variants[avatar], expectedOverlay, itemId, avatar);
    const row = p08cBatch02Derivation.rows.find((candidate: { itemId: string; avatarId: string }) => candidate.itemId === itemId && candidate.avatarId === avatar);
    assert(row, `Missing P08c Batch02 derivation row: ${itemId}/${avatar}`);
    assert.equal(row.runtimeSource, expectedSource);
    assert.equal(row.runtimeAsset, expectedOverlay);
    assert.equal(row.byteIdenticalToRetainedV5RoleOverlay, true);
    assert.equal(row.geometryTransform, 'none');
    assert.equal(sha(row.source), row.sourceSha256);
    assert.equal(sha(row.runtimeSource), row.runtimeSourceSha256);
    assert.equal(sha(row.runtimeAsset), row.runtimeSha256);
    assert.equal(row.sourceSha256, row.runtimeSourceSha256);
    assert.equal(row.runtimeSourceSha256, row.runtimeSha256);
    assert.equal(row.staticAdmissionSummary, 'qa/art-gate/attempts/20260915_p08c_batch02/static-admission-summary.json');
    assert.equal(sha(row.staticAdmissionSummary), row.staticAdmissionSummarySha256);
  }
}
console.log('PASS: P08c Batch02 holo/legend/heart glasses x 4 roles retain V5 pixels exactly and have 12-row static admission + V6.4 bindings.');

// P08d Batch01 retains three existing role-aligned headphones overlays byte-for-byte.
// Representative hat coexistence is validated in the integrated Runtime gate, not fabricated here.
const p08dBatch01Items = ['story-headphones', 'phones-sky', 'phones-racer'] as const;
const p08dBatch01Derivation = JSON.parse(fs.readFileSync('qa/art-gate/attempts/20260915_p08d_batch01/phase2-role-derivation.json', 'utf8'));
const p08dBatch01Admission = JSON.parse(fs.readFileSync('qa/art-gate/attempts/20260915_p08d_batch01/static-admission-summary.json', 'utf8'));
assert.equal(p08dBatch01Derivation.status, 'PASS');
assert.equal(p08dBatch01Derivation.rows.length, 12);
assert.equal(p08dBatch01Admission.status, 'PASS');
assert.equal(p08dBatch01Admission.result, 'PASS-12-of-12-static-admission');
assert.equal(p08dBatch01Admission.rows.length, 12);
assert(p08dBatch01Admission.rows.every((row: { decision: string }) => row.decision === 'PASS'));
for (const itemId of p08dBatch01Items) {
  const item = manifest.accessories.find(entry => entry.id === itemId);
  assert(item?.variants, `Missing P08d Batch01 manifest contract: ${itemId}`);
  assert.equal('defaultSkinDetails' in item, false, `Headphones must not create defaultSkinDetails: ${itemId}`);
  assert.deepEqual(Object.keys(item.variants).sort(), Object.keys(admitted).sort());
  for (const avatar of Object.keys(admitted) as (keyof typeof admitted)[]) {
    const expectedOverlay = `public/assets/v6.4/runtime/${avatar}/${itemId}.webp`;
    const expectedSource = `qa/art-gate/attempts/20260915_p08d_batch01/reviewed-runtime-source/${avatar}/${itemId}.webp`;
    assertCurrentOrHistoricalBinding(item.variants[avatar], expectedOverlay, itemId, avatar);
    const row = p08dBatch01Derivation.rows.find((candidate: { itemId: string; avatarId: string }) => candidate.itemId === itemId && candidate.avatarId === avatar);
    assert(row, `Missing P08d Batch01 derivation row: ${itemId}/${avatar}`);
    assert.equal(row.runtimeSource, expectedSource);
    assert.equal(row.runtimeAsset, expectedOverlay);
    assert.equal(row.byteIdenticalToRetainedV5RoleOverlay, true);
    assert.equal(row.geometryTransform, 'none');
    assert.equal(sha(row.source), row.sourceSha256);
    assert.equal(sha(row.runtimeSource), row.runtimeSourceSha256);
    assert.equal(sha(row.runtimeAsset), row.runtimeSha256);
    assert.equal(row.sourceSha256, row.runtimeSourceSha256);
    assert.equal(row.runtimeSourceSha256, row.runtimeSha256);
    assert.equal(row.staticAdmissionSummary, 'qa/art-gate/attempts/20260915_p08d_batch01/static-admission-summary.json');
    assert.equal(sha(row.staticAdmissionSummary), row.staticAdmissionSummarySha256);
  }
}
console.log('PASS: P08d Batch01 story/sky/racer headphones x 4 roles retain V5 pixels exactly and have 12-row static admission + V6.4 bindings.');

// P08d Batch02 retains the final three existing role-aligned headphones overlays byte-for-byte.
// Do not introduce headwear/default-skin variants without actual Runtime visual evidence.
const p08dBatch02Items = ['phones-ai', 'phones-legend', 'sister-cat-headphones'] as const;
const p08dBatch02Derivation = JSON.parse(fs.readFileSync('qa/art-gate/attempts/20260915_p08d_batch02/phase2-role-derivation.json', 'utf8'));
const p08dBatch02Admission = JSON.parse(fs.readFileSync('qa/art-gate/attempts/20260915_p08d_batch02/static-admission-summary.json', 'utf8'));
assert.equal(p08dBatch02Derivation.status, 'PASS');
assert.equal(p08dBatch02Derivation.rows.length, 12);
assert.equal(p08dBatch02Admission.status, 'PASS');
assert.equal(p08dBatch02Admission.result, 'PASS-12-of-12-static-admission');
assert.equal(p08dBatch02Admission.rows.length, 12);
assert(p08dBatch02Admission.rows.every((row: { decision: string }) => row.decision === 'PASS'));
for (const itemId of p08dBatch02Items) {
  const item = manifest.accessories.find(entry => entry.id === itemId);
  assert(item?.variants, `Missing P08d Batch02 manifest contract: ${itemId}`);
  assert.equal('defaultSkinDetails' in item, false, `Headphones must not create defaultSkinDetails without Runtime evidence: ${itemId}`);
  assert.equal('headwearVariants' in item, false, `Headphones must not create headwearVariants without Runtime evidence: ${itemId}`);
  assert.deepEqual(Object.keys(item.variants).sort(), Object.keys(admitted).sort());
  for (const avatar of Object.keys(admitted) as (keyof typeof admitted)[]) {
    const expectedOverlay = `public/assets/v6.4/runtime/${avatar}/${itemId}.webp`;
    const expectedSource = `qa/art-gate/attempts/20260915_p08d_batch02/reviewed-runtime-source/${avatar}/${itemId}.webp`;
    assertCurrentOrHistoricalBinding(item.variants[avatar], expectedOverlay, itemId, avatar);
    const row = p08dBatch02Derivation.rows.find((candidate: { itemId: string; avatarId: string }) => candidate.itemId === itemId && candidate.avatarId === avatar);
    assert(row, `Missing P08d Batch02 derivation row: ${itemId}/${avatar}`);
    assert.equal(row.runtimeSource, expectedSource);
    assert.equal(row.runtimeAsset, expectedOverlay);
    assert.equal(row.byteIdenticalToRetainedV5RoleOverlay, true);
    assert.equal(row.geometryTransform, 'none');
    assert.equal(sha(row.source), row.sourceSha256);
    assert.equal(sha(row.candidate), row.candidateSha256);
    assert.equal(sha(row.runtimeSource), row.runtimeSourceSha256);
    assert.equal(sha(row.runtimeAsset), row.runtimeSha256);
    assert.equal(row.sourceSha256, row.candidateSha256);
    assert.equal(row.candidateSha256, row.runtimeSourceSha256);
    assert.equal(row.runtimeSourceSha256, row.runtimeSha256);
    assert.equal(row.staticAdmissionSummary, 'qa/art-gate/attempts/20260915_p08d_batch02/static-admission-summary.json');
    assert.equal(sha(row.staticAdmissionSummary), row.staticAdmissionSummarySha256);
  }
}
console.log('PASS: P08d Batch02 AI/legend/cat headphones x 4 roles retain V5 pixels exactly and have 12-row static admission + V6.4 bindings.');

// P08e Batch01 has 11 retained byte-identical full skins plus one scoped reviewed repair:
// brother/outfit-cadet. The repair is allowed only because the retained V5 row reproduced
// the historical flat-chest-patch blocker in actual Runtime. Browser cross-slot coexistence
// and actual Runtime visual review remain separate gates before delivery-ledger promotion.
const p08eBatch01Items = ['outfit-cadet', 'outfit-racer', 'outfit-mecha'] as const;
const p08eBatch01DerivationPath = 'qa/art-gate/attempts/20260915_p08e_batch01/phase2-role-derivation.json';
const p08eBatch01AdmissionPath = 'qa/art-gate/attempts/20260915_p08e_batch01/static-admission-summary.json';
const p08eBatch01PromotionPath = 'qa/art-gate/attempts/20260915_p08e_batch01/brother-cadet-repair-promotion.json';
const p08eBatch01DerivationSha256 = '461fd4013fc33447a78e5eb8780e66e305b466ad56bd59106c1aa51c433998c2';
const p08eBatch01AdmissionSha256 = '86626f7a755143fa49f669bf9b504dc288de58fcfebac145735a634756a7743a';
const p08eBatch01PromotionSha256 = '57ff3c57c23e4fac3e2d726a4ab9ec46cf998a59faaba95b84352987f4df5d03';
assert.equal(sha(p08eBatch01DerivationPath), p08eBatch01DerivationSha256, 'P08e Batch01 derivation evidence changed');
assert.equal(sha(p08eBatch01AdmissionPath), p08eBatch01AdmissionSha256, 'P08e Batch01 static admission evidence changed');
assert.equal(sha(p08eBatch01PromotionPath), p08eBatch01PromotionSha256, 'P08e brother-cadet repair promotion evidence changed');
const p08eBatch01Derivation = JSON.parse(fs.readFileSync(p08eBatch01DerivationPath, 'utf8'));
const p08eBatch01Admission = JSON.parse(fs.readFileSync(p08eBatch01AdmissionPath, 'utf8'));
const p08eBatch01Promotion = JSON.parse(fs.readFileSync(p08eBatch01PromotionPath, 'utf8'));
assert.equal(p08eBatch01Derivation.status, 'PASS');
assert.deepEqual(p08eBatch01Derivation.items, [...p08eBatch01Items]);
assert.deepEqual(p08eBatch01Derivation.roles, Object.keys(admitted));
assert.equal(p08eBatch01Derivation.rows.length, 12);
assert.equal(p08eBatch01Derivation.retainedByteIdenticalRows, 11);
assert.equal(p08eBatch01Derivation.reviewedRepairRows, 1);
assert.equal(p08eBatch01Admission.status, 'PASS');
assert.equal(p08eBatch01Admission.result, 'PASS-12-of-12-static-admission');
assert.equal(p08eBatch01Admission.rows.length, 12);
assert.equal(p08eBatch01Admission.retainedByteIdenticalRows, 11);
assert.equal(p08eBatch01Admission.modifiedReviewedRows, 1);
assert(p08eBatch01Admission.rows.every((row: { decision: string }) => row.decision === 'PASS'));
assert.equal(p08eBatch01Promotion.status, 'PROMOTED_TO_LOCAL_CANDIDATE_PENDING_FRESH_BUILD_RUNTIME_AND_ACTUAL_VISUAL');
assert.equal(p08eBatch01Promotion.sourceByteIdentical, false);
assert.equal(p08eBatch01Promotion.candidateRuntimeByteIdentical, true);
assert.equal(p08eBatch01Promotion.decodedRgbaExactToAdmittedPng, true);
assert.equal(p08eBatch01Promotion.alphaUnchanged, true);
assert.equal(p08eBatch01Promotion.changesOutsideOriginalGarmentFootprint, 0);
for (const admissionRow of p08eBatch01Admission.rows as Array<{
  itemId: string;
  avatarId: string;
  reviews: Record<string, { path: string; sha256: string; blockingIssues: unknown[]; checks: Record<string, string>; historicalDefectResolved?: boolean }>;
}>) {
  assert.deepEqual(Object.keys(admissionRow.reviews).sort(), ['gemma3:12b', 'gemma3:4b']);
  for (const review of Object.values(admissionRow.reviews)) {
    assert.equal(sha(review.path), review.sha256, `P08e static review evidence changed: ${admissionRow.itemId}/${admissionRow.avatarId}`);
    assert.equal(review.blockingIssues.length, 0, `P08e static blocker: ${admissionRow.itemId}/${admissionRow.avatarId}`);
    assert(Object.values(review.checks).every(result => result === 'PASS'), `P08e static check failed: ${admissionRow.itemId}/${admissionRow.avatarId}`);
    if (admissionRow.itemId === 'outfit-cadet' && admissionRow.avatarId === 'brother') assert.equal(review.historicalDefectResolved, true);
  }
}
for (const itemId of p08eBatch01Items) {
  for (const avatar of Object.keys(admitted) as (keyof typeof admitted)[]) {
    const expectedSkin = `public/assets/v6.4/runtime/${avatar}/${itemId}.webp`;
    const expectedSource = `qa/art-gate/attempts/20260915_p08e_batch01/reviewed-runtime-source/${avatar}/${itemId}.webp`;
    const skin = manifest.skins.find(entry => entry.skinId === itemId && entry.avatarId === avatar);
    assert(skin, `Missing P08e Batch01 skin manifest contract: ${itemId}/${avatar}`);
    assert.equal(skin.id, `${avatar}:${itemId}`);
    assertCurrentOrHistoricalBinding(skin.path, expectedSkin, itemId, avatar);
    assert.equal(skin.path.includes('/assets/v5/characters/'), false, `P08e Batch01 must not bind V5 focus skin: ${itemId}/${avatar}`);
    const row = p08eBatch01Derivation.rows.find((candidate: { itemId: string; avatarId: string }) => candidate.itemId === itemId && candidate.avatarId === avatar);
    assert(row, `Missing P08e Batch01 derivation row: ${itemId}/${avatar}`);
    assert.equal(row.runtimeSource, expectedSource);
    assert.equal(row.runtimeAsset, expectedSkin);
    assert.equal(row.blinkCoverage, 'DEFERRED_TO_P10_M03_NOT_CLAIMED_BY_P08E');
    assert.equal(sha(row.source), row.sourceSha256);
    assert.equal(sha(row.candidate), row.candidateSha256);
    assert.equal(sha(row.runtimeSource), row.runtimeSourceSha256);
    assert.equal(sha(row.runtimeAsset), row.runtimeSha256);
    const isReviewedRepair = itemId === 'outfit-cadet' && avatar === 'brother';
    if (isReviewedRepair) {
      assert.equal(row.byteIdenticalToRetainedV5FullSkin, false);
      assert.equal(row.candidateRuntimeByteIdentical, true);
      assert.equal(row.geometryTransform, 'localized-reviewed-role-structure-transfer-within-existing-garment-footprint');
      assert.notEqual(row.sourceSha256, row.candidateSha256);
      assert.equal(row.candidateSha256, row.runtimeSourceSha256);
      assert.equal(row.runtimeSourceSha256, row.runtimeSha256);
      assert.equal(row.candidateSha256, p08eBatch01Promotion.runtime.sha256);
      assert.equal(row.repairEvidence.losslessWebpRgbaExact, true);
      assert.equal(row.repairEvidence.alphaUnchanged, true);
      assert.equal(row.repairEvidence.changesOutsideOriginalGarmentFootprint, 0);
      assert.equal(sha(row.repairEvidence.candidateEvidence.path), row.repairEvidence.candidateEvidence.sha256);
      assert.equal(sha(row.repairEvidence.historicalBlocker.path), row.repairEvidence.historicalBlocker.sha256);
      for (const admission of Object.values(row.repairEvidence.isolatedAdmissions) as Array<{ path: string; sha256: string }>) assert.equal(sha(admission.path), admission.sha256);
    } else {
      assert.equal(row.byteIdenticalToRetainedV5FullSkin, true);
      assert.equal(row.geometryTransform, 'none');
      assert.equal(row.sourceSha256, row.candidateSha256);
      assert.equal(row.candidateSha256, row.runtimeSourceSha256);
      assert.equal(row.runtimeSourceSha256, row.runtimeSha256);
    }
    assert.equal(row.staticAdmissionSummary, p08eBatch01AdmissionPath);
    assert.equal(row.staticAdmissionSummarySha256, p08eBatch01AdmissionSha256);
    assert.equal(sha(row.staticAdmissionSummary), row.staticAdmissionSummarySha256);
    const admissionRow = p08eBatch01Admission.rows.find((candidate: { itemId: string; avatarId: string }) => candidate.itemId === itemId && candidate.avatarId === avatar);
    assert(admissionRow, `Missing P08e Batch01 static admission row: ${itemId}/${avatar}`);
    assert.equal(admissionRow.decision, 'PASS');
  }
}
console.log('PASS: P08e Batch01 cadet/racer/mecha x 4 roles = 11 retained byte-identical rows + reviewed brother-cadet repair; 12-row two-model static admission, V6.4 skin bindings and deferred blink boundary are intact.');

// P08e Batch02 retains ocean/mage/legend full skins byte-for-byte after dual-model static admission.
const p08eBatch02Items = ['outfit-ocean', 'outfit-mage', 'outfit-legend'] as const;
const p08eBatch02DerivationPath = 'qa/art-gate/attempts/20260915_p08e_batch02/phase2-role-derivation.json';
const p08eBatch02AdmissionPath = 'qa/art-gate/attempts/20260915_p08e_batch02/static-admission-summary.json';
const p08eBatch02DerivationSha256 = '962a81f23812c403737fa5bd6ba355cbb248b40ce7cb6ab3ac928f62b3186a29';
const p08eBatch02AdmissionSha256 = '17775b84d33e352a2bc14e72c30517e0c6b5ddd4d22e79283d7db0a99459d0ca';
assert.equal(sha(p08eBatch02DerivationPath), p08eBatch02DerivationSha256, 'P08e Batch02 derivation evidence changed');
assert.equal(sha(p08eBatch02AdmissionPath), p08eBatch02AdmissionSha256, 'P08e Batch02 static admission evidence changed');
const p08eBatch02Derivation = JSON.parse(fs.readFileSync(p08eBatch02DerivationPath, 'utf8'));
const p08eBatch02Admission = JSON.parse(fs.readFileSync(p08eBatch02AdmissionPath, 'utf8'));
assert.equal(p08eBatch02Derivation.status, 'PASS');
assert.deepEqual(p08eBatch02Derivation.items, [...p08eBatch02Items]);
assert.deepEqual(p08eBatch02Derivation.roles, Object.keys(admitted));
assert.equal(p08eBatch02Derivation.rows.length, 12);
assert.equal(p08eBatch02Admission.status, 'PASS');
assert.equal(p08eBatch02Admission.result, 'PASS-12-of-12-static-admission');
assert.equal(p08eBatch02Admission.rows.length, 12);
for (const itemId of p08eBatch02Items) {
  for (const avatar of Object.keys(admitted) as (keyof typeof admitted)[]) {
    const expectedSkin = `public/assets/v6.4/runtime/${avatar}/${itemId}.webp`;
    const expectedSource = `qa/art-gate/attempts/20260915_p08e_batch02/reviewed-runtime-source/${avatar}/${itemId}.webp`;
    const skin = manifest.skins.find(entry => entry.skinId === itemId && entry.avatarId === avatar);
    assert(skin, `Missing P08e Batch02 skin manifest contract: ${itemId}/${avatar}`);
    assertCurrentOrHistoricalBinding(skin.path, expectedSkin, itemId, avatar);
    assert.equal(skin.path.includes('/assets/v5/characters/'), false);
    const row = p08eBatch02Derivation.rows.find((candidate: { itemId: string; avatarId: string }) => candidate.itemId === itemId && candidate.avatarId === avatar);
    assert(row, `Missing P08e Batch02 derivation row: ${itemId}/${avatar}`);
    assert.equal(row.runtimeSource, expectedSource);
    assert.equal(row.runtimeAsset, expectedSkin);
    assert.equal(row.byteIdenticalToRetainedV5FullSkin, true);
    assert.equal(row.geometryTransform, 'none');
    assert.equal(row.blinkCoverage, 'DEFERRED_TO_P10_M03_NOT_CLAIMED_BY_P08E');
    assert.equal(sha(row.source), row.sourceSha256);
    assert.equal(sha(row.candidate), row.candidateSha256);
    assert.equal(sha(row.runtimeSource), row.runtimeSourceSha256);
    assert.equal(sha(row.runtimeAsset), row.runtimeSha256);
    assert.equal(row.sourceSha256, row.candidateSha256);
    assert.equal(row.candidateSha256, row.runtimeSourceSha256);
    assert.equal(row.runtimeSourceSha256, row.runtimeSha256);
    const admissionRow = p08eBatch02Admission.rows.find((candidate: { itemId: string; avatarId: string }) => candidate.itemId === itemId && candidate.avatarId === avatar);
    assert(admissionRow, `Missing P08e Batch02 static admission row: ${itemId}/${avatar}`);
    assert.equal(admissionRow.decision, 'PASS');
    assert.deepEqual(Object.keys(admissionRow.reviews).sort(), ['gemma3:12b', 'gemma3:4b']);
    for (const review of Object.values(admissionRow.reviews) as Array<{ blockingIssues: unknown[]; checks: Record<string, string> }>) {
      assert.equal(review.blockingIssues.length, 0, `P08e Batch02 static blocker: ${itemId}/${avatar}`);
      assert(Object.values(review.checks).every(result => result === 'PASS'));
    }
  }
}
console.log('PASS: P08e Batch02 ocean/mage/legend x 4 roles retain V5 full-skin bytes exactly, have dual-model static admission, V6.4 bindings and deferred blink boundary.');

// P08e Batch03 closes the outfit slot with the four role-specific retained sister-bloom full skins.
const p08eBatch03Items = ['sister-bloom-outfit'] as const;
const p08eBatch03DerivationPath = 'qa/art-gate/attempts/20260916_p08e_batch03/phase2-role-derivation.json';
const p08eBatch03AdmissionPath = 'qa/art-gate/attempts/20260916_p08e_batch03/static-admission-summary.json';
const p08eBatch03DerivationSha256 = 'f749c98c5d1fd6b66ea3318b774284e99414d4afc59c924f47f8466c096ae811';
const p08eBatch03AdmissionSha256 = '14734650e333a10f1926688d86af344eb6b05bc176d3c16098673b731994bc9f';
assert.equal(sha(p08eBatch03DerivationPath), p08eBatch03DerivationSha256, 'P08e Batch03 derivation evidence changed');
assert.equal(sha(p08eBatch03AdmissionPath), p08eBatch03AdmissionSha256, 'P08e Batch03 static admission evidence changed');
const p08eBatch03Derivation = JSON.parse(fs.readFileSync(p08eBatch03DerivationPath, 'utf8'));
const p08eBatch03Admission = JSON.parse(fs.readFileSync(p08eBatch03AdmissionPath, 'utf8'));
assert.equal(p08eBatch03Derivation.status, 'PASS');
assert.deepEqual(p08eBatch03Derivation.items, [...p08eBatch03Items]);
assert.deepEqual(p08eBatch03Derivation.roles, Object.keys(admitted));
assert.equal(p08eBatch03Derivation.rows.length, 4);
assert.equal(p08eBatch03Admission.status, 'PASS');
assert.equal(p08eBatch03Admission.result, 'PASS-4-of-4-static-admission');
assert.equal(p08eBatch03Admission.rows.length, 4);
for (const itemId of p08eBatch03Items) {
  for (const avatar of Object.keys(admitted) as (keyof typeof admitted)[]) {
    const expectedSkin = `public/assets/v6.4/runtime/${avatar}/${itemId}.webp`;
    const expectedSource = `qa/art-gate/attempts/20260916_p08e_batch03/reviewed-runtime-source/${avatar}/${itemId}.webp`;
    const skin = manifest.skins.find(entry => entry.skinId === itemId && entry.avatarId === avatar);
    assert(skin, `Missing P08e Batch03 skin manifest contract: ${itemId}/${avatar}`);
    assert.equal(skin.id, `${avatar}:${itemId}`);
    assertCurrentOrHistoricalBinding(skin.path, expectedSkin, itemId, avatar);
    assert.equal(skin.path.includes('/assets/v5/characters/'), false, `P08e Batch03 must not bind V5 focus skin: ${itemId}/${avatar}`);
    const row = p08eBatch03Derivation.rows.find((candidate: { itemId: string; avatarId: string }) => candidate.itemId === itemId && candidate.avatarId === avatar);
    assert(row, `Missing P08e Batch03 derivation row: ${itemId}/${avatar}`);
    assert.equal(row.runtimeSource, expectedSource);
    assert.equal(row.runtimeAsset, expectedSkin);
    assert.equal(row.byteIdenticalToRetainedV5FullSkin, true);
    assert.equal(row.geometryTransform, 'none');
    assert.equal(row.blinkCoverage, 'DEFERRED_TO_P10_M03_NOT_CLAIMED_BY_P08E');
    assert.equal(sha(row.source), row.sourceSha256);
    assert.equal(sha(row.candidate), row.candidateSha256);
    assert.equal(sha(row.runtimeSource), row.runtimeSourceSha256);
    assert.equal(sha(row.runtimeAsset), row.runtimeSha256);
    assert.equal(row.sourceSha256, row.candidateSha256);
    assert.equal(row.candidateSha256, row.runtimeSourceSha256);
    assert.equal(row.runtimeSourceSha256, row.runtimeSha256);
    assert.equal(row.staticAdmissionSummary, p08eBatch03AdmissionPath);
    assert.equal(row.staticAdmissionSummarySha256, p08eBatch03AdmissionSha256);
    const admissionRow = p08eBatch03Admission.rows.find((candidate: { itemId: string; avatarId: string }) => candidate.itemId === itemId && candidate.avatarId === avatar);
    assert(admissionRow, `Missing P08e Batch03 static admission row: ${itemId}/${avatar}`);
    assert.equal(admissionRow.decision, 'PASS');
    assert.deepEqual(Object.keys(admissionRow.reviews).sort(), ['gemma3:12b', 'gemma3:4b']);
    for (const review of Object.values(admissionRow.reviews) as Array<{ path: string; sha256: string; blockingIssues: unknown[]; checks: Record<string, string> }>) {
      assert.equal(sha(review.path), review.sha256, `P08e Batch03 static review evidence changed: ${itemId}/${avatar}`);
      assert.equal(review.blockingIssues.length, 0, `P08e Batch03 static blocker: ${itemId}/${avatar}`);
      assert(Object.values(review.checks).every(result => result === 'PASS'));
    }
  }
}
console.log('PASS: P08e Batch03 sister-bloom-outfit x 4 roles retains each role-specific V5 full-skin byte-for-byte, has dual-model static admission, V6.4 bindings and deferred blink boundary.');

// P08f Batch01 retains role-specific backpack split overlays byte-for-byte.
// The back layer must render behind the learner and the front straps/hardware in front;
// integrated outfit/cape/head-slot coexistence remains a separate Browser Runtime gate.
const p08fBatch01Items = ['trail-backpack', 'pack-rocket', 'pack-treasure'] as const;
const p08fBatch01DerivationPath = 'qa/art-gate/attempts/20260916_p08f_batch01/phase2-role-derivation.json';
const p08fBatch01AdmissionPath = 'qa/art-gate/attempts/20260916_p08f_batch01/static-admission-summary.json';
const p08fBatch01DerivationSha256 = 'b312d26a879fed92d5a4343478c22a3cc219a827550da4b0f5f2feee5162d1d7';
const p08fBatch01AdmissionSha256 = 'c2bde6fd81dda35ce78fad47a7817c1732e6cadb064ece44481bdb6521942608';
assert.equal(sha(p08fBatch01DerivationPath), p08fBatch01DerivationSha256, 'P08f Batch01 derivation evidence changed');
assert.equal(sha(p08fBatch01AdmissionPath), p08fBatch01AdmissionSha256, 'P08f Batch01 static admission evidence changed');
const p08fBatch01Derivation = JSON.parse(fs.readFileSync(p08fBatch01DerivationPath, 'utf8'));
const p08fBatch01Admission = JSON.parse(fs.readFileSync(p08fBatch01AdmissionPath, 'utf8'));
assert.equal(p08fBatch01Derivation.status, 'PASS');
assert.deepEqual(p08fBatch01Derivation.items, [...p08fBatch01Items]);
assert.deepEqual(p08fBatch01Derivation.roles, Object.keys(admitted));
assert.equal(p08fBatch01Derivation.rows.length, 12);
assert.equal(p08fBatch01Admission.status, 'PASS');
assert.equal(p08fBatch01Admission.result, 'PASS-12-of-12-static-admission');
assert.equal(p08fBatch01Admission.rows.length, 12);
for (const itemId of p08fBatch01Items) {
  const accessory = manifest.accessories.find(entry => entry.id === itemId) as { id: string; slot: string; renderer: string; supportedAvatars?: string[]; backVariants?: Record<string, string>; frontVariants?: Record<string, string> } | undefined;
  assert(accessory, `Missing P08f Batch01 manifest contract: ${itemId}`);
  assert.equal(accessory.slot, 'backpack');
  assert.equal(accessory.renderer, 'split-overlay');
  assert.deepEqual([...(accessory.supportedAvatars ?? [])].sort(), Object.keys(admitted).sort());
  assert.deepEqual(Object.keys(accessory.backVariants ?? {}).sort(), Object.keys(admitted).sort());
  assert.deepEqual(Object.keys(accessory.frontVariants ?? {}).sort(), Object.keys(admitted).sort());
  for (const avatar of Object.keys(admitted) as (keyof typeof admitted)[]) {
    const expectedBack = `public/assets/v6.4/runtime/${avatar}/${itemId}-back.webp`;
    const expectedFront = `public/assets/v6.4/runtime/${avatar}/${itemId}-front.webp`;
    const expectedSourceBack = `qa/art-gate/attempts/20260916_p08f_batch01/reviewed-runtime-source/${avatar}/${itemId}-back.webp`;
    const expectedSourceFront = `qa/art-gate/attempts/20260916_p08f_batch01/reviewed-runtime-source/${avatar}/${itemId}-front.webp`;
    assertCurrentOrHistoricalBinding(accessory.backVariants?.[avatar], expectedBack, itemId, avatar);
    assertCurrentOrHistoricalBinding(accessory.frontVariants?.[avatar], expectedFront, itemId, avatar);
    assert.equal(expectedBack.includes('/assets/v5/characters/'), false);
    assert.equal(expectedFront.includes('/assets/v5/characters/'), false);
    const row = p08fBatch01Derivation.rows.find((candidate: { itemId: string; avatarId: string }) => candidate.itemId === itemId && candidate.avatarId === avatar);
    assert(row, `Missing P08f Batch01 derivation row: ${itemId}/${avatar}`);
    assert.equal(row.renderer, 'split-overlay');
    assert.equal(row.runtimeSourceBack, expectedSourceBack);
    assert.equal(row.runtimeSourceFront, expectedSourceFront);
    assert.equal(row.runtimeBack, expectedBack);
    assert.equal(row.runtimeFront, expectedFront);
    assert.equal(row.backByteIdenticalToRetainedV5, true);
    assert.equal(row.frontByteIdenticalToRetainedV5, true);
    assert.equal(row.geometryTransform, 'none');
    assert.equal(row.layerContract, 'back behind learner; front straps/hardware in front; renderer split-overlay');
    for (const [pathKey, shaKey] of [
      ['sourceBack', 'sourceBackSha256'], ['sourceFront', 'sourceFrontSha256'],
      ['candidateBack', 'candidateBackSha256'], ['candidateFront', 'candidateFrontSha256'],
      ['runtimeSourceBack', 'runtimeSourceBackSha256'], ['runtimeSourceFront', 'runtimeSourceFrontSha256'],
      ['runtimeBack', 'runtimeBackSha256'], ['runtimeFront', 'runtimeFrontSha256'],
    ] as const) assert.equal(sha(row[pathKey]), row[shaKey], `P08f Batch01 asset drift: ${itemId}/${avatar}/${pathKey}`);
    assert.equal(row.sourceBackSha256, row.candidateBackSha256);
    assert.equal(row.candidateBackSha256, row.runtimeSourceBackSha256);
    assert.equal(row.runtimeSourceBackSha256, row.runtimeBackSha256);
    assert.equal(row.sourceFrontSha256, row.candidateFrontSha256);
    assert.equal(row.candidateFrontSha256, row.runtimeSourceFrontSha256);
    assert.equal(row.runtimeSourceFrontSha256, row.runtimeFrontSha256);
    assert.equal(row.staticAdmissionSummary, p08fBatch01AdmissionPath);
    assert.equal(row.staticAdmissionSummarySha256, p08fBatch01AdmissionSha256);
    const admissionRow = p08fBatch01Admission.rows.find((candidate: { itemId: string; avatarId: string }) => candidate.itemId === itemId && candidate.avatarId === avatar);
    assert(admissionRow, `Missing P08f Batch01 static admission row: ${itemId}/${avatar}`);
    assert.equal(admissionRow.decision, 'PASS');
    assert.deepEqual(Object.keys(admissionRow.reviews).sort(), ['gemma3:12b', 'gemma3:4b']);
    for (const review of Object.values(admissionRow.reviews) as Array<{ path: string; sha256: string; blockingIssues: unknown[]; checks: Record<string, string> }>) {
      assert.equal(sha(review.path), review.sha256, `P08f Batch01 static review evidence changed: ${itemId}/${avatar}`);
      assert.equal(review.blockingIssues.length, 0, `P08f Batch01 static blocker: ${itemId}/${avatar}`);
      assert(Object.values(review.checks).every(result => result === 'PASS'));
    }
  }
}
console.log('PASS: P08f Batch01 trail/rocket/treasure backpacks x 4 roles retain both V5 split layers byte-for-byte, have 24/24 static model verdicts and V6.4 back/front bindings.');

// P08f Batch02 retains the final three role-specific backpack split overlays byte-for-byte.
// Pin reconciliation + static admission + promoted derivation before validating the V6.4 bindings.
const p08fBatch02Items = ['pack-ocean', 'pack-legend', 'sister-comet-pack'] as const;
const p08fBatch02ReconciliationPath = 'qa/art-gate/attempts/20260916_p08f_batch02/reconciliation.json';
const p08fBatch02AdmissionPath = 'qa/art-gate/attempts/20260916_p08f_batch02/static-admission-summary.json';
const p08fBatch02DerivationPath = 'qa/art-gate/attempts/20260916_p08f_batch02/phase2-role-derivation.json';
const p08fBatch02ReconciliationSha256 = 'ea1d1420c421a5bafd6c7ff98a2c0d6244c8163538d8733b1d9f0618b5b577b2';
const p08fBatch02AdmissionSha256 = 'ae4f851693ef7dfcaf1c4ff9f2f96d3cb9b5db64aec9d51e3145975081d2d164';
const p08fBatch02DerivationSha256 = '838c8ae84483417420e91ca3aa0914e1ab0849d931f307fbb8c8ce49cdb3fafa';
assert.equal(sha(p08fBatch02ReconciliationPath), p08fBatch02ReconciliationSha256, 'P08f Batch02 reconciliation evidence changed');
assert.equal(sha(p08fBatch02AdmissionPath), p08fBatch02AdmissionSha256, 'P08f Batch02 static admission evidence changed');
assert.equal(sha(p08fBatch02DerivationPath), p08fBatch02DerivationSha256, 'P08f Batch02 derivation evidence changed');
const p08fBatch02Reconciliation = JSON.parse(fs.readFileSync(p08fBatch02ReconciliationPath, 'utf8'));
const p08fBatch02Admission = JSON.parse(fs.readFileSync(p08fBatch02AdmissionPath, 'utf8'));
const p08fBatch02Derivation = JSON.parse(fs.readFileSync(p08fBatch02DerivationPath, 'utf8'));
assert.equal(p08fBatch02Reconciliation.status, 'READY_FOR_STATIC_ADMISSION');
assert.deepEqual(p08fBatch02Reconciliation.items, [...p08fBatch02Items]);
assert.deepEqual(p08fBatch02Reconciliation.roles, Object.keys(admitted));
assert.equal(p08fBatch02Reconciliation.rows.length, 12);
assert.equal(p08fBatch02Admission.status, 'PASS');
assert.equal(p08fBatch02Admission.result, 'PASS-12-of-12-static-admission');
assert.equal(p08fBatch02Admission.rows.length, 12);
assert.equal(p08fBatch02Derivation.status, 'PASS');
assert.deepEqual(p08fBatch02Derivation.items, [...p08fBatch02Items]);
assert.deepEqual(p08fBatch02Derivation.roles, Object.keys(admitted));
assert.equal(p08fBatch02Derivation.rows.length, 12);
let p08fBatch02StaticVerdicts = 0;
for (const itemId of p08fBatch02Items) {
  const accessory = manifest.accessories.find(entry => entry.id === itemId) as { id: string; slot: string; renderer: string; supportedAvatars?: string[]; backVariants?: Record<string, string>; frontVariants?: Record<string, string> } | undefined;
  assert(accessory, `Missing P08f Batch02 manifest contract: ${itemId}`);
  assert.equal(accessory.slot, 'backpack');
  assert.equal(accessory.renderer, 'split-overlay');
  assert.deepEqual([...(accessory.supportedAvatars ?? [])].sort(), Object.keys(admitted).sort());
  assert.deepEqual(Object.keys(accessory.backVariants ?? {}).sort(), Object.keys(admitted).sort());
  assert.deepEqual(Object.keys(accessory.frontVariants ?? {}).sort(), Object.keys(admitted).sort());
  for (const avatar of Object.keys(admitted) as (keyof typeof admitted)[]) {
    const expectedBack = `public/assets/v6.4/runtime/${avatar}/${itemId}-back.webp`;
    const expectedFront = `public/assets/v6.4/runtime/${avatar}/${itemId}-front.webp`;
    const expectedRuntimeSourceBack = `qa/art-gate/attempts/20260916_p08f_batch02/reviewed-runtime-source/${avatar}/${itemId}-back.webp`;
    const expectedRuntimeSourceFront = `qa/art-gate/attempts/20260916_p08f_batch02/reviewed-runtime-source/${avatar}/${itemId}-front.webp`;
    const expectedCandidateBack = `qa/art-gate/attempts/20260916_p08f_batch02/${itemId}/${avatar}/${itemId}-back.webp`;
    const expectedCandidateFront = `qa/art-gate/attempts/20260916_p08f_batch02/${itemId}/${avatar}/${itemId}-front.webp`;
    assertCurrentOrHistoricalBinding(accessory.backVariants?.[avatar], expectedBack, itemId, avatar);
    assertCurrentOrHistoricalBinding(accessory.frontVariants?.[avatar], expectedFront, itemId, avatar);
    assert.equal(expectedBack.includes('/assets/v5/characters/'), false);
    assert.equal(expectedFront.includes('/assets/v5/characters/'), false);
    const reconciliationRow = p08fBatch02Reconciliation.rows.find((candidate: { itemId: string; avatarId: string }) => candidate.itemId === itemId && candidate.avatarId === avatar);
    assert(reconciliationRow, `Missing P08f Batch02 reconciliation row: ${itemId}/${avatar}`);
    assert.equal(reconciliationRow.candidateBack, expectedCandidateBack);
    assert.equal(reconciliationRow.candidateFront, expectedCandidateFront);
    assert.equal(reconciliationRow.byteIdenticalBack, true);
    assert.equal(reconciliationRow.byteIdenticalFront, true);
    assert.equal(sha(reconciliationRow.sourceBack), reconciliationRow.sourceBackSha256);
    assert.equal(sha(reconciliationRow.sourceFront), reconciliationRow.sourceFrontSha256);
    assert.equal(sha(reconciliationRow.candidateBack), reconciliationRow.candidateBackSha256);
    assert.equal(sha(reconciliationRow.candidateFront), reconciliationRow.candidateFrontSha256);
    assert.equal(reconciliationRow.sourceBackSha256, reconciliationRow.candidateBackSha256);
    assert.equal(reconciliationRow.sourceFrontSha256, reconciliationRow.candidateFrontSha256);
    const row = p08fBatch02Derivation.rows.find((candidate: { itemId: string; avatarId: string }) => candidate.itemId === itemId && candidate.avatarId === avatar);
    assert(row, `Missing P08f Batch02 derivation row: ${itemId}/${avatar}`);
    assert.equal(row.renderer, 'split-overlay');
    assert.equal(row.candidateBack, expectedCandidateBack);
    assert.equal(row.candidateFront, expectedCandidateFront);
    assert.equal(row.runtimeSourceBack, expectedRuntimeSourceBack);
    assert.equal(row.runtimeSourceFront, expectedRuntimeSourceFront);
    assert.equal(row.runtimeBack, expectedBack);
    assert.equal(row.runtimeFront, expectedFront);
    assert.equal(row.backByteIdenticalToRetainedV5, true);
    assert.equal(row.frontByteIdenticalToRetainedV5, true);
    assert.equal(row.geometryTransform, 'none');
    assert.equal(row.layerContract, 'back behind learner; front straps/hardware in front; renderer split-overlay');
    for (const [pathKey, shaKey] of [
      ['sourceBack', 'sourceBackSha256'], ['sourceFront', 'sourceFrontSha256'],
      ['candidateBack', 'candidateBackSha256'], ['candidateFront', 'candidateFrontSha256'],
      ['runtimeSourceBack', 'runtimeSourceBackSha256'], ['runtimeSourceFront', 'runtimeSourceFrontSha256'],
      ['runtimeBack', 'runtimeBackSha256'], ['runtimeFront', 'runtimeFrontSha256'],
    ] as const) assert.equal(sha(row[pathKey]), row[shaKey], `P08f Batch02 asset drift: ${itemId}/${avatar}/${pathKey}`);
    assert.equal(row.sourceBackSha256, row.candidateBackSha256);
    assert.equal(row.candidateBackSha256, row.runtimeSourceBackSha256);
    assert.equal(row.runtimeSourceBackSha256, row.runtimeBackSha256);
    assert.equal(row.sourceFrontSha256, row.candidateFrontSha256);
    assert.equal(row.candidateFrontSha256, row.runtimeSourceFrontSha256);
    assert.equal(row.runtimeSourceFrontSha256, row.runtimeFrontSha256);
    assert.equal(row.staticAdmissionSummary, p08fBatch02AdmissionPath);
    assert.equal(row.staticAdmissionSummarySha256, p08fBatch02AdmissionSha256);
    const admissionRow = p08fBatch02Admission.rows.find((candidate: { itemId: string; avatarId: string }) => candidate.itemId === itemId && candidate.avatarId === avatar);
    assert(admissionRow, `Missing P08f Batch02 static admission row: ${itemId}/${avatar}`);
    assert.equal(admissionRow.decision, 'PASS');
    assert.deepEqual(Object.keys(admissionRow.reviews).sort(), ['gemma3:12b', 'gemma3:4b']);
    for (const review of Object.values(admissionRow.reviews) as Array<{ path: string; sha256: string; blockingIssues: unknown[]; checks: Record<string, string> }>) {
      p08fBatch02StaticVerdicts += 1;
      assert.equal(sha(review.path), review.sha256, `P08f Batch02 static review evidence changed: ${itemId}/${avatar}`);
      assert.equal(review.blockingIssues.length, 0, `P08f Batch02 static blocker: ${itemId}/${avatar}`);
      assert(Object.values(review.checks).every(result => result === 'PASS'), `P08f Batch02 static check failed: ${itemId}/${avatar}`);
    }
  }
}
assert.equal(p08fBatch02StaticVerdicts, 24, 'P08f Batch02 must retain 24/24 static model verdicts');
console.log('PASS: P08f Batch02 ocean/legend/comet backpacks x 4 roles retain both V5 split layers through candidate/reviewed-runtime-source/V6.4 Runtime, have 24/24 static model verdicts, zero blockers and V6.4 back/front bindings.');


// P08g cape retained-art batches: pinned reconciliation/static/derivation evidence and V6.4 split-overlay bindings.
// Batch01 is validated read-only from its closed authoritative evidence; Batch02 is the current promoted scope.
const p08gCapeBatches = [
  {
    label: 'P08g Batch01',
    attempt: '20260916_p08g_batch01',
    items: ['hero-cape', 'cape-sky', 'cape-nebula'] as const,
    reconciliationSha256: 'ecb976f139b8ca5637192ed150b4ab4d96d9081509f6a1881116cb6ec66b270d',
    admissionSha256: 'ddfe643faea902a22cdd94474619e3e545169c432f3d22b0052140f896a14d56',
    derivationSha256: 'c090465561bd0b07566b63711ce919656931804d7fe5e7ebe3e205af4fc629e2',
  },
  {
    label: 'P08g Batch02',
    attempt: '20260916_p08g_batch02',
    items: ['cape-ocean', 'cape-legend', 'sister-galaxy-cape'] as const,
    reconciliationSha256: '2fd6dbd319f6c4853118b4b776aa97a12509a5ece051cff22f75f6a99e7b002a',
    admissionSha256: '218116cd6bffac541e2b457d6dc3d9a607d93e52f9d4a66a5ef2fea1995364ba',
    derivationSha256: '8f5972e85b40dc24001eeb457f26f082fd803b9c28f155f593484c7506f5cae5',
  },
] as const;

for (const batch of p08gCapeBatches) {
  const reconciliationPath = `qa/art-gate/attempts/${batch.attempt}/reconciliation.json`;
  const admissionPath = `qa/art-gate/attempts/${batch.attempt}/static-admission-summary.json`;
  const derivationPath = `qa/art-gate/attempts/${batch.attempt}/phase2-role-derivation.json`;
  assert.equal(sha(reconciliationPath), batch.reconciliationSha256, `${batch.label} reconciliation evidence changed`);
  assert.equal(sha(admissionPath), batch.admissionSha256, `${batch.label} static admission evidence changed`);
  assert.equal(sha(derivationPath), batch.derivationSha256, `${batch.label} derivation evidence changed`);
  const reconciliation = JSON.parse(fs.readFileSync(reconciliationPath, 'utf8'));
  const admission = JSON.parse(fs.readFileSync(admissionPath, 'utf8'));
  const derivation = JSON.parse(fs.readFileSync(derivationPath, 'utf8'));
  assert.equal(reconciliation.status, 'READY_FOR_STATIC_ADMISSION');
  assert.deepEqual(reconciliation.items, [...batch.items]);
  assert.deepEqual(reconciliation.roles, Object.keys(admitted));
  assert.equal(reconciliation.rows.length, 12);
  assert.equal(admission.status, 'PASS');
  assert.equal(admission.result, 'PASS-12-of-12-static-admission');
  assert.equal(admission.rows.length, 12);
  assert.equal(derivation.status, 'PASS');
  assert.deepEqual(derivation.items, [...batch.items]);
  assert.deepEqual(derivation.roles, Object.keys(admitted));
  assert.equal(derivation.rows.length, 12);
  let staticVerdicts = 0;
  for (const itemId of batch.items) {
    const accessory = manifest.accessories.find(entry => entry.id === itemId) as { id: string; slot: string; renderer: string; supportedAvatars?: string[]; backVariants?: Record<string, string>; frontVariants?: Record<string, string> } | undefined;
    assert(accessory, `Missing ${batch.label} manifest contract: ${itemId}`);
    assert.equal(accessory.slot, 'cape');
    assert.equal(accessory.renderer, 'split-overlay');
    assert.deepEqual([...(accessory.supportedAvatars ?? [])].sort(), Object.keys(admitted).sort());
    assert.deepEqual(Object.keys(accessory.backVariants ?? {}).sort(), Object.keys(admitted).sort());
    assert.deepEqual(Object.keys(accessory.frontVariants ?? {}).sort(), Object.keys(admitted).sort());
    for (const avatar of Object.keys(admitted) as (keyof typeof admitted)[]) {
      const expectedBack = `public/assets/v6.4/runtime/${avatar}/${itemId}-back.webp`;
      const expectedFront = `public/assets/v6.4/runtime/${avatar}/${itemId}-front.webp`;
      const expectedCandidateBack = `qa/art-gate/attempts/${batch.attempt}/${itemId}/${avatar}/${itemId}-back.webp`;
      const expectedCandidateFront = `qa/art-gate/attempts/${batch.attempt}/${itemId}/${avatar}/${itemId}-front.webp`;
      const expectedRuntimeSourceBack = `qa/art-gate/attempts/${batch.attempt}/reviewed-runtime-source/${avatar}/${itemId}-back.webp`;
      const expectedRuntimeSourceFront = `qa/art-gate/attempts/${batch.attempt}/reviewed-runtime-source/${avatar}/${itemId}-front.webp`;
      assertCurrentOrHistoricalBinding(accessory.backVariants?.[avatar], expectedBack, itemId, avatar);
      assertCurrentOrHistoricalBinding(accessory.frontVariants?.[avatar], expectedFront, itemId, avatar);
      const reconciliationRow = reconciliation.rows.find((candidate: { itemId: string; avatarId: string }) => candidate.itemId === itemId && candidate.avatarId === avatar);
      assert(reconciliationRow, `Missing ${batch.label} reconciliation row: ${itemId}/${avatar}`);
      assert.equal(reconciliationRow.candidateBack, expectedCandidateBack);
      assert.equal(reconciliationRow.candidateFront, expectedCandidateFront);
      assert.equal(reconciliationRow.byteIdenticalBack, true);
      assert.equal(reconciliationRow.byteIdenticalFront, true);
      assert.equal(sha(reconciliationRow.sourceBack), reconciliationRow.sourceBackSha256);
      assert.equal(sha(reconciliationRow.sourceFront), reconciliationRow.sourceFrontSha256);
      assert.equal(sha(reconciliationRow.candidateBack), reconciliationRow.candidateBackSha256);
      assert.equal(sha(reconciliationRow.candidateFront), reconciliationRow.candidateFrontSha256);
      assert.equal(reconciliationRow.sourceBackSha256, reconciliationRow.candidateBackSha256);
      assert.equal(reconciliationRow.sourceFrontSha256, reconciliationRow.candidateFrontSha256);
      if (itemId === 'sister-galaxy-cape') assert.equal(reconciliationRow.designReference, null, 'sister-galaxy-cape must use retained split-pair self-reference, not a fabricated catalog icon');
      const row = derivation.rows.find((candidate: { itemId: string; avatarId: string }) => candidate.itemId === itemId && candidate.avatarId === avatar);
      assert(row, `Missing ${batch.label} derivation row: ${itemId}/${avatar}`);
      assert.equal(row.renderer, 'split-overlay');
      assert.equal(row.candidateBack, expectedCandidateBack);
      assert.equal(row.candidateFront, expectedCandidateFront);
      assert.equal(row.runtimeSourceBack, expectedRuntimeSourceBack);
      assert.equal(row.runtimeSourceFront, expectedRuntimeSourceFront);
      assert.equal(row.runtimeBack, expectedBack);
      assert.equal(row.runtimeFront, expectedFront);
      assert.equal(row.backByteIdenticalToRetainedV5, true);
      assert.equal(row.frontByteIdenticalToRetainedV5, true);
      assert.equal(row.geometryTransform, 'none');
      assert.equal(row.layerContract, 'cape back cloth behind learner; front clasp/ties/hardware in front; renderer split-overlay');
      for (const [pathKey, shaKey] of [
        ['sourceBack', 'sourceBackSha256'], ['sourceFront', 'sourceFrontSha256'],
        ['candidateBack', 'candidateBackSha256'], ['candidateFront', 'candidateFrontSha256'],
        ['runtimeSourceBack', 'runtimeSourceBackSha256'], ['runtimeSourceFront', 'runtimeSourceFrontSha256'],
        ['runtimeBack', 'runtimeBackSha256'], ['runtimeFront', 'runtimeFrontSha256'],
      ] as const) assert.equal(sha(row[pathKey]), row[shaKey], `${batch.label} asset drift: ${itemId}/${avatar}/${pathKey}`);
      assert.equal(row.sourceBackSha256, row.candidateBackSha256);
      assert.equal(row.candidateBackSha256, row.runtimeSourceBackSha256);
      assert.equal(row.runtimeSourceBackSha256, row.runtimeBackSha256);
      assert.equal(row.sourceFrontSha256, row.candidateFrontSha256);
      assert.equal(row.candidateFrontSha256, row.runtimeSourceFrontSha256);
      assert.equal(row.runtimeSourceFrontSha256, row.runtimeFrontSha256);
      assert.equal(row.staticAdmissionSummary, admissionPath);
      assert.equal(row.staticAdmissionSummarySha256, batch.admissionSha256);
      const admissionRow = admission.rows.find((candidate: { itemId: string; avatarId: string }) => candidate.itemId === itemId && candidate.avatarId === avatar);
      assert(admissionRow, `Missing ${batch.label} static admission row: ${itemId}/${avatar}`);
      assert.equal(admissionRow.decision, 'PASS');
      assert.deepEqual(Object.keys(admissionRow.reviews).sort(), ['gemma3:12b', 'gemma3:4b']);
      for (const review of Object.values(admissionRow.reviews) as Array<{ path: string; sha256: string; blockingIssues: unknown[]; checks: Record<string, string> }>) {
        staticVerdicts += 1;
        assert.equal(sha(review.path), review.sha256, `${batch.label} static review evidence changed: ${itemId}/${avatar}`);
        assert.equal(review.blockingIssues.length, 0, `${batch.label} static blocker: ${itemId}/${avatar}`);
        assert(Object.values(review.checks).every(result => result === 'PASS'), `${batch.label} static check failed: ${itemId}/${avatar}`);
      }
    }
  }
  assert.equal(staticVerdicts, 24, `${batch.label} must retain 24/24 static model verdicts`);
  console.log(`PASS: ${batch.label} three capes x 4 roles retain both V5 split layers through candidate/reviewed-runtime-source/V6.4 Runtime with 24/24 static verdicts and zero blockers.`);
}
