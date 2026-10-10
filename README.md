# 小小探險隊 · Little Explorers

## 2026-10-08 GitHub 保存核對（最新）

本輪已取得有條件的 GitHub 保存授權，但沒有部署授權。最新唯讀核對：帳號 `craigyu-PHD`、既有 repo `craigyu-PHD/kids-learning-adventure`；本機 `main@51ff808`，遠端 `main` 相同；既有 checkpoint `codex/checkpoint-v6.5.3-20261006@a2ebfcd` 未變。

`main` push 會啟動 GitHub Pages。非 main 分支避開這份 workflow，但 GitHub Apps 安裝列舉的 API 權限不足，仍無法排除其他部署整合；Vercel 已透過 CLI 成功讀取，沒有改設定。依使用者「無法確認時先停在本機保存」規則，本輪沒有新增 commit、stage、push 或部署，也沒有修改既有自動化。

本機 r6 保存已含商品獨立詳情、可取消商店操作、錄音生命週期與明確的課程音檔／裝置語音選擇。strict 通過；詳情64／購買12／導覽2、商店取消8、錄音模擬10、語音來源模擬15／實際瀏覽器8均有分層證據。r5完整詳情證據與r6語音差異分開記錄，不冒稱全部重新驗證。

仍未完成：新音色自然度聽評、中文小光4句正式音檔、兒童 holdout 與兩位真成人標註，以及 WebKit 單字翻卡背面鏡像透出。使用者已取消本輪手機／實體手機工作。新試音僅為候選，尚未替換514課程音檔。

最新收據與排除清單：`qa/v653/20261008/github-preservation/`。前一階段 r4 封存及上午10點前 r5 checkpoint均保留；新增完整封存以同資料夾的 `archive-receipt.json` 為準。正式站仍 V6.5.3，沒有版本升號。


家庭共學的兒童美語冒險網站，讓照顧者帶孩子逐日完成唱跳、單字、影片、提問、複誦及互動任務。

- **正式站版本：v6.5.3**。2026-10-08 另有本機穿戴修正版，尚未推送 GitHub 或部署；本輪實體手機驗收已由使用者取消，兒童語音真人驗收尚缺外部資料。
- 正式網站：[小小探險隊](https://kids-learning-adventure-chi.vercel.app/)
- GitHub：[kids-learning-adventure](https://github.com/craigyu-PHD/kids-learning-adventure)（沿用既有公開倉庫）
- Vercel：`kids-learning-adventure`；目前 deployment `dpl_7wRjYuurvZvf8vJvu2KubpyGjUP2`。
- 權威規格：[docs/CURRENT-SPEC.md](docs/CURRENT-SPEC.md)；主要交接：[NEXT-AGENT.md](NEXT-AGENT.md)。

## 2026-10-08 本機穿戴修正

修正角色／配件解碼順序、遮罩二次請求、快速切回已釋放的遮罩、WebKit 雙遮罩消失及換裝後眨眼監測；另修復房間背景與手機主題選單。保留現有原圖及人物定位，沒有版本升號。

使用者已選擇「本輪先保留本機」。GitHub Apps 的部署觸發尚未完全核實，因此不推送、不部署，也不修改既有自動化。最新驗證與保存狀態見 [本輪報告](qa/v653/20261008/shop-fit/本機修復與保存報告.md)；交接仍使用 NEXT-AGENT.md。

## 歷史紀錄：r5 商品詳情與語音（已由上方 r6 狀態取代）

使用者已確認「每件商品的獨立詳情頁」，並要求全站語音更自然；本輪取消手機版／實體手機驗收。最新候選 r5 已加入每件商品的獨立網址、角色試穿，以及可取消的商店排隊操作；錄音 permission／stop 生命週期修正已整合，10/10 隔離模擬通過。r5 詳情頁與瀏覽器鎖定流程正在驗證，不能沿用 r4 完成聲明。

r4 全商品四角色覆蓋已完成；眼鏡第 55 筆原始逾時保留，補驗成功不改寫原始失敗。新的商店取消修復另跑瀏覽器驗證。自然語音正在檢查音源選擇，尚未宣稱音質通過；兒童 holdout 音訊與兩位真實成人獨立標註尚缺。

續做：`qa/v653/20261008/external-acceptance/checkpoint.json`、`qa/v653/20261008/shop-detail/`、`qa/v653/20261008/voice-naturalness/`。新內容目前僅本機，未 commit／push／部署；既有 r4 封存不能代表包含這批追加修改。

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

發布檢查依 CURRENT-SPEC 與當次凍結索引執行；舊版 QA 不自動代表現行版本。最新正式發布的 [修復與發布報告](qa/v653/20261006/user-feedback-r2/release/修復與發布報告.md) 保留實際範圍、原始失敗與補驗。

## Git 與部署

既有遠端 checkpoint 保存於 `codex/checkpoint-v6.5.3-20261006`，版本 tag 見交接及收工收據；`main` 保留原 HEAD `51ff808af4389dbe4f25c88aebb7f87e78aa073b`。不要把 checkpoint 自動合併 main。

目前 Vercel API 未回傳 Git repository link；正式站最近使用 CLI 驗收後的 prebuilt 成品部署。GitHub Pages 的既有 workflow 在 push main 時部署備援站。未來推送／合併前必須重新核對兩個平台的觸發設定。

既有發布方法為 `vercel build --prod` → 同候選驗收 → `vercel deploy --prebuilt --prod`；**2026-10-08 本輪只保存本機修正，未推送或部署**。新正式發布仍需當次授權與完整 Gate。正式網址及 Vercel 專案保持。

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

本輪修正仍以本機候選報告為準，正式站尚未包含這些修正。影片未逐片人工看完、音檔未全人工聽驗、真家庭雲端未在本輪測試等限制保留。
