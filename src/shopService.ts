import { shopItemAvailability, shopItemById } from './avatarShop';
import { calculateRewards, levelFromXp, normalizeProgress } from './rewards';
import { effectiveEquipmentSlot } from './shopLedger';
import type { AppProgress } from './types';

export type ShopActionResult = { ok: boolean; reason?: string; equipped?: boolean; itemId?: string };
export type ShopMutation = { next: AppProgress; result: ShopActionResult };

export function purchaseShopItem(current: AppProgress, childId: string, avatarId: string | undefined, itemId: string, now = new Date().toISOString()): ShopMutation {
  const item = shopItemById.get(itemId);
  if (!item) return { next: current, result: { ok: false, reason: '商品不存在' } };
  const child = normalizeProgress(current[childId]);
  const availability = shopItemAvailability(item, avatarId);
  const rewards = calculateRewards(child);
  if (availability !== 'available') return { next: current, result: { ok: false, reason: availability === 'incompatible' ? '此造型不相容' : '此商品素材仍在升級' } };
  if (child.unlockedCosmetics?.includes(itemId)) return { next: current, result: { ok: true, reason: '已擁有', itemId } };
  if (levelFromXp(rewards.xp) < item.unlockLevel) return { next: current, result: { ok: false, reason: `需要 Lv.${item.unlockLevel}` } };
  if (rewards.coins < item.cost) return { next: current, result: { ok: false, reason: 'Coins 不足' } };
  const transaction = {
    id: `shop-purchase:${childId}:${itemId}`,
    childId,
    itemId,
    cost: item.cost,
    createdAt: now,
    source: 'purchase' as const,
  };
  const nextChild = normalizeProgress({
    ...child,
    purchaseTransactions: [...(child.purchaseTransactions ?? []), transaction],
    unlockedCosmetics: [...(child.unlockedCosmetics ?? []), itemId],
  });
  return { next: { ...current, [childId]: nextChild }, result: { ok: true, itemId } };
}

export function toggleShopItem(current: AppProgress, childId: string, avatarId: string | undefined, itemId: string, eventId: string, now = new Date().toISOString()): ShopMutation {
  if (!eventId.trim()) return { next: current, result: { ok: false, reason: '裝備事件識別碼不可空白' } };
  const item = shopItemById.get(itemId);
  if (!item) return { next: current, result: { ok: false, reason: '商品不存在' } };
  // Inspect raw events before normalization: a conflicting duplicate must not
  // disappear in its ID map. A retry never toggles or rewrites an old event.
  const existing = Object.entries(current).flatMap(([owner, progress]) =>
    (progress.equipmentTransactions ?? []).filter(tx => tx?.id === eventId).map(tx => ({ owner, tx })));
  if (existing.length) {
    const original = existing[0].tx;
    const content = (tx: typeof original) => JSON.stringify(Object.entries(tx).sort(([a], [b]) => a.localeCompare(b)));
    const matching = existing.every(({ owner, tx }) => owner === childId && tx.childId === childId &&
      tx.itemId === itemId && effectiveEquipmentSlot(tx.slot, tx.itemId) === item.equipmentSlot &&
      content(tx) === content(original));
    if (!matching) return { next: current, result: { ok: false, reason: '裝備事件識別碼已用於不同操作' } };
    const equipped = normalizeProgress(current[childId]).equippedCosmetics?.includes(itemId) ?? false;
    return { next: current, result: { ok: true, equipped, itemId } };
  }
  const child = normalizeProgress(current[childId]);
  const isEquipped = child.equippedCosmetics?.includes(itemId) ?? false;
  if (!child.unlockedCosmetics?.includes(itemId)) return { next: current, result: { ok: false, reason: '尚未擁有此商品' } };
  const availability = shopItemAvailability(item, avatarId);
  if (!isEquipped && availability !== 'available') return { next: current, result: { ok: false, reason: availability === 'incompatible' ? '此造型不相容' : '此商品尚未符合新版 Avatar Contract' } };
  const transaction = {
    id: eventId,
    childId,
    itemId,
    slot: item.equipmentSlot,
    action: isEquipped ? 'unequip' as const : 'equip' as const,
    createdAt: now,
  };
  const nextChild = normalizeProgress({ ...child, equipmentTransactions: [...(child.equipmentTransactions ?? []), transaction] });
  return { next: { ...current, [childId]: nextChild }, result: { ok: true, equipped: !isEquipped, itemId } };
}
