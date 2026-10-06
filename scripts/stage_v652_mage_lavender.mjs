#!/usr/bin/env node
// QA-only preparation for the previously accepted Mage and Lavender hat pairs.
// This tool cannot write to src/ or public/. Integration remains a separate review step.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INVENTORY = 'qa/v652/sol/20260926-hats-integration-r1/inventory.json';
const DELIVERY = 'qa/v652/sol/20260926-hats-integration-r1/';
const AVATARS = ['brother', 'younger', 'sister', 'younger-sister'];
const SKINS = ['base', 'outfit-cadet', 'outfit-legend', 'outfit-mage',
  'sister-bloom-outfit', 'outfit-mecha', 'outfit-ocean'];
const ITEMS = ['hat-mage', 'sister-lavender-hat'];
const SHA = /^[0-9a-f]{64}$/;

function local(relative) {
  assert(typeof relative === 'string' && !path.isAbsolute(relative));
  const full = path.resolve(ROOT, relative);
  assert(full.startsWith(`${ROOT}${path.sep}`), `path escapes repository: ${relative}`);
  return full;
}
function digest(relative) {
  return crypto.createHash('sha256').update(fs.readFileSync(local(relative))).digest('hex');
}
function exact(link, prefix) {
  assert(link && typeof link.path === 'string' && link.path.startsWith(prefix));
  assert.match(link.sha256, SHA);
  assert.equal(digest(link.path), link.sha256, `SHA drift: ${link.path}`);
}
function expected(row, kind) {
  const stem = `${DELIVERY}${row.itemId}/${row.avatarId}/${row.skinId}/`;
  return stem + (kind === 'overlay' ? 'overlay.png' : 'hair-visibility-mask.png');
}
function validate(inv, checkEvidence = true, checkImages = false) {
  assert.equal(inv.schemaVersion, 'v652-mage-lavender-qa-delivery-r1');
  assert.equal(inv.status, 'QA_ONLY_PENDING_INDEPENDENT_INTEGRATION_AUDIT');
  assert.deepEqual(inv.avatars, AVATARS);
  assert.deepEqual(inv.skins, SKINS);
  assert.deepEqual(inv.excluded, ['outfit-racer', 'Lavender younger outfit-legend R1']);
  assert.equal(inv.pairs.length, 56);
  assert.equal(inv.catalogs.length, 2);
  const identities = new Set();
  const targets = new Set();
  for (const row of inv.pairs) {
    assert(ITEMS.includes(row.itemId));
    assert(AVATARS.includes(row.avatarId));
    assert(SKINS.includes(row.skinId));
    const id = `${row.itemId}:${row.avatarId}:${row.skinId}`;
    assert(!identities.has(id), `duplicate pair: ${id}`);
    identities.add(id);
    for (const kind of ['overlay', 'mask']) {
      const source = row[kind];
      assert(source.path.startsWith('qa/v652/') && source.path.endsWith('.png'));
      assert.match(source.sha256, SHA);
      assert.equal(row.qaDelivery[kind], expected(row, kind));
      assert(!targets.has(row.qaDelivery[kind]), 'duplicate delivery target');
      targets.add(row.qaDelivery[kind]);
      if (checkImages) exact(source, 'qa/v652/');
    }
    const suffix = row.skinId === 'base' ? '' : `--${row.skinId}`;
    assert.equal(row.proposedPublic.overlay,
      `public/assets/v6.5.2/runtime/${row.avatarId}/${row.itemId}${suffix}--detail.png`);
    assert.equal(row.proposedPublic.mask,
      `public/assets/v6.5.2/runtime-masks/${row.avatarId}/${row.itemId}${suffix}--hair-visibility-mask.png`);
    for (const kind of ['sourceReport', 'acceptedReview']) {
      assert(row[kind].path.startsWith('qa/v652/'));
      assert.match(row[kind].sha256, SHA);
      if (checkEvidence) exact(row[kind], 'qa/v652/');
    }
    // An accepted R1 must never replace the independent younger Legend R2.
    if (row.itemId === 'sister-lavender-hat' && row.avatarId === 'younger'
        && row.skinId === 'outfit-legend') {
      assert(row.overlay.path.includes('/lavender-younger-legend-r2/'));
      assert(row.mask.path.includes('/lavender-younger-legend-r2/'));
      assert(row.acceptedReview.path.endsWith('/lavender-younger-legend-r2-review.md'));
    }
  }
  for (const item of ITEMS) for (const avatar of AVATARS) for (const skin of SKINS) {
    assert(identities.has(`${item}:${avatar}:${skin}`), `missing ${item}:${avatar}:${skin}`);
  }
  for (const row of inv.catalogs) {
    assert(ITEMS.includes(row.itemId));
    assert.equal(row.qaDelivery, `${DELIVERY}${row.itemId}/catalog.webp`);
    assert.equal(row.proposedPublic, `public/assets/v6.5.2/catalog/hats/${row.itemId}.webp`);
    assert(!targets.has(row.qaDelivery));
    targets.add(row.qaDelivery);
    assert(row.source.path.startsWith('qa/v652/') && row.source.path.endsWith('.webp'));
    assert.match(row.source.sha256, SHA);
    if (checkEvidence) exact(row.acceptedReview, 'qa/v652/');
    if (checkImages) exact(row.source, 'qa/v652/');
  }
  assert.equal(targets.size, 114);
  return targets;
}
function files(inv) {
  return [
    ...inv.pairs.flatMap(row => ['overlay', 'mask'].map(kind =>
      ({ source: row[kind], target: row.qaDelivery[kind] }))),
    ...inv.catalogs.map(row => ({ source: row.source, target: row.qaDelivery })),
  ];
}
function selfTest(inv) {
  validate(inv, false, false);
  const changed = structuredClone(inv);
  changed.pairs.find(row => row.itemId === 'sister-lavender-hat'
    && row.avatarId === 'younger' && row.skinId === 'outfit-legend')
    .overlay.path = 'qa/v652/terra/lavender-remaining-sixteen-r1/outfit-legend/younger/overlay.png';
  assert.throws(() => validate(changed, false, false), /lavender-younger-legend-r2/);
  const racer = structuredClone(inv);
  racer.pairs[0].skinId = 'outfit-racer';
  assert.throws(() => validate(racer, false, false));
  assert.throws(() => local('../outside'));
  console.log(JSON.stringify({ status: 'PASS', pairs: 56, qaFiles: 114,
    rejected: ['Lavender Legend R1', 'Racer', 'outside path'] }));
}

