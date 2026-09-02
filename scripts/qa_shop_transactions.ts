import assert from 'node:assert/strict';
import { purchaseShopItem, toggleShopItem } from '../src/shopService';
import { mergeProgressMaps } from '../src/stateMerge';
import { calculateRewards, normalizeProgress } from '../src/rewards';
import type { AppProgress, RewardTransaction } from '../src/types';

const seedReward = (id: string, xp: number, coins: number): RewardTransaction => ({
  id, kind: 'bonus', sourceId: id, xp, coins, stars: 0, gems: 0, createdAt: '2026-09-01T00:00:00.000Z',
});
const seedChild = (coins = 1000) => normalizeProgress({ rewardTransactions: [seedReward('seed', 1500, coins)] });
const base = (): AppProgress => ({ child1: seedChild(), child2: seedChild() });

{
  const starterBase: AppProgress = { child1: seedChild(0) };
  const purchased = purchaseShopItem(starterBase, 'child1', 'brother', 'starter-sun-cap', '2026-09-01T00:10:00.000Z');
  assert.equal(purchased.result.ok, true, 'free starter purchase must succeed with zero coins');
  const afterPurchase = normalizeProgress(purchased.next.child1);
  assert.equal(afterPurchase.purchaseTransactions?.filter((tx) => tx.itemId === 'starter-sun-cap').length, 1, 'free starter still creates one purchase transaction');
  assert.equal(afterPurchase.purchaseTransactions?.find((tx) => tx.itemId === 'starter-sun-cap')?.cost, 0, 'starter purchase freezes cost 0');
  assert.ok(afterPurchase.unlockedCosmetics?.includes('starter-sun-cap'), 'starter enters inventory');
  const equipped = toggleShopItem(purchased.next, 'child1', 'brother', 'starter-sun-cap', 'starter-equip', '2026-09-01T00:11:00.000Z');
  assert.equal(equipped.result.equipped, true, 'starter equips');
  assert.ok(normalizeProgress(equipped.next.child1).equippedCosmetics?.includes('starter-sun-cap'), 'starter equip mirror persists');
  const reloaded = normalizeProgress(JSON.parse(JSON.stringify(equipped.next.child1)));
  assert.ok(reloaded.equippedCosmetics?.includes('starter-sun-cap'), 'starter equip survives serialization');
  const unequipped = toggleShopItem(equipped.next, 'child1', 'brother', 'starter-sun-cap', 'starter-unequip', '2026-09-01T00:12:00.000Z');
  assert.equal(unequipped.result.equipped, false, 'starter unequips');
  assert.ok(!normalizeProgress(unequipped.next.child1).equippedCosmetics?.includes('starter-sun-cap'), 'starter unequip persists');
  assert.equal(calculateRewards(unequipped.next.child1).coins, 0, 'free starter never changes wallet');
}

{
  const first = purchaseShopItem(base(), 'child1', 'brother', 'outfit-racer', '2026-09-01T01:00:00.000Z');
  assert.equal(first.result.ok, true);
  const second = purchaseShopItem(first.next, 'child1', 'brother', 'outfit-racer', '2026-09-01T01:01:00.000Z');
  assert.equal(second.result.ok, true);
  assert.equal(normalizeProgress(second.next.child1).purchaseTransactions?.filter((tx) => tx.itemId === 'outfit-racer').length, 1, 'purchase must be idempotent');
  assert.equal(normalizeProgress(second.next.child1).purchaseTransactions?.find((tx) => tx.itemId === 'outfit-racer')?.cost, 130, 'purchase price must freeze');
}

{
  const low: AppProgress = { child1: seedChild(0) };
  const result = purchaseShopItem(low, 'child1', 'brother', 'outfit-racer');
  assert.equal(result.result.ok, false);
  assert.match(result.result.reason ?? '', /Coins/);
}

{
  const purchased = purchaseShopItem(base(), 'child1', 'brother', 'outfit-racer').next;
  const before = calculateRewards(purchased.child1).coins;
  const equipped = toggleShopItem(purchased, 'child1', 'brother', 'outfit-racer', 'equip-1').next;
  assert.equal(calculateRewards(equipped.child1).coins, before, 'equip must not charge coins');
  assert.ok(normalizeProgress(equipped.child1).equippedCosmetics?.includes('outfit-racer'));
  const normalizedAgain = normalizeProgress(JSON.parse(JSON.stringify(equipped.child1)));
  assert.ok(normalizedAgain.equippedCosmetics?.includes('outfit-racer'), 'equipment must persist after serialization');
}

