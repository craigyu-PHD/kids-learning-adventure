import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const MATRIX = path.join(ROOT, 'qa', 'visual-audit', '2026-09-02-v64', 'art-acceptance.json');
const MIN = 8;
const OVERALL = 8.5;

function exists(rel: string | null | undefined) {
  return Boolean(rel && fs.existsSync(path.join(ROOT, rel)));
}

if (!fs.existsSync(MATRIX)) {
  console.error('FAIL qa_v64_art_acceptance: matrix missing; run npm run qa:v64:art-matrix');
  process.exit(1);
}

const matrix = JSON.parse(fs.readFileSync(MATRIX, 'utf8'));
const failures: string[] = [];
const scoreKeys = [
  'characterIdentity','anatomy','equipmentAlignment','lightingConsistency','materialQuality',
  'occlusion','visualAppeal','childAppeal','rarityReadability','overallPolish',
];

if (matrix.records?.length !== 192) failures.push(`wearable matrix must be 192 records, got ${matrix.records?.length ?? 0}`);
for (const record of matrix.records ?? []) {
  const key = `${record.itemId}:${record.avatarId}`;
  if (!exists(record.masterReference)) failures.push(`${key} original master reference missing`);
  if (!exists(record.heroComposite)) failures.push(`${key} Image Generation Hero Composite missing`);
  if (!record.runtimeLayer || !exists(record.runtimeLayer)) failures.push(`${key} runtime layer missing`);
  if (!record.imageGenerationEvidence) failures.push(`${key} image-generation evidence missing`);
  for (const scoreKey of scoreKeys) {
    const value = record.visualScores?.[scoreKey];
    const required = scoreKey === 'overallPolish' ? OVERALL : MIN;
    if (typeof value !== 'number' || value < required) failures.push(`${key} ${scoreKey}=${String(value)} < ${required}`);
  }
  if (record.previewPass !== true) failures.push(`${key} preview not visually accepted`);
  if (record.combinationPass !== true) failures.push(`${key} combination not visually accepted`);
  if (record.productionUrlPass !== true) failures.push(`${key} production URL not accepted`);
  if (record.status !== 'PASS') failures.push(`${key} status=${record.status}`);
}

for (const record of matrix.worldRecords ?? []) {
  const key = record.itemId;
  if (!exists(record.heroArt)) failures.push(`${key} Image Generation world Hero Art missing`);
  if (!record.imageGenerationEvidence) failures.push(`${key} image-generation evidence missing`);
  for (const scoreKey of scoreKeys) {
    const value = record.visualScores?.[scoreKey];
    const required = scoreKey === 'overallPolish' ? OVERALL : MIN;
    if (typeof value !== 'number' || value < required) failures.push(`${key} ${scoreKey}=${String(value)} < ${required}`);
  }
  if (record.previewPass !== true) failures.push(`${key} preview not visually accepted`);
  if (record.productionUrlPass !== true) failures.push(`${key} production URL not accepted`);
  if (record.status !== 'PASS') failures.push(`${key} status=${record.status}`);
}

if (failures.length) {
  console.error(JSON.stringify({
    status: 'FAIL',
    wearableRecords: matrix.records?.length ?? 0,
    worldRecords: matrix.worldRecords?.length ?? 0,
    failureCount: failures.length,
    firstFailures: failures.slice(0, 40),
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'PASS',
  wearableRecords: matrix.records.length,
  worldRecords: matrix.worldRecords.length,
  visualMinimum: MIN,
  overallMinimum: OVERALL,
}, null, 2));
