import type { EquipmentPreviewMode, ShopItem } from './types';

export const previewModeLabels: Record<EquipmentPreviewMode, string> = {
  avatar: '角色試穿室',
  ship: '星際機庫',
  robot: '夥伴基地',
  card: '收藏卡展示',
  effect: '特效舞台',
  world: '冒險基地',
};

export function equipmentPreviewAssetPath(item: ShopItem) {
  const base = import.meta.env?.BASE_URL ?? '/';
  if (item.previewMode === 'ship') return `${base}assets/v6.3/world/ships/${item.id}.webp`;
  if (item.previewMode === 'robot') return `${base}assets/v6.3/world/robots/${item.id}.webp`;
  if (item.previewMode === 'card') return `${base}assets/v6.3/world/cards/${item.id}.webp`;
  if (item.previewMode === 'effect') return `${base}assets/v6.3/world/effects/${item.id}.webp`;
  return undefined;
}

export function previewModeForItem(item?: ShopItem): EquipmentPreviewMode {
  return item?.previewMode ?? 'avatar';
}
