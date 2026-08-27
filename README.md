# 小小探險隊｜兒童家庭共學網站 V2.3

給家庭共學使用的 18 週幼兒學習網站。主要操作者是爸爸、媽媽或其他照顧者，學習者則是哥哥、弟弟等兒童。大人控制影片節奏，孩子透過唱跳、暫停模仿、複誦、回看、找東西、動作、問答與分齡任務完成每天兩節課。

## V2.3 核心更新

- 18 週、90 個學習日、180 節課、360 個互動任務的架構維持不變。
- 課程影片全面重新配置：180 個唱跳暖身 YouTube ID 全部不同，180 個正式課程 YouTube ID 全部不同，兩個集合也完全不重疊，因此整學期合計 360 個 unique YouTube IDs。
- `npm run validate` 對影片零重複、180 個 lesson title 唯一、360 個 mission prompt 唯一與 180/180 主課 topic alignment 採硬性 Gate；任一條件失敗即停止發布。
- 每節約 30 分鐘：前 15 分鐘為唱跳／節奏／動作模仿，後 15 分鐘為正式素材、暫停、回看、複誦、跨域實作、問答與分齡合作。
- 全站維持「不顯示注音」規則，production DOM 不得出現 Bopomofo。舊 `Zhuyin` subject type 僅為資料相容，UI 顯示為「中文語音」。
- V2.3 主視覺素材集中在 `public/assets/v23/`，角色、四階進化、火箭、機器人、獎勵、主題預覽與課程插圖均走 raster WebP production pipeline。
- 五套主題不再只是換色：星能英雄、機甲出擊、迷你戰車、極速賽道、奇獸夥伴各自具有不同面板幾何、背景紋理、按鈕動態、光效，以及桌面自訂游標、軌跡與點擊爆發。
- 小字全面提升可讀性，重要輔助標籤以約 11px 以上、內文約 13px 以上為目標，同時維持手機／平板／桌機無水平溢出。
- `prefers-reduced-motion`、觸控與粗指標裝置會自動停用自訂游標與高動態效果。

## 使用者、學習者與家庭權限

網站操作者與學習者完全分開。

- `settings.users`：爸爸、媽媽、其他照顧者等登入使用者，可各自設定個人 PIN。
- `settings.children`：哥哥、弟弟等學習者，分別擁有出席、課程進度、任務、XP、金幣、彩蛋、Level 與四階角色進化。
- 頂部「切換使用者」只能列出家長／照顧者，不會列出哥哥、弟弟。
- 一般家長登入後不能直接進入家庭管理中心；高權限操作必須再次通過家庭管理者 PIN。
- 個人 PIN 使用 PBKDF2-SHA256、random salt、180,000 iterations。

XP 與金幣不儲存可持續 `+=` 的總額欄位。系統只保存完成任務、完成單元、完成學習日與已領彩蛋 ID，畫面上的 XP／金幣每次由完成紀錄重新計算。

## 課程規格

- 18 週 × 每週一至週五，共 90 個學習日。
- 每天 2 節，每節約 30 分鐘，家庭實際完成時間約 45–60 分鐘。
- 180 節課程、360 個互動任務。
- 英文為主軸，穿插數學、中文語音、生活、自然探索與總複習。
- YouTube 教材以 Super Simple Songs、快樂斑比 HAPPY BAMBI 為主。
- 影片是家長帶課素材，不是被動連續播放。
- 每節教案包含暖身、播放、暫停、複誦、回看、找東西、動作、問答、分齡任務、收尾、完成標準、XP／金幣、完成本節與課後紀錄。

### V2.3 影片唯一性

`src/data/videos.ts` 保存 180 個 block 的 explicit assignment。每個 block 都有一支唯一暖身與一支唯一主課。

```text
90 days
180 blocks
360 missions
180 unique warmup YouTube IDs
180 unique main YouTube IDs
360 unique IDs total
180/180 main lesson topic alignment
```

只要 curriculum、影片 ID、topics 或 assignment 有任何修改，都必須重新執行本機與線上 validator。

