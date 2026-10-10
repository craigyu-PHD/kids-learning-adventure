import assert from 'node:assert/strict';
import manifest from '../src/data/avatarAssetManifest.json';
import { avatarAccessoryLayerSet } from '../src/avatarAssetRegistry';
import { AVATAR_CANVAS_HEIGHT, AVATAR_CANVAS_WIDTH, computeAvatarRigFrame } from '../src/avatarCanvasGeometry';
import { readAvatarLayoutBox } from '../src/useAvatarRigFrame';

const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
const cases = [
  { width: 300, height: 300, padding: 256, scale: 300 / 1792 },
  { width: 180, height: 360, padding: 256, scale: 180 / 1024 },
  { width: 360, height: 180, padding: 256, scale: 180 / 1792 },
  { width: 300, height: 300, padding: 0, scale: 300 / 1536 },
] as const;
for (const fixture of cases) {
  const frame = computeAvatarRigFrame(fixture.width, fixture.height, fixture.padding);
  assert(frame);
  close(frame.scale, fixture.scale);
  close(frame.sceneWidth, AVATAR_CANVAS_WIDTH * fixture.scale);
  close(frame.sceneHeight, (AVATAR_CANVAS_HEIGHT + fixture.padding) * fixture.scale);
  close(frame.bodyTop, frame.sceneTop + fixture.padding * fixture.scale);
  close(frame.bodyHeight, AVATAR_CANVAS_HEIGHT * fixture.scale);
  assert.ok(frame.sceneLeft >= 0 && frame.sceneTop >= 0);
  assert.ok(frame.sceneLeft + frame.sceneWidth <= fixture.width + 1e-9);
  assert.ok(frame.sceneTop + frame.sceneHeight <= fixture.height + 1e-9);
}
for (const invalid of [-1, 1, 128, 512, Number.NaN, Number.POSITIVE_INFINITY]) {
  assert.equal(computeAvatarRigFrame(300, 300, invalid), undefined);
}
assert.equal(computeAvatarRigFrame(0, 300, 256), undefined);
const transformedElement = { clientWidth: 300, clientHeight: 240,
  getBoundingClientRect: () => ({ width: 450, height: 360 }) };
assert.deepEqual(readAvatarLayoutBox(transformedElement), { width: 300, height: 240 },
  'rig measurement must use layout-space dimensions, not transformed screen-space bounds');
const fractionalStyle = { width: '420px', height: '329.6875px', boxSizing: 'border-box',
  paddingLeft: '0px', paddingRight: '0px', paddingTop: '0px', paddingBottom: '0px',
  borderLeftWidth: '0px', borderRightWidth: '0px', borderTopWidth: '0px', borderBottomWidth: '0px' };
assert.deepEqual(readAvatarLayoutBox({ clientWidth: 420, clientHeight: 330 }, fractionalStyle),
  { width: 420, height: 329.6875 }, 'fractional shop height must not round up and clip the shared rig');
assert.deepEqual(readAvatarLayoutBox(transformedElement, { ...fractionalStyle, width: '304.5px', height: '244.25px', borderLeftWidth: '2px', borderRightWidth: '2px', borderTopWidth: '2px', borderBottomWidth: '2px' }),
  { width: 300.5, height: 240.25 }, 'border-box must exclude borders');
assert.deepEqual(readAvatarLayoutBox(transformedElement, { ...fractionalStyle, boxSizing: 'content-box', width: '300.5px', height: '240.25px', paddingLeft: '2px', paddingTop: '3px' }),
  { width: 302.5, height: 243.25 }, 'content-box must include padding');

type Detail = { overlay: string; hairVisibilityMask?: string; canvasTopPadding?: number };
type Entry = {
  id: string;
  defaultSkinDetails?: Record<string, Detail>;
  skinDetails?: Record<string, Record<string, Detail>>;
};
const entry = (manifest.accessories as Entry[]).find(row => row.id === 'hat-mage');
assert(entry, 'fixture requires hat-mage');
const original = structuredClone(entry);
try {
  const detail = { overlay: 'qa/v652/fixture/extended.png', hairVisibilityMask: 'qa/v652/fixture/mask.png', canvasTopPadding: 256 };
  entry.defaultSkinDetails = { brother: detail };
  assert.deepEqual(avatarAccessoryLayerSet('hat-mage', 'brother')?.defaultSkinDetail, {
    overlay: '/qa/v652/fixture/extended.png',
    hairVisibilityMask: '/qa/v652/fixture/mask.png',
    canvasTopPadding: 256,
  });
  detail.canvasTopPadding = 0;
  assert.equal(avatarAccessoryLayerSet('hat-mage', 'brother')?.defaultSkinDetail?.canvasTopPadding, 0);
  for (const invalid of [-1, 128, 512, Number.NaN, Number.POSITIVE_INFINITY]) {
    detail.canvasTopPadding = invalid;
    assert.equal(avatarAccessoryLayerSet('hat-mage', 'brother')?.defaultSkinDetail, undefined);
  }

  // Full-skin admission is exact per avatar/outfit. A base's extended canvas
  // or hair mask must never silently authorize an unreviewed outfit pair.
  detail.canvasTopPadding = 256;
  const skinDetail: Detail = {
    overlay: 'qa/v652/fixture/cadet-extended.png', canvasTopPadding: 256,
  };
  entry.skinDetails = { brother: { 'outfit-cadet': skinDetail } };
  assert.deepEqual(avatarAccessoryLayerSet('hat-mage', 'brother', 'outfit-cadet')?.defaultSkinDetail, {
    overlay: '/qa/v652/fixture/cadet-extended.png',
    hairVisibilityMask: undefined,
    canvasTopPadding: 256,
  }, 'reviewed no-mask outfit must not inherit the base hair mask');
  assert.equal(avatarAccessoryLayerSet('hat-mage', 'brother', 'outfit-racer')?.defaultSkinDetail, undefined,
    'unreviewed outfit must not inherit base headroom');
  assert.equal(avatarAccessoryLayerSet('hat-mage', 'sister', 'outfit-cadet')?.defaultSkinDetail, undefined,
    'reviewed brother pair must not leak into another avatar');
  for (const invalid of [-1, 128, 512, Number.NaN, Number.POSITIVE_INFINITY]) {
    skinDetail.canvasTopPadding = invalid;
    assert.equal(avatarAccessoryLayerSet('hat-mage', 'brother', 'outfit-cadet')?.defaultSkinDetail, undefined,
      'invalid outfit headroom must not fall back to the valid base detail');
  }
} finally {
  for (const key of Object.keys(entry)) delete (entry as Record<string, unknown>)[key];
  Object.assign(entry, original);
}

console.log(JSON.stringify({ status: 'PASS', scope: 'avatar headroom pure geometry and exact registry metadata gate' }));
