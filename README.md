# 小小探險隊｜兒童家庭共學網站 V3.0

給家庭共學使用的 18 週兒童美語學習遊戲。V3.0 現行定位為 **Premium Kids Adventure Learning Game**：保留既有 90 天課程、家庭安全架構與 V1／V2／V2.1／V2.2／V2.3 資料相容，並加入可信日期 Daily Challenge、五階角色成長、Cosmetic、24 枚徽章、全螢幕 Reward、9 世界 Adventure Map 與高解析教材資產。

## 核心不變條件

- 18 週、90 個學習日、180 節課、360 個互動任務。
- 180 個 warmup YouTube ID 與 180 個 main lesson YouTube ID 全部唯一，兩集合不重疊，合計 360 unique IDs。
- 180/180 主課影片與課程 topic alignment 必須通過驗證。
- `settings.users` 是爸爸／媽媽／照顧者等網站操作者；`settings.children` 才是哥哥／弟弟等學習者。
- XP／金幣由 mission／block／day／egg／cosmetic 完成與解鎖紀錄即時計算，不建立可任意 `+=` 的總額欄位。
- V2.2 family namespace、cloud snapshot `version: 2`、V1～V2.3 migration 與既有雲端資料相容維持不變。
- 全站不顯示注音；內部 `Zhuyin` subject type 僅作歷史資料相容，production DOM Bopomofo 必須為 0。

## Daily Challenge

正式挑戰日期以 **Asia/Taipei** 為準。前端透過 `/api/time` 取得 server-confirmed 台北日期；本機 Vite dev server 亦提供同語意 middleware，QA 不依賴可被手動修改的裝置日期。

- 今天：唯一可以正式完成並取得 XP／Coins／Badge 的日期。
- 未來：鎖定並顯示「XX 月 XX 日解鎖」。
- 過去：只能進入回顧模式，可重播教材、複習 Vocabulary／句型，不可修改進度或重領獎勵。
- 同一 mission／block／day／egg 完成紀錄採單向寫入，不能取消後重刷。
- 每日正式流程固定為：

```text
Warm-up → Learn → Challenge
```

三段完成才算當日正式通關。首頁未完成時主要 CTA 為「開始今天的冒險」；完成後切換成「今天完成了！」並提示下一個解鎖日期。

## Brand Design System

Adventure World 只改變故事環境與內容識別，不改整套 UI。

```text
Brand Purple      #6C63E8
Sky Blue          #63C7F5
Sun Yellow        #FFD35A
Coral             #FF7E72
Mint Green        #58D2A0
Adventure Orange  #FFA24A

Light BG          #F7F8FF
Light Surface     #FFFFFF
Text              #27314A
Muted             #75809A
```

Night Adventure Mode：

```text
Night BG          #171A32
Surface 1         #222742
Surface 2         #2B3150
Surface 3         #343B5D
Border            #444C70
Text              #F8FAFF
Muted             #B6BFDA
Purple            #9D91FF
Sky               #72D6FF
Yellow            #FFD966
Mint              #68E0AE
Coral              #FF8A82
```

Typography 使用 Fredoka／Nunito／Noto Sans TC。Child Mode 可見 leaf text 不低於 14px；touch target 不低於 44×44px；兒童主要 CTA 至少 52px。

Radius token：12／16／22／28／pill。普通 Card 使用柔和 border 與低幅 shadow；只有 Reward／Rare Badge／成功狀態可以短暫使用較強視覺回饋。

## Child Mode

兒童主要導航只有四個入口：

- 首頁
- 冒險世界
- 獎勵
- 我的角色

首頁是 Daily Adventure 入口，只突出今天日期、Adventure、主要角色／世界、今日進度與單一主 CTA。Cloud、PIN、Report、資料同步等管理資訊不進兒童首屏。

課程內完整 caregiver script、影片回看／暫停、分齡提示、觀看紀錄與課後反思仍保留，但集中於 Parent Guide，不與兒童主要任務搶視覺。

## 角色成長與 Cosmetic

每個 Avatar 使用五階成長：

1. Little Explorer
2. Adventure Rookie
3. Star Explorer
4. Adventure Master
5. Legendary Explorer

XP 決定 Level 與 Stage。Stage 5 有低幅度專屬 Idle Animation，並遵守 `prefers-reduced-motion`。

Cosmetic 包含帽子、眼鏡、背包、披風、耳機。解鎖使用學習所得金幣；`calculateRewards()` 回傳 earned／spent／available coins，仍不建立 mutable balance。裝備後會直接顯示在首頁與角色 Avatar 上，而不只顯示文字狀態。

## Badge 與 Reward Loop

共有 24 枚原創 Badge，分成 6 類：Streak／Speaking／Listening／Learning／Adventure／Special。每枚 Badge 有名稱、短說明、取得日期、鎖定剪影；Rare Badge 可使用輕微短暫光效。

任務／單元／Daily Challenge 完成後使用全螢幕 Reward Moment，顯示 XP、Coins、必要時顯示 `NEW BADGE!`，並提供 Skip／Continue Adventure。Reward overlay 控制在約 1.6–2.0 秒，不超過 3 秒；同一完成紀錄不會重複發獎。

## Adventure Map

Child Mode 使用 9 個 Learning World 的關卡地圖：

- Hello Town
- Color Garden
- Animal Forest
- Family Village
- Number Mountain
- Food Market
- Ocean Adventure
- Dino Island
- Space Station

