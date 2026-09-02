# 小小探險隊 CURRENT SPEC

狀態：**V6.3.0 Production Baseline（authoritative；post-deploy validation accepted）**
更新：2026-09-02
Production：`https://kids-learning-adventure-chi.vercel.app/`（目前正式 baseline：V6.3.0）

> 本文件是目前產品規格的唯一權威摘要。V2／V3／V4／V5／V6.1／V6.2 文件與 `AGENTS.md` 中的歷史條目只作 migration、相容性與決策脈絡參考；發生衝突時，一律以本文件、目前 Production migration contract 與已驗證的 V6.3 release behavior 為準。不得因舊文件把 V6.3 的 Full Equipment Preview、Hybrid Avatar、ledger、family auth、responsive 或 accessibility 架構回退。

## 1. Protected Core

以下為 V6.1 已驗證底層，後續 UI／Avatar／CSS 改版不得刪除、重建或 reset：

- 18 週、90 learning days、180 lessons、360 missions。
- 360 個 unique YouTube assignments；180 warmups + 180 main lesson videos，兩集合不得重複。
- 課程教案、lesson order、lesson scheduling、Lesson flow、Quick Check、speaking/review evidence。
- `AnswerEvent`、`RewardTransaction`、`PurchaseTransaction`、`EquipmentTransaction` 均屬 append-only immutable event contract；既有 event 不得被覆寫或刪除。
- XP、Coins、Stars、Gems、Badge、Treasure 與 learner progress。
- Family namespace、家長 PIN / Family PIN architecture、signed session、caregiver/learner identity separation。
- `/api/state`、`/api/family-session`、`/api/server-time`、`/api/time`。
- Vercel Blob cloud persistence、本機 family-scoped cache、V1～V6 migration compatibility。
- Asia/Taipei trusted date engine；今天是唯一可建立正式 reward/progress 的日期。
- Learner isolation；不同孩子的 progress、reward、inventory、equipment 不可互相污染。

原則：**修 Renderer，不重做 Ledger；修 Presentation，不重做 Curriculum；修 Asset Pipeline，不 reset 使用者資料。**

## 2. Current Architecture

- React 19 + TypeScript 5.9 + Vite 8。
- 主要 view routing 仍由 `src/App.tsx` state 控制；lesson 支援 `?day=<id>&lesson=1|2` deep link。
- Family settings / progress / attendance / reflections 由 `FamilyApp` 管理並以 family-scoped localStorage + cloud snapshot 同步。
- Cloud snapshot version 仍維持既有相容 contract，不因 UI 改版任意升級或重建。
- Shop 維持既有 `shopService` / `shopLedger` 與 immutable purchase/equipment ledger；新版本只能 additive extension。

## 3. Economy / Progress Source of Truth

- XP、Coins 不使用可任意 `+=` 的 mutable balance。
- earned rewards 由 completion / reward transactions 推導。
- Shop spend 以 immutable `PurchaseTransaction.cost` 為準；catalog 未來改價不得改寫歷史餘額。
- Purchase 與 Equip 是兩個不同 transaction。
- 同商品 purchase 必須 idempotent；double-click、refresh、back、multi-tab 不得重複扣 Coins。
- Cross-tab shop mutation 必須 serializable/merge-safe；不同 Tab 的 purchase/equip 不得 lost update。
- `unlockedCosmetics` / `equippedCosmetics` 保留作 legacy/migration mirror，不得直接刪除。

## 4. Avatar / Wardrobe Baseline

V6.3 延續 V6.1／V6.2 且必須保留：

- `AvatarRenderer`
- `AvatarWardrobe`
- `ShopItem`
- `Inventory`
- `PurchaseTransaction`
- `EquipmentTransaction`
- `shopService`
- `shopLedger`

正式 current-avatar geometry contract：

- 正式 wardrobe / wearable runtime asset 位於 `assets/v5/characters/{avatar}/wardrobe/`，採 1024 × 1536 transparent canvas。
- character center X = 512。
- ground baseline Y = 1488。
- runtime full-character skin 使用透明 WebP；原 PNG source 可保留。
- 商品 thumbnail 只作 catalog art，**不得直接 overlay 到人物上**。
- 所有正式 Child-visible wearable 都必須有四個 production avatar 的可穿資產；不得保留「卡片可見但實際不能試穿」的 dead item。

V6.3 正式 wearable contract：

- 48/48 角色裝備全部納入正式 Asset Contract，且 brother／younger／sister／younger-sister 四個 avatar 全覆蓋。
- 7 套 `full-skin` outfit × 4 avatar。
- 29 件 1024×1536 `aligned-overlay` × 4 avatar。
- 12 件 1024×1536 front/back `split-overlay` × 4 avatar。
- 3 組 validated standard effects。
- 所有 overlay 必須把定位烘焙在 1024×1536 transparent asset 本身；React component 不得靠大量 top/left/scale magic numbers修人物對位。

