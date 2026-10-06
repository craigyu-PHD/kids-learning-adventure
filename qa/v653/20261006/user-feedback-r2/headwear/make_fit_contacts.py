#!/usr/bin/env python3
"""Build pixel-preserving review contacts from actual compiled Shop captures.

Raw screenshot references remain the acceptance evidence. This script reads
reports/PNGs only, copies full-person originals byte for byte, and crops without
resampling. Contact sheets never assert visual acceptance.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import shutil
import textwrap
from PIL import Image, ImageDraw, ImageFont

ROLES = ['brother', 'younger', 'sister', 'younger-sister']
SKINS = ['default', 'outfit-cadet', 'outfit-legend', 'outfit-mage',
         'outfit-mecha', 'outfit-ocean', 'outfit-racer', 'sister-bloom-outfit']
REGION = {'left': 192, 'top': -256, 'right': 832, 'bottom': 540}

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def identity(row):
    return tuple(row[k] for k in ('group', 'role', 'skin', 'itemSet'))

def resolve_screenshot(value, report, root):
    p = Path(value)
    candidates = [p] if p.is_absolute() else [root / p, report.parent / p]
    # A report may be an exact copy from the compiled stage. Prefer its exact
    # sibling PNG copy, then verify the original recorded screenshot SHA.
    if p.is_absolute() and report.parent.name in p.parts:
        at = p.parts.index(report.parent.name)
        candidates.insert(0, report.parent.joinpath(*p.parts[at+1:]))
    present = [c.resolve() for c in candidates if c.is_file()]
    if not present:
        raise FileNotFoundError(f'Raw screenshot unavailable: {value}')
    return present[0]

def font(size):
    for path in ['/System/Library/Fonts/PingFang.ttc',
                 '/System/Library/Fonts/Supplemental/Arial.ttf',
                 '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
        if Path(path).is_file():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()

def rect_value(rect, key):
    return rect[key] if key in rect else rect[{'x': 'left', 'y': 'top'}[key]]

def head_box(capture, size):
    body = next((i for i in capture['proof']['images']
                 if 'avatar-renderer-skin' in i.get('cls', '').split()), None)
    if not body:
        raise ValueError('Actual body DOM rectangle is required; no guessed crop')
    r, canvas = body['rect'], capture['rect']
    if min(r['width'], r['height'], canvas['width'], canvas['height']) <= 0:
        raise ValueError('Zero-sized DOM rectangle')
    # The wardrobe canvas is always 1024 x 1536. Its lower-resolution Home
    # delivery has the same aspect ratio, but this input is the actual Shop.
    if abs(r['width'] / r['height'] - 1024 / 1536) > .005:
        raise ValueError('Unexpected body canvas aspect ratio')
    sx, sy = r['width'] / 1024, r['height'] / 1536
    dx, dy = rect_value(r, 'x') - rect_value(canvas, 'x'), rect_value(r, 'y') - rect_value(canvas, 'y')
    px, py = size[0] / canvas['width'], size[1] / canvas['height']
    requested = [math.floor((dx + REGION['left'] * sx) * px),
                 math.floor((dy + REGION['top'] * sy) * py),
                 math.ceil((dx + REGION['right'] * sx) * px),
                 math.ceil((dy + REGION['bottom'] * sy) * py)]
    box = [max(0, requested[0]), max(0, requested[1]),
           min(size[0], requested[2]), min(size[1], requested[3])]
    if box[2] <= box[0] or box[3] <= box[1]:
        raise ValueError('Head region does not intersect original screenshot')
    return box, {'canonicalBodyRegion': REGION, 'bodyDOMRect': r,
                 'captureDOMRect': canvas, 'screenshotPixelScale': [px, py],
                 'requestedPixelBox': requested, 'cropPixelBox': box,
                 'requestedRegionClampedToScreenshot': requested != box}

def prepare_row(row, origin, out, root, raw_origin=None):
    rid = hashlib.sha256('\0'.join(identity(row)).encode()).hexdigest()[:20]
    record = {k: row[k] for k in ('group', 'role', 'skin', 'itemSet', 'targetItemId')}
    record.update(identityId=rid, rawStatus=row.get('status'), report=str(origin),
                  visualDecision='NOT_REVIEWED', acceptanceImages=[], rawOrigin=raw_origin, runtimeOperator='root-compiled-fit')
    cap = row.get('shopCapture')
    if not cap:
        record.update(contactStatus='MISSING_ACTUAL_SHOP_CAPTURE', rawError=row.get('error'))
        return record
    src = resolve_screenshot(cap['screenshot'], origin, root)
    actual = sha(src)
    if actual != cap['screenshotSHA256']:
        raise ValueError(f'Raw screenshot SHA mismatch: {src}')
    im = Image.open(src)
    if im.format != 'PNG':
        raise ValueError(f'Raw capture must be PNG: {src}')
    im.load()
    box, geometry = head_box(cap, im.size)
    full = out / 'fullperson' / f'{rid}.png'
    crop = out / 'heads' / f'{rid}.png'
    shutil.copyfile(src, full)
    if sha(full) != actual:
        raise ValueError('Original copy changed bytes')
    head = im.crop(tuple(box))
    head.save(crop, 'PNG')
    reloaded = Image.open(crop)
    if reloaded.mode != head.mode or reloaded.tobytes() != head.tobytes():
        raise ValueError('Crop encoding changed source pixels')
    record.update(contactStatus='CROPPED_WITHOUT_RESAMPLING', sourceSize=list(im.size),
                  geometry=geometry, source={'path': str(src), 'sha256': actual}, recordedScreenshotPath=cap['screenshot'],
                  acceptanceImages=[{'path': str(src), 'sha256': actual}],
                  fullpersonCopy={'path': str(full), 'sha256': sha(full)},
                  headCrop={'path': str(crop), 'sha256': sha(crop), 'size': list(head.size)},
                  resampled=False, sourcePixelsPreserved=True)
    return record

def contact(group_key, records, skins, page, out):
    group, target, item_set = group_key
    available = [r for r in records.values() if 'headCrop' in r]
    width = max([240] + [r['headCrop']['size'][0] + 24 for r in available])
    head_height = max([180] + [r['headCrop']['size'][1] for r in available])
    header, label_height, gutter = 110, 125, 12
    cell_height = head_height + label_height + 24
    sheet = Image.new('RGB', (width * 4 + gutter * 5,
                            header + cell_height * 4 + gutter * 5), '#f7f8fc')
    draw = ImageDraw.Draw(sheet)
    draw.text((16, 12), f'實際 Shop 看圖輔助｜{target}｜{page + 1}/2', font=font(20), fill='#18243a')
    draw.text((16, 42), group, font=font(14), fill='#34425b')
    for n, line in enumerate(textwrap.wrap(item_set, width=105)):
        draw.text((16, 63 + 18*n), line, font=font(14), fill='#34425b')
    cells = []
    for sy, skin in enumerate(skins):
        for rx, role in enumerate(ROLES):
            x, y = gutter + rx * (width + gutter), header + gutter + sy * (cell_height + gutter)
            draw.rectangle((x, y, x+width-1, y+cell_height-1), fill='white', outline='#bcc5d6')
            rec = records.get((role, skin))
            if not rec:
                draw.text((x+10, y+20), '缺少此 raw row', font=font(16), fill='#ad243a')
                cells.append({'role':role,'skin':skin,'status':'MISSING_RAW_ROW'})
                continue
            if 'headCrop' in rec:
                with Image.open(rec['headCrop']['path']) as crop:
                    at = (x + (width-crop.width)//2, y+10)
                    sheet.paste(crop.convert('RGB'), at)
                    check = sheet.crop((at[0],at[1],at[0]+crop.width,at[1]+crop.height))
                    if check.tobytes() != crop.convert('RGB').tobytes():
                        raise ValueError('Contact sheet changed crop pixels')
                position = {'x':at[0],'y':at[1],'width':crop.width,'height':crop.height}
            else:
                draw.text((x+10, y+20), '缺少 actual Shop PNG', font=font(15), fill='#ad243a')
                position = None
            # Labels are outside the pasted source pixels. Every cell carries
            # all four identity fields, even when the header repeats itemSet.
            lines = [rec['group'], f"{role} | {skin}"]
            lines += textwrap.wrap(rec['itemSet'], width=max(20,(width-20)//7))
            lines += [rec.get('rawStatus') or rec['contactStatus']]
            for n, line in enumerate(lines):
                draw.text((x+10,y+head_height+20+n*16), line, font=font(12),
                          fill='#ad243a' if line.startswith('FAIL') else '#24324a')
            cells.append({'identityId':rec['identityId'],'role':role,'skin':skin,
                          'group':group,'itemSet':item_set,'targetItemId':target,
                          'pastedCropRect':position,'headCrop':rec.get('headCrop'),
                          'acceptanceImages':rec['acceptanceImages']})
    slug = hashlib.sha256('\0'.join(group_key).encode()).hexdigest()[:12]
    path = out/'sheets'/f'{target}--{slug}--skins-{page+1}.png'
    sheet.save(path,'PNG')
    return {'group':group,'targetItemId':target,'itemSet':item_set,'skins':skins,
            'path':str(path),'sha256':sha(path),'cells':cells,'resampled':False}

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--reports', nargs='+', type=Path, required=True)
    ap.add_argument('--retry-report', type=Path, help='Fresh retry may replace only an original FAIL with identical identity and source/artifact pins')
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--root', type=Path, default=Path.cwd())
    ap.add_argument('--cases', type=Path)
    ap.add_argument('--expected-count', type=int, default=608)
    ap.add_argument('--allow-incomplete', action='store_true')
    args = ap.parse_args()
    out, root = args.out.resolve(), args.root.resolve()
    if out.exists():
        ap.error('Output already exists; preserve earlier review evidence and choose a new folder')
    rows, report_pins, origins, report_meta = {}, [], {}, {}
    for report in args.reports:
        report = report.resolve()
        raw = report.read_bytes(); data = json.loads(raw)
        pin={'path':str(report),'sha256':hashlib.sha256(raw).hexdigest(),
             'status':data.get('status'),'candidateId':data.get('candidateId'),
             'runner':data.get('runner'),'sourcePins':data.get('sourcePins'),'artifactPins':data.get('artifactPins')}
        report_pins.append(pin);report_meta[report]=pin
        for row_index,row in enumerate(data.get('rows',[])):
            key = identity(row)
            if key in rows:
                raise ValueError(f'Duplicate raw identity: {key}')
            rows[key] = (row, report)
            origins[key]={'report':pin,'rowIndex':row_index,'jsonPointer':f'/rows/{row_index}',
                          'globalCaseIndex':row.get('index'),'selection':'original-success'}
    retry_selections=[]
    if args.retry_report:
        report=args.retry_report.resolve();raw=report.read_bytes();data=json.loads(raw)
        pin={'path':str(report),'sha256':hashlib.sha256(raw).hexdigest(),
             'status':data.get('status'),'candidateId':data.get('candidateId'),'runner':data.get('runner'),
             'sourcePins':data.get('sourcePins'),'artifactPins':data.get('artifactPins')}
        for field in ['candidateId','sourcePins','artifactPins']:
            if any(p[field]!=pin[field] for p in report_pins):raise ValueError(f'Retry changed {field}')
        seen=set()
        for row_index,row in enumerate(data.get('rows',[])):
            key=identity(row)
            if key in seen or key not in rows:raise ValueError(f'Unknown or duplicate retry identity: {key}')
            seen.add(key);old,old_report=rows[key]
            if old.get('status')!='FAIL':raise ValueError(f'Retry cannot replace a non-FAIL observation: {key}')
            required=['sameBodySize','correctLayers','noMissingAssets']+(['frontPreserved'] if row['group']=='retainedEarwearHairFit' else [])
            if not row.get('status','').startswith('PASS') or any(row.get(k) is not True for k in required):
                raise ValueError(f'Retry lacks true functional observations: {key}')
            if row['targetItemId']!=old['targetItemId']:raise ValueError('Retry target changed')
            previous={**origins[key],'rawStatus':old['status'],'rawError':old.get('error')}
            origins[key]={'report':pin,'rowIndex':row_index,'jsonPointer':f'/rows/{row_index}',
                          'globalCaseIndex':row.get('index'),'selection':'fresh-retry-success',
                          'supersededFailedObservation':previous}
            rows[key]=(row,report);retry_selections.append({'identity':dict(zip(['group','role','skin','itemSet'],key)),
                                                        'selected':origins[key],'originalFailureRetained':True})
        report_pins.append(pin);report_meta[report]=pin
    candidates = {p['candidateId'] for p in report_pins}
    if len(candidates) != 1:
        raise ValueError('Do not combine reports from different compiled candidates')
    wanted = {identity(r):r for r in json.loads(args.cases.read_bytes())} if args.cases else {k:v[0] for k,v in rows.items()}
    if not set(rows) <= set(wanted):
        raise ValueError('Report contains identity outside the requested case matrix')
    if len(wanted) != args.expected_count or (len(rows) != args.expected_count and not args.allow_incomplete):
        raise ValueError(f'Expected {args.expected_count} identities, got {len(wanted)} planned / {len(rows)} raw')
    for key,(row,_) in rows.items():
        if row['role'] not in ROLES or row['skin'] not in SKINS:
            raise ValueError(f'Unknown role/skin: {key}')
        if row['targetItemId'] != wanted[key]['targetItemId']:
            raise ValueError(f'Unexpected review target: {key}')
    out.mkdir(parents=True)
    for name in ['fullperson','heads','sheets']:(out/name).mkdir()
    prepared = [prepare_row(row,origin,out,root,origins[key]) for key,(row,origin) in rows.items()]
    by_identity = {identity(r):r for r in prepared}
    groups = {}
    for key,row in wanted.items():
        group_key=(row['group'],row['targetItemId'],row['itemSet'])
        groups.setdefault(group_key,{})
        if key in by_identity:groups[group_key][(row['role'],row['skin'])]=by_identity[key]
    sheets=[]
    for key, records in sorted(groups.items()):
        for page in range(2):sheets.append(contact(key,records,SKINS[page*4:page*4+4],page,out))
    for pin in report_pins:
        if sha(pin['path']) != pin['sha256']:
            raise ValueError('Input report changed during contact generation; output is invalid')
    complete = len(prepared)==args.expected_count and all('headCrop' in r for r in prepared)
    result={'status':'CONTACTS_READY_PENDING_VISUAL_REVIEW' if complete else 'INCOMPLETE_RAW_EVIDENCE',
            'candidateId':next(iter(candidates)),'expectedRows':args.expected_count,
            'rawRows':len(prepared),'reportPins':report_pins,'retrySelections':retry_selections,
            'observationScope':{'originalSuccesses':len(prepared)-len(retry_selections),'freshRetrySuccesses':len(retry_selections),
                'originalFailedReportsRemainFailed':True,'topLevelShardStatusesAreNotReclassified':True},
            'script':{'path':str(Path(__file__).resolve()),'sha256':sha(__file__)},
            'cases':{'path':str(args.cases.resolve()),'sha256':sha(args.cases)} if args.cases else None,
            'acceptanceRule':'Each gate row must reference the original actual Shop PNG and SHA in acceptanceImages. Crops and contacts are auxiliary only.',
            'pixelRule':'No resize, no geometric transforms, no source retouching. All pasted crop pixels are compared byte-for-byte in RGB.',
            'rows':prepared,'sheets':sheets,'visualReview':'NOT_PERFORMED'}
    (out/'index.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'status':result['status'],'rawRows':len(prepared),'sheets':len(sheets),'index':str(out/'index.json')}))
    return 0 if complete or args.allow_incomplete else 2

if __name__=='__main__':
    raise SystemExit(main())
