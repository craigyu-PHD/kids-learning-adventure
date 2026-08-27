import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { badges } from '../src/badges';
import { cosmetics } from '../src/cosmetics';
import { avatarStageNames, avatarStageThresholds } from '../src/rewards';

const root = resolve(import.meta.dirname, '..');
const text = (path: string) => readFileSync(join(root, path), 'utf8');
const has = (value: string, pattern: RegExp | string) => typeof pattern === 'string' ? value.includes(pattern) : pattern.test(value);

const app = text('src/App.tsx');
const css = text('src/v30.css');
const types = text('src/types.ts');
const daily = text('src/dailyChallenge.ts');
const rewards = text('src/rewards.ts');
const gameBadge = text('src/components/GameBadge.tsx');
const avatarHero = text('src/components/AvatarHero.tsx');
const security = text('src/security.ts');
const api = text('api/state.ts');
const validator = text('scripts/validate_curriculum.ts');
const pkg = JSON.parse(text('package.json')) as { version?: string };

const browserPath = join(root, '.qa/v30_browser_result.json');
const assetPath = join(root, '.qa/v30_asset_result.json');
const browser = existsSync(browserPath) ? JSON.parse(readFileSync(browserPath, 'utf8')) as {
  status?: string;
  brand?: Record<string,string>;
  worldIds?: string[];
  worldUiSignatures?: string[];
  caregiverCards?: string[];
  mobileModal?: { position?: string; bottom?: number; width?: number; vw?: number };
  mapWorldCount?: number;
  badgeCount?: number;
  characterStageCount?: number;
  rewardMoment?: boolean;
  results?: Array<{ label:string; overflow:number; broken:unknown[]; bpmf:number; tiny:unknown[]; undersized:unknown[] }>;
} : null;
const assets = existsSync(assetPath) ? JSON.parse(readFileSync(assetPath, 'utf8')) as {
  status?: string;
  worlds?: number;
  characters?: number;
  badges?: number;
  vocabularyTerms?: number;
  vocabularyFiles?: number;
  runtimeV23Refs?: string[];
  missingVocabulary?: unknown[];
  smallVocabulary?: unknown[];
} : null;

const browserClean = Boolean(browser?.results?.every((r) =>
  r.overflow <= 1 && r.broken.length === 0 && r.bpmf === 0 && r.tiny.length === 0 && r.undersized.length === 0));

