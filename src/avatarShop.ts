import {
  cosmeticById,
  cosmeticIsSelectable,
  cosmeticSupportsAvatar,
  cosmetics,
  worldCosmeticSlots,
  type CosmeticDefinition,
} from './cosmetics';
import { legacySlotToEquipmentSlot } from './shopLedger';
import type { ShopItem, ShopItemAvailability } from './types';

function rendererFor(item: CosmeticDefinition): ShopItem['renderer'] {
  if (item.id === 'outfit-racer') return 'full-skin';
  if (item.slot === 'effect') return 'standard-effect';
  if (worldCosmeticSlots.has(item.slot)) return 'world';
  return 'unsupported-legacy';
}

function kindFor(item: CosmeticDefinition): ShopItem['kind'] {
  if (item.slot === 'outfit') return 'skin';
  if (worldCosmeticSlots.has(item.slot)) return 'world';
  return 'accessory';
}

export function toShopItem(item: CosmeticDefinition): ShopItem {
  const renderer = rendererFor(item);
  const available = cosmeticIsSelectable(item) && renderer !== 'unsupported-legacy';
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    cost: item.cost,
    unlockLevel: item.unlockLevel,
    kind: kindFor(item),
    equipmentSlot: legacySlotToEquipmentSlot(item.slot),
    legacySlot: item.slot,
    availability: available ? 'available' : 'unavailable',
    renderer,
  };
}

export const shopItems: ShopItem[] = cosmetics.map(toShopItem);
export const shopItemById = new Map(shopItems.map((item) => [item.id, item]));

export function shopItemAvailability(item: ShopItem, avatarId?: string): ShopItemAvailability {
  const legacy = cosmeticById.get(item.id);
  if (!legacy || !cosmeticSupportsAvatar(legacy, avatarId)) return 'incompatible';
  return item.availability;
}

export function shopItemCanRender(item: ShopItem, avatarId?: string) {
  return shopItemAvailability(item, avatarId) === 'available' && item.renderer !== 'unsupported-legacy';
}

export function shopItemStatusLabel(item: ShopItem, avatarId?: string) {
  const status = shopItemAvailability(item, avatarId);
  if (status === 'incompatible') return '不相容';
  if (status === 'unavailable') return '素材升級中';
  if (item.kind === 'skin') return '完整角色造型';
  if (item.kind === 'accessory') return `標準配件 · ${item.equipmentSlot}`;
  return `世界物件 · ${item.equipmentSlot}`;
}
