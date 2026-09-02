# 小小探險隊｜Production Grade 最終交付報告

Release candidate: **V6.1.0**  
Accepted release date: **2026-09-02**  
Production URL: `https://kids-learning-adventure-chi.vercel.app/`  
Pre-refactor Git baseline: `e8e71038c830a95cdc57aa1b5a83526e78d87ce5`  
Primary rollback: `_BACKUPS/2026-09-01_before_production_refactor_stage5/`

> 本文件對應原始總指令 Stage 16 的 A–O。部署後 Production E2E 的最終證據會追加到本文件與 `qa/production-audit/`。

---

## A. Route Inventory

本產品是 React state-routed SPA，沒有 React Router。主要 surfaces：

| Surface | Mechanism | Owner |
|---|---|---|
| Home | `view=home` | `AdventureDashboard` |
| Today | Home 內今日課程 anchor | `AdventureDashboard` |
| Semester | `view=semester` | `SemesterPage` |
| Achievements | `view=achievements` | `AchievementsPage` |
| Shop | `view=shop` | `ShopPage` |
| Report | `view=report` + parent PIN gate | `ReportPage` |
| Settings | parent gate | `ParentSettings` |
| Lesson | `?day=<id>&lesson=1|2` | `LessonQuest` |
| History/Future teaser | local modal/page state | `SecondaryViews` |
| Family/User/Reward dialogs | modal state | ParentAccess / RewardModal |

完整 baseline inventory：`docs/production-audit/2026-09-01/01_ARCHITECTURE_INVENTORY.md`。

## B. Architecture Map

```text
App
└─ FamilyApp
   ├─ Family/auth session + trusted Taipei date
   ├─ Settings / Learners / Progress / Attendance / Reflections
   ├─ AdventureDashboard
   │  ├─ AdventureHeader
   │  ├─ MainNavigation
   │  ├─ PlayerProfile ─┐
   │  ├─ CharacterGrowth├─> AvatarHero -> AvatarRenderer
   │  ├─ Treasure       │
   │  └─ DailyCourse   ─┘
   ├─ LessonQuest -> AvatarRenderer + RewardModal
   ├─ SemesterPage
   ├─ AchievementsPage -> AvatarRenderer
   ├─ ShopPage
   │  ├─ Purchase Service / Equip Service
   │  ├─ Web Locks serialization
   │  ├─ immutable purchase/equipment ledgers
   │  └─ TreasureShowcase -> AvatarRenderer
   ├─ ReportPage -> AvatarRenderer
   └─ ParentSettings -> AvatarRenderer

Persistence
├─ family-scoped localStorage
├─ sessionStorage active caregiver
└─ Vercel private Blob CloudSnapshot + signed family session
```

No IndexedDB / Redux / Zustand / MobX application store was detected.

## C. State Ownership Map

| Domain | Authoritative source after V6.1.0 |
|---|---|
| Curriculum / lessons / videos | static source data in `src/data/` |
| Adult users | `settings.users` |
| Learners | `settings.children` |
| Per-learner progress | family-scoped `progress[childId]` |
| XP / earned rewards | derived from immutable completion/reward events |
| Purchase price/history | immutable purchase transaction ledger |
| Shop inventory | purchase ledger; legacy `unlockedCosmetics` retained as compatibility mirror |
| Equipped avatar | equipment event ledger; legacy `equippedCosmetics` retained as compatibility mirror |
| Cross-tab mutation ordering | Web Locks + merge semantics |
| Authentication | signed `FamilySession` |
| Trusted course date | `/api/server-time` / `/api/time`; device fallback is read-only safe preview |
| Cloud state | private Vercel Blob snapshot with conflict protection |

Critical rule: learner state is always keyed by learner ID. XP / Coins / Inventory / Equipment must never be shared as family-global mutable counters.

## D. Functional Test Matrix

