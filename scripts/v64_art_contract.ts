import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cosmetics } from '../src/cosmetics';
import { avatarSkinAssetPath, avatarAccessoryLayerSet } from '../src/avatarAssetRegistry';
import { validRetainedWorldSource } from './v64_retained_world_source';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const MATRIX = 'qa/visual-audit/2026-09-02-v64/art-acceptance-v2.json';
export const AVATARS = ['brother', 'younger', 'sister', 'younger-sister'];
export const SCORE_KEYS = ['characterIdentity','anatomy','equipmentAlignment','lightingConsistency','materialQuality','occlusion','visualAppeal','childAppeal','rarityReadability','overallPolish'];
export const wearableItems = cosmetics.filter(i => ['outfit','hairstyle','hat','glasses','headphones','backpack','cape'].includes(i.slot));
export const worldItems = cosmetics.filter(i => ['spaceship','room','robot','card','effect'].includes(i.slot));
export function sha(rel: string): string | null {
  if (typeof rel !== 'string' || path.isAbsolute(rel) || rel.split('/').includes('..')) return null;
  const p = path.join(ROOT, rel);
  return fs.existsSync(p) && fs.statSync(p).isFile() ? crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') : null;
}
export function artifact(rel: string) { return { path: rel, sha256: sha(rel) }; }
export function runtimeAssets(itemId: string, avatarId: string) {
  if (!AVATARS.includes(avatarId)) throw new Error(`Unsupported avatar ${avatarId}`);
  const skin = avatarSkinAssetPath(itemId, avatarId);
  const layers = avatarAccessoryLayerSet(itemId, avatarId);
  const file = (p: string) => `public/${p.replace(/^\//, '')}`;
  if (skin) return [{ role: 'skin', ...artifact(file(skin)) }];
  if (layers?.renderer === 'aligned-overlay' && layers.overlay) return [
    { role: 'overlay', ...artifact(file(layers.overlay)) },
    ...(layers.defaultSkinDetail ? [
      { role: 'default-skin-overlay', ...artifact(file(layers.defaultSkinDetail.overlay)) },
      ...(layers.defaultSkinDetail.hairVisibilityMask ? [{ role: 'default-skin-hair-mask', ...artifact(file(layers.defaultSkinDetail.hairVisibilityMask)) }] : []),
    ] : []),
  ];
  if (layers?.renderer === 'split-overlay' && layers.back && layers.front) return [
    { role: 'back', ...artifact(file(layers.back)) }, { role: 'front', ...artifact(file(layers.front)) },
  ];
  return [];
}
export function validScore(value: unknown, overall = false) {
  return typeof value==='number' && Number.isFinite(value) && value>=(overall?8.5:8) && value<=10;
}
// A browser-operated ChatGPT edit is an allowed built-in route, but a tool label
// alone is not provenance. Bind its observed interaction trace to the exact files.
export function validNativeUiTrace(generation: any, trace: any) {
  return trace?.tool==='chatgpt_web_native_image_editor'
    && trace.status==='COMPLETED'
    && typeof trace.conversationUrl==='string'
    && /^https:\/\/chatgpt\.com\/c\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(trace.conversationUrl)
    && ['create-image','image-editor'].includes(trace.surface)
    && typeof trace.modelVersion==='string' && trace.modelVersion.trim().length>0
    && Array.isArray(trace.observedSteps)
    && [...(generation?.inputs?.length ? ['input-attached'] : ['text-only-original']),'prompt-submitted','output-visible','raw-exported'].every(
      step=>trace.observedSteps.some((s:any)=>s.action===step && typeof s.detail==='string' && s.detail.trim().length>0))
    && generation?.prompt?.sha256===trace.promptSha256
    && typeof trace.promptSha256==='string' && /^[a-f0-9]{64}$/.test(trace.promptSha256)
    && generation?.rawOutput?.sha256===trace.outputSha256
    && typeof trace.outputSha256==='string' && /^[a-f0-9]{64}$/.test(trace.outputSha256)
    && Array.isArray(generation?.inputs)
    && (generation.inputs.length>0 || trace.surface==='create-image')
    && new Set(generation.inputs.map((a:any)=>a.path)).size===generation.inputs.length
    && Array.isArray(trace.inputs) && trace.inputs.length===generation.inputs.length
    && new Set(trace.inputs.map((a:any)=>a.path)).size===trace.inputs.length
    && generation.inputs.every((a:any)=>trace.inputs.some((b:any)=>b.path===a.path && b.sha256===a.sha256));
}
export function expectedRecords() {
  return wearableItems.flatMap(i => AVATARS.map(avatarId => ({itemId:i.id, slot:i.slot, avatarId,
    masterReference:`public/assets/v5/characters/${avatarId}/wardrobe/base-body.png`,
    sourcePng:`public/assets/v6.4/hero-composites-source/${avatarId}/${i.id}.png`,
    delivery:`public/assets/v6.4/hero-composites/${avatarId}/${i.id}.webp`, runtimeAssets:runtimeAssets(i.id,avatarId)})));
}
export function expectedWorldRecords() {
  return worldItems.map(i=>({itemId:i.id,slot:i.slot,
    sourcePng:`public/assets/v6.4/world-source/${i.slot}/${i.id}.png`,
    delivery:`public/assets/v6.4/world/${i.slot}/${i.id}.webp`,runtimeAssets:[]}));
}
// QA schema only. No renderer, state, ledger or production asset is mutated here.
export function validateMatrix(matrix: any, phase: 'mapping'|'local'|'post-deploy' = 'local') {
  const failures: string[] = [];
  const check = (ok: unknown, why: string) => { if (!ok) failures.push(why); };
  const asset = (a: any, context: string) => check(a && typeof a.path === 'string' && /^[a-f0-9]{64}$/.test(a.sha256) && sha(a.path) === a.sha256, `${context}: missing file/hash mismatch`);
  const snapshot = (link: any, context: string) => {
    asset(link, `${context} source snapshot`);
    if(!link?.path || !sha(link.path)) return;
    try {
      const captured=JSON.parse(fs.readFileSync(path.join(ROOT,link.path),'utf8')).files;
      const paths=['index.html','package.json','package-lock.json','vite.config.ts'];
      const walk=(dir:string)=>{for(const entry of fs.readdirSync(path.join(ROOT,dir),{withFileTypes:true})) {
        const rel=`${dir}/${entry.name}`;
        if(entry.isDirectory()) walk(rel); else if(entry.isFile() && entry.name!=='.DS_Store') paths.push(rel);
      }};
      walk('src');walk('public/assets');
      check(captured && Object.keys(captured).length===paths.length && paths.every(rel=>captured[rel]===sha(rel)),`${context}: stale/incomplete source and asset snapshot`);
    } catch { failures.push(`${context}: invalid source snapshot`); }
  };
  const evidence = (link: any, r: any, kind: string) => {
    asset(link, `${r.itemId} ${kind}`);
    if (!link?.path || !sha(link.path)) return null;
    try {
      const e = JSON.parse(fs.readFileSync(path.join(ROOT,link.path),'utf8'));
      check(e.itemId===r.itemId && (e.avatarId??null)===(r.avatarId??null), `${r.itemId} ${kind}: identity mismatch`);
      check(e.sourceSha256===r.sourceSha256 && e.deliverySha256===r.deliverySha256, `${r.itemId} ${kind}: asset pair mismatch`);
      check(typeof e.createdAt==='string' && Number.isFinite(Date.parse(e.createdAt)), `${r.itemId} ${kind}: invalid date`);
      check(e.status==='PASS', `${r.itemId} ${kind}: not PASS`);
      return e;
    } catch { failures.push(`${r.itemId} ${kind}: invalid JSON`); return null; }
  };
  check(wearableItems.length===48 && worldItems.length===15 && AVATARS.length===4,'catalog must remain 48 wearables / 15 world / 4 avatars');
  check(matrix.version==='6.4-art-acceptance-v2','schema version mismatch');
  for (const [field, expected] of [['records',expectedRecords()],['worldRecords',expectedWorldRecords()]] as const) {
    const records = matrix[field];
    check(Array.isArray(records), `${field}: array required`);
    if (!Array.isArray(records)) continue;
    const key = (r:any) => `${r.itemId}:${r.avatarId??''}`;
    const wanted = new Map(expected.map(r=>[key(r),r]));
    check(records.length===expected.length,`${field}: expected ${expected.length}`);
    const seen=new Set<string>();
    for (const r of records) {
      const k=key(r), exp:any=wanted.get(k);
      check(!seen.has(k),`${k}: duplicate`); seen.add(k);
      check(exp,`${k}: unexpected item/avatar`); if (!exp) continue;
      for (const f of ['slot','sourcePng','delivery']) check(r[f]===exp[f],`${k}: wrong ${f}`);
      if ('masterReference' in exp) {
        check(r.masterReference===exp.masterReference,`${k}: wrong master`);
        asset({path:r.masterReference,sha256:r.masterSha256},`${k} master`);
        check(exp.runtimeAssets.length>0,`${k}: unresolved registry runtime`);
      }
      check(JSON.stringify(r.runtimeAssets)===JSON.stringify(exp.runtimeAssets),`${k}: runtime mapping/hash mismatch`);
      for(const a of exp.runtimeAssets) asset(a,`${k} runtime ${a.role}`);
      if(phase==='mapping') continue;
      asset({path:r.sourcePng,sha256:r.sourceSha256},`${k} PNG`);
      asset({path:r.delivery,sha256:r.deliverySha256},`${k} WebP`);
      if(sha(r.sourcePng) && sha(r.delivery)) {
        const decoded=spawnSync('python3',[path.join(ROOT,'scripts/qa_v64_image_pair.py'),path.join(ROOT,r.sourcePng),path.join(ROOT,r.delivery),...(field==='records'?['--wearable']:[])],{encoding:'utf8',timeout:30000});
        check(decoded.status===0,`${k}: decoded PNG/WebP format, dimensions, alpha or visible content failed`);
      }
      const generation=evidence(r.generationEvidence,r,'generation');
      if (generation?.origin === 'retained-baseline') {
        check(field === 'worldRecords', `${k}: retained baseline route is World-only`);
        asset(generation.retentionEvidence, `${k} retention evidence`);
        let trace = null;
        try { if (sha(generation.retentionEvidence?.path)) trace = JSON.parse(fs.readFileSync(path.join(ROOT, generation.retentionEvidence.path), 'utf8')); } catch { /* invalid evidence fails below */ }
        check(validRetainedWorldSource(trace, r.itemId, r.slot, r.sourceSha256), `${k}: exact reviewed baseline PNG continuity required`);
        check(!generation.tool && !generation.rawOutput && !generation.prompt, `${k}: retention must not invent generation metadata`);
      } else {
        check(['image_gen__imagegen','chatgpt_web_native_image_editor'].includes(generation?.tool),`${k}: built-in generation evidence required`);
        if(generation) {
          if(generation.tool==='chatgpt_web_native_image_editor') {
            asset(generation.executionEvidence,`${k} native UI execution trace`);
            let trace=null;
            try { if(sha(generation.executionEvidence?.path)) trace=JSON.parse(fs.readFileSync(path.join(ROOT,generation.executionEvidence.path),'utf8')); } catch { /* invalid trace fails below */ }
            check(validNativeUiTrace(generation,trace),`${k}: native UI trace must bind exact inputs, prompt and raw output`);
          }
          check(Array.isArray(generation.inputs) && (field==='worldRecords' || generation.inputs.length>0),`${k}: wearable identity inputs or explicit World input list required`);
          for(const a of [generation.rawOutput,generation.prompt,...(generation.inputs??[])]) asset(a,`${k} generation input/output`);
          if(field==='records') check(generation.inputs?.some((a:any)=>a.sha256===r.masterSha256),`${k}: exact identity master must be a generation input`);
        }
        check(generation?.rawOutput?.sha256===r.sourceSha256,`${k}: raw generated PNG must match master`);
      }
      const pair=evidence(r.pairingEvidence,r,'pairing');
      check(pair?.formatPass===true && pair?.contentPass===true && pair?.alphaPass===true,`${k}: PNG/WebP decode/content/alpha proof required`);
      const review=evidence(r.visualEvidence,r,'visual');
      check(review?.reviewer?.canViewImages===true && typeof review?.reviewer?.name==='string',`${k}: image-capable review required`);
      if(review) for (const score of SCORE_KEYS) {
        const v=review.scores?.[score];
        check(validScore(v,score==='overallPolish'),`${k}: invalid/below-threshold ${score}`);
        check(typeof review.reasons?.[score]==='string' && review.reasons[score].trim().length>0,`${k}: missing ${score} visual reason`);
      }
      const preview=evidence(r.previewEvidence,r,'preview');
      check(preview?.previewPass===true && preview?.regressionPass===true,`${k}: preview/regression required`);
      check(Array.isArray(preview?.screenshots) && preview.screenshots.length>0,`${k}: screenshot evidence required`);
      if(preview) {snapshot(preview.sourceSnapshot,k);for(const s of preview.screenshots??[]) asset(s,`${k} screenshot`);}
      check(review?.previewEvidenceSha256===r.previewEvidence?.sha256,`${k}: visual review must reference preview`);
      if(field==='records') {
        const combo=evidence(r.combinationEvidence,r,'combination');
        check(combo?.combinationPass===true && JSON.stringify(combo.runtimeAssets)===JSON.stringify(r.runtimeAssets),`${k}: runtime combination proof required`);
        if(combo) snapshot(combo.sourceSnapshot,`${k} combination`);
        const required=['hair+hat','hair+headphones','hat+headphones','glasses','backpack+cape'];
        check(required.every(name=>combo?.cases?.some((c:any)=>c.name===name && c.status==='PASS' && Array.isArray(c.screenshots) && c.screenshots.length>0)),`${k}: missing required wearing combinations`);
        for(const c of combo?.cases??[]) for(const shot of c.screenshots??[]) asset(shot,`${k} combination screenshot`);
      } else check(review?.semanticsVersion==='v64-world-art-semantics-v1',`${k}: world dimension semantics required`);
      check(r.localStatus==='PASS',`${k}: local status ${r.localStatus}`);
      if(phase==='post-deploy') {
        const prod=evidence(r.productionEvidence,r,'production');
        check(r.productionUrlPass===true && prod?.url==='https://kids-learning-adventure-chi.vercel.app/' && typeof prod?.deploymentId==='string' && prod.deploymentId.length>0 && prod?.version==='6.4.0',`${k}: deployment identity required`);
        if(prod) snapshot(prod.sourceSnapshot,`${k} production`);
        for(const f of ['httpPass','apiPass','browserPass','assetHashPass','performancePass']) check(prod?.[f]===true,`${k}: production ${f} required`);
      }
    }
    for(const k of wanted.keys()) check(seen.has(k),`${k}: missing`);
  }
  return {status:failures.length?'FAIL':'PASS',phase,wearableRecords:matrix.records?.length??0,worldRecords:matrix.worldRecords?.length??0,failureCount:failures.length,failures};
}
