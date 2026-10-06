# 小小探險隊 v6.5.3 資產保存清單

本輪只保存已部署基線。素材未因整理刪除、重新製作、轉成 LFS 或改動 runtime 路徑。

## A｜GitHub 納管

- 115 個凍結 compiler/source/config/lock inputs，總計 2,555,314 bytes。
- 4,424 個公開交付檔，總計 539,321,149 bytes；最大單檔 4,012,287 bytes。包含既有歷史 public 相容檔與實際交付 raster／AAC，數量不是「每檔本輪皆新增／runtime載入」。
- 必要建置／QA／素材生成腳本、CURRENT-SPEC、README、CHANGELOG、NEXT-AGENT、現行發布 pointer、原始 QA 文字與 pins。明確路徑見 qa/v653/20261006/closeout/selected-git-paths.json。
- source pins：qa/v653/20261006/user-feedback-r2/release/compiler-source-final-r5.json；public pins：同目錄 public-pins-final-r5.json。凍結資料及 SHA 不改寫。

## B｜適合 LFS 評估，這次未啟用

原生 .blend、來源 WAV／PNG、原始 QA 截圖及大型報告可評估 Git LFS。實際 git-lfs 不可用，.gitattributes 未建立；本輪沒有安裝、購買額度、改儲存或改 Vercel LFS。正式 public 小檔沿用一般 Git，避免未驗證的部署下載依賴。

## C｜重要原件與原始證據，另外保存

- art-source/v653/：可編輯 Blender、來源圖／WAV 及 proof；目前接受877來源／證明檔 428,976,959 bytes，含143 Blender檔。
- qa/v653/20261006/user-feedback-r2/：原 PNG、模型、原 WAV、log、超過5MiB的原始 JSON 報告等；closure共2514檔780,889,413 bytes，與877來源有重疊，不能相加。
- 本機接受 candidate：/Users/yuzikui/.codex/project-runtime/little-explorers-v653-feedback-20261006-r2-candidate-r5；同候選編譯及Functions原件需保留。
- 本輪獨立本機封存位置：/Users/yuzikui/.codex/project-runtime/little-explorers-v653-closeout-preservation-20261006/。逐檔原路徑／SHA、archive SHA、entry驗證及恢復方式見 qa/v653/20261006/closeout/off-git-preservation.json（2557 payload＋1 manifest entry，全部讀回SHA通過）。
- 完整盤點 asset-inventory.json（約21.65MB）保存在上述封存；Git只留精簡摘要及manifest，不重複提交大型盤點。
- 較早版本、退回候選、_BACKUPS、V6.4審查包、設計範例及舊v64-qa-review資料夾仍保留原位置，這次沒有全庫另備份／刪除。既有52個tracked工作樹缺失不stage刪除，checkpoint parent仍保留原Git版本。
- .env.local／.vercel 的秘密與連接設定不入公開Git；不在此抄錄值。

**本機封存不是異機備份或已證明Google Drive雲端同步。** 磁碟故障仍有風險；未驗證遠端／異機前不能宣稱重要美術全部上雲。

## D｜可重建內容

node_modules、Python／前端cache、一般dist與.vercel/output可由鎖檔／來源重新產生，不納入一般Git備份。原發布的artifact pins、build收據、FAIL與原始證據屬C／A，不能以「可重建」為由刪掉。未清cache或重啟電腦。

## 還原與重新驗證

1. checkout v6.5.3／checkpoint分支，檢查115／4424來源與公開素材SHA。
2. 按off-git-preservation.json還原原repo-relative原件及QA，不改寫原FAIL。依清單核對SHA。
3. 保留或按收據還原接受stage：目前Gate有絕對stageRoot綁定，移機不能只改路徑文字當成同候選證據。
4. 安裝鎖檔依賴，執行既有prebuild／build。只有Git clone、不還原C類檔不能保證建置通過；不允許弱化Gate。

## 重複與同步風險

選定6,977個unique路徑全SHA exact；1,079組同SHA重複檔為已證明相同bytes。4,995 basename相同／49個copy或編號名稱僅是檔名候選，不能自動視為衝突。一般盤點有界停止，57,127檔／10.30GB為部分下界，不宣稱全庫沒有conflict copy。沒有發現影響凍結115／4424的漂移或已確認阻斷性同步衝突。

## 本輪封存收據

- Archive：little-explorers-v653-r5-off-git-originals.zip，583,266,198 bytes。
- SHA-256：bdde27c27b998968acbac2e847ec9e04ce683e54b3619b16f74c088049d5ef88。
- 2557 payload entries，原始744,260,667 bytes；加內嵌manifest，共2558 entries，全部讀回SHA通過，未封存0。
- 外部archive-manifest.json SHA：d082a176887b842aa213f434ce0b61df23b902e18fb7e76e7cb2286e2aa416cc。
- 封存目錄必須保留，不當成可刪runtime cache。

本機Git hook目錄及舊空index.lock為未實體化placeholder；原metadata不清除／不重設。本輪GitHub保存使用已驗證物件與遠端ref，未宣稱一般本機commit/push已恢復。
