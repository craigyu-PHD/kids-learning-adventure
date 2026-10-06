# 小小探險隊 v6.5.3 正式收工與 GitHub 基線

本文件沿用既有 HANDOFF 等效入口，為新 Session 第一閱讀處。更新：2026-10-06。

## Project Identity

- 中文：小小探險隊；英文：Little Explorers；package/repository：kids-learning-adventure。
- 正式網址：https://kids-learning-adventure-chi.vercel.app/
- GitHub：https://github.com/craigyu-PHD/kids-learning-adventure（既有公開倉庫，維持設定）。
- Version：6.5.3；Remote Checkpoint Branch：`codex/checkpoint-v6.5.3-20261006`。
- Commit：以遠端 `v6.5.3^{commit}` 解析 checkpoint（本機 ref 建立受 hook metadata 阻塞，不假稱已切分支）；確切 SHA 與遠端回查記於 `qa/v653/20261006/closeout/git-checkpoint-receipt.json` 及 Obsidian 收工記事。
- Tag：`v6.5.3`，建立／推送結果以收據為準；原 main：`51ff808af4389dbe4f25c88aebb7f87e78aa073b`。

## Current Production State

目前已部署、主要功能與視覺 QA 通過，但仍待實體手機與兒童語音驗收的穩定版本。Vercel `kids-learning-adventure`，deployment `dpl_7wRjYuurvZvf8vJvu2KubpyGjUP2` READY。本輪僅 Git／文件保存，不新增功能、重構、重設計或部署。

115 compiler sources、4,424 public 與接受 pins 全同；正式首頁 HTTP 200／SHA 同接受成品。部署115來源map SHA：`fc3840dea1a32b1f9eea56101405c10c7768771fd57999d1aa74fd4a1bf76ca1`；public map：`7bd98f97cdd95a519670b159d354524bcc456073e5b51483bf70407f4db35d41`。

## Completed / QA Passed

五款配件、髮型／貓耳混搭及人物尺寸；首頁按鈕、備課、字卡、提問、口說與領獎；慢速跟讀已採用。608 穿戴功能／獨立視覺、104 新 UI 圖、80 指定流程、1,024 商店流程；正式站 15 情境功能＋獨立視覺，441 HTTP／MIME／SHA。原始失敗、補驗、Gate 時間點與人工範圍維持原報告。

QA 主報告：`qa/v653/20261006/user-feedback-r2/release/修復與發布報告.md`；完整總索引：`qa/v653/20261006/user-feedback-r2/release/release-completion-r5.json`。不得重標所有歷史 FAIL 或把範圍擴張成全站全部人工驗收。

## Pending QA

- 實體 iPhone Safari／Android Chrome。
- 兒童 holdout audio、兩位獨立成人標註；全部音檔人工聽驗未完成。

## Known Issues / Limits

目前沒有已知阻斷性產品問題。影片未逐片人工看完；本輪隔離 fixture 不代表真家庭雲端驗收。本機 main 及原暫存區保持。`.git/hooks`、既有空 index.lock 為 compressed,dataless placeholder，hook metadata 存取逾時，尚未恢復一般本機 commit/push。沒有刪除或停用未知 hooks；本次以 Git 物件及 GitHub 接收協定保存遠端 checkpoint。本機 Git 歷史／tag 列舉曾逾時；補取經驗證的遠端物件包後 history 與全量 diff --check 通過，未刪原物件，完整 tag 列舉不反覆重試，收工診斷見 closeout；歷史缺失 tracked 檔不自動刪除入版本。off-Git 證據與 candidate stage 必須另行還原才能重跑 prebuild，詳 ASSET_MANIFEST.md。

## Important Directories

- `src/`：React、課程資料、shopService／shopLedger、AvatarRenderer；`src/v4/`：現行課堂／首頁元件。
- `src/styles/`：現行樣式；`src/data/`：角色／世界／語音 manifest 與 curriculum。
- `public/assets/`：正式 raster、語音、角色、遊戲及動畫素材，版本路徑以 manifest 實際引用為準。
- `art-source/`：Blender／渲染原件與生產腳本；大型原件 off-Git 保留。
- `scripts/`：建置、驗證與素材流程；`api/`：家庭、state 與日期 Functions。
- `qa/`：各版原始驗收；`qa/v653/CURRENT-RELEASE.json`：現行 Gate 指向。
- candidate stage：`/Users/yuzikui/.codex/project-runtime/little-explorers-v653-feedback-20261006-r2-candidate-r5`。

