import assert from 'node:assert/strict';
import fs from 'node:fs';
import manifest from '../src/data/worldArtManifest.json';
import { validRetainedWorldSource } from './v64_retained_world_source';
let count = 0;
for (const record of manifest.records) {
  if (!('retentionEvidence' in record) || !record.retentionEvidence) continue;
  const trace = JSON.parse(fs.readFileSync(record.retentionEvidence.path, 'utf8'));
  const valid = (t = trace, item = record.itemId, slot = record.slot, hash = record.source.sha256) => validRetainedWorldSource(t, item, slot, hash);
  assert(valid()); count++;
  for (const mutation of [
    { baselineCommit: '0'.repeat(40) }, { gitBlobSha1: '0'.repeat(40) },
    { itemId: 'ship-scout' }, { original: { ...trace.original, path: '../base.png' } },
    { original: { ...trace.original, sha256: '0'.repeat(64) } },
    { origin: 'image-editor' }, { generationMetadata: 'invented model' },
  ]) { assert(!valid({ ...trace, ...mutation })); count++; }
  assert(!valid(trace, record.itemId, 'hat')); count++;
  assert(!valid(trace, 'starter-sun-cap')); count++;
  assert(!valid(trace, record.itemId, record.slot, '0'.repeat(64))); count++;
}
assert.equal(count, 33);
console.log(JSON.stringify({ status: 'PASS', checks: count, scope: 'Retained baseline identity/path/hash/commit rejection controls' }));
