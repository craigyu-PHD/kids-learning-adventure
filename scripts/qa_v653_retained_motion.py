#!/usr/bin/env python3
"""Independent retained-motion file/geometry/source gate; not legacy QA or browser PASS.
The missing original validator is never replaced in place. No asset writes.
"""
import argparse
import copy
import io
import json
from pathlib import Path
import sys
import numpy as np
from PIL import Image, __version__ as PILLOW_VERSION
from qa_v653_release_art import ROOT, read_bytes, sha, safe, RETAINED_ANCHOR, LEGACY_ANCHOR

BASE='qa/v653/20261005/release-art'
CM='src/data/characterMotionManifest.json'
CM_SHA='e74134e554ae645fd294c2af513686f93ba9192ea7fdc8a6fe9dc04ec7144e60'
ROLES={'brother','younger','sister','younger-sister'}
SKINS={'default','outfit-cadet','outfit-racer','outfit-mecha','outfit-ocean','outfit-mage','outfit-legend','sister-bloom-outfit'}
HOOK_PINS={
 'src/useCharacterBlink.ts':'dc3a58c7251caf58c635b505be73a2379d2d242a5ee06b3540d57b82cf057785',
 'src/useReviewedImageBlink.ts':'f6d9a8996c81aa0fbf03149d0aec3871a86b999cad9a7a291e931e35aac4ae30',
 'src/useRobotBlink.ts':'58fc279301f585264ce0118f89554fd4a2ff20a6c4dde8f62e86d39cc0b6d1cf'}
P10={
 'existing-art-inventory.json':'c97c063b4601cff8313b11c7cd51a13ff1941d6262860d1575c2c7e0628a7d7d',
 'transfer-eligibility-summary.json':'21c3264d6267a152fc0a36e0dc59a1ab7b02acdeadfdb2333ac0793aeb2d2334',
 'derived-candidate-manifest.json':'420d09e32f8a501508667c0dd9100f51e417d58ff35a6ddfd1059d5fbf54d56b',
 'candidate-visual-admission-summary.json':'62f11719c199f9d14c07ff7b30fe3425b13a082856ae757ff80a569cdea3ed71',
 'motion-promotion.json':'0cdf58a24fed65ff7390b93d5156696176fea9dd5789999df791658849581033'}

def load(p):return json.loads(read_bytes(p))
def image(p):return Image.open(io.BytesIO(read_bytes(p))).convert('RGBA')

def coverage(records,skins):
    actual=[(r.get('avatarId'),r.get('skin')) for r in records]
    expected={(r,s) for r in ROLES for s in SKINS}
    return len(records)==32 and len(set(actual))==32 and set(actual)==expected and set(skins)==expected and all(r.get('motion')=='blink' for r in records)


def source_guards(renderer,hook):
    return {
      'fullSkinStatic': '(greet || heroPreview) && stageOverride === undefined && !hero && !fullSkin' in renderer,
      'reducedMotion': "window.matchMedia('(prefers-reduced-motion: reduce)')" in hook and '!motion.matches' in hook,
      'motionEffectsDisabled': "document.documentElement.dataset.motionEffects !== 'false'" in hook,
      'visibleDocumentOnly': "document.visibilityState === 'visible'" in hook,
      'visibleElementOnly':'IntersectionObserver' in hook and 'entry.isIntersecting' in hook,
      'decodeBeforePlayback':'await probe!.decode()' in hook,
      'cancelOnPreferenceAndVisibilityChange':"motion.addEventListener('change', update)" in hook and "document.addEventListener('visibilitychange', update)" in hook,
      'fallbackToRealBase':'src: showingBlink ? candidate : base' in hook and 'recoverBlink:' in hook,
    }


def pixels(source,delivery):
    expected=np.asarray(source.resize(delivery.size,Image.Resampling.LANCZOS));actual=np.asarray(delivery)
    visible=expected[:,:,3]>8
    return {'alphaExact':bool(np.array_equal(expected[:,:,3],actual[:,:,3])),
            'visibleRgbExact':bool(np.array_equal(expected[:,:,:3][visible],actual[:,:,:3][visible])),
            'visibleRgbMAEAlphaGt8':float(np.abs(expected[:,:,:3].astype(np.int16)-actual[:,:,:3])[visible].mean()) if visible.any() else None,
            'nonempty':bool(visible.any())}


