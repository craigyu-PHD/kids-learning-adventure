import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

// Retention is limited to these reviewed, unchanged assets in the known baseline.
// It is source continuity evidence, never a claim about an unavailable generation log.
const BASELINE = '51ff808af4389dbe4f25c88aebb7f87e78aa073b';
const HASHES: Record<string, string> = {
  'room-starlab': '2a81929574552cc76294191f7b1b66979c6dc9f1d51f1c8b08f46636e375a27c',
  'room-ocean': '12f0b5dc2533e3ba8569a9729621a09ccec2c625e8314030313982e90ffa7d74',
  'room-legend': '0820f4051e2077c849dda243a670ff2e2a9c03a90590265ff249dc8dbb66f924',
};
const ROOT = path.resolve(import.meta.dirname, '..');
const digest = (bytes: Buffer) => crypto.createHash('sha256').update(bytes).digest('hex');
export function validRetainedWorldSource(trace: any, itemId: string, slot: string, sourceSha256: string) {
  const original = `public/assets/v5/scenes/${itemId}-v2.png`;
  if (slot !== 'room' || !Object.hasOwn(HASHES, itemId) || sourceSha256 !== HASHES[itemId]
    || trace?.origin !== 'retained-baseline' || trace.itemId !== itemId || trace.slot !== slot
    || trace.baselineCommit !== BASELINE || trace.original?.path !== original
    || trace.original.sha256 !== sourceSha256 || trace.generationMetadata !== 'not available'
    || trace.status !== 'PASS_SOURCE_CONTINUITY') return false;
  try {
    if (digest(fs.readFileSync(path.join(ROOT, original))) !== sourceSha256) return false;
    const baseline = spawnSync('git', ['show', `${BASELINE}:${original}`], { cwd: ROOT, timeout: 15000, maxBuffer: 16 * 1024 * 1024 });
    if (baseline.status !== 0 || digest(baseline.stdout) !== sourceSha256) return false;
    const blob = crypto.createHash('sha1').update(Buffer.from(`blob ${baseline.stdout.length}\0`)).update(baseline.stdout).digest('hex');
    return trace.gitBlobSha1 === blob;
  } catch { return false; }
}
