#!/usr/bin/env python3
from __future__ import annotations
import argparse
import base64
import hashlib
import json
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "qa/v65/art-workpacks/B08/runtime"
BOARDS = BASE / "runtime-visual-review-boards"
OUT = BASE / "actual-visual-review"
ITEMS = ("glasses-holo", "glasses-legend", "sister-heart-glasses")
AVATARS = ("brother", "younger", "sister", "younger-sister")
ALL_MODELS = ("gemma3:4b", "gemma3:12b")
CHECKS = (
    "eyes_readable",
    "natural_face_fit",
    "frame_bridge_temples_structure",
    "lens_transparency",
    "temples_ear_contact",
    "no_float_clip_intersection",
    "single_glasses",
    "design_identity",
    "shop_home_consistency",
    "light_dark_consistency",
    "viewport_consistency",
    "character_identity_preserved",
)

SCHEMA = {
    "type": "object",
    "properties": {
        "decision": {"type": "string", "enum": ["PASS", "FAIL"]},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        "checks": {
            "type": "object",
            "properties": {k: {"type": "string", "enum": ["PASS", "FAIL"]} for k in CHECKS},
            "required": list(CHECKS),
        },
        "blocking_issues": {"type": "array", "items": {"type": "string"}},
        "observations": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["decision", "confidence", "checks", "blocking_issues", "observations"],
}

ITEM_IDENTITY = {
    "glasses-holo": "translucent cyan/ice-blue HUD glasses with restrained non-text HUD detailing; never a full-face visor",
    "glasses-legend": "champagne/amber gold rounded metallic frame with pale translucent gold lenses; never solid-yellow patches",
    "sister-heart-glasses": "TWO genuine 3D heart-shaped lens frames joined by a real nose bridge with full temples; never a bow",
}


def build_prompt(item_id: str) -> str:
    identity = ITEM_IDENTITY[item_id]
    return f"""You are a strict visual QA inspector for a premium children's 3D avatar wardrobe. Review ONE item x ONE avatar row only. The supplied evidence board contains eight ACTUAL WEBSITE screenshots: Shop Trial and Home, each at 390 and 1440, Light and Night. Evaluate only what is visibly supported by the pixels.

THIS ROW itemId is exactly: {item_id}
Do not discuss, name, or judge any other product. If you find yourself referring to another itemId, discard that interpretation and reassess the supplied row.

Required item identity for THIS ROW only:
{identity}

This row is GLASSES. Required visual contract:
1. both eyes remain readable; lenses must be clearly transparent or semi-transparent rather than opaque blocks;
2. frames have plausible 3D thickness, a visible nose bridge, and complete temple arms; the glasses must read as a wearable premium storybook 3D object rather than a flat sticker;
3. bridge aligns naturally with the nose; temples visibly extend toward and contact the ears without floating;
4. no clipping through eyes/face/hair, no severe intersection, no detached object, no duplicate pair;
5. scale and vertical/horizontal position are plausible for this character and do not cover most of the face;
6. THIS ROW's design identity is stable across all eight screenshots;
7. Shop vs Home, Light vs Night, and 390 vs 1440 are visually consistent;
8. character identity/face is preserved.

FAIL a check if the evidence visibly violates it or if a blocking defect makes it unreliable. Do not grant PASS merely because the page renders. Return ONLY JSON matching the supplied schema. decision must be PASS only when every check is PASS and blocking_issues is empty."""



def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def call(model: str, board: Path, item_id: str, timeout=240):
    payload = {
        "model": model,
        "stream": False,
        "format": SCHEMA,
        "options": {"temperature": 0, "seed": 65},
        "messages": [
            {
                "role": "user",
                "content": build_prompt(item_id),
                "images": [base64.b64encode(board.read_bytes()).decode("ascii")],
            }
        ],
    }
    req = urllib.request.Request(
        "http://127.0.0.1:11434/api/chat",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    t = time.time()
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = json.load(r)
    content = raw.get("message", {}).get("content", "")
    try:
        resp = json.loads(content)
    except Exception as e:
        raise RuntimeError(f"invalid model JSON: {content[:1000]}") from e
    checks = resp.get("checks", {})
    deterministic = "PASS" if all(checks.get(k) == "PASS" for k in CHECKS) and not resp.get("blocking_issues") else "FAIL"
    if resp.get("decision") != deterministic:
        resp["decision"] = deterministic
    return resp, round(time.time() - t, 2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", nargs="*", default=list(ALL_MODELS))
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)

    rows = []
    jobs = [(item, avatar) for item in ITEMS for avatar in AVATARS]
    if args.limit:
        jobs = jobs[: args.limit]

    for item, avatar in jobs:
        board = BOARDS / f"{item}__{avatar}.jpg"
        if not board.exists():
            raise SystemExit(f"missing board {board}")
        row = {
            "itemId": item,
            "avatarId": avatar,
            "board": str(board.relative_to(ROOT)),
            "boardSha256": sha(board),
            "models": {},
        }
        for model in args.models:
            resp, elapsed = call(model, board, item)
            ev = {
                "itemId": item,
                "avatarId": avatar,
                "model": model,
                "board": str(board.relative_to(ROOT)),
                "boardSha256": sha(board),
                "response": resp,
                "deterministicDecision": resp["decision"],
                "elapsed_s": elapsed,
                "reviewerPromptVersion": "b08-item-specific-v2",
            }
            path = OUT / f"{item}__{avatar}__{model.replace(':', '-')}.json"
            path.write_text(json.dumps(ev, ensure_ascii=False, indent=2) + "\n")
            row["models"][model] = {
                "decision": resp["decision"],
                "confidence": resp.get("confidence"),
                "blockingIssues": resp.get("blocking_issues", []),
                "evidence": str(path.relative_to(ROOT)),
                "evidenceSha256": sha(path),
            }
            print(
                json.dumps(
                    {
                        "item": item,
                        "avatar": avatar,
                        "model": model,
                        "decision": resp["decision"],
                        "confidence": resp.get("confidence"),
                        "blocking": resp.get("blocking_issues", []),
                        "elapsed_s": elapsed,
                    },
                    ensure_ascii=False,
                ),
                flush=True,
            )
        row["rowDecision"] = (
            "PASS"
            if len(row["models"]) == len(args.models)
            and all(x["decision"] == "PASS" and not x["blockingIssues"] for x in row["models"].values())
            else "FAIL"
        )
        rows.append(row)

    full = len(jobs) == 12 and set(args.models) == set(ALL_MODELS)
    summary = {
        "schemaVersion": 1,
        "suite": "v65-b08-actual-runtime-dual-model-visual-review",
        "models": args.models,
        "requiredAgreement": "both models PASS with zero blocking issues",
        "rows": rows,
        "rowsPassed": sum(r["rowDecision"] == "PASS" for r in rows),
        "rowsTotal": len(rows),
        "status": (
            "PASS"
            if full and all(r["rowDecision"] == "PASS" for r in rows)
            else ("FAIL" if full else "PARTIAL")
        ),
    }
    summary_path = BASE / "actual-visual-review-summary.json"
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    print(
        json.dumps(
            {
                "status": summary["status"],
                "rowsPassed": summary["rowsPassed"],
                "rowsTotal": summary["rowsTotal"],
                "summary": str(summary_path.relative_to(ROOT)),
            },
            ensure_ascii=False,
        ),
        flush=True,
    )
    return 0 if summary["status"] in ("PASS", "PARTIAL") else 1


if __name__ == "__main__":
    raise SystemExit(main())
