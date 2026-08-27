import type { AdventureTheme, Subject } from './types';

export const visualThemeOptions: Array<{
  id: AdventureTheme;
  title: string;
  subtitle: string;
  art: string;
}> = [
  { id: 'hero', title: '星能英雄', subtitle: '皇家藍星際基地、金色能量與英雄光暈', art: 'theme-hero.webp' },
  { id: 'mecha', title: '機甲出擊', subtitle: '深色科技格網、青色雷達與切角裝甲面板', art: 'theme-mecha.webp' },
  { id: 'tank', title: '迷你戰車', subtitle: '橄欖任務地圖、厚重裝甲與戰術標記', art: 'theme-tank.webp' },
  { id: 'racing', title: '極速賽道', subtitle: '紅黑賽道、黃色速度條與前衝動態', art: 'theme-racing.webp' },
  { id: 'creature', title: '奇獸夥伴', subtitle: '紫綠元素世界、柔軟圓角與靈獸光球', art: 'theme-creature.webp' },
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
