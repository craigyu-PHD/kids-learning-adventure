import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const text = (path: string) => readFileSync(join(root, path), 'utf8');
const has = (value: string, pattern: RegExp | string) => typeof pattern === 'string' ? value.includes(pattern) : pattern.test(value);

const app = text('src/App.tsx');
const css = text('src/v30.css');
const main = text('src/main.tsx');
const ui = text('src/uiData.ts');
const security = text('src/security.ts');
const api = text('api/state.ts');
const validator = text('scripts/validate_curriculum.ts');
const curriculum = text('src/data/curriculum.ts');
const pkg = JSON.parse(text('package.json')) as { version?: string };

const assetsDir = join(root, 'public/assets/v30');
const assets = existsSync(assetsDir) ? readdirSync(assetsDir).filter((name) => name.endsWith('.webp')) : [];
const assetOk = (name: string) => {
  const path = join(assetsDir, name);
  return existsSync(path) && statSync(path).size > 1500;
};
const browserPath = join(root, '.qa/v30_browser_result.json');
const browser = existsSync(browserPath) ? JSON.parse(readFileSync(browserPath, 'utf8')) as {
  status?: string;
  brand?: Record<string,string>;
  worldIds?: string[];
  worldUiSignatures?: string[];
  caregiverCards?: string[];
  mobileModal?: { position?: string; bottom?: number; width?: number; vw?: number };
  results?: Array<{ label:string; overflow:number; broken:unknown[]; bpmf:number; tiny:unknown[]; undersized:unknown[] }>;
} : null;

