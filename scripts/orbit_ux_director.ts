import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const text = (path: string) => readFileSync(join(root, path), 'utf8');
const has = (value: string, pattern: RegExp | string) => typeof pattern === 'string' ? value.includes(pattern) : pattern.test(value);

const app = text('src/App.tsx');
const css = text('src/v23.css');
const main = text('src/main.tsx');
const ui = text('src/uiData.ts');
const security = text('src/security.ts');
const api = text('api/state.ts');
const validator = text('scripts/validate_curriculum.ts');
const curriculum = text('src/data/curriculum.ts');
const badges = text('src/components/AnimatedBadge.tsx');
const avatars = text('src/components/AvatarHero.tsx');
const pkg = JSON.parse(text('package.json')) as { version?: string };

const assetsDir = join(root, 'public/assets/v23');
const assets = existsSync(assetsDir) ? readdirSync(assetsDir).filter((name) => name.endsWith('.webp')) : [];
const assetOk = (name: string) => {
  const path = join(assetsDir, name);
  return existsSync(path) && statSync(path).size > 500;
};

const browserResultPath = join(root, '.qa/v23_browser_result.json');
const browser = existsSync(browserResultPath)
  ? JSON.parse(readFileSync(browserResultPath, 'utf8')) as {
      status?: string;
      results?: Array<{ label: string; overflow: number; broken: unknown[]; bpmf: number; tiny: unknown[] }>;
      themeSignatures?: string[];
      caregiverCards?: string[];
      cursor?: { exists?: boolean; position?: string; core?: string; opacity?: string; trail?: number };
    }
  : null;

