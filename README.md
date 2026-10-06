# 小小探險隊 · Little Explorers

家庭共學的兒童美語冒險網站，讓照顧者帶孩子逐日完成唱跳、單字、影片、提問、複誦及互動任務。

- **目前版本：v6.5.3**。已部署，主要功能與視覺 QA 通過；實體手機與兒童語音驗收仍待完成。
- 正式網站：[小小探險隊](https://kids-learning-adventure-chi.vercel.app/)
- GitHub：[kids-learning-adventure](https://github.com/craigyu-PHD/kids-learning-adventure)（沿用既有公開倉庫）
- Vercel：`kids-learning-adventure`；目前 deployment `dpl_7wRjYuurvZvf8vJvu2KubpyGjUP2`。
- 權威規格：[docs/CURRENT-SPEC.md](docs/CURRENT-SPEC.md)；主要交接：[NEXT-AGENT.md](NEXT-AGENT.md)。

## 核心功能

- 18 週、90 日、180 堂、360 任務；每日兩堂課、每堂九階段，保留照顧者完整教案與分齡提示。
- 四位孩子獨立進度、角色成長、XP／金幣／星星／寶石、成就與寶物商店。
- 單一 AvatarRenderer 與商店 ledger，支援髮型、衣服、帽子、眼鏡、耳機等穿戴，以及世界型商品、寵物與動畫。
- 五套主題、手機／平板／桌機、夜間模式、減少動態及家長管理／報表。
- 家庭 PIN 換 signed session；Vercel Blob、家庭隔離本機快取、可信台北日期與既有資料遷移。
- 英文女聲 257 慢速跟讀及 257 標準速 AAC，附來源及裝置語音回退。語音辨識結果不當成發音品質分數。

## 技術架構

React 19、TypeScript 5.9.3、Vite 8；Vercel Functions 與 private Vercel Blob。原生 Blender／Image-based 素材以 WebP 等格式交付；動畫採既有 React／CSS 與 Lottie。依 package-lock.json 安裝，不任意升級依賴。

## 本機啟動

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

雲端 API 需使用既有 Vercel 開發流程及授權環境；一般本機 UI 不等於雲端 API 驗收。秘密僅放 ignored `.env.local` 或平台環境設定，變數名稱見 `.env.example`。測試用 isolated family／fixture。

## 建置與 QA

```sh
npm run build
npm run preview -- --host 127.0.0.1
```

`build` 會先執行既有 `scripts/prebuild_v653.py`，驗證 `qa/v653/CURRENT-RELEASE.json` 的同候選證據。**新 clone 需先按 [ASSET_MANIFEST.md](ASSET_MANIFEST.md) 還原未入 Git 的原始素材／QA 證據與 candidate stage；只有 Git checkout 不能保證通過 prebuild。** 不得跳過、弱化或改寫 Gate 來消除缺件。

發布檢查依 CURRENT-SPEC 與當次凍結索引執行；舊版 QA 不自動代表現行版本。最新 [修復與發布報告](qa/v653/20261006/user-feedback-r2/release/修復與發布報告.md) 保留實際範圍、原始失敗與補驗。

## Git 與部署

本輪穩定 遠端 checkpoint 保存於 `codex/checkpoint-v6.5.3-20261006`，版本 tag 見交接及收工收據；`main` 保留原 HEAD `51ff808af4389dbe4f25c88aebb7f87e78aa073b`。不要把 checkpoint 自動合併 main。

目前 Vercel API 未回傳 Git repository link；正式站最近使用 CLI 驗收後的 prebuilt 成品部署。GitHub Pages 的既有 workflow 在 push main 時部署備援站。未來推送／合併前必須重新核對兩個平台的觸發設定。

既有發布方法為 `vercel build --prod` → 同候選驗收 → `vercel deploy --prebuilt --prod`；**本輪僅保存基線，未重新部署**。新正式發布仍需當次授權與完整 Gate。正式網址及 Vercel 專案保持。

## 版本制度

沿用 Semantic Versioning，不重編版本：

- Patch：bug、小型 UI、相容性修正，例如 6.5.3 → 6.5.4。
- Minor：新功能、遊戲、學習模組或大型 UX，例如 6.5.3 → 6.6.0。
- Major：重大架構／產品方向或不相容變更，例如 6.x → 7.0.0。

版本由 package.json 及既有生成流程保持一致；驗收前不先 bump final identity。每版保留 CHANGELOG、交接、source/public/artifact pins、QA 與發布紀錄。tag 只標記可證明與正式部署一致的程式碼與公開素材。

## 下一輪

1. 實體 iPhone Safari／Android Chrome。
2. 兒童語音 holdout 與兩位獨立成人標註。
3. 修復這些驗收發現的問題。
4. 完成上述驗收後，再安排功能／內容精進。

目前沒有已知阻斷性產品問題。影片未逐片人工看完、音檔未全人工聽驗、真家庭雲端未在本輪測試等限制保留；不能寫成全部驗收完成。
