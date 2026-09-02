# 小小探險隊 Production Audit — Stage 1 Architecture Inventory

Audit date: 2026-09-01
Baseline: V6.0.1
Git baseline: e8e71038c830a95cdc57aa1b5a83526e78d87ce5
Rollback: `_BACKUPS/2026-09-01_after_V6.0.1_safety_infra/`

## Framework

- React 19 + TypeScript 5.9 + Vite 8.
- No React Router, Redux, Zustand, MobX, or application Context store.
- Server API is Vercel Functions using `@vercel/blob` private blobs.
- No IndexedDB usage detected.

## Route Inventory

The app is state-routed inside `src/App.tsx`, not router-routed.

| Surface | Route mechanism | Owner |
|---|---|---|
| Home | `view = home` | `AdventureDashboard` |
| Today | navigation alias that returns home/today panel | `AdventureDashboard` |
| Semester | `view = semester` | `SemesterPage` |
| Achievements | `view = achievements` | `AchievementsPage` |
| Shop | `view = shop` | `ShopPage` |
| Report | `view = report`; parent PIN gated | `ReportPage` |
| Settings | `view = settings`; parent PIN gated | `ParentSettings` |
| Lesson | `?day=<day-id>&lesson=1|2` + React state | `LessonQuest` |
| History / future teaser | modal/local page state | `SecondaryViews` |
| Family setup / parent PIN / user switch / reward | modal state | `ParentAccess`, `RewardModal` |

There is no URL route for semester/shop/report/settings. Refreshing those views returns to home. Lesson query state is the only deep-link mechanism.

## Component Map

```text
App
└─ FamilyApp
   ├─ AdventureDashboard
   │  ├─ AdventureHeader
   │  ├─ MainNavigation
   │  ├─ PlayerProfile → AvatarHero
   │  ├─ AICompanion
   │  ├─ SemesterOverviewPanel
   │  ├─ CharacterEvolution → direct stage image path
   │  ├─ BadgeShelf
   │  ├─ DailyMissionPanel
   │  ├─ TreasureChest → AvatarHero
   │  └─ BottomStatusBar
   ├─ LessonQuest → AvatarHero at multiple stages
   ├─ SemesterPage
   ├─ AchievementsPage → AvatarHero
   ├─ ShopPage
   │  ├─ AvatarHero tabs
   │  └─ TreasureShowcase → AvatarWardrobe
   ├─ ReportPage → AvatarHero
   ├─ ParentSettings → AvatarHero
   ├─ AdminPinDialog / FamilySetupDialog / UserSwitchDialog
   └─ RewardModal
```

### Avatar rendering ownership finding

There is currently no single renderer contract.

- `AvatarHero` delegates any wearable-equipped avatar to `AvatarWardrobe`.
- `AvatarWardrobe` currently renders only an `outfit` composed look; other wearable slots are not rendered.
- `AdventureHeader` cinematic learners use `avatarStageAssetPath(...)` directly and bypass equipment.
- `CharacterEvolution` uses direct stage art and bypasses equipment.
- Some LessonQuest call sites omit `equippedCosmetics`.

This is a P1 architecture/UX defect because purchase/equip state can be correct while the reward is visually absent.

## State Ownership Map

| Domain | Runtime owner | Authoritative representation |
|---|---|---|
| Settings | `FamilyApp.settings` | family-scoped settings object |
| Learners | `settings.children` | learner profiles keyed by child id |
| Adult users | `settings.users` | caregiver profiles |
| Course model | static `curriculum` | source code (`src/data/curriculum.ts`) |
| Video assignments | static data | `src/data/videos.ts` |
| Progress | `FamilyApp.progress` | `Record<childId, ChildProgress>` |
| XP | derived | completed missions/blocks/eggs + reward ledger |
| Coins earned | derived | same reward sources |
| Coins spent | derived | sum of costs in `unlockedCosmetics` |
| Current Coins | derived | earned - cosmetic spend, clamped >= 0 |
| Achievements | per-child progress | `badgeUnlocks` + reward engine |
| Shop inventory | per-child progress | `unlockedCosmetics[]` |
| Equipped avatar items | per-child progress | `equippedCosmetics[]` |
| Attendance | `FamilyApp.attendance` | day → learner ids |
| Reflections / lesson stage checkpoints | `FamilyApp.reflections` | day/block maps |
| Active adult user | `activeUserId` | sessionStorage only |
| Family authentication | `App.familySession` | signed session persisted in localStorage |
| Trusted course date | `FamilyApp.trustedDate` | server time API with device fallback |
| Cloud sync status | ephemeral React state | not persisted |

