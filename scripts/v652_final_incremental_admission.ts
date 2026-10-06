import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { readAdmissionFile, type ReadAdmissionFile } from './v652_current_detail_admission';

type Link = { path: string; sha256: string };
type Detail = { overlay: string; canvasTopPadding?: number; hairVisibilityMask?: string; underHeadwearVisibilityMask?: string };
type Entry = { id: string; renderer?: string; catalogPath?: string; frontVariants?: Record<string,string>; backVariants?: Record<string,string>; defaultSkinDetails?: Record<string,Detail>; skinDetails?: Record<string,Record<string,Detail>> };
type Manifest = { accessories: Entry[]; skins: { skinId:string; avatarId:string; path:string }[]; baseDisplayVariants: { avatarId:string; path:string; smallDisplay?:{path:string} }[] };
type Identity = { item:string; avatar:string; skin:string };
type MaskPair = Identity & { kind:string; field:'hairVisibilityMask'|'underHeadwearVisibilityMask'; before:string|null; after:string; sha256:string };
type Asset = Link & { source:string; sourceSHA256:string; rgbaIdentical?:boolean; bytesIdentical?:boolean };
type Integration<P> = { manifestBeforeSHA256:string; manifestAfterSHA256:string; pairCount:number; pairs:P[]; assets:Asset[]; inputs:Link[]; sourcePins?:Record<string,string> };
type Image = { src:string; width:number; height:number; mask:string; visible:string };
type Actor = { className:string; detail:string|null; padding:string|null; skin:string; rendered:string; images:Image[] };
type Frame = { itemId:string; skin:string; theme:string; catalog:string; screenshot:string; proof:Actor[] };
type Batch = { before:Link; after:Link; integration:Link; review:Link; captures:Link[] };
type Lock = { status:string; files:Link[]; capes:Batch; masks:Batch; manifestSHA256:string; releaseAcceptance:false; mixedEquipmentAcceptance:false };
type CandidateMask = Identity & { field:string; mask:string; sha256:string; expectedDetailOverlay:string; overlaySHA256:string; source:string; sourceSHA256:string; canvasTopPadding:number; maskCanvasTopPadding:number; oldField:string|null; proposedPublic:string; status:string; protectedFaceNeckGarmentPixelsUnchanged?:number; bodyRowsBelowUnchanged?:number };
const AVATARS = ['brother','younger','sister','younger-sister'];
const SKINS = ['base','outfit-cadet','outfit-racer','outfit-mecha','outfit-ocean','outfit-mage','outfit-legend','sister-bloom-outfit'];
const CAPES = ['hero-cape','cape-sky','cape-nebula','cape-ocean','cape-legend','sister-galaxy-cape'];
const HATS = ['starter-sun-cap','sunny-explorer-hat','hat-rocket','hat-ocean','hat-mage','sister-lavender-hat'];
const QA = 'qa/v652/astra/20260927-final-incremental-admission/';
export const V652_FINAL_INCREMENTAL_LOCK: Link = { path: QA+'lock.json', sha256: 'ca67b6a7404f32fc394953f5e722b0e3d47918a241bb2f753820a429550eebd9' };
const id = (p:Identity) => [p.item,p.avatar,p.skin].join(':');
const maskId = (p:Identity & {field:string}) => id(p)+':'+p.field;
const combinations = (items:string[]) => items.flatMap(item=>AVATARS.flatMap(avatar=>SKINS.map(skin=>({item,avatar,skin}))));
const publicPath = (url:string) => 'public'+new URL(url,'http://127.0.0.1:5178').pathname;
function entry(m:Manifest,item:string) { const rows=m.accessories.filter(e=>e.id===item); assert.equal(rows.length,1); return rows[0]; }
function detail(m:Manifest,p:Identity) { const e=entry(m,p.item); const d=p.skin==='base'?e.defaultSkinDetails?.[p.avatar]:e.skinDetails?.[p.avatar]?.[p.skin]; assert(d,`missing detail ${id(p)}`); return d; }
function dimensions(b:Buffer):number[] {
 if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return [b.readUInt32BE(16),b.readUInt32BE(20)];
 assert.equal(b.toString('ascii',0,4),'RIFF'); assert.equal(b.toString('ascii',8,12),'WEBP');
 const kind=b.toString('ascii',12,16); if(kind==='VP8X') return [b.readUIntLE(24,3)+1,b.readUIntLE(27,3)+1];
 if(kind==='VP8L'){const v=b.readUInt32LE(21);return [(v&0x3fff)+1,((v>>>14)&0x3fff)+1];}
 assert.equal(kind,'VP8 ');return [b.readUInt16LE(26)&0x3fff,b.readUInt16LE(28)&0x3fff];
}

