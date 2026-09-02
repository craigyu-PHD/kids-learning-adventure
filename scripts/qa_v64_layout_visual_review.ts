import fs from 'node:fs';
import path from 'node:path';
const ROOT=path.resolve(import.meta.dirname,'..');
const FILE=path.join(ROOT,'qa','visual-audit','2026-09-02-v64','layout-review.json');
const MIN=8, OVERALL=8.5;
if(!fs.existsSync(FILE)){console.error('FAIL qa_v64_layout_visual_review: review matrix missing');process.exit(1);}
const data=JSON.parse(fs.readFileSync(FILE,'utf8'));
const keys=['columnBalance','panelAlignment','cardConsistency','imageFrameQuality','imageTextBalance','whitespace','visualFocus','typographyHierarchy','imageIntegrity','overallPolish'];
const failures:string[]=[];
if(data.records?.length!==24) failures.push(`expected 24 screenshot records, got ${data.records?.length??0}`);
for(const r of data.records??[]){
 const key=`${r.viewport}:${r.page}`;
 if(!r.screenshotExists || !fs.existsSync(path.join(ROOT,r.screenshot))) failures.push(`${key} screenshot missing`);
 if(!r.visualModel) failures.push(`${key} visual model review missing`);
 for(const k of keys){const v=r.scores?.[k];const req=k==='overallPolish'?OVERALL:MIN;if(typeof v!=='number'||v<req) failures.push(`${key} ${k}=${String(v)} < ${req}`);}
 if(r.status!=='PASS') failures.push(`${key} status=${r.status}`);
}
if(failures.length){console.error(JSON.stringify({status:'FAIL',records:data.records?.length??0,failureCount:failures.length,firstFailures:failures.slice(0,40)},null,2));process.exit(1);}
console.log(JSON.stringify({status:'PASS',records:data.records.length,minimum:MIN,overallMinimum:OVERALL},null,2));
