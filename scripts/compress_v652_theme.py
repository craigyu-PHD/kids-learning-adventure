"""Compress built-in imagegen output without painting, cropping or compositing."""
import argparse
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument("source", type=Path)
parser.add_argument("destination", type=Path)
parser.add_argument("--width", type=int)
args = parser.parse_args()
if args.destination.exists():
    raise SystemExit("Refusing to overwrite existing theme asset")
args.destination.parent.mkdir(parents=True, exist_ok=True)
with Image.open(args.source) as image:
    if args.width:
        image = image.resize((args.width, round(image.height * args.width / image.width)), Image.Resampling.LANCZOS)
    image.save(args.destination, "WEBP", quality=88, method=6)
    print(f"{args.destination}: {image.size}, {args.destination.stat().st_size} bytes")
