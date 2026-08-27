import type { AdventureTheme, Subject } from './types';

export const visualThemeOptions: Array<{
  id: AdventureTheme;
  title: string;
  subtitle: string;
  art: string;
}> = [
  { id: 'hero', title: '星際英雄', subtitle: '深藍宇宙 HUD × 英雄探險', art: 'space-hero.webp' },
  { id: 'mecha', title: '機甲戰士', subtitle: '科技裝甲 × 能量基地', art: 'mecha-warrior.webp' },
  { id: 'racing', title: '賽車冒險', subtitle: '速度賽道 × 勇氣挑戰', art: 'racing-adventure.webp' },
  { id: 'tank', title: '奇幻精靈', subtitle: '魔法森林 × 星光夥伴', art: 'fantasy-spirit.webp' },
  { id: 'creature', title: '海底世界', subtitle: '深海基地 × 海洋探險', art: 'ocean-world.webp' },
];

export function subjectAction(subject: Subject) {
  const actions: Record<Subject, { label: string; text: string }> = {
    English: { label: '嘴巴任務', text: '先聽、再跟說，最後讓孩子自己補一個關鍵字。' },
    Math: { label: '手手任務', text: '拿實物排一排、數一數或分一分，答案不是只用嘴巴說。' },
    Zhuyin: { label: '耳朵任務', text: '聽開頭聲音、找圖片、做配對；英文和中文語音分開練習。' },
    Life: { label: '生活任務', text: '把影片裡的詞立刻帶到家裡真實物品或日常動作。' },
    Science: { label: '觀察任務', text: '先猜一猜，再看、摸、比較，讓孩子說出他發現了什麼。' },
    Review: { label: '記憶任務', text: '先等 3 秒讓孩子自己想，想不起來再給提示，不搶答。' },
  };
  return actions[subject];
}