const dims: Array<{ name:string; checks:boolean[]; note:string }> = [
  {
    name: '品牌設計系統',
    checks: [
      pkg.version === '3.0.0',
      has(main, "import './v30.css'"),
      ['#4F67E8','#7756D8','#FFC857','#52C99A','#FF7B72','#55BFE9','#F7F8FC','#26324A','#68738A'].every((v)=>has(css,v)),
      ['--radius-sm: 12px','--radius-md: 16px','--radius-lg: 24px','--radius-xl: 32px','--radius-pill: 999px'].every((v)=>has(css,v)),
      ['0 4px 12px rgba(42,55,90,.08)','0 8px 24px rgba(42,55,90,.10)','0 16px 40px rgba(42,55,90,.14)'].every((v)=>has(css,v)),
    ],
    note: '固定品牌色、Radius 與 Shadow token，不再由 Adventure World 改寫整套 UI。',
  },
  {
    name: 'Typography 與可讀性',
    checks: [
      has(css,'family=Fredoka') && has(css,'family=Nunito') && has(css,'family=Noto+Sans+TC'),
      has(css,"font-family: 'Nunito', 'Noto Sans TC'"),
      has(css,"font-family: 'Fredoka'"),
      has(css,'.child-presentation small') && has(css,'font-size: 14px !important'),
      Boolean(browser?.results?.every((r)=>r.tiny.length===0)),
    ],
    note: 'Display / UI / 中文字體分工清楚；Child Mode 實測無低於 14px 的可見 leaf text。',
  },
  {
    name: 'Storybook Hero 與角色',
    checks: [
      assets.length >= 7,
      ['hero-storybook.webp','world-hello.webp','world-color.webp','world-animal.webp','world-food.webp','world-ocean.webp','world-space.webp'].every(assetOk),
      has(app,'今天一起去冒險！') && has(app,'開始今天的冒險'),
      has(app,"v30Asset('hero-storybook.webp')"),
      has(app,'小星'),
    ],
    note: 'Hero 改為明亮 Storybook Adventure，核心角色與 Mascot 持續出現在學習與 Reward 回饋。',
  },
  {
    name: 'Adventure World 一致性',
    checks: [
      ['Hello Town','Color Garden','Animal Forest','Food Market','Ocean Adventure'].every((x)=>has(ui,x)),
      (browser?.worldIds?.length ?? 0) === 5 && new Set(browser?.worldIds ?? []).size === 5,
      (browser?.worldUiSignatures?.length ?? 0) === 5 && new Set(browser?.worldUiSignatures ?? []).size === 1,
      has(css,':root[data-adventure-theme=') || has(css,":root[data-adventure-theme='hero']"),
      has(app,'世界只改變學習環境與插畫情境'),
    ],
    note: 'World 改故事環境與插畫，不改導航、按鈕、卡片、字體或品牌 token。',
  },
  {
    name: 'Child Mode 學習流程',
    checks: [
      ['Listen','Repeat','Play','Complete'].every((x)=>has(app,x)),
      has(app,'VocabularyCard') && has(app,'speechSynthesis'),
      has(app,'v30-stage-nav') && has(app,'v30-vocab-card'),
      has(app,'家長帶課指南') && has(app,'v30-parent-guide'),
      !has(app,'ClickEffects') && !has(app,'cursor-trail-layer') && !has(app,'adventure-cursor'),
    ],
    note: '兒童每節課只沿四階段前進；完整教案保留但收進 Parent Guide。',
  },
  {
    name: 'Parent Mode 與家庭權限',
    checks: [
      has(app,'parent-presentation') && has(app,'家長學習中心'),
      has(css,'.parent-presentation * { animation: none !important; }'),
      Boolean(browser?.caregiverCards?.includes('爸爸') && browser.caregiverCards.includes('媽媽')),
      !Boolean(browser?.caregiverCards?.some((x)=>x==='哥哥'||x==='弟弟')),
      has(security,'const USER_PIN_ITERATIONS = 180_000') && has(security,"name: 'PBKDF2'"),
    ],
    note: 'Report／Cloud／PIN／Settings 集中在 Parent Mode，操作者與學習者仍完全分離。',
  },
  {
    name: 'Motion 與觸控體驗',
    checks: [
      has(css,'@media (prefers-reduced-motion: reduce)'),
      has(css,'animation: v30Reward 560ms'),
      has(css,'transition: transform 140ms ease'),
      Boolean(browser?.mobileModal?.position === 'fixed' && Math.abs(browser.mobileModal.bottom ?? 99) <= 2),
      Boolean(browser?.results?.every((r)=>r.undersized.length===0)),
    ],
    note: '移除無意義 cursor/trail/burst，保留短促的提示／轉場／Reward 動畫與手機 Bottom Sheet。',
  },
  {
    name: '響應式與視覺完整性',
    checks: [
      browser?.status === 'PASS',
      ['desktop-home','tablet-home','mobile-home','desktop-lesson-repeat','desktop-parent-settings'].every((l)=>browser?.results?.some((r)=>r.label===l)),
      Boolean(browser?.results?.every((r)=>r.overflow<=1)),
      Boolean(browser?.results?.every((r)=>r.broken.length===0)),
      Boolean(browser?.results?.every((r)=>r.bpmf===0)),
    ],
    note: '桌機／平板／手機無橫向溢出、破圖或注音，Child/Parent 皆有實際 Browser evidence。',
  },
  {
    name: '課程與獎勵不變條件',
    checks: [
      has(validator,'360 unique YouTube IDs required'),
      has(validator,'All 180 lesson titles must be unique'),
      has(validator,'All 360 mission prompts must be unique'),
      has(validator,'canonicalContentTitle'),
      !has(curriculum,'weeklyVideoAssignments') && !has(curriculum,'warmupKeys'),
    ],
    note: 'V3.0 是 Presentation Layer 重構，90/180/360 與零重複課程 Gate 完整保留。',
  },
  {
    name: '雲端與資料安全回歸',
    checks: [
      has(app,"star-learning-v22:${pin}:${kind}"),
      has(api,"request.headers.get('x-family-pin')"),
      has(api,"createHmac('sha256', pepper)"),
      has(api,"settings.cloudSync = { enabled: true, familyCode: '' }") && !has(api,'console.log(pin'),
      has(app,'calculateRewards') && !has(app,/\btotalXp\s*\+=|\btotalCoins\s*\+=/),
    ],
    note: 'V2.2 namespace、PBKDF2、HMAC、familyCode sanitization 與即時計算 XP／金幣維持原模型。',
  },
];

let score=0;
console.log('Orbit UX Director · V3.0 Premium Storybook Audit');
console.log('------------------------------------------------');
for (const d of dims) {
  const passed=d.checks.filter(Boolean).length;
  const pts=(passed/d.checks.length)*10; score+=pts;
  console.log(`${d.name.padEnd(18)} ${pts.toFixed(1)}/10  (${passed}/${d.checks.length})`);
  console.log(`  ${d.note}`);
  if (passed!==d.checks.length) d.checks.forEach((ok,i)=>{ if(!ok) console.log(`  FAIL check ${i+1}`); });
}
const rounded=Math.round(score*10)/10;
console.log('------------------------------------------------');
console.log(`FINAL SCORE ${rounded.toFixed(1)}/100`);
if (rounded<98) throw new Error(`Orbit UX Director rejected V3.0: ${rounded.toFixed(1)} < 98`);
console.log('ORBIT PASS  >= 98/100');