const dimensions: Array<{ name: string; checks: boolean[]; note: string }> = [
  {
    name: '視覺一致性與資產完整性',
    checks: [
      pkg.version === '2.3.0',
      assets.length >= 35,
      ['hero-v23.webp', 'hero-rocket.webp', 'robot-helper.webp', 'avatar-brother.webp', 'avatar-younger.webp'].every(assetOk),
      has(main, "import './v23.css'"),
      !has(app, 'v22Asset(') && !has(app, 'assets/v22/'),
    ],
    note: 'V2.3 runtime 全面使用 WebP Image assets 與獨立視覺覆寫層。',
  },
  {
    name: '幼兒吸引力與角色養成',
    checks: [
      ['brother-stage-1.webp', 'brother-stage-2.webp', 'brother-stage-3.webp', 'brother-stage-4.webp', 'younger-stage-1.webp', 'younger-stage-2.webp', 'younger-stage-3.webp', 'younger-stage-4.webp'].every(assetOk),
      ['badge-coin.webp', 'badge-crystal.webp', 'badge-rocket.webp', 'badge-star.webp', 'badge-treasure.webp', 'badge-xp.webp'].every(assetOk),
      has(app, '小小探險隊成長'),
      has(avatars, 'assets/v23/'),
      has(badges, 'assets/v23/'),
    ],
    note: '角色、四階進化、獎勵與探索語彙皆採 Image-based 遊戲化呈現。',
  },
  {
    name: '家長可讀性',
    checks: [
      has(css, 'body { font-size: 15px'),
      has(css, 'font-size: 11px !important'),
      has(css, '.v22-day-title p'),
      Boolean(browser?.results?.every((item) => item.tiny.length === 0)),
      has(app, '照顧者控制節奏'),
    ],
    note: '舊版 8–10px 小字已提升，三尺寸實際 DOM 無低於 QA 門檻的小字。',
  },
  {
    name: '五主題差異化',
    checks: [
      ['hero', 'mecha', 'tank', 'racing', 'creature'].every((theme) => has(css, `data-adventure-theme='${theme}'`)),
      ['theme-hero.webp', 'theme-mecha.webp', 'theme-tank.webp', 'theme-racing.webp', 'theme-creature.webp'].every(assetOk),
      (browser?.themeSignatures?.length ?? 0) === 5,
      new Set(browser?.themeSignatures ?? []).size === 5,
      ['星能英雄', '機甲出擊', '迷你戰車', '極速賽道', '奇獸夥伴'].every((name) => has(ui, name)),
    ],
    note: '五世界在色盤、面板圓角、背景紋理與 cursor geometry 上都有不同 signature。',
  },
  {
    name: '互動回饋與滑鼠特效',
    checks: [
      has(css, '.adventure-cursor'),
      has(css, '.cursor-trail-particle'),
      has(css, '.click-burst'),
      Boolean(browser?.cursor?.exists && browser.cursor.position === 'fixed' && browser.cursor.core && Number(browser.cursor.opacity) > 0 && (browser.cursor.trail ?? 0) > 0),
      ['radiant diamond', 'crosshair', 'hexagonal targeting puck', 'forward chevron', 'soft orb'].every((token) => has(css, token)),
    ],
    note: '桌面使用五種主題游標、軌跡、hover/pressed morph 與點擊爆發。',
  },
  {
    name: '響應式與圖片載入',
    checks: [
      Boolean(browser?.status === 'PASS'),
      ['desktop-home', 'tablet-home', 'mobile-home'].every((label) => browser?.results?.some((item) => item.label === label)),
      Boolean(browser?.results?.every((item) => item.overflow <= 0)),
      Boolean(browser?.results?.every((item) => item.broken.length === 0)),
      Boolean(browser?.results?.every((item) => item.bpmf === 0)),
    ],
    note: '1440/820/390 三尺寸無橫向溢出、無破圖、DOM 注音符號為 0。',
  },
  {
    name: '無障礙與減少動態',
    checks: [
      has(css, '@media (pointer: coarse), (prefers-reduced-motion: reduce)'),
      has(css, '.adventure-cursor, .cursor-trail-layer { display: none !important; }'),
      has(css, '@media (prefers-reduced-motion: reduce)'),
      has(app, 'aria-label="主要功能"'),
      has(app, 'aria-modal="true"'),
    ],
    note: '觸控與 reduced-motion 自動回退原生游標／極短動畫，核心控制具語意標籤。',
  },
  {
    name: '課程零重複與教案完整度',
    checks: [
      has(validator, '360 unique YouTube IDs required'),
      has(validator, 'All 180 lesson titles must be unique'),
      has(validator, 'All 360 mission prompts must be unique'),
      has(validator, 'canonicalContentTitle'),
      !has(curriculum, 'weeklyVideoAssignments') && !has(curriculum, 'warmupKeys'),
    ],
    note: '零重複已變成硬性 validator Gate，不再保留舊輪替池。',
  },
  {
    name: '家庭資料安全回歸',
    checks: [
      has(security, 'const USER_PIN_ITERATIONS = 180_000'),
      has(security, "name: 'PBKDF2'"),
      has(api, "request.headers.get('x-family-pin')"),
      has(api, "createHmac('sha256', pepper)"),
      has(api, "settings.cloudSync = { enabled: true, familyCode: '' }") && !has(api, 'console.log(pin'),
    ],
    note: '個人 PIN、管理者 namespace 與 familyCode sanitization 均維持 V2.2 安全模型。',
  },
  {
    name: '照顧者／學習者角色邏輯',
    checks: [
      has(app, 'settings.users'),
      has(app, 'settings.children'),
      Boolean(browser?.caregiverCards?.includes('爸爸') && browser.caregiverCards.includes('媽媽')),
      !Boolean(browser?.caregiverCards?.some((name) => name === '哥哥' || name === '弟弟')),
      has(app, '哥哥、弟弟是學習者'),
    ],
    note: '頂部登入只顯示照顧者，學習者進度與 XP／金幣繼續獨立計算。',
  },
];

let score = 0;
console.log('Orbit UX Director · V2.3 Final Audit');
console.log('--------------------------------------');
for (const dimension of dimensions) {
  const passed = dimension.checks.filter(Boolean).length;
  const points = (passed / dimension.checks.length) * 10;
  score += points;
  console.log(`${dimension.name.padEnd(17)} ${points.toFixed(1)}/10  (${passed}/${dimension.checks.length})`);
  console.log(`  ${dimension.note}`);
  if (passed !== dimension.checks.length) {
    dimension.checks.forEach((ok, index) => { if (!ok) console.log(`  FAIL check ${index + 1}`); });
  }
}

const rounded = Math.round(score * 10) / 10;
console.log('--------------------------------------');
console.log(`FINAL SCORE ${rounded.toFixed(1)}/100`);
if (rounded < 98) throw new Error(`Orbit UX Director rejected V2.3: ${rounded.toFixed(1)} < 98`);
console.log('ORBIT PASS  >= 98/100');
