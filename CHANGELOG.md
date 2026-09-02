# Changelog

All production releases use semantic versioning. Release dates represent the date the version completed regression and was accepted for release.

## Unreleased

No accepted changes beyond the V6.3.0 production release.

## V6.3.0 — 2026-09-02

### Added
- Full Equipment Preview architecture with six explicit child-facing modes: `avatar`, `ship`, `robot`, `card`, `effect`, and `world`, while preserving the existing Shop ledger and Avatar state.
- Formal V6.3 asset pipeline covering all 48 wearable ShopItems across brother, younger, sister, and younger-sister on the fixed 1024×1536 transparent-canvas contract.
- Seven full-skin outfit families, 29 aligned-overlay wearable families, and 12 split-overlay wearable families with four-avatar coverage.
- Dedicated redesigned preview art/stages for all three Ships, three Robots, three collectible Cards, and three Effects; world/room preview remains presentation-only over the existing world state.
- Automated `qa:v63:shop-preview` hard gate that actually opens every child-visible ShopItem for every production avatar: 63×4 = 252/252 required.
- Automated `qa:v63:shop-transactions` hard gate for purchase, inventory, equip/use, serialization persistence, and unequip across all 252 item/avatar combinations.
- Preview-stage layout regression across avatar/ship/robot/card/effect/world on mobile, tablet, desktop, and ultrawide widths.

### Changed
- All formally available character equipment can now be tried on before purchase; no normal Child Catalog item depends on a dead preview path.
- Ship preview is now a Hangar experience with the vehicle as the primary visual instead of a small thumbnail pasted beside the avatar.
- Robot preview is now a Companion experience with clear two-subject staging.
- Card preview is now a collectible-card viewer with rarity framing and dedicated artwork.
- Effects now preview directly around the shared AvatarRenderer and respect reduced-motion behavior.
- World-type items use child-facing `立即使用` / `使用中` language while wearable items retain `立即穿上` / `穿戴中`.
- Avatar sizing inside the V6.3 preview feature now uses CSS custom properties instead of new `!important` overrides.
- `CURRENT-SPEC.md` and `AGENTS.md` now treat V6.3 Full Equipment Preview as authoritative and prevent historical V6.1/V6.2 rules from rolling the feature back.

### Preserved
- No Curriculum, Lesson flow, immutable Purchase/Equipment/Reward/Answer ledgers, family namespace, signed session, cloud persistence, migration, trusted date engine, or learner isolation architecture was rebuilt.
- V6.1 Production rollback and V6.2 local-RC history remain recoverable.

### Validation
- Protected curriculum: `90 days / 180 lessons / 360 missions` — PASS.
- Fresh online video validation: `360/360` unique YouTube assignments playable/embeddable; `180/180` main-video topic alignment — PASS.
- Avatar asset contract: `48/48` wearables × four production avatars — PASS.
- Browser all-item preview: `252/252` — PASS with zero page/console errors in the dedicated preview run.
- All-item transaction flow: `252/252` purchase/equip-or-use/persist/unequip — PASS.
- Preview-stage layout: `24/24` — PASS.
- Responsive matrix: Chromium / Firefox / WebKit × 12 viewports = `36/36` PASS, including 1600/1920/2560/3440px and zero overflow/overlap/out-of-viewport/broken-image cases.
- Deep browser E2E: Chromium / Firefox / WebKit — PASS.
- Cross-tab integrity: `5/5` PASS; Accessibility: `12/12` PASS; Failure simulation: `9/9` PASS.
- Mobile 390×844 simulated 4G + CPU 4×: LCP `1.708s`, INP `112ms`, CLS `0.0005`; Home Shop preload requests = `0` — PASS.
- CSS debt: `!important` `1716 → 1677` (`-39`); direct feature-owned wearable magic-number selectors = `0`.
- Architecture, Learning, Shop, State, Auth, Migration, Date, Content Health, TypeScript strict, and production build — PASS.

### Rollback
- Pre-change physical backup: `_BACKUPS/2026-09-02_before_V6.3_equipment_redesign/` with SHA-256 evidence.
- V6.1 rollback tag remains `checkpoint/v6.1.0-before-v6.2`.

### Production
- Deployed to the existing Vercel project `kids-learning-adventure` on 2026-09-02; deployment `dpl_12VDeBJkJ7dW91rZ82b2z6dkUadz` is `Ready` and aliased to `https://kids-learning-adventure-chi.vercel.app/`.
- Production API contract: `/api/server-time` = 200, unauthenticated `/api/state` = 401, invalid short PIN `/api/family-session` = 400.
- Production all-item preview = `252/252` PASS; Preview Stage layout = `24/24` PASS; responsive matrix = `36/36` PASS with console.error = 0, HTTP errors = 0, overflow = 0, overlap = 0, out-of-viewport = 0, broken images = 0.
- Production Chromium / Firefox / WebKit deep E2E PASS; cross-tab `5/5`, Accessibility `12/12`, Failure Simulation `9/9` PASS.
- Production mobile 390×844 simulated 4G + CPU 4×: LCP `2.252s`, INP `128ms`, CLS `0.0005`; Home Shop preload requests = `0`; soft-navigation timings all pass the release budgets.
- The first remote all-item QA run reported `216/252` because the harness judged new Ship/Robot/Card images after a fixed 35ms delay. The assets themselves returned HTTP 200; the tracked QA was corrected to wait for `img.complete && naturalWidth > 0`, and the full Production rerun passed `252/252` with zero console/page errors.

