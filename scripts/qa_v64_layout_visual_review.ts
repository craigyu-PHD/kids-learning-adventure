import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
if(process.argv.includes('--legacy')) {
 const d=JSON.parse(fs.readFileSync(path.join(root,'qa/visual-audit/2026-09-02-v64/layout-review.json'),'utf8'));
 console.log(JSON.stringify({method:'legacy-direct-overall',scope:'historical',records:d.records.length,pass:d.records.filter((r:any)=>r.status==='PASS').length}));
 process.exitCode=d.records.every((r:any)=>r.status==='PASS')?0:1;
} else {
 const result=spawnSync('python3',[path.join(root,'scripts/qa_v64_hybrid_review.py'),...process.argv.slice(2)],{cwd:root,stdio:'inherit'});
 process.exitCode=result.status??1;
}
