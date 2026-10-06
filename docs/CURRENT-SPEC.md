# 小小探險隊 CURRENT SPEC

狀態：**V6.5.3 第二輪配件／課堂／慢速語音修正版已部署並完成限定線上驗收**
更新：2026-10-06
Production：`https://kids-learning-adventure-chi.vercel.app/`（V6.5.3；deployment `dpl_7wRjYuurvZvf8vJvu2KubpyGjUP2` READY；15情境限定線上功能／獨立視覺驗收完成）

> 本文件是目前產品規格的唯一權威摘要。V2／V3／V4／V5／V6.1／V6.2 文件與 `AGENTS.md` 中的歷史條目只作 migration、相容性與決策脈絡參考；發生衝突時，一律以本文件、目前 Production migration contract 與已驗證的 Protected Core 行為為準。不得因舊文件回退 Full Equipment Preview、Hybrid Avatar、ledger、family auth、responsive 或 accessibility 架構。

## 正式收工基線（2026-10-06）

本輪僅保存v6.5.3程式碼／素材／QA與版本文件，未修改產品或重新部署。GitHub沿用既有公開倉庫 `craigyu-PHD/kids-learning-adventure`，checkpoint branch `codex/checkpoint-v6.5.3-20261006`；tag／遠端SHA以 `qa/v653/20261006/closeout/git-checkpoint-receipt.json` 的實際結果及Git遠端為準。主要交接沿用 `NEXT-AGENT.md`，素材保存契約 `ASSET_MANIFEST.md`。115來源／4424公開素材全SHA一致；Git物件補取後history與全量diff --check已通過，較早逾時紀錄保持其時間點。大型原件已做2558-entry本機封存，沒有證明雲端／異機備份。下一輪先確認實體手機與兒童語音驗收，不重做已接受網站。

## 最新發布：V6.5.3 第二輪配件與課堂修復（2026-10-06）

- Production `dpl_7wRjYuurvZvf8vJvu2KubpyGjUP2` READY，同一份115來源／4424公開素材／4438編譯檔prebuilt發布；主網站網址及版本保持。當前入口 `qa/v653/20261006/user-feedback-r2/checkpoint-final-r5.json`，完整索引 `qa/v653/20261006/user-feedback-r2/release/release-completion-r5.json`，報告 `qa/v653/20261006/user-feedback-r2/release/修復與發布報告.md`。
- 五款重點配件以原生Blender重製或定位，含四角色八套服裝與另四款耳機的星雲配對；貓耳無帽時完整可見，加帽時自然遮住上弧而保留耳罩。人物大小固定；不重建課程、家庭或交易架構。
- 首頁主CTA／小光、短螢幕與長姓名、備課、單字、提問、四位孩子口說及領獎版面修正；257慢速與257標準速英文AAC附來源，採用使用者選定的較慢跟讀，播放取消及裝置語音回退已測。
- 同候選608穿戴功能／獨立看圖、104新UI圖、80指定流程、1024商店流程、strict115／core7／voice11通過。80與1024包含1與6筆有時間收據的補驗，原FAIL不改寫；商店為隔離已持有fixture，不冒稱真價格或真家庭雲端購買。
- 正常Vercel build exit0、六Functions全bytes與API來源對應；final-output56740條件通過，24拒收＝原23有效控制＋wrong-stage真變異fresh補驗，產品／Gate／index／輸出不變。原無效負例與外部排序比較FAIL保留。
- 本機promotion後13功能／獨立視覺；正式站15功能／獨立視覺接受、71原PNG、441不同檔HTTP／MIME／SHA與14重查。正式站mixed8實際Home／reload／Shop／Achievements，37同舞台body寬高差0px／alpha高度比1。mixed32為runner輸出，未重建缺少的baseline物件。
- 同成品本機gzip Desktop Lighthouse96／LCP1316ms／CLS0.001458／TBT0；沒有Production新效能聲稱。HTML精確、兩日期API200、無bearer state401、空PIN400。
- main@51ff808與118列tracked dirty保留，未commit/push、重啟、清Drive或操作真家庭。七臨時QA服務關閉，原5178保留。T01、影片與全部語音未全人工驗收、Git全量diff逾時及v64-qa-review保留理由延續。

## 前次完整目標補查（2026-10-06）