def derived_geometry(master,source,boxes):
    a=np.asarray(master);b=np.asarray(source)
    if a.shape!=b.shape:return {'sameDimensions':False}
    changed=np.any(a!=b,axis=2);mask=np.zeros(a.shape[:2],dtype=bool)
    for x0,y0,x1,y1 in boxes:mask[y0:y1,x0:x1]=True
    return {'sameDimensions':True,'alphaExact':bool(np.array_equal(a[:,:,3],b[:,:,3])),
            'changedPixels':int(changed.sum()),'outsideDeclaredEyeBoxes':int((changed&~mask).sum())}


def controls():
    rows=[]
    def check(name,okay):
        assert okay,name
        rows.append({'id':name,'expectedFailureCaught':True})
    records=[{'avatarId':r,'skin':s,'motion':'blink'} for r in ROLES for s in SKINS]
    looks=[(r,s) for r in ROLES for s in SKINS]
    assert coverage(records,looks)
    bad=copy.deepcopy(records);bad[-1]=bad[0];check('duplicate-role-skin',not coverage(bad,looks))
    check('missing-look',not coverage(records[:-1],looks))
    bad=copy.deepcopy(records);bad[0]['motion']='wrong';check('wrong-motion',not coverage(bad,looks))
    a=Image.new('RGBA',(10,10),(1,2,3,255));b=a.copy();b.putpixel((3,3),(1,2,3,0));check('missing-alpha-layer',not pixels(a,b)['alphaExact'])
    b=a.copy();b.putpixel((3,3),(255,3,2,255));check('wrong-rgb-frame',not pixels(a,b)['visibleRgbExact'])
    check('outside-eye-pixel-change',derived_geometry(a,b,[[0,0,2,2]])['outsideDeclaredEyeBoxes']==1)
    renderer=read_bytes('src/components/AvatarRenderer.tsx').decode();hook=read_bytes('src/useReviewedImageBlink.ts').decode()
    check('full-skin-animation-regression',not source_guards(renderer.replace('&& !fullSkin',''),hook)['fullSkinStatic'])
    check('disabled-motion-regression',not source_guards(renderer,hook.replace("document.documentElement.dataset.motionEffects !== 'false'",'true'))['motionEffectsDisabled'])
    return {'status':'PASS_SYNTHETIC_CONTROLS_ONLY','count':len(rows),'rows':rows,'notClaimed':['browser motion behavior','product acceptance']}


