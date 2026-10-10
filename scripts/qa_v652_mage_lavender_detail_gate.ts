import assert from 'node:assert/strict';
import fs from 'node:fs';
// @ts-ignore Node's built-in type stripping needs the explicit extension for this standalone test.
import { assertV652MageLavenderAdmissionSet, sha256MageLavenderFile } from './v652_mage_lavender_detail_gate.ts';

type Manifest = { accessories: Record<string, unknown>[] };
// The negative fixture must remain pre-activation after the live manifest changes.
const old = JSON.parse(fs.readFileSync(
  'qa/v652/root/20260926-resume/manifest-before.json', 'utf8')) as Manifest;
const proposed = JSON.parse(fs.readFileSync(
  'qa/v652/root/20260926-resume/manifest-proposed.json', 'utf8')) as Manifest;
const inventory = JSON.parse(fs.readFileSync(
  'qa/v652/sol/20260926-hats-integration-r1/inventory.json', 'utf8')) as {
  pairs: { overlay: { path: string; sha256: string }; mask: { path: string; sha256: string };
    proposedPublic: { overlay: string; mask: string } }[];
  catalogs: { source: { sha256: string }; proposedPublic: string }[];
};
const targetHashes = new Map<string, string>();
for (const row of inventory.pairs) {
  targetHashes.set(row.proposedPublic.overlay, row.overlay.sha256);
  targetHashes.set(row.proposedPublic.mask, row.mask.sha256);
}
for (const row of inventory.catalogs) targetHashes.set(row.proposedPublic, row.source.sha256);
assert.equal(targetHashes.size, 114);
const fixtureHash = (relative: string) => relative.startsWith('public/assets/v6.5.2/')
  ? targetHashes.get(relative) : sha256MageLavenderFile(relative);
const options = { hashFile: fixtureHash };
let checks = 0;
function pass(label: string, action: () => void) { action(); checks++; console.log(`PASS ${label}`); }
function reject(label: string, action: () => void, pattern: RegExp) {
  assert.throws(action, pattern, label); checks++; console.log(`PASS rejects ${label}`);
}
function entry(manifest: Manifest, id: string) {
  const value = manifest.accessories.find(row => row.id === id);
  assert(value);
  return value;
}
pass('old manifest has zero admitted details', () => {
  assert.equal(assertV652MageLavenderAdmissionSet(old.accessories).detailCount, 0);
});
pass('proposal has exact 56 details and two catalogs', () => {
  assert.equal(assertV652MageLavenderAdmissionSet(proposed.accessories, options).detailCount, 56);
});
const onlyOne = structuredClone(proposed);
Object.assign(entry(onlyOne, 'sister-lavender-hat'), entry(old, 'sister-lavender-hat'));
delete entry(onlyOne, 'sister-lavender-hat').defaultSkinDetails;
delete entry(onlyOne, 'sister-lavender-hat').skinDetails;
delete entry(onlyOne, 'sister-lavender-hat').catalogPath;
reject('one hat admitted alone', () => assertV652MageLavenderAdmissionSet(onlyOne.accessories, options),
  /both be absent or both/);
const missingCatalog = structuredClone(proposed);
delete entry(missingCatalog, 'hat-mage').catalogPath;
reject('missing catalog', () => assertV652MageLavenderAdmissionSet(missingCatalog.accessories, options),
  /catalog admission mismatch/);
const missingPair = structuredClone(proposed);
delete (entry(missingPair, 'hat-mage').skinDetails as Record<string, Record<string, unknown>>).brother['outfit-cadet'];
reject('missing skin pair', () => assertV652MageLavenderAdmissionSet(missingPair.accessories, options),
  /skin detail admission mismatch/);
const wrongRole = structuredClone(proposed);
const mage = entry(wrongRole, 'hat-mage');
const details = mage.defaultSkinDetails as Record<string, Record<string, string>>;
details.sister.hairVisibilityMask = details.brother.hairVisibilityMask;
reject('wrong avatar mask', () => assertV652MageLavenderAdmissionSet(wrongRole.accessories, options),
  /base detail admission mismatch/);
const racer = structuredClone(proposed);
(entry(racer, 'hat-mage').skinDetails as Record<string, Record<string, unknown>>).brother['outfit-racer'] =
  (entry(racer, 'hat-mage').skinDetails as Record<string, Record<string, unknown>>).brother['outfit-cadet'];
reject('Racer detail leak', () => assertV652MageLavenderAdmissionSet(racer.accessories, options),
  /skin detail admission mismatch|Racer/);
const oldLegend = structuredClone(proposed);
(entry(oldLegend, 'sister-lavender-hat').skinDetails as Record<string, Record<string, unknown>>).younger['outfit-legend'] =
  (entry(oldLegend, 'sister-lavender-hat').skinDetails as Record<string, Record<string, unknown>>).younger['outfit-cadet'];
reject('wrong Lavender younger Legend mapping',
  () => assertV652MageLavenderAdmissionSet(oldLegend.accessories, options),
  /skin detail admission mismatch/);
const legendR2 = inventory.pairs.find(row => row.proposedPublic.overlay.endsWith(
  '/younger/sister-lavender-hat--outfit-legend--detail.png'));
assert(legendR2);
reject('Lavender younger Legend R1 bytes at accepted R2 target',
  () => assertV652MageLavenderAdmissionSet(proposed.accessories, {
    hashFile: relative => relative === legendR2.proposedPublic.overlay
      ? 'f9fee5f169aec80589946eda09c8302c534f766f383e23fda7885e61f55ba270'
      : fixtureHash(relative),
  }), /hash drift/);
reject('inventory hash drift', () => assertV652MageLavenderAdmissionSet(proposed.accessories, {
  hashFile: relative => relative.endsWith('/inventory.json') ? '0'.repeat(64) : fixtureHash(relative),
}), /inventory drift/);
reject('source hash drift', () => assertV652MageLavenderAdmissionSet(proposed.accessories, {
  hashFile: relative => relative === inventory.pairs[0].overlay.path
    ? '0'.repeat(64) : fixtureHash(relative),
}), /hash drift/);
reject('public target hash drift', () => assertV652MageLavenderAdmissionSet(proposed.accessories, {
  hashFile: relative => relative === inventory.pairs[0].proposedPublic.overlay
    ? '0'.repeat(64) : fixtureHash(relative),
}), /hash drift/);
console.log(JSON.stringify({ status: 'PASS', checks, exactPairs: 56, exactPublicFiles: 114,
  publicHashes: 'fixture injection only; live files are checked by the original runtime gate' }));
