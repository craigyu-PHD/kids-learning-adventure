import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import manifest from '../src/data/avatarAssetManifest.json';
import { avatarAccessoryLayerSet, publicAssetPath } from '../src/avatarAssetRegistry';

// In-memory fixture only. The default mode verifies actual current bindings;
// --candidate tests the reviewed ordinary overlay plan before local integration.
const candidate = process.argv.includes('--candidate');
const inventory = JSON.parse(fs.readFileSync('qa/v652/terra/headphones-integration-inventory-r2.json', 'utf8')) as {
  items: { itemId: string; baseVariants: Row[]; driftProfiles: Row[] }[];
};
type Row = { avatarId: string; skinId?: string; source: { path: string; sha256: string }; proposedTarget: string };
type Entry = {
  id: string;
  variants?: Record<string, string>;
  skinVariants?: Record<string, Record<string, string>>;
  headwearVariants?: Record<string, Record<string, { overlay: string; foreground: boolean }>>;
};
const avatars = ['brother', 'younger', 'sister', 'younger-sister'];
const hats = ['starter-sun-cap', 'sunny-explorer-hat', 'hat-rocket', 'hat-ocean', 'hat-mage', 'hat-crown', 'sister-lavender-hat'];
const snapshot = JSON.stringify(manifest);
const restore: (() => void)[] = [];
let baseCases = 0;
let mappedSkinCases = 0;
let unmappedSkinCases = 0;
try {
  assert.equal(inventory.items.length, 7);
  for (const item of inventory.items) {
    const entry = (manifest.accessories as Entry[]).find(value => value.id === item.itemId);
    assert(entry);
    assert.equal(item.baseVariants.length, 4);
    assert.equal(item.driftProfiles.length, 5);
    if (candidate) {
      const previousVariants = entry.variants;
      const previousSkins = entry.skinVariants;
      restore.push(() => {
        entry.variants = previousVariants;
        if (previousSkins === undefined) delete entry.skinVariants;
        else entry.skinVariants = previousSkins;
      });
      for (const row of [...item.baseVariants, ...item.driftProfiles]) {
        assert.equal(crypto.createHash('sha256').update(fs.readFileSync(row.source.path)).digest('hex'), row.source.sha256, `source drift: ${row.source.path}`);
      }
      entry.variants = Object.fromEntries(item.baseVariants.map(row => [row.avatarId, row.proposedTarget]));
      entry.skinVariants = {};
      for (const row of item.driftProfiles) {
        assert(row.skinId);
        (entry.skinVariants[row.avatarId] ??= {})[row.skinId] = row.proposedTarget;
      }
    }
    for (const avatar of avatars) for (const hat of hats) {
      const special: { overlay: string; foreground: boolean } | undefined = entry.headwearVariants?.[avatar]?.[hat];
      const base = avatarAccessoryLayerSet(item.itemId, avatar, undefined, hat);
      assert.equal(base?.overlay, publicAssetPath(special?.overlay ?? entry.variants?.[avatar]));
      assert.equal(base?.foreground, special?.foreground);
      baseCases += 1;
      const unknown = avatarAccessoryLayerSet(item.itemId, avatar, '__unmapped_fixture_skin__', hat);
      assert.equal(unknown?.overlay, publicAssetPath(entry.variants?.[avatar]));
      assert.equal(unknown?.foreground, undefined, 'base-only cap layer must not leak across skin boundary');
      assert.equal(unknown?.defaultSkinDetail, undefined, 'base-only mask must not leak across skin boundary');
      unmappedSkinCases += 1;
    }
    for (const row of item.driftProfiles) for (const hat of hats) {
      assert(row.skinId);
      const skin = avatarAccessoryLayerSet(item.itemId, row.avatarId, row.skinId, hat);
      assert.equal(skin?.overlay, publicAssetPath(row.proposedTarget), 'reviewed skin overlay must win over hat-specific or ordinary base');
      assert.equal(skin?.foreground, undefined);
      assert.equal(skin?.defaultSkinDetail, undefined);
      mappedSkinCases += 1;
    }
  }
} finally {
  for (const reset of restore.reverse()) reset();
  assert.equal(JSON.stringify(manifest), snapshot, 'fixture must leave imported manifest unchanged');
}
assert.equal(baseCases, 196);
assert.equal(mappedSkinCases, 245);
assert.equal(unmappedSkinCases, 196);
console.log(JSON.stringify({ status: 'PASS', mode: candidate ? 'IN_MEMORY_CANDIDATE' : 'CURRENT_SOURCE', baseCases, mappedSkinCases, unmappedSkinCases, scope: 'Resolver priority only; cap asset acceptance, image quality, copy allowlist, and release are separate' }));
