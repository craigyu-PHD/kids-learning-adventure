import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const text = (file: string) => readFileSync(resolve(root, file), 'utf8');
const packageVersion = JSON.parse(text('package.json')).version as string | undefined;
const files = [
  'package.json',
  'src/App.tsx',
  'src/v4/Dashboard.tsx',
  'src/v4/LessonQuest.tsx',
  'src/v4/SecondaryViews.tsx',
  'src/v4/caregivers.tsx',
  'src/components/AvatarHero.tsx',
  'src/components/AvatarWardrobe.tsx',
  'src/components/TreasureShowcase.tsx',
  'src/cosmetics.ts',
  'src/styles/components/dashboard.css',
  'src/styles/components/header.css',
  'src/styles/responsive.css',
];
const sourceHash = createHash('sha256');
for (const file of files) {
  sourceHash.update(file);
  sourceHash.update(readFileSync(resolve(root, file)));
}
const sourceFingerprint = sourceHash.digest('hex');
const gitSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const reportPath = resolve(root, '.qa/v60_browser_result.json');
const report = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, 'utf8')) as { status?: string; evidence?: { appVersion?: string; gitSha?: string; sourceFingerprint?: string; generatedAt?: string } } : null;
const generatedAt = report?.evidence?.generatedAt ? Date.parse(report.evidence.generatedAt) : Number.NaN;
const ageMs = Number.isFinite(generatedAt) ? Date.now() - generatedAt : Number.POSITIVE_INFINITY;
const checks = {
  browserReportExists: Boolean(report),
  browserPassed: report?.status === 'PASS',
  matchingAppVersion: report?.evidence?.appVersion === packageVersion,
  matchingGitSha: report?.evidence?.gitSha === gitSha,
  matchingSourceFingerprint: report?.evidence?.sourceFingerprint === sourceFingerprint,
  freshWithinSixHours: ageMs >= 0 && ageMs <= 6 * 60 * 60 * 1000,
};
const failures = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
const result = { status: failures.length ? 'FAIL' : 'PASS', appVersion: packageVersion, gitSha, sourceFingerprint, ageMs, checks, failures };
writeFileSync(resolve(root, '.qa/v60_orbit_result.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
