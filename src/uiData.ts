import type { AdventureTheme, Subject } from './types';

export const visualThemeOptions: Array<{
  id: AdventureTheme;
  title: string;
  subtitle: string;
  icon: string;
}> = [
  { id: 'hero', title: '星能英雄', subtitle: '漫畫英雄、能量光束、星際基地', icon: '⚡' },
  { id: 'mecha', title: '機甲出擊', subtitle: '鋼鐵裝甲、雷達、科技面板', icon: '🤖' },
  { id: 'tank', title: '迷你戰車', subtitle: '履帶、任務地圖、戰術基地', icon: '🛞' },
  { id: 'racing', title: '極速賽道', subtitle: '賽車、終點旗、加速光軌', icon: '🏁' },
  { id: 'creature', title: '奇獸夥伴', subtitle: '原創小怪獸、元素徽章、冒險圖鑑', icon: '🐲' },
];

const wordIcons: Record<string, string> = {
  hello: '👋', hi: '🙌', bye: '👋', yes: '✅', no: '🙅', please: '🙏', 'thank you': '💛', friend: '🧑‍🤝‍🧑', teacher: '🧑‍🏫', family: '🏠',
  red: '🔴', yellow: '🟡', green: '🟢', blue: '🔵', purple: '🟣', pink: '🌸', circle: '⭕', square: '🟦', triangle: '🔺',
  head: '🙂', shoulders: '🧍', knees: '🦵', toes: '🦶', eyes: '👀', ears: '👂', hands: '👐', feet: '👣', jump: '⬆️', turn: '🔄',
  mom: '👩', dad: '👨', brother: '👦', happy: '😄', sad: '😢', angry: '😠', tired: '😴', hug: '🤗', love: '❤️',
  dog: '🐶', cat: '🐱', bird: '🐦', fish: '🐟', cow: '🐄', pig: '🐷', duck: '🦆', lion: '🦁', shark: '🦈', insect: '🐞',
  one: '1️⃣', two: '2️⃣', three: '3️⃣', four: '4️⃣', five: '5️⃣', six: '6️⃣', seven: '7️⃣', eight: '8️⃣', nine: '9️⃣', ten: '🔟',
  apple: '🍎', banana: '🍌', orange: '🍊', grape: '🍇', strawberry: '🍓', broccoli: '🥦', pizza: '🍕', juice: '🧃', 'ice cream': '🍨', soup: '🥣',
  sunny: '☀️', rainy: '🌧️', cloudy: '☁️', hot: '🔥', cold: '❄️', shirt: '👕', pants: '👖', shoes: '👟', hat: '🧢', jacket: '🧥',
  home: '🏠', room: '🛏️', bed: '🛏️', table: '🪑', chair: '🪑', toy: '🧸', book: '📘', clean: '✨', open: '📖', close: '📕',
  car: '🚗', bus: '🚌', train: '🚆', bike: '🚲', go: '🟢', stop: '🛑', school: '🏫', park: '🌳', store: '🏪', road: '🛣️',
  sun: '☀️', moon: '🌙', star: '⭐', sky: '🌌', tree: '🌳', flower: '🌼', water: '💧', mountain: '⛰️', big: '🐘', small: '🐭',
  dinosaur: '🦖', ocean: '🌊', space: '🪐', rocket: '🚀', fast: '💨',
};

export function iconForWord(word: string) {
  const normalized = word.toLowerCase().replace(/^([a-z])\s+/, '').trim();
  if (wordIcons[normalized]) return wordIcons[normalized];
  const tail = normalized.split(' ').at(-1) ?? normalized;
  return wordIcons[tail] ?? '✨';
}

export function subjectAction(subject: Subject) {
  const actions: Record<Subject, { icon: string; label: string; text: string }> = {
    English: { icon: '🗣️', label: '嘴巴任務', text: '先聽、再跟說，最後讓孩子自己補一個關鍵字。' },
    Math: { icon: '🧮', label: '手手任務', text: '拿實物排一排、數一數或分一分，答案不是只用嘴巴說。' },
    Zhuyin: { icon: '🔤', label: '耳朵任務', text: '聽開頭聲音、找符號、配圖片；英文和注音分開教。' },
    Life: { icon: '🏠', label: '生活任務', text: '把影片裡的詞立刻帶到家裡真實物品或日常動作。' },
    Science: { icon: '🔎', label: '觀察任務', text: '先猜一猜，再看、摸、比較，讓孩子說出他發現了什麼。' },
    Review: { icon: '🧠', label: '記憶任務', text: '先等 3 秒讓孩子自己想，想不起來再給提示，不搶答。' },
  };
  return actions[subject];
}