## Deployment

Vercel Project `kids-learning-adventure` / `prj_PZeqjxQBaKmn4J3BvHztpC7bSuBt`。Production URL 保持原站。API 未回傳 Git link，因此沒有核實的 Vercel Production Branch；最近發布是 CLI prebuilt。GitHub Pages workflow 以 push `main` 觸發，checkpoint 分支不得合併或推 main 以免備援部署。未來 Git integration 可能變動，推送前重新核對。

## GitHub

沿用 Repository。Checkpoint Branch／Latest Tag 同 Project Identity；Latest Commit 用 tag 解出，完成收據記錄實際遠端 SHA。精選納管115來源、4424公開素材、必要建置／測試腳本、版本文件與 QA 原始文字證據。大型原件、原截圖與大型報告按 ASSET_MANIFEST 留存，沒有上傳 node_modules、cache、dist 或 .vercel。

## Do Not Change

不重做已接受美術與矩陣；不重建90／180／360課程、家庭、migration、trusted date、shop/avatar state 或 ledger。不得清 dirty、reset/clean/reclone、覆寫原 FAIL、跳過 Gate、誤用舊 B09 現場或改正式網址。不因建立 GitHub 改 package version。

## Next Recommended Work

1. 實體手機驗收。
2. 兒童語音實測。
3. 修復上述驗收發現的問題。
4. 再安排下一輪功能／內容精進。

## Resume Point

**下一個 Session 應先從實體手機與兒童語音驗收狀態確認開始，而不是重新開發已完成網站。** 先讀本段、CURRENT-SPEC、ASSET_MANIFEST 與收工收據，再按具體新證據增量處理。

---

## 以下為歷史交接（時間點保持，頂端收工資訊優先）

# 小小探險隊 V6.5.3 第二輪配件與課堂修復交付