地圖狀態：完成為綠色／星星、今天為紫色、過去未完成為灰色足跡、未來為鎖頭、特殊日期為 Treasure Day。家長仍可在 Parent Mode 使用課程月曆。

舊 `visualTheme` ID (`hero`／`mecha`／`tank`／`racing`／`creature`) 只為舊資料相容保留；五個 ID 的 UI Design System signature 必須完全一致。

## Parent Mode 與 Family PIN

Parent Mode 集中 Report、Calendar、Cloud、PIN、Settings、Users、家庭成員管理與高風險資料操作。

- Child Mode 不因 Family PIN 被整站鎖住。
- 只有家長專區／敏感設定要求 Family 管理者 PIN。
- PIN Modal 固定有右上角 `×`、底部「取消」，支援 `Esc`。
- 尚未設定 Family PIN 的本機家庭可選「設定 PIN」「稍後再說」「取消」。
- 錯誤 PIN 保留輸入內容並顯示友善提示，不進入死胡同。
- 家長／照顧者個人 PIN 使用 PBKDF2-SHA256、random salt、180,000 iterations。

## 正式圖像資產

V3 runtime 只使用：

```text
public/assets/v30/
```

目前資產硬性規格：

- Hero／World：1920×1080。
- 角色／家長：1024×1024。
- Badge：512×512。
- Vocabulary：每個課程 vocabulary term 都有 640×480 專屬教材插畫。
- runtime `assets/v23` 引用必須為 0。

`scripts/generate_v30_assets.py` 是可重現的 V3 raster asset build pipeline；`scripts/qa_v30_assets.py` 驗證尺寸、24 Badge ID、Vocabulary coverage 與 runtime v23 dependency。

Vocabulary Card 使用單一主體插畫、英文文字與 Speech Synthesis 英文發音。功能性 UI icon 統一使用 Lucide；Badge 與教材圖不使用 Lucide 代替。

## Motion

動畫只服務開始、完成、答對、升級、解鎖、提示與必要的角色反應。沒有特殊 Mouse Cursor、Cursor Trail、Click Burst、永久粒子或普通 Card glow。

- Button：140ms 級。
- Card：180ms 級。
- Panel／Modal：220ms 級。
- Page：280ms 級。
- Reward／Badge：約 600–1200ms 動畫，overlay 約 1.6–2.0 秒。
- Character reaction：約 800–1600ms。
- Legendary Explorer 可以有低幅度 Idle。
- 全站支援 `prefers-reduced-motion`。

## 家庭 PIN 與雲端同步

Vercel production 使用 `/api/state` + private Vercel Blob。

1. 家庭 PIN 為 4–6 位數。
2. 不同 PIN 對應獨立 localStorage 與雲端 namespace。
3. PIN 只透過 `x-family-pin` header 傳送，不放 URL query。
4. Blob pathname 使用 server-side `FAMILY_PIN_PEPPER` HMAC SHA-256，不直接使用 PIN。
5. `cloudSync.familyCode` 在 server snapshot 會 sanitization。
6. 雲端讀取失敗時，不使用可能較舊的本機副本自動覆寫遠端資料。

`.env.local`、Vercel token、Blob token、`FAMILY_PIN_PEPPER` 不得進 Git、前端 bundle、公開 log 或 URL。

## V3.0 QA Gate

```bash
npm run validate
npm run validate:online
npm run qa:assets
npm run qa:browser
npm run qa:orbit
npx tsc --noEmit
npm run build
npx vercel build --prod
git diff --check
```

`scripts/qa_v30_browser.py` 使用 Chrome Headless/CDP 實際操作並驗證：

- 1440 desktop／820 tablet／390-class mobile。
- Daily Challenge `Warm-up → Learn → Challenge`。
- Reward Moment 實際出現。
- 9 個 Learning World／90 個 Map node。
- 每位學習者 24 Badge。
- 5 階 Character growth 與可見 Cosmetic overlay。
- Parent／Child presentation 分離。
- 個人 PIN、管理者 PIN、錯誤 PIN、取消、`×`、Esc。
- 五個 legacy Adventure World ID 的 UI signature 完全一致。
- light／Night Adventure／system。
- mobile Bottom Sheet。
- horizontal overflow = 0、broken images = 0、Bopomofo = 0。
- Child visible text >= 14px、touch target >= 44px。
- Adventure Cursor／Trail／Burst DOM = 0。

`scripts/orbit_ux_director_v30.ts` 是最終產品審查，正式門檻為 **98/100**。

正式部署後仍需驗證 Vercel／GitHub Pages HTTP 200、V3 assets HTTP 200、production API GET／PUT／DELETE、兩組 QA family isolation、`familyCode` sanitization、QA family cleanup、GitHub Pages workflow success 與 `git status clean`。

TypeScript 固定 5.9.3。

## 部署

- Vercel production：https://kids-learning-adventure-chi.vercel.app/
- GitHub Pages backup：https://craigyu-phd.github.io/kids-learning-adventure/
- GitHub：https://github.com/craigyu-PHD/kids-learning-adventure

## 授權

- YouTube：官方嵌入播放器，著作權歸原頻道／權利人所有。
- Super Simple Songs：https://www.youtube.com/@SuperSimpleSongs
- 快樂斑比 HAPPY BAMBI：https://www.youtube.com/@happy-bambi
- Lucide icons：ISC License。
- 品牌角色、世界、徽章、教材插畫與 UI 為本專案原創方向，不使用受保護兒童品牌 IP、商標或具識別性的角色造型。