def current_proof(ref,args):
    """Fresh acceptance is separate from unavailable P10 history; all linked bytes bound."""
    import time
    errors=[]
    def need(ok,msg):
        if not ok:errors.append(msg)
    def linked(r):
        need(sha(r['path'])==r['sha256'],'Current proof SHA: '+r['path'])
        return load(r['path'])
    p=load(ref);runtime=linked(p['runtime']);app=linked(p['appRuntime']);visual=linked(p['visual']);negative=linked(p['negativeControls']);policy=linked(p['policy'])
    expected_manifests={args.avatar_manifest:sha(args.avatar_manifest),args.world_manifest:sha(args.world_manifest)}
    active_robots=set(policy['enabledRobots']);rejected=set(policy['rejectedRobots'])
    need(active_robots=={'robot-sky'} and rejected=={'robot-mecha','robot-legend'},'Only reviewed sky blink may be active; rejected two must stay static')
    need(policy.get('fullSkinStatic') is True,'Full skin rejection policy missing')
    need(set(policy['approvedHookPins'])=={'src/useRobotBlink.ts'},'Only robot hook may supersede original frozen hook')
    for f,h in policy['approvedHookPins'].items():need(sha(f)==h,'Approved current hook pin: '+f)
    for report in [runtime,app]:
        need(report['manifestPins']==expected_manifests,'Runtime candidate pin mismatch')
        need(0<=time.time()-report['createdEpoch']<=21600,'Runtime proof older than six hours or future')
        need(report['browserCount']==1,'Runtime browser count')
        need(not report.get('pageErrors'),'Runtime errors')
        for f,h in report['sourcePins'].items():need(sha(f)==h,'Runtime source drift: '+f)
        for f,h in report['harnessPins'].items():need(sha(f)==h,'Runtime harness drift: '+f)
        need(all(c['passed'] and c.get('bodySourceCorrect') is True for c in report['cases']),'Runtime failed case or wrong body source')
        need('blocked' in report.get('apiPolicy',''),'Family API block policy missing')
        for c in report['cases']:
            for s in c['screenshots']:need(sha(s['path'])==s['sha256'],'Screenshot drift: '+s['path'])
            if c.get('robot') in rejected:
                need(not c['closed'] and not any('blink' in i['classes'] for i in c['after'].get('imgs',c['after'].get('images',[]))),'Rejected robot frame buffered/displayed')
                need('motionAssetRequests' in c and not c['motionAssetRequests'],'Rejected robot frame requested')
    expected={(r,'default',mode) for r in ROLES|{'robot-sky','robot-mecha','robot-legend'} for mode in ['normal','reduced','disabled','offscreen','failed']}
    expected|={(r,s,'normal') for r in ROLES for s in SKINS-{'default'}}
    actual={(c.get('robot') or c['role'],c['skin'],c['mode']) for c in runtime['cases']}
    need(len(runtime['cases'])==63 and actual==expected,'Exact 63 component case coverage')
    need(len(app['cases'])==11 and {(c.get('robot') or c['role'],c['skin']) for c in app['cases']}=={(r,s) for r in ROLES for s in ['default','outfit-racer']}|{(r,'default') for r in active_robots|rejected},'Exact 11 full App cases')
    need(negative.get('status')=='PASS_CURRENT_PROOF_CONTROLS','Fresh current-proof failure controls missing')
    if negative.get('status')=='PASS_CURRENT_PROOF_CONTROLS':
        need(negative.get('gateSha256')==sha('scripts/qa_v653_retained_motion.py'),'Failure controls stale gate SHA')
        need(negative.get('runnerSha256')==sha(BASE+'/retained-motion/test_current_proof.py'),'Failure controls stale runner SHA')
        need(len(negative.get('results',[]))==6 and all(r.get('expectedFailureCaught') is True for r in negative['results']),'Failure controls not all caught')
    need(set(negative.get('controlIds',[])) >= {'stale-source','wrong-candidate','missing-screenshot','rejected-frame-request','missing-fullskin-case','visual-rejected'},'Failure control coverage missing')
    need(visual.get('status')=='PASS_CURRENT_ACTIVE_VISUAL','Fresh active visual review not accepted')
    need(set(visual.get('activeAccepted',[]))==ROLES|{'robot-sky'},'Five active visual records')
    need(set(visual.get('disabledRejected',[]))==rejected,'Two rejected optional frames must remain rejected')
    need(len(visual['sourceReviews'])==35 and {r['id'] for r in visual['sourceReviews']}=={r+':'+s for r in ROLES for s in SKINS}|{'robot-sky','robot-mecha','robot-legend'},'32+3 independent source reviews required')
    need(len(visual['staticAccepted'])==28 and set(visual['staticAccepted'])=={r+'--'+s+'--normal' for r in ROLES for s in SKINS-{'default'}},'28 current fullskin visual records required')
    reviewed={s['path']:s['sha256'] for s in visual['reviewedImages']}
    for report in [runtime,app]:
        for c in report['cases']:
            expected_blink=c.get('mode','normal')=='normal' and c['skin']=='default' and c.get('robot') not in rejected
            need(bool(c['closed'])==expected_blink and not c['before']['blink'] and not c['after']['blink'],'Independent blink/static sequence mismatch: '+c['id'])
            if c['skin']!='default':
                need(not any('blink' in i['classes'] for i in c['after'].get('imgs',c['after'].get('images',[]))),'Full skin must never buffer dormant blink: '+c['id'])
            if c.get('mode','normal')=='normal':
                need({s['frame'] for s in c['screenshots']}==({'open','closed'} if expected_blink else {'open'}),'Actual frame screenshots incomplete: '+c['id'])
                for s in c['screenshots']:need(reviewed.get(s['path'])==s['sha256'],'Actual current frame not visually reviewed: '+s['path'])
    for s in visual['reviewedImages']:need(sha(s['path'])==s['sha256'],'Visual image SHA: '+s['path'])
    return {'status':'PASS_CURRENT_MOTION_ACCEPTANCE' if not errors else 'FAIL','proofPath':ref,'proofSha256':sha(ref),'failures':errors,'approvedHookPins':policy['approvedHookPins'],'scope':'five active blinks; two rejected robot optional frames static; 28 full skins static; legacy35 source visual dispositions preserved'}


