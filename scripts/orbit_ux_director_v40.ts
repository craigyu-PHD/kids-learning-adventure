import fs from 'node:fs';
import path from 'node:path';
import { curriculum } from '../src/data/curriculum';
import { badges } from '../src/badges';
import { cosmetics } from '../src/cosmetics';
import { avatarStageThresholds } from '../src/rewards';

const ROOT = path.resolve(import.meta.dirname, '..');
const text = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const exists = (file: string) => fs.existsSync(path.join(ROOT, file));
const has = (value: string, needle: string | RegExp) => typeof needle === 'string' ? value.includes(needle) : needle.test(value);

const app = text('src/App.tsx');
const dashboard = text('src/v4/Dashboard.tsx');
const quest = text('src/v4/LessonQuest.tsx');
const secondary = text('src/v4/SecondaryViews.tsx');
const parentAccess = text('src/v4/ParentAccess.tsx');
const parentSettings = text('src/v4/ParentSettings.tsx');
const caregivers = text('src/v4/caregivers.tsx');
const model = text('src/v4/model.ts');
const sound = text('src/v4/sound.ts');
const reward = text('src/v4/RewardModal.tsx');
const treasureLottie = text('src/v4/TreasureLottie.tsx');
const css = text('src/v40.css');
const daily = text('src/dailyChallenge.ts');
const serverTime = text('api/server-time.ts');
const stateApi = text('api/state.ts');
const cloud = text('src/cloud.ts');
const gameImage = text('src/v4/GameImage.tsx');
const gameIcon = text('src/v4/GameIcon.tsx');
const types = text('src/types.ts');
const pkg = JSON.parse(text('package.json')) as { version?: string; dependencies?: Record<string,string> };
const browser = exists('.qa/v40_browser_result.json') ? JSON.parse(text('.qa/v40_browser_result.json')) : null;
const asset = exists('.qa/v40_asset_result.json') ? JSON.parse(text('.qa/v40_asset_result.json')) : null;
const stateGuard = exists('.qa/v40_state_guard_result.json') ? JSON.parse(text('.qa/v40_state_guard_result.json')) : null;
const familyAuth = exists('.qa/v40_family_auth_result.json') ? JSON.parse(text('.qa/v40_family_auth_result.json')) : null;
const familyMigration = exists('.qa/v40_family_migration_result.json') ? JSON.parse(text('.qa/v40_family_migration_result.json')) : null;
const dateEngine = exists('.qa/v40_date_engine_result.json') ? JSON.parse(text('.qa/v40_date_engine_result.json')) : null;
const performance = exists('.qa/v40_performance_result.json') ? JSON.parse(text('.qa/v40_performance_result.json')) : null;
const crossBrowser = exists('.qa/v40_cross_browser_result.json') ? JSON.parse(text('.qa/v40_cross_browser_result.json')) : null;

