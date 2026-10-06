import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readAdmissionFile, type ReadAdmissionFile } from './v652_current_detail_admission';
type Link = {path:string;sha256:string};
type Detail = {overlay:string;hairVisibilityMask?:string;canvasTopPadding?:number};
type Entry = {id:string;catalogPath:string;catalogVariants?:Record<string,string>;variants:Record<string,string>;skinVariants?:Record<string,Record<string,string>>;defaultSkinDetails?:Record<string,Detail>;skinDetails?:Record<string,Record<string,Detail>>;backVariants?:Record<string,string>;frontVariants?:Record<string,string>;[key:string]:unknown};
type Manifest = {accessories:Entry[];skins:{skinId:string;avatarId:string;path:string;[key:string]:unknown}[];baseDisplayVariants:{avatarId:string;path:string;smallDisplay?:{path:string}}[]};
type Pair = {kind:string;item:string;avatar:string;skin?:string;path?:string;detail?:Detail;layers?:{back:string;front:string}};
type Image = {src:string;width:number;height:number;mask:string;visible:string};
type Actor = {className:string;detail:string|null;padding:string|null;skin:string;rendered:string;images:Image[]};
type Frame = {itemId:string;skin:string;theme:string;catalog:string;screenshot:string;proof:Actor[]};
type Change = {kind:string;item:string;avatar?:string;field:string};
type Batch = {before:Link;after:Link;integration:Link;review:Link;captures:Link[];changes:Change[];count:number};
const AVATARS=['brother','younger','sister','younger-sister'];
const SKINS=['base','outfit-cadet','outfit-racer','outfit-mecha','outfit-ocean','outfit-mage','outfit-legend','sister-bloom-outfit'];
const PACKS=['trail-backpack','pack-rocket','pack-treasure','pack-ocean','pack-legend','sister-comet-pack'];
export const V652_NATIVE_REPAIR_LOCK:Link={path:'qa/v652/astra/20260927-native-repair-admission/lock.json',sha256:'44c5514761dd5204deafb41a06ffd5f6d6cff70c3569b4d9fddeeaccae25d177'};
const key=(p:Pair)=>[p.kind,p.item,p.avatar,p.skin??''].join(':');
const combinations=(kind:string,items:string[])=>items.flatMap(item=>AVATARS.flatMap(avatar=>SKINS.map(skin=>({kind,item,avatar,skin}))));
const INVENTORIES=[
 [...AVATARS.map(avatar=>({kind:'skin',item:'outfit-racer',avatar})),...combinations('detail',['hair-spike','sister-starlight-clip','sister-mint-bow']),...combinations('variant',['glasses-star'])],
 [...combinations('detail',['hair-comet']),...['hair-cloud','hair-nebula','hair-legend'].flatMap(item=>AVATARS.map(avatar=>({kind:'catalog',item,avatar})))],
 [...combinations('detail',['hair-wave']),...combinations('split',PACKS)],
];
function changes(index:number):Change[]{
 const fields=(items:string[],names:string[])=>items.flatMap(item=>names.map(field=>({kind:'accessory',item,field})));
 const details=['catalogPath','variants','skinDetails','defaultSkinDetails'];
 if(index===0)return [...fields(['hair-spike','sister-starlight-clip','sister-mint-bow'],details),...fields(['glasses-star'],['catalogPath','skinVariants','variants']),...AVATARS.map(avatar=>({kind:'skin',item:'outfit-racer',avatar,field:'path'}))];
 if(index===1)return [...fields(['hair-comet'],details),...fields(['hair-cloud','hair-nebula','hair-legend'],['catalogVariants'])];
 return [...fields(['hair-wave'],details),...fields(PACKS,['catalogPath','frontVariants','backVariants'])];
}
function project(target:Manifest,source:Manifest,allowed:Change[]){
 for(const c of allowed){
  const find=(m:Manifest):Record<string,unknown>=>{const rows=c.kind==='skin'?m.skins.filter(r=>r.skinId===c.item&&r.avatarId===c.avatar):m.accessories.filter(r=>r.id===c.item);assert.equal(rows.length,1);return rows[0];};
  const to=find(target),from=find(source);if(Object.hasOwn(from,c.field))to[c.field]=structuredClone(from[c.field]);else delete to[c.field];
 }
}
function dimensions(b:Buffer):number[]{
 if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return[b.readUInt32BE(16),b.readUInt32BE(20)];
 assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');const k=b.toString('ascii',12,16);
 if(k==='VP8X')return[b.readUIntLE(24,3)+1,b.readUIntLE(27,3)+1];if(k==='VP8L'){const v=b.readUInt32LE(21);return[(v&0x3fff)+1,((v>>>14)&0x3fff)+1];}assert.equal(k,'VP8 ');return[b.readUInt16LE(26)&0x3fff,b.readUInt16LE(28)&0x3fff];
}
const publicPath=(url:string)=>'public'+new URL(url,'http://127.0.0.1:5178').pathname;
/** Each immutable batch must validate before reverting only its explicitly approved fields.
 * Exact final comparison rejects all unrelated drift. New batches must project into this one.
 * This is scoped binding/evidence admission, not a new visual review or release approval. */