const dims: Array<{ name:string; checks:boolean[]; note:string }> = [
  {
    name: '01 Design System',
    checks: [
      pkg.version === '3.0.0',
      ['#6C63E8','#63C7F5','#FFD35A','#FF7E72','#58D2A0','#FFA24A','#F7F8FF','#FFFFFF','#27314A','#75809A'].every((v)=>has(css,v)),
      ['--radius-sm: 12px','--radius-md: 16px','--radius-lg: 22px','--radius-xl: 28px','--radius-pill: 999px'].every((v)=>has(css,v)),
      ['#171A32','#222742','#2B3150','#343B5D','#444C70','#F8FAFF','#B6BFDA','#9D91FF','#72D6FF','#FFD966','#68E0AE','#FF8A82'].every((v)=>has(css,v)),
      Boolean(browser?.brand?.brand === '#6C63E8' && browser.brand.reward === '#FFD35A'),
    ],
    note: '固定 Kids Adventure 色票、Card/Radius token 與 Night Adventure palette；World 不改寫 UI DNA。',
  },
  {
    name: '02 Daily Challenge',
    checks: [
      has(daily,"TAIPEI_TIME_ZONE = 'Asia/Taipei'") && has(daily,'fetchTrustedTaipeiDate'),
      has(app,'const canEarnToday') && has(app,"accessForDay(day) === 'today'"),
      ['Warm-up','Learn','Challenge'].every((x)=>has(app,x)) && !has(app,"stages==['Listen'"),
      has(app,"if (access === 'future') return") && has(app,'這是回顧模式'),
      has(app,'completedMissions.includes(mission.id)) return') && has(app,'completedBlocks.includes(block.id)) return'),
    ],
    note: '可信台北日期、今日唯一可領獎、未來鎖定、過去只讀，且完成紀錄單向防刷。',
  },
  {
    name: '03 Home & Card UX',
    checks: [
      has(app,'開始今天的冒險') && has(app,'今天完成了！'),
      has(app,"heroState = !trustedDate.verified") && has(app,'v30-daily-progress'),
      has(css,'.v30-daily-hero') && has(css,'min-height: 400px') && has(css,'height: min(470px,58vh)'),
      has(css,'.v30-vocab-card { min-height: 210px') && has(css,'.v30-mission-card { min-height: 154px'),
      Boolean(browser?.results?.some((r)=>r.label==='desktop-home') && browser.results.some((r)=>r.label==='mobile-home')),
    ],
    note: '首頁是一眼可懂的每日冒險入口；Card 尺寸、CTA 與 Mobile 首屏受控。',
  },
  {
    name: '04 Character Growth',
    checks: [
      avatarStageNames.length === 5 && avatarStageThresholds.length === 5,
      ['Little Explorer','Adventure Rookie','Star Explorer','Adventure Master','Legendary Explorer'].every((x)=>avatarStageNames.includes(x as typeof avatarStageNames[number])),
      cosmetics.length >= 5 && has(rewards,'cosmeticSpend') && has(rewards,'earnedCoins'),
      has(avatarHero,"`${id}-stage-${stage}.webp`") && has(avatarHero,'equippedCosmetics') && has(avatarHero,'avatar-equipped-cosmetic') && has(css,'v30LegendaryIdle'),
      assets?.status === 'PASS' && (assets.characters ?? 0) >= 34,
    ],
    note: '五階成長、全角色獨立高解析素材與金幣 Cosmetic 解鎖形成可見成長循環。',
  },
  {
    name: '05 Badge & Reward',
    checks: [
      badges.length === 24 && new Set(badges.map((b)=>b.id)).size === 24,
      new Set(badges.map((b)=>b.category)).size === 6,
      assets?.badges === 24 && has(gameBadge,'assets/v30/badges/'),
      has(app,'CelebrationOverlay') && has(app,'NEW BADGE!') && has(app,'Continue Adventure'),
      has(css,'@keyframes v30BadgeUnlock') && has(css,'@keyframes v30CharacterCheer') && has(css,'.v30-celebration-skip'),
    ],
    note: '24 枚原創 Badge、取得日期、全螢幕 Reward、Skip 與 Rare glow 均落在同一獎勵循環。',
  },
  {
    name: '06 Adventure Map',
    checks: [
      ['Hello Town','Color Garden','Animal Forest','Family Village','Number Mountain','Food Market','Ocean Adventure','Dino Island','Space Station'].every((x)=>has(app,x)),
      has(app,'v30-map-node') && has(app,"status === 'locked'") && has(app,'Footprints'),
      has(app,'v30-map-treasure') && has(app,'easterEggDays.has(day.index)'),
      assets?.worlds === 10,
      (browser?.worldUiSignatures?.length ?? 0) === 5 && new Set(browser?.worldUiSignatures ?? []).size === 1,
    ],
    note: '孩子看 9 世界關卡地圖；完成、今日、足跡、鎖定與 Treasure Day 都有清楚狀態。',
  },
  {
    name: '07 Parent & PIN',
    checks: [
      has(app,"LOCAL_FAMILY_KEY = '__local__'") && !has(app,'function PinGate('),
      has(app,'FamilySetupDialog') && has(app,'稍後再說') && has(app,'v30-modal-x'),
      has(app,"event.key === 'Escape'") && has(app,'PIN 還沒有對上'),
      has(app,'ParentCalendar') && has(app,'parent-presentation'),
      has(security,'180_000') && has(security,"name: 'PBKDF2'") && !Boolean(browser?.caregiverCards?.some((x)=>x==='哥哥'||x==='弟弟')),
    ],
    note: 'Child Mode 不被 PIN 卡死；Parent/Sensitive 區才驗證，並有 ×／取消／Esc 與家長月曆。',
  },
  {
    name: '08 Learning Artwork',
    checks: [
      assets?.status === 'PASS' && assets.vocabularyTerms === 161,
      (assets?.missingVocabulary?.length ?? 1) === 0 && (assets?.smallVocabulary?.length ?? 1) === 0,
      has(app,'vocab/${vocabularyAssetFile(word)}') && has(app,'教材插畫'),
      has(app,'speechSynthesis') && has(app,"utterance.lang = 'en-US'"),
      has(app,'reacted') && has(css,'.v30-vocab-card.reacted'),
    ],
    note: '161 個 Vocabulary 全有 640×480 教材圖、英文發音與短 Reaction，不再共用世界背景假裝字卡。',
  },
  {
    name: '09 Motion & Responsive',
    checks: [
      has(css,'@media (prefers-reduced-motion: reduce)'),
      has(css,'transition: transform 140ms ease') && has(css,'v30CharacterCheer'),
      !has(app,'adventure-cursor') && !has(app,'cursor-trail-layer') && !has(app,'click-burst'),
      browser?.status === 'PASS' && browserClean,
      Boolean(browser?.mobileModal?.position === 'fixed' && Math.abs(browser.mobileModal.bottom ?? 99) <= 2),
    ],
    note: 'Motion 只服務狀態變化；三尺寸無 overflow、破圖、低字級或過小 touch target，手機 Modal 為 Bottom Sheet。',
  },
  {
    name: '10 Data & Security',
    checks: [
      has(validator,'360 unique YouTube IDs required') && has(validator,'All 360 mission prompts must be unique'),
      has(types,'version: 2') && has(app,"star-learning-v22:${pin}:${kind}"),
      has(api,"request.headers.get('x-family-pin')") && has(api,"createHmac('sha256', pepper)"),
      has(api,"familyCode: ''") && !has(api,'console.log(pin'),
      has(app,'calculateRewards') && !has(app,/\btotalXp\s*\+=|\btotalCoins\s*\+=/) && (assets?.runtimeV23Refs?.length ?? 1) === 0,
    ],
    note: '90/180/360、V2 namespace、PBKDF2/HMAC、familyCode sanitization 與完成紀錄衍生 XP/Coins 全部保留。',
  },
];

let score=0;
console.log('Orbit UX Director · V3.0 Premium Kids Adventure Audit');
console.log('--------------------------------------------------------');
for (const d of dims) {
  const passed=d.checks.filter(Boolean).length;
  const pts=(passed/d.checks.length)*10; score+=pts;
  console.log(`${d.name.padEnd(22)} ${pts.toFixed(1)}/10  (${passed}/${d.checks.length})`);
  console.log(`  ${d.note}`);
  if (passed!==d.checks.length) d.checks.forEach((ok,i)=>{ if(!ok) console.log(`  FAIL check ${i+1}`); });
}
const rounded=Math.round(score*10)/10;
console.log('--------------------------------------------------------');
console.log(`FINAL SCORE ${rounded.toFixed(1)}/100`);
if (rounded<98) throw new Error(`Orbit UX Director rejected V3.0: ${rounded.toFixed(1)} < 98`);
console.log('ORBIT PASS  >= 98/100');
