import assert from 'node:assert/strict';
import { shopItems, shopItemAvailability, shopItemCanRender } from '../src/avatarShop';
import { purchaseShopItem, toggleShopItem } from '../src/shopService';
import { normalizeProgress } from '../src/rewards';
import type { AppProgress, RewardTransaction } from '../src/types';

const avatars = ['brother', 'younger', 'sister', 'younger-sister'] as const;
const seedReward = (avatar: string): RewardTransaction => ({
  id: `v63-all-items-seed:${avatar}`,
  kind: 'bonus',
  sourceId: 'v63-all-items-transaction-qa',
  xp: 999_999,
  coins: 999_999,
  stars: 0,
  gems: 0,
  createdAt: '2026-09-02T00:00:00.000Z',
});

let checks = 0;
for (const avatar of avatars) {
  for (const [index, item] of shopItems.entries()) {
    assert.equal(shopItemAvailability(item, avatar), 'available', `${avatar}:${item.id} must be available`);
    assert.equal(shopItemCanRender(item, avatar), true, `${avatar}:${item.id} must have a render/preview contract`);
    const current: AppProgress = { child1: normalizeProgress({ rewardTransactions: [seedReward(avatar)] }) };
    const purchased = purchaseShopItem(current, 'child1', avatar, item.id, `2026-09-02T01:${String(index).padStart(2, '0')}:00.000Z`);
    assert.equal(purchased.result.ok, true, `${avatar}:${item.id} purchase failed: ${purchased.result.reason ?? ''}`);
    const owned = normalizeProgress(purchased.next.child1);
    assert.ok(owned.unlockedCosmetics?.includes(item.id), `${avatar}:${item.id} missing inventory ownership`);
    const purchaseRows = owned.purchaseTransactions?.filter((tx) => tx.itemId === item.id) ?? [];
    assert.equal(purchaseRows.length, 1, `${avatar}:${item.id} must create exactly one purchase transaction`);
    assert.equal(purchaseRows[0]?.cost, item.cost, `${avatar}:${item.id} purchase must freeze catalog cost`);

    const equipped = toggleShopItem(purchased.next, 'child1', avatar, item.id, `v63-all-equip:${avatar}:${item.id}`, '2026-09-02T02:00:00.000Z');
    assert.equal(equipped.result.ok, true, `${avatar}:${item.id} equip/use failed: ${equipped.result.reason ?? ''}`);
    assert.equal(equipped.result.equipped, true, `${avatar}:${item.id} did not enter selected state`);
    const serialized = normalizeProgress(JSON.parse(JSON.stringify(equipped.next.child1)));
    assert.ok(serialized.equippedCosmetics?.includes(item.id), `${avatar}:${item.id} selection did not persist`);

    const unequipped = toggleShopItem(equipped.next, 'child1', avatar, item.id, `v63-all-unequip:${avatar}:${item.id}`, '2026-09-02T03:00:00.000Z');
    assert.equal(unequipped.result.ok, true, `${avatar}:${item.id} unequip/unselect failed`);
    assert.equal(unequipped.result.equipped, false, `${avatar}:${item.id} did not leave selected state`);
    assert.ok(!normalizeProgress(unequipped.next.child1).equippedCosmetics?.includes(item.id), `${avatar}:${item.id} unequip did not persist`);
    checks += 1;
  }
}

assert.equal(checks, 63 * 4, 'all-item transaction matrix must cover exactly 63 items × 4 avatars');
console.log(`PASS qa_v63_all_shop_transactions: ${checks}/${63 * 4} item-avatar purchase/equip/persist/unequip flows`);
