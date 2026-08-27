import type { CourseDay, LessonBlock, Subject } from '../types';
import { lessonVideoAssignments } from './videos';

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
    crossTopics: ['輪流與打招呼', '數 1–5 位家人', '中文聲音暖身', 'ABC 初體驗', '本週任務'],
    younger: '只要求跟說單字或做動作，不要求完整句。', older: '鼓勵用完整句自我介紹，再問對方名字。',
    caregiverTip: '第一次使用時請大人先示範；孩子不回答也沒關係，先讓他模仿聲音與動作。', bonus: '全家互相用英文打招呼一次。'
  },
  {
    title: '顏色與形狀基地', emoji: '🎨', bigIdea: '把顏色帶進家裡真實物件，練習看、找、說。',
    vocab: ['red', 'yellow', 'green', 'blue', 'orange', 'purple', 'pink', 'circle', 'square', 'triangle'],
    sentence: 'It is ___.', videos: ['colors', 'happyBambiColors', 'follow'],
    crossSubjects: ['Math', 'English', 'Zhuyin', 'Life', 'Review'],
    crossTopics: ['形狀分類', '找顏色', '顏色＋中文聲音', '交通號誌', '彩虹複習'],
    younger: '能指對顏色就算成功，再邀請說出英文。', older: '要求說 It is red / It is a circle，並加入兩個特徵。',
    caregiverTip: '每教 2–3 個顏色就暫停，立刻請孩子找家中同色物品。', bonus: '找出家中 5 種不同顏色。'
  },
  {
    title: '身體動起來', emoji: '🦸', bigIdea: '用 TPR 動作把 body parts 與 action verbs 連在一起。',
    vocab: ['head', 'shoulders', 'knees', 'toes', 'eyes', 'ears', 'hands', 'feet', 'jump', 'turn'],
    sentence: 'Touch your ___.', videos: ['body', 'follow', 'happy'],
    crossSubjects: ['Science', 'Math', 'English', 'Zhuyin', 'Review'],
    crossTopics: ['五官功能', '數手指腳趾', '動作指令', '身體部位聲音', '動作王'],
    younger: '以「聽指令＋摸對部位」為主。', older: '輪流當小老師發指令，加入 left / right。',
    caregiverTip: '不要要求坐好；本週就是要站起來。用「先聽、再做、最後說」三步驟。', bonus: '玩 3 回合 Simon Says。'
  },
  {
    title: '心情與家人星球', emoji: '💛', bigIdea: '把 family 與 feelings 放進每天都能用的短句。',
    vocab: ['mom', 'dad', 'brother', 'family', 'happy', 'sad', 'angry', 'tired', 'hug', 'love'],
    sentence: 'I am ___. / I love ___.', videos: ['happy', 'hello', 'body'],
    crossSubjects: ['Life', 'Zhuyin', 'Math', 'English', 'Review'],
    crossTopics: ['辨認心情', '家人名字聲音', '數家人', 'I am 句型', '感謝任務'],
    younger: '用表情或指圖選 happy / sad 即可。', older: '說 I am happy because...，原因可先用中文補充。',
    caregiverTip: '不要糾正情緒答案；重點是把真實感受連到英文。', bonus: '睡前對一位家人說 Thank you。'
  },
  {
    title: '動物探險隊', emoji: '🐾', bigIdea: '從寵物、農場到野生動物，練 I have / I see。',
    vocab: ['dog', 'cat', 'bird', 'fish', 'cow', 'pig', 'duck', 'lion', 'shark', 'insect'],
    sentence: 'I see a ___. / I have a ___.', videos: ['pets', 'farm', 'happyBambiWild'],
    crossSubjects: ['Science', 'Math', 'Zhuyin', 'English', 'Review'],
    crossTopics: ['動物住哪裡', '動物數數', '動物聲音配對', '叫聲猜謎', '動物大挑戰'],
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
    crossTopics: ['健康食物', '水果數數', '水果聲音配對', '喜好問答', '小小市場'],
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
    crossTopics: ['整理玩具', '家具形狀', '家用品聲音', '房間尋寶', '好習慣任務'],
    younger: '聽懂 clean up / open / close 並做動作。', older: '用 This is my... 帶大家介紹一個房間。',
    caregiverTip: '第二節最後直接做 3 分鐘真正整理，不要把「生活課」變成只看影片。', bonus: '自己收好今天使用的教材。'
  },
  {
    title: '城市交通隊', emoji: '🚗', bigIdea: '從 car 與 stop/go 延伸到城市場所與安全概念。',
    vocab: ['car', 'bus', 'train', 'bike', 'go', 'stop', 'school', 'park', 'store', 'road'],
    sentence: 'I go to ___ by ___.', videos: ['car', 'colors', 'follow'],
    crossSubjects: ['Life', 'Math', 'English', 'Zhuyin', 'Review'],
    crossTopics: ['交通安全', '數車輪', 'go/stop 指令', '交通工具聲音', '城市地圖'],
    younger: '說交通工具單字＋模仿聲音。', older: '說 I go to school by car 等完整句。',
    caregiverTip: '可拿玩具車排成道路；讓孩子自己設計紅綠燈規則。', bonus: '明天出門時找 3 種交通工具。'
  },
  {
    title: '大自然觀察站', emoji: '🌳', bigIdea: '觀察 sky、sun、tree、water，把英文帶到戶外。',
    vocab: ['sun', 'moon', 'star', 'sky', 'tree', 'flower', 'water', 'mountain', 'big', 'small'],
    sentence: 'I see a ___. It is ___.', videos: ['mountains', 'weather', 'colors'],
    crossSubjects: ['Science', 'Math', 'Zhuyin', 'English', 'Review'],
    crossTopics: ['自然觀察', '大小比較', '自然聲音配對', 'I see 句型', '戶外賓果'],
    younger: '找到並說出 3 個自然物。', older: '用顏色＋大小＋名詞組成描述。',
    caregiverTip: '如果方便，這週至少一次把課程移到陽台、窗邊或戶外。', bonus: '找一片葉子，回家描述顏色與大小。'
  },
  {
    title: 'ABC 任務 A–M', emoji: '🔤', bigIdea: '先認字母形狀與代表詞，再逐步加入音素。',
    vocab: ['A apple', 'B ball', 'C cat', 'D dog', 'E egg', 'F fish', 'G grape', 'H hat', 'I ice', 'J juice'],
    sentence: 'A is for apple.', videos: ['alphabet', 'phonics', 'food'],
    crossSubjects: ['English', 'Math', 'Zhuyin', 'Life', 'Review'],
    crossTopics: ['A–E', 'F–J', '英中聲音比較', '字母尋寶', 'A–M 複習'],
    younger: '先認大寫字母＋代表圖像。', older: '加入小寫字母與最基本的字首音。',
    caregiverTip: '不要一次要求背 13 個；每天只鎖定 2–3 個，再從舊字母中穿插辨認。', bonus: '在包裝或書上找到 5 個英文字母。'
  },
  {
    title: 'ABC 任務 N–Z', emoji: '🧩', bigIdea: '完成 N–Z，並把全套 ABC 變成辨識與配對遊戲。',
    vocab: ['N nose', 'O orange', 'P pig', 'Q queen', 'R red', 'S sun', 'T toy', 'U umbrella', 'V van', 'W water'],
    sentence: '___ is for ___.', videos: ['phonics', 'alphabet', 'colors'],
    crossSubjects: ['English', 'Math', 'Zhuyin', 'Life', 'Review'],
    crossTopics: ['N–R', 'S–W', 'X–Z＋中文聲音比較', 'ABC 排序', 'A–Z 闖關'],
    younger: '以圖像配對字母為主。', older: '說出字首音並試找另一個同音開頭單字。',
    caregiverTip: '孩子把字母名稱和音混在一起很正常；V1 目標是熟悉，不做正式 phonics 測驗。', bonus: '一起唱一遍 ABC，不要求完全跟上。'
  },
  {
    title: '中英聲音橋', emoji: '🌉', bigIdea: '利用熟悉的中文詞與英文主題建立聲音敏感度，不互相混成考試。',
    vocab: ['ball 球', 'pig 豬', 'moon 月亮', 'fish 魚', 'dog 狗', 'toy 玩具', 'nose 鼻子', 'lion 獅子', 'grape 葡萄', 'cat 貓'],
    sentence: '這個詞從哪個聲音開始？', videos: ['happyBambiWild', 'happyBambiSea', 'alphabet'],
    crossSubjects: ['Zhuyin', 'English', 'Zhuyin', 'Math', 'Review'],
    crossTopics: ['中文開頭聲音', '英文聲音比較', '聽音找圖', '聲音配對', '雙語挑戰'],
    younger: '聽聲音、跟念、找圖片。', older: '嘗試把熟悉詞語拆出第一個聲音。',
    caregiverTip: '中文語音與英文 phonics 分開練習；可以比較，但不要說它們「是一樣的」。', bonus: '從家人名字找出一個中文開頭聲音。'
  },
  {
    title: '恐龍、海洋與太空', emoji: '🦕', bigIdea: '用高興趣主題承載舊單字：大小、顏色、數量、動作。',
    vocab: ['dinosaur', 'shark', 'fish', 'ocean', 'space', 'moon', 'star', 'rocket', 'big', 'fast'],
    sentence: 'It is a ___. It is big / fast.', videos: ['happyBambiSea', 'happyBambiWild', 'mountains'],
    crossSubjects: ['Science', 'Math', 'English', 'Zhuyin', 'Review'],
    crossTopics: ['海洋生物', '數恐龍', '大小速度描述', '主題聲音', '探險家考驗'],
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
    vocab: ['hello', 'colors', 'body', 'family', 'animals', 'numbers', 'food', 'weather', 'ABC', '中文聲音'],
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

const videoFocusLabels: Record<string, string> = {
  greetings: '打招呼與開口說', family: '家庭成員', bilingual: '中英雙語詞彙', alphabet: '英文字母', letters: '字母辨識', phonics: '字母與發音',
  colors: '顏色辨識', shapes: '形狀辨識', find: '看畫面找東西', body: '身體部位', actions: '動作與指令', numbers: '數字與數量',
  feelings: '心情與表情', pets: '寵物', farm: '農場動物', animals: '動物', zoo: '動物與動作', 'wild-animals': '野生動物', sounds: '聽聲音辨識', listening: '聽力辨識',
  addition: '10 以內加法', counting: '數數', fruit: '水果', vegetables: '蔬菜', 'healthy-food': '健康食物', preferences: '喜好問答', food: '食物詞彙',
  weather: '天氣', clothes: '衣服', days: '星期與日曆', home: '家與房間', rooms: '房間', cleaning: '整理與清潔', habits: '生活好習慣',
  transport: '交通工具', car: '汽車與交通', nature: '自然觀察', sky: '天空與星星', outdoors: '戶外自然', 'i-see': 'I see 句型', 'i-have': 'I have 句型',
  dinosaurs: '恐龍', ocean: '海洋生物', space: '太空與星星', speaking: '英文開口與問答',
};

function pickWords(words: string[], day: number) {
  const start = (day * 2) % words.length;
  return Array.from({ length: Math.min(5, words.length) }, (_, i) => words[(start + i) % words.length]);
}

function makeSteps(
  plan: WeekPlan,
  day: number,
  blockNo: 1 | 2,
  words: string[],
  crossTopic: string,
  warmupTitle: string,
  mainTitle: string,
  focusLabel: string,
) {
  const mode = dayModes[day];
  const wordLine = words.join('、');
  if (blockNo === 1) {
    return [
      { minute: '0–4', title: `唱跳開機｜${mode.name}`, instruction: `播放本節唯一暖身〈${warmupTitle}〉。大人先做兩個誇張動作，孩子自由模仿；今天的節奏口令是「${mode.verb}、換邊、再一次」。`, cue: '暖身的目標是喚醒身體與注意力，不要求唱準或一次跟完。' },
      { minute: '4–8', title: '第二輪跟唱', instruction: `再播暖身歌一輪，這次每聽到重複句就加入拍手、踏步或轉身；大人刻意把 ${words[0]} 放進動作口令。` },
      { minute: '8–12', title: '暫停模仿挑戰', instruction: `在暖身歌中選 2 個節點暫停，讓孩子自己示範一個動作。哥哥、弟弟或其他學習者輪流帶隊，不淘汰、不搶答。` },
      { minute: '12–15', title: '暖身收束', instruction: `最後 3 分鐘把動作縮小，快速帶過 ${wordLine}；只要求看、指、跟說，為正式課程〈${mainTitle}〉做準備。` },
      { minute: '15–20', title: `正式課程｜${focusLabel}`, instruction: `播放〈${mainTitle}〉第一輪。先完整看一小段，看到 ${words.slice(0, 2).join('、')} 時各暫停一次，讓孩子指出畫面或實物。` },
      { minute: '20–25', title: '回看＋開口', instruction: `回看最有反應的片段，做「大人說 → 一起說 → 孩子補最後一字」。句型使用「${plan.sentence}」，4 歲可只補關鍵字，6 歲鼓勵完整說。` },
      { minute: '25–30', title: mode.mission, instruction: `完成今天的「${mode.verb}」任務：從 ${words.slice(0, 3).join(' / ')} 選 3 題操作或回答。最後問孩子最喜歡哪一題，再勾選實際完成紀錄。` },
    ];
  }

  return [
    { minute: '0–4', title: `跨域唱跳開機｜${crossTopic}`, instruction: `播放本節另一首唯一暖身〈${warmupTitle}〉。先站起來做大動作，再把「${crossTopic}」想成一個動作暗號。` },
    { minute: '4–8', title: '節奏接龍', instruction: `跟著暖身節拍做「大人一動、孩子一動」接龍；每完成一輪就帶入 ${words[0]} 或 ${words[1]}，讓聲音和動作綁在一起。` },
    { minute: '8–12', title: '孩子當領隊', instruction: `讓其中一位孩子決定下一個拍手、踏步或手勢，其他人跟做；換人前要說出或指出 ${words.slice(0, 2).join(' / ')} 其中一個。` },
    { minute: '12–15', title: '喝水＋任務預告', instruction: `暖身結束後喝水，家長用中文說明今天的「${crossTopic}」玩法，再把關鍵英文、中文聲音或數量概念帶入，不顯示注音符號。` },
    { minute: '15–20', title: `正式素材｜${focusLabel}`, instruction: `播放〈${mainTitle}〉。孩子一指畫面、想回答或出現疑問就暫停，家長不追求看完整支影片。` },
    { minute: '20–25', title: '跨域實作', instruction: `把影片內容移到真實任務：${crossTopic}。使用 ${wordLine} 做找物、配對、數數、動作或問答，依今天主題選最自然的方式。` },
    { minute: '25–30', title: '分齡合作＋收尾', instruction: `${plan.younger}；進階：${plan.older}。最後兩人輪流完成一題「${crossTopic}」，大人只勾實際完成者，再按「完成本節」。` },
    ];
}

function makeBlock(plan: WeekPlan, weekIndex: number, day: number, blockNo: 1 | 2): LessonBlock {
  const words = pickWords(plan.vocab, day + (blockNo === 2 ? 1 : 0));
  const subject = blockNo === 1 ? 'English' : plan.crossSubjects[day];
  const crossTopic = plan.crossTopics[day];
  const baseId = `w${weekIndex + 1}d${day + 1}b${blockNo}`;
  const assignment = lessonVideoAssignments[baseId];
  if (!assignment) throw new Error(`Missing V2.3 video assignment for ${baseId}`);
  const mainVideo = assignment.main;
  const requiredTopic = assignment.requiredTopic;
  const focusLabel = videoFocusLabels[requiredTopic] ?? plan.title;

  return {
    id: baseId,
    title: blockNo === 1 ? `${dayModes[day].name}｜${plan.title}・英語任務` : `${dayModes[day].name}｜${plan.title}・${crossTopic}`,
    subject,
    duration: 30,
    warmup: assignment.warmup,
    video: mainVideo,
    videoFocus: blockNo === 1 ? focusLabel : `${crossTopic}（${focusLabel}）`,
    requiredVideoTopics: [requiredTopic],
    vocabulary: words,
    sentence: plan.sentence,
    steps: makeSteps(plan, day, blockNo, words, crossTopic, assignment.warmup.title, mainVideo.title, focusLabel),
    missions: [
      {
        id: `${baseId}-m1`,
        title: dayModes[day].mission,
        prompt: `【${plan.title}・${dayModes[day].name}】完成 3 次「${dayModes[day].verb}」：${words.slice(0, 3).join(' / ')}`,
        criteria: `只有孩子真的完成 3 次指定的「${dayModes[day].verb}」才按完成；大人示範不算，答錯後提示再完成可以算。`,
        kind: dayModes[day].kind,
        xp: 10 + day * 2,
        coins: 5 + day,
      },
      {
        id: `${baseId}-m2`,
        title: blockNo === 1 ? '開口任務' : '合作任務',
        prompt: blockNo === 1 ? `【${plan.title}・${dayModes[day].name}】至少開口一次：${plan.sentence}` : `【${plan.title}・${dayModes[day].name}】和兄弟／家人輪流完成「${crossTopic}」一題。`,
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
