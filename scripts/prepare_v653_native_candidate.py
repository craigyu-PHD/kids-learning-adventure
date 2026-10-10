"""Prepare pixel-exact delivery from individually reviewed native renders.

This is codec delivery and uniform catalogue fitting, never semantic painting.
The source renders, old public assets, and formal manifests are left intact.
The resulting manifest remains a candidate until actual runtime acceptance.
"""
import argparse
import copy
import hashlib
import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ROLES = ['brother', 'younger', 'sister', 'younger-sister']
parser = argparse.ArgumentParser()
parser.add_argument('--spec', required=True)
args = parser.parse_args()
spec_path = ROOT / args.spec
spec = json.loads(spec_path.read_text())
OUT = ROOT / spec['output']
OUT.mkdir(parents=True, exist_ok=False)
sha = lambda data: hashlib.sha256(data).hexdigest()
base_path = ROOT / spec['baseManifest']
base = json.loads(base_path.read_bytes())
candidate = copy.deepcopy(base)
records = {row['id']: row for row in candidate['accessories']}
report = {'status': 'PREPARING', 'baseManifestSha256': sha(base_path.read_bytes()),
          'specSha256': sha(spec_path.read_bytes()), 'rows': [], 'newItemEntries': [],
          'runtimeAcceptance': 'PENDING', 'formalManifestChanged': False,
          'legacyPublicOverwrites': 0}


def write_new(relative, data):
    file = ROOT / relative
    assert relative.startswith('public/assets/v6.5.3/'), relative
    file.parent.mkdir(parents=True, exist_ok=True)
    if file.exists():
        assert file.read_bytes() == data, f'different bytes at existing delivery: {relative}'
    else:
        file.write_bytes(data)
    return file


def delivery(source, destination, dimensions=None):
    source_file = ROOT / source
    data = source_file.read_bytes()
    im = Image.open(source_file).convert('RGBA')
    if dimensions:
        assert im.size == dimensions, (source, im.size, dimensions)
    assert im.getextrema()[3][0] == 0 and im.getextrema()[3][1] > 0, ('alpha', source)
    import io
    stream = io.BytesIO()
    im.save(stream, format='WEBP', lossless=True, exact=True, method=6)
    file = write_new(destination, stream.getvalue())
    decoded = Image.open(file).convert('RGBA')
    assert decoded.size == im.size and decoded.tobytes() == im.tobytes(), source
    report['rows'].append({'source': source, 'sourceSha256': sha(data), 'path': destination,
                           'sha256': sha(file.read_bytes()), 'size': list(im.size),
                           'rgbaSha256': sha(im.tobytes()), 'rgbaExact': True,
                           'sourceBytes': len(data), 'deliveryBytes': file.stat().st_size})
    return destination


for item_spec in spec['items']:
    item = item_spec['itemId']
    delivery_revision = item_spec.get('deliveryRevision', '')
    assert not delivery_revision or re.fullmatch(r'r[1-9][0-9]*', delivery_revision), delivery_revision
    native_label = 'native' + ('-' + delivery_revision if delivery_revision else '')
    assert item in records, item
    record = (json.loads((ROOT / item_spec['entry']).read_bytes()) if item_spec.get('entry')
              else copy.deepcopy(records[item]))
    assert record['id'] == item and record['supportedAvatars'] == ROLES
    if item_spec.get('backReplacements'):
        assert record['renderer'] == 'split-overlay'
        assert set(item_spec['backReplacements']) == set(ROLES)
        record['backVariants'] = item_spec['backReplacements']
        record['canvasTopPadding'] = 0
    if item_spec.get('headwearHairOnly'):
        assert item == 'hair-legend'
        for role in ROLES:
            for skin, detail in record['headwearHairDetails'][role].items():
                old = detail['overlay']
                destination = f'public/assets/v6.5.3/runtime/{role}/{item}--with-headwear--{skin}--lossless.webp'
                detail['overlay'] = delivery(old, destination, (1024, 1792))
    else:
        assert record['renderer'] == 'split-overlay'
        converted = {}
        for role in ROLES:
            for part in ['back', 'front']:
                values = [('default', record[part + 'Variants'], role)]
                values += [(skin, record['skin' + part.title() + 'Variants'][role], skin)
                           for skin in record.get('skin' + part.title() + 'Variants', {}).get(role, {})]
                for skin, container, key in values:
                    old = container[key]
                    if not (old.startswith('art-source/v653/') or old.startswith('public/assets/v6.5.3/')):
                        continue  # Retained front straps keep their exact original bytes and paths.
                    if old not in converted:
                        destination = f'public/assets/v6.5.3/runtime/{role}/{item}--{native_label}--{skin}--{part}.webp'
                        converted[old] = delivery(old, destination, (1024, 1536 + record['canvasTopPadding']))
                    container[key] = converted[old]
    if item_spec.get('beauty'):
        source = ROOT / item_spec['beauty']
        full = Image.open(source).convert('RGBA')
        bounds = full.getbbox()
        assert bounds
        fitted = full.crop(bounds)
        fitted.thumbnail((464, 464), Image.Resampling.LANCZOS)
        catalog = Image.new('RGBA', (512, 512))
        catalog.alpha_composite(fitted, ((512 - fitted.width) // 2, (512 - fitted.height) // 2))
        import io
        stream = io.BytesIO()
        catalog.save(stream, format='WEBP', lossless=True, exact=True, method=6)
        destination = f'public/assets/v6.5.3/catalog/{item}--native.webp'
        file = write_new(destination, stream.getvalue())
        assert Image.open(file).convert('RGBA').tobytes() == catalog.tobytes()
        record['catalogPath'] = destination
        report['rows'].append({'source': item_spec['beauty'], 'sourceSha256': sha(source.read_bytes()),
                               'path': destination, 'sha256': sha(file.read_bytes()), 'size': [512, 512],
                               'method': 'single coherent beauty, uniform alpha-bounds fitting',
                               'bounds': bounds, 'fittedSize': list(fitted.size), 'rgbaExact': True})
    position = next(i for i, row in enumerate(candidate['accessories']) if row['id'] == item)
    candidate['accessories'][position] = record
    report['newItemEntries'].append(item)

assert base_path.read_bytes() and sha(base_path.read_bytes()) == report['baseManifestSha256']
manifest_path = OUT / 'candidate-avatar-manifest.json'
manifest_path.write_text(json.dumps(candidate, ensure_ascii=False, indent=2) + '\n')
report.update(status='PIXEL_EXACT_DELIVERY_CANDIDATE_RUNTIME_PENDING',
              candidateManifestSha256=sha(manifest_path.read_bytes()),
              uniqueDeliveries=len(report['rows']))
(OUT / 'delivery-lineage.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: report[k] for k in ['status', 'candidateManifestSha256', 'uniqueDeliveries']}, ensure_ascii=False))
