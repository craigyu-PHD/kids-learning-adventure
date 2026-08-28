from __future__ import annotations

import hashlib
import sys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
V5 = ROOT / "public/assets/v5"
V40 = ROOT / "public/assets/v40"
FAILURES: list[str] = []


def fail(message: str) -> None:
    FAILURES.append(message)
    print(f"FAIL  {message}")


def passed(message: str) -> None:
    print(f"PASS  {message}")


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require_file(path: Path, minimum_bytes: int = 1_000) -> bool:
    if not path.is_file():
        fail(f"missing {path.relative_to(ROOT)}")
        return False
    if path.stat().st_size < minimum_bytes:
        fail(f"undersized {path.relative_to(ROOT)} ({path.stat().st_size} bytes)")
        return False
    return True


def require_image(path: Path, size: tuple[int, int], alpha: bool = False) -> bool:
    if not require_file(path):
        return False
    with Image.open(path) as image:
        if image.size != size:
            fail(f"{path.relative_to(ROOT)} is {image.size}, expected {size}")
            return False
        if alpha:
            rgba = image.convert("RGBA")
            histogram = rgba.getchannel("A").histogram()
            transparent_ratio = histogram[0] / (rgba.width * rgba.height)
            if transparent_ratio <= 0.05:
                fail(f"{path.relative_to(ROOT)} has no meaningful alpha ({transparent_ratio:.2%})")
                return False
    return True


def require_unique(label: str, paths: list[Path]) -> None:
    hashes = [digest(path) for path in paths if path.is_file()]
    if len(hashes) != len(paths) or len(set(hashes)) != len(paths):
        fail(f"{label} SHA uniqueness {len(set(hashes))}/{len(paths)}")
    else:
        passed(f"{label} SHA uniqueness {len(paths)}/{len(paths)}")


print("V5.1 Art Asset Replacement QA")
print("=" * 36)

nav_names = ["home", "book", "calendar", "star", "chart", "chest"]
nav_paths = [V5 / "nav-icons" / f"{name}-3d.webp" for name in nav_names]
if all(require_image(path, (512, 512), alpha=True) for path in nav_paths):
    passed("six 512x512 transparent navigation icons")
require_unique("navigation icons", nav_paths)
nav_runtime_paths = [V5 / "nav-icons" / f"{name}-3d-96.webp" for name in nav_names]
if all(require_image(path, (96, 96), alpha=True) for path in nav_runtime_paths):
    passed("six 96x96 navigation runtime derivatives")
require_unique("navigation runtime derivatives", nav_runtime_paths)

theme_names = ["space-hero", "mecha-warrior", "racing-adventure", "fantasy-spirit", "ocean-world"]
theme_paths = [V5 / "themes" / f"{name}-v2.webp" for name in theme_names]
if all(require_image(path, (1024, 1024)) for path in theme_paths):
    passed("five 1024x1024 V5 theme v2 images")
require_unique("V5 theme v2", theme_paths)
theme_runtime_paths = [V5 / "themes" / f"{name}-v2-thumb.webp" for name in theme_names]
if all(require_image(path, (128, 128)) for path in theme_runtime_paths):
    passed("five 128x128 theme runtime derivatives")
require_unique("theme runtime derivatives", theme_runtime_paths)
for name, path in zip(theme_names, theme_paths, strict=True):
    legacy = V40 / "themes" / f"{name}.webp"
    if path.is_file() and legacy.is_file() and digest(path) == digest(legacy):
        fail(f"{path.name} duplicates V40")
if not any("duplicates V40" in item for item in FAILURES):
    passed("V5 theme SHA differs from V40 5/5")

legacy_character_hashes = {digest(path) for path in (V40 / "characters").glob("*.webp")}
for role in ("brother", "younger", "robot"):
    master = V5 / "characters" / role / "master-front.webp"
    if require_image(master, (1024, 1024), alpha=True):
        if digest(master) in legacy_character_hashes:
            fail(f"{role} master duplicates a V40 character")
        else:
            passed(f"{role} master is new transparent 3D art")

master_specs = {
    "brother": ["front", "left45", "right45", "profile", "back", "smile", "laugh", "surprise", "think", "celebrate"],
    "younger": ["front", "left45", "right45", "profile", "back", "smile", "laugh", "surprise", "think", "celebrate"],
    "robot": ["front", "left45", "right45", "profile", "back", "celebrate", "think", "sleep"],
}
for role, names in master_specs.items():
    sheet_webp = V5 / "characters" / role / "master-sheet.webp"
    sheet_png = V5 / "characters" / role / "master-sheet.png"
    if require_image(sheet_webp, (2048, 2048), alpha=True) and require_image(sheet_png, (2048, 2048), alpha=True):
        passed(f"{role} has 2048 master WebP plus lossless PNG")
    views = [V5 / "characters" / role / "master" / f"{name}.webp" for name in names]
    if all(require_image(path, (1024, 1024), alpha=True) for path in views):
        passed(f"{role} master views/expressions {len(views)}/{len(views)}")
    require_unique(f"{role} master views/expressions", views)

