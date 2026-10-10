import assert from 'node:assert/strict';
import fs from 'node:fs';
import { artifact, expectedRecords, MATRIX, sha, validateMatrix } from './v64_art_contract';
import manifest from '../src/data/avatarHeroManifest.json';

assert.equal(manifest.schemaVersion,1);
assert.ok(Array.isArray(manifest.records));
if (manifest.records.length===0) {
  assert.equal(manifest.acceptanceMatrixSha256,null);
  assert.equal(manifest.artDirectionEvidence,null);
  console.log(JSON.stringify({status:'PASS_EMPTY_READINESS_ONLY',acceptedHeroCount:0,note:'No art is accepted or activated'}));
} else {
  const matrix=JSON.parse(fs.readFileSync(MATRIX,'utf8'));
  assert.equal(manifest.acceptanceMatrixSha256,sha(MATRIX),'Hero manifest must bind the current acceptance matrix');
  const gate=validateMatrix(matrix,'local');
  assert.equal(gate.status,'PASS',gate.failures.slice(0,8).join('\n'));
  const direction:any=manifest.artDirectionEvidence;
  assert.ok(direction?.path && direction.sha256 && sha(direction.path)===direction.sha256,'Author direction evidence required');
  const approval=JSON.parse(fs.readFileSync(direction.path,'utf8'));
  assert.equal(approval.status,'APPROVED');
  assert.equal(approval.confirmedBy,'user');
  assert.equal(approval.avatarId,'brother');
  assert.equal(approval.itemId,'starter-sun-cap');
  const gold=matrix.records.find((r:any)=>r.avatarId==='brother' && r.itemId==='starter-sun-cap');
  assert.equal(approval.sourceSha256,gold.sourceSha256,'Approval must match the actual Gold Sample');
  assert.ok(typeof approval.confirmationText==='string' && approval.confirmationText.trim(),'Record the actual user confirmation');
  assert.ok(typeof approval.createdAt==='string' && Number.isFinite(Date.parse(approval.createdAt)));
  const expected=expectedRecords();
  assert.equal(manifest.records.length,expected.length,'Release manifest requires all 192 locally accepted wearable records; Pilot remains QA-only');
  const keys=new Set<string>();
  for(const r of manifest.records as any[]) {
    const key=`${r.avatarId}:${r.itemId}`;
    assert.ok(!keys.has(key),'Duplicate Hero');keys.add(key);
    const a=matrix.records.find((x:any)=>x.avatarId===r.avatarId && x.itemId===r.itemId);
    assert.ok(a && expected.some(e=>e.avatarId===r.avatarId && e.itemId===r.itemId),'Unknown Hero');
    assert.equal(r.path,a.delivery.replace(/^public\//,''));
    assert.equal(r.sourceSha256,a.sourceSha256);assert.equal(r.deliverySha256,a.deliverySha256);
    assert.equal(artifact(`public/${r.path}`).sha256,r.deliverySha256);
  }
  console.log(JSON.stringify({status:'PASS_LOCAL_ACTIVATION',acceptedHeroCount:keys.size,productionUrlPass:'PENDING'}));
}