## Source-of-Truth Assessment

### Good

- XP and Coins totals are not separately persisted mutable counters. They are derived, which reduces drift.
- Learner progress is keyed by learner id, providing a sound isolation boundary.
- Duplicate IDs are normalized for reward and answer event arrays.
- Cloud API uses optimistic version conflict (`X-Family-Base-Updated-At`) after a known cloud baseline.

### Risks

1. Shop purchase is represented only by adding an item to `unlockedCosmetics`; there is no explicit immutable purchase transaction/idempotency record.
2. Coins spent are reconstructed from current catalog prices. Changing an item's `cost` retroactively changes every learner's historical wallet balance.
3. Multiple tabs do not subscribe to the browser `storage` event. Each tab can retain stale React state and overwrite family-scoped localStorage.
4. Cloud conflict protection is snapshot-level; local cross-tab conflicts can happen before the cloud PUT.
5. Cloud immutable-event validation prevents mutation of matching event IDs, but it does not require old immutable events to remain present in the next snapshot.
6. When no previous cloud `updatedAt` is known, a PUT can be sent without a base version; initial/concurrent snapshot creation requires destructive testing.

## Persistence Map

### localStorage

Current family namespace:

- `star-learning-v40:<familyId>:settings`
- `star-learning-v40:<familyId>:progress`
- `star-learning-v40:<familyId>:attendance`
- `star-learning-v40:<familyId>:reflections`
- `star-learning-active-family-session-v40`
- `little-explorers-v4-sound`

Legacy migration inputs retained for compatibility:

- V1 global settings/progress/attendance/reflections keys
- V2.1 and V2.2 PIN-scoped family keys
- V2.1/V2.2 active PIN keys

### sessionStorage

- `star-learning-v40:<familyId>:active-user`
- legacy active-user keys are migrated then removed.

### IndexedDB

- No IndexedDB access detected.

### Cloud

- `CloudSnapshot version: 2` stored as immutable private Vercel Blob JSON snapshots.
- Prefix: `families-v22/<familyId>/`.
- Latest snapshot is used; last 12 snapshots are retained.

## API Map

| Endpoint | Method | Purpose | Auth |
|---|---|---|---|
| `/api/family-session` | POST | Convert 4–6 digit family PIN to signed 30-day session | PIN request + rate limiter |
| `/api/state` | GET | Load latest family cloud snapshot | Bearer family session |
| `/api/state` | PUT | Save sanitized snapshot | Bearer + optional base updatedAt |
| `/api/state` | DELETE | Explicit family v22 state delete | Bearer + confirmation header |
| `/api/server-time` | GET | Trusted Taiwan date/time | none |
| `/api/time` | GET | Legacy trusted date endpoint | none |

## Stage 1 preliminary severity findings

### P1 — Avatar equipment presentation has multiple render sources

State can say an accessory is equipped while major UI surfaces show the unequipped stage image or an outfit-only wardrobe image. Root cause: no unique AvatarRenderer and incomplete slot rendering contract.

### P1 — Purchase history is price-dependent instead of transaction-dependent

Current wallet balance subtracts the present catalog cost of all `unlockedCosmetics`. A later catalog price change rewrites historical economic state. Purchase operation needs an immutable transaction/idempotency model or a migration-safe equivalent.

### P1 candidate — Multi-tab local state lost-update risk

No cross-tab storage reconciliation exists. Must be verified in Stage 4 with two real browser contexts/tabs before final classification.

### P2 — State routing has limited deep links

Most major views are React-only state and are not URL-addressable. This is not immediately destructive but complicates E2E reproducibility, navigation history, diagnostics, and production support.