V6.3 runtime render modes：

- `full-skin`
- `aligned-overlay`
- `split-overlay`
- `standard-effect`
- `world`

V6.3 Equipment Preview modes：

- `avatar`：Outfit／Hair／Hat／Glasses／Headphones／Backpack／Cape，共用 `AvatarRenderer`。
- `ship`：專用 Hangar Preview，飛船為主視覺，不貼在人物腳邊。
- `robot`：專用 Companion Preview，Avatar 與 Robot 雙主體並列。
- `card`：專用 Collectible Card Viewer，具有 rarity/frame/收藏卡視覺。
- `effect`：專用 Effect Stage，效果直接作用在同一 AvatarRenderer，且支援 reduced motion。
- `world`：基地／房間專用 World Preview Stage。

Ship／Robot／Card／Effect 使用專用 preview art，禁止把 catalog thumbnail 直接放大假裝完整預覽。

## 5. Child Shop Contract

- Child-facing shop 必須以大型 Preview Stage 為第一視覺中心；依商品切換角色試穿室／星際機庫／機器夥伴舞台／收藏卡展示／特效舞台／冒險基地。
- 正式 child catalog 只可呈現 Available / Owned / Equipped / Locked-but-previewable。
- V6.3 目前 63/63 ShopItem 均具有效 Preview Path；四個 production avatar 的 browser hard gate 為 63×4 = 252/252 真實試穿 PASS。
- 不得存在 Dead Card、無反應「試穿看看」或只在購買後才能看到商品效果的正式 item。
- Child copy 禁止暴露 renderer、asset contract、incompatible、live loadout 等工程語言。
- 正式流程：試穿看看 → 收藏／免費領取 → Inventory → 立即穿上／立即使用 → 對應 Preview/Renderer → refresh persistence。
- Lv.1 cost=0 Starter Item 仍必須走 `purchaseShopItem()`，產生 cost 0 `PurchaseTransaction`，不可繞過 Inventory。

## 6. Avatar Everywhere

目前穿搭結果至少必須經同一 `AvatarRenderer` 同步到：

- Home / Player Card
- 角色成長
- 寶物商店
- Lesson completion / lesson character surfaces
- Achievement / Reward related character surfaces
- Parent/report character summaries若顯示 learner avatar亦不得自行重組另一套角色。

## 7. Family / Caregiver / Child Mode

- Caregiver 與 learner 身份分離。
- Family PIN 不應阻擋一般 Child Experience。
- Parent Report、Settings、caregiver identity/sensitive operations 才啟動 caregiver/PIN flow。
- PIN 不明文持久化；family session 由 `/api/family-session` 發行 signed token。
- PIN modal 保留 Cancel、Esc、focus trap 與友善錯誤處理。

## 8. Date / Lesson Safety

- Asia/Taipei server-confirmed date 為正式日期來源。
- 今天是唯一可以建立 attendance、AnswerEvent、mission/block/day completion 與 reward 的日期。
- 過去日唯讀；孩子未來日鎖定，只能看安全主題預告，不得建立 completion / reward / AnswerEvent。
- trusted-time API 失敗時只能安全預覽，不得因此發獎；UI 必須提供 retry/recovery。

## 9. Typography / Accessibility

- Child body text target ≥ 14px。
- Secondary information ≥ 12px。
- 9px 不得用作兒童資訊文字。
- 10–11px 僅允許非常低優先級 metadata。
- touch target ≥ 44×44px。
- modal 必須 focus-contained，Esc/Cancel 可離開。
- `prefers-reduced-motion` 必須停用非必要動畫。
- 一般文字對比以 WCAG 2.2 AA 為 release gate。

## 10. Responsive / Layout

- 正式支援 Desktop、Tablet、Mobile 與大型／超寬桌機。
- 不得只靠固定像素欄寬；主要 grid/card 必須用 `minmax()`、`clamp()`、container/max-width 與可換行布局避免互遮。
- Mobile 不是把 desktop card 逐張垂直堆疊；必須依 child-first hierarchy 重排。
- 所有正式 viewport regression 必須滿足 horizontal overflow = 0、重要欄位不互相遮擋、broken image = 0。
- V6.1 已驗證 360／390 mobile overflow = 0；後續改版不得回退。

## 11. CSS Ownership

