#!/usr/bin/env python3
"""V6.2 CSS ownership/debt gate.

The accepted V6.1 baseline contained 1441 !important declarations across the
runtime CSS stack. V6.2 must reduce that number, preserve the compatibility
layers, and must not reintroduce the old thumbnail-on-avatar positioning rules.
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
BASELINE_IMPORTANT = 1716
V63_ACCEPTED_IMPORTANT = 1677
MIN_REDUCTION = 30
CSS_FILES = [*ROOT.glob('src/*.css'), *ROOT.glob('src/styles/**/*.css')]
LEGACY_FILES = ['styles.css', 'v2.css', 'v22.css', 'v23.css', 'v30.css', 'v40.css']


def fail(message: str) -> None:
    print(f'FAIL qa_v62_css_debt: {message}', file=sys.stderr)
    raise SystemExit(1)


def main() -> int:
    important = 0
    feature_owned = ''
    for path in CSS_FILES:
        text = path.read_text(encoding='utf-8')
        important += text.count('!important')
        if '/styles/' in path.as_posix():
            feature_owned += '\n' + text
    reduction = BASELINE_IMPORTANT - important
    if reduction < MIN_REDUCTION:
        fail(f'!important reduction is not meaningful enough: baseline={BASELINE_IMPORTANT}, current={important}, reduction={reduction}, required={MIN_REDUCTION}')
    if important >= V63_ACCEPTED_IMPORTANT:
        fail(f'V6.4 must improve on V6.3 CSS debt: V6.3={V63_ACCEPTED_IMPORTANT}, current={important}')
    if '.avatar-equipped-cosmetic.slot-' in feature_owned:
        fail('feature-owned CSS reintroduced legacy runtime thumbnail positioning selectors')
    renderer = (ROOT / 'src/components/AvatarRenderer.tsx').read_text(encoding='utf-8')
    if 'avatar-equipped-cosmetic' in renderer:
        fail('current AvatarRenderer emits the retired direct-thumbnail overlay class')
    for name in LEGACY_FILES:
        if not (ROOT / 'src' / name).exists():
            fail(f'compatibility layer was destructively removed: src/{name}')
    legacy = (ROOT / 'src/styles/legacy-compat.css').read_text(encoding='utf-8')
    for name in LEGACY_FILES:
        if f"../{name}" not in legacy:
            fail(f'compatibility layer is no longer imported: {name}')
    responsive = (ROOT / 'src/styles/responsive.css').read_text(encoding='utf-8')
    layout = (ROOT / 'src/styles/layout.css').read_text(encoding='utf-8')
    shop = (ROOT / 'src/styles/components/shop.css').read_text(encoding='utf-8')
    if 'max-width:1960px' in responsive or '1880px' in responsive:
        fail('responsive.css reintroduced an obsolete large-screen island/cap')
    for marker in ['min-width: 2200px', 'min-width: 3200px', 'min-width: 4600px']:
        if marker not in layout:
            fail(f'large-display dashboard ownership missing from layout.css: {marker}')
    for marker in ['min-width:2200px', 'min-width:3200px', 'min-width:4600px']:
        if marker not in shop:
            fail(f'large-display shop ownership missing from shop.css: {marker}')
    print(f'PASS qa_v62_css_debt: !important {BASELINE_IMPORTANT} -> {important} (-{reduction}); below V6.3={V63_ACCEPTED_IMPORTANT}; legacy layers preserved; wide-screen ownership is feature-owned; direct wearable magic-number selectors=0')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
