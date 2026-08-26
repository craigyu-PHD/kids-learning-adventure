import type { VideoClip } from '../types';

const yt = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`;

function clip(
  id: string,
  title: string,
  channel: string,
  videoId: string,
  topics: string[],
  start?: number,
  end?: number,
): VideoClip {
  return { id, title, channel, videoId, topics, start, end, sourceUrl: yt(videoId) };
}

const SSS = 'Super Simple Songs';
const BAMBI = '快樂斑比 HAPPY BAMBI';

/**
 * V2.2 video library.
 *
 * `topics` is intentionally human-audited metadata. The curriculum validator
 * uses it to ensure every main video actually overlaps the declared lesson
 * focus instead of rotating videos independently from the daily topic.
 */
export const videos: Record<string, VideoClip> = {
  hello: clip('hello', 'Hello!（打招呼）', SSS, 'l-sEZaHet8c', ['greetings', 'speaking', 'social'], 2529, 2605),
  alphabet: clip('alphabet', 'The Alphabet Song', SSS, 'l-sEZaHet8c', ['alphabet', 'letters', 'phonics'], 7, 182),
  phonics: clip('phonics', 'The Phonics Alphabet Song', SSS, 'l-sEZaHet8c', ['alphabet', 'letters', 'phonics', 'sounds'], 593, 670),
  body: clip('body', 'Head Shoulders Knees & Toes', SSS, 'l-sEZaHet8c', ['body', 'movement', 'actions'], 2750, 2855),
  clothes: clip('clothes', 'Put On Your Shoes', SSS, 'l-sEZaHet8c', ['clothes', 'daily-life', 'sequence'], 1912, 2040),
  pets: clip('pets', 'I Have A Pet', SSS, 'pWepfJ-8XU0', ['animals', 'pets', 'speaking', 'i-have']),
  farm: clip('farm', 'The Animals On The Farm', SSS, 'zXEq-QO3xTg', ['animals', 'farm', 'sounds']),
  food: clip('food', 'Do You Like Broccoli Ice Cream?', SSS, 'frN3nvhIHUk', ['food', 'preferences', 'speaking', 'do-you-like']),
  fruitYummy: clip('fruit-yummy', 'Fruit Is Yummy', SSS, 'DDjOLRNby20', ['food', 'fruit', 'colors', 'vocabulary']),
  applesBananas: clip('apples-bananas', 'Apples & Bananas', SSS, 'r5WLXZspD1M', ['food', 'fruit', 'vocabulary', 'singing']),
  vegetables: clip('vegetables', 'I Love Eating Vegetables', SSS, 'tjT_nFtKTas', ['food', 'vegetables', 'healthy-food', 'preferences']),
  countingBananas: clip('counting-bananas', 'Counting Bananas', SSS, 'N-6bxyzyHZs', ['food', 'fruit', 'numbers', 'counting'], 7, 90),
  weather: clip('weather', "How's The Weather?", SSS, 'KBL5aXSJTlE', ['weather', 'nature', 'speaking']),
  count20: clip('count20', 'Counting Up To 20', SSS, 'S84fcGdEULk', ['numbers', 'counting', 'math']),
  colors: clip('colors', 'Red Yellow Green Blue', SSS, 'P0C1_bOhPV4', ['colors', 'vocabulary'], 432, 546),
  days: clip('days', 'Days Of The Week Song', SSS, 'P0C1_bOhPV4', ['days', 'calendar', 'time'], 1767, 1842),
  add10: clip('add10', 'Adding Up To 10', SSS, 'P0C1_bOhPV4', ['numbers', 'addition', 'math'], 2843, 2985),
  follow: clip('follow', 'Follow Me', SSS, 'fwouqMt8Eds', ['actions', 'movement', 'instructions', 'speaking'], 2112, 2234),
  happy: clip('happy', "If You're Happy And You Know It", SSS, 'fwouqMt8Eds', ['feelings', 'actions', 'movement'], 1182, 1338),
  cleanup: clip('cleanup', 'Clean Up Song', SSS, 'fwouqMt8Eds', ['home', 'cleaning', 'daily-life', 'habits'], 2798, 2892),
  car: clip('car', 'My Yellow Car', SSS, 'fwouqMt8Eds', ['transport', 'car', 'colors'], 3391, 3560),
  mountains: clip('mountains', 'I Love The Mountains', SSS, 'fwouqMt8Eds', ['nature', 'outdoors', 'mountains'], 2234, 2355),

  // Direct Super Simple videos added in V2.2 specifically to close topic/video gaps.
  shapes: clip('shapes', 'The Shape Song #1', SSS, 'TJhfl5vdxp4', ['shapes', 'find', 'vocabulary']),
  familyPeople: clip('family-people', 'The People In My Family', SSS, 'yDua9ms9_eg', ['family', 'people', 'vocabulary', 'speaking']),
  familyTree: clip('family-tree', 'The Family Tree', SSS, 'ecm9HEFcfdQ', ['family', 'people', 'vocabulary']),
  happyFace: clip('happy-face', 'This Is A Happy Face', SSS, 'lQZX1IIAnLw', ['feelings', 'face', 'emotions', 'speaking']),
  houseKitchen: clip('house-kitchen', 'In The Kitchen | Rooms Around The House', SSS, '2sClBxucyf8', ['home', 'rooms', 'kitchen', 'vocabulary']),
  houseHide: clip('house-hide', 'Hide & Seek (Around The House)', SSS, 'CnevsHDtJXo', ['home', 'rooms', 'find', 'daily-life']),
  wheelsBus: clip('wheels-bus', 'The Wheels On The Bus', SSS, 'yWirdnSDsV4', ['transport', 'bus', 'actions', 'family']),
  sevenSteps: clip('seven-steps', 'Seven Steps', SSS, 'pTLtcno5_cY', ['numbers', 'counting', 'movement', 'math']),
  dinosaur10: clip('dinosaur-10', '10 Little Dinosaurs', SSS, 'TjmGTbNLj6Q', ['dinosaurs', 'numbers', 'counting', 'animals']),
  twinkle: clip('twinkle', 'Twinkle Twinkle Little Star', SSS, 'yCjJyiqpAuU', ['space', 'stars', 'sky', 'nature']),
  animalSounds: clip('animal-sounds', 'What Do You Hear?', SSS, 'YVgv1EFJZHc', ['animals', 'sounds', 'listening', 'farm']),
  zoo: clip('zoo', "Let's Go To The Zoo", SSS, 'eL_fl1Ebt7c', ['animals', 'zoo', 'movement', 'actions'], 7, 220),
  seeBlue: clip('see-blue', 'I See Something Blue', SSS, 'E-A8iFEFMUE', ['colors', 'find', 'i-see', 'speaking'], 0, 168),
  bathBody: clip('bath-body', 'The Bath Song', SSS, 'CG8F-6dZk8k', ['body', 'daily-life', 'hygiene'], 0, 121),
  cleanupDirect: clip('cleanup-direct', 'Clean Up Song', SSS, 'SFE0mMWbA-Y', ['home', 'cleaning', 'daily-life', 'habits']),

  happyBambiColors: clip('happy-bambi-colors', '幼兒顏色認知｜Colors in English and Chinese', BAMBI, '_N-iXioQhII', ['colors', 'bilingual', 'vocabulary'], 0, 480),
  happyBambiWild: clip('happy-bambi-wild', '野生動物｜Wild Animals', BAMBI, 'JCbxmXzOUho', ['animals', 'wild-animals', 'bilingual', 'vocabulary'], 4, 368),
  happyBambiSea: clip('happy-bambi-sea', '海洋動物｜Sea Animals', BAMBI, 'JCbxmXzOUho', ['animals', 'ocean', 'sea-animals', 'bilingual'], 607, 937),
  happyBambiInsects: clip('happy-bambi-insects', '昆蟲大集合｜Insects & Bugs', BAMBI, 'JCbxmXzOUho', ['animals', 'insects', 'bilingual'], 937, 1197),
  happyBambiFarm: clip('happy-bambi-farm', '農場與家畜｜Farm Life & Animals', BAMBI, 'JCbxmXzOUho', ['animals', 'farm', 'bilingual'], 1551, 2087),
  happyBambiCounting: clip('happy-bambi-counting', '農場收穫與數字｜Farm Harvest & Counting', BAMBI, 'JCbxmXzOUho', ['numbers', 'counting', 'farm', 'bilingual', 'math'], 3271, 3590),
};

export const youtubeChannelLinks = [
  { label: 'Super Simple Songs', url: 'https://www.youtube.com/@SuperSimpleSongs' },
  { label: '快樂斑比 HAPPY BAMBI', url: 'https://www.youtube.com/@happy-bambi' },
];
