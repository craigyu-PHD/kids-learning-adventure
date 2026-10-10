import assert from 'node:assert/strict';
import manifest from '../src/data/avatarAssetManifest.json';
import { avatarAccessoryLayerSet } from '../src/avatarAssetRegistry';

type Detail = { overlay: string; hairVisibilityMask?: string };
type Entry = { id: string; defaultSkinDetails?: Record<string, Detail>; skinDetails?: Record<string, Record<string, Detail>> };
const entry = (manifest.accessories as Entry[]).find(row => row.id === 'hat-mage')!;
const snapshot = JSON.stringify(manifest);
const original = structuredClone(entry);
const pair = { overlay: 'qa/v652/fixture/skin-overlay.png', hairVisibilityMask: 'qa/v652/fixture/skin-mask.png' };
const base = { overlay: 'qa/v652/fixture/base-overlay.png', hairVisibilityMask: 'qa/v652/fixture/base-mask.png' };
try {
  entry.defaultSkinDetails = { brother: base };
  entry.skinDetails = { brother: { 'outfit-racer': pair } };
  const detail = (avatar: string, skin?: string) => avatarAccessoryLayerSet('hat-mage', avatar, skin)?.defaultSkinDetail;
  assert.deepEqual(detail('brother', 'outfit-racer'), { overlay: '/' + pair.overlay, hairVisibilityMask: '/' + pair.hairVisibilityMask });
  assert.deepEqual(detail('brother'), { overlay: '/' + base.overlay, hairVisibilityMask: '/' + base.hairVisibilityMask });
  for (const skin of ['outfit-cadet', 'unknown']) assert.equal(detail('brother', skin), undefined);
  for (const avatar of ['younger', 'sister', 'younger-sister']) assert.equal(detail(avatar, 'outfit-racer'), undefined);
  entry.skinDetails.brother['outfit-racer'] = { overlay: pair.overlay };
  assert.deepEqual(detail('brother', 'outfit-racer'), { overlay: '/' + pair.overlay, hairVisibilityMask: undefined });
  entry.skinDetails.brother['outfit-racer'] = { overlay: '', hairVisibilityMask: pair.hairVisibilityMask };
  assert.equal(detail('brother', 'outfit-racer'), undefined, 'mask-only mapping must not activate');
  delete entry.skinDetails;
  assert.equal(detail('brother', 'outfit-racer'), undefined, 'missing skin mapping never inherits base mask');
} finally {
  for (const key of Object.keys(entry)) delete (entry as Record<string, unknown>)[key];
  Object.assign(entry, original);
  assert.equal(JSON.stringify(manifest), snapshot, 'in-memory fixture restored exactly');
}
console.log(JSON.stringify({ status: 'PASS', scope: 'exact skin detail selection and no base/other-avatar inheritance; not visual or decode QA' }));
