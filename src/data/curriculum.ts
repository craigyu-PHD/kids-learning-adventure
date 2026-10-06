import type { CourseDay, LessonBlock, Subject } from "../types";
import { lessonVideoAssignments } from "./videos";

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
    title: "Hello！一起出發",
    emoji: "🚀",
    bigIdea: "建立固定開場儀式，敢開口說 Hello、Bye、Yes、No。",
    vocab: [
      "hello",
      "hi",
      "bye",
      "yes",
      "no",
      "please",
      "thank you",
      "friend",
      "teacher",
      "family",
    ],
    sentence: "Hello! My name is ___.",
    videos: ["hello", "follow", "alphabet"],
    crossSubjects: ["Life", "Math", "Zhuyin", "English", "Review"],
    crossTopics: [
      "輪流與打招呼",
      "數 1–5 位家人",
      "中文聲音暖身",
      "ABC 初體驗",
      "本週任務",
    ],
    younger: "只要求跟說單字或做動作，不要求完整句。",
    older: "鼓勵用完整句自我介紹，再問對方名字。",
    caregiverTip:
      "第一次使用時請大人先示範；孩子不回答也沒關係，先讓他模仿聲音與動作。",
    bonus: "全家互相用英文打招呼一次。",
  },
  {
    title: "顏色與形狀基地",
    emoji: "🎨",
    bigIdea: "把顏色帶進家裡真實物件，練習看、找、說。",
    vocab: [
      "red",
      "yellow",
      "green",
      "blue",
      "orange",
      "purple",
      "pink",
      "circle",
      "square",
      "triangle",
    ],
    sentence: "It is ___.",
    videos: ["colors", "happyBambiColors", "follow"],
    crossSubjects: ["Math", "English", "Zhuyin", "Life", "Review"],
    crossTopics: [
      "形狀分類",
      "找顏色",
      "顏色＋中文聲音",
      "交通號誌",
      "彩虹複習",
    ],
    younger: "能指對顏色就算成功，再邀請說出英文。",
    older: "要求說 It is red / It is a circle，並加入兩個特徵。",
    caregiverTip: "每教 2–3 個顏色就暫停，立刻請孩子找家中同色物品。",
    bonus: "找出家中 5 種不同顏色。",
  },
  {
    title: "身體動起來",
    emoji: "🦸",
    bigIdea: "用 TPR 動作把 body parts 與 action verbs 連在一起。",
    vocab: [
      "head",
      "shoulders",
      "knees",
      "toes",
      "eyes",
      "ears",
      "hands",
      "feet",
      "jump",
      "turn",
    ],
    sentence: "Touch your ___.",
    videos: ["body", "follow", "happy"],
    crossSubjects: ["Science", "Math", "English", "Zhuyin", "Review"],
    crossTopics: [
      "五官功能",
      "數手指腳趾",
      "動作指令",
      "身體部位聲音",
      "動作王",
    ],
    younger: "以「聽指令＋摸對部位」為主。",
    older: "輪流當小老師發指令，加入 left / right。",
    caregiverTip:
      "不要要求坐好；本週就是要站起來。用「先聽、再做、最後說」三步驟。",
    bonus: "玩 3 回合 Simon Says。",
  },
  {
    title: "心情與家人星球",
    emoji: "💛",
    bigIdea: "把 family 與 feelings 放進每天都能用的短句。",
    vocab: [
      "mom",
      "dad",
      "brother",
      "family",
      "happy",
      "sad",
      "angry",
      "tired",
      "hug",
      "love",
    ],
    sentence: "I am ___. / I love ___.",
    videos: ["happy", "hello", "body"],
    crossSubjects: ["Life", "Zhuyin", "Math", "English", "Review"],
    crossTopics: [
      "辨認心情",
      "家人名字聲音",
      "數家人",
      "I am 句型",
      "感謝任務",
    ],
    younger: "用表情或指圖選 happy / sad 即可。",
    older: "說 I am happy because...，原因可先用中文補充。",
    caregiverTip: "不要糾正情緒答案；重點是把真實感受連到英文。",
    bonus: "睡前對一位家人說 Thank you。",
  },
  {
    title: "動物探險隊",
    emoji: "🐾",
    bigIdea: "從寵物、農場到野生動物，練 I have / I see。",
    vocab: [
      "dog",
      "cat",
      "bird",
      "fish",
      "cow",
      "pig",
      "duck",
      "lion",
      "shark",
      "insect",
    ],
    sentence: "I see a ___. / I have a ___.",
    videos: ["pets", "farm", "happyBambiWild"],
    crossSubjects: ["Science", "Math", "Zhuyin", "English", "Review"],
    crossTopics: [
      "動物住哪裡",
      "動物數數",
      "動物聲音配對",
      "叫聲猜謎",
      "動物大挑戰",
    ],
    younger: "看圖／聽叫聲後說單字。",
    older: "加入 It can... / It lives... 的描述。",
    caregiverTip:
      "讓兄弟輪流模仿動物，另一位猜；競賽只比「完成」，不要比誰比較會。",
    bonus: "畫一隻最喜歡的動物並說英文名。",
  },
  {
    title: "數字能量站",
    emoji: "🔢",
    bigIdea: "把 1–20 放進跳躍、拍手、玩具與簡單加法。",
    vocab: [
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "ten",
    ],
    sentence: "I have ___ ___.",
    videos: ["count20", "add10", "happyBambiCounting"],
    crossSubjects: ["Math", "English", "Math", "Life", "Review"],
    crossTopics: [
      "1–10 數量對應",
      "數字英文",
      "小加法",
      "生活中的數字",
      "數字闖關",
    ],
    younger: "先做到一對一點數 1–10。",
    older: "挑戰 1–20 與 10 以內口頭加法。",
    caregiverTip:
      "一定用實物：積木、車子、餅乾都可以。孩子算錯時讓他重新排一次，不急著說答案。",
    bonus: "找出家中 3 個有數字的地方。",
  },
  {
    title: "水果與食物市集",
    emoji: "🍎",
    bigIdea: "用真實食物練習 Do you like...? 與 yes/no。",
    vocab: [
      "apple",
      "banana",
      "orange",
      "grape",
      "strawberry",
      "broccoli",
      "pizza",
      "juice",
      "ice cream",
      "soup",
    ],
    sentence: "Do you like ___? Yes, I do. / No, I don’t.",
    videos: ["food", "happyBambiColors", "count20"],
    crossSubjects: ["Life", "Math", "Zhuyin", "English", "Review"],
    crossTopics: [
      "健康食物",
      "水果數數",
      "水果聲音配對",
      "喜好問答",
      "小小市場",
    ],
    younger: "回答 Yes / No 再說食物名稱。",
    older: "完整問答並加入 I like / I don’t like。",
    caregiverTip:
      "如果家裡剛好有影片中的食物，直接拿出來；實物比再看一次影片更有效。",
    bonus: "明天早餐前說出 3 個食物英文。",
  },
  {
    title: "衣服與天氣任務",
    emoji: "🌦️",
    bigIdea: "看到天氣就選衣服，建立 weather → clothes 的真實連結。",
    vocab: [
      "sunny",
      "rainy",
      "cloudy",
      "hot",
      "cold",
      "shirt",
      "pants",
      "shoes",
      "hat",
      "jacket",
    ],
    sentence: "It's ___. Put on your ___.",
    videos: ["weather", "clothes", "days"],
    crossSubjects: ["Science", "Life", "Math", "English", "Review"],
    crossTopics: [
      "看窗外觀察",
      "穿衣順序",
      "一週天氣統計",
      "天氣播報",
      "旅行打包",
    ],
    younger: "能依天氣挑對衣服並說單字。",
    older: "扮演氣象主播說 It’s sunny today。",
    caregiverTip:
      "每天一定先看窗外，再看影片；讓英文字變成描述「今天」的工具。",
    bonus: "睡前猜明天天氣並選一件衣服。",
  },
  {
    title: "我的家與好習慣",
    emoji: "🏠",
    bigIdea: "把 clean up、room、toy 等詞放進家庭日常。",
    vocab: [
      "home",
      "room",
      "bed",
      "table",
      "chair",
      "toy",
      "book",
      "clean",
      "open",
      "close",
    ],
    sentence: "This is my ___. / Clean up, please.",
    videos: ["cleanup", "follow", "hello"],
    crossSubjects: ["Life", "Math", "Zhuyin", "English", "Review"],
    crossTopics: [
      "整理玩具",
      "家具形狀",
      "家用品聲音",
      "房間尋寶",
      "好習慣任務",
    ],
    younger: "聽懂 clean up / open / close 並做動作。",
    older: "用 This is my... 帶大家介紹一個房間。",
    caregiverTip:
      "第二節最後直接做 3 分鐘真正整理，不要把「生活課」變成只看影片。",
    bonus: "自己收好今天使用的教材。",
  },
  {
    title: "城市交通隊",
    emoji: "🚗",
    bigIdea: "從 car 與 stop/go 延伸到城市場所與安全概念。",
    vocab: [
      "car",
      "bus",
      "train",
      "bike",
      "go",
      "stop",
      "school",
      "park",
      "store",
      "road",
    ],
    sentence: "I go to ___ by ___.",
    videos: ["car", "colors", "follow"],
    crossSubjects: ["Life", "Math", "English", "Zhuyin", "Review"],
    crossTopics: [
      "交通安全",
      "數車輪",
      "go/stop 指令",
      "交通工具聲音",
      "城市地圖",
    ],
    younger: "說交通工具單字＋模仿聲音。",
    older: "說 I go to school by car 等完整句。",
    caregiverTip: "可拿玩具車排成道路；讓孩子自己設計紅綠燈規則。",
    bonus: "明天出門時找 3 種交通工具。",
  },
  {
    title: "大自然觀察站",
    emoji: "🌳",
    bigIdea: "觀察 sky、sun、tree、water，把英文帶到戶外。",
    vocab: [
      "sun",
      "moon",
      "star",
      "sky",
      "tree",
      "flower",
      "water",
      "mountain",
      "big",
      "small",
    ],
    sentence: "I see a ___. It is ___.",
    videos: ["mountains", "weather", "colors"],
    crossSubjects: ["Science", "Math", "Zhuyin", "English", "Review"],
    crossTopics: [
      "自然觀察",
      "大小比較",
      "自然聲音配對",
      "I see 句型",
      "戶外賓果",
    ],
    younger: "找到並說出 3 個自然物。",
    older: "用顏色＋大小＋名詞組成描述。",
    caregiverTip: "如果方便，這週至少一次把課程移到陽台、窗邊或戶外。",
    bonus: "找一片葉子，回家描述顏色與大小。",
  },
  {
    title: "ABC 任務 A–M",
    emoji: "🔤",
    bigIdea: "先認字母形狀與代表詞，再逐步加入音素。",
    vocab: [
      "A apple",
      "B ball",
      "C cat",
      "D dog",
      "E egg",
      "F fish",
      "G grape",
      "H hat",
      "I ice",
      "J juice",
    ],
    sentence: "A is for apple.",
    videos: ["alphabet", "phonics", "food"],
    crossSubjects: ["English", "Math", "Zhuyin", "Life", "Review"],
    crossTopics: ["A–E", "F–J", "英中聲音比較", "字母尋寶", "A–M 複習"],
    younger: "先認大寫字母＋代表圖像。",
    older: "加入小寫字母與最基本的字首音。",
    caregiverTip:
      "不要一次要求背 13 個；每天只鎖定 2–3 個，再從舊字母中穿插辨認。",
    bonus: "在包裝或書上找到 5 個英文字母。",
  },
  {
    title: "ABC 任務 N–Z",
    emoji: "🧩",
    bigIdea: "完成 N–Z，並把全套 ABC 變成辨識與配對遊戲。",
    vocab: [
      "N nose",
      "O orange",
      "P pig",
      "Q queen",
      "R red",
      "S sun",
      "T toy",
      "U umbrella",
      "V van",
      "W water",
    ],
    sentence: "___ is for ___.",
    videos: ["phonics", "alphabet", "colors"],
    crossSubjects: ["English", "Math", "Zhuyin", "Life", "Review"],
    crossTopics: ["N–R", "S–W", "X–Z＋中文聲音比較", "ABC 排序", "A–Z 闖關"],
    younger: "以圖像配對字母為主。",
    older: "說出字首音並試找另一個同音開頭單字。",
    caregiverTip:
      "孩子把字母名稱和音混在一起很正常；V1 目標是熟悉，不做正式 phonics 測驗。",
    bonus: "一起唱一遍 ABC，不要求完全跟上。",
  },
  {
    title: "中英聲音橋",
    emoji: "🌉",
    bigIdea: "利用熟悉的中文詞與英文主題建立聲音敏感度，不互相混成考試。",
    vocab: [
      "ball 球",
      "pig 豬",
      "moon 月亮",
      "fish 魚",
      "dog 狗",
      "toy 玩具",
      "nose 鼻子",
      "lion 獅子",
      "grape 葡萄",
      "cat 貓",
    ],
    sentence: "這個詞從哪個聲音開始？",
    videos: ["happyBambiWild", "happyBambiSea", "alphabet"],
    crossSubjects: ["Zhuyin", "English", "Zhuyin", "Math", "Review"],
    crossTopics: [
      "中文開頭聲音",
      "英文聲音比較",
      "聽音找圖",
      "聲音配對",
      "雙語挑戰",
    ],
    younger: "聽聲音、跟念、找圖片。",
    older: "嘗試把熟悉詞語拆出第一個聲音。",
    caregiverTip:
      "中文語音與英文 phonics 分開練習；可以比較，但不要說它們「是一樣的」。",
    bonus: "從家人名字找出一個中文開頭聲音。",
  },
  {
    title: "恐龍、海洋與太空",
    emoji: "🦕",
    bigIdea: "用高興趣主題承載舊單字：大小、顏色、數量、動作。",
    vocab: [
      "dinosaur",
      "shark",
      "fish",
      "ocean",
      "space",
      "moon",
      "star",
      "rocket",
      "big",
      "fast",
    ],
    sentence: "It is a ___. It is big / fast.",
    videos: ["happyBambiSea", "happyBambiWild", "mountains"],
    crossSubjects: ["Science", "Math", "English", "Zhuyin", "Review"],
    crossTopics: [
      "海洋生物",
      "數恐龍",
      "大小速度描述",
      "主題聲音",
      "探險家考驗",
    ],
    younger: "先用動作表現 big / fast，再說單字。",
    older: "嘗試比較：The shark is bigger。",
    caregiverTip:
      "這週可允許孩子主導：先問「你想知道什麼？」再帶著問題看影片。",
    bonus: "設計自己的太空生物並取英文名字。",
  },
  {
    title: "混合任務：我真的會了嗎？",
    emoji: "🎯",
    bigIdea: "跨主題提取，不按原本順序複習，建立真正的記憶線索。",
    vocab: [
      "red",
      "dog",
      "five",
      "head",
      "apple",
      "sunny",
      "shoes",
      "car",
      "happy",
      "moon",
    ],
    sentence: "I see / I like / I have ___.",
    videos: ["colors", "pets", "count20"],
    crossSubjects: ["Review", "Math", "Zhuyin", "English", "Review"],
    crossTopics: ["快速找物", "混合數數", "符號混搭", "三大句型", "家庭闖關"],
    younger: "答對 5 個核心單字就是成功。",
    older: "用 3 種句型各造一句。",
    caregiverTip: "這週不要提示太快；等 3–5 秒再給線索，觀察孩子能否自己提取。",
    bonus: "讓孩子自己出 3 題考大人。",
  },
  {
    title: "小小英文說話家",
    emoji: "🗣️",
    bigIdea: "把已知單字串成簡單句型，重點是敢說而不是文法零錯誤。",
    vocab: [
      "I like",
      "I have",
      "I see",
      "I can",
      "I am",
      "What is it?",
      "Where is it?",
      "Yes",
      "No",
      "Please",
    ],
    sentence: "I like ___. I have ___. I can ___.",
    videos: ["food", "pets", "follow"],
    crossSubjects: ["English", "Life", "Math", "Zhuyin", "Review"],
    crossTopics: ["I like", "I have / I see", "問答輪流", "句子節奏", "家庭秀"],
    younger: "句首由大人說，孩子補最後一個單字。",
    older: "盡量獨立說完整句，再反問兄弟一題。",
    caregiverTip: "不要每個錯誤都打斷。先回應意思，再自然重述正確版本。",
    bonus: "晚餐時各說一句 I like...。",
  },
  {
    title: "星際總複習與畢業任務",
    emoji: "🏆",
    bigIdea: "用遊戲完成全學期回顧，讓孩子感受到「我做得到」。",
    vocab: [
      "hello",
      "colors",
      "body",
      "family",
      "animals",
      "numbers",
      "food",
      "weather",
      "ABC",
      "中文聲音",
    ],
    sentence: "I can learn and play in English!",
    videos: ["hello", "follow", "happy"],
    crossSubjects: ["Review", "Math", "English", "Zhuyin", "Review"],
    crossTopics: [
      "十主題快閃",
      "數字與分類",
      "英文任務",
      "符號任務",
      "畢業派對",
    ],
    younger: "從每個主題挑 1 題，共完成 10 題。",
    older: "每主題至少完成 1 個單字＋1 個句型挑戰。",
    caregiverTip:
      "最後一週不要變成考試；允許提示、合作與兄弟互助，目標是回顧與成就感。",
    bonus: "全家舉行 10 分鐘畢業派對，孩子選最喜歡的一首歌。",
  },
];

const dayModes = [
  { name: "探索日", verb: "認識", mission: "找一找", kind: "find" as const },
  { name: "動起來", verb: "跟做", mission: "動作挑戰", kind: "move" as const },
  { name: "配對日", verb: "分類", mission: "配對賽", kind: "match" as const },
  { name: "小老師", verb: "問答", mission: "輪流出題", kind: "quiz" as const },
  { name: "任務日", verb: "複習", mission: "本週闖關", kind: "race" as const },
];

const videoFocusLabels: Record<string, string> = {
  greetings: "打招呼與開口說",
  family: "家庭成員",
  bilingual: "中英雙語詞彙",
  alphabet: "英文字母",
  letters: "字母辨識",
  phonics: "字母與發音",
  colors: "顏色辨識",
  shapes: "形狀辨識",
  find: "看畫面找東西",
  body: "身體部位",
  actions: "動作與指令",
  numbers: "數字與數量",
  feelings: "心情與表情",
  pets: "寵物",
  farm: "農場動物",
  animals: "動物",
  zoo: "動物與動作",
  "wild-animals": "野生動物",
  sounds: "聽聲音辨識",
  listening: "聽力辨識",
  addition: "10 以內加法",
  counting: "數數",
  fruit: "水果",
  vegetables: "蔬菜",
  "healthy-food": "健康食物",
  preferences: "喜好問答",
  food: "食物詞彙",
  weather: "天氣",
  clothes: "衣服",
  days: "星期與日曆",
  home: "家與房間",
  rooms: "房間",
  cleaning: "整理與清潔",
  habits: "生活好習慣",
  transport: "交通工具",
  car: "汽車與交通",
  nature: "自然觀察",
  sky: "天空與星星",
  outdoors: "戶外自然",
  "i-see": "I see 句型",
  "i-have": "I have 句型",
  dinosaurs: "恐龍",
  ocean: "海洋生物",
  space: "太空與星星",
  speaking: "英文開口與問答",
};

type VideoTeachingProfile = {
  focus: string;
  words: string[];
  caregiverMove: string;
};

/**
 * These are teaching anchors, not decorative weekly vocabulary. Every clip is
 * authored from its declared video topic, and title-specific entries narrow
 * the words further where a song has a precise, visible focus.
 */
const videoTeachingProfiles: Record<string, VideoTeachingProfile> = {
  greetings: { focus: "招呼與禮貌用語", words: ["hello", "hi", "bye", "thank you"], caregiverMove: "聽到招呼時按停，先讓孩子向畫面揮手，再選一個招呼回應。" },
  family: { focus: "家庭成員", words: ["mom", "dad", "brother", "family"], caregiverMove: "畫面出現家人時按停，請孩子指出角色，再說出一個家人的英文。" },
  colors: { focus: "顏色與畫面辨識", words: ["red", "blue", "yellow", "green"], caregiverMove: "每次顏色出現時按停，讓孩子先指同色物，再跟說顏色。" },
  shapes: { focus: "形狀與空間辨識", words: ["circle", "square", "triangle", "star"], caregiverMove: "看見形狀時按停，請孩子用手在空中畫出它，再說形狀。" },
  body: { focus: "身體部位與動作", words: ["head", "shoulders", "knees", "toes"], caregiverMove: "聽到身體部位時按停，先碰一碰自己的部位，再跟著說。" },
  actions: { focus: "動作指令", words: ["jump", "turn", "go", "stop"], caregiverMove: "聽到動作詞就按停，孩子先做一次，再用英文回應。" },
  feelings: { focus: "心情與表情", words: ["happy", "sad", "angry", "tired"], caregiverMove: "畫面換表情時按停，請孩子模仿表情並選一個心情詞。" },
  animals: { focus: "動物與叫聲", words: ["cat", "dog", "bird", "fish"], caregiverMove: "動物出現時按停，先讓孩子模仿叫聲或動作，再說動物名稱。" },
  pets: { focus: "寵物", words: ["cat", "dog", "fish", "bird"], caregiverMove: "看見寵物時按停，讓孩子指給你看並說牠的名字。" },
  farm: { focus: "農場動物", words: ["cow", "pig", "sheep", "horse"], caregiverMove: "聽到農場動物時按停，孩子做出動作或叫聲後再說單字。" },
  zoo: { focus: "動物動作", words: ["lion", "elephant", "monkey", "tiger"], caregiverMove: "每個動物出現時按停，請孩子用動作表演牠，再選一詞說出來。" },
  "wild-animals": { focus: "野生動物", words: ["lion", "tiger", "zebra", "elephant"], caregiverMove: "看見野生動物時按停，先指出特徵，再說動物名稱。" },
  numbers: { focus: "數字與數量", words: ["one", "two", "three", "four"], caregiverMove: "數字或物品出現時按停，讓孩子一邊指一邊數，不急著背完整串。" },
  counting: { focus: "數數", words: ["one", "two", "three", "four"], caregiverMove: "每一組物品出現時按停，孩子用手指點著一起數。" },
  food: { focus: "食物", words: ["apple", "banana", "pizza", "water"], caregiverMove: "食物出現時按停，孩子指出畫面，再用一個食物詞回答。" },
  fruit: { focus: "水果", words: ["apple", "banana", "orange", "grape"], caregiverMove: "看見水果時按停，請孩子指出同樣的水果或找家裡相似物。" },
  vegetables: { focus: "蔬菜", words: ["carrot", "tomato", "potato", "pea"], caregiverMove: "蔬菜出現時按停，孩子先看顏色與形狀，再跟說名稱。" },
  "healthy-food": { focus: "健康食物", words: ["apple", "carrot", "water", "milk"], caregiverMove: "出現健康食物時按停，請孩子選一個自己願意嘗試的食物。" },
  preferences: { focus: "喜好問答", words: ["like", "don't like", "yes", "no"], caregiverMove: "聽到選擇時按停，孩子用點頭、搖頭或一個英文詞表達喜好。" },
  weather: { focus: "天氣", words: ["sunny", "rainy", "cloudy", "hot"], caregiverMove: "天氣畫面出現時按停，請孩子看窗外或指畫面後說一個天氣詞。" },
  clothes: { focus: "衣物", words: ["hat", "shirt", "shoes", "jacket"], caregiverMove: "衣物出現時按停，孩子先指自己身上的同類衣物，再跟說單字。" },
  days: { focus: "星期與日曆", words: ["one", "two", "three", "four"], caregiverMove: "唱到日期時按停，讓孩子跟著日曆手指數位置；星期名稱由家長口語示範，不強迫背成圖卡。" },
  home: { focus: "家與房間", words: ["home", "bed", "table", "chair"], caregiverMove: "家中物品出現時按停，請孩子在真實空間找一個相同物。" },
  rooms: { focus: "房間", words: ["bedroom", "kitchen", "bathroom", "living room"], caregiverMove: "場景切換時按停，孩子指出房間並做一個該房間的動作。" },
  cleaning: { focus: "整理與清潔", words: ["clean", "wash", "tidy", "put away"], caregiverMove: "清潔動作出現時按停，孩子先做小動作，再跟說動詞。" },
  habits: { focus: "生活好習慣", words: ["brush", "wash", "sleep", "eat"], caregiverMove: "生活步驟出現時按停，請孩子選出自己今天做過的一項。" },
  transport: { focus: "交通工具", words: ["car", "bus", "train", "rocket"], caregiverMove: "交通工具出現時按停，孩子用手比出移動方式，再說名稱。" },
  car: { focus: "汽車與交通", words: ["car", "bus", "stop", "go"], caregiverMove: "交通情境出現時按停，孩子先用手勢做 stop 或 go，再說單字。" },
  nature: { focus: "自然觀察", words: ["tree", "flower", "sun", "sky"], caregiverMove: "自然物出現時按停，孩子指出畫面中的一樣，再在身邊找相近物。" },
  sky: { focus: "天空與星星", words: ["sun", "moon", "star", "sky"], caregiverMove: "看見天空物件時按停，請孩子指一個並說出它。" },
  outdoors: { focus: "戶外自然", words: ["tree", "flower", "bird", "cloud"], caregiverMove: "戶外畫面出現時按停，讓孩子找一樣自然物並跟說。" },
  alphabet: { focus: "英文字母", words: ["a-apple", "b-ball", "c-cat", "d-dog"], caregiverMove: "字母出現時按停，讓孩子用手指描一描，再唸一個字母音。" },
  letters: { focus: "字母辨識", words: ["a-apple", "b-ball", "c-cat", "d-dog"], caregiverMove: "字母出現時按停，請孩子從畫面找出指定的一個。" },
  phonics: { focus: "字母與發音", words: ["a-apple", "b-ball", "c-cat", "d-dog"], caregiverMove: "字母和聲音出現時按停，先聽、再模仿一小段聲音。" },
  sounds: { focus: "聲音辨識", words: ["yes", "no", "happy", "sad"], caregiverMove: "聲音改變時按停，孩子用手勢選有沒有聽到，再說 yes 或 no。" },
  listening: { focus: "聽力辨識", words: ["yes", "no", "what-is-it", "where-is-it"], caregiverMove: "每次播放題目只按一次，先等三秒，讓孩子選答案後才一起確認。" },
  "i-see": { focus: "I see 句型", words: ["I see", "a", "the", "look"], caregiverMove: "看見目標物時按停，家長先示範 I see，再讓孩子補最後一個詞。" },
  "i-have": { focus: "I have 句型", words: ["I have", "a", "my", "one"], caregiverMove: "物品出現時按停，孩子先拿或指一樣物品，再說 I have。" },
  dinosaurs: { focus: "恐龍", words: ["dinosaur", "big", "small", "jump"], caregiverMove: "恐龍出現時按停，孩子用手比大小或做 roar，再說單字。" },
  ocean: { focus: "海洋生物", words: ["fish", "shark", "ocean", "blue"], caregiverMove: "海洋生物出現時按停，孩子模仿游動動作後再說名稱。" },
  space: { focus: "太空與星星", words: ["rocket", "moon", "star", "space"], caregiverMove: "太空物件出現時按停，孩子用手指向畫面並說出一個詞。" },
  speaking: { focus: "英文開口與問答", words: ["hello", "please", "thank you", "bye"], caregiverMove: "聽到可回應的句子時按停，先讓孩子選一個最想說的詞，再一起說完整句。" },
};

function videoAlignedProfile(topic: string, title: string): VideoTeachingProfile {
  const normalizedTitle = title.toLowerCase();
  if (normalizedTitle.includes("i like to draw")) return { focus: "畫圖中的顏色與形狀", words: ["red", "green", "blue", "yellow", "circle", "square"], caregiverMove: "影片畫出顏色或形狀時按停，孩子先指畫面，再說顏色或形狀；可以在紙上畫同一個。" };
  if (normalizedTitle.includes("trick or treat")) return { focus: "萬聖節招呼與角色扮演", words: ["hello", "please", "bye", "thank you"], caregiverMove: "角色來到門前時按停，孩子先揮手說 hello；trick 或 treat 作為家長口語情境提示，不把它誤當成一般自我介紹影片。" };
  if (normalizedTitle.includes("i see something blue")) return { focus: "I see 的顏色觀察", words: ["blue", "red", "yellow", "green"], caregiverMove: "每次聽到顏色時按停，請孩子先在畫面找同色物，再說 I see blue 或只說顏色。" };
  if (normalizedTitle.includes("goodbye") || normalizedTitle.includes("thank you")) return { focus: "招呼與禮貌用語", words: ["bye", "thank you", "hello", "hi"], caregiverMove: "唱到道別或感謝時按停，孩子先揮手，再選一句回應。" };
  return videoTeachingProfiles[topic] ?? { focus: videoFocusLabels[topic] ?? "影片主題", words: ["look", "listen", "say", "show"], caregiverMove: "孩子有反應時就按停，先請他指畫面或做動作，再帶一個英文詞。" };
}

function videoWords(profile: VideoTeachingProfile, seed: number) {
  const start = seed % profile.words.length;
  return Array.from({ length: Math.min(5, profile.words.length) }, (_, index) => profile.words[(start + index) % profile.words.length]);
}

function makeLessonSentence(seed: number, blockNo: 1 | 2, words: string[]) {
  const [first = "this", second = "one", third = "together"] = words;
  const patterns =
    blockNo === 1
      ? [
          `I can find ${first} and say ${second}.`,
          `Show me ${first}, then point to ${second}.`,
          `I see ${first}; I can choose ${second}.`,
          `Do you like ${first} or ${second}? I like ${third}.`,
          `Today I remember ${first}, ${second}, and ${third}.`,
        ]
      : [
          `Let's explore ${first} and ${second} together.`,
          `I can move for ${first} and stop for ${second}.`,
          `Put ${first} with ${second}, then tell me why.`,
          `You choose ${first}; I choose ${second}.`,
          `First ${first}, next ${second}, and finally ${third}.`,
        ];
  // The short target remains speakable; the adventure number makes every
  // block's repeat prompt explicitly lesson-specific instead of recycling a
  // week-one sentence throughout the semester.
  return `Adventure ${seed + 1}: ${patterns[seed % patterns.length]}`;
}

function makePausePrompts(
  words: string[],
  warmupTitle: string,
  mainTitle: string,
  focusLabel: string,
  caregiverMove: string,
) {
  const [first = "this", second = first, third = second] = words;
  return [
    {
      moment: `暖身〈${warmupTitle}〉第一段重複動作結束時`,
      title: "先停下、讓孩子帶動作",
      question: `你剛剛做了哪個動作？先做給我看；等主課出現「${first}」時，再一起說。`,
      followUp: `孩子若只做動作，大人先說 ${first}，再邀請他補最後一個音。`,
      targetWord: first,
    },
    {
      moment: `主課〈${mainTitle}〉出現「${second}」的畫面或歌詞時`,
      title: `把畫面和「${focusLabel}」連起來`,
      question: `你在畫面哪裡看到「${second}」？指給我看，它和「${first}」有什麼不一樣？`,
      followUp: `${caregiverMove} 先接住孩子的指向或單字，再示範一句完整回答，不急著糾正。`,
      targetWord: second,
    },
    {
      moment: `主課第二次回看、出現 ${third} 前`,
      title: "先猜測，再播放答案",
      question: `你猜下一個會是「${third}」嗎？為什麼？我們一起看答案。`,
      followUp: `不論猜對猜錯都先肯定理由，播放後再請孩子用 ${third} 改說一次。`,
      targetWord: third,
    },
  ];
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
  sentence: string,
) {
  const mode = dayModes[day];
  const wordLine = words.join("、");
  if (blockNo === 1) {
    return [
      {
        minute: "0–4",
        title: `唱跳開機｜${mode.name}`,
        instruction: `播放本節唯一暖身〈${warmupTitle}〉。大人先做兩個誇張動作，孩子自由模仿；今天的節奏口令是「${mode.verb}、換邊、再一次」。`,
        cue: "暖身的目標是喚醒身體與注意力，不要求唱準或一次跟完。",
      },
      {
        minute: "4–8",
        title: "第二輪跟唱",
        instruction: `再播暖身歌一輪，這次每聽到重複句就加入拍手、踏步或轉身；大人刻意把 ${words[0]} 放進動作口令。`,
      },
      {
        minute: "8–12",
        title: "暫停模仿挑戰",
        instruction: `在暖身歌中選 2 個節點暫停，讓孩子自己示範一個動作。哥哥、弟弟或其他學習者輪流帶隊，不淘汰、不搶答。`,
      },
      {
        minute: "12–15",
        title: "暖身收束",
        instruction: `最後 3 分鐘把動作縮小，快速帶過 ${wordLine}；只要求看、指、跟說，為正式課程〈${mainTitle}〉做準備。`,
      },
      {
        minute: "15–20",
        title: `正式課程｜${focusLabel}`,
        instruction: `播放〈${mainTitle}〉第一輪。先完整看一小段，看到 ${words.slice(0, 2).join("、")} 時各暫停一次，讓孩子指出畫面或實物。`,
      },
      {
        minute: "20–25",
        title: "回看＋開口",
        instruction: `回看最有反應的片段，做「大人說 → 一起說 → 孩子補最後一字」。本節句型使用「${sentence}」，4 歲可只補關鍵字，6 歲鼓勵完整說。`,
      },
      {
        minute: "25–30",
        title: mode.mission,
        instruction: `完成今天的「${mode.verb}」任務：從 ${words.slice(0, 3).join(" / ")} 選 3 題操作或回答。最後問孩子最喜歡哪一題，再勾選實際完成紀錄。`,
      },
    ];
  }

  return [
    {
      minute: "0–4",
      title: `跨域唱跳開機｜${crossTopic}`,
      instruction: `播放本節另一首唯一暖身〈${warmupTitle}〉。先站起來做大動作，再把「${crossTopic}」想成一個動作暗號。`,
    },
    {
      minute: "4–8",
      title: "節奏接龍",
      instruction: `跟著暖身節拍做「大人一動、孩子一動」接龍；每完成一輪就帶入 ${words[0]} 或 ${words[1]}，讓聲音和動作綁在一起。`,
    },
    {
      minute: "8–12",
      title: "孩子當領隊",
      instruction: `讓其中一位孩子決定下一個拍手、踏步或手勢，其他人跟做；換人前要說出或指出 ${words.slice(0, 2).join(" / ")} 其中一個。`,
    },
    {
      minute: "12–15",
      title: "喝水＋任務預告",
      instruction: `暖身結束後喝水，家長用中文說明今天的「${crossTopic}」玩法，再把關鍵英文、中文聲音或數量概念帶入，不顯示注音符號。`,
    },
    {
      minute: "15–20",
      title: `正式素材｜${focusLabel}`,
      instruction: `播放〈${mainTitle}〉。孩子一指畫面、想回答或出現疑問就暫停，家長不追求看完整支影片。`,
    },
    {
      minute: "20–25",
      title: "跨域實作",
      instruction: `把影片內容移到真實任務：${crossTopic}。使用 ${wordLine} 做找物、配對、數數、動作或問答，依今天主題選最自然的方式。`,
    },
    {
      minute: "25–30",
      title: "分齡合作＋收尾",
      instruction: `${plan.younger}；進階：${plan.older}。最後兩人輪流完成一題「${crossTopic}」，大人只勾實際完成者，再按「完成本節」。`,
    },
  ];
}

function makeBlock(
  plan: WeekPlan,
  weekIndex: number,
  day: number,
  blockNo: 1 | 2,
): LessonBlock {
  const subject = blockNo === 1 ? "English" : plan.crossSubjects[day];
  const crossTopic = plan.crossTopics[day];
  const baseId = `w${weekIndex + 1}d${day + 1}b${blockNo}`;
  const assignment = lessonVideoAssignments[baseId];
  if (!assignment)
    throw new Error(`Missing V2.3 video assignment for ${baseId}`);
  const mainVideo = assignment.main;
  const requiredTopic = assignment.requiredTopic;
  const profile = videoAlignedProfile(requiredTopic, mainVideo.title);
  const seed = weekIndex * 10 + day * 2 + (blockNo - 1);
  // Keep established lesson vocabulary when replacement titles select a different profile.
  const words = baseId === "w1d1b1"
    ? ["hello", "please", "bye", "thank you"]
    : baseId === "w17d1b2"
      ? ["red", "yellow", "green", "blue"]
    : baseId === "w17d4b1"
      ? ["thank you", "bye", "hello", "please"]
    : videoWords(profile, seed);
  const focusLabel = profile.focus;
  const sentence = makeLessonSentence(seed, blockNo, words);
  const younger = `先跟說「${words[0]}」，再用指、做動作或補上句尾「${words[1]}」；不要求一次說完整句。`;
  const older = `先完整說「${sentence}」，再把其中一個關鍵字換成「${words[2] ?? words[1]}」說第二次。`;
  const pausePrompts = makePausePrompts(
    words,
    assignment.warmup.title,
    mainVideo.title,
    focusLabel,
    profile.caregiverMove,
  );

  return reviewedDayThreeGuidance({
    id: baseId,
    title:
      blockNo === 1
        ? `${dayModes[day].name}｜${plan.title}・英語任務`
        : `${dayModes[day].name}｜${plan.title}・${crossTopic}`,
    subject,
    duration: 30,
    warmup: assignment.warmup,
    video: mainVideo,
    videoFocus: blockNo === 1 ? focusLabel : `${crossTopic}（${focusLabel}）`,
    requiredVideoTopics: [requiredTopic],
    videoAnchor: {
      sourceTitle: mainVideo.title,
      focus: focusLabel,
      verifiedWords: words,
      caregiverMove: profile.caregiverMove,
    },
    vocabulary: words,
    sentence,
    steps: makeSteps(
      plan,
      day,
      blockNo,
      words,
      crossTopic,
      assignment.warmup.title,
      mainVideo.title,
      focusLabel,
      sentence,
    ),
    pausePrompts,
    missions: [
      {
        id: `${baseId}-m1`,
        title: dayModes[day].mission,
        prompt: `【${plan.title}・${dayModes[day].name}】完成 3 次「${dayModes[day].verb}」：${words.slice(0, 3).join(" / ")}`,
        criteria: `只有孩子真的完成 3 次指定的「${dayModes[day].verb}」才按完成；大人示範不算，答錯後提示再完成可以算。`,
        kind: dayModes[day].kind,
        xp: 10 + day * 2,
        coins: 5 + day,
      },
      {
        id: `${baseId}-m2`,
        title: blockNo === 1 ? "開口任務" : "合作任務",
        prompt:
          blockNo === 1
            ? `【${plan.title}・${dayModes[day].name}】至少開口一次：${sentence}`
            : `【${plan.title}・${dayModes[day].name}】和兄弟／家人輪流完成「${crossTopic}」一題，最後說：${sentence}`,
        criteria:
          blockNo === 1
            ? "孩子有主動發出目標單字或句型即可；4 歲只說最後一個關鍵字也算，6 歲鼓勵完整句。"
            : "孩子有實際輪到一次「回答／操作」才算；只在旁邊看不勾，完成後再按領獎。",
        kind: blockNo === 1 ? "repeat" : "roleplay",
        xp: 12 + day * 2,
        coins: 6 + day,
      },
    ],
    younger,
    older,
    caregiverTip: plan.caregiverTip,
  });
}

/** Targeted teaching corrections; lesson, video, mission and reward identities stay fixed.
 * Sources: https://supersimple.com/song/the-people-in-my-family/
 * https://supersimple.com/song/here-you-are-thank-you/ (reviewed 2026-09-08).
 * Vocabulary remains the lesson's teaching set, including explicitly marked review words;
 * videoAnchor.verifiedWords is not a claim that every word occurs in the song lyrics.
 */
function legacyReviewedDayThreeGuidance(block: LessonBlock): LessonBlock {
  const eighteenthWeekReview = eighteenthWeekReviewedGuidance[block.id];
  if (eighteenthWeekReview) {
    const reviewed = applyFirstWeekGuidance(block, eighteenthWeekReview);
    const activity = ({ w18d1b2: "小鴨點數與輪流出題", w18d2b2: "動物特徵分類", w18d3b2: "動作指令領隊", w18d4b2: "交通口語與停走", w18d5b2: "能力分享畢業派對" } as Record<string, string>)[block.id];
    const caregiverWarmup = block.id === "w18d3b2" || block.id === "w18d4b1";
    return {
      ...reviewed,
      steps: reviewed.steps.map((step, index) => index === 4
        ? { ...step, title: `正式素材｜${eighteenthWeekReview.focus}` }
        : index === 0 && caregiverWarmup ? { ...step, title: "家長帶暖身｜示範後一起做" }
          : index === 0 && activity ? { ...step, title: `跨域暖身｜${activity}` } : step),
      missions: reviewed.missions.map((mission) => mission.kind === "roleplay" && activity
        ? { ...mission, prompt: mission.prompt.replace(/輪流完成「[^」]+」/, `輪流完成「${activity}」`) }
        : mission),
    };
  }

  const seventeenthWeekReview = seventeenthWeekReviewedGuidance[block.id];
  if (seventeenthWeekReview) {
    const reviewed = applyFirstWeekGuidance(block, seventeenthWeekReview);
    const activity = ({ w17d1b2: "顏色喜好問答", w17d2b2: "招呼道謝告別接力", w17d3b2: "問答輪流與回合點數", w17d4b2: "中英招呼句子節奏", w17d5b2: "玩具願望家庭秀" } as Record<string, string>)[block.id];
    return {
      ...reviewed,
      steps: reviewed.steps.map((step, index) => index === 4
        ? { ...step, title: `正式素材｜${seventeenthWeekReview.focus}` }
        : index === 0 && block.id === "w17d2b1"
          ? { ...step, title: "溫和暖身｜小雞休息手勢" }
          : index === 0 && activity ? { ...step, title: `跨域暖身｜${activity}` } : step),
      missions: reviewed.missions.map((mission) => mission.kind === "roleplay" && activity
        ? { ...mission, prompt: mission.prompt.replace(/輪流完成「[^」]+」/, `輪流完成「${activity}」`) }
        : mission),
    };
  }
  const sixteenthWeekReview = sixteenthWeekReviewedGuidance[block.id];
  if (sixteenthWeekReview) {
    const reviewed = applyFirstWeekGuidance(block, sixteenthWeekReview);
    const activity = ({
      w16d1b2: "南瓜換序點數",
      w16d2b2: "寵物動作與混合點數",
      w16d3b2: "身體位置與中英文名稱",
      w16d4b2: "交通工具句型接棒",
      w16d5b2: "借物禮貌情境",
    } as Record<string, string>)[block.id];
    return {
      ...reviewed,
      steps: reviewed.steps.map((step, index) => index === 4
        ? { ...step, title: `正式素材｜${sixteenthWeekReview.focus}` }
        : index === 0 && block.id === "w16d2b1"
          ? { ...step, title: "溫和暖身｜蝴蝶伸展" }
          : index === 0 && activity ? { ...step, title: `跨域暖身｜${activity}` } : step),
      missions: reviewed.missions.map((mission) => mission.kind === "roleplay" && activity
        ? { ...mission, prompt: mission.prompt.replace(/輪流完成「[^」]+」/, `輪流完成「${activity}」`) }
        : mission),
    };
  }
  const fifteenthWeekReview = fifteenthWeekReviewedGuidance[block.id];
  if (fifteenthWeekReview) {
    const reviewed = applyFirstWeekGuidance(block, fifteenthWeekReview);
    const activity = ({
      w15d1b2: "恐龍大小與動作",
      w15d2b2: "海洋接龍與點數",
      w15d3b2: "月亮與太空概念分類",
      w15d4b2: "中英文名稱接棒",
      w15d5b2: "海洋輪流解說",
    } as Record<string, string>)[block.id];
    return {
      ...reviewed,
      steps: reviewed.steps.map((step, index) => index === 4
        ? { ...step, title: `正式素材｜${fifteenthWeekReview.focus}` }
        : index === 0 && activity
          ? { ...step, title: `跨域暖身｜${activity}` } : step),
      missions: reviewed.missions.map((mission) => mission.kind === "roleplay" && activity
        ? { ...mission, prompt: mission.prompt.replace(/輪流完成「[^」]+」/, `輪流完成「${activity}」`) }
        : mission),
    };
  }
  const fourteenthWeekReview = fourteenthWeekReviewedGuidance[block.id];
  if (fourteenthWeekReview) {
    const reviewed = applyFirstWeekGuidance(block, fourteenthWeekReview);
    return { ...reviewed, steps: reviewed.steps.map((step, index) => index === 4
      ? { ...step, title: `正式素材｜${fourteenthWeekReview.focus}` } : step) };
  }
  const thirteenthWeekReview = thirteenthWeekReviewedGuidance[block.id];
  if (thirteenthWeekReview) {
    const reviewed = applyFirstWeekGuidance(block, thirteenthWeekReview);
    return { ...reviewed, steps: reviewed.steps.map((step, index) => index === 4
      ? { ...step, title: `正式素材｜${thirteenthWeekReview.focus}` } : step) };
  }
  const twelfthWeekReview = twelfthWeekReviewedGuidance[block.id];
  if (twelfthWeekReview) {
    const reviewed = applyFirstWeekGuidance(block, twelfthWeekReview);
    return { ...reviewed, steps: reviewed.steps.map((step, index) => index === 4
      ? { ...step, title: `正式素材｜${twelfthWeekReview.focus}` } : step) };
  }
  const eleventhWeekReview = eleventhWeekReviewedGuidance[block.id];
  if (eleventhWeekReview) {
    const reviewed = applyFirstWeekGuidance(block, eleventhWeekReview);
    return { ...reviewed, steps: reviewed.steps.map((step, index) => index === 4
      ? { ...step, title: `正式素材｜${eleventhWeekReview.focus}` } : step) };
  }
  const tenthWeekReview = tenthWeekReviewedGuidance[block.id];
  if (tenthWeekReview) {
    const reviewed = applyFirstWeekGuidance(block, tenthWeekReview);
    return { ...reviewed, steps: reviewed.steps.map((step, index) => index === 4
      ? { ...step, title: `正式素材｜${tenthWeekReview.focus}` } : step) };
  }
  const ninthWeekReview = ninthWeekReviewedGuidance[block.id];
  if (ninthWeekReview) {
    const reviewed = applyFirstWeekGuidance(block, ninthWeekReview);
    return { ...reviewed, steps: reviewed.steps.map((step, index) => index === 4
      ? { ...step, title: `正式素材｜${ninthWeekReview.focus}` } : step) };
  }
  const eighthWeekReview = eighthWeekReviewedGuidance[block.id];
  if (eighthWeekReview) {
    const reviewed = applyFirstWeekGuidance(block, eighthWeekReview);
    return { ...reviewed, steps: reviewed.steps.map((step, index) => index === 4
      ? { ...step, title: `正式素材｜${eighthWeekReview.focus}` } : step) };
  }
  const seventhWeekReview = seventhWeekReviewedGuidance[block.id];
  if (seventhWeekReview) {
    const reviewed = applyFirstWeekGuidance(block, seventhWeekReview);
    return { ...reviewed, steps: reviewed.steps.map((step, index) => index === 4
      ? { ...step, title: `正式素材｜${seventhWeekReview.focus}` } : step) };
  }
  const sixthWeekReview = sixthWeekReviewedGuidance[block.id];
  if (sixthWeekReview) {
    const reviewed = applyFirstWeekGuidance(block, sixthWeekReview);
    return { ...reviewed, steps: reviewed.steps.map((step, index) => index === 4
      ? { ...step, title: `正式素材｜${sixthWeekReview.focus}` } : step) };
  }
  const fifthWeekReview = fifthWeekReviewedGuidance[block.id];
  if (fifthWeekReview) {
    const reviewed = applyFirstWeekGuidance(block, fifthWeekReview);
    return { ...reviewed, steps: reviewed.steps.map((step, index) => index === 4
      ? { ...step, title: `正式素材｜${fifthWeekReview.focus}` } : step) };
  }
  const fourthWeekReview = fourthWeekReviewedGuidance[block.id];
  if (fourthWeekReview) return applyFirstWeekGuidance(block, fourthWeekReview);
  const thirdWeekReview = thirdWeekReviewedGuidance[block.id];
  if (thirdWeekReview) return applyFirstWeekGuidance(block, thirdWeekReview);
  const secondWeekReview = secondWeekOpeningGuidance[block.id];
  if (secondWeekReview) return applyFirstWeekGuidance(block, secondWeekReview);
  const firstWeekReview = firstWeekReviewedGuidance[block.id];
  if (firstWeekReview) return applyFirstWeekGuidance(block, firstWeekReview);
  if (block.id === 'w1d4b1' || block.id === 'w1d4b2') return reviewedDayFourGuidance(block);
  if (block.id !== 'w1d3b1' && block.id !== 'w1d3b2') return block;
  const family = block.id === 'w1d3b1';
  const sentence = family
    ? 'Adventure 5: My mom and dad are in my family.'
    : 'Adventure 6: Thank you for the toy.';
  const younger = family
    ? '看家人圖卡，先指認 mom 或 dad；大人說句首，孩子補 family 即可。影片用 mother／father，大人說明它們也指媽媽／爸爸。'
    : '收到玩具時先說 thank you，或先做接物、點頭的動作，再跟大人一起說；不要求一次說完整句。';
  const older = family
    ? '先說 My mom and dad are in my family.，再指著 brother 圖卡，用 My brother is in my family. 介紹另一位家人。'
    : '輪流當送物者與收物者；收到玩具時說 Thank you for the toy.，換一樣物品後再練一次道謝。';
  const caregiverTip = family
    ? '準備既有家人圖卡或一張家人照片，不必每個家庭都有相同成員。影片使用 mother／father，圖卡使用 mom／dad；先解釋同義，再請孩子指認。'
    : '準備一件安全、方便傳遞的玩具。主課練習遞物、道謝及回應；hello／hi／bye 是課後延伸的見面與道別複習，不是這首歌的歌詞。中文聲音活動比較「謝謝」與 thank you 的聲音，接受孩子先用中文回應。';
  const pausePrompts: LessonBlock['pausePrompts'] = family ? [
    { moment: '主課介紹父親、畫面出現閱讀動作後', title: '找出爸爸', question: '影片說 father，我們也可以說 dad。你能指出 dad 嗎？', followUp: '先讓孩子指圖，再一起說 dad；不要求在影片聽到 dad 才暫停。', targetWord: 'dad' },
    { moment: '主課介紹母親、畫面出現唱歌動作後', title: '找出媽媽', question: '影片說 mother，我們也可以說 mom。哪一位是 mom？', followUp: '用現有圖卡對照；孩子只指出人物也先接住回應，再示範單字。', targetWord: 'mom' },
    { moment: '主課介紹兄弟、畫面出現盪鞦韆動作後', title: '介紹一位家人', question: '你找到 brother 了嗎？請指給我看，再說 brother。', followUp: '較大的孩子介紹圖中人物；不要求孩子一定有兄弟，也不預設影片下一幕。', targetWord: 'brother' },
  ] : [
    { moment: '主課第一次遞出物品、收物者道謝後', title: '收到東西怎麼說', question: '收到東西時可以說 thank you。你願意跟我說 thank you 嗎？', followUp: '按停後真的傳一次玩具，孩子先接住，再用單字或動作回應。', targetWord: 'thank you' },
    { moment: '主課回應道謝的片段後', title: '交換角色', question: '這次換你送玩具，我收到後說 thank you。接著換你收到，試著說 thank you。', followUp: '大人示範回應道謝的英文；一次只練一個角色，讓孩子有等待及接話的時間。', targetWord: 'thank you' },
    { moment: '主課結束後，另做見面招呼複習', title: '分清招呼和道謝', question: '朋友剛來時說 hello；收到朋友的玩具時說什麼？先示範 hello，再試著道謝。', followUp: '這是延伸活動。hello／hi 用於見面，bye 用於道別，不等影片唱出這三個詞；可先用中文比較「你好」和「謝謝」。', targetWord: 'hello' },
  ];
  const instructions = family ? [
    `播放〈${block.warmup.title}〉，先模仿畫面中的運動動作；留出安全空間，不在歌詞中硬找家人單字。`,
    '選暖身的一小段重播；一人做動作，另一人模仿，再交換。不以唱完整首作為成功條件。',
    '暫停暖身，請每名孩子示範一個剛才的動作；其他人跟做，不淘汰、不搶答。',
    '動作放慢、喝水，拿出 mom、dad、brother、family 圖卡。大人指卡介紹，說明這是接下來主課的家人主題。',
    `播放〈${block.video.title}〉；父親閱讀、母親唱歌及兄弟盪鞦韆後分別暫停，先指人物，再解釋 father／dad、mother／mom 是相對應的稱呼。`,
    '回看家人片段，再看圖卡說 My mom and dad are in my family.。較小孩子補 family；較大孩子另介紹 brother。這是課堂練習句，不要求影片逐字唱出。',
    '做三次家人配對：大人說 mom、dad、brother，孩子各找出對應圖卡。可提示後重試；每名孩子再介紹一位家人，只記實際完成者。',
  ] : [
    `播放〈${block.warmup.title}〉，模仿畫面中的開合與對比動作；先以動作參與，不要求暖身出現道謝詞。`,
    '選一段暖身重播，做「大人一動、孩子一動」接龍；每人輪流帶一次動作。',
    '暫停暖身，孩子選一個剛才的動作讓家人跟做；動作縮小後換下一位，不搶答。',
    '喝水，準備一件玩具。大人示範遞物、接物與道謝，先用中文說清楚今天會輪流扮演兩個角色。',
    `播放〈${block.video.title}〉，在遞物、道謝及回應後暫停；每次停下就用玩具演一次，不等待 hello、hi 或 bye 出現。`,
    '輪流遞玩具，收物者練 Thank you for the toy.；較小孩子只說 thank you。再用中文比較見面說「你好」、收到東西說「謝謝」，各說一次並聽聲音差異。',
    '延伸做三次情境配對：見面打招呼、收到禮物、再見到朋友。見面時 hello 或 hi 都可以，道謝選 thank you；另以 bye 道別。最後每名孩子輪到一次遞物或收物，只有實際回答或操作才記完成。',
  ];
  return {
    ...block, sentence, younger, older, caregiverTip, pausePrompts,
    title: family ? '配對日｜介紹我的家人' : '配對日｜收到玩具說謝謝',
    videoFocus: family
      ? '認識 mom、dad、brother，指認圖卡並介紹一位家人。'
      : '輪流遞物並說 thank you；課後比較「謝謝」與 thank you 的聲音。',
    videoAnchor: {
      ...block.videoAnchor,
      focus: family ? '認識家人稱呼，練習指認與介紹家人。' : '練習遞物、道謝與回應。',
      caregiverMove: caregiverTip,
    },
    steps: block.steps.map((step, index) => ({ ...step, instruction: instructions[index] })),
    missions: block.missions.map((mission, index) => index === 1
      ? { ...mission, prompt: mission.prompt.replace(block.sentence, sentence) }
      : mission),
  };
}

/** Publisher-source review: supersimple.com/song/{lets-take-turns,i-spy}/.
 * Keep the original lesson vocabulary as explicitly marked practice extensions.
 * The song content, practice sentence and warmup activity have distinct roles.
 */
function reviewedDayFourGuidance(block: LessonBlock): LessonBlock {
  const turns = block.id === 'w1d4b1';
  const sentence = turns
    ? 'Adventure 7: Thank you for waiting. Bye!'
    : 'Adventure 8: Where is it? It is here.';
  const younger = turns
    ? '先把玩具交給下一位，再跟說 thank you；遊戲結束時揮手說 bye。能等待、交物或做道別動作也先肯定，再邀請開口。'
    : '大人先指一個位置，孩子用指認或點頭、搖頭回答；再示範 yes 或 no，不要求孩子獨立讀出整個問句。';
  const older = turns
    ? '輪到同伴時先等待，收到玩具後說 Thank you for waiting.；整輪結束才說 Bye!。再交換送物與收物角色。'
    : '一人問 Where is it?，另一人指著找到的物品說 It is here.；再由大人問 Is it here?，孩子依真實位置回答 yes 或 no。';
  const caregiverTip = turns
    ? '準備一件方便傳遞的玩具，讓每個孩子輪到一次。主課教輪流；bye、thank you、hello、hi 是本課情境延伸，不必在歌詞中等這些字。見面可說 hello 或 hi，感謝等待說 thank you，結束才說 bye。'
    : '準備一件玩具及兩個可指認的位置，也可直接用既有圖卡。主課是萬聖節找特徵遊戲，不是字母歌；where-is-it／what-is-it 圖卡代表 Where is it?／What is it?，yes／no 是課堂問答延伸。ABC 初體驗放在課後辨認字母 I，不把它說成影片內容；孩子若不喜歡節慶角色，可暫停改用實物找尋。';
  const pausePrompts: LessonBlock['pausePrompts'] = turns ? [
    { moment: '主課第一次唱到交換輪次後', title: '現在輪到誰', question: '先停一下，把玩具交給下一位。現在誰玩、誰等？有人等你玩完，你願意說 thank you 嗎？', followUp: '每人操作一次；只做等待與交物也先肯定，再由大人示範感謝的說法。', targetWord: 'thank you' },
    { moment: '主課回看另一段輪流片段後', title: '謝謝你等我', question: '同伴等你玩完了，你把玩具交給他時可以說什麼？我們試著說 thank you。', followUp: '這是從輪流延伸的禮貌練習，不要求歌詞包含 thank you；先讓孩子真的完成交接。', targetWord: 'thank you' },
    { moment: '影片結束後，另做招呼與道別問答', title: '開始和結束不一樣', question: '朋友剛來時可以說 hello 或 hi；遊戲結束要離開時，試著說 bye，好嗎？', followUp: '示範一次見面和一次離開，邀請孩子揮手說 bye，不猜影片下一幕會出現哪個詞。', targetWord: 'bye' },
  ] : [
    { moment: '主課唱到 wings、請觀眾找特徵後', title: '找有翅膀的角色', question: '畫面裡哪個角色有翅膀？先指給我看。你找到有翅膀的角色了嗎？找到可以說 yes。', followUp: '大人用中文解釋特徵，孩子不必先會 wings；找到後才另問 Where is it?，孩子指著回應即可。', targetWord: 'yes' },
    { moment: '主課唱到 fins、請觀眾找特徵後', title: '再找一次', question: '這次找有鰭的角色。大人指一個位置問：Is it here? 你覺得是 yes 還是 no？', followUp: '先說明魚鰭是什麼，再依實際指向回答；yes／no 是家長加入的問題，不等待影片唱出。', targetWord: 'yes' },
    { moment: '影片結束後，改用玩具做找物問答', title: '位置找對了嗎', question: '我問 Where is it?，請指出位置。我故意指錯時，你可以說 no，再指出正確位置嗎？', followUp: '先一次只問一題，再用 What is it? 問名稱；答不出名稱也可以拿起物品。課後另寫字母 I 讓孩子指認，這是 ABC 延伸，不是猜影片下一幕。', targetWord: 'no' },
  ];
  const instructions = turns ? [
    `播放暖身〈${block.warmup.title}〉，大人示範繞手、向外拉及拍手；孩子跟做，空間不夠時坐著做手部動作即可。`,
    '選暖身短段回播，跟著指向天花板、地板、窗或門；每名孩子選一個方向讓其他人模仿，不硬插招呼詞進歌詞。',
    '暫停暖身，輪流當小老師，示範繞手、拍手或指方向；其他人等輪次後才換人，不淘汰。',
    '喝水、縮小動作，準備玩具；大人先演一人玩、另一人等，再交給下一位，說清楚輪流規則。',
    `播放〈${block.video.title}〉，在交換輪次的歌段後暫停，用玩具實做一次；不等待 bye、thank you 或 hello 出現。`,
    '延伸練習 Thank you for waiting. Bye!：玩具交接時感謝等待，整輪結束後才道別。較小孩子說 thank you 或 bye；較大孩子分清兩個情境。',
    '輪流問三題：朋友剛來如何招呼、同伴等待後如何感謝、遊戲結束如何道別。hello 或 hi 都可用於見面；每個孩子實際回答或示範三次，再記任務完成。',
  ] : [
    `播放暖身〈${block.warmup.title}〉的一小段。這是搖籃曲，先輕擺、抱玩偶或慢慢伸展，接受坐姿參與，不把它當快速跳舞歌。`,
    '暫停音樂，輪流示範一個輕柔動作，家人跟做；再伸手、踏步喚醒注意力，不反覆被動看完整首。',
    '孩子輪流當領隊，做三個簡單動作；其他人先看再模仿，換人時等待同伴準備好。',
    '喝水，選一件玩具及兩個位置。大人把玩具放好，先問在哪裡，再問是什麼，讓孩子理解兩種問題。',
    `播放〈${block.video.title}〉，找翅膀或鰭等可辨識特徵。每找到一個就暫停指認；家長另加 yes／no 問答，不把延伸詞當成歌詞。`,
    '將找尋遊戲搬到實物：一人問 Where is it?，另一人指物說 It is here.。大人再問名稱，接受中文或已知英文；最後寫一個字母 I，讓孩子比對影片標題開頭，作為 ABC 初體驗。',
    '輪流做三次找物問答：問位置、指出正確位置、指出錯誤位置請孩子否定；用 yes 或 no 回答後換人。每人另練一次位置問答，只有實際參與者才記完成。',
  ];
  return {
    ...block, sentence, younger, older, caregiverTip, pausePrompts,
    title: turns ? '小老師｜輪流玩與禮貌回應' : '小老師｜聽提示找物與字母 I',
    videoFocus: turns ? '從輪流遊戲延伸招呼、感謝與道別。' : '聽特徵找物，再用位置問答與字母 I 做課後延伸。',
    videoAnchor: { ...block.videoAnchor, focus: turns ? '輪流與共同遊戲。' : '依特徵找尋，練習觀察與聆聽。', caregiverMove: caregiverTip },
    steps: block.steps.map((step, index) => ({ ...step, instruction: instructions[index] })),
    missions: block.missions.map((mission, index) => index === 1
      ? { ...mission, prompt: turns
          ? `【Hello！一起出發・小老師】輪流交接玩具後說 thank you，遊戲結束再說 bye；練習句：${sentence}`
          : `【Hello！一起出發・小老師】和家人輪流完成一次位置問答，再指認課後字母 I；練習句：${sentence}` }
      : mission),
  };
}

type ReviewedTeachingGuidance = Pick<LessonBlock, 'title' | 'sentence' | 'videoFocus' | 'younger' | 'older' | 'caregiverTip' | 'pausePrompts'> & {
  focus: string;
  instructions: string[];
  activityLabel?: string;
};

/** Six source-reviewed lessons; exact assigned IDs and teaching/reward identities stay fixed.
 * Publisher descriptions and source bindings are recorded in qa/content-review.
 */
const firstWeekReviewedGuidance: Record<string, ReviewedTeachingGuidance> = {
  "w1d1b1": {
  "title": "探索日｜打招呼與禮貌借玩具",
  "sentence": "Adventure 1: Hello! May I have a turn, please?",
  "videoFocus": "觀察 hello、分享、輪流與 goodbye，停片用共用玩具練禮貌請求與等待同意。",
  "focus": "招呼、輪流借物與片後 please 請求。",
  "younger": "先向角色揮手說 hello；想輪到玩具時跟說 please，收到時說 thank you。一次只示範一個情境，不要求完整長句。",
  "older": "見面先說 Hello!，要輪到玩具時說 May I have a turn, please?；等對方同意後再接物，收到時道謝。",
  "caregiverTip": "準備一件孩子願意輪流使用的玩具。主課直接示範 hello、分享、輪流及 goodbye；bye 是道別短說法。please 和 thank you 用於片後請求與收到物品，May I have a turn, please? 是家長示範的生活句，不要求影片逐字唱出。先問、等對方同意再接物，不強迫借出私人珍愛物品。",
  "pausePrompts": [
    {
      "moment": "主課打招呼段後",
      "title": "見面先讓對方聽見",
      "question": "朋友剛到面前，你願意看向他、揮手說 hello 嗎？",
      "followUp": "等對方回應再開始玩；不要求孩子一定與鏡頭對看，也不由家長連續代兩人回答。",
      "targetWord": "hello"
    },
    {
      "moment": "主課輪流段後，停片拿出共用玩具",
      "title": "請求之後先等待",
      "question": "想輪到玩具，可以先說 please 嗎？說完要立刻拿走，還是等對方同意？",
      "followUp": "示範本課完整請求句；please 是片後加入的用語，孩子說單字加等待也先肯定。",
      "targetWord": "please"
    },
    {
      "moment": "主課道別段後，玩偶準備離開時",
      "title": "玩完了再道別",
      "question": "現在玩完要回家了，請向玩偶說 bye。若它再回來，你會改說什麼？",
      "followUp": "說明 goodbye 與 bye 都用來道別，再讓玩偶回來練 hello；依情境選詞，不背固定口令順序。",
      "targetWord": "bye"
    }
  ],
  "instructions": [
    "播放本堂月份節奏暖身的一小段，跟拍手、拍膝的節奏；先玩聲音與動作，不要求第一天背完十二個月。",
    "選短段回播，讓孩子選拍手或踏步；大人跟著他的選擇做，停音樂時一起停下。",
    "不播放音樂，輪流當節奏小老師，示範兩下拍手或兩下拍膝；家人模仿後換人。",
    "喝水，拿出玩具。用玩偶示範見面、請求輪流、收到玩具及離開四個情境，先用中文說明。",
    "播放 This Is The Way We Make Friends，在打招呼和輪流段各停一次：先揮手，再看誰玩、誰等。拿出共用玩具示範請求，不把歌裡的分享等同隨時可以拿走別人的物品。",
    "實做見面與請求：Hello! May I have a turn, please?。較小孩子只說 hello 或 please；接到玩具時另說 thank you。",
    "做三次認識情境：見面選 hello、請求選 please、離開選 bye。孩子可指字卡、做動作或回答；每人再練一次禮貌請求，只記實際完成。"
  ]
},
  "w1d1b2": {
  "title": "探索日｜歡迎新朋友一起玩",
  "sentence": "Adventure 2: Hi! Come and play with me.",
  "videoFocus": "跟木偶說 hello 並做小動作，片後輪流迎接玩偶、說 hi 與邀請一起玩，最後練道別和道謝。",
  "focus": "歡迎新成員與輪流互動。",
  "younger": "向玩偶揮手說 hello 或 hi，接著把玩具放到同伴旁邊表示邀請；能指認或做動作也可先參與。",
  "older": "輪流當新朋友和迎接者，說 Hi! Come and play with me.；先等同伴回應，再一起玩，不把 hi 和 hello 分成互斥答案。",
  "caregiverTip": "準備玩偶及一件共用玩具。Hello Hello! 主課用 hello 搭配拍手、伸手或踏步邀請回應；hi 是同義招呼，可自然使用。Come and play with me.、bye、thank you 是片後迎接、離開和接受幫忙的活動，不等歌曲唱出。先讓同伴回應再靠近玩，動作可坐著縮小，轉身不需繞圈追逐。",
  "pausePrompts": [
    {
      "moment": "主課 hello 與拍手提示後，停片迎接玩偶",
      "title": "換成自己的招呼",
      "question": "向剛來的玩偶說 hi，再選拍手或揮手邀它回應，好嗎？",
      "followUp": "說明 hi 與 hello 都能招呼；對方回應後才示範 Hi! Come and play with me.，不要求影片有 hi。",
      "targetWord": "hi"
    },
    {
      "moment": "片後玩偶玩完準備離開時",
      "title": "邀請和道別分開",
      "question": "玩偶現在要離開了，你會說 bye 還是請它再進來玩？請用 bye 加揮手演一次。",
      "followUp": "這是新增的道別情境，不是 Hello Hello! 的歌詞題；若想約下次玩可先中文表達。",
      "targetWord": "bye"
    },
    {
      "moment": "片後家人幫忙收回玩具時",
      "title": "謝謝實際的幫忙",
      "question": "家人把散開的玩具收回來，你願意說 thank you 嗎？這次在謝哪個幫忙？",
      "followUp": "先說或指真實發生的事，再道謝；孩子只說 thank you 也可以，不代造他有未發生的幫忙。",
      "targetWord": "thank you"
    }
  ],
  "instructions": [
    "播放小知更鳥暖身短段；以小鳥和貓為動作靈感，輕拍手臂、原地小步走，不在室內追逐。",
    "回播一小段，孩子選小鳥或貓的動作，大人模仿；動作大小依空間調整。",
    "停音樂後輪流做一個小動物動作，其他人先等再跟做；一人一次，不搶隊長。",
    "喝水，拿出玩偶。先用中文示範新朋友到來、迎接、等待回應及一起玩，準備主課的歡迎情境。",
    "播放木偶版 Hello Hello!，在 hello 與一個拍手或伸手提示後暫停；孩子回應一個動作，再對家中玩偶說 hi，將畫面招呼接到真的邀請。",
    "輪流當迎接者，練 Hi! Come and play with me.；較小孩子揮手或補 hi，較大孩子說邀請句後等對方回應。",
    "做三次情境認識：來訪說 hi、離開說 bye、收到幫忙說 thank you。每名孩子再輪到一次邀請或回應，只在實際操作後記完成。"
  ]
},
  "w1d2b1": {
  "title": "動起來｜介紹與陪伴家人",
  "sentence": "Adventure 3: My family can play with me.",
  "videoFocus": "辨認 brother 與 family，將 mother 對照 mom，片後用三張家人卡帶不同陪伴動作。",
  "focus": "家人稱呼與各自活動，延伸一起玩的句型。",
  "younger": "先用圖卡或照片指出一位家人，大人說稱呼，孩子跟說 family、mom 或 dad；也可做一起玩、揮手的動作。",
  "older": "說 My family can play with me.，再指圖介紹一位家人，例如 This is my mom.；也可以選爸爸或其他家人圖卡，練習相應的稱呼。",
  "caregiverTip": "使用既有家人圖卡或自願提供的照片即可，不要求私人照片。主課直接介紹 brother、family，mother/father 與圖卡 mom/dad 是相應稱呼；示範人物不同活動，再用圖卡安排一起玩。歌中兄弟與表親有自己的活動，不說所有家人都一定愛同一種遊戲。沒有兄弟或不想談家人時，介紹圖卡的假想家庭即可。",
  "pausePrompts": [
    {
      "moment": "主課介紹兄弟後，停片拿圖卡",
      "title": "兄弟可以怎麼陪伴",
      "question": "請找 brother 圖卡。你想用傳球手勢還是一起揮手表示和他玩？先做一次讓家人跟。",
      "followUp": "這個動作由孩子選，與歌中兄弟活動分清；不要求孩子真的有兄弟或室內盪鞦韆。",
      "targetWord": "brother"
    },
    {
      "moment": "主課家人重複段後",
      "title": "整個家庭一起歡迎",
      "question": "請找 family 圖卡，張開雙手作歡迎動作；這是在指一位人，還是這個家庭？",
      "followUp": "先看整體圖卡，再讓孩子自己做動作；一家成員不必與歌曲完全相同。",
      "targetWord": "family"
    },
    {
      "moment": "主課母親段後，回到媽媽圖卡",
      "title": "同一人物的兩種稱呼",
      "question": "歌裡用 mother，圖卡用 mom。請指出 mom，再做一個向她打招呼的動作。",
      "followUp": "說清兩種稱呼的關係，再讓孩子自行揮手或點頭；不能只憑性別外觀判陌生真人是不是媽媽。",
      "targetWord": "mom"
    }
  ],
  "instructions": [
    "播放日常作息暖身，模仿洗臉、梳頭或刷牙；用空手做動作，不需要真的拿牙膏和水。",
    "回播一段，讓孩子先聽再跟做；大人故意慢半拍，鼓勵孩子帶一次動作。",
    "停音樂，輪流示範一個早晨動作；其他人跟做，再換人，不要求動作完全一樣。",
    "喝水，拿出 brother、family、mom、dad 圖卡；先分一位家人的稱呼與整個家庭，再預告看片後每張卡帶一個動作。",
    "播放 The People In My Family 的母親、兄弟與全家段，聽稱呼再指圖；說明 mother 對應 mom，片後由孩子選一個陪伴動作，不需真的準備鞦韆或其他器材。",
    "用圖卡練 My family can play with me.，再指一張卡練 This is my mom. 或其他合適稱呼；較小孩子說單字即可。",
    "做三次跟做：拿 brother 卡模仿一起玩、拿 family 卡做歡迎動作、拿 mom 卡模仿揮手。大人先示範再讓每個孩子做；最後介紹一位人物，只記實際參與。"
  ]
},
  "w1d2b2": {
  "title": "動起來｜數一數與揮手道別",
  "sentence": "Adventure 4: Bye! Thank you for playing with me.",
  "videoFocus": "聽道別歌並揮手回應，片後逐一點數人物卡，讓卡片離開與回來時選對招呼。",
  "focus": "道別、感謝與人物數數延伸。",
  "younger": "先揮手說 bye，再跟大人逐一點數 1–3 張家人圖卡；能一對一指認即可，不要求一次數到五。",
  "older": "逐一點數 1–5 張人物卡，再說 Bye! Thank you for playing with me.；改變卡片位置後重數，不把問候詞當數量單位。",
  "caregiverTip": "準備 1–5 張既有家人圖卡，也可用手指代表人物，不要求實際家庭剛好五人。主課提供道別情境，goodbye 可短說 bye；hi/hello、thank you 和人物數數放在片後，由家長明確示範。",
  "pausePrompts": [
    {
      "moment": "主課唱到道別段後",
      "title": "一起揮手",
      "question": "影片在道別，我們可以揮手說 bye 嗎？",
      "followUp": "說明 goodbye 和 bye 都可道別；大人先示範，孩子模仿動作也可參與。",
      "targetWord": "bye"
    },
    {
      "moment": "道別片段後，停片回顧剛才的遊戲",
      "title": "謝謝一起玩",
      "question": "你和同伴玩得開心，願意說 thank you 嗎？",
      "followUp": "先想一件剛才真的一起做的事，再跟說 thank you；本題為片後感謝延伸，不聲稱舊歌曲版逐字唱出此句。",
      "targetWord": "thank you"
    },
    {
      "moment": "影片結束後，圖卡重新加入遊戲時",
      "title": "再見面與數數",
      "question": "人物又來了，先說 hi，再一張一張數，這次有幾位？",
      "followUp": "這是課後延伸，家長用英文數字帶數；hi/hello 都可招呼，不能把哪句招呼當數數的唯一答案。",
      "targetWord": "hi"
    }
  ],
  "instructions": [
    "播放月份節奏暖身短段，拍膝配合節拍；月份只是節奏素材，本堂數學目標仍是課後 1–5 的一對一點數。",
    "回播短段，先拍兩下、再踏兩步，讓孩子選一種動作帶大家做，不要求背月份順序。",
    "停音樂，家長拍 1–3 下，孩子跟拍相同次數；較大孩子可試到五下，慢慢點數，不比速度。",
    "喝水，準備人物卡。先把三張分開擺，每指一張才數一次，示範不漏數也不重數。",
    "播放保留的 Goodbye, See You Soon 歌曲版，在道別段暫停揮手回應；數數與感謝一起玩是片後活動，不把道別歌說成數字教材。",
    "課後逐一數 1–5 張人物卡，再把一張卡移走並揮手說 Bye! Thank you for playing with me.；卡片回來可說 hi 或 hello。",
    "做三次跟做情境：見面揮手 hi、離開揮手 bye、接受幫忙點頭 thank you；每人再輪到一次點數人物與道別，只記實際完成。"
  ]
},
  "w1d5b1": {
  "title": "任務日｜謝謝你今天的幫忙",
  "sentence": "Adventure 9: Thank you for helping me today.",
  "videoFocus": "把道謝連到真實幫忙，再複習招呼與道別。",
  "focus": "感謝他人的具體幫忙。",
  "younger": "大人幫忙拿一件物品後，孩子說 thank you 或點頭再跟說；一次只練道謝，不要求說完整原因。",
  "older": "先說出同伴幫了什麼忙，再說 Thank you for helping me today.；也可先用中文說原因，英文道謝保持自然。",
  "caregiverTip": "準備一件容易收放的玩具，安排拿物、整理或等候等真實小幫忙；不要求孩子碰不安全物品。主課聚焦 thank you，hello/hi/bye 是最後情境複習，不問孩子更喜歡哪個招呼詞，也不等這些詞出現在歌詞。",
  "pausePrompts": [
    {
      "moment": "主課道謝短段後，家人完成一次收拾幫忙時",
      "title": "謝謝有具體原因",
      "question": "家人剛幫你把哪件物品收好了？請向他說 thank you，再用中文說出這次的幫忙。",
      "followUp": "孩子一時想不到可先指物品再道謝；只談已發生的事，不替他編原因。",
      "targetWord": "thank you"
    },
    {
      "moment": "片後週末複習，玩偶結束活動時",
      "title": "謝過之後要離開",
      "question": "玩偶已經幫完忙、現在準備回家，你能揮手說 bye 嗎？這和剛才道謝的情境哪裡不同？",
      "followUp": "比較接受幫忙與離開，較小孩子演動作即可；bye 是生活延伸，不是道謝歌的歌詞測驗。",
      "targetWord": "bye"
    },
    {
      "moment": "片後玩偶重新來訪時",
      "title": "回來就換招呼",
      "question": "玩偶又來了，請用 hello 招呼它，再請它幫一個安全的小忙，好嗎？",
      "followUp": "先見面招呼，再做真實幫忙；hi 也可接受，不要求孩子跟固定順序背全部詞。",
      "targetWord": "hello"
    }
  ],
  "instructions": [
    "播放開合與相反動作暖身短段，跟做手掌張開、合起或高低動作；孩子依自己能力調整幅度。",
    "回播一小段，選一組相反動作讓孩子帶隊，大人跟做；不把 bye 硬塞進歌詞。",
    "停音樂，輪流出一組相反動作，其他人看懂後模仿；每人都能當一次領隊。",
    "喝水，拿出玩具，示範同伴幫忙拿物或收好；先談為什麼會說謝謝。",
    "播放本堂道謝歌，反覆句後暫停，由家人真的幫一次小忙，再說 thank you；不用看完整支才開始互動。",
    "練 Thank you for helping me today.；較小孩子說 thank you，較大孩子先用中文講出幫忙的事，再說英文感謝句。",
    "做三次複習：離開說 bye、接受幫忙說 thank you、見面說 hello 或 hi；每人另向一位家人道謝，不比較孩子喜歡哪個單字，只記真實回答。"
  ]
},
  "w1d5b2": {
  "title": "任務日｜一起分享與交朋友",
  "sentence": "Adventure 10: Hello! We can share this toy.",
  "videoFocus": "用招呼、分享與輪流整理第一週的交朋友練習。",
  "focus": "見面、分享、輪流與道別。",
  "younger": "先揮手說 hello 或 hi，再把共用玩具放到兩人中間；等待輪次後拿取，能做動作也可先參與。",
  "older": "迎接同伴時說 Hello! We can share this toy.，實際輪流玩一次；對方回應後再繼續，結束時道別。",
  "caregiverTip": "準備一件願意共用的玩具。主課有招呼、分享、輪流與道別；goodbye 對應 bye，hi 是 hello 的日常替代，thank you 作為接受分享時的延伸。不要把「hi→bye→thank you」定成所有情境的固定順序，也不強迫分享私人珍愛物品。",
  "pausePrompts": [
    {
      "moment": "主課開頭招呼段後",
      "title": "先認識同伴",
      "question": "你想對同伴說 hello 還是 hi？兩種都能用來打招呼。",
      "followUp": "等孩子回應後，再由同伴回答；不要同時代兩人說完。",
      "targetWord": "hi"
    },
    {
      "moment": "主課分享或輪流段後",
      "title": "真的分享一次",
      "question": "同伴讓你輪到玩具了，你可以說 thank you 嗎？",
      "followUp": "把影片中的分享變成一次實際輪流；這句道謝是延伸回應，不要求歌詞逐字出現。",
      "targetWord": "thank you"
    },
    {
      "moment": "主課道別段後",
      "title": "結束也有禮貌",
      "question": "一起玩完要離開了，你願意揮手說 bye 嗎？",
      "followUp": "說明 goodbye 和 bye 都可道別，再讓孩子講一件想下次一起玩的事，中文也可以。",
      "targetWord": "bye"
    }
  ],
  "instructions": [
    "播放尋找聖誕老人的暖身短段，做看左邊、看右邊、指位置的動作；這是節慶故事素材，不把今天說成聖誕節。",
    "回播一小段，孩子選一個方向讓家人跟著指，留在原位，不鑽入櫃子或遮蔽空間。",
    "停音樂，將玩具放在清楚可見的位置，輪流指給同伴看，再換人放置；先做動作，不要求讀完整位置句。",
    "喝水，把玩具放在中間，先用中文演一次新朋友到來、一起玩及離開，準備主課的交朋友流程。",
    "播放交朋友主課，在招呼、分享或輪流、道別段分別暫停，讓每名孩子演一次相應動作。",
    "練 Hello! We can share this toy.，實際邀請同伴輪流；接受分享後可說 thank you，整輪結束才說 bye。",
    "複習三種情境：招呼 hi/hello、道別 bye、接受幫忙 thank you。每人再輪到一次完整邀請與分享，不把問候詞排成硬性順序，只記實際完成。"
  ]
}
};

/** Original assigned video descriptions reviewed 2026-09-09; see week2_opening QA evidence. */
const secondWeekOpeningGuidance: Record<string, ReviewedTeachingGuidance> = {
  "w2d1b1": {
  "title": "探索日｜畫出顏色與形狀",
  "sentence": "Adventure 11: This is my blue circle.",
  "videoFocus": "跟著畫圖歌，觀察顏色與形狀如何組合。",
  "focus": "彩色圖形與自己的畫作。",
  "younger": "先從兩支筆選出 blue，在紙上試畫 circle；形狀不必畫得很圓，能指認或跟說 blue／circle 就先肯定。",
  "older": "畫一個藍色圓形，指著說 This is my blue circle.；再畫紅色正方形，試著說 This is my red square.，比較顏色和形狀兩個特徵。",
  "caregiverTip": "準備紙及紅、綠、藍色筆，也可用既有圖卡指認。先觀察畫圖歌實際畫出的顏色和形狀，再畫自己的藍色圓形、紅色正方形；片中未見的組合就在紙上示範，不等待固定畫面。暖身是尋找彩蛋的節慶故事，做原地觀察與指向，不需要真的藏蛋。",
  "pausePrompts": [
    {
      "moment": "主課畫完一個圖形後，拿出紅色筆",
      "title": "先找顏色",
      "question": "哪一支筆是 red？選好後，在紙上畫一小段紅線。",
      "followUp": "先實際選筆再跟說 red；若畫面也有紅色，可比較自己的筆和畫面是否同色。",
      "targetWord": "red"
    },
    {
      "moment": "主課短段後，對照家長畫的藍色圓形",
      "title": "畫一個圓",
      "question": "你找到 circle 了嗎？用手指沿著它的邊走一圈，再試著畫。",
      "followUp": "大人示範不停頓地繞一圈；孩子畫得不規則也先完成探索，再一起指認。",
      "targetWord": "circle"
    },
    {
      "moment": "回看一個畫圖段落後，對照紙上的正方形與圓形",
      "title": "看看邊角",
      "question": "square 和剛才的 circle 哪裡不一樣？你能指出 square 的一個角嗎？",
      "followUp": "先摸著自己的畫說明直邊和圓弧；較大孩子可逐一找四個角，再說圖形名稱。",
      "targetWord": "square"
    }
  ],
  "instructions": [
    "播放尋找彩蛋暖身短段，原地小步走，輪流向上、向旁邊指，模仿尋找的動作。",
    "回播一次找到彩蛋的片段，先讓孩子指畫面，再跟著節奏拍手；不用額外記形狀名稱。",
    "停音樂，把一支筆放在桌面可見處，請孩子指給同伴看；換孩子放置，大人再找。",
    "喝水，拿出紙和紅、綠、藍色筆。先各選一支說顏色，用空手示範圓形與有角的圖形。",
    "播放畫圖主課，一個圖形畫完後暫停，說說實際看到的顏色與形狀；再選同色筆試畫。家長在紙上補畫紅色正方形和藍色圓形，讓孩子比較。",
    "指著自己的藍色圓形練 This is my blue circle.；較小孩子說 blue 或 circle，較大孩子再介紹紅色正方形。",
    "做三次認識：找 circle、找 square、找 red。每人都指一次圖或自己的作品，再介紹一幅畫，完成後才記錄。"
  ]
},
  "w2d1b2": {
  "title": "探索日｜找圓形與正方形，再分一分",
  "sentence": "Adventure 12: This circle belongs here.",
  "videoFocus": "從形狀歌辨認 circle、square，再把其他形狀加入分類。",
  "focus": "形狀辨認與邊角分類。",
  "younger": "用雙手圍出小圈，跟說 circle；再從兩張圖卡中找圓形，放到大人指的位置。",
  "older": "先觀察圓形沒有角，把圓形卡和其他形狀分開，放卡時說 This circle belongs here.；再用中文說明正方形、三角形或星形的邊角。",
  "caregiverTip": "〈The Shape Song #1〉唱出circle、square，也介紹diamond與heart；先選圓形、正方形段，各停一次指卡。star、triangle是片後加入的比較形狀。準備本頁圖卡即可，不要求孩子跟唱未教過的形狀；把圓形和有角的形狀分兩區。",
  "pausePrompts": [
    {
      "moment": "主課唱出circle後",
      "title": "圓形在哪裡",
      "question": "找出circle，沿著它的邊用手指畫一圈。",
      "followUp": "先看歌曲形狀再找同形圖卡；不要求把圓畫得很整齊。",
      "targetWord": "circle"
    },
    {
      "moment": "主課唱出square後",
      "title": "四個角的形狀",
      "question": "請找square，它的邊和circle有什麼不同？",
      "followUp": "停片摸圖卡的四條直邊，再把它放進有角的一區。",
      "targetWord": "square"
    },
    {
      "moment": "片後加入星形卡比較時",
      "title": "星形也有角",
      "question": "這張star應該和circle一起，還是和有角的形狀一起？",
      "followUp": "這是延伸分類，不宣稱歌曲唱到star；再加入triangle比較。",
      "targetWord": "star"
    }
  ],
  "instructions": [
    "播放怪獸派對暖身短段，跟著左右搖擺和原地踏步；跳躍可改成抬腳，保持舒服的活動空間。",
    "回播一段搖擺動作，孩子選大幅或小幅動作，大人跟做；停音樂時一起停下。",
    "輪流當派對領隊，做一個扭動或踏步動作，其他人模仿；不把星形當成歌詞提示。",
    "喝水，拿出四種形狀圖卡。預告先在歌曲找圓形與正方形，再把星形和三角形加入分類。",
    "播放〈The Shape Song #1〉，唱到circle與square後各暫停，請孩子先指畫面，再找本頁同形圖卡；其餘形狀可先欣賞。",
    "把圓形和有角的形狀分兩區，放好圓形後說This circle belongs here.；再放正方形，觀察直邊與角。",
    "做star、circle、square三次找卡，再輪流放入分類區；加上triangle時請孩子說或指一個理由。只記孩子實際完成的回合。"
  ]
},
  "w2d2b1": {
  "title": "動起來｜聽彩虹歌找同色物",
  "sentence": "Adventure 13: I found something yellow.",
  "videoFocus": "從彩虹的顏色，找到身邊相同顏色的物品。",
  "focus": "彩虹顏色與生活找色。",
  "younger": "從兩件物品中找 yellow，指給大人看並跟說；再換 red 或 blue，一次只問一個顏色。",
  "older": "找到黃色物品後說 I found something yellow.；換找 red 或 green，再比較兩件物品是否同色，不要求第一次就背出所有彩虹顏色。",
  "caregiverTip": "準備附近可拿取的紅、藍、黃、綠色物品，缺少時使用本課圖卡。主課還有其他彩虹顏色，可以先聽，本堂先練四個既有目標詞。暖身用忘記歌詞的趣味節奏，孩子哼聲或拍手就能參與。",
  "pausePrompts": [
    {
      "moment": "主課唱完一輪彩虹顏色後",
      "title": "先選紅色",
      "question": "你能在畫面找到 red，再指出身邊一件紅色物品嗎？",
      "followUp": "把歌聲和實物連起來；找不到實物就指本課圖卡，不催孩子跑去別的房間。",
      "targetWord": "red"
    },
    {
      "moment": "回看藍色出現的歌段後",
      "title": "換你找藍色",
      "question": "哪一件物品是 blue？選好後放到自己面前。",
      "followUp": "先留時間選擇，再跟說 blue；不要把猜下一幕當成辨色完成。",
      "targetWord": "blue"
    },
    {
      "moment": "影片暫停後，拿出兩件不同顏色的物品",
      "title": "黃色在哪裡",
      "question": "請找 yellow。你找到的是什麼？可以先用中文說名稱。",
      "followUp": "找到後再示範本課口說句；較大孩子可再找另一件同色物比較。",
      "targetWord": "yellow"
    }
  ],
  "instructions": [
    "播放忘記歌詞的暖身短段，用哼聲和拍膝跟上節奏；先享受聲音遊戲，不考誰背得出歌詞。",
    "回播哼唱較多的一段，大人先拍兩下，孩子接兩下；也可用原地踏步回應。",
    "停音樂，孩子出一個簡短節奏，家人輪流模仿；記不起來可以一起重做，不淘汰。",
    "喝水，把準備好的紅、藍、黃、綠色物品放在附近。大人先指出兩種顏色，再逐步加入另外兩種。",
    "播放彩虹主課，唱完顏色段後暫停，回看 red、blue、yellow 或 green，讓孩子指畫面再找身邊同色物。",
    "找到黃色物品後練 I found something yellow.；較小孩子說 yellow，較大孩子換找另一種顏色，再用相應顏色詞說一次。",
    "做三次跟做：指 red、把 blue 放到面前、舉起 yellow 給同伴看；每人再輪到一次找同色物並回答，只有實際完成才記錄。"
  ]
},
  "w2d2b2": {
  "title": "動起來｜海灘形狀與找顏色",
  "sentence": "Adventure 14: What color is your star?",
  "videoFocus": "看海灘上的星形，課後比較其他形狀並問顏色。",
  "focus": "海灘形狀觀察與顏色問答延伸。",
  "younger": "先指出影片或圖卡中的 star；再從兩支不同顏色的筆中選一支，塗在紙上的星形，跟說顏色即可。",
  "older": "比較星形與其他圖卡的邊角，選一種顏色畫星形；問同伴 What color is your star?，同伴依自己的作品用顏色詞回答，再交換角色。",
  "caregiverTip": "準備既有形狀圖卡、紙及兩種以上顏色筆。主課唱 oval、star、rectangle；先辨認 star，另外兩種可用中文解釋。square、triangle、circle 是課後圖卡比較，找顏色則用自己的畫作；不把影片中的橢圓或長方形直接叫成 circle 或 square。",
  "pausePrompts": [
    {
      "moment": "主課出現星形的歌段後",
      "title": "找到星形",
      "question": "你找到 star 了嗎？指給同伴看，跟說 star。",
      "followUp": "大人先等孩子指向，再一起說；不要求先會 oval 或 rectangle 才能參與。",
      "targetWord": "star"
    },
    {
      "moment": "主課長方形段落後，拿出正方形圖卡",
      "title": "比較兩種圖形",
      "question": "這張圖卡是 square。它的四條邊一樣長；和影片裡較長的長方形像不像？",
      "followUp": "先用中文比較圖形長短；square 是圖卡延伸，避免把所有長方形都叫成正方形。",
      "targetWord": "square"
    },
    {
      "moment": "影片結束後，進入自己的畫作活動",
      "title": "換形狀、再找顏色",
      "question": "這張 triangle 有三個角。你能沿著三條邊指一圈，再選一支筆畫或塗色嗎？",
      "followUp": "這是課後延伸，接著把星形也塗上自己選的顏色，輪流問同伴作品的顏色。",
      "targetWord": "triangle"
    }
  ],
  "instructions": [
    "播放送驚喜與道謝的暖身短段，用伸手送物、接物和點頭的動作跟節拍，先做輕柔動作。",
    "回播一段，家人輪流把一支筆交給對方，接到的人說 thank you；延續第一週的禮貌練習。",
    "停音樂，孩子示範一個送物或道謝的動作，其他人模仿後換人，不要求背整首歌。",
    "喝水，拿出本課形狀圖卡和色筆。先說明海灘歌會看到星形、橢圓和長方形，其他卡片等看片後再比較。",
    "播放海灘主課，星形段落後暫停找 star；橢圓與長方形先用中文說明，接著拿出圓形或正方形卡比較。",
    "家長在紙上簡單示範圖卡形狀，孩子選筆畫或塗色。以星形作品輪流問 What color is your star?，對方先指色筆或說顏色，再交換提問。",
    "做三次跟做：沿 square 的邊指一圈、沿 triangle 的邊指一圈、指出 star 的尖角；每人再用自己的作品完成一次找顏色與輪流問答，只記實際完成。"
  ]
},
  "w2d3b1": {
  "title": "配對日｜混出新顏色",
  "sentence": "Adventure 15: I made green with blue and yellow.",
  "videoFocus": "觀察兩種顏色混合，再把自己的顏色與圖卡配對。",
  "focus": "混色前後的觀察、比較與顏色配對。",
  "younger": "先從兩張圖卡找 yellow，再指出混色結果 green；實作時由大人擠好少量顏料，孩子攪一攪，跟說顏色即可。",
  "older": "先猜藍色和黃色顏料混合的結果，實際試過再說 I made green with blue and yellow.；把結果與原來兩色比較，說出哪裡改變。",
  "caregiverTip": "準備本課顏色圖卡、紙、可水洗藍／黃顏料與調色盤；大人分裝少量，活動後洗手。沒有顏料就觀察影片，再用圖卡指出混合前後的顏色，不把卡片疊在一起當作真的混色。主課也有橘色和紫色，本堂先練藍黃變綠，紅色用原圖卡複習。",
  "pausePrompts": [
    {
      "moment": "主課藍色與黃色尚未混合時",
      "title": "先看看兩種原色",
      "question": "你能指出 yellow 嗎？旁邊另一種顏色是 blue，猜猜合在一起會如何。",
      "followUp": "先接住猜測，再播放混合結果；猜對不是任務完成的依據。",
      "targetWord": "yellow"
    },
    {
      "moment": "主課藍色與黃色混合完成後",
      "title": "對照混合前後",
      "question": "現在看到 green 了嗎？它和剛才的藍色、黃色有什麼不同？",
      "followUp": "讓孩子指出結果；有顏料時再親手嘗試，顏色深淺不同也可以描述。",
      "targetWord": "green"
    },
    {
      "moment": "主課紅色與黃色混合的片段開始時",
      "title": "再找一個已學顏色",
      "question": "哪一邊是 red？先指出來，再看看加入黃色後的結果。",
      "followUp": "橘色可以先聽，不要求增加背誦量；活動結束再用紅色圖卡配對。",
      "targetWord": "red"
    }
  ],
  "instructions": [
    "播放馴鹿運動會暖身短段，原地踏步、揮手替角色加油；這是節慶歌曲故事，不把今天說成聖誕節。",
    "回播一段加油的歌曲，先由大人拍節奏，再讓孩子選擇揮手或拍手回應，不考馴鹿名字。",
    "停音樂，輪流當加油領隊：一人做動作，家人跟做，再把動作縮小、慢下來。",
    "喝水，拿出藍、黃、綠、紅圖卡，先找出將要混合的兩種顏色；有顏料時由大人分裝在盤中不同位置。",
    "播放混色主課，在藍黃混合前暫停猜測、混合後暫停看 green；紅黃與藍紅段可先觀察，不必一次記住所有結果。",
    "把少量藍黃顏料拌在一起，觀察顏色再練 I made green with blue and yellow.；無顏料時改指影片結果，說 green，不假稱自己完成了實驗。",
    "用圖卡與自己的色塊或畫面做三次分類配對：yellow、green、red 各一次；每人再說一個目標詞或自己的混色句，大人只記實際完成。"
  ]
},
  "w2d3b2": {
  "activityLabel": "形狀與中文命名",
  "title": "配對日｜找形狀、說中英文",
  "sentence": "Adventure 16: I can match this star.",
  "videoFocus": "看形狀歌的三角形與星形，再用圖卡做中英文配對。",
  "focus": "影片找形狀與課後中英文名稱配對。",
  "younger": "先用手指沿 triangle 的三條邊走一圈；從兩張圖卡中找 star，說星形或跟說 star，再放到相同形狀旁。",
  "older": "用中英文說出自己選到的形狀，把星形配好後說 I can match this star.；再比較 square 與 circle 的邊角，說出分類理由。",
  "caregiverTip": "準備本課四種形狀圖卡，可在紙上畫相同形狀供配對。主課第 2 集教 triangle、rectangle、oval、star；circle 和 square 是課後圖卡延伸，不等待它們出現在歌詞中。中文練習說圓形、星形等名稱，再接英文，畫面不加注音。",
  "pausePrompts": [
    {
      "moment": "主課星形段落後，拿出兩張相同星形卡",
      "title": "把星形放在一起",
      "question": "哪張圖卡能和 star 配成一對？配好後，先說中文名稱再說英文。",
      "followUp": "看形狀是否相同再放好，不只因顏色相同就配對；接著示範本課星形配對句。",
      "targetWord": "star"
    },
    {
      "moment": "影片後拿出圓形及正方形圖卡",
      "title": "找連續的圓弧",
      "question": "哪張是 circle？用手指沿邊走一圈，有沒有遇到角？",
      "followUp": "circle 是片後圖卡；影片中的 oval 是橢圓，不把兩者直接當成一樣。",
      "targetWord": "circle"
    },
    {
      "moment": "片後擺出正方形與長方形卡時",
      "title": "四條邊再比一比",
      "question": "請找 square，把它配到紙上相同形狀；它的四條邊和較長的長方形有什麼不同？",
      "followUp": "先指邊再比較長短，較小孩子把相同圖形放一起即可；square 為片後延伸，不等待歌曲唱到。",
      "targetWord": "square"
    }
  ],
  "instructions": [
    "播放小老鼠與動物比喻的暖身短段，用輕聲模仿老鼠，再張開雙手模仿大動物；音量保持舒服，不必大吼。",
    "回播動物動作段，孩子選小幅或大幅手勢，大人跟做；先體會動作與聲音大小，不插入形狀背誦。",
    "停音樂，輪流示範一個動物手勢，其他人猜或模仿；最後縮小動作，準備坐下。",
    "喝水，拿出形狀圖卡。先用中文叫出熟悉的形狀，介紹主課會找到三角形、長方形、橢圓和星形。",
    "播放形狀主課，三角形及星形段後各暫停一次，用手指描邊或指出畫面；長方形與橢圓先用中文理解。",
    "在桌上擺本課四種形狀卡，逐張說中文再說英文。把星形放到紙上相同形狀旁，練 I can match this star.；圓形和正方形從圖卡辨認。",
    "做三次分類配對：star、circle、square 各一次，再讓每名孩子輪到一次選卡、用中英文回應或說配對句；不把旁觀當完成。"
  ]
},
  "w2d4b1": {
  "title": "小老師｜葉子顏色觀察員",
  "sentence": "Adventure 17: My leaf is red.",
  "videoFocus": "從秋天葉子的故事觀察顏色，再介紹自己的葉子畫。",
  "focus": "葉子顏色觀察與小老師問答。",
  "younger": "先在畫面或大人的葉子畫找到 red 或 yellow，跟說一個顏色；自己選色塗一片葉子，再指給家人看。",
  "older": "觀察影片中的葉子有不同顏色，畫一片紅葉後說 My leaf is red.；換另一個顏色介紹自己的作品，再問同伴選哪個顏色。",
  "caregiverTip": "準備紙及紅、黃、綠、藍色筆或本課圖卡。主課是秋天葉子變色的歌曲故事，不把每一棵樹、每個季節都說成一定變紅。blue 留在課後畫作與圖卡比較，不要求孩子在葉片找到藍色；孩子畫藍色葉子可以創作，但要分清作品與實際觀察。",
  "pausePrompts": [
    {
      "moment": "主課葉子變色的片段後，回看葉片",
      "title": "先找一種葉色",
      "question": "這裡有沒有 red 的葉子？如果有，指出來；沒有就說還沒找到，我們再看。",
      "followUp": "依眼前畫面回答，不預設每一幕都有同一種顏色；可改用家長的紅葉畫辨認。",
      "targetWord": "red"
    },
    {
      "moment": "回看另一段葉子畫面後",
      "title": "比較不同葉子",
      "question": "你找到 yellow 了嗎？和剛才指的葉子顏色一樣嗎？",
      "followUp": "先比較相同或不同；也可用黃色圖卡幫助辨認，不用背變色原理。",
      "targetWord": "yellow"
    },
    {
      "moment": "主課結束後，拿出藍色筆及自己的葉子畫",
      "title": "分清觀察和創作",
      "question": "這支筆是 blue。你想用它畫什麼？剛才看過的葉子也是這個顏色嗎？",
      "followUp": "藍色是課後材料；孩子可以自由創作，再用中文區分畫出來的顏色與影片觀察。",
      "targetWord": "blue"
    }
  ],
  "instructions": [
    "播放 Skidamarink 暖身短段，跟節奏輕搖雙手、把手放胸前向家人表達喜歡；擁抱由孩子自己選擇。",
    "回播喜歡家人的歌段，大人先做手勢、孩子再選自己的手勢回應；不把紅色或藍色塞進歌詞。",
    "停音樂，輪流當小老師帶一個手勢，家人模仿，再慢慢坐下。",
    "喝水，拿出紙與色筆，家長先畫兩片簡單葉子，讓孩子選紅、黃或綠色；藍色筆留在一旁供作品比較。",
    "播放葉子主課，在變色片段後暫停看葉片，找實際出現的顏色；找不到某色可明說沒有，不要讓孩子等待不存在的藍色葉子。",
    "孩子在紙上畫或塗自己的葉子。選紅色時練 My leaf is red.，其他顏色則換成自己真正使用的顏色詞，較小孩子只說一字也可以。",
    "做三次問答：找 red 葉子畫、指 blue 色筆、找 yellow 圖卡；每人再當一次小老師，介紹自己的葉子並請同伴找同色物，只記實際作答與開口。"
  ]
},
  "w2d4b2": {
  "title": "小老師｜形狀玩具與交通小遊戲",
  "sentence": "Adventure 18: This square has four sides.",
  "videoFocus": "從形狀歌找 square 並數四條邊，片後用圖卡帶桌面交通小遊戲。",
  "focus": "形狀邊角辨認與室內交通情境延伸。",
  "younger": "先從兩張圖卡找 square 或 triangle，用手指沿邊走；輪到時幫玩具在紅色圓點前停下，跟說一個形狀詞即可。",
  "older": "指著正方形邊緣逐條數，說 This square has four sides.；再換三角形數三邊，輪流當室內遊戲的指揮者，說明自己的停下或前進指令。",
  "caregiverTip": "準備形狀圖卡、紙、色筆及一個可在桌面移動的小玩具。主課唱 circle、diamond、square、heart；先找 square，再數四邊。triangle、star 是片後圖卡延伸。家長畫道路和紅、綠圓點，只在桌面玩停下／移動，不把綠色遊戲指令當成孩子可以自行穿越真實道路；星形只作裝飾。",
  "pausePrompts": [
    {
      "moment": "主課 square 歌段後，拿出正方形卡",
      "title": "找四條邊",
      "question": "你能找到 square 嗎？沿著它的邊數一數，總共有幾條？",
      "followUp": "先指實物或畫面，再讓孩子沿圖卡數四邊；大人不代孩子回答。",
      "targetWord": "square"
    },
    {
      "moment": "影片結束後，拿出三角形與正方形卡",
      "title": "換三條邊",
      "question": "triangle 和剛才的 square 哪裡不一樣？你能數出 triangle 的邊嗎？",
      "followUp": "較小孩子跟著指即可；較大孩子說三邊與四邊的差異。",
      "targetWord": "triangle"
    },
    {
      "moment": "片後拿出星形圖卡與桌面遊戲紙",
      "title": "星形放在哪裡",
      "question": "哪個是 star？把它指給我看，我們用星形裝飾這張遊戲紙。",
      "followUp": "星形先做辨認與裝飾；停下／移動另用家長畫的紅、綠圓點示範，不混成影片原有交通規則。",
      "targetWord": "star"
    }
  ],
  "instructions": [
    "播放拍翅膀暖身短段，張開雙臂輕輕上下擺，跟著小步移動；跳躍可以改成抬腳，留在舒服的活動範圍。",
    "回播一段拍翅動作，大人做慢速，孩子選自己的速度模仿；雙腳穩定後才換下一個動作。",
    "停音樂，輪流當小鳥領隊，做拍翅或原地踏步，家人跟做，最後一起收起雙臂坐下。",
    "喝水，拿出本課形狀卡、紙與小玩具。先預告在歌裡找正方形、數四邊，看片後再畫桌面道路玩交通情境。",
    "播放 The Shape Song #1，在 square 歌段後暫停指認、沿圖卡數四邊；circle 可比較圓弧。triangle 與 star 等片後拿圖卡辨認，不假稱它們出現在這首歌。",
    "指著正方形數四邊，練 This square has four sides.。接著家長畫桌面道路，以紅色圓點表示玩具停下、綠色圓點表示按家長指令移動；這是室內延伸，不是真實過馬路練習。",
    "先做三次問答：認 square、數 triangle 的邊、找 star。再讓每人輪到一次指揮玩具停下或移動並回應形狀句，星形只作裝飾，只記實際輪到和回答。"
  ]
},
  "w2d5b1": {
  "title": "任務日｜找到彩虹的顏色",
  "sentence": "Adventure 19: This rainbow has a yellow stripe.",
  "videoFocus": "看彩虹、找顏色，再用自己的畫作複習本週單字。",
  "focus": "彩虹觀察與顏色作品介紹。",
  "younger": "先從兩支筆找 yellow，用手在紙上畫一道弧線；再指影片或畫作中的 green，跟說一個顏色即可。",
  "older": "回看彩虹後，選色畫幾道相鄰弧線，指著黃色部分說 This rainbow has a yellow stripe.；再換一個顏色介紹，說明畫作與影片哪些地方相同。",
  "caregiverTip": "準備紙、黃／綠／紅／藍色筆，也可直接用本課圖卡。主課是 Treetop Family 的彩虹單曲，先觀察可見顏色，不要求一次背齊所有色名。畫作可用本週四種顏色練習，不把四道色線說成彩虹只有四種色。暖身第 4 集是手指數量遊戲，較小孩子做手勢即可。",
  "pausePrompts": [
    {
      "moment": "主課出現彩虹的畫面後",
      "title": "沿著一道顏色找",
      "question": "這個彩虹畫面有沒有看得清楚的 yellow？有就沿那一道顏色指一小段，沒有就先選黃色筆。",
      "followUp": "先看清楚再指；暫停畫面不清楚時回看或改用黃色圖卡，不靠猜下一幕完成辨色。",
      "targetWord": "yellow"
    },
    {
      "moment": "回看同一段彩虹畫面後",
      "title": "換你找另一色",
      "question": "這次能找到 green 嗎？找不到就看綠色圖卡，和 yellow 比一比。",
      "followUp": "一次比較兩色，孩子先指出或說不同，大人再帶著說名稱。",
      "targetWord": "green"
    },
    {
      "moment": "影片後，拿出自己的紙和色筆",
      "title": "把顏色帶進畫作",
      "question": "你想把 red 畫在哪裡？選出紅色筆，在紙上畫一道弧線。",
      "followUp": "這是畫作延伸，允許自己安排；完成後再和影片比較，不把自選順序當成自然彩虹的固定順序。",
      "targetWord": "red"
    }
  ],
  "instructions": [
    "播放石頭剪刀布第 4 集的暖身短段，跟做握拳、伸兩指、張開手掌；它用手指練數量，不是顏色歌。",
    "回播左右手各伸兩指的片段，先模仿手勢，再一起數伸出的手指；較小孩子跟做即可，不以算對加法為開課條件。",
    "停音樂，孩子輪流出一個手勢讓家人模仿，再把手掌張開、放鬆，準備畫畫。",
    "喝水，拿出紙和四種色筆。各選一支說顏色，再用空手畫一道弧線，準備觀察彩虹。",
    "播放 Treetop Family 彩虹主課，彩虹出現後暫停觀察；找看得清楚的 yellow 或 green，找不到就改用圖卡，不預設下一幕一定是哪個詞。",
    "在紙上用自己選的顏色畫相鄰弧線。畫到黃色時練 This rainbow has a yellow stripe.；較小孩子說 yellow，較大孩子換另一色介紹作品。",
    "完成三次複習：找 yellow、比對 green、指出 red 圖卡或自己的色線；每人再介紹一道顏色，按孩子實際指認與開口記錄，不比較誰最快。"
  ]
},
  "w2d5b2": {
  "title": "任務日｜分享我喜歡的顏色",
  "sentence": "Adventure 20: Green is my favorite color.",
  "videoFocus": "聽角色分享顏色，輪流回答自己的喜好並聽同伴回答。",
  "focus": "顏色複習與真實偏好問答。",
  "younger": "從兩張顏色圖卡選自己喜歡的一張，指給家人看，跟說顏色；輪到家人回答時，把相應圖卡指給他看。",
  "older": "先問同伴喜歡什麼顏色，聽完再選自己的。喜歡綠色時說 Green is my favorite color.，喜歡其他顏色就替換句首；不需要和家人或影片角色選一樣。",
  "caregiverTip": "準備本課綠／紅／藍／黃圖卡或身邊同色物，可沿用上一堂畫作。主課在交換喜歡的顏色，不教固定排列順序。先聽一個角色回答，再讓孩子選自己的；喜好沒有標準答案，辨色與開口是否完成仍按各自任務條件確認。暖身為派對舞蹈，原地小幅動作即可。",
  "pausePrompts": [
    {
      "moment": "主課角色回答綠色的段落後",
      "title": "先聽角色回答",
      "question": "剛才角色說 green，你能找出綠色圖卡嗎？你也喜歡它嗎？",
      "followUp": "先辨認聽到的詞，再問個人喜好；不同的喜好不是答錯。",
      "targetWord": "green"
    },
    {
      "moment": "回看角色回答紅色的段落後",
      "title": "換個顏色比較",
      "question": "red 和剛才的 green 一樣嗎？各指一次，再選你比較喜歡的一張。",
      "followUp": "接受孩子指選或中文回答，接著示範相應英文顏色詞，不替孩子決定喜好。",
      "targetWord": "red"
    },
    {
      "moment": "主課藍色段落後，進入家庭輪流問答",
      "title": "聽完同伴再回應",
      "question": "如果同伴說 blue，你要拿哪張圖卡給他？換你回答時，你會選哪一色？",
      "followUp": "等同伴說完再指卡；自己的答案可不同，最後交換提問與回答角色。",
      "targetWord": "blue"
    }
  ],
  "instructions": [
    "播放怪獸派對合作版暖身短段，跟著左右搖擺、原地踏步，跳躍可改抬腳；先用動作參與。",
    "回播一段舞蹈，孩子選一個小幅扭動或擺手，家人跟做；不要求記角色名稱或把形狀詞塞進歌詞。",
    "停音樂，輪流當派對領隊，做動作後停下，讓每個人都有一次帶隊機會，再一起坐好。",
    "喝水，拿出本課四色圖卡或上一堂畫作。家長先選一個自己喜歡的顏色，預告今天要聽別人的喜好，也介紹自己的。",
    "播放喜愛顏色主課，角色每回答一種顏色就選一處暫停，先指相應圖卡，再問孩子是否也喜歡；不把回答的順序教成彩虹排列。",
    "輪流選喜歡的顏色。綠色示範句為 Green is my favorite color.，孩子選別色就換句首，較小孩子先說單字；聽完同伴再指出他的顏色。",
    "完成三次辨色複習：green、red、blue 各一次；再讓每人至少輪到一次回答喜好或操作圖卡。辨色看是否相符，喜好不判對錯，只記實際參與者。"
  ]
}
};

/** Scoped third-week publisher source review; see qa/content-review week3_opening evidence. */
const thirdWeekReviewedGuidance: Record<string, ReviewedTeachingGuidance> = {
  "w3d1b1": {
  "title": "探索日｜從頭往下找身體",
  "sentence": "Adventure 21: My head is above my shoulders.",
  "videoFocus": "慢慢聽身體歌，找出head、shoulders、knees，觀察上下位置。",
  "focus": "身體部位初次辨認與頭肩上下關係。",
  "younger": "先在兩張卡找head，再找shoulders和knees；指自己或卡片、跟說一個詞即可。",
  "older": "先聽詞辨認，再把頭、肩、膝卡由上往下排列，說My head is above my shoulders.，最後加入toes。",
  "caregiverTip": "主課慢版明列head、shoulders、knees、toes。每輪只選一兩個詞，先看再指自己或本頁圖卡；不用毛巾或洗手流程。My head is above my shoulders.是片後位置描述，不宣稱歌曲唱這個完整句子。坐著指卡也能完成，不要求摸到腳趾。",
  "pausePrompts": [
    {
      "moment": "主課唱出head後",
      "title": "頭在哪裡",
      "question": "請找head，再指自己的頭。它在身體的上方還是下方？",
      "followUp": "等孩子自行指認；可用圖卡代替觸摸。",
      "targetWord": "head"
    },
    {
      "moment": "主課唱出shoulders後",
      "title": "頭與肩的位置",
      "question": "請找shoulders，再比較head和shoulders誰在上面。",
      "followUp": "停片用手上下比位置，再示範本課句型。",
      "targetWord": "shoulders"
    },
    {
      "moment": "主課唱出knees後",
      "title": "往下找膝蓋",
      "question": "請找knees，和shoulders比較哪個位置比較低。",
      "followUp": "年幼孩子先指對，較大孩子再依上下擺卡。",
      "targetWord": "knees"
    }
  ],
  "instructions": [
    "播放小鈴鐺暖身短段，用空手做搖鈴動作，跟著改變快慢與高低；沒有鈴鐺也能參與，不需要購買道具。",
    "回播快慢或高低段，大人先做一次，孩子以舒服幅度跟做；坐著也能用雙手完成。",
    "停音樂，輪流做一個搖鈴手勢，家人模仿，最後把手放低、慢慢停下。",
    "喝水，打開四張身體卡，預告今天從頭往下找，不用另外準備道具。",
    "播放〈Head Shoulders Knees & Toes (Learn It)〉，head、shoulders、knees各唱到後停一下，孩子聽詞找卡再指位置。",
    "把頭、肩兩張卡依身體上下排列，練My head is above my shoulders.；再放膝蓋和腳趾卡比較。",
    "完成head、shoulders、knees三次認識，每人至少開口一個詞或句型；先提示再由孩子完成才記錄。"
  ]
},
  "w3d1b2": {
  "title": "探索日｜看清楚、聽口令再動",
  "sentence": "Adventure 22: I stop when I hear stop.",
  "videoFocus": "用紅綠燈歌聽辨 go 和 stop，再分辨眼睛看示範、耳朵聽口令的工作。",
  "focus": "看與聽配合的出發、停止口令。",
  "younger": "先看手指轉向示範，再依序試 turn、go、stop；指卡或用一隻手操作即可。說眼睛看、耳朵聽時，可以指自己的部位回答。",
  "older": "比較只看手勢與只聽口令兩種玩法，練 I stop when I hear stop.；輪流帶家人指眼睛、耳朵並說明功能，再補生活中的聞、嘗、摸。",
  "caregiverTip": "暖身三步照原教案進行。主課直接唱 go、stop 與 wait，先用桌面手指走路；turn 是主課以外由家長補充的改變方向口令，播放前先在桌面示範。五官合作只需指自己的眼睛、耳朵並說功能，鼻子聞、嘴巴嘗、皮膚觸摸可用熟悉生活經驗口述，不另拿陌生物品試吃。此活動不等於孩子可獨自過馬路。",
  "pausePrompts": [
    {
      "moment": "播放前先用手指示範方向改變時",
      "title": "眼睛看方向",
      "question": "請看家長的手指，找到 turn 圖卡，再讓自己的手指換一個方向。剛才是眼睛幫你看清楚嗎？",
      "followUp": "先朝前再朝旁邊；turn 是家長補充的口令，不要求影片唱出。",
      "targetWord": "turn"
    },
    {
      "moment": "歌中綠燈出發一段後",
      "title": "耳朵聽出發",
      "question": "聽到 go 時，請讓手指走兩小步。先聽清楚再動，和只看家長示範有什麼不同？",
      "followUp": "若孩子不確定，回播同一小段；不蒙眼、不離開座位。",
      "targetWord": "go"
    },
    {
      "moment": "歌中停止口令後",
      "title": "聽到就停住",
      "question": "聽到 stop，請讓手指停在原地，再指一指幫你聽口令的耳朵。手指還需要繼續走嗎？",
      "followUp": "先肯定停住，再示範 I stop when I hear stop.；每人各輪一次。",
      "targetWord": "stop"
    }
  ],
  "instructions": [
    "播放 Skidamarink 暖身短段，手放胸前或輕搖雙手，向家人表達喜歡；不需要擁抱才能完成動作。",
    "回播一段，大人做一個溫和手勢，孩子用眼睛觀察後模仿；坐姿也可參與。",
    "停音樂，輪流當手勢領隊，說出自己剛才用眼睛看到什麼，再把動作放慢。",
    "喝水，開啟動作圖卡；先做 turn 改變方向的桌面示範，讓孩子說眼睛看到了什麼。",
    "播放紅綠燈歌的 go/stop 對比短段，先聽再用手指回應；回播時讓孩子指出哪個聲音讓他停住。",
    "完成 turn、go、stop 三題，接著輪流指眼睛、耳朵並說功能；鼻子聞、嘴巴嘗、皮膚摸以熟悉經驗口述即可。",
    "孩子帶一次口令，家人回應，再練 I stop when I hear stop.；確認本人完成三次認識及一次五官合作才記錄。"
  ]
},
  "w3d2b1": {
  "title": "動起來｜聽部位，做小動作",
  "sentence": "Adventure 23: My knees can bend.",
  "videoFocus": "聽身體歌找到knees、toes、head，再觀察膝蓋能彎曲。",
  "focus": "聽詞跟做與膝蓋彎曲。",
  "younger": "聽knees可坐著輕彎膝蓋或指卡；toes指腳趾方向、head指頭，三回合分開完成。",
  "older": "先聽完口令再指正確部位，比較膝蓋彎與伸的狀態，練My knees can bend.，再換自己帶動作。",
  "caregiverTip": "主課四個目標詞都有歌詞支持。慢版聽一個詞做一個動作，膝蓋只輕彎，腳趾指方向或圖卡即可；不比彎得低。My knees can bend.是片後觀察句，不要求在歌中等待。保留雙手張合暖身，主課不再延伸洗手或手指清潔。",
  "pausePrompts": [
    {
      "moment": "主課knees段後",
      "title": "膝蓋會彎",
      "question": "請找knees，輕輕彎一下或指膝蓋卡，再說它在哪裡。",
      "followUp": "動作幅度由孩子決定，家長接My knees can bend.。",
      "targetWord": "knees"
    },
    {
      "moment": "主課toes段後",
      "title": "不彎腰也能指出",
      "question": "請指toes的位置，再選指自己的腳趾方向或圖卡。",
      "followUp": "指認就可以，不要求用手碰到。",
      "targetWord": "toes"
    },
    {
      "moment": "主課head段後，停止跟唱時",
      "title": "聽清楚才做",
      "question": "聽到head，先等一下再指頭；換你說head讓家人跟做。",
      "followUp": "由孩子決定開始，家長不搶先替他完成。",
      "targetWord": "head"
    }
  ],
  "instructions": [
    "播放 Open Shut Them 暖身短段，雙手張開、合起，再做大與小的手勢；不用先碰膝蓋才跟得上。",
    "回播快慢對比段，大人先慢、孩子再選舒服速度模仿；大聲段也以普通說話音量回應。",
    "停音樂，輪流用張開／合起或大／小手勢帶隊，其他人先看再做，最後把手放鬆。",
    "喝水，開啟knees、toes、head、shoulders圖卡，坐穩或站穩，說明每個口令只做一個小動作。",
    "播放慢版身體歌，knees、toes、head各停一次，讓孩子聽詞後找部位；唱到其他部位可跟指或先看。",
    "輕彎再放鬆膝蓋，觀察動作並練My knees can bend.；不方便動作時用圖卡指出膝蓋。",
    "完成knees、toes、head三次跟做，再輪到孩子帶一個口令並開口；只記自己的實際回應。"
  ]
},
  "w3d2b2": {
  "title": "動起來｜跳一下，停下來數一數",
  "sentence": "Adventure 24: I jump once, then stop.",
  "videoFocus": "跟 Dance And Stop 練跳與定格，再用手指記錄一個動作一次計數。",
  "focus": "跳、停的控制與手指腳趾一對一計數。",
  "younger": "跟 stop 停手，jump 用手指跳一下，turn 用手掌慢轉；每做一次伸一根手指，先數一到三。",
  "older": "先跟一輪定格，再自己限制跳一次就停，說 I jump once, then stop.；數自己手指或坐好數腳趾，確認一個只數一次。",
  "caregiverTip": "保留暖身謝謝手勢三步。主課直接練 jump/stop，歌中會連做動作，不是每次只跳一下；本課句型的一次跳由片後另設條件。turn 也是片後加入。可全程坐著讓手指在掌心跳，腳趾計數時先坐穩，不必脫鞋或摸別人的腳。",
  "pausePrompts": [
    {
      "moment": "主課第一輪動作停住後",
      "title": "音樂停，我也停",
      "question": "請找 stop，示範手指完全不動。剛才持續跳和現在定格，哪裡不一樣？",
      "followUp": "停住後留一口氣的時間，確認不是換成別的動作。",
      "targetWord": "stop"
    },
    {
      "moment": "片後另訂只跳一次的規則時",
      "title": "一次動作一根手指",
      "question": "請用 jump 做一次手指跳，再伸一根手指記錄。你做了一次，應該記幾次？",
      "followUp": "先做一次再停；歌中連跳的次數不是這題答案。",
      "targetWord": "jump"
    },
    {
      "moment": "片後完成轉向和計數合作時",
      "title": "轉完再數",
      "question": "請用 turn 讓手掌慢轉一下，伸出另一根手指記錄。你能和家人輪流數自己的手指或腳趾嗎？",
      "followUp": "轉向由家長示範；坐好數，一個部位只點一次，不比誰快。",
      "targetWord": "turn"
    }
  ],
  "instructions": [
    "播放道謝暖身短段，輕搖雙手，指向家人再把手放胸前；歌詞是感謝身邊的人和事，不是動作口令歌。",
    "回播一段，大人先做道謝手勢，孩子選一個想感謝的人或事，中文說明也可以。",
    "停音樂，輪流示範友善手勢並說謝謝，家人跟做，再把雙手放鬆。",
    "喝水，騰出小空位或坐好，把手掌當作手指跳的地面；先約定停止就不動。",
    "播放 Dance And Stop 的跳與停短段，觀察連續動作如何變成定格，再回播跟做一輪。",
    "依序完成 stop、jump、turn 三題；片後另做只跳一次的挑戰，每完成一個動作伸一根手指記錄，練 I jump once, then stop.。",
    "輪流數自己的手指或腳趾，確認一次指到一個；每人完成三題跟做和一次計數合作，坐姿或手指版同樣可記錄。"
  ]
},
  "w3d3b1": {
  "title": "配對日｜聽身體詞，找對位置",
  "sentence": "Adventure 25: I can point to my head.",
  "videoFocus": "從慢版身體歌聽出head、shoulders、knees，把圖卡配到身體位置。",
  "focus": "聲音與圖卡配對、上下位置分類。",
  "younger": "兩張卡中聽詞選一張，分三回合找head、shoulders、knees；主動說head也算開口。",
  "older": "不看家長手勢聽詞選卡，將head、shoulders、knees排成上下位置，再說I can point to my head.。",
  "caregiverTip": "使用本頁圖卡，不必列印。主課直接唱四個目標部位，先聽詞再選卡，不用另外學手指歌的鼻子下巴等詞。I can point to my head.是片後描述自己的動作。每題可先給兩張選擇，熟悉再用三張；不因第一次答錯就跳過孩子。",
  "pausePrompts": [
    {
      "moment": "主課head段後",
      "title": "聽詞選卡",
      "question": "聽到head，從這兩張卡選出對的，再指自己的頭。",
      "followUp": "先不要指答案，讓孩子將聲音與卡片配對。",
      "targetWord": "head"
    },
    {
      "moment": "主課shoulders段後",
      "title": "肩膀放哪裡",
      "question": "請把shoulders卡配到頭的下面，並指自己的肩膀。",
      "followUp": "可指卡示意位置，不需把卡貼身上。",
      "targetWord": "shoulders"
    },
    {
      "moment": "主課knees段後，排列卡片時",
      "title": "膝蓋接在哪裡",
      "question": "head、shoulders已排好，knees應放在它們上面還是下面？",
      "followUp": "放好再指膝蓋；較熟悉的孩子最後加toes。",
      "targetWord": "knees"
    }
  ],
  "instructions": [
    "播放繞圈動作暖身短段，跟著走路或用手指在桌面走一圈；空間不夠就原地踏步。唱到倒下時慢慢放低身體或雙手，不真的跌倒。",
    "回播踮腳或跳躍段，孩子選一個舒服動作跟做；跳躍可改成抬腳，旋轉可只小幅轉向，不追求速度。",
    "停音樂，輪流用走路、踮腳或手指走路帶隊，其他人看完再跟；最後放慢並坐穩或站穩。",
    "喝水，開啟三張身體卡；先藏起家長的指示手勢，讓孩子準備用耳朵找答案。",
    "播放慢版身體歌，在head、shoulders、knees後各停片，孩子聽詞選卡，再指出部位。",
    "把選出的卡按高低位置排列，指頭練I can point to my head.；和上一堂動作不同，今天先選卡再核對位置。",
    "完成head、shoulders、knees三次分類，每人再開口一詞或句型；換一人說詞、一人選卡，再交換。"
  ]
},
  "w3d3b2": {
  "title": "配對日｜轉向與停止口令配對",
  "sentence": "Adventure 26: I can turn and then stop.",
  "videoFocus": "從 Move! 找到 turn 和 stop，片後把動作口令配到圖卡。",
  "focus": "轉向、前進、停止三種圖卡與動作配對。",
  "younger": "先在兩張圖卡中找 turn，再試 go、stop；一題只換一張卡，用手指做對應動作。",
  "older": "把 turn、go、stop 配到三種動作，故意放一張不相符的卡請家人辨認，再說 I can turn and then stop.。",
  "caregiverTip": "保留蜘蛛手勢暖身。Move! 直接有 turn/stop，go 由家長片後教。turn 在這裡是改變方向，不是輪流；先指圖卡才做動作，讓配對任務與單純跟跳不同。沒有足夠空間就用手指改變方向，不用真的繞圈。",
  "pausePrompts": [
    {
      "moment": "主課轉向口令後",
      "title": "指令找圖卡",
      "question": "聽到 turn，請從圖卡找出轉向，再用手指換方向。直直走的卡能配這個口令嗎？",
      "followUp": "先選卡再動，不把 turn 說成輪流或要求連轉。",
      "targetWord": "turn"
    },
    {
      "moment": "片後加入前進圖卡時",
      "title": "把前進和轉彎分開",
      "question": "家長示範 go 直走，請把它配到前進圖卡。這次手指需要改變方向嗎？",
      "followUp": "go 是片後補充；直走與轉向各示範一次再比較。",
      "targetWord": "go"
    },
    {
      "moment": "回看停止口令，再完成第三張卡時",
      "title": "不動也是一種指令",
      "question": "請把 stop 配到停住的動作。若手指仍在慢慢移動，這張卡配對完成了嗎？",
      "followUp": "允許修正後停穩；再由孩子抽卡請家人做一次。",
      "targetWord": "stop"
    }
  ],
  "instructions": [
    "播放蜘蛛手勢暖身，跟著做手指往上爬、雨往下落及太陽出來的動作；坐著也能參與，不需站起來做大動作。",
    "回播較快或較慢段，先看清楚手勢，再用舒服速度模仿；低聲段用自然聲音，不強迫壓低嗓音。",
    "停音樂，每人選爬上、下雨或太陽其中一個手勢帶家人做，其他人先看再跟，輪流後把手放鬆。",
    "喝水，並排放動作圖卡，先讓孩子觀察前進、轉向、停住的差異，不急著全部背英文。",
    "播放 Move! 的轉向與停止短段，聽到口令先指出圖卡，再回播用手指跟做。",
    "片後依序做 turn、go、stop 三次配對；go 由家長新示範，完成轉向後停穩，練 I can turn and then stop.。",
    "輪流抽圖卡出題，對方先選相符動作再操作；每人完成三次分類及一次動作指令合作，不以動得快判定成功。"
  ]
},
  "w3d4b1": {
  "title": "小老師｜我來問身體部位",
  "sentence": "Adventure 27: Show me knees, then point to toes.",
  "videoFocus": "跟身體歌指認四個部位，再輪流當小老師下指令。",
  "focus": "四個身體部位與兩步口令。",
  "younger": "先選 knees 或 toes 圖卡，指出位置並跟說一個詞；輪到當小老師時可以舉手指卡，請家人回答，不必一次給兩個指令。",
  "older": "先用本課句型請家人指出膝蓋、再指出腳趾，觀察對方是否依序完成；接著換用 head 或 shoulders 出一題，輪到回答時自己指認。",
  "caregiverTip": "主課直接唱出head、shoulders、knees、toes。先慢慢指自己或圖卡，聽清楚再做；歌曲速度較快時可暫停逐一說，不要求彎腰碰腳趾。小老師出題先一個部位、再兩個部位，家人普通音量回應。",
  "pausePrompts": [
    {
      "moment": "主課唱到knees與toes後",
      "title": "指認膝蓋",
      "question": "knees在哪裡？先指給我看，再換你問我。",
      "followUp": "先指自己或圖卡，家長再用同一詞回應，不搶答。",
      "targetWord": "knees"
    },
    {
      "moment": "回看四個部位的一輪後",
      "title": "兩個指令的順序",
      "question": "先指knees，再指toes，你能等我說完再依序做嗎？",
      "followUp": "一次太多就分開問，坐著指圖卡也可以。",
      "targetWord": "toes"
    },
    {
      "moment": "片後孩子當小老師時",
      "title": "換你問一題",
      "question": "請用head出題，讓家人找出正確部位。",
      "followUp": "可舉卡代替長句，再換shoulders；讓孩子判斷家人指得是否正確。",
      "targetWord": "head"
    }
  ],
  "instructions": [
    "播放假扮角色暖身的機器人或貓段，先聽聲音，再用手勢和普通音量模仿；孩子不喜歡其他角色時不強迫觀看。",
    "回播選定短段，大人發聲、孩子回應，再交換；不需要尖叫或把聲音越拉越高才算參與。",
    "停音樂，每人選一個喜歡的角色手勢當領隊，家人跟做，最後放慢並讓聲音休息。",
    "喝水，開啟四張身體圖卡。先指自己的頭與肩，預告今天聽身體歌後輪流當小老師。",
    "播放〈Head Shoulders Knees & Toes (Sing It)〉一輪，跟著歌詞指出head、shoulders、knees、toes；跟不上就停片慢指，不比快。",
    "先各問knees與toes，再練Show me knees, then point to toes.；孩子熟悉後換head或shoulders，觀察家人是否依序完成。",
    "完成knees、toes、head三次問答，每人另輪到一次出題與開口；只記自己的回應，不以音量或速度判完成。"
  ]
},
  "w3d4b2": {
  "title": "小老師｜停下指膝蓋，聽中文部位聲音",
  "sentence": "Adventure 28: I stop and point to my knees.",
  "videoFocus": "用 Move! 的 stop、turn 和 knees 支援動作問答，再聽中文身體詞的長短。",
  "focus": "停止口令、指膝蓋與中文詞拍數。",
  "younger": "完成 stop 停手、jump 手指跳、turn 慢轉三題；再指手或膝蓋，用中文說部位，可由大人先示範。",
  "older": "說 I stop and point to my knees.，再比較手的一拍與膝蓋的兩拍；輪流出題讓家人指部位、說中文並拍出長短。",
  "caregiverTip": "保留原先押韻動物暖身。主課直接有停止、轉身與碰膝蓋，jump 是片後補的手指動作。中文部位詞也在停片後練，手拍一下、膝蓋拍兩下，不把英文音節或注音混入。先停穩再指身體，坐姿同樣可完成。",
  "pausePrompts": [
    {
      "moment": "主課停止口令後，家長接著請指膝蓋時",
      "title": "停穩再指出來",
      "question": "請做 stop，停穩後指出自己的膝蓋。停止和指部位，是不是可以分成兩步做？",
      "followUp": "影片有這些詞，但兩步順序由家長組成；不假稱兩句緊接出現。",
      "targetWord": "stop"
    },
    {
      "moment": "片後補充手指動作時",
      "title": "跳完聽一拍",
      "question": "請讓手指 jump 一下，再指自己的手，用中文說「手」。這個部位詞說起來拍幾下？",
      "followUp": "jump 為片後示範；只比較中文「手」的一拍，不用力拍身體。",
      "targetWord": "jump"
    },
    {
      "moment": "回看轉向短段後，孩子出題時",
      "title": "轉向後換個部位",
      "question": "請用 turn 慢轉手掌，再說中文「膝蓋」並拍出聲音。它和「手」的拍數一樣嗎？",
      "followUp": "膝蓋兩拍、手一拍；每人輪流問一題，不顯示注音或要求識字。",
      "targetWord": "turn"
    }
  ],
  "instructions": [
    "播放海灣暖身第3版短段，觀察鴨子開車或老鼠蓋房子的有趣情境，用握方向盤或蓋屋手勢跟拍；這是想像故事，不教真實動物習性。",
    "回播一段，聽兩個押韻詞的結尾聲音，家長先示範、孩子可只聽或跟拍，不要求自己找出新押韻字。",
    "停音樂，輪流選一個剛才看到的動作當小老師，家人用手勢回應，再把動作放慢。",
    "喝水，坐穩或留小空位，打開動作圖卡；先指出自己的手和膝蓋，準備聽英文指令與中文名稱。",
    "播放 Move! 的 stop、turn 與碰膝蓋相關短段，分段回看，不要求一次追完全部身體詞。",
    "依序做 stop、jump、turn 問答；jump 在片後教。再練 I stop and point to my knees.，將停止和指膝蓋分兩步操作。",
    "輪流說中文部位讓家人指出，手拍一下、膝蓋拍兩下；完成三次動作問答與一次部位聲音合作才記錄。"
  ]
},
  "w3d5b1": {
  "title": "任務日｜不用提示，也能介紹身體",
  "sentence": "Adventure 29: These are my shoulders.",
  "videoFocus": "用熟悉身體歌核對head、shoulders、knees，孩子自己介紹肩膀。",
  "focus": "身體詞提取與本週複習。",
  "younger": "先在兩張卡找head或shoulders，再分次找knees；指認後說一個詞即可。",
  "older": "不看提示先指出頭肩膝，再用短段核對；指肩說These are my shoulders.，最後自己加上toes。",
  "caregiverTip": "先關影片問一個熟悉部位，再用Sing It短段核對。四個部位都有歌詞，不新增刷牙情境。歌曲快時隨時停，任務不計速度；These are my shoulders.是片後介紹句。家長可提示，但讓孩子自己再回答一次，不以大人帶唱代替完成。",
  "pausePrompts": [
    {
      "moment": "播放前先提取，主課head段後核對",
      "title": "先想再看",
      "question": "先找head，再看歌曲核對你指的位置是否相同。",
      "followUp": "記孩子先做的答案，需要時提示後再試。",
      "targetWord": "head"
    },
    {
      "moment": "主課shoulders段後",
      "title": "換你介紹自己",
      "question": "請指shoulders，用一個詞或These are my shoulders.介紹給家人。",
      "followUp": "句型是生活延伸，單字回應也接受。",
      "targetWord": "shoulders"
    },
    {
      "moment": "主課knees段後，關閉畫面時",
      "title": "離開畫面也記得",
      "question": "畫面關起來後，你能找knees，再回想它在shoulders下面嗎？",
      "followUp": "可坐著指卡，不比較反應速度。",
      "targetWord": "knees"
    }
  ],
  "instructions": [
    "播放小帆船暖身，用雙手做小船輕搖，跟影片一艘一艘數；較小孩子先參與一到三，其他部分看或跟拍即可。",
    "回播喜歡的數船片段，伸手指或指畫面記數，不要求一口氣背出十個數字才可以繼續。",
    "停音樂，每人選一次小船搖動或停靠的手勢，家人跟做，最後把手放低並慢慢停下。",
    "喝水，打開身體卡；先不播放影片，讓孩子選一個自己記得的部位介紹。",
    "播放〈Head Shoulders Knees & Toes (Sing It)〉短段，核對head、shoulders、knees；速度太快便停片，不要求連續跟完。",
    "關閉畫面再指自己的肩膀，練These are my shoulders.；讓孩子自己選一個其他部位補充。",
    "依序完成head、shoulders、knees三次複習及一次開口，回看只用來核對不代替回答；每人各自記錄。"
  ]
},
  "w3d5b2": {
  "title": "任務日｜聽清楚，動作接力",
  "sentence": "Adventure 30: First turn, next go, and finally stop.",
  "videoFocus": "跟舞蹈歌移動、轉向和停止，再輪流帶一段自己的動作接力。",
  "focus": "本週身體與動作詞的順序複習。",
  "younger": "先跟家長做 go 原地走、stop 停下兩步，再分次試 turn；可坐著用手指走動，指對圖卡或跟說一個口令即可。",
  "older": "先辨認影片的轉向和停止，再自己帶 turn、go、stop 三步，說 First turn, next go, and finally stop.；請家人看完成順序，換人帶時自己聽口令回應。",
  "caregiverTip": "使用本課動作圖卡與平穩小空間，不需新道具。Move! 確實有停止、轉向及觸碰身體部位的指令；go 與 jump 另在家長複習時加入，不把它們說成同一段原歌詞。家長示範左右時與孩子朝同一方向，初學者先跟動作即可；轉身幅度小、跳躍可換抬腳或坐姿手勢。暖身 Alice The Camel 是不同動物的一到八計數版，不是駱駝駝峰倒數版本。",
  "pausePrompts": [
    {
      "moment": "主課轉向指令示範後",
      "title": "看清楚再轉向",
      "question": "聽到 turn，你看到角色改變了什麼方向？慢慢做一次，或用手指示範。",
      "followUp": "家長與孩子面向相同方向示範，不以左右背熟或轉滿一圈作完成條件。",
      "targetWord": "turn"
    },
    {
      "moment": "主課短段結束，家長開始動作接力時",
      "title": "我加入開始口令",
      "question": "這次由我說 go，請你原地踏一步。這是繼續動，還是停下？",
      "followUp": "說明 go 是家長複習加上的口令，不是要預測影片下一句；先聽再動。",
      "targetWord": "go"
    },
    {
      "moment": "主課移動後出現停止口令時",
      "title": "停穩再帶下一個",
      "question": "影片說 stop 了，身體要怎麼做？停穩後換你帶家人一次。",
      "followUp": "再把 turn、go、stop 串成自己的三步順序；小孩子可只做開始和停止，不用急著趕拍。",
      "targetWord": "stop"
    }
  ],
  "instructions": [
    "播放 Alice The Camel 暖身，觀察不同動物的數量特徵：駝峰、耳朵、腳趾等；依影片一到八的順序用手指或拍手跟數，不做不存在的駝峰倒數。",
    "回播一個喜歡的動物段，先指畫面再說數量，較小孩子可只比一或二；不把歌中角色特徵當所有同種動物都一模一樣。",
    "停音樂，每人選一個動物動作或數量手勢帶家人做，其他人回應，再把雙手放鬆。",
    "喝水，清出小空間並打開動作圖卡。家長和孩子面向同一方向，先約好原地小動作、停止時站穩或坐穩，再看舞蹈主課。",
    "播放 Move! 短段，跟著移動、停下、抬手和轉向；在 stop 後暫停確認孩子停穩。身體詞用指認代替一定要摸到，觸碰腳趾也可只指圖卡。",
    "回看轉向與停止片段，再由家長加 go 作開始口令，帶 First turn, next go, and finally stop. 三步接力。想複習 jump 時另外加一個小跳、抬腳或手指跳，清楚說是家長的新回合。",
    "完成三回合複習：turn 改方向、go 開始、stop 停下；每人輪到一次帶隊或回應。最後選一個本週最熟的身體詞和家人分享，按每位孩子的實際參與記錄，完成後再領取對應獎勵。"
  ]
}
};

/** Fourth-week teaching corrections. Exact version bindings and remaining variant gaps are in qa/content-review. */
const fourthWeekReviewedGuidance: Record<string, ReviewedTeachingGuidance> = {
  "w4d1b1": {
  "title": "探索日｜說我累了，提出休息",
  "sentence": "Adventure 31: I feel tired. I need a rest.",
  "videoFocus": "聽 Hello! 裡明確的 tired 回答，學著說自己的狀態並提出休息。",
  "focus": "疲累的辨識與休息需求表達。",
  "younger": "先指 angry 情境卡，再跟說 tired 或比休息手勢，最後指 happy；不必演出難過或生氣才算參與。",
  "older": "分辨三張卡的情境，聽到 tired 後練 I feel tired. I need a rest.；可說明想坐一下、喝水或暫停，不要求真的疲累。",
  "caregiverTip": "原本 Walking Walking 暖身保留，不以故意把孩子操累來製造情境。Hello! 直接唱 tired，也有 hungry 與 not so good，不能把它們都叫作疲累；angry/happy 另以玩偶故事練。sleepy 偏想睡，tired 不一定想睡。句型的 I need a rest. 由家長另教，孩子可說實際感受。",
  "pausePrompts": [
    {
      "moment": "播放主課前，玩偶作品被碰倒的情境時",
      "title": "先辨情緒",
      "question": "玩偶說它 angry，因為作品被碰倒。請找 angry 圖卡，它是在說累了還是生氣？",
      "followUp": "用家長設定的故事，不替孩子猜心情；影片沒有 angry，不要求找畫面。",
      "targetWord": "angry"
    },
    {
      "moment": "主課唱出疲累回答後",
      "title": "說出需要休息",
      "question": "聽到 tired，請找對應圖卡。假如你也累了，想先坐一下，可以怎麼告訴家人？",
      "followUp": "示範 I feel tired. I need a rest.；後半句是家庭延伸，累不一定要睡。",
      "targetWord": "tired"
    },
    {
      "moment": "片後玩偶休息後想一起玩的新情境時",
      "title": "新的感受再選一次",
      "question": "現在玩偶說一起玩讓它 happy，請換到 happy 圖卡。它和剛才 angry 的情境有什麼不同？",
      "followUp": "休息不保證立刻快樂；是玩偶主動說出感受，孩子可回應自己的真實心情。",
      "targetWord": "happy"
    }
  ],
  "instructions": [
    "播放 Walking, Walking 暖身的動作示範短段，先跟做走路與停下。孩子可以原地踏步或坐著動手，不必在屋內奔跑。",
    "回播一段清楚的動作，先聽再模仿；只選孩子容易做的一兩種，不把 angry 或 tired 插成原影片口令。",
    "暫停影片，輪流做領隊：一人示範動作、一人跟做，最後一起停下；這一輪是家庭遊戲，不用連續觀看十五分鐘。",
    "喝水，準備心情圖卡與一個玩偶；先演作品被碰倒的 angry 故事，讓孩子指卡，不要求自己生氣。",
    "播放 Hello! 的問候與 tired 回答短段，回播聽清楚疲累一詞；把 hungry 和 tired 分開，不把所有不舒服都叫累。",
    "依序完成 angry、tired、happy 三題； tired 接休息請求，happy 換成玩偶想一起玩的情境，練 I feel tired. I need a rest.。",
    "每人說一個當下感受或選卡，再提出可行的需要；確認三次認識與一次開口，孩子說不累也接受。"
  ]
},
  "w4d1b2": {
  "title": "探索日｜家人野餐與心情分享",
  "sentence": "Adventure 32: My family listens to me.",
  "videoFocus": "看家人準備野餐，課後練習輪流聽家人說心情。",
  "focus": "家人稱呼、野餐情境與傾聽延伸。",
  "younger": "從本課圖卡指出 mom 或 dad，再用中文、手勢或一個心情詞表示感受；輪到同伴時先停下來聽。",
  "older": "指認 family、mom、dad、brother，練 My family listens to me.，再輪流用中英文說一個感受；先聽完，再用自己的話回應。",
  "caregiverTip": "使用本課家人圖卡；也可自願拿一張家人照片，不必湊齊歌曲所有成員。歌中 mommy／daddy 和圖卡 mom／dad 都是在稱呼媽媽／爸爸。主課的野餐不等於每個人都有相同心情，傾聽活動放在影片後；由孩子自己說感受。萬聖節暖身可選短段，若孩子不喜歡角色，暫停改用家長示範的手勢節奏。",
  "pausePrompts": [
    {
      "moment": "主課媽媽爸爸野餐段後",
      "title": "媽媽的稱呼連起來",
      "question": "請找 mom 圖卡。歌裡的 mommy 和這張 mom，說的是同一種家人稱呼嗎？",
      "followUp": "先解釋兩種說法再指圖；不要求孩子自己家裡一定有這位照顧者，可談假想家庭。",
      "targetWord": "mom"
    },
    {
      "moment": "同一主課段回看 daddy 之後",
      "title": "爸爸的圖卡由你找",
      "question": "輪到你找 dad 圖卡；歌裡用 daddy，你會指哪一張，再請家人核對？",
      "followUp": "讓孩子先做自己的選擇再核對，不以能記住野餐食物取代認識 dad；媽媽和爸爸不強迫由外貌刻板印象判斷。",
      "targetWord": "dad"
    },
    {
      "moment": "片後家人輪流分享心情時",
      "title": "整個家庭都輪到說",
      "question": "請找 family 圖卡。現在一位家人正在說感受，你能先聽完，再說自己想讓家人聽的一件事嗎？",
      "followUp": "將家庭整體連到實際傾聽；可用中文或手勢，不替孩子決定必須開心，也不以旁觀代替輪到。",
      "targetWord": "family"
    }
  ],
  "instructions": [
    "播放萬聖節海灣暖身短段，跟節奏輕擺、拍手，先看誇張想像角色的動作，不要求學會全部節慶詞。",
    "選孩子願意看的短段回播，模仿一個小動作；不喜歡角色時就停片，由家長用相同節拍帶拍手或擺手。",
    "暫停音樂，輪流設計一個動作給家人跟做，換人前停一拍；不把這首歌當作家人稱呼的教材。",
    "喝水，拿出本課家人圖卡。預告主課看家人一起準備野餐，再回到家庭練習互相傾聽。",
    "播放家人野餐主課，在一組家人介紹完後暫停，指出對應圖卡。說明 mommy／mom、daddy／dad 的稱呼關係；不需要記住所有食物。",
    "用圖卡認識家人後，家長另示範一次傾聽：一人說感受，另一人等他說完。練 My family listens to me.，再交換角色；這是家庭延伸活動。",
    "完成 family、mom、dad 三次圖卡指認，再讓每人輪到一次心情分享或傾聽回應。接受各種家庭成員和中英文表達，不以感受是否符合家長期待判完成。"
  ]
},
  "w4d2b1": {
  "title": "動起來｜生日祝福與真實感受",
  "sentence": "Adventure 33: I feel happy at the party.",
  "videoFocus": "唱生日祝福，再用情境圖卡練習不同感受。",
  "focus": "生日慶祝與課後心情表達。",
  "younger": "先跟著拍手送祝福，再指出 happy 圖卡；也可指出自己現在的心情，不必一直笑或唱完整句。",
  "older": "以玩偶的派對情境練 I feel happy at the party.，再把 happy 換成另一個合適感受；能說明是假裝情境或自己的真實感受。",
  "caregiverTip": "準備一個玩偶及本課四張心情圖卡，假裝為玩偶慶生即可，不必準備蛋糕或生日用品。主課是生日祝福歌，sad、angry、tired 是家長加入的情境討論，不等待影片出現。模仿表情只是認識詞義，孩子不想被圍著唱歌或不覺得開心都可以說出來。",
  "pausePrompts": [
    {
      "moment": "主課唱完一段生日祝福後，另開玩偶派對情境",
      "title": "收到祝福的玩偶",
      "question": "假裝玩偶喜歡家人為它唱歌，可以用哪張心情圖卡？先找 happy。",
      "followUp": "說清楚是玩偶的假裝情境；不要因為在過生日就要求真人一定開心。",
      "targetWord": "happy"
    },
    {
      "moment": "課後加入等待朋友的情境時",
      "title": "派對也可能有別的感受",
      "question": "假裝玩偶想見的朋友還沒到，它覺得難過。請從圖卡找 sad；你會怎麼陪它？",
      "followUp": "這是課後加入的故事，不是影片下一幕。可以先坐在玩偶旁邊，再用中文或英文回應。",
      "targetWord": "sad"
    },
    {
      "moment": "課後比較情境圖卡時",
      "title": "可以說出不舒服",
      "question": "假裝玩偶的玩具被拿走，它說自己生氣了。哪張是 angry？你可以請家人聽它說嗎？",
      "followUp": "以玩偶說出的感受為線索，不鼓勵搶玩具或強迫孩子演生氣；也可只指圖卡。",
      "targetWord": "angry"
    }
  ],
  "instructions": [
    "播放拖拉機數數暖身，跟著一到十的節奏原地踏步，或坐著轉動雙手假裝開車；較小孩子先數到三。",
    "回播一段往上數或倒數，伸出手指或拍手配數量。較大孩子可從三倒數到一，較小孩子仍向上數，不要求兩種方式都會。",
    "停音樂，輪流當司機：家長說一到三，孩子做相同次數的踏步或手勢，然後停車；情緒詞留到主課後另練。",
    "喝水，請玩偶坐在家人中間，預告要用生日歌送祝福，再用心情圖卡演幾個小故事。",
    "播放生日祝福主課的一段，孩子願意時跟拍或跟唱，再向玩偶送祝福；不等待sad或angry的畫面，也不強迫真人成為慶祝焦點。",
    "用玩偶派對練 I feel happy at the party.，再加入等待朋友、需要安靜等家長自編情境。說自己感受時可換其他詞，不把生日和開心畫成唯一配對。",
    "用三個玩偶情境分別指認 happy、sad、angry，再讓每人說一個感受詞或示範祝福動作。辨識假裝情境可提示重試；真實感受不判對錯，只記實際參與。"
  ]
},
  "w4d2b2": {
  "title": "動起來｜叫家人，說說我的心情",
  "sentence": "Adventure 34: I feel sad. Can you listen?",
  "videoFocus": "辨識表情歌的 sad 與 angry，片後叫家人、說感受並請對方傾聽。",
  "focus": "難過、生氣的表達與家人稱呼聲音。",
  "younger": "按順序指 sad、angry、tired，願意時做一個溫和手勢；用中文叫家人，對方回應後說一個感受詞。",
  "older": "回看 sad 與 angry，片後比較 tired；再說「媽」「媽媽」拍出一拍兩拍，練 I feel sad. Can you listen?，交換說話與傾聽的角色。",
  "caregiverTip": "保留原暖身。主課直接有 sad/angry，tired 在片後用走累的玩偶情境練，不能拿 sleepy 直接替代。中文「媽」和「媽媽」的一拍兩拍屬家庭稱呼活動。表情不是診斷他人感受的唯一方法；先問對方怎麼想，不要求孩子誇張表演。",
  "pausePrompts": [
    {
      "moment": "主課 sad 表情段結束後，先回到圖卡時",
      "title": "叫到家人再說",
      "question": "請找 sad，向家人說這個詞，再試著請他聽你說。家人怎麼回應會讓你知道他在聽？",
      "followUp": "可示範 I am listening 或中文「我在聽」；請求句在片後教，不冒稱歌詞。",
      "targetWord": "sad"
    },
    {
      "moment": "回到主課 angry 短段，做第二題時",
      "title": "不同感受也能說",
      "question": "請找 angry 圖卡，說出一個玩偶可能生氣的原因。它一定要大聲吼叫才能表示 angry 嗎？",
      "followUp": "不一定；可平靜說感受，先示範再讓孩子選擇自己的表達方式。",
      "targetWord": "angry"
    },
    {
      "moment": "片後玩偶走累了，改叫家人時",
      "title": "疲累不是生氣",
      "question": "玩偶走累了說 tired，請選卡，再用中文叫「媽」和「媽媽」。兩種稱呼各可以拍幾下？",
      "followUp": "tired 由家長補充，不用 sleepy 畫面充當證據；名字拍數只比較中文聲音。",
      "targetWord": "tired"
    }
  ],
  "instructions": [
    "播放飛機數數暖身，手臂輕擺當機翼，跟著數量原地踏步；較小孩子先跟到三，不在室內追逐飛行。",
    "回播一段順數或倒數，以手指或拍手配數量；較大孩子試著從三倒數到一，較小孩子可維持順數。",
    "停音樂，輪流說一到三，家人做相同次數的機翼動作；這是數量暖身，稍後的中文拍聲音會另說明規則。",
    "喝水，開啟心情圖卡，請家人先示範聽完一句話才回應；預告主課會辨難過與生氣。",
    "播放表情歌並選 sad、angry 短段分別回看；可以指卡或跟說，不要求用表情猜出人的全部感受。",
    "先做 sad、再回看 angry，最後用片後走累情境練 tired；叫一位家人後說 I feel sad. Can you listen?。",
    "用中文「媽」「媽媽」比較一拍兩拍，輪流叫家人、說感受、聽回應；本人完成三題跟做及一次稱呼聲音合作才記錄。"
  ]
},
  "w4d3b1": {
  "title": "配對日｜每個家庭都不一樣",
  "sentence": "Adventure 35: My family is special to me.",
  "videoFocus": "聽每個家庭不同、各有特色的歌曲段落，再用 brother、mom、family 圖卡分清一位家人與家庭整體。",
  "focus": "家庭差異與歸屬感，延伸個人／家庭整體分類。",
  "younger": "指出 mom 或 brother 圖卡，再找表示整個家庭的 family；可以指卡或說一個詞，不必介紹自己的家人。",
  "older": "把本課圖卡分成「一位家人」和「整個家庭」，說明 family 包含多人，再練 My family is special to me.；可用中文說一件喜歡一起做的事。",
  "caregiverTip": "使用本課家人圖卡即可，不需要家庭照片。主課唱家人關愛，也明確談每個家庭不同、各有特色，不把它當逐一介紹 mom、dad、brother 的點名歌；稱呼與分類在課後用圖卡教。family 是家庭整體，不能和 mom、brother 當成同一層級的人數相加。尊重每個家庭不同，不要求擁抱、比較誰最愛誰或公開私事。",
  "pausePrompts": [
    {
      "moment": "主課家庭不同的段落後，拿出整體圖卡",
      "title": "家庭不需長得相同",
      "question": "請找 family 圖卡。它是在說一位人物，還是整個家庭？和別的家庭不同，仍然可以是 family 嗎？",
      "followUp": "接住不同家庭組成，指整體與個別人物作比較；不以家庭成員數或外貌判好壞。",
      "targetWord": "family"
    },
    {
      "moment": "片後第一位家人分類時",
      "title": "兄弟放在哪一組",
      "question": "請找 brother 圖卡，指向「一位家人」或「整個家庭」其中一邊。你為什麼這樣分？",
      "followUp": "孩子指對組即可，較大孩子說明稱呼一位成員；不要求真的有哥哥或弟弟。",
      "targetWord": "brother"
    },
    {
      "moment": "片後另一位家人加入分類時",
      "title": "換媽媽還會分嗎",
      "question": "請找 mom 圖卡。它應和 brother 一起放在一位家人組，還是放在 family 整體組？",
      "followUp": "先讓孩子自己分類，再練本課家庭句；不是將 mom、brother、family 三卡算成三個人。",
      "targetWord": "mom"
    }
  ],
  "instructions": [
    "播放雪花暖身短段，跟節奏輕擺雙手；家長示範手指由上慢慢往下，假裝雪花落下。這個動作由家長帶，不必等待固定鏡頭。",
    "回播喜歡的一小段，孩子選自己的雪花手勢；較小孩子坐著擺手也可以，不追求跟別人完全相同。",
    "停片，輪流做一個不同的小手勢，家人跟做一次；最後一起停下，不把家人稱呼硬塞進暖身歌詞。",
    "喝水、打開家人圖卡。先說每個家庭成員不同，今天先聽關愛家人的歌，再練一位家人和整個家庭。",
    "播放 I Love My Family 的家庭重複段和談每個家庭不同的段落，停片請孩子指 family；談特色可用假想家庭，不要求擁抱或私事。mom、brother 的稱呼分類在片後用圖卡做。",
    "在桌上用左右兩邊表示「一位家人」和「整個家庭」；輪流看圖卡指向一邊，先分 mom、brother，再分 family。圖卡留在螢幕，不需列印。",
    "完成 brother、family、mom 三次分類，說出或跟說 My family is special to me.；較小孩子補 family 或指卡，較大孩子說明一位家人與家庭整體的差別。"
  ]
},
  "w4d3b2": {
  "title": "配對日｜數一數玩偶家庭的心情",
  "sentence": "Adventure 36: Two people feel happy.",
  "videoFocus": "從表情歌曲辨認心情，再用一個物件代表一位家人來數數。",
  "focus": "表情辨識與家庭人數的一對一計數延伸。",
  "younger": "先將 tired 玩偶配卡，再把兩個 happy 放一起，最後放一個 sad；可以只數到三，第四個由家人陪同點數。",
  "older": "先將一個說 tired 的家人放在休息處，再把另外三個玩偶分成兩個 happy、一個 sad；先數三個，再加回疲累家人數四個，練 Two people feel happy.。",
  "caregiverTip": "準備四個大積木或玩偶，每個代表一位假想家人；旁邊打開本課心情圖卡，不使用真實家庭照片推測心情。主課的南瓜表情用來認識 happy、sad、angry 等詞，tired 是主課以外由家長補充的詞，播放前先用玩偶示範。數家人活動在影片後進行，不把南瓜數量冒充家人人數；每人只放入自己這回合選的一組，避免重複計數。",
  "pausePrompts": [
    {
      "moment": "播放前先把疲累玩偶放在休息處時",
      "title": "先分出想休息的人",
      "question": "這個玩偶說自己 tired，請把它配到疲累圖卡，暫時坐在旁邊。它一定也是 sad 嗎？",
      "followUp": "不一定；tired 是家長情境，主課歌詞沒有這個詞。先保留這個玩偶，等一下再數全家。",
      "targetWord": "tired"
    },
    {
      "moment": "主課 happy 段後，給兩個玩偶快樂圖卡時",
      "title": "數這一組",
      "question": "請把兩個說 happy 的玩偶放同一組，碰一個數一次。這一組總共有幾個？",
      "followUp": "數完說 Two people feel happy.；兩個快樂玩偶是家長設定，不宣稱影片固定出現兩人。",
      "targetWord": "happy"
    },
    {
      "moment": "主課 sad 段後，再加入一個難過玩偶時",
      "title": "另一組再合起來",
      "question": "請把說 sad 的玩偶放在另一組。加上剛才兩個快樂玩偶有幾個，再加回疲累的那一個呢？",
      "followUp": "先確認難過組一個，再合計三個、四個；若太難只完成分類，由家長陪點數。",
      "targetWord": "sad"
    }
  ],
  "instructions": [
    "播放草原牛仔暖身短段，跟節拍原地踏步或輕擺雙手；欣賞押韻的想像情境，不要求孩子騎跳或學會全部動物詞。",
    "回播一小段，家長帶兩下拍手、兩下踏步；動作由家長示範，不把 tired 或 happy 說成歌曲口令。",
    "停片，孩子輪流當領隊，用一到三次拍手讓家人跟做，先練聲音與次數的一對一對應。",
    "喝水，拿四個玩偶或積木當家人；先讓一個玩偶說 tired，配到圖卡並坐在休息處，這是影片以外的情境。",
    "播放主課的 happy、sad 表情短段，願意時跟說；再用圖卡分組，不要求影片替我們數出兩個快樂的人。",
    "依序完成 tired、happy、sad 三次分類：一個疲累先在旁邊，兩個快樂同組，再加一個難過；先數三個，再把疲累玩偶加入數四個。",
    "孩子自己碰一個數一次，練 Two people feel happy.，再交換角色請家人分類；每人完成三題及一次數家人合作才記錄。"
  ]
},
  "w4d4b1": {
  "title": "小老師｜讓家人猜猜心情卡",
  "sentence": "Adventure 37: I feel angry. I need a moment.",
  "videoFocus": "看表情歌辨認happy、sad、angry，再用圖卡輪流問答。",
  "focus": "辨認表情、表達感受與需要。",
  "younger": "從兩張卡選 happy 或 sad，跟家長說一個詞；輪到出題可直接指出一張卡讓家人回答。",
  "older": "用 happy、sad、angry 圖卡輪流出題；選生氣的玩偶情境時練 I feel angry. I need a moment.，也可替換成自己實際需要。",
  "caregiverTip": "〈This Is A Happy Face〉直接唱出happy、angry、sad，也有sleepy等表情。先選三個已學詞逐段暫停；tired是片後談疲累的生活延伸，sleepy偏想睡，兩者不當完全同義。圖卡可核對，孩子真實感受不設標準答案；不要求一定表演。",
  "pausePrompts": [
    {
      "moment": "主課happy表情段後",
      "title": "找出快樂表情",
      "question": "請找happy圖卡，再選擇指卡或做一個happy表情。",
      "followUp": "先辨認歌曲示例，不要求孩子此刻一定開心。",
      "targetWord": "happy"
    },
    {
      "moment": "主課sad表情段後",
      "title": "輪到你出題",
      "question": "請選sad圖卡給家人猜，你能說sad或指出來嗎？",
      "followUp": "家人回答後換角色，讓孩子也有回答機會。",
      "targetWord": "sad"
    },
    {
      "moment": "主課angry表情段後，轉入玩偶情境時",
      "title": "說出感受與需要",
      "question": "玩偶說自己angry，請找angry圖卡；想先停一下可以怎麼說？",
      "followUp": "家長示範I feel angry. I need a moment.，這是課後溝通練習；可只說angry或做暫停手勢。",
      "targetWord": "angry"
    }
  ],
  "instructions": [
    "播放北極節慶暖身短段，跟著節拍小幅擺手、拍手；把奇妙押韻情境當歌曲想像，不要求孩子知道全部節慶詞。",
    "回播孩子喜歡的一段，由家長示範兩個簡單動作；可坐姿跟做，不把 happy 或 sad 插成原歌詞。",
    "停片，輪流選拍手或擺手讓家人跟做，換人前停一拍，練習等待和聆聽。",
    "喝水，拿出心情圖卡。說明待會辨認歌中的表情，自己的感受可以和角色不同。",
    "播放〈This Is A Happy Face〉，happy、angry、sad各選一段暫停，找相符圖卡；不用模仿全部表情。",
    "輪流選happy、sad、angry卡讓家人猜，再換角色；用玩偶演需要暫停的情境，練I feel angry. I need a moment.。",
    "每位孩子完成happy、sad、angry三次問答並輪到一次出題；另外聊tired與想睡的差別，不代替孩子決定感受。"
  ]
},
  "w4d4b2": {
  "title": "小老師｜我是家庭的一份子",
  "sentence": "Adventure 38: I am part of my family.",
  "videoFocus": "從家人野餐辨認 daddy/dad、brother 與 family，片後輪流當小老師問圖卡，再表達自己也是家庭一份子。",
  "focus": "家人稱呼與家庭整體，片後 I am 自我表達。",
  "younger": "指 family 圖卡，再用手勢指自己，補說 family；也可指出 mom 或 dad，不必扮演不存在的家庭成員。",
  "older": "說 I am part of my family.，再用中文或英文介紹家裡一位成員；看 dad、brother、family 圖卡時能分清一個稱呼與整個家庭。",
  "caregiverTip": "使用本課家人圖卡，不需列印或私人照片。主課直接教家人野餐中的 mommy、daddy、brother 等稱呼，先將 daddy 對照 dad；mom/dad 不必原樣出現在歌詞。片後指自己再指 family，練 I am part of my family.，不說影片逐字唱出這句。每人可介紹圖卡家庭，不要求扮演爸爸、兄弟或湊成影片所有成員。",
  "pausePrompts": [
    {
      "moment": "主課 daddy 段後，停片問家人圖卡",
      "title": "小老師先問爸爸",
      "question": "歌裡說 daddy，圖卡寫 dad。請你問家人哪張是 dad，等他指出後再核對。",
      "followUp": "先教同義稱呼，再讓孩子真的出一次題；可談圖卡假想家庭，不要求指認在場真人。",
      "targetWord": "dad"
    },
    {
      "moment": "主課 brother 段後，孩子換一題",
      "title": "第二題讓誰來答",
      "question": "請找 brother 圖卡，先不要把答案指給家人看，問他 brother 在哪裡，再聽他的回答。",
      "followUp": "小老師練等待和核對，孩子自己也需回答一次；沒有兄弟也能用圖卡完成。",
      "targetWord": "brother"
    },
    {
      "moment": "片後回到自己與家庭的關係時",
      "title": "一份子與整體",
      "question": "請指自己，再指 family 圖卡。你想怎麼表示自己是這個家庭的一份子？",
      "followUp": "由家長帶 I am part of my family.，年幼孩子補 family 或指圖即可；句型是片後延伸，不冒充歌詞。",
      "targetWord": "family"
    }
  ],
  "instructions": [
    "播放排隊暖身，跟著慢慢走和停下，雙手放身旁，家長做領隊；只有一個孩子時也能和家長排成短隊。",
    "回播排隊段落，孩子練看前面、慢慢跟上，保持不碰撞的距離；坐姿孩子可用手指在桌面慢走跟隊。",
    "停片，輪流當領隊走一小段，再用手勢請下一位接棒；不把 dad、brother 改成原影片動作口令。",
    "喝水、打開 dad、brother、family、mom 圖卡，預告先從野餐歌曲找家人，再由孩子出題，最後談自己和家庭的關係。",
    "播放 The Family Tree 的爸爸媽媽及兄弟姊妹段，聽稱呼後停片指圖；將 daddy/dad 連起來，再看 family 表示整體。野餐食物只作情境，不加成新考題。",
    "片後用家人圖卡問答：dad 是一位稱呼，family 是整體；孩子指自己再指家庭卡，練 I am part of my family.，介紹另一位家人可用中文。",
    "完成 dad、brother、family 三次圖卡問答，每人輪到一次用 I am 表達自己與家庭的關係；較小孩子說 family 或指自己和圖卡，較大孩子補一句介紹。"
  ]
},
  "w4d5b1": {
  "title": "任務日｜用聲音和圖卡複習心情",
  "sentence": "Adventure 39: I feel happy when we play together.",
  "videoFocus": "跟著快樂歌曲玩聲音，再用三個玩偶情境複習心情詞。",
  "focus": "快樂歌曲的聲音變化與課後情緒複習。",
  "younger": "聽到 happy 時跟說一次或輕拍手；用本課圖卡完成 angry、tired、happy 三次指認，較難的詞可由家長先示範。",
  "older": "輪流用自然舒服的高低音跟說 happy，再以三張圖卡說明玩偶情境；練 I feel happy when we play together.，也可用中文說自己喜歡一起做什麼。",
  "caregiverTip": "準備一個玩偶並打開本課心情圖卡。暖身是數到五的手指歌，主課主要玩 happy 的反覆唱答和聲音變化；angry、tired 放在片後另用情境複習。用自然音量即可，高低音不是大聲喊叫，不必追上最快段落。圖卡辨識可以提示後重試；孩子自己的感受不要求跟歌曲一樣。",
  "pausePrompts": [
    {
      "moment": "主課唱答後，先做作品被碰倒的片後情境時",
      "title": "讓玩偶說清楚",
      "question": "玩偶說作品被碰倒讓它 angry，請找到 angry 圖卡。它可以怎麼請家人一起整理？",
      "followUp": "這是家長故事，影片不唱 angry；可示範說明需要，不要求大叫。",
      "targetWord": "angry"
    },
    {
      "moment": "片後第二個情境，玩偶想暫停時",
      "title": "先聽休息需求",
      "question": "玩偶剛玩了一會兒，說自己 tired。請找 tired 圖卡，再幫它選一個可以休息的位置。",
      "followUp": "疲累不是犯錯；不要求把累的表情演得誇張，孩子說不累也可以。",
      "targetWord": "tired"
    },
    {
      "moment": "回播主課一段 happy 唱答，完成第三題時",
      "title": "一起玩聲音",
      "question": "請找 happy 圖卡，用舒服的高音或低音跟說一次。和家人一起唱時，你喜歡選哪一種聲音？",
      "followUp": "高低不同於大小聲，不追最快段；再練本課一起玩的句型，允許說真實感受。",
      "targetWord": "happy"
    }
  ],
  "instructions": [
    "播放蜂巢手指暖身，先把手輕握，再隨數量逐一伸出手指；較小孩子先跟到三，較大孩子數到五。",
    "回播一段，跟著手指向上、向下或左右輕移；每伸一指配一個數字，動作慢一點也可以。",
    "停片，由孩子決定伸出一到五指，家人跟著數，再交換帶隊；這是家長加入的輪流遊戲，不把 angry 插成歌詞。",
    "喝水，拿出玩偶和心情圖卡。預告主課先玩聲音，之後用三個小情境複習本週學過的詞。",
    "播放快樂歌曲一段唱答，跟說 happy；有高低聲音變化時，選一種舒服的聲音試一次。看完一段就停下，不等待 angry 或 tired 畫面。",
    "用家長自編故事依序練：玩偶作品被碰倒說 angry、玩久想休息說 tired、喜歡一起玩說 happy。每次先聽情境再選圖卡，不把玩偶的感受套到孩子身上。",
    "完成 angry、tired、happy 三次複習，再讓每人跟說 I feel happy when we play together. 或說一個實際感受詞；說不出時先示範再重試，只記孩子真的參與的項目。"
  ]
},
  "w4d5b2": {
  "title": "任務日｜說出心情，謝謝家人",
  "sentence": "Adventure 40: Thank you for listening to me.",
  "videoFocus": "複習表情與疲累，練習聽家人說感受並表達感謝。",
  "focus": "情緒辨識與課後家庭傾聽、感謝延伸。",
  "younger": "指出 tired、happy 或 sad 圖卡，讓家人聽自己說一個詞；家人回應後，可說 Thank you 或用點頭手勢表示。",
  "older": "完成三個情境的心情指認，再輪流說感受、聽家人回應，練 Thank you for listening to me.；可用中文補充自己想感謝哪件事。",
  "caregiverTip": "用本課圖卡及一個玩偶即可。睡前暖身適合坐姿輕擺、伸展和說晚安，本課不需真的睡覺。主課介紹多種表情，sleepy 是想睡，tired 是疲累，疲累圖卡另在片後複習。感謝不是影片必有的台詞：家長先示範聽完孩子說話，再讓孩子表達謝意，不要求心情先變開心才算完成。",
  "pausePrompts": [
    {
      "moment": "睡前暖身後，回到本課疲累圖卡",
      "title": "想睡與疲累分開說",
      "question": "如果玩偶走累了，只想坐一下，請找 tired 圖卡。它需要立刻睡著才能算 tired 嗎？",
      "followUp": "可以回答不一定；想睡和累了可能一起出現，也可能不同，這裡練的是片後情境。",
      "targetWord": "tired"
    },
    {
      "moment": "主課一段表情結束後，回到本課圖卡",
      "title": "複習兩種不同感受",
      "question": "請指出 happy 圖卡，想一件可能讓玩偶開心的小事。你想用指卡、單字或一句話讓家人知道？",
      "followUp": "先核對圖卡意思；不替孩子決定他看完影片就應該開心，也不猜下一幕順序。",
      "targetWord": "happy"
    },
    {
      "moment": "課後家人傾聽的玩偶情境時",
      "title": "有人願意聽我說",
      "question": "假裝玩偶說自己 sad，家人停下來聽它說完。請找 sad 圖卡，再試著向願意聽的人說謝謝。",
      "followUp": "家長先示範回應「我在聽」，再教本課感謝句；謝謝與難過可以同時存在。",
      "targetWord": "sad"
    }
  ],
  "instructions": [
    "播放睡前暖身短段，坐著跟節拍輕擺雙手、伸伸肩膀，再向玩偶說晚安；聲音保持舒服，不要求站起來做大動作。",
    "回播一段晚安動作，孩子可用手靠臉旁表示休息；只是歌唱遊戲，不用閉眼走動或真的睡著。",
    "停片，輪流向玩偶做一個安靜手勢，另一人回應；收起動作、坐回原位，準備看心情圖卡。",
    "喝水，打開本課圖卡。先說明 tired 是累了，sleepy 偏向想睡；今天會複習感受，再練家人互相傾聽和感謝。",
    "播放表情主課的一小段，回到圖卡辨識 happy 和 sad，願意時模仿或跟說；不要求等到所有表情唱完，也不把 sleepy 直接改叫 tired。",
    "用玩偶做三個簡短情境：走累想坐下找 tired、喜歡一起玩找 happy、想念朋友找 sad。接著一人說感受，另一人停下聽並回應，再練 Thank you for listening to me.",
    "完成 tired、happy、sad 三次複習，每人輪到一次說感受或傾聽回應，最後表達感謝。較小孩子說 Thank you 或用手勢，較大孩子補完整句；家長只記實際完成者。"
  ]
}
};

const fifthWeekReviewedGuidance: Record<string, ReviewedTeachingGuidance> = {
  "w5d1b1": {
  "title": "探索日｜聽名字，認識貓狗與鳥",
  "sentence": "Adventure 41: I see three cats.",
  "videoFocus": "第一次把英文寵物名稱和圖像對上，片後以三個手指或玩具代表三隻貓，練單數與複數。",
  "focus": "聽名字，認識貓狗與鳥",
  "younger": "先指cat、dog、bird各一次，再伸三根手指代表三隻貓；說一個詞也可以。",
  "older": "聽動物名找到圖卡，再用三根手指或三個玩具當貓，一對一數並練I see three cats.；同一角色重複出現不重複計數。",
  "caregiverTip": "主課有cat、dog、bird、fish，先找前三種。歌中的獅子是誇張情節，glub是魚的歌曲擬聲，不當飼養或生物聲音知識。",
  "pausePrompts": [
    {
      "moment": "聽到cat後",
      "title": "看清楚再回答",
      "question": "歌裡哪一隻是cat？請找同一種動物圖卡。",
      "followUp": "先指再跟說，不依叫聲大小搶答。",
      "targetWord": "cat"
    },
    {
      "moment": "聽到dog後",
      "title": "換個線索試試",
      "question": "請找dog，它和cat的圖卡哪裡不同？",
      "followUp": "接受孩子指出耳朵、尾巴或外形的一個差異。",
      "targetWord": "dog"
    },
    {
      "moment": "聽到bird後",
      "title": "輪到孩子練習",
      "question": "請指bird，再用手臂表示牠的翅膀。",
      "followUp": "片後三根手指代表三隻貓來練本課句型，不宣稱歌中恰好有三隻貓。",
      "targetWord": "bird"
    }
  ],
  "instructions": [
    "播放肚子小怪獸暖身短段，輕拍肚子、張開手掌表示想吃東西，跟著節拍輕踏步。",
    "回播一段食物唱答，用假裝拿湯匙或喝水的手勢跟唱；不把動物詞硬插進歌曲。",
    "停片，輪流做一個想吃或吃飽的手勢，家人猜意思，再交換；不比誰吃得多。",
    "喝水，開啟貓狗鳥魚四張圖卡，預告只要聽到名字，就找出同一種動物。",
    "播放〈I Have A Pet〉的狗、貓、鳥段，各暫停一次讓孩子指卡，再選擇跟說；魚段可補認識。",
    "片後用三根手指或三個玩具扮演三隻貓，逐一點數並練I see three cats.；回到單張卡再說a cat。",
    "完成cat、dog、bird三次找卡，請每人自己說一個詞或本課句型；不把看完影片當作完成。"
  ]
},
  "w5d1b2": {
  "title": "探索日｜聽動物名，找到生活場景",
  "sentence": "Adventure 42: I see a fish in the water.",
  "videoFocus": "用狗鳥魚段辨認三種動物，再比較需要的生活環境，讓聲音線索連到實際名詞。",
  "focus": "聽動物名，找到生活場景",
  "younger": "聽 woof 指 dog，聽 tweet 指 bird；再指 fish 並用手做水波，三次都有回應即可。",
  "older": "辨認 dog、bird、fish，說明狗需要照顧、鳥可停在樹上、魚在水中活動；練 I see a fish in the water.，也可用中文說理由。",
  "caregiverTip": "歌曲直接介紹四種寵物；家、樹、水的比較是生活延伸。魚的glub是歌曲擬聲，不把它當所有魚真實叫聲，也不用家庭真的飼養動物。",
  "pausePrompts": [
    {
      "moment": "歌曲dog段後",
      "title": "看清楚再回答",
      "question": "聽到dog，請指出圖卡；家裡照顧dog需要留什麼空間？",
      "followUp": "孩子可用中文說，需要照顧而非都住某種房子。",
      "targetWord": "dog"
    },
    {
      "moment": "歌曲bird段後",
      "title": "換個線索試試",
      "question": "請找bird，牠可以在哪裡停下休息？",
      "followUp": "樹枝是例子，鳥不一定一直住在巢裡。",
      "targetWord": "bird"
    },
    {
      "moment": "歌曲fish段後",
      "title": "輪到孩子練習",
      "question": "請指fish，用手做水波，fish在哪裡游？",
      "followUp": "用圖卡觀察，不需接觸活體；魚有不同生活水域。",
      "targetWord": "fish"
    }
  ],
  "instructions": [
    "播放小巴士數數暖身，雙手握方向盤，跟節奏在原地輕踏步；先跟到三即可。",
    "回播一段數數，孩子伸手指或拍手配數量；較大孩子可跟到十，倒數困難時先聽大人示範。",
    "停片，輪流當司機，帶一次轉方向盤和停車手勢；把巴士動作收好再進動物主題。",
    "喝水，打開動物圖卡，用雙手表示房子、樹枝與水波，先說待會把名字和生活場景連起來。",
    "播放〈I Have A Pet〉的dog、bird、fish段，聽名字找到同一張卡；各停一下，不等整首結束才回答。",
    "把dog、bird、fish分別放入家庭照顧、樹枝停留、水中活動情境，練I see a fish in the water.；說明例子不是唯一住處。",
    "完成dog、bird、fish三次指認，再輪流回答一題動物住哪裡；可說中文理由或一個英文詞，最後嘗試本課句型。"
  ]
},
  "w5d2b1": {
  "title": "動起來｜聽問題，找躲起來的玩具",
  "sentence": "Adventure 43: Where is it? It is under the cloth.",
  "videoFocus": "聽Where is the cat?找位置，再用Where is it?問桌上玩具。",
  "focus": "位置問題與藏物問答。",
  "younger": "先看大人示範，聽 What is it? 指出玩具，聽 Where is it? 指出藏的位置；確認找到時點頭說 yes。",
  "older": "輪流問 What is it? 和 Where is it?，用物品名稱或位置回答；藏在布下時練 Where is it? It is under the cloth.，再用 yes 或 no 確認猜測。",
  "caregiverTip": "〈Where Is The Cat?〉反覆問貓的位置，搭配家具與方位。先聽Where is the cat?，再用同一個位置問題問玩具Where is it?；what-is-it、where-is-it是圖卡識別字，口說時自然分成What is it?、Where is it?。What、yes、no由片後問答帶入。只藏玩具，不藏孩子，不鑽家具。",
  "pausePrompts": [
    {
      "moment": "主課第一次問Where is the cat?並找位置後",
      "title": "聽懂在問哪裡",
      "question": "圖卡where-is-it表示Where is it?，和歌曲問貓在哪裡一樣，是問名字還是位置？",
      "followUp": "請孩子指歌曲裡找到的位置，再把貓換成桌上的玩具。",
      "targetWord": "where-is-it"
    },
    {
      "moment": "片後把玩具拿出來介紹時",
      "title": "分清物品和位置",
      "question": "聽what-is-it，也就是What is it?，請說玩具是什麼，再換問它在哪裡。",
      "followUp": "先問物品再問位置，接受指認與熟悉的玩具名稱。",
      "targetWord": "what-is-it"
    },
    {
      "moment": "片後玩具藏在小布下，家長指位置猜測時",
      "title": "確認猜得對不對",
      "question": "家長猜對位置時說yes，猜錯時說no；這次可以說yes嗎？",
      "followUp": "先觀察再回答，說no後指出真正位置；不把yes當物品名稱。",
      "targetWord": "yes"
    }
  ],
  "instructions": [
    "播放綠草與大樹暖身短段，手臂做樹枝、手掌做鳥巢，跟反覆節拍輕擺身體。",
    "回播一段一問一答，先跟大人做樹的手勢，再選擇跟說；歌曲越唱越長，不要求背完整串。",
    "停片，輪流帶一個樹或鳥巢的手勢，家人跟做；收起手臂回到桌面。",
    "喝水，拿出玩具與小布。先看清楚玩具，說明待會跟歌曲找貓，再找自己的玩具。",
    "播放〈Where Is The Cat?〉，第一次問位置後停下，讓孩子指向貓或家具；再聽一段，留意Where是在問哪裡。",
    "停片把玩具藏在布下，問Where is it?並練It is under the cloth.；拿出後再問What is it?，分清物品與位置。",
    "每人實際做三次問答：指物品、指位置、用yes確認一次猜測；猜錯可用no修正，交換藏物與提問角色，再說一句本課句型。"
  ]
},
  "w5d2b2": {
  "title": "動起來｜動物手勢與三個乘客",
  "sentence": "Adventure 44: I see three animals on the bus.",
  "videoFocus": "從寵物歌身體特徵做魚鰭、貓爪、狗爪手勢，再用三件玩具作想像巴士乘客，一對一點數。",
  "focus": "動物手勢與三個乘客",
  "younger": "聽fish、cat、dog各做一次手勢，再一件一件點數三個玩具乘客。",
  "older": "讓三個玩具逐一上車，指一個數一個，說 I see three animals on the bus.；移走一個後重新數剩下幾個，不用背算式。",
  "caregiverTip": "這首歌直接有fish、cat、dog，魚鰭和腳掌可做動作線索。巴士是片後想像情境，用三件玩具代表三位乘客；不宣稱影片本身是巴士歌，不使用活魚。",
  "pausePrompts": [
    {
      "moment": "歌曲fish與fins段後",
      "title": "看清楚再回答",
      "question": "聽到fish，請用手掌做小魚游動。",
      "followUp": "幅度小一點，先指魚鰭再做手勢。",
      "targetWord": "fish"
    },
    {
      "moment": "歌曲cat段後",
      "title": "換個線索試試",
      "question": "請指cat，再做一次小貓伸爪的動作。",
      "followUp": "伸爪是課堂手勢，不要求歌詞同時說出這個動作。",
      "targetWord": "cat"
    },
    {
      "moment": "歌曲dog與paws段後",
      "title": "輪到孩子練習",
      "question": "請找dog，用雙手表示狗的前腳，再停一下。",
      "followUp": "停片後把三種動物各配一件玩具當乘客。",
      "targetWord": "dog"
    }
  ],
  "instructions": [
    "播放鈴聲暖身一小段，跟著節拍輕拍手或拍膝蓋；不用準備鈴鐺，也不要求跟上所有英文。",
    "回播一段重複旋律，輪流帶兩下拍手、兩下輕踏步；坐著做也可以。",
    "停片，孩子帶一小段節拍，家人跟做，再做停車手勢準備坐回桌前。",
    "喝水，拿出三件不易入口的玩具，先放一旁；開啟fish、cat、dog圖卡，準備用手表現不同動物。",
    "播放〈I Love My Pet〉的魚、貓、狗段，指認動物與身體特徵後停片；各做一次游動或前腳手勢。",
    "片後把三件玩具當作三種動物乘客，一件一件排到想像巴士上，練I see three animals on the bus.。",
    "每名孩子完成fish、cat、dog三次跟做，再輪到一次點乘客；移走一位可重新數，但不按歌曲重複次數增加乘客。"
  ]
},
  "w5d3b1": {
  "title": "配對日｜觀察寵物的腳與翅膀",
  "sentence": "Adventure 45: A cat and a dog have four legs.",
  "videoFocus": "從歌中的寵物及paws、fins、wings線索觀察身體，依四腳和兩腳分組，替代完全不同的蜘蛛主課。",
  "focus": "觀察寵物的腳與翅膀",
  "younger": "看 cat、dog、bird 圖卡，先找腿或翅膀；大人示範四隻腳與兩隻腳兩組，孩子把三個動物分好，可用指認回答。",
  "older": "比較圖卡中的腿和翅膀，說明 cat、dog 為什麼同組，bird 為什麼不同組；練 A cat and a dog have four legs.，再看看魚的鰭和腿哪裡不同。",
  "caregiverTip": "主課直接呈現貓、狗、鳥與魚的身體特徵；歌詞不逐字教授腳數，四腳／兩腳分類由家長看圖引導。不要把被身體遮住的腳漏算，翅膀和魚鰭都不是腳。",
  "pausePrompts": [
    {
      "moment": "歌曲cat段後",
      "title": "看清楚再回答",
      "question": "請找cat，看看牠的腳和身體連在哪裡。",
      "followUp": "可指圖卡；遮住的腳由家長補充，不只數看得到的腳。",
      "targetWord": "cat"
    },
    {
      "moment": "歌曲dog段後",
      "title": "換個線索試試",
      "question": "請把dog和cat放同一組，你能說一個理由嗎？",
      "followUp": "以這兩種動物四隻腳作分類理由，可先用中文。",
      "targetWord": "dog"
    },
    {
      "moment": "歌曲bird與wings段後",
      "title": "輪到孩子練習",
      "question": "請找bird，翅膀是腳嗎？牠應放哪一組？",
      "followUp": "分清兩隻腳與翅膀，魚鰭另作比較。",
      "targetWord": "bird"
    }
  ],
  "instructions": [
    "播放小熊暖身短段，手靠臉旁假裝休息，再伸手邀請小熊一起玩；保持舒服的音量。",
    "回播邀請朋友玩的段落，輪流揮手、伸展手臂；歌曲最後休息時改做安靜手勢，不用突然大聲叫醒。",
    "停片，用玩偶或雙手演一次休息、邀請、回應的順序，孩子和家長交換角色。",
    "喝水，開啟動物圖卡，桌面留四腳與兩腳兩區；先觀察形狀，不急著猜分類。",
    "播放〈I Love My Pet〉的貓、狗、鳥段，各停下指動物，從腳掌與翅膀線索看身體；魚段可比較鰭。",
    "把cat、dog放同組，bird另放一組，指認四腳與兩腳，練A cat and a dog have four legs.。",
    "完成cat、dog、bird三次分類，每人說或指一個理由；圖中遮住的腳由家長補充，魚可另分沒有腳一組。"
  ]
},
  "w5d3b2": {
  "title": "配對日｜聽叫聲、看手勢找動物",
  "sentence": "Adventure 46: I hear a dog. I see a fish swimming.",
  "videoFocus": "以歌中dog與bird的叫聲建立聽覺配對，再用fish游動手勢改換線索，練中英文不同擬聲。",
  "focus": "聽叫聲、看手勢找動物",
  "younger": "聽汪汪或 woof 指 dog，聽啾啾或 tweet 指 bird；再看游泳手勢找 fish，三次都先讓孩子自己選。",
  "older": "說明汪汪和 woof 都可以提示狗，啾啾和 tweet 都提示鳥；把 dog、bird 放聲音線索組，fish 放本輪的動作線索組，再練本課句型。",
  "caregiverTip": "主課直接唱出dog、bird、fish。先聽woof與tweet配對，再刻意改用魚游動手勢，讓孩子分清聽覺與動作線索；glub不是所有魚的真實聲音。",
  "pausePrompts": [
    {
      "moment": "歌曲dog叫聲段後",
      "title": "看清楚再回答",
      "question": "聽到woof，請找dog；中文汪汪也能提示哪一隻？",
      "followUp": "同一動物的擬聲可不同，不用中文諧音硬記英文。",
      "targetWord": "dog"
    },
    {
      "moment": "歌曲bird叫聲段後",
      "title": "換個線索試試",
      "question": "聽到tweet，請指bird，再跟說bird。",
      "followUp": "歌的擬聲只是其中一種，不說所有鳥都一樣叫。",
      "targetWord": "bird"
    },
    {
      "moment": "歌曲fish段後轉做手勢時",
      "title": "輪到孩子練習",
      "question": "這次不用聲音，用游動手勢找fish，你能配對嗎？",
      "followUp": "歌曲glub是趣味擬聲，手勢是本輪課堂線索；不教魚都不會發聲。",
      "targetWord": "fish"
    }
  ],
  "instructions": [
    "播放如廁主題暖身短段，坐在普通椅子上輕拍節奏，跟做停止手邊活動的手勢。",
    "回播一段，家長讓玩偶先放下玩具再坐好；用角色扮演理解日常順序，不要求孩子實際上廁所。",
    "停片，輪流帶玩偶完成停下、坐好、起身的簡短動作；有真正如廁需要時正常休息，不拿來計分。",
    "喝水，排出dog、bird、fish圖卡，說明先聽聲音找兩張，再看手勢找第三張。",
    "播放〈I Have A Pet〉的狗與鳥段，叫聲後停片讓孩子選卡；魚段先聽名稱，再停片由家長做游動手勢。",
    "把dog、bird放到本輪聲音線索組，fish放到動作線索組；練I hear a dog. I see a fish swimming.。",
    "每名孩子完成dog、bird、fish三次配對，再輪流出一個聲音或手勢題；中文與英文擬聲可並存，選對動物才算完成。"
  ]
},
  "w5d4b1": {
  "title": "小老師｜藏好玩具，換你來問",
  "sentence": "Adventure 47: Where is it? Look behind the box.",
  "videoFocus": "從找貓歌聽出 behind 等位置詞，再讓孩子把玩具藏到盒後給家人找。",
  "focus": "盒後位置、物品與位置問題的輪流提問。",
  "younger": "先由大人陪問 What is it?，指出玩具；再問 Where is it?，指盒子後面。猜對時說 yes，猜錯可以搖頭或說 no。",
  "older": "輪流當出題者，先問物品、再問位置，留時間讓家人回答；用 Where is it? Look behind the box. 給提示，再依實際藏處回答 yes 或 no。",
  "caregiverTip": "保留雪人暖身；用大玩具和空盒子，只在桌面藏物。主課直接比較貓與家具的位置，有 behind；片後把植物後方的問法移用到盒子後方，不宣稱影片一定有本課盒子。What is it?、Where is it? 及 yes/no 是教師完整示範，問完等三秒。詞卡上的短語不逐字照連字號念。",
  "pausePrompts": [
    {
      "moment": "主課位置短段後，孩子先拿出大玩具時",
      "title": "先知道找什麼",
      "question": "請找 what-is-it 圖卡，指著玩具問 What is it?。家人回答名字後，這題還需要說盒子後面嗎？",
      "followUp": "問名稱先回答玩具名；不用會影片所有家具詞才可參加。",
      "targetWord": "what-is-it"
    },
    {
      "moment": "回看 behind 相關位置後，玩具移到盒後時",
      "title": "把線索換到盒子",
      "question": "請用 where-is-it 圖卡問 Where is it?，再說 Look behind the box.。家人應往盒子前面還是後面找？",
      "followUp": "先讓孩子看見藏處，behind 直接來自影片，box 是本次桌面替換。",
      "targetWord": "where-is-it"
    },
    {
      "moment": "家人依線索找到玩具後",
      "title": "核對線索有沒有成功",
      "question": "家人指到盒子後真正的玩具時，請選 yes。若他指盒子前的空處，還能一樣回答嗎？",
      "followUp": "依實際位置判斷；下一輪讓孩子自己指一個位置，不固定每次猜對。",
      "targetWord": "yes"
    }
  ],
  "instructions": [
    "播放雪人暖身一小段，雙手假裝滾雪球，再往上疊；在原地做動作，不需要真的有雪。",
    "回播做雪人手臂或臉的片段，指出自己的手與鼻子，再做揮手動作。",
    "停片，輪流帶家人做滾、疊、揮手三個動作；不另做需要剪刀或小石頭的手工。",
    "喝水，把玩具和盒子放上桌，從同一側看清盒前盒後，預告由孩子當小老師給線索。",
    "播放找貓歌的位置問句，回看 behind 相關短段；指出是躲在哪個物品後面，不要求背全部介系詞。",
    "先問 What is it? 確認找哪件玩具，再藏到盒後問 Where is it?，以 yes 核對家人的選擇；練 Where is it? Look behind the box.。",
    "交換出題者，藏處先保留盒後，熟悉才改旁邊並如實說；每人完成三題問答與一次開口，家長不代答。"
  ]
},
  "w5d4b2": {
  "title": "小老師｜聽叫聲與線索猜寵物",
  "sentence": "Adventure 48: Is it a cat? Yes, it is.",
  "videoFocus": "回看有明確貓狗叫聲的寵物歌，再讓孩子自己出題，魚使用外形或動作線索，保持問答回合。",
  "focus": "聽叫聲與線索猜寵物",
  "younger": "聽fish、cat、dog提示各找一次卡，再選一張卡用手勢出題。",
  "older": "替 fish 描述鰭和游泳，替 cat、dog 用叫聲出題；聽家人猜完再核對，練 Is it a cat? Yes, it is.，答錯時可給另一個提示。",
  "caregiverTip": "主課直接有魚、貓、狗，meow與woof可當問答線索；魚改用魚鰭或游動手勢，不靠歌曲glub當科學判定。只看圖卡、做小手勢，不接觸活體。",
  "pausePrompts": [
    {
      "moment": "歌曲fish段後",
      "title": "看清楚再回答",
      "question": "請找fish，想一個魚鰭或游動線索給家人猜。",
      "followUp": "家長可示範一次手勢，之後由孩子選線索。",
      "targetWord": "fish"
    },
    {
      "moment": "歌曲cat叫聲段後",
      "title": "換個線索試試",
      "question": "聽到meow，Is it a cat? 請用cat或Yes, it is.回答。",
      "followUp": "回答後交換提問者，等對方猜完再揭答案。",
      "targetWord": "cat"
    },
    {
      "moment": "歌曲dog叫聲段後",
      "title": "輪到孩子練習",
      "question": "請用dog的線索出題，家人猜對了嗎？",
      "followUp": "線索太少就再補一項，合理的不同猜測先聽理由。",
      "targetWord": "dog"
    }
  ],
  "instructions": [
    "播放安靜搖籃暖身，坐著把雙手輕抱在身前，隨音樂緩慢左右擺動。",
    "回播短段，做晚安與休息手勢；只搖玩偶或空手，不晃動別人的身體，也不要求真的睡著。",
    "停片，輪流向玩偶輕聲說晚安，再伸展肩膀、睜眼看向桌面，準備下一段活動。",
    "喝水，開啟fish、cat、dog圖卡，預告今天孩子當出題者，家人要等線索說完。",
    "播放〈I Have A Pet〉對應三種動物的短段，每段停一次；先觀察名稱和叫聲，再示範用手勢提示fish。",
    "輪流藏起一張卡，用叫聲或外形提示；家人猜Is it a cat?，孩子核對後回答Yes, it is.或換一個提示。",
    "完成fish、cat、dog三次問答，每名孩子都出或答一題，再試說本課句型；不以搶快決勝。"
  ]
},
  "w5d5b1": {
    "title": "任務日｜介紹圖卡裡的寵物朋友",
    "sentence": "Adventure 49: I have a pet. It is a cat.",
    "videoFocus": "聽寵物歌曲辨認動物，複習名稱並做一段角色介紹。",
    "focus": "寵物名稱、擬聲與I have介紹。",
    "younger": "聽到 cat、dog、bird 各指一次圖卡，再選一張喜歡的動物跟說名稱；沒有養寵物也能用圖卡扮演。",
    "older": "聽聲音辨認三種動物，再扮演圖卡的介紹者說 I have a pet. It is a cat.；可換成 dog、bird 或 fish，並用自己的話說一個特徵。",
    "caregiverTip": "打開本課圖卡即可，不需要家庭真的養寵物。主課有狗、貓、鳥與魚等動物，孩子可用選好的圖卡扮演介紹者，也可以如實說沒有寵物。魚的glub是歌曲的擬聲玩法，不是所有魚的真實叫聲；獅子一段是誇張的歌曲情節，不必當成家庭飼養例子。本週闖關按實際複習計算，不比速度。",
    "pausePrompts": [
      {
        "moment": "主課貓的唱答段落後",
        "title": "聽見小貓的聲音",
        "question": "這段說到 cat 並用 meow 模仿叫聲。請找到 cat 圖卡，再跟說 cat。",
        "followUp": "先讓孩子找圖，再邀請開口；沒有養貓也能用圖卡參與。",
        "targetWord": "cat"
      },
      {
        "moment": "主課狗的唱答段落後",
        "title": "分清狗和貓",
        "question": "聽到 woof，你會指 dog 還是 cat？選好後再一起核對。",
        "followUp": "可回播一次再選，不替孩子先指答案；中文汪汪也能幫助理解。",
        "targetWord": "dog"
      },
      {
        "moment": "主課鳥的唱答段落後",
        "title": "介紹一位寵物朋友",
        "question": "請指出 bird。你想扮演誰的介紹者？先說 bird，再試試用 I have a pet. 開頭。",
        "followUp": "明說是圖卡角色扮演；孩子可選其他動物，也可以表達自己沒有寵物。",
        "targetWord": "bird"
      }
    ],
    "instructions": [
      "播放迪斯可暖身，跟做向上指、向下指和停下；先選一種動作跟得上即可。",
      "回播轉動雙手或向後指的片段，保持原地，跟著Stop停住；不需要倒退跑。",
      "停片，孩子從指上、轉手、向後指中選兩個帶家人做，最後一起停下。",
      "喝水，打開動物圖卡，預告聽寵物歌後要認出三種動物，再選一位作介紹。",
      "播放寵物主課一小段，狗、貓或鳥的唱答後暫停，讓孩子把聲音和本課圖卡配在一起。",
      "完成 cat、dog、bird 三次複習，接著選貓圖卡扮演介紹者，說 I have a pet. It is a cat.；大人示範後留一輪讓孩子自己補詞或整句。",
      "每位孩子都完成三次指認與一次介紹；較大孩子可換其他圖卡再說一種特徵，較小孩子說動物名稱即可。沒有養寵物不用編造自家經驗，最後再核對實際完成項目。"
    ]
  },
  "w5d5b2": {
  "title": "任務日｜用動物特徵做動作接力",
  "sentence": "Adventure 50: A dog can walk, and a fish can swim.",
  "videoFocus": "星期五換用寵物特徵歌，提取dog、bird、fish的名稱並自己選動作，從辨認轉為描述與合作。",
  "focus": "用動物特徵做動作接力",
  "younger": "聽dog、bird、fish各做一次手勢，再指對卡並說一個名字。",
  "older": "輪流給動作線索讓家人找 dog、bird、fish，再練 A dog can walk, and a fish can swim.；較難時先拆成兩句，不要求一次背完。",
  "caregiverTip": "用主課的腳掌、翅膀、魚鰭線索接回三種動物名稱，再做自己選的動作；不用蜘蛛片代替。保留慢走與游泳句型，片後分成兩句練也可以；不以速度評分。",
  "pausePrompts": [
    {
      "moment": "歌曲dog段後",
      "title": "看清楚再回答",
      "question": "請找dog，做一個慢慢走的手指動作。",
      "followUp": "可以只動手指，不必四肢趴在地上。",
      "targetWord": "dog"
    },
    {
      "moment": "歌曲bird與wings段後",
      "title": "換個線索試試",
      "question": "請指bird，再用手臂表示翅膀。",
      "followUp": "描述翅膀，不推成所有鳥一定會飛。",
      "targetWord": "bird"
    },
    {
      "moment": "歌曲fish與fins段後",
      "title": "輪到孩子練習",
      "question": "請找fish，用手表示魚鰭，讓家人猜。",
      "followUp": "看到對方選對再揭卡，游泳是延伸動作。",
      "targetWord": "fish"
    }
  ],
  "instructions": [
    "播放節慶暖身短段，跟做拍手、輕踏步或小幅跳躍，依空間和孩子狀態選一種動作。",
    "回播輕聲唱的片段，讓動作和音量一起變小，再回到舒服的正常聲音；不需要比誰喊得大聲。",
    "停片，孩子帶一輪拍手與停住，家人跟做後交換；用簡單手勢結束暖身。",
    "喝水，打亂dog、bird、fish三張卡，先請孩子猜今天會用到哪些身體特徵。",
    "播放〈I Love My Pet〉的狗、鳥、魚段，名字後停片，指向腳掌、翅膀或鰭，讓孩子自己選小幅手勢。",
    "輪流出動作請家人選卡，練A dog can walk, and a fish can swim.；難時拆成兩句，鳥以翅膀做線索。",
    "每人完成dog、bird、fish三次複習並輪到一次出題或回答；換順序再確認，提示後完成仍可記實際紀錄。"
  ]
}
};

const sixthWeekReviewedGuidance: Record<string, ReviewedTeachingGuidance> = {
  "w6d1b1": {
  "title": "探索日｜一個一個數，找出四個積木",
  "sentence": "Adventure 51: I can count four blocks.",
  "videoFocus": "跟海底數數歌認識數字順序，再用積木確認一個數詞對一件物品。",
  "focus": "海底數數與積木的一對一點數。",
  "younger": "先從四個大積木中拿出 three 個，再加到 four 個，最後只留 one 個；一邊指一邊數，可以先說單字，不急著背到二十。",
  "older": "自己點數四個積木，練 I can count four blocks.；把同一批積木排開或靠近，確認數量仍是四，再選擇跟唱到十或二十。",
  "caregiverTip": "準備四個大積木或四件容易拿取的玩具，打開本課數字圖卡；使用玩具時，口說可把 blocks 換成 toys。暖身用空手模仿壓、抹、摘的做三明治動作，不需真的準備花生或食物。主課有海底場景與一到二十的順數，先用慢段練一到四；最後一個數詞代表整組數量，能背數串不等於已會點數。積木三題另在片後操作，物品移遠不代表變多。",
  "pausePrompts": [
    {
      "moment": "主課第一次慢速數到四後，暫停做桌面練習時",
      "title": "先拿出三個",
      "question": "請從四個積木中拿出 three 個，一邊碰一個、一邊數一次。最後數到什麼？",
      "followUp": "留一個積木在另一側，讓孩子看見自己選出的三個；家長不搶先替孩子移動。",
      "targetWord": "three"
    },
    {
      "moment": "片後把剩下的積木加入時",
      "title": "再加一個看看",
      "question": "現在請找 four 圖卡，從頭點數桌上這四個積木。和剛才 three 個有什麼不同？",
      "followUp": "先讓孩子重新點數，再說多了一個；不要求只看排得比較長就猜大小。",
      "targetWord": "four"
    },
    {
      "moment": "片後只留下最後一個積木時",
      "title": "一個也是一組",
      "question": "請留下 one 個積木，指出 one，再自己說一次。其他積木移走後還要全部一起算嗎？",
      "followUp": "把不用的積木放到另一側，說清楚這題只數面前這一組。",
      "targetWord": "one"
    }
  ],
  "instructions": [
    "播放三明治暖身短段，用空手模仿壓碎與抹開；動作保持在自己的面前，不需要真食材。",
    "回播摘與擠的動作段，輪流跟做兩種手勢；先把動作做清楚，不額外塞入數字口令。",
    "停片，孩子選壓、抹或摘的一種動作帶家人模仿，再交換；只做想像三明治，不安排烹調。",
    "喝水，把四個大積木排成一列，開啟本課數字圖卡；示範每碰一件才說下一個數字。",
    "播放海底數數主課的慢速短段，聽一到四的順序後按停，再用桌上的積木對照；後續變快可以只聽，不比誰跟得快。",
    "片後做三題：拿出 three 個、加到 four 個、留下 one 個；每一題重新逐件點數並回答總共有幾個。示範 I can count four blocks.，再讓孩子自己補詞。",
    "每人真正完成三次找數量與一次開口；較大孩子把四個積木排開再靠近，說明沒有增加或拿走就還是四個，想挑戰時再跟唱更長的數串。"
  ]
},
  "w6d1b2": {
  "title": "探索日｜幫小精靈配對數量",
  "sentence": "Adventure 52: Four blocks and one block make five.",
  "videoFocus": "聽精靈歌曲的五到一數字變化，片後以玩具配數量並合併兩組。",
  "focus": "五到一數詞辨認與片後一到十實物數量對應。",
  "younger": "用五個大積木當小精靈，依序拿出 four、one、two 指定的數量，每次一個一個數；最後和家人各放一組，實際合起來再數。",
  "older": "先分清 four 個和 one 個，再合併成五個，說 Four blocks and one block make five.；有十個積木時可加另一組五個，逐件數到十，不靠背公式。",
  "caregiverTip": "準備五個大積木、兩個桌面區域與本課數字圖卡；想數到十再多拿五個。暖身用手勢扮演餓了與吃水果，不要求孩子真的吃東西。主課唱到的精靈數字由五到一，雪橇與掉進雪裡是歌曲情節；不要把每句都講成「只掉下一個」。片後才用玩具練指定數量及四加一，每次說清楚正在數哪一組。",
  "pausePrompts": [
    {
      "moment": "主課唱到四個精靈的段落後",
      "title": "四個先排好",
      "question": "請找 four 圖卡，再從五個積木中拿出四個，排好後逐件數給我看。",
      "followUp": "數量練習用桌上實物，不把畫面其他角色或裝飾一起算進指定的精靈組。",
      "targetWord": "four"
    },
    {
      "moment": "主課唱到一個精靈後，停片做數量題時",
      "title": "分出一個",
      "question": "請把 one 個積木放到另一區。這一區和剛才 four 個那一區一樣多嗎？",
      "followUp": "較小孩子指出哪一區多即可；先讓他碰過每一件，再說一和四不同。",
      "targetWord": "one"
    },
    {
      "moment": "片後收回積木，重新出第三題時",
      "title": "這次需要兩個",
      "question": "請拿出 two 個積木，說一次 two；你拿的數量和家長伸出的兩根手指相同嗎？",
      "followUp": "完成三題後再玩四個加一個，不預設歌曲下一段一定出現two。",
      "targetWord": "two"
    }
  ],
  "instructions": [
    "播放食物暖身短段，雙手輕放肚子表示餓了，再做拿水果的想像動作；依歌曲問答點頭或回應。",
    "回播問答一小段，由家長問、孩子回答，再交換；孩子表示不餓也接住，不要求每個人回答一樣。",
    "停片，輪流用手勢表示想吃或吃飽，另一人猜；不用真食物，也不以吃多少判定完成。",
    "喝水，把五個大積木放桌上當小精靈，分出左右兩區，預告先聽數字，再自己拿出指定數量。",
    "播放精靈主課短段，聽到五、四、三、二、一的變化可依序伸手指；觀察歌曲說的是哪一群，不用跌倒動作模仿掉進雪。",
    "片後做四個、一個、兩個三題數量對應，每次請孩子自己拿取與核對。接著家長放四個、孩子加一個，合併後從頭點數成五個，練本課句型。",
    "交換放四個和放一個的角色，確保每位孩子都輪到操作；能力足夠且備有十個積木時，把兩組五個合起來逐件數到十。只勾孩子實際做過的數量題與合作。"
  ]
},
  "w6d2b1": {
  "title": "動起來｜跟著行星數步伐",
  "sentence": "Adventure 53: I can take three steps.",
  "videoFocus": "跟八顆行星的數數順序，片後把一、二、三轉成可核對的動作次數。",
  "focus": "行星順數與一步一數的動作控制。",
  "younger": "先伸 one 根手指，再輕踏 two 下，最後在原地做 three 個小步；每做一下才說下一個數字，做到指定次數就停。",
  "older": "聽數字決定一步、兩步或三步，自己邊做邊數再停住，說 I can take three steps.；可挑戰影片留白處補數字一到八。",
  "caregiverTip": "開啟本課數字圖卡，身旁留能原地踏步的空間，不需要製作行星模型。暖身做張開、合起及大小快慢的手勢；主課數八顆行星並留空讓孩子接數字，不必背行星英文名稱。桌面圖卡的數字要和自己做的次數對應，踏步是片後練習，不把走三步當成天體運行速度或距離。",
  "pausePrompts": [
    {
      "moment": "主課第一顆行星的段落後",
      "title": "從一開始",
      "question": "聽到 one，請伸出一根手指，再指本課 one 圖卡。你有多伸其他手指嗎？",
      "followUp": "先把手勢和數詞配好，不急著往下背整串。",
      "targetWord": "one"
    },
    {
      "moment": "主課數到兩顆行星後，暫停做動作題時",
      "title": "兩下就停",
      "question": "請看 two 圖卡，在原地輕踏兩下，邊踏邊數，到了 two 就停住。",
      "followUp": "這是家長加入的動作練習；如果多做一下，慢一點重試，不直接替孩子算完成。",
      "targetWord": "two"
    },
    {
      "moment": "片後進行第三次動作題時",
      "title": "自己控制三步",
      "question": "請做 three 個小步，再說 I can take three steps.；空間小時可以原地踏步嗎？",
      "followUp": "留一輪讓孩子自己啟動、點數和停止，家長不要整輪帶著搶做。",
      "targetWord": "three"
    }
  ],
  "instructions": [
    "播放張開合起的暖身短段，雙手在身前張開與合起，跟著拍手後放在腿上。",
    "回播大小或快慢段，手臂畫大範圍與小範圍，或慢慢移動手指；音量維持舒服，不用喊叫比大小。",
    "停片，孩子選一組相反動作帶家人做，家長再換另一組，輪流完成而不搶答。",
    "喝水，找原地踏步的位置，打開數字圖卡，說明今天要做到幾下就停，不比誰走得遠。",
    "播放行星主課一到四的短段，配合手指逐一伸出；孩子熟悉後可回播留白讓他補數字，願意再挑戰到八。",
    "片後依 one、two、three 做三題：伸一指、輕踏兩下、走或原地踏三步；每次先看圖卡，再自己做指定次數。示範 I can take three steps.。",
    "交換數字出題者和動作者，讓每人都有一次自己數完停住的機會，再跟說單字或完整句；做錯可以放慢重來，只記真實完成的三次跟做與開口。"
  ]
},
  "w6d2b2": {
  "title": "動起來｜數清楚，再做拍手接龍",
  "sentence": "Adventure 54: Clap twice, then tap three times.",
  "videoFocus": "跟一到四的順數把聲音配上動作，片後分開做兩下拍手與三下輕拍。",
  "focus": "逐次點數與兩段動作指令。",
  "younger": "先拍手 two 下、輕拍自己的腿 three 下、點桌 four 下，每題做完先停；一個動作只配一個數詞。",
  "older": "先聽一次順數，再自行做 two、three、four 下三種動作。說 Clap twice, then tap three times.，分兩段做完，請家人檢查每段的次數。",
  "caregiverTip": "本課數字圖卡、雙手和桌面即可。暖身是粉紅、紫、橘、棕四色歌，用指認或手勢參與。主課逐一順數一到二十，本堂先用一到四，數到指定數字便暫停，不要求跟完二十。拍手兩下再輕拍三下是片後的兩段指令；每段重新從一開始，不把兩段混成一次連數到五。",
  "pausePrompts": [
    {
      "moment": "主課數到二時暫停，轉成拍手回合",
      "title": "兩下先停好",
      "question": "請找 two 圖卡，自己拍兩下就停。剛才每一個數字都配到一次拍手了嗎？",
      "followUp": "先慢做再自己試；不要只數到二，雙手卻多拍了一下。",
      "targetWord": "two"
    },
    {
      "moment": "回播一到三後，換成輕拍回合",
      "title": "新動作重新數",
      "question": "這回要輕拍 three 下。你會從 one 重新數，還是接著上一回合往下數？",
      "followUp": "兩段各有自己的次數；從一重數三下，做完才接練完整指令。",
      "targetWord": "three"
    },
    {
      "moment": "片後四下點桌完成，換孩子出題時",
      "title": "你做完再考家人",
      "question": "請先輕點桌面 four 下，再請家人做四下。你怎麼確認他沒有多做？",
      "followUp": "孩子先完成本人的動作，再邊看邊數家人的回合；只看家人做不算自己的任務。",
      "targetWord": "four"
    }
  ],
  "instructions": [
    "播放四色暖身短段，聽到顏色時指向畫面相應物品，跟著節奏輕拍雙手。",
    "回播喜歡的顏色段，孩子先選畫面上的一個顏色，家長跟指，再交換帶領；不需要搬出食物配對。",
    "停片，輪流用手勢或一個顏色詞請家人找畫面物品，最後雙手放腿上收束動作。",
    "喝水，打開 two、three、four、one 數字圖卡。預告先跟數字歌逐次點數，再做兩段分開的拍手接龍。",
    "播放 Count & Move 的一到四段，先聽清每一個數詞；回播時選一個小動作逐次跟做，到了指定數字按停，後面的數字可另聽，不加進這堂完成門檻。",
    "做拍手 two 下、拍腿 three 下、點桌 four 下三題，每題重新從一開始並停好；再練 Clap twice, then tap three times.，分兩段做，不合成連續五下。",
    "孩子與家人交換出數字口令，每人先自己做一次、再核對對方一次；依實際完成的三題與合作記錄，不把跟唱整串當作點數完成。"
  ]
},
  "w6d3b1": {
  "title": "配對日｜小狗回家，數量找朋友",
  "sentence": "Adventure 55: Three dogs are still here.",
  "videoFocus": "觀察每次一隻小狗回家後剩下的隻數，再把數詞配上玩具組。",
  "focus": "小狗逐一離開與剩餘數量配對。",
  "younger": "用五個大積木當小狗，先拿走一個，數剩下 four 個；再拿走一個，找 three 圖卡，最後依 one 圖卡留下一個。每次碰一件才數一聲。",
  "older": "先預測拿走一隻後還有幾隻，再逐一點數核對；留下三隻時說 Three dogs are still here.，能說明數的是小狗而不是身上的斑點。",
  "caregiverTip": "準備五個大積木或小玩具、桌面左右兩區與本課數字圖卡。暖身先跟看得清楚的動作做，再由家長加上洗手的想像動作，不必真的上廁所，也不把個人如廁情形拿來評分。主課每次一隻狗找到點心後回家，留在外面的狗由五隻逐步減少；數狗的隻數，不數斑點。完成配對時只數指定區域，收回家那區不一起算。",
  "pausePrompts": [
    {
      "moment": "主課又一隻狗回家後",
      "title": "三隻找圖卡",
      "question": "現在請找 three 圖卡，數數留下的積木，再說 Three dogs are still here.。",
      "followUp": "請孩子自己移走一個，再由頭點數；較小孩子說 three 也可以。",
      "targetWord": "three"
    },
    {
      "moment": "回看第一隻狗回家後的段落，再重排桌面玩具",
      "title": "先看剩下幾隻",
      "question": "回看五隻少了一隻的段落，請找 four 圖卡。把玩具重新排成四個，再一個一個數，和剛才 three 那組一樣多嗎？",
      "followUp": "先請孩子自己碰著數，不以喊得快當作答對；若畫面太快，停片用桌上物品核對。",
      "targetWord": "four"
    },
    {
      "moment": "片後重排玩具，再出一隻的配對題時",
      "title": "一隻留在外面",
      "question": "請依 one 圖卡留下一隻小狗。其他已回家的積木要不要一起算？",
      "followUp": "把兩區分開，明說這題只數外面那一隻；完成後可讓孩子把玩具都接回來。",
      "targetWord": "one"
    }
  ],
  "instructions": [
    "播放如廁暖身短段，家長與孩子跟著畫面中清楚的動作輕拍節奏；不要求模仿私密的如廁過程。",
    "選一個適合公開模仿的動作回播，再由家長示範想像搓手、沖水、擦乾的洗手順序；這是家長補充的生活練習。",
    "停片，孩子選一個洗手動作帶家人做，再交換；可以說詞或用手勢，不用真的跑去洗手間。",
    "喝水，把五個玩具分成「在外面」與「回家」兩區，打開數字圖卡，預告只數指定區域的小狗。",
    "播放小狗主課短段，第一隻回家後暫停，用五個玩具移走一個，再數剩下四個；下一段再移走一個，確認剩三個。",
    "片後完成 three、four、one 三題配對：每題先重放五個玩具，孩子依數字留出一組，再逐件點數。剩三隻時練 Three dogs are still here.。",
    "孩子和家人交換出數字與配數量，每人都實際完成三題並開口一次；若錯把回家的玩具算進來，先指出正在數的區域，再重試。"
  ]
},
  "w6d3b2": {
  "title": "配對日｜玩具回床上，一個加兩個",
  "sentence": "Adventure 56: One bear and two bears make three.",
  "videoFocus": "從一加二等於三的歌段，實際把兩組玩具合起來點數。",
  "focus": "一加二的數量合併與分類配對。",
  "younger": "先配出 four、one、two 三種數量。家長放一個玩具、孩子放兩個，合起來逐件數成三個，能指或說 three 即可。",
  "older": "聽一加二的短段，先放 one 個、再放 two 個玩具，自己點數合起來有三個，說 One bear and two bears make three.；不是熊玩具就改說 toys，再交換兩組的放置順序核對總數。",
  "caregiverTip": "準備四個大玩具與桌面兩區，可把其中一區想像成玩具的床。暖身保留洗澡、穿睡衣、刷牙、看書與道晚安的手勢。主課逐一示範一加一到一加九，本堂只先練一加二等於三；這不是倒數或角色滾下床的歌。配對 four、one、two 後，才演一位玩具先上床、另兩位回來，一個一個數全部；不用先背加法公式。",
  "pausePrompts": [
    {
      "moment": "主課一加三的段落後，先做四個的配對",
      "title": "先把總數配好",
      "question": "你能找 four 圖卡，拿四個玩具放在同一區嗎？排開以後還是四個嗎？",
      "followUp": "先配數量、再調整間距重新核對；不用因整首歌能加到十就一次拿十個。",
      "targetWord": "four"
    },
    {
      "moment": "回播一加二前，桌上先放一個玩具時",
      "title": "第一組只有一個",
      "question": "請把 one 個玩具放在床的位置，指 one 圖卡。另一組還沒加入時，這裡有幾個？",
      "followUp": "先界定正在數的區域，不先把尚未放進來的玩具也算入。",
      "targetWord": "one"
    },
    {
      "moment": "主課一加二等於三的短段後",
      "title": "把兩個真的加進來",
      "question": "請在原來的一個旁邊加入 two 個玩具，再碰著數全部。這次合起來有幾個？",
      "followUp": "孩子實際移入兩個，從頭點數至三；一加二的結果由操作確認，不只跟念歌詞。",
      "targetWord": "two"
    }
  ],
  "instructions": [
    "播放睡前暖身短段，以空手模仿洗澡、穿睡衣或刷牙，動作做到自己身前即可。",
    "回播看書、道晚安的片段，兩人輪流做翻書與揮手動作，另一人猜；不用真的找牙刷或換衣服。",
    "停片，孩子選兩個睡前動作按先後帶家人做，最後安靜坐好，準備數床上的角色。",
    "喝水，把四個大玩具放桌面，分出床的位置與尚未上床的位置。先配數量，稍後再合併兩組。",
    "播放 Adding Up To 10，先聽一加二等於三，暫停用一個與兩個玩具對照；需要 four 的配對時可聽一加三段，其餘加到十的內容不列為本堂必答。",
    "做 four、one、two 三題數量配對，每題重新取物；再由家長放一個、孩子加兩個到床的位置，逐件數出三個，練 One bear and two bears make three.。",
    "交換放一個和加兩個的角色，再合起來數一次；較大孩子比較兩個先放、一個後放的結果。只記孩子實際配對、輪流操作與說話。"
  ]
},
  "w6d4b1": {
  "title": "輪流出題｜小鴨回來幾隻",
  "sentence": "Adventure 57: How many ducks came back?",
  "videoFocus": "分清出門與回來的小鴨，再交換提問剩下或回來幾隻。",
  "focus": "小鴨返回數量與孩子輪流問答。",
  "younger": "用五個大玩具當小鴨，家長逐題排出 one、two、three 的數量，孩子指圖卡再點數回答；最後換孩子排一題讓家長回答。",
  "older": "觀察每次回來的小鴨比出門時少一隻，再用 How many ducks came back? 輪流出題，能指出鴨媽媽不算在小鴨數量裡。",
  "caregiverTip": "準備五個玩具與數字圖卡，桌面分出出門和回來兩區。四色暖身可指認畫面物品，不必買棉花糖、葡萄、南瓜或蛋糕。主課五隻小鴨出門後只有四隻回來，接著依序減少，結尾五隻都回來；數小鴨時不要加入媽媽。提問先留孩子回答的時間，再一起點數確認，不讓家長自己問完又自己回答。",
  "pausePrompts": [
    {
      "moment": "主課只有一隻小鴨回來的段落後，或片後重排時",
      "title": "回來一隻",
      "question": "這一題只有 one 隻回來。請指 one 圖卡，再用一個玩具放在回來的區域。",
      "followUp": "孩子若把出門那一區也算進來，先指出這次問的是回來幾隻。",
      "targetWord": "one"
    },
    {
      "moment": "片後把兩隻放到回來的區域時",
      "title": "換你來問",
      "question": "這一題回來 two 隻，請你問 How many ducks came back?，讓家長先回答。",
      "followUp": "孩子只說 two 加手勢也可；家長答完後，讓孩子點數核對。",
      "targetWord": "two"
    },
    {
      "moment": "片後第三題排出三隻時",
      "title": "一起核對三隻",
      "question": "請數回來的 three 隻，再指出 three 圖卡。鴨媽媽要一起算進這三隻嗎？",
      "followUp": "數的是小鴨，不把媽媽或另一區玩具算進去；較大孩子說明自己如何確認。",
      "targetWord": "three"
    }
  ],
  "instructions": [
    "播放四色暖身短段，聽到顏色時指向畫面相應物品，再跟著拍手。",
    "回播一個喜歡的顏色段，由孩子指物品、家長說顏色，再交換；家中沒有同色物品也能完成。",
    "停片，孩子在畫面上選一種顏色請家人找，等待回答後再公布自己選的物品，練習輪流。",
    "喝水，把五個玩具當小鴨，指出出門與回來兩區，預告今天問的是小鴨回來幾隻。",
    "播放小鴨出門主課短段，第一輪五隻出門、四隻回來時停片，用玩具重演；熟悉後看後續減少及最後全都回來的段落。",
    "片後依序排 one、two、three 隻回來，做三題問答；每題讓孩子先說或指答案，再逐件核對。示範 How many ducks came back?，換孩子出其中一題。",
    "每位孩子都輪到提問與回答，再說單字或完整問句；若答錯可重排慢慢數，只記孩子真正回答的三題，不以看完影片代替。"
  ]
},
  "w6d4b2": {
  "title": "輪流出題｜小主人準備餐桌",
  "sentence": "Adventure 58: Please give me three cups.",
  "videoFocus": "聽按數量分給你和我的歌曲，片後由小主人提出杯子數量並核對交付。",
  "focus": "按數量取物、遞交與禮貌請求。",
  "younger": "用不易碎的杯子或大玩具代替餐具，依 two、three、four 三個數字指令逐題拿取；數完一組先收回，再出下一題。",
  "older": "扮小主人用 Please give me three cups. 出題，家人拿好後自己核對；可以把 cups 改成 spoons 或 toys，物品種類和數量一起說清楚。",
  "caregiverTip": "準備四個不易碎空杯或四件大玩具，不需真食物。拍照暖身仍用手比相機、數一二三與擺表情。主課從 one 到 five 分糖果並有道謝；今天改用杯子逐題取物，歌曲的你一份、我一份是兩個人各自的數量，不是兩人合計。Please give me three cups. 是片後請求句，歌裡沒有教杯子；不需要模仿吃糖。",
  "pausePrompts": [
    {
      "moment": "主課 two for you、two for me 段後",
      "title": "兩個是給誰的",
      "question": "請拿 two 個杯子給家人。這個 two 是家人收到的數量，還是你們兩人的總數？",
      "followUp": "先只做給對方的一組，再指出另一人若也有兩個，那是另一組；不把兩組混數成這一題。",
      "targetWord": "two"
    },
    {
      "moment": "主課三個的段落後，換孩子當小主人",
      "title": "先請求，再核對",
      "question": "請說 Please give me three cups.，等家人交給你，再用 three 圖卡核對收到幾個。",
      "followUp": "孩子說 three 加手勢也可以；使用玩具時換成 toys，不把歌曲當成杯子詞彙教學。",
      "targetWord": "three"
    },
    {
      "moment": "片後換家人請孩子準備四個時",
      "title": "多一個也要看出來",
      "question": "請準備 four 個杯子。若旁邊還放著其他杯子，你要把哪些算進這次交給家人的一組？",
      "followUp": "圈定這次交付的四個，逐件點數再遞出；每輪收回重排，不累加前一回合。",
      "targetWord": "four"
    }
  ],
  "instructions": [
    "播放拍照暖身短段，用手比相機，跟著數一二三，露出舒服的笑容；只做想像拍照。",
    "回播表情段，輪流做開心或有趣的表情給家人看；不想做嚇人表情可以跳過。",
    "停片，孩子當攝影師數一二三，家人擺表情，再交換；不用真的拍攝或保存照片。",
    "喝水，把四個空杯或玩具放好，說明稍後當小主人出數量口令；物品每輪收回再重拿。",
    "播放 One For You, One For Me 的二、三、四個分物段，停片分清每人各收到多少；道謝可以跟說，影片的糖果情境片後改為準備空杯。",
    "片後做 two、three、four 三題生活問答：先聽數量，再取杯、點數、回答。練 Please give me three cups.，由孩子提出請求，拿到後自行核對。",
    "交換小主人與幫忙準備的人，每人都拿過、數過並核對一輪；依孩子實際回答三題與合作記錄，沒有家人同上課時就由照顧者輪流。"
  ]
},
  "w6d5b1": {
  "title": "本週闖關｜數字三站，做到幾下就停",
  "sentence": "Adventure 59: I can count and stop at four.",
  "videoFocus": "跟七步歌聽順數與倒數，片後用三站任務檢查數量和動作次數。",
  "focus": "七步歌的順逆數序與三站數量複習。",
  "younger": "完成 three 下拍手、four 次點桌、one 根手指三站，每做一下才數一次，到指定數字就停；不需要一口氣背到七或倒著走。",
  "older": "先跟七步歌順數一到七，願意再試七到一；三站改由自己看圖卡、說數字、做次數，並練 I can count and stop at four.。",
  "caregiverTip": "使用雙手、桌面與本課數字圖卡即可，不用另做闖關卡。暖身辨認耳、眼、鼻、嘴、手與感受，指向自己部位時不戳眼睛；心的感受是情緒表達。主課有一到七及七到一，也有一到三的小段；倒數可坐著伸收手指，不必背對方向倒退走。闖關重點是點數與停止，不計時競速；最後肯定孩子用過的核對方法。",
  "pausePrompts": [
    {
      "moment": "主課一到三的小段後，暫停做第一站時",
      "title": "三下拍手站",
      "question": "請找 three 圖卡，自己拍三下就停。你能每拍一下才數一聲嗎？",
      "followUp": "如果說得快、手跟不上，放慢再試；一次動作只配一個數詞。",
      "targetWord": "three"
    },
    {
      "moment": "片後第二站看圖卡動作時",
      "title": "四次點桌站",
      "question": "看到 four，請輕點桌面四次，停住後說 I can count and stop at four.。",
      "followUp": "先完整做完再說句子，較小孩子只說 four 也可，不要邊長句邊混算動作。",
      "targetWord": "four"
    },
    {
      "moment": "片後第三站收束時",
      "title": "一根手指站",
      "question": "請只伸 one 根手指，再找 one 圖卡。剛才四次點桌和現在一根手指，數的是同一件事嗎？",
      "followUp": "分清動作次數與物品數量，兩題都可以點數，但不要把前站次數累加到這站。",
      "targetWord": "one"
    }
  ],
  "instructions": [
    "播放感官暖身短段，輕指耳朵、眼睛、鼻子或嘴巴，跟著手勢辨認，不把手指伸進眼睛或耳朵。",
    "回播手和心的段落，輕碰自己的手，再用表情表示今天開心、平靜或其他感受；每人答案可以不同。",
    "停片，孩子選一個身體部位帶家人指認，最後選一種感受說詞或做表情，不比較誰的情緒才對。",
    "喝水，打開數字圖卡，說明三站是拍手、點桌、伸手指，每站完成後停住再換下一站。",
    "播放七步主課短段，原地踏步或用手指跟一到七；聽一到三的小段可停片跟做，想挑戰倒數就坐著收手指，不倒退走。",
    "完成 three 下拍手、four 次點桌、one 根手指三站。每站先讀圖卡，再自己做出數量，最後核對；練 I can count and stop at four.。",
    "孩子選一站帶家長做，再自己說數詞或完整句；每位孩子實際完成三站才記該項任務，不用競速，也不因不會倒數就取消已完成的點數。"
  ]
},
  "w6d5b2": {
  "title": "本週闖關｜小夥伴回家，數量合作賽",
  "sentence": "Adventure 60: We have four toys altogether.",
  "videoFocus": "觀察五隻幽靈逐一少回來再全員返回，片後合作配數量與合併玩具。",
  "focus": "返回數量複習與一加三的合作點數。",
  "younger": "五個玩具先收回同一區，依 four、one、two 三題各拿出指定數量，碰著數完再給家人檢查；最後與家人各放一組玩具，合起來數。",
  "older": "先預測少回來一隻會剩幾隻，再用玩具核對；片後自己放一個、家人放三個，合成四個並說 We have four toys altogether.，交換兩人的分工再做一次。",
  "caregiverTip": "準備五件大玩具與本課數字圖卡，用桌面兩區表示外出和回家。暖身手腳伸入伸出可站在原地，家長站孩子旁邊示範左右，轉身只做舒服的小轉向。這首五隻幽靈由五隻出門、四隻回來一路到零，結尾五隻都回來；歌詞用 no little ghosts 表示沒有回來，不把它說成唱出 zero 這個單字。若孩子怕幽靈，可停片以普通玩具演故事；合作加法是片後延伸，不是歌曲直接教的算式。",
  "pausePrompts": [
    {
      "moment": "主課第一輪四隻回來後",
      "title": "先接四位回家",
      "question": "請在回家的區域放 four 個玩具，再用 four 圖卡配對。外出區的第五個要一起算嗎？",
      "followUp": "這題只數回來的一組，等孩子自己點完再確認。",
      "targetWord": "four"
    },
    {
      "moment": "片後重新出一個的題目時",
      "title": "這次只接一位",
      "question": "請只接 one 個玩具回家，指出 one 圖卡。你能自己檢查有沒有多拿嗎？",
      "followUp": "家長先不代拿或代答，讓孩子逐件數一次。",
      "targetWord": "one"
    },
    {
      "moment": "片後第三題與合作合併前",
      "title": "兩個核對完成",
      "question": "請拿 two 個玩具並數給家人看；把這一題收回後，我們再玩一個加三個，可以嗎？",
      "followUp": "三題與後面的合作分開計算，不把兩個直接誤當一加三的結果。",
      "targetWord": "two"
    }
  ],
  "instructions": [
    "播放伸入伸出的暖身短段，家長站孩子旁邊示範右手或左手伸出、收回與輕搖，避免面對面左右相反。",
    "回播腳或身體的段落，在原地做小動作；轉身可改成小轉向或只轉手，不連續旋轉。",
    "停片，孩子選手或腳帶家人做兩個動作，再交換；收回手腳後坐好，準備桌面數量任務。",
    "喝水，把五個玩具放外出區，打開數字圖卡，預告這首是回來的夥伴逐一變少，最後再一起回家。",
    "播放五隻幽靈主課短段，第一輪回來四隻時停片用玩具重演；可再看最後全部返回，數五個確認一位都不少。",
    "片後完成 four、one、two 三題數量複習，每題重新取物並自己點數。接著孩子放一個、家人放三個，合起來從頭數到四，練 We have four toys altogether.。",
    "交換放一個與放三個的人，再一起數總量；每位孩子輪流完成三題、操作合作並說數詞或句子。最後請孩子挑一題示範本週學會的核對方法，只記真實完成內容。"
  ]
}
};

const seventhWeekReviewedGuidance: Record<string, ReviewedTeachingGuidance> = {
  "w7d1b1": {
  "title": "探索日｜你喜歡什麼食物",
  "sentence": "Adventure 61: Do you like apples?",
  "videoFocus": "聽食物喜好問答，分清單一食物與歌曲的趣味組合，再用圖卡表達自己的喜好。",
  "focus": "食物問答與真實喜好表達。",
  "younger": "在本課圖卡找 apple、banana、pizza 三題，家長問喜不喜歡時可點頭、搖頭或說 Yes／No；再主動說一個食物詞，不需要和影片角色選一樣。",
  "older": "輪流問 Do you like apples?，依自己喜好答 Yes, I do. 或 No, I do not.；換香蕉時問 Do you like bananas?，換披薩時問 Do you like pizza?，練習聽完家人答案。",
  "caregiverTip": "打開本課食物圖卡即可；家中有蘋果或香蕉可拿來指認，不必另外買食材或真的做奇怪料理。暖身用聖誕歌曲的拍手、跳躍、踏步和輕聲段練動作，歌曲節慶不代表今天就是聖誕節。主課有披薩、香蕉等食物及混搭問答；蘋果是片後圖卡延伸，不要求在影片找蘋果。喜歡與不喜歡都能正確回答，別把歌曲說不好吃的組合當成每個人都必須討厭。",
  "pausePrompts": [
    {
      "moment": "主課披薩問答段落後",
      "title": "先看食物，再聽問題",
      "question": "請指本課 pizza 圖卡。剛才先問披薩，再問組合；你喜歡披薩嗎？",
      "followUp": "等孩子用手勢或 Yes／No 回答，再示範完整答句；喜好不設標準答案。",
      "targetWord": "pizza"
    },
    {
      "moment": "主課香蕉與湯的問答段落後",
      "title": "香蕉和混搭分開問",
      "question": "請找 banana 圖卡。我問的是香蕉，你想點頭還是搖頭？如果問香蕉湯，答案可以不同嗎？",
      "followUp": "先確認孩子知道在問哪一種食物，不把喜歡香蕉推成也喜歡香蕉湯。",
      "targetWord": "banana"
    },
    {
      "moment": "片後改用蘋果圖卡時",
      "title": "輪到你來問",
      "question": "這張是 apple。請問家人 Do you like apples?，等他回答，再告訴我你自己的喜好。",
      "followUp": "蘋果是家長加入的延伸題；孩子只說 apple 加手勢也可以。",
      "targetWord": "apple"
    }
  ],
  "instructions": [
    "播放木偶聖誕暖身的拍手短段，跟著輕拍雙手，再向家人揮手打招呼；不用節慶道具。",
    "回播跳躍或踏步一小段，選舒服的小動作跟做；空間小或不想跳時可原地抬腳。",
    "用歌曲輕聲段收束，孩子選拍手或踏步帶家人做一次，再一起小聲說節慶問候，不用比誰喊得大聲。",
    "喝水，打開 apple、banana、pizza、water 圖卡，先指認再說今天會互問喜歡什麼，家人可以有不同答案。",
    "播放食物喜好主課短段，先聽一種食物與混搭後的問答；選披薩或香蕉段暫停，確認問的是哪一種，再讓孩子回答自己的喜好。",
    "片後做 apple、banana、pizza 三題找圖卡，每題先聽詞再自己指出；接著示範 Do you like apples?，家長回答後換孩子答，依實際喜好說 Yes／No。",
    "每位孩子完成三次指認並主動開口；較大孩子交換提問，較小孩子說單字也可以。食物名稱認錯再提示重找，喜好不同不判錯。"
  ]
},
  "w7d1b2": {
  "title": "探索日｜水果、餐點和喝水時間",
  "sentence": "Adventure 62: I like bananas and drink water.",
  "videoFocus": "辨認水果歌中的水果，片後把水果、餐點與飲水分清，輪流安排自己的點心選擇。",
  "focus": "水果辨認與生活飲食選擇。",
  "younger": "從圖卡找 banana、pizza、water 三題，香蕉配水果、披薩配餐點、水配喝水動作；喜不喜歡可用手勢回答，再輪流選一樣給家人看。",
  "older": "說出香蕉和蘋果是水果，披薩是餐點、水是飲水，再練 I like bananas and drink water.；不喜歡香蕉時可說 I do not like bananas.，家人接住真實答案。",
  "caregiverTip": "使用本課圖卡與一杯水即可，有家中原本要吃的水果再拿出來看，沒有也不影響上課。Nap Time 是安靜休息歌，先坐著放鬆與想像休息，再伸展清醒，不套大跳大叫。水果歌可認香蕉、蘋果等水果；披薩和水在片後辨認，不要求影片一定出現。健康食物活動練習認識食物與照顧自己，不把食物分成好孩子吃或壞孩子吃，也不以吃下多少作完成標準。",
  "pausePrompts": [
    {
      "moment": "主課唱到香蕉後，或停片找相應圖卡時",
      "title": "找水果香蕉",
      "question": "請找 banana 圖卡。香蕉是水果，還是杯子裡的水？你可以指給我看嗎？",
      "followUp": "先讓孩子指認物品類別，再問喜不喜歡，兩種問題分開。",
      "targetWord": "banana"
    },
    {
      "moment": "片後把水果和餐點圖卡一起看時",
      "title": "披薩是另一種餐點",
      "question": "請找 pizza。剛才水果歌在唱水果，這張披薩也是水果嗎？",
      "followUp": "這是片後比較題，披薩是餐點，不因不屬水果就稱它壞食物。",
      "targetWord": "pizza"
    },
    {
      "moment": "片後準備自己的點心選擇時",
      "title": "喝水也能自己說",
      "question": "請找 water 圖卡，再指桌上的水杯。你想喝水時可以怎麼告訴家人？",
      "followUp": "孩子可說 water 或做喝水手勢；真的喝水時坐好，喝完才回答。",
      "targetWord": "water"
    }
  ],
  "instructions": [
    "播放午睡暖身短段，坐在舒服位置，肩膀放鬆、自然呼吸，聽到休息的句子用手勢表示休息。",
    "回播喜歡的安靜段落，孩子可想一件開心的事，再用簡單詞或表情分享；不必真的睡著或閉眼站立。",
    "停片，慢慢伸展手臂、睜眼看看家人，孩子帶一個輕柔醒來動作，再交換；用安靜方式準備注意力。",
    "喝水，把本課圖卡打開，說明先找歌裡的水果，片後再比較披薩和水；有現成水果可放桌上，不需烹煮。",
    "播放水果主課短段，聽到香蕉或蘋果時暫停，請孩子找對應圖卡；其他水果可聽名字認畫面，不要求一次全記住。",
    "片後做 banana、pizza、water 三題指認，每題請孩子說或做用途，再和家人輪流選一份想像點心及水；示範 I like bananas and drink water.。",
    "每位孩子實際指認三題並輪到一次選擇、回答或操作；不喜歡香蕉可換自己的喜好說法。家長記錄認識與合作，不以是否吃完或選得和家人相同評分。"
  ]
},
  "w7d2b1": {
  "title": "動起來｜食物喜好，聽完再做",
  "sentence": "Adventure 63: Do you like pizza?",
  "videoFocus": "聽 pizza 的製作動作，先跟一段再停住；片後用披薩、水、蘋果做三個不同手勢與喜好問答。",
  "focus": "披薩製作動作與先聽後做。",
  "younger": "片後依 pizza 做雙手捧食物、water 做拿杯、apple 做摘水果三題想像動作，先指圖卡再做；問喜不喜歡時可點頭或說 Yes／No。",
  "older": "辨認兩個披薩製作手勢的先後，停片後自己示範；再聽 pizza、water、apple 三詞換動作。問家人 Do you like pizza?，等答案後說自己的偏好。",
  "caregiverTip": "只用本頁圖卡與空手。主課直接唱 pizza 的製作流程，選轉麵團、抹醬等兩個動作即可；烤與切只想像，不拿熱器具或刀具。water、apple 的拿杯與摘取動作是片後延伸。先完成中性動作，再問 Do you like pizza?；不喜歡也能完成，不用吃披薩換獎勵。",
  "pausePrompts": [
    {
      "moment": "主課一個披薩製作動作後",
      "title": "披薩動作先後",
      "question": "請找 pizza。剛才是轉麵團還是抹醬？先做看到的手勢，再說 pizza。",
      "followUp": "依實際停住的畫面回答；回播核對後讓孩子自己做，不拉著手代做。",
      "targetWord": "pizza"
    },
    {
      "moment": "停片後加入飲水圖卡時",
      "title": "杯子和披薩怎麼拿",
      "question": "聽到 water 才做拿杯手勢。這個手勢和轉披薩麵團一樣嗎？",
      "followUp": "水是片後加入；用空手示範，不邊動邊拿真水杯。",
      "targetWord": "water"
    },
    {
      "moment": "第三題換孩子帶動作時",
      "title": "蘋果你來帶",
      "question": "請找 apple，做伸手摘水果的動作，讓家人跟你一次。",
      "followUp": "由孩子決定何時開始和停止，完成後補說 apple；不是影片中的披薩步驟。",
      "targetWord": "apple"
    }
  ],
  "instructions": [
    "播放請怪物離開的暖身短段，用揮手和 Go away! 表達離開，聲音保持舒服，不用喊叫。",
    "回播孩子能接受的一個角色段，先由家長說詞、孩子做揮手，再交換；不喜歡的畫面可停片只練手勢。",
    "停片，孩子選揮手或雙手向前的動作帶家人做，說完把手放下；用想像情境，不把真實家人當要趕走的對象。",
    "喝水，打開食物圖卡，用雙手比出圓形披薩；預告先跟影片製作手勢，再把水與蘋果加進動作遊戲。",
    "播放〈Pizza Party〉的一小段，跟做轉麵團或抹醬；停片請孩子自己重做，再聽下一個動作，不必一路不停地跳。",
    "片後完成 pizza 捧食物、water 拿杯、apple 摘水果三次跟做。每題先指圖卡、聽詞再做，接著用 Do you like pizza? 互問喜好。",
    "每位孩子都自己做過三題並開口一次，再選一題帶家人做；喜好不同不判錯，較大孩子完整提問，較小孩子說單字或 Yes／No。"
  ]
},
  "w7d2b2": {
  "title": "動起來｜水果小店，一件一件分",
  "sentence": "Adventure 64: I have two apples and one banana.",
  "videoFocus": "從水果歌認出 apple 與 banana，再開小店逐件拿取並核對兩個蘋果、一個香蕉。",
  "focus": "水果詞聽辨與實物逐件點數。",
  "younger": "用圖卡做 water 拿杯動作，再用大積木代表水果，拿一個 apple、再拿一個 banana，逐件指著數到二；等家長問完再交給對方。",
  "older": "用兩個同色積木代表兩顆蘋果、另一色代表一根香蕉，逐件數兩組再合起來數三個，說 I have two apples and one banana.；交換店員和客人再核對一次。",
  "caregiverTip": "準備三個大積木、空杯與本頁圖卡，先約定兩個積木代表蘋果、一個代表香蕉。主課唱到 apple、banana 時停片找卡，沒有教兩加一的固定數量；數數在片後真的拿取時進行。water 只配杯子，不算成一顆水果。每人實際拿取和核對後，才記錄本人完成的回合。",
  "pausePrompts": [
    {
      "moment": "停片後水果店開張、先準備杯子時",
      "title": "先分飲水和水果",
      "question": "請找 water，再做拿空杯的動作。它要算成一顆水果嗎？",
      "followUp": "這是片後飲水比較；指出杯子用途後，將杯子留在水果點數區外。",
      "targetWord": "water"
    },
    {
      "moment": "主課唱過 apple，店員開始拿蘋果時",
      "title": "蘋果逐個放",
      "question": "請找 apple，拿代表蘋果的積木。每放一個才數一次；今天的訂單要幾個？",
      "followUp": "較小孩子先拿一個，較大孩子拿兩個並逐件核對；數量由這張訂單指定，不從歌曲猜。",
      "targetWord": "apple"
    },
    {
      "moment": "交貨前加入香蕉時",
      "title": "再加一根香蕉",
      "question": "請找 banana，放一個香蕉積木。和蘋果合起來後，你能指著每件核對嗎？",
      "followUp": "較小孩子合數兩件，較大孩子說兩個蘋果、一個香蕉再合數三件；交換買方與店員重試。",
      "targetWord": "banana"
    }
  ],
  "instructions": [
    "播放 Go Away! 暖身短段，手掌向前或揮手表示請想像怪物離開，不推碰家人。",
    "回播可接受的角色段，由家長說、孩子做，再換孩子說或揮手；不要求看完令孩子不舒服的畫面。",
    "停片，孩子選一個揮手動作帶家人做，最後把手收好準備當小店員；不突然驚嚇或追逐。",
    "喝水，讓孩子先把代表蘋果的積木與香蕉積木分開，放空杯在旁邊；預告看片認名稱，開店時才照訂單拿數量。",
    "播放〈Fruit Is Yummy〉，聽到 banana 或 apple 後停片對照圖卡。水果名出現不代表數量，先認對種類再收起影片。",
    "片後三題跟做：water 拿空杯、apple 依年齡拿一個或兩個積木、banana 拿一個積木。再扮客人與店員逐件點數交貨，較大孩子練 I have two apples and one banana.。",
    "交換店員和客人，每位孩子都實際拿取、回答和核對；較小孩子數一加一成二，較大孩子數二加一成三。任務記錄依真實三題跟做與輪流合作，不以旁觀算完成。"
  ]
},
  "w7d3b1": {
  "title": "配對日｜水果找同伴，餐點分一組",
  "sentence": "Adventure 65: Apples and bananas are fruit.",
  "videoFocus": "把水果歌直接唱到的 apple、banana 配在一起，再用 pizza 比較水果與製作好的餐點。",
  "focus": "水果名稱與分類規則。",
  "younger": "看本課圖卡，apple 和 banana 都配到水果組，pizza 配到餐點組；每題自己指出並說一個食物詞，不只跟著家長的手指。",
  "older": "完成三題分類後說 Apples and bananas are fruit.；能說明披薩是製作好的餐點，不因有紅色就和蘋果分同組，並問家人喜歡哪種水果。",
  "caregiverTip": "用本頁圖卡和左右手分組，一邊是水果、一邊是製作好的餐點。〈Fruit Is Yummy〉直接唱 apple、banana 與 fruit；pizza、water 是片後比較。說清楚本輪按種類分，不按顏色或喜好分；水果也屬食物，不教成水果不能算食物。",
  "pausePrompts": [
    {
      "moment": "主課唱到 apple 後",
      "title": "蘋果先選組",
      "question": "請找 apple，指向水果或餐點那一手。你用的是種類還是顏色規則？",
      "followUp": "較小孩子先選組；較大孩子說蘋果是水果。兩手位置保持不變。",
      "targetWord": "apple"
    },
    {
      "moment": "主課唱到 banana 後",
      "title": "不同外形也能同組",
      "question": "請找 banana。它和 apple 形狀不同，仍能同放水果組嗎？",
      "followUp": "讓孩子把兩張圖卡配在一起再說共同點，不因外形不同拆散同類。",
      "targetWord": "banana"
    },
    {
      "moment": "片後加入披薩作比較時",
      "title": "披薩有紅色也要重看規則",
      "question": "請找 pizza。即使醬料和蘋果一樣紅，這輪應放哪一組？",
      "followUp": "重申按水果與製作好的餐點分；孩子說出或指明規則後再核對。",
      "targetWord": "pizza"
    }
  ],
  "instructions": [
    "播放雨滴暖身短段，手指從高處輕輕往下移，表示雨從上方落下；身體留在原地。",
    "回播雨落在樹葉或手上的段落，一手當葉子，另一手指尖模仿雨滴，再交換兩手。",
    "停片，孩子選雨落在手上或地上的動作帶家人做，最後雙手放腿上收束，不用真的弄濕地板。",
    "喝水，指左手約定為水果、右手約定為製作好的餐點；讓孩子說一次這輪的規則。",
    "播放〈Fruit Is Yummy〉中 apple、banana 的短段，各停一次找本頁圖卡，再聽水果的共同名稱。",
    "片後做 apple、banana、pizza 三題分類，孩子每次先找圖卡，再指水果或餐點那一手；完成後練 Apples and bananas are fruit.。",
    "交換由孩子說分類規則、家長選一題回答，再由孩子核對；每人實際完成三題和一次開口，最後選喜歡的水果說Yes／No，喜好不判錯。"
  ]
},
  "w7d3b2": {
  "title": "配對日｜水果聲音拍幾下",
  "sentence": "Adventure 66: We can clap two, three, or four times.",
  "videoFocus": "用猴子歌曲辨認數字，片後聽中文水果詞與短語，把每個說話拍點配上數量。",
  "focus": "數字辨認與中文水果詞的聲音分段。",
  "younger": "家長慢慢說「蘋果」，孩子每個字拍一下，配 two 圖卡；再一起拍「火龍果」三下、「一根香蕉」四下，找到 three、four，說一個數字即可。",
  "older": "自己聽、跟說並拍出「蘋果」兩下、「火龍果」三下與「一根香蕉」四下，再說對應英文數字；分清詞和短語，不把香蕉本身說成四拍。",
  "caregiverTip": "使用本課數字圖卡和雙手即可，不需另找水果圖片或寫符號。暖身用空手模仿揉、拍麵團，字母只跟看不要求先寫。猴子主課數量逐一減少，可用手指跟數，不在床上跳。片後是中文聲音練習：家長自然說完整詞，再放慢為每個字拍一下；兩、三、四是聲音拍點數，不是水果個數。這裡「一根香蕉」是四字短語，「香蕉」本身只有兩拍。",
  "pausePrompts": [
    {
      "moment": "主課數字短段後，停片轉中文練習時",
      "title": "蘋果分兩拍",
      "question": "聽我說「蘋果」，再慢慢說、拍兩下。請找 two 圖卡，這裡是在數聲音還是兩顆水果？",
      "followUp": "先自然說詞，再一字一拍；不要把單一聲音拖長就多拍。",
      "targetWord": "two"
    },
    {
      "moment": "片後第二題說火龍果時",
      "title": "三拍一個詞",
      "question": "請跟說「火龍果」，每個字輕拍一下，再找 three。你拍完可以自己數一次嗎？",
      "followUp": "較小孩子跟家長分段，較大孩子自己啟動，這題不需要桌上真的有三顆水果。",
      "targetWord": "three"
    },
    {
      "moment": "片後第三題比較詞與短語時",
      "title": "四拍是一段話",
      "question": "聽「一根香蕉」並拍四下，再配 four 圖卡。如果只說「香蕉」，還是四拍嗎？",
      "followUp": "只說香蕉是兩拍，加上一根才成四拍；先說完整短語再核對，保留自然發音。",
      "targetWord": "four"
    }
  ],
  "instructions": [
    "播放拍蛋糕暖身短段，用空手模仿揉麵團、輕拍、在空中標記字母，不操作烤箱。",
    "回播拍的段落，家長拍一下、孩子回拍一下，再跟著歌做一小段；不需要麵粉或真蛋糕。",
    "停片，孩子選揉或拍的動作帶家人做，最後用兩下慢拍收束，準備聽聲音和數字。",
    "喝水，打開two、three、four、one數字圖卡，說明先看片數猴子，片後才數中文說話的拍點。",
    "播放猴子主課短段，聽數量減少時用手指收回一根；不模仿從床上掉落，挑數字二、三、四的段落認詞。",
    "片後做三題聲音配對：自然說「蘋果」再拍兩下配two，說「火龍果」拍三下配three，說「一根香蕉」拍四下配four；每題讓孩子親手拍並選圖卡。",
    "兩人交換說詞和拍數的人，至少各做一題並核對；較大孩子練 We can clap two, three, or four times.，較小孩子說數字。只記完成的三次配對與真實輪流合作。"
  ]
},
  "w7d4b1": {
  "title": "小老師｜有禮貌地請求飲水",
  "sentence": "Adventure 67: May I have some water, please?",
  "videoFocus": "聽兒童歌曲的禮貌請求與回覆，再把飲品換成 water，輪流當客人和服務者。",
  "focus": "禮貌請求、等待與回應。",
  "younger": "聽家長問哪張是 pizza、water、apple，自己指認三題；輪到點餐時說water加請求手勢，再等家長回應。",
  "older": "以 May I have some water, please? 請求飲水，拿到想像杯子後說Thank you；交換服務者與客人，先聽完整句再回答，不搶替其他人選。",
  "caregiverTip": "〈May I Please? Yes You May!〉直接示範請求點心、果汁等的句型；只選點心或飲品請求段，不需練全片其他生活規則。water、pizza、apple 沒有被這首歌直接唱出，是本頁圖卡的名詞替換。用空杯演練，先請求、等回覆、再交接；真有喝水需要仍由照顧者協助，不把語言表現當取得飲水的條件。",
  "pausePrompts": [
    {
      "moment": "主課點心請求與回覆之後，換本頁餐點卡時",
      "title": "餐點換成披薩",
      "question": "請找 pizza。若要請家人幫忙拿，應先伸手拿走，還是先請求再等回答？",
      "followUp": "請求句型來自影片，pizza 是課堂替換；孩子先指出圖卡，再由家長示範禮貌說法。",
      "targetWord": "pizza"
    },
    {
      "moment": "主課飲品請求段後，拿起空杯時",
      "title": "把飲品換成水",
      "question": "這次我們想要 water，可以說 May I have some water, please? 嗎？說完先等家人回答。",
      "followUp": "明說影片唱的是 juice，現在換詞成 water；較小孩子說 water 加請求手勢即可。",
      "targetWord": "water"
    },
    {
      "moment": "片後交換服務者與客人時",
      "title": "蘋果訂單別送錯",
      "question": "客人要 apple，服務者要先找哪張卡？換你提問後，能等家人選完再核對嗎？",
      "followUp": "孩子要真的指認並輪到一次提問；送錯時重新核對，不由大人搶答。",
      "targetWord": "apple"
    }
  ],
  "instructions": [
    "播放頭肩膝腳暖身慢段，輕碰自己對應部位；腳趾摸不到可指向，不勉強彎身。",
    "回播一小段跟做，歌曲加快後可停片用原速度練；指眼、耳、口、鼻時不戳進去。",
    "停片，孩子選兩個身體部位帶家人做，家長跟完才換人，練等待與輪流。",
    "喝水，放好空杯與食物圖卡。家長先演直接拿和先請求兩種做法，說明今天練聽完才回應。",
    "播放〈May I Please? Yes You May!〉的點心／果汁請求與回覆段，請孩子聽完請求再接回覆；停片將 juice 明說換成 water。",
    "片後做pizza、water、apple三題問答，孩子先自己指認再回答；接著輪流請求飲水，練 May I have some water, please? 和Thank you。",
    "每位孩子當過客人、回答過三題並開口一次；交換角色時保留等待時間，沒有其他孩子同行就與照顧者輪流。"
  ]
},
  "w7d4b2": {
  "title": "小老師｜披薩派對，你想要什麼",
  "sentence": "Adventure 68: Would you like a banana?",
  "videoFocus": "用手勢跟披薩製作順序，片後邀請家人選飲水與水果，練禮貌接受或婉拒。",
  "focus": "製作順序觀察與邀請喜好問答。",
  "younger": "先跟做兩個披薩手勢，片後回答water、apple、banana三題，指正確圖卡後點頭或搖頭表示想不想要；自己輪流邀請一次。",
  "older": "練 Would you like a banana?，聽家人答Yes, please.或No, thank you.；改問蘋果時用an apple，飲水用some water，接受家人不同選擇。",
  "caregiverTip": "用本課圖卡與雙手玩想像派對即可。BINGO暖身逐步用拍手、拍腿、拍肚子、輕拍頭或小跳代替字母，跟慢段就好。披薩主課有轉麵團、抹醬、刨起司、撒配料、烤、切、吃的順序，全部用空手模仿，不操作刀具與烤箱。water、apple、banana是片後招待題，不當成影片必有的配料；拒絕某食物不影響答對名稱或完成合作。",
  "pausePrompts": [
    {
      "moment": "主課手勢短段後，片後準備派對時",
      "title": "飲水要不要",
      "question": "請找water圖卡。我問Would you like some water?，你想回答Yes, please.還是No, thank you.？",
      "followUp": "先確認圖卡是水，再回應這次想不想要；不強迫每次都說Yes。",
      "targetWord": "water"
    },
    {
      "moment": "片後第二題招待水果時",
      "title": "蘋果換你邀請",
      "question": "請找apple，換你問家人要不要蘋果，等他回答後再做遞出的手勢。",
      "followUp": "較大孩子用Would you like an apple?；這是片後水果選擇，不假裝蘋果一定在披薩歌中。",
      "targetWord": "apple"
    },
    {
      "moment": "片後第三題輪到香蕉時",
      "title": "香蕉可以婉拒",
      "question": "請找banana，再問Would you like a banana?。家人若說No, thank you.，你可以怎麼回應？",
      "followUp": "停下遞物動作、接受對方選擇即可，不把婉拒當答錯或繼續逼選。",
      "targetWord": "banana"
    }
  ],
  "instructions": [
    "播放BINGO暖身短段，先聽狗的名字與字母，再在空下的位置拍手。",
    "回播換動作段，選拍腿、拍肚子或輕拍頭跟做；小跳可改原地抬腳，不必一輪全換完。",
    "停片，孩子選一個節奏動作帶家人，拍完把手收好，準備做想像披薩。",
    "喝水，打開食物圖卡，說明影片先做披薩，片後才用水果與水招待家人。",
    "播放披薩主課短段，用空手跟轉麵團、抹醬、撒配料的先後；烤和切只做手勢，不碰熱器具。",
    "片後完成water、apple、banana三題問答，先指認再回應要不要；輪流邀請，練Would you like a banana?和禮貌接受或婉拒。",
    "每位孩子實際回答三題並當過邀請者或受邀者；較小孩子詞加手勢、較大孩子完整問答，家長只記真實輪流，不用喜好相同當完成條件。"
  ]
},
  "w7d5b1": {
  "title": "本週闖關｜食物三題，自己說喜好",
  "sentence": "Adventure 69: I like apples, but I do not like bananas.",
  "videoFocus": "回看食物喜好問答，分清喜歡與不喜歡，再完成名稱、分類與真實偏好三站複習。",
  "focus": "食物問答的肯定否定與本週三站複習。",
  "younger": "三題分別找apple、把banana配到水果、回答喜不喜歡pizza；每題自己指、說或做手勢，最後主動說一個食物詞。",
  "older": "完成名稱、分類和喜好三題後，依真實偏好組句；示範I like apples, but I do not like bananas.，喜歡兩者可改I like apples and bananas.，不背不符合自己的答案。",
  "caregiverTip": "回用探索日的木偶喜好歌，這次任務進階為比較問的是單一食物還是混搭，以及自己和家人的不同答案。banana、pizza 是歌詞直接詞，apple 是片後延伸。只回看香蕉或披薩問答短段，不要求整首。名稱辨認有正誤，喜好沒有統一答案；不必試吃或把歌曲中的否定回答照抄成自己的喜好。",
  "pausePrompts": [
    {
      "moment": "問答短段後，第一站換成蘋果卡時",
      "title": "蘋果名稱不用提示",
      "question": "請自己找 apple 並說出名稱。這題在考認名稱，還是在問你喜不喜歡？",
      "followUp": "先完成指認；蘋果是片後延伸，不要求回片找它，也不以喜好代替名稱答案。",
      "targetWord": "apple"
    },
    {
      "moment": "聽完香蕉問答，第二站分類時",
      "title": "不喜歡也仍是水果",
      "question": "請把 banana 分到水果組。若有人不喜歡它，它還是水果嗎？",
      "followUp": "把類別與偏好分清，再以原句示範喜歡／不喜歡；答案可依個人偏好調整。",
      "targetWord": "banana"
    },
    {
      "moment": "第三站孩子訪問家人時",
      "title": "披薩答案可以不同",
      "question": "請找 pizza，問家人 Do you like pizza?，再說自己的答案。你們有一樣嗎？",
      "followUp": "等待彼此回應，說清楚差異即可；不是比誰答 Yes 才對。",
      "targetWord": "pizza"
    }
  ],
  "instructions": [
    "播放字母A暖身短段，指向畫面中的字母，先聽歌中的聲音再輕聲跟說。",
    "回播字母和發音一小段，用手指在空中跟畫看到的字形，再模仿一次；不額外塞入整套字母表。",
    "停片，家長指本課apple字首a作延伸，孩子可以指認或跟說apple；不要求把字母名稱當成每個單字裡的發音。",
    "喝水，說明今天有名稱、分類、喜好三站；先回看已學問答，這次要比較不同人的答案，不比速度。",
    "回播〈Do You Like Broccoli Ice Cream? (Puppets)〉的披薩或香蕉問答。分清單一食物與混搭的問題，停片各說自己的 Yes 或 No，再說明兩種答案都可能合理。",
    "片後完成三站：找apple並說名稱、把banana配到水果、認pizza並表達喜好。較大孩子用喜歡與不喜歡組句，示範I like apples, but I do not like bananas.。",
    "每位孩子自己完成三題，再用符合自己偏好的句子或單字開口；選一站教家人做，家長根據實際表達記錄，不以吃完或背同一句當成果。"
  ]
},
  "w7d5b2": {
  "title": "本週闖關｜小市場，禮貌點餐與核對交貨",
  "sentence": "Adventure 70: A banana and some water, please.",
  "videoFocus": "以禮貌請求點心與飲品的歌作範例，片後用香蕉、披薩與水核對一項及兩項訂單。",
  "focus": "請求句型與市場訂單核對。",
  "younger": "跟著圖卡完成banana、pizza、water三題：聽名稱指出、做拿取手勢、再交給家人；一題一件，輪流當買方或幫忙的人。",
  "older": "先依 banana、pizza、water 三題各自指認並核對交貨；再說 A banana and some water, please.，家人交出後逐項核對兩樣是否相符，再說 Thank you。交換角色後可另出披薩訂單，先問完再取物，不取代原來的水題。",
  "caregiverTip": "沿用本頁食物圖卡、空杯及一個大玩具。〈May I Please? Yes You May!〉的點心／飲品請求與回覆直接支援市場交談；banana、pizza、water 是課堂指定訂單，不能說影片逐項唱到。和小老師課不同，這次重點是客人說完後逐項核對並交換角色。較小孩子一次一項，較大孩子兩項，不用真錢或真食物。",
  "pausePrompts": [
    {
      "moment": "歌中請求示範後，客人下第一張訂單時",
      "title": "香蕉先聽完再拿",
      "question": "客人要 banana。請先找圖卡，再做拿取手勢；你有等客人說完嗎？",
      "followUp": "單項訂單先練成功，再讓孩子改當客人。香蕉不是歌曲原有的指定訂單。",
      "targetWord": "banana"
    },
    {
      "moment": "片後店員交第二張訂單時",
      "title": "披薩送錯可以重核對",
      "question": "訂單是 pizza，若店員拿成香蕉，要怎麼指出並改正？",
      "followUp": "請孩子指回訂單再找正確卡；用禮貌提醒代替責備，修正後也可完成。",
      "targetWord": "pizza"
    },
    {
      "moment": "最後一輪把飲品加到訂單時",
      "title": "兩樣一起也要一樣樣核對",
      "question": "請找 water。把香蕉和水各指一次，再說 A banana and some water, please.，交貨後怎麼確認？",
      "followUp": "較大孩子逐項核對兩樣，較小孩子本輪只取水；記錄實際輪流回答，不要求背完整句才算。",
      "targetWord": "water"
    }
  ],
  "instructions": [
    "播放小蟲動作暖身短段，轉動雙手模仿捲起，或原地抬腳模仿跳躍，不需要真的翻滾。",
    "回播扭動、爬或飛的一段，選手指爬、手臂輕擺等可在原地完成的動作，家長與孩子輪流跟做。",
    "停片，孩子選兩個小蟲動作帶家人，最後雙手收好、坐定，準備小市場。",
    "喝水，擺好圖卡與空杯，由孩子選先當客人還是店員；說清楚客人講完、店員核對、交貨後道謝的順序。",
    "回看〈May I Please? Yes You May!〉點心與飲品的請求段，先聽一人請求、另一人回覆；停片換成這次的小市場食物，不連播其他生活段。",
    "片後做banana、pizza、water三題複習，每題先聽名稱、自己指認再交接；較大孩子再提出含兩項的口頭訂單，練A banana and some water, please.。",
    "交換客人與取物角色，每人都回答、交接和核對過；最後說Thank you並挑本週最會的一題示範，實際三題與合作完成才記錄，不設真的付錢或競速。"
  ]
}
};

const eighthWeekReviewedGuidance: Record<string, ReviewedTeachingGuidance> = {
  "w8d1b1": {
  "title": "探索日｜先看天空，再說天氣",
  "sentence": "Adventure 71: It is cloudy, but I feel hot.",
  "videoFocus": "從天氣歌辨認cloudy、sunny、rainy，再分開描述天空與覺得熱。",
  "focus": "天空狀態初次辨認與冷熱感受區分。",
  "younger": "依 cloudy、hot、sunny 三題找本課圖卡，cloudy 指雲、sunny 指陽光，hot 用搧風動作表示感覺熱；再主動說一個詞，不必說今天同時出現全部天氣。",
  "older": "說出 cloudy 或 sunny 是在描述天空，hot 是冷熱感受；用 It is cloudy, but I feel hot. 練習兩種描述可以一起成立，再依實際情況改說 It is sunny. 或 I feel hot.。",
  "caregiverTip": "主課有sunny、rainy、cloudy，hot由片後搧風手勢與感受比較帶入，不假稱四詞都在歌裡。水母暖身照原動作；主課先聽詞找卡，再用指定多雲情境練It is cloudy, but I feel hot.。窗外不符合時明說是在演圖卡情境，晴天和多雲都不能直接判定溫度。",
  "pausePrompts": [
    {
      "moment": "主課cloudy段後",
      "title": "有雲但不一定下雨",
      "question": "請找cloudy，指卡上的雲；只看到雲就一定正在下雨嗎？",
      "followUp": "先辨雲與雨滴，不要求預測天氣。",
      "targetWord": "cloudy"
    },
    {
      "moment": "片後加入感受卡時",
      "title": "天空和體感分開",
      "question": "請找hot，做搧風手勢；如果天空cloudy，也可能覺得hot嗎？",
      "followUp": "hot是片後體感延伸，不用真的走出去曬熱。",
      "targetWord": "hot"
    },
    {
      "moment": "主課sunny段後，換孩子介紹時",
      "title": "介紹晴天線索",
      "question": "請找sunny，指出圖中的陽光，再用一個詞介紹天空。",
      "followUp": "只指圖示不直接看太陽；圖卡與今天實景分開說。",
      "targetWord": "sunny"
    }
  ],
  "instructions": [
    "播放水母暖身前段，先聽口令再舉手臂、靠近手腕，用鬆鬆的手掌模仿水母；動作維持舒服。",
    "回播加入手肘的一段，家長做一遍、孩子做一遍，記住新動作加在前面動作之後；不把天氣詞塞進歌曲原口令。",
    "選兩個已會的動作，讓孩子依自己速度帶家人重複，再交換；膝腳動作可縮小，頭保持自然，不必硬做所有姿勢。",
    "喝水，開啟四張天氣卡，先把雲、雨、陽光和冷熱感受分開看。",
    "播放〈How’s The Weather?〉，cloudy、sunny、rainy各選一段暫停，聽詞找對天空卡；hot不在本首必要歌詞中。",
    "先做cloudy找雲、hot表示感受、sunny找陽光三題，再拿多雲卡練It is cloudy, but I feel hot.，說明這是假想情境。",
    "每名孩子完成三次認識及一次開口，再分享窗外看見什麼與自己冷熱；沒有觀察到就不猜。"
  ]
},
  "w8d1b2": {
  "title": "探索日｜看天氣，幫自己選衣服",
  "sentence": "Adventure 72: I choose a jacket when I feel cold.",
  "videoFocus": "看穿衣歌辨認jacket、shirt，片後依冷熱與活動選擇衣物。",
  "focus": "日常衣物辨認與冷熱選擇。",
  "younger": "找jacket、hat、shirt三張卡，指會穿的位置；家長給覺得冷的情境，孩子選外套或做穿外套手勢並說一詞。",
  "older": "辨認shirt與jacket的內外層，再觀察窗外與自身感受，練I choose a jacket when I feel cold.；說明選帽子的用途，與家人輪流。",
  "caregiverTip": "主課歌詞支持shirt、shoes、jacket，hat是片後選衣延伸。用圖卡或現有一件衣服，不需整套道具；歌曲穿衣不等於天氣預報。I choose a jacket when I feel cold.是孩子將衣物詞用到假想或真實感受，不宣稱歌中唱這句。帽子依遮陽或保暖用途選，上衣可搭外套而非只能二選一。",
  "pausePrompts": [
    {
      "moment": "主課jacket段後",
      "title": "冷的時候選外套",
      "question": "請找jacket，做穿外套手勢；假想覺得冷時你會選它嗎？",
      "followUp": "先確認部位，再練本課句型；不替孩子決定真實感受。",
      "targetWord": "jacket"
    },
    {
      "moment": "片後加入帽子卡時",
      "title": "帽子用在哪裡",
      "question": "請找hat並指戴的位置；如果要遮陽，這頂hat合適嗎？",
      "followUp": "明說帽子是片後加入，依現有圖或實物談用途。",
      "targetWord": "hat"
    },
    {
      "moment": "主課shirt段後，比較衣物時",
      "title": "上衣與外層",
      "question": "請指shirt，和jacket比一比；上衣和外套能一起穿嗎？",
      "followUp": "shirt在內、jacket可在外，是否加外層依情境。",
      "targetWord": "shirt"
    }
  ],
  "instructions": [
    "播放橡實暖身短段，先聽松鼠的歌曲，用空手做拿起、抱好再放下的想像動作，保持原地即可。",
    "回播喜歡的一段，由家長帶收集動作、孩子接放好動作，再交換；不急著加入外套和帽子詞。",
    "停片讓孩子安排收集、放好兩個動作，家人跟做，換下一位帶領；不用橡實或其他小物也能完成。",
    "喝水，打開jacket、hat、shirt、shoes圖卡，預告歌曲先教穿衣，再輪流看冷熱選衣。",
    "播放〈This Is The Way We Get Dressed〉，shirt和jacket段後各停片找卡與做手勢；其他穿衣細節先欣賞。",
    "依jacket、hat、shirt完成三次認識，另看窗外或指定情境，再問冷熱，練I choose a jacket when I feel cold.。",
    "交換觀察者與選衣者，每名孩子自己回答或操作一次；不用萬聖節裝扮，不以穿著完全相同作完成條件。"
  ]
},
  "w8d2b1": {
  "title": "動起來｜聽數字做動作，再排出門順序",
  "sentence": "Adventure 73: One clap, two taps, three steps.",
  "videoFocus": "跟數字歌逐次動作，片後做一次拍手、兩次輕拍與三步，再排出門準備。",
  "focus": "數詞、動作次數與三步生活順序。",
  "younger": "看 one、two、three 圖卡，分別拍手一下、輕拍腿兩下、原地踏三步；每題重數，到指定次數就停，可以先說單字。",
  "older": "聽數字後自己做 one clap、two taps、three steps，分清每段從一開始數，再說本課句子；換自己帶隊，最後依序說看天氣、問冷熱、選衣物。",
  "caregiverTip": "使用 one、two、three、four 圖卡和雙手。雪花暖身保留飄落與指頭、鼻子、手的小動作。主課 Count & Move 逐一唱一到二十，本堂只先做一到三；one clap、two taps、three steps 是片後加入的指令，先分段做，再串起來。最後用看天氣、問冷熱、選衣物三步整理出門準備；這些是生活次序，不把數字當星期的英文，也不要求本課背七天名稱。",
  "pausePrompts": [
    {
      "moment": "主課唱到 one 時暫停，進入第一個動作",
      "title": "一下就收手",
      "question": "請看 one 圖卡，做 one clap。拍完一次就把手放下，你剛才數的是什麼？",
      "followUp": "數的是拍手次數；先讓孩子做，較小孩子只說 one 也可以。",
      "targetWord": "one"
    },
    {
      "moment": "回播數到 two 後，停片換輕拍腿",
      "title": "兩下逐次數",
      "question": "請找 two，再輕拍大腿兩下，每拍一下才數一個數。兩下做完以後要繼續拍嗎？",
      "followUp": "數到two就停，不按節拍一直拍；家長可先示範，正式這一次讓孩子自己做。",
      "targetWord": "two"
    },
    {
      "moment": "回播數到 three 後，換孩子帶隊",
      "title": "三步換你帶",
      "question": "請指 three，帶家人原地踏三步，或坐著交替抬腳三次。做完後，請把看天氣、問冷熱、選衣物排成三步。",
      "followUp": "先完成三次動作，再口頭排準備順序；動作數量和生活步驟是兩個清楚分開的小活動。",
      "targetWord": "three"
    }
  ],
  "instructions": [
    "播放小雪花暖身短段，用手指從上往下慢慢飄，落到頭部時指自己的頭；手保持輕柔，不用跳起來接。",
    "回播鼻子和手的段落，先聽再指出鼻子或張開手掌；家長與孩子交換做雪花落下的引導者。",
    "停片讓每位孩子選頭、鼻子或手，帶家人做一小段飄落動作，再把手放下收束；不需要紙屑或真雪。",
    "喝水，打開 one、two、three、four 圖卡。先逐張點數，再預告聽數字做動作，片後整理三步出門準備。",
    "播放 Count & Move 的一到三短段，先用小動作逐次跟數，再停片；後續到二十的歌段可另聽，不要求跟完才算完成。",
    "片後依one拍手一下、two輕拍大腿兩下、three原地踏三步完成三題。每題先聽數字再自己做，到指定次數便停，接著練One clap, two taps, three steps.。",
    "交換帶隊，每位孩子自己完成三題並開口一次；再用三根手指依序說看天氣、問冷熱、選衣物，連回出門準備。沒有實際做過的孩子不先勾完成。"
  ]
},
  "w8d2b2": {
    "title": "動起來｜天氣不同，穿衣一步一步來",
    "sentence": "Adventure 74: On a rainy day, I put on my raincoat last.",
    "videoFocus": "聽不同天氣邀請遊玩的歌曲，片後依天氣和冷熱選衣物，輪流示範先後穿著。",
    "focus": "天氣情境與片後穿衣順序。",
    "younger": "做rainy手指落雨、cloudy雙手畫雲、hot搧風三題，再選家中現有衣物或用空手模仿，先穿上衣、再加外層；輪到自己時說一個天氣詞。",
    "older": "分清歌中的sunny、rainy、snowy、windy與片後加入的cloudy、hot；挑一個情境，先說選衣理由，再依序示範上衣和適合外層，練On a rainy day, I put on my raincoat last.，並和家人交換。",
    "caregiverTip": "打開本課天氣圖卡，有現成上衣、外套或雨衣就用一件示範，沒有可用空手穿衣動作，不需另外準備服裝。文具暖身練先開口借、等對方遞出再接和說謝謝，用一本家中現有書或想像物品即可。主課唱晴、雨、雪、風；cloudy、hot與穿衣順序是片後延伸。歌曲邀請出門只是故事情境，不用真的遇雨出門；多雲時還要問冷熱才能選外層，雨衣穿在衣服外面，不因唱到雪就要求家裡有冬衣。",
    "pausePrompts": [
      {
        "moment": "主課雨天段落後，準備片後穿衣時",
        "title": "雨衣放在哪一層",
        "question": "請找rainy圖卡，做落雨動作。準備穿上衣和雨衣時，哪一件先穿、哪一件在外面？",
        "followUp": "先用空手示範上衣，再加雨衣；句型的last指這個穿衣示範最後加的外層，不要求還要實際出門。",
        "targetWord": "rainy"
      },
      {
        "moment": "片後第二題加入多雲情境時",
        "title": "先問感覺再選",
        "question": "請找cloudy，雙手做雲的樣子。只有看見雲，就知道一定要穿厚外套嗎？還可以問什麼？",
        "followUp": "引導孩子說冷或熱、看看現有衣物；多雲不直接等於寒冷，這是片後比較而不是歌詞答案。",
        "targetWord": "cloudy"
      },
      {
        "moment": "片後第三題輪到孩子安排時",
        "title": "熱的時候慢慢準備",
        "question": "請指hot，做搧風動作。如果覺得熱，你想選哪件舒服的上衣？請先示範穿上，再說是否還需要外層。",
        "followUp": "家長依實際情境協助選擇，孩子先說理由並做一個穿著動作；不為湊順序而一定加厚外套。",
        "targetWord": "hot"
      }
    ],
    "instructions": [
      "播放文具暖身一個借物段，家長做伸手詢問手勢，孩子等答應後才接想像文具，再說Thank you.。",
      "回播另一段，把借物、遞出、接住、道謝做成輕柔動作；用真書時慢慢傳，不邊跳邊拿物品。",
      "停片交換借用者和提供者，孩子真正先問、等待、再接與道謝；不把天氣詞插成歌曲原有文具名稱。",
      "喝水，打開rainy、cloudy、hot、sunny圖卡，先看天氣與感受，再把片後要用的衣物放在手邊；沒有實物就預告用動作示範。",
      "播放晴天主課短段，聽晴、雨、雪、風依序邀請遊玩；雨天段停一下做雨滴手勢，確認歌中情境，cloudy和hot留待片後。",
      "片後完成rainy落雨、cloudy畫雲、hot搧風三題。選雨天情境先做穿上衣、再加雨衣的動作，說On a rainy day, I put on my raincoat last.；改成覺得熱的情境時討論可不加外層。",
      "家人交換選情境與示範的人，每位孩子實際輪到一次說理由或穿衣動作；較大孩子說先後與完整句，較小孩子說天氣詞即可。記錄三題跟做和真實輪流，不以穿完一整套衣服才算。"
    ]
  },
  "w8d3b1": {
    "title": "配對日｜衣物穿在哪裡",
    "sentence": "Adventure 75: My shoes go on my feet.",
    "videoFocus": "聽穿衣歌中的衣物指令，將鞋、外套、帽子配到身體位置，再依需要選穿著。",
    "focus": "衣物與身體位置配對。",
    "younger": "完成shoes配腳、jacket配上身、hat配頭三題，先找本課圖卡再指自己相應位置；主動說一個衣物詞或句尾feet。",
    "older": "說出shoes、jacket、hat各穿在哪裡，練My shoes go on my feet.；片後將shirt和jacket比較內外層，再依實際冷熱選擇，不只跟著歌曲全部穿上。",
    "caregiverTip": "打開本課衣物圖卡，有現成鞋或外套可拿來看，沒有就指身體位置；不用把整套衣物找齊。早安暖身先揮手問候，再用手臂表現太陽升起、樹木輕搖，歌曲景象不代表眼前一定晴天。主課有鞋、外套、圍巾與帽子，shirt是片後比較。歌裡催快只當節奏，讓孩子坐穩慢慢模仿穿鞋；真正穿衣時內層先穿，外層依需要加，不把歌詞列舉順序當唯一規則。",
    "pausePrompts": [
      {
        "moment": "主課鞋子段後",
        "title": "鞋子找對位置",
        "question": "請找shoes圖卡，再指自己雙腳。鞋子和帽子應該放在同一個身體位置嗎？",
        "followUp": "用位置作配對規則；先讓孩子指出，再示範My shoes go on my feet.。",
        "targetWord": "shoes"
      },
      {
        "moment": "主課外套段後",
        "title": "外套在上身",
        "question": "請找jacket，做手伸進袖子的動作。片後看shirt，外套通常在上衣裡面還是外面？",
        "followUp": "shirt是片後延伸，不要求歌裡出現；有實物可看袖口與內外層。",
        "targetWord": "jacket"
      },
      {
        "moment": "主課帽子段後，換孩子提問時",
        "title": "帽子配到頭",
        "question": "請指hat，再請家人把手放在帽子會戴的位置。家人故意指腳時，你能說或指哪裡需要改嗎？",
        "followUp": "孩子真的給一次提示，家長再改正；不把帽子顏色當配對條件。",
        "targetWord": "hat"
      }
    ],
    "instructions": [
      "播放早安暖身短段，向家人揮手說Good morning，用手臂從低到高表示太陽升起。",
      "回播樹木與花朵段，做小幅搖手和張開手掌動作，孩子選一個帶家人做；不用跑跳。",
      "停片交換帶領者，每位孩子向家人問候，再選一個自然景象手勢收束；不是早上也可說正在練歌曲問候。",
      "喝水，打開shoes、jacket、hat、shirt圖卡，先看衣物樣子，再指出頭、上身和腳三個位置。",
      "播放穿衣主課短段，鞋、外套或帽子段各選一處停片，先聽衣物詞再做穿戴手勢；圍巾可聽懂，不要求另外拿實物。",
      "完成shoes配腳、jacket配上身、hat配頭三題分類，每題孩子自己找卡並指身體；再練My shoes go on my feet.，比較shirt和jacket的內外層。",
      "交換出題與回答，每位孩子都完成三題並開口；家長只在需要時提示位置，再讓孩子自行修正，不趕穿衣速度。"
    ]
  },
  "w8d3b2": {
  "title": "配對日｜一週天氣分堆數",
  "sentence": "Adventure 76: We counted three sunny days.",
  "videoFocus": "從天氣歌辨認三種天空，再把假想一週分堆點數。",
  "focus": "天氣類別與假想七天資料統計。",
  "younger": "先將hot分到冷熱感受、sunny和rainy分到天空天氣三題；再幫家長把代表晴天的三個大積木一件一數，說sunny或three。",
  "older": "用三個晴天、兩個雨天、兩個多雲日組成假想一週，逐堆點數、比較哪類較多，核對合計七天，練We counted three sunny days.；hot另問感受，不加入三類總天數。",
  "caregiverTip": "用七個大積木或畫七個記號：三晴、兩雨、兩多雲，明說是練習資料。歌曲直接教sunny、rainy、cloudy，不教統計；hot是片後比較的冷熱感受，不另算一天。每個記號只指定一個天空類別，這是簡化模型，不代表真實一天只能有一種天氣。",
  "pausePrompts": [
    {
      "moment": "主課後，先分天空與感受時",
      "title": "熱不另算一天",
      "question": "請找hot，它描述冷熱還是天空？能把hot另加到七天總數嗎？",
      "followUp": "hot可和任一天的天空同時成立，所以不多算一天。",
      "targetWord": "hot"
    },
    {
      "moment": "主課sunny段後，點數假想晴天堆時",
      "title": "每個記號算一天",
      "question": "請指sunny，把三個晴天積木一件一數，最後有幾天？",
      "followUp": "接We counted three sunny days.，先說這是假想的一週。",
      "targetWord": "sunny"
    },
    {
      "moment": "主課rainy段後，點數第二堆時",
      "title": "兩堆比較",
      "question": "請找rainy，數兩個雨天記號；比sunny那堆多還是少？",
      "followUp": "較大孩子再數cloudy兩個，核對總共七天。",
      "targetWord": "rainy"
    }
  ],
  "instructions": [
    "播放木偶S-A-N-T-A暖身短段，先聽字母名稱，輕拍節奏，手指做帽子與鬍子手勢認識歌中角色。",
    "回播第一個字母用拍手代替的段落，跟著拍一下再唱其餘字母；熟悉後可試兩下，不要求整首一次背完。",
    "停片讓孩子選拍一下或兩下帶家人做，再回到正常說字母；節慶歌曲不代表今天就是聖誕節。",
    "喝水，準備七個大積木與天氣卡，先說這次用三晴、兩雨、兩多雲的假想一週。",
    "播放〈How’s The Weather?〉，sunny、rainy、cloudy後各停片辨認類別，再用三張卡作分類標記。",
    "做hot分感受、sunny與rainy分天空三題；將七個記號放入指定三堆，逐堆點數，練We counted three sunny days.。",
    "交換分類者與點數者，每位孩子真實分類並點數或比較一次；核對七天，hot不新增一堆天數。"
  ]
},
  "w8d4b1": {
  "title": "小老師｜你問位置，我找衣物",
  "sentence": "Adventure 77: Can you find your hat and shoes?",
  "videoFocus": "聽穿衣歌的hat、shoes，再用位置提示請家人找兩件衣物。",
  "focus": "衣物問答、兩個目標提取與輪流教學。",
  "younger": "家長分別問頭上、上身、腳上穿什麼，孩子從hat、shirt、shoes圖卡回答三題，再選一題指位置給家人猜，說一個衣物詞即可。",
  "older": "用頭、上身、腳的線索分別問hat、shirt、shoes；練Can you find your hat and shoes?，家人找齊兩張再由孩子核對。",
  "caregiverTip": "主課有shoes、jacket、hat，shirt另用圖卡補充內層上衣；不再用boots或coat代替本課詞。歌裡催快只是節奏，坐穩慢慢模仿。Can you find your hat and shoes?是片後問句，孩子可先問一樣再找兩樣，家長等問完才答。",
  "pausePrompts": [
    {
      "moment": "主課hat段後",
      "title": "你問家人答",
      "question": "請選hat，先用戴的位置提示家人，等他回答後再核對。",
      "followUp": "年幼可指頭出題，家長不要先念答案。",
      "targetWord": "hat"
    },
    {
      "moment": "片後加入shirt時",
      "title": "上身的另一件衣物",
      "question": "請找shirt，它穿在哪裡？需要jacket時，shirt在裡面還是外面？",
      "followUp": "shirt為片後圖卡比較，不宣稱歌中唱到。",
      "targetWord": "shirt"
    },
    {
      "moment": "主課shoes段後，組合兩樣時",
      "title": "一次找兩樣",
      "question": "請找shoes，再問Can you find your hat and shoes?，核對家人是否找到兩樣。",
      "followUp": "需要時分兩步提示，但由孩子判斷有沒有漏。",
      "targetWord": "shoes"
    }
  ],
  "instructions": [
    "播放泡泡暖身開頭，先用空手做吹泡泡手勢，再隨數字輕戳想像泡泡。",
    "回播數到十後停止的一段，先聽再做，孩子能數多少就跟多少；聽到Stop把手收好。",
    "停片換孩子帶吹、戳、停三個小動作，家人跟他的速度，不在室內追跑真的泡泡。",
    "喝水，開啟四張衣物卡，孩子先選頭、上身、腳其中一個位置當出題線索。",
    "播放〈Put On Your Shoes〉，hat、shoes段各停一次找卡與做穿戴手勢，jacket可用來比較上身。",
    "片後做hat、shirt、shoes三題問答，再練Can you find your hat and shoes?；一人提問、一人找兩張，再核對是否漏掉。",
    "每名孩子回答三題並主動開口，交換提問者與回答者；答錯給位置提示再試，不趕穿戴速度。"
  ]
},
  "w8d4b2": {
  "title": "小老師｜七天排好，輪流報天氣",
  "sentence": "Adventure 78: We have two sunny days and three rainy days.",
  "videoFocus": "先跟星期歌排列一週，再以假想七日資料練數量問答與輪流天氣播報。",
  "focus": "星期順序、數量與假想天氣播報。",
  "younger": "用本課two、three、four圖卡回答兩個晴天、三個雨天和先看四天的三題，逐件點數；播報時可說數字或一個天氣詞，家長接說完整意思。",
  "older": "把假想七天依晴、晴、雨、雨、雨、雲、雲排好，依序回答two晴天、three雨天、four前四天；說We have two sunny days and three rainy days.，再補兩天多雲，共七天，交換播報。",
  "caregiverTip": "準備七個大積木排一列，前兩個代表晴天、接三個雨天、最後兩個多雲，邊排邊口頭指明，數字用本課圖卡。這是假想一週，不是今天的預報或實際觀測。友情暖身可揮手、輕搖或輪流指自己與家人，不必牽手才算參與。木偶星期歌唱七天名稱，two、three、four是片後數量，不是星期名稱；four數的是整列前四個日子，不另加成第四種天氣。",
  "pausePrompts": [
    {
      "moment": "星期歌短段後，片後看整列資料時",
      "title": "先報兩個晴天",
      "question": "請找two圖卡，再點數最前面代表晴天的積木。這個two是在說星期二，還是在說晴天有兩天？",
      "followUp": "明確數的是兩個日子，不把英文數字two直接當Tuesday。",
      "targetWord": "two"
    },
    {
      "moment": "片後第二題輪到另一位播報時",
      "title": "三個雨天在哪裡",
      "question": "請指three，再找中間三個雨天積木。逐件點數後，告訴家人這一週練習資料有幾個雨天。",
      "followUp": "等待孩子數完，不把家長說的答案當孩子已會；資料是練習，不是實際本週。",
      "targetWord": "three"
    },
    {
      "moment": "片後第三題只看部分日子時",
      "title": "先看四天",
      "question": "請找four，只數整列最前面四個日子，再指哪兩個晴、哪兩個雨。後面還有幾個日子沒有播報？",
      "followUp": "four是前四天這個子集合，不是一堆另外的天氣；較大孩子確認四天加剩下三天仍是七天。",
      "targetWord": "four"
    }
  ],
  "instructions": [
    "播放友情暖身短段，指自己再向家人揮手，說friend或用笑臉表示問候。",
    "回播朋友一起的句子，輕搖身體或拍手，由孩子選舒服的動作，家人跟做。",
    "停片輪流把一個動作教給家人，再說謝謝對方一起做；不要求每個人都牽手。",
    "喝水，打開two、three、four、one圖卡，擺七個積木按晴晴雨雨雨雲雲順序，說清楚是今天用來練習的假想資料。",
    "播放木偶星期歌短段，從Sunday依序聽到Saturday；家長逐一指七個位置，讓孩子跟說熟悉的名稱，不強迫背完。",
    "片後完成two數晴天兩個、three數雨天三個、four數前四天三題問答；每題先找數字卡，再逐件指資料，不只背數字。",
    "輪流扮播報員與聽眾，說We have two sunny days and three rainy days.，較大孩子補上兩個多雲核對七天，較小孩子說數字或指資料；每位孩子實際輪到一次再記錄。"
  ]
},
  "w8d5b1": {
  "title": "本週闖關｜說天氣，也說自己的感受",
  "sentence": "Adventure 79: I like sunny days, even when it is not hot.",
  "videoFocus": "從熟悉天氣歌回想cloudy、sunny、rainy，再談hot與個人喜好。",
  "focus": "本週天空詞提取、體感與喜好。",
  "younger": "完成cloudy找雲、hot做熱的動作、sunny指陽光三題，選一張喜歡的天氣卡告訴家人，主動說一個詞即可。",
  "older": "不看提示先辨cloudy與sunny，另說hot是感受，練I like sunny days, even when it is not hot.；用自己喜好補一句，不以季節猜天氣。",
  "caregiverTip": "先看圖卡回想，再以天氣歌核對cloudy、sunny、rainy。hot由片後分享感受帶入，sunny不等於一定hot。I like sunny days, even when it is not hot.是句型練習，孩子可另說真實喜好；喜歡雨天也不判錯。本堂不再用四季景象推定當天天氣。",
  "pausePrompts": [
    {
      "moment": "播放前找卡，主課cloudy段後核對",
      "title": "記得雲的線索嗎",
      "question": "先找cloudy，回看片段後核對雲的線索，你想改答案嗎？",
      "followUp": "提示後可重新選，記孩子自己的回應。",
      "targetWord": "cloudy"
    },
    {
      "moment": "片後比較體感時",
      "title": "有陽光不一定熱",
      "question": "請指hot；看到sunny圖卡，就能確定自己一定覺得hot嗎？",
      "followUp": "分享hot或not hot都可以，兩種描述分開。",
      "targetWord": "hot"
    },
    {
      "moment": "主課sunny段後，輪流分享喜好時",
      "title": "晴天喜歡做什麼",
      "question": "請找sunny，說你是否喜歡晴天；沒有很熱時，也可以喜歡sunny嗎？",
      "followUp": "示範本課句型，接受不同真實喜好。",
      "targetWord": "sunny"
    }
  ],
  "instructions": [
    "播放收拾暖身短段，孩子選身旁一件玩具或書，慢慢拿起放回原位，家長同步示範另一件。",
    "回播收拾提示，交換負責的位置，再把一件物品歸位；不必先把房間弄亂才有活動可做。",
    "停片，孩子帶家長檢查是否還有東西沒放好，完成一個小範圍便收束。",
    "喝水，準備天氣卡；先請孩子選一張自己記得的，不急著播放答案。",
    "播放〈How’s The Weather?〉短段核對cloudy、sunny、rainy，熟悉的詞可先猜後看。",
    "關片做cloudy辨雲、hot說感受、sunny談喜好三站，練I like sunny days, even when it is not hot.；長句可分段說。",
    "每名孩子完成三次複習與一次開口，再分享自己喜歡的天氣；不以喜好或答題速度評分。"
  ]
},
  "w8d5b2": {
    "title": "本週闖關｜想好天氣再打包",
    "sentence": "Adventure 80: I pack my shirt, jacket, and hat for the trip.",
    "videoFocus": "跟穿衣歌辨認動作和內外層，片後依假想旅行情境挑衣物、輪流打包並核對用途。",
    "focus": "穿衣動作與旅行打包複習。",
    "younger": "從本課圖卡完成jacket外套、hat帽子、shirt上衣三題，指出會穿的位置；再選一件現有衣物交給家人或做放進袋子的動作，說單字即可。",
    "older": "依家長說的旅行情境選shirt、jacket、hat並解釋用途，練I pack my shirt, jacket, and hat for the trip.；先分清打包清單和穿衣順序，真正穿著是上衣在內、外套在外，再輪流核對有沒有漏。",
    "caregiverTip": "用本課圖卡和家中一個袋子即可，有現成上衣或外套可放入，沒有就做拿取與打包手勢，不需行李箱或新衣。分享暖身用兩個大玩具或空手輪流給與收，不用真的分糖或吃糖。主課從上衣、褲子到扣鈕、襪子、鞋與外套等穿衣動作，hat是片後打包延伸。句型列的是要帶的物品，不是規定穿衣順序；打包依假想目的地與活動，衣物放進袋子的先後也不等於穿在身上的內外層。",
    "pausePrompts": [
      {
        "moment": "主課外套動作後，片後檢查行李時",
        "title": "外套為什麼要帶",
        "question": "請找jacket，說它穿在上衣的裡面還是外面。假想旅行早晚覺得冷，你會不會把它帶上？",
        "followUp": "先說用途再選，不把每趟旅行都固定要求厚外套；家長依情境調整。",
        "targetWord": "jacket"
      },
      {
        "moment": "片後第二題加入帽子時",
        "title": "帽子是片後清單",
        "question": "請指hat，示範戴的位置。若要到戶外且需要遮陽，你會挑哪一頂？現在把它加入想像行李。",
        "followUp": "帽子是這次打包延伸，不要求在穿衣歌找到hat；看用途，不只選顏色。",
        "targetWord": "hat"
      },
      {
        "moment": "片後第三題檢查內層上衣時",
        "title": "上衣沒有漏掉",
        "question": "請找shirt。若只帶外套卻忘了上衣，準備好了嗎？先說上衣用途，再讓家人核對清單。",
        "followUp": "上衣是內層，打包拿取順序可不同；較大孩子說shirt before jacket是在穿著時，不與裝袋順序混淆。",
        "targetWord": "shirt"
      }
    ],
    "instructions": [
      "播放分享暖身前段，用一個想像物品給對方、另一個留自己，跟說one for you、one for me。",
      "回播遞出與道謝段，家長給、孩子接，再交換；用真玩具時一件一件傳，不要求真的分糖。",
      "停片讓每位孩子實際輪到給與收，簡單說Here you are或Thank you，再收好玩具準備衣物。",
      "喝水，打開jacket、hat、shirt、shoes圖卡，放一個現有袋子；家長給一個白天戶外、早晚較涼的假想旅行情境。",
      "播放穿衣主課短段，先跟上衣、扣鈕或拉外套的動作，停片確認衣物內外層；鞋帶可做手勢，不因不會綁鞋帶就不能參與。",
      "片後用jacket用途、hat位置、shirt內層做三題複習，再按假想情境選物放袋或做打包手勢，說I pack my shirt, jacket, and hat for the trip.。",
      "交換打包者與核對者，每位孩子實際回答或拿取一次，確認沒有漏上衣和合適外層；打包順序可不同，穿著時先內層再外層，最後再記錄真實完成。"
    ]
  }
};

const ninthWeekReviewedGuidance: Record<string, ReviewedTeachingGuidance> = {
  "w9d1b1": {
  "title": "探索日｜床、桌、椅在哪裡",
  "sentence": "Adventure 81: My bed is where I rest at home.",
  "videoFocus": "聽貓咪在床、桌子、椅子附近的位置，做家具探索。",
  "focus": "聽貓咪在床、桌子、椅子附近的位置，做家具探索。",
  "younger": "先找 home 圖卡，用雙手做屋頂表示住處；再找 bed 做休息手勢、找 table 指出可放教材的位置。三題分開做，說一個詞即可；chair 留作完成後的額外比較。",
  "older": "依 home、bed、table 三題分清整個住處與其中的家具，說 My bed is where I rest at home.；完成後可將玩具卡放在家具卡旁，延伸練 on the bed、under the table、next to the chair。",
  "caregiverTip": "準備本課 home、bed、table 圖卡及一張玩具卡；chair 可留作額外比較。主課以床、桌、椅的位置語作指認，停片後先用 home 表示整個住處，再辨認 bed 的休息用途與 table 的教材擺放用途，完成 home、bed、table 三次認識。位置配對是完成後的延伸，只在桌面或地墊上的圖卡操作，不鑽桌下、不爬床椅、不搬家具。",
  "pausePrompts": [
    {
      "moment": "主課家具段後，停片看住處與家具圖卡",
      "title": "整個住處和一件家具",
      "question": "請找 home：它表示我們生活的住處，還是只指一張床？用雙手做屋頂，再指出家中的床可以在哪裡。",
      "followUp": "home 是片後加入的住處概念，歌曲中的 house 也不能直接當作逐字唱出 home；孩子指卡或說 home 即可。",
      "targetWord": "home"
    },
    {
      "targetWord": "bed",
      "moment": "唱到bed後",
      "title": "床讓我們做什麼？找bed",
      "question": "床讓我們做什麼？請找bed，再做休息手勢。",
      "followUp": "指卡即可，片後再把床放回home的住處情境。"
    },
    {
      "targetWord": "table",
      "moment": "唱到table後",
      "title": "找table",
      "question": "請找table，哪裡可以放今天的教材？",
      "followUp": "指桌面或圖卡，不搬家具。"
    }
  ],
  "instructions": [
    "播放小鳥暖身開頭，先安靜聽，再側耳做聽鳥鳴的動作，向想像的小鳥問候。",
    "回播鳥鳴旋律短段，用手掌輕拍翅膀或跟一小段鳥叫，由孩子挑想做的動作。",
    "停片交換帶領者，孩子示範聽、抬頭和輕拍翅膀，家人跟做；活動不是早上也可以練清晨情境。",
    "依 home、bed、table、chair 排圖卡，先分清 home 是住處概念，三件家具是物品。",
    "播放〈Where Is The Cat?〉；依歌詞的 under the table、on the bed、next to the chair 停片指認。",
    "home、bed、table依序指認：雙手做屋頂表示home，再找bed與table；練My bed is where I rest at home.，說明床是家裡休息的地方。",
    "每名孩子完成home、bed、table三次認識，另說一個詞或本課句型；chair可加作第四張比較。"
  ]
},
  "w9d1b2": {
  "title": "探索日｜找出床桌椅，玩具放回家",
  "sentence": "Adventure 82: We put our toys away before bedtime.",
  "videoFocus": "在找貓歌裡辨認bed、table、chair，再整理活動空間。",
  "focus": "家具辨認與玩具歸位。",
  "younger": "完成bed、table、chair三張圖卡指認，說一個詞；再把一件玩具從桌邊或座位收回原位，自己輪到一次才算參與。",
  "older": "指出bed、table、chair的用途，練We put our toys away before bedtime.；輪流當整理者與核對者，保留桌面和座位的使用空間。",
  "caregiverTip": "〈Where Is The Cat?〉歌詞有table、bed、chair，依實際唱到的段落暫停指卡；home用於片後統整家的場景。沿用兩件現有玩具和原本收納位置，最後三分鐘真的收好。只用手指或圖卡找位置，不鑽家具、不搬椅子，也不用到每個房間。",
  "pausePrompts": [
    {
      "moment": "主課唱到bed後",
      "title": "找到床",
      "question": "請找bed圖卡，說說bed讓我們做什麼？",
      "followUp": "先指床再做休息手勢；睡前收玩具是接下來的生活延伸。",
      "targetWord": "bed"
    },
    {
      "moment": "主課唱到table後",
      "title": "桌子是哪一張",
      "question": "請指table，再指我們放教材的桌面。",
      "followUp": "沒有桌子就指卡，觀察一件玩具收好後能空出哪個位置。",
      "targetWord": "table"
    },
    {
      "moment": "主課唱到chair後",
      "title": "椅子留給坐的人",
      "question": "請找chair；如果玩具占著chair，坐下前可以先做什麼？",
      "followUp": "片後把一件玩具放回原位；不搬家具，也不把家長代收算孩子完成。",
      "targetWord": "chair"
    }
  ],
  "instructions": [
    "播放Jack和Jill暖身前段，兩根手指沿空中小坡慢慢往上走，另一手做提空水桶的手勢。",
    "回播結尾小心帶水下來的段落，手指慢慢往下；故事跌倒只用口頭說明，不讓孩子照做。",
    "停片換孩子帶上、下、慢慢走三個手勢，家人跟他的節奏，收束在穩穩放下想像水桶。",
    "喝水，打開bed、table、chair、home圖卡，指出兩件玩具及原本收納位置；預告先找家具再真的收好。",
    "播放〈Where Is The Cat?〉，唱到table、bed、chair時各停下指卡；觀看第二段才能聽到bed和chair，不以一次連續看完為目標。",
    "回想床、桌、椅各有什麼用途，練We put our toys away before bedtime.；孩子選一件玩具，說或指它要放回的位置。",
    "完成bed、table、chair三次指認，最後三分鐘輪流把兩件玩具歸位，一人收一人核對再交換；每名孩子自己參與後才記錄。"
  ]
},
  "w9d2b1": {
    "title": "動起來｜走進想像的薑餅屋",
    "sentence": "Adventure 83: There is a table and a chair in my home.",
    "videoFocus": "聽薑餅屋歌辨認桌椅與家中物品，用動作演出用途，再比較想像房屋和自己的家。",
    "focus": "家中物品用途與想像遊戲。",
    "younger": "完成table手掌放平、chair坐姿手勢、home雙手表示家的三題跟做，說一個家具詞；不用真的搭房子或吃薑餅。",
    "older": "找歌中的table和chairs，說桌椅各怎麼使用，練There is a table and a chair in my home.；片後介紹自己的家，分清家具和整個住處。",
    "caregiverTip": "本課圖卡加一個現有玩具即可，無需餅乾、烘焙或印製屋子。農夫暖身照擠奶、餵豬、收蛋、播種、摘玉米等片段選兩個空手動作。薑餅屋主課有table、chairs與bed等物品，房子用house描述；home用於片後說自己的家。薑餅材質是想像遊戲，不代表真的家具可吃；桌面用手掌、坐椅用手勢表現，不站上家具。",
    "pausePrompts": [
      {
        "moment": "主課桌子段後",
        "title": "桌子可以做什麼",
        "question": "請找table圖卡，手掌放平像桌面。你可以在桌邊做哪個活動？用另一手演放書或放玩具。",
        "followUp": "先看物品用途，不要求做成薑餅或和影片桌子一樣；家長等孩子選動作。",
        "targetWord": "table"
      },
      {
        "moment": "主課椅子段後",
        "title": "椅子和桌子用途一樣嗎",
        "question": "請指chair，再做坐穩的手勢。桌子用來放東西，椅子主要幫我們做什麼？",
        "followUp": "歌裡chairs是複數，單張圖卡chair表示一張；動作用雙手示意，不攀爬或站椅子。",
        "targetWord": "chair"
      },
      {
        "moment": "片後第三題介紹自己的家時",
        "title": "房屋可以成為家",
        "question": "請找home，用手勢表示自己的家。影片唱的是想像的house，你家的桌椅也是薑餅做的嗎？",
        "followUp": "home是生活的家，house常指房屋；可住公寓，不必有獨棟屋。孩子說出自己的家具即可。",
        "targetWord": "home"
      }
    ],
    "instructions": [
      "播放農夫暖身一小段，先用雙手模仿擠奶，再伸手表示餵豬，跟著節奏慢慢做。",
      "回播收蛋、播種或摘玉米段，孩子選兩個動作，家人先看再跟做。",
      "停片交換農夫角色，輪流示範一個工作動作，其他人猜在做什麼，再把手收好。",
      "喝水，打開table、chair、home、bed圖卡，預告要走進想像的薑餅屋，不用準備食物或搬動家具。",
      "播放薑餅屋主課桌椅短段，聽到table或chairs就停片指卡，看到床也可指bed；其他屋內詞先聽熟，不要求一次全背。",
      "完成table平掌放物、chair坐姿手勢、home表示家三題跟做，再練There is a table and a chair in my home.；用現有玩具演坐椅或在桌邊活動。",
      "輪流介紹自己的家中物品，每位孩子完成三題並開口；比較想像薑餅屋與真實住處，把玩具收回原位。"
    ]
  },
  "w9d2b2": {
  "title": "動起來｜找藏物，再看家具形狀",
  "sentence": "Adventure 84: We look at the shape and check our answer.",
  "videoFocus": "跟找貓歌辨別位置，片後用玩具與家中物品練位置問答，觀察家具表面的形狀。",
  "focus": "位置聽辨與片後家具形狀比較。",
  "younger": "完成where-is-it左右找、yes點頭、no搖頭三題跟做，再指桌面或書封面的一個形狀；不用爬到桌下找玩具。",
  "older": "用where-is-it問位置，再看實際物品判斷yes或no；比較桌面、椅面或書封面大致像圓形或長方形，練We look at the shape and check our answer.，先觀察再核對。",
  "caregiverTip": "準備一個玩具與一本書，在桌邊或地上空位操作即可。床上倒數暖身用手輪轉與手指少一個表示，依這支片段實際起始數量數，不因歌名有Ten就強行從十開始；不模仿跌落。找貓主課練on、in、under等位置，家具形狀是片後實作。看桌面、椅面或書封面的大致輪廓，不把整件立體家具叫成一個平面形狀；家中桌面可能是圓形，也可能是長方形，依眼前實物回答。",
  "pausePrompts": [
    {
      "moment": "找貓主課第一個位置問句後",
      "title": "先問藏在哪裡",
      "question": "請用where-is-it問玩具在哪裡，手放額前做尋找動作，再指家長放好的玩具是在書上還是書旁。",
      "followUp": "歌裡問貓的位置；片後以玩具延伸，不說where-is-it是一件家具或形狀。",
      "targetWord": "where-is-it"
    },
    {
      "moment": "片後看實際表面輪廓時",
      "title": "看見相同才說是",
      "question": "家長先依眼前書封面說一個正確描述，例如大致像長方形。你看過後能點頭說yes，並沿邊緣指一圈嗎？",
      "followUp": "先由家長核對描述確實符合物品，再讓孩子判斷；不只要求照口令點頭。",
      "targetWord": "yes"
    },
    {
      "moment": "片後第三題換一個不相符描述時",
      "title": "不相同可以改答案",
      "question": "家長換一個與眼前書封面不相符的描述。你能搖頭說no，再指出實際輪廓嗎？接著看桌面是不是同樣形狀。",
      "followUp": "若桌面形狀不同就直接說不同，沒有一定答案；較大孩子比較曲線、直邊與轉角，不搬家具找底面。",
      "targetWord": "no"
    }
  ],
  "instructions": [
    "播放床上倒數暖身短段，用雙手輕輕輪轉表示翻身，留意這支片段先有幾個，不只看歌名猜十個。",
    "回播每次少一個的段落，收起一根手指，停片一起數剩下幾個；較小孩子只練三變二也可以。",
    "停片輪流帶輪轉與停住，家人跟做，動作都留在手上，不擠床或模仿掉下來。",
    "喝水，打開where-is-it、yes、no、what-is-it圖卡，拿一個玩具和一本書，先看安全可及的桌面或地上空位。",
    "播放找貓主課短段，聽到位置問句就停片，先讓孩子指再回播核對；選under或next to等一兩個位置，不要求背完全部介系詞。",
    "片後做where-is-it尋找手勢、yes看相符描述點頭、no看不相符描述搖頭三題跟做；沿書封面或桌面的輪廓指一圈，比較大致形狀，再練We look at the shape and check our answer.。",
    "輪流當藏玩具者與提問者，把玩具放在書上或旁邊並說位置，再比較桌面和書封面是否同形；每位孩子自己觀察、回答或指認一次後記錄，不把跟著點頭當作已理解。"
  ]
},
  "w9d3b1": {
  "title": "配對日｜家具和位置配對",
  "sentence": "Adventure 85: At home, we keep the table ready for activities.",
  "videoFocus": "聽位置線索，把貓咪卡配到床、桌子或椅子。",
  "focus": "聽位置線索，把貓咪卡配到床、桌子或椅子。",
  "younger": "先把 home 指到代表整個住處的一組，再把 bed、table 指到家具的一組；接著用休息手勢對應 bed、指放教材的位置對應 table。三張卡各自己選一次，可指認或說一個詞。",
  "older": "說明 home 是整個住處，bed、table 是其中的家具；再把 bed 配到休息用途、table 配到桌面活動用途，完成三題並說一個理由。練 At home, we keep the table ready for activities.，整理自己的一小塊教材位置；位置語配對留作額外延伸。",
  "caregiverTip": "準備本課 home、bed、table 圖卡，用兩個桌面區域區分整個住處與家具；家具再依休息、桌面活動的用途比較。主課的 on the bed、under the table、next to the chair 可用玩具卡示範，但本堂三題仍是 home、bed、table 的住處與用途分類。讓孩子自己選卡、指用途或說理由，再收好自己的一件教材；只在桌面或地墊操作，不搬家具、不鑽桌下、不爬床椅。",
  "pausePrompts": [
    {
      "moment": "主課床、桌、椅段後，停片分類圖卡",
      "title": "住處包含哪些家具",
      "question": "請把 home 留在代表整個住處的一組，再把 bed 和 table 放到家具的一組。home 為什麼不是只指其中一張桌子？",
      "followUp": "這是片後分類：home 表示住處，家具依用途再配對；可用屋頂手勢或指卡回答，不要求歌裡有 home。",
      "targetWord": "home"
    },
    {
      "targetWord": "bed",
      "moment": "唱到bed後",
      "title": "把bed配到休息用途",
      "question": "請把bed配到休息用途，是哪一組？",
      "followUp": "讓孩子說一個理由或做休息手勢。"
    },
    {
      "targetWord": "table",
      "moment": "唱到table後",
      "title": "table可以配到活動用途嗎？指一個適合放教材的位置。",
      "question": "table可以配到活動用途嗎？請指一個適合放教材的位置。",
      "followUp": "可先指卡，片後再收好桌面一件物品。"
    }
  ],
  "instructions": [
    "播放屋頂節慶暖身短段，用手指往上看屋頂、往下表示故事角色來訪，不攀爬家具。",
    "回播遞送禮物或重複節奏處，用雙手遞出想像禮物，孩子選拍手或輕踏原地跟拍。",
    "停片輪流帶往上、往下、遞禮物三個手勢，將動作縮小收束；節慶故事不代表今天正在過節。",
    "依 home、bed、table、chair 排卡；保留住處和家具用途的既有分類規則。",
    "播放〈Where Is The Cat?〉；遇到 under the table、on the bed、next to the chair 時停下做位置配對。",
    "把home留作整個住處，再將bed、table卡配到休息與活動用途；練At home, we keep the table ready for activities.，實際清出桌面一小塊位置。",
    "完成home、bed、table三次分類，每人指或說一個理由；只整理自己的教材，不移動家具。"
  ]
},
  "w9d3b2": {
  "title": "配對日｜家具名字和位置拍一拍",
  "sentence": "Adventure 86: We say the words softly before bedtime.",
  "videoFocus": "邊聽家具位置、邊找圖卡，再做中文名稱拍點。",
  "focus": "邊聽家具位置、邊找圖卡，再做中文名稱拍點。",
  "younger": "聽到 bed、table、chair 時指卡，再做中文名稱拍點。",
  "older": "先辨認bed、table、chair，再分別輕拍中文床、桌子、椅子的字數；英文自然說，不用中文字數拆音。",
  "caregiverTip": "先把 bed、table、chair 圖卡和一張玩具卡放在桌面或地墊上。唱到位置語時，孩子把玩具卡放到正確位置；只在圖卡上操作，不鑽桌下、不爬床或椅子。",
  "pausePrompts": [
    {
      "targetWord": "bed",
      "moment": "唱到bed後",
      "title": "找bed",
      "question": "請找bed，再口說中文床；中文名稱拍幾下？",
      "followUp": "床一拍，英文bed自然說，這是片後中文聲音活動。"
    },
    {
      "targetWord": "table",
      "moment": "唱到table後",
      "title": "找table",
      "question": "請找table，再跟說桌子，中文兩個字可以怎麼輕拍？",
      "followUp": "桌、子兩拍，不把table按中文字數拆音。"
    },
    {
      "targetWord": "chair",
      "moment": "唱到chair後",
      "title": "找chair",
      "question": "請找chair，再輕拍椅子的中文名稱，和床有什麼不同？",
      "followUp": "一拍和兩拍比較，不把聲音長短當英文音節數。"
    }
  ],
  "instructions": [
    "播放猜物暖身短段，聽What’s this?或What’s that?時，先用手指一個近處或遠處的想像物品。",
    "回播一個問句與答案，孩子指剛出現的物品或模仿一個簡單動作，家長等待答案再跟說。",
    "停片用本課圖卡輪流問這是什麼，孩子指卡或說詞；逐漸改用小聲和慢拍，不加入家具敲擊聲。",
    "依 bed、table、chair、home 排卡；保留中文「床、桌子、椅子」拍點規則，先說明那是片後活動。",
    "播放〈Where Is The Cat?〉；只依 bed、table、chair 的實際歌詞停片找卡。",
    "片後口說床、桌子、椅子，依中文名稱分別輕拍一、二、二拍，再自然說bed、table、chair；練We say the words softly before bedtime.，英文字不照中文字數拆音。",
    "每名孩子完成bed、table、chair三次聲音配對，再輪流當說詞者或拍點者；普通小聲即可，不必耳語。"
  ]
},
  "w9d4b1": {
  "title": "小老師｜你說位置，我找家具",
  "sentence": "Adventure 87: Please sit on the chair when we read at the table.",
  "videoFocus": "孩子輪流問貓咪在哪裡，家人依床、桌子、椅子回答。",
  "focus": "孩子輪流問貓咪在哪裡，家人依床、桌子、椅子回答。",
  "younger": "拿一張家具卡問家人，家人回答後指出正確卡。",
  "older": "輪流問 Where is the cat? 並用三個位置語出題，說清 home 屬課堂延伸。",
  "caregiverTip": "先把 bed、table、chair 圖卡和一張玩具卡放在桌面或地墊上。唱到位置語時，孩子把玩具卡放到正確位置；只在圖卡上操作，不鑽桌下、不爬床或椅子。",
  "pausePrompts": [
    {
      "targetWord": "table",
      "moment": "唱到table後",
      "title": "小老師用table出題：哪一件家具可以放書一起看？",
      "question": "小老師用table出題：哪一件家具可以放書一起看？",
      "followUp": "孩子出題後等家人回答，再核對卡片。"
    },
    {
      "targetWord": "chair",
      "moment": "唱到chair後",
      "title": "用chair出題",
      "question": "請用chair出題，家人坐穩時選對了嗎？",
      "followUp": "用圖卡也能出題，不強迫移動位置。"
    },
    {
      "moment": "片後已完成桌與椅的問答，換孩子出住處題時",
      "title": "小老師問整個住處",
      "question": "請用 home 出一題：哪張卡表示我們生活的住處，而不是只表示閱讀時坐的椅子？讓家人找卡，再由你核對。",
      "followUp": "先等家人回答，再說 home 或做屋頂手勢；住處是片後延伸，不把 home 當影片逐字聽辨題。",
      "targetWord": "home"
    }
  ],
  "instructions": [
    "播放棒球暖身短段，抬手為球隊加油，再做手遮額前看球的動作，留在原位。",
    "回播一、二、三節奏處，伸出相應手指輕拍三下；不必解釋整套棒球規則。",
    "停片輪流當加油領隊，孩子選一個手勢讓家人跟做，隨後放低雙手收束。",
    "依 table、chair、home、bed 擺卡，讓孩子先練一次 Where is the cat?。",
    "播放〈Where Is The Cat?〉；在 under the table、on the bed、next to the chair 的歌詞處停下，請小老師指卡發問。",
    "用桌面活動和坐下閱讀兩種用途出題，孩子找table與chair，再用雙手表示home；練Please sit on the chair when we read at the table.。",
    "完成table、chair、home三次問答，每人輪到一次出題和回應；坐穩後翻一本書或看圖卡，不需搬椅子。"
  ]
},
  "w9d4b2": {
  "title": "小老師｜說清位置，輪流找玩具",
  "sentence": "Adventure 88: Can you find the toy beside the chair?",
  "videoFocus": "依床上、桌下、椅旁的線索輪流找玩具。",
  "focus": "依床上、桌下、椅旁的線索輪流找玩具。",
  "younger": "先在椅子圖卡旁放玩具回答 chair 一題，再找 home 圖卡，用屋頂手勢表明在家裡找；最後把玩具放到 bed 圖卡上並指出位置。三題各自己指認或說一個詞；table 的位置配對留作延伸。",
  "older": "依 chair、home、bed 三題輪流提示與尋找：在椅子卡旁找玩具，用 home 說明活動所在住處，再在床卡上找玩具。練 Can you find the toy beside the chair?，分清 home 是住處、不是精確藏處；table 的位置配對留作額外延伸。",
  "caregiverTip": "準備 home、bed、table、chair 圖卡和一張玩具卡，放在桌面或地墊上。主課的位置語用家具圖卡演練；片後先做 chair 椅旁問答，再用 home 表示活動所在住處，最後做 bed 卡上問答，完成三題後再選其他位置延伸。只在圖卡上操作，不鑽桌下、不爬床椅，也不要求走遍家中找玩具。",
  "pausePrompts": [
    {
      "targetWord": "chair",
      "moment": "唱到next to the chair後",
      "title": "把玩具放在chair圖卡旁邊",
      "question": "請把玩具放在chair圖卡旁邊，再請家人找。",
      "followUp": "別放到圖卡正上方，先比較旁邊的位置。"
    },
    {
      "moment": "片後桌面找玩具遊戲，椅旁提示做完後",
      "title": "先說在哪個住處找",
      "question": "請找 home 圖卡：我們要在家裡找玩具，還是在外面找？用 home 指明住處後，再說下一個家具線索。",
      "followUp": "home 是片後的活動範圍提示，不表示玩具精確藏處，也不宣稱主課唱出此詞；選桌面圖卡即可，不要求真的走遍家中。",
      "targetWord": "home"
    },
    {
      "targetWord": "bed",
      "moment": "唱到on the bed後",
      "title": "玩具放在bed卡上",
      "question": "玩具放在bed卡上，請家人說或指出在哪裡。",
      "followUp": "用桌面小物演練，不爬床。"
    }
  ],
  "instructions": [
    "播放Uh-huh暖身短段，用小幅點頭表示同意，再用小幅搖頭表示不同意，先跟一次節奏。",
    "回播yes與no段，孩子選點頭或手勢回應；動作小而慢，不用猛甩頭。",
    "停片，家長指一張熟悉圖卡說對或說錯，孩子看清楚再回應同意或不同意，交換一次領隊。",
    "依 chair、home、bed、table 排卡；家長界定安全活動範圍，home 只表示活動所在住處。",
    "播放〈Where Is The Cat?〉；依 on the bed、under the table、next to the chair 停片，讓孩子在圖卡上放玩具。",
    "先指chair，再用屋頂手勢說home，最後找bed；把玩具放在椅子圖卡旁，練Can you find the toy beside the chair?，說明beside和next to都表示旁邊。",
    "完成chair、home、bed三次問答，交換提示者與尋找者後收好玩具；位置遊戲在桌面做即可。"
  ]
},
  "w9d5b1": {
  "title": "本週闖關｜猜玩具，再看清楚核對",
  "sentence": "Adventure 89: Is it a toy? Yes, it is.",
  "videoFocus": "看玩具箱歌曲先猜再揭曉，分清猜測與看見後的答案。",
  "focus": "玩具辨認、肯否核對與物品問句。",
  "younger": "看見玩具時回答 yes，看見與猜測不符時說 no；用 what-is-it 圖卡請家人露出物品，中文或一個英文名即可。",
  "older": "說明猜測與揭曉的差別，練 Is it a toy? Yes, it is.；依實物改答否定，再自己用 What is it? 問家人。",
  "caregiverTip": "保留麵包暖身，主課改為玩具箱的猜測與揭曉。官方歌詞先猜 robot 再揭曉 car，先猜 teddy 再揭曉 ball；不把猜測當正確答案，也不要求記所有玩具。yes/no 及 What is it? 由家長根據已揭曉物品加問，片後只用一件玩具和一本書。",
  "pausePrompts": [
    {
      "moment": "主課揭曉一件玩具後，家長確認它是玩具時",
      "title": "看見後才回答",
      "question": "現在已看見玩具車，家長問 Is it a toy?。請找 yes，指出你看見的物品再回答。",
      "followUp": "可先說 car 或中文車子；玩具身分能核對，不以是否喜歡它當答案。",
      "targetWord": "yes"
    },
    {
      "moment": "回看先猜 robot、後揭曉 car 的一輪時",
      "title": "猜測可以被修正",
      "question": "畫面揭曉的是車，家長卻問 Is it a robot?。請選 no，說明先前猜的和後來看到的一樣嗎？",
      "followUp": "先前的 maybe 表示猜測，猜錯不受責備；看清新線索再改答案。",
      "targetWord": "no"
    },
    {
      "moment": "片後換家人把一件熟悉物品放入盒子時",
      "title": "輪到你問名稱",
      "question": "請找 what-is-it，問 What is it?，等家人把物品拿出來。揭曉後你還要維持原來的猜測嗎？",
      "followUp": "不一定；說出實際看到的名字，再換孩子放物品讓家人問。",
      "targetWord": "what-is-it"
    }
  ],
  "instructions": [
    "播放麵包暖身短段，用雙手做揉麵和端出想像麵包的動作，輕拍節奏。",
    "回播one與two的節奏，伸一根、兩根手指再做遞給家人的動作；歌中價格只當故事，不需金錢。",
    "停片輪流遞出與接住想像麵包，說謝謝或點頭回應，再把手收好準備觀察遊戲。",
    "喝水，準備一件大玩具、一本書及可放物品的盒子；先讓孩子認得手邊物品，預告可以猜錯再修正。",
    "播放玩具箱歌曲的一輪猜測與揭曉，先停在猜測後，讓孩子想一想；揭曉後比較原來猜的和真正看到的。",
    "依 yes、no、what-is-it 完成三題，以實際揭曉物品核對；片後輪流把玩具或書放盒內，不把看完影片當答對。",
    "練 Is it a toy? Yes, it is.，換成書時如實改答；每人自己完成三題複習與一次開口，不用搶答或記憶全歌順序。"
  ]
},
  "w9d5b2": {
  "title": "本週闖關｜說出位置，收好物品",
  "sentence": "Adventure 90: We leave the table and chair ready for tomorrow.",
  "videoFocus": "用床上、桌下、椅旁三個線索複習家具並收好物品。",
  "focus": "用床上、桌下、椅旁三個線索複習家具並收好物品。",
  "younger": "找出 bed、table、chair 三張卡，再自己收一件物品。",
  "older": "用三個位置語複習家具，說明 home 是住處延伸，並核對一件物品已收回原位。",
  "caregiverTip": "先把 bed、table、chair 圖卡和一張玩具卡放在桌面或地墊上。唱到位置語時，孩子把玩具卡放到正確位置；只在圖卡上操作，不鑽桌下、不爬床或椅子。",
  "pausePrompts": [
    {
      "targetWord": "bed",
      "moment": "回看bed段後",
      "title": "不看提示",
      "question": "不看提示，你還記得bed是哪張嗎？",
      "followUp": "忘記可用休息手勢提示，自己重試。"
    },
    {
      "targetWord": "table",
      "moment": "回看table段後",
      "title": "找table",
      "question": "請找table，收好哪件東西能讓table留出空間？",
      "followUp": "真的收一件物品，不把家長代收算孩子完成。"
    },
    {
      "targetWord": "chair",
      "moment": "回看chair段後",
      "title": "找chair",
      "question": "請找chair，檢查看看座位現在可以坐嗎？",
      "followUp": "用整理後的狀態回答，再輪流核對。"
    }
  ],
  "instructions": [
    "播放南瓜田暖身短段，原地慢步表示出發，用手在空中圈出圓圓南瓜再做捧起動作。",
    "回播找南瓜或分享蘋果的片段，孩子選找、捧、遞出一個動作讓家人跟做。",
    "停片輪流帶一個想像農場動作，手勢收回身旁；雕刻與點燭留在歌曲故事，不拿工具跟做。",
    "依 bed、table、chair、home 排卡，選一個安全的小區作收好物品任務。",
    "播放〈Where Is The Cat?〉；聽到 on the bed、under the table、next to the chair 時停片找卡。",
    "打亂bed、table、chair卡做本週複習，再看看活動用的桌面或座位；練We leave the table and chair ready for tomorrow.，親手收好一件物品。",
    "每名孩子完成bed、table、chair三次複習，輪流核對物品是否歸位，最後說一個詞或句子。"
  ]
}
};

const tenthWeekReviewedGuidance: Record<string, ReviewedTeachingGuidance> = {
  "w10d1b1": {
  "title": "探索日｜搭車先等一等",
  "sentence": "Adventure 91: We wait our turn to get on the train.",
  "videoFocus": "跟Tobee看搭地鐵的過程，片後比較軌道、道路和太空中的交通工具。",
  "focus": "地鐵觀察與片後交通工具分類。",
  "younger": "完成train、rocket、car三題指認，說一個詞，再用手指示範停住等候與輪到才上車；家長可以讓孩子坐著操作。",
  "older": "說出地鐵是列車的一種，在軌道上行駛，練We wait our turn to get on the train.；片後分train走軌道、car走道路、rocket往太空，不推論所有列車都在地下。",
  "caregiverTip": "只需本課圖卡或現有玩具車，家中空位用手勢就能操作。卡片暖身做畫心、摺卡、遞卡的空手動作，不必準備剪刀或膠帶。主課是Tobee初次搭地鐵，選等候、讓人先下車、上車的短段觀察；rocket、car、bus是在片後看圖卡比較，不要求孩子在地鐵歌中找到。等候遊戲留在室內，不模仿靠近月台邊緣、擠門或奔跑搶位。",
  "pausePrompts": [
    {
      "moment": "主課列車進站與上下車短段後",
      "title": "列車停下來以後",
      "question": "請找train圖卡。看到有人要下車時，我們先等，還是往門口擠？請用手指停住，再輪流往前一步。",
      "followUp": "歌中的subway是地鐵，屬於列車的一種；以手指演上車，讓人先下車再輪到自己。",
      "targetWord": "train"
    },
    {
      "moment": "片後第二題交通工具分類時",
      "title": "火箭去哪裡",
      "question": "請找rocket，手掌慢慢朝上表示飛向太空。它和地鐵一樣走城市的軌道嗎？",
      "followUp": "rocket是片後延伸，主課沒唱到也沒關係；孩子可以指圖回答，不必跳起來。",
      "targetWord": "rocket"
    },
    {
      "moment": "片後第三題比較路線時",
      "title": "道路上可以看到什麼",
      "question": "請找car，用手指沿桌面或空中的想像道路前進。car走道路，train走什麼地方？",
      "followUp": "讓孩子指軌道圖或做兩條平行路線的手勢，避免說每一種列車都在地下。",
      "targetWord": "car"
    }
  ],
  "instructions": [
    "播放做卡片暖身一小段，用手指在空中畫心形，再做摺卡的動作，向想送卡的家人揮手。",
    "回播畫圖或遞卡的短段，孩子選一個顏色用中文或英文說，再把想像卡片慢慢傳給家人。",
    "停片交換角色，一人做卡、一人接卡，輪流說謝謝；收好雙手，預告接著要和Tobee搭地鐵。",
    "喝水，打開train、rocket、car、bus圖卡，先找train，說明今天先看搭地鐵，其他交通工具看片後再比較。",
    "播放Tobee等列車、讓人下車與上車的短段，停片讓孩子指train，再用手指示範等候和輪到自己；不用連續看完整部。",
    "片後完成train軌道、rocket太空、car道路三題指認與比較，練We wait our turn to get on the train.；每個孩子用圖卡或手勢示範一次。",
    "輪流當乘客與帶領者，用手指先等人下車再上車；每位孩子自己回答三題並開口，最後把圖卡或玩具收好。"
  ]
},
  "w10d1b2": {
  "title": "探索日｜車停穩，再輪到我",
  "sentence": "Adventure 92: We wait until the bus stops.",
  "videoFocus": "聽公車與車門的開關動作，片後用手指乘客練等車停穩、先下後上。",
  "focus": "公車辨認與室內等候順序。",
  "younger": "完成rocket、car、bus三題指認，說一個詞；用手指停住，等家長說車停穩再輪到自己往前一步，不用在房間跑。",
  "older": "指認主課的 bus 與車門動作，說明開門不等於可以搶上車。練 We wait until the bus stops.，用手指先等停穩、讓乘客下車，再由照顧者帶領上車。",
  "caregiverTip": "〈The Wheels On The Bus〉直接唱 bus 與車門開關，但不是完整交通安全教學。車停穩、先下後上的順序由家長在桌上模型明確示範；rocket、car 是本頁比較詞。用手指或一件玩具，不跑向真車、不擠門。Teddy Bear 暖身以小幅動作參與即可。",
  "pausePrompts": [
    {
      "moment": "公車短段後，片後辨認第一張卡時",
      "title": "火箭不是等候區的公車",
      "question": "請找 rocket，指向太空的想像位置。它應排在桌上公車站等乘客嗎？",
      "followUp": "先辨圖再比較用途；火箭是延伸，不在歌中等它出現。",
      "targetWord": "rocket"
    },
    {
      "moment": "片後第二張卡，用手指小車靠站時",
      "title": "汽車還在動，乘客先等",
      "question": "請找 car。家長的手指車慢慢走時，你的乘客手指先停在哪裡？",
      "followUp": "先選離模型車一段距離的位置，等它停住才靠近；這是家長加入的安全情境。",
      "targetWord": "car"
    },
    {
      "moment": "回看車門開關段後，輪到公車乘客時",
      "title": "公車先停穩再輪流",
      "question": "請找 bus。車停穩後還有人下車，你要先等還是搶著往前？請用手指演一次。",
      "followUp": "每位孩子實際做先等、讓人下、再輪到自己的順序；不靠口頭背誦代替操作。",
      "targetWord": "bus"
    }
  ],
  "instructions": [
    "播放Teddy Bear暖身短段，跟做碰鼻子、碰腳尖或點頭，照自己的活動範圍慢慢做。",
    "回播轉身或舉手的動作，孩子可用手指轉圈代替全身旋轉，用抬手代替跳高。",
    "停片讓孩子帶一個動作，家人跟做，再一起停住、坐穩；不模仿關燈後四處走動。",
    "喝水，打開圖卡，兩根手指分別當車和乘客；先約定模型只在桌前空位操作。",
    "播放〈The Wheels On The Bus〉的車輪與車門段。聽到 bus 先找卡，看到或聽到車門開關時用雙手模仿；停片後由家長另教等停穩的順序。",
    "片後完成rocket、car、bus三題指認，分清太空與道路交通工具；練We wait until the bus stops.，用手指演先等停穩、先下後上。",
    "輪流當車和乘客，交換後每位孩子都示範一次等待並回答一題，再各自完成三題與口說；不把搶先上車當獲勝條件。"
  ]
},
  "w10d2b1": {
  "title": "動起來｜看清楚，再跟著做",
  "sentence": "Adventure 93: Watch me turn, then stop with me.",
  "videoFocus": "從 Move! 觀察 turn 與 stop，先看清再模仿，片後自己帶領動作。",
  "focus": "觀察、模仿與轉向後停止的帶隊合作。",
  "younger": "完成jump輕彎膝或手指跳、turn手指轉、go手指往前三題跟做，說一個詞；聽到stop就停住，坐著操作也可以。",
  "older": "先觀察主課轉向與停止，再片後練 jump、turn、go 三題；說 Watch me turn, then stop with me.，帶隊前確認家人看著自己，等對方完成才換口令。",
  "caregiverTip": "原 Mary 暖身三步保留。Move! 直接提供 turn/stop，jump/go 在片後圖卡遊戲練。先看示範，再等家人準備好才發令；手指跳、手掌慢轉即可，不要求離地或連續轉圈。這堂著重帶領者等待對方，不做速度比賽。",
  "pausePrompts": [
    {
      "moment": "看完主課短段，片後孩子選坐姿動作時",
      "title": "先看清楚再模仿",
      "question": "家長先示範手指 jump 一下，請看完才照做。若你還沒準備好，可以怎麼請他等一下？",
      "followUp": "jump 是片後加入；可說等一下或抬手示意，讓孩子知道不必搶快。",
      "targetWord": "jump"
    },
    {
      "moment": "回看轉向和停止口令後",
      "title": "我帶你轉，再一起停",
      "question": "請用 turn 帶家人慢轉手掌，再一起停住。發令之前，你怎麼確認家人正在看你？",
      "followUp": "示範 Watch me turn, then stop with me.；先呼名或等眼神，不拉扯對方身體。",
      "targetWord": "turn"
    },
    {
      "moment": "片後交換領隊時",
      "title": "等對方才能出發",
      "question": "現在由你用 go 讓家人的手指前進一步。如果家人還沒做完，下一個指令要立刻說嗎？",
      "followUp": "go 是課後延伸；先等再說，回饋是否看清與聽懂，不比反應時間。",
      "targetWord": "go"
    }
  ],
  "instructions": [
    "播放Mary暖身開頭，輕拍小羊的節奏，用手指跟著走；先看實際畫面，不只依歌名猜有哪些動物。",
    "若播放到長頸鹿等段落，用手臂示意長脖子或自己看到的特徵；只模仿眼前短段，不要求一次記全。",
    "停片交換帶領者，一人出一個輕拍或動物手勢，家人先看再跟做，最後一起停住。",
    "喝水，開啟動作圖卡，選手指或站姿，約定還沒準備好可請領隊等一下。",
    "播放 Move! 的轉向與停止短段，第一遍只觀察，回播再一起做，看看何時該停。",
    "片後依序完成 jump、turn、go 三題；jump/go 另由家長示範，練 Watch me turn, then stop with me.。",
    "交換帶領者，先確認對方看著自己才出一個指令，等動作完成再換；三次跟做與一次開口各自記錄。"
  ]
},
  "w10d2b2": {
  "title": "動起來｜看得到幾個車輪",
  "sentence": "Adventure 94: Let us count the wheels we can see.",
  "videoFocus": "從公車歌的車輪轉動出發，做三種交通手勢，再逐一點數圖上確實看得見的輪子。",
  "focus": "公車車輪與一對一點數。",
  "younger": "完成bus轉方向盤、train雙臂轉輪、rocket手掌朝上三題跟做，說一個詞；再跟家長一個一個指眼前車輪，先數到二也可以。",
  "older": "先用雙臂示範公車輪子轉動，再逐一指圖或玩具上的可見輪子，說 Let us count the wheels we can see.；換圖後重新數，不能把前一張答案套到所有車。",
  "caregiverTip": "先確認本頁車圖或現有玩具的輪子清楚。〈The Wheels On The Bus〉唱 bus 與 wheels，沒有指定整台固定輪數；train 與 rocket 是片後手勢比較。點數只數這一面看見的輪子，遮住的不猜，換面時避免重數。大象暖身以原地小動作跟做。",
  "pausePrompts": [
    {
      "moment": "公車車輪歌段落後，選定一張圖時",
      "title": "看得見才數",
      "question": "請找 bus，先做方向盤手勢，再一個一個指眼前可見的輪子。這一面數到幾個？",
      "followUp": "實際點一次算一次，並說明不是整台總數；不先替孩子報答案。",
      "targetWord": "bus"
    },
    {
      "moment": "片後換成列車圖卡時",
      "title": "換車就重新點數",
      "question": "請找 train，雙臂轉輪後沿同一方向逐輪點。它一定和剛才公車一樣多輪嗎？",
      "followUp": "依這張圖實際可見數量回答；車廂可能不同，不背所有火車固定輪數。",
      "targetWord": "train"
    },
    {
      "moment": "第三題比較火箭的移動方式時",
      "title": "不是每種工具都靠輪子",
      "question": "請找 rocket，手掌慢慢朝上。它和 bus 一樣靠道路車輪前進嗎？",
      "followUp": "用升空手勢作第三次跟做，再回到一張清楚車圖完成點數；不編造火箭的固定輪數。",
      "targetWord": "rocket"
    }
  ],
  "instructions": [
    "播放Baby Elephant暖身短段，一手當象鼻慢慢舉高、放低，雙腳原地輕踏或用手指踏步。",
    "回播象鼻上下或大象走路的段落，孩子選一個動作帶家人做；不真的追逐、潑水或用力跺腳。",
    "停片交換大象角色，做兩下慢踏再停住，家長帶著逐一下數，接著把雙手放好。",
    "喝水，打開交通圖卡，選一張輪子清楚的車圖或現有玩具；先約定只數眼前看得到的這一面。",
    "播放〈The Wheels On The Bus〉車輪段，雙臂慢慢轉圈跟做；停片後指 bus 與可見輪子，把歌曲動作轉為一次指一輪的數數。",
    "片後完成bus轉方向盤、train轉輪、rocket朝上三題跟做，再逐一指車圖或玩具上可見輪子，練Let us count the wheels we can see.；指一個數一個，不猜被遮住的部分。",
    "輪流當點數者和核對者，用同一輛玩具或同一張圖重新數；若轉玩具另一面，先分清是在數這一面還是整台並避免重數，每位孩子自己操作或回答後記錄。"
  ]
},
  "w10d3b1": {
  "title": "配對日｜車輛各有工作",
  "sentence": "Adventure 95: This truck helps keep our town clean.",
  "videoFocus": "看玩具垃圾車與城市工作車的用途，片後將交通工具配到合適的路線。",
  "focus": "城市工作車與片後交通工具分類。",
  "younger": "完成train軌道、rocket太空、car道路三題分類，指圖並說一個詞；再用玩具演一次收取或運送，不必背全部工作車名稱。",
  "older": "說出垃圾車與郵務車的不同工作，練This truck helps keep our town clean.；片後把train、rocket、car配到軌道、太空、道路，說出分類理由。",
  "caregiverTip": "用本課圖卡、一件現有玩具與一張乾淨紙即可，不接觸真正垃圾。洗澡暖身先看短段，家長選眼前出現的一個洗身體動作空手帶做，不必準備水盆，也不硬套其他洗澡歌的歌詞。主課介紹垃圾車、郵務車、消防車等不同用途；train、rocket、car是片後分類，不要求在主課找到。城市觀察用影片或室內玩具完成，不靠近作業中的車輛。",
  "pausePrompts": [
    {
      "moment": "工作車短段後，片後第一題分類時",
      "title": "哪一種走軌道",
      "question": "請找train，配到想像的軌道。主課的垃圾車和train一樣一定沿軌道走嗎？",
      "followUp": "先說垃圾車在道路上工作，再讓孩子用指認區分；train是片後比較詞。",
      "targetWord": "train"
    },
    {
      "moment": "片後第二題分類時",
      "title": "飛向太空的工具",
      "question": "請找rocket，配到太空那一組。它的用途和收取街上垃圾的車一樣嗎？",
      "followUp": "讓孩子做朝上手勢說明，不把rocket塞進垃圾車的歌詞。",
      "targetWord": "rocket"
    },
    {
      "moment": "片後第三題比較車輛用途時",
      "title": "同在道路，工作不同",
      "question": "請找car，配到道路那一組。car可以載人，垃圾車還有什麼工作？用玩具示範一次。",
      "followUp": "用乾淨紙代表待收物，手指演收取即可；不要求把真實廢棄物拿進活動。",
      "targetWord": "car"
    }
  ],
  "instructions": [
    "播放洗澡暖身開頭，先看寶寶做了什麼，家長挑一個看得到的清洗動作，穿著衣服空手示範。",
    "回播同一短段，孩子選洗手臂或另一個眼前動作跟做，再把手收好；不把其他歌曲的身體詞硬加進歌詞。",
    "停片輪流當帶領者，家人模仿一個洗身體手勢，最後一起做擦乾的想像動作。",
    "喝水，打開train、rocket、car、bus圖卡，拿一件玩具和一張乾淨紙，先說工作車有不同用途。",
    "播放玩具垃圾車、郵務車或消防車短段，每看完一種就停片問它幫人做什麼；選兩種比較即可，不必看完才提問。",
    "片後完成train配軌道、rocket配太空、car配道路三題分類，練This truck helps keep our town clean.；用玩具把乾淨紙送到指定位置，演一次收取或運送。",
    "輪流當分類者和小解說員，每位孩子自己完成三題並開口；最後說兩種工作車用途哪裡不同，把玩具與紙歸位。"
  ]
},
  "w10d3b2": {
  "title": "配對日｜準備好，再出發",
  "sentence": "Adventure 96: My rocket is ready to go.",
  "videoFocus": "跟火箭歌依序準備與倒數，片後把rocket、car、bus分類，再用go和stop控制手指移動。",
  "focus": "火箭出發準備與片後指令遊戲。",
  "younger": "完成rocket太空、car道路、bus道路三題分類，說一個詞；手指聽go走、聽stop停，倒數先跟三、二、一即可。",
  "older": "說出火箭出發前要先準備、再倒數，練My rocket is ready to go.；分類rocket、car、bus後輪流給go／stop口令，等同伴做完再換。",
  "caregiverTip": "本課圖卡與雙手即可。萬聖節暖身用接想像食物、微笑或酸味表情配合，不必準備糖果、扮裝或真的試吃。火箭主課有穿太空衣、戴頭盔、繫安全帶與倒數，car和bus不必在歌裡找。go／stop是片後手指遊戲，分類太空與道路後再操作，不把遊戲口令當作真實交通通行指示。",
  "pausePrompts": [
    {
      "moment": "主課準備和倒數短段後",
      "title": "先準備什麼",
      "question": "請找rocket。出發前你看到哪一個準備動作？先示範穿太空衣或戴頭盔，再用手指倒數。",
      "followUp": "家長依實際播放的段落提問，較小孩子做一個手勢就好；升空只抬手，不跳離椅子。",
      "targetWord": "rocket"
    },
    {
      "moment": "片後第二題分類與口令時",
      "title": "小車在道路上",
      "question": "請找car，把它配到道路這一組。用go讓手指車走一步，再說stop讓它停住。",
      "followUp": "先分類，再操作口令，各自有清楚目的；不是要求火箭歌裡出現car。",
      "targetWord": "car"
    },
    {
      "moment": "片後第三題輪流帶領時",
      "title": "換公車試一次",
      "question": "請找bus，說它配道路還是太空。輪到你帶領時，能讓家人的手指公車出發再停住嗎？",
      "followUp": "讓孩子自己說go和stop或指卡，家長等口令再動；不以快或搶先為目標。",
      "targetWord": "bus"
    }
  ],
  "instructions": [
    "播放萬聖節食物暖身短段，用手做接想像食物的動作，跟一句熟悉的節奏，不需真的吃糖。",
    "回播甜味或酸味段，孩子用微笑或酸酸表情回應，家人猜是哪一種味道。",
    "停片換人帶接食物和味道表情兩個動作，最後一起放下雙手，準備進入太空想像遊戲。",
    "喝水，打開rocket、car、bus、train圖卡，先分太空與道路兩個想像位置，保留空位讓手指移動。",
    "播放火箭出發前準備和倒數短段，停片跟做一項準備，再一起倒數；較小孩子先跟三、二、一，升空只慢慢舉手。",
    "完成rocket太空、car道路、bus道路三題分類，練My rocket is ready to go.；再用手指演go一步、stop停住，不要求歌中唱全部交通工具。",
    "輪流當發令者和操作者，各做一次出發與停止，每位孩子回答三題並說詞或句子；最後說先準備再出發的順序。"
  ]
},
  "w10d4b1": {
  "title": "小老師｜列車慢慢進站",
  "sentence": "Adventure 97: The train slows down at the station.",
  "videoFocus": "聽列車行進與進站節奏，片後比較car、bus、train，輪流提問與解釋。",
  "focus": "列車進站觀察與交通工具問答。",
  "younger": "完成car、bus、train三題問答，可指圖回答；雙手慢慢轉輪再停住，說train或一個交通工具詞。",
  "older": "說出列車沿軌道行進、進站會放慢，練The train slows down at the station.；片後用car、bus、train三題比較道路、載客與軌道，輪流當小老師。",
  "caregiverTip": "只需圖卡，或用兩三件現有玩具排成小列車，不把身體連成推拉隊伍。六個在床上暖身用六根手指與每次少一個的手勢，不在床上翻滾跌落。主課重點是train、軌道、進站與快慢；car和bus放在片後問答，不要求它們在歌中出現。歌裡的車廂配置是這首歌的情境，不說所有現代列車都相同。",
  "pausePrompts": [
    {
      "moment": "列車短段後，片後第一題比較時",
      "title": "小汽車走哪裡",
      "question": "請找car。它平常走道路還是列車的軌道？你能用手指畫一條想像路線嗎？",
      "followUp": "先辨圖再說路線；不拿真實道路當遊戲場，也不要求主課有car。",
      "targetWord": "car"
    },
    {
      "moment": "片後第二題比較載客方式時",
      "title": "公車和小汽車",
      "question": "請找bus。和car相比，這張圖的公車有哪些可以載多位乘客的地方？",
      "followUp": "依圖上的車廂或窗戶回答，不猜固定乘客數；兩者都在道路上行駛。",
      "targetWord": "bus"
    },
    {
      "moment": "主課進站放慢短段後，片後第三題時",
      "title": "列車進站的聲音",
      "question": "請找train，雙手轉輪配合剛才的節奏。快到車站時，節奏是加快還是放慢？",
      "followUp": "回播核對再慢慢停住，不把大聲等同更快；若只聽到短段就依實際段落回答。",
      "targetWord": "train"
    }
  ],
  "instructions": [
    "播放六個在床上暖身短段，伸出六根手指，用雙手小幅輪轉表示翻身。",
    "每次歌中少一個就收一根手指，停片數剩下幾個；較小孩子只練三變二也可以。",
    "停片換孩子當領隊，示範輪轉再停住，家人照做；動作留在手上，不到床上模仿跌落。",
    "喝水，打開car、bus、train、rocket圖卡，用手指或現有玩具排一條列車，預告留意進站前的變化。",
    "播放列車行進與進站放慢的短段，孩子先聽，再用雙手轉輪跟節奏；停片指train，回播確認什麼時候變慢。",
    "片後完成car道路、bus載客、train軌道和進站三題問答，練The train slows down at the station.；比較兩種道路車輛與列車。",
    "輪流當小老師，一人指卡出題，一人回答再交換；每位孩子完成三題並開口，用慢慢停車的手勢結束。"
  ]
},
  "w10d4b2": {
  "title": "小老師｜聽聲音，說出動作",
  "sentence": "Adventure 98: Listen, then tell me when to stop.",
  "videoFocus": "聽紅綠燈歌的 go 與 stop，片後用家人模仿的交通聲音做輪流問答。",
  "focus": "出發、停止的聽辨與交通聲音中文表達。",
  "younger": "依序做 turn 手指轉彎、go 往前、stop 停手三題；模仿一種自己熟悉的車聲，中文或手勢都能回應。",
  "older": "用中文描述像哪種車、聲音節奏快慢，再練 Listen, then tell me when to stop.；自己當指令者，讓家人的手指和聲音一起停下。",
  "caregiverTip": "保留 Wag Your Tail 暖身三步。主課 Carl's 紅綠燈歌直接教 go/stop/wait，turn 是家長片後加的轉彎動作；交通聲音也由家人小聲模仿，不聲稱原片教車型音效。用桌面手指車，無須到馬路旁錄音；擬聲沒有唯一寫法，也不把音量當速度。",
  "pausePrompts": [
    {
      "moment": "播放前先讓桌面手指車改方向時",
      "title": "轉彎也能用手指",
      "question": "請做 turn，讓手指車轉一個小彎。家長模仿小汽車聲後，你會用中文怎麼說它正在做什麼？",
      "followUp": "轉彎由家長補教；先描述動作，不要求從聲音猜出真實車型。",
      "targetWord": "turn"
    },
    {
      "moment": "主課綠燈出發短段後",
      "title": "聽到出發再前進",
      "question": "聽到 go，請讓手指車前進。片後家長把車聲節奏說得慢一些再快一些，你能指出哪次比較快嗎？",
      "followUp": "聲音比較在停片後做，保持相同舒服音量，不把大聲等同快。",
      "targetWord": "go"
    },
    {
      "moment": "主課停止口令後，輪流控制想像車時",
      "title": "手指和聲音一起停",
      "question": "請用 stop 讓家人的手指車和車聲一起停止。若車聲還在繼續，你會怎麼再提醒一次？",
      "followUp": "示範清楚說 stop，再等待；與家人交換角色完成問答，不需喊叫。",
      "targetWord": "stop"
    }
  ],
  "instructions": [
    "播放動物搖尾暖身短段，先拍手，再用一根手指左右搖作尾巴，照自己的節奏跟做。",
    "回播彎膝或拍手段，選慢速動作；坐著的孩子用手指彎一下代替全身動作，不用力拍胸。",
    "停片輪流帶一個動物手勢，其他人說像哪個動物，再一起停住聽家長說明。",
    "喝水，開啟動作圖卡，先用手指車示範 turn；家長小聲配汽車聲，讓孩子描述轉彎。",
    "播放 Carl's 紅綠燈歌，聽到 go 前進、stop 停下，用手指回應，不把遊戲當獨自過馬路練習。",
    "依 turn、go、stop 完成三題；片後家人模仿汽車或火車聲，孩子描述節奏，練 Listen, then tell me when to stop.。",
    "交換發聲者與指令者，讓手指和聲音一起停；每人自己回答三題並輪到一次交通聲音合作，接受不同合理擬聲。"
  ]
},
  "w10d5b1": {
  "title": "任務日｜選一輛車，說一個理由",
  "sentence": "Adventure 99: I choose the yellow car for our trip.",
  "videoFocus": "觀察小汽車顏色與購物情境，片後複習train、rocket、car並說出自己的選擇理由。",
  "focus": "顏色與本週交通工具複習。",
  "younger": "完成train、rocket、car三題複習，指圖並說一個詞；在主課短段找一個顏色，不用背全部顏色或食物。",
  "older": "說主課小汽車的一種顏色與對應購物物品，練I choose the yellow car for our trip.；片後比較train、rocket、car，再選一種適合想像旅程的工具說理由。",
  "caregiverTip": "只需本課交通圖卡，找顏色可用眼前衣物或現有物品，不必準備整套彩色車。See You Later本來是告別歌，今天用揮手、踏兩步的「出門再見」情境暖身，唱完還要接著上課。主課是不同顏色的car和購物，train與rocket在片後複習。圖卡不一定是黃色，句型中的yellow對應影片或孩子想像的小車，不把非黃色圖卡指成黃色。",
  "pausePrompts": [
    {
      "moment": "小汽車短段後，片後第一題複習時",
      "title": "哪一種沿軌道旅行",
      "question": "請找train，說它和剛才的car走的路一樣嗎？用手指示意軌道。",
      "followUp": "train是片後複習，不要求小汽車歌出現；讓孩子先指出，再補簡短理由。",
      "targetWord": "train"
    },
    {
      "moment": "片後第二題選旅行工具時",
      "title": "去太空會選什麼",
      "question": "請找rocket。若想像要到太空，選它還是道路上的小車？說一個理由。",
      "followUp": "讓孩子用升空手勢回答，家長補充是想像旅行；不把不同選擇當比賽輸贏。",
      "targetWord": "rocket"
    },
    {
      "moment": "主課顏色與購物短段後，片後第三題時",
      "title": "我選的小汽車",
      "question": "請找car，再說影片中你看到的汽車顏色。你想像的小車要帶你去哪裡？",
      "followUp": "顏色依實際播放片段回答；若圖卡顏色不同就分開指影片與圖卡，不硬說都是yellow。",
      "targetWord": "car"
    }
  ],
  "instructions": [
    "播放告別暖身短段，用揮手和慢踏兩步演「我要出門了，再見」，先說唱完還要回到課程。",
    "回播再見的重複句，孩子向家人揮手，家人回應再見；不用真的離開房間。",
    "停片交換出門者與送行者，各做一次告別手勢，再一起坐穩準備想像旅程。",
    "喝水，打開train、rocket、car、bus圖卡，預告先看小汽車顏色，再把本週工具一起複習。",
    "播放黃色小車與一個不同顏色的短段，停片先指car，再找對應購物物品；只選兩色比較，不要求一次記完整首。",
    "完成train軌道、rocket太空、car道路與顏色三題複習，練I choose the yellow car for our trip.；說的是影片或想像黃車，圖卡不同色要分清。",
    "每位孩子選一種工具說想去哪裡及一個理由，輪流完成三題並開口；不比速度，最後用再見手勢送想像小車回家。"
  ]
},
  "w10d5b2": {
  "title": "任務日｜用手指走一段城市路線",
  "sentence": "Adventure 100: Our bus goes from home to the park.",
  "videoFocus": "先用公車歌辨認 bus，再在兩點地圖走出家到公園路線，說清起點、停靠點與終點。",
  "focus": "公車辨認與城市路線解說。",
  "younger": "完成rocket、car、bus三題複習，說一個詞；用手指從家到公園慢慢移動，指到終點後停住。",
  "older": "用 bus 歌辨認公車後，說 Our bus goes from home to the park.；在模型上加一個中途站，依序指起點、停靠點、終點，換同伴沿指示走一次。",
  "caregiverTip": "用兩件現有物品代表家與公園，手指作公車即可，不需列印地圖或買模型。〈The Wheels On The Bus〉直接教 bus，家到公園的路線是孩子片後建立，rocket、car 是複習比較。這次不重做數輪子課，重點是起終點和輪流解說。暖身仍使用原有手遞手活動。",
  "pausePrompts": [
    {
      "moment": "公車短段後，規劃模型區域時",
      "title": "火箭先放對地方",
      "question": "請找 rocket。它要放太空想像區，還是排進家到公園的公車路線？",
      "followUp": "先分太空與道路，讓孩子自己指一區；這是片後複習，不要求原片有火箭。",
      "targetWord": "rocket"
    },
    {
      "moment": "片後用另一種道路車測試起點時",
      "title": "汽車從家開始",
      "question": "請找 car，先指出家，再用手指車沿想像道路走到公園。哪裡是起點？",
      "followUp": "孩子先辨認兩件物品各代表什麼，走錯可回起點重試；路線不是從歌裡抄出。",
      "targetWord": "car"
    },
    {
      "moment": "第三題由孩子帶領公車路線時",
      "title": "公車中途站你來說",
      "question": "請找 bus。你能指著起點、想停的一站、終點，讓家人照順序走嗎？",
      "followUp": "較小孩子只指家和公園；較大孩子再加一站，說清 Our bus goes from home to the park. 後交換角色。",
      "targetWord": "bus"
    }
  ],
  "instructions": [
    "播放傳豆袋暖身短段，用現有小玩偶或摺毛巾手遞手，聽到停止就抱好不動。",
    "回播慢傳或換方向段，兩人也可以來回傳，輪流說現在由誰接；不跟最後超快節奏硬搶。",
    "停片讓孩子帶一次傳遞與停止，把物品輕放下，預告接下來辨認公車、再走城市路線。",
    "喝水，讓孩子用兩件物品標出家與公園並各指一次；先說明模型上的位置，再打開交通圖卡。",
    "播放〈The Wheels On The Bus〉一段，指 bus 並用方向盤手勢跟唱；停片請孩子當路線解說員，不要求在影片找家或公園。",
    "片後完成rocket太空、car道路、bus道路三題複習，練Our bus goes from home to the park.；用手指從家慢慢走到公園，說清起點與終點。",
    "輪流當乘客和路線解說員，較大孩子在中途加一個停靠點；每位孩子自己回答三題並走一次路線或說一次名稱，最後把物品收回原位。"
  ]
}
};

const eleventhWeekReviewedGuidance: Record<string, ReviewedTeachingGuidance> = {
  "w11d1b1": {
  "title": "探索日｜早安自然景物",
  "sentence": "Adventure 101: Trees and flowers grow under the sky.",
  "videoFocus": "唱早安歌時找花、樹、太陽與天空，完成第一次自然觀察。",
  "focus": "唱早安歌時找花、樹、太陽與天空，完成第一次自然觀察。",
  "younger": "指 tree、flower、sun、sky 圖卡各一次；聽到一個詞就指出相同圖卡。",
  "older": "說出至少三個自然詞，並解釋歌裡的 trees／flowers 對應單張 tree／flower 圖卡。",
  "caregiverTip": "用本頁圖卡或手勢即可，聽到flowers、trees時，先指出一朵flower、一棵tree，再說明歌曲唱的是多朵花、多棵樹。以圖卡觀察sun，不用直視太陽；每次暫停留三秒讓孩子自己回應。",
  "pausePrompts": [
    {
      "targetWord": "tree",
      "moment": "唱到trees後",
      "title": "找tree",
      "question": "請找tree，哪個部分像樹幹和樹枝？",
      "followUp": "說明trees是多棵樹，圖卡先學一棵tree。"
    },
    {
      "targetWord": "flower",
      "moment": "唱到flowers後",
      "title": "找flower",
      "question": "請找flower，用手掌做一朵花。",
      "followUp": "flowers表示多朵花，先指一朵並說flower。"
    },
    {
      "targetWord": "sun",
      "moment": "唱到sun後",
      "title": "指sun圖卡",
      "question": "請指sun圖卡，再說它大約在天空還是地面？",
      "followUp": "只指圖卡，不直視太陽。"
    }
  ],
  "instructions": [
    "播放三隻小貓暖身短段，雙手做尋找手套的動作，找到時舉手示意，跟一小段貓叫節奏。",
    "回播找到或清洗手套的段落，空手做戴上、輕洗、晾好的動作，不需真手套或水盆。",
    "停片讓孩子帶一個尋找或戴手套手勢，家人跟做；用找到就一起收好的方式結束，不用食物作懲罰。",
    "拿 tree、flower、sun、sky 四張圖卡做「早安觀察」；孩子依序指認，不必外出。",
    "播放〈Good Morning, It’s Such A Beautiful Day〉；依歌曲出現的 sun、sky、flowers、trees 暫停指卡。",
    "把tree與flower放植物組、sun與sky放天空景物組，練Trees and flowers grow under the sky.；家長指出trees、flowers指不只一棵樹、一朵花。",
    "每名孩子完成tree、flower、sun三次認識，再選一張卡說自己的發現；可指卡或跟說，無需外出。"
  ]
},
  "w11d1b2": {
  "title": "探索日｜看見太陽、天空與花樹",
  "sentence": "Adventure 102: I can see light and shade.",
  "videoFocus": "聽到自然景物就找相同圖卡，練習看見後命名。",
  "focus": "聽到自然景物就找相同圖卡，練習看見後命名。",
  "younger": "先依 flower、sun、sky、tree 順序，由孩子自己指出圖卡並主動說一個詞；片後輪到自己時，在室內紙面指一處較亮或手掌遮出的陰影，跟家人觀察 light／shade，不直視太陽或光源。",
  "older": "聽到詞後自己找卡，再用 I see… 或一個完整詞介紹看見的景物；片後在室內紙面比較較亮處與手掌遮出的陰影，輪流指出 light／shade，鼓勵說 I can see light and shade.，不直視太陽或光源。",
  "caregiverTip": "用本頁圖卡或手勢即可，聽到flowers、trees時，先指出一朵flower、一棵tree，再說明歌曲唱的是多朵花、多棵樹。以圖卡觀察sun，不用直視太陽；每次暫停留三秒讓孩子自己回應。",
  "pausePrompts": [
    {
      "targetWord": "flower",
      "moment": "唱到flowers後",
      "title": "你看見哪張flower？先指給家人看",
      "question": "你看見哪張flower？先指給家人看，再說名稱。",
      "followUp": "先看、再指、再說，可用手掌開花。"
    },
    {
      "targetWord": "sun",
      "moment": "唱到sun後",
      "title": "指sun",
      "question": "請指sun，片後一起找一處比較明亮的地方。",
      "followUp": "在窗邊或室內找即可，避開直視光源。"
    },
    {
      "targetWord": "sky",
      "moment": "唱到sky後",
      "title": "找sky",
      "question": "請找sky，用手指表示天空的方向。",
      "followUp": "先指卡，片後再比較明亮處和陰影。"
    }
  ],
  "instructions": [
    "播放手指點數暖身開頭，先用一隻手逐一指數，再依孩子能力增加另一隻手。",
    "回播拍手或腳步節奏段，跟做幾下輕拍，孩子可用手指代替踏步，不需站高或脫鞋。",
    "停片輪流帶一個一到五的數量，家人跟著點數，再把雙手放好準備觀察。",
    "依 flower、sun、sky、tree 排圖卡；孩子輪流說或指第一張。",
    "播放〈Good Morning, It’s Such A Beautiful Day〉；聽到 sun、sky、flowers、trees 做停片指認。",
    "先找flower、sun、sky三張卡，再從窗邊或室內觀察較亮與陰影處，練I can see light and shade.；陰影比較是片後觀察，不用直視太陽。",
    "每人完成flower、sun、sky三次找卡，輪流指一處亮或暗的位置；沒有合適光影就用手掌遮住紙面示範。"
  ]
},
  "w11d2b1": {
    "title": "動起來｜天氣與冷熱分開看",
    "sentence": "Adventure 103: Let us check the weather outside.",
    "videoFocus": "從天氣歌辨認cloudy、sunny、rainy，片後用動作理解hot，分清天空狀態和冷熱感受。",
    "focus": "天氣觀察與片後冷熱動作。",
    "younger": "完成cloudy雙手畫雲、hot搧風手勢、sunny雙手表示光線三題跟做，說一個詞；看不到窗外就指圖卡，不必猜今天的天氣。",
    "older": "比較cloudy與sunny的天空，再用hot說冷熱感受，練Let us check the weather outside.；知道多雲也可能覺得熱，不能只看有沒有太陽就判定溫度。",
    "caregiverTip": "本課天氣圖卡即可；窗外觀察從家長安排的室內安全位置完成，看不到就用圖卡，不為這一課特地去陽台。馬鈴薯暖身用雙拳輪流輕疊、手指點數，不拿硬物敲打。天氣主課唱sunny、rainy、cloudy、snowy，hot是片後延伸；晴天是天空狀態，熱是感受，兩者不是同一個分類。搧風只是表示熱的動作，不代表現在真熱，不要用熱水或熱物體讓孩子試。",
    "pausePrompts": [
      {
        "moment": "主課多雲段後，第一題跟做時",
        "title": "雲把天空蓋住一些",
        "question": "請找cloudy，雙手在空中畫雲。圖中的天空有什麼特徵？你現在看到的天空也一樣嗎？",
        "followUp": "能看實景就比較，看不到就說這是圖卡；不把所有雲都說成會下雨。",
        "targetWord": "cloudy"
      },
      {
        "moment": "片後第二題冷熱動作時",
        "title": "熱和多雲可以一起嗎",
        "question": "請找hot，用手搧風表示覺得熱。如果天空是cloudy，也可能覺得hot嗎？",
        "followUp": "hot不是這首歌的必要歌詞；家長說明多雲也可能熱，動作是練詞，不要求孩子真的出汗。",
        "targetWord": "hot"
      },
      {
        "moment": "主課晴天段後，第三題跟做時",
        "title": "晴天不等於一定很熱",
        "question": "請找sunny，用雙手向外伸展表示光線。它是在說天空，還是在說摸到某件東西很燙？",
        "followUp": "sunny說天氣；hot表示熱，觀察只看圖或安全視線，不直接看太陽。",
        "targetWord": "sunny"
      }
    ],
    "instructions": [
      "播放馬鈴薯點數暖身一小段，雙拳輪流輕疊，跟著節奏數一、二、三、四。",
      "回播後半數量段，用手指繼續數，孩子也可只練四個；不拿真馬鈴薯或硬玩具互敲。",
      "停片交換帶領者，一人做慢節奏，一人跟數，再一起打開雙手停住。",
      "喝水，打開cloudy、hot、sunny、rainy圖卡，先說天空的樣子和身體覺得冷熱是兩件事。",
      "播放天氣主課cloudy、sunny或rainy短段，聽到一個詞就停片指卡；選兩種比較，不要求在歌中找hot。",
      "片後完成cloudy畫雲、hot搧風、sunny光線三題跟做，練Let us check the weather outside.；能安全看窗外才說實景，否則描述圖卡。",
      "輪流當天氣小報告員，先說天空或圖卡的樣子，再用自己的話說覺得冷熱；每位孩子完成三題並開口，不強迫所有人有同一種感受。"
    ]
  },
  "w11d2b2": {
  "title": "動起來｜跟著自然景物動一動",
  "sentence": "Adventure 104: These two trees are different sizes.",
  "videoFocus": "以花、樹、太陽、天空的動作帶回大小比較。",
  "focus": "以花、樹、太陽、天空的動作帶回大小比較。",
  "younger": "跟做 sky、tree、flower 三個安全動作，再指出一張圖卡。",
  "older": "先聽詞再做正確動作，並用底部對齊的兩件物品完成一次大小比較。",
  "caregiverTip": "用本頁圖卡或手勢即可，聽到flowers、trees時，先指出一朵flower、一棵tree，再說明歌曲唱的是多朵花、多棵樹。準備兩個高度不同的積木或鉛筆，比高矮時先把底部對齊。",
  "pausePrompts": [
    {
      "targetWord": "sky",
      "moment": "唱到sky後",
      "title": "用sky做一個張手動作",
      "question": "請用sky做一個張手動作，等家長說完才開始。",
      "followUp": "坐著也能張手，小幅度即可。"
    },
    {
      "targetWord": "tree",
      "moment": "唱到trees後",
      "title": "做tree伸枝",
      "question": "請做tree伸枝，再把手臂放高、放低比較高度。",
      "followUp": "這是動作練習，片後用物品底部對齊才正式比高矮。"
    },
    {
      "targetWord": "flower",
      "moment": "唱到flowers後",
      "title": "做flower開花",
      "question": "請做flower開花，能先小一點再大一點嗎？",
      "followUp": "用兩手幅度比較，不必蹲跳。"
    }
  ],
  "instructions": [
    "播放時鐘暖身動物往上、往下的短段，一根手指沿另一手臂移動，配合鐘聲輕拍一下或兩下。",
    "回播下一個動物短段，用手指重做上、下和鐘聲數量；不爬家具，也不模仿結尾撞倒。",
    "停片輪流當小動物和時鐘，孩子示範上、下，家人跟做，最後把手收好。",
    "依 sky、tree、flower、sun 做四個小動作；依照對齊物件比高矮的材料。",
    "播放〈Good Morning, It’s Such A Beautiful Day〉；聽到 sun、sky、flowers、trees 才停下做對應動作。",
    "跟做sky張手、tree伸枝、flower開花三個動作，再把兩個不同高度的積木當小樹，底部對齊比高矮，練These two trees are different sizes.。",
    "每人完成三次跟做並輪到一次比較；先說哪一個高或指認即可，較熟悉者說本課句型。"
  ]
},
  "w11d3b1": {
  "title": "配對日｜把花樹和天空配對",
  "sentence": "Adventure 105: Trees and flowers are plants.",
  "videoFocus": "把花和樹配到植物組，把太陽和天空配到天空組。",
  "focus": "把花和樹配到植物組，把太陽和天空配到天空組。",
  "younger": "把 tree、flower 放植物組，把 sun 放天空組，說一個詞即可。",
  "older": "用 trees and flowers are plants. 練複數，並說出為何 sun 不放植物組。",
  "caregiverTip": "用本頁圖卡或手勢即可，聽到flowers、trees時，先指出一朵flower、一棵tree，再說明歌曲唱的是多朵花、多棵樹。以圖卡觀察sun，不用直視太陽；每次暫停留三秒讓孩子自己回應。",
  "pausePrompts": [
    {
      "targetWord": "tree",
      "moment": "唱到trees後",
      "title": "tree屬於植物嗎？放到你選的一組。",
      "question": "tree屬於植物嗎？請放到你選的一組。",
      "followUp": "先聽分類理由，再引導植物組。"
    },
    {
      "targetWord": "flower",
      "moment": "唱到flowers後",
      "title": "flower和tree可以放同一組嗎？",
      "question": "flower和tree可以放同一組嗎？",
      "followUp": "以植物作本次分類規則，不只看顏色。"
    },
    {
      "targetWord": "sun",
      "moment": "唱到sun後",
      "title": "sun要和植物一起",
      "question": "sun要和植物一起，還是放天空景物組？",
      "followUp": "指卡並說原因，讓孩子自己調整分組。"
    }
  ],
  "instructions": [
    "播放雪人暖身短段，手指在身前點出三個想像鈕扣，再指自己鼻子的位置。",
    "回播帽子、圍巾和冷的短段，做空手穿戴與抱臂手勢，手勢小一點也可以。",
    "停片讓孩子選鈕扣、帽子或鼻子其中一個動作帶大家做，再用三下輕拍收束。",
    "依 tree、flower、sun、sky 擺兩個分類區；依照配對規則。",
    "播放〈Good Morning, It’s Such A Beautiful Day〉；聽到 sun、sky、flowers、trees 時暫停，把對應卡放到分類區。",
    "把tree、flower放植物一組，sun放另一組，練Trees and flowers are plants.；請孩子先說分類理由再由家長補充。",
    "每名孩子完成tree、flower、sun三次分類，另說一個詞或句子；加上sky時讓孩子決定放哪組並說原因。"
  ]
},
  "w11d3b2": {
  "title": "配對日｜聽早安歌找自然線索",
  "sentence": "Adventure 106: I can hear birds in the trees.",
  "videoFocus": "聽到自然詞就找卡，再由家長帶聲音線索遊戲。",
  "focus": "聽到自然詞就找卡，再由家長帶聲音線索遊戲。",
  "younger": "聽到 flower、sun、sky 任一詞就找卡，再做一次家長示範聲音配對。",
  "older": "分清影片唱到的詞和家長示範的聲音線索，自己出一題讓家人找卡。",
  "caregiverTip": "用本頁圖卡或手勢即可，聽到flowers、trees時，先指出一朵flower、一棵tree，再說明歌曲唱的是多朵花、多棵樹。以圖卡觀察sun，不用直視太陽；每次暫停留三秒讓孩子自己回應。",
  "pausePrompts": [
    {
      "targetWord": "flower",
      "moment": "唱到flowers後",
      "title": "先聽再找flower",
      "question": "先聽再找flower，這次不看家長指哪張。",
      "followUp": "留三秒選卡，提示後可重試。"
    },
    {
      "targetWord": "sun",
      "moment": "唱到sun後",
      "title": "聽到sun輕拍一次",
      "question": "聽到sun請輕拍一次，再指出太陽卡。",
      "followUp": "輕拍只標記聽到詞，不當新的計分獎勵。"
    },
    {
      "targetWord": "sky",
      "moment": "唱到sky後",
      "title": "找sky",
      "question": "請找sky，再換你說sky讓家人找。",
      "followUp": "片後鳥聲由家長另示範，不把天空說成發聲者。"
    }
  ],
  "instructions": [
    "播放冰淇淋暖身短段，空手做挖一球、遞給家人的動作，跟節奏輕拍。",
    "回播喜歡口味的短段，輪流指自己再指家人，孩子可說一個熟悉口味或表示不知道，不需背完清單。",
    "停片交換當點餐者和遞冰淇淋的人，再把想像湯匙放好；不必準備食物。",
    "按 flower、sun、sky、tree 排卡，先練「用耳朵聽詞、用眼睛找卡」。",
    "播放〈Good Morning, It’s Such A Beautiful Day〉；依歌曲的 sun、sky、flowers、trees 停片找卡。",
    "聽詞找flower、sun、sky三張卡，再由家長模仿鳥聲並指tree，練I can hear birds in the trees.；這是家長加入的聲音情境。",
    "每名孩子完成三次配對，再輪流出一個聲音或英文名稱的題目；分清歌中唱詞和家長的示範聲音。"
  ]
},
  "w11d4b1": {
  "title": "小老師｜帶家人認自然景物",
  "sentence": "Adventure 107: The sun and stars are in the sky.",
  "videoFocus": "孩子帶著花、樹、太陽、天空圖卡輪流當小老師。",
  "focus": "孩子帶著花、樹、太陽、天空圖卡輪流當小老師。",
  "younger": "指出 sun、sky、tree 三張卡，輪到時拿一張卡問家人。",
  "older": "用完整問題或句子帶家人答三題，並分清天空景物與地面植物。",
  "caregiverTip": "用本頁圖卡或手勢即可，聽到flowers、trees時，先指出一朵flower、一棵tree，再說明歌曲唱的是多朵花、多棵樹。以圖卡觀察sun，不用直視太陽；每次暫停留三秒讓孩子自己回應。",
  "pausePrompts": [
    {
      "targetWord": "sun",
      "moment": "唱到sun後",
      "title": "小老師用sun出一題",
      "question": "小老師用sun出一題，家人找到正確卡了嗎？",
      "followUp": "孩子核對後換角色，別替他立刻揭答案。"
    },
    {
      "targetWord": "sky",
      "moment": "唱到sky後",
      "title": "問家人哪張是sky",
      "question": "請問家人哪張是sky，再等他回答。",
      "followUp": "完整問句或單字搭手勢都可以。"
    },
    {
      "targetWord": "tree",
      "moment": "唱到trees後",
      "title": "用tree考家人：它長在地面還是飄在天空？",
      "question": "請用tree考家人：它長在地面還是飄在天空？",
      "followUp": "指卡比較，片後星星只是延伸詞。"
    }
  ],
  "instructions": [
    "播放香蕉暖身開頭，伸手指逐一數一到三，再按能力跟到六或十。",
    "回播左右移動的短段，雙手輕擺或指左右，坐著也能做；不要求同時數到二十和分左右。",
    "停片輪流帶一段熟悉數量，做剝想像香蕉的手勢，再慢慢坐好。",
    "依 sun、sky、tree、flower 排圖卡，指定孩子先當一次小老師。",
    "播放〈Good Morning, It’s Such A Beautiful Day〉；聽到 sun、sky、flowers、trees 就暫停，讓小老師選卡發問。",
    "孩子拿sun、sky、tree卡各出一題，家長回答；片後用手指做星星補充，練The sun and stars are in the sky.，不等歌中唱出star。",
    "完成sun、sky、tree三次問答後交換小老師與回答者，每人都有開口或指認機會；看太陽卡，不直視太陽。"
  ]
},
  "w11d4b2": {
  "title": "小老師｜看見雨，說出感受",
  "sentence": "Adventure 108: I see rain outside.",
  "videoFocus": "聽天氣歌辨認sunny、rainy，根據圖卡線索輪流問答。",
  "focus": "看見天氣的證據與I see句型。",
  "younger": "用hot、sunny、rainy三張卡回答，先指線索再說一詞；熱用搧風手勢，雨用指雨滴。",
  "older": "根據雨天卡練I see rain outside.，比較看到的雨滴與覺得熱；輪流出題、聽對方理由再核對。",
  "caregiverTip": "歌曲明列sunny、rainy、cloudy，hot另由體感卡延伸。讓孩子指雨滴再練I see rain outside.，指的是選定畫面或圖卡，不能代替窗外實況。I see描述看到的線索，不教成I see hot。收拾暖身保留，主課不再需要雷聲、驚嚇或幻想故事預告。",
  "pausePrompts": [
    {
      "moment": "片後用感受卡出第一題時",
      "title": "感覺和看見不同",
      "question": "請找hot，這是在說覺得熱，還是看到雨滴？你可以怎麼告訴家人？",
      "followUp": "用I feel hot.示範生活延伸，不稱為歌詞。",
      "targetWord": "hot"
    },
    {
      "moment": "主課sunny段後，孩子出題時",
      "title": "讓家人找線索",
      "question": "請選sunny卡問家人，再請他指出讓他判斷sunny的線索。",
      "followUp": "孩子核對有沒有指到陽光，不只接受家長搶答。",
      "targetWord": "sunny"
    },
    {
      "moment": "主課rainy段後",
      "title": "有雨滴才這樣說",
      "question": "請找rainy並指雨滴，再在這個圖卡情境說I see rain outside.。",
      "followUp": "真實窗外沒雨時，明說正在描述卡片。",
      "targetWord": "rainy"
    }
  ],
  "instructions": [
    "播放收拾暖身短段，一人拿起一件小玩具，另一人指出原本收放位置。",
    "回播放回物品的段落，換人收第二件；不為了配合歌詞先把整屋弄亂。",
    "停片輪流做拿起、放好手勢，確認通道清楚，再坐下準備看片。",
    "喝水，拿出四張天氣卡；說明今天當小老師，要先看線索再回答。",
    "播放〈How’s The Weather?〉，sunny、rainy後各停片指卡；cloudy可比較，hot另作體感問題。",
    "完成hot感受、sunny陽光、rainy雨滴三題，讓孩子指雨滴練I see rain outside.，不把圖卡說成當天實景。",
    "交換提問者與回答者，每人實際問或回答一題並核對線索；只觀看不算合作完成。"
  ]
},
  "w11d5b1": {
  "title": "任務日｜說出喜歡的花樹天空",
  "sentence": "Adventure 109: I like trees and flowers.",
  "videoFocus": "用花、樹、太陽、天空說出自己喜歡的自然景物。",
  "focus": "用花、樹、太陽、天空說出自己喜歡的自然景物。",
  "younger": "先由孩子本人依序找到 tree、flower、sun 三張卡，各完成一次複習；再從三張卡中選一張喜歡的卡，主動說出該目標詞，作為開口任務。",
  "older": "說 I like trees and flowers. 或自己的完整喜好，解釋 trees／flowers 與單數圖卡的關係。",
  "caregiverTip": "用本頁圖卡或手勢即可，聽到flowers、trees時，先指出一朵flower、一棵tree，再說明歌曲唱的是多朵花、多棵樹。以圖卡觀察sun，不用直視太陽；每次暫停留三秒讓孩子自己回應。",
  "pausePrompts": [
    {
      "targetWord": "tree",
      "moment": "回看trees段後",
      "title": "你喜歡tree嗎？先找對卡",
      "question": "你喜歡tree嗎？請先找對卡，再說喜好。",
      "followUp": "沒有唯一喜好答案，先辨認再表達。"
    },
    {
      "targetWord": "flower",
      "moment": "回看flowers段後",
      "title": "找flower",
      "question": "請找flower，你想介紹哪一個花的特徵？",
      "followUp": "可說顏色或用中文描述，再跟說flower。"
    },
    {
      "targetWord": "sun",
      "moment": "回看sun段後",
      "title": "從打亂的卡中找到sun",
      "question": "請從打亂的卡中找到sun，說一個喜歡它的理由或感受。",
      "followUp": "不替孩子決定感受，也不直視太陽。"
    }
  ],
  "instructions": [
    "播放聖誕暖身彈球短段，用空手上下輕拍表示彈球，不需真的球。",
    "回播轉動或騎車手勢短段，坐著轉手腕或輪流動腳；不拿繩子追跑。",
    "停片輪流選一個玩具動作讓家人猜，最後說這是想像遊戲，不需收到禮物才完成。",
    "依 tree、flower、sun、sky 擺卡，每位孩子先選一張喜歡的景物。",
    "播放〈Good Morning, It’s Such A Beautiful Day〉；以歌詞的 sun、sky、flowers、trees 作停片複習。",
    "打亂tree、flower、sun卡，先憑記憶找出名字，再選喜歡的景物練I like trees and flowers.；若喜好不同，改用自己選的詞。",
    "每名孩子完成三次複習，再當一次自然導覽員介紹圖卡；可以用中文說喜歡的理由，不代替孩子選答案。"
  ]
},
  "w11d5b2": {
  "title": "任務日｜完成四個自然線索",
  "sentence": "Adventure 110: I found three things in nature.",
  "videoFocus": "蒐集花、太陽、天空、樹四張不同的自然線索。",
  "focus": "蒐集花、太陽、天空、樹四張不同的自然線索。",
  "younger": "找出 flower、sun、sky 三張不同卡，每張只算一次。",
  "older": "完成四張不同自然線索，並說明用圖卡時是在室內模擬觀察。",
  "caregiverTip": "用本頁圖卡或手勢即可，聽到flowers、trees時，先指出一朵flower、一棵tree，再說明歌曲唱的是多朵花、多棵樹。以圖卡觀察sun，不用直視太陽；每次暫停留三秒讓孩子自己回應。",
  "pausePrompts": [
    {
      "targetWord": "flower",
      "moment": "唱到flowers後",
      "title": "找到第一張線索flower",
      "question": "請找到第一張線索flower，伸一根手指記住。",
      "followUp": "同一張重複出現不再加一次。"
    },
    {
      "targetWord": "sun",
      "moment": "唱到sun後",
      "title": "找到第二張sun",
      "question": "請找到第二張sun，它和flower是同一張卡嗎？",
      "followUp": "找不同景物，核對後伸第二根手指。"
    },
    {
      "targetWord": "sky",
      "moment": "唱到sky後",
      "title": "找到第三張sky",
      "question": "請找到第三張sky，現在找到幾種不同景物？",
      "followUp": "三張配three，tree留作額外第四張挑戰。"
    }
  ],
  "instructions": [
    "播放神秘箱暖身提問短段，雙手合起像盒子，再隨節奏輕敲手背。",
    "回播提問後停片，家長可藏一件現有大玩具讓孩子猜，也可直接做開盒手勢，不宣稱影片一定藏著花或太陽。",
    "交換開盒者和猜測者，揭曉後依實際物品說答案；猜錯可再看，不把猜中當作學習完成。",
    "依 flower、sun、sky、tree 排四張卡，規則是每張只算一個不同線索。",
    "播放〈Good Morning, It’s Such A Beautiful Day〉；聽到 sun、sky、flowers、trees 就停片蓋一個線索。",
    "依序找到flower、sun、sky三張不同卡，每找到一張伸一根手指，練I found three things in nature.；第四張tree是額外挑戰，不混入three的計數。",
    "每名孩子完成三次複習及一次輪流操作，核對三張是否不同；室內圖卡代表觀察情境，不說一定實際到過戶外。"
  ]
}
};

const twelfthWeekReviewedGuidance: Record<string, ReviewedTeachingGuidance> = {
  "w12d1b1": {
  "title": "探索日｜字母唱名與圖片配對",
  "sentence": "Adventure 111: C is for cat, and D is for dog.",
  "videoFocus": "從主課的 A、B、C 圖詞連結開始，再以 dog 圖卡延伸 D，練 C 與 D 的圖片配對。",
  "focus": "C/cat 與片後 D/dog 配對，分清字母名與單字。",
  "younger": "完成c-cat、d-dog、a-apple三題指認，說cat、dog或apple其中一個詞；字母由家長指著說，不要求一次背完。",
  "older": "從C、D、A字母唱名連到cat、dog、apple，練C is for cat, and D is for dog.，再換一張圖說出字母與單字；字母名字與單字開頭的聲音分開聽。",
  "caregiverTip": "直接用本課四張圖卡，不必列印字母表或準備真動物。萬聖節躲貓貓只用雙手輕遮眼再打開，不用關燈或突然嚇人；孩子不喜歡可停片，由家長慢做。主課直接唱出 apple、ball、cat；D 配的是 doll，不是 dog。先在影片認 C/cat，再以本課狗圖卡延伸 D/dog，明說同一字母可以帶出不同單字。先練C、D、A三個即可；C的字母名字不是cat開頭那個短音，先聽圖卡的完整單字，不以會唱字母歌當成已會拼讀。",
  "pausePrompts": [
    {
      "moment": "字母歌唱到C附近停片，片後第一題時",
      "title": "字母與動物配起來",
      "question": "請找c-cat。先聽家長說字母C，再按圖卡聽cat；哪一張圖是貓？",
      "followUp": "家長指著字母與圖分別示範，孩子指對圖或說cat即可；不要把字母唱名當作單字的字首音。",
      "targetWord": "c-cat"
    },
    {
      "moment": "片後第二題比較兩張動物圖時",
      "title": "C和D各代表誰",
      "question": "請找d-dog，再和c-cat放在一起看。哪一張是dog？你能說D is for dog嗎？",
      "followUp": "影片 D 配 doll；家長用本課狗圖卡延伸 D/dog。較小孩子只說 dog，不要求回影片找狗。",
      "targetWord": "d-dog"
    },
    {
      "moment": "片後第三題換成水果時",
      "title": "同一玩法換一張圖",
      "question": "請找a-apple。它是動物還是水果？這張圖旁邊的字母是什麼？",
      "followUp": "孩子先指蘋果，再由家長示範A與apple；回答分類是片後延伸，不冒充影片中的題目。",
      "targetWord": "a-apple"
    }
  ],
  "instructions": [
    "播放萬聖節躲貓貓暖身短段，雙手輕遮眼再打開，看到小貓時指給家人看。",
    "回播一段重複節奏，輪流慢慢做遮住、打開的動作；不突然大叫，也不關燈。",
    "停片讓孩子帶一次躲貓貓，家人回應看到了；不喜歡遮眼就把雙手放胸前開合。",
    "喝水，打開c-cat、d-dog、a-apple、b-ball圖卡，先各聽一次單字，預告影片練字母，片後練配對。",
    "播放 A Is For Apple 的開頭字母與圖詞段，在 C 後停片配 c-cat；到 D 時先辨認片中的 doll，再由家長拿 d-dog 圖卡示範另一個 D 開頭的詞，不把 doll 說成 dog。",
    "用圖卡完成c-cat、d-dog、a-apple三題指認，練C is for cat, and D is for dog.，再輪流指出字母和它代表的圖。",
    "孩子當出題者，選一張圖讓家長回答，再交換；每位孩子自己完成三題與一次開口後才記錄，不把家長示範算進孩子成果。"
  ]
},
  "w12d1b2": {
  "title": "探索日｜慢慢找出A到E",
  "sentence": "Adventure 112: I can point to A and then to B.",
  "videoFocus": "用慢速字母歌辨認A、B、C、D、E的順序，片後保留dog、apple、ball三題圖卡辨認。",
  "focus": "A到E的順序與圖卡複習。",
  "younger": "完成d-dog、a-apple、b-ball三題指認並說一個詞；從A與B選對一個字母即可，E先由家長指著帶讀。",
  "older": "看A B C D E，依順序指認並從中選一個回到圖卡，練I can point to A and then to B.；再找D後面是哪一個字母，不要求一次記住整套字母。",
  "caregiverTip": "使用本課圖卡與此處文字A B C D E即可，沒有E圖卡也可直接指文字，不需另找教材。躲貓貓暖身輪流遮眼、打開，手不要壓眼睛。主課唱字母名字，先停在A到E；四張既有單字圖卡用來片後複習，dog等單字不必出現在字母歌。E在順序活動中認字形與唱名，不臨時新增沒有圖片的E單字考題，也不以一次唱順五個字母作年幼孩子必過條件。",
  "pausePrompts": [
    {
      "moment": "字母歌A到E短段後，片後第一題時",
      "title": "先找到D代表的圖",
      "question": "請找d-dog，聽dog並指出它的字母D。看A B C D E，D後面是哪個字母？",
      "followUp": "較小孩子先完成dog指認；家長指E帶讀，這是字母順序延伸，不要求E的單字圖。",
      "targetWord": "d-dog"
    },
    {
      "moment": "片後第二題回到順序開頭時",
      "title": "從A開始找",
      "question": "請找a-apple，再在A B C D E中指出A。它前面還有其他字母嗎？",
      "followUp": "只說這一排的開頭是A，不把蘋果本身當成字母；孩子可用手指回答。",
      "targetWord": "a-apple"
    },
    {
      "moment": "片後第三題找A的下一位時",
      "title": "A後面輪到誰",
      "question": "請找b-ball，再看A B C D E。指完A之後，下一個要指哪裡？",
      "followUp": "示範依序指A、B，再讓孩子自己試；片後用I can point to A and then to B.說一次。",
      "targetWord": "b-ball"
    }
  ],
  "instructions": [
    "播放躲貓貓暖身開頭，雙手輕遮眼再打開，看到貓咪時用手指回應。",
    "回播一段，改成家長先做、孩子接著做，慢慢輪流，不必加其他動作口令。",
    "停片讓孩子決定何時打開雙手，家長等他示範後再跟做，練輪流與等待。",
    "喝水，打開四張字母單字圖卡，再指此處的A B C D E，預告今天慢慢找到前五個字母。",
    "播放 The Super Simple Alphabet Song (Uppercase) 的 A 到 E 段，孩子跟指 A B C D E；在 D、E 之間停一下，由家長慢讀兩個不同的字母名字，不要求追原唱速度。",
    "完成d-dog、a-apple、b-ball三題指認，練I can point to A and then to B.；再沿A B C D E逐一指過，年幼孩子先指A、B即可。",
    "家長指一個字母，孩子找相應圖卡；輪到E時只指文字、帶讀字母，不要求不存在的圖卡。各自完成三題及開口，最後說今天記得哪個字母。"
  ]
},
  "w12d2b1": {
  "title": "動起來｜字母慢拍與圖卡手勢",
  "sentence": "Adventure 113: I can say a letter and show its picture.",
  "videoFocus": "用 The Alphabet Chant 第一輪慢拍辨字母，再做 apple、ball、cat 三個圖卡手勢，由孩子輪流領隊。",
  "focus": "字母唱名節奏與圖卡手勢。",
  "younger": "完成a-apple雙手捧水果、b-ball雙手圍圓、c-cat手指作鬍鬚三題跟做，說其中一個單字；都能坐著完成。",
  "older": "跟慢速字母段拍節奏，再用A、B、C指示三個圖卡手勢，練I can say a letter and show its picture.；先說清楚再考慮加快，不用追上最快一輪。",
  "caregiverTip": "本課圖卡與雙手即可。問候暖身可以用揮手、摸肚子或休息手勢表示歌中的感受；孩子可以說自己真的累，不要求每個人都回答開心。字母節奏歌逐輪加快，家長可停在第一輪，慢說比追速度重要。apple、ball、cat手勢是片後自訂配對，不是影片必有的動作；手不碰臉、空手做捧水果，不需真的吃東西。唱名和字首音是兩件事，這次先完成字母與圖配對。",
  "pausePrompts": [
    {
      "moment": "字母節奏歌第一輪後，片後第一題時",
      "title": "用手表示蘋果",
      "question": "請找a-apple，雙手空捧一顆蘋果，再指A。你能先說apple，再跟著家長說字母嗎？",
      "followUp": "不用真食物，動作可以坐著做；先接住孩子單字回答，不要求照歌曲速度。",
      "targetWord": "a-apple"
    },
    {
      "moment": "片後第二題換圖卡手勢時",
      "title": "圓圓的是哪一張",
      "question": "請找b-ball，用雙手圍出球的形狀。家長說B時，你能指圖或再做一次手勢嗎？",
      "followUp": "球形手勢只是記憶提示，不把所有圓形都叫ball；圖與字母各指出一次。",
      "targetWord": "b-ball"
    },
    {
      "moment": "片後第三題慢慢跟做時",
      "title": "清楚比快速更重要",
      "question": "請找c-cat，用手指在臉旁作鬍鬚。若音樂太快，你想先停下慢說，還是再聽一次？",
      "followUp": "讓孩子選慢練或重聽，再完成cat動作及開口；不把速度當成理解證明。",
      "targetWord": "c-cat"
    }
  ],
  "instructions": [
    "播放問候暖身一段，面向家人揮手，聽到問候就用揮手或簡短回應加入。",
    "回播感受段，空手做休息或摸肚子的手勢，再問孩子自己現在感覺如何。",
    "停片輪流問候，孩子可說真的感受或用動作表示；家長回應後交換，不強迫回答很好。",
    "喝水，打開a-apple、b-ball、c-cat、d-dog圖卡，先示範捧水果、圍球、鬍鬚三種小手勢。",
    "播放字母節奏歌第一輪，輕拍穩定節奏；開始太快就停片，回到慢速一段跟指字母，不要求每輪加速。",
    "完成a-apple捧水果、b-ball圍球、c-cat鬍鬚三題跟做，練I can say a letter and show its picture.；每個手勢後指出相應圖卡與字母。",
    "孩子選一張卡作領隊，說單字或字母並做手勢，家人跟做後換人；各自完成三題及一次開口，結束前選一個還想慢練的字母。"
  ]
},
  "w12d2b2": {
  "title": "動起來｜F到J的五個位置",
  "sentence": "Adventure 114: Let us count five letters in a row.",
  "videoFocus": "在完整字母節奏歌第一輪聽 F 到 J，片後逐一指數五個位置，再做 ball、cat、dog 手勢與接棒。",
  "focus": "F到J的順序與五個位置點數。",
  "younger": "完成b-ball圍球、c-cat鬍鬚、d-dog雙手作垂耳三題跟做，說一個詞；看F G H I J時跟家長一個位置點一下，不要求獨自讀完。",
  "older": "依序指F G H I J並逐一數到五，練Let us count five letters in a row.；分清字母名字和數量，換指的起點也要每個只數一次。",
  "caregiverTip": "只用本課圖卡與文字F G H I J，不需買字母教具。農場暖身挑一種動物叫聲小聲模仿，慢段即可，不把歌曲加速當比賽。The Alphabet Chant 主課唱字母名字，後輪會加速，先取第一輪，片後才把F到J逐一點數成五個位置；數到五不表示第五個字母叫five。ball、cat、dog屬B、C、D的既有複習，並不拿它們代表F、G、H。圖卡手勢和F到J點數分兩輪做，年幼孩子可以家長指、孩子跟點。",
  "pausePrompts": [
    {
      "moment": "字母節奏歌第一輪後，圖卡跟做第一題時",
      "title": "先複習球的手勢",
      "question": "請找b-ball，雙手圍成球，再指出字母B。這張圖是複習B，還是今天順序活動裡的F？",
      "followUp": "先完成ball手勢；家長說明圖卡是B的複習，F到J在下一輪看文字，不亂配字母。",
      "targetWord": "b-ball"
    },
    {
      "moment": "片後第二題圖卡與點數分輪時",
      "title": "做完貓咪再數位置",
      "question": "請找c-cat，手指作鬍鬚。完成後看F G H I J，家長每指一個字母，你能伸一根手指嗎？",
      "followUp": "先完成cat跟做，再逐一點數；每個字母對應一次計數，不以字母外形的筆畫數代替。",
      "targetWord": "c-cat"
    },
    {
      "moment": "片後第三題與輪流點數時",
      "title": "五個位置都數到了嗎",
      "question": "請找d-dog，雙手在頭旁作垂耳。再看F G H I J，輪到你時指一個還沒數的位置，最後共有幾個？",
      "followUp": "先完成dog手勢，再依序輪流指數到五；換人不能把同一位置再算一次，較小孩子由家長帶指。",
      "targetWord": "d-dog"
    }
  ],
  "instructions": [
    "播放農場動物暖身慢段，選一種聽得到的叫聲，用小音量跟說並做簡單動物手勢。",
    "回播另一種動物短段，先聽再模仿，家長可問兩種聲音是否相同；不追歌曲加速。",
    "停片輪流當動物與聽眾，孩子選一個叫聲，家人跟說後換人；不要求喊得大聲才算參與。",
    "喝水，打開b-ball、c-cat、d-dog、a-apple圖卡，再看文字F G H I J，說明先複習圖卡，後面再數五個字母位置。",
    "播放 The Alphabet Chant 第一輪，聽到 F 到 J 時跟指 F G H I J；停片後由家長慢讀並逐格點數，快段不必接續，不把字母唱名唱成數字。",
    "先完成b-ball圍球、c-cat鬍鬚、d-dog垂耳三題跟做；再逐一指F G H I J、每個數一次，練Let us count five letters in a row.。",
    "輪流指下一個位置，家長和孩子各輪到一次，確認沒有重數、漏數；較小孩子跟指，較大孩子說字母和總數，每位孩子實際操作後才記錄。"
  ]
},
  "w12d3b1": {
  "title": "配對日｜字母圖詞與兩組分類",
  "sentence": "Adventure 115: Cats and dogs are animals; apples are fruit.",
  "videoFocus": "看 C/cat 與 A/apple 的圖詞連結，再加入 D/dog 圖卡，把貓狗與水果分成兩組。",
  "focus": "字母圖詞配對後，依動物與水果分類。",
  "younger": "完成c-cat、d-dog、a-apple三題分類，用指向或說動物、水果回答，並說一個英文詞；字母遊戲只跟一小段。",
  "older": "把 C/cat、D/dog、A/apple 配好，再將三張圖分成動物與水果並解釋理由，練 Cats and dogs are animals; apples are fruit.；知道影片 doll 與本課 dog 都可連到 D，但物件不同。",
  "caregiverTip": "本課圖卡即可；分類時家長一手代表動物、一手代表水果，孩子指卡後再指一邊。聖誕暖身做期待、雙手接禮物的空手動作，不說明天真是聖誕節，也不承諾禮物。主課 apple、cat 可直接對照；影片 D 配 doll，狗是家長另加的 D/dog 圖卡延伸。分類依圖中物件，不按字母形狀或顏色分組。",
  "pausePrompts": [
    {
      "moment": "主課 A 到 D 圖詞段後，開始兩組分類時",
      "title": "先替貓找到一組",
      "question": "請找c-cat。若家長一手代表動物、一手代表水果，你會把cat分到哪一邊？",
      "followUp": "先讓孩子指卡再選組；字母C與貓是兩種描述，這輪分類的是圖片內容。",
      "targetWord": "c-cat"
    },
    {
      "moment": "片後第二題加入狗時",
      "title": "狗能和貓同組嗎",
      "question": "請找d-dog，再看c-cat。dog和cat可以放在同一組嗎？為什麼？",
      "followUp": "依動物分類，不只因兩張圖顏色相近；年幼孩子指出同一邊即可。",
      "targetWord": "d-dog"
    },
    {
      "moment": "片後第三題加入蘋果時",
      "title": "換一組有什麼理由",
      "question": "請找a-apple。它應和兩隻動物同組，還是水果一組？你能說apple嗎？",
      "followUp": "用圖卡分類，不需拿真食物；片後示範句型，孩子只說一個詞也可參與。",
      "targetWord": "a-apple"
    }
  ],
  "instructions": [
    "播放期待聖誕節的暖身短段，雙手抱胸表示期待，再空手做接到禮物的動作。",
    "回播家人相聚的短段，用揮手或向家人點頭跟節奏，不需真的準備禮物。",
    "停片輪流說一件自己期待的事，家長用動作回應；說明歌中的節日是故事時間。",
    "喝水，打開c-cat、d-dog、a-apple、b-ball圖卡，家長用兩手分別表示動物與水果兩組。",
    "播放 A Is For Apple 的 A 到 D 圖詞段，聽到 apple 與 cat 時對照圖卡；說明 D/doll 後另指 dog，讓孩子知道不是把影片娃娃叫成狗。停片再進兩組分類。",
    "片後完成cat、dog、apple三題分類，練Cats and dogs are animals; apples are fruit.；指出分類依據是圖片內容。",
    "孩子選一張圖出題，家長故意先詢問應分哪組，讓孩子指認並說理由；輪流完成三題和開口後才記錄。"
  ]
},
  "w12d3b2": {
  "title": "配對日｜同一張圖的中英文名稱",
  "sentence": "Adventure 116: The words sound different, but the picture is the same.",
  "videoFocus": "先聽主課 apple、ball 英文圖詞，片後加入 dog，比較中文與英文聲音不同卻指同一張圖。",
  "focus": "英中名稱的聲音與意思比較。",
  "younger": "完成d-dog、a-apple、b-ball三題名稱配圖，聽中文或英文都指同一張，並模仿一個英文詞；不要求解釋音節。",
  "older": "每張圖先聽中文、再聽英文，說聲音不同但指同一樣東西，練The words sound different, but the picture is the same.；中文名稱、英文單字及英文字母唱名分開。",
  "caregiverTip": "本課圖卡即可，中文名稱由家長說「狗、蘋果、球」，英文用圖卡播放；不顯示注音，也不把英文字母當中文的發音符號。香蕉暖身用手指點數及空手剝香蕉，不拿食物邊走邊吃。主課直接教 apple、ball 等英文圖詞；D 配 doll，dog 另用本頁圖卡延伸。中文名稱由家長在片後帶讀；可以聽出不同而指同圖，不用模仿某一口音才算成功。暖身若當次無法播放，保留原入口，由家長帶同樣點數與手勢，不把替代帶做說成已播放影片。",
  "pausePrompts": [
    {
      "moment": "字母歌短段後，片後第一題時",
      "title": "兩種說法指向哪一張",
      "question": "請找d-dog。家長先說「狗」，再播放dog，兩次你指的是同一張圖嗎？",
      "followUp": "先聽詞再指圖，對比完整名稱，不把字母D的名字等同dog。",
      "targetWord": "d-dog"
    },
    {
      "moment": "片後第二題換水果時",
      "title": "聲音不同也能同一個意思",
      "question": "請找a-apple。聽「蘋果」和apple，聲音完全一樣嗎？它們在這一題說的是同一樣東西嗎？",
      "followUp": "孩子可以搖頭表示聲音不同，再指同圖；不用計算音節或以中文音去拼英文。",
      "targetWord": "a-apple"
    },
    {
      "moment": "片後第三題輪流命名時",
      "title": "換家人用另一種語言",
      "question": "請找b-ball。一人說「球」，另一人說ball，最後各自指出圖卡。你們找到同一張了嗎？",
      "followUp": "實際輪到每位孩子說或指才記錄；家長可示範但不代替孩子的回答。",
      "targetWord": "b-ball"
    }
  ],
  "instructions": [
    "播放香蕉點數暖身短段，手指逐一數到三或五；若影片不可用，家長直接帶同樣點數。",
    "回播或由家長慢帶，雙手向兩側輕移，空手做剝香蕉動作，不需真食物。",
    "停下交換帶領者，一人伸手指、一人跟數，再一起把手放好。",
    "喝水，打開d-dog、a-apple、b-ball、c-cat圖卡，預告同一張圖可以有中文和英文兩種名稱。",
    "播放 A Is For Apple 開頭圖詞段，聽 apple、ball 後各指一次本課圖卡；遇 D/doll 說明它不是狗，片後另聽 dog。中文名稱比較由家長帶領，不要求影片教中文。",
    "片後完成狗/dog、蘋果/apple、球/ball三題名稱配圖，練The words sound different, but the picture is the same.；比較聲音與意思，不以中文音代替英語。",
    "家長和孩子輪流用兩種語言命名同圖，再指出共同的圖卡；各自完成三題與一次輪流操作，依實際參與記錄。"
  ]
},
  "w12d4b1": {
  "title": "小老師｜字母與圖片輪流問答",
  "sentence": "Adventure 117: Which picture starts with the letter A?",
  "videoFocus": "看 A/apple、B/ball、C/cat 的連結後，孩子輪流以 A、B、C 出題，等待家人選圖回答。",
  "focus": "跨歌曲字母辨認與輪流問答。",
  "younger": "完成a-apple、b-ball、c-cat三題問答，以指圖或說單字回答；當小老師可指一張圖請家長命名。",
  "older": "從A、B、C唱名回到對應圖卡，練Which picture starts with the letter A?，再把問題換成B或C；問完等對方回答，不搶先代答。",
  "caregiverTip": "用現有圖卡即可。捕魚暖身用手指點數、雙手作魚游走，不咬手指，不用魚鉤或水盆。主課 A、B、C 各有 apple、ball、cat 圖詞，停片後由孩子選一個字母問家人。唱名不等於字首音，不臨時要求拼完整單字；D 在片中是 doll，本課 dog 如加練須說明是另一個 D 例詞。",
  "pausePrompts": [
    {
      "moment": "字母主課短段後，片後第一題時",
      "title": "A的問題讓誰回答",
      "question": "請找a-apple。家長問Which picture starts with the letter A?，你會指哪張？",
      "followUp": "先讓孩子選，再一起說apple；年幼孩子指圖即可，不必複述整句問題。",
      "targetWord": "a-apple"
    },
    {
      "moment": "片後第二題讓孩子出題時",
      "title": "把問題換成B",
      "question": "請找b-ball。現在輪到你問字母B代表哪張圖，先讓家人回答，再一起核對。",
      "followUp": "孩子可只說B或指卡當題目；出題和作答輪流進行，不用搶答。",
      "targetWord": "b-ball"
    },
    {
      "moment": "片後第三題比較兩張圖時",
      "title": "C和B怎麼分",
      "question": "請找c-cat，再看b-ball。若家長說C，你會選貓還是球？你是看字母還是只看顏色？",
      "followUp": "指出cat的起首字母，圖案顏色不是答案依據；答錯時提示後再讓孩子自己選。",
      "targetWord": "c-cat"
    }
  ],
  "instructions": [
    "播放捕魚點數暖身短段，用手指逐一數到五，再把雙手併成魚游動。",
    "回播放魚走的段落，手指接著數，雙手向外輕移表示放開；不模仿咬人。",
    "停片輪流帶一個點數或魚游手勢，家人跟做，再把手放好準備當小老師。",
    "喝水，打開a-apple、b-ball、c-cat、d-dog圖卡，家長先示範問完等待回答。",
    "播放 A Is For Apple 的 A、B、C 段，各指本課對應圖；停片請孩子選一張先想好要問哪個字母，不由家長先替他說答案。",
    "片後完成apple、ball、cat三題問答，練Which picture starts with the letter A?，把問題各換一個字母，輪流當提問者。",
    "最後讓每位孩子選一題問家長，再自己回答一題；提示後重答可記實際完成，不能只看家人答就勾自己完成。"
  ]
},
  "w12d4b2": {
  "title": "小老師｜找到L與熟悉的字母",
  "sentence": "Adventure 118: I found the letter L in the word ball.",
  "videoFocus": "從L的主課認字形並聽字音示範，片後在ball裡找l，再用cat與dog練字母尋找問答。",
  "focus": "L字形尋找與原圖卡複習。",
  "younger": "完成b-ball、c-cat、d-dog三題問答，先指圖再跟家長找字母；用手描L的一直一橫，說一個圖卡單字。",
  "older": "比較大寫L與小寫l，在ball中指出兩個l，練I found the letter L in the word ball.；知道b是ball起首、l在後面，不把所有出現l的詞說成L開頭。",
  "caregiverTip": "用本課圖卡及此處文字L l、ball、cat、dog即可，若眼前已有書或包裝也可加找一次，不必離開家長或另找教材。遊樂場躲貓貓只在原地做手勢，不爬家具。官方主課以大寫 L 為焦點；小寫 l 與 ball 的對照由家長片後補充，不是 B/C/D 歌；先聽影片中的示範，片後才複習原圖卡。ball有兩個小寫l，外形和大寫L不同；l位於詞尾不等於球以L開頭，字形尋找也不代表已學會讀所有含l的單字。",
  "pausePrompts": [
    {
      "moment": "L主課短段後，片後第一題時",
      "title": "球的單字藏著什麼",
      "question": "請找b-ball。看ball，前面是b，後面有幾個l？再看L l，你能指它們嗎？",
      "followUp": "年幼孩子先認球和L；較大孩子指出兩個l，不把B的圖卡改成L開頭圖卡。",
      "targetWord": "b-ball"
    },
    {
      "moment": "片後第二題檢查貓的文字時",
      "title": "找不到也可以說沒有",
      "question": "請找c-cat。看cat，裡面有l嗎？如果沒有，能指出開頭的c嗎？",
      "followUp": "不為了配合家長而亂指；如實說沒有也是完整回答，再指原圖核對cat。",
      "targetWord": "c-cat"
    },
    {
      "moment": "片後第三題讓孩子帶搜尋時",
      "title": "換狗的單字找一次",
      "question": "請找d-dog。看dog，你找到d還是l？輪到你請家人指一個字母。",
      "followUp": "用眼前文字即可，不需新卡；先辨字形，字音跟原片或完整單字示範，不用猜音。",
      "targetWord": "d-dog"
    }
  ],
  "instructions": [
    "播放遊樂場躲貓貓暖身短段，在原地輕遮眼再打開，看到貓咪時指給家長看。",
    "回播一段，把動作改小，坐著也能跟節奏開合雙手，不模仿攀爬遊具。",
    "停片輪流藏起手掌再露出一根手指，家人等看見後回應，練仔細觀察。",
    "喝水，打開b-ball、c-cat、d-dog、a-apple圖卡，再看L l與ball，預告找字母而不是換掉單字的開頭。",
    "播放 The L Song (Uppercase) 的 L 示範段，看到大寫 L 就停片用手描一直一橫，再聽字音示範；片後才把本頁小寫 l 放旁邊比較，不要求影片出現 ball。",
    "片後完成ball找兩個l、cat找c並判斷無l、dog找d三題問答，練I found the letter L in the word ball.；用眼前字串核對，不憑印象。",
    "孩子選ball、cat或dog請家人找一個字母，接著自己也回答一題；若順手有書本可找L，沒有就留在本頁完成，不以找到外部物品作領獎條件。"
  ]
},
  "w12d5b1": {
  "title": "任務日｜熟悉字母與圖卡複習",
  "sentence": "Adventure 119: I can match a familiar letter to its picture.",
  "videoFocus": "回看 A/apple、C/cat，片後加入 D/dog，完成本週三張熟悉圖卡配對與自主領讀。",
  "focus": "C、D、A 熟悉圖卡配對與待練字母回顧。",
  "younger": "完成 c-cat、d-dog、a-apple 三題熟悉圖卡複習，先指圖再說一個詞；家長一次只問一個字母。",
  "older": "自行將 C/D/A 配回 cat/dog/apple，練 I can match a familiar letter to its picture.；能說明 D/doll 是影片例詞、D/dog 是本課延伸，再挑一個想重聽的字母。",
  "caregiverTip": "點數暖身用原地踏步或手指輕拍跟數，年幼孩子先做五下。主課改回本週熟悉的圖詞；apple、cat 在歌中可核對，D 在影片配 doll，家長片後用 dog 說明另一個 D 例詞。字母名、字音與完整單字分開聽；孩子選想重聽的字母，不把看過影片算成學會，也不新增陌生範圍考題。",
  "pausePrompts": [
    {
      "moment": "熟悉圖詞段後，第一題回顧時",
      "title": "回到熟悉的貓",
      "question": "請找c-cat，指出C再說cat。你能把這張圖和剛才的字母配起來，再請家人換個字母問你嗎？",
      "followUp": "先讓孩子自己連結 C 與 cat，再換人提問；唱過整首不等於這題已答對。",
      "targetWord": "c-cat"
    },
    {
      "moment": "片後第二題比較熟悉字母時",
      "title": "換成狗還認得嗎",
      "question": "請找d-dog，再和c-cat比較。你能把D配到dog，C配到cat嗎？",
      "followUp": "先指字形再指圖，讓孩子自己完成；說明影片 D 的 doll 和圖卡 dog 不同，但都以 D 起首。",
      "targetWord": "d-dog"
    },
    {
      "moment": "片後第三題換類別時",
      "title": "熟悉的水果也能配",
      "question": "請找a-apple。你能指A並說apple，再說自己想重聽哪一個字母嗎？",
      "followUp": "完成蘋果題後讓孩子選待練內容；想重聽不代表答錯，也不捏造已掌握新字音。",
      "targetWord": "a-apple"
    }
  ],
  "instructions": [
    "播放點數動作暖身一小段，原地踏步或手指輕拍，先數五下再停。",
    "回播後依能力繼續點數到十，動作維持小而穩，不需追完整二十下。",
    "停片讓孩子帶一段點數，家人跟做後休息，確認每一下只數一次。",
    "喝水，打開 c-cat、d-dog、a-apple、b-ball 圖卡，先讓孩子各選一張記得的圖，準備回看字母和圖片怎麼配。",
    "回看 A Is For Apple 的 A 到 D 圖詞段，讓孩子在 A 或 C 處要求暫停並指圖；D/doll 與原 dog 圖卡分開示範，再請孩子自己找 D。",
    "完成 cat、dog、apple 三題複習，練 I can match a familiar letter to its picture.；每次先指出字母，再自己選對應圖卡，需要提示就再做一次。",
    "各自選一張最熟的卡帶家人說，再選一個想重聽的字母；三題和開口依實際完成勾選，不把看過新字母自動算成學會。"
  ]
},
  "w12d5b2": {
  "title": "任務日｜安靜回顧A到M",
  "sentence": "Adventure 120: We can take turns naming our letters.",
  "videoFocus": "用字母歌回顧A到M並選熟悉字母輪流命名，片後完成dog、apple、ball三題本週圖卡複習。",
  "focus": "A到M回顧與各自待練目標。",
  "younger": "完成d-dog、a-apple、b-ball三題複習，說一個單字；在A到M中先指一個熟悉字母，不要求一次讀完。",
  "older": "分A B C D、E F G H、I J K L M三小段回顧，選三個字母輪流命名，練We can take turns naming our letters.；說一個熟悉和一個還要練的字母。",
  "caregiverTip": "本課圖卡和此處三排字母A B C D／E F G H／I J K L M即可，不需列印新卡。Sweet Dreams是安靜暖身，採坐姿輕擺、雙手作枕頭，不套用大動作跑跳；白天上課也能聽，不表示現在必須睡覺。字母歌可分段停在M，不要求同時背十三個；dog、apple、ball是片後圖卡複習。家長把孩子實際答得出的和想再練的分開記，不能因本週課程結束就說已全部掌握。",
  "pausePrompts": [
    {
      "moment": "字母回顧短段後，片後第一題時",
      "title": "先從熟悉的狗開始",
      "question": "請找d-dog，再看A B C D。你會指哪個字母？可以先說dog再跟讀字母。",
      "followUp": "每位孩子自己指或說，不由較大的孩子代答；未熟悉就提示後再試。",
      "targetWord": "d-dog"
    },
    {
      "moment": "片後第二題回到A時",
      "title": "輪流叫出字母名字",
      "question": "請找a-apple，指出A。輪到你時先命名，再請家人選E F G H中的一個帶你聽。",
      "followUp": "先完成apple複習；新選字母可以跟讀，不把家長示範算成孩子獨立讀出。",
      "targetWord": "a-apple"
    },
    {
      "moment": "片後第三題與本週回顧時",
      "title": "知道哪些還想再練",
      "question": "請找b-ball，指出B再說ball。看I J K L M，你想再聽哪一個？",
      "followUp": "完成ball題後自由選待練字母，允許不知道；回顧與獎勵按實際紀錄，不補造掌握程度。",
      "targetWord": "b-ball"
    }
  ],
  "instructions": [
    "播放晚安暖身短段，坐著輕輕左右擺，雙手放臉旁作枕頭，放慢呼吸。",
    "回播安靜的一段，睜眼也能跟做小手勢，音量放柔，不要求真的入睡。",
    "停片輪流向家人說一句溫柔問候或點頭，坐好準備本週回顧。",
    "喝水，打開d-dog、a-apple、b-ball、c-cat圖卡，再看A B C D／E F G H／I J K L M三小段字母。",
    "播放 The Super Simple Alphabet Song (Uppercase)，在 A B C D／E F G H／I J K L M 各段暫停，指熟悉字形；一次選兩三個，由家長慢讀，不要求整首或十三個都讀對。",
    "完成dog、apple、ball三題圖卡複習，練We can take turns naming our letters.；各自選三個字母輪流指讀，年幼孩子可先跟家長說一個。",
    "每位孩子分享一個熟悉和一個想再練的字母，家長只勾實際完成的三題與輪流操作；回顧下一次可練什麼，不把學期進度當成能力分數。"
  ]
}
};

const thirteenthWeekReviewedGuidance: Record<string, ReviewedTeachingGuidance> = {
  "w13d1b1": {
  "title": "探索日｜從熟悉圖卡走到N與R",
  "sentence": "Adventure 121: I can find N and R in the letter row.",
  "videoFocus": "在J到R字音主課找N與R，再回apple、ball、cat圖卡完成三題認識。",
  "focus": "J到R中的N與R、片後熟悉圖卡。",
  "younger": "先在N O P Q R中指N或R，聽家長帶讀一個；完成a-apple、b-ball、c-cat三題認識，可指圖再說單字。",
  "older": "看N O P Q R指出兩端字母，練I can find N and R in the letter row.；比較影片字形與本頁文字，不把字母名字和起首音混成一種說法。",
  "caregiverTip": "本頁N O P Q R和原圖卡即可。教室暖身可在家原地做閱讀、走路與活動手勢，不要求真的去學校。原主課範圍是J到R，這次先找其中N與R；apple、ball、cat的三題在片後完成，不在J到R影片裡等A、B、C出現。影片的字音先聽示範，本頁字母順序由家長慢讀；今天不要求掌握N到Z全部。",
  "pausePrompts": [
    {
      "moment": "J到R短段後，片後第一題時",
      "title": "先分清兩個範圍",
      "question": "請找a-apple。這張卡開頭是A；看N O P Q R，A在這一排裡嗎？",
      "followUp": "完成蘋果指認，再確認A不在這排；不在影片中搜尋不屬於範圍的字母。",
      "targetWord": "a-apple"
    },
    {
      "moment": "片後第二題比對字母時",
      "title": "球的B和新看到的R",
      "question": "請找b-ball，再指出N O P Q R裡的R。B和R一樣嗎？",
      "followUp": "讓孩子看清B的兩個圓弧與R的斜腳，先辨字形，不要求沒教過的R單字。",
      "targetWord": "b-ball"
    },
    {
      "moment": "片後第三題回到字母排時",
      "title": "貓以外也認得N",
      "question": "請找c-cat，再看N O P Q R。能請家人指出N，換你指出R嗎？",
      "followUp": "先完成cat認識，再輪流指N或R；每名孩子有自己的回答，不能只跟著家人的手算完成。",
      "targetWord": "c-cat"
    }
  ],
  "instructions": [
    "播放教室暖身短段，雙手攤開作書本，再用小幅原地踏步表示移動；先跟一個動作即可。",
    "回播喜歡的一段，聽到不同活動就換手勢，閱讀用翻頁、活動用輕拍腿，不要把所有段落都做成跑跳。",
    "停片讓孩子挑閱讀或活動手勢帶家人做，再輪流說自己在家喜歡怎麼學習。",
    "喝水，開啟a-apple、b-ball、c-cat、d-dog圖卡；再看本頁N O P Q R，預告先觀察影片中的新字母。",
    "播放 J-R Review Song (Uppercase)，出現 N 或 R 時停片，看大寫字形並跟聽示範；回到本頁 N O P Q R 找兩端，不在 J–R 範圍等 apple 或 ball。",
    "片後完成apple、ball、cat三題認識，再指N O P Q R兩端，練I can find N and R in the letter row.，年幼孩子先說一個字母。",
    "輪流讓家人找N或R，孩子自己再選一張圖卡指認；按真實三題與開口紀錄完成，不因看過影片就勾選。"
  ]
},
  "w13d1b2": {
  "title": "探索日｜舊字母複習與N到R接棒",
  "sentence": "Adventure 122: We can take turns pointing to N, O, P, Q, and R.",
  "videoFocus": "從 J–R 主課直接找 N、O、P、Q、R，片後輪流接指五個位置，另做熟悉圖卡認識。",
  "focus": "影片 N–R 字形觀察與五位置接棒。",
  "younger": "在N O P Q R選一個字母，輪到時指給家人看；完成b-ball、c-cat、d-dog三題圖卡認識並跟說一個詞。",
  "older": "依本頁N O P Q R輪流各指一個，練We can take turns pointing to N, O, P, Q, and R.；先完成ball、cat、dog三題，再一起把五個位置接完。",
  "caregiverTip": "用本頁 N O P Q R 和原圖卡即可，不需列印。Simple Gifts 暖身以空手傳假想禮物，不要求購買或真的收禮，也不作字母教材。主課 J–R 包含今天要接棒的 N–R；先聽字音示範，再由家長慢讀字母名字，一人接一個。ball、cat、dog 是片後舊字複習，不把它們說成 N–R 的例詞；照顧者可與孩子兩人輪流。",
  "pausePrompts": [
    {
      "moment": "J–R 中的 N–R 示範後，圖卡第一題時",
      "title": "先找到熟悉的球",
      "question": "請找b-ball。這張圖以B開始；回到剛才看見的N O P Q R，你想先指哪一個，再交給家人接下一個？",
      "followUp": "先確認 ball，再依影片字形與本頁位置核對所選字母；B 的圖卡複習和 N–R 接棒分清楚。",
      "targetWord": "b-ball"
    },
    {
      "moment": "片後第二題輪流接棒時",
      "title": "先等家人，再輪到我",
      "question": "請找c-cat。家人指N，輪到你在N O P Q R中指下一個O，接得上嗎？",
      "followUp": "家長可以提示位置再讓孩子自己指；圖卡認識和字母順序是兩個小步驟。",
      "targetWord": "c-cat"
    },
    {
      "moment": "片後第三題收完一排時",
      "title": "一起把字母排接完",
      "question": "請找d-dog，再看N O P Q R。你和家人能各指一個，一起接到R嗎？",
      "followUp": "先完成dog認識；每人確實輪到才記合作，卡住就慢慢重來，不搶走孩子的回合。",
      "targetWord": "d-dog"
    }
  ],
  "instructions": [
    "播放分享小禮物暖身短段，雙手作捧著禮物的動作，再伸手輕輕傳給家人。",
    "回播一個分享情境，家長示範接過假想禮物和點頭回應，孩子選自己想分享的動作。",
    "停片輪流傳遞假想禮物，可以送一個微笑或揮手，不要求準備物品或買禮物。",
    "喝水，打開 b-ball、c-cat、d-dog、a-apple 圖卡，看 N O P Q R，預告從影片找到這五個字母，再像傳禮物一樣輪流接指。",
    "播放 J-R Review Song (Uppercase)，在 N 到 R 的字形示範逐段停片，讓孩子指本頁同一字母；先認得再接棒，不以一次唱完為條件。",
    "片後完成ball、cat、dog三題；家長用本頁文字示範N O P Q R慢速唱名，每人接指一個，練We can take turns pointing to N, O, P, Q, and R.。",
    "孩子和照顧者各輪到一次，指讀到R或提示後再試；家長分別記三題與合作，不把旁觀算成參與。"
  ]
},
  "w13d2b1": {
  "title": "動起來｜名字問候與字母節奏",
  "sentence": "Adventure 123: I can clap once when I hear my letter.",
  "videoFocus": "問候暖身用自己的名字，字母主課練慢速聽辨，片後做cat、dog、apple三個手勢。",
  "focus": "字母慢拍聽辨與片後圖卡動作。",
  "younger": "暖身揮手並說自己的名字或暱稱；完成c-cat、d-dog、a-apple三題手勢，字母回合先選C並在聽到時拍一下。",
  "older": "從本頁N O P Q R S T U V W X Y Z選一個字母，家長慢讀時聽到才拍一下，練I can clap once when I hear my letter.；拍快不代表聽懂。",
  "caregiverTip": "影片問名字時回答孩子自己的名字或暱稱，不需要模仿片中角色姓名、提供全名或輸入帳號。字母主課使用 The Alphabet Chant 單曲第一輪，後輪會加快，可在加速前停下；可停片由家長用本頁字母排慢讀。cat、dog、apple手勢由家長片後示範：手作鬍鬚、手垂作耳朵、雙手圍圓；它們不是字母歌原本指定動作，也不等同新範圍N到Z的單字。",
  "pausePrompts": [
    {
      "moment": "字母慢段後，片後第一個動作時",
      "title": "貓的手勢由我們來做",
      "question": "請找c-cat，雙手作貓鬍鬚。家長說C時拍一下，說D時先等，可以嗎？",
      "followUp": "先完成cat手勢；把等候也當聽辨的一部分，答錯可示範後再做，不用懲罰動作。",
      "targetWord": "c-cat"
    },
    {
      "moment": "片後第二個動作輪流帶時",
      "title": "狗的耳朵換誰帶",
      "question": "請找d-dog，雙手放耳旁作耳朵。你帶一次，再讓家人說字母讓你聽。",
      "followUp": "家長說D才拍一下，沒有聽清楚可要求重說；不把跟著別人拍算成獨立判斷。",
      "targetWord": "d-dog"
    },
    {
      "moment": "片後第三個動作與新字母時",
      "title": "蘋果做完，再選新字母",
      "question": "請找a-apple，雙手圍成圓。看N O P Q R S T U V W X Y Z，你想選哪個聽到時拍一下？",
      "followUp": "先完成apple動作；新字母只選一個讓家長慢讀示範，不要求整排都會。",
      "targetWord": "a-apple"
    }
  ],
  "instructions": [
    "播放名字問候暖身短段，先揮手，再指自己回應名字；年幼孩子可說暱稱或先點頭。",
    "回播一次問候，讓家長和孩子輪流問與答，不必照著片中人物名字唱自己的回答。",
    "停片由孩子選揮手、點頭或輕拍腿帶家人做，問完等對方回應，不搶答。",
    "喝水，開啟c-cat、d-dog、a-apple、b-ball圖卡，再選本頁字母排裡一個想聽辨的字母。",
    "播放 The Alphabet Chant 第一輪，先選一個目標字母跟指；停片由家長把目標和另一字母交錯慢讀，聽到目標才拍一下。後輪加速不必追，不把跟著家人拍當作獨立聽辨。",
    "片後做cat鬍鬚、dog耳朵、apple圍圓三個動作，練I can clap once when I hear my letter.；圖卡回合與新字母聽辨分開。",
    "各自帶一個動作，再聽家長慢讀完成一次目標字母回應；三題與開口依實際表現勾選，速度不作成功條件。"
  ]
},
  "w13d2b2": {
  "title": "動起來｜S到W五個位置",
  "sentence": "Adventure 124: There are five letters from S to W.",
  "videoFocus": "用官方 ABC Hop 觀察兔子代替字母；片後補讀 S T U V W，再一格一次點數五個位置。",
  "focus": "S到W的一對一點數與字母辨認。",
  "younger": "完成d-dog、a-apple、b-ball三題手勢；在S T U V W先指一個字母，再跟家長一格數一次到五。",
  "older": "在S T U V W逐一指數五個位置，練There are five letters from S to W.；懂得兔子代替一個字母位置，不因圖案換成兔子就多算一格。",
  "caregiverTip": "本頁 S T U V W 和原圖卡即可。躲貓貓感謝暖身用遮眼、開手與點頭，不需節日餐點。ABC Hop 遇兔子作小動作，可坐著輕拍腿代替跳躍。歌曲不同輪會省略不同字母：第一輪 S–W 中 V 換成動作，不能只數唱出的字母；停片指完整五格、補讀 V，再逐格數五。S 是字母名、five 是數量。dog 耳朵、apple 圍圓、ball 拍腿為片後三題，不把它們當 S–W 的例詞。",
  "pausePrompts": [
    {
      "moment": "ABC Hop短段後，片後第一題時",
      "title": "狗的動作和S分開",
      "question": "請找d-dog，做耳朵手勢，再看S T U V W。dog以D開始；這排第一個是什麼？",
      "followUp": "先完成dog跟做，再指S聽家長唱名；字母與單字不要錯配。",
      "targetWord": "d-dog"
    },
    {
      "moment": "片後第二題逐一點數時",
      "title": "五格一格一個數",
      "question": "請找a-apple，雙手圍圓，再用手指從S到W逐格點數，有幾個位置？",
      "followUp": "慢慢數到五，一格只點一次；年幼孩子可由家長帶著數，不能因手指多點就增加字母數。",
      "targetWord": "a-apple"
    },
    {
      "moment": "片後第三題換圖案時",
      "title": "換圖案，位置不變",
      "question": "請找b-ball，輕拍腿作拍球。看S T U V W，把影片第一輪的V用手指遮住，仍有五個位置嗎？揭開後應讀哪個字母？",
      "followUp": "指出 V 並由家長補讀，再逐格數五；可改遮 U 作延伸，但明說是家長換題，不冒充歌曲該輪省略 U。",
      "targetWord": "b-ball"
    }
  ],
  "instructions": [
    "播放躲貓貓感謝暖身短段，雙手輕遮眼再打開，向家人點頭表示謝謝。",
    "回播一次，由孩子決定何時打開手，家長等看見後再回應；不用節日食物當道具。",
    "停片輪流說一句感謝或做揮手動作，選坐姿輕拍腿作下一段兔子動作。",
    "喝水，開啟d-dog、a-apple、b-ball、c-cat圖卡，再看S T U V W，預告今天一格只數一次。",
    "播放官方 ABC Hop 第一輪，在 S–W 一段留意 V 的位置改成兔子動作；停片對照 S T U V W，家長補讀 V，再從 S 逐格指到 W。動作取代一格，不是另加一格。",
    "片後做dog耳朵、apple圍圓、ball輕拍腿三題，再逐一點數S T U V W五格，練There are five letters from S to W.。",
    "家長先遮住 V，孩子比較五個位置仍在，再揭開補讀；換 U 再試一次並說這是家長延伸。每人輪流指數，按實際三題與合作記錄，不以跳躍次數代替字母點數。"
  ]
},
  "w13d3b1": {
  "title": "配對日｜字母圖詞與三類分組",
  "sentence": "Adventure 125: An apple is food, a ball is a toy, and a cat is an animal.",
  "videoFocus": "主課辨 apple、ball、cat 圖詞，片後分食物、玩具、動物；再比較貓和暖身昆蟲雖同屬動物但不同類。",
  "focus": "A/B/C 圖詞對照與食物、玩具、動物分類。",
  "younger": "看一個清楚字母並跟家長指認；完成a-apple、b-ball、c-cat三題分類，可用指圖說明食物、玩具或動物。",
  "older": "將三張圖卡分成食物、玩具、動物，練An apple is food, a ball is a toy, and a cat is an animal.；說明cat是動物但不是昆蟲。",
  "caregiverTip": "只用原圖卡，左、中、右三處表示食物、玩具、動物。蝴蝶、瓢蟲、蜜蜂暖身可坐著做小翅膀。主課 A Is For Apple 直接給 apple、ball、cat 三個例詞，分類由家長片後提問；球會移動仍不是動物，貓是動物卻不是昆蟲。D/dog 如加練需說明是本課延伸，影片 D 的例詞是 doll。",
  "pausePrompts": [
    {
      "moment": "主課 A/B/C 圖詞段後，開始三類分組時",
      "title": "蘋果是哪一組",
      "question": "請找a-apple。你會把它指向食物、玩具還是動物那一組？",
      "followUp": "先辨認 apple 再分類；主課提供例詞，食物、玩具、動物的分組理由由孩子片後說明。",
      "targetWord": "a-apple"
    },
    {
      "moment": "片後第二題分類時",
      "title": "球和蝴蝶一樣嗎",
      "question": "請找b-ball。球是玩具，暖身裡的蝴蝶是動物，你會分到一起嗎？",
      "followUp": "讓孩子依類別說明，不以會不會移動當唯一理由；球被推會動，也不是動物。",
      "targetWord": "b-ball"
    },
    {
      "moment": "片後第三題細分時",
      "title": "貓是動物，但不是昆蟲",
      "question": "請找c-cat。貓屬於動物；你會把牠說成昆蟲嗎？",
      "followUp": "先完成動物分類，家長再說貓不是昆蟲；不要求孩子背尚未教過的昆蟲分類術語。",
      "targetWord": "c-cat"
    }
  ],
  "instructions": [
    "播放飛行昆蟲暖身短段，雙手在身旁輕開合表示翅膀，坐姿也能做。",
    "回播一段，孩子選蝴蝶或蜜蜂的小手勢，家人跟著變大、變小，不追逐或抓昆蟲。",
    "停片輪流帶一個翅膀動作，家長說出動物名稱，孩子可指動作或跟一個詞。",
    "喝水，打開a-apple、b-ball、c-cat、d-dog圖卡，指左中右三處作食物、玩具、動物三組。",
    "播放 A Is For Apple 的 A、B、C 段，各停一次讓孩子對照本課圖卡；先辨圖詞，再請孩子想應放左邊食物、中間玩具或右邊動物。",
    "片後完成apple食物、ball玩具、cat動物三題分類，練An apple is food, a ball is a toy, and a cat is an animal.，年幼孩子先說一類。",
    "每位孩子選一張說明分組理由；分類與開口按實際完成紀錄，觀看或家長代答都不算自己的完成。"
  ]
},
  "w13d3b2": {
  "title": "配對日｜同圖不同名稱與X到Z",
  "sentence": "Adventure 126: A ball is a toy; cats and dogs are animals.",
  "videoFocus": "從 R–Z 主課找 X、Y、Z；片後以 ball、cat、dog 比較中英文命名與分類，家人再輪流指 X–Z。",
  "focus": "X/Y/Z 字形觀察，搭配片後中英文同圖命名與分類。",
  "younger": "完成b-ball、c-cat、d-dog三題分類，跟家長說球與ball指同一張圖；X Y Z先指一個字母即可。",
  "older": "將球分到玩具、貓狗分到動物，練A ball is a toy; cats and dogs are animals.；用球/ball、貓/cat、狗/dog說明聲音不同也可指同一物，另輪流找X Y Z。",
  "caregiverTip": "原圖卡及本頁 X Y Z 即可，不需食物或列印。鯊魚暖身用手指輕開合，不咬人。主課 R–Z 中直接找 X/Y/Z、聽字音示範；中文名稱由家長片後說，英文用圖卡發音，不把影片說成中英雙語。ball、cat、dog 是 B/C/D 的延伸複習，不配成 X/Y/Z 起首詞。三題分類與字母合作各自完成，每位孩子均要自己輪到。",
  "pausePrompts": [
    {
      "moment": "X/Y/Z 主課示範後，片後第一張圖卡時",
      "title": "球和ball指的是同一張圖",
      "question": "請找b-ball。家長說球、再說ball，你會指不同圖嗎？它是玩具還是動物？",
      "followUp": "用同一圖核對兩種名稱，再完成玩具分類；不是把中文字讀成英文字母。",
      "targetWord": "b-ball"
    },
    {
      "moment": "片後第二題比較名稱時",
      "title": "貓的兩種名稱",
      "question": "請找c-cat。聽貓和cat，兩個聲音一樣嗎？它應和玩具還是動物放一起？",
      "followUp": "聲音不同但指同圖；讓孩子自己完成動物分類，無須使用注音。",
      "targetWord": "c-cat"
    },
    {
      "moment": "片後第三題與X到Z輪流時",
      "title": "狗分類完，換字母回合",
      "question": "請找d-dog。聽狗和dog後選動物那一組，再在X Y Z中指一個請家人說。",
      "followUp": "先完成dog分類，再輪流指字母；不要說狗以X、Y或Z開頭。",
      "targetWord": "d-dog"
    }
  ],
  "instructions": [
    "播放鯊魚暖身短段，用拇指食指小幅開合，再用雙手變成大嘴手勢。",
    "回播一次，家長和孩子輪流選大或小的嘴巴手勢，留在原地不追人。",
    "停片各帶一個動作，聽家人說開始或停下後回應，不碰咬別人的手。",
    "喝水，打開b-ball、c-cat、d-dog、a-apple圖卡，看本頁X Y Z，預告名字與字母是兩個小活動。",
    "播放 R-Z Review Song (Uppercase) 的 X、Y、Z 段，停片跟指本頁同一字形並聽示範；先由孩子選一個請家人帶讀，中文名稱比較留到圖卡活動。",
    "完成ball玩具、cat與dog動物三題分類，練A ball is a toy; cats and dogs are animals.；家長另帶X Y Z慢讀，不把它們配成這三個詞的開頭。",
    "每位孩子自己說或指一組中英名稱，再與家人輪流指X、Y或Z；依實際分類與合作勾選。"
  ]
},
  "w13d4b1": {
  "title": "小老師｜圖卡問答與食物辨認",
  "sentence": "Adventure 127: Which one is food: a cat, a dog, or an apple?",
  "videoFocus": "從主課 A/apple 與 C/cat 的圖詞回到食物問答，另用狗圖卡延伸 D，孩子輪流問哪一張是食物。",
  "focus": "圖卡問答與類別理由。",
  "younger": "完成c-cat、d-dog、a-apple三題問答，先用指圖回答動物或食物；家長可分別慢問，不要求一次聽長句。",
  "older": "練Which one is food: a cat, a dog, or an apple?，等家人回答再核對；把C、D、A與各圖配回，另選N到Z一個字母請家人帶讀。",
  "caregiverTip": "用三張圖卡，不需切水果或準備食物。躲貓貓暖身可揮手或做心形，擁抱自選。主課 apple、cat 可直接聽辨；D 配的是 doll，本頁 dog 由家長另教，不在影片等狗出現。片後將 cat、dog、apple 放一起問，孩子說完或指完才換人，不以家長先說答案代替孩子思考。",
  "pausePrompts": [
    {
      "moment": "主課 apple、cat 圖詞對照後，問答第一題時",
      "title": "貓是這題的食物嗎",
      "question": "請找c-cat。這張圖表示貓，和本課的蘋果相比，你會把哪個分成食物？",
      "followUp": "先辨 cat 再指出 apple，讓孩子解釋本題哪張是食物；不因兩張都出現在同一首歌就分成同類。",
      "targetWord": "c-cat"
    },
    {
      "moment": "片後第二題輪流提問時",
      "title": "狗和貓可以同組嗎",
      "question": "請找d-dog。狗和貓都是動物嗎？換你問家人，先等他回答。",
      "followUp": "家人回答後讓孩子核對兩張圖；輪流出題不代表可以代替其他孩子作答。",
      "targetWord": "d-dog"
    },
    {
      "moment": "片後第三題組合問句時",
      "title": "讓小老師問完整一題",
      "question": "請找a-apple。問Which one is food: a cat, a dog, or an apple?，答案是哪張？",
      "followUp": "孩子可先指蘋果，再跟說apple；較大孩子說完整問句，答錯給提示再核對。",
      "targetWord": "a-apple"
    }
  ],
  "instructions": [
    "播放躲貓貓示愛暖身短段，輕遮眼再打開，向家人揮手回應。",
    "回播一段，選揮手或雙手心形表示關心，不強迫擁抱或親吻。",
    "停片讓孩子帶家人做一次，換人後等對方回應，練小老師的輪流。",
    "喝水，打開c-cat、d-dog、a-apple、b-ball圖卡，預告片後會問哪張是食物。",
    "播放 A Is For Apple 的 A 到 D 圖詞段，對照 apple 與 cat；D/doll 後另指 dog，讓孩子知道狗是本頁延伸。停片由孩子準備一題食物或動物問題。",
    "片後以cat、dog、apple完成三題問答，練Which one is food: a cat, a dog, or an apple?；問完等孩子選，不由家長先說答案。",
    "每位孩子問家人一題、自己答一題，再從本頁N到Z選一個字母請家長帶讀；只記自己的實際完成。"
  ]
},
  "w13d4b2": {
  "title": "小老師｜字母排序小車站",
  "sentence": "Adventure 128: A comes before B, and B comes before D.",
  "videoFocus": "用官方大寫字母歌核對 A/B/C/D 順序，片後以圖卡作字母停靠站，再輪流排 N–R。",
  "focus": "字母先後與原圖卡問答。",
  "younger": "完成d-dog、a-apple、b-ball三題問答，依本頁A B C D先指A再指B；不用背整套字母。",
  "older": "按字母先後指apple、ball、dog，練A comes before B, and B comes before D.；說明B和D之間還有C，排序不是宣稱它們相鄰。",
  "caregiverTip": "不用真車或新卡，直接看 A B C D 與本課圖卡，把手指當小車停靠。職業暖身用揉麵、小舞步等假想動作，不拿工具或爬高。主課是字母順序歌，dog、apple、ball 問答在片後；先後依文字核對，不按大小或喜好。B 在 D 前面不表示兩者相鄰，中間仍有 C。第二輪看 N O P Q R，各人實際輪到一次。",
  "pausePrompts": [
    {
      "moment": "大寫字母順序段後，片後第一題時",
      "title": "狗的D在哪一站",
      "question": "請找d-dog，再看A B C D。D在A的前面還是後面？",
      "followUp": "從文字左到右指一遍，先認D再比較順序；dog不是交通工具。",
      "targetWord": "d-dog"
    },
    {
      "moment": "片後第二題找第一站時",
      "title": "蘋果先到哪裡",
      "question": "請找a-apple。若apple、ball、dog依開頭字母排，哪張先？",
      "followUp": "指出A最前，這是字母順序，不是決定誰先領獎或誰比較好。",
      "targetWord": "a-apple"
    },
    {
      "moment": "片後第三題補中間一站時",
      "title": "B和D中間還有誰",
      "question": "請找b-ball。看A B C D，B在D前面；中間還有哪個字母？",
      "followUp": "指出C。接著在N O P Q R問同樣的前後問題，孩子與家人各輪到一次。",
      "targetWord": "b-ball"
    }
  ],
  "instructions": [
    "播放長大職業暖身短段，選揉麵或小幅舞步模仿，先做一個角色動作。",
    "回播一段，家長和孩子輪流猜動作代表的工作；可說不知道或想試別的職業。",
    "停片由孩子帶一次假想工作動作，不拿工具、不要求現在決定未來職業。",
    "喝水，打開d-dog、a-apple、b-ball、c-cat圖卡，將本頁A B C D當字母停靠站。",
    "播放 The Super Simple Alphabet Song (Uppercase) 的 A 到 D 段，停片沿 A B C D 指一次，確認 B 與 D 中間還有 C；再準備把 dog、apple、ball 圖卡配回各站。",
    "完成dog的D在哪裡、apple的A先到、ball的B在D之前三題問答，練A comes before B, and B comes before D.，指出中間還有C。",
    "換N O P Q R字母站由家長先示範，孩子與家人各問一次先後；按原問答與合作條件記錄，不把整首背完設成新門檻。"
  ]
},
  "w13d5b1": {
  "title": "任務日｜安心回顧與字母選擇",
  "sentence": "Adventure 129: I can try again when a letter is new to me.",
  "videoFocus": "從完整大寫字音歌選 N–Z 中一個熟悉與一個待練字母，停片重聽；片後回顧 apple、ball、cat 三題並練求助。",
  "focus": "自選 N–Z 字形與字音重聽，保留原圖卡複習及安心重試。",
  "younger": "完成a-apple、b-ball、c-cat三題複習，可先指再說一個詞；遇到新字母可請家長再說一次。",
  "older": "練I can try again when a letter is new to me.，從N O P Q R S T U V W X Y Z各選一個熟悉與待練字母；不以一次讀對全部作成功標準。",
  "caregiverTip": "情緒暖身坐穩停一下、自然慢呼吸，不要求閉眼或立刻開心，孩子可說真實感受。主課使用大寫字音歌，從 N–Z 選一個字母先聽示範；字母名由家長另帶，不混作同一種讀音。apple、ball、cat 用本頁圖卡片後複習，不預設影片例詞。孩子要求再一次就停片重聽，但鼓勵重試不能代填已答對。",
  "pausePrompts": [
    {
      "moment": "主課字母觀察後，第一個複習題時",
      "title": "先找自己熟悉的蘋果",
      "question": "請找a-apple，指A並說apple。若剛才有字母不熟悉，可以怎麼請家人幫忙？",
      "followUp": "先完成apple複習，再示範請再說一次；求助不等於做錯，也不是已會新字母。",
      "targetWord": "a-apple"
    },
    {
      "moment": "片後第二題停一下再答時",
      "title": "球的B可以再試",
      "question": "請找b-ball。家長先指B再問是哪張圖；如果第一下指錯，提示後能再自己選嗎？",
      "followUp": "允許重新辨認，不羞辱或扣分；以實際再答結果記錄，不因鼓勵就補正確。",
      "targetWord": "b-ball"
    },
    {
      "moment": "片後第三題選待練字母時",
      "title": "貓做完，挑下一次想練的",
      "question": "請找c-cat，指C再說cat。看N到Z文字，哪個熟悉，哪個想再聽？",
      "followUp": "各選一個即可；說不知道也有資訊價值，不把本週結束說成全部掌握。",
      "targetWord": "c-cat"
    }
  ],
  "instructions": [
    "播放安定情緒暖身一小段，坐穩停一下，用自然呼吸跟著放慢手勢。",
    "回播一段，家長說出自己聽到的一種感受，孩子可點頭或說不同感受，不強迫轉成開心。",
    "停片練需要幫忙時舉手或說再一次，家長回應後再開始複習。",
    "喝水，開啟a-apple、b-ball、c-cat、d-dog圖卡，看本頁N O P Q R S T U V W X Y Z。",
    "播放 Phonics Alphabet Song (Uppercase)，在孩子選的 N–Z 字母處停片看字形、聽字音；邀請孩子說再一次或用手示意後重聽，不考完整字母表。",
    "完成apple、ball、cat三題複習，練I can try again when a letter is new to me.；需要提示時先幫忙，再讓孩子自己答。",
    "每人選一個熟悉及一個待練字母，說或指自己的選擇；只勾實際三題與開口，不以願意再試直接補成果。"
  ]
},
  "w13d5b2": {
  "title": "任務日｜A到Z分段接棒",
  "sentence": "Adventure 130: We can share the alphabet one small group at a time.",
  "videoFocus": "倒數暖身後用完整大寫字母歌分組停片，按 A–G／H–M／N–T／U–Z 輪流接棒，再完成原三張圖卡複習。",
  "focus": "A到Z分組回顧與輪流參與。",
  "younger": "完成b-ball、c-cat、d-dog三題複習，先在A B C D E F G中指B、C或D；倒數可由五開始，不要求二十全部跟上。",
  "older": "用A B C D E F G／H I J K L M／N O P Q R S T／U V W X Y Z四組接棒，練We can share the alphabet one small group at a time.；每組選少數字母，記下還想練的。",
  "caregiverTip": "本頁四排字母及原圖卡即可，不需列印。倒數暖身先用五指逐根收回，再依能力聽二十倒數，不比大聲或快動作。主課是完整大寫字母歌，家長按 A–G／H–M／N–T／U–Z 分段停下；ball、cat、dog 為片後圖卡複習，不要求歌中出現指定物件。每人選少數字母確實輪到，不以背完26個或觀看同伴代替完成。",
  "pausePrompts": [
    {
      "moment": "字母觀察後，片後第一個複習題時",
      "title": "球的B在哪一組",
      "question": "請找b-ball，再看A B C D E F G。能指B再說ball嗎？",
      "followUp": "先完成 ball 的圖卡與 B 配對；物件詞是片後複習，不要求字母歌提供球的畫面。",
      "targetWord": "b-ball"
    },
    {
      "moment": "片後第二題輪流接棒時",
      "title": "貓的C輪到誰",
      "question": "請找c-cat，再指C。家人選H I J K L M中的一個後，換你選N O P Q R S T中的一個。",
      "followUp": "新選字母可由家長先帶讀，再讓孩子指；不要把家長示範當孩子獨立完成。",
      "targetWord": "c-cat"
    },
    {
      "moment": "片後第三題回顧到Z時",
      "title": "狗做完，最後一組慢慢來",
      "question": "請找d-dog，指出D。看U V W X Y Z，選一個熟悉字母，再選一個想重聽的。",
      "followUp": "先完成dog複習；允許不熟悉，回顧只記真實答案和待練內容，不宣布全套都會。",
      "targetWord": "d-dog"
    }
  ],
  "instructions": [
    "播放倒數暖身短段，先伸五指從五到一逐根收回，每收一根只數一次。",
    "回播後依能力聽較長的二十到一倒數，坐姿拍腿或原地慢踏，不追不上就硬喊。",
    "停片由孩子選從三或五開始帶家人倒數，完成後把手放好準備字母接棒。",
    "喝水，開啟b-ball、c-cat、d-dog、a-apple圖卡，再看本頁四組A到Z文字。",
    "播放 The Super Simple Alphabet Song (Uppercase)，對照 A B C D E F G／H I J K L M／N O P Q R S T／U V W X Y Z 四組；由家長在組間停片，每人選本組一個字母指讀再接給下一人。",
    "完成ball、cat、dog三題複習，練We can share the alphabet one small group at a time.；按本頁四組各選少數字母輪流，不一次考二十六個。",
    "每人分享一個已熟悉和一個想再練的字母，照顧者只勾確實完成的三題及接棒，不把課程日數當掌握程度。"
  ]
}
};

const fourteenthWeekReviewedGuidance: Record<string, ReviewedTeachingGuidance> = {
  "w14d1b1": {
  "title": "探索日｜問物品、問位置與輪流回應",
  "sentence": "Adventure 131: Is it in your hand? Yes, it is.",
  "videoFocus": "聽 Can You Find The Cat? 的 Is it in... 問句，再換成手心藏物，分清問名稱與位置。",
  "focus": "詢問物品、確認是否在指定位置。",
  "younger": "先問名稱，再指玩具所在的手，最後看清楚回答 yes；可以各說一詞或指卡，家長陪完整問句。",
  "older": "區分 What is it? 與 Where is it? 的答案，用主課 Is it in... 模式改說 Is it in your hand? Yes, it is.，再移動物品檢查答案。",
  "caregiverTip": "保留旅行打包暖身。主課直接以 Is it in the... 問寵物是否在房間；片後縮小到手裡或桌上，用一件容易看清的小玩具或大積木，不用真食物。what-is-it 與 where-is-it 圖卡分別讀 What is it?、Where is it?；三題用同一物品讓用途差異清楚，不把原歌的房間改稱手心。",
  "pausePrompts": [
    {
      "moment": "主課第一個找動物問題後，拿出桌上玩具時",
      "title": "先確定找什麼",
      "question": "請找 what-is-it，問 What is it?。如果家長回答「在手裡」，他有回答這一題的名字嗎？",
      "followUp": "還沒有；先說玩具名稱，不能用位置代替物品。",
      "targetWord": "what-is-it"
    },
    {
      "moment": "片後家長把同一玩具握在手裡時",
      "title": "換問位置",
      "question": "請找 where-is-it，問 Where is it?，再指出玩具在哪一隻手。這次還只說玩具名稱夠嗎？",
      "followUp": "要指出所在；家長示範 In your hand.，不要求孩子分左右。",
      "targetWord": "where-is-it"
    },
    {
      "moment": "主課 Is it in... 問法回聽後，確認手心藏物時",
      "title": "完整確認一句",
      "question": "玩具就在家長指的手裡，請找 yes，回答 Is it in your hand?。先看見了什麼，才知道能肯定？",
      "followUp": "示範 Yes, it is.；若移到桌上，答案就要改，不把猜人或指責拿走物品帶入。",
      "targetWord": "yes"
    }
  ],
  "instructions": [
    "播放旅行暖身短段，雙手作打開袋子與輕放衣物的動作，留在原地即可。",
    "回播一小段，指自己的衣服，再假裝摺好放進袋子，不要求拿出真實行李。",
    "孩子選一個打包手勢帶家人做，換人時等對方完成，不比快。",
    "喝水，拿一件大積木或玩具與問答圖卡，先說明同一物品可以問名字，也可以問位置。",
    "播放找寵物歌曲一個 Is it in the... 的短段，先辨認這是在確認位置；不要求背完所有房間名。",
    "依 what-is-it、where-is-it、yes 先問物品、再問位置、最後確認手裡有沒有；練 Is it in your hand? Yes, it is.。",
    "移動玩具後再交換問答，讓孩子以實際位置更新答案；每人完成三次用途辨認與一次開口，不把每題都答是當成功。"
  ]
},
  "w14d1b2": {
  "title": "探索日｜交朋友與中英問候",
  "sentence": "Adventure 132: Hello, my friend. Please play with me.",
  "videoFocus": "從交朋友歌學問候、一起玩與輪流，再比較中文你好和你們的開頭。",
  "focus": "問候邀請與中文共同開頭聲音。",
  "younger": "辨認bye、hello、please三張卡，配揮別、打招呼與邀請動作；中文回合先聽「你好、你們」，指出共同先聽見的「你」。",
  "older": "觀察主課問候和一起玩的做法，練 Hello, my friend. Please play with me.；中文另比較你好／你們共同開頭，換人說詞讓家人聽，不把不同語言聲音硬配。",
  "caregiverTip": "保留小魚暖身前三步。主課直接教 hello、玩遊戲、輪流和 goodbye；bye 是日常縮短說法，please 是片後加入的邀請詞。中文你好／你們共同起頭是「你」，只比較中文這兩詞，不把 hello 拆成中文音，也不再加入無關英文押韻新詞。",
  "pausePrompts": [
    {
      "moment": "主課道別段後，先做離開情境時",
      "title": "玩完後道別",
      "question": "請找 bye 卡。歌裡用 goodbye 告別，家人玩完準備離開時，你可以用較短的哪個說法？",
      "followUp": "說 bye 並揮手；這是詞形縮短，不宣稱官網歌詞寫的是 bye。",
      "targetWord": "bye"
    },
    {
      "moment": "回看主課問候段，再換成家人回來時",
      "title": "問候的中文開頭",
      "question": "請找 hello 卡，向回來的家人打招呼；再慢聽「你好、你們」，兩詞先聽到哪個相同的字？",
      "followUp": "英文問候後另做中文回合，答案是你；只比較聲音，不顯示注音。",
      "targetWord": "hello"
    },
    {
      "moment": "主課一起玩遊戲段後，片後提出邀請時",
      "title": "邀請後要等待",
      "question": "請找 please 卡，想請家人一起做小魚手勢，你可以怎麼說？說完之後要等誰回應？",
      "followUp": "補 Please play with me.；對方能選另一種遊戲，please 不是逼人答應。",
      "targetWord": "please"
    }
  ],
  "instructions": [
    "播放小魚暖身短段，手指作魚在水裡游，先跟一到三隻的小範圍點數。",
    "回播喜歡的一段，增加手指表示多一隻魚；能跟上再往十數，不必用跑步模仿被追。",
    "孩子帶一個游動手勢，家人跟做後換人；保留坐姿也能參與的方式。",
    "喝水，開啟禮貌圖卡，預告先看怎樣交朋友，片後再玩中英問候與中文聲音比較。",
    "播放交朋友歌的問候、一起遊戲或輪流短段；道別段可分次回看，不把 please 當已唱出的歌詞。",
    "依 bye、hello、please 做離開、回來、邀請三題，練 Hello, my friend. Please play with me.；再慢說你好／你們找共同起頭。",
    "家長與孩子各輪一次中文開頭比較，也各做一次邀請或回應；保留每人參與紀錄，不加入英文押韻背誦條件。"
  ]
},
  "w14d2b1": {
  "title": "動起來｜拇指躲藏與肯定否定",
  "sentence": "Adventure 133: Here is my thumb. Can you see it?",
  "videoFocus": "拇指歌用手指出現與躲藏練找位置，片後回答Yes或No並辨認物品問題。",
  "focus": "找手指、看清楚再回答。",
  "younger": "家長示範後完成yes點頭、no搖頭、what-is-it攤手詢問三個動作；伸出自己的拇指，可先說thumb。",
  "older": "把拇指藏起或伸出，依是否真的看見回答Yes或No；練Here is my thumb. Can you see it?，問物品與問位置分開。",
  "caregiverTip": "雙手即可，不需畫手指或加道具。蘋果香蕉暖身是故意換母音的聲音遊戲，回到平常說話仍用正常單字，不把搞笑唱法教成正式拼字。拇指主課是手指問候與躲藏，沒有把Yes或No當物品；伸出拇指表示看見、收起表示看不見，再由家長問Can you see it?。What is it?回答是拇指，Where is it?回答位置；比較中文「在哪裡」與英文問法的用途，不要求兩種語言音相同。",
  "pausePrompts": [
    {
      "moment": "拇指歌短段後，片後第一個動作時",
      "title": "看得到才說是",
      "question": "請找yes。我把拇指伸出來，Can you see it?，你能回答並做點頭動作嗎？",
      "followUp": "讓孩子真的看見再回答；伸手動作可由孩子自己做，不用大人代做算完成。",
      "targetWord": "yes"
    },
    {
      "moment": "片後第二個動作，拇指收進手心時",
      "title": "看不到可以說不是",
      "question": "請找no。現在拇指藏起來了，Can you see it?，可以怎麼回答與做動作？",
      "followUp": "示範No配搖頭，再讓孩子自己操作；不要求說Yes來迎合大人。",
      "targetWord": "no"
    },
    {
      "moment": "片後第三個動作，手指再次出現時",
      "title": "問是什麼，不是問在哪裡",
      "question": "請找what-is-it。我指著伸出的拇指，這次問的是什麼東西，還是在什麼地方？",
      "followUp": "孩子攤手作詢問，再回答thumb或拇指；之後可另問位置，不能把兩種問題都答Yes。",
      "targetWord": "what-is-it"
    }
  ],
  "instructions": [
    "播放蘋果香蕉暖身短段，雙手作蘋果圍圓與香蕉彎曲，坐著就能跟。",
    "回播一段母音變化，聽同一詞變得有趣；不要求孩子記搞笑拼字，也不用大聲拉長到不舒服。",
    "停片讓孩子選一個聲音或動作帶家人做，再回到正常的apple、banana說法。",
    "喝水，開啟yes、no、what-is-it、where-is-it圖卡，用拇指先示範看得見與看不見。",
    "播放拇指歌短段，手指出現時伸出、躲藏時收起，跟一根手指即可；不在畫面裡找Yes或No物品。",
    "片後完成yes點頭、no搖頭、what-is-it攤手三個跟做回合，再練Here is my thumb. Can you see it?，由孩子決定何時伸出或藏起。",
    "家長提出真實可判斷的問題，孩子看清楚再做動作與回答；只記自己完成的三題與開口，不以看完影片代替作答。"
  ]
},
  "w14d2b2": {
  "title": "動起來｜表達喜好與禮貌回應",
  "sentence": "Adventure 134: No, thank you. I like something else.",
  "videoFocus": "從 Open Shut Them 聽 please 和 No, thank you，練習禮貌選擇與拒絕。",
  "focus": "禮貌請求、拒絕及英文詞聲音比較。",
  "younger": "完成please邀請、thank you點頭、bye揮別三個跟做回合；面對不想要的假想食物，可先說No, thank you.。",
  "older": "用No, thank you. I like something else.表達自己的選擇；輪流聽please與bye，辨認是不是同一個詞，再說明它們用在不同情境。",
  "caregiverTip": "保留問候暖身。主課直接唱 please 與 No, thank you；這兩者不是數學或字義上的相反詞，而是不同情境的禮貌回應。用假想餐點，不需混食物試吃。孩子可拒絕，I like something else. 是片後完整表達；bye 與 hello 不在此主課段落，從暖身及道別情境複習。",
  "pausePrompts": [
    {
      "moment": "主課 please 與 No, thank you 段後，做邀請回合時",
      "title": "先提出請求",
      "question": "請找 please 卡。你想請家人坐下看假想菜單，可以怎麼搭配伸手邀請的動作？",
      "followUp": "歌中直接有 please，完整 Please sit here. 由家長補；說完等對方回應。",
      "targetWord": "please"
    },
    {
      "moment": "回聽主課禮貌拒絕，再收到假想餐點時",
      "title": "謝謝也能放在拒絕裡",
      "question": "請找 thank you 卡。不想要這份假想餐點時，能把 no 加在前面，禮貌說出自己的選擇嗎？",
      "followUp": "跟 No, thank you.，再補 I like something else.；接受時只說 Thank you，兩種都尊重。",
      "targetWord": "thank you"
    },
    {
      "moment": "片後餐館回合結束，做聲音比較時",
      "title": "聽清楚是哪個詞",
      "question": "請找 bye 卡。家長先說 please，再說 bye，兩個詞聲音相同嗎？哪個適合現在離開的情境？",
      "followUp": "慢說並留等待時間，選 bye 揮手；不拿中文諧音代替英文。",
      "targetWord": "bye"
    }
  ],
  "instructions": [
    "播放朋友問候暖身短段，向家人揮手，選一個喜歡的角色姿勢作小幅模仿。",
    "回播問候一小段，家長先揮手，孩子回應後再交換；不用服裝或真的外出要糖。",
    "停片輪流用hello打招呼，讓每個孩子各有一回合，不以音量比賽。",
    "喝水，準備禮貌圖卡與假想菜單，預告今天可以說想要，也可以禮貌拒絕。",
    "播放 Open Shut Them 的 please／No, thank you 段，先聽再以邀請與婉拒手勢跟做；不必教完其他成對詞。",
    "依 please、thank you、bye 完成三題，練 No, thank you. I like something else.；完整選擇句由家長補，喜好沒有唯一答案。",
    "另外慢聽 please 與 bye 比較是不是同一詞，家人輪流出聲、對方聽辨；完成三次跟做與一次聲音合作才記錄。"
  ]
},
  "w14d3b1": {
  "title": "配對日｜動物身體與中英名稱",
  "sentence": "Adventure 135: A bird has two legs, and a cat has four.",
  "videoFocus": "第十四週透過歌中bird、fish、cat身體特徵作腳數分類，再比中文與英文名稱，與第五週單純辨識層次不同。",
  "focus": "動物身體與中英名稱",
  "younger": "先聽bird、fish、cat三張卡，依本頁動物圖分到兩隻腳、沒有腳、四隻腳三組，可用手指比數量再說bird。",
  "older": "完成三張動物圖卡的腳數分類，練A bird has two legs, and a cat has four.；知道fish的鰭不是腳，不把鳥的翅膀算成另外兩隻腳。",
  "caregiverTip": "主課直接介紹這些寵物與身體特徵；腳數由家長依圖說明，不宣稱歌詞逐字教兩腳四腳。鳥的翅膀、魚的鰭都不算腳，中文與英文名稱分開自然說。",
  "pausePrompts": [
    {
      "moment": "歌曲bird段後",
      "title": "看清楚再回答",
      "question": "請找bird，指出兩隻腳和翅膀，bird要分到哪組？",
      "followUp": "翅膀不當另外兩隻腳；可用手指比二。",
      "targetWord": "bird"
    },
    {
      "moment": "歌曲fish與fins段後",
      "title": "換個線索試試",
      "question": "請指fish，魚鰭是腳嗎？fish要放哪組？",
      "followUp": "以沒有腳一組作本輪分類，不說魚沒有其他身體部位。",
      "targetWord": "fish"
    },
    {
      "moment": "歌曲cat段後",
      "title": "輪到孩子練習",
      "question": "請找cat，和bird比較腳數有什麼不同？",
      "followUp": "補充遮住的腳，之後自然說貓與cat兩種名稱。",
      "targetWord": "cat"
    }
  ],
  "instructions": [
    "播放道別暖身短段，向家人輕揮手，說明現在是在練道別，課程還會繼續。",
    "回播一次，家人輪流做揮手與小幅踏步，不需要節慶服裝或離開座位。",
    "孩子選一個告別姿勢，其他人跟做，再一起把手放回腿上準備聽聲音。",
    "喝水，打開bird、fish、cat圖卡，以手指表示兩腳、沒有腳、四腳三組。",
    "播放〈I Love My Pet〉的鳥、魚、貓段，名稱與身體特徵後停片指卡；看清翅膀、魚鰭與腳的差別。",
    "三張卡按腳數分類，練A bird has two legs, and a cat has four.；同一張卡再分別說鳥／bird、魚／fish、貓／cat。",
    "每名孩子完成三次分類並說出一個詞或比較句；被遮住的腳由家長說明，中英文發音不當成同一音。"
  ]
},
  "w14d3b2": {
  "title": "配對日｜問位置、肯定與否定",
  "sentence": "Adventure 136: Where is it? Is it here or over there?",
  "videoFocus": "從找貓歌的位置問題出發，聽音選出問位置、肯定及否定三種卡。",
  "focus": "位置提問與肯否回答的聲音分類。",
  "younger": "聽where-is-it、yes、no三題，分成問位置、表示是、表示不是；可以指卡與點頭、搖頭，開口先跟說Where is it?。",
  "older": "辨認where-is-it是問位置，yes和no是肯定／否定回應；練Where is it? Is it here or over there?，與家長輪流聽音找卡。",
  "caregiverTip": "保留 Forward And Back 暖身，主課改為直接問貓位置的歌曲。影片有不同位置，但完整 Where is it? Is it here or over there? 與 yes/no 是片後改用玩偶的問答。兩個桌面位置即可，不必真糖果；先聽一整句再選卡，問位置要指所在，不是每句都答 yes。",
  "pausePrompts": [
    {
      "moment": "主課位置問句後，選第一種聲音卡時",
      "title": "問題放一邊",
      "question": "請找 where-is-it 卡，聽 Where is it?。這句應放在「問位置」一邊，還是「回答是／不是」一邊？",
      "followUp": "歌中問貓，這裡代換成玩偶；選問位置卡後再指出所在。",
      "targetWord": "where-is-it"
    },
    {
      "moment": "片後家長指到玩偶所在處時",
      "title": "肯定另成一組",
      "question": "家長指對玩偶位置問 Is it here?，請找 yes 卡。它是在開新問題，還是在回答剛才的確認？",
      "followUp": "放到肯定回答組，再口說一次；是依位置判斷，不靠卡片顏色猜。",
      "targetWord": "yes"
    },
    {
      "moment": "片後家長指向另一個空位置時",
      "title": "否定也有自己的用途",
      "question": "玩偶沒有換位置，家長卻指另一邊問 Is it here?。請把 no 卡放進否定組，再指出應去哪裡找。",
      "followUp": "完成分類後練 here 與 over there 的指向，指遠處不是要求孩子跑遠。",
      "targetWord": "no"
    }
  ],
  "instructions": [
    "播放〈Forward And Back〉，先用手指在掌心向前、向後走，聽到stop就停。",
    "回看一輪前後踏步指令；空間足夠時小步走，坐姿也可用雙手表示方向。",
    "停片後換孩子說forward、back或stop，家人先聽完再做；用手勢指明位置，準備後面的問位置遊戲。",
    "喝水，開啟問答圖卡並放一個玩偶；桌面左右各留一個容易指認的位置，不要求說對左右名稱。",
    "播放找貓歌位置短段，聽問句後先等，再看找到的位置；主課直接呈現位置尋找，不延續原來問誰拿糖果的敘述。",
    "依 where-is-it、yes、no 三題把卡分成位置問題、肯定與否定；練 Where is it? Is it here or over there?，根據玩偶所在回答。",
    "家長慢說一句讓孩子找圖，再換孩子選卡出題；每人真正完成三次分類並輪到聽音找圖合作，不能只跟著大人放卡。"
  ]
},
  "w14d4b1": {
  "title": "小老師｜禮貌的小餐館問答",
  "sentence": "Adventure 137: Hello! Please sit here. Thank you for coming.",
  "videoFocus": "從求助與道謝歌曲聽清楚先請人幫忙、完成後道謝，再練小餐館接待。",
  "focus": "招待家人時問候、邀請與感謝的時機。",
  "younger": "家人進門說 hello，邀請坐下說 please，收到幫忙說 thank you；一次只演一個情境，指卡加一詞即可。",
  "older": "依序接待家人，練 Hello! Please sit here. Thank you for coming.；另指出歌中求助的 please 與完成後 thank you 的不同時機，再換自己出題。",
  "caregiverTip": "保留南瓜空手暖身。主課 Can You Please Help Me? 直接示範 please 請人幫忙、找到物品後 thank you；hello 與 Please sit here. 是片後餐館情境。可以把一張紙當菜單，請家人幫放在座位旁，不需料理、點真餐或假稱影片有餐館。孩子當小老師時先讓家人回答，再說明用途。",
  "pausePrompts": [
    {
      "moment": "主課求助短段後，片後家人來到假想餐館時",
      "title": "先歡迎客人",
      "question": "請找 hello 卡。家人剛來到你的小餐館，你會先怎麼問候，讓他知道你已注意到他？",
      "followUp": "問候是片後接待的第一步，說 hello 或揮手後等待回應。",
      "targetWord": "hello"
    },
    {
      "moment": "片後邀請家人入座並請幫忙放菜單時",
      "title": "請坐，也請幫忙",
      "question": "請找 please 卡。想邀請家人坐在旁邊，並請他幫放好菜單，哪個禮貌詞可以放進請求？",
      "followUp": "示範 Please sit here. 或 Can you please help me?，一次練一句，不增加任務數。",
      "targetWord": "please"
    },
    {
      "moment": "家人真的完成放菜單的小幫忙後",
      "title": "幫完再道謝",
      "question": "請找 thank you 卡。菜單已放好，現在該再請一次，還是感謝剛剛的幫忙？",
      "followUp": "先讓孩子選擇，再說 Thank you；完整 Thank you for coming. 是歡迎客人的片後延伸。",
      "targetWord": "thank you"
    }
  ],
  "instructions": [
    "播放南瓜暖身短段，雙手在空中作輕輕挖取動作，再指自己的眼睛、鼻子與嘴附近。",
    "回播喜歡的一段，依臉部位置做小手勢，不拿工具模仿切割，也不用真南瓜。",
    "孩子設計一個南瓜表情讓家人猜，可以微笑或驚訝，不要求扮得可怕。",
    "喝水，用一個座位和一張假想菜單布置小餐館，開啟禮貌圖卡；預告主課先看求助與道謝。",
    "播放 Can You Please Help Me? 的一輪找物求助，聽請求、幫忙、感謝先後；片中不在餐館，待會才換情境。",
    "片後依 hello、please、thank you 完成進門、邀請與收到幫忙三題；家人真正放好菜單後再道謝，練本課接待句。",
    "孩子當小老師提出一個招待情境，等家人回答再交換；只依本人三次問答與一次開口記錄，不用背整首歌。"
  ]
},
  "w14d4b2": {
  "title": "小老師｜躲貓貓與三種問題",
  "sentence": "Adventure 138: No, it is not there. Let us look here.",
  "videoFocus": "躲貓貓聽位置問題，片後分辨否定、問物品與問位置的回應。",
  "focus": "不同聲音提示配對不同回答。",
  "younger": "玩偶位置指錯時說 no，拿起後說名字，再把它放到新位置回答 where-is-it；三題可以指圖與手勢配合。",
  "older": "用同一玩偶聽辨否定、What is it? 與 Where is it?，練 No, it is not there. Let us look here.，移動玩偶後能更新位置回答。",
  "caregiverTip": "保留農場暖身。Where Is Baby? 直接問家人在哪裡並回應看見；片後用一個大玩偶移到書旁或盒旁，練否定、問名稱與問位置。不要把固定連在自己手上的拇指說成能在另一隻手裡隨意換位置。no 不是所有問句的通用答案；中英文各以同一情境解釋，不說聲音相同。",
  "pausePrompts": [
    {
      "moment": "主課找人短段後，玩偶放在書旁卻指向空盒子時",
      "title": "不是那裡，再找這裡",
      "question": "請找 no 卡。玩偶明明在書旁，家長卻指空盒子問 Is it there?，你要怎麼提醒他？",
      "followUp": "說 No, it is not there.，再指書旁；用真實可見位置，不憑大人要求否定。",
      "targetWord": "no"
    },
    {
      "moment": "片後把找到的玩偶拿到大家看得見的位置時",
      "title": "聽到名稱問題",
      "question": "請找 what-is-it 卡，聽 What is it?。這次要說玩偶叫什麼，還是再指出它旁邊的書？",
      "followUp": "先回答名稱，再把卡配到問物品那一組；中文也可以先說明意思。",
      "targetWord": "what-is-it"
    },
    {
      "moment": "片後孩子把玩偶移到盒旁，交換提問者時",
      "title": "換位置就換答案",
      "question": "請找 where-is-it 卡，問 Where is it?。玩偶已經移到盒旁，還能照上一題回答書旁嗎？",
      "followUp": "指新位置，再練 Let us look here.；物品名字不變，位置可改變。",
      "targetWord": "where-is-it"
    }
  ],
  "instructions": [
    "播放農場暖身短段，挑一個實際聽到的動物聲音，家長示範、孩子接一次。",
    "回播一小段，聽到剛才的動物就做小手勢，其他動物先觀察，不要求記整段累加順序。",
    "孩子選一個動物聲音讓家人猜，輪流一次後收小動作，準備喝水。",
    "喝水，拿玩偶、書及空盒子，在桌面排出兩個可見位置，打開三種問答卡。",
    "播放 Where Is Baby? 的一輪尋找與出現，聽 Where 問位置，再以家人看見的回應核對。",
    "片後依 no、what-is-it、where-is-it 完成三題：否定指錯位置、說物品名、指出移動後的新位置，練 No, it is not there. Let us look here.。",
    "孩子小老師選一句讓家人聽音配卡，再交換回答；每人完成三題與一次聲音配對，不以一直說 no 代替理解。"
  ]
},
  "w14d5b1": {
  "title": "任務日｜把問候和感謝用出來",
  "sentence": "Adventure 139: Thank you for helping me. Bye! See you soon.",
  "videoFocus": "直接聽幫忙後的 Thank you for helping me，再用離開與回來情境複習道別問候。",
  "focus": "把感謝、道別與重新問候用在正確時機。",
  "younger": "收到家人遞回圖卡說 thank you，離開說 bye，回來說 hello；配指卡、點頭、揮手，各完成一回。",
  "older": "說出家人具體幫了什麼，練 Thank you for helping me. Bye! See you soon.；情境打亂時仍選對感謝、道別與問候，不照順序背詞。",
  "caregiverTip": "保留布偶問候暖身。新主課直接唱請家人幫忙找物及 Thank you for helping me；bye、hello 用片後家人離開又回來的情境複習，hello 也由暖身支援。不再安排食物喜好或醃黃瓜布丁問答。幫忙要有具體動作，如遞回圖卡，不以一句空泛故事代替互動。",
  "pausePrompts": [
    {
      "moment": "主課幫忙後道謝段結束，家人遞回一張圖卡時",
      "title": "這次謝謝哪件事",
      "question": "請找 thank you 卡。家人幫你把掉在桌旁的圖卡拿回來，現在可以怎麼回應，並說明謝謝哪件事？",
      "followUp": "指卡或說 Thank you for helping me.；不用真的故意把物品丟到地上。",
      "targetWord": "thank you"
    },
    {
      "moment": "片後家人幫完忙，揮手表示要離開時",
      "title": "幫忙後再道別",
      "question": "請找 bye 卡。家人現在準備離開，除了剛才的感謝，你會怎麼接一句道別？",
      "followUp": "補 Bye! See you soon.；這句是片後收尾，不假稱主課唱出。",
      "targetWord": "bye"
    },
    {
      "moment": "片後家人回到座位，重新開始遊戲時",
      "title": "新回合重新問候",
      "question": "請找 hello 卡。家人已經回來想再玩一次，你要重複說 bye，還是換一句招呼？",
      "followUp": "hello 對應重新見面；下一輪可換情境順序，避免背答案。",
      "targetWord": "hello"
    }
  ],
  "instructions": [
    "播放布偶問候暖身短段，跟拍手與揮手動作，站姿或坐姿都能參與。",
    "回播一個伸手或踏步片段，家長帶慢一些，不急著追上所有轉身動作。",
    "孩子選一個問候動作帶家人跟做，互相看見回應後再換人。",
    "喝水，開啟三張禮貌卡，先想一件家人現在真的能幫的小事，如把圖卡遞回桌中間。",
    "播放求助與道謝主課，回聽 Thank you for helping me，指出先得到幫忙才回應感謝。",
    "依 thank you、bye、hello 做收到幫忙、家人離開、重新回來三回合，練 Thank you for helping me. Bye! See you soon.。",
    "家長把情境換順序再出一題，讓每人自己選詞並說理由；正式記錄仍按原三題複習及一次開口，不加新領獎條件。"
  ]
},
  "w14d5b2": {
  "title": "任務日｜寵物特徵與雙語接棒",
  "sentence": "Adventure 140: A cat and a dog have paws; a fish has fins.",
  "videoFocus": "用歌詞直接包含的魚鰭與狗腳掌，加上貓的圖片腳掌比較，完成雙語提示、英文找卡和身體特徵描述。",
  "focus": "寵物特徵與雙語接棒",
  "younger": "聽fish、cat、dog三題並指圖，家長說中文名稱後再跟英文；先指出魚鰭或貓狗的腳，開口說Fish。",
  "older": "比較貓狗有腳掌、魚有鰭，練A cat and a dog have paws; a fish has fins.；與家人輪流中文提示、英文找圖，說清楚同一動物有兩種名稱。",
  "caregiverTip": "主課魚段直接唱fins、狗段唱paws，貓段唱whiskers；貓腳掌由圖卡比較補充。輪流中文提示、英文找卡，不用中文諧音記英文；不必準備玩偶。",
  "pausePrompts": [
    {
      "moment": "歌曲fish與fins段後",
      "title": "看清楚再回答",
      "question": "請找fish，指出魚鰭，再說中文魚和英文fish。",
      "followUp": "一個語言說完再換另一個，不混成諧音。",
      "targetWord": "fish"
    },
    {
      "moment": "歌曲cat段後",
      "title": "換個線索試試",
      "question": "請指cat，看看牠和dog都有什麼腳部特徵？",
      "followUp": "貓段唱鬍鬚，腳掌比較依圖另教，不虛稱貓段歌詞唱paws。",
      "targetWord": "cat"
    },
    {
      "moment": "歌曲dog與paws段後",
      "title": "輪到孩子練習",
      "question": "請找dog，說出dog的腳掌和fish的魚鰭哪裡不同。",
      "followUp": "可先用中文說，再跟家長分段說本課句型。",
      "targetWord": "dog"
    }
  ],
  "instructions": [
    "播放動作暖身短段，先跟一隻手臂的動作，再依能力增加另一隻，保持原地小範圍。",
    "回播熟悉的一段，可用坐姿伸手、輕抬腳代替大圈移動，不追求大班影片的隊形。",
    "孩子選一個身體部位作動作讓家人跟做，輪流後放鬆手腳，不持續轉圈。",
    "喝水，開啟fish、cat、dog圖卡，先說中文名稱，請孩子試找同一種英文卡。",
    "播放〈I Love My Pet〉的魚、貓、狗段，聽名字並指魚鰭、鬍鬚與腳掌；每段之後停下核對。",
    "比較貓狗腳掌與魚鰭，分段練A cat and a dog have paws; a fish has fins.；指出貓腳掌是看圖延伸。",
    "每名孩子複習fish、cat、dog三次，再與家人輪流中文提示、英文回應；名稱不同仍指同一動物，只記實際參與。"
  ]
}
};

const fifteenthWeekReviewedGuidance: Record<string, ReviewedTeachingGuidance> = {
  "w15d1b1": {
  "title": "探索日｜魚、鯊魚與牠們的海洋",
  "sentence": "Adventure 141: A shark is a fish that lives in the ocean.",
  "videoFocus": "直接聽海洋歌的 fish 與 shark，將動物名稱連到海的環境。",
  "focus": "魚與鯊魚的名稱、動物與環境的區別。",
  "younger": "先找fish、shark、ocean三張圖卡，配游動、頭頂魚鰭與雙手波浪；開口先說fish或shark。",
  "older": "用A shark is a fish that lives in the ocean.連起動物與環境，再用blue描述圖卡顏色；知道鯊魚也是魚，不把兩張不同畫法的圖卡當成互斥動物分類。",
  "caregiverTip": "保留節慶字母暖身。主課直接唱 fish、shark、blue 與 sea；本課用 ocean 連結廣闊海洋的概念，但不把 sea 和 ocean 說成每個地理情境都完全相同。鯊魚屬於魚類是家長補充，不是影片明說的分類定義。先取魚和鯊魚兩段，其他動物不增加必背量；不把動畫角色作為野生動物行為證據。",
  "pausePrompts": [
    {
      "moment": "主課魚的短段後，與鯊魚卡並看時",
      "title": "找魚，也找共同特徵",
      "question": "請找fish。這張魚圖和鯊魚圖都能在水裡游，請用手模仿游動，再指一指牠們的鰭。",
      "followUp": "先接住孩子的指認，家長補充鯊魚也是魚；本頁圖卡分別練名稱，不代表兩群完全不同。",
      "targetWord": "fish"
    },
    {
      "moment": "主課鯊魚段後",
      "title": "鯊魚也是魚",
      "question": "請找shark。哪張畫的是鯊魚？你可以把手放頭頂作魚鰭，再說shark嗎？",
      "followUp": "只作小幅手勢，不張嘴追咬家人；較熟悉者練A shark is a fish.。",
      "targetWord": "shark"
    },
    {
      "moment": "回聽海洋副歌後，片後比較動物與環境時",
      "title": "動物住在哪裡",
      "question": "請找ocean。魚和鯊魚可以在海洋裡游，哪張卡表示生活的地方，而不是一隻動物？",
      "followUp": "用雙手作波浪，練in the ocean；較熟悉者描述圖卡的blue，但不說海洋總是同一顏色。",
      "targetWord": "ocean"
    }
  ],
  "instructions": [
    "播放節慶字母暖身短段，輕拍大腿跟節奏，雙手比樹形或用手指作小裝飾動作。",
    "回播一段，讓孩子選一個看見的節慶物品作手勢，不要求背完整字母串。",
    "停片輪流當領隊，家長跟孩子的手勢；坐姿也能參與，不用準備裝飾或食物。",
    "喝水，並排放 fish、shark 和 ocean 圖卡，先預告一邊找動物、一邊找牠生活的地方。",
    "播放 Down In The Deep Blue Sea 的魚和鯊魚段，分次停下聽名稱；回看時再聽海的說法 sea。",
    "依 fish、shark、ocean 三題指認與作手勢，家長補充鯊魚也屬於魚，練 A shark is a fish that lives in the ocean.。",
    "一人指動物，一人指出環境，再交換；每名孩子自己完成三次認識和一次開口，不把其他海洋動物名稱加成領獎門檻。"
  ]
},
  "w15d1b2": {
  "title": "探索日｜恐龍的大與小",
  "sentence": "Adventure 142: This dinosaur is big, and that one is small.",
  "videoFocus": "從恐龍歌直接的 big 描述出發，用同一視距的兩個模型輪廓比較大與小。",
  "focus": "恐龍大小比較與片後玩具動作。",
  "younger": "先聽 big 並張大雙手，再縮成 small；第三題用手指輕跳表示 jump，不要求身體跳高或跟數到十。",
  "older": "比較同一距離的大、小恐龍輪廓，練 This dinosaur is big, and that one is small.；再讓假想玩具跳一下，說明大小和動作是不同描述。",
  "caregiverTip": "保留安靜節慶暖身。I Am A Dinosaur 直接唱 dinosaur 和 big，small 作為對比、jump 作為玩具動作在片後示範；不用點數歌冒稱大小教學。用紙畫一大一小兩個恐龍輪廓，或雙手先大後小，不必添購玩具。歌曲是扮演恐龍，不把友善、吼叫或大腳當所有恐龍共同的科學特徵；比較大小時維持相同觀看距離。",
  "pausePrompts": [
    {
      "moment": "主課 big 描述短段後，對照桌面輪廓時",
      "title": "雙手比大，說清楚比什麼",
      "question": "請找big。家長先用雙手作小輪廓，再在同一位置張大，哪個輪廓比較大？",
      "followUp": "孩子指認後自己作大手勢；不靠把手伸近眼睛假裝動物真的變大。",
      "targetWord": "big"
    },
    {
      "moment": "片後第二題，換成小輪廓時",
      "title": "小不等於少",
      "question": "請找small。把剛才的大輪廓縮小，一個小輪廓還是一個，還是變成零個？",
      "followUp": "示範大小改變、數量仍一個，先讓孩子找small，再補充大小與數量是不同問題。",
      "targetWord": "small"
    },
    {
      "moment": "片後第三題，手指演動作時",
      "title": "認識跳，不必真的跳高",
      "question": "請找jump。你能用兩根手指在另一隻手掌上輕輕跳一下嗎？",
      "followUp": "可以用手指動作或指卡完成，不必身體起跳；這是課後動作遊戲，不宣稱所有恐龍都這樣跳。",
      "targetWord": "jump"
    }
  ],
  "instructions": [
    "播放安靜節慶暖身短段，坐著輕擺與伸展雙手，讓身體慢慢準備。",
    "停片用手指作張開、合起的小動作，家長示範一次，孩子接著做，不要求跟成快舞。",
    "輪流用手作一大一小輪廓，孩子選自己的手勢，家長跟做後換人。",
    "喝水，畫兩個大小不同的恐龍輪廓，或用雙手示範大、小，開啟三張目標卡。",
    "播放 I Am A Dinosaur 中 big 的短段，聽大腳或看起來大的描述，再把這個大小詞用到手邊輪廓。",
    "依 big、small、jump 完成比較大、小及手指跳動三題，練 This dinosaur is big, and that one is small.；small 與 jump 由家長片後補教。",
    "家人輪流指定一個輪廓，另一人說大小或做手勢；再交換一次玩具動作，保留原合作任務，不要求背新歌全部詞。"
  ]
},
  "w15d2b1": {
  "title": "動起來｜星星、太空與火箭升空",
  "sentence": "Adventure 143: The rocket goes up into space.",
  "videoFocus": "聽太空歌直接的星星、太空與火箭，跟做三種不同概念的記憶手勢。",
  "focus": "太空名稱與火箭向上飛的口說。",
  "younger": "跟做star手指閃動、space雙手指向上方區域、rocket雙手併攏向上三個回合；坐姿可完成，先說star或rocket。",
  "older": "說The rocket goes up into space.，指出火箭是物件、space是太空環境；另看moon卡，分辨月亮與星星不是同一個詞。",
  "caregiverTip": "保留蛋先生暖身。主課直接有 stars、space、rocket ship 與向上飛的表達；stars 是複數，圖卡 star 練單數，rocket ship 以 rocket 接回原詞。手指閃動及雙手畫大範圍是家長記憶手勢，不是真實天體形狀。歌曲夜晚太陽不見是指當地看不見，不是太陽消失；只看教材，不直視太陽。",
  "pausePrompts": [
    {
      "moment": "主課星星段後，回到單數圖卡時",
      "title": "認識星星的名稱",
      "question": "請找star。用張開的手指作閃動手勢，再指出本頁的星星圖，可以說star嗎？",
      "followUp": "歌中唱 stars 表示多顆，這裡先指一顆說 star；五角星是記憶圖示，不是真實星星外形。",
      "targetWord": "star"
    },
    {
      "moment": "回聽 up there in space 的環境描述後",
      "title": "太空是環境",
      "question": "請找space。火箭可以到太空，太空是一個小玩具，還是很廣大的環境？",
      "followUp": "先接住指卡或手勢，家長用中文說明環境；星星、月亮與火箭可以分別命名，不把space當其中一件物品。",
      "targetWord": "space"
    },
    {
      "moment": "主課火箭向上飛的短段後",
      "title": "火箭向上走",
      "question": "請找rocket。雙手併攏像火箭，從胸前慢慢向上移，再說rocket；它要往哪個方向？",
      "followUp": "坐姿與手指動作都可，較熟悉者練The rocket goes up into space.；不拿道具發射或向人投擲。",
      "targetWord": "rocket"
    }
  ],
  "instructions": [
    "播放蛋先生暖身短段，一手作牆、另一手作圓圓角色，輕放在掌上。",
    "重聽一段，角色往下時只移動手勢，不從椅子跳下，也不以真雞蛋作摔落示範。",
    "孩子輪流帶一個手部動作，家長接著做，留出每人參與的時間。",
    "喝水，開啟太空四張卡，先分清 star 是天體、space 是廣大環境、rocket 是人造工具。",
    "播放 Sun, Moon, and Stars 的星星與火箭短段，聽到相關詞後分段回看；不要求跟全部裝備名稱。",
    "依 star、space、rocket 跟做手指閃動、畫大範圍與火箭上升三題，練 The rocket goes up into space.，完整句是家長整理的改述。",
    "孩子各帶一次火箭升空手勢，家人指出它要去的環境；每人自己跟做三次並開口一次，不用先會倒數才可完成。"
  ]
},
  "w15d2b2": {
  "title": "動起來｜小魚增加與一到三點數",
  "sentence": "Adventure 144: One fish, two fish, three fish swim in the sea.",
  "videoFocus": "直接聽每次多一條魚的點數歌，跟做海洋手勢並把一、二、三對上實際數量。",
  "focus": "一對一點數與每次增加一的海洋遊戲。",
  "younger": "先跟做blue指顏色、fish游動、shark魚鰭三個回合；用一到三根手指表示假想小魚，每指一隻只數一次。",
  "older": "看一條魚加入才從一數到二，再從二到三；練 One fish, two fish, three fish swim in the sea.，分清重唱與新增數量不同。",
  "caregiverTip": "保留水手暖身。10 Little Fishies 直接唱小魚逐條增加、在海中游以及 shark；fishy/fishies 是親暱說法，本課回到 fish。只取一到三即可，無須十條全部背完。blue 由圖卡顏色指認、ocean 由海的環境延伸；不假稱原歌唱 blue。用手指游動代替追逐，被鯊魚追的情節只是歌曲遊戲。",
  "pausePrompts": [
    {
      "moment": "主課一到三短段後，先回到圖卡顏色時",
      "title": "顏色不是動物",
      "question": "請找blue。指出圖卡上的藍色，再做指顏色的動作；blue是在說顏色，還是一隻魚的名字？",
      "followUp": "年幼孩子指對即可；不要求所有海洋動物都塗成藍色。",
      "targetWord": "blue"
    },
    {
      "moment": "回看第二條魚加入的段落後",
      "title": "多一根手指，多一隻小魚",
      "question": "請找fish。先伸一根手指作一隻小魚，再伸第二根；現在有幾隻？",
      "followUp": "每指一根只數一次，能跟上再加到三；歌重唱同一段不增加手指，也不重算原本那一隻。",
      "targetWord": "fish"
    },
    {
      "moment": "主課 shark 段後，交換手勢領隊時",
      "title": "同一個動作，輪流來",
      "question": "請找shark。家長先作頭頂魚鰭，孩子跟做後換孩子當領隊；輪到你時說shark，可以嗎？",
      "followUp": "歌中直接有 shark；先完成魚鰭動作，再各數一次一到三根手指小魚，不追咬家人。",
      "targetWord": "shark"
    }
  ],
  "instructions": [
    "播放水手出海暖身短段，一手遮額頭遠望，再輕擺作水中游動。",
    "回播喜歡的一種動物段落，只跟一種手勢；不要求把越來越長的動物清單全唱完。",
    "孩子帶一個遠望或游動手勢，家長跟做後換人，不追逐或攀高模仿出海。",
    "喝水，打開 blue、fish、shark 卡，準備一到三根手指當小魚，每新增一根才往下數。",
    "播放 10 Little Fishies 一到三的增加短段，聽 fishies 與數量；shark 的段落另回看，不要求一次唱到十。",
    "依 blue 指顏色、fish 游動加一、shark 魚鰭三題跟做，再以手指實作一到三，練原點數句。",
    "兩人輪流伸一根加入，另一人逐一指數；同一隻重游不多算，實際完成跟做和合作才記錄。"
  ]
},
  "w15d3b1": {
  "title": "配對日｜恐龍名稱與大小描述",
  "sentence": "Adventure 145: Dinosaurs can be big or small.",
  "videoFocus": "從恐龍歌的 dinosaur 與 big 分清名稱和描述，再加入 small 做大小詞分類。",
  "focus": "動物名稱與大小描述的語意分類。",
  "younger": "指 dinosaur 動物卡，再用雙手張大、縮小辨認 big/small；分類可指兩側位置，不必說完整理由。",
  "older": "將dinosaur放動物名稱一組，big和small放大小描述一組，說Dinosaurs can be big or small.；說明同一隻恐龍可以同時有名稱與大小描述。",
  "caregiverTip": "保留冰淇淋點數暖身；主課改看 I Am A Dinosaur 的 dinosaur 和 big，不再重做第二首恐龍點數。片後把 dinosaur 放名稱組，big/small 放大小描述組；small 是對比延伸，jump 另作動作詞，不把所有詞當恐龍種類。歌是扮演情境，不能從動畫遠近推論真實體型，也不必背恐龍專名。",
  "pausePrompts": [
    {
      "moment": "主課 dinosaur 與 big 短段後，開始分詞的用途時",
      "title": "先找動物名稱",
      "question": "請找dinosaur。這張卡是在說哪種動物，還是在說大或小？",
      "followUp": "指動物圖並放名稱一組；不用先說對每種恐龍的專名。",
      "targetWord": "dinosaur"
    },
    {
      "moment": "片後第二張卡，雙手張大時",
      "title": "大小用來描述",
      "question": "請找big。big是在說另一種動物，還是形容剛才的恐龍？",
      "followUp": "做大輪廓後指大小一組，再說big dinosaur；兩種詞可以連在一起用。",
      "targetWord": "big"
    },
    {
      "moment": "片後第三張卡，手勢縮小時",
      "title": "兩種大小，同一組",
      "question": "請找small。small應和big放大小那組，還是和dinosaur放名稱那組？",
      "followUp": "孩子先選再說理由，年幼孩子縮小手勢即可；大與小相反，但同樣描述大小。",
      "targetWord": "small"
    }
  ],
  "instructions": [
    "播放冰淇淋暖身短段，一手作杯、另一手假裝挖一球放入，跟著輕拍節奏。",
    "回播點數短段，用手指表示一到三球；能跟上再往十數，不需要真食物。",
    "孩子決定要幾球，家長依指數作挖球動作，再交換角色。",
    "喝水，拿三張卡，用左側作名稱組、右側作大小描述組，先說清楚這是在分詞的用途。",
    "播放 I Am A Dinosaur 的 dinosaur 和 big 描述短段，讓孩子聽見同一句能有動物名與大小詞。",
    "依 dinosaur、big、small 分類三題，再說 Dinosaurs can be big or small.；small 由家長作對比，不聲稱影片唱過。",
    "孩子自己把名稱卡與一張大小卡合在一起，家長換另一大小請他判斷；本人完成三次分類與一次開口才記錄。"
  ]
},
  "w15d3b2": {
  "title": "配對日｜月亮、星星與太空環境",
  "sentence": "Adventure 146: The moon and stars are in space.",
  "videoFocus": "直接從太空歌辨認月亮與星星，將天體名稱和所在環境分組。",
  "focus": "天體名稱、太空環境與分類理由。",
  "younger": "辨認moon圓弧、star星星卡與space環境卡；把月亮、星星指向天體那組，太空指向環境那組。",
  "older": "用 The moon and stars are in space. 說明分組理由，再指出 rocket 是人造工具，可在兩組外另放；不把火箭當天然天體。",
  "caregiverTip": "保留麋鹿問候暖身。Sun, Moon, and Stars 直接有 moon、stars、space 和 rocket ship；用 star 單數對回原卡。moon 與 star 放天體名稱，space 放環境，不把太空當第三顆星。歌曲用對天體打招呼的想像旅行，不是真實航程示範；月亮形狀是從地球所見受光面不同，不是月球本體換外形。",
  "pausePrompts": [
    {
      "moment": "主課月亮段後",
      "title": "月亮屬於哪一組",
      "question": "請找moon。月亮這張卡應放天體名稱，還是太空環境那一組？",
      "followUp": "先指卡再說 moon，月亮是天然天體；不把歌曲中的招呼想像當成登月經過。",
      "targetWord": "moon"
    },
    {
      "moment": "主課星星段後，與月亮卡並看時",
      "title": "星星不是月亮的另一個名字",
      "question": "請找star。star和moon是同一個詞嗎？它們都能放在哪一組？",
      "followUp": "兩張都放天體名稱，保留各自名稱；影片 stars 為複數，本課卡先練 star。",
      "targetWord": "star"
    },
    {
      "moment": "回聽 space 的環境表達，整理兩組時",
      "title": "太空是環境",
      "question": "請找space。月亮和星星都在太空，space表示一個環境，還是一顆月亮？",
      "followUp": "指環境一組，練in space；家長與孩子互換問答一次，依實際輪流記錄。",
      "targetWord": "space"
    }
  ],
  "instructions": [
    "播放麋鹿問候暖身短段，揮手說hello，再用雙手比鹿角作小幅動作。",
    "回播喜歡的問候段，家長先做，孩子回應後再換人。",
    "停片讓孩子帶一個問候或點數手勢，坐著也能參與。",
    "喝水，並排月亮、星星、太空三張卡，用兩側代表天體名稱和所在環境。",
    "播放太空歌月亮與星星短段，留意各段都提到 space；不要求猜下個畫面或背裝備名稱。",
    "依 moon、star、space 分類三題，練 The moon and stars are in space.；用同一句把兩類關係連起來。",
    "家人輪流挑卡說明為何放在這組，再交換提問；可用指認表示理由，保留各自三次分類及一次合作。"
  ]
},
  "w15d4b1": {
  "title": "小老師｜海上方向與海洋問答",
  "sentence": "Adventure 147: The boat goes up and down on the waves.",
  "videoFocus": "海上船歌跟方向與天氣，片後問海洋、顏色與魚的名稱。",
  "focus": "海上方向、天氣與海洋問答。",
  "younger": "用雙手作小船向上、向下，回答ocean指海洋、blue指顏色、fish指魚三題；可先說up或fish。",
  "older": "說The boat goes up and down on the waves.，分清船在海面、魚在水裡；輪流用「在哪裡、什麼顏色、什麼動物」問三種問題。",
  "caregiverTip": "雙手可作樂器與船，不需購買道具。樂隊暖身聽一種樂器，用輕拍大腿或原地踏步回應。主課是船、方向與天氣的動作歌，不是魚類逐隻出場清單；fish是片後延伸，不等牠一定出現。船上下左右只用手勢，留在穩定地面。sea與ocean在本課都連到海的情境；blue描述畫面顏色，不代表所有海水永遠藍色。",
  "pausePrompts": [
    {
      "moment": "海上船歌短段後，第一題時",
      "title": "問在哪裡，回答地方",
      "question": "請找ocean。手掌小船在海上走，這一題問的是在哪裡，還是什麼顏色？",
      "followUp": "先指海洋卡，再示範on the sea；不用把ocean當成一隻動物。",
      "targetWord": "ocean"
    },
    {
      "moment": "片後第二題，指圖卡顏色時",
      "title": "問顏色，回答藍色",
      "question": "請找blue。家長指海洋卡上的藍色，問What color is it?，要回答哪個詞？",
      "followUp": "孩子指藍色或說blue即可；若換指別的顏色，就依實際顏色回答。",
      "targetWord": "blue"
    },
    {
      "moment": "片後第三題，手指作小魚時",
      "title": "魚游動，船在海面",
      "question": "請找fish。我用手指作小魚在水裡游，問What is it?，你能回答嗎？",
      "followUp": "示範fish後互換出題；不拿船當魚，也不宣稱魚剛剛一定出現在主課。",
      "targetWord": "fish"
    }
  ],
  "instructions": [
    "播放樂隊暖身短段，選一種樂器聲音，輕拍大腿或手比吹奏。",
    "回播一段，家長跟節奏原地踏步，孩子可用坐姿拍手回應。",
    "停片換孩子當指揮，手舉起開始、放下停止，讓其他家人跟做。",
    "喝水，開啟ocean、blue、fish、shark圖卡，預告主課看船與方向，片後練三種問答。",
    "播放海上船歌短段，雙手小船跟上下或左右方向，聽到天氣詞就停一下作相應小手勢。",
    "片後回答ocean地方、blue顏色、fish動物三題；練The boat goes up and down on the waves.，年幼孩子先補up或down。",
    "孩子自己回答三回合，再輪流帶一次小船手勢與開口；給提示後仍讓孩子完成，不只看影片就勾選。"
  ]
},
  "w15d4b2": {
  "title": "小老師｜玩具恐龍與中英文動作",
  "sentence": "Adventure 148: My toy dinosaur can jump.",
  "videoFocus": "直接聽玩具恐龍與 jump 動作詞，再把名稱、動作和大小換成中英文問答。",
  "focus": "玩具名稱與動作的跨語言對應。",
  "younger": "回答jump、dinosaur、big三題，指卡或做手指跳、小恐龍姿勢、大輪廓；聽「恐龍」與dinosaur，知道可指同一張圖。",
  "older": "用My toy dinosaur can jump.描述假想玩具動作；輪流聽「恐龍／dinosaur」、「大／big」，說明聲音不同也可以指同一概念。",
  "caregiverTip": "保留 ABC Clap 暖身。Playing With My Car 不只唱汽車，另有玩具恐龍與跳繩兩段；dinosaur 和 jump 都直接唱出，但恐龍段是 stomp、jump 段是跳繩，不能說影片恐龍正在跳。片後才讓假想玩具恐龍 jump，並以大、小輪廓補 big/small。中文與英文分輪說，不把兩種語言的音節或字母當相同。",
  "pausePrompts": [
    {
      "moment": "主課跳繩的 jump 段後",
      "title": "一個動作，兩種說法",
      "question": "請找jump。家長說「跳」再說jump，你能用兩根手指做同一個跳動嗎？",
      "followUp": "歌中 jump 用在跳繩，這裡用手指表示同一動作；假想恐龍跳是片後創作，不是真實恐龍能力結論。",
      "targetWord": "jump"
    },
    {
      "moment": "回看玩具恐龍段後",
      "title": "聽到哪個名稱，都指同圖",
      "question": "請找dinosaur。我說「恐龍」或dinosaur，你會指兩張不同的圖，還是同一張？",
      "followUp": "孩子指同圖，較熟悉者各說一次；不把中文音節拆成英文字母。",
      "targetWord": "dinosaur"
    },
    {
      "moment": "片後第三題，雙手比大時",
      "title": "聽大小詞，換人問一次",
      "question": "請找big。中文說「大」、英文說big，手勢需要換成小的嗎？",
      "followUp": "維持大輪廓，再讓孩子問家長「大」或big；輪到並實際回應才算合作。",
      "targetWord": "big"
    }
  ],
  "instructions": [
    "播放〈ABC Clap〉第一輪，聽到拍手聲就輕拍一下；字母可跟著聽，不要求一次全背。",
    "回看同一輪，先跟說熟悉的字母，再在拍手空位做動作；不把拍手聲當成字母發音。",
    "停片後家長說三個熟悉字母，選一個位置改拍手，孩子輪流帶一次，準備恐龍名稱的字母聆聽。",
    "喝水，開啟 jump、dinosaur、big 三張卡，先看一個概念可以有中文、英文兩種名稱。",
    "播放玩具恐龍段與跳繩的 jump 段，各看一小段；辨別歌中是恐龍跺腳、跳繩的人跳，不把兩段合稱原畫面。",
    "依 jump、dinosaur、big 完成中英問答，再讓手指假想恐龍輕跳，練 My toy dinosaur can jump.，明說這是我們的新玩法。",
    "孩子選中文或英文提示，家人指同一張卡或做同一動作再交換；完成三次問答與一次接棒，不要求學完其他玩具詞。"
  ]
},
  "w15d5b1": {
  "title": "任務日｜太空名稱與天體分類",
  "sentence": "Adventure 149: The sun is a star, and the moon is not a planet.",
  "videoFocus": "從太空歌直接複習火箭、月亮與星星，再由家長補充太陽和月亮的分類。",
  "focus": "人造工具、星星與月亮的概念區別。",
  "younger": "指rocket火箭、moon月亮、star星星三張圖，配雙手向上、圓弧與手指張開；先說一個名稱即可。",
  "older": "說The sun is a star, and the moon is not a planet.，知道火箭是人造工具，月亮不是八大行星之一；辨認名稱，不要求背行星順序。",
  "caregiverTip": "保留農場暖身。Sun, Moon, and Stars 直接唱 rocket ship、moon、stars、space，適合原三張複習卡；star 單數接回 stars 複數。The sun is a star, and the moon is not a planet. 是家長的科學補充，並非逐字歌詞：太陽是恆星，月亮是地球的天然衛星。歌詞說夜晚太陽不見，是當地視野改變，太陽沒有消失。只看圖卡，不直視太陽；不新增背行星名的條件。",
  "pausePrompts": [
    {
      "moment": "主課火箭段後，回到三張複習卡時",
      "title": "人造工具與自然天體",
      "question": "請找rocket。火箭是人造工具，還是像月亮一樣的自然天體？",
      "followUp": "歌中直接有 rocket ship，回到卡上說 rocket；先指認，再由家長說明它是人造工具。",
      "targetWord": "rocket"
    },
    {
      "moment": "主課月亮段後，家長補充衛星概念時",
      "title": "月亮不是行星清單裡的一員",
      "question": "請找moon。月亮繞著地球走，它是地球的衛星，還是八大行星之一？",
      "followUp": "較年幼孩子只指moon；家長補充衛星，不因聽不懂新名詞就判本頁指認錯誤。",
      "targetWord": "moon"
    },
    {
      "moment": "主課星星段後，片後連結白天的太陽時",
      "title": "太陽也是一顆星星",
      "question": "請找star。白天常聽到的太陽也是星星，可以先說star，再跟一句The sun is a star.嗎？",
      "followUp": "只看本頁圖卡或想像，不直視太陽；較熟悉者接完整句型，其他孩子先完成自己的名稱複習。",
      "targetWord": "star"
    }
  ],
  "instructions": [
    "開啟農場暖身短段，跟一種動物的叫聲與小手勢；若原片不能播放，先由家長示範牛、鴨兩種聲音。",
    "孩子選一種聲音讓家長猜，輪流回應，不把火箭詞硬塞進農場歌。",
    "停片輪流帶一個動物手勢，再把動作縮小；暫時無法播放的暖身，可在影片恢復後再回看。",
    "喝水，將 rocket、moon、star 三張卡放好，預告這次要找出人造工具與自然天體。",
    "播放太空歌火箭、月亮與星星的短段，聽到各名稱後分次回看；不是背八大行星順序的課。",
    "依 rocket、moon、star 複習三題，家長另說明太陽是恆星、月亮是地球的天然衛星，再練原科學句。",
    "孩子自己指出三張卡，選一個名稱或句子開口；較熟悉者說分類理由，不能把新增科學名詞當年幼孩子的領獎條件。"
  ]
},
  "w15d5b2": {
  "title": "任務日｜海洋探險與輪流解說",
  "sentence": "Adventure 150: I can see a shark swimming in the sea.",
  "videoFocus": "直接聽主課 shark、blue 與 fish，輪流介紹動物、所在海洋及顏色。",
  "focus": "海洋動物、環境與顏色複習。",
  "younger": "複習shark指鯊魚、ocean作波浪、blue指顏色，三回合各給時間；說shark或跟游動手勢即可。",
  "older": "用I can see a shark swimming in the sea.解說，再指出blue描述圖卡顏色、ocean表示環境；與家長輪流當海洋小導覽員。",
  "caregiverTip": "保留交通工具暖身。主課直接有 shark、fish、blue 和 sea；ocean 為家長連結海洋的延伸。三題按 shark、ocean、blue 做，不要求按歌曲出場順序回答；可先回看鯊魚再回副歌。動物、環境和顏色不是三種互斥動物；鯊魚屬魚類是家長補充。全程只以手勢游動，不需要真水或道具。",
  "pausePrompts": [
    {
      "moment": "回看主課鯊魚段後",
      "title": "介紹一隻海洋動物",
      "question": "請找shark。你能指鯊魚圖、用手作游動，再說shark嗎？",
      "followUp": "較熟悉者接I can see a shark swimming in the sea.，不把找圖速度當完成標準。",
      "targetWord": "shark"
    },
    {
      "moment": "片後第二題，換環境圖卡時",
      "title": "牠生活的地方",
      "question": "請找ocean。這次是介紹一隻動物，還是介紹牠可以生活的地方？",
      "followUp": "指海洋卡或作波浪，讓孩子先答，再補充環境的意思。",
      "targetWord": "ocean"
    },
    {
      "moment": "片後第三題，輪流當導覽員時",
      "title": "顏色也能幫忙描述",
      "question": "請找blue。你指圖卡的藍色讓家長找，接著換家長出題，兩人各輪一次可以嗎？",
      "followUp": "指出blue描述顏色，不是動物名字；每位孩子真的輪到並回應才勾合作。",
      "targetWord": "blue"
    }
  ],
  "instructions": [
    "播放交通工具暖身短段，雙手握想像方向盤，坐姿作輕轉方向動作。",
    "回播一段，孩子選車或火車聲音讓家長模仿，不在屋內追逐。",
    "停片輪流作開始與停車手勢，收回雙手再換下一個領隊。",
    "喝水，開啟 shark、ocean、blue、fish 卡，預告每人要介紹一隻動物、一個地方與一種顏色。",
    "播放 Down In The Deep Blue Sea 的鯊魚段與副歌，直接聽 shark 和 blue sea；先由孩子選要回看的短段。",
    "依 shark、ocean、blue 三題複習，以 ocean 連結歌曲 sea 的海洋情境，練 I can see a shark swimming in the sea.。",
    "每人輪到一次小導覽員，指卡介紹後等家人回應再交換；記實際三次複習與合作，不以多背動物名加分。"
  ]
}
};

const sixteenthWeekReviewedGuidance: Record<string, ReviewedTeachingGuidance> = {
  "w16d1b1": {
  "title": "探索日｜換個順序找顏色",
  "sentence": "Adventure 151: I can find yellow, green, and red.",
  "videoFocus": "顏色歌連結常見物品，片後打亂順序找顏色。",
  "focus": "顏色辨認與換序提取。",
  "younger": "先聽yellow、green、red三個口令，各指一次圖卡；等三秒再給顏色手勢或示範，能說一詞即可。",
  "older": "說I can find yellow, green, and red.，再讓家長換順序出題，找出本頁圖卡或身旁物品上的同色部分，說明物品名稱與顏色不同。",
  "caregiverTip": "準備本頁顏色圖卡即可；若身旁剛好有同色物品，可指給家人看。Pinocchio暖身跟左右手臂、小幅踏步，不把顏色詞塞進原歌。主課用顏色與物品建立聯想，片後改用yellow、green、red順序提取；等三到五秒再給線索。歌裡的蘋果是紅色例子，不代表每顆蘋果都紅色；依眼前實際顏色回答。",
  "pausePrompts": [
    {
      "moment": "顏色歌短段後，換序第一題時",
      "title": "先聽，再找黃色",
      "question": "請找yellow。先等一下，再指本頁黃色圖卡或身旁的黃色部分。",
      "followUp": "孩子先找，家長再示範yellow；找不到身旁物品時，直接用本頁圖卡。",
      "targetWord": "yellow"
    },
    {
      "moment": "片後第二題，換成綠色時",
      "title": "換口令，換一張卡",
      "question": "請找green。這次不照歌裡的顏色順序，你會指哪張？",
      "followUp": "指綠色即可；較熟悉者說green，再指出與黃色不同的位置。",
      "targetWord": "green"
    },
    {
      "moment": "片後第三題，孩子出題前",
      "title": "找紅色，輪你出題",
      "question": "請找red。指出紅色後，換你選一種顏色讓家長找，好嗎？",
      "followUp": "依實際指到的顏色確認；先完成自己的三次辨認，再玩出題。",
      "targetWord": "red"
    }
  ],
  "instructions": [
    "播放Pinocchio暖身短段，家長跟一側手臂動作，孩子可站著或坐著模仿。",
    "回播左右手臂或腿部短段，跟節奏小幅移動；先看家長示範，再換邊。",
    "停片讓孩子帶一個已做過的動作，其他人跟做，再換領隊。",
    "喝水，開啟yellow、green、red、blue圖卡，說明片後會換順序找顏色。",
    "播放顏色主課一小段，聽顏色、找當下畫面相應部分；喜歡的物品可以按停多看。",
    "片後用yellow、green、red順序各問一次，先等三到五秒再提示；練I can find yellow, green, and red.。",
    "每名孩子實際辨認三次並開口說一詞或句子，家長記錄本人完成的回合，再讓孩子選一題考大人。"
  ]
},
  "w16d1b2": {
  "title": "探索日｜南瓜表情與換序點數",
  "sentence": "Adventure 152: I can show four fingers, then one finger.",
  "videoFocus": "南瓜歌曲觀察表情與數量，片後用手指換序點數。",
  "focus": "南瓜表情、數量與換序點數。",
  "younger": "先用手指表示four、one、two，家長可先示範再讓孩子自己重做；說one或four即可。",
  "older": "說I can show four fingers, then one finger.，換four、one、two順序逐一點數；說明重唱同一句不會自動多出一組物件，表情也不是數量。",
  "caregiverTip": "本頁數字圖卡與雙手就足夠。叢林暖身跟一到三步、停下聽聲音，坐著可改手指踏步。南瓜主課由 one 唱到 five，數量與表情一起變化；先看該段實際數量，片後改成 four、one、two 換序點數；這不是找物速度比賽。每根伸出的手指只數一次，四根收成一根後重新數；不要把歌詞重複次數加成南瓜總數。輪流時每名孩子都要有自己的操作回合。",
  "pausePrompts": [
    {
      "moment": "南瓜歌短段後，片後第一回合時",
      "title": "四根手指，一根數一次",
      "question": "請找four，再伸四根手指，從一開始一根一根點數，可以嗎？",
      "followUp": "家長可協助比出四根，接著讓孩子自己指數；數字圖卡可作提醒。",
      "targetWord": "four"
    },
    {
      "moment": "片後第二回合，收起三根手指時",
      "title": "數量變了，要重新看",
      "question": "請找one。現在只留一根手指，應說four，還是one？",
      "followUp": "先看實際伸出幾根，再說one；不必照歌曲順序回答。",
      "targetWord": "one"
    },
    {
      "moment": "片後第三回合，輪流出數量時",
      "title": "兩根手指，換人核對",
      "question": "請找two。你伸兩根讓家長數，再換家長伸兩根給你數，好嗎？",
      "followUp": "每人一根一根指，完成自己的數量辨認與輪流操作才勾任務。",
      "targetWord": "two"
    }
  ],
  "instructions": [
    "播放叢林暖身短段，跟一到三步的節奏，坐著可讓手指在掌心走路。",
    "回播停下聽聲音的短段，先停動作，再模仿當下聽到的動物或指出畫面。",
    "停片換孩子帶走、停、聽三個手勢，再輪到下一位。",
    "喝水，開啟four、one、two、three圖卡，預告看南瓜表情，片後用手指換序點數。",
    "開啟南瓜主課短段，觀察當下表情並指數畫面物件；歌詞重複時仍看同一組，不重複累加。",
    "片後依four、one、two口令伸手指再逐一數，練I can show four fingers, then one finger.，年幼孩子先說一詞。",
    "每名孩子辨認三次數量，另輪到一次出題或核對；只記實際參與，不以速度或多背單字加新門檻。"
  ]
},
  "w16d2b1": {
  "title": "動起來｜躲貓貓與肯定否定回答",
  "sentence": "Adventure 153: Can you see me? Yes, I can!",
  "videoFocus": "躲貓貓歌練遮住與看見，片後練yes、no和提問。",
  "focus": "躲貓貓與肯定、否定回答。",
  "younger": "家長張開手露出臉時說yes，遮住臉時說no；第三回合聽what-is-it，指出家長手中的一根手指即可。",
  "older": "輪流問Can you see me?，依看見或遮住回答Yes, I can.或No, I cannot.；聽What is it?說物品名稱，聽Where is it?則指出位置。",
  "caregiverTip": "只用雙手與本頁圖卡。蝴蝶暖身是柔和搖籃曲，用手指作慢慢飛動與收攏，停片後伸展即可。聖誕躲貓貓主課重點是遮住與看見；yes、no、What is it?與Where is it?是片後家長帶的問答。先讓孩子看清楚再回答，不預設每題都要說yes；第三題可用家長的一根手指示範finger，不新增必背詞。",
  "pausePrompts": [
    {
      "moment": "躲貓貓短段後，家長露出臉時",
      "title": "真的看見才說是",
      "question": "請選yes或no。家長張開雙手露出臉，問Can you see me?，你會怎麼答？",
      "followUp": "先確認孩子看得到，說yes或Yes, I can.；看不到時依實際情況回答。",
      "targetWord": "yes"
    },
    {
      "moment": "片後第二題，家長遮住臉時",
      "title": "沒有看見也能回答",
      "question": "請選no或yes。家長用手遮住臉，再問Can you see me?，這次怎麼答？",
      "followUp": "依遮住臉的遊戲約定練no或No, I cannot.；孩子若說看到手，先接住觀察再說明問的是臉。",
      "targetWord": "no"
    },
    {
      "moment": "片後第三題，家長伸一根手指時",
      "title": "問是什麼，回答名稱",
      "question": "請聽what-is-it。家長伸一根手指問你，這是在問名稱，還是問在哪裡？",
      "followUp": "孩子可先指手指，家長補finger；再示範Where is it?需要指位置，兩種問題不是固定yes或no。",
      "targetWord": "what-is-it"
    }
  ],
  "instructions": [
    "播放蝴蝶搖籃曲短段，用雙手作慢慢飛動的翅膀，跟柔和節奏呼吸與伸展。",
    "回播喜歡的短段，手指輕輕收攏作休息動作，孩子可坐著跟做。",
    "停片輪流帶一個慢伸展動作，再張開手掌作看見彼此的問候。",
    "喝水，開啟yes、no、what-is-it、where-is-it圖卡，先示範看見與遮住時如何回答。",
    "播放聖誕躲貓貓短段，跟角色遮住、露出臉的遊戲，聽到熟悉問候可以一起說。",
    "片後做露臉yes、遮臉no、手指what-is-it三回合，練Can you see me? Yes, I can!，年幼孩子先說yes。",
    "每名孩子自己跟做三回合，再說一詞或句子；依真實回答給提示，不能把家長說過算成孩子已會。"
  ]
},
  "w16d2b2": {
    "title": "動起來｜寵物動作與混合點數",
    "sentence": "Adventure 154: I see a dog, a bird, and a fish.",
    "videoFocus": "寵物歌辨認動物與特徵，片後混合動作並點數。",
    "focus": "寵物名稱、特徵與混合點數。",
    "younger": "跟做dog小爪、bird翅膀、fish游動三個手勢；家長每做一種就伸一根手指，孩子可先跟數到三或說一個動物名。",
    "older": "說I see a dog, a bird, and a fish.，指出三種動物；家長打亂三個手勢再做一次，每做一個伸一根手指，分清這是在數動作回合，不是影片所有寵物。",
    "caregiverTip": "雙手與本頁圖卡即可，不需要家裡真的養寵物。Foxly暖身指自己的身體部位，先指頭、手等容易位置。主課聽寵物名稱與身體特徵，不要求每種動物都有叫聲；fish可做游動，bird可做翅膀。片後用dog、bird、fish三種手勢輪流出題，每次動作伸一根手指記一次，歌詞重複不算新增一隻寵物。",
    "pausePrompts": [
      {
        "moment": "寵物歌短段後，第一個動作時",
        "title": "狗的爪子，記一回合",
        "question": "請找dog，用雙手作小爪動作，再伸一根手指記第一回合。",
        "followUp": "先說dog或指狗卡，動作做過再記一，不要求用吠叫代替名稱。",
        "targetWord": "dog"
      },
      {
        "moment": "片後第二個動作，手臂作翅膀時",
        "title": "換鳥的動作，再記一次",
        "question": "請找bird。做翅膀手勢後，再多伸一根手指，現在有幾個動作回合？",
        "followUp": "先看兩根手指數one、two；點數是家長帶的片後延伸，孩子先完成bird跟做。",
        "targetWord": "bird"
      },
      {
        "moment": "片後第三個動作，輪到孩子出題時",
        "title": "魚游過來，三回合完成",
        "question": "請找fish，雙手作游動後加第三根手指；換你出一個動物手勢讓家長猜，好嗎？",
        "followUp": "魚用動作即可，不替牠編叫聲；孩子完成自己的跟做與輪流回應才記錄。",
        "targetWord": "fish"
      }
    ],
    "instructions": [
      "播放Foxly暖身短段，聽到熟悉身體部位就指自己，家長先示範頭與手。",
      "回播一小段，跟點指和輕搖動作，坐著也能參與。",
      "停片讓孩子指一個身體部位，家長跟做，再換下一位領隊。",
      "喝水，開啟dog、bird、fish、cat圖卡，預告主課看寵物特徵，片後做三個動作並點數。",
      "播放寵物主課短段，看到或聽到熟悉動物就按停指圖，觀察爪子、翅膀或魚鰭等當下特徵。",
      "片後輪做dog小爪、bird翅膀、fish游動，每回合伸一根手指，練I see a dog, a bird, and a fish.。",
      "每名孩子跟做三次，再輪到一次混合動作出題或回答；先看本人參與再勾選，不額外要求五個單字或三種句型。"
    ]
  },
  "w16d3b1": {
  "title": "配對日｜食物與飲水分組",
  "sentence": "Adventure 155: I eat pizza and apples, and I drink water.",
  "videoFocus": "從披薩歌的食物與吃的動作，對照 water 的喝水動作，再把 apple 放回可吃的食物組。",
  "focus": "吃與喝的二分比較。",
  "younger": "依pizza、water、apple三個口令指圖，做吃或喝的手勢，各完成一次分類；能說一個名稱即可。",
  "older": "說I eat pizza and apples, and I drink water.，把pizza與apple分到吃的食物、water分到喝的飲水；再說apple也屬於水果。",
  "caregiverTip": "本頁圖卡與雙手即可，無需真食物。〈Pizza Party〉直接教 pizza 及吃的動作；water、apple 是片後比較，不等它們出現在歌曲。這一輪只用吃與喝兩組，apple 和 pizza 都可放吃的那組，水果仍屬食物。與初學製作動作課不同，本節要求用相同規則完成三次分類。",
  "pausePrompts": [
    {
      "moment": "主課披薩吃的動作後",
      "title": "披薩是分類起點",
      "question": "請找 pizza，放到吃的或喝的哪一組？選完用手勢表示你的理由。",
      "followUp": "讓孩子先自己選；若不確定只示範吃的手勢，再請他重選。",
      "targetWord": "pizza"
    },
    {
      "moment": "停片換飲水卡作對比時",
      "title": "換成水需要換組嗎",
      "question": "請找 water，做喝水手勢。它應跟披薩同組嗎？",
      "followUp": "水是片後加入的對照；兩組位置不變，避免改規則造成混淆。",
      "targetWord": "water"
    },
    {
      "moment": "第三題加入蘋果、檢驗同一規則時",
      "title": "不同食物也能一起",
      "question": "請找 apple。它是水果，但也能吃，依今天吃或喝的規則，要跟誰同組？",
      "followUp": "apple 與 pizza 同放吃的；較熟悉孩子再說蘋果也是水果，不新增第三組作通關要求。",
      "targetWord": "apple"
    }
  ],
  "instructions": [
    "播放雪人道別暖身短段，跟節奏揮手、輕拍，選當下角色作問候。",
    "回播喜歡的一段，家長揮手孩子回應，再交換角色。",
    "停片由孩子帶一個道別與拍手動作，每位各輪一次。",
    "喝水，用左右手約定為吃的與喝的兩組，先指 pizza、water、apple 圖卡，不告訴孩子全部分類答案。",
    "播放〈Pizza Party〉短段，認出 pizza，選最後吃的動作停片；不重演整套製作流程，轉而比較吃與喝。",
    "片後依pizza、water、apple各分類一次，練I eat pizza and apples, and I drink water.；年幼孩子先說一詞。",
    "每名孩子自己分類三次並開口，提示後可再做；家長只勾本人完成的紀錄。"
  ]
},
  "w16d3b2": {
  "title": "配對日｜同一身體位置，兩種名稱",
  "sentence": "Adventure 156: These are my toes, and this is my head.",
  "videoFocus": "聽熟悉身體歌辨認toes、head、shoulders，對照中文名稱並配到位置。",
  "focus": "身體位置與中英文名稱配對。",
  "younger": "先聽toes、head、shoulders各指卡，再聽腳趾、頭、肩膀配同一張卡；可說一個英語詞。",
  "older": "將toes配腳部、head配頭部、shoulders配上身，輪流用中英文出題，練These are my toes, and this is my head.。",
  "caregiverTip": "主課明列四個英語部位。先聽英語指認，再由家長另說中文，兩種語言分輪配到同一位置，不新增注音。These are my toes, and this is my head.是片後組合句。Sing It可截取一輪並暫停，坐著指圖即可，不需彎腰或摸到腳趾。",
  "pausePrompts": [
    {
      "moment": "主課toes段後，加入中文名稱時",
      "title": "兩種名稱同一位置",
      "question": "先聽toes，再聽「腳趾」，都應配到哪個身體位置？",
      "followUp": "先英語再中文，不要求孩子讀文字。",
      "targetWord": "toes"
    },
    {
      "moment": "主課head段後",
      "title": "從腳到頭換位置",
      "question": "請找head，把它和toes分到不同位置，再說頭的中文名稱。",
      "followUp": "確認是頭部而非腳部，年幼可只指。",
      "targetWord": "head"
    },
    {
      "moment": "主課shoulders段後，孩子出題時",
      "title": "換你用兩種名稱",
      "question": "請用shoulders或「肩膀」問家人，他找的卡是否同一張？",
      "followUp": "每人都輪到提問和回答一次，再由孩子核對。",
      "targetWord": "shoulders"
    }
  ],
  "instructions": [
    "播放點數暖身短段，一拍一步或坐姿拍手，先跟數一到五。",
    "回播能跟上的小段，家長示範，孩子再接一段；不用把二十個數字一次背完。",
    "停片輪流帶拍手與停止手勢，逐步把動作縮小。",
    "喝水，開啟四張身體卡，預告今天歌曲用英文，家長稍後加中文名稱。",
    "播放Sing It一輪，toes、head、shoulders各聽到後停片選卡；以熟悉詞回想為主，不再學五官。",
    "把三張卡配到腳部、頭部、上身位置，再由家長換中文說一次；指腳趾和頭練These are my toes, and this is my head.。",
    "完成toes、head、shoulders三次分類，交換中英文出題者與回答者；每名孩子真實回答或操作後才記錄合作。"
  ]
},
  "w16d4b1": {
  "title": "小老師｜看雲和雨，問清楚天氣",
  "sentence": "Adventure 157: It is cloudy now, and it may rain later.",
  "videoFocus": "回想sunny、rainy、cloudy，分清現在觀察與可能下雨。",
  "focus": "天氣提問、觀察與可能性的區分。",
  "younger": "用sunny太陽、rainy雨滴、cloudy雲朵三個圖卡回答；可先指圖再說一詞。",
  "older": "輪流根據圖卡問天氣，說It is cloudy now, and it may rain later.；知道may是可能，不把有雲等同已下雨，也不把晴天等同一定很熱。",
  "caregiverTip": "主課直接唱三個天空詞，先讓孩子根據圖卡問家人，再回看歌曲核對。It is cloudy now, and it may rain later.是片後練習的可能性句型，不是影片預報或當天真實預測。有雲不一定正在下雨；hot仍是獨立體感。暖身慢版身體歌與天氣主課任務分開。",
  "pausePrompts": [
    {
      "moment": "主課sunny段後，孩子先提問時",
      "title": "先問再核對",
      "question": "請選sunny卡問家人，聽他回答後指出判斷晴天的線索。",
      "followUp": "家長先等孩子問完，最後才看答案。",
      "targetWord": "sunny"
    },
    {
      "moment": "主課rainy段後",
      "title": "已下雨需要什麼線索",
      "question": "請找rainy；哪個線索表示正在下雨？只看見雲夠不夠？",
      "followUp": "讓孩子指雨滴，把現在觀察和猜測分開。",
      "targetWord": "rainy"
    },
    {
      "moment": "主課cloudy段後，加入可能性句型時",
      "title": "可能不等於一定",
      "question": "請找cloudy，練It is cloudy now, and it may rain later.；may是在說一定還是可能？",
      "followUp": "先說It is cloudy.，熟悉再加後半句，不要求預測準確。",
      "targetWord": "cloudy"
    }
  ],
  "instructions": [
    "播放慢版身體暖身歌，先聽一個部位再指自己，坐著也能跟。",
    "回播頭、肩或膝等短段，每個詞給孩子足夠時間，不急著加速。",
    "停片輪流當領隊，說或指一個身體部位讓其他人跟做。",
    "喝水，拿三張天空卡，由孩子選一張當提問卡；先不告訴家人答案。",
    "播放〈How’s The Weather?〉短段，以sunny、rainy、cloudy核對卡片，孩子可先說再回看。",
    "做三個天氣問答，指雲卡練It is cloudy now, and it may rain later.；以雨滴卡比較正在下雨與可能下雨。",
    "每人回答三題並至少開口一次，再輪到出題；hot留作體感比較，不以猜中未來天氣作完成條件。"
  ]
},
  "w16d4b2": {
  "title": "小老師｜道路與軌道句型接棒",
  "sentence": "Adventure 158: The bus goes on the road, and the train goes on the tracks.",
  "videoFocus": "聽列車歌中的 train 與 tracks，片後和 bus 的道路、rocket 的太空做問答與句型接棒。",
  "focus": "交通路線比較與輪流造句。",
  "younger": "回答bus、train、rocket三張圖卡，配方向盤、車輪與向上手勢；先說一個名稱即可。",
  "older": "先說 train 走 tracks，再把 bus 走 road 接成 The bus goes on the road, and the train goes on the tracks.；換你問家人 rocket 去哪裡，聽完再核對，不只背三句。",
  "caregiverTip": "只用本頁交通圖卡和兩根手指作軌道。〈The Train Song〉直接唱列車沿軌道行進；bus 的道路、rocket 的升空由家長明示延伸。這次不重做進站快慢活動，而是輪流把交通名稱接到正確路線。醫生暖身用輕拍節奏與自己的身體部位參與。句型接棒不新增獎勵條件。",
  "pausePrompts": [
    {
      "moment": "列車軌道短段後，加入第一張道路車卡時",
      "title": "公車不能照搬軌道",
      "question": "請找 bus。它要配道路，還是直接跟剛才的列車走軌道？請指一邊。",
      "followUp": "先讓孩子辨認公車，再示範道路線；bus 是片後比較，不宣稱列車歌唱到。",
      "targetWord": "bus"
    },
    {
      "moment": "回看唱到列車軌道後，第二張卡接棒時",
      "title": "火車接到自己的路線",
      "question": "請找 train，讓兩根手指作軌道，接著家人的公車句說火車走哪裡。",
      "followUp": "較小孩子說 train 加手勢；較大孩子接 and the train goes on the tracks，交換角色再做。",
      "targetWord": "train"
    },
    {
      "moment": "第三張卡由孩子出題時",
      "title": "火箭換一個方向",
      "question": "請找 rocket，先做朝上手勢，再問家人它和公車、火車走的地方相同嗎？",
      "followUp": "讓家人回答後由孩子核對，辨太空與道路／軌道，不把火箭塞進原片歌詞。",
      "targetWord": "rocket"
    }
  ],
  "instructions": [
    "播放醫生暖身短段，跟著指自己聽到的身體部位，用揮手表示想請人幫忙。",
    "回播一小段，家長先指，孩子再模仿，配輕拍節奏即可。",
    "停片輪流說請幫忙或做相應手勢，其他人友善回應，再收小動作。",
    "喝水，打開 bus、train、rocket、car 圖卡；一手指道路、兩根平行手指作軌道，預告今天比較兩種路線。",
    "播放〈The Train Song〉唱到列車與軌道的短段，請孩子找 train，兩根手指沿平行軌道移動；停片後把 bus 的道路加入比較。",
    "回答 bus 道路、train 軌道、rocket 太空三題。兩人接棒，一人說 The bus goes on the road，另一人接 and the train goes on the tracks，再交換。",
    "每名孩子完成三次問答，另實際輪到一次出題或回答；較小孩子用名稱加手勢，較大孩子說完整對比句，不把背完額外句子當新門檻。"
  ]
},
  "w16d5b1": {
  "title": "任務日｜自然景物複習",
  "sentence": "Adventure 159: I can see the sun in the sky and a tree on the ground.",
  "videoFocus": "以花、樹、太陽、天空進行跨週自然景物複習。",
  "focus": "以花、樹、太陽、天空進行跨週自然景物複習。",
  "younger": "指 sun、sky、tree 三張卡，配一個向上或伸枝動作。",
  "older": "說原句並加入 flower，分清 sun、sky 是天空景物、tree、flower 是植物。",
  "caregiverTip": "用本頁圖卡或手勢即可，聽到flowers、trees時，先指出一朵flower、一棵tree，再說明歌曲唱的是多朵花、多棵樹。以圖卡觀察sun，不用直視太陽；每次暫停留三秒讓孩子自己回應。",
  "pausePrompts": [
    {
      "targetWord": "sun",
      "moment": "回看sun段後",
      "title": "打亂順序後還能找到sun嗎？先自己試。",
      "question": "打亂順序後還能找到sun嗎？先自己試。",
      "followUp": "想不起來再給向上指的線索，不立即代答。"
    },
    {
      "targetWord": "sky",
      "moment": "回看sky段後",
      "title": "把sky放到sun旁",
      "question": "請把sky放到sun旁，用一句話連起來。",
      "followUp": "可先說sun in the sky，再由家長帶完整句。"
    },
    {
      "targetWord": "tree",
      "moment": "回看trees段後",
      "title": "找tree",
      "question": "請找tree，和sky比較它長在哪裡？",
      "followUp": "用地面與上方手勢，接回原句的ground。"
    }
  ],
  "instructions": [
    "播放萬聖節暖身短段，選一個聲音配小手勢，家長先做孩子再接。",
    "回播能跟上的接龍段，做一到兩個動作即可，不必一次記住整串。",
    "停片由孩子選喜歡的一個手勢讓家人模仿，逐一輪流。",
    "依 sun、sky、tree、flower 排卡，先複習原句中的 sun、sky、tree。",
    "播放〈Good Morning, It’s Such A Beautiful Day〉；依歌曲的 sun、sky、flowers、trees 停片指認。",
    "將sun、sky、tree卡打亂後重新指認，練I can see the sun in the sky and a tree on the ground.；用手上、下位置表示天空與地面，再補認識flower。",
    "每名孩子自己複習三次，再換順序重述一個詞或句子；以本頁圖卡完成，不要求剛好有相同窗景。"
  ]
},
  "w16d5b2": {
  "title": "任務日｜借文具與禮貌情境",
  "sentence": "Adventure 160: Hello! May I have it, please? Thank you. Bye!",
  "videoFocus": "文具問答歌觀察借用與道謝，片後在不同情境選禮貌用語。",
  "focus": "借文具、問候、請求與道別。",
  "younger": "聽到離開情境揮手說bye，見面說hello，想請人幫忙時說please；圖卡與手勢各複習一次。",
  "older": "用Hello! May I have it, please? Thank you. Bye!演一段借物對話，再交換角色；任務把情境打亂提問，實際對話仍依見面、請求、道謝、道別的自然順序。",
  "caregiverTip": "只用本頁圖卡或假想文具即可。暖身〈If You Love To Dance And Move〉可直接跟做動作；邀請家人加入的禮貌句由家長在停片後示範。主課問是否有文具、提供物品並道謝，片後將bye、hello、please帶入不同情境。請求用please，收到幫助說thank you，兩者不能互相取代；沒有真文具也能用手勢演。",
  "pausePrompts": [
    {
      "moment": "文具歌短段後，複習離開情境時",
      "title": "先聽情境，選道別詞",
      "question": "請找bye。今天的小借物遊戲結束了，要離開時，你會說bye還是hello？",
      "followUp": "先揮手道別；這是打亂順序的複習題，不代表完整對話從道別開始。",
      "targetWord": "bye"
    },
    {
      "moment": "片後第二題，換成剛見面時",
      "title": "換個情境，換個詞",
      "question": "請找hello。現在剛見到家人，準備一起畫畫，應先說什麼？",
      "followUp": "孩子說hello或揮手問候，再與離開時的bye比較。",
      "targetWord": "hello"
    },
    {
      "moment": "片後第三題，想借一件物品時",
      "title": "請求與收到後的感謝",
      "question": "請找please。想借家長手中的假想蠟筆，你會在請求時加哪個詞？",
      "followUp": "示範May I have it, please?，收到後說thank you；再交換角色，輪到並回應才記合作。",
      "targetWord": "please"
    }
  ],
  "instructions": [
    "播放〈If You Love To Dance And Move〉，跟著指手指、原地踏步或揮動雙手，先選兩個動作即可。",
    "回看孩子熟悉的一段，聽到動作指令再跟做；轉圈可改手掌慢轉，坐著也能參加。",
    "停片後孩子邀請家人做一個動作，家人回應後交換；再以hello開啟後面的借文具對話。",
    "喝水，開啟bye、hello、please、thank you圖卡，用雙手或假想文具準備借物遊戲。",
    "播放文具主課短段，聽到問是否有物品、提供物品或道謝時停一下，依當下對話模仿。",
    "片後先用bye、hello、please三個情境打亂提問，再練Hello! May I have it, please? Thank you. Bye!的自然對話。",
    "每名孩子完成三次情境複習，另輪到一次借物請求或回應；家長按本人實際參與記錄，不因旁觀而一起勾選。"
  ]
}
};

const seventeenthWeekReviewedGuidance: Record<string, ReviewedTeachingGuidance> = {

  "w17d3b1": {
  "title": "配對日｜把求助與道謝放對時機",
  "sentence": "Adventure 165: Hello! Can you please help me find my toy?",
  "videoFocus": "找玩具的求助與道謝，片後配對三種對話時機。",
  "focus": "禮貌用語與情境配對。",
  "younger": "聽家長說見面、需要幫忙、找到玩具三個情境，分別指hello、please、thank you圖卡；先說一詞即可。",
  "older": "用Hello! Can you please help me find my toy?請家長幫忙；找到後自己說thank you，再說明請求與道謝發生在幫忙前後。",
  "caregiverTip": "用本頁圖卡與主課暫停畫面就足夠。暖身第二版選搖盪、拍球或敲門手勢，每次加一種，忘記可以跟示範。主課有請家人幫忙找玩具與找到後道謝；hello是片後加的開場。家長用見面、請求、道謝三種情境讓孩子配詞，不必準備與影片同色同款的玩具。",
  "pausePrompts": [
    {
      "moment": "片後求助小劇場開場時",
      "title": "先見面，再請幫忙",
      "question": "請把hello配給見面、需要幫忙、找到玩具哪個時機？",
      "followUp": "孩子指卡或選見面，家長自然示範hello，不要求在原歌找這句。",
      "targetWord": "hello"
    },
    {
      "moment": "主課角色請家人幫忙時",
      "title": "還沒找到，可以請求",
      "question": "請把please配給需要幫忙的時機。你想請家長幫什麼忙？",
      "followUp": "指暫停畫面的玩具，先說please；較熟悉者說求助句。",
      "targetWord": "please"
    },
    {
      "moment": "主課玩具找到、角色道謝後",
      "title": "找到以後，說聲謝謝",
      "question": "請把thank you配給哪個時機：還在請求，還是剛得到幫助？",
      "followUp": "先接住孩子意思，再示範找到後道謝；三次配對都由本人做。",
      "targetWord": "thank you"
    }
  ],
  "instructions": [
    "播放Toodly Doodly Doo第二版短段，雙手慢慢搖盪，再跟一個聽到的趣味聲音。",
    "回播拍球或敲門短段，每次加一種手勢；坐著可在掌心輕拍。",
    "停片換孩子選一個已做過的手勢，其他家人跟做，再交換領隊。",
    "喝水，開啟hello、please、thank you、bye圖卡，預告把用語配給見面、請求、道謝。",
    "播放求助主課短段，先聽誰需要幫忙、找什麼玩具；找到與道謝後按停。",
    "片後用三種情境各配一張圖卡，再練Hello! Can you please help me find my toy?，指畫面也能說明要找的玩具。",
    "每名孩子實際配對三次，再主動說一詞或求助句；幫忙後給孩子道謝機會，不以大人代答記完成。"
  ]
},
  "w17d3b2": {
  "title": "配對日｜問答輪流與回合點數",
  "sentence": "Adventure 166: Please take a turn. Thank you! Now it is my turn.",
  "videoFocus": "直接聽 my turn 和 your turn 的輪流歌，再把邀請、感謝、告別配到兩人的回合。",
  "focus": "輪流的先後與完成回合的點數。",
  "younger": "用 please 邀請、thank you 回應、bye 結束三種情境配卡；自己輪到時做一個暖身手勢，對方完成後再換手。",
  "older": "用 Please take a turn. Thank you! Now it is my turn. 邀請和換人；每人完成一個動作才數一回合，說明兩人各一次是兩回合。",
  "caregiverTip": "保留 Toodly Doodly Doo 暖身。主課 Let’s Take Turns 直接示範你的回合與我的回合，支援當天輪流句；please、thank you、bye 為片後加進互動的禮貌詞，不假稱歌裡都有。用兩人輪流各做一個熟悉手勢，每人完成才伸一根手指計數，重複說話或修正不多算回合。",
  "pausePrompts": [
    {
      "moment": "片後邀請第一位回答時",
      "title": "請你先說，配哪一句",
      "question": "請把 please 配給邀請家人開始一個手勢的時機。你請誰先做，自己要等到什麼時候？",
      "followUp": "示範 Please take a turn.；第一人真的做完，才伸一根手指表示一回合。",
      "targetWord": "please"
    },
    {
      "moment": "片後家人做完手勢，準備換人時",
      "title": "謝謝回答，換下一位",
      "question": "請把 thank you 配給家人做完的時機；換你也做一次後，兩人各一次，一共有幾個完成的回合？",
      "followUp": "數兩根手指，再說 Now it is my turn.；同一回合說錯重來不增加人次。",
      "targetWord": "thank you"
    },
    {
      "moment": "片後兩人各完成一個手勢時",
      "title": "問答結束，配告別",
      "question": "請把 bye 配給結束這輪的時機。兩人都輪過，如何告別，再告訴家人下輪換誰先開始？",
      "followUp": "先說 bye，另指出下一輪順序；手指數回合只是理解活動，不加新領獎條件。",
      "targetWord": "bye"
    }
  ],
  "instructions": [
    "播放Toodly Doodly Doo第一版短段，用雙手作水花與輕搖手勢。",
    "回播喜歡的短段，先做一種，再加下一種；跟不上可先看家長示範。",
    "停片輪流帶一個熟悉手勢，等上一人做完再接下一人。",
    "喝水，排好禮貌卡，約定每人輪到才做一個熟悉手勢，先示範如何等待。",
    "播放 Let’s Take Turns 一輪 my turn/your turn，指出正在做與正在等的人，讓孩子先說誰該接下一回。",
    "依 please、thank you、bye 配對三種時機；兩人各完成一次動作後用手指數一、二，練原輪流句。",
    "交換先做的人再來一回，讓孩子也練等待；三次分類和一次合作分別依本人參與記錄，不把重複說同一句加算回合。"
  ]
},
  "w17d4b1": {
  "title": "小老師｜感謝聆聽與角色招呼",
  "sentence": "Adventure 167: Thank you for listening. Hello, cat! Goodbye, dog!",
  "videoFocus": "直接學 thank you 的感謝表達，再由孩子主持貓狗聲音小問答。",
  "focus": "感謝聆聽、告別與新角色開場。",
  "younger": "先跟 thank you，再在家長模仿狗離開、貓出場的情境選 bye/hello；一詞或手勢即可。",
  "older": "說 Thank you for listening. Hello, cat! Goodbye, dog!，感謝聽眾後分清新角色來與舊角色離開，再換自己主持一題聲音問答。",
  "caregiverTip": "保留星期暖身。主課 Super Simple Thank You 直接唱感謝用語，片後用同一詞回應家人專心聽；for listening 是家庭情境補語。貓與狗聲音由家長或孩子自己示範，hello/bye 在主持的角色進出時加教，不宣稱感謝歌有動物辨音。先讓家人確實聽完再感謝，錯猜可以重聽，不用背新動物清單。",
  "pausePrompts": [
    {
      "moment": "片後孩子出聲音題、家人聽完時",
      "title": "謝謝家人專心聽",
      "question": "請用thank you回答：家人剛聽完你的動物聲音題，你可以怎麼回應？",
      "followUp": "先說thank you，再由家長示範Thank you for listening.，不用一次背完。",
      "targetWord": "thank you"
    },
    {
      "moment": "片後一題猜完、準備結束時",
      "title": "對這一題說再見",
      "question": "請用bye回答：狗的聲音題結束了，對狗揮手可以說什麼？",
      "followUp": "示範bye或Goodbye, dog!，這是片後主持遊戲。",
      "targetWord": "bye"
    },
    {
      "moment": "片後下一題換貓出場時",
      "title": "新的角色來了",
      "question": "請用hello回答：貓來到下一題，你會怎麼打招呼？",
      "followUp": "說hello或Hello, cat!；三個情境讓孩子各答一次，再換他出題。",
      "targetWord": "hello"
    }
  ],
  "instructions": [
    "播放星期Read It暖身短段，每聽一個日名輕拍腿一下，跟家長一起指畫面文字。",
    "回播短段，選熟悉的一兩個日名跟說，坐著也可跟拍。",
    "停片輪流帶一小段輕拍節奏，再安靜聽一次家長的拍手聲。",
    "喝水，準備禮貌卡，約定一人出貓或狗聲音、另一人先完整聽完，不急著搶答。",
    "播放 Super Simple Thank You 短段，先聽感謝的說法，再由家長示範一件值得感謝的真實互動。",
    "片後依 thank you、bye、hello 回答聆聽後道謝、狗角色離開、貓角色出場三題，練原主持句。",
    "孩子選貓或狗聲音出一題，等家人猜完再道謝；本人完成三次問答與一次開口，不以模仿音量大小評分。"
  ]
},
  "w17d4b2": {
  "title": "小老師｜中英招呼的句子節奏",
  "sentence": "Adventure 168: Hi, reindeer! Thank you for singing. Bye, snowman!",
  "videoFocus": "節慶招呼與告別，片後聽中英短句節奏。",
  "focus": "中英招呼、道謝與句子節奏。",
  "younger": "家長說你好、再見、謝謝，孩子配hi、bye、thank you各答一次；可跟拍或只說一詞。",
  "older": "練Hi, reindeer! Thank you for singing. Bye, snowman!；輕拍比較hi一拍、thank you兩拍，再聽中文你好與謝謝各兩拍，句尾自然停頓。",
  "caregiverTip": "保留精靈空手暖身。主課直接有 hello、goodbye 與馴鹿、雪人；hi 代換 hello、bye 縮短 goodbye、thank you 感謝陪唱都由片後說明。中文你好、再見、謝謝分輪聽，不把單字母當一拍；輕拍是輔助語音節奏，不要求唱完整首才完成。",
  "pausePrompts": [
    {
      "moment": "主課招呼短段後，片後替換用語時",
      "title": "你好可以怎麼說",
      "question": "請用hi回答：家長說你好，想對馴鹿打招呼，可以用哪個英文？",
      "followUp": "hi輕拍一下；家長補Hi, reindeer!，名稱可跟說不用獨立背。",
      "targetWord": "hi"
    },
    {
      "moment": "主課告別短段後，片後句子節奏時",
      "title": "再見，句尾停一下",
      "question": "請用bye回答：家長說再見，對雪人告別可以說什麼？",
      "followUp": "bye輕拍一下後停頓；比較中文再見兩拍，目的在聽節奏。",
      "targetWord": "bye"
    },
    {
      "moment": "片後家人一起唱完短句時",
      "title": "謝謝也有自己的節奏",
      "question": "請用thank you回答：想謝謝家人陪你唱，可以怎麼說並輕拍？",
      "followUp": "thank、you各輕拍一次，再自然連說；較年幼孩子只跟一詞也算參與。",
      "targetWord": "thank you"
    }
  ],
  "instructions": [
    "播放十個精靈暖身短段，用雙手模仿包裝或塗色動作。",
    "回播一段動作，跟節奏換左右手；空手比動作即可。",
    "停片換孩子帶一個包裝手勢，家人輕拍回應後再換人。",
    "喝水，開啟hi、bye、thank you、hello圖卡，家長先說你好、再見、謝謝讓孩子聽句子節奏。",
    "播放馴鹿雪人招呼告別主課短段，跟角色揮手，留意hello與goodbye用在不同時機。",
    "片後做hi、bye、thank you三題中英問答，輕拍短句後練Hi, reindeer! Thank you for singing. Bye, snowman!。",
    "每名孩子實際回答三次，再與家人輪流說或拍一句；保留一詞參與，不以念字母或整首背唱作條件。"
  ]
},
  "w17d5b1": {
  "title": "任務日｜邀請家人一起唱",
  "sentence": "Adventure 169: Hello! Please sing with me. I like singing with you.",
  "videoFocus": "分享喜歡一起做的事，片後複習邀請與道謝。",
  "focus": "友善邀請與本週用語複習。",
  "younger": "跟家長指身體暖身，片後練hello開場、please邀請、thank you道謝三回合；說一詞或做手勢即可。",
  "older": "用Hello! Please sing with me. I like singing with you.邀請家人；對方可選唱、拍手或先聽，陪伴後自己說thank you。",
  "caregiverTip": "保留身體暖身，坐著也能指部位。I Like You 官方歌詞直接說喜歡唱歌以及和你一起唱，正對 I like singing with you 的溝通核心；hello、please、thank you 是片後邀唱時的禮貌延伸。給家人唱、拍手或先聽的選擇，邀請不是命令；不要求說喜歡每個人或把謝謝當一種活動名稱。",
  "pausePrompts": [
    {
      "moment": "片後準備邀家人唱一小句時",
      "title": "先打招呼再邀請",
      "question": "請用hello開始：你想邀哪位家人一起唱或拍手？",
      "followUp": "先招呼對方，指向家人或開口hello，等對方回應。",
      "targetWord": "hello"
    },
    {
      "moment": "片後家人回應招呼時",
      "title": "說清楚想一起做什麼",
      "question": "請用please邀請家人一起唱一小句，可以怎麼說？",
      "followUp": "家長示範Please sing with me.；對方也可選拍手或先聽，接住選擇。",
      "targetWord": "please"
    },
    {
      "moment": "片後家人陪唱或拍手後",
      "title": "感謝實際的陪伴",
      "question": "請用thank you回應：家人剛陪你唱或拍手，你可以說什麼？",
      "followUp": "說thank you即可，再由孩子選下一句；三回合不比速度。",
      "targetWord": "thank you"
    }
  ],
  "instructions": [
    "播放身體部位Sing It暖身短段，照自己舒適幅度指頭、肩、膝與腳趾。",
    "回播熟悉的一小段，坐著可指腿與腳，跟不上就先看家長示範。",
    "停片讓孩子帶兩個熟悉部位，家人慢慢跟指後換人。",
    "喝水，開啟hello、please、thank you、bye圖卡，說明片後要邀家人唱一小句。",
    "播放I Like You短段，聽喜歡的活動，指認一起唱歌或遊戲的畫面，問孩子想做哪種。",
    "片後練hello開場、please邀唱、thank you謝陪伴，說Hello! Please sing with me. I like singing with you.，可分段跟說。",
    "每名孩子實際複習三個情境，再自己開口一詞或句子；不用速度排名，也不把家長唱過算孩子已說。"
  ]
},
  "w17d5b2": {
  "title": "任務日｜玩具願望與禮貌家庭秀",
  "sentence": "Adventure 170: A robot, please. Thank you! Goodbye, everyone.",
  "videoFocus": "表達玩具願望，片後以手勢演出請求、道謝與告別。",
  "focus": "願望表達與禮貌家庭秀。",
  "younger": "看影片選喜歡的玩具，片後用please請求、thank you道謝、bye告別三回合；可先指畫面或做手勢。",
  "older": "練A robot, please. Thank you! Goodbye, everyone.，也可換成影片中的火車或熊；把三句排成請求、道謝、告別，輪流演出。",
  "caregiverTip": "保留公雞早安暖身，不在早上就說是演早安情境。主課直接表達想要 train、rocket、robot、teddy bear，正對本課玩具願望；please、thank you、bye 由片後家庭秀補上。只用空手假扮玩具，不需要購買禮物；家人可選用手勢回應，不保證願望一定得到真物品。片後手勢由家長示範，再換孩子表演。",
  "pausePrompts": [
    {
      "moment": "玩具願望短段後，片後選角色時",
      "title": "想要哪種玩具",
      "question": "請用please說明：你想讓家長用手勢演哪種玩具？",
      "followUp": "孩子可指主課畫面，家長示範A robot, please.；可以選其他玩具，不新增必背詞。",
      "targetWord": "please"
    },
    {
      "moment": "片後家長演出孩子選的玩具後",
      "title": "謝謝這段表演",
      "question": "請用thank you回應：家長演完了，你想怎麼謝謝他？",
      "followUp": "說thank you或做道謝手勢，接著換孩子表演，依實際參與記錄。",
      "targetWord": "thank you"
    },
    {
      "moment": "片後家庭秀結束時",
      "title": "對大家告別",
      "question": "請用bye說明：家庭秀結束，對大家揮手可以說什麼？",
      "followUp": "先說bye，較熟悉者用Goodbye, everyone.；不把告別改成新的領獎條件。",
      "targetWord": "bye"
    }
  ],
  "instructions": [
    "播放公雞早安暖身短段，慢伸展雙手，跟家長揮手打招呼。",
    "回播喜歡的短段，用手指作小雞冠、輕拍腿跟節奏。",
    "停片每人用一個揮手或伸展動作問候家人，輪流回應。",
    "喝水，開啟please、thank you、bye、hello圖卡，預告用空手手勢做玩具家庭秀。",
    "播放玩具願望主課短段，觀察火車、火箭、機器人或熊的動作，孩子選一種喜歡的玩具。",
    "片後請家長演玩具、道謝、告別各一回合，練A robot, please. Thank you! Goodbye, everyone.，可依所選玩具換詞。",
    "每名孩子完成三次禮貌用語複習，另輪到一次演出或回答；不需真玩具或新禮物，家長只勾本人完成。"
  ]
}
,
  "w17d1b1": {
  "title": "探索日｜請家人幫忙找動物玩具",
  "sentence": "Adventure 161: Hello! Please help me find the animal. Thank you!",
  "videoFocus": "聽求助歌如何找玩具與道謝，再用動物玩具做相同溝通任務。",
  "focus": "招呼、請求幫忙找動物與完成後感謝。",
  "younger": "向家人說 hello，用 please 配尋找手勢，找到動物卡後說 thank you；每次一詞即可，不增加動物名稱背誦。",
  "older": "練 Hello! Please help me find the animal. Thank you!，先說清要找的動物，再等家人幫忙；換當幫忙者時，也要等對方提出請求。",
  "caregiverTip": "保留聖誕暖身。新主課直接有 please help me 與 thank you，包含 brown bear 玩具尋找；動物只取孩子熟悉的一種，可用畫有動物的卡替代，無須真的養寵物或添購熊玩具。hello 在片後開口前加，完整 find the animal 是將歌曲特定玩具改成課堂目標，不聲稱影片唱同一句。",
  "pausePrompts": [
    {
      "moment": "主課找物短段後，片後先走近願意幫忙的家人時",
      "title": "先讓對方知道在跟他說話",
      "question": "請找 hello 卡。你想請家人一起找動物玩具，怎麼先和他打招呼，等他注意到你？",
      "followUp": "可說 hello 加家人稱呼；先確認對方願意聽，不要求碰觸或拉扯。",
      "targetWord": "hello"
    },
    {
      "moment": "回聽主課找 bear 的求助段，再藏動物卡時",
      "title": "說清楚要找什麼",
      "question": "請找 please 卡。動物卡放在兩個可見位置之一，請家人幫忙找時，你可以說哪一句請求？",
      "followUp": "示範 Please help me find the animal.；歌中找 brown bear，這裡換自己的動物卡。",
      "targetWord": "please"
    },
    {
      "moment": "家人幫忙指到正確動物卡後",
      "title": "回應具體的幫助",
      "question": "請找 thank you 卡。家人剛剛指出動物卡，接著你要重新求助，還是先表示感謝？",
      "followUp": "先回應 Thank you，再讓孩子換當幫忙的人；請求與感謝不混用。",
      "targetWord": "thank you"
    }
  ],
  "instructions": [
    "播放聖誕串唱短段，家長原地慢步，孩子用手腕輕搖模仿鈴聲。",
    "回播喜歡的節奏短段，輕拍腿或小步踏拍；坐著也能跟做。",
    "停片換孩子帶一個慢步或搖鈴手勢，家人輪流跟做。",
    "喝水，拿一張動物卡或熟悉的動物玩具，安排兩個安全可指的位置；先示範招呼家人後再說需要幫忙。",
    "播放 Can You Please Help Me? 的求助與道謝短段，選 bear 玩具那一輪回看，聽清先請求再感謝。",
    "依 hello、please、thank you 三題完成招呼、找動物求助與感謝，練 Hello! Please help me find the animal. Thank you!。",
    "家人與孩子互換找物者和幫忙者，等待對方說完才回應；每人三次情境辨認與一次開口分開記錄，不需背所有顏色玩具詞。"
  ]
},
  "w17d1b2": {
  "title": "探索日｜找到顏色，說出喜好",
  "sentence": "Adventure 162: I like red. What color do you like?",
  "videoFocus": "直接聽四種原目標色與 I like 的偏好句，再輪流問喜歡什麼顏色。",
  "focus": "顏色辨認與真實偏好問答。",
  "younger": "依 red、yellow、green 各指一張卡，再選自己喜歡的一色；聽家人回答後試指他的卡，不必一次說長句。",
  "older": "練 I like red. What color do you like?，按真實喜好替換顏色；先聽完對方再指出他的選擇，能分清自己和家人的偏好。",
  "caregiverTip": "保留鯊魚暖身。新主課有 red、yellow、green、blue，也明確示範 I like red 與最喜歡哪色的問答。先辨色，再問個人喜好；原句 What color do you like? 是同功能的自然改述，不需要說成逐字歌詞。三題依原 red/yellow/green 順序，yellow 段後可回到 green 段，不必按影片順序改詞卡。",
  "pausePrompts": [
    {
      "moment": "主課紅色與 I like red 段後",
      "title": "認得和喜歡分開",
      "question": "請找 red 圖卡，先確認這是紅色，再說你喜不喜歡。你一定要和歌中一樣選紅色嗎？",
      "followUp": "辨色有對應答案，喜好沒有；可用 I like red 或改說真正喜歡的顏色。",
      "targetWord": "red"
    },
    {
      "moment": "主課黃色段後，輪到家人說偏好時",
      "title": "聽別人的選擇",
      "question": "請找 yellow 圖卡，再問家人喜歡哪一色。家人回答後，你能指出他選的卡，而不是只指自己的最愛嗎？",
      "followUp": "先完成 yellow 辨認，再聽真實回答；不假設家人也喜歡黃色。",
      "targetWord": "yellow"
    },
    {
      "moment": "回到主課綠色段，交換提問者時",
      "title": "輪到你問我",
      "question": "請找 green 圖卡，用 What color do you like? 問家人；如果你喜歡綠色、家人選別色，可以都保留自己的選擇嗎？",
      "followUp": "可以；讓兩人各指一張卡，影片直接有 green，不再把它說成片後才新增的顏色。",
      "targetWord": "green"
    }
  ],
  "instructions": [
    "播放鯊魚萬聖節短段，用雙手開合做小鯊魚，身體在原位輕搖。",
    "回播喜歡的短段，跟游動手勢；若孩子不喜歡驚嚇情節，停片做同樣手勢即可。",
    "停片換孩子帶一個開合或游動手勢，每名家人輪流跟做。",
    "喝水，並排放原四張顏色卡，預告先認顏色，再問真正喜歡哪一色，不要求大家答案相同。",
    "播放 What’s Your Favorite Color? 的顏色與喜好短段，聽 I like red；yellow 和 green 可按提問順序分段回看。",
    "依 red、yellow、green 完成三次辨認，每題再加入不同合作：說自己偏好、聽家人偏好、交換問句，練原顏色喜好句。",
    "每人另輪到一次回答或提問，先指正確顏色再談喜好；不以完整長句或和家長同答案增加完成條件。"
  ]
},
  "w17d2b1": {
  "title": "動起來｜顏色尋寶後的謝謝與招呼",
  "sentence": "Adventure 163: Thank you for finding colors with me. Bye!",
  "videoFocus": "從找有顏色的玩具與道謝歌曲，練得到幫助後的感謝，再接告別與重新問候。",
  "focus": "找色合作後的感謝及見面告別手勢。",
  "younger": "家長幫忙找顏色後跟做thank you點頭、結束時bye揮手、重新開始hello揮手；每種一次，先說一詞即可。",
  "older": "練Thank you for finding colors with me. Bye!，再換一輪先說hello；說明同樣揮手可表示見面或告別，要看當時情境。",
  "caregiverTip": "保留小雞搖籃曲暖身。Can You Please Help Me? 直接把顏色、找玩具和 thank you 連起來，比只唱顏色更支援本課感謝句。可選 red ball 或 green truck 一段，用現有顏色卡請家人幫忙；完整 Thank you for finding colors with me. 是片後改述。bye/hello 由結束和重新開始的情境補教，不把它們當影片顏色名。",
  "pausePrompts": [
    {
      "moment": "主課找到帶顏色的玩具並道謝後，片後家人幫找色時",
      "title": "得到幫助，點頭道謝",
      "question": "請跟做thank you。家長幫你找到顏色後，你會怎麼回應？",
      "followUp": "家長示範點頭與thank you，孩子自己跟做一次，先說一詞也可以。",
      "targetWord": "thank you"
    },
    {
      "moment": "片後顏色尋寶結束時",
      "title": "遊戲結束，揮手告別",
      "question": "請跟做bye。這一輪結束了，對家長揮手時可以說什麼？",
      "followUp": "用bye或Bye! See you soon.告別，孩子真的跟做再記錄。",
      "targetWord": "bye"
    },
    {
      "moment": "片後下一輪開始時",
      "title": "又見面，換成打招呼",
      "question": "請跟做hello。重新開始尋寶，這次揮手是告別，還是打招呼？",
      "followUp": "說hello並揮手；比對前一回合bye，不要求孩子背整段對話。",
      "targetWord": "hello"
    }
  ],
  "instructions": [
    "播放小雞搖籃曲短段，雙手作鳥巢，手指輕輕點動並跟柔和節奏呼吸。",
    "回播休息的短段，手掌放臉旁作睡覺手勢；坐著也能跟做。",
    "停片做慢伸展，輪流帶鳥巢或休息手勢，逐漸收束暖身。",
    "喝水，挑一張已有顏色卡，預告先得到一次真實的找色幫助，再練感謝與告別。",
    "播放 Can You Please Help Me? 一段帶顏色的找玩具問答，聽找到後的 thank you，不要求背所有玩具及家人詞。",
    "依 thank you、bye、hello 跟做得到幫助、這輪結束、重開遊戲三題；練 Thank you for finding colors with me. Bye!，明說是換成我們的找色活動。",
    "家人互換請求者與幫忙者，自己完成手勢和一句感謝；不把大人代找代答算成孩子已完成。"
  ]
},
  "w17d2b2": {
  "title": "動起來｜見面、道謝與告別接力",
  "sentence": "Adventure 164: Hi! Thank you for playing with me. Goodbye!",
  "videoFocus": "告別歌跟拍手踏步，片後練完整招呼接力。",
  "focus": "見面、道謝與告別接力。",
  "younger": "用hi揮手開始、bye揮手結束、thank you點頭道謝，各跟做一次；輪流與家長互相回一句即可。",
  "older": "練Hi! Thank you for playing with me. Goodbye!，把順序排成見面、一起玩、道謝、告別；用hello替換hi，分辨招呼與告別時機。",
  "caregiverTip": "只用雙手與本頁圖卡。小魚暖身跟游動和歌曲趣味擬聲，這些是歌曲遊戲聲，不當作動物真實叫聲知識。告別主課跟拍手、踏步與goodbye；hi、hello、thank you由片後家長示範。接力時按見面、一起玩、道謝、告別走一輪；三次跟做可依hi、bye、thank you出題，再重排成自然對話。不要把hello當告別，也不要求背無關物品句型。",
  "pausePrompts": [
    {
      "moment": "片後招呼接力開始時",
      "title": "見面先揮手",
      "question": "請跟做hi。遊戲剛開始，對家長揮手時應打招呼，還是說再見？",
      "followUp": "家長示範hi或hello，孩子自己揮手一次；兩種都能用在見面。",
      "targetWord": "hi"
    },
    {
      "moment": "片後示範一輪結束時",
      "title": "結束再告別",
      "question": "請跟做bye。一起玩完要離開時，怎麼用揮手和英文告別？",
      "followUp": "用bye或goodbye回應，提醒與開場的hi時機不同。",
      "targetWord": "bye"
    },
    {
      "moment": "片後家長陪玩，準備收尾時",
      "title": "感謝陪伴，再說再見",
      "question": "請跟做thank you。想謝謝家長陪你玩，點頭後可以說什麼？",
      "followUp": "說thank you即可；較熟悉者加for playing with me，再道別，不增加領獎門檻。",
      "targetWord": "thank you"
    }
  ],
  "instructions": [
    "播放小魚暖身短段，用雙手游動與輕拍模仿歌曲中的海洋角色。",
    "回播一個喜歡的短段，跟趣味擬聲與手勢，不要求一次記住所有累加聲音。",
    "停片讓孩子帶一個游動手勢，家人模仿後換人帶隊。",
    "喝水，開啟hi、bye、thank you、hello圖卡，預告告別歌後會玩見面到告別的接力。",
    "播放告別主課短段，跟拍手與原地小幅踏步，聽到告別句就揮手；坐著可改輕拍腿。",
    "片後依hi、bye、thank you各跟做一次，再按見面、陪玩、道謝、告別走一輪，練Hi! Thank you for playing with me. Goodbye!。",
    "每名孩子完成三次自己的手勢，再輪到一次接力回答；家長先聽意思再重述，沒有出聲或操作就先給下一次機會。"
  ]
}
};

const eighteenthWeekReviewedGuidance: Record<string, ReviewedTeachingGuidance> = {
  "w18d1b1": {
  "title": "期末探險｜找對顏色，再說名稱",
  "sentence": "Adventure 171: I found yellow! Can you find green and red?",
  "videoFocus": "從四色歌找出並說對顏色，片後由孩子邀請家人完成找色回合。",
  "focus": "期末辨色、命名與換人發問。",
  "younger": "家長說yellow、green、red，孩子在本頁圖卡各指一次；先指對再跟說一詞。",
  "older": "自己找出三種顏色，練I found yellow! Can you find green and red?，換家長尋找；說出的詞要與所指顏色相同。",
  "caregiverTip": "青蛙暖身重點是輪流，用手指在自己掌心輕跳即可，不跨跳家人的身體。主課直接唱 red、yellow、green、blue；孩子先找畫面的顏色，再在本頁圖卡自己指認與命名。期末回合由孩子先找 yellow，再邀請家人找 green 和 red；家長接到邀請才動作，不搶先代答。",
  "pausePrompts": [
    {
      "moment": "主課黃色段後，孩子準備帶第一回合時",
      "title": "先由你找到",
      "question": "歌裡唱 yellow，你能自己找出黃色圖卡，指著說名稱嗎？",
      "followUp": "留時間讓孩子先指再說；若指對但名稱不同，並排兩卡比較後再試。",
      "targetWord": "yellow"
    },
    {
      "moment": "主課綠色段後，把發問機會交給孩子",
      "title": "請家人來找",
      "question": "你要請家人找 green，可以先指一下綠色圖卡，再用手勢或一句話邀請嗎？",
      "followUp": "較小孩子說 green 加手勢，較大孩子說 Can you find green?；家長等孩子發問後才找。",
      "targetWord": "green"
    },
    {
      "moment": "紅色辨認後，最後一回合交換角色",
      "title": "看看家人找對了嗎",
      "question": "先找 red 給家人看，再請他找一次；如果他指到藍色，你會怎麼提醒？",
      "followUp": "孩子先完成本人的辨認，再用紅色卡和對方所指的卡比較；提醒可以用指示或單字，不要求完整解釋。",
      "targetWord": "red"
    }
  ],
  "instructions": [
    "播放Leapfrog短段，用手指在自己掌心模仿青蛙跳。",
    "回播跳與停的短段，坐著也能讓手指跳幾下再停。",
    "停片輪流當青蛙領隊，每人帶一小段手指動作，不跨越別人身體。",
    "喝水，開啟yellow、green、red、blue圖卡，說明找到什麼顏色就說同一個名稱。",
    "播放 Red Yellow Green Blue，聽四色名稱並指相應畫面；黃色、綠色和紅色段後各選一處停下，用本頁圖卡確認聽到與指到的是同色。",
    "孩子先各找一次 yellow、green、red，再說 I found yellow! Can you find green and red?；家長等邀請後才找，換孩子看家人是否找對。",
    "每名孩子親自完成三次辨認，再說一詞或句子；家長記錄本人實際完成，最後讓孩子選一色主持家人的找色回合。"
  ]
},
  "w18d1b2": {
  "title": "期末探險｜手指點數，再幫小鴨排隊",
  "sentence": "Adventure 172: Show me four fingers. Now show me one and two.",
  "videoFocus": "從手指歌辨認一到五，換序伸出四、一、二，再輪流提出數量問題。",
  "focus": "手指數量、換序提取與輪流出題。",
  "younger": "跟家長一起點數手指，聽four、one、two各指或伸一次；數到四需要幫忙也可重試。",
  "older": "練Show me four fingers. Now show me one and two.，每根手指只點一次；換自己出題請家長伸出相同數量。",
  "caregiverTip": "告別暖身仍用揮手和慢搖。主課先唱單手一到五，再唱雙手一到十，也有腳趾段；本堂重點是自己伸出的 four、one、two，不必數腳趾或完成十次。先分清一隻手與一根手指，歌裡 one hand 的 one 不是只有一根。片後可把手指當排隊的小鴨，孩子出題、家人跟做；這是保留小鴨點數遊戲的想像延伸，不是影片裡有小鴨。",
  "pausePrompts": [
    {
      "moment": "主課單手一到五段後，停片先做四根",
      "title": "伸四根，親自核對",
      "question": "請伸 four 根手指，再用另一手逐根點數；沒伸出的那根也要算嗎？",
      "followUp": "只數這次伸出的手指，一根點一次；手勢不方便時改用四個大玩具。",
      "targetWord": "four"
    },
    {
      "moment": "片後從四根收成一根時",
      "title": "一隻手不等於一根手指",
      "question": "現在請只留 one 根手指。說 one finger 時，要把整隻手所有手指都一起數嗎？",
      "followUp": "示範這題問伸出的手指，而不是有幾隻手；對照歌詞 one hand，分清點數單位。",
      "targetWord": "one"
    },
    {
      "moment": "片後用手指當小鴨排隊、換孩子發問時",
      "title": "兩隻小鴨由你出題",
      "question": "用 two 根手指當兩隻小鴨，請家人排出同樣數量。你會怎麼檢查他多排或少排了？",
      "followUp": "孩子先表示自己的 two，再核對家人；小鴨是想像遊戲，配對錯了可重新逐根數。",
      "targetWord": "two"
    }
  ],
  "instructions": [
    "播放See You Later, Alligator短段，跟家長揮手告別。",
    "回播一小段，用慢搖身體或雙手揮動配合節奏。",
    "停片每人帶一個告別手勢，其他人回應，練等人做完再換。",
    "喝水，開啟four、one、two、three圖卡，先用手指逐根點數。",
    "播放 How Many Fingers? 的單手一到五段，逐根指認數詞；雙手一到十只作可選複習，不以數腳趾或全曲跟完增加任務。",
    "片後用手指完成 four、one、two 三次數量辨認，練 Show me four fingers. Now show me one and two.；把伸出的手指想像成小鴨，輪流請對方排隊。",
    "每名孩子親自辨認三次，另與家人輪流出一道小鴨數量題並核對；數錯可慢慢重試，只依原任務條件記錄。"
  ]
},
  "w18d2b1": {
  "title": "期末回顧｜介紹自己，禮貌問名字",
  "sentence": "Adventure 173: Hello! Your name, please? Thank you for telling me.",
  "videoFocus": "姓名問答，片後練招呼、請求與道謝的手勢。",
  "focus": "姓名問答與禮貌互動。",
  "younger": "親自模仿 hello 揮手、please 伸掌請問、thank you 點頭道謝三個動作。開口任務至少主動說 hello、please 或 thank you 其中一個目標詞；說自己的名字是自我介紹延伸，不代替這個開口條件。",
  "older": "練Hello! Your name, please? Thank you for telling me.，聽家人說完名字才回應；介紹自己時用自己的名字，不必背角色姓名。",
  "caregiverTip": "保留加法暖身，不加新算數考試。主課直接唱 hello、問姓名和介紹自己，支援本課禮貌問名；please 與 thank you 是家長在片後加入，不冒稱原歌逐字唱完整句。孩子可用家庭稱呼介紹自己或先揮手，不必背角色姓名；先等對方回答再道謝。三個手勢回合與開口任務分開核對，開口至少主動說 hello、please 或 thank you 一個目標詞，姓名屬延伸介紹。",
  "pausePrompts": [
    {
      "moment": "主課招呼問名短段後",
      "title": "先向對方問好",
      "question": "聽到hello可以做哪個招呼動作？請自己做一次。",
      "followUp": "揮手配hello，等家長回應後才進下一句。",
      "targetWord": "hello"
    },
    {
      "moment": "片後想請家人再說名字時",
      "title": "用禮貌請問的動作",
      "question": "請用please配伸掌請問的手勢，邀家人說名字。",
      "followUp": "家長示範Your name, please?；年幼孩子先做手勢即可。",
      "targetWord": "please"
    },
    {
      "moment": "片後家人說完名字時",
      "title": "聽完再道謝",
      "question": "請用thank you配點頭道謝的動作，回應剛說名字的家人。",
      "followUp": "等對方說完再做，較熟悉者接Thank you for telling me.。",
      "targetWord": "thank you"
    }
  ],
  "instructions": [
    "播放Adding Up To 10短段，聽到一加一時用左右手各伸一根手指。",
    "回播熟悉短段，用手指合在一起點數；先在孩子能跟上的數量停。",
    "停片每人帶一次手指合數動作，其他人跟做，數不出來可一起點。",
    "喝水，開啟hello、please、thank you、bye圖卡，準備跟家人問名字。",
    "播放姓名問答主課短段，聽招呼、提問與回答輪流出現，孩子可說自己的名字。",
    "片後跟做hello揮手、please請問、thank you道謝三個動作，練Hello! Your name, please? Thank you for telling me.。",
    "每名孩子親自跟做三次，再說一詞或短句；不要求背影片角色名字。"
  ]
},
  "w18d2b2": {
  "title": "期末回顧｜動物特徵與小數量分類",
  "sentence": "Adventure 174: A dog has legs. A bird has wings. A fish has fins.",
  "videoFocus": "期末以直接寵物特徵歌複習腿、翅膀、魚鰭，再以有無翅膀分類並點數，不用500隻鴨取代目標動物。",
  "focus": "動物特徵與小數量分類",
  "younger": "跟做dog前腳、bird翅膀、fish魚鰭三個手勢，再和家長指出一張有翅膀的圖卡。",
  "older": "用A dog has legs. A bird has wings. A fish has fins.說明手勢，依有沒有翅膀將本頁圖卡分組，再數有翅膀這組的卡片。",
  "caregiverTip": "主課直接有dog、bird、fish及身體特徵。按有無翅膀分組，再點數卡片，不以歌曲重複次数增加數量。保留期末三句描述；歌中腳掌可延伸連到legs，不說歌詞逐字唱本課整句。",
  "pausePrompts": [
    {
      "moment": "歌曲dog與paws段後",
      "title": "看清楚再回答",
      "question": "請找dog，用手表示前腳，再跟說dog。",
      "followUp": "不用趴地或碰真動物；手勢是課堂示範。",
      "targetWord": "dog"
    },
    {
      "moment": "歌曲bird與wings段後",
      "title": "換個線索試試",
      "question": "請找bird，哪個部位是翅膀？把bird放有翅膀的一組。",
      "followUp": "不以會不會游泳分鳥魚，觀察身體特徵。",
      "targetWord": "bird"
    },
    {
      "moment": "歌曲fish與fins段後",
      "title": "輪到孩子練習",
      "question": "請找fish，魚鰭和bird的翅膀是同一部位嗎？",
      "followUp": "指卡比較，將fish放沒有翅膀一組，再數本輪卡片。",
      "targetWord": "fish"
    }
  ],
  "instructions": [
    "播放Finny數數暖身的短段，用手指從一慢慢跟到十。",
    "回播能跟上的一小段，逐指點數；不要求一路念到100。",
    "停片每人帶一個小數量手指動作，家人模仿後再換。",
    "喝水，排出本頁動物圖卡，預告先看身體特徵，再按有沒有翅膀分類。",
    "播放〈I Love My Pet〉的狗、鳥、魚段，停片指認腳掌、翅膀、魚鰭，跟做三種小手勢。",
    "分段練A dog has legs. A bird has wings. A fish has fins.，再將圖卡放有翅膀與沒有翅膀兩組。",
    "每名孩子完成dog、bird、fish三次跟做，輪到自己分類並數有翅膀組的卡片；只數本輪卡片，不數歌詞重複次數。"
  ]
},
  "w18d3b1": {
  "title": "期末配對｜水果、餐點與飲水",
  "sentence": "Adventure 175: Pizza is food. Water is a drink. An apple is fruit.",
  "videoFocus": "從熟悉的 pizza 複習餐點情境，再讓孩子自行把 water 配飲水、apple 配水果，說明分類依據。",
  "focus": "餐點、飲水與水果情境配對。",
  "younger": "把pizza配給吃餐點、water配給喝水、apple配給水果三個情境；可指卡，不需要真食物。",
  "older": "說Pizza is food. Water is a drink. An apple is fruit.，再說明蘋果也能吃；知道配對依這輪情境，不代表每樣食物只能有一種用途。",
  "caregiverTip": "只用本頁三種圖卡即可。回看〈Pizza Party〉的一個熟悉短段，這次不模仿整套製作，而是認餐點、說用途。water 和 apple 由片後圖卡加入；水果也屬食物，本輪依三個生活情境配對，不教成互斥分類。不要求吃真食物，也不用背完三句才記錄原任務。",
  "pausePrompts": [
    {
      "moment": "披薩短段後，家長演吃餐點時",
      "title": "餐點情境自己選",
      "question": "請找 pizza，配給吃餐點的情境。你能用一個詞或短句說為什麼嗎？",
      "followUp": "先由孩子自行配，再示範 Pizza is food；不要求真的拿披薩。",
      "targetWord": "pizza"
    },
    {
      "moment": "片後家長改演想喝水時",
      "title": "情境改變要重新判斷",
      "question": "現在想喝水，請找 water。這次還選吃餐點那張嗎？",
      "followUp": "指正確卡後說 Water is a drink；明說水是片後比較，不在披薩歌裡找。",
      "targetWord": "water"
    },
    {
      "moment": "最後一題請孩子選水果時",
      "title": "蘋果是水果也能吃",
      "question": "請找 apple 配到水果情境。它是水果，所以不能算食物，這句話對嗎？",
      "followUp": "孩子可指卡或說不對；補充水果也是食物，再練 An apple is fruit，不建立錯誤互斥概念。",
      "targetWord": "apple"
    }
  ],
  "instructions": [
    "播放After A While, Crocodile短段，揮手配告別節奏。",
    "回播喜歡的一小段，輕拍雙腿或雙手，不追快速動物押韻詞。",
    "停片輪流選一個告別手勢，家人跟做後再換。",
    "喝水，家長用手勢表示吃餐點、想喝水、挑水果三個情境，請孩子先看看三張圖卡，不先代配。",
    "回看〈Pizza Party〉的一個熟悉短段，指 pizza 後關回圖卡；讓孩子說這能配哪個生活情境，和本學期初的製作動作課區分。",
    "片後分別把pizza、water、apple配給三個情境，練Pizza is food. Water is a drink. An apple is fruit.。",
    "每名孩子完成三次配對，再說一詞或短句；可以只用圖卡，家長不以吃下食物作條件。"
  ]
},
  "w18d3b2": {
  "title": "期末配對｜聽指令，動一動再停",
  "sentence": "Adventure 176: Stop here, please. Jump once, then turn slowly.",
  "videoFocus": "招呼與身體動作，片後配對停、跳與轉身指令。",
  "focus": "動作指令與輪流領隊。",
  "younger": "將stop配停手、jump配手指跳、turn配手掌慢轉三次；可全程坐著做。",
  "older": "練Stop here, please. Jump once, then turn slowly.，先聽完再依順序做；換自己出一個指令給家人。",
  "caregiverTip": "暖身〈Dance And Stop〉直接練jump、clap與stop，先選孩子跟得上的短段，停止時一起定格。Hello Hello主課有拍手、伸展與轉身；stop、jump可從暖身複習，go另放在片後指令遊戲。用手指跳、手掌慢轉就能參加，不需快速旋轉或跳高。",
  "pausePrompts": [
    {
      "moment": "主課動作短段後，片後先說停時",
      "title": "停的指令配哪個動作",
      "question": "請把stop配給停手不動的動作，自己做一次。",
      "followUp": "家長先停給孩子看，再讓孩子依詞選動作。",
      "targetWord": "stop"
    },
    {
      "moment": "片後加入下一個指令時",
      "title": "跳一下就足夠",
      "question": "請把jump配給手指在掌心跳一下，可以怎麼做？",
      "followUp": "坐著也能完成；jump 已在暖身學過，主課補 turn，這裡片後限定只跳一下。",
      "targetWord": "jump"
    },
    {
      "moment": "主課轉身畫面或片後手掌示範時",
      "title": "慢慢轉，再停",
      "question": "請把turn配給手掌慢轉的動作，再等下一個指令。",
      "followUp": "手掌轉一小段就停，別連續快速轉圈；本人完成第三次配對。",
      "targetWord": "turn"
    }
  ],
  "instructions": [
    "播放〈Dance And Stop〉，先用手指跳或輕拍雙手，聽到stop立即停下。",
    "回看跳與停止的一輪；讓孩子聽到指令才做，坐姿可用手指在掌心跳。",
    "停片換孩子領一次jump或stop，家人回應；準備把聽到的動作配對到圖卡。",
    "喝水，開啟stop、jump、turn、go圖卡，先示範坐著可做的三種手部動作。",
    "播放Hello Hello短段，跟拍手、伸展或轉身畫面，用舒服幅度動一動。",
    "片後配對stop停手、jump手指跳、turn手掌慢轉，練Stop here, please. Jump once, then turn slowly.。",
    "每名孩子完成三次配對，另輪流出或回應一個指令；先等對方做完，不以速度計勝負。"
  ]
},
  "w18d4b1": {
  "title": "期末小老師｜看天氣，說觀察",
  "sentence": "Adventure 177: Is it sunny or rainy? Let us look outside together.",
  "videoFocus": "用明確天氣單曲核對三種天空，再由孩子帶家人觀察。",
  "focus": "期末天氣提取、問答與情境轉用。",
  "younger": "聽sunny、rainy、cloudy三題，各指一次本頁圖卡；窗外天氣不同也可以照實說。",
  "older": "練Is it sunny or rainy? Let us look outside together.，比較圖卡與窗外；知道hot是溫度感受，不等於一定有太陽。",
  "caregiverTip": "保留沙鈴暖身，主課改精確單曲，不再選不明合輯片段。歌詞直接有sunny、rainy、cloudy；先請孩子看卡提問，必要時才回看核對。Is it sunny or rainy? Let us look outside together.是片後轉用，若窗外多雲可如實說cloudy；hot只另外問感受。",
  "pausePrompts": [
    {
      "moment": "播放前晴天卡提問，再回看sunny段時",
      "title": "孩子帶家人回想",
      "question": "請用sunny介紹這張卡，再問家人怎麼知道；回看後要不要補充？",
      "followUp": "孩子可以先指卡再說，家長不直接念出答案。",
      "targetWord": "sunny"
    },
    {
      "moment": "主課rainy段後，比較兩張卡時",
      "title": "晴天或雨天",
      "question": "請找rainy，和sunny比較，再問Is it sunny or rainy?。",
      "followUp": "問題描述眼前卡片，接受指雨滴的回答。",
      "targetWord": "rainy"
    },
    {
      "moment": "主課cloudy段後，轉到觀察時",
      "title": "不是兩選一也可以",
      "question": "請找cloudy。如果窗外只有雲、沒有雨，是否一定要在sunny和rainy選一個？",
      "followUp": "可以說cloudy；看不清楚就說不知道，不能硬猜。",
      "targetWord": "cloudy"
    }
  ],
  "instructions": [
    "播放〈The Shaker Song〉，空手輕握當作沙鈴，跟著節奏搖動；聽到stop或freeze就停。",
    "回看高與低的一輪，用手在胸前與膝上輕搖，先聽清楚再換位置；不需要額外器材。",
    "停片後輪流搖出短節奏，其他人先聽再回應，最後定格，準備觀察天氣畫面。",
    "喝水，準備三張天空卡；孩子先當小老師，問家人一題再決定是否需要回看片段。",
    "播放〈How’s The Weather?〉相關短段，逐一核對sunny、rainy、cloudy，不需看完天氣合輯。",
    "完成三題問答，練Is it sunny or rainy? Let us look outside together.；在室內觀察或用指定卡片，若多雲就如實說cloudy。",
    "每名孩子各回答三次並開口，最後輪流帶家人看一個線索；hot另問體感，不以統一答案取代真實觀察。"
  ]
},
  "w18d4b2": {
  "title": "期末小老師｜交通口語與停走訊號",
  "sentence": "Adventure 178: The bus and car stop at the red light.",
  "videoFocus": "觀察道路停走訊號，片後分清交通工具與中英名稱。",
  "focus": "交通口語、名稱節奏與停走。",
  "younger": "聽bus、train、rocket各答一次圖卡，跟家長說公車、火車、火箭；可先指或做手勢。",
  "older": "練The bus and car stop at the red light.，再分清公車走道路、火車走鐵軌、火箭升空；聽公車、火車、火箭的中文兩拍名稱。",
  "caregiverTip": "超快Uh-Huh暖身只用一小段點頭、搖頭，跟不上就停片由家長慢問慢答，不必用加速回答證明懂了。交通主課依實際紅綠燈畫面觀察；片後bus、train、rocket問答與中文名稱複習，不聲稱三種工具都在同段出現。道路紅綠燈用公車與汽車示例，不教火箭照道路燈號起飛。",
  "pausePrompts": [
    {
      "moment": "交通主課停走短段後，片後看工具卡時",
      "title": "公車的英文是哪個",
      "question": "請用bus回答：家長說公車，你能找圖卡並說一次嗎？",
      "followUp": "輕拍公、車兩拍；英語bus自然說，不把字母拆成拍子。",
      "targetWord": "bus"
    },
    {
      "moment": "片後比較道路與軌道時",
      "title": "火車走在哪裡",
      "question": "請用train回答：家長指火車圖卡，它走鐵軌還是當汽車開？",
      "followUp": "先選火車，口說火、車兩拍；不要把道路紅綠燈規則套成全部鐵路訊號。",
      "targetWord": "train"
    },
    {
      "moment": "片後第三張交通工具卡時",
      "title": "火箭往哪裡去",
      "question": "請用rocket回答：家長說火箭，你能找出圖卡並做升空手勢嗎？",
      "followUp": "手掌向上比即可，再輪流說停或走讓家人做小車手勢；火箭不是道路車。",
      "targetWord": "rocket"
    }
  ],
  "instructions": [
    "播放Super-Fast Uh-Huh短段，用點頭、搖頭回應一個聽懂的提問。",
    "跟不上時停片，家長慢問孩子熟悉的事，孩子點頭或搖頭回答。",
    "輪流提一個簡單問題，等對方回應再換，不追歌曲速度。",
    "喝水，開啟bus、train、rocket、car圖卡，家長口說公車、火車、火箭讓孩子聽名稱。",
    "播放交通停走主課短段，觀察實際燈號和車輛動作，再停片由家長說停與走。",
    "片後回答bus、train、rocket三題，練The bus and car stop at the red light.，比較道路、鐵軌與升空。",
    "每名孩子回答三次，另與家人輪流做停走手勢；中文只聽說與輕拍，不增加注音或新符號考試。"
  ]
},
  "w18d5b1": {
  "title": "期末任務｜早安自然觀察分享",
  "sentence": "Adventure 179: The sun is in the sky. I can point to a tree.",
  "videoFocus": "以花、樹、太陽、天空完成期末自然觀察分享。",
  "focus": "以花、樹、太陽、天空完成期末自然觀察分享。",
  "younger": "依序指 sun、sky、tree 三張卡，說一個最喜歡的詞。",
  "older": "分享一個自然發現，說完整原句並辨認歌詞複數 trees／flowers 對應的單數卡。",
  "caregiverTip": "用本頁圖卡或手勢即可，聽到flowers、trees時，先指出一朵flower、一棵tree，再說明歌曲唱的是多朵花、多棵樹。以圖卡觀察sun，不用直視太陽；每次暫停留三秒讓孩子自己回應。",
  "pausePrompts": [
    {
      "targetWord": "sun",
      "moment": "歌曲sun段後",
      "title": "期末分享選sun",
      "question": "期末分享選sun，請說你記得的名字或一個特徵。",
      "followUp": "只看圖卡，允許提示後再說。"
    },
    {
      "targetWord": "sky",
      "moment": "歌曲sky段後",
      "title": "指sky",
      "question": "請指sky，試著把sun和sky連成一句話。",
      "followUp": "可分段說The sun is in the sky.。"
    },
    {
      "targetWord": "tree",
      "moment": "歌曲trees段後",
      "title": "找tree",
      "question": "請找tree，再向家人分享你看見的樹有什麼樣子。",
      "followUp": "可用中文描述和一個英文詞，最後加上I can point to a tree.。"
    }
  ],
  "instructions": [
    "播放The Ants Go Marching短段，用雙指在掌心走路或在原地慢踏步。",
    "回播一到三的熟悉短段，隨節奏輕拍，不模仿吮手指或攀爬動作。",
    "停片每人帶一小段指尖行軍，其他人跟做後輪換。",
    "依 sun、sky、tree、flower 擺卡，請孩子選一張要在期末分享的景物。",
    "播放〈Good Morning, It’s Such A Beautiful Day〉；只在唱到 sun、sky、flowers、trees 時暫停指認。",
    "先讓孩子不用提示找sun、sky、tree，練The sun is in the sky. I can point to a tree.；說出今天選的自然景物與一項觀察。",
    "每名孩子完成三次複習並分享一張卡；若忘記可給一個線索後再試，只記本人實際回應。"
  ]
},
  "w18d5b2": {
  "title": "畢業派對｜問候、邀請與友善道別",
  "sentence": "Adventure 180: Hello, everyone! Please watch me clap. Thank you, and goodbye!",
  "videoFocus": "從交朋友歌直接的問候、一起唱玩與道別，準備家庭分享的開場和收尾。",
  "focus": "面向家人開場、邀請觀看與結束道別。",
  "younger": "用bye告別、hello招呼、please邀請三個情境各回應一次，再選拍手或揮手與家人輪流做。",
  "older": "說 Hello, everyone! Please watch me clap. Thank you, and goodbye!；展示自己的拍手或揮手，另當一次觀眾回應家人，分清提問順序與正式表演順序。",
  "caregiverTip": "保留動物園暖身。This Is The Way We Make Friends 直接有 hello、一起玩和唱、輪流與 goodbye，比能力歌更支援這堂友善主持；bye 是簡短告別，please/thank you 由家庭分享補上。孩子展示暖身中已會的拍手或揮手，家人可當觀眾回應。三題依原 bye、hello、please 順序練，真正小表演仍從 hello 開始；不補勾過去進度、不保證額外獎勵。",
  "pausePrompts": [
    {
      "moment": "回看主課 goodbye 段後，先練結束情境時",
      "title": "分享結束怎麼告別",
      "question": "請用bye回答：你的表演結束了，向家人揮手可以說什麼？",
      "followUp": "先回應這題；真正派對仍從招呼開始，不把詞表順序當故事順序。",
      "targetWord": "bye"
    },
    {
      "moment": "片後準備正式開場時",
      "title": "邀大家來看你會的事",
      "question": "請用hello回答：家人剛坐好，你想怎麼開始打招呼？",
      "followUp": "Hello, everyone!可分段跟說，等家人回應。",
      "targetWord": "hello"
    },
    {
      "moment": "片後孩子選好要做的動作時",
      "title": "禮貌邀請家人觀看",
      "question": "請用please邀家人看你拍手或揮手，可以怎麼說？",
      "followUp": "示範Please watch me clap.；不想拍手可換揮手，年幼者先說please。",
      "targetWord": "please"
    }
  ],
  "instructions": [
    "播放動物園暖身短段，選跺腳或手臂擺動，用舒服幅度跟做。",
    "回播一個喜歡的動物動作，坐著可用手勢代替跳躍。",
    "停片每人帶一個已會的動作，其他家人跟做並等候輪流。",
    "喝水，排好禮貌卡，讓孩子選拍手或揮手作自己的短表演，預告人人都有演出與當觀眾的機會。",
    "播放交朋友歌問候、一起唱玩、道別的短段，觀察開場和結束用語不同；please 與 thank you 片後再加。",
    "先依 bye、hello、please 回答收尾、開場、邀請三題，再把表演順序重排為招呼、邀看、展示、感謝、告別，練原分享句。",
    "每名孩子自己複習三題並輪到一次演出或回應；完成當日原任務後依原安排辦家庭派對，不把慶祝變成補寫過去進度。"
  ]
}
};

function applyFirstWeekGuidance(block: LessonBlock, guidance: ReviewedTeachingGuidance): LessonBlock {
  const { instructions, focus, activityLabel, ...copy } = guidance;
  const originalActivityLabel = block.steps[0].title.split('｜').at(-1);
  return {
    ...block, ...copy,
    videoAnchor: { ...block.videoAnchor, focus, caregiverMove: guidance.caregiverTip },
    steps: block.steps.map((step, index) => ({ ...step,
      ...(index === 4 ? { title: `正式素材｜${focus}` } : {}),
      ...(index === 0 && activityLabel ? { title: `${step.title.split('｜')[0]}｜${activityLabel}` } : {}),
      instruction: instructions[index],
    })),
    missions: block.missions.map((mission, index) => {
      if (index !== 1) return mission;
      let prompt = mission.prompt.replace(block.sentence, guidance.sentence);
      if (activityLabel && originalActivityLabel) {
        prompt = prompt.replace(`「${originalActivityLabel}」`, `「${activityLabel}」`);
      }
      return { ...mission, prompt };
    }),
  };
}

const postReviewedGuidance: Record<string, ReviewedTeachingGuidance> = {
  "w1d3b1": {
    "title": "配對日｜介紹我的家人",
    "videoFocus": "認識 mom、dad、brother，指認圖卡並介紹一位家人。",
    "focus": "認識家人稱呼，練習指認與介紹家人。",
    "caregiverTip": "準備既有家人圖卡或一張家人照片，不必每個家庭都有相同成員。影片使用 mother／father，圖卡使用 mom／dad；先解釋同義，再請孩子指認。",
    "younger": "看家人圖卡，先指認 mom 或 dad；大人說句首，孩子補 family 即可。影片用 mother／father，大人說明它們也指媽媽／爸爸。",
    "older": "先說 My mom and dad are in my family.，再指著 brother 圖卡，用 My brother is in my family. 介紹另一位家人。",
    "pausePrompts": [
      {
        "moment": "主課介紹 father 的歌段後",
        "title": "找出爸爸",
        "question": "影片說 father，我們也可以說 dad。你能指出 dad 嗎？",
        "followUp": "先讓孩子指圖，再一起說 dad；不要求在影片聽到 dad 才暫停。",
        "targetWord": "dad"
      },
      {
        "moment": "主課介紹 mother 的歌段後",
        "title": "找出媽媽",
        "question": "影片說 mother，我們也可以說 mom。哪一位是 mom？",
        "followUp": "用現有圖卡對照；孩子只指出人物也先接住回應，再示範單字。",
        "targetWord": "mom"
      },
      {
        "moment": "主課介紹 brother 的歌段後",
        "title": "介紹一位家人",
        "question": "你找到 brother 了嗎？請指給我看，再說 brother。",
        "followUp": "較大的孩子介紹圖中人物；不要求孩子一定有兄弟，也不預設影片下一幕。",
        "targetWord": "brother"
      }
    ],
    "sentence": "Adventure 5: My mom and dad are in my family.",
    "instructions": [
      "播放〈Hey-O We Want To Play-O | Kids Sports And Movement Song〉，先模仿畫面中的運動動作；留出安全空間，不在歌詞中硬找家人單字。",
      "選暖身的一小段重播；一人做動作，另一人模仿，再交換。不以唱完整首作為成功條件。",
      "暫停暖身，請每名孩子示範一個剛才的動作；其他人跟做，不淘汰、不搶答。",
      "動作放慢、喝水，拿出 mom、dad、brother、family 圖卡。大人指卡介紹，說明這是接下來主課的家人主題。",
      "播放 The People In My Family，在父親、母親與兄弟各自介紹的歌段後暫停，先聽稱呼再指圖；將 father/dad、mother/mom 配成同一人物的兩種說法，較小孩子每次只配一組。",
      "回看家人片段，再看圖卡說 My mom and dad are in my family.。較小孩子補 family；較大孩子另介紹 brother。這是課堂練習句，不要求影片逐字唱出。",
      "做三次家人配對：大人說 mom、dad、brother，孩子各找出對應圖卡。可提示後重試；每名孩子再介紹一位家人，只記實際完成者。"
    ]
  },
  "w1d3b2": {
    "title": "配對日｜收到玩具說謝謝",
    "videoFocus": "輪流遞物並說 thank you；課後比較「謝謝」與 thank you 的聲音。",
    "focus": "練習遞物、道謝與回應。",
    "caregiverTip": "準備一件安全、方便傳遞的玩具。主課練習遞物、道謝及回應；hello／hi／bye 是課後延伸的見面與道別複習，本課將它們安排在片後，不要求主課唱出。中文聲音活動比較「謝謝」與 thank you 的聲音，接受孩子先用中文回應。",
    "younger": "收到玩具時先說 thank you，或先做接物、點頭的動作，再跟大人一起說；不要求一次說完整句。",
    "older": "輪流當送物者與收物者；收到玩具時說 Thank you for the toy.，換一樣物品後再練一次道謝。",
    "pausePrompts": [
      {
        "moment": "主課道謝回應短段後，真的接一次玩具",
        "title": "收到物品再道謝",
        "question": "你已經接到玩具了，可以說 thank you 嗎？說完先等送物者回應。",
        "followUp": "讓孩子實際接物與等待；家長示範回應即可，不把多說一句設成新領獎條件。",
        "targetWord": "thank you"
      },
      {
        "moment": "片後玩偶剛來，尚未開始傳物時",
        "title": "見面不是收物",
        "question": "玩偶剛到，還沒送你東西，請先說 hello。這和收到玩具後的道謝一樣嗎？",
        "followUp": "用兩個小情境配對招呼與感謝，再比較中文你好、謝謝的聲音；不是影片逐字歌詞題。",
        "targetWord": "hello"
      },
      {
        "moment": "片後另一位朋友加入傳物圈時",
        "title": "另一種招呼也合適",
        "question": "另一位朋友來了，你可以用 hi 招呼他嗎？hi 和 hello 應放在見面組，還是道謝組？",
        "followUp": "兩種招呼都正確，不強迫二選一互斥；先分類再輪流當送物者和收物者，完成真實合作。",
        "targetWord": "hi"
      }
    ],
    "sentence": "Adventure 6: Thank you for the toy.",
    "instructions": [
      "播放〈Open Shut Them 3 | featuring Finny The Shark〉，模仿畫面中的開合與對比動作；先以動作參與，不要求暖身出現道謝詞。",
      "選一段暖身重播，做「大人一動、孩子一動」接龍；每人輪流帶一次動作。",
      "暫停暖身，孩子選一個剛才的動作讓家人跟做；動作縮小後換下一位，不搶答。",
      "喝水，準備一件玩具。大人示範遞物、接物與道謝，先用中文說清楚今天會輪流扮演兩個角色。",
      "播放〈Here You Are, Thank You | Kids Songs〉，在遞物、道謝及回應後暫停；每次停下就用玩具演一次，不等待 hello、hi 或 bye 出現。",
      "輪流遞玩具，收物者練 Thank you for the toy.；較小孩子只說 thank you。先用見面說「你好」、收到東西說「謝謝」區分情境，各說一次；再把同一個道謝情境說成「謝謝」和 thank you，聽兩種語言的聲音差異。",
      "延伸做三次情境配對：見面打招呼、收到禮物、再見到朋友。見面時 hello 或 hi 都可以，道謝選 thank you；另以 bye 道別。最後每名孩子輪到一次遞物或收物，只有實際回答或操作才記完成。"
    ]
  },
  "w1d4b1": {
    "title": "小老師｜輪流玩與禮貌回應",
    "videoFocus": "從輪流遊戲延伸招呼、感謝與道別。",
    "focus": "輪流與共同遊戲。",
    "caregiverTip": "準備一件方便傳遞的玩具，讓每個孩子輪到一次。主課教輪流；bye、thank you、hello、hi 是本課情境延伸，不必在歌詞中等這些字。見面可說 hello 或 hi，感謝等待說 thank you，結束才說 bye。",
    "younger": "先把玩具交給下一位，再跟說 thank you；遊戲結束時揮手說 bye。能等待、交物或做道別動作也先肯定，再邀請開口。",
    "older": "自己玩完把玩具交給等候的同伴，說 Thank you for waiting.；整輪結束才說 Bye!。換自己等待時，練先等同伴交接，不把對方玩完說成自己在等待對方道謝。",
    "pausePrompts": [
      {
        "moment": "輪流短段後，片後演完最後一輪",
        "title": "交接不是離開",
        "question": "這次遊戲真的結束要回家了，請說 bye。若只是把玩具交給下一位、大家還在玩，也要立刻道別嗎？",
        "followUp": "先分清輪次交接與整個活動結束，再演一次道別；不把每次交物都固定接 bye。",
        "targetWord": "bye"
      },
      {
        "moment": "主課輪流段後，孩子玩完交出玩具時",
        "title": "向等待的人說謝謝",
        "question": "同伴等你玩完，你現在把玩具交給他，可以說 thank you 嗎？剛才誰在等？",
        "followUp": "由交物的孩子感謝等待者；這句是片後禮貌延伸，不聲稱歌曲唱出。真實輪到再說，不空演等待紀錄。",
        "targetWord": "thank you"
      },
      {
        "moment": "片後小老師加入一位新玩偶時",
        "title": "讓新朋友進入遊戲",
        "question": "新朋友還沒開始玩，你可以先說 hello，再告訴他現在輪到誰嗎？",
        "followUp": "先招呼，再指目前操作者與等待者；hello/hi 都合適，不能因孩子用 hi 就判錯。",
        "targetWord": "hello"
      }
    ],
    "sentence": "Adventure 7: Thank you for waiting. Bye!",
    "instructions": [
      "播放暖身〈Wind The Bobbin Up | Kids Songs〉，大人示範繞手、向外拉及拍手；孩子跟做，空間不夠時坐著做手部動作即可。",
      "選暖身短段回播，跟著指向天花板、地板、窗或門；每名孩子選一個方向讓其他人模仿，不硬插招呼詞進歌詞。",
      "暫停暖身，輪流當小老師，示範繞手、拍手或指方向；其他人等輪次後才換人，不淘汰。",
      "喝水、縮小動作，準備玩具；大人先演一人玩、另一人等，再交給下一位，說清楚輪流規則。",
      "播放〈Let's Take Turns | Play Together Song for Kids With @NoodleAndPals〉，在交換輪次的歌段後暫停，用玩具實做一次；不等待 bye、thank you 或 hello 出現。",
      "延伸練習 Thank you for waiting. Bye!：玩具交接時感謝等待，整輪結束後才道別。較小孩子說 thank you 或 bye；較大孩子分清兩個情境。",
      "輪流問三題：朋友剛來如何招呼、同伴等待後如何感謝、遊戲結束如何道別。hello 或 hi 都可用於見面；每個孩子實際回答或示範三次，再記任務完成。"
    ]
  },
  "w1d4b2": {
    "title": "小老師｜聽提示找物與字母 I",
    "videoFocus": "聽 Where Is Baby? 的位置問答，再把玩偶放在兩個位置練問與答。",
    "focus": "聽位置問題、指出所在與辨認課後字母 I。",
    "caregiverTip": "用一個玩偶、一本書及桌面兩個位置即可。主課直接問 baby 或家人在哪裡；片後改問玩偶用 Where is it?，找到回 It is here.。yes/no 是家長加的核對題。詞卡 where-is-it 的口說是 Where is it?，不念連字號。字母 I 只在片後寫出讓孩子比對另一個大寫 I，不聲稱主課是字母歌。",
    "younger": "大人先指一個位置，孩子用指認或點頭、搖頭回答；再示範 yes 或 no，不要求孩子獨立讀出整個問句。",
    "older": "一人問 Where is it?，另一人指著找到的物品說 It is here.；再由大人問 Is it here?，孩子依真實位置回答 yes 或 no。",
    "pausePrompts": [
      {
        "moment": "主課一次找人與出現的問答後，換玩偶時",
        "title": "聽的是位置",
        "question": "請找 where-is-it 圖卡，聽家長問 Where is it?，再指出玩偶在哪裡。這題要回答位置還是名字？",
        "followUp": "先指再說 It is here.；原歌問人，現在換物品，所以用 it。",
        "targetWord": "where-is-it"
      },
      {
        "moment": "片後家長指到玩偶真正所在的位置時",
        "title": "指對了才肯定",
        "question": "玩偶確實在書旁，家長指著它問 Is it here?。請選 yes 並自己回答，為什麼這次可以說是？",
        "followUp": "讓孩子看清楚，指卡或點頭後示範 yes，不當作影片原歌詞。",
        "targetWord": "yes"
      },
      {
        "moment": "片後家長改指沒有玩偶的另一個位置時",
        "title": "指錯了可以修正",
        "question": "家長指向空位置，請選 no，接著把他帶到真正的位置。找到後可以怎麼說？",
        "followUp": "補 It is here.；合作後家長另寫兩個大寫 I，讓孩子找相同字母，不要求認讀整個英文句。",
        "targetWord": "no"
      }
    ],
    "sentence": "Adventure 8: Where is it? It is here.",
    "instructions": [
      "播放暖身〈Hush Little Baby | Lullaby for Babies〉的一小段。這是搖籃曲，先輕擺、抱玩偶或慢慢伸展，接受坐姿參與，不把它當快速跳舞歌。",
      "暫停音樂，輪流示範一個輕柔動作，家人跟做；再伸手、踏步喚醒注意力，不反覆被動看完整首。",
      "孩子輪流當領隊，做三個簡單動作；其他人先看再模仿，換人時等待同伴準備好。",
      "喝水，選玩偶及桌面兩個位置，預告等一下聽問在哪裡，再指出所在。",
      "播放 Where Is Baby? 的一次位置問答，等找到家人後按停，聽問題與指出來的回答是不同回合。",
      "依 where-is-it、yes、no 完成三題；原歌問人，片後改問玩偶 Where is it?，回答 It is here.，並以真正位置核對肯否。",
      "家人各輪一次位置問答，再另寫兩個大寫 I 做同形指認；字母是課後延伸，保留原合作任務，不要求在影片找字母教材。"
    ]
  }
};

function reviewedDayThreeGuidance(block: LessonBlock): LessonBlock {
  const reviewed = legacyReviewedDayThreeGuidance(block);
  const guidance = postReviewedGuidance[block.id];
  return guidance ? applyFirstWeekGuidance(reviewed, guidance) : reviewed;
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
      blocks: [
        makeBlock(plan, weekIndex, day, 1),
        makeBlock(plan, weekIndex, day, 2),
      ],
      bonus: plan.bonus,
    } as CourseDay;
  }),
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
