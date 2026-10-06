import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import manifest from '../src/data/avatarAssetManifest.json';
import { sha } from './v64_art_contract';
const expected = {
  brother: '16ddec245f697c8c1a498ea4ee9138055192d8434749d6d29f2abf3898ac52d0',
  younger: 'a0afbff169d8ce9fe87cc01e2d9af8fb396093c5c6dd7dbd89ad42f2268e4f8e',
  sister: 'd184dc6539d2e7e74141a56acbbae2ba6c83e95a7f40275ab69c061dab87e13b',
  'younger-sister': 'dc21d8e9e2a19589db0a91862b1aa48900468aada4aa1e79ef7df25884317e15',
};
assert.deepEqual(manifest.baseDisplayVariants.map(r => r.avatarId).sort(), Object.keys(expected).sort());
for (const r of manifest.baseDisplayVariants) {
  assert.equal(r.source.path, `public/assets/v5/characters/${r.avatarId}/wardrobe/base-body.png`);
  assert.equal(r.source.sha256, expected[r.avatarId as keyof typeof expected]);
  assert.equal(sha(r.source.path), r.source.sha256);
  assert.equal(r.path, `public/assets/v6.4/avatar-display/${r.avatarId}/base-body-384.webp`);
  assert.equal(r.width, 384); assert.equal(r.height, 576); assert.equal(sha(r.path), r.sha256);
  assert.equal(sha(r.pairing.path), r.pairing.sha256);
  const pair = JSON.parse(fs.readFileSync(r.pairing.path, 'utf8'));
  assert.equal(pair.status, 'PASS_DISPLAY_DERIVATIVE');
  assert.equal(pair.sourceSha256, r.source.sha256); assert.equal(pair.deliverySha256, r.sha256);
  const small = r.smallDisplay;
  assert.equal(small.path, `public/assets/v6.4/avatar-display/${r.avatarId}/base-body-192.webp`);
  assert.equal(small.width, 192); assert.equal(small.height, 288);
  assert.equal(sha(small.path), small.sha256); assert.equal(sha(small.pairing.path), small.pairing.sha256);
  const smallPair = JSON.parse(fs.readFileSync(small.pairing.path, 'utf8'));
  assert.equal(smallPair.status, 'PASS_DISPLAY_DERIVATIVE');
  assert.equal(smallPair.sourceSha256, r.source.sha256); assert.equal(smallPair.deliverySha256, small.sha256);
  const freshSmall = spawnSync('python3', ['scripts/qa_v64_display_pair.py', r.source.path, small.path, '192'], { encoding: 'utf8' });
  assert.equal(freshSmall.status, 0, freshSmall.stdout);
  const fresh = spawnSync('python3', ['scripts/qa_v64_display_pair.py', r.source.path, r.path, '384'], { encoding: 'utf8' });
  assert.equal(fresh.status, 0, fresh.stdout);
}
console.log('PASS: eight original-body display derivatives, exact resampled alpha/RGB; no new wardrobe Art acceptance.');
