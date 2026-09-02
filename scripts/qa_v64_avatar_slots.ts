import manifest from '../src/data/avatarAssetManifest.json';
import { cosmeticById } from '../src/cosmetics';
import { shopItemById } from '../src/avatarShop';
import {
  effectiveEquipmentSlot,
  equippedAvatarFromProgress,
  equippedItemIdsFromProgress,
  legacySlotToEquipmentSlot,
} from '../src/shopLedger';
import { toggleShopItem } from '../src/shopService';
import type { AppProgress, AvatarEquipmentSlot, ChildProgress, EquipmentTransaction, PurchaseTransaction } from '../src/types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const expectedVisualSlot: Record<string, AvatarEquipmentSlot> = {
  hairstyle: 'hair',
  hat: 'headwear',
  headphones: 'earwear',
  glasses: 'face',
  backpack: 'backpack',
  cape: 'cape',
  effect: 'effect',
};

for (const entry of manifest.accessories) {
  const item = cosmeticById.get(entry.id);
  assert(item, `Manifest accessory ${entry.id} missing from cosmetic catalog`);
  const expected = expectedVisualSlot[item.slot];
  assert(expected, `Manifest accessory ${entry.id} uses unsupported catalog slot ${item.slot}`);
  assert(entry.slot === expected, `Manifest accessory ${entry.id}: slot ${entry.slot} != ${expected}`);
  const shop = shopItemById.get(entry.id);
  assert(shop?.equipmentSlot === expected, `${entry.id}: ShopItem equipment slot must be ${expected}`);
  assert(shop.visualSlot === expected, `${entry.id}: visual slot must be ${expected}`);
}

assert(manifest.version === 4, `Expected V6.4 manifest version 4, got ${manifest.version}`);
assert(legacySlotToEquipmentSlot('hairstyle') === 'hair', 'hairstyle must map to hair');
assert(legacySlotToEquipmentSlot('hat') === 'headwear', 'hat must map to headwear');
assert(legacySlotToEquipmentSlot('headphones') === 'earwear', 'headphones must map to earwear');
assert(legacySlotToEquipmentSlot('backpack') === 'backpack', 'backpack must keep independent slot');
assert(legacySlotToEquipmentSlot('cape') === 'cape', 'cape must keep independent slot');
assert(effectiveEquipmentSlot('head', 'hair-comet') === 'hair', 'legacy head hair replay failed');
assert(effectiveEquipmentSlot('head', 'starter-sun-cap') === 'headwear', 'legacy head hat replay failed');
assert(effectiveEquipmentSlot('head', 'starter-buddy-headphones') === 'earwear', 'legacy head headphones replay failed');
assert(effectiveEquipmentSlot('back', 'trail-backpack') === 'backpack', 'legacy back backpack replay failed');
assert(effectiveEquipmentSlot('back', 'hero-cape') === 'cape', 'legacy back cape replay failed');

const comboIds = [
  'hair-comet',
  'starter-sun-cap',
  'starter-buddy-headphones',
  'starter-sky-glasses',
  'trail-backpack',
  'hero-cape',
];
const purchases: PurchaseTransaction[] = comboIds.map((itemId, index) => ({
  id: `v64-slot-purchase-${index}`,
  childId: 'child-1',
  itemId,
  cost: cosmeticById.get(itemId)?.cost ?? 0,
  createdAt: `2026-09-02T00:00:0${index}.000Z`,
  source: 'purchase',
}));
const oldSlots: AvatarEquipmentSlot[] = ['head', 'head', 'head', 'face', 'back', 'back'];
const legacyEquipment: EquipmentTransaction[] = comboIds.map((itemId, index) => ({
  id: `v61-legacy-equip-${index}`,
  childId: 'child-1',
  itemId,
  slot: oldSlots[index],
  action: 'equip',
  createdAt: `2026-09-02T00:01:0${index}.000Z`,
}));
const legacyProgress: ChildProgress = {
  completedDays: [], completedBlocks: [], completedMissions: [], claimedEggs: [],
  unlockedCosmetics: [...comboIds], equippedCosmetics: [...comboIds],
  purchaseTransactions: purchases,
  equipmentTransactions: legacyEquipment,
  badgeUnlocks: {}, completionTimestamps: {}, rewardTransactions: [], answerEvents: [],
};
const replayed = new Set(equippedItemIdsFromProgress(legacyProgress));
for (const id of comboIds) assert(replayed.has(id), `Legacy grouped-slot replay lost ${id}`);
const replayedAvatar = equippedAvatarFromProgress(legacyProgress);
assert(replayedAvatar.accessories.hair === 'hair-comet', 'Legacy hair not replayed into hair slot');
assert(replayedAvatar.accessories.headwear === 'starter-sun-cap', 'Legacy hat not replayed into headwear slot');
assert(replayedAvatar.accessories.earwear === 'starter-buddy-headphones', 'Legacy headphones not replayed into earwear slot');
assert(replayedAvatar.accessories.face === 'starter-sky-glasses', 'Legacy glasses not replayed into face slot');
assert(replayedAvatar.accessories.backpack === 'trail-backpack', 'Legacy backpack not replayed into backpack slot');
assert(replayedAvatar.accessories.cape === 'hero-cape', 'Legacy cape not replayed into cape slot');

