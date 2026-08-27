# 小小探險隊｜兒童家庭共學網站 V3.0

給家庭共學使用的 18 週兒童美語學習網站。V3.0 是 **Presentation Layer 重構**：保留 V2.3 的家庭資料、課程、PIN、XP／金幣、角色進化、報表與雲端同步架構，將產品重新定位為 **Premium Storybook Adventure EdTech**。

## V3.0 核心原則

- 18 週、90 個學習日、180 節課、360 個互動任務完全保留。
- 180 個唱跳暖身與 180 個主課 YouTube ID 維持全部唯一，合計 360 unique IDs；180/180 主課 topic alignment 仍是硬性 Gate。
- V1／V2／V2.1／V2.2／V2.3 本機資料與 V2.2 family namespace 繼續相容，cloud snapshot 仍使用 `version: 2`。
- `settings.users` 是爸爸／媽媽／照顧者登入帳號；`settings.children` 才是哥哥／弟弟等學習者。
- XP／金幣只由完成紀錄即時計算，不建立 mutable total balance。
- 全站不顯示注音；`Zhuyin` 只作資料相容 subject type，production DOM Bopomofo 必須為 0。

## Brand Design System

V3.0 使用單一品牌語言，Adventure World 不再改變整套 UI。

```text
Brand Blue       #4F67E8
Secondary Purple #7756D8
Reward Yellow    #FFC857
Success Green    #52C99A
Speaking Coral   #FF7B72
Listening Sky    #55BFE9
Background       #F7F8FC
Card             #FFFFFF
Primary Text     #26324A
Secondary Text   #68738A
```

Typography：Fredoka（Display）／Nunito（一般 UI）／Noto Sans TC（中文）。Child Mode 可見文字原則不低於 14px，主要 CTA 至少 52px。

Radius 只使用 12／16／24／32／pill；Shadow 只使用 Soft、Card、Floating 三階。普通 Card、Button、Avatar 不使用持續 glow。

## Child Mode

兒童主要導航只有四個入口：

- 首頁
- 冒險世界
- 獎勵
- 我的角色

首頁 Hero 改為明亮 Storybook Adventure 場景，只告訴孩子今天要去哪裡、學什麼、如何開始。Primary CTA 為「開始今天的冒險」，Cloud、PIN、Report 等系統資訊不出現在兒童 Hero。

每節課使用四階段 Presentation：

```text
Listen → Repeat → Play → Complete
```

- Listen：唱跳暖身＋正式影片。
- Repeat：Vocabulary Cards、英文發音與句型。
- Play：兩個既有互動任務與完成標準。
- Complete：完成本節並觸發既有 XP／金幣／角色成長。
- 完整 caregiver script、分齡提示、觀看紀錄與課後反思仍保留，但收進可展開 Parent Guide，不與孩子主要任務搶視線。

## Parent Mode

Parent Mode 與 Child Mode 使用不同 Presentation Layer。Report、Cloud、PIN、Settings、Users 與高權限操作集中於家長學習中心；Parent Mode 使用較高資訊密度、白／灰／品牌藍語言，且不使用持續動畫。

家庭管理者 PIN 仍是最高權限。照顧者個人 PIN 使用 PBKDF2-SHA256、random salt、180,000 iterations；一般照顧者仍須再次通過管理者 PIN 才能進家庭管理中心。

## Adventure Worlds

V3.0 保留舊 `visualTheme` ID 以確保資料相容，但語意改為 Adventure World：

- `hero` → Hello Town
- `mecha` → Color Garden
- `tank` → Animal Forest
- `racing` → Food Market
- `creature` → Ocean Adventure
- 額外展示 Space Station

World 只控制故事環境、插畫與情境色；導航、按鈕、卡片、Typography、Radius、Shadow 與品牌 token 不隨 World 改變。

## 圖像與角色

V3.0 Storybook 場景素材：

```text
public/assets/v30/
```