const mode = process.argv[2];
assert(['--check-plan', '--verify-sources', '--stage-qa', '--verify-qa', '--self-test'].includes(mode),
  'use --check-plan | --verify-sources | --stage-qa | --verify-qa | --self-test');
const inventory = JSON.parse(fs.readFileSync(local(INVENTORY), 'utf8'));
if (mode === '--self-test') selfTest(inventory);
else {
  validate(inventory, true, ['--verify-sources', '--stage-qa'].includes(mode));
  const list = files(inventory);
  if (mode === '--stage-qa') {
    assert(list.every(row => !fs.existsSync(local(row.target))), 'delivery exists; no overwrite');
    for (const row of list) {
      fs.mkdirSync(path.dirname(local(row.target)), { recursive: true });
      fs.copyFileSync(local(row.source.path), local(row.target), fs.constants.COPYFILE_EXCL);
      assert.equal(digest(row.target), row.source.sha256, `copy mismatch: ${row.target}`);
    }
  } else if (mode === '--verify-qa') {
    for (const row of list) assert.equal(digest(row.target), row.source.sha256,
      `QA delivery mismatch: ${row.target}`);
  }
  console.log(JSON.stringify({ status: 'PASS', mode, pairs: 56, qaFiles: 114,
    publicWrites: 0, manifestWrites: 0 }));
}
