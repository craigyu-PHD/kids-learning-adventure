import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { sha } from './v64_art_contract';
import logo from '../qa/art-gate/brand-display/manifest.json';
import weekly from '../qa/art-gate/weekly-poster-delivery/manifest.json';

// Fixed expected set: a shortened manifest cannot silently omit a delivery.
assert.equal(logo.source, 'public/assets/v5/brand/little-explorers-logo-v2.png');
assert.equal(weekly.source, 'public/assets/v5/brand/weekly-rocket-robot.png');
assert.deepEqual(logo.variants.map(v => v.width), [384, 768]);
const records = [
  ...logo.variants.map(v => ({ source: logo.source, sourceSha: logo.sourceSha256,
    path: v.path, hash: v.sha256, width: v.width, pairing: v.pairing,
    expectedPath: `public/assets/v6.4/brand-display/little-explorers-logo-v2-${v.width}.webp` })),
  { source: weekly.source, sourceSha: weekly.sourceSha256, path: weekly.display,
    hash: weekly.displaySha256, width: 384, pairing: 'qa/art-gate/weekly-poster-delivery/pair.json',
    expectedPath: 'public/assets/v6.4/brand-display/weekly-rocket-robot-384.webp' },
];
assert.equal(new Set(records.map(r => r.path)).size, 3);
for (const r of records) {
  assert.equal(r.path, r.expectedPath);
  assert.equal(sha(r.source), r.sourceSha);
  assert.equal(sha(r.path), r.hash);
  const previous = JSON.parse(fs.readFileSync(r.pairing, 'utf8'));
  assert.equal(previous.status, 'PASS_DISPLAY_DERIVATIVE');
  assert.equal(previous.sourceSha256, r.sourceSha);
  assert.equal(previous.deliverySha256, r.hash);
  const fresh = spawnSync('python3', ['scripts/qa_v64_display_pair.py', r.source, r.path, String(r.width)], { encoding: 'utf8' });
  assert.equal(fresh.status, 0, fresh.stdout);
}
console.log('PASS: 3 exact brand display derivatives; does not accept new art or release.');

// Retained WebP sources have their own narrow contract; do not relax PNG rules above.
const caregivers = spawnSync('python3', ['scripts/qa_v64_caregiver_display.py'], { encoding: 'utf8' });
assert.equal(caregivers.status, 0, caregivers.stdout);
console.log(caregivers.stdout.trim());
