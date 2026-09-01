import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const text = (file: string) => readFileSync(resolve(root, file), 'utf8');
const expect = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const main = text('src/main.tsx');
const app = text('src/App.tsx');
const dashboard = text('src/v4/Dashboard.tsx');
const dashboardStyles = text('src/styles/components/dashboard.css');
const headerStyles = text('src/styles/components/header.css');
const parentSettings = text('src/v4/ParentSettings.tsx');
const styles = text('src/styles/index.css');
const compatibility = text('src/styles/legacy-compat.css');
const currentSpec = text('docs/CURRENT-SPEC.md');
const packageJson = JSON.parse(text('package.json')) as { version?: string };
const appVersionMatch = text('src/generated/appVersion.ts').match(/APP_VERSION\s*=\s*['\"]([^'\"]+)['\"]/);

expect(main.includes("import './styles/index.css';"), 'main.tsx must use the single styles/index.css entry point.');
for (const historicalLayer of ['styles.css', 'v2.css', 'v22.css', 'v23.css', 'v30.css', 'v40.css']) {
  expect(!main.includes(historicalLayer), `main.tsx must not directly import ${historicalLayer}.`);
  expect(compatibility.includes(historicalLayer), `legacy-compat.css must explicitly own ${historicalLayer}.`);
}
for (const layer of ['tokens.css', 'reset.css', 'legacy-compat.css', 'layout.css', 'components/header.css', 'components/dashboard.css', 'components/report.css', 'components/review.css', 'components/speaking.css', 'components/parent.css', 'motion.css', 'accessibility.css', 'responsive.css']) {
  expect(styles.includes(layer), `styles/index.css is missing ${layer}.`);
}
expect(!app.includes('V4Dashboard') && app.includes('AdventureDashboard'), 'App must use the semantic AdventureDashboard API.');
expect(!dashboard.includes('function V4Dashboard') && dashboard.includes('function AdventureDashboard'), 'Dashboard must export AdventureDashboard.');
expect(!text('src/v40.css').includes('.v5-lesson-card') && dashboardStyles.includes('.v5-lesson-card-body'), 'Lesson Card CSS must be owned by the dashboard component stylesheet.');
for (const selector of ['.v5-hero-bg', '.v5-hero-layers', '.v5-header-controls', '.v53-brand-logo', '.v53-parent-status']) {
  expect(!text('src/v40.css').includes(selector), `Header selector ${selector} must not remain in v40.css.`);
  expect(headerStyles.includes(selector), `Header selector ${selector} must be owned by header.css.`);
}
expect(!parentSettings.includes('V4.0'), 'User-visible parent settings must use the current product version.');
expect(Boolean(appVersionMatch?.[1]), 'APP_VERSION must exist in the single version source.');
expect(packageJson.version === appVersionMatch?.[1], 'package version must match APP_VERSION.');
expect(dashboard.includes("label: '首頁'") && dashboard.includes("label: '今日課程'"), 'V6 navigation must expose the separate Home and Today Course entries.');
expect(text('src/v4/LessonQuest.tsx').includes('{ title: "家長備課", short: "Prepare"') && text('src/v4/LessonQuest.tsx').includes('家長備課與孩子正式課程十關'), 'V6 must place caregiver preparation at the front of the ten-stage quest.');
for (const rule of ['孩子未來日', '家長 PIN', '今天是唯一', 'append-only', 'assets/v5']) {
  expect(currentSpec.includes(rule), `CURRENT-SPEC.md is missing current rule: ${rule}`);
}

console.log('Architecture QA: PASS');