V6.5.3 本輪發布證據完整且保留；全商店單件與兩堂流程通過不能替代所有高風險裝備混搭、六世界槽同時呈現及全部180堂內容合理性。本輪三個分工已補完上述缺口並修復已知缺陷；同候選發布與限定線上驗收完成。後續依新具體回饋與外部證據增量處理，避免重做已接受美術或重跑已過矩陣。當前入口 `qa/v653/20261006/full-goal-audit/checkpoint.json`，依具體缺陷決定後續修復。

candidate-r6 已部署：帽子與眼鏡深度、太空船可見性觀察點、13堂30個引導欄位、手機領獎排版，以及穿戴圖片暫時解碼失敗的有界復原與增量prebuild。107來源凍結，正式3738 public與213美術接受路徑維持原SHA；3751編譯成品與Vercel static逐檔相同。180堂作者全文已逐堂讀完，167堂完整不變；影片、任務criteria、獎勵保持。445張新髮帽衣四角色圖＋3份carry共1792配置已實看；77組fresh R6 mixed＝308角色、16decode控制＝64角色與負例均通過。編譯版16case×5圖＋4動畫圖＋2領獎圖共86原圖全部實看；同一舞台六階段body差值0px。Desktop gzip預覽Lighthouse97/LCP1209ms/CLS0/TBT0，初始無壓縮80FAIL與兩次QA等待／跨舞台失敗原樣保留。新Production四對角20圖、227靜態逐SHA與日期／未授權API均通過；20圖與本機R/G/B/A全零差。原片全看、真人語音與實體手機仍未取得。

## 前次發布：V6.5.3 混搭與教案增量修復（2026-10-06）

- Production `dpl_Dx5cLPJZAdFehrKJekLoQnVCoc1x` READY；公開網址維持原站。107來源／3751成品與已驗證候選相同；完整索引 `qa/v653/20261006/full-goal-audit/incremental-release/release-completion-r6.json`，報告 `qa/v653/20261006/full-goal-audit/incremental-release/修復與發布報告.md`。
- 77fresh mixed四角色、16解碼控制、1792靜態配置與180作者全文已封存；編譯版16流程86張原圖全部實看，正式站四對角20圖全部實看、24身形比較差值0px，與本機截圖全RGBA相同。
- 正式站227不同檔案HTTP／SHA通過，UI實際71個不同檔案精確；兩日期API200、無bearer state401、空PIN400。未將這些取樣宣稱3751線上全抓或真家庭雲端驗收。
- 本機同成品gzip預覽效能97、LCP1209ms、CLS0、TBT0；初次未壓縮80FAIL保留，沒有Production Lighthouse宣稱。原兩次compiled QA fail及缺帽／解碼FAIL保留。
- 本輪臨時5187/5188服務及browser已關閉，原5178保留；main@51ff808與刻意dirty保持，未commit/push、重啟、清Drive或寫真家庭資料。T01、原片未全看、Gitdiff逾時及舊QA限制維持。

## 前次發布：V6.5.3 原生美術與穿戴修復（2026-10-06）