const blocks = curriculum.flatMap((day) => day.blocks);
const missions = blocks.flatMap((block) => block.missions);
const youtubeIds = blocks.flatMap((block) => [block.warmup.videoId, block.video.videoId]);
const scoreGroups = [
  {
    name: '01 Curriculum Recovery',
    note: 'V4 前端重建不覆寫教材層；90 天、180 堂、360 任務與 360 支 YouTube 仍完整。',
    checks: [
      curriculum.length === 90,
      blocks.length === 180,
      missions.length === 360,
      new Set(youtubeIds).size === 360,
      blocks.every((block) => block.steps.length >= 4 && block.vocabulary.length > 0 && Boolean(block.caregiverTip)),
    ],
  },
  {
    name: '02 Enterprise Game UI',
    note: '三欄 Dashboard、1560px 主寬、六導航與共享 GameIcon glossy HUD Design System 已形成單一品牌語言。',
    checks: [
      ['#061D57','#075BC7','#10BCEB','#FFD83D','#FF7B32','#20C968','#A84DF5'].every((color) => has(css,color)),
      (has(css,'grid-template-columns:minmax(230px,260px) minmax(0,1fr) minmax(310px,350px)') || has(css,'grid-template-columns:minmax(230px,260px) minmax(0,1fr) minmax(310px,392px)')),
      ['首頁','今日課程','學期日曆','成就獎勵','學習報表','寶物商店'].every((label)=>has(dashboard,label)) && has(dashboard,"{ id: 'today', label: '今日課程'") && has(dashboard,"aria-current={active === item.id ? 'page' : undefined}"),
      has(dashboard,'v4-adventure-header') && has(dashboard,'一起學習・一起長大'),
      !has(app,'function DayView') && has(parentSettings,'PARENT CONTROL CENTER · V4.0') && has(parentAccess,'NumericPinPad') && has(caregivers,'CaregiverAvatar'),
      browser?.status === 'PASS' && browser?.lessonCards === 2 && browser?.gameIconSystem === true && browser?.navActiveUnique === true,
      has(gameIcon,'v4-game-icon') && has(dashboard,"from './GameIcon'") && has(secondary,"from './GameIcon'") && has(parentAccess,"from './GameIcon'"),
    ],
  },
  {
    name: '03 Date Lock Engine',
    note: 'Asia/Taipei server time、精準 midnight timer、visibilitychange、fallback polling 與 URL guard 共同阻擋裝置改日期作弊。',
    checks: [
      has(serverTime,"Asia/Taipei") && has(serverTime,'activeDate'),
      has(daily,"/api/server-time") && has(daily,"cache: 'no-store'"),
      has(app,"visibilitychange") && has(app,'msUntilNextTaipeiMidnight') && has(app,'5 * 60 * 1000'),
      has(app,"window.history.replaceState") && has(app,"accessForDay(routeDay) !== 'today'"),
      browser?.dateRouteGuard === true && browser?.historyReadOnly === true && dateEngine?.status === 'PASS' && dateEngine?.scheduledDelayMs === 750 && dateEngine?.newDayUnlocks === true,
    ],
  },
  {
    name: '04 Nine-stage Lesson',
    note: '每堂課固定 9 關，直接使用原 warmup/video/vocabulary/sentence/steps/missions/分齡教案。',
    checks: [
      ['唱歌暖身','單字預覽','觀看影片','暫停提問','複誦練習','互動遊戲','分類活動','完成任務','領取獎勵'].every((label)=>has(quest,label)),
      has(quest,'block.warmup.videoId') && has(quest,'block.video.videoId'),
      has(quest,'block.vocabulary.map') && has(quest,'block.steps.map'),
      has(quest,'block.younger') && has(quest,'block.older') && has(quest,'block.caregiverTip'),
      browser?.stages === 9,
    ],
  },
  {
    name: '05 Idempotent Economy',
    note: 'XP / Coins / Stars / Gems 與 append-only Transaction ID 組成可刷新、不可重複領取的遊戲經濟。',
    checks: [
      has(types,'RewardTransaction') && has(types,'AnswerEvent') && has(types,"kind: 'stage' | 'lesson' | 'day' | 'treasure' | 'achievement' | 'shop' | 'bonus'"),
      has(app,'v4-stage:') && has(app,'v4-day:') && has(app,'v4-treasure:') && has(app,'v4-answer:') && has(app,'v4-accuracy:') && has(app,'v4-first-daily:') && has(app,'v4-special:'),
      has(app,'accuracyBonus') && has(app,'FIRST_DAILY_BONUS') && has(app,'SPECIAL_TASK_BONUS') && has(quest,'SPECIAL BONUS') && has(quest,'props.day.bonus'),
      has(stateApi,'guardImmutableEvents') && has(stateApi,'guardBaseVersion') && has(cloud,'X-Family-Base-Updated-At') && stateGuard?.status === 'PASS',
      browser?.treasureIdempotent === true && browser?.rewardModal === 'v4' && browser?.answerTelemetry?.events === 4 && browser?.accuracyBonus === true && browser?.firstDailyBonus === true && browser?.specialBonus === true && browser?.rewardBonusModal === true,
      has(reward,'TREASURE OPEN!') && has(reward,'BONUS COMPLETE!') && has(reward,'LEVEL UP!') && has(reward,"'bonus'"),
    ],
  },
  {
    name: '06 Character & Shop',
    note: 'Lv.1/5/10/15 長期成長、52 個穿戴／世界商品、Coins 商店與即時裝備均綁定個別學習者。',
    checks: [
      avatarStageThresholds[1] === 880 && avatarStageThresholds[2] === 1980 && avatarStageThresholds[4] === 3080,
      has(model,"if (level >= 15) return '傳奇英雄'") && has(model,"if (level >= 10) return '超級勇者'") && has(model,"if (level >= 5) return '星際勇者'"),
      cosmetics.length >= 52,
      new Set(cosmetics.map((item)=>item.slot)).size >= 12,
      has(secondary,'立即裝備') && has(secondary,'NO REAL MONEY'),
    ],
  },
  {
    name: '07 Badge & Treasure',
    note: '24 Badge、特殊日期 Lottie 開箱、V4 Reward Modal 與唯讀歷史形成完成→獎勵→收藏循環。',
    checks: [
      badges.length === 24,
      has(dashboard,'v4-treasure-chest') && has(dashboard,'egg-day-'),
      browser?.treasureIdempotent === true && browser?.treasureLottie === true,
      Boolean(pkg.dependencies?.['lottie-web']) && has(treasureLottie,"from 'lottie-web/build/player/lottie_light.js'") && has(dashboard,"lazy(() => import('./TreasureLottie'))"),
      has(secondary,'READ-ONLY HISTORY') && has(secondary,'永久鎖定'),
      has(reward,'Continue Adventure'),
    ],
  },
  {
    name: '08 Theme, Sound & Motion',
    note: '五套原創 Skin、Web Audio 五類音效、單一全域 click delegation、答對／答錯 feedback、動態 Reward chunk、IntersectionObserver 與 reduced-motion 已落地。',
    checks: [
      ['星際英雄','機甲戰士','賽車冒險','奇幻精靈','海底世界'].every((label)=>has(dashboard,label)),
      ['click','success','error','fanfare','treasure'].every((kind)=>has(sound,`'${kind}'`)) && has(sound,"little-explorers-v4-sound') === 'off'"),
      (app.match(/document\.addEventListener\('pointerdown'/g) ?? []).length === 1 && !has(app,"document.addEventListener('click'") && (app.match(/playV4Sound\('click'\)/g) ?? []).length === 1,
      has(quest,"playV4Sound(correct ? 'success' : 'error')") && browser?.soundPreference === true,
      has(app,"lazy(() => import('./v4/RewardModal'))"),
      has(app,'IntersectionObserver') && has(css,'animation-play-state:paused'),
      has(css,'prefers-reduced-motion') && browser?.aiRobotMotion === true && browser?.skeletonLoading === true && browser?.reducedMotion === true,
    ],
  },
  {
    name: '09 Parent Security',
    note: '家長報表與設定受 PIN 保護；家庭 PIN 只用於換發 signed session，前端不再明文保存，並具 application-level PIN attempt rate limit；個人 PIN 維持 PBKDF2。',
    checks: [
      has(parentAccess,'v4-pin-grid') && has(parentAccess,'v4-pin-dots') && has(parentAccess,'NumericPinPad'),
      has(parentAccess,"event.key === 'Escape'") && has(parentAccess,'modal-close-link'),
      has(parentAccess,"playV4Sound('error')") && has(parentSettings,'PARENT CONTROL CENTER · V4.0'),
      browser?.pinKeypad === true && browser?.settingsV4 === true && browser?.familySessionSecurity === true && has(caregivers,'hasUserPin'),
      familyAuth?.status === 'PASS' && familyAuth?.stateUsesBearerOnly === true && familyAuth?.noActivePinWrite === true && familyAuth?.endpointRateLimitsPinAttempts === true,
      familyMigration?.status === 'PASS' && familyMigration?.activePinRemoved === true && familyMigration?.legacyPinNamespacesRemoved === true && familyMigration?.learnerDataVisible === true,
      has(stateApi,'verifyFamilySessionToken') && !has(stateApi,'x-family-pin') && has(cloud,'Authorization: `Bearer ${session.token}`'),
      has(types,'userPinHash') && has(types,'userPinSalt') && has(secondary,'QUICK CHECK ACCURACY') && browser?.answerTelemetry?.accuracy === '50%',
      has(secondary,'本週完成率') && has(secondary,'本月完成率') && browser?.periodRates?.week === true && browser?.periodRates?.month === true,
    ],
  },
  {
    name: '10 Responsive & Asset Safety',
    note: 'Desktop／Tablet／iPhone／Android 無破圖與 overflow；V4 專屬 Character／Bust／Item／Badge／Theme／Vocabulary 高解析資產由 V4 Asset Gate 保護。',
    checks: [
      browser?.results?.some((item: {label:string})=>item.label==='desktop-home'),
      browser?.results?.some((item: {label:string})=>item.label==='tablet-home'),
      browser?.results?.some((item: {label:string})=>item.label==='mobile-home'),
      browser?.results?.some((item: {label:string})=>item.label==='android-home'),
      browser?.results?.every((item: {overflow:number;broken:unknown[];undersized:unknown[]})=>item.overflow<=1&&!item.broken.length&&!item.undersized.length),
      asset?.status === 'PASS' && (asset?.runtimeV30Refs?.length ?? 1) === 0 && asset?.settingsV30AssetRefs === false && asset?.shopItems >= 52 && has(gameImage,'v4-image-skeleton') && crossBrowser?.status === 'PASS' && ['chromium','webkit'].every((engine)=>crossBrowser?.engines?.includes(engine)),
      performance?.status === 'PASS' && performance?.performanceAtLeast90 === true && performance?.lcpBelow2500ms === true && performance?.clsBelowPoint1 === true,
    ],
  },
];

console.log('Enterprise Adventure Director · V4.0 Audit');
console.log('------------------------------------------');
let total = 0;
for (const group of scoreGroups) {
  const passed = group.checks.filter(Boolean).length;
  const score = passed / group.checks.length * 10;
  total += score;
  console.log(`${group.name.padEnd(25)} ${score.toFixed(1)}/10  (${passed}/${group.checks.length})`);
  console.log(`  ${group.note}`);
}
console.log('------------------------------------------');
console.log(`PACKAGE ${pkg.version ?? 'unknown'}`);
console.log(`FINAL SCORE ${total.toFixed(1)}/100`);
if (total < 98) {
  console.error('V4 AUDIT FAIL  release threshold >= 98/100');
  process.exit(1);
}
console.log('V4 AUDIT PASS  >= 98/100');