目前包含 Storybook Hero，以及 Hello Town、Color Garden、Animal Forest、Food Market、Ocean Adventure、Space Station 六個世界插畫。核心 Art Direction 為 Soft 3D Storybook Illustration。

既有 `public/assets/v23/` 的哥哥／弟弟四階進化與 Mascot／Avatar 圖保留作角色進化與 Costume 相容資產，不再控制 V3.0 的世界 UI 或 Hero 場景。

功能性 icon 統一使用 Lucide。V3.0 移除自訂 Adventure Cursor、Cursor Trail 與無意義 Click Burst；只保留 Button／Card／Modal／Reward／Character 等有明確提示或回饋目的的動畫，並支援 `prefers-reduced-motion`。

## 課程規格與零重複 Gate

```text
90 days
180 blocks
360 missions
180 unique warmup YouTube IDs
180 unique main YouTube IDs
360 unique IDs total
180/180 main lesson topic alignment
```

每節約 30 分鐘，前半段以唱跳、節奏與動作模仿暖身，後半段進入正式影片、暫停、回看、複誦、實作、問答與分齡任務。影片是家長帶課素材，不是被動連播。

只要 curriculum、影片 ID、topics 或 assignment 有修改，都必須重新執行 `npm run validate` 與 `npm run validate:online`。

## 家庭 PIN 與雲端同步

Vercel production 使用 `/api/state` + private Vercel Blob。

1. 家庭 PIN 為 4–6 位數。
2. 不同 PIN 對應獨立 localStorage 與雲端 namespace。
3. PIN 只透過 `x-family-pin` header 傳送，不放 URL query。
4. Blob pathname 使用伺服器端 `FAMILY_PIN_PEPPER` 做 HMAC，不直接使用 PIN。
5. `cloudSync.familyCode` 在 server snapshot 會 sanitization。
6. 雲端讀取失敗時，不會用可能較舊的本機副本覆寫遠端資料。

`.env.local`、Vercel token、Blob token、`FAMILY_PIN_PEPPER` 不得進 Git、前端 bundle、公開 log 或 URL。

## V3.0 QA Gate

```bash
npm run validate
npm run validate:online
npm run qa:browser
npm run qa:orbit
npx tsc --noEmit
npm run build
npx vercel build --prod
git diff --check
```

`scripts/qa_v30_browser.py` 使用 Chrome Headless/CDP 實測：

- 1440 desktop／820 tablet／390-class mobile
- Child Mode 文字與 44px touch target
- Storybook Hero 與 V3 assets
- Listen → Repeat → Play → Complete
- Parent Mode／個人 PIN／管理者 PIN
- 五個 Adventure World 的 UI signature 必須完全一致
- light／dark／system
- mobile Bottom Sheet
- horizontal overflow = 0
- broken images = 0
- production DOM Bopomofo = 0
- Adventure Cursor／Trail／Burst DOM = 0

`scripts/orbit_ux_director_v30.ts` 是 V3.0 最終產品審查角色，正式發布門檻為 **98/100**。

正式部署後仍必須驗證 Vercel／GitHub Pages HTTP 200、V3 WebP HTTP 200、production API GET／PUT／DELETE、兩組 QA family 隔離、`familyCode` sanitization、QA family 清除、GitHub Pages workflow success 與 `git status clean`。

TypeScript 固定為 5.9.3。

## 部署

- Vercel production：https://kids-learning-adventure-chi.vercel.app/
- GitHub Pages backup：https://craigyu-phd.github.io/kids-learning-adventure/
- GitHub：https://github.com/craigyu-PHD/kids-learning-adventure

## 授權

- YouTube：官方嵌入播放器，著作權歸原頻道／權利人所有。
- Super Simple Songs：https://www.youtube.com/@SuperSimpleSongs
- 快樂斑比 HAPPY BAMBI：https://www.youtube.com/@happy-bambi
- Lucide icons：ISC License。
- 品牌角色、世界與 UI 為本專案原創方向，不使用受保護兒童品牌 IP、商標或具識別性的角色造型。