- 正式部署 `dpl_52jdBhxZn1EMS88HCwhzpXAwygab` READY，公開網址仍為 `https://kids-learning-adventure-chi.vercel.app/`。部署專用網址 `https://kids-learning-adventure-b4klomitl-kui-yus-projects.vercel.app/` 保留 Vercel 登入保護；匿名請求導向登入，不能將該登入頁當網站失敗或圖片驗收。公開 alias entry 已精確匹配接受成品。
- 新增 198 份有完整來源的原生素材：七款耳機、五款背包、Sky 卡片、Space Fox 寵物以 Blender 製作；Legend 戴帽髮型使用保存實際 ImageGen trace 的四角色 master。採原生同場景分層、無損輸出與個別定位，原 3,490 份非 Finder 部署檔全部保留原 SHA。新增寵物沿用同一商店／購買／裝備 ledger，不建立第二套資料。
- 修正帽髮遮擋、缺失配件層 readiness、錯配服裝遮罩與裝備造成的縮放；人物固定原生畫布與頭部空間，日常裝備不因 XP 改變身體來源。全服裝維持靜態完整原圖；兩款不合格機器人閉眼幀停用，Sky 及四角色 default 正常眨眼保留。另修家長 PIN 取消後晚回應，以及重送裝備 eventId 不得重寫歷史或恢復已卸下道具。
- 正式本機 64 商品 × 四角色 × 桌機／手機明暗，共 1,024 lifecycle 案例通過；256 張四角色檢查頁均實看、與原 case 截圖逐 SHA 綁定。86 筆原始紀錄與 938 筆續跑原樣保留。真實 UI 購買另測 64 商品（61 付費、3 合法免費），service economy 256 筆及七負向控制通過，不能把成本 0 的已持有 fixture 當真價格購買。
- 新 448 角色／服裝元件試戴與 20 世界元件案例通過：211 路徑具 DOM 使用／HTTP SHA，兩份 world-source PNG 僅 source-codec 配對，不算 runtime 載入。正式商店 lifecycle 實際觀察到 94 個本次變更路徑；不得宣稱每個服裝排列均跑完整商店流程。
- 現行美術、hero readiness、原 brand exact、fresh current motion、144 輸入嚴格型別、npm prebuild/build、Vercel Production build 通過。原歷史 runtime QA 的直讀 JSON import 僅在型別檢查使用它自己的 frozen manifest；未改舊 gate、未把原 `npm run qa:strict` 或缺件 P10 archive 重標 PASS。Git 全量及縮小差異檢查均逾時，保留 `TIMEOUT_NOT_PASS`；106 產品／建置輸入與七份 API／設定逐 SHA 無漂移。
- 3,756 成品檔與通過 compiled preview、效能量測的 artifact 全 SHA 相同，Vercel static output 亦全同。Desktop preview Lighthouse Performance 97、LCP 1,234 ms、CLS 0、TBT 0；這是相同成品的既有量測綁定，不冒稱新 Production Lighthouse。線上 227 個不同檔案（198 新素材＋15 保留遮罩＋13 JS／CSS＋首頁）全 HTTP 200／SHA 相同；兩日期 API 正常，unauthenticated state GET 401、無效 PIN 400。
- 部署後隔離瀏覽器驗證完成：15 變更商品代表流程、四尺寸／明暗導覽組合、兩種家長取消、四位合成學員完成兩堂備課＋各九階段，重載／重入未重複領獎。兩次獨立 browser 以第一堂實際 UI 產生且 SHA 綁定的 ledger 接續；159 張截圖中 38 張實看。family API 採 block／mock，未驗真家庭雲端或實際影片播放。最終總索引 `qa/v653/20261005/release-art/final/release-completion.json`；線上索引 `qa/v653/20261005/release-smoke/production-acceptance-r1.json`；人讀報告 `qa/v653/20261005/release-art/final/修復與發布報告.md`。較早的 admission index 保留其發布前時間點，不覆寫原狀態。
- `11-兒童美語教學網站-v64-qa-review` 在 2026-10-06 本機仍可觀察到舊 6.3 原始碼與 Git；無法確認 unique／未保存變更，依條件刪除要求保留。本段是目前觀察，下方 9/27「已移垃圾桶」僅歷史紀錄，不能替代現況。
- T01 仍缺 child holdout audio、兩位獨立成人 annotators、實體 iPhone Safari／Android Chrome。課程 90 日／180 節／360 任務保持；264 unique 影片在線上驗證 playable／embeddable 與 360 個 end bounds，語意深查九課／八官方來源，不代表逐片看完全部影片。未 commit／push、未重啟、未清 Drive、未操作真實家庭雲端資料。

## 前次發布：穿戴、人物尺寸與載入修復（2026-09-27，歷史）