def run(args):
    failures=[];checked={};variant_rows=[];geometry=[]
    fresh=current_proof(args.current_proof,args) if args.current_proof else None
    if fresh:failures.extend(fresh['failures'])
    def require(ok,label):
        if not ok:failures.append(label)
    pins_file=BASE+'/retained-original-pins.json';require(sha(pins_file)==RETAINED_ANCHOR,'Frozen original asset pin wrapper changed')
    pins=load(pins_file)['pins'];require(len(pins)==3495,'Frozen inventory !=3495')
    for p,h in pins.items():
        if Path(p).name=='.DS_Store':continue
        require(sha(p)==h,'Original artifact changed: '+p)
    baseline_count=sum(Path(p).name!='.DS_Store' for p in pins);require(baseline_count==3490,'Non-Finder original artifact count !=3490')
    legacy_file=BASE+'/legacy-gate-pins.json';require(sha(legacy_file)==LEGACY_ANCHOR,'Original gate pin file changed')
    for p,h in load(legacy_file).items():require(sha(p)==h,'Original prebuild gate changed: '+p)
    require(sha(CM)==CM_SHA,'Character motion manifest differs from frozen original')
    cm=load(CM);am=load(args.avatar_manifest);wm=load(args.world_manifest)
    source_paths=[CM,args.avatar_manifest,args.world_manifest,'src/components/AvatarRenderer.tsx',*HOOK_PINS]
    source_pins={p:sha(p) for p in source_paths}
    for p,h in HOOK_PINS.items():require(source_pins[p]==(fresh['approvedHookPins'].get(p,h) if fresh else h),'Retained/approved motion hook changed: '+p)
    guard=source_guards(read_bytes('src/components/AvatarRenderer.tsx').decode(),read_bytes('src/useReviewedImageBlink.ts').decode())
    for k,v in guard.items():require(v,'Source guard missing: '+k)
    require(coverage(cm['records'],[(r['avatarId'],r['skinId']) for r in am['skins']]),'Exact 4 roles x8 skins xblink coverage')
    archival=[]
    for name,h in P10.items():
        p='qa/art-gate/attempts/20260916_p10_motion_coverage/'+name
        try:
            actual=sha(p);require(actual==h,'Retained P10 receipt changed: '+p)
            archival.append({'path':p,'expectedSha256':h,'actualSha256':actual,'available':True})
        except FileNotFoundError:
            archival.append({'path':p,'expectedSha256':h,'available':False})
            if not fresh:failures.append('Original P10 receipt unavailable: '+p)
    def artifact(ref):
        p=ref['path'];actual=sha(p)
        require(actual==ref['sha256'],'Manifest artifact SHA: '+p)
        require(pins.get(p)==actual,'Artifact not retained under frozen deployed pin: '+p)
        im=image(p);alpha=im.getchannel('A')
        require(alpha.getbbox() is not None,'Empty motion image: '+p)
        checked[p]={'sha256':actual,'size':list(im.size),'alphaExtrema':list(alpha.getextrema()),'alphaBBox':alpha.getbbox()}
        return im
    def variant(src,v,lossless):
        im=artifact(v);require(list(im.size)==[v['width'],v['height']],'Declared variant dimensions: '+v['path'])
        require(im.width<=src.width and im.height*src.width==im.width*src.height,'Variant aspect/downscale: '+v['path'])
        metric=pixels(src,im);require(metric['alphaExact'] and metric['nonempty'],'Variant resampled alpha/nonempty: '+v['path'])
        if lossless:require(metric['visibleRgbExact'],'Retained lossless RGB: '+v['path'])
        variant_rows.append({'path':v['path'],'sourceSize':list(src.size),'size':list(im.size),'codecContract':'retained-lossless' if lossless else 'historical-pinned-lossy-default-character',**metric})
    for r in cm['records']:
        master=artifact(r['master']);src=artifact(r['source']);require(src.size==(1024,1536),'Character full native size: '+r['source']['path'])
        require([v['width'] for v in r['displayVariants']]==[192,384,1024],'Character widths: '+r['avatarId']+':'+r['skin'])
        for v in r['displayVariants']:variant(src,v,r['skin']!='default')
        if 'derivation' in r:
            geo=derived_geometry(master,src,r['derivation']['metrics']['boxes']);geometry.append({'avatarId':r['avatarId'],'skin':r['skin'],**geo})
            require(geo.get('alphaExact') and geo.get('outsideDeclaredEyeBoxes')==0 and geo.get('changedPixels')==r['derivation']['metrics']['changedPixels'],'Derived character full-image lineage: '+r['avatarId']+':'+r['skin'])
    original_world='qa/v653/20261005/blender/cards/native-r5-candidate/worldArtManifest.before-local-card.json'
    require(sha(original_world)=='791b447421d26e6fd4f9f9cbee26de124a2a63c60058c95715377d4801b8887b','Original world manifest anchor')
    old={r['itemId']:r for r in load(original_world)['records']}
    robots={r['itemId']:r for r in wm['records'] if r['slot']=='robot'}
    require(set(robots)=={'robot-sky','robot-mecha','robot-legend'},'3 exact retained robot IDs')
    for ident,r in robots.items():
        require(r==old.get(ident),'Robot complete source/blink record changed: '+ident)
        b=r['blink'];master=artifact(r['source']);src=artifact(b['source']);delivery=artifact(b['delivery'])
        require(src.size==delivery.size and pixels(src,delivery)['alphaExact'] and pixels(src,delivery)['visibleRgbExact'],'Robot full PNG-WebP pairing: '+ident)
        require([v['width'] for v in b['displayVariants']]==[384,768],'Robot display widths: '+ident)
        for v in b['displayVariants']:variant(src,v,True)
        if 'derivation' in b:
            geo=derived_geometry(master,src,b['derivation']['metrics']['boxes']);geometry.append({'itemId':ident,**geo})
            require(geo.get('alphaExact') and geo.get('outsideDeclaredEyeBoxes')==0 and geo.get('changedPixels')==b['derivation']['metrics']['changedPixels'],'Derived robot full-image lineage: '+ident)
    for p,h in source_pins.items():require(sha(p)==h,'Source changed during validation: '+p)
    return {'schemaVersion':1,'status':('PASS_CURRENT_MOTION_ACCEPTANCE' if fresh else 'PASS_RETAINED_MOTION_TECHNICAL_ONLY') if not failures else 'FAIL','validatorSha256':sha('scripts/qa_v653_retained_motion.py'),
            'sourcePins':source_pins,'retainedPinsSha256':sha(pins_file),'legacyGatePinsSha256':sha(legacy_file),'pillowVersion':PILLOW_VERSION,
            'counts':{'retainedNonFinderArtifacts':baseline_count,'characterRecords':len(cm['records']),'characterVariants':sum(len(r['displayVariants']) for r in cm['records']),'robotRecords':len(robots),'robotDisplayVariants':sum(len(r['blink']['displayVariants']) for r in robots.values()),'uniqueMotionLineageImages':len(checked)},
            'currentAcceptance':fresh,'archiveUnavailable':[r for r in archival if not r['available']],'oldgate':'NOT_RUN','archivalReceipts':archival,'sourceGuards':guard,'images':checked,'variants':variant_rows,'derivedFullImageGeometry':geometry,'failures':failures,
            'historicalCodecBoundary':'12 default character display assets are existing lossy WebP with original frozen SHA and exact resampled alpha. No new lossy art admitted. 84 derived character variants and six robot displays require exact visible RGB.',
            'originalValidator':{'path':'qa/art-gate/validate-character-motion.py','available':safe('qa/art-gate/validate-character-motion.py').is_file(),'searchEvidence':BASE+'/retained-motion/original-validator-search.json'},
            'notClaimed':['old qa_v64_motion_coverage PASS','full-skin blink activated','production acceptance']+([] if fresh else ['actual reduced-motion browser behavior','new visual acceptance'])}


def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--avatar-manifest',default='src/data/avatarAssetManifest.json');ap.add_argument('--world-manifest',default='src/data/worldArtManifest.json');ap.add_argument('--out',default=BASE+'/retained-motion/result.json');ap.add_argument('--self-test',action='store_true');ap.add_argument('--current-proof');args=ap.parse_args()
    out=safe(args.out)
    if not out.is_relative_to(ROOT/BASE/'retained-motion'):raise ValueError('Output outside owned retained-motion evidence')
    try:r=controls() if args.self_test else run(args)
    except (OSError,ValueError,KeyError,TypeError) as exc:r={'status':'FAIL','failures':[f'{type(exc).__name__}: {exc}']}
    out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in r.items() if k not in {'images','variants','derivedFullImageGeometry','sourcePins'}},ensure_ascii=False,indent=2));return 0 if r['status'].startswith('PASS_') else 1
if __name__=='__main__':sys.exit(main())
