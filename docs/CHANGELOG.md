# Changelog

## V6 P0 — 2026-08-29（進行中）

- 將應用程式樣式入口收斂為 `src/styles/index.css`，版本化 CSS 只可經 `legacy-compat.css` 載入。
- Dashboard 公開元件與檢視型別改用 `AdventureDashboard`／`DashboardViewKey`；獎勵資料型別改為 `RewardMoment`。
- 新增 `CURRENT-SPEC.md` 與 `qa:architecture`，避免歷史文件與現行權限規則混用。
- 新增 derived learning analytics：家長報表顯示單字辨識、聽力理解與未評量能力的真實狀態；優先複習建議只使用 append-only 的真實互動／口說作答事件，並由 `qa:learning` 驗證。
- 今日正式課程會在唱歌暖身前顯示最多三題 Daily Review；review telemetry 與 lesson reward source 隔離，不能增加任何 Accuracy Bonus 或經濟獎勵。
- Quick Check 依每位學習者的真實單字掌握度調整為 2／3／最多 4 個選項；首次接觸維持標準三選一。
- 新增選擇性 Speaking Practice：只在孩子主動點擊麥克風且瀏覽器支援 SpeechRecognition 時辨識英文單字；不保存原始錄音，口說 telemetry 使用獨立 `speaking:*` source，不能改變任何 XP／Coins 或 Accuracy Bonus。
- 新增 Content Health Dashboard 與 `qa:content-health`：由課程資料與 V5 runtime 檔案生成 8 項 build-time manifest，並在家長設定頁納入 Browser Gate。

## V5.3.1 — 2026-08-29

- 發布 V5 視覺資產、家長預覽／過去複習與當日獎勵邊界。
- 以 Vercel production deployment `dpl_E7kK6BVEnuqNKsezRzv8Ar7DZ8FT` 發布；詳細證據見 `v51-art-replacement-report.md`。