- 正式部署 `dpl_HKmhhQQqdfYBakdyFMFCjhmRa6sU`，immutable：`https://kids-learning-adventure-50vmr7bvr-kui-yus-projects.vercel.app`；維持版本 6.5.2，依使用者完成後直接部署的明確授權發布。
- 修正商店說明換行造成的人物縮放、整體裝備確認縮放；五組原生服裝依真實眼睛位置作整體 Y 對齊。264 組穿戴配對（帽子 72／眼鏡 160／髮型 32）與 287 新素材已上線，使用完整原生來源與等比定位，沒有碎圖拼貼或補畫五官。
- 配件等待實際掛載圖片解碼後才與遮罩一起顯示；兩處遮罩預載統一匿名 CORS，修正一般快取下二次下載造成的短暫缺身體。前次兩個冷載入失敗保留並有精確修正證據，沒有以機械 PASS 代替看圖。
- 本次現行 strict／Vite／八項核心功能／252 商品預覽／migration／兩堂 × 四學員結算與重載／Vercel build 通過。最終正式站 8 組、24 圖實看通過，20 項遮罩請求均只有一次，162 個實際完整回應資源 SHA 相同；Root 另驗 37 檔及日期／未授權 state API。3,901 成品檔與 112 程式輸入指紋一致。
- 完整索引：`qa/v652/root/20260927-fit-reopen/completion.json`；人讀報告：同目錄 `修復與發布報告.md`；最終發布證據：`qa/v652/root/20260927-css-mask-ready-fix/`。
- 未使用的 `11-兒童美語教學網站-v64-qa-review` 已移至 Google Drive 系統垃圾桶，原位置不存在，保留分支與復原能力。沒有 commit／push、重啟或操作真實家庭資料。
- 邊界：原生服裝姿勢仍約 1–1.5% 外輪廓差異，沒有拉伸人物；限定組合與正常快取驗證不代表所有排列／網路皆無等待。歷史 dataless prebuild、T01 真人語音與實體裝置證據限制保留；本次未重新量測 Lighthouse。舊 default-reader 誤報與最後 wrapper 的獨立 exit-0 驗證更正見 `reader-correction.json`。

## 本輪回饋與修復入口

2026-09-27 使用者確認較前改善，但仍退回帽子原形／角度／落點、眼鏡與髮型，以及穿衣／配件後人物變小。上一輪 0px 數值是固定畫布座標穩定，不能解讀為真實像素內人體大小完全一致。當前入口：`qa/v652/root/20260927-fit-reopen/checkpoint.json`；本輪 264 組配對、人物舞台及兩階段冷載入修補已部署，最後 8 組線上逐圖驗證通過；已完成目前要求的修復批次。

## 前次發布：帽子造型與換裝定位修復（2026-09-27 08:25，歷史）

- 依使用者「完成後直接部署並給網址」授權發布，package 仍為 6.5.2。正式部署 `dpl_77bDxTVJx8Tn4yBSdpxq8S2iLQKJ`；immutable URL：`https://kids-learning-adventure-8z5mzki8z-kui-yus-projects.vercel.app`。
- `AvatarRenderer` 固定保留 256 px 頭部空間，各道具維持自己的原生畫布；已測換帽頭腳位移 45.37 px → 0 px，舊策略負控制能抓到同一缺陷。星光魔法帽完整原生重製並依四角色八服裝綁定；海洋帽弟弟八套調整大小／落點，合計 40 配對與 113 新公開素材。
- 本次正常動畫 112 帽子 lifecycle、252 當前商品預覽、11 新負向控制、TypeScript strict、8 核心功能檢查、migration、兩堂課四學員結算／重載與 Vercel Production build 通過。新圖片／目前程式來源與建置前後指紋一致。
- 正式站 1,021 檔 HTTP 200 且 SHA 精確一致；4 組隔離 browser 的試戴、取消、裝備、首頁及 reload 與家長取消流程通過。日期 API 正常，無 token state GET／PUT 均 401。未寫入真實家庭資料。
- Manifest `44c633f33a837e2498d3560438daec682bb4f1167dce55cd0e1efb340025df3f`；artifact `4356836ffe00fd80864ba25404949f421ba39c860a25b54271c500ac3fe956f7`。完整證據：`qa/v652/root/20260927-wearable-drift-fix/completion.json`；正式站獨立驗證：`qa/v652/astra/20260927-wearable-postdeploy/completion.json`。
- 保留限制：原歷史 prebuild dataless Gate 沒有改稱 PASS；以本次現行功能、視覺、精確增量 admission、直接 compiler 與 Vercel build 驗證發布。冷載入取樣約 2.4 秒出現完整试穿，未見可見且已解碼的舊帽閃現；不保證每種網速。T01 外部真人語音／實體裝置證據未新增，前次 Lighthouse 分數不冒充本次新測量。

## 本次修復起因：寶物商店退回（2026-09-27）

