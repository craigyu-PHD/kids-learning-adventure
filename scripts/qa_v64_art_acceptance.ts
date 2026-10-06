import fs from 'node:fs';
import path from 'node:path';
import { ROOT, MATRIX, validateMatrix } from './v64_art_contract';
const phase=process.argv.includes('--post-deploy')?'post-deploy':process.argv.includes('--mapping')?'mapping':'local';
try {
 const result=validateMatrix(JSON.parse(fs.readFileSync(path.join(ROOT,MATRIX),'utf8')),phase);
 console.log(JSON.stringify({...result,failures:result.failures.slice(0,40)},null,2));
 process.exitCode=result.status==='PASS'?0:1;
} catch(e) { console.error(JSON.stringify({status:'FAIL',phase,error:String(e)})); process.exitCode=1; }
