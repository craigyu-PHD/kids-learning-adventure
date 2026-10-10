"""QA-only contact sheets from completed formal screenshots; never product assets.

Each sheet covers one SKU, one actual viewport/theme profile, and four avatars.
Original screenshots remain authoritative. This script never awards visual PASS.
"""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from qa_v653_full_shop_acceptance import AVATARS, BASE, ROOT, read_bytes, sha


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reports',type=Path,nargs='+',required=True)
    parser.add_argument('--profile',required=True)
    parser.add_argument('--attempt',required=True)
    args = parser.parse_args()
    assert args.attempt.replace('-','').replace('_','').isalnum()
    reports = [json.loads(read_bytes(p)) for p in args.reports]
    assert all(r['formal'] and not r['manifestOverride'] and not r['cssOverride'] for r in reports)
    assert all(r['candidateManifests']==reports[0]['candidateManifests'] and r['sourcePins']==reports[0]['sourcePins'] for r in reports)
    rows = {}
    for report in reports:
        for case in report['cases']:
            if case['profile']['id']!=args.profile or case['status']!='PASS_FUNCTIONAL_PENDING_VISUAL':
                continue
            key = (case['item']['id'],case['avatar'])
            assert key not in rows
            rows[key] = case
    out = BASE/('final-full-shop-'+args.attempt)
    out.mkdir(parents=True,exist_ok=True)
    font = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc',14)
    small = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc',11)
    sheets = []
    for item in reports[0]['inventory']:
        ident = item['id']
        if not all((ident,avatar) in rows for avatar in AVATARS):
            continue
        path = out/(args.profile+'--'+ident+'.png')
        cells = []
        for avatar in AVATARS:
            case = rows[(ident,avatar)]
            names = ['catalog','trialAvatar' if 'trialAvatar' in case else 'trial','home','achievement']
            if 'homeWorld' in case:
                names.append('homeWorld')
            if 'homeWorldContext' in case:
                names.append('homeWorldContext')
            if 'homeWorldReload' in case:
                names.append('homeWorldReload')
            entries = []
            for name in names:
                source = case[name]
                assert sha(ROOT/source['screenshot'])==source['screenshotSHA256']
                image = Image.open(ROOT/source['screenshot']).convert('RGB')
                original = image.size
                image.thumbnail((316,450),Image.Resampling.LANCZOS)
                entries.append((name,image,{'view':name,'path':source['screenshot'],
                    'sha256':source['screenshotSHA256'],'originalSize':original,'sheetSize':image.size}))
            cells.append((avatar,entries))
        heights = [42+sum(image.height+24 for _,image,_ in entries) for _,entries in cells]
        canvas = Image.new('RGB',(1344,max(heights)+60),'#e7edf6')
        draw = ImageDraw.Draw(canvas)
        draw.text((12,10),'QA ONLY | '+args.profile+' | '+ident,fill='#122037',font=font)
        draw.text((12,32),'Actual runtime screenshots; fit within panels. Originals retained. No automatic visual verdict.',fill='#465570',font=small)
        sources = []
        for column,(avatar,entries) in enumerate(cells):
            x=column*336;y=64
            draw.text((x+10,y),avatar,fill='#122037',font=font);y+=28
            for name,image,record in entries:
                draw.text((x+10,y),name+' '+str(record['originalSize']),fill='#465570',font=small);y+=20
                canvas.paste(image,(x+10+(316-image.width)//2,y));y+=image.height+4
                sources.append({'avatar':avatar,**record})
        canvas.save(path)
        sheets.append({'item':ident,'slot':item['slot'],'profile':args.profile,'avatars':AVATARS,
            'sheet':str(path.relative_to(ROOT)),'sha256':sha(path),'sources':sources,'visualReview':'NOT_PERFORMED'})
    index = {'scope':'QA-only screenshot contact sheets, not product assets or automatic visual acceptance',
        'candidateManifests':reports[0]['candidateManifests'],'sourcePins':reports[0]['sourcePins'],
        'generatorSHA256':sha(Path(__file__)),'profile':args.profile,'completedSKUs':len(sheets),'expectedSKUs':len(reports[0]['inventory']),
        'casesRepresented':len(sheets)*4,'sheets':sheets}
    (out/(args.profile+'--index.json')).write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:index[k] for k in ['profile','completedSKUs','expectedSKUs','casesRepresented']}))


if __name__=='__main__':
    main()