更新：2026-10-06T14:26:09.395558+08:00。本輪完成，正式站 [小小探險隊](https://kids-learning-adventure-chi.vercel.app/) 已發布 `dpl_7wRjYuurvZvf8vJvu2KubpyGjUP2` READY。

目前唯一接續入口：`qa/v653/20261006/user-feedback-r2/checkpoint-final-r5.json`；完整發布總索引：`qa/v653/20261006/user-feedback-r2/release/release-completion-r5.json`（SHA `84fab3f50b656c87546e231867701d9dcd275da9621655611e17951adf684dfa`）；人讀報告：`qa/v653/20261006/user-feedback-r2/release/修復與發布報告.md`。115來源、4424公開素材、4438同候選編譯檔，manifest `a79609622d468a7a6a06edab0d456382523588adea25dd36c459b58e7f59f538`。

修復天空耳機、星雲側分、晴空小隊帽、小隊聽力耳機與貓耳混搭，原生Blender與四角色八服裝定位；主按鈕、備課、字卡、提問、口說與彩帶版面同步調整。使用者選定慢速跟讀，257慢速與257標準速AAC保留來源與播放回退。

608穿戴功能／獨立視覺、104新UI圖、80指定商品流程、1024全商店流程及同候選build完成。正式站15功能／獨立視覺接受、441不同檔HTTP／SHA及14重查、71新原圖、37body比較差0px。原始FAIL與補驗不覆寫；最終24拒收為原23有效控制加wrong-stage真變異fresh補驗，原排序比較FAIL保留。

main@51ff808與118列tracked dirty保持，無commit/push、重啟、清Drive或真家庭雲端操作。七個本輪QA服務關閉，原5178保持。T01外部設備／語音、影片未全看、音檔未全人工聽驗與Git全量diff逾時仍明列，舊v64-qa-review因未排除獨有資料保留。後續按具體新回饋增量處理，勿重做已接受矩陣或回到B09歷史現場。

---

# 2026-10-06T07:42:24.437769+08:00 V6.5.3 混搭／髮型解碼與教案修正版交付完成

正式站 https://kids-learning-adventure-chi.vercel.app/；deployment `dpl_Dx5cLPJZAdFehrKJekLoQnVCoc1x` READY。完整索引 `qa/v653/20261006/full-goal-audit/incremental-release/release-completion-r6.json` SHA `1e704b3bf5be1451beb46b2723597f299170f62ea9ae51bdcc071e64adaa782b`；人讀報告 `qa/v653/20261006/full-goal-audit/incremental-release/修復與發布報告.md`；唯一進度 `qa/v653/20261006/full-goal-audit/checkpoint.json`。本輪已知缺陷與限定發布驗收完成，後續依新回饋或外部證據。

107來源SHA `04be36df35c2b1b924d9008cb03e94ab8a7644f281d6c6569eddbc474169612f`、3751成品mapSHA `5423d96bc59dcd5249ce1f9c8879a22b58f914910171cbfb5d6e055962d26d33`；stage `/Users/yuzikui/.codex/project-runtime/little-explorers-v653-release-20261006-r6-incremental`。sixsource修正＋newgate已凍結；3738 public及7 API／設定不變。原稿／接受美術／舊部署成品保留，不重做64SKU/1024或Blender生成。

180作者全文／13堂30引導欄、1792靜態配置、77freshmixed308角色、16decodecontrols64角色、compiled16case86實圖、Production4case20實圖＋227HTTP/SHA均PASS；post20圖R/G/B/A與local全零差。body同舞台96＋24量測差值0px。原Lighthouse80、compiled兩個QA失敗、026缺帽及R5mounted髮層EncodingError保持原bytes；新gzip同成品LH97/LCP1209/CLS0/TBT0。

main@51ff808與dirty保留；未commit/push／重啟／Drive清理／真家庭資料寫入。本輪39155/5187與21801/5188已停止，所有browserclosed；原29335/5178保留。T01真人語音／兩成人標註／實體手機、264原片未全看、Gitdiff逾時、歷史P10／strictadapter限制與v64-qa-review保留理由均明列。

---

# 2026-10-06T05:21:39.488245+08:00 V6.5.3 本批修復、正式部署與限定線上驗證完成

正式站：https://kids-learning-adventure-chi.vercel.app/；deployment `dpl_52jdBhxZn1EMS88HCwhzpXAwygab` READY。本批已完成，不重做已接受美術、完整本機 Shop 或兩堂課驗收。詳細報告 `qa/v653/20261005/release-art/final/修復與發布報告.md`；最終總索引同目錄 `release-completion.json`；唯一狀態入口 `qa/v653/20261005/checkpoint.json`。

64×4×4＝1,024 本機流程及逐圖接受、64 合成金幣 UI 購買、256 service economy、448 額外元件試戴完成。正式站 227 個不同檔案 HTTP／SHA 通過；15 商品代表流程、四導覽配置、兩種家長取消、四位合成學員連續兩堂課完成，重載／重入無重領；38 原始截圖實看。第二堂延續第一堂實際 UI ledger，沒有寫真家庭資料。`release-smoke/production-acceptance-r1.json` 保存範圍。

106 產品／建置與七 API／設定 SHA 不漂移；3,756 static bytes 同已測成品，fingerprint `7b8cf5555823c997b08d5cb5750edfeb31c70291e167694a5cbbc1cef04dfc47`。原本發布前 admission index 維持原狀態與SHA，不能以其 READY_FOR_GATE_NOT_DEPLOYED 誤判目前未部署。公開 alias 正常，immutable 網址保留登入保護。

main@51ff808 與刻意 dirty 保留，沒有 commit／push／重啟／Drive 清理。dev session29335／5178保留；本任務 temporary preview77745已停止；兩個 productionbrowser均已結束，無新排程。

僅 T01 外部真人語音／實體手機證據未取得。Git diff 逾時、歷史 P10 缺件、嚴格型別 adapter 的明示限制保留。v64-qa-review 本機仍有程式／Git，獨有或未保存資料未排除，保留；下方已刪除說法屬歷史。後續只按新回饋與外部證據增量處理。

---

# 2026-09-27T12:45:12.934389+08:00 穿戴、人物尺寸與載入修復已部署並完成驗證

正式站：https://kids-learning-adventure-chi.vercel.app/；deployment `dpl_HKmhhQQqdfYBakdyFMFCjhmRa6sU`，維持 V6.5.2。264 配對／287 素材與真實人物舞台縮放修正已完成；actual-mounted 解碼、CSS 遮罩 CORS 二次下載缺陷均已修正。最終 8 組／24 圖正式站實看、20 項單次 CORS 請求、162 完整回應 SHA、37 靜態檔／日期與未授權 state API 通過。完整現況以 `qa/v652/root/20260927-fit-reopen/completion.json` 及同目錄 `修復與發布報告.md` 為準。

本批完成，不重做已接受美術或載入測試；後續依使用者新回饋。main@51ff808、dirty 與原始資料保留，未 commit／push。舊 v64-qa-review 已移到系統垃圾桶；5178 本機預覽保留，無新背景排程。原生姿勢、刻意停快取、歷史 dataless prebuild 與 T01 外部證據限制詳報告。下方紀錄均為歷史。

---

# 2026-09-27T11:31:21.395182+08:00 穿戴與人物尺寸修復已部署，線上驗證進行中

正式站已切換到 `dpl_12x5jfhBNVP6JtqwkUm4LpDwN4fn`；immutable `https://kids-learning-adventure-8p3zwzwq5-kui-yus-projects.vercel.app`。264配對/287素材、本機視覺與功能、14負例、strict、Vercel build完成；37個immutable HTTP/SHA/API檢查通過。正式站靜態1109項初輪兩次DNS錯誤正在只補查失敗項；隔離browser16組仍在收尾，尚未宣稱全完成。唯一入口 `qa/v652/root/20260927-fit-reopen/checkpoint.json`。未commit/push、main dirty保留，舊v64-qa-review已移至系統垃圾桶。

---

# 2026-09-27T09:31:33.361878+08:00 使用者再次退回帽子／眼鏡／髮型與穿衣身高，重新修復中

正式站仍是 `dpl_77bDxTVJx8Tn4yBSdpxq8S2iLQKJ`。上一輪框架位移0px不代表可見人物等大，不能以歷史PASS反駁使用者實際視覺回饋。Root+三名Astra分別檢查真身高、帽子形狀／定位、眼鏡／髮型。唯一現況：`qa/v652/root/20260927-fit-reopen/checkpoint.json`；保留全部舊證據、main dirty，尚未新部署。

---

# 2026-09-27T08:45:22.786079+08:00 V6.5.2 帽子造型與換裝定位修復已正式部署

- 正式站：https://kids-learning-adventure-chi.vercel.app/；deployment `dpl_77bDxTVJx8Tn4yBSdpxq8S2iLQKJ`。使用者本輪明確要求完成後直接部署；沒有 commit／push。
- 修正換帽改變人物縮放的根因，已測換装頭腳位移從 45.37 px 降為 0；保留正常眨眼、打招呼及 responsive。星光魔法帽以一張完整原生帽重製，32 角色／服裝配對；海洋帽弟弟八套修正大小與落點，合計 40 配對／113 公開素材。
- 本次同候選 112 組正常動畫帽子流程、252 當前商店預覽、11 新負向控制、strict、核心資料／課程／交易／migration 與 Vercel build 通過。正式站 1,021 檔 HTTP 200 且 SHA 相同，4 組隔離 browser 流程及日期／未授權資料 API 檢查通過。
- Manifest `44c633f33a837e2498d3560438daec682bb4f1167dce55cd0e1efb340025df3f`；Renderer `9d755b087b5029e91e1b5cf8c15fe950b2108ee01fec372dff27994aa53581b6`；artifact `4356836ffe00fd80864ba25404949f421ba39c860a25b54271c500ac3fe956f7`。
- 上一輪首頁導覽、家長登入／登出／權限、五主題圓角配色、實際游標與點擊動畫，以及已接受商品修訂已隨此候選上線；不要依下方歷史狀態重做。
- 完整索引：`qa/v652/root/20260927-wearable-drift-fix/completion.json`；人讀報告：同目錄 `修復與發布報告.md`；正式站證據：`qa/v652/astra/20260927-wearable-postdeploy/completion.json`。
- 邊界：歷史 dataless prebuild 追溯 Gate 仍標記阻礙；未宣稱整套歷史 QA 通過。T01 真人語音與實體裝置證據仍缺。本次冷載入取樣約 2.4 秒才出現完整試穿，未見已解碼舊帽閃現，但不代表所有網速皆無等待。
- main@51ff808 與刻意 dirty 保留；不碰真實家庭資料、不清 Drive、不重啟。無背景排程；本機 5178 服務保留供檢視。

---

# 2026-09-27T06:02:10.005629+08:00 V6.5.2 本機首頁與寶物修訂完成，未新部署

- 本輪五項UI要求完成：重整導覽、獨立家長登入/管理中心、報表權限、登入登出同步、五主題圓角配色與真游標/點擊動畫。課程手機溢出、機器人及收藏卡版面一併修正。
- 63商品×4角色×兩尺寸×明暗，1,008實際Shop流程PASS；單件美術及限定混搭另有來源和逐圖證據。最終manifest `f916170eb5c86f31128c22468870e84bb7c476ed13fb866d3a8d0a1cdfdf3a90`。
- 新192cape/260mask admission與25負例、舊400→92、strict及directVite PASS。108程式/設定檔前後一致。舊完整prebuild及全Gitdiff的dataless阻礙如實保留；沒有再試Drive同步或清快取。
- 完整索引：`qa/v652/root/20260927-shop-quality-reopen/completion.json`；人讀報告：同目錄 `本機修訂驗證報告.md`。不要重做已接受批次。
- 保留main@51ff808及刻意dirty；本輪未commit/push/deploy。T01外部證據仍未取得。未啟動排程；本機5178服務保留供檢視。

---

# 2026-09-27T04:13:52 本機導覽完成與商品修復增量

- 使用者要求的導覽／家長權限／五主題配色／實際滑鼠造型與點擊動畫，已完成本機驗證。UI證據：`qa/v652/root/20260927-navigation-parent-refine/completion.json`；收藏卡另有24版面case。Production本輪未變更。
- 4Racer完整body、Spike32、Comet32、Star32、兩髮飾64已接入本機；Cloud/Nebula/Legend12角色catalog已接入，真Shop切換角色與服裝80case通過。
- Wave32與6背包192正整合；披風6與帽髮混搭由兩名Astra處理，另一名Astra更新嚴格admission。Root唯一manifest/public整合者。
- 舊92admission+負控制、strict及directVite通過；完整prebuild仍因歷史P08d batch02證據dataless而阻塞，不重做Drive同步。新批次仍需自己的admission；不宣稱release。
- 當前入口：`qa/v652/root/20260927-shop-quality-reopen/checkpoint.json`。

---

# 2026-09-27 本機介面與92組配件增量

- 最新UI：`qa/v652/root/20260927-navigation-parent-refine/completion.json`；已完成導覽／家長登入登出／主題圓角配色／原生游標／手機機器人分流。明暗四尺寸流程已PASS，Production未變更。
- 商品：92組帽髮新綁定已接入本機，fresh單件來源驗證與限定review留在`qa/v652/root/20260927-shop-quality-reopen/native-hats-racer-hair-integration-r1/scoped-review.json`。Racer完整body、新Star鏡片、Spike/Comet/Wave、兩髮飾仍各QA候選；不能一概宣告全商品PASS。
- build目前因新92綁定與舊admission集合不符攔住；renderer子代理正在增加嚴格新證據及負控制，不繞過Gate。
- 詳細續做與分工以`qa/v652/root/20260927-shop-quality-reopen/checkpoint.json`為準；不重新開始或重做已通過UI。

---

# 2026-09-27T02:15 使用者退回寶物商店美術，V6.5.2 補強中

- 使用者實際驗收發現圖貨不符、髮型／帽子錯位；先前技術 PASS 與限定美術接受不代表本輪全商品視覺合格。
- 在原 V6.5.2 逐件核對 63 商品、四角色、服裝及混搭；不合格美術須修正或以完整原生圖重畫，禁止拼貼碎圖與廉價替代特效。
- 當前證據與分工：`qa/v652/root/20260927-shop-quality-reopen/checkpoint.json`。三名 Astra high 子代理分別稽核髮型、帽子及 Renderer 混搭；Root 整合且為產品唯一寫入者。
- 既有 main／HEAD／dirty 保留。正式站仍為已發布 V6.5.2；本輪尚未修改 Production。舊「不要重做美術」受本輪使用者明確重新驗收要求覆蓋。

---

# 2026-09-27 02:00 最新狀態：V6.5.2 已正式發布

- 正式站：https://kids-learning-adventure-chi.vercel.app/
- 發布、正式站驗證及兩資料夾安全清理已完成；沒有 commit/push。
- 現行權威：`docs/CURRENT-SPEC.md`；交接：`docs/handover/LittleExplorers_Checkpoint_20260927_020023_V652正式發布完成.md`。
- 252 次商品預覽／252 次交易通過；Lighthouse Performance 97、Accessibility 100。不要重做已完成美術批次。
- 僅保留次要文字／頸領邊緣細修與外部 T01 證據限制。詳細範圍見交接。

---

# 最新增量｜2026-09-26T22:20:11.600034+08:00｜Cloud／Sunny 本批完成

先讀 `docs/handover/LittleExplorers_Checkpoint_20260926_222011_CloudSunny本機整合完成.md`。Sunny28／Cloud28 已本機整合與限定驗收通過，勿重做；下一批為 Nebula／hair-legend 未完成配對。完整 build／全 release 尚未通過，Production 未部署，Racer alpha 未授權。後續委派全部使用 Astra；本機開發不依賴整個 Drive 同步完成。

---
以下歷史入口保留；矛盾處以此增量與現場證據為準。

# 最新交接入口 v19.0｜2026-09-26T20:08:23.989231+08:00

先讀 `docs/handover/LittleExplorers_新Session接手提示詞_20260926_200823_v19.0.md`。完整規格、生成方式與63商品列表在同一文件。
最新checkpoint：`docs/handover/LittleExplorers_Checkpoint_20260926_200823_兩帽整合完成與交接.md`。
兩帽已啟用且56 scoped visual/32 shop technical通過；依賴与public恢復，不能照舊入口重做。下一步Cloud20及Sunny。Production記錄6.5.1，無發布授權。5178服務PID85530保留供接手核對。

---
以下為歷史入口，與上方矛盾以最新現場和v19為準。

最新增量：`docs/handover/LittleExplorers_Checkpoint_20260926_193813_兩帽商店驗收修補.md`（兩帽shop runner新bytes；11控制PASS，真网站仍待Drive檔案恢復）。先讀此增量，再讀下方v18完整交接。

# 最新交接入口：2026-09-26 19:30:26 v18.0

使用者要求換新session續做。先讀 `docs/handover/LittleExplorers_新Session接手提示詞_20260926_193026_v18.0.md`。
完整交接 `docs/handover/LittleExplorers_Handover_20260926_193026_v18.0.md`；63商品／207配對及36份source快照見 `docs/handover/交接套件_20260926_193026_v18.0/`。

Production記錄V6.5.1，package仍6.5.1，V6.5.2是未完成本機修復。只用內建生圖，優先兩帽接線與真網站驗收；不回到舊B07或192Hero重畫，不commit/push/deploy，不重啟Mac。

---
以下保留前入口原文，狀態衝突以最新交接與現場差異為準。

# 下一個 session／agent 交接提示詞

請直接接續此工作樹的小小探險隊 V6.5.2 修復，不重新初始化或重做已接受批次。

先讀 `../AGENTS.md`、`AGENTS.md`、`docs/CURRENT-SPEC.md`，再讀
`docs/handover/LittleExplorers_Checkpoint_20260926_1802_V652續做受阻.md`（最新），需要歷史才讀 9/20 暫停快照。
詳細歷史與證據索引在 `qa/v652/CHECKPOINT.md`，新 checkpoint 優先於其中過時的待辦。

目前正式站仍是 https://kids-learning-adventure-chi.vercel.app/ 的 V6.5.1；本機是未完成的 V6.5.2 候選，不可把兩者混稱。
本輪 Ocean 28 組穿戴本機接線、桌面／手機預覽、fractional 尺寸修復已通過限定獨審，請不要重做。
接續處理 Cloud 其餘非 Racer 服裝與其餘未完成帽髮，並完成混搭、同候選完整 release gates 後才正式部署。
賽車服眼白／白衣透明缺口的程式 alpha 修復尚未取得明確授權，不能把「繼續」視為同意。

保留 main@51ff808af4389dbe4f25c88aebb7f87e78aa073b 的刻意 dirty worktree；不 reset/clean/reclone/reinit、不 git add . 或 -A、不 commit/push。
不要重做 Phase 1/2/4、P01/S01/U06、180課影片整合或 B01–B11。只用 isolated family/fixture；不得碰真實家庭雲端資料。
新美術只能用內建繪圖模型；不要用程式補畫人物。人物維持精緻靜態，不做3D轉身。
每個新 attempt 必須唯一、FAIL 原件保留；DOM或建置PASS不等於視覺PASS。
使用者已於 2026-09-26 明確要求繼續至完成；目前檔案 hydration 受阻，沒有排程或背景自動續做。先讀最新 checkpoint，保留本次新候選與 114 個尚未啟用的兩帽 public 檔，勿重跑已完成離線工作。