let state: AppProgress = {
  'child-1': {
    ...legacyProgress,
    equipmentTransactions: [],
    equippedCosmetics: [],
  },
};
for (const [index, itemId] of comboIds.entries()) {
  const mutation = toggleShopItem(state, 'child-1', 'brother', itemId, `v64-new-equip-${index}`, `2026-09-02T00:02:0${index}.000Z`);
  assert(mutation.result.ok && mutation.result.equipped, `Fine-slot equip failed for ${itemId}: ${mutation.result.reason ?? 'unknown'}`);
  state = mutation.next;
}
const current = state['child-1'];
const currentEquipped = new Set(current.equippedCosmetics ?? []);
for (const id of comboIds) assert(currentEquipped.has(id), `Fine-slot combination lost ${id}`);
for (const tx of current.equipmentTransactions ?? []) {
  assert(tx.slot !== 'head' && tx.slot !== 'back', `New V6.4 transaction wrote legacy grouped slot ${tx.slot}`);
}

// Same-slot replacement remains deterministic: a second hairstyle replaces the
// first hairstyle without touching hat or headphones.
const extraPurchase: PurchaseTransaction = {
  id: 'v64-slot-purchase-hair-wave', childId: 'child-1', itemId: 'hair-wave',
  cost: cosmeticById.get('hair-wave')?.cost ?? 0, createdAt: '2026-09-02T00:03:00.000Z', source: 'purchase',
};
state = {
  ...state,
  'child-1': {
    ...state['child-1'],
    purchaseTransactions: [...(state['child-1'].purchaseTransactions ?? []), extraPurchase],
    unlockedCosmetics: [...(state['child-1'].unlockedCosmetics ?? []), 'hair-wave'],
  },
};
const hairSwap = toggleShopItem(state, 'child-1', 'brother', 'hair-wave', 'v64-new-equip-hair-wave', '2026-09-02T00:03:10.000Z');
assert(hairSwap.result.ok && hairSwap.result.equipped, `Second hairstyle equip failed: ${hairSwap.result.reason ?? 'unknown'}`);
const swapped = new Set(hairSwap.next['child-1'].equippedCosmetics ?? []);
assert(swapped.has('hair-wave') && !swapped.has('hair-comet'), 'Same fine slot must replace old hairstyle');
assert(swapped.has('starter-sun-cap') && swapped.has('starter-buddy-headphones'), 'Hair swap must not remove hat/headphones');

console.log(JSON.stringify({
  status: 'PASS',
  manifestVersion: manifest.version,
  manifestAccessories: manifest.accessories.length,
  fineSlots: [...new Set(manifest.accessories.map((entry) => entry.slot))].sort(),
  legacyGroupedReplay: comboIds.length,
  simultaneousHeadCombination: ['hair', 'headwear', 'earwear'],
  simultaneousBackCombination: ['backpack', 'cape'],
  newTransactionsUseFineSlots: true,
  sameSlotReplacement: true,
}, null, 2));
