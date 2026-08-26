import type { CourseDay, LessonBlock, Subject } from '../types';
import { videos } from './videos';

type WeekPlan = {
  title: string;
  emoji: string;
  bigIdea: string;
  vocab: string[];
  sentence: string;
  videos: string[];
  crossSubjects: Subject[];
  crossTopics: string[];
  younger: string;
  older: string;
  caregiverTip: string;
  bonus: string;
};

const weekPlans: WeekPlan[] = [
  {
    title: 'Hello！一起出發', emoji: '🚀', bigIdea: '建立固定開場儀式，敢開口說 Hello、Bye、Yes、No。',
    vocab: ['hello', 'hi', 'bye', 'yes', 'no', 'please', 'thank you', 'friend', 'teacher', 'family'],
    sentence: 'Hello! My name is ___.', videos: ['hello', 'follow', 'alphabet'],
    crossSubjects: ['Life', 'Math', 'Zhuyin', 'English', 'Review'],
    crossTopics: ['輪流與打招呼', '數 1–5 位家人', 'ㄅㄆㄇ暖身', 'ABC 初體驗', '本週任務'],
    younger: '只要求跟說單字或做動作，不要求完整句。', older: '鼓勵用完整句自我介紹，再問對方名字。',
    caregiverTip: '第一次使用時請大人先示範；孩子不回答也沒關係，先讓他模仿聲音與動作。', bonus: '全家互相用英文打招呼一次。'
  },
  {
    title: '顏色與形狀基地', emoji: '🎨', bigIdea: '把顏色帶進家裡真實物件，練習看、找、說。',
    vocab: ['red', 'yellow', 'green', 'blue', 'orange', 'purple', 'pink', 'circle', 'square', 'triangle'],
    sentence: 'It is ___.', videos: ['colors', 'happyBambiColors', 'follow'],
    crossSubjects: ['Math', 'English', 'Zhuyin', 'Life', 'Review'],
    crossTopics: ['形狀分類', '找顏色', '顏色＋注音', '交通號誌', '彩虹複習'],
    younger: '能指對顏色就算成功，再邀請說出英文。', older: '要求說 It is red / It is a circle，並加入兩個特徵。',
    caregiverTip: '每教 2–3 個顏色就暫停，立刻請孩子找家中同色物品。', bonus: '找出家中 5 種不同顏色。'
  },
  {
    title: '身體動起來', emoji: '🦸', bigIdea: '用 TPR 動作把 body parts 與 action verbs 連在一起。',
    vocab: ['head', 'shoulders', 'knees', 'toes', 'eyes', 'ears', 'hands', 'feet', 'jump', 'turn'],
    sentence: 'Touch your ___.', videos: ['body', 'follow', 'happy'],
    crossSubjects: ['Science', 'Math', 'English', 'Zhuyin', 'Review'],
    crossTopics: ['五官功能', '數手指腳趾', '動作指令', '身體部位注音', '動作王'],
    younger: '以「聽指令＋摸對部位」為主。', older: '輪流當小老師發指令，加入 left / right。',
    caregiverTip: '不要要求坐好；本週就是要站起來。用「先聽、再做、最後說」三步驟。', bonus: '玩 3 回合 Simon Says。'
  },
  {
    title: '心情與家人星球', emoji: '💛', bigIdea: '把 family 與 feelings 放進每天都能用的短句。',
    vocab: ['mom', 'dad', 'brother', 'family', 'happy', 'sad', 'angry', 'tired', 'hug', 'love'],
    sentence: 'I am ___. / I love ___.', videos: ['happy', 'hello', 'body'],
    crossSubjects: ['Life', 'Zhuyin', 'Math', 'English', 'Review'],
    crossTopics: ['辨認心情', '家人名字注音', '數家人', 'I am 句型', '感謝任務'],
    younger: '用表情或指圖選 happy / sad 即可。', older: '說 I am happy because...，原因可先用中文補充。',
    caregiverTip: '不要糾正情緒答案；重點是把真實感受連到英文。', bonus: '睡前對一位家人說 Thank you。'
  },
  {
    title: '動物探險隊', emoji: '🐾', bigIdea: '從寵物、農場到野生動物，練 I have / I see。',
    vocab: ['dog', 'cat', 'bird', 'fish', 'cow', 'pig', 'duck', 'lion', 'shark', 'insect'],
    sentence: 'I see a ___. / I have a ___.', videos: ['pets', 'farm', 'happyBambiWild'],
    crossSubjects: ['Science', 'Math', 'Zhuyin', 'English', 'Review'],
    crossTopics: ['動物住哪裡', '動物數數', '動物ㄅㄆㄇ', '叫聲猜謎', '動物大挑戰'],
    younger: '看圖／聽叫聲後說單字。', older: '加入 It can... / It lives... 的描述。',
    caregiverTip: '讓兄弟輪流模仿動物，另一位猜；競賽只比「完成」，不要比誰比較會。', bonus: '畫一隻最喜歡的動物並說英文名。'
  },
  {
    title: '數字能量站', emoji: '🔢', bigIdea: '把 1–20 放進跳躍、拍手、玩具與簡單加法。',
    vocab: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'],
    sentence: 'I have ___ ___.', videos: ['count20', 'add10', 'happyBambiCounting'],
    crossSubjects: ['Math', 'English', 'Math', 'Life', 'Review'],
    crossTopics: ['1–10 數量對應', '數字英文', '小加法', '生活中的數字', '數字闖關'],
    younger: '先做到一對一點數 1–10。', older: '挑戰 1–20 與 10 以內口頭加法。',
    caregiverTip: '一定用實物：積木、車子、餅乾都可以。孩子算錯時讓他重新排一次，不急著說答案。', bonus: '找出家中 3 個有數字的地方。'
  },
  {
    title: '水果與食物市集', emoji: '🍎', bigIdea: '用真實食物練習 Do you like...? 與 yes/no。',
    vocab: ['apple', 'banana', 'orange', 'grape', 'strawberry', 'broccoli', 'pizza', 'juice', 'ice cream', 'soup'],
    sentence: 'Do you like ___? Yes, I do. / No, I don’t.', videos: ['food', 'happyBambiColors', 'count20'],
    crossSubjects: ['Life', 'Math', 'Zhuyin', 'English', 'Review'],
    crossTopics: ['健康食物', '水果數數', '水果ㄅㄆㄇ', '喜好問答', '小小市場'],
    younger: '回答 Yes / No 再說食物名稱。', older: '完整問答並加入 I like / I don’t like。',
    caregiverTip: '如果家裡剛好有影片中的食物，直接拿出來；實物比再看一次影片更有效。', bonus: '明天早餐前說出 3 個食物英文。'
  },
  {
    title: '衣服與天氣任務', emoji: '🌦️', bigIdea: '看到天氣就選衣服，建立 weather → clothes 的真實連結。',
    vocab: ['sunny', 'rainy', 'cloudy', 'hot', 'cold', 'shirt', 'pants', 'shoes', 'hat', 'jacket'],
    sentence: "It's ___. Put on your ___.", videos: ['weather', 'clothes', 'days'],
    crossSubjects: ['Science', 'Life', 'Math', 'English', 'Review'],
    crossTopics: ['看窗外觀察', '穿衣順序', '一週天氣統計', '天氣播報', '旅行打包'],
    younger: '能依天氣挑對衣服並說單字。', older: '扮演氣象主播說 It’s sunny today。',
    caregiverTip: '每天一定先看窗外，再看影片；讓英文字變成描述「今天」的工具。', bonus: '睡前猜明天天氣並選一件衣服。'
  },
  {
    title: '我的家與好習慣', emoji: '🏠', bigIdea: '把 clean up、room、toy 等詞放進家庭日常。',
    vocab: ['home', 'room', 'bed', 'table', 'chair', 'toy', 'book', 'clean', 'open', 'close'],
    sentence: 'This is my ___. / Clean up, please.', videos: ['cleanup', 'follow', 'hello'],
    crossSubjects: ['Life', 'Math', 'Zhuyin', 'English', 'Review'],
    crossTopics: ['整理玩具', '家具形狀', '家用品注音', '房間尋寶', '好習慣任務'],
    younger: '聽懂 clean up / open / close 並做動作。', older: '用 This is my... 帶大家介紹一個房間。',
    caregiverTip: '第二節最後直接做 3 分鐘真正整理，不要把「生活課」變成只看影片。', bonus: '自己收好今天使用的教材。'
  },
  {
    title: '城市交通隊', emoji: '🚗', bigIdea: '從 car 與 stop/go 延伸到城市場所與安全概念。',
    vocab: ['car', 'bus', 'train', 'bike', 'go', 'stop', 'school', 'park', 'store', 'road'],
    sentence: 'I go to ___ by ___.', videos: ['car', 'colors', 'follow'],
    crossSubjects: ['Life', 'Math', 'English', 'Zhuyin', 'Review'],
    crossTopics: ['交通安全', '數車輪', 'go/stop 指令', '交通工具注音', '城市地圖'],
    younger: '說交通工具單字＋模仿聲音。', older: '說 I go to school by car 等完整句。',
    caregiverTip: '可拿玩具車排成道路；讓孩子自己設計紅綠燈規則。', bonus: '明天出門時找 3 種交通工具。'
  },
  {
    title: '大自然觀察站', emoji: '🌳', bigIdea: '觀察 sky、sun、tree、water，把英文帶到戶外。',
    vocab: ['sun', 'moon', 'star', 'sky', 'tree', 'flower', 'water', 'mountain', 'big', 'small'],
    sentence: 'I see a ___. It is ___.', videos: ['mountains', 'weather', 'colors'],
    crossSubjects: ['Science', 'Math', 'Zhuyin', 'English', 'Review'],
    crossTopics: ['自然觀察', '大小比較', '自然ㄅㄆㄇ', 'I see 句型', '戶外賓果'],
    younger: '找到並說出 3 個自然物。', older: '用顏色＋大小＋名詞組成描述。',
    caregiverTip: '如果方便，這週至少一次把課程移到陽台、窗邊或戶外。', bonus: '找一片葉子，回家描述顏色與大小。'
  },
  {
    title: 'ABC 任務 A–M', emoji: '🔤', bigIdea: '先認字母形狀與代表詞，再逐步加入音素。',
    vocab: ['A apple', 'B ball', 'C cat', 'D dog', 'E egg', 'F fish', 'G grape', 'H hat', 'I ice', 'J juice'],
    sentence: 'A is for apple.', videos: ['alphabet', 'phonics', 'food'],
    crossSubjects: ['English', 'Math', 'Zhuyin', 'Life', 'Review'],
    crossTopics: ['A–E', 'F–J', '英注符號比較', '字母尋寶', 'A–M 複習'],
    younger: '先認大寫字母＋代表圖像。', older: '加入小寫字母與最基本的字首音。',
    caregiverTip: '不要一次要求背 13 個；每天只鎖定 2–3 個，再從舊字母中穿插辨認。', bonus: '在包裝或書上找到 5 個英文字母。'
  },
  {
    title: 'ABC 任務 N–Z', emoji: '🧩', bigIdea: '完成 N–Z，並把全套 ABC 變成辨識與配對遊戲。',
    vocab: ['N nose', 'O orange', 'P pig', 'Q queen', 'R red', 'S sun', 'T toy', 'U umbrella', 'V van', 'W water'],
    sentence: '___ is for ___.', videos: ['phonics', 'alphabet', 'colors'],
    crossSubjects: ['English', 'Math', 'Zhuyin', 'Life', 'Review'],
    crossTopics: ['N–R', 'S–W', 'X–Z＋注音比較', 'ABC 排序', 'A–Z 闖關'],
    younger: '以圖像配對字母為主。', older: '說出字首音並試找另一個同音開頭單字。',
    caregiverTip: '孩子把字母名稱和音混在一起很正常；V1 目標是熟悉，不做正式 phonics 測驗。', bonus: '一起唱一遍 ABC，不要求完全跟上。'
  },
  {
    title: 'ㄅㄆㄇ雙語橋', emoji: '🌉', bigIdea: '利用熟悉的中文詞與英文主題建立符號敏感度，不互相混成考試。',
    vocab: ['ㄅ ball', 'ㄆ pig', 'ㄇ moon', 'ㄈ fish', 'ㄉ dog', 'ㄊ toy', 'ㄋ nose', 'ㄌ lion', 'ㄍ grape', 'ㄎ cat'],
    sentence: '這個詞從哪個聲音開始？', videos: ['happyBambiWild', 'happyBambiSea', 'alphabet'],
    crossSubjects: ['Zhuyin', 'English', 'Zhuyin', 'Math', 'Review'],
    crossTopics: ['ㄅ–ㄈ', '英文聲音比較', 'ㄉ–ㄏ', '符號配對', '雙語挑戰'],
    younger: '聽聲音、跟念、找圖片。', older: '嘗試把熟悉詞語拆出第一個注音符號。',
    caregiverTip: '中文注音與英文 phonics 分開教；可以比較，但不要說它們「是一樣的」。', bonus: '從家人名字找出一個注音開頭。'
  },
  {
    title: '恐龍、海洋與太空', emoji: '🦕', bigIdea: '用高興趣主題承載舊單字：大小、顏色、數量、動作。',
    vocab: ['dinosaur', 'shark', 'fish', 'ocean', 'space', 'moon', 'star', 'rocket', 'big', 'fast'],
    sentence: 'It is a ___. It is big / fast.', videos: ['happyBambiSea', 'happyBambiWild', 'mountains'],
    crossSubjects: ['Science', 'Math', 'English', 'Zhuyin', 'Review'],
    crossTopics: ['海洋生物', '數恐龍', '大小速度描述', '主題注音', '探險家考驗'],
    younger: '先用動作表現 big / fast，再說單字。', older: '嘗試比較：The shark is bigger。',
    caregiverTip: '這週可允許孩子主導：先問「你想知道什麼？」再帶著問題看影片。', bonus: '設計自己的太空生物並取英文名字。'
  },
  {
    title: '混合任務：我真的會了嗎？', emoji: '🎯', bigIdea: '跨主題提取，不按原本順序複習，建立真正的記憶線索。',
    vocab: ['red', 'dog', 'five', 'head', 'apple', 'sunny', 'shoes', 'car', 'happy', 'moon'],
    sentence: 'I see / I like / I have ___.', videos: ['colors', 'pets', 'count20'],
    crossSubjects: ['Review', 'Math', 'Zhuyin', 'English', 'Review'],
    crossTopics: ['快速找物', '混合數數', '符號混搭', '三大句型', '家庭闖關'],
    younger: '答對 5 個核心單字就是成功。', older: '用 3 種句型各造一句。',
    caregiverTip: '這週不要提示太快；等 3–5 秒再給線索，觀察孩子能否自己提取。', bonus: '讓孩子自己出 3 題考大人。'
  },
  {
    title: '小小英文說話家', emoji: '🗣️', bigIdea: '把已知單字串成簡單句型，重點是敢說而不是文法零錯誤。',
    vocab: ['I like', 'I have', 'I see', 'I can', 'I am', 'What is it?', 'Where is it?', 'Yes', 'No', 'Please'],
    sentence: 'I like ___. I have ___. I can ___.', videos: ['food', 'pets', 'follow'],
    crossSubjects: ['English', 'Life', 'Math', 'Zhuyin', 'Review'],
    crossTopics: ['I like', 'I have / I see', '問答輪流', '句子節奏', '家庭秀'],
    younger: '句首由大人說，孩子補最後一個單字。', older: '盡量獨立說完整句，再反問兄弟一題。',
    caregiverTip: '不要每個錯誤都打斷。先回應意思，再自然重述正確版本。', bonus: '晚餐時各說一句 I like...。'
  },
  {
    title: '星際總複習與畢業任務', emoji: '🏆', bigIdea: '用遊戲完成全學期回顧，讓孩子感受到「我做得到」。',
    vocab: ['hello', 'colors', 'body', 'family', 'animals', 'numbers', 'food', 'weather', 'ABC', 'ㄅㄆㄇ'],
    sentence: 'I can learn and play in English!', videos: ['hello', 'follow', 'happy'],
    crossSubjects: ['Review', 'Math', 'English', 'Zhuyin', 'Review'],
    crossTopics: ['十主題快閃', '數字與分類', '英文任務', '符號任務', '畢業派對'],
    younger: '從每個主題挑 1 題，共完成 10 題。', older: '每主題至少完成 1 個單字＋1 個句型挑戰。',
    caregiverTip: '最後一週不要變成考試；允許提示、合作與兄弟互助，目標是回顧與成就感。', bonus: '全家舉行 10 分鐘畢業派對，孩子選最喜歡的一首歌。'
  },
];

