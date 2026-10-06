#!/usr/bin/env python3
"""Read-only V6.5.3 local art admission gate. Never generates assets or edits legacy gates.

See qa/v653/20261005/release-art/README.md for the evidence contract. A PASS
certifies checked file/evidence integrity, not an independent aesthetic judgment,
production deployment, or approval to publish. Missing evidence is a hard failure.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import signal
import sys
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
ROLES = {'brother', 'younger', 'sister', 'younger-sister'}
IMAGE_EXT = {'.png', '.webp', '.avif'}
# Immutable historical anchors, read from the deployed release evidence, not today's art.
RETAINED_ANCHOR = 'b18336e4cb21004bce98caf0367d0717d1e17e7a896cd4d6201befb9f11a9e64'
LEGACY_ANCHOR = 'cb9fa4072a1ef3b1e3568f5bdb3b11a64009ca4d36c1cf5b137fdd1203956c6a'
BASELINES = {'avatar': '1414e4226a2ecd5599da579711df7096dc893416c73c6c6ccf8f3f961fdbd622',
             'world': '791b447421d26e6fd4f9f9cbee26de124a2a63c60058c95715377d4801b8887b'}
LEGACY = ['qa_v64_hero_manifest.ts', 'qa_v64_world_manifest.ts', 'qa_v64_brand_display.ts',
          'generate_v65_display_derivatives.py', 'qa_v64_runtime_details.ts',
          'qa_v64_avatar_display.ts', 'qa_v64_motion_coverage.py']


def digest(data):
    return hashlib.sha256(data).hexdigest()


def safe(path):
    p = (ROOT / path).resolve()
    if not p.is_relative_to(ROOT):
        raise ValueError(f'Path outside repository: {path}')
    return p


def read_bytes(path):
    # Google Drive placeholders can block indefinitely. Stop on the exact file.
    def expired(*_):
        raise TimeoutError(f'FILE_READ_TIMEOUT: {path}')
    previous = signal.signal(signal.SIGALRM, expired)
    signal.alarm(8)
    try:
        return safe(path).read_bytes()
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, previous)


def sha(path):
    return digest(read_bytes(path))


def assets(node, pointer=''):
    """Enumerate actual manifest image references, including masks/split layers."""
    out = {}
    if isinstance(node, dict):
        for k, v in node.items():
            out.update(assets(v, pointer + '/' + str(k)))
    elif isinstance(node, list):
        for k, v in enumerate(node):
            out.update(assets(v, pointer + '/' + str(k)))
    elif isinstance(node, str) and node.startswith('public/assets/') and Path(node).suffix in IMAGE_EXT:
        out[pointer] = node
    return out


class Gate:
    def __init__(self):
        self.failures = []
        self.images = {}
        self.verified_links = []
        self.excluded_metadata = []

    def check(self, value, message):
        if not value:
            self.failures.append(message)
        return bool(value)

    def link(self, link, label):
        if not self.check(isinstance(link, dict) and link.get('path') and link.get('sha256'), f'{label}: missing path + sha256'):
            return None
        try:
            raw = read_bytes(link['path'])
            self.check(digest(raw) == link['sha256'], f'{label}: changed bytes {link["path"]}')
            self.verified_links.append(link)
            return json.loads(raw) if str(link['path']).endswith('.json') else raw
        except TimeoutError:
            raise
        except (OSError, ValueError) as exc:
            self.failures.append(f'{label}: {exc}')
            return None

    def image(self, path):
        if path in self.images:
            return self.images[path]
        import io
        try:
            raw = read_bytes(path)
            with Image.open(io.BytesIO(raw)) as im:
                im.load()
                alpha = im.convert('RGBA').getchannel('A')
                row = {'sha256': digest(raw), 'size': list(im.size), 'format': im.format,
                       'alphaExtrema': list(alpha.getextrema()), 'alphaBBox': alpha.getbbox(),
                       'nativeAlpha': 'A' in im.getbands()}
            self.check(bool(row['alphaBBox']), f'Empty image: {path}')
            self.images[path] = row
            return row
        except TimeoutError:
            raise
        except (OSError, ValueError) as exc:
            self.failures.append(f'Image decode {path}: {exc}')
            return None

    def pair(self, source, delivery, resize=False, uniform_fit=False):
        import io
        try:
            a = Image.open(io.BytesIO(read_bytes(source))).convert('RGBA')
            b = Image.open(io.BytesIO(read_bytes(delivery))).convert('RGBA')
            if uniform_fit:
                bounds = a.getbbox()
                if not self.check(bounds is not None, f'Empty catalog source: {source}'):
                    return
                fitted = a.crop(bounds)
                fitted.thumbnail((464,464), Image.Resampling.LANCZOS)
                a = Image.new('RGBA',(512,512))
                a.alpha_composite(fitted,((512-fitted.width)//2,(512-fitted.height)//2))
            if resize:
                self.check(b.width in (192, 384, 768) and b.width < a.width, f'Invalid derivative width: {delivery}')
                size = (b.width, round(a.height*b.width/a.width))
                self.check(b.size == size, f'Derivative ratio: {delivery}')
                a = a.resize(size, Image.Resampling.LANCZOS)
            if not self.check(a.size == b.size, f'Pair dimensions: {delivery}'):
                return
            self.check(ImageChops.difference(a.getchannel('A'), b.getchannel('A')).getbbox() is None, f'Pair alpha: {delivery}')
            # RGB under transparent pixels is irrelevant; visible RGB must be lossless.
            diff = ImageChops.difference(a.convert('RGB'), b.convert('RGB'))
            visible = a.getchannel('A').point(lambda x: 255 if x else 0)
            self.check(ImageChops.multiply(diff, Image.merge('RGB', (visible,)*3)).getbbox() is None, f'Pair visible RGB: {delivery}')
        except TimeoutError:
            raise
        except (OSError, ValueError) as exc:
            self.failures.append(f'Pair {delivery}: {exc}')

    def evidence(self, link, kind, candidate, covered):
        d = self.link(link, kind)
        if not isinstance(d, dict):
            return
        self.check(d.get('schemaVersion') == 1 and d.get('kind') == kind, f'{kind}: wrong evidence schema')
        self.check(d.get('candidate') == candidate, f'{kind}: stale candidate binding')
        self.check(d.get('status') == 'PASS', f'{kind}: not PASS')
        self.check(set(d.get('assetPaths', [])) >= covered, f'{kind}: uncovered new assets')
        originals = d.get('originalReports', [])
        self.check(bool(originals), f'{kind}: original reports required')
        for ref in originals:
            self.link(ref, kind + '/original')
        if kind == 'visual':
            self.check(d.get('reviewer', {}).get('canViewImages') is True and bool(d.get('reviewer', {}).get('id')), 'visual: named image-capable reviewer required')
            rows = d.get('reviews', [])
            self.check(bool(rows), 'visual: actual per-image reviews required')
            seen = set()
            for r in rows:
                image = self.link(r.get('image'), 'visual/image')
                if image is not None:
                    self.image(r['image']['path'])
                self.check(r.get('verdict') == 'PASS' and bool(r.get('observation')), 'visual: missing actual observation/verdict')
                seen.update(r.get('assetPaths', []))
            self.check(seen >= covered, 'visual: new assets without actual viewed image')
        if kind == 'runtime':
            self.check(d.get('familyApisBlocked') is True and d.get('fixture') == 'synthetic-local', 'runtime: isolated fixture required')
            self.check(d.get('manifestOverrides') is False and d.get('cssOverrides') is False, 'runtime: final formal-local URL required')
            self.check(d.get('brokenImages') == 0 and d.get('overflow') == 0 and d.get('pageErrors') == 0, 'runtime: broken/overflow/pageErrors must be zero')
            self.check(set(d.get('roles', [])) == ROLES and set(d.get('widths', [])) == {390,1440} and set(d.get('modes', [])) == {'light','dark'}, 'runtime: missing role/viewport/theme coverage')
            expected = {'trial','cancel','purchase-coins-derived','equip','home','reload','achievements','unequip','child-isolation','reduced-motion'}
            self.check(set(d.get('operations', [])) >= expected, 'runtime: missing lifecycle operation')
            observed = set(d.get('domObservedAssetPaths', []))
            source_only = set(d.get('sourceCodecOnlyAssetPaths', []))
            self.check(observed | source_only == covered and not observed & source_only,
                       'runtime: exact DOM/source-codec scope partition required')
            self.check(len(source_only) == 2 and all('/world-source/' in p and p.endswith('.png') for p in source_only),
                       'runtime: only the two native world sources may be source-codec-only')
            self.check(set(d.get('formalLifecycleAssetPaths', [])) <= observed,
                       'runtime: lifecycle paths must have actual DOM evidence')
            variant = self.link(d.get('additionalPathEvidence'), 'runtime/current-component-paths')
            if isinstance(variant, dict):
                self.check(variant.get('status') == 'PASS_SCOPED_CURRENT_COMPONENT_PATHS' and not variant.get('failures'),
                           'runtime: current component path evidence not PASS')
                self.check(variant.get('source106SHA256') == candidate['sourcePinsSha256'] and
                           variant.get('candidate') == {k:v for k,v in candidate.items() if k != 'sourcePinsSha256'},
                           'runtime: stale component source binding')
                self.check(variant.get('formalManifests') is True and variant.get('manifestOverrides') is False and
                           variant.get('productCssOverrides') is False and variant.get('familyApisBlocked') is True,
                           'runtime: component paths must use isolated current product components')
                self.check(set(variant.get('observedGatePaths', [])) == observed == set(variant.get('pathEvidence', {})) and
                           {r.get('path') for r in variant.get('unobservedPaths', [])} == source_only,
                           'runtime: declared path scopes differ from actual component evidence')
                for p, entries in variant.get('pathEvidence', {}).items():
                    self.check(bool(entries), f'runtime: no DOM path use {p}')
                    for entry in entries:
                        self.check(entry.get('http', {}).get('status') == 200 and entry.get('http', {}).get('sha256') == sha(p),
                                   f'runtime: HTTP path bytes differ {p}')
        if kind == 'negative':
            rows = d.get('controls', [])
            expected = {'missing-layer','stale-art','wrong-sku'}
            self.check({r.get('id') for r in rows} >= expected, 'negative: missing required controls')
            for r in rows:
                self.check(r.get('expectedFailureCaught') is True and bool(r.get('assertion')), 'negative: control must identify caught assertion')
                self.link(r.get('report'), 'negative/report')


def run(args):
    g = Gate()
    avatar = json.loads(read_bytes(args.avatar_manifest))
    world = json.loads(read_bytes(args.world_manifest))
    index = json.loads(read_bytes(args.evidence_index))
    g.check(index.get('schemaVersion') == 1 and index.get('release') == 'v6.5.3', 'Evidence index schema/release')
    candidate = {'avatarManifestSha256': sha(args.avatar_manifest), 'worldManifestSha256': sha(args.world_manifest),
                 'sourcePinsSha256': None}
    source_pins = g.link(index.get('sourcePins'), 'sourcePins')
    if isinstance(source_pins, dict):
        candidate['sourcePinsSha256'] = index['sourcePins']['sha256']
        required = {'src/components/AvatarRenderer.tsx','src/avatarAssetRegistry.ts','src/worldArtAssets.ts','src/v4/Dashboard.tsx','src/styles/components/pet.css','src/cosmetics.ts'}
        required.update(str(p.relative_to(ROOT)) for p in (ROOT/'src').rglob('*') if p.is_file() and p.suffix in {'.ts','.tsx','.css','.json'})
        g.check(required <= source_pins.keys(), 'sourcePins: complete current src compile inventory required')
        g.check(source_pins.get('src/data/avatarAssetManifest.json') == candidate['avatarManifestSha256'] and source_pins.get('src/data/worldArtManifest.json') == candidate['worldManifestSha256'], 'sourcePins: formal manifests differ from candidate')
        for p,h in source_pins.items():
            g.check(sha(p) == h, f'Candidate source drift: {p}')
    g.check(index.get('candidate') == candidate, 'Index candidate does not bind exact manifests + sources')
    g.check((index.get('legacyGatePins') or {}).get('sha256') == LEGACY_ANCHOR, 'Historical legacy gate anchor changed')
    legacy = g.link(index.get('legacyGatePins'), 'legacyGatePins')
    if isinstance(legacy, dict):
        g.check({'scripts/'+p for p in LEGACY} <= legacy.keys(), 'legacyGatePins: prebuild script coverage missing')
        for p,h in legacy.items():
            g.check(sha(p) == h, f'Legacy gate changed: {p}')
    g.check((index.get('retainedPins') or {}).get('sha256') == RETAINED_ANCHOR, 'Historical original art pin anchor changed')
    retained = g.link(index.get('retainedPins'), 'retainedPins')
    pins = retained.get('pins', {}) if isinstance(retained, dict) else {}
    g.check(len(pins) == 3495, f'Expected full 3495 frozen deployed art pins, got {len(pins)}')
    g.check(isinstance(retained,dict) and retained.get('provenance') and retained.get('frozenAt'), 'Frozen retained pins provenance/time missing')
    if isinstance(retained, dict):
        for ref in retained.get('sources', []):
            g.link(ref, 'retained provenance')
    for p,h in pins.items():
        if Path(p).name == '.DS_Store':
            g.excluded_metadata.append({'path':p,'reason':'Finder metadata, never runtime art','originalSha256':h})
            continue
        g.check(sha(p) == h, f'Retained original modified/missing: {p}')
    refs = {**{'avatar'+k:v for k,v in assets(avatar).items()}, **{'world'+k:v for k,v in assets(world).items()}}
    g.check(index.get('bindings') == refs, 'Manifest binding map differs (missing layer/wrong SKU/stale mapping)')
    g.check(avatar.get('contract', {}).get('canvasWidth') == 1024 and avatar.get('contract', {}).get('canvasHeight') == 1536, 'Original avatar canvas contract drift')
    g.check(len(world.get('records', [])) == 16 and len({r['itemId'] for r in world.get('records', [])}) == 16, 'World inventory must be 16 unique items')
    g.check({r['itemId'] for r in world.get('records', []) if r.get('slot')=='pet'} == {'pet-space-fox'}, 'Pet SKU/slot mismatch')
    baseline_refs = {}
    baseline_docs = {}
    for kind in ('avatar','world'):
        link = (index.get('baselineManifests') or {}).get(kind)
        g.check((link or {}).get('sha256') == BASELINES[kind], f'Original {kind} manifest anchor missing/changed')
        baseline = g.link(link, 'baseline/'+kind)
        if isinstance(baseline,dict):
            baseline_docs[kind] = baseline
            baseline_refs.update({kind+k:v for k,v in assets(baseline).items()})
    if 'avatar' in baseline_docs:
        old_avatar = baseline_docs['avatar']
        g.check(avatar.get('skins') == old_avatar.get('skins') and avatar.get('baseDisplayVariants') == old_avatar.get('baseDisplayVariants'), 'Original body/skin assets must remain unchanged')
        g.check({r['id'] for r in avatar.get('accessories',[])} == {r['id'] for r in old_avatar.get('accessories',[])}, 'Original wearable SKU inventory changed')
    if 'world' in baseline_docs:
        original_world = {(r['itemId'],r['slot']) for r in baseline_docs['world']['records']}
        g.check({(r['itemId'],r['slot']) for r in world['records']} == original_world | {('pet-space-fox','pet')}, 'Original world SKU/slot inventory changed')
    changes = {p:{'before':baseline_refs.get(p),'after':v} for p,v in refs.items() if baseline_refs.get(p)!=v}
    removals = {p:v for p,v in baseline_refs.items() if p not in refs}
    g.check(index.get('bindingChanges') == changes and index.get('bindingRemovals') == removals, 'Explicit baseline binding delta missing/wrong')
    changed_paths = {d['after'] for d in changes.values()}
    new = set(refs.values()) - pins.keys()
    declared = index.get('newAssets', {})
    g.check(set(declared) == new, 'New asset evidence coverage must equal exact unpinned reference set')
    for p in sorted(set(refs.values())):
        actual = g.image(p)
        if p in pins:
            continue
        d = declared.get(p, {})
        g.check(p.startswith('public/assets/v6.5.3/'), f'Unpinned asset outside V653 namespace: {p}')
        g.check(actual is not None and d.get('sha256') == actual['sha256'], f'New asset hash: {p}')
        g.check(actual is not None and d.get('size') == actual['size'], f'New asset dimensions: {p}')
        if actual and p.startswith('public/assets/v6.5.3/runtime/'):
            g.check(actual['size'] in ([1024,1536],[1024,1792]), f'Wearable fixed canvas/padding: {p}')
            g.check(actual['nativeAlpha'] and actual['alphaExtrema']==[0,255], f'Wearable native transparency: {p}')
        if actual:
            g.check(d.get('alphaExtrema') == actual['alphaExtrema'], f'New asset alpha contract: {p}')
        lineage = g.link(d.get('lineage'), f'lineage/{p}')
        if isinstance(lineage, dict):
            g.check(lineage.get('delivery') == {'path':p,'sha256':d.get('sha256')}, f'Lineage delivery binding: {p}')
            source_kind = lineage.get('sourceKind')
            g.check(source_kind in {'blender','imagegen'}, f'Explicit sourceKind required: {p}')
            if source_kind == 'blender':
                native = g.link(lineage.get('nativeProject'), f'nativeProject/{p}')
                g.check(native is not None and str(lineage.get('nativeProject',{}).get('path','')).endswith('.blend'), f'Native Blender project required: {p}')
                g.link(lineage.get('sceneInspection'), f'Blender scene inspection/{p}')
            elif source_kind == 'imagegen':
                g.check('hair-legend' in p, f'Imagegen exception only for approved hair-legend repair: {p}')
                g.link(lineage.get('generationTrace'), f'imagegen generation trace/{p}')
                g.link(lineage.get('prompt'), f'imagegen prompt/{p}')
                g.link(lineage.get('rawOutput'), f'imagegen raw output/{p}')
                g.check(bool(lineage.get('inputs')), f'Imagegen reference inputs required: {p}')
                for ref in lineage.get('inputs', []):
                    g.link(ref, f'imagegen input/{p}')
            src = lineage.get('source')
            if g.link(src, f'source/{p}') is not None:
                g.image(src['path'])
                if p.endswith('.webp'):
                    g.pair(src['path'], p, resize=lineage.get('operation') == 'rgba-lanczos-display', uniform_fit=lineage.get('operation')=='uniform-fit')
            g.check(lineage.get('operation') in {'native-render','lossless-webp','rgba-lanczos-display','physical-split','uniform-fit'}, f'Unrecognized native operation: {p}')
            if lineage.get('operation') == 'physical-split':
                g.check(bool(lineage.get('layers')) and bool(lineage.get('physicalReason')), f'Physical split needs layers/reason: {p}')
                for layer in lineage.get('layers', []):
                    g.link(layer, f'split-layer/{p}')
    for r in world.get('records', []):
        for a in [r.get('source'), r.get('delivery'), *r.get('displayVariants', [])]:
            if isinstance(a, dict):
                im = g.image(a['path'])
                g.check(im is not None and im['sha256'] == a.get('sha256'), f'World manifest hash {a["path"]}')
                if im and 'width' in a:
                    g.check(im['size'] == [a['width'], a['height']], f'World declared size {a["path"]}')
        if r['itemId'] in {'card-sky','pet-space-fox'}:
            expected_ratio = (2,3) if r['slot']=='card' else (6,7)
            im = g.image(r['source']['path'])
            if im:
                g.check(im['size'][0]*expected_ratio[1] == im['size'][1]*expected_ratio[0], f'Native aspect ratio: {r["itemId"]}')
                g.check(im['nativeAlpha'], f'Native alpha: {r["itemId"]}')
            g.pair(r['source']['path'], r['delivery']['path'])
            for v in r.get('displayVariants', []):
                g.pair(r['source']['path'], v['path'], resize=True)
    for kind in ('visual','runtime','negative'):
        g.evidence(index.get(kind), kind, candidate, new | changed_paths)
    # Recheck after all potentially slow reads: prevents accepting concurrent changes.
    g.check(sha(args.avatar_manifest) == candidate['avatarManifestSha256'] and sha(args.world_manifest) == candidate['worldManifestSha256'], 'Manifests changed during gate')
    if isinstance(source_pins,dict):
        for p,h in source_pins.items():
            g.check(sha(p)==h, f'Source changed during gate: {p}')
    return {'schemaVersion':1,'status':'PASS_LOCAL_ART_EVIDENCE' if not g.failures else 'FAIL',
            'candidate':candidate,'validatorSha256':sha('scripts/qa_v653_release_art.py'),'evidenceIndexSha256':sha(args.evidence_index),
            'counts':{'retainedPins':len(pins),'bindings':len(refs),'referencedImages':len(set(refs.values())),'newAssets':len(new),'decoded':len(g.images)},
            'failures':g.failures,'excludedFinderMetadata':g.excluded_metadata,'images':g.images,'verifiedLinks':g.verified_links,
            'notClaimed':['independent aesthetic review','production deployment','publication authorization','old gates rerun']}


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--avatar-manifest',required=True)
    ap.add_argument('--world-manifest',required=True)
    ap.add_argument('--evidence-index',required=True)
    ap.add_argument('--out',default='qa/v653/20261005/release-art/result.json')
    args=ap.parse_args()
    try:
        result=run(args)
    except (OSError,ValueError,KeyError,TypeError) as exc:
        result={'status':'FAIL','failures':[f'{type(exc).__name__}: {exc}'],'notClaimed':['release acceptance']}
    out=safe(args.out)
    if not out.is_relative_to(ROOT/'qa/v653/20261005/release-art'):
        raise ValueError('Output must remain in the owned release-art directory')
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:v for k,v in result.items() if k not in {'images','verifiedLinks'}},ensure_ascii=False,indent=2))
    return 0 if result['status']=='PASS_LOCAL_ART_EVIDENCE' else 1

if __name__=='__main__':
    sys.exit(main())
