# 小小探險隊 Little Explorers V5.3.1

家庭兒童美語學習遊戲，正式定位為 **Enterprise Kids Adventure Learning Game**。V5.3.1 保留既有教材、90 天課程、180 堂教案、360 個互動任務與 360 支零重複 YouTube 影片資料，並提供企業級三欄遊戲 Dashboard、九關課堂、角色長期成長、四資源經濟、寶箱、徽章、商店與 PIN 家長保護。唯一現行產品規則見 [`docs/CURRENT-SPEC.md`](./docs/CURRENT-SPEC.md)。

## 不可破壞的資料基線

- 18 週、90 個學習日、180 堂課、360 個互動任務。
- 180 個 warmup YouTube ID + 180 個 main lesson YouTube ID，兩集合不重疊，共 360 unique IDs。
- `npm run validate:online` 必須確認 360/360 playable + embeddable。
- main lesson topic alignment 必須維持 180/180。
- `settings.users` 是爸爸／媽媽／照顧者；`settings.children` 才是哥哥／弟弟等學習者。
- V1／V2／V2.1／V2.2／V2.3／V3 資料仍可讀；V2.2 family namespace 與 cloud snapshot `version: 2` 不變。
- 內部歷史 subject type `Zhuyin` 仍可存在，但 UI 顯示「中文語音」，production DOM 不顯示注音符號。

## V5 首頁架構

Desktop 主要設計寬度 1440–1600px，內容最大寬度約 1560px。首頁固定為三欄：

- 左欄：哥哥／弟弟 Player Profile、Level、XP、Coins、Stars、Gems、AI 學習夥伴、Theme Skin。
- 中欄：學期日曆、本週進度、5／10／90 天目標、角色成長、Badge Shelf。
- 右欄：今日日期、Day、兩堂正式 Lesson Mission Card、YouTube Thumbnail、寶箱。

Hero Header 高約 130–165px，使用深藍宇宙 Banner、哥哥／弟弟、AI Robot、火箭、星球與低幅星點動畫，不占掉半個首屏。

主要導航固定六項：

1. 首頁
2. 今日課程
3. 學期日曆
4. 成就獎勵
5. 學習報表
6. 寶物商店

Mobile 改為固定 Bottom Navigation。

## V5 Design System

```text
Deep Navy      #061D57
Royal Blue     #075BC7
Sky Blue       #10BCEB
Gold           #FFD83D
Orange         #FF7B32
Success Green  #20C968
Reward Purple  #A84DF5
Card White     #F9FBFF
```

卡片分為 Primary Game Card、Mission Card、Reward Card、Status Card。Radius 主要使用 20–26px、2px 淺藍描邊與深藍柔和 shadow；Hover 只上浮 2–4px，Active 使用短縮放回彈。主要功能 icon 統一由共享 `GameIcon` glossy HUD backplate 包裝 Lucide glyph；Reward、Badge、Item、Vocabulary 使用原創 raster illustration，不使用 Emoji 代替正式圖示。

## 日期鎖定 Engine

正式日期一律以 **Asia/Taipei server time** 為準。

- API：`GET /api/server-time`，並保留 `/api/time` 相容 fallback。
- 本機 Vite QA 亦由 server middleware 提供可信台北日期，不依賴可被修改的裝置日期。
- 今天：唯一可正式進入課程與取得獎勵的日期。
- 過去：只能查看唯讀學習紀錄，不能重新挑戰或領獎。
- 未來：鎖定，不能提前查看完整任務或用 URL 直闖。
- `visibilitychange` 重新驗證日期。
- 以可信 server `now` 精準計算下一個 Asia/Taipei `00:00:00`，午夜後立即重新驗證 active day；每 5 分鐘輪詢只作容錯。
- URL `?day=...&lesson=...` 有 route guard，只允許 server-confirmed 今日課堂。

## 每堂課固定 9 Stage

V4 不再把兩堂課壓成一個三段式流程。每堂課直接使用既有 curriculum 的完整內容：