export function assertV652NativeRepairAdmission<T extends {accessories:unknown[]}>(manifest:T,options:{readFile?:ReadAdmissionFile}={}){
 const read=options.readFile??readAdmissionFile,cache=new Map<string,Buffer>();
 const exact=(l:Link)=>{assert(l&&/^[a-f0-9]{64}$/.test(l.sha256));assert(/^(qa\/v652\/|public\/assets\/)/.test(l.path)&&!l.path.split('/').includes('..'));if(!cache.has(l.path))cache.set(l.path,read(l.path));const b=cache.get(l.path)!;assert.equal(crypto.createHash('sha256').update(b).digest('hex'),l.sha256,`native repair hash drift: ${l.path}`);return b;};
 const parse=<U,>(l:Link):U=>JSON.parse(exact(l).toString());
 const lock=parse<{status:string;files:Link[];batches:Batch[];manifestSHA256:string;releaseAcceptance:boolean;mixedEquipmentAcceptance:boolean}>(V652_NATIVE_REPAIR_LOCK);
 assert.equal(lock.status,'FROZEN_ROOT_APPROVED_400_SCOPE');assert.equal(lock.releaseAcceptance,false);assert.equal(lock.mixedEquipmentAcceptance,false);assert.equal(lock.batches.length,3);
 assert.equal(new Set(lock.files.map(f=>f.path)).size,lock.files.length);for(const f of lock.files)exact(f);
 const pinned=(path:string)=>{const links=lock.files.filter(f=>f.path===path);assert.equal(links.length,1,`unfixed evidence: ${path}`);return exact(links[0]);};
 let bindingCount=0;const snapshots:Manifest[]=[];
 for(const [index,batch] of lock.batches.entries()){
  const before=parse<Manifest>(batch.before),after=parse<Manifest>(batch.after);snapshots.push(before);
  const integration=parse<{manifestBeforeSHA256:string;manifestAfterSHA256:string;pairs:Pair[];assets:(Link&{source:string;sourceSHA256:string;rgbaIdentical?:boolean;exactBytes?:boolean})[]}>(batch.integration);
  const review=parse<{status:string;integrationSHA256:string;manifestSHA256:string;rows:{item:string;avatar:string;skin:string;theme?:string;binding:string}[]}>(batch.review);
  assert.equal(batch.count,[132,44,224][index]);assert.equal(integration.manifestBeforeSHA256,batch.before.sha256);assert.equal(integration.manifestAfterSHA256,batch.after.sha256);
  if(index)assert.equal(batch.before.sha256,lock.batches[index-1].after.sha256);
  assert.equal(review.integrationSHA256,batch.integration.sha256);assert.equal(review.manifestSHA256,batch.after.sha256);assert.equal(review.status,index===1?'SCOPED_LOCAL_SINGLE_ITEM_AND_CATALOG_PASS':'SCOPED_LOCAL_SINGLE_ITEM_PASS');
  const expected=new Set(INVENTORIES[index].map(key));assert.equal(integration.pairs.length,expected.size);assert.deepEqual(new Set(integration.pairs.map(key)),expected,'wrong/duplicate inventory');
  const allowed=changes(index);assert.deepEqual(batch.changes.map(c=>JSON.stringify(c)).sort(),allowed.map(c=>JSON.stringify(c)).sort());
  const replay=structuredClone(before);project(replay,after,allowed);assert.deepEqual(replay,after,'unapproved snapshot field drift');
  for(const a of integration.assets){exact(a);exact({path:a.source,sha256:a.sourceSHA256});assert(a.rgbaIdentical===true||(a.exactBytes===true&&a.sourceSHA256===a.sha256),'source/output pixel lineage mismatch');}
  const frames=batch.captures.flatMap(link=>{const c=parse<{manifestSHA256:string;errors:unknown[];rows:Frame[]}>(link);assert.equal(c.manifestSHA256,batch.after.sha256);assert.deepEqual(c.errors,[]);return c.rows;});
  assert.equal(review.rows.length,[176,32,280][index]);for(const row of review.rows)assert.equal(row.binding,'PASS');
  for(const pair of integration.pairs){
   if(pair.kind==='skin'){const body=after.skins.find(s=>s.avatarId===pair.avatar&&s.skinId===pair.item);assert.equal(body?.path,pair.path);assert(frames.some(f=>f.skin===pair.item&&f.proof.some(a=>a.className.split(' ').includes(`avatar-${pair.avatar}`)&&a.images.some(im=>publicPath(im.src)===pair.path))),'missing Racer body proof');continue;}
   const entries=after.accessories.filter(e=>e.id===pair.item);assert.equal(entries.length,1);const entry=entries[0];
   if(pair.kind==='catalog'){
    assert.equal(entry.catalogVariants?.[pair.avatar],pair.path);pinned(pair.path!);
    const reportPath='qa/v652/root/20260927-shop-quality-reopen/role-catalog-shop-r1/report.json';
    const report=JSON.parse(pinned(reportPath).toString()) as {status:string;rows:{avatar:string;item:string;width:number;theme:string;catalog:string;expected:string;screenshot:string;selectedChildSwitch:string}[]};
    assert.equal(report.status,'ACTUAL_SHOP_80_CATALOG_AND_TRIAL_CASES_PASS');assert.equal(report.rows.length,80);
    const rows=report.rows.filter(r=>r.avatar===pair.avatar&&r.item===pair.item);assert.equal(rows.length,2);assert.deepEqual(rows.map(r=>[r.width,r.theme]).sort(),[[390,'light'],[1440,'dark']].sort());
    for(const row of rows){assert.equal(publicPath(row.catalog),pair.path);assert.equal(row.expected,pair.path);assert.equal(row.selectedChildSwitch,'PASS');pinned(row.screenshot);}continue;
   }
   const detail=pair.skin==='base'?entry.defaultSkinDetails?.[pair.avatar]:entry.skinDetails?.[pair.avatar]?.[pair.skin!];
   let paths:string[];
   if(pair.kind==='detail'){assert.deepEqual(detail,pair.detail);assert(detail);paths=[detail.overlay];assert.deepEqual(dimensions(pinned(detail.overlay)),[1024,1536+(detail.canvasTopPadding??0)]);if(detail.hairVisibilityMask)assert.deepEqual(dimensions(pinned(detail.hairVisibilityMask)),[1024,1536]);}
   else if(pair.kind==='variant'){const path=pair.skin==='base'?entry.variants[pair.avatar]:entry.skinVariants?.[pair.avatar]?.[pair.skin!];assert.equal(path,pair.path);paths=[pair.path!];}
   else{assert.equal(pair.kind,'split');assert.equal(entry.renderer,'split-overlay');assert.deepEqual(pair.layers,{back:entry.backVariants?.[pair.avatar],front:entry.frontVariants?.[pair.avatar]});paths=[pair.layers!.back,pair.layers!.front];}
   for(const path of paths){assert(path.startsWith(`public/assets/v6.5.2/runtime/${pair.avatar}/`),'wrong avatar source');if(pair.kind!=='detail')assert.deepEqual(dimensions(pinned(path)),[1024,1536]);}
   const matches=frames.filter(f=>f.itemId===pair.item&&f.skin===pair.skin);assert(matches.length>0,`missing fresh pair: ${key(pair)}`);
   for(const frame of matches){
    pinned(frame.screenshot);assert.equal(publicPath(frame.catalog),entry.catalogPath,'catalog mismatch');
    const actors=frame.proof.filter(a=>a.className.split(' ').includes(`avatar-${pair.avatar}`));assert.equal(actors.length,1,'wrong avatar proof');const actor=actors[0];
    assert.equal(actor.skin,pair.skin==='base'?'default':pair.skin);assert(actor.rendered.split(/[,\s]+/).includes(pair.item),'swapped item proof');
    const body=after.skins.find(s=>s.avatarId===pair.avatar&&s.skinId===(pair.skin==='base'?'default':pair.skin));assert(body);
    const display=after.baseDisplayVariants.find(s=>s.avatarId===pair.avatar);
    const bodies=pair.skin==='base'?[body.path,display?.path,display?.smallDisplay?.path].filter(Boolean):[body.path];
    const images=actor.images.map(im=>publicPath(im.src));const actualBody=images.filter(path=>bodies.includes(path));assert.equal(actualBody.length,1,'wrong actual body');
    assert.deepEqual([...images].sort(),[actualBody[0],...paths].sort(),'missing/extra/swapped layer');
    for(const im of actor.images){assert.equal(im.visible,'visible');assert.deepEqual([im.width,im.height],dimensions(pinned(publicPath(im.src))));}
    if(pair.kind==='detail'){assert.equal(actor.detail,pair.item);assert.equal(Number(actor.padding),detail!.canvasTopPadding??0);const bodyImage=actor.images.find(im=>publicPath(im.src)===actualBody[0])!;if(detail!.hairVisibilityMask)assert(bodyImage.mask.includes(detail!.hairVisibilityMask.replace(/^public/,'')),'missing body mask');else assert.equal(bodyImage.mask,'none');}
    assert(review.rows.some(r=>r.item===pair.item&&r.avatar===pair.avatar&&r.skin===pair.skin&&(!r.theme||r.theme===frame.theme)),'missing reviewed runtime row');bindingCount++;
   }
  }
 }
 const final=parse<Manifest>(lock.batches[2].after);assert.equal(lock.batches[2].after.sha256,lock.manifestSHA256);assert.deepEqual(manifest,final,'unapproved live field drift');
 const historicalManifest=structuredClone(manifest) as T&Manifest;
 for(let index=2;index>=0;index--)project(historicalManifest,snapshots[index],changes(index));
 assert.deepEqual(historicalManifest,snapshots[0],'projection failed');
 return {historicalManifest,pairCount:400,bindingCount,checkedFileCount:cache.size,manifestSHA256:lock.manifestSHA256,releaseAcceptance:false as const,mixedEquipmentAcceptance:false as const};
}