const dayModes = [
  { name: '探索日', verb: '認識', mission: '找一找', kind: 'find' as const },
  { name: '動起來', verb: '跟做', mission: '動作挑戰', kind: 'move' as const },
  { name: '配對日', verb: '分類', mission: '配對賽', kind: 'match' as const },
  { name: '小老師', verb: '問答', mission: '輪流出題', kind: 'quiz' as const },
  { name: '任務日', verb: '複習', mission: '本週闖關', kind: 'race' as const },
];

const warmupKeys = ['fruitYummy', 'applesBananas', 'food', 'vegetables', 'countingBananas'];

function pickWords(words: string[], day: number) {
  const start = (day * 2) % words.length;
  return Array.from({ length: Math.min(5, words.length) }, (_, i) => words[(start + i) % words.length]);
}

function makeSteps(plan: WeekPlan, day: number, blockNo: 1 | 2, words: string[], crossTopic?: string) {
  if (blockNo === 1) {
    return [
      { minute: '0–3', title: '美食唱跳開機', instruction: '先播放食物／水果主題暖身歌。大人一起唱、一起做「吃、咬、好吃」等誇張動作；孩子只動不唱也算參與。', cue: '看到喜歡的食物就暫停一下，讓孩子指畫面、說中文也可以，再由大人補上英文。' },
      { minute: '3–6', title: '今天先看這幾個字', instruction: `大人先快速示範：${words.join('、')}。每個字只說 1–2 次，不考試。` },
      { minute: '6–12', title: '影片第一輪', instruction: '播放主題影片。第一次以理解與興趣為主，不需要每句都暫停。', cue: `看到今天的核心字時可暫停 1 次，指著畫面問：「What is it?」` },
      { minute: '12–16', title: '停下來複誦', instruction: `挑 3 個字做「大人說 → 一起說 → 孩子自己說」。如果卡住就回看片段。`, cue: '4 歲可只說單字；6 歲嘗試接上今天的句型。' },
      { minute: '16–21', title: '影片第二輪／回看', instruction: '重播最有反應的 1–2 分鐘。這次大人可以把音量稍微調小，鼓勵孩子補關鍵字。' },
      { minute: '21–27', title: dayModes[day].mission, instruction: `用家裡物品或身體動作完成「${dayModes[day].verb}」任務。兄弟輪流，不淘汰。` },
      { minute: '27–30', title: '收尾三問', instruction: `問：① 今天最記得哪個字？② 再說一次 ${plan.sentence} ③ 最喜歡哪一段？` },
    ];
  }

  return [
    { minute: '0–3', title: '第二節美食重開機', instruction: '換另一首水果、蔬菜或食物短歌。讓孩子喝水、站起來，邊唱邊用手比出「大口吃、好吃、不要」重新集中。' },
    { minute: '3–7', title: `跨域任務：${crossTopic}`, instruction: '大人先用中文說明玩法，再把關鍵英文字／注音／數字帶進去。' },
    { minute: '7–13', title: '素材觀看', instruction: '播放第二段影片，請大人控制節奏；孩子出現想說話、指畫面時就停下來讓他說。' },
    { minute: '13–18', title: '回頭找舊知識', instruction: `刻意混入前幾週學過的 2 個字，問「你還記得嗎？」記不得就直接提示，不扣分。` },
    { minute: '18–24', title: '兄弟合作遊戲', instruction: '一人找／做／回答，另一人當檢查員；下一題交換角色。每位孩子都能拿自己的 XP 與金幣。' },
    { minute: '24–28', title: '難度分流', instruction: `${plan.younger}；進階：${plan.older}` },
    { minute: '28–30', title: '領取今日能量', instruction: '大人勾選每位孩子完成的任務，再按「完成本節」。不要求兩人得分相同。' },
  ];
}

