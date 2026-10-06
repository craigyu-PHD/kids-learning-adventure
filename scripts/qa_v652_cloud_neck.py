"""Read-only regression for observed sister Cloud neck failures; not visual acceptance."""
import argparse
import json
from pathlib import Path
import numpy as np
from PIL import Image

SKIN = [(505, 405), (500, 425), (490, 435), (500, 435), (595, 445)]
HAIR = [(495, 405), (490, 415), (595, 405), (600, 415)]

def main():
    p = argparse.ArgumentParser()
    p.add_argument('mask', type=Path)
    args = p.parse_args()
    mask = np.asarray(Image.open(args.mask).convert('L'))
    assert mask.shape == (1536, 1024)
    errors = []
    for x, y in SKIN:
        if np.any(mask[y-1:y+2, x-1:x+2] != 255):
            errors.append(f'visible neck skin removed at {x},{y}')
    for x, y in HAIR:
        if np.any(mask[y-1:y+2, x-1:x+2] != 0):
            errors.append(f'old bob remains at {x},{y}')
    print(json.dumps({'scope': 'specific original neck and bob probes only', 'errors': errors}))
    raise SystemExit(bool(errors))

if __name__ == '__main__':
    main()
