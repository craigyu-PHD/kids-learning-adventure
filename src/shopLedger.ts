import { cosmeticById } from './cosmetics';
import type {
  AvatarAccessorySlot,
  AvatarEquipmentSlot,
  AvatarWorldSlot,
  ChildProgress,
  EquipmentTransaction,
  EquippedAvatar,
  Inventory,
  PurchaseTransaction,
} from './types';

const LEGACY_MIGRATION_AT = '1970-01-01T00:00:00.000Z';

export function legacySlotToEquipmentSlot(slot?: string): AvatarEquipmentSlot {
  if (slot === 'outfit') return 'skin';
  if (slot === 'hairstyle') return 'hair';
  if (slot === 'hat') return 'headwear';
  if (slot === 'headphones') return 'earwear';
  if (slot === 'glasses') return 'face';
  if (slot === 'backpack') return 'backpack';
  if (slot === 'cape') return 'cape';
  if (slot === 'effect') return 'effect';
  if (slot === 'spaceship' || slot === 'room' || slot === 'robot' || slot === 'card') return slot;
  return 'hand';
}

/** Replay old immutable grouped-slot events without rewriting them. New events
 * are written to fine-grained V6.4 slots, while historical `head` / `back`
 * entries resolve through the item's original catalog slot. */
export function effectiveEquipmentSlot(slot: AvatarEquipmentSlot, itemId: string): AvatarEquipmentSlot {
  if (slot !== 'head' && slot !== 'back') return slot;
  const item = cosmeticById.get(itemId);
  return legacySlotToEquipmentSlot(item?.slot);
}

function byStableTime<T extends { id: string; createdAt: string }>(a: T, b: T) {
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

export function normalizePurchaseTransactions(progress?: Partial<ChildProgress> | null): PurchaseTransaction[] {
  const byId = new Map<string, PurchaseTransaction>();
  for (const raw of progress?.purchaseTransactions ?? []) {
    if (!raw?.id || !raw.itemId || !raw.childId || !Number.isFinite(raw.cost)) continue;
    byId.set(raw.id, { ...raw, cost: Math.max(0, Number(raw.cost)) });
  }
  const byItem = new Map<string, PurchaseTransaction>();
  for (const tx of Array.from(byId.values()).sort(byStableTime)) {
    if (!byItem.has(tx.itemId)) byItem.set(tx.itemId, tx);
  }
  for (const itemId of Array.from(new Set(progress?.unlockedCosmetics ?? []))) {
    if (byItem.has(itemId)) continue;
    const item = cosmeticById.get(itemId);
    if (!item) continue;
    byItem.set(itemId, {
      id: `legacy-purchase:${itemId}`,
      childId: 'legacy',
      itemId,
      cost: item.cost,
      createdAt: LEGACY_MIGRATION_AT,
      source: 'legacy-migration',
    });
  }
  return Array.from(byItem.values()).sort(byStableTime);
}

export function inventoryFromProgress(progress?: Partial<ChildProgress> | null): Inventory {
  const purchases = normalizePurchaseTransactions(progress);
  return { itemIds: purchases.map((tx) => tx.itemId), purchases };
}

export function normalizeEquipmentTransactions(progress?: Partial<ChildProgress> | null): EquipmentTransaction[] {
  const byId = new Map<string, EquipmentTransaction>();
  for (const raw of progress?.equipmentTransactions ?? []) {
    if (!raw?.id || !raw.itemId || !raw.childId || !raw.slot || !raw.action) continue;
    byId.set(raw.id, raw);
  }
  const existing = Array.from(byId.values());
  const itemIdsWithEvents = new Set(existing.map((tx) => tx.itemId));
  for (const itemId of progress?.equippedCosmetics ?? []) {
    if (itemIdsWithEvents.has(itemId)) continue;
    const item = cosmeticById.get(itemId);
    if (!item) continue;
    const slot = legacySlotToEquipmentSlot(item.slot);
    byId.set(`legacy-equip:${slot}:${itemId}`, {
      id: `legacy-equip:${slot}:${itemId}`,
      childId: 'legacy',
      itemId,
      slot,
      action: 'equip',
      createdAt: LEGACY_MIGRATION_AT,
    });
  }
  return Array.from(byId.values()).sort(byStableTime);
}

export function equippedItemIdsFromProgress(progress?: Partial<ChildProgress> | null): string[] {
  const inventory = new Set(inventoryFromProgress(progress).itemIds);
  const bySlot = new Map<AvatarEquipmentSlot, string>();
  for (const tx of normalizeEquipmentTransactions(progress)) {
    const slot = effectiveEquipmentSlot(tx.slot, tx.itemId);
    if (tx.action === 'equip') {
      if (inventory.has(tx.itemId)) bySlot.set(slot, tx.itemId);
    } else if (bySlot.get(slot) === tx.itemId) {
      bySlot.delete(slot);
    }
  }
  return Array.from(bySlot.values());
}

export function normalizeShopLedgers(progress?: Partial<ChildProgress> | null) {
  const purchaseTransactions = normalizePurchaseTransactions(progress);
  const unlockedCosmetics = purchaseTransactions.map((tx) => tx.itemId);
  const equipmentTransactions = normalizeEquipmentTransactions({ ...progress, unlockedCosmetics, purchaseTransactions });
  const equippedCosmetics = equippedItemIdsFromProgress({ ...progress, unlockedCosmetics, purchaseTransactions, equipmentTransactions });
  return { purchaseTransactions, equipmentTransactions, unlockedCosmetics, equippedCosmetics };
}

export function spentCoinsFromPurchases(progress?: Partial<ChildProgress> | null) {
  return normalizePurchaseTransactions(progress).reduce((sum, tx) => sum + tx.cost, 0);
}

export function equippedAvatarFromProgress(progress?: Partial<ChildProgress> | null): EquippedAvatar {
  const accessories: Partial<Record<AvatarAccessorySlot, string>> = {};
  const world: Partial<Record<AvatarWorldSlot, string>> = {};
  let skinId = 'default';
  const equipped = new Set(equippedItemIdsFromProgress(progress));
  for (const tx of normalizeEquipmentTransactions(progress)) {
    if (!equipped.has(tx.itemId) || tx.action !== 'equip') continue;
    const slot = effectiveEquipmentSlot(tx.slot, tx.itemId);
    if (slot === 'skin') skinId = tx.itemId;
    else if (slot === 'spaceship' || slot === 'room' || slot === 'robot' || slot === 'card') world[slot] = tx.itemId;
    else accessories[slot] = tx.itemId;
  }
  return { skinId, accessories, world };
}