function makeBlock(plan: WeekPlan, weekIndex: number, day: number, blockNo: 1 | 2): LessonBlock {
  const words = pickWords(plan.vocab, day + (blockNo === 2 ? 1 : 0));
  const videoKey = plan.videos[(day + blockNo - 1) % plan.videos.length];
  const warmupKey = warmupKeys[(weekIndex + day + blockNo) % warmupKeys.length];
  const subject = blockNo === 1 ? 'English' : plan.crossSubjects[day];
  const crossTopic = plan.crossTopics[day];
  const baseId = `w${weekIndex + 1}d${day + 1}b${blockNo}`;

  return {
    id: baseId,
    title: blockNo === 1 ? `${dayModes[day].name}｜${plan.title}` : `${crossTopic}｜跨域任務`,
    subject,
    duration: 30,
    warmup: videos[warmupKey],
    video: videos[videoKey],
    vocabulary: words,
    sentence: plan.sentence,
    steps: makeSteps(plan, day, blockNo, words, crossTopic),
    missions: [
      {
        id: `${baseId}-m1`,
        title: dayModes[day].mission,
        prompt: `完成 3 次「${dayModes[day].verb}」：${words.slice(0, 3).join(' / ')}`,
        criteria: `只有孩子真的完成 3 次指定的「${dayModes[day].verb}」才按完成；大人示範不算，答錯後提示再完成可以算。`,
        kind: dayModes[day].kind,
        xp: 10 + day * 2,
        coins: 5 + day,
      },
      {
        id: `${baseId}-m2`,
        title: blockNo === 1 ? '開口任務' : '合作任務',
        prompt: blockNo === 1 ? `至少開口一次：${plan.sentence}` : `和兄弟／家人輪流完成「${crossTopic}」一題。`,
        criteria: blockNo === 1 ? '孩子有主動發出目標單字或句型即可；4 歲只說最後一個關鍵字也算，6 歲鼓勵完整句。' : '孩子有實際輪到一次「回答／操作」才算；只在旁邊看不勾，完成後再按領獎。',
        kind: blockNo === 1 ? 'repeat' : 'roleplay',
        xp: 12 + day * 2,
        coins: 6 + day,
      },
    ],
    younger: plan.younger,
    older: plan.older,
    caregiverTip: plan.caregiverTip,
  };
}

export const curriculum: CourseDay[] = weekPlans.flatMap((plan, weekIndex) =>
  Array.from({ length: 5 }, (_, day) => {
    const index = weekIndex * 5 + day + 1;
    return {
      id: `day-${index}`,
      index,
      week: weekIndex + 1,
      weekday: day + 1,
      title: `${plan.title}｜${dayModes[day].name}`,
      theme: plan.title,
      emoji: plan.emoji,
      bigIdea: plan.bigIdea,
      blocks: [makeBlock(plan, weekIndex, day, 1), makeBlock(plan, weekIndex, day, 2)],
      bonus: plan.bonus,
    } as CourseDay;
  })
);

export const weekSummaries = weekPlans.map((plan, index) => ({
  week: index + 1,
  title: plan.title,
  emoji: plan.emoji,
  bigIdea: plan.bigIdea,
  vocab: plan.vocab,
}));

export const semesterStats = {
  weeks: 18,
  days: curriculum.length,
  blocks: curriculum.length * 2,
  minutes: curriculum.length * 60,
};
