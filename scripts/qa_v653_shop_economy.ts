import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { shopItems, shopItemAvailability, shopItemCanRender } from '../src/avatarShop';
import { purchaseShopItem, toggleShopItem } from '../src/shopService';
import { calculateRewards, normalizeProgress } from '../src/rewards';
import type { AppProgress, RewardTransaction } from '../src/types';

const roles = ['brother', 'younger', 'sister', 'younger-sister'] as const;
const output = process.argv[2] ?? 'qa/v653/20261005/shop-coverage/economy-r1/result.json';
assert.ok(output.startsWith('qa/v653/20261005/') || output.startsWith('qa/v653/20261006/user-feedback-r2/'));
assert.ok(!output.split('/').includes('..'), 'QA output must stay inside the owned evidence directory');
const seed = (id: string, coins = 10_000): RewardTransaction => ({
  id: `fixture-earned:${id}`, kind: 'bonus', sourceId: 'v653-isolated-economy',
  xp: 4_000, coins, stars: 0, gems: 0, createdAt: '2026-09-02T00:00:00.000Z',
});
const files = ['src/shopService.ts','src/shopLedger.ts','src/rewards.ts','src/avatarShop.ts','src/cosmetics.ts','src/types.ts','src/data/avatarAssetManifest.json','src/data/worldArtManifest.json'];
const pins = Object.fromEntries(files.map(p => [p, createHash('sha256').update(readFileSync(p)).digest('hex')]));
const rows: unknown[] = [];
const failures: string[] = [];
assert.equal(shopItems.length, 64, '64 current SKUs, including optional pet');
assert.equal(new Set(shopItems.map(r => r.id)).size, 64);
for (const avatar of roles) {
  for (const item of shopItems) {
    try {
      const id = `${avatar}:${item.id}`;
      assert.equal(shopItemAvailability(item, avatar), 'available', id);
      assert.equal(shopItemCanRender(item, avatar), true, id);
      const current: AppProgress = {
        child1: normalizeProgress({ rewardTransactions: [seed(id)] }),
        child2: normalizeProgress({ rewardTransactions: [seed('other-child', 17)] }),
      };
      const before = calculateRewards(current.child1);
      const bought = purchaseShopItem(current, 'child1', avatar, item.id, '2026-09-02T01:00:00.000Z');
      assert.equal(bought.result.ok, true, id);
      assert.deepEqual(bought.next.child2, current.child2, 'other child must remain unchanged');
      const purchased = bought.next.child1;
      assert.equal(purchased.purchaseTransactions?.length, 1);
      assert.equal(purchased.purchaseTransactions?.[0].cost, item.cost);
      assert.equal(calculateRewards(purchased).earnedCoins, before.earnedCoins);
      assert.equal(calculateRewards(purchased).coins, before.coins - item.cost);
      assert.ok(!('coins' in purchased), 'balance is derived, never a mutable child field');
      const rebought = purchaseShopItem(bought.next, 'child1', avatar, item.id);
      assert.deepEqual(rebought.next, bought.next, 'retry must not charge twice');
      const eventId = `fixture-equip:${id}`;
      const equipped = toggleShopItem(bought.next, 'child1', avatar, item.id, eventId, '2026-09-02T02:00:00.000Z');
      assert.equal(equipped.result.equipped, true);
      const retried = toggleShopItem(equipped.next, 'child1', avatar, item.id, eventId, '2026-09-02T02:00:01.000Z');
      assert.deepEqual(retried.next, equipped.next, 'same event retry must preserve immutable event and selection');
      assert.equal(retried.result.equipped, true);
      const persisted = normalizeProgress(JSON.parse(JSON.stringify(equipped.next.child1)));
      assert.deepEqual(persisted, equipped.next.child1);
      const removed = toggleShopItem(equipped.next, 'child1', avatar, item.id, `fixture-unequip:${id}`, '2026-09-02T03:00:00.000Z');
      assert.equal(removed.result.equipped, false);
      assert.equal(removed.next.child1.equipmentTransactions?.length, 2);
      const removedRetry = toggleShopItem(removed.next, 'child1', avatar, item.id, `fixture-unequip:${id}`);
      assert.strictEqual(removedRetry.next, removed.next, 'unequip retry preserves original object');
      assert.equal(removedRetry.result.equipped, false);
      const staleEquipRetry = toggleShopItem(removed.next, 'child1', avatar, item.id, eventId);
      assert.strictEqual(staleEquipRetry.next, removed.next, 'old equip retry cannot revive equipment');
      assert.equal(staleEquipRetry.result.equipped, false);
      assert.deepEqual(removed.next.child1.purchaseTransactions, purchased.purchaseTransactions);
      assert.deepEqual(removed.next.child2, current.child2);
      const poor: AppProgress = { child1: normalizeProgress({ rewardTransactions: [seed('insufficient', 0)] }) };
      const denied = purchaseShopItem(poor, 'child1', avatar, item.id);
      assert.equal(denied.result.ok, item.cost === 0, 'free products are available without coins');
      if (item.cost > 0) assert.deepEqual(denied.next, poor, 'insufficient funds do not mutate');
      else assert.equal(calculateRewards(denied.next.child1).coins, 0, 'free item never charges');
      const unowned = toggleShopItem(current, 'child1', avatar, item.id, 'fixture-unowned');
      assert.equal(unowned.result.ok, false);
      assert.deepEqual(unowned.next, current);
      rows.push({ avatar, itemId: item.id, cost: item.cost, earnedCoins: before.earnedCoins,
        coinsAfter: calculateRewards(purchased).coins, status: 'PASS',
        operations: ['purchase','derived-balance','retry-purchase','retry-equip-event','persist','unequip','child-isolation','insufficient-funds','unowned-rejection'] });
    } catch (e) {
      failures.push(`${avatar}:${item.id}: ${e instanceof Error ? e.message.split('\n')[0] : e}`);
    }
  }
}
const controls: { name: string; status: string }[] = [];
function control(name: string, run: () => void) {
  try { run(); controls.push({ name, status: 'PASS' }); }
  catch (e) { failures.push(`${name}: ${e instanceof Error ? e.message.split('\n')[0] : e}`); }
}
const first = shopItems.find(r => r.equipmentSlot === 'headwear')!;
const second = shopItems.find(r => r.equipmentSlot === first.equipmentSlot && r.id !== first.id)!;
const base: AppProgress = { child1: normalizeProgress({ rewardTransactions: [seed('controls')] }), child2: normalizeProgress({ rewardTransactions: [seed('controls-other')] }) };
const both = purchaseShopItem(purchaseShopItem(base, 'child1', 'brother', first.id).next, 'child1', 'brother', second.id).next;
const firstEquip = toggleShopItem(both, 'child1', 'brother', first.id, 'fixture-control-event', '2026-09-02T02:00:00.000Z').next;
control('stale equip cannot replace newer same-slot selection', () => {
  const replaced = toggleShopItem(firstEquip, 'child1', 'brother', second.id, 'fixture-replace', '2026-09-02T03:00:00.000Z').next;
  const retry = toggleShopItem(replaced, 'child1', 'brother', first.id, 'fixture-control-event');
  assert.strictEqual(retry.next, replaced); assert.equal(retry.result.equipped, false);
  assert.ok(retry.next.child1.equippedCosmetics?.includes(second.id));
});
control('cross-child event ID collision', () => {
  const owned = purchaseShopItem(firstEquip, 'child2', 'brother', first.id).next;
  const retry = toggleShopItem(owned, 'child2', 'brother', first.id, 'fixture-control-event');
  assert.equal(retry.result.ok, false); assert.strictEqual(retry.next, owned);
});
control('cross-item event ID collision', () => {
  const retry = toggleShopItem(firstEquip, 'child1', 'brother', second.id, 'fixture-control-event');
  assert.equal(retry.result.ok, false); assert.strictEqual(retry.next, firstEquip);
});
control('wrong slot in existing raw event', () => {
  const raw: AppProgress = { ...firstEquip, child1: { ...firstEquip.child1, equipmentTransactions: firstEquip.child1.equipmentTransactions!.map(r => ({...r, slot: 'face' as const})) } };
  const retry = toggleShopItem(raw, 'child1', 'brother', first.id, 'fixture-control-event');
  assert.equal(retry.result.ok, false); assert.strictEqual(retry.next, raw);
});
control('conflicting raw duplicates cannot be hidden by normalization', () => {
  const tx = firstEquip.child1.equipmentTransactions![0];
  const raw: AppProgress = { ...firstEquip, child1: { ...firstEquip.child1, equipmentTransactions: [tx, {...tx, action: 'unequip'}] } };
  const retry = toggleShopItem(raw, 'child1', 'brother', first.id, tx.id);
  assert.equal(retry.result.ok, false); assert.strictEqual(retry.next, raw);
});
control('blank event ID rejected', () => {
  const retry = toggleShopItem(both, 'child1', 'brother', first.id, '  ');
  assert.equal(retry.result.ok, false); assert.strictEqual(retry.next, both);
});
control('legacy grouped slot retry does not rewrite history', () => {
  const raw: AppProgress = { ...firstEquip, child1: { ...firstEquip.child1, equipmentTransactions: firstEquip.child1.equipmentTransactions!.map(r => ({...r, slot: 'head' as const})) } };
  const retry = toggleShopItem(raw, 'child1', 'brother', first.id, 'fixture-control-event');
  assert.equal(retry.result.ok, true); assert.equal(retry.result.equipped, true); assert.strictEqual(retry.next, raw);
});
for (const [p, h] of Object.entries(pins)) assert.equal(createHash('sha256').update(readFileSync(p)).digest('hex'), h, 'source drift');
const result = { status: failures.length ? 'FAIL' : 'PASS_SERVICE_ECONOMY',
  scope: 'In-memory isolated synthetic RewardTransaction fixtures; actual production purchase/toggle functions. No browser or family cloud writes.',
  total: 64 * 4, passed: rows.length, sourcePins: pins, rows, controls, failures };
mkdirSync(output.slice(0, output.lastIndexOf('/')), { recursive: true });
writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({status:result.status,total:result.total,passed:rows.length,failures:failures.slice(0,5)}));
if (failures.length) process.exitCode = 1;
