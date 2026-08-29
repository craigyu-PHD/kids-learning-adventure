from __future__ import annotations

import hashlib
import json
import re
import subprocess
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


def vocabulary_asset_slug(word: str) -> str:
    value = word.lower().strip().replace("?", "").replace("!", "")
    value = re.sub(r"\s+[\u4e00-\u9fff]+$", "", value)
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "zh-audio"


def curriculum_vocabulary_words() -> list[str]:
    code = (
        "import {curriculum} from './src/data/curriculum.ts'; "
        "console.log(JSON.stringify([...new Set(curriculum.flatMap(d=>d.blocks).flatMap(b=>b.vocabulary))]))"
    )
    output = subprocess.check_output(["npx", "tsx", "-e", code], cwd=ROOT, text=True)
    return json.loads(output)


print("V5.3 Visual Finish QA")
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

logo = V5 / "brand" / "little-explorers-logo-v2.webp"
weekly_robot = V5 / "brand" / "weekly-rocket-robot.webp"
if require_file(logo, 20_000) and require_file(weekly_robot, 20_000):
    with Image.open(logo) as image:
        if image.width < 1200 or image.height < 300 or image.convert("RGBA").getchannel("A").getextrema()[0] != 0:
            fail("V5 brand logo must be a large transparent production asset")
        else:
            passed("V5 3D brand logo is large and transparent")
    with Image.open(weekly_robot) as image:
        if image.width < 800 or image.height < 800 or image.convert("RGBA").getchannel("A").getextrema()[0] != 0:
            fail("V5 weekly rocket robot must be a large transparent production asset")
        else:
            passed("V5 weekly rocket robot is large and transparent")

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

caregiver_paths = [
    V5 / "characters" / "caregivers" / f"avatar-{role}.webp"
    for role in ("father", "mother", "caregiver")
]
if all(require_image(path, (1024, 1024), alpha=True) for path in caregiver_paths):
    passed("three 1024x1024 transparent caregiver production characters")
require_unique("caregiver production characters", caregiver_paths)
for path in caregiver_paths:
    legacy = V40 / "characters" / path.name
    if legacy.is_file() and digest(path) == digest(legacy):
        fail(f"{path.name} duplicates V40 caregiver art")
if not any("duplicates V40 caregiver art" in item for item in FAILURES):
    passed("V5 caregiver SHA differs from V40 3/3")

shop_item_paths = sorted((V5 / "items").glob("*.webp"))
if len(shop_item_paths) != 52:
    fail(f"shop production items {len(shop_item_paths)}/52")
elif all(require_image(path, (512, 512), alpha=True) for path in shop_item_paths):
    passed("52 512x512 transparent shop production items")
require_unique("shop production items", shop_item_paths)
for path in shop_item_paths:
    legacy = V40 / "items" / path.name
    if legacy.is_file() and digest(path) == digest(legacy):
        fail(f"{path.name} duplicates V40 shop art")
if not any("duplicates V40 shop art" in item for item in FAILURES):
    passed("V5 shop item SHA differs from V40 52/52")

featured_vocab_paths = [
    V5 / "vocab" / f"{word}.webp"
    for word in (
        "apple", "banana", "grape", "broccoli", "strawberry", "ice-cream", "juice",
        "dog", "cat", "fish", "pig", "car", "bus", "train", "ball",
        "bed", "table", "chair", "book",
        "red", "yellow", "green", "blue",
        "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "happy", "sad",
        "bird", "cow", "duck", "lion", "sun", "moon", "tree", "flower",
        "shirt", "pants", "shoes", "hat",
        "sunny", "rainy", "cloudy", "hot",
        "pizza", "soup", "e-egg", "water",
        "bike", "toy", "rocket", "dinosaur",
        "jacket", "school", "park", "store",
        "circle", "square", "triangle", "star",
        "home", "room", "road", "v-van",
        "orange", "purple", "pink", "cold",
        "a-apple", "i-ice", "o-orange",
        "shark", "insect", "ocean", "space",
        "b-ball", "c-cat", "d-dog", "f-fish",
        "g-grape", "h-hat", "j-juice", "n-nose",
        "p-pig", "q-queen", "r-red", "s-sun",
        "t-toy", "u-umbrella", "w-water",
        "angry", "tired", "jump", "turn",
        "head", "shoulders", "knees", "toes",
        "eyes", "ears", "hands", "feet",
        "clean", "open", "close", "go",
        "mom", "dad", "brother", "family",
        "food", "animals", "colors", "numbers",
        "weather", "body", "big", "small",
        "hello", "hi", "bye", "friend",
        "love", "hug", "please", "thank-you",
        "yes", "no", "stop", "fast",
        "teacher", "sky", "nose", "abc",
        "i-am", "i-can", "i-have", "i-like",
        "i-see", "mountain", "what-is-it", "where-is-it",
        "zh-audio",
    )
]
if all(require_image(path, (640, 480), alpha=True) for path in featured_vocab_paths):
    passed("one hundred fifty 640x480 transparent vocabulary teaching images")