for role in ("brother", "younger"):
    stages = [V5 / "characters" / role / f"stage-{index}.webp" for index in range(1, 5)]
    if all(require_image(path, (1024, 1024), alpha=True) for path in stages):
        passed(f"{role} evolution has four transparent stages")
    require_unique(f"{role} evolution", stages)
    for path in stages:
        if path.is_file() and digest(path) in legacy_character_hashes:
            fail(f"{path.relative_to(ROOT)} duplicates V40")
    stage_runtime_paths = [V5 / "characters" / role / f"stage-{index}-thumb.webp" for index in range(1, 5)]
    if all(require_image(path, (192, 192), alpha=True) for path in stage_runtime_paths):
        passed(f"{role} has four 192x192 evolution runtime derivatives")
    require_unique(f"{role} evolution runtime derivatives", stage_runtime_paths)

badge_runtime_paths = sorted((V5 / "badges").glob("*-128.webp"))
if len(badge_runtime_paths) != 24:
    fail(f"badge runtime derivatives {len(badge_runtime_paths)}/24")
elif all(require_image(path, (128, 128), alpha=True) for path in badge_runtime_paths):
    passed("24 badge 128x128 runtime derivatives")

webm_specs = {
    "animations/brother-idle.webm": 100_000,
    "animations/younger-idle.webm": 100_000,
    "animations/robot-idle.webm": 100_000,
    "animations/rocket-flyby.webm": 30_000,
    "rewards/treasure-open.webm": 100_000,
}
webm_paths: list[Path] = []
for relative, minimum in webm_specs.items():
    path = V5 / relative
    if require_file(path, minimum):
        data = path.read_bytes()
        if not data.startswith(b"\x1a\x45\xdf\xa3") or b"V_VP9" not in data:
            fail(f"{relative} is not a VP9 WebM")
        else:
            passed(f"{relative} is a non-placeholder VP9 WebM")
            webm_paths.append(path)
require_unique("formal WebM assets", webm_paths)

dashboard = (ROOT / "src/v4/Dashboard.tsx").read_text()
app = (ROOT / "src/App.tsx").read_text()
lesson_quest = (ROOT / "src/v4/LessonQuest.tsx").read_text()
semester = (ROOT / "src/v4/SecondaryViews.tsx").read_text()
source_text = "\n".join(path.read_text(errors="ignore") for path in (ROOT / "src").rglob("*") if path.suffix in {".ts", ".tsx", ".css"})
for forbidden in ("assets/v40", "v4-floating-rocket", "v4-planet", "v4-robot-face", "v4-robot-hand"):
    if forbidden in dashboard if forbidden != "assets/v40" else forbidden in source_text:
        fail(f"runtime source still contains {forbidden}")
    else:
        passed(f"runtime source excludes {forbidden}")

required_dom_tokens = [
    "v5-hero-layers",
    "brother-idle.webm",
    "younger-idle.webm",
    "robot-idle.webm",
    "rocket-flyby.webm",
    "v5-lesson-card-body",
    "v5-evolution-stage",
    "treasure-open.webm",
    "themes/${art[t.id]}-thumb.webp",
    "-3d-96",
]
for token in required_dom_tokens:
    if token not in dashboard:
        fail(f"Dashboard missing {token}")
    else:
        passed(f"Dashboard integrates {token}")

if "v4-ai-actions" in dashboard:
    fail("Dashboard still renders AI utility action buttons")
else:
    passed("AI utility buttons removed from Dashboard DOM")

if "v4-stage:" in app or "onCompleteStage" in app or "onCompleteStage" in lesson_quest:
    fail("stage navigation still writes reward transactions")
else:
    passed("stage navigation no longer grants XP before lesson completion")

preview_tokens = [
    "const openLesson = (day: CourseDay, lessonIndex: 0 | 1) => {",
    "props.access === 'future' ? '課前預覽'",
    "課前預覽：可先準備影片、單字與帶課提示。",
    "預覽與複習不會寫入任務、作答、完成紀錄或任何 XP／Coins",
    "v4-semester-actions",
]
preview_source = "\n".join([app, dashboard, lesson_quest, semester])
if all(token in preview_source for token in preview_tokens):
    passed("future preview and past review are explicit no-write flows")
else:
    fail("content preview/review source contract is incomplete")

print("=" * 36)
if FAILURES:
    print(f"V5.1 ART QA FAIL ({len(FAILURES)} failures)")
    for item in FAILURES:
        print(f" - {item}")
    sys.exit(1)
print("V5.1 ART QA PASS")