使用者指出商品卡外觀與實戴不一致、髮型／帽子位置錯誤，要求全商品逐件核對四個角色，維持 V6.5.2 進行修正。下方發布、載入與交易 PASS 保留為歷史技術證據，不能代替本輪視覺驗收。所有新素材必須是完整一致的原生美術，不接受碎片拼貼、程式補畫人體或以低品質特效替代。證據入口：`qa/v652/root/20260927-shop-quality-reopen/checkpoint.json`。

## 2026-09-27 介面調整（已隨本次修復部署）

首頁移除重複「今日課程」導覽，順序改為首頁、學習日曆、成就獎勵、寶物商店、家長登入。完成家長驗證後才顯示學習報表與家庭管理中心，右上角同步切換登出；登出保留兒童進度。五主題採不同面板配色與一致圓角，使用真正原生游標與短點擊動畫。個人／管理者 PIN 取消後晚回應保護、夜間家長文字及機器人預覽布局已修正。320／390／820／1440 明暗流程8組、20主題首頁、48機器人視圖及4角色裝備持久化局部驗證通過。證據：`qa/v652/root/20260927-navigation-parent-refine/completion.json`。本輪寶物原生美術、192披風配對及260遮罩欄位已接入；1,008組實際商店流程、25新負向控制、TypeScript strict及directVite通過，108程式/設定檔前後一致。完整索引：`qa/v652/root/20260927-shop-quality-reopen/completion.json`。上述 1,008 組為前一候選的歷史證據；本次發布新增的同候選驗證見頂端。完整舊 prebuild 的歷史 dataless 阻礙仍保留。

## 前次發布：V6.5.2（2026-09-27 01:37，歷史）

- 正式站：https://kids-learning-adventure-chi.vercel.app/；deployment `dpl_HCpkQn91CCFthUD4YatEqsuHT8HQ`，狀態 READY 且正式 alias 已確認。package／runtime footer 均為 6.5.2。
- 本次依使用者最新授權，以完整可用、精緻度目標 95 分先發布；停止不影響執行的歷史 QA 檔案逐件追補。數字 95 是品質目標，沒有宣稱外部機構或使用者已評分 95。
- 保留既有原生美術與 Protected Core。完成 Legend／Nebula 各 28 角色服裝配對，各 43 個來源一致的正式檔；完整原生髮型僅做合規 rig、定位與可見遮罩，不以碎圖拼貼或補畫五官替代。Cloud／Sunny／Ocean／Mage／Lavender 及既有已接受配件保持。
- 首頁補強任務卡、兩堂學習路徑、成長與休息提示、既有主題游標；家長介面清楚區分照顧者 PIN 與家庭管理者 PIN，改善明暗文字對比與取消／Esc。
- 現行驗證：TypeScript、Vite、課程結構、state/auth/date/learning/architecture、商店安全與 252 次交易、252 次實際商品預覽、遷移、兩堂×四位學員獎勵結算與重載防重領、明暗／手機桌機／reduced-motion 通過。晚期兩處無障礙修正另完成 strict、Vercel build 與正式站驗證。
- Desktop production-preview Lighthouse：Performance 97、Accessibility 100，LCP 約 1.21 秒、CLS 0、TBT 0。這些是 Lighthouse 指標，不是整體美術評分。
- 正式站：entry＋12 JS/CSS＋86 本輪髮型資產共 99 檔 HTTP 200／SHA 相同；4 組隔離瀏覽器流程、2 日期 API、3 未授權 state 請求拒絕通過。Root 另驗兩組一次性 PIN 可簽發不同 session，未讀寫家庭 state，PIN／token 不落檔。
- 發布證據：`qa/v652/root/release90-20260927/release-evidence.json`；正式站證據：`qa/v652/astra/20260927-postdeploy/completion.json`。原 npm prebuild 歷史美術追溯 Gate 未冒稱全部 PASS；本次採已記錄的現行功能、圖片、編譯與發布驗證，發布命令／設定留在同目錄。
- 兩個指定資料夾已分類，只刪 22 個確認未追蹤的 Finder `.DS_Store`（206,936 bytes）。保留程式、素材、Git、依賴、證據與備份；舊 review worktree 的完整 dirty 狀態因逾時未確認，因此保留整體工作樹。
- 後續非阻擋細修：下一堂深色任務卡內的次要日期文字可更亮、少量頸領 AA；T01 兒童 holdout audio、兩位成人 annotator、實體 iPhone Safari／Android Chrome 證據仍未取得。不得宣稱語音品質或實體裝置已驗收。

