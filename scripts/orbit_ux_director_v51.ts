import fs from 'node:fs';
import path from 'node:path';
import { curriculum } from '../src/data/curriculum';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const json = (file: string) => JSON.parse(read(file));
const exists = (file: string) => fs.existsSync(path.join(ROOT, file));
const source = ['src', 'index.html'].flatMap((entry) => {
  const full = path.join(ROOT, entry);
  if (fs.statSync(full).isFile()) return [read(entry)];
  return fs.readdirSync(full, { recursive: true, withFileTypes: true })
    .filter((item) => item.isFile() && /\.(ts|tsx|css)$/.test(item.name))
    .map((item) => fs.readFileSync(path.join(item.parentPath, item.name), 'utf8'));
}).join('\n');
const dashboard = read('src/v4/Dashboard.tsx');
const animated = read('src/v5/AnimatedMedia.tsx');
const artQa = exists('scripts/qa_v51_art_assets.py');
const browser = json('.qa/v51_browser_result.json');
const performance = json('.qa/v51_performance_result.json');
const auth = json('.qa/v40_family_auth_result.json');
const migration = json('.qa/v40_family_migration_result.json');
const state = json('.qa/v40_state_guard_result.json');
const date = json('.qa/v40_date_engine_result.json');
const blocks = curriculum.flatMap((day) => day.blocks);
const missions = blocks.flatMap((block) => block.missions);