1. Stage 1｜唱歌暖身 — 原 `warmup`
2. Stage 2｜單字預覽 — 原 `vocabulary`
3. Stage 3｜觀看影片 — 原 main `video`
4. Stage 4｜暫停提問 — 原 `steps`／instruction／pause cue
5. Stage 5｜複誦練習 — 原 sentence／younger／older／caregiverTip
6. Stage 6｜互動遊戲 — Mission 1
7. Stage 7｜分類活動 — Mission 2
8. Stage 8｜完成任務 — 正式完成本堂
9. Stage 9｜領取獎勵

Stage checkpoint 會保存；重新整理不會重置。Stage 6／7 另有 Quick Check，真實保存每次作答的 `AnswerEvent`（target／answer／correct／timestamp），供家長報表計算正確率與最常錯單字；沒有作答資料時不補造統計。任務、課堂與 Reward 都有資料層守門，不只靠 UI disabled。

## 四資源 Economy 與 Idempotency

V4 使用四套資源：

- XP：Level／角色成長。
- Coins：寶物商店。
- Stars：課程完成與表現紀錄。
- Gems：特殊成就與寶箱。

`ChildProgress.rewardTransactions` 是 append-only idempotent ledger。每筆 Reward 都有唯一 Transaction ID，例如：

```text
v4-stage:<day>:<lesson>:<stage>:<child>
v4-day:<day>:<child>
v4-treasure:<egg>:<child>
```

刷新、返回、重進頁面都不能重複領取。Server `/api/state` 亦會對 `rewardTransactions`／`answerEvents` 以事件 ID 去重；相同 ID 若內容不同直接回 `409 Conflict`，並使用 `x-family-base-updated-at` 做 optimistic concurrency，避免舊裝置覆蓋較新的雲端 snapshot。既有 mission／block／day／egg 完成紀錄仍保留並與 V4 ledger 相容。哥哥與弟弟 Progress 完全分離。

## 角色、Level 與商店

- Level 1–15。
- Lv.1：學習新手。
- Lv.5：第一次大型進化。
- Lv.10：第二次大型進化。
- Lv.13：後期強化。
- Lv.15：傳奇英雄。
- 首頁顯示「下一級還差 XX XP」。

目前寶物商店共 52 個商品。角色穿戴包含 6 髮型、6 服裝、5 帽子、5 眼鏡、5 背包、5 披風、5 耳機；另有 3 太空船、3 基地房間、3 AI Robot Skin、3 Card Skin、3互動特效。商品分 common／rare／epic／legendary；Coins 只來自學習紀錄，不使用真實金錢或抽卡付費。購買後立即加入該孩子自己的解鎖／裝備狀態，世界型商品會實際改變首頁對應元素。

## Badge、Treasure 與 Reward

- 24 枚原創 Badge。
- 特殊 Treasure Day 只有完成當日兩堂課後才可開箱。
- 每位孩子各自只能領一次 Treasure。
- V4 Full-screen Reward Modal 顯示 XP／Coins／Stars／Gems／Badge／Level Up。
- Reward Modal 支援 Skip 與 Continue Adventure。
- Treasure 使用 lazy-loaded `lottie-web` light SVG 開箱動畫，再銜接 Reward Modal；Badge、Level Up 使用較強動畫，普通 Card 不永久 Glow。

## Theme Skin

五套原創 Skin：

- 星際英雄
- 機甲戰士
- 賽車冒險
- 奇幻精靈
- 海底世界

Theme 可以改 Header accent、背景、Card border、Button 與角色裝備視覺，但不修改教材資料、日期規則、安全規則或課程 UI 結構。

## AI Companion、聲音與動畫

AI 學習夥伴「小光」依今日狀態顯示短提示，可點擊播放語音，並具眨眼、手部微動與狀態式 idle；`prefers-reduced-motion` 會關閉這些動畫，而且 Browser QA 會實際以 media emulation 驗證星星與 Robot hand 的 `animationName` 變成 `none`。全站聲音設定保存在 localStorage，不會在網站開啟時自動播放背景音樂。

Web Audio 提供：click、success、error、fanfare、treasure 五類短音效。

