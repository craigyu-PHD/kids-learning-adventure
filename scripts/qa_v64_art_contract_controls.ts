import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { MATRIX, ROOT, validateMatrix, validScore, validNativeUiTrace } from './v64_art_contract';
const base=JSON.parse(fs.readFileSync(path.join(ROOT,MATRIX),'utf8'));
assert.equal(validateMatrix(base,'mapping').status,'PASS');
const cases:[string,(m:any)=>void][]=[
 ['duplicate wearable',(m)=>m.records[1]=structuredClone(m.records[0])],
 ['wrong avatar',(m)=>m.records[0].avatarId='unknown'],
 ['missing world',(m)=>m.worldRecords.pop()],
 ['duplicate world',(m)=>m.worldRecords[1]=structuredClone(m.worldRecords[0])],
 ['runtime hash tamper',(m)=>m.records[0].runtimeAssets[0].sha256='0'.repeat(64)],
 ['split front lost',(m)=>m.records.find((r:any)=>r.runtimeAssets.length===2).runtimeAssets.pop()],
 ['skin avatar mismatch',(m)=>{const r=m.records.find((r:any)=>r.slot==='outfit');r.runtimeAssets=m.records.find((x:any)=>x.slot==='outfit'&&x.avatarId!==r.avatarId).runtimeAssets;}],
 ['source path mismatch',(m)=>m.records[0].sourcePng=m.records[1].sourcePng],
];
for(const [name,mutate] of cases){const m=structuredClone(base);mutate(m);assert.equal(validateMatrix(m,'mapping').status,'FAIL',name);}
assert.equal(validateMatrix(base,'local').status,'FAIL','pending artwork must never pass local');
assert.equal(validateMatrix(base,'post-deploy').status,'FAIL','pending deployment must never pass production');
const forged=structuredClone(base);
for(const r of [...forged.records,...forged.worldRecords]){r.localStatus='PASS';r.productionUrlPass=true;r.visualScores={overallPolish:10};}
assert.equal(validateMatrix(forged,'local').status,'FAIL','PASS flags cannot substitute evidence');
for(const v of [NaN,Infinity,-Infinity,null,'9',-1,7.99,10.01]) assert.equal(validScore(v),false);
assert.equal(validScore(8),true);assert.equal(validScore(8.49,true),false);assert.equal(validScore(8.5,true),true);
// Schema controls only: these metadata fixtures are never written as art evidence.
const nativeGeneration={inputs:[{path:'fixture/master.png',sha256:'a'.repeat(64)}],prompt:{sha256:'b'.repeat(64)},rawOutput:{sha256:'c'.repeat(64)}};
const nativeTrace={tool:'chatgpt_web_native_image_editor',status:'COMPLETED',conversationUrl:'https://chatgpt.com/c/00000000-0000-0000-0000-000000000000',surface:'image-editor',modelVersion:'not provided',
  observedSteps:['input-attached','prompt-submitted','output-visible','raw-exported'].map(action=>({action,detail:'schema fixture only'})),
  inputs:nativeGeneration.inputs,promptSha256:nativeGeneration.prompt.sha256,outputSha256:nativeGeneration.rawOutput.sha256};
assert.equal(validNativeUiTrace(nativeGeneration,nativeTrace),true);
const traceControls:[string,(t:any)=>void][]=[
 ['external generation tool',t=>t.tool='external-api'],
 ['wrong origin',t=>t.conversationUrl='https://example.com/c/00000000-0000-0000-0000-000000000000'],
 ['pending output',t=>t.status='RUNNING'],
 ['missing attachment receipt',t=>t.observedSteps.shift()],
 ['missing export receipt',t=>t.observedSteps.pop()],
 ['wrong prompt',t=>t.promptSha256='d'.repeat(64)],
 ['wrong output',t=>t.outputSha256='d'.repeat(64)],
 ['wrong input',t=>t.inputs[0].sha256='d'.repeat(64)],
 ['duplicate input',t=>t.inputs.push(t.inputs[0])],
 ['unknown surface',t=>t.surface='api'],
];
for(const [name,mutate] of traceControls){const t=structuredClone(nativeTrace);mutate(t);assert.equal(validNativeUiTrace(nativeGeneration,t),false,name);}
assert.equal(Boolean(validNativeUiTrace({},{})),false);
const originalWorld = { ...nativeGeneration, inputs: [] };
const originalTrace = { ...nativeTrace, inputs: [], surface: 'create-image', observedSteps: ['text-only-original','prompt-submitted','output-visible','raw-exported'].map(action=>({action,detail:'schema fixture only'})) };
assert.equal(validNativeUiTrace(originalWorld, originalTrace), true);
assert.equal(validNativeUiTrace(originalWorld, {...originalTrace, surface:'image-editor'}), false);
assert.equal(validNativeUiTrace(originalWorld, {...originalTrace, observedSteps:originalTrace.observedSteps.slice(1)}), false);
assert.equal(validNativeUiTrace(originalWorld, {...originalTrace, outputSha256:'d'.repeat(64)}), false);

console.log(JSON.stringify({status:'PASS',controls:23,nativeUiTraceControls:traceControls.length+6,note:'No synthetic artwork or acceptance evidence promoted'}));