| Area | Verification | Result |
|---|---|---|
| Curriculum | 90 days / 180 blocks / 360 missions | PASS |
| Videos | 360 unique IDs; 180/180 main alignment | PASS |
| Navigation | 6 primary surfaces | PASS |
| Theme / sound / AI hint | real browser interaction | PASS |
| Parent gate / future teaser / history | read-only/policy behavior | PASS |
| Shop Try-on | renderable Skin | PASS |
| Purchase once | wallet + inventory transaction | PASS |
| Double purchase | same tab / cross tab | PASS |
| Insufficient Coins | blocked | PASS |
| Purchase price freeze | historical balance stable | PASS |
| Equip | independent from Purchase; no extra charge | PASS |
| Inventory refresh persistence | real browser refresh | PASS |
| Equipment refresh persistence | real browser refresh | PASS |
| Learner isolation | Shop + Progress | PASS |
| Cross-tab different purchases | no lost update | PASS |
| Cross-tab different equipment slots | no lost update | PASS |
| Lesson 1 completion | real 10-stage flow | PASS |
| Lesson reward repeat prevention | refresh/re-entry | PASS |
| Daily reward once | real browser flow | PASS |
| Family migration | legacy -> signed session namespace | PASS |
| Responsive | 3 engines × 8 viewports | PASS |
| Accessibility | 12/12 gates | PASS |
| Failure Simulation | 8/8 gates | PASS |

Evidence:
- `qa/production-audit/2026-09-01/stage2-full-interactions.json`
- `qa/production-audit/2026-09-01/stage4-integrity-local.json`
- `qa/production-audit/2026-09-01/stage13-accessibility.json`
- `qa/production-audit/2026-09-01/stage4-failure-simulation.json`

## E. P0 / P1 / P2 Bug List

### P0

**None open.** No data-loss, auth bypass, reward duplication, unusable production route, or destructive migration defect remains in the accepted release candidate.

### P1-01 — Cross-tab Shop lost update — FIXED
- Location: Shop persistence / `FamilyApp` progress mutation.
- Reproduction: open two tabs in same family; purchase two different items concurrently.
- Root cause: each tab wrote a stale full progress snapshot with no mutation serialization/merge.
- Fix: Web Locks + immutable transaction ledger + merge semantics.
- Verification: Stage 4 browser integrity `5/5 PASS`.

### P1-02 — Equipped item state did not equal visual state — FIXED
- Location: Avatar rendering across Home/Growth/Shop/Lesson/Achievement.
- Reproduction: equip a legacy accessory; inventory/equipment state succeeds while many surfaces show base/stage art.
- Root cause: multiple avatar render sources and no validated slot contract.
- Fix: single `AvatarRenderer`; Hybrid Avatar contract; unsupported legacy overlays preserved but unavailable.
- Verification: three-engine deep E2E using `outfit-racer` Skin; refresh persistence PASS.

### P1-03 — Historical Coins depended on current catalog price — FIXED
- Location: reward/shop wallet derivation.
- Reproduction: buy item, then change item catalog cost; historical spend changed.
- Root cause: spend reconstructed from current item price rather than transaction price.
- Fix: immutable purchase transaction stores frozen price.
- Verification: `qa:shop` price-freeze test PASS.

### P1-04 — 360/390 horizontal overflow — FIXED
- Location: responsive dashboard cascade and fixed badge grid.
- Reproduction: 360×800 / 390×844 on Chromium/Firefox/WebKit.
- Root cause: later desktop CSS ownership rules plus fixed grid min-content widened document to ~423px.
- Fix: final responsive owner overrides + fluid badge grid.
- Verification: 24/24 matrix; `overflowCases=[]`.

### P1-05 — Modal keyboard focus escaped dialog — FIXED
- Location: parent PIN, history, teaser, reward, mobile theme dialogs.
- Root cause: missing focus containment.
- Fix: common focus trap behavior / Escape close.
- Verification: Accessibility 12/12 PASS.

### P1-06 — Mobile/Desktop performance budget regression — FIXED
- Location: Home hero/evolution media.
- Root cause: full-resolution stage art used at thumbnail sizes; runtime PNG avatar skins; mobile hero lacked dedicated responsive source.
- Fix: stage thumbnails, transparent WebP runtime Skin, mobile hero key art, aligned preload, no Shop eager preload.
- Verification: Mobile LCP 1.684s / INP 136ms / CLS 0.0229; Desktop Lighthouse 90 / LCP 2.05s.

