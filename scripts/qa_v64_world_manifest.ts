import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import manifest from '../src/data/worldArtManifest.json';
import { validRetainedWorldSource } from './v64_retained_world_source';
import { cosmetics } from '../src/cosmetics';
import { sha, validNativeUiTrace, validScore, SCORE_KEYS } from './v64_art_contract';

assert.equal(manifest.schemaVersion, 1);
assert.equal(new Set(manifest.records.map(r => r.itemId)).size, manifest.records.length);
const cardCodecKeys: string[] = [];
function read(link: { path: string; sha256: string }) {
  assert.equal(sha(link.path), link.sha256, `Artifact changed: ${link.path}`);
  return JSON.parse(fs.readFileSync(link.path, 'utf8'));
}
for (const record of manifest.records) {
  assert(cosmetics.some(i => i.id === record.itemId && i.slot === record.slot));
  assert.equal(record.source.path, `public/assets/v6.4/world-source/${record.slot}/${record.itemId}.png`);
  assert.equal(record.delivery.path, `public/assets/v6.4/world/${record.slot}/${record.itemId}.webp`);
  assert.equal(sha(record.source.path), record.source.sha256);
  assert.equal(sha(record.delivery.path), record.delivery.sha256);
  const review = read(record.pngReview), pair = read(record.pairing);
  assert.equal(review.status, 'PASS');
  assert.equal(review.itemId, record.itemId);
  assert.equal(review.avatarId, null);
  assert.equal(review.sourceSha256, record.source.sha256);
  assert.equal(review.semanticsVersion, 'v64-world-art-semantics-v1');
  assert.equal(review.reviewer?.canViewImages, true);
  for (const key of SCORE_KEYS) {
    assert(validScore(review.scores?.[key], key === 'overallPolish'), key);
    assert(typeof review.reasons?.[key] === 'string' && review.reasons[key].trim(), key);
  }
  assert.equal(pair.status, 'PASS');
  assert.equal(pair.sourceSha256, record.source.sha256);
  assert.equal(pair.deliverySha256, record.delivery.sha256);
  if ('retentionEvidence' in record && record.retentionEvidence) {
    assert(!record.generationTrace, 'Retained art must not claim a new generation trace');
    assert(validRetainedWorldSource(read(record.retentionEvidence), record.itemId, record.slot, record.source.sha256));
  } else {
    assert(record.generationTrace);
    const trace = read(record.generationTrace);
    assert(validNativeUiTrace({ inputs: trace.inputs, prompt: { sha256: trace.promptSha256 }, rawOutput: { sha256: record.source.sha256 } }, trace));
    const promptPath = record.generationTrace.path.replace(/native-ui-execution\.json$/, 'prompt.txt');
    assert.equal(sha(promptPath), trace.promptSha256);
    for (const input of trace.inputs) assert.equal(sha(input.path), input.sha256);
  }
  if ('displayVariants' in record && record.displayVariants) {
    assert.deepEqual(record.displayVariants.map(v => v.width), [384, 768]);
    for (const variant of record.displayVariants) {
      assert.equal(variant.path, `public/assets/v6.4/world-display/${record.slot}/${record.itemId}-${variant.width}.webp`);
      assert.equal(sha(variant.path), variant.sha256);
      const displayPair = read(variant.pairing);
      assert.equal(displayPair.status, 'PASS_DISPLAY_DERIVATIVE');
      assert.equal(displayPair.sourceSha256, record.source.sha256);
      assert.equal(displayPair.deliverySha256, variant.sha256);
      assert.deepEqual(displayPair.size, [variant.width, variant.height]);
      const verify: { status: number | null; stdout: string } = spawnSync('python3', ['scripts/qa_v64_display_pair.py', record.source.path, variant.path, String(variant.width)], { encoding: 'utf8' });
      assert.equal(verify.status, 0, verify.stdout);
      if ('alternateDelivery' in variant && variant.alternateDelivery) {
        cardCodecKeys.push(`${record.itemId}:${variant.width}`);
        const alternate = variant.alternateDelivery;
        assert.equal(record.slot, 'card');
        assert.equal(alternate.format, 'avif');
        assert.equal(alternate.path, `public/assets/v6.4/world-display/card/${record.itemId}-${variant.width}.avif`);
        assert.equal(sha(alternate.path), alternate.sha256);
        assert.deepEqual([alternate.width, alternate.height], [variant.width, variant.height]);
        const codecPair = read(alternate.pairing);
        assert.equal(codecPair.status, 'PASS_OPTIONAL_CARD_DISPLAY_CODEC');
        assert.equal(codecPair.sourceSha256, record.source.sha256);
        assert.equal(codecPair.deliverySha256, alternate.sha256);
        assert.deepEqual(codecPair.size, [variant.width, variant.height]);
        const codecVerify: { status: number | null; stdout: string } = spawnSync('python3', ['scripts/qa_v64_card_avif_pair.py', record.source.path, alternate.path, String(variant.width)], { encoding: 'utf8' });
        assert.equal(codecVerify.status, 0, codecVerify.stdout);
      }
    }
  }
  if ('alternateDelivery' in record && record.alternateDelivery) {
    const alternate = record.alternateDelivery;
    assert.equal(record.slot, 'room');
    assert.equal(alternate.format, 'avif');
    assert.equal(alternate.path, `public/assets/v6.4/world/room/${record.itemId}.avif`);
    assert.equal(sha(alternate.path), alternate.sha256);
    const codecPair = read(alternate.pairing);
    assert.equal(codecPair.status, 'PASS_OPTIONAL_ROOM_CODEC');
    assert.equal(codecPair.sourceSha256, record.source.sha256);
    assert.equal(codecPair.deliverySha256, alternate.sha256);
    assert.deepEqual(codecPair.size, [alternate.width, alternate.height]);
    const verify = spawnSync('python3', ['scripts/qa_v64_room_avif_pair.py', record.source.path, alternate.path], { encoding: 'utf8' });
    assert.equal(verify.status, 0, verify.stdout);
  }
  const fresh = spawnSync('python3', ['scripts/qa_v64_image_pair.py', record.source.path, record.delivery.path], { encoding: 'utf8' });
  assert.equal(fresh.status, 0, fresh.stdout);
  if ('blink' in record && record.blink) {
    const blink = record.blink;
    assert.equal(record.slot, 'robot');
    assert.equal(blink.referenceSha256, record.source.sha256);
    assert.equal(blink.source.path, `public/assets/v6.4/world-motion-source/robot/${record.itemId}-blink.png`);
    assert.equal(blink.delivery.path, `public/assets/v6.4/world-motion/robot/${record.itemId}-blink.webp`);
    assert.equal(sha(blink.source.path), blink.source.sha256);
    assert.equal(sha(blink.delivery.path), blink.delivery.sha256);
    if ('derivation' in blink && blink.derivation) {
      const derivation = blink.derivation;
      assert.equal(derivation.method, 'reviewed-robot-sky-native-open-to-blink-eye-delta-on-approved-same-rig');
      assert.deepEqual(derivation.referenceBlinkSource, manifest.records.find(r => r.itemId === 'robot-sky')?.blink?.source);
      assert.equal(derivation.metrics.alphaExact, true);
      assert.equal(derivation.metrics.outsideMaskChangedPixels, 0);
      assert(derivation.metrics.changedPixels > 0);
      const eligibility = read(derivation.eligibility);
      const candidateManifest = read(derivation.candidateManifest);
      const visualAdmission = read(derivation.visualAdmission);
      assert.equal(eligibility.status, 'PASS');
      assert.equal(eligibility.passRows, 30);
      assert.equal(eligibility.verdictCount, 60);
      assert.equal(candidateManifest.status, 'CANDIDATES_READY_FOR_VISUAL_REVIEW');
      assert.equal(candidateManifest.records.length, 30);
      assert.equal(visualAdmission.status, 'PASS');
      assert.equal(visualAdmission.passRows, 30);
      assert.equal(visualAdmission.verdictCount, 60);
      assert.equal(sha(derivation.sourceCandidate.path), derivation.sourceCandidate.sha256);
      assert.equal(derivation.sourceCandidate.sha256, blink.source.sha256);
      assert.deepEqual(fs.readFileSync(derivation.sourceCandidate.path), fs.readFileSync(blink.source.path));
    } else {
      const blinkReview = read(blink.pngReview), blinkPair = read(blink.pairing), trace = read(blink.generationTrace);
      assert.equal(blinkReview.status, 'PASS');
      assert.equal(blinkReview.itemId, record.itemId);
      assert.equal(blinkReview.sourceSha256, blink.source.sha256);
      assert.equal(blinkReview.referenceSha256, record.source.sha256);
      assert.equal(blinkReview.reviewer?.canViewImages, true);
      for (const key of SCORE_KEYS) {
        assert(validScore(blinkReview.scores?.[key], key === 'overallPolish'));
        assert(typeof blinkReview.reasons?.[key] === 'string' && blinkReview.reasons[key].trim());
      }
      assert.equal(blinkPair.status, 'PASS');
      assert.equal(blinkPair.sourceSha256, blink.source.sha256);
      assert.equal(blinkPair.deliverySha256, blink.delivery.sha256);
      assert(validNativeUiTrace({inputs:trace.inputs,prompt:{sha256:trace.promptSha256},rawOutput:{sha256:blink.source.sha256}},trace));
      assert(trace.inputs.some((i:{sha256:string})=>i.sha256===record.source.sha256));
      for (const input of trace.inputs) assert.equal(sha(input.path), input.sha256);
      assert.equal(sha(blink.generationTrace.path.replace(/native-ui-execution\.json$/, 'prompt.txt')),trace.promptSha256);
    }
    const decoded = spawnSync('python3',['scripts/qa_v64_image_pair.py',blink.source.path,blink.delivery.path],{encoding:'utf8'});
    assert.equal(decoded.status,0,decoded.stdout);
    const blinkGeometry = spawnSync('python3',['qa/art-gate/inspect-robot-blink.py',record.source.path,blink.source.path],{encoding:'utf8'});
    assert.equal(blinkGeometry.status,0,blinkGeometry.stdout);
    assert.deepEqual(blink.displayVariants.map(v=>v.width),[384,768]);
    for (const variant of blink.displayVariants) {
      assert.equal(variant.path,`public/assets/v6.4/world-motion/robot/${record.itemId}-blink-${variant.width}.webp`);
      assert.equal(sha(variant.path),variant.sha256);
      if ('pairing' in variant && variant.pairing) {
        const pair = read(variant.pairing);
        assert.equal(pair.status,'PASS_DISPLAY_DERIVATIVE');
        assert.equal(pair.sourceSha256,blink.source.sha256);
        assert.equal(pair.deliverySha256,variant.sha256);
      } else {
        assert('derivation' in blink && blink.derivation, 'Only reviewed P10 derived blink variants may omit legacy pairing JSON');
      }
      const result = spawnSync('python3',['scripts/qa_v64_display_pair.py',blink.source.path,variant.path,String(variant.width)],{encoding:'utf8'});
      assert.equal(result.status,0,result.stdout);
    }
  }
}
assert.deepEqual(cardCodecKeys.sort(), ['card-legend:384', 'card-legend:768', 'card-nebula:384', 'card-nebula:768', 'card-sky:384', 'card-sky:768']);
console.log(JSON.stringify({ status: 'PASS_IMAGE_LINEAGE_ONLY', count: manifest.records.length, releaseAcceptance: 'PENDING', note: 'Partial local World art integration; does not accept full Art, current UI regression, or production.' }));
