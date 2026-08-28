# V5.1 Art Asset Replacement Sprint — 驗收報告

日期：2026-08-28
狀態：Local candidate passed；尚未 commit、push 或部署 production。

## V5.2 課程預覽與獎勵邊界

- 90 個學習日的兩堂內容全部可由「學期日曆」直接開啟：未來日標示「課前預覽」、已過日期標示「複習內容」，不需要等待解鎖才可閱讀教案或預作準備。
- 預覽與複習均為唯讀：不寫入任務、作答、出席、完成紀錄、XP、Coins 或徽章。課程九關仍可逐關查看，讓照顧者先熟悉影片、暫停提示與活動安排。
- 只有 `/api/server-time` 驗證為 Asia/Taipei 的「今天」時，才會建立出席、開放互動任務與作答紀錄；兩堂課正式完成後才由既有 append-only reward ledger 結算 XP、Coins 與寶箱。
- 移除了「切換課程關卡即送 XP」的舊行為，避免只瀏覽內容就獲得獎勵。
- 課程卡改為語意清楚的 header + two-column body；縮圖、文字、狀態與操作各有固定欄位。玩家卡、AI 區與角色成長區亦補上圖片安全欄位及小尺寸文字截斷，避免圖片覆蓋文字。

## 十二項結果

1. 六枚 Nav Icon 已重製為不同的 512×512 transparent WebP；SHA 6/6 unique。
2. Brother 已有新正面、2048 Master Sheet、5 角度、5 表情與四階進化。
3. Younger 已有新正面、2048 Master Sheet、5 角度、5 表情與四階進化。
4. Robot 已有新正面、2048 Master Sheet、5 角度、3 狀態。
5. `brother-idle.webm`、`younger-idle.webm`、`robot-idle.webm` 為 512×512、24fps、4 秒 VP9 WebM。
6. `rocket-flyby.webm` 為 15 秒循環；飛越後保留間隔，避免持續干擾。
7. Header DOM 已移除 V40 Robot、Lucide Rocket、CSS Planet／Star 主體，改用 V5 背景與影片圖層。
8. 五套 `*-v2.webp` 主題均為新 SHA，且 runtime 指向 `assets/v5/themes/`。
9. Character Evolution 已為每名學習者輸出四張 stage image，含 current／done／locked 視覺狀態。
10. Lesson Card 已重寫為 header + body DOM；thumbnail 與 info 是獨立 Grid columns，不再重疊同一 cell。
11. `treasure-open.webm` 為實際 2 秒 VP9 開箱影片，poster 作 reduced-motion／載入 fallback。
12. 新增 Art、Browser、Performance 與 Orbit evidence Gate；不再把「檔案存在」直接等同功能完成。

## Runtime 效能收旂

- 新增 `scripts/generate_v51_runtime_derivatives.py`，產生 96px Nav、128px Theme、192px Evolution 與 128px Badge 衍生圖；Master 原圖仍保留作美術源檔。
- Header key art 改為可發現的 eager/high-priority `<img>` 並在 HTML preload，避免 CSS background 延遲 LCP。
- Desktop Lighthouse production-preview：Performance 99、FCP 408ms、LCP 981ms、CLS 0.000902、TBT 0ms、transfer 4,493,416 bytes。
- Header 已再次人工截圖複核：品牌、三名角色、Theme controls 分離，不再互相覆蓋；Evolution 舊 Grid 欄設定造成的直排與越界也已修正。

## QA 證據

- `npm run qa:v51:art`：PASS。檢查 Nav／Theme／Master／Stage SHA、V5/V40 Theme 差異、WebM container、runtime V40 source、Header 禁用 token 與 DOM integration。
- `npm run qa:v51:browser`：PASS。1536×1024、820×1180、390×844 的 overflow 均為 0；broken image 0、visible V40 media 0、Bopomofo 0；影片 readyState 4；手機三欄實測寬度均為 370px；reduced-motion reload 後所有 cinematic video paused；90 天日曆 action 均存在，未來預覽與過去複習均不會改寫 local progress。
- `npm run validate:online`：PASS，360/360 YouTube IDs 可播放且允許嵌入。
- `npm run qa:v51:performance`：PASS，Desktop Lighthouse 所有門檻通過。
- `npm run qa:v51:orbit`：自動證據覆蓋分數 100/100。這是 Gate/evidence coverage，不當作人類美感 100 分。
- `npm run qa:strict`、`npm run build`、`npm run validate`、`npm run qa:state`、`npm run qa:auth`、`npm run qa:migration`、`npm run qa:date`：PASS。
- `npx vercel build --prod`：PASS（本機 production build，尚未部署）。

## 誠實界線

- 本輪 WebM 是具實際影格的 2.5D 關鍵幀動畫，不是 Blender 骨架／布料／口型 rig animation。
- `public/assets/v5/badges/`、`items/`、`vocab/` 與 caregivers 是為達成 V5 runtime path 歸零而搬入的相容資產，不宣稱本輪已重新設計；十二項 Sprint 的新美術範圍是角色、Header、Nav、Theme、Evolution 與 Treasure。
- Production URL 尚未更新；本輪沒有 commit、push 或 deploy。
- 診斷 Vercel local dev 時，本機 `.vercel` 內的敏感環境值曾出現於本次工具輸出，但未進入 Git。正式部署前必須先輪替相關 Vercel Blob 憑證，再執行部署後 API smoke。
