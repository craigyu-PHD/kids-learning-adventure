export type CosmeticSlot = 'hairstyle' | 'outfit' | 'hat' | 'glasses' | 'backpack' | 'cape' | 'headphones' | 'spaceship' | 'room' | 'robot' | 'card' | 'effect';
export type CosmeticRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type CosmeticDefinition = {
  id: string;
  slot: CosmeticSlot;
  name: string;
  description: string;
  cost: number;
  unlockLevel: number;
  rarity?: CosmeticRarity;
};

export const cosmetics: CosmeticDefinition[] = [
  { id:'hair-comet',slot:'hairstyle',name:'彗星短髮',description:'俐落的太空探險髮型。',cost:60,unlockLevel:1,rarity:'common' },
  { id:'hair-wave',slot:'hairstyle',name:'銀河波浪',description:'像銀河一樣有層次。',cost:90,unlockLevel:2,rarity:'common' },
  { id:'hair-spike',slot:'hairstyle',name:'火箭尖刺',description:'準備高速升空。',cost:130,unlockLevel:3,rarity:'rare' },
  { id:'hair-cloud',slot:'hairstyle',name:'雲朵蓬鬆',description:'柔軟又有活力。',cost:150,unlockLevel:4,rarity:'rare' },
  { id:'hair-nebula',slot:'hairstyle',name:'星雲側分',description:'勇者專屬造型。',cost:220,unlockLevel:7,rarity:'epic' },
  { id:'hair-legend',slot:'hairstyle',name:'傳奇星冠髮',description:'Lv.12 後的傳奇髮型。',cost:360,unlockLevel:12,rarity:'legendary' },

  { id:'outfit-cadet',slot:'outfit',name:'星際學員服',description:'小小探險隊標準制服。',cost:70,unlockLevel:1,rarity:'common' },
  { id:'outfit-racer',slot:'outfit',name:'極速飛行服',description:'賽車與火箭任務適用。',cost:130,unlockLevel:3,rarity:'rare' },
  { id:'outfit-mecha',slot:'outfit',name:'機甲訓練服',description:'輕量護甲造型。',cost:190,unlockLevel:5,rarity:'rare' },
  { id:'outfit-ocean',slot:'outfit',name:'深海探索服',description:'海底任務專用。',cost:240,unlockLevel:7,rarity:'epic' },
  { id:'outfit-mage',slot:'outfit',name:'星光魔法服',description:'奇幻世界的發光制服。',cost:310,unlockLevel:10,rarity:'epic' },
  { id:'outfit-legend',slot:'outfit',name:'傳奇英雄裝',description:'最高階冒險裝備。',cost:480,unlockLevel:15,rarity:'legendary' },

  { id:'sunny-explorer-hat',slot:'hat',name:'探險遮陽帽',description:'戴上帽子，準備出發。',cost:80,unlockLevel:2,rarity:'common' },
  { id:'hat-rocket',slot:'hat',name:'火箭隊長帽',description:'火箭徽章隊長帽。',cost:130,unlockLevel:4,rarity:'rare' },
  { id:'hat-ocean',slot:'hat',name:'海洋船長帽',description:'深海世界的藍色帽。',cost:170,unlockLevel:6,rarity:'rare' },
  { id:'hat-mage',slot:'hat',name:'星光魔法帽',description:'閃耀的小小星帽。',cost:250,unlockLevel:9,rarity:'epic' },
  { id:'hat-crown',slot:'hat',name:'傳奇星冠',description:'學期英雄的金色星冠。',cost:420,unlockLevel:14,rarity:'legendary' },

  { id:'sky-view-glasses',slot:'glasses',name:'藍天探險眼鏡',description:'找到更多藏在世界裡的小線索。',cost:120,unlockLevel:3,rarity:'common' },
  { id:'glasses-racer',slot:'glasses',name:'極速護目鏡',description:'高速任務專用。',cost:150,unlockLevel:4,rarity:'rare' },
  { id:'glasses-star',slot:'glasses',name:'星星鏡框',description:'看見更多星光。',cost:190,unlockLevel:6,rarity:'rare' },
  { id:'glasses-holo',slot:'glasses',name:'全息 HUD 鏡',description:'透明資訊鏡片。',cost:280,unlockLevel:9,rarity:'epic' },
  { id:'glasses-legend',slot:'glasses',name:'傳奇金鏡',description:'傳奇英雄專屬。',cost:410,unlockLevel:13,rarity:'legendary' },

  { id:'trail-backpack',slot:'backpack',name:'旅行小背包',description:'把今天學會的單字都裝進去。',cost:180,unlockLevel:5,rarity:'common' },
  { id:'pack-rocket',slot:'backpack',name:'迷你火箭背包',description:'背上小型推進器。',cost:250,unlockLevel:7,rarity:'rare' },
  { id:'pack-treasure',slot:'backpack',name:'寶箱背包',description:'收藏任務獎勵。',cost:290,unlockLevel:8,rarity:'epic' },
  { id:'pack-ocean',slot:'backpack',name:'潛水氣泡背包',description:'海底探險造型。',cost:320,unlockLevel:10,rarity:'epic' },
  { id:'pack-legend',slot:'backpack',name:'傳奇能源背包',description:'持續閃耀的能源核心。',cost:460,unlockLevel:14,rarity:'legendary' },

  { id:'hero-cape',slot:'cape',name:'冒險英雄披風',description:'完成挑戰後，披風會跟著你一起前進。',cost:260,unlockLevel:8,rarity:'rare' },
  { id:'cape-sky',slot:'cape',name:'天空披風',description:'輕盈的天空藍披風。',cost:300,unlockLevel:9,rarity:'epic' },
  { id:'cape-nebula',slot:'cape',name:'星雲披風',description:'紫色星雲質感。',cost:350,unlockLevel:11,rarity:'epic' },
  { id:'cape-ocean',slot:'cape',name:'深海披風',description:'水波紋探險披風。',cost:370,unlockLevel:12,rarity:'epic' },
  { id:'cape-legend',slot:'cape',name:'傳奇金翼',description:'最高級英雄背飾。',cost:520,unlockLevel:15,rarity:'legendary' },

  { id:'story-headphones',slot:'headphones',name:'故事耳機',description:'專心聽聲音、歌曲與英文句子。',cost:340,unlockLevel:10,rarity:'rare' },
  { id:'phones-sky',slot:'headphones',name:'天空耳機',description:'藍白配色耳機。',cost:220,unlockLevel:6,rarity:'rare' },
  { id:'phones-racer',slot:'headphones',name:'賽車通訊耳機',description:'任務通訊造型。',cost:280,unlockLevel:8,rarity:'epic' },
  { id:'phones-ai',slot:'headphones',name:'AI 夥伴耳機',description:'與小光一起學習。',cost:360,unlockLevel:11,rarity:'epic' },
  { id:'phones-legend',slot:'headphones',name:'傳奇星環耳機',description:'金色星環耳機。',cost:500,unlockLevel:15,rarity:'legendary' },

  { id:'ship-scout',slot:'spaceship',name:'藍翼偵察艇',description:'首頁火箭升級成輕巧偵察艇。',cost:180,unlockLevel:4,rarity:'rare' },
  { id:'ship-comet',slot:'spaceship',name:'彗星巡航艦',description:'拖著彗星光尾的高速飛船。',cost:330,unlockLevel:9,rarity:'epic' },
  { id:'ship-legend',slot:'spaceship',name:'傳奇星艦',description:'傳奇英雄的黃金旗艦。',cost:560,unlockLevel:15,rarity:'legendary' },

  { id:'room-starlab',slot:'room',name:'星光研究室',description:'把 AI 夥伴基地換成星光研究室。',cost:150,unlockLevel:3,rarity:'common' },
  { id:'room-ocean',slot:'room',name:'深海觀測艙',description:'透明水藍觀測艙與氣泡窗景。',cost:290,unlockLevel:8,rarity:'epic' },
  { id:'room-legend',slot:'room',name:'傳奇指揮艙',description:'金色 HUD 與星際指揮桌。',cost:520,unlockLevel:14,rarity:'legendary' },

  { id:'robot-sky',slot:'robot',name:'小光天空裝甲',description:'小光換上天空藍探索外殼。',cost:160,unlockLevel:4,rarity:'rare' },
  { id:'robot-mecha',slot:'robot',name:'小光機甲裝甲',description:'紫藍機甲外殼與 HUD 眼燈。',cost:300,unlockLevel:9,rarity:'epic' },
  { id:'robot-legend',slot:'robot',name:'小光傳奇裝甲',description:'金色星環版 AI 夥伴造型。',cost:540,unlockLevel:15,rarity:'legendary' },

  { id:'card-sky',slot:'card',name:'天空任務卡',description:'主要任務卡換成天空玻璃邊框。',cost:130,unlockLevel:3,rarity:'common' },
  { id:'card-nebula',slot:'card',name:'星雲任務卡',description:'任務卡加入紫色星雲邊框。',cost:270,unlockLevel:8,rarity:'epic' },
  { id:'card-legend',slot:'card',name:'傳奇任務卡',description:'金色傳奇任務卡外觀。',cost:480,unlockLevel:14,rarity:'legendary' },

  { id:'effect-stars',slot:'effect',name:'星星軌跡',description:'完成與 Hover 時出現低幅星光。',cost:140,unlockLevel:4,rarity:'rare' },
  { id:'effect-bubbles',slot:'effect',name:'氣泡軌跡',description:'海底世界使用柔和氣泡回饋。',cost:250,unlockLevel:7,rarity:'epic' },
  { id:'effect-legend',slot:'effect',name:'傳奇星塵',description:'只在關鍵互動出現的金色星塵。',cost:500,unlockLevel:15,rarity:'legendary' },
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