## V6.2.0 — 2026-09-02

### Added
- Hybrid Avatar V2 render modes: `full-skin`, `aligned-overlay`, `split-overlay`, `standard-effect`, and `world`, all extending the existing V6.1 ledger/renderer architecture.
- Fixed-canvas 1024×1536 wearable asset pipeline and automated manifest validator for aligned and split layers.
- Three Lv.1 / 0-Coin Starter Wardrobe items that still use the normal `purchaseShopItem()` transaction path.
- Validated wearable support for Starter hat/glasses/headphones plus selected legacy hat/glasses/headphones/hair/backpack/cape items across all four avatars.
- Wearable asset 404 fallback that unmounts only the failed layer while preserving the base avatar.
- Large/ultrawide responsive regression coverage for 1600, 1920, 2560, and 3440px desktop widths.
- SPA soft-navigation performance gates for Home → Today, Home → Shop, Shop → Home, and Home → Report.
- V6.2 CSS-debt QA that compares the real V6.1 rollback baseline and blocks direct wearable magic-number selectors in feature-owned CSS.

### Changed
- Child Shop now uses child-facing game language such as `試穿看看`, `免費領取`, `用 X 金幣收藏`, `立即穿上`, `已收藏`, and `穿戴中` instead of renderer/asset/purchase engineering terminology.
- Normal Child Catalog now contains only genuinely usable/owned/equipped/previewable items; unfinished legacy items are limited to a small `新裝備準備中` preview section.
- Shop reports the real explorable count instead of presenting the historical asset total as if every item were usable; the current four-avatar contract exposes 25 available shop items per avatar.
- Shop desktop hierarchy keeps the large live avatar preview as the primary visual; mobile order is Preview → Category → Product Grid.
- First-run Child Experience no longer forces a Caregiver Selector before entering the site. Caregiver selection/PIN is deferred to parent report/settings/protected flows.
- Child typography now uses explicit body/secondary metadata tokens with a ≥14px body target and ≥12px secondary-information target.
- Dashboard and secondary page width ownership now uses centered fluid `minmax()` / `clamp()` behavior on large and ultrawide displays instead of the legacy 1508px left-offset rule.
- Shop CSS ownership migrated further out of `v40.css`; the historical compatibility layer remains intact for unmigrated features.
- Legacy family migration QA now isolates client migration behind controlled API stubs while the separate Auth QA continues to validate real server session signing.
- Content Health asset baseline now records 63 Shop asset files after adding the three Starter catalog images; this engineering count is not exposed as a child-facing available-product count.

### Fixed
- Large desktop/ultrawide column misalignment, overlap, and off-center layout behavior.
- Direct thumbnail/CSS-magic-number wearable composition in the current AvatarRenderer path.
- Child-facing dead cards that appeared available despite lacking a valid wearable asset contract.
- First-run caregiver modal interruption of normal Child Mode.
- Broken wearable image nodes remaining in the DOM after an asset failure.
- Stale QA assertions that still searched for `購買`, `立即裝備`, or the pre-V6.2 shop contract.

### Validation
- Protected curriculum: `90 days / 180 lessons / 360 missions` — PASS.
- Online video validation: `360/360` unique YouTube assignments playable/embeddable — PASS.
- Architecture, Learning, Avatar Asset, Shop, State, Auth, Migration, Date, Content Health, TypeScript strict, and production build — PASS.
- CSS debt: `!important` count `1716 → 1677` (`-39`); direct feature-owned wearable magic-number selectors = `0`.
- Responsive matrix: Chromium / Firefox / WebKit × 12 viewports = `36/36` PASS, with zero horizontal overflow, column overlap, out-of-viewport columns, or broken images.
- Deep interaction E2E: Chromium / Firefox / WebKit PASS including first-run Child Mode, Starter purchase, aligned overlay, split overlay, full skin, refresh persistence, learner isolation, two lesson flows, and reward dedupe.
- Cross-tab Shop integrity: `5/5` PASS.
- Accessibility: `12/12` PASS.
- Failure simulation: `9/9` PASS, including wearable 404 fallback.
- Mobile 390×844, simulated 4G + CPU 4×: LCP `1.720s`, INP `104ms`, CLS `0.0005` — PASS.
- Soft navigation: Home → Today `156ms`, Home → Shop `233ms`, Shop → Home `189ms`, Home → Report gate `169ms` on the final local mobile run — PASS.

### Preserved / Rollback
- V6.1 Protected Core, immutable ledgers, family namespaces, signed sessions, cloud persistence, date engine, curriculum, lesson flow, migrations, learner isolation, and existing production data remain unchanged.
- Remaining unfinished legacy wearables are preserved as data and Coming Soon candidates; V6.2 does not claim that all historical wearables are converted.
- Pre-change Git tag: `checkpoint/v6.1.0-before-v6.2`.
- Pre-change physical rollback: `_BACKUPS/2026-09-02_before_V6.2/`.

### Production
- Pending V6.2.0 Production deployment and post-deploy validation.

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