## 家庭 PIN 與雲端同步

Vercel 正式站使用 Vercel Function `/api/state` 搭配 private Vercel Blob。

1. 第一次進站輸入 4–6 位數家庭 PIN。
2. 不同 PIN 對應完全獨立的 localStorage 與雲端 namespace。
3. PIN 透過 `x-family-pin` request header 傳送，不放 URL query。
4. Blob pathname 使用伺服器端 `FAMILY_PIN_PEPPER` 做 HMAC，不直接使用 PIN。
5. V2.3 沿用 V2.2 family schema／namespace 以保持既有家庭資料相容；V1／V2／V2.1／V2.2 本機資料遷移流程仍保留。
6. 雲端讀取失敗時，不會以可能較舊的本機資料自動覆寫遠端狀態。

`.env.local`、Vercel token、Blob token 與 `FAMILY_PIN_PEPPER` 不得進入 Git、前端 bundle、公開 log 或 URL。

## V2.3 視覺系統

正式 raster assets：

```text
public/assets/v23/
```

包括：

- 爸爸、媽媽、哥哥、弟弟、機器人
- 哥哥 Lv.1／Lv.5／Lv.10／Lv.15 四階進化
- 弟弟 Lv.1／Lv.5／Lv.10／Lv.15 四階進化
- Hero 小隊、火箭、星星、XP、水晶、金幣、寶箱等獎勵
- 五套冒險主題預覽
- 食物、數字、探索、複習等課程插圖

V2.3 visual layer 位於 `src/v23.css`，在 `v2.css`、`v22.css` 之後載入，專門處理五主題差異化、字級可讀性、游標／軌跡／點擊特效，以及新版 hero composition。

## 專業 QA Gate

V2.3 的最終視覺審查角色稱為 **Orbit UX Director**。正式發布分數需達 98/100 以上，至少檢查：

- 視覺一致性與兒童吸引力
- 家長閱讀與操作清晰度
- 五套主題差異化
- 游標、軌跡、點擊與 reward feedback
- 桌機／平板／手機響應式
- light／dark／system
- reduced-motion 與觸控裝置處理
- Image assets 完整載入
- DOM Bopomofo = 0
- 家長／學習者分離、個人 PIN、管理者 PIN
- 家庭資料隔離與 API GET／PUT／DELETE

## 開發與正式發布 Gate

```bash
npm install
npm run validate
npm run validate:online
npm run qa:browser
npm run qa:orbit
npx tsc --noEmit
npm run build
npx vercel build --prod
git diff --check
```

正式部署後還必須驗證：

- Vercel HTTP 200
- GitHub Pages HTTP 200
- V2.3 Image assets HTTP 200 / image/webp
- 手機／平板／桌機無 horizontal overflow
- light／dark／system
- 五個 adventure themes
- 爸爸／媽媽／照顧者登入流程
- 哥哥／弟弟只存在學習者區
- 家庭管理者 PIN Gate
- API GET／PUT／DELETE 與兩個 QA family 隔離
- QA family 測試資料清除
- GitHub Pages workflow success
- `git status` clean

TypeScript 固定為 5.9.3，以維持 Vercel Functions builder 相容性。

## 素材與授權

- YouTube：使用官方嵌入播放器與原影片連結，著作權歸原頻道／權利人所有。
- Super Simple Songs：https://www.youtube.com/@SuperSimpleSongs
- 快樂斑比 HAPPY BAMBI：https://www.youtube.com/@happy-bambi
- Lucide icons：ISC License，只作功能型圖示。
- 角色、進化、主題與遊戲化介面不使用蜘蛛人、鋼鐵人、寶可夢等受保護角色名稱或具識別性的造型。

## 部署

- Vercel production：https://kids-learning-adventure-chi.vercel.app/
- GitHub Pages backup：https://craigyu-phd.github.io/kids-learning-adventure/
- GitHub：https://github.com/craigyu-PHD/kids-learning-adventure
