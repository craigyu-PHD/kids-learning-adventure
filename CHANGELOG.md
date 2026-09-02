# Changelog

All production releases use semantic versioning. Release dates represent the date the version completed regression and was accepted for release.

## Unreleased

No accepted production changes yet.

## V6.1.0 — 2026-09-02

### Added
- Production-grade Architecture / E2E / Console-Network / Data Integrity / Accessibility / Performance audit coverage.
- Hybrid Avatar System with full-character Skin plus standardized accessory slots (`head`, `face`, `back`, `hand`, `effect`).
- A single `AvatarRenderer` shared by Home, learner/growth surfaces, Shop, lesson completion, achievements, and other character displays.
- Immutable purchase and equipment ledgers with idempotency protection, frozen purchase prices, learner isolation, and cross-tab merge behavior.
- Web Locks serialization around shop mutations to prevent cross-tab lost updates.
- Avatar Asset Contract and automated validator for dimensions, alpha channel, file existence, manifest IDs, duplicate IDs, supported slots, and missing assets.
- Shop transaction regression tests covering purchase once, double purchase prevention, insufficient coins, price freeze, persistence, learner isolation, and concurrent merge.
- Explicit Loading / Error / Retry behavior for lesson video failures and trusted-time/network recovery.
- Keyboard focus containment for modal dialogs and WCAG 2.2 AA-oriented accessibility regression coverage.
- Responsive and browser regression evidence for Chromium, Firefox, and WebKit across eight required viewports.

### Changed
- Treasure Shop now follows `Browse → Live Try-on → Purchase → Success → Equip Now` and separates Purchase from Equip.
- Legacy arbitrary clothing/accessory cutout overlays are no longer treated as valid avatar layers; unsupported legacy items remain preserved but are shown as Unavailable/Incompatible instead of being destructively removed.
- Runtime avatar skins use optimized transparent WebP assets while original PNG source assets remain preserved.
- Home evolution tiles use thumbnail assets instead of downloading full-resolution stage art.
- Mobile cinematic hero uses a dedicated responsive key-art asset and aligned preload contract.
- Parent Control Center/export labels now read the single `APP_VERSION` source instead of hard-coded historical version strings.
- Architecture QA now validates package version against the single release identity rather than a hard-coded `6.0.0` baseline.
- Legacy V6 browser QA was repaired so target discovery and shop assertions match the current Hybrid Avatar contract.

### Fixed
- Cross-tab Shop lost-update bugs for simultaneous purchases and equipment updates.
- Historical coin balances no longer change when a product's current catalog price changes; purchase cost is frozen in the transaction ledger.
- Equipped avatar state is rendered consistently instead of disappearing on surfaces that bypassed wardrobe composition.
- 360px / 390px mobile horizontal overflow caused by responsive CSS cascade and fixed-width badge layout.
- Modal Tab focus escaping the dialog.
- Multiple muted small-text contrast failures below WCAG AA.
- Mobile performance regression caused by full-resolution evolution images and duplicate/oversized hero resource behavior.
- Stale browser QA assumptions that attempted to preview legacy unsupported hair assets.

### Validation
- Curriculum: `90 days / 180 blocks / 360 missions`, `360 unique YouTube IDs`, `180/180` main-video alignment — PASS.
- Core static QA: Content Health, Architecture, Learning, Date, State, Auth, Assets, TypeScript strict — PASS.
- Shop integrity: idempotency / insufficient coins / price freeze / persistence / learner isolation / concurrent merge — PASS.
- Family migration — PASS.
- Cross-tab browser integrity — `5/5` PASS.
- Accessibility — `12/12` PASS.
- Failure simulation — `8/8` PASS.
- Responsive matrix — Chromium / Firefox / WebKit × 8 viewports = `24/24` PASS, zero horizontal overflow and zero broken images.
- Deep browser interaction flow — Chromium / Firefox / WebKit PASS including Shop, persistence, learner isolation, two lesson flows, and reward dedupe.
- Mobile 4G + CPU 4×: LCP `1.684s`, INP `136ms`, CLS `0.0229` — PASS.
- Fresh Desktop Lighthouse: Performance `90`, LCP `2.05s`, CLS `0.00174`, TBT `0ms`, transfer `3.04 MB` — PASS.
- Legacy V6 Browser + Orbit evidence gates — PASS.

