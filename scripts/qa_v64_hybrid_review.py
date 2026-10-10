"""Replay the frozen Round51 method without changing scores or historical evidence.
A historical replay is explicitly not fresh release acceptance.
"""
import argparse
import datetime
import hashlib
import json
import math
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE='qa/visual-audit/2026-09-02-v64/'
KEYS=['columnBalance','panelAlignment','cardConsistency','imageFrameQuality','imageTextBalance','whitespace','visualFocus','typographyHierarchy','imageIntegrity']
VIEWPORTS=['2560x1440','3440x1440','3840x2160','5120x2160']
PAGES=['home','today','semester','achievements','shop','report']

def replay(source):
    failures=[]; hashes={}; records=[]
    def require(ok,why):
        if not ok: failures.append(why)
    def file(rel):
        p=ROOT/rel
        if not p.is_file(): failures.append('Missing evidence '+rel); return None
        hashes[rel]=hashlib.sha256(p.read_bytes()).hexdigest()
        return p
    def read(rel):
        p=file(rel)
        return json.loads(p.read_text()) if p else {}
    def record(d,r,field='records'):
        found=[v for v in d.get(field,[]) if v.get('viewport')==r['viewport'] and v.get('page')==r['page']]
        require(len(found)==1,'Ambiguous/missing provenance row '+str((r['viewport'],r['page'])))
        return found[0] if len(found)==1 else {}
    def score(v): return type(v) in (int,float) and math.isfinite(v) and 0<=v<=10
    data=read(source)
    require(data.get('version')=='round51-calibrated-full-hybrid-visual-gate-v1','Unknown scoring method')
    expected={(v,p) for v in VIEWPORTS for p in PAGES}
    actual=[(r['viewport'],r['page']) for r in data.get('records',[])]
    require(len(actual)==24 and set(actual)==expected,'Exact 24-cell set/uniqueness mismatch')
    raw=read(BASE+'round46-12b-multiscale-formal-review/after-raw.json')
    source_validation=read(BASE+'round50-source-validation/source-validation.json')
    for r in data.get('records',[]):
        k=f"{r['viewport']}:{r['page']}"; values={}; provenance={}
        for dim in KEYS:
            p=r.get('provenance',{}).get(dim,{})
            src=p.get('source',''); d=read(src) if src else {}
            if src.endswith('/deterministic-geometry-matrix.json'):
                v=record(d,r).get('scores',{}).get(dim,{}).get('score')
            elif src.endswith('/hybrid-layout-review.json'):
                v=record(d,r).get('hybridScores',{}).get(dim)
            elif dim=='visualFocus' and src.endswith('/labelled-vision-review.json'):
                v=record(d,r,'results').get('cVisualFocus')
                file(BASE+f"round50-visual-focus-refine/candidate-c-center-left-quiet-{r['viewport']}-{r['page']}.jpg")
            elif dim=='visualFocus' and src.endswith('/threeway-5120x2160-achievements-review.json'):
                v=d.get('candidateBVisualFocus')
            elif dim=='visualFocus' and src.endswith('/report-focus-adjudication.json'):
                case=d.get('cases',{}).get(r['viewport'],{}); runs=case.get('runs',[])
                require(len(runs)==2 and all(not x.get('factConflict',True) for x in runs),k+' invalid report adjudication')
                vals=[d.get('severityScoreMap',{}).get(x.get('severity')) for x in runs]
                require(all(score(x) for x in vals),k+' invalid severity scores')
                v=min(vals) if vals and all(score(x) for x in vals) else None
                if case.get('image'):file(case['image'])
            else: v=None; failures.append(k+' unsupported provenance '+src)
            require(score(v) and v>=8,k+' below-threshold/invalid '+dim)
            require(v==r.get('scores',{}).get(dim),k+' source score mismatch '+dim)
            values[dim]=v; provenance[dim]={'source':src,'sourceSha256':hashes.get(src),'method':p.get('method')}
        avg=round(sum(values.values())/9,3) if all(score(v) for v in values.values()) else None
        require(avg is not None and avg>=8.5,k+' hybrid overall below threshold')
        require(avg==r.get('scores',{}).get('overallPolishHybrid'),k+' derived overall mismatch')
        legacy=record(raw,r)
        if r['viewport']=='5120x2160' and r['page']=='semester':
            targeted=read(BASE+'round47-semester-geometry/source-round48-w-hybrid-acceptance.json')
            legacy={'scores':targeted.get('formalVisionScores',{}),
                    'sourceScreenshot':BASE+'round47-semester-geometry/'+targeted.get('source','')}
        require(legacy.get('scores',{}).get('overallPolish')==r.get('legacyVisionOverallPolish'),k+' raw overall mismatch')
        screenshot=legacy.get('sourceScreenshot')
        if screenshot:file(screenshot)
        current=[x for x in source_validation.get('records',[]) if x['viewport']==r['viewport'] and x['page']==r['page']]
        supporting=[]
        for c in current:
            for name in ['reference','shot']:
                if c.get(name):file(c[name]);supporting.append(c[name])
        records.append({'viewport':r['viewport'],'page':r['page'],'scores':values,'overallPolishHybrid':avg,
            'rawModelOverall':legacy.get('scores',{}).get('overallPolish'), 'reviewScreenshot':screenshot,
            'sourceValidationScreenshots':supporting,'provenance':provenance})
    controls=[]
    for c in data.get('calibration',{}).get('negativeControls',[]):
        d=read(c['source']); rows=d.get('records',[])
        avgs=[round(sum(r['scores'][k] for k in KEYS)/9,3) for r in rows]
        require(len(avgs)==24 and max(avgs)<8.5,'Negative control no longer rejects')
        require(max(avgs)==c['max'],'Negative-control summary mismatch')
        controls.append({'source':c['source'],'recomputedMax':max(avgs)})
    pos=data.get('calibration',{}).get('positiveControl',{}); pd=read(pos.get('source',''))
    pv=round(sum(pd.get('hybridScores',{}).get(k,0) for k in KEYS)/9,3)
    require(pv==pos.get('componentDerivedOverall') and pv>=8.5,'Positive control mismatch')
    audit=read('docs/handover/audit-20260908_102225/audit-evidence.json')
    for rel,h in audit.get('sourceSha256',{}).items():
        if rel.startswith('src/'):
            file(rel);require(hashes.get(rel)==h,'Source changed since audited Round51 continuation: '+rel)
    binding=read(BASE+'hybrid-replay-binding.json')
    for rel,h in binding.get('sha256',{}).items():
        file(rel);require(hashes.get(rel)==h,'Bound source/asset/evidence changed: '+rel)
    require(bool(binding.get('sha256')),'Replay binding missing')
    return {'version':'v64-hybrid-replay-v1','createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'status':'FAIL' if failures else 'PASS','scope':'historical-method-replay',
        'releaseVisualStatus':'PENDING_FRESH_CANDIDATE_CAPTURE_AND_REVIEW',
        'method':'Round51 arithmetic mean of nine dimensions; NOT raw model overall',
        'provenanceLimit':'Historical screenshots lack capture-time source and image hashes. Binding hashes were observed at handoff repair, not reconstructed capture-time proof. Never use this replay alone as a fresh release gate.',
        'records':records,'negativeControls':controls,'positiveControl':pv,'observedSha256':hashes,'failures':failures}

if __name__=='__main__':
    ap=argparse.ArgumentParser(); ap.add_argument('--input',default=BASE+'round51-hybrid-overall-calibration/full-hybrid-gate.json');ap.add_argument('--output');ap.add_argument('--release',action='store_true');a=ap.parse_args()
    try: result=replay(a.input)
    except Exception as e: result={'status':'FAIL','failures':[type(e).__name__+': '+str(e)]}
    if a.release: result['status']='FAIL';result['failures'].append('Historical replay cannot satisfy fresh release acceptance')
    if a.output:
        p=ROOT/a.output;p.parent.mkdir(parents=True,exist_ok=True)
        with p.open('x') as f:json.dump(result,f,indent=2);f.write('\n')
    print(json.dumps({k:v for k,v in result.items() if k not in ['records','observedSha256']},indent=2))
    raise SystemExit(0 if result['status']=='PASS' else 1)