動畫分為背景、UI microinteraction、Reward 三層。大型動態元素使用 IntersectionObserver，離開 viewport 後暫停；Reward Modal 動態 lazy-load；圖片使用 `GameImage` intrinsic Skeleton Loading、lazy decoding（Hero critical 圖可 eager/high-priority）；全站支援 `prefers-reduced-motion`。

## Parent Mode 與 PIN

- Child Mode 不會因 Family PIN 被整站鎖住。
- 學習報表與敏感設定需 Family 管理者 PIN。
- PIN Modal 有 `×`、取消、Esc。
- 使用大型數字 keypad，支援既有 4–6 位 Family PIN。
- 錯誤 PIN 不清掉整個 Modal，使用友善 shake feedback。
- 家長／照顧者個人 PIN 仍採 PBKDF2-SHA256、random salt、180,000 iterations。
- Family 管理者 PIN 只在 `/api/family-session` 驗證瞬間傳送；server 以 `FAMILY_PIN_PEPPER` HMAC 映射既有 family namespace，再簽發 30 天 family session。瀏覽器只持久化 `familyId + signed token`，不持久化明文 PIN；家長／照顧者個人 PIN 仍只保存 PBKDF2 credential。

## V4 正式資產

V4 主要兒童 runtime 使用：

```text
public/assets/v40/
```

硬性 Asset Gate：

- Dashboard Hero：至少 1920×600。
- Character Full：30 張，1024×1024。
- Character Bust：6 張，512×512。
- Robot／Father／Mother／Caregiver Full：1024×1024。
- Robot／Father／Mother／Caregiver Bust：512×512。
- Shop Item：52 張，512×512。
- Badge：24 張，512×512。
- Theme Card：5 張，1024×768。
- Vocabulary：所有 161 個 unique term 都有至少 640×480 V4 圖像。
- Reward Icon：XP／Coin／Star／Gem／Treasure 各 512×512。
- V4 runtime 對 `assets/v30/` 的引用必須為 0。
- `src/main.tsx` 只載入 `src/styles/index.css`。`styles.css`／V2／V2.2／V2.3／V3／V4 CSS 仍保留為 migration compatibility layer，但只能由 `src/styles/legacy-compat.css` 依既有順序載入；新 CSS 只能寫入 `src/styles/` 的 feature-owned 檔案。完整現況以 `docs/CURRENT-SPEC.md` 為準，歷史演進以 `docs/CHANGELOG.md` 為準。

生成器：`scripts/generate_v40_assets.py`

Asset QA：`scripts/qa_v40_assets.py`。除尺寸與數量外，會檢查 V4 runtime 與可見 `SettingsView` 不得再引用 `assets/v30/`。

## QA / Release Gate

```bash
npm run validate
npm run validate:online
npm run qa:assets
npm run qa:state
npm run qa:auth
npm run qa:migration
npm run qa:date
npm run qa:browser
npm run qa:performance
npm run qa:orbit
npm run qa:strict
npm run build
npx vercel build --prod
git diff --check
```

Browser QA：`scripts/qa_v40_browser.py`，目前驗證：

- 六項主要導航。
- 三欄 Dashboard。
- 今日兩堂 Lesson Mission Card。
- 九關 sequential flow。
- 原 YouTube／Vocabulary／Sentence／完整教案 timeline 可見。
- 過去／未來 URL route guard。
- 過去日期唯讀歷史紀錄。
- Reward transaction idempotency。
- Treasure idempotency。
- V4 Reward Modal。
- Skeleton Loading 與 AI Robot motion。
- 真實 `AnswerEvent`：自動測一錯一對，家長報表顯示 50% 正確率與最常錯單字。
- PIN keypad／取消／Esc／錯誤狀態，以及 Family PIN → signed session 的實際解鎖；Browser storage 不得留下 active PIN key 或 `:<PIN>:` namespace。
- 家長設定頁必須留在 V4 Shell，顯示五套 V4 Theme Skin，且可見圖片不得引用 `assets/v30/`。
- Desktop 1440／Tablet 820／iPhone 390／Android 412。
- horizontal overflow <= 1、broken image = 0、Bopomofo = 0、undersized touch target = 0；Android 412×915 與 reduced-motion 必須實際通過 Browser Gate。

