#!/usr/bin/env python3
"""Read-only current-release admission, preserving historical gate scripts."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / 'qa/v653/20261005/release-art/final/evidence-index.json'


def main():
    pointer_path = ROOT / 'qa/v653/CURRENT-RELEASE.json'
    if pointer_path.exists():
        pointer = json.loads(pointer_path.read_bytes())
        if pointer.get('kind') == 'little-explorers-feedback-release':
            if pointer.get('schemaVersion') != 1:
                raise ValueError('Invalid feedback release pointer')
            link = pointer['index']
            candidate_index = (ROOT / link['path']).resolve()
            if not candidate_index.is_relative_to(ROOT):
                raise ValueError('Feedback release index outside build stage')
            if hashlib.sha256(candidate_index.read_bytes()).hexdigest() != link['sha256']:
                raise ValueError('Feedback release index changed')
            return subprocess.run([
                sys.executable, 'scripts/qa_v653_feedback_release.py',
                '--index', str(candidate_index.relative_to(ROOT)),
                '--expected-index-sha', link['sha256'], '--phase', 'prebuild', '--negative-controls',
                '--out', f'qa/v653/20261006/user-feedback-r2/release/gate-prebuild-{uuid4().hex}.json',
            ], cwd=ROOT, timeout=3600).returncode
        if pointer.get('schemaVersion') != 1 or pointer.get('kind') != 'little-explorers-incremental-release':
            raise ValueError('Invalid incremental release pointer')
        link = pointer['index']
        candidate_index = (ROOT / link['path']).resolve()
        if not candidate_index.is_relative_to(ROOT):
            raise ValueError('Incremental release index outside build stage')
        if hashlib.sha256(candidate_index.read_bytes()).hexdigest() != link['sha256']:
            raise ValueError('Incremental release index changed')
        # The independent validator checks exact sources, unchanged admitted
        # artwork and explicit dependency-bound new/carry evidence. It never
        # rewrites the original published art gate or its reports.
        return subprocess.run([
            sys.executable, 'scripts/qa_v653_incremental_release.py',
            '--index', str(candidate_index.relative_to(ROOT)),
            '--expected-index-sha', link['sha256'],
            '--out', f'qa/v653/20261006/full-goal-audit/incremental-release/prebuild-{uuid4().hex}.json',
        ], cwd=ROOT, timeout=600).returncode
    index = json.loads(INDEX.read_bytes())
    motion = index['currentMotionProof']
    proof = (ROOT / motion['path']).resolve()
    if not proof.is_relative_to(ROOT):
        raise ValueError('Motion proof outside build stage')
    if hashlib.sha256(proof.read_bytes()).hexdigest() != motion['sha256']:
        raise ValueError('Motion proof changed')
    commands = [
        ['node', 'node_modules/tsx/dist/cli.mjs', 'scripts/qa_v64_hero_manifest.ts'],
        ['node', 'node_modules/tsx/dist/cli.mjs', 'scripts/qa_v64_brand_display.ts'],
        [sys.executable, 'scripts/qa_v653_release_art.py',
         '--avatar-manifest', 'src/data/avatarAssetManifest.json',
         '--world-manifest', 'src/data/worldArtManifest.json',
         '--evidence-index', str(INDEX.relative_to(ROOT)),
         '--out', 'qa/v653/20261005/release-art/final/prebuild-art-result.json'],
        [sys.executable, 'scripts/qa_v653_retained_motion.py',
         '--avatar-manifest', 'src/data/avatarAssetManifest.json',
         '--world-manifest', 'src/data/worldArtManifest.json',
         '--current-proof', motion['path'],
         '--out', 'qa/v653/20261005/release-art/retained-motion/prebuild-current-result.json'],
    ]
    env = dict(os.environ)
    env['PYTHONDONTWRITEBYTECODE'] = '1'
    for command in commands:
        result = subprocess.run(command, cwd=ROOT, env=env, timeout=600)
        if result.returncode:
            return result.returncode
    print('PASS V6.5.3 current art/hero/brand/motion admission; historical gates remain archived.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