const groups = [
  {
    name: '01 Art Authenticity',
    checks: [
      artQa,
      ['home','book','calendar','star','chart','chest'].every((name) => exists(`public/assets/v5/nav-icons/${name}-3d.webp`)),
      ['space-hero','mecha-warrior','racing-adventure','fantasy-spirit','ocean-world'].every((name) => exists(`public/assets/v5/themes/${name}-v2.webp`)),
      ['brother','younger','robot'].every((role) => exists(`public/assets/v5/characters/${role}/master-sheet.png`)),
      ['brother','younger'].every((role) => [1,2,3,4].every((stage) => exists(`public/assets/v5/characters/${role}/stage-${stage}.webp`))),
    ],
  },
  {
    name: '02 Cinematic Header',
    checks: [
      dashboard.includes('v5-hero-bg') && dashboard.includes('fetchPriority="high"'),
      dashboard.includes('little-explorers-logo-v2.webp') && dashboard.includes('v53-parent-status') && dashboard.includes('weekly-rocket-robot.webm'),
      dashboard.includes('brother-idle.webm') && dashboard.includes('younger-idle.webm') && dashboard.includes('robot-idle.webm'),
      dashboard.includes('rocket-flyby.webm'),
      !dashboard.includes('v4-floating-rocket') && !dashboard.includes('v4-planet') && !dashboard.includes('assets/v40'),
      dashboard.includes('v5-header-theme') && dashboard.includes('-thumb.webp'),
    ],
  },
  {
    name: '03 Real Media & Motion',
    checks: [
      ['brother-idle','younger-idle','robot-idle','rocket-flyby'].every((name) => exists(`public/assets/v5/animations/${name}.webm`)),
      exists('public/assets/v5/animations/weekly-rocket-robot.webm'),
      exists('public/assets/v5/rewards/treasure-open.webm'),
      animated.includes('IntersectionObserver') && animated.includes('prefers-reduced-motion'),
      animated.includes('autoPlay') && animated.includes('muted') && animated.includes('playsInline'),
      browser.reducedMotion?.matches === true && browser.reducedMotion?.paused === true,
    ],
  },
  {
    name: '04 Evolution & Lesson DOM',
    checks: [
      dashboard.includes('v5-evolution-stages') && dashboard.includes('stage-${stageIndex+1}-thumb.webp'),
      browser.checks.every((entry: { snapshot: { evolution: number[] } }) => entry.snapshot.evolution.join(',') === '4,4'),
      dashboard.includes('v5-lesson-card-header') && dashboard.includes('v5-lesson-card-body'),
      browser.checks.every((entry: { snapshot: { lessonLayouts: Array<{ separated?: boolean }> } }) => entry.snapshot.lessonLayouts.every((item) => item.separated)),
      !dashboard.includes('v4-ai-actions'),
    ],
  },
  {
    name: '05 Responsive & Accessibility',
    checks: [
      browser.status === 'PASS',
      browser.checks.length >= 13,
      browser.checks.every((entry: { snapshot: { overflow: number; brokenImages: unknown[]; bopomofoCount: number } }) => entry.snapshot.overflow <= 1 && entry.snapshot.brokenImages.length === 0 && entry.snapshot.bopomofoCount === 0),
      browser.checks.every((entry: { snapshot: { v40RuntimeMedia: unknown[] } }) => entry.snapshot.v40RuntimeMedia.length === 0),
      browser.checks.find((entry: { viewport: string }) => entry.viewport === '390x844')?.snapshot.dashboardColumnWidths.every((width: number) => width >= 360),
    ],
  },
  {
    name: '06 Performance',
    checks: [
      performance.status === 'PASS',
      performance.performanceAtLeast90 === true,
      performance.lcpBelow2500ms === true && performance.clsBelowPoint1 === true,
      performance.tbtBelow200ms === true,
      performance.transferBelow5MiB === true,
    ],
  },
  {
    name: '07 Curriculum Preservation',
    checks: [
      curriculum.length === 90,
      blocks.length === 180,
      missions.length === 360,
      new Set(blocks.flatMap((block) => [block.warmup.videoId, block.video.videoId])).size === 360,
      blocks.every((block) => block.steps.length >= 4 && block.vocabulary.length > 0),
    ],
  },
  {
    name: '08 Data & Family Safety',
    checks: [
      state.status === 'PASS',
      auth.status === 'PASS' && auth.stateUsesBearerOnly === true,
      auth.noActivePinWrite === true && auth.endpointRateLimitsPinAttempts === true,
      migration.status === 'PASS' && migration.activePinRemoved === true,
      date.status === 'PASS' && date.newDayUnlocks === true,
    ],
  },
  {
    name: '09 Runtime Asset Safety',
    checks: [
      !source.includes('assets/v40'),
      ['home','book','calendar','star','chart','chest'].every((name) => exists(`public/assets/v5/nav-icons/${name}-3d-96.webp`)),
      ['brother','younger'].every((role) => [1,2,3,4].every((stage) => exists(`public/assets/v5/characters/${role}/stage-${stage}-thumb.webp`))),
      ['space-hero','mecha-warrior','racing-adventure','fantasy-spirit','ocean-world'].every((name) => exists(`public/assets/v5/themes/${name}-v2-thumb.webp`)),
      dashboard.includes('assets/v5/nav-icons/') && dashboard.includes('assets/v5/characters/'),
    ],
  },
  {
    name: '10 Parent Preview & Reward Boundary',
    checks: [
      browser.contentPreview?.semesterDaysWithActions === 90,
      browser.contentPreview?.futureTeaser === true,
      browser.contentPreview?.pastResultOnly === true,
      browser.contentPreview?.parentFullPreview === true,
      browser.contentPreview?.noProgressWrites === true,
      browser.parentDialog?.open === true && browser.parentDialog?.hasCancel === true,
      !read('src/App.tsx').includes('v4-stage:'),
      read('src/App.tsx').includes("access !== 'today' && !adminUnlocked") && read('src/v4/SecondaryViews.tsx').includes('ChildTeaserPanel'),
    ],
  },
  {
    name: '11 Evidence Integrity',
    checks: [
      exists('docs/v51-art-replacement-report.md'),
      exists('docs/v51-imagegen-prompts.md'),
      exists('.qa/lighthouse-v51.json'),
      exists('.qa/v51_browser_result.json') && exists('.qa/v51_performance_result.json'),
      exists('qa/screenshots/v51/v51-1536x1024.png') && exists('qa/screenshots/v51/v51-390x844.png'),
    ],
  },
];

console.log('Orbit UX Director · V5.1 Art Replacement Audit');
console.log('------------------------------------------------');
let total = 0;
for (const group of groups) {
  const passed = group.checks.filter(Boolean).length;
  const score = passed / group.checks.length * 10;
  total += score;
  console.log(`${group.name.padEnd(28)} ${score.toFixed(1)}/10 (${passed}/${group.checks.length})`);
}
const finalScore = total / (groups.length * 10) * 100;
console.log('------------------------------------------------');
console.log(`FINAL SCORE ${finalScore.toFixed(1)}/100`);
const result = { status: finalScore >= 98 ? 'PASS' : 'FAIL', score: finalScore, groups: groups.map((group) => ({ name: group.name, passed: group.checks.filter(Boolean).length, total: group.checks.length })) };
fs.writeFileSync(path.join(ROOT, '.qa/v51_orbit_result.json'), JSON.stringify(result, null, 2));
if (finalScore < 98) {
  console.error('V5.1 ORBIT FAIL release threshold >= 98/100');
  process.exit(1);
}
console.log('V5.1 ORBIT PASS >= 98/100');
