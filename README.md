# 星際共學基地｜兒童美語教學網站 V2.1

給家庭共學使用的 18 週幼兒學習網站。主要使用者是爸爸、媽媽或其他照顧者，由大人控制影片節奏，帶領多名小朋友一起完成唱跳、觀看、暫停複誦、回看、互動遊戲與跨域任務。

## V2.1 主要更新

- 家庭資料改以 4–6 位數字 PIN 識別；首頁不公開列出所有家庭設定檔。
- 同一 PIN 在手機、平板、Mac 與 Windows 可讀取同一份家庭進度，不同 PIN 的本機與雲端資料完全分開。
- 設定頁可直接輸入另一組 PIN：新 PIN 建立新的家庭設定檔；既有 PIN 載入原本家庭。
- 舊版這台裝置若已有資料，第一次進入會預填 PIN `1234` 以利遷移。
- PIN 透過 request header 傳送；Vercel 後端以私密 `FAMILY_PIN_PEPPER` 做 HMAC 後才形成 Blob namespace，PIN 不直接出現在 URL 或 Blob 路徑。
- 重要中文字的注音改為「每個中文字右側一組注音」，聲調與注音欄分離定位，避免聲調被壓縮或跑位。
- 首頁 Hero、今日任務、家庭探險隊、小小探險隊、學期日曆、課後紀錄等高頻標題增加更多注音。
- 小朋友頭像升級為專案自有的 3D Emoji／Memoji 類型原創 WebP 角色；角色仍依 XP 分四階進化。
- 火箭、寶箱、星星、XP、能量水晶、獎盃改用專案產製的小型 GIF 動畫徽章，單檔控制在約 40–65 KB。
- 新增固定課程 QA：90 天／180 節／360 任務的結構驗證，以及所有 YouTube unique ID 的線上可播放／可嵌入驗證。

## 完整課程

- 18 週 × 每週一至週五，共 90 個學習日。
- 每天兩節活動單元，每節約 30 分鐘；標準完成時間 45–60 分鐘。
- 90 天共 180 個活動單元、360 個互動任務。
- 英文為主軸，穿插數學、ㄅㄆㄇ、生活、自然探索與總複習。
- YouTube 教材以 Super Simple Songs、快樂斑比 HAPPY BAMBI 為主。
- 每節暖身固定使用食物／水果歌池。
- 每節課包含照顧者腳本：暖身、首次觀看、暫停提示、複誦、回看、互動遊戲、分齡挑戰、收尾。
- 支援多名小朋友，並可每天重新選擇實際參與者。
- 課後 30 秒紀錄：完整看／片段看／跳過、投入程度、簡短備註。

## 獎勵引擎

XP 與金幣不以「可直接加減的總數」儲存。系統只保存已完成任務、單元、學習日與已領彩蛋 ID，畫面上的 XP／金幣每次依紀錄重新計算，因此重新整理、撤銷任務或跨裝置同步都不會造成分數漂移。

## 家庭 PIN 與雲端同步

Vercel 正式站使用 Vercel Function `/api/state` 搭配 private Vercel Blob。

1. 第一次進站輸入 4–6 位數家庭 PIN。
2. 新 PIN 會建立新的家庭空間；已有資料的 PIN 會下載該家庭最新進度。
3. 同一台裝置的 localStorage 也依 PIN 分 namespace，因此不同家庭不會互相覆蓋。
4. 進度異動後自動同步；設定頁亦提供立即儲存與重新讀取。
5. 若啟動時雲端讀取失敗，會暫停自動上傳，避免用舊本機資料覆蓋可能較新的遠端資料。

4 位 PIN 適合家庭識別與資料分區，但不應視為高強度帳號密碼；分享給朋友時，每家請使用不同 PIN。

## 開發與驗收

```bash
npm install
npm run validate
npm run validate:online
npx tsc --noEmit
npm run build
npx vercel build --prod
```

`npm run validate:online` 會實際檢查所有 unique YouTube 影片是否存在、可播放、允許 iframe 嵌入，並確認指定片段結束秒數未超過影片長度。

TypeScript 固定為 5.9.3，以維持 Vercel Functions builder 相容性。

## 素材與授權

- YouTube：只使用 YouTube 官方嵌入播放器與原影片連結，著作權歸原頻道／權利人所有。
- Super Simple Songs：https://www.youtube.com/@SuperSimpleSongs
- 快樂斑比 HAPPY BAMBI：https://www.youtube.com/@happy-bambi
- Lucide icons：ISC License。
- 3D Emoji 類型兒童角色、GIF 徽章、原創五套主題、課程架構、遊戲化系統與文案均為本專案自行產製／設計；不使用蜘蛛人、鋼鐵人、奧特曼、寶可夢等受保護角色名稱、圖片或具識別性造型。

## 部署

- Vercel：主要正式站，支援 PIN 家庭識別、`/api/state` 與 private Blob 雲端同步。
- GitHub Pages：靜態備援站，可使用 PIN 分開 localStorage 家庭資料，但無 Vercel Serverless API，因此不提供跨裝置雲端同步。