本節及下方 V6.5.1 與更早的部署／未發布說明保留為歷史；目前 Production 以頂端最新發布為準。

## 0. V6.5.1 User Feedback Production（2026-09-20，歷史）

- 2026-09-20 15:16 收工：V6.5.2 Ocean 28配對／29檔已本機接線及Root＋Astra限定終審，見 `qa/v652/astra/ocean-postintegration-r1-review.md`；fractional rig、桌1512／手機390與20-case回歸接受。完整release與其他帽髮仍未完成，**沒有新Production部署**。下一agent入口根目錄 `NEXT-AGENT.md`，快照 `docs/handover/LittleExplorers_Checkpoint_20260920_1512_V652暫停.md`；不得回到過時B07預審重做。

- V6.5.2 皇冠本機增量：`hat-crown` 4 base＋5服裝profile＋1同源catalog已依Astra preaudit `68ee529a2daee9cf186959ac899cf08a0c3a8cab8f98bee5f187499326c421af` 精確接線；Root實看2商店＋20個current-source角色狀態接受，5張截圖與已接受候選精確RGBA相同。registry16與strict通過；僅本機皇冠scope，不是其他帽/髮型或全release驗收，Production與package版本不變。

- **2026-09-20 使用者視覺退回：V6.5.2 修復中，尚未發布。** 下列歷史 gate PASS 僅證明當時測試涵蓋的行為，未充分驗出配件錯位／遮臉、catalog 外觀差異、商店圖片溢出、比較列位置、pointer hover 位移與方形主題背景問題，不構成這些項目的現行視覺驗收。進度與明確退回候選見 `qa/v652/CHECKPOINT.md`；Production 版本及部署識別目前保持不變。
- V6.5.2 本機增量：七款眼鏡已接入同源 catalog、四角色 base 與五個需獨立定位的服裝 profile，共70新增素材；14張真正商店桌面/手機試穿實看及112組角色/服裝 fresh DOM 證據保存於 `qa/v652/glasses-integration/`、`qa/v652/luna/glasses-integrated-runtime-r1.json`。這不是全配件驗收或發布：髮型、帽子、部分耳機與混搭仍待完成，完整 same-candidate gates 尚未重跑。
- V6.5.2 耳機本機增量：七款耳機74檔（28 base、35服裝profile、7 catalog、4 starter帽專用耳杯）已依獨立audit `2cfc776c5793092d51822be48d1b3c2236a7642edfdf94d5128706d68c13cbf8` 接線。Root已實看 `qa/v652/headphones-integration/local-source-r1/` 的14張1512/390商店試穿，637組resolver priority tests通過；140+4個current-source角色狀態與獨立後審見 `qa/v652/astra/headphones-postintegration-review-r1.md`。35新舊截圖只有34像素相同，base/racer另經Root＋Astra實看接受，不採原ledger的35全同說法。這不是全帽/髮型混搭或release驗收，版本及Production仍維持V6.5.1。
- 本候選承接 V6.5.0 User Feedback R2 已完成的商品穿戴、商店 containment、Robot／Effect、主題 pointer、首頁日曆、四兒童 Header、五主題視覺、隊伍 crest、深色單字翻卡與錄音／回放修復，不重新製作 B01–B11 或課程內容。
- runtime、package 與 footer 版本統一為 `6.5.1`。Fresh same-candidate matrix 34/34 PASS、candidate drift false，aggregate SHA-256 為 `7babac9d7a8d60609fb4a89b9217bb8f3e6a692cab829252971b5f5912c67ce5`；Vercel production build、正式部署與獨立 post-deploy 驗證均已完成。
- Production deployment：`dpl_ES3FZ1C8dUoSxcExNz5TySWt6oPF`；post-deploy final evidence：`qa/v65/post-deploy/20260920-v651-production-verification-final-pass.json`。初始只掃 entry bundle 而漏掉 lazy lesson chunk 的 FAIL 保留於 `qa/v65/post-deploy/20260920-v651-production-verification.json`，不得覆寫。
- T01 外部限制不變：字詞辨識不是音素級發音品質評分；仍缺 child holdout audio、兩位獨立成人 annotators、實體 iPhone Safari 與實體 Android Chrome。

## 0.1 V6.5.0 Same-candidate Release Contract（2026-09-19）

