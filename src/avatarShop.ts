import {
  cosmeticById,
  cosmeticIsSelectable,
  cosmeticSupportsAvatar,
  cosmetics,
  worldCosmeticSlots,
  type CosmeticDefinition,
} from './cosmetics';
import { hasAvatarAccessoryContract, hasAvatarSkinContract } from './avatarAssetRegistry';
import { legacySlotToEquipmentSlot } from './shopLedger';
import type { ShopItem, ShopItemAvailability } from './types';

function rendererFor(item: CosmeticDefinition): ShopItem['renderer'] {
  if (item.slot === 'outfit') return 'full-skin';
  if (item.slot === 'hairstyle' || item.slot === 'hat' || item.slot === 'glasses' || item.slot === 'headphones') return 'aligned-overlay';
  if (item.slot === 'backpack' || item.slot === 'cape') return 'split-overlay';
  if (item.slot === 'effect') return 'standard-effect';
  if (worldCosmeticSlots.has(item.slot)) return 'world';
  return 'unsupported-legacy';
}

function previewModeFor(item: CosmeticDefinition): ShopItem['previewMode'] {
  if (item.slot === 'spaceship') return 'ship';
  if (item.slot === 'robot') return 'robot';
  if (item.slot === 'card') return 'card';
  if (item.slot === 'effect') return 'effect';
  if (item.slot === 'room') return 'world';
  return 'avatar';
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
    previewMode: previewModeFor(item),
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
  if (shopItemAvailability(item, avatarId) !== 'available' || item.renderer === 'unsupported-legacy') return false;
  if (item.renderer === 'full-skin') return hasAvatarSkinContract(item.id, avatarId);
  if (item.renderer === 'aligned-overlay' || item.renderer === 'split-overlay' || item.renderer === 'standard-effect') {
    return hasAvatarAccessoryContract(item.id, avatarId);
  }
  return true;
}

export function shopItemStatusLabel(item: ShopItem, avatarId?: string) {
  const status = shopItemAvailability(item, avatarId);
  if (status === 'incompatible') return '此角色尚未支援';
  if (status === 'unavailable') return '新裝備準備中';
  if (item.kind === 'skin') return '完整造型';
  if (item.renderer === 'aligned-overlay') return '可立即試穿';
  if (item.renderer === 'split-overlay') return '可立即試穿';
  if (item.renderer === 'standard-effect') return '冒險特效';
  return '冒險基地收藏';
}
