import fs from 'node:fs';
import path from 'node:path';
import { ROOT, MATRIX, sha, expectedRecords, expectedWorldRecords } from './v64_art_contract';
const out=path.join(ROOT,MATRIX);
// Never overwrite accepted evidence or even an existing candidate matrix.
if(fs.existsSync(out)) { console.error(`Refusing to overwrite ${MATRIX}; reconcile explicitly with evidence.`); process.exit(1); }
const pending=(r:any)=>({...r,masterSha256:r.masterReference?sha(r.masterReference):null,
  sourceSha256:sha(r.sourcePng),deliverySha256:sha(r.delivery),
  generationEvidence:null,pairingEvidence:null,visualEvidence:null,previewEvidence:null,combinationEvidence:null,
  localStatus:'PENDING',productionUrlPass:'PENDING',productionEvidence:null});
fs.writeFileSync(out,JSON.stringify({version:'6.4-art-acceptance-v2',generatedAt:new Date().toISOString(),
  legacyEvidence:'qa/visual-audit/2026-09-02-v64/art-acceptance.json',
  records:expectedRecords().map(pending),worldRecords:expectedWorldRecords().map(pending)},null,2)+'\n',{flag:'wx'});
console.log(`Wrote ${MATRIX}: 192 wearables / 15 world; all acceptance PENDING`);