- B01–B11 皆已完成本機 promotion 與 final evidence；B07 repair-v4 另完成 fresh 48 runtime、16 compatibility、384 base readiness states、5 negative controls、16 boards、root 實看、Astra final oversight 與 Sol monitor。
- 正式 runtime 仍維持單一 `AvatarRenderer` 與既有 ledger／family auth／trusted date／migration 架構；本版不重建 curriculum、不 reset 使用者資料、不建立第二套 shop/avatar state。
- 180 堂主課影片來源式整合與一年級上學期發布邊界繼續有效；不回退 day/block/mission IDs、完成紀錄或影片 revision 證據。
- 版本識別統一為 `6.5.0`；candidate fingerprint `c8062ccd48a3a9a8c1a61056cdb25638dbee551247359c7fbdfac48855cad564` 已通過完整 same-candidate gates、`vercel build --prod`、Production deployment 與 post-deploy 驗證，正式成為線上 baseline。
- T01 仍是外部證據限制：尚缺 child holdout audio、兩位獨立成人 annotators、實體 iPhone Safari 與實體 Android Chrome；不得宣稱發音品質或實體裝置驗收完成。

## 0.2 V6.5.0 User Feedback R2（2026-09-19 Production）

- 寶物商店眼鏡與耳機改用內建繪圖模型產生的正面配件 master，再依 1024×1536 runtime contract 做透明定位；56/56 新 runtime bytes 已在 Production 驗證 HTTP 200 且 SHA-256 與本機候選一致。`極速護目鏡` 等商品的商店外觀與實際穿戴不再使用不同舊圖。
- 商店預覽完成 63 items × 4 avatars = 252/252 runtime、24/24 響應式版面、15/15 World 靜態／15/15 runtime／15/15 交易驗證；Robot 改為任務指揮艙構圖，Effect 增加層次光環，預覽內容不得超出 stage。
- 首頁 header 固定顯示哥哥、弟弟、姊姊、妹妹四位 Stage 4 靜態造型，父母角色為 0；五套主題必須同時改變主視覺、accent 與框線。右側日曆、隊伍 crest 與簡化主題 pointer 均納入 browser gate。
- 單字卡 dark mode 翻面必須維持淺底深字。課堂口說恢復 MediaRecorder 錄音、回放、重錄／刪除與選用的瀏覽器字詞辨識；字詞命中只代表辨識結果，不是音素級發音檢定，也不提供發音分數。
- Production candidate aggregate SHA-256：`4e168fade6fe6117fa4bcdbab757627ec47f20a4cfe16e93d5a0357e382f02fe`。部署：`dpl_45YyT1ett82Tvht5imHjpFfe86ch`；post-deploy evidence：`qa/v65/post-deploy/20260919-user-feedback-r2-production-verification.json`。

## 0.3 V6.4 展示 Implementation Contract（2026-09-14 已採用；historical production context）

使用者已採用 `docs/plans/V6.4_完整交付重整計畫_20260914/` v1.0 作為 V6.4 本機候選的展示／美術／布局／互動交付契約；採用與 CURRENT 差異記錄於 `P00_採用與CURRENT差異.md`。本節**不把 Production baseline 升級為 V6.4，也不構成發布批准**。

- 本文件第 1 節 Protected Core、資料安全、migration、ledger、family auth、trusted date、cloud / cross-tab / learner isolation 與 release governance 繼續完全有效。
- 與 V6.4 套件衝突的歷史 Presentation 規則，由 2026-09-14 Implementation Contract 覆蓋：自然高度／容器驅動布局取代三個通高 dashboard 外觀；五 theme 允許並要求實質視覺差異；指定非課堂場景允許主題 cursor／短尾跡／click feedback；M01–M21 成為正常／reduced-motion 動作契約。
- 48 wearable × 4 avatar = 192 列仍需逐列 Runtime 大預覽與看圖驗收；同一 `AvatarRenderer`／Runtime 舞台為正式大預覽來源。已批准原生 Hero 保留，但**不要求另重畫 192 張重複用途的完整人物 Hero**。
- 原生 source、Runtime 合成、candidate evidence、Production evidence 必須分開記錄；不得以 catalog thumbnail、檔案存在或歷史總 PASS 冒充新候選完成。
- 正式發布仍須同一 candidate artifact 完成全 Gate，並取得使用者針對該候選的發布確認。

