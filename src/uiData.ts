import type { AdventureTheme, Subject } from './types';

export const visualThemeOptions: Array<{
  id: AdventureTheme;
  title: string;
  subtitle: string;
  art: string;
}> = [
  { id: 'hero', title: 'Hello Town', subtitle: '打招呼與日常對話', art: 'world-hello.webp' },
  { id: 'mecha', title: 'Color Garden', subtitle: '顏色、形狀與自然觀察', art: 'world-color.webp' },
  { id: 'tank', title: 'Animal Forest', subtitle: '動物、聲音與動作', art: 'world-animal.webp' },
  { id: 'racing', title: 'Food Market', subtitle: '水果、食物與喜好問答', art: 'world-food.webp' },
  { id: 'creature', title: 'Ocean Adventure', subtitle: '海洋、探索與科學', art: 'world-ocean.webp' },
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