/** A new immutable delta projects only its approved leaves into the unchanged 400→92 chain.
 * This checks scoped evidence and bindings; it cannot grant release or full-shop acceptance. */
export function assertV652FinalIncrementalAdmission<T extends {accessories:unknown[]}>(manifest:T,options:{readFile?:ReadAdmissionFile}={}) {
 const read=options.readFile??((path:string)=>['src/components/AvatarRenderer.tsx','src/avatarAssetRegistry.ts'].includes(path)?fs.readFileSync(path):readAdmissionFile(path)), cache=new Map<string,Buffer>();
 const exact=(l:Link)=>{assert(l&&/^[0-9a-f]{64}$/.test(l.sha256),'invalid final admission hash');assert(/^(qa\/v652\/|public\/assets\/|src\/)/.test(l.path)&&!l.path.split('/').includes('..'),'unscoped final evidence');if(!cache.has(l.path))cache.set(l.path,read(l.path));const b=cache.get(l.path)!;assert.equal(crypto.createHash('sha256').update(b).digest('hex'),l.sha256,`final admission hash drift: ${l.path}`);return b;};
 const parse=<U,>(l:Link):U=>JSON.parse(exact(l).toString()) as U;
 const lock=parse<Lock>(V652_FINAL_INCREMENTAL_LOCK);
 assert.equal(lock.status,'FROZEN_ROOT_APPROVED_CAPES_AND_HEADWEAR_MASKS');assert.equal(lock.releaseAcceptance,false);assert.equal(lock.mixedEquipmentAcceptance,false);
 assert.equal(new Set(lock.files.map(l=>l.path)).size,lock.files.length);
 const links=new Map(lock.files.map(l=>[l.path,l])); const pinned=(p:string)=>{const l=links.get(p);assert(l,`unfixed final evidence: ${p}`);return exact(l);};
 for(const l of lock.files)exact(l);
 const cb=parse<Manifest>(lock.capes.before),ca=parse<Manifest>(lock.capes.after),mb=parse<Manifest>(lock.masks.before),ma=parse<Manifest>(lock.masks.after);
 assert.equal(lock.capes.before.sha256,'86e88491d3ce66e9f6ec62a0a877fa25086191fe71bbf349d697358acc0e02d5');
 assert.equal(lock.capes.after.sha256,lock.masks.before.sha256);assert.deepEqual(ca,mb);
 assert.equal(lock.masks.after.sha256,lock.manifestSHA256);assert.deepEqual(manifest,ma,'unapproved live field drift');
 function integration<P>(batch:Batch):Integration<P>{const i=parse<Integration<P>>(batch.integration);assert.equal(i.manifestBeforeSHA256,batch.before.sha256);assert.equal(i.manifestAfterSHA256,batch.after.sha256);assert.equal(i.pairCount,i.pairs.length);assert.equal(new Set(i.assets.map(a=>a.path)).size,i.assets.length);for(const a of i.assets){exact(a);exact({path:a.source,sha256:a.sourceSHA256});assert(a.rgbaIdentical===true||(a.bytesIdentical===true&&a.sha256===a.sourceSHA256),'source/output lineage mismatch');}for(const l of i.inputs)exact(l);return i;}
 function frames(batch:Batch){return batch.captures.flatMap(l=>{const c=parse<{manifestSHA256:string;errors:unknown[];rows:Frame[]}>(l);assert.equal(c.manifestSHA256,batch.after.sha256,'stale runtime manifest');assert.deepEqual(c.errors,[]);return c.rows;});}
 function actor(frame:Frame,p:Identity){pinned(frame.screenshot);const rows=frame.proof.filter(a=>a.className.split(' ').includes(`avatar-${p.avatar}`));assert.equal(rows.length,1,'wrong runtime avatar');const a=rows[0];assert.equal(a.skin,p.skin==='base'?'default':p.skin);for(const im of a.images){assert.equal(im.visible,'visible');assert.deepEqual([im.width,im.height],dimensions(pinned(publicPath(im.src))));}return a;}
 function body(m:Manifest,p:Identity,a:Actor){const b=m.skins.find(s=>s.avatarId===p.avatar&&s.skinId===(p.skin==='base'?'default':p.skin));assert(b);const disp=m.baseDisplayVariants.find(d=>d.avatarId===p.avatar);const paths=p.skin==='base'?[b.path,disp?.path,disp?.smallDisplay?.path]:[b.path];const actual=a.images.filter(im=>paths.includes(publicPath(im.src)));assert.equal(actual.length,1,'wrong actual body');return actual[0];}
 const cape=integration<Identity & {kind:string;layers:{back:string;front:string}}>(lock.capes);
 assert.equal(cape.pairs.length,192);assert.equal(cape.assets.length,54);
 assert.deepEqual(new Set(cape.pairs.map(id)),new Set(combinations(CAPES).map(id)),'wrong cape inventory');
 const capeReplay=structuredClone(cb);
 for(const item of CAPES){const to=entry(capeReplay,item),from=entry(ca,item);assert.equal(from.renderer,'split-overlay');for(const f of ['catalogPath','frontVariants','backVariants'] as const)Object.assign(to,{[f]:structuredClone(from[f])});}
 assert.deepEqual(capeReplay,ca,'unapproved cape field drift');
 const cr=parse<{status:string;manifestSHA256:string;integrationSHA256:string;captures:Link[];rows:(Identity&{theme:string;binding:string;expected:string[]})[]}>(lock.capes.review);
 assert.equal(cr.status,'SCOPED_LOCAL_SINGLE_ITEM_PASS');assert.equal(cr.manifestSHA256,lock.capes.after.sha256);assert.equal(cr.integrationSHA256,lock.capes.integration.sha256);assert.deepEqual(cr.captures,lock.capes.captures);assert.equal(cr.rows.length,240);
 const cf=frames(lock.capes);let capeBindings=0;
 for(const p of cape.pairs){assert.equal(p.kind,'split');const e=entry(ca,p.item);assert.deepEqual(p.layers,{back:e.backVariants?.[p.avatar],front:e.frontVariants?.[p.avatar]});for(const path of Object.values(p.layers)){assert(path.startsWith(`public/assets/v6.5.2/runtime/${p.avatar}/`));assert.deepEqual(dimensions(pinned(path)),[1024,1536]);}
  const matches=cf.filter(f=>f.itemId===p.item&&f.skin===p.skin);assert.deepEqual(matches.map(f=>f.theme).sort(),['light',...(['base','outfit-racer'].includes(p.skin)?['dark']:[])].sort());
  for(const f of matches){const a=actor(f,p);assert.deepEqual(a.rendered.split(/[,\s]+/).filter(Boolean).sort(),[p.item,...(p.skin==='base'?[]:[p.skin])].sort());assert.equal(publicPath(f.catalog),e.catalogPath);const b=body(ca,p,a);assert.deepEqual(a.images.map(im=>publicPath(im.src)).sort(),[publicPath(b.src),p.layers.back,p.layers.front].sort(),'missing or extra cape layer');const r=cr.rows.filter(r=>id(r)===id(p)&&r.theme===f.theme);assert.equal(r.length,1);assert.equal(r[0].binding,'PASS');assert.deepEqual(r[0].expected,[p.layers.back,p.layers.front]);capeBindings++;}
 }
 const masks=integration<MaskPair>(lock.masks);assert.equal(masks.pairs.length,260);assert.equal(masks.assets.length,260);
 const expected=[...combinations(HATS).map(p=>({...p,field:'underHeadwearVisibilityMask'})),...combinations(['hat-mage','sister-lavender-hat']).map(p=>({...p,field:'hairVisibilityMask'})),...['base','outfit-cadet','outfit-racer','outfit-mage'].map(skin=>({item:'hair-cloud',avatar:'younger-sister',skin,field:'hairVisibilityMask'}))];
 assert.deepEqual(new Set(masks.pairs.map(maskId)),new Set(expected.map(maskId)),'wrong mask inventory');
 const candidate=parse<{status:string;releaseAcceptance:boolean;currentProductManifestSHA256:string;pairs:CandidateMask[];hatBodyMaskRepairs:CandidateMask[];cloudBodyMaskRepairs:CandidateMask[]}>(masks.inputs[0]);
 assert.equal(candidate.status,'PASS_SCOPED_VISUAL_READY_FOR_ROOT_INTEGRATION');assert.equal(candidate.releaseAcceptance,false);assert.equal(candidate.currentProductManifestSHA256,lock.masks.before.sha256);
 const proposals=[...candidate.pairs,...candidate.hatBodyMaskRepairs,...candidate.cloudBodyMaskRepairs];assert.equal(proposals.length,260);assert.deepEqual(new Set(proposals.map(maskId)),new Set(expected.map(maskId)));
 const technical=parse<{status:string;counts:Record<string,number>;original72MasksByteIdentical:boolean;bodyRepairScreenshotRegression:{image:string;hairOnlyAndFaceNeckGarmentOutsideHeadTopUnchanged:boolean}[];hatOnlyStateIndependenceChecks:number;behavior:{status:string;cases:{case:string;status:string}[]}}>(masks.inputs[1]);
 assert.equal(technical.status,'PASS');assert.deepEqual(technical.counts,{underHeadwear:192,hatBody:64,cloudBody:4});assert.equal(technical.original72MasksByteIdentical,true);assert.equal(technical.hatOnlyStateIndependenceChecks,448);assert.equal(technical.bodyRepairScreenshotRegression.length,96);
 for(const r of technical.bodyRepairScreenshotRegression){assert.equal(r.hairOnlyAndFaceNeckGarmentOutsideHeadTopUnchanged,true,'face protection regression');pinned(r.image);}
 assert.equal(technical.behavior.status,'PASS');assert.deepEqual(technical.behavior.cases.map(c=>c.case).sort(),['ready','missing','wrong-dimensions','late-after-remove','no-mask-field','stale-after-failure','same-path-failure'].sort());for(const c of technical.behavior.cases)assert.equal(c.status,'PASS');
 for(const [path,sha256] of Object.entries(masks.sourcePins??{}))exact({path,sha256});assert.equal(Object.keys(masks.sourcePins??{}).length,2);
 const maskReplay=structuredClone(mb);
 for(const p of masks.pairs){const before=detail(mb,p),after=detail(ma,p);assert.equal(before[p.field]??null,p.before);assert.equal(after[p.field],p.after);assert(p.after.startsWith(`public/assets/v6.5.2/runtime-masks/${p.avatar}/`),'retargeted mask avatar');const ps=proposals.filter(r=>maskId(r)===maskId(p));assert.equal(ps.length,1);const q=ps[0];assert.equal(q.status,'PASS_SCOPED_VISUAL');assert.equal(q.oldField,p.before);assert.equal(q.proposedPublic,p.after);assert.equal(q.sha256,p.sha256);assert.equal(q.expectedDetailOverlay,before.overlay,'overlay retarget');assert.equal(q.canvasTopPadding,before.canvasTopPadding??0);exact({path:q.expectedDetailOverlay,sha256:q.overlaySHA256});exact({path:q.source,sha256:q.sourceSHA256});exact({path:q.mask,sha256:q.sha256});exact({path:p.after,sha256:p.sha256});const asset=masks.assets.filter(a=>a.path===p.after);assert.equal(asset.length,1);assert.equal(asset[0].source,q.mask);assert.equal(asset[0].sha256,p.sha256);assert.equal(asset[0].bytesIdentical,true);
  const pad=p.field==='underHeadwearVisibilityMask'?(before.canvasTopPadding??0):0;assert.equal(q.maskCanvasTopPadding,pad);assert.deepEqual(dimensions(pinned(p.after)),[1024,1536+pad]);assert.deepEqual(dimensions(pinned(before.overlay)),[1024,1536+(before.canvasTopPadding??0)]);
  if(p.kind==='cloudBodyMaskRepairs')assert((q.protectedFaceNeckGarmentPixelsUnchanged??0)>1000000,'missing protected face/neck/garment evidence');else if(p.kind==='hatBodyMaskRepairs')assert((q.bodyRowsBelowUnchanged??0)>0,'missing body protection boundary');else assert.equal(p.kind,'pairs');
  detail(maskReplay,p)[p.field]=p.after;
 }
 assert.deepEqual(maskReplay,ma,'unapproved mask field drift');
 // Fresh public-path mask captures and their reviewed rows are checked below.
 const maskBindings=validateMaskRuntime(lock.masks,masks.pairs,ma,parse,pinned);
 const historicalManifest=structuredClone(manifest) as T & Manifest;
 for(const p of masks.pairs){const d=detail(historicalManifest,p);if(p.before===null)delete d[p.field];else d[p.field]=p.before;}
 assert.deepEqual(historicalManifest,mb,'mask projection failed');
 for(const item of CAPES){const to=entry(historicalManifest,item),from=entry(cb,item);for(const f of ['catalogPath','frontVariants','backVariants'] as const){if(Object.hasOwn(from,f))Object.assign(to,{[f]:structuredClone(from[f])});else delete to[f];}}
 assert.deepEqual(historicalManifest,cb,'cape projection failed');
 return {historicalManifest,capePairCount:192,maskFieldCount:260,capeBindingCount:capeBindings,maskBindingCount:maskBindings,checkedFileCount:cache.size,manifestSHA256:lock.manifestSHA256,releaseAcceptance:false as const,mixedEquipmentAcceptance:false as const};
}

