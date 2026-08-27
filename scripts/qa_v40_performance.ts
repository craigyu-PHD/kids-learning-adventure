import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const QA = path.join(ROOT, '.qa');
const reportPath = path.join(QA, 'lighthouse-v40.json');

if (!fs.existsSync(reportPath)) {
  console.error('Missing .qa/lighthouse-v40.json. Run the V4 Desktop Lighthouse production-preview audit first.');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as {
  fetchTime?: string;
  categories?: { performance?: { score?: number } };
  audits?: Record<string, { numericValue?: number }>;
};
const performance = Math.round((report.categories?.performance?.score ?? 0) * 100);
const lcpMs = report.audits?.['largest-contentful-paint']?.numericValue ?? Number.POSITIVE_INFINITY;
const cls = report.audits?.['cumulative-layout-shift']?.numericValue ?? Number.POSITIVE_INFINITY;
const tbtMs = report.audits?.['total-blocking-time']?.numericValue ?? Number.POSITIVE_INFINITY;
const fetchedAt = report.fetchTime ? Date.parse(report.fetchTime) : Number.NaN;
const ageMs = Number.isFinite(fetchedAt) ? Date.now() - fetchedAt : Number.POSITIVE_INFINITY;
const fresh = ageMs >= 0 && ageMs <= 6 * 60 * 60 * 1000;

const checks = {
  freshDesktopAudit: fresh,
  performanceAtLeast90: performance >= 90,
  lcpBelow2500ms: lcpMs < 2500,
  clsBelowPoint1: cls < 0.1,
  tbtBelow200ms: tbtMs < 200,
};
const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const result = {
  status: failures.length ? 'FAIL' : 'PASS',
  performance,
  lcpMs: Math.round(lcpMs),
  cls,
  tbtMs: Math.round(tbtMs),
  ...checks,
  failures,
};
fs.mkdirSync(QA, { recursive: true });
fs.writeFileSync(path.join(QA, 'v40_performance_result.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
