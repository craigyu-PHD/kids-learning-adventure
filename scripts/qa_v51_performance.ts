import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const QA = path.join(ROOT, '.qa');
const reportPath = path.join(QA, 'lighthouse-v51.json');

if (!fs.existsSync(reportPath)) {
  console.error('Missing .qa/lighthouse-v51.json. Run the V5.1 Desktop Lighthouse production-preview audit first.');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as {
  fetchTime?: string;
  categories?: { performance?: { score?: number } };
  audits?: Record<string, { numericValue?: number; details?: { items?: Array<{ transferSize?: number }> } }>;
};
const performance = Math.round((report.categories?.performance?.score ?? 0) * 100);
const fcpMs = report.audits?.['first-contentful-paint']?.numericValue ?? Number.POSITIVE_INFINITY;
const lcpMs = report.audits?.['largest-contentful-paint']?.numericValue ?? Number.POSITIVE_INFINITY;
const cls = report.audits?.['cumulative-layout-shift']?.numericValue ?? Number.POSITIVE_INFINITY;
const tbtMs = report.audits?.['total-blocking-time']?.numericValue ?? Number.POSITIVE_INFINITY;
const transferBytes = report.audits?.['resource-summary']?.details?.items?.[0]?.transferSize ?? Number.POSITIVE_INFINITY;
const fetchedAt = report.fetchTime ? Date.parse(report.fetchTime) : Number.NaN;
const ageMs = Number.isFinite(fetchedAt) ? Date.now() - fetchedAt : Number.POSITIVE_INFINITY;
const checks = {
  freshDesktopAudit: ageMs >= 0 && ageMs <= 6 * 60 * 60 * 1000,
  performanceAtLeast90: performance >= 90,
  lcpBelow2500ms: lcpMs < 2500,
  clsBelowPoint1: cls < 0.1,
  tbtBelow200ms: tbtMs < 200,
  transferBelow5MiB: transferBytes < 5 * 1024 * 1024,
};
const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const result = {
  status: failures.length ? 'FAIL' : 'PASS',
  performance,
  fcpMs: Math.round(fcpMs),
  lcpMs: Math.round(lcpMs),
  cls,
  tbtMs: Math.round(tbtMs),
  transferBytes,
  ...checks,
  failures,
};
fs.writeFileSync(path.join(QA, 'v51_performance_result.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