{
  const purchased = purchaseShopItem(base(), 'child1', 'brother', 'outfit-racer').next;
  assert.equal(normalizeProgress(purchased.child2).unlockedCosmetics?.length, 0, 'learner inventory must be isolated');
  assert.equal(calculateRewards(purchased.child2).coins, 1000, 'learner wallet must be isolated');
}

{
  const snapshot = base();
  const branchA = purchaseShopItem(snapshot, 'child1', 'brother', 'outfit-racer', '2026-09-01T02:00:00.000Z').next;
  const branchB = purchaseShopItem(snapshot, 'child1', 'brother', 'effect-stars', '2026-09-01T02:00:01.000Z').next;
  const merged = mergeProgressMaps(branchA, branchB);
  const inventory = normalizeProgress(merged.child1).unlockedCosmetics ?? [];
  assert.ok(inventory.includes('outfit-racer') && inventory.includes('effect-stars'), 'concurrent purchases must merge without lost update');
  assert.equal(calculateRewards(merged.child1).spentCoins, 270);
}

{
  let both = purchaseShopItem(base(), 'child1', 'brother', 'outfit-racer').next;
  both = purchaseShopItem(both, 'child1', 'brother', 'effect-stars').next;
  const branchA = toggleShopItem(both, 'child1', 'brother', 'outfit-racer', 'equip-skin', '2026-09-01T03:00:00.000Z').next;
  const branchB = toggleShopItem(both, 'child1', 'brother', 'effect-stars', 'equip-effect', '2026-09-01T03:00:01.000Z').next;
  const merged = mergeProgressMaps(branchA, branchB);
  const equipped = normalizeProgress(merged.child1).equippedCosmetics ?? [];
  assert.ok(equipped.includes('outfit-racer') && equipped.includes('effect-stars'), 'concurrent equipment slots must merge');
}

{
  const representativeItems = [
    ['aligned-overlay', 'sunny-explorer-hat'],
    ['split-overlay', 'trail-backpack'],
    ['full-skin', 'outfit-racer'],
    ['ship', 'ship-scout'],
    ['robot', 'robot-sky'],
    ['card', 'card-sky'],
    ['effect', 'effect-stars'],
  ] as const;
  for (const [mode, itemId] of representativeItems) {
    const purchased = purchaseShopItem(base(), 'child1', 'brother', itemId, `2026-09-01T04:00:${String(representativeItems.findIndex((entry) => entry[1] === itemId)).padStart(2, '0')}.000Z`);
    assert.equal(purchased.result.ok, true, `${mode} purchase must succeed`);
    const afterPurchase = normalizeProgress(purchased.next.child1);
    assert.ok(afterPurchase.unlockedCosmetics?.includes(itemId), `${mode} item must enter inventory`);
    const equipped = toggleShopItem(purchased.next, 'child1', 'brother', itemId, `v63-equip:${itemId}`, '2026-09-01T04:10:00.000Z');
    assert.equal(equipped.result.ok, true, `${mode} equip/use must succeed`);
    assert.equal(equipped.result.equipped, true, `${mode} must report equipped/selected`);
    const reloaded = normalizeProgress(JSON.parse(JSON.stringify(equipped.next.child1)));
    assert.ok(reloaded.equippedCosmetics?.includes(itemId), `${mode} selection must survive serialization`);
    const removed = toggleShopItem(equipped.next, 'child1', 'brother', itemId, `v63-unequip:${itemId}`, '2026-09-01T04:20:00.000Z');
    assert.equal(removed.result.equipped, false, `${mode} unequip/unselect must succeed`);
    assert.ok(!normalizeProgress(removed.next.child1).equippedCosmetics?.includes(itemId), `${mode} unequip must persist`);
  }
}

{
  const legacy = normalizeProgress({ unlockedCosmetics: ['hair-comet'], equippedCosmetics: ['hair-comet'] });
  assert.equal(legacy.purchaseTransactions?.[0]?.source, 'legacy-migration');
  assert.equal(legacy.purchaseTransactions?.[0]?.cost, 60, 'legacy ownership must be frozen into migration ledger');
  assert.ok(legacy.equippedCosmetics?.includes('hair-comet'), 'legacy equipment data must remain recoverable');
}

console.log('PASS qa_shop_transactions: free starter, all representative preview modes purchase/equip/unequip persistence, idempotency, insufficient coins, price freeze, learner isolation, concurrent merge');