### P2 — Limited deep links — OPEN TECHNICAL DEBT
- Most SPA views are React state only. Lesson is the primary query-addressable route.
- Impact: diagnostics/back-forward support, not current core data correctness.
- Deferred because router migration is architectural and unnecessary for V6.1 production safety.

### P2 — Legacy CSS compatibility layers — OPEN TECHNICAL DEBT
- Old compatibility CSS remains intentionally preserved.
- Deleting it without a separate migration project would violate the protected-core/rollback policy.

## F. UI/UX Audit

- Shop is now role-driven around the learner: Preview -> Try-on -> Purchase -> Success -> Equip Now.
- Clear item states: Not Owned / Insufficient / Owned / Equipped / Unavailable / Incompatible.
- Unsupported legacy cutout assets are not composited onto full AI characters.
- Desktop Shop retains large avatar stage + catalog; Mobile uses responsive preview/tabs/grid rather than a blindly squeezed desktop layout.
- Gamification loop now visibly carries current appearance through Home, Growth, Shop, Lesson and Achievement surfaces.

## G. Visual Audit

- Reduced arbitrary overlay composition; established stable Skin geometry.
- Unified runtime avatar presentation through one renderer.
- Preserved global visual tokens and responsive ownership rather than introducing page-local font/button systems.
- Eliminated mobile horizontal composition breakage.
- Runtime Skin assets use transparent WebP with source PNG retained.

## H. Responsive Audit

Required viewports tested in Chromium, Firefox, WebKit:

`1440×900`, `1280×800`, `1024×1366`, `820×1180`, `768×1024`, `430×932`, `390×844`, `360×800`.

Final local result: **24/24 PASS**, zero horizontal overflow, zero broken images.

Screenshots:
- Before: `qa/production-audit/2026-09-01/before/`
- Final local After: `qa/production-audit/2026-09-01/final-local/`
- V6 detailed shop screenshots: `qa/screenshots/v60/`

## I. Console / Network Report

Production baseline before refactor had no application-owned core console errors. Local Vite Preview cannot execute Vercel Functions, so `/api/*` 404 noise under preview is classified as harness/environment behavior, not Production API failure.

Application-controlled API negative tests:
- `/api/server-time`: valid server response behavior.
- unauthenticated `/api/state`: 401 expected.
- invalid PIN request: 400 expected.
- 401/404/500/offline family-session simulations: explicit error UI PASS.
- trusted-time all-endpoints failure: safe preview + retry, no XP/Coins write PASS.
- image 404: fallback PASS.
- video offline: Error/Retry UI PASS.

Third-party YouTube iframe Feature-Policy/CSP warnings and navigation-cancelled requests are tracked separately from application-owned errors.

## J. Shop / Avatar Architecture

### Hybrid Avatar System

- Full Character Skin: `default`, `outfit-racer`, future validated complete skins.
- Standardized Accessory slots: `head`, `face`, `back`, `hand`, `effect`.
- Legacy `hairstyle/hat/glasses/backpack/...` map only through migration/availability rules; they are not automatically overlaid.

### Avatar Asset Contract

- Contract: 1024×1536 RGBA for current full-character Skin family.
- Runtime: optimized transparent WebP.
- Source: original PNG preserved.
- Automated validator checks dimension, alpha, file existence, manifest IDs, duplicate IDs, unsupported slot, missing assets.

### Purchase transaction

`validate item -> check ownership -> check coins -> freeze price -> append purchase event -> derive inventory`

- deterministic idempotency protection
- pending button disabled
- Purchase != Equip
- Equip never charges Coins
- cross-tab mutations serialized

## K. 修復紀錄

Primary repair groups:
1. Safety/rollback infrastructure and release identity.
2. Architecture inventory and source-of-truth analysis.
3. Production black-box baseline.
4. Cross-tab/purchase data consistency repair.
5. Hybrid Avatar / single renderer / asset contract.
6. Shop UX and gamification propagation.
7. 360/390 responsive root-cause repair.
8. Accessibility AA / dialog focus repair.
9. Failure/Retry UI.
10. Skin/hero/evolution performance optimization.
11. Legacy QA harness contract repair.

Detailed release history: `CHANGELOG.md`.

## L. Before / After Screenshots

