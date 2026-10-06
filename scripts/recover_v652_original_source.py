"""Read the verified original project folder and restore only frozen missing bytes.

The original Drive folder is retained untouched, including its trash status.
Credentials are used only in memory, never printed or written into evidence.
"""
import concurrent.futures
import configparser
import hashlib
import json
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'qa/v653/20261005/recovery'
PINS = json.loads((OUT / 'frozen-compile-inputs.json').read_text())
ORIGINAL_SRC_ID = '1LOkUgSs5ynNJIbMut9U6OXYtR5f3XiER'
config = configparser.ConfigParser()
config.read('/Users/yuzikui/.config/rclone/rclone_recovery_dedicated.conf')
token = json.loads(config['gdrive_rescue']['token'])['access_token']

def request(url):
    req = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + token})
    return urllib.request.urlopen(req, timeout=20)

def inventory(folder, prefix):
    query = {'q': f"'{folder}' in parents", 'fields': 'files(id,name,mimeType,md5Checksum,size,trashed),nextPageToken', 'pageSize': 1000}
    with request('https://www.googleapis.com/drive/v3/files?' + urllib.parse.urlencode(query)) as response:
        listing = json.load(response)
    if listing.get('nextPageToken'):
        raise RuntimeError('Unexpected large source folder; pagination required')
    rows = []
    for entry in listing['files']:
        name = prefix + '/' + entry['name']
        if entry['mimeType'] == 'application/vnd.google-apps.folder':
            rows.extend(inventory(entry['id'], name))
        elif name in PINS:
            rows.append({'path': name, **entry})
    return rows

def recover(entry):
    name = entry['path']
    if (ROOT / name).exists():
        return {**entry, 'status': 'PRESERVED_EXISTING'}
    with request('https://www.googleapis.com/drive/v3/files/' + entry['id'] + '?alt=media') as response:
        data = response.read()
    actual = hashlib.sha256(data).hexdigest()
    source = OUT / 'original-drive-bytes' / name
    source.parent.mkdir(parents=True, exist_ok=True)
    source.write_bytes(data)
    if actual != PINS[name]:
        return {**entry, 'status': 'DIFFERENT_BYTES_NOT_RESTORED', 'sha256': actual}
    target = ROOT / name
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open('xb') as handle:
        handle.write(data)
    return {**entry, 'status': 'RESTORED_EXACT_FROZEN_SHA256', 'sha256': actual}

if __name__ == '__main__':
    entries = inventory(ORIGINAL_SRC_ID, 'src')
    (OUT / 'original-source-inventory.json').write_text(json.dumps(entries, ensure_ascii=False, indent=2))
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        rows = list(pool.map(recover, entries))
    (OUT / 'original-source-recovery.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2))
    print(json.dumps({s: sum(r['status'] == s for r in rows) for s in sorted({r['status'] for r in rows})}))
