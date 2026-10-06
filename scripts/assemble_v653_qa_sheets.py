#!/usr/bin/env python3
"""Arrange actual QA screenshots for review; never touches product art."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ROLES = ['brother', 'younger', 'sister', 'younger-sister']
PROFILES = ['desktop-light', 'desktop-dark', 'mobile-light', 'mobile-dark']


def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--report', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--item')
    ap.add_argument('--profile')
    args = ap.parse_args()
    rp = ROOT / args.report
    out = (ROOT / args.out).resolve()
    if not out.is_relative_to(ROOT / 'qa/v653/20261005'):
        raise ValueError('QA output only')
    data = json.loads(rp.read_text())
    rows = data['cases']
    ids = list(dict.fromkeys(r['item']['id'] for r in rows))
    if args.item:
        ids = [args.item]
    out.mkdir(parents=True, exist_ok=True)
    font = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 14)
    records = []
    for ident in ids:
        selected = [r for r in rows if r['item']['id'] == ident]
        if args.profile:
            selected = [r for r in selected if r['profile']['id'] == args.profile]
            if len(selected) != 4:
                continue
            stages = ['trialAvatar', 'home', 'achievement', 'catalog']
            cell_w, cell_h = 460, 430
            sheet = Image.new('RGB', (cell_w * 4, cell_h * 4), '#e6eaf1')
            draw = ImageDraw.Draw(sheet)
            proofs = []
            for row in selected:
                col = ROLES.index(row['avatar'])
                for line, stage in enumerate(stages):
                    actual_stage = stage if stage in row else 'trial'
                    proof = row[actual_stage]
                    p = ROOT / proof['screenshot']
                    h = digest(p)
                    if h != proof['screenshotSHA256']:
                        raise ValueError(f'Changed actual screenshot {p}')
                    im = Image.open(p).convert('RGB')
                    im.thumbnail((cell_w - 16, cell_h - 48), Image.Resampling.LANCZOS)
                    x, y = col * cell_w, line * cell_h
                    draw.text((x + 8, y + 6), f'{ident} / {row["avatar"]}', font=font, fill='#172444')
                    draw.text((x + 8, y + 24), args.profile + ' / ' + actual_stage, font=font, fill='#172444')
                    sheet.paste(im, (x + (cell_w - im.width)//2, y + 46))
                    proofs.append({'path': proof['screenshot'], 'sha256': h,
                                   'avatar': row['avatar'], 'profile': row['profile']['id'],
                                   'stage': actual_stage, 'assets': proof['proof'].get('urls', []),
                                   'actualRect': proof.get('rect')})
            dest = out / f'{ident}--{args.profile}.png'
            sheet.save(dest)
            records.append({'itemId': ident, 'profile': args.profile,
                            'sheet': str(dest.relative_to(ROOT)), 'sha256': digest(dest),
                            'screenshotProofs': proofs})
            continue
        if len(selected) != 16:
            continue
        for stage in ['trialAvatar', 'home', 'achievement', 'catalog']:
            cell_w, cell_h = (460, 430) if stage == 'trialAvatar' else (400, 340)
            sheet = Image.new('RGB', (cell_w * 4, cell_h * 4), '#e6eaf1')
            draw = ImageDraw.Draw(sheet)
            proofs = []
            for row in selected:
                col = ROLES.index(row['avatar'])
                line = PROFILES.index(row['profile']['id'])
                proof = row.get(stage, row.get('trial'))
                if not proof:
                    raise ValueError(f'Missing screenshot stage {ident} {stage}')
                p = ROOT / proof['screenshot']
                h = digest(p)
                if h != proof['screenshotSHA256']:
                    raise ValueError(f'Changed actual screenshot {p}')
                im = Image.open(p).convert('RGB')
                # Keep actual pixels whenever they fit. Only uniform downscale
                # of an entire screenshot is permitted for oversized UI cards.
                im.thumbnail((cell_w - 16, cell_h - 48), Image.Resampling.LANCZOS)
                x, y = col * cell_w, line * cell_h
                draw.text((x + 8, y + 6), f'{ident} / {row["avatar"]}', font=font, fill='#172444')
                draw.text((x + 8, y + 24), row['profile']['id'] + ' / ' + stage, font=font, fill='#172444')
                sheet.paste(im, (x + (cell_w - im.width)//2, y + 46))
                proofs.append({'path': proof['screenshot'], 'sha256': h,
                               'avatar': row['avatar'], 'profile': row['profile']['id'],
                               'assets': proof['proof'].get('urls', []),
                               'actualRect': proof.get('rect')})
            dest = out / f'{ident}--{stage}.png'
            sheet.save(dest)
            records.append({'itemId': ident, 'stage': stage,
                            'sheet': str(dest.relative_to(ROOT)), 'sha256': digest(dest),
                            'screenshotProofs': proofs})
    index = {'status': 'ARRANGED_ACTUAL_SCREENSHOTS_REVIEW_PENDING',
             'scope': 'QA layout only. No painted, replaced, warped, or composited product assets.',
             'report': args.report, 'records': records}
    (out / 'index.json').write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'sheets': len(records), 'out': str(out)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