- `qa/production-audit/2026-09-01/before/`
- `qa/production-audit/2026-09-01/final-local/`
- `qa/screenshots/v60/v60-shop-composed-1536x1024.png`
- `qa/screenshots/v60/v60-shop-sister-1536x1024.png`
- `qa/screenshots/v60/v60-shop-younger-sister-390x844.png`

## M. Automated Test Result

Accepted local release gates:
- `npm run validate` PASS
- `npm run qa:content-health` PASS
- `npm run qa:architecture` PASS
- `npm run qa:learning` PASS
- `npm run qa:date` PASS
- `npm run qa:state` PASS
- `npm run qa:auth` PASS
- `npm run qa:shop` PASS
- `npm run qa:avatar-assets` PASS
- `npm run qa:assets` PASS
- `npm run qa:strict` PASS
- `npm run qa:performance` PASS
- `npm run build` PASS
- `npm run qa:migration` PASS
- `npm run qa:v60:browser` PASS
- `npm run qa:v60:orbit` PASS
- `npm run qa:v51:performance` PASS
- custom Playwright three-engine E2E PASS
- custom cross-tab integrity 5/5 PASS
- custom accessibility 12/12 PASS
- custom failure simulation 8/8 PASS

## N. Performance Result

### Mobile constrained gate
- viewport: 390×844
- emulation: 4G + CPU 4×
- LCP: **1.684s** (target <= 2.5s)
- INP proxy/Event Timing: **136ms** (target <= 200ms)
- CLS: **0.0229** (target <= 0.1)
- Home Shop asset eager requests: **0**

### Desktop Lighthouse
- Performance: **90**
- FCP: **447ms**
- LCP: **2.05s**
- CLS: **0.00174**
- TBT: **0ms**
- total transfer: **3.04 MB**

## O. 尚存 Technical Debt

1. State-based navigation lacks full URL deep-link/history support.
2. Legacy CSS compatibility layers remain and require a separate, checkpointed migration project before deletion.
3. The application still carries historic compatibility fields for old snapshots by design; removal requires a formal data migration window.
4. YouTube is third-party infrastructure; iframe policy warnings/cancellations are not fully controllable by this application.
5. Production cloud destructive tests must continue using explicitly isolated family fixtures rather than guessing real family PIN namespaces.

---

## Production Deployment / Post-deploy Verification

- Production release: **V6.1.0 · Updated 2026-09-02**
- Production URL: `https://kids-learning-adventure-chi.vercel.app/`
- Vercel deployment: `dpl_G6Qm77oEuQkoQjs8HzyenhpFfacH`
- Release commit: `2d7afea896906d434698344ab07a4fe6f371472e`
- Production bundle verified to contain V6.1.0: **PASS**
- `/api/server-time`: HTTP 200, `Asia/Taipei`: **PASS**
- Responsive matrix: Chromium / Firefox / WebKit × 8 viewports = **24/24 PASS**
- Production matrix: console.error **0**, page errors **0**, HTTP errors **0**, overflow **0**, broken images **0**
- Deep interaction flow: Chromium / Firefox / WebKit **PASS**
- Cross-tab integrity: **5/5 PASS**
- Accessibility: **12/12 PASS**
- Failure simulation: **8/8 PASS**
- Production mobile 4G + CPU 4×: LCP **1.824s**, INP **128ms**, CLS **0.0005**
- Production desktop browser gate: LCP **548ms**, INP **48ms**, CLS **0.0**
- Home Shop asset eager requests: **0**

Third-party YouTube iframe warnings/navigation-cancelled requests remain non-application noise; application-owned console errors and HTTP errors were zero in the production matrix.

## Final Definition of Done status after deployment

- Production URL actually deployed and E2E verified: **PASS**
- No open P0: **YES**
- No open core-flow P1: **YES**
- XP/Coins/Inventory/Equipment consistency: **PASS**
- Learner isolation: **PASS**
- Shop Purchase/Inventory/Equip/Persistence: **PASS**
- Desktop/iPad/Mobile visual regression: **PASS**
- Console has no unhandled application-owned core errors: **PASS**
- Core regression suite: **PASS**
- Accessibility: **PASS**
- Performance budgets: **PASS**
- Definition of Done: **SATISFIED**
