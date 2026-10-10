import assert from 'node:assert/strict';
import manifest from '../src/data/avatarAssetManifest.json';
import { avatarAccessoryCatalogAssetPath, avatarAccessoryLayerSet, publicAssetPath } from '../src/avatarAssetRegistry';

type MutableAccessory = {
  id: string;
  catalogPath?: string;
  supportedAvatars?: string[];
  skinVariants?: Record<string, Record<string, string>>;
};

const crown = (manifest.accessories as MutableAccessory[]).find(entry => entry.id === 'hat-crown');
assert(crown, 'test fixture requires hat-crown');
const originalSkinVariants = crown.skinVariants;
const originalSupportedAvatars = crown.supportedAvatars;
const originalCatalogPath = crown.catalogPath;

try {
  crown.catalogPath = 'public/assets/v6.5.2/catalog/hat-crown.webp';
  assert.equal(avatarAccessoryCatalogAssetPath('hat-crown'), '/assets/v6.5.2/catalog/hat-crown.webp');
  assert.equal(avatarAccessoryCatalogAssetPath('unknown-catalog-item'), undefined);
  delete crown.catalogPath;
  assert.equal(avatarAccessoryCatalogAssetPath('hat-crown'), undefined, 'missing catalog preserves caller fallback');
  crown.skinVariants = {
    brother: { 'outfit-racer': 'public/assets/v6.5/runtime/brother/hat-crown--outfit-racer.webp' },
  };

  const mapped = avatarAccessoryLayerSet('hat-crown', 'brother', 'outfit-racer');
  assert.equal(mapped?.overlay, '/assets/v6.5/runtime/brother/hat-crown--outfit-racer.webp', 'mapped skin must select its explicit overlay');
  assert.equal(mapped?.defaultSkinDetail, undefined, 'skin overlay must not inherit base detail or hair mask');

  const missing = avatarAccessoryLayerSet('hat-crown', 'brother', 'outfit-unknown');
  assert.equal(missing?.overlay, '/assets/v6.5.2/runtime/brother/hat-crown.webp', 'unmapped skin must retain the base avatar overlay');
  assert.equal(missing?.defaultSkinDetail, undefined, 'unmapped skin must not inherit base detail or hair mask');

  const baseCap = avatarAccessoryLayerSet('starter-sun-cap', 'brother');
  assert.equal(baseCap?.overlay, '/assets/v6.4/runtime/brother/starter-sun-cap.webp');
  assert.equal(baseCap?.defaultSkinDetail?.hairVisibilityMask, '/assets/v6.4/runtime-masks/brother/starter-sun-cap-base-hair.png', 'no-skin behavior must retain the existing mask');

  const headwearSpecific = avatarAccessoryLayerSet('starter-buddy-headphones', 'brother', undefined, 'starter-sun-cap');
  assert.match(headwearSpecific?.overlay ?? '', /starter-buddy-headphones--starter-sun-cap-front\.webp$/);
  assert.equal(headwearSpecific?.foreground, true, 'no-skin headwear variant remains available');
  const skinnedHeadwear = avatarAccessoryLayerSet('starter-buddy-headphones', 'brother', 'outfit-racer', 'starter-sun-cap');
  assert.equal(skinnedHeadwear?.overlay, '/assets/v6.5.2/runtime/brother/starter-buddy-headphones--outfit-racer.webp', 'reviewed skin variant must win; headwear-specific variant must not cross a skin boundary');
  assert.equal(skinnedHeadwear?.foreground, undefined);

  crown.supportedAvatars = ['sister'];
  assert.equal(avatarAccessoryLayerSet('hat-crown', 'younger'), undefined, 'manifest-rejected avatar must not fall through to another overlay');

  assert.equal(publicAssetPath('public/assets/v6.5/runtime/brother/hat-crown.webp', '/kids/'), '/kids/assets/v6.5/runtime/brother/hat-crown.webp', 'BASE_URL prefix must be preserved');
  assert.equal(publicAssetPath('public/assets/v6.5/runtime/brother/hat-crown.webp', '/'), '/assets/v6.5/runtime/brother/hat-crown.webp');

  console.log(JSON.stringify({ status: 'PASS', assertions: 16, scope: 'registry skinVariants and optional catalog resolver' }));
} finally {
  crown.skinVariants = originalSkinVariants;
  crown.supportedAvatars = originalSupportedAvatars;
  if (originalCatalogPath === undefined) delete crown.catalogPath;
  else crown.catalogPath = originalCatalogPath;
}