Enterprise evaluator：`scripts/orbit_ux_director_v40.ts`，正式門檻 >= 98/100。

目前 V4 audit：**100/100**。`npm run qa:performance` 會拒絕超過 6 小時的 Lighthouse 報告，並硬性驗證 Performance >=90、LCP <2.5s、CLS <0.1、TBT <200ms；`npm run qa:strict` 要求 TypeScript 在 `noUnusedLocals + noUnusedParameters` 下完全無 dead import/helper/parameter。`npm run qa:state` 驗證 Transaction ID 去重、immutable event conflict、stale base version 與 `familyCode` sanitization；`npm run qa:auth` 驗證舊 HMAC namespace 相容、signed session、token 竄改／過期拒絕、Bearer-only state API、前端無 active PIN write，以及同來源大量 Family PIN session request 會被 429 + `Retry-After` 節流；`npm run qa:migration` 會以舊 `active-family-pin-v22 + v22:<PIN>:*` 真實啟動並確認 session 發行、資料保留、含 PIN 的 legacy keys 刪除、active-user 遷移。`npm run qa:date` 會固定模擬 Asia/Taipei `23:59:59.500 → 00:00:00.000`，目前排程延遲實測 750ms，並驗證昨天鎖回 past、新一天切成 today、未來維持 future。Chromium／WebKit engine-level QA 亦已驗證 Desktop／Mobile 首頁、兩堂課與 9 Stage；這是 rendering-engine compatibility evidence，不等同實體 Safari／Edge App 測試。

Lighthouse Desktop production preview 基線：

- Performance：99
- FCP：約 0.41s
- LCP：約 0.84s
- Speed Index：約 0.49s
- CLS：約 0.00017
- TBT：0ms

Google Fonts 已從 V3 compatibility CSS 的 render-blocking `@import` 改成 `index.html` 非阻塞 preload/swap；Fredoka／Nunito／Noto Sans TC 視覺仍保留。

TypeScript 固定 5.9.3。

## Cloud / API

Vercel production 使用 `/api/state` + private Vercel Blob。

- `POST /api/family-session` 接收一次性 Family PIN，使用 server-side `FAMILY_PIN_PEPPER` HMAC SHA-256 產生與 V2.2 相同的 `familyId`，並簽發 30 天 session token。API 另有 application-level 同來源 PIN attempt rate limit（超量回 429 + `Retry-After`）；此 serverless instance 內節流是 defense-in-depth，正式 production 仍應搭配 Vercel Edge／Firewall 等平台級全域 rate limit。
- `/api/state` 只接受 `Authorization: Bearer <family-session>`；不再接受 `x-family-pin`。GitHub Pages 備援可透過 CORS 使用 Vercel 的 family-session/state API。
- localStorage 正式 namespace 為 `star-learning-v40:<familyId>:*`；舊 `v21/v22:<PIN>:*` 只在一次性 migration 讀取，成功後刪除。
- `cloudSync.familyCode` 僅保存不可逆 `familyId`，server snapshot 仍會 sanitization 為空字串。
- `rewardTransactions`／`answerEvents` 在 server 端以 ID 去重；同 ID 不同內容拒絕寫入。
- `x-family-base-updated-at` optimistic concurrency 防止 stale client 覆蓋最新 snapshot。
- V1–V3 snapshot/migration 相容不得破壞。

## 部署位置

- Vercel Production：https://kids-learning-adventure-chi.vercel.app/
- GitHub Pages：https://craigyu-phd.github.io/kids-learning-adventure/
- GitHub：https://github.com/craigyu-PHD/kids-learning-adventure

## 授權

YouTube 使用官方嵌入播放器，內容著作權屬原頻道／權利人。Super Simple Songs、快樂斑比 HAPPY BAMBI 僅作合法嵌入教材來源。Lucide 為 ISC License。V4 品牌角色、徽章、商店 Item、Theme、教材插畫與 UI 採原創視覺方向，不使用 Spider-Man、Iron Man、Pokémon、Apple Memoji 等第三方受保護角色素材。
