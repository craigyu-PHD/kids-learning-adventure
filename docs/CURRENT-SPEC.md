# 小小探險隊 CURRENT SPEC

狀態：V5.3.1 production baseline；V6 P0 consolidation in progress。  
更新：2026-08-29。  
本文件只描述目前正式規則；歷史決策請讀 [CHANGELOG.md](./CHANGELOG.md)。

## 學習與權限

- 課程固定為 18 週、90 學習日、每日兩堂、180 lessons、360 missions。
- 孩子未來日只能看到主題、學科與解鎖提示；不能打開完整九關教材。
- 過去日對孩子只顯示自己的完成成果；不得重寫任務、作答、出席、XP、Coins 或徽章。
- 家長 PIN 解鎖後可完整預覽未來 90 天教材，也能檢視過去完整教案；此路徑始終唯讀。
- 今天是唯一可以建立出席、作答、任務完成、XP、Coins、徽章與寶箱紀錄的日期；日期必須由 Asia/Taipei server-confirmed time 決定。
- 獎勵與作答採 append-only、idempotent event ledger；不可由瀏覽、重新整理或返回重複領取。
- 家長報表的能力掌握度只讀取真實 Quick Check 與使用者主動啟動的口說 `AnswerEvent`；不把課堂完成、XP 或推測資料偽裝成口說、句型、自然發音或理解能力。
- 複習優先順序由答錯次數、掌握度與最近作答推導；現階段僅提供家長建議，不會自動改寫孩子的課程或進度。
- 當天課程開始前可顯示最多三個需加強單字的 Daily Review；複習的作答會成為能力證據，但使用獨立 `review:*` source，不計入任一 lesson 的 Accuracy Bonus、XP 或 Coins。
- Quick Check 的選項數只可依已觀察的單字掌握度調整：低於 70 分為兩項、70–84 分為三項、85 分以上最多四項；首次接觸固定三項，不能因沒有資料而假設能力較低或較高。
- 口說練習僅在支援瀏覽器 SpeechRecognition 的裝置上、由使用者點擊麥克風後啟動；不保存原始錄音，僅保存辨識文字、瀏覽器信心值與正誤結果。口說事件採獨立 `speaking:*` source，不計入 lesson Accuracy Bonus、XP 或 Coins；不支援的裝置一律顯示照顧者帶讀 fallback。

## 角色、品牌與素材

- 正式學習者角色只有哥哥與弟弟；舊 avatar ID 只在讀取時相容映射。
- 成長階段固定 Lv.1／5／10／15 四階。
- 正式美術 runtime 位於 `public/assets/v5/`；可見頁面不得依賴 V4 素材。
- Header、哥哥、弟弟、Robot、火箭、Weekly Robot 與寶箱採 WebM + poster；現階段是 2.5D keyframe，不宣稱為骨架 rig 3D 動畫。
- 24 Badge、52 Shop items、150 Vocabulary concepts、3 Caregiver 都必須通過尺寸、透明度、SHA uniqueness 及與 V4 差異 Gate。

## 可讀性、動態與無障礙

- 文字與圖片必須使用獨立布局軌道；禁止以重疊 Grid 補救內容排版。
- 內文在桌機最低 14px、次要資訊最低 12px；純裝飾例外。
- 所有互動目標至少 44×44px，鍵盤焦點必須可見。
- `prefers-reduced-motion` 停止非必要動畫；首屏 WebM 先呈現 poster 後才延後播放。

## 資料與安全

- Family PIN 只送往 `/api/family-session`，換取有期限的 signed session；`/api/state` 僅接受 Bearer session。
- PIN 不可出現在 localStorage key、URL 或 Blob path；legacy PIN namespace 只允許一次性 migration。
- 資產、課程與操作 QA 都是 release gate；自動驗證不是人類美術簽核的替代品。
- 家長管理頁的 Content Health Dashboard 顯示 build-time manifest：90 學習日、180 lessons、360 missions、360 影片、150 Vocabulary、24 Badge、52 Shop items、6 WebM。發布前必須重新生成並通過 `qa:content-health`；它不是即時 CDN／YouTube 健康度的替代品。