require_unique("featured vocabulary teaching images", featured_vocab_paths)
for path in featured_vocab_paths:
    legacy = V40 / "vocab" / path.name
    if legacy.is_file() and digest(path) == digest(legacy):
        fail(f"{path.name} duplicates V40 vocabulary art")
if not any("duplicates V40 vocabulary art" in item for item in FAILURES):
    passed(f"V5 featured vocabulary SHA differs from V40 {len(featured_vocab_paths)}/{len(featured_vocab_paths)}")

vocabulary_words = curriculum_vocabulary_words()
vocabulary_slugs = sorted({vocabulary_asset_slug(word) for word in vocabulary_words})
vocabulary_paths = [V5 / "vocab" / f"{slug}.webp" for slug in vocabulary_slugs]
if len(vocabulary_words) != 161:
    fail(f"curriculum vocabulary terms {len(vocabulary_words)}/161")
elif len(vocabulary_paths) != 150:
    fail(f"curriculum vocabulary concepts {len(vocabulary_paths)}/150")
elif all(require_image(path, (640, 480)) for path in vocabulary_paths):
    passed("161 curriculum terms map to 150 640x480 teaching concepts")
actual_vocabulary_paths = sorted((V5 / "vocab").glob("*.webp"))
if {path.name for path in actual_vocabulary_paths} != {path.name for path in vocabulary_paths}:
    fail("V5 vocabulary directory does not exactly match curriculum concept mapping")
else:
    passed("V5 vocabulary filenames exactly match runtime concept mapping 150/150")

badge_master_paths = sorted(
    path for path in (V5 / "badges").glob("*.webp") if not path.name.endswith("-128.webp")
)
if len(badge_master_paths) != 24:
    fail(f"badge production masters {len(badge_master_paths)}/24")
elif all(require_image(path, (512, 512), alpha=True) for path in badge_master_paths):
    passed("24 badge 512x512 transparent production masters")
require_unique("badge production masters", badge_master_paths)

badge_runtime_paths = sorted((V5 / "badges").glob("*-128.webp"))
if len(badge_runtime_paths) != 24:
    fail(f"badge runtime derivatives {len(badge_runtime_paths)}/24")
elif all(require_image(path, (128, 128), alpha=True) for path in badge_runtime_paths):
    passed("24 badge 128x128 runtime derivatives")
require_unique("badge runtime derivatives", badge_runtime_paths)

for path in badge_master_paths:
    legacy = V40 / "badges" / path.name
    if legacy.is_file() and digest(path) == digest(legacy):
        fail(f"{path.name} duplicates V40 badge art")
if not any("duplicates V40 badge art" in item for item in FAILURES):
    passed("V5 badge SHA differs from V40 24/24")

webm_specs = {
    "animations/brother-idle.webm": 100_000,
    "animations/younger-idle.webm": 100_000,
    "animations/robot-idle.webm": 100_000,
    "animations/rocket-flyby.webm": 30_000,
    "rewards/treasure-open.webm": 100_000,
    "animations/weekly-rocket-robot.webm": 100_000,
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
    "little-explorers-logo-v2.webp",
    "weekly-rocket-robot.webp",
    "weekly-rocket-robot.webm",
    "v53-date-strip",
    "v53-parent-status",
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
    "access !== 'today' && !adminUnlocked",
    "parentPreviewUnlocked",
    "ChildTeaserPanel",
    "showLessonDetails={parentPreviewUnlocked}",
    "完整教材由家長 PIN 模式保護",
    "v4-semester-actions",
]
preview_source = "\n".join([app, dashboard, lesson_quest, semester])
if all(token in preview_source for token in preview_tokens):
    passed("parent preview and child teaser/review access boundary is explicit")
else:
    fail("parent preview / child teaser source contract is incomplete")

print("=" * 36)
if FAILURES:
    print(f"V5.3 VISUAL QA FAIL ({len(FAILURES)} failures)")
    for item in FAILURES:
        print(f" - {item}")
    sys.exit(1)
print("V5.3 VISUAL QA PASS")