### Production
- Deployed to `https://kids-learning-adventure-chi.vercel.app/` on 2026-09-02.
- Vercel deployment: `dpl_G6Qm77oEuQkoQjs8HzyenhpFfacH`.
- Release commit: `2d7afea896906d434698344ab07a4fe6f371472e`.
- Post-deploy Chromium / Firefox / WebKit × 8 viewport matrix: `24/24` PASS, with zero application console errors, HTTP errors, horizontal overflow, or broken images.
- Post-deploy deep interaction flow, cross-tab integrity `5/5`, accessibility `12/12`, and failure simulation `8/8` — PASS.
- Post-deploy mobile 4G + CPU 4×: LCP `1.824s`, INP `128ms`, CLS `0.0005` — PASS.

### Preserved / Data Model
- Curriculum, lesson plans, lesson order/scheduling, videos, family/users, learners, progress, XP, coins, achievements, reports, cloud sync, authentication, local storage namespaces, API behavior, and legacy migrations remain backward-compatible protected systems.
- Existing `unlockedCosmetics` / `equippedCosmetics` compatibility fields remain available as migration mirrors while immutable ledgers become authoritative for new Shop transactions.

### Known Technical Debt
- Legacy CSS remains intentionally layered through compatibility files; ownership is improved but not fully deleted because destructive cleanup is outside this release's safety scope.
- Some third-party YouTube iframe warnings/aborted requests may occur during navigation; application-owned runtime errors remain the release blocker, not third-party cancellation noise.
- Full cloud-write destructive testing is performed only with isolated test state; production family PIN namespaces are never guessed or probed.

### Rollback
- Git baseline before refactor: `e8e71038c830a95cdc57aa1b5a83526e78d87ce5`
- Pre-refactor physical backup: `_BACKUPS/2026-09-01_before_production_refactor_stage5/`
- Safety baseline backup: `_BACKUPS/2026-09-01_before_safety_gate/`

## V6.0.1 — 2026-09-01

### Added
- Project-level `_BACKUPS/` rollback snapshots are excluded from Git and Vercel deployment.
- A single release identity source exposes both app version and accepted update date.
- The home footer displays `Version Vx.x.x · Updated YYYY-MM-DD` across desktop, tablet, and mobile.
- Formal release history and rollback references are recorded in this changelog.

### Fixed
- Mobile no longer hides the release identity footer; only the low-interference version line remains visible above bottom navigation.

### Preserved
- User and family/caregiver systems
- Learner data and progress
- Curriculum, lesson plans, lesson ordering, scheduling, videos, and teaching materials
- XP, coins, achievements, inventory, avatars, treasure shop, family PIN, reports, cloud sync, local storage/database state, APIs, authentication, and valid migrations

### Known Issues
- The legacy Vite dev-server browser QA can hang on this Google Drive workspace even after Vite reports ready. Production-preview browser regression is used as the reliable release gate for this patch.

### Rollback
- Git baseline: `e8e71038c830a95cdc57aa1b5a83526e78d87ce5`
- Backup: `_BACKUPS/2026-09-01_before_safety_gate/`

## V6.0.0 — 2026-08-30

### Changed
- Completed the V6 visual overhaul and CSS ownership architecture.

### Preserved
- Existing curriculum, lesson-plan flow, learner progress, XP/coins, family/authentication, and persistence architecture remained protected baseline systems.

### Rollback
- Git commit: `e8e71038c830a95cdc57aa1b5a83526e78d87ce5`