type Combo = { hat:string; hair:string; skin:string; theme:string; phones?:string };
type MaskBinding = Identity & { field:string; theme:string; combo:Combo; path:string; status:string };
const comboKey=(c:Combo)=>[c.hat,c.hair,c.skin,c.theme,c.phones??''].join(':');
function validateMaskRuntime(batch:Batch,pairs:MaskPair[],m:Manifest,parse:<U>(l:Link)=>U,pinned:(p:string)=>Buffer) {
 type Proof = {case:string;avatar:{skin:string;renderedItems:string;runtimeDetails:string};images:{src:string;classes:string;item?:string;mask:string;width:number;height:number}[]};
 type Capture = {status:string;manifestSHA256:string;errors:unknown[];localFailures:unknown[];apiRequests:unknown[];bindings:MaskBinding[];rows:{config:Combo;screenshot:string;screenshotSHA256:string;proof:Proof[]}[]};
 const review=parse<{status:string;manifestSHA256:string;integrationSHA256:string;captures:Link[];rows:(MaskPair&{status:string;evidenceCombos:Combo[];themes:string[]})[]}>(batch.review);
 assert.equal(review.status,'SCOPED_LOCAL_MIXED_INTEGRATION_PASS');assert.equal(review.manifestSHA256,batch.after.sha256);assert.equal(review.integrationSHA256,batch.integration.sha256);assert.deepEqual(review.captures,batch.captures);assert.equal(review.rows.length,260);
 assert.equal(batch.captures.length,1);const c=parse<Capture>(batch.captures[0]);assert.equal(c.status,'PASS_TECHNICAL_AWAITING_VISUAL_SPOT_REVIEW');assert.equal(c.manifestSHA256,batch.after.sha256);assert.deepEqual(c.errors,[]);assert.deepEqual(c.localFailures,[]);assert.deepEqual(c.apiRequests,[]);assert.equal(c.rows.length,76);assert.equal(c.bindings.length,766);
 const configs:Combo[]=[...HATS.flatMap(hat=>SKINS.map(skin=>({hat,hair:'hair-cloud',skin,theme:'light'}))),...['hat-mage','sister-lavender-hat'].flatMap(hat=>SKINS.map(skin=>({hat,hair:'hair-spike',skin,theme:'light'}))),...HATS.map(hat=>({hat,hair:'hair-spike',skin:'base',theme:'dark'})),...HATS.map(hat=>({hat,hair:'hair-cloud',skin:'outfit-racer',theme:'dark',phones:'1'}))];
 assert.deepEqual(c.rows.map(r=>comboKey(r.config)).sort(),configs.map(comboKey).sort(),'missing/duplicate runtime config');
 const cssPaths=(value:string)=>[...value.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(v=>publicPath(v[1])).sort();
 for(const row of c.rows){assert.equal(crypto.createHash('sha256').update(pinned(row.screenshot)).digest('hex'),row.screenshotSHA256);assert.deepEqual(row.proof.map(p=>p.case).sort(),AVATARS.flatMap(a=>['hair','hat','mixed'].map(mode=>`${a}:${mode}`)).sort());
  for(const a of row.proof){const [avatar,mode]=a.case.split(':');const config=row.config;const selected=[...(mode==='hat'?[]:[config.hair]),...(mode==='hair'?[]:[config.hat])];const expectedItems=[...selected,...(config.phones?['starter-buddy-headphones']:[])];assert.equal(a.avatar.skin,config.skin==='base'?'default':config.skin);assert.deepEqual(a.avatar.renderedItems.split(/[,\s]+/).filter(Boolean).sort(),[...expectedItems,...(config.skin==='base'?[]:[config.skin])].sort());
   const details=selected.map(item=>detail(m,{item,avatar,skin:config.skin}));const body=m.skins.find(b=>b.avatarId===avatar&&b.skinId===(config.skin==='base'?'default':config.skin));assert(body);const display=m.baseDisplayVariants.find(b=>b.avatarId===avatar);const paths=config.skin==='base'?[body.path,display?.path,display?.smallDisplay?.path]:[body.path];const bodies=a.images.filter(im=>paths.includes(publicPath(im.src)));assert.equal(bodies.length,1,'wrong mask runtime body');assert.deepEqual(cssPaths(bodies[0].mask),[...new Set(details.flatMap(d=>d.hairVisibilityMask?[d.hairVisibilityMask]:[]))].sort(),'body mask mismatch');
   assert.equal(a.images.length,1+expectedItems.length,'missing/extra mask runtime layer');
   for(const im of a.images){assert.deepEqual([im.width,im.height],dimensions(pinned(publicPath(im.src))));for(const path of cssPaths(im.mask))pinned(path);}
   for(const item of selected){const d=detail(m,{item,avatar,skin:config.skin});const images=a.images.filter(im=>im.item===item);assert.equal(images.length,1);assert.equal(publicPath(images[0].src),d.overlay,'mask runtime overlay mismatch');const expectedMask=item===config.hair&&mode==='mixed'?detail(m,{item:config.hat,avatar,skin:config.skin}).underHeadwearVisibilityMask:undefined;assert.deepEqual(cssPaths(images[0].mask),expectedMask?[expectedMask]:[],'selected hair or hat mask mismatch');}
   if(config.phones){const phones=a.images.filter(im=>im.item==='starter-buddy-headphones');assert.equal(phones.length,1);assert(publicPath(phones[0].src).includes(`/${avatar}/`));assert.deepEqual(cssPaths(phones[0].mask),mode==='hair'?[]:[detail(m,{item:config.hat,avatar,skin:config.skin}).underHeadwearVisibilityMask!]);}
  }
 }
 for(const b of c.bindings){assert.equal(b.status,'PASS');assert.equal(b.skin,b.combo.skin);assert.equal(b.theme,b.combo.theme);assert.equal(detail(m,b)[b.field as keyof Detail],b.path);const rows=c.rows.filter(r=>comboKey(r.config)===comboKey(b.combo));assert.equal(rows.length,1);const proof=rows[0].proof.find(p=>p.case===`${b.avatar}:mixed`)!;const image=b.field==='underHeadwearVisibilityMask'?proof.images.find(im=>im.item===b.combo.hair):proof.images.find(im=>im.classes.includes('avatar-renderer-skin'));assert(image);assert(cssPaths(image.mask).includes(b.path),'binding lacks actual CSS mask');}
 for(const p of pairs){const reviewed=review.rows.filter(r=>maskId(r)===maskId(p));assert.equal(reviewed.length,1);const r=reviewed[0];assert.equal(r.status,'PASS');for(const k of ['kind','item','avatar','skin','field','before','after','sha256'] as const)assert.equal(r[k],p[k]);const bindings=c.bindings.filter(b=>maskId(b)===maskId(p)&&b.path===p.after);assert(bindings.length>0,'unproven integrated mask');assert.deepEqual(r.evidenceCombos.map(comboKey).sort(),bindings.map(b=>comboKey(b.combo)).sort());assert.deepEqual(r.themes,[...new Set(bindings.map(b=>b.theme))].sort());}
 return c.bindings.length;
}