- `styles.css`、`v2.css`、`v22.css`、`v23.css`、`v30.css`、`v40.css` 仍屬 compatibility layer，不得一次刪除。
- `legacy-compat.css` 的 selector 必須按 feature family 漸進 migration：Header → Dashboard → Calendar → Lesson → Shop → Report → Parent → Modal → Responsive。
- 每次 migration 必須先找 ownership，再搬入 feature-owned CSS、做 screenshot/browser regression，最後才刪 legacy rule。
- `!important` 總量只可下降，不得因新功能增加技術債。

## 12. Performance Baseline

V6.1 accepted Production evidence：

- Production responsive matrix：Chromium / Firefox / WebKit × 8 viewports = 24/24 PASS。
- Production core console.error = 0；HTTP errors = 0；overflow = 0；broken image = 0。
- Mobile 390×844、4G + CPU 4×：LCP 1.824s、INP 128ms、CLS 0.0005。
- Desktop Lighthouse release gate：Performance ≥ 90、LCP < 2.5s、CLS < 0.1、TBT < 200ms。
- Home 不得 eager-load 全部 Shop wardrobe assets。
- Avatar runtime 優先使用壓縮 WebP；避免重複 decode 大型角色圖。
- 後續 QA 必須增加 SPA soft-navigation：Home → Today、Home → Shop、Shop → Home、Home → Report。

## 13. Release Gate

V6.3 發布前至少必須通過：

- `npm run validate`
- `npm run validate:online`
- `npm run qa:architecture`
- `npm run qa:learning`
- `npm run qa:avatar-assets`
- `npm run qa:shop`
- `npm run qa:v63:shop-preview`（所有 63 ShopItem × 4 avatars = 252/252 真實試穿）
- `npm run qa:state`
- `npm run qa:auth`
- `npm run qa:migration`
- `npm run qa:date`
- `npm run qa:content-health`
- `npm run qa:strict`
- `npm run build`
- Chromium / Firefox / WebKit Production Browser Regression
- Desktop / Tablet / Mobile / large-desktop responsive regression

360/360 YouTube online validation 是正式 gate，不能用舊結果替代。

## 14. Release Governance

- 版本與 footer 由 `src/generated/appVersion.ts` 單一來源控制。
- 測試全部通過前不得先升 Production version。
- 目前 Production baseline：`V6.3.0 · Updated 2026-09-02`。
- V6.1.0 保留為已驗證 rollback baseline；V6.2.0 為未部署的 intermediate local RC，不可再作最終 Production release。
- V6.3.0 已完成 local release acceptance、pre-deploy backup、Production deployment 與 post-deploy E2E，正式成為 Production Baseline。
- V6.1 accepted release commit：`2d7afea896906d434698344ab07a4fe6f371472e`。
- V6.1 production acceptance docs commit：`b7295726733da8741c9ccdab0207bfeda7a2508d`。
- V6.2 pre-change checkpoint tag：`checkpoint/v6.1.0-before-v6.2`。
- V6.2 pre-change physical backup：`_BACKUPS/2026-09-02_before_V6.2/`。
- V6.2 local acceptance：36/36 responsive、三引擎 deep E2E、cross-tab 5/5、Accessibility 12/12、Failure 9/9、360/360 YouTube online、Core Web Vitals / soft-navigation performance 全 PASS。
- V6.3 pre-change physical backup：`_BACKUPS/2026-09-02_before_V6.3_equipment_redesign/`。
- V6.3 local acceptance：252/252 真實試穿、252/252 transaction flow、24/24 Preview Stage layout、36/36 responsive、三引擎 deep E2E、cross-tab 5/5、Accessibility 12/12、Failure 9/9、fresh 360/360 YouTube online、Core Web Vitals / soft-navigation performance 全 PASS。
- V6.3 Production deployment：`dpl_12VDeBJkJ7dW91rZ82b2z6dkUadz`；正式 alias `https://kids-learning-adventure-chi.vercel.app/`，Vercel status = Ready。
- V6.3 Production acceptance：252/252 真實試穿、24/24 Preview Stage layout、36/36 responsive、Chromium/Firefox/WebKit deep E2E、cross-tab 5/5、Accessibility 12/12、Failure 9/9 全 PASS；Production API contract：server-time 200、state unauthenticated 401、invalid family-session 400。
- V6.3 Production Mobile 390×844 simulated 4G + CPU 4×：LCP 2.252s、INP 128ms、CLS 0.0005；Home Shop preload = 0，soft-navigation 全 PASS。
- CSS debt 維持 `!important` 1716 → 1677（-39），feature-owned wearable magic-number selector = 0。
- 所有新版失敗都必須能完整恢復到 V6.1.0。

歷史版本與完整修復紀錄請參考根目錄 [`CHANGELOG.md`](../CHANGELOG.md) 與 `docs/production-audit/`。
