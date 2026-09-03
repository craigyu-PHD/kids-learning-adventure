import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHOT_DIR = path.join(ROOT, 'qa', 'production-audit', '2026-09-02', 'v64-4k');
const OUT = path.join(ROOT, 'qa', 'visual-audit', '2026-09-02-v64', 'layout-review.json');
const viewports = ['2560x1440','3440x1440','3840x2160','5120x2160'];
const pages = ['home','today','semester','achievements','shop','report'];
const scoreTemplate = {
  columnBalance: null,
  panelAlignment: null,
  cardConsistency: null,
  imageFrameQuality: null,
  imageTextBalance: null,
  whitespace: null,
  visualFocus: null,
  typographyHierarchy: null,
  imageIntegrity: null,
  overallPolish: null,
};
const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT,'utf8')) : { records: [] };
const oldByKey = new Map((previous.records ?? []).map((r:any)=>[`${r.viewport}:${r.page}`,r]));
const records:any[]=[];
for (const viewport of viewports) for (const page of pages) {
  const key=`${viewport}:${page}`;
  const old:any=oldByKey.get(key) ?? {};
  const screenshot=path.relative(ROOT, path.join(SHOT_DIR, `${viewport}-${page}.jpg`));
  records.push({
    viewport,page,screenshot,
    screenshotExists: fs.existsSync(path.join(ROOT,screenshot)),
    visualModel: old.visualModel ?? null,
    reviewedAt: old.reviewedAt ?? null,
    scores:{...scoreTemplate,...(old.scores??{})},
    notes:old.notes??'',
    status:old.status??'PENDING',
  });
}
const payload={version:'6.4-layout-visual-review-v1',requiredScore:8,requiredOverall:8.5,records};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');
console.log(`Wrote ${path.relative(ROOT,OUT)}: ${records.length} screenshot reviews`);