## 1. Protected Core

以下為 V6.1 已驗證底層，後續 UI／Avatar／CSS 改版不得刪除、重建或 reset：

- 18 週、90 learning days、180 lessons、360 missions。
- 360 個明確且各自具唯一 clip ID 的影片指派位置：180 warmups + 180 main lessons。影片 ID 與內容家族允許有目的的螺旋複習，不再強制 180/180/360 個不同影片或集合互斥；每一重複使用位置都必須提供綁定當堂 block、warmup/main 角色與當前 videoId 的教學目的及官方 publisher page 證據，同片各次使用不能只有完全相同的籠統目的。
- 課程教案、lesson order、lesson scheduling、Lesson flow、Quick Check、speaking/review evidence。
- `AnswerEvent`、`RewardTransaction`、`PurchaseTransaction`、`EquipmentTransaction` 均屬 append-only immutable event contract；既有 event 不得被覆寫或刪除。
- XP、Coins、Stars、Gems、Badge、Treasure 與 learner progress。
- Family namespace、家長 PIN / Family PIN architecture、signed session、caregiver/learner identity separation。
- `/api/state`、`/api/family-session`、`/api/server-time`、`/api/time`。
- Vercel Blob cloud persistence、本機 family-scoped cache、V1～V6 migration compatibility。
- Asia/Taipei trusted date engine；今天是唯一可建立正式 reward/progress 的日期。
- Learner isolation；不同孩子的 progress、reward、inventory、equipment 不可互相污染。

V6.5 影片決策（2026-09-18）：依 [影片教學契合優先決策](plans/V6.5_影片教學契合優先_20260918.md)，先確保影片與當堂核心詞句、動作、聽辨或提取任務契合，再考慮素材多樣性。本條覆蓋歷史 AGENTS/QA 的影片數量不重複要求；不得以成人 Teaching Tips、Making Of/幕後花絮、Trailer/預告片填補兒童影片位置。更換教材不改 day/block/mission IDs、順序、既有完成/作答/獎勵事件或家庭資料；需保留內容 revision 與更換紀錄。

`videoAnchor.verifiedWords` 為相容的歷史欄位名，目前內容是當堂教學詞彙，可能含照顧者課後延伸；四詞集合/題目引用一致不代表四詞都出現在影片。影片內可證明內容與教學延伸必須在逐課審核中分開，topic 標籤不能充當來源證據。

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

影片 release gate 分三層，互不替代：

- 結構：90 days / 180 blocks / 360 missions 與 360 explicit clip assignments 不變；每一位置必須有合法影片 ID、來源與完整指派 metadata。`src/data/videoReuseReview.ts` 以 `${block.id}:warmup` 或 `${block.id}:main` 綁定重複使用證據；缺件、錯誤 ID、錯誤 lesson/role、缺少有效官方內容頁或無區分的用途都應 fail。
- 線上：對當前所有 unique YouTube IDs 驗證 playable、embeddable、duration，並逐一核對每個使用位置的 end 範圍。報告必須分列 360 assignment slots 與實際 unique ID 數，不能再以 360 不同影片為 gate；線上可播放不等於逐課適教。
- 教學：180 堂的暖身/主課使用位置逐一核對影片核心、步驟、提問、詞句及年級負荷。Evidence registry 存在、publisher URL 格式合格、topic 相合或未重複皆不代表語意全審 PASS；review 必須另綁當前課文/指派版本與來源。成人/幕後/預告片標題 guard 是已知不適用素材的負例攔截，不是一般影片適齡分類器。

更換任何指派後，舊 curriculum SHA 的審核保留為歷史，不能沿用為新候選驗收。所有當前 unique IDs 的新線上驗證及 same-candidate 全 Gate 仍為發布必要條件。

## 14. Release Governance

- 版本與 footer 由 `src/generated/appVersion.ts` 單一來源控制。
- 測試全部通過前不得先升 Production version。
- 目前線上 Production baseline：`V6.5.1`；deployment `dpl_ES3FZ1C8dUoSxcExNz5TySWt6oPF`，正式 alias `https://kids-learning-adventure-chi.vercel.app/`，post-deploy evidence 為 `qa/v65/post-deploy/20260920-v651-production-verification-final-pass.json`。
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
