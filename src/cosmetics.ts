export type CosmeticSlot = 'hat' | 'glasses' | 'backpack' | 'cape' | 'headphones';

export type CosmeticDefinition = {
  id: string;
  slot: CosmeticSlot;
  name: string;
  description: string;
  cost: number;
  unlockLevel: number;
};

export const cosmetics: CosmeticDefinition[] = [
  { id: 'sunny-explorer-hat', slot: 'hat', name: '探險遮陽帽', description: '戴上帽子，準備出發。', cost: 80, unlockLevel: 2 },
  { id: 'sky-view-glasses', slot: 'glasses', name: '藍天探險眼鏡', description: '找到更多藏在世界裡的小線索。', cost: 120, unlockLevel: 3 },
  { id: 'trail-backpack', slot: 'backpack', name: '旅行小背包', description: '把今天學會的單字都裝進去。', cost: 180, unlockLevel: 5 },
  { id: 'hero-cape', slot: 'cape', name: '冒險英雄披風', description: '完成挑戰後，披風會跟著你一起前進。', cost: 260, unlockLevel: 8 },
  { id: 'story-headphones', slot: 'headphones', name: '故事耳機', description: '專心聽聲音、歌曲與英文句子。', cost: 340, unlockLevel: 10 },
];

export const cosmeticById = new Map(cosmetics.map((item) => [item.id, item]));

export function cosmeticSpend(ids?: string[]) {
  return Array.from(new Set(ids ?? [])).reduce((sum, id) => sum + (cosmeticById.get(id)?.cost ?? 0), 0);
}

export function normalizeEquippedCosmetics(unlocked: string[], equipped?: string[]) {
  const unlockedSet = new Set(unlocked);
  const bySlot = new Map<CosmeticSlot, string>();
  for (const id of equipped ?? []) {
    if (!unlockedSet.has(id)) continue;
    const item = cosmeticById.get(id);
    if (!item) continue;
    bySlot.set(item.slot, id);
  }
  return Array.from(bySlot.values());
}
