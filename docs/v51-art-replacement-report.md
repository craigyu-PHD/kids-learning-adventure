# V5.1 Art Asset Replacement Sprint — 驗收報告

日期：2026-08-29
狀態：V5.3.1 production release gate 已於 2026-08-29 通過；上一版 production 為 commit `7f7e59f`。

## V5.2 課程預覽與獎勵邊界

- 90 個學習日的兩堂內容全部可由「學期日曆」直接開啟：未來日標示「課前預覽」、已過日期標示「複習內容」，不需要等待解鎖才可閱讀教案或預作準備。
- 預覽與複習均為唯讀：不寫入任務、作答、出席、完成紀錄、XP、Coins 或徽章。課程九關仍可逐關查看，讓照顧者先熟悉影片、暫停提示與活動安排。
- 只有 `/api/server-time` 驗證為 Asia/Taipei 的「今天」時，才會建立出席、開放互動任務與作答紀錄；兩堂課正式完成後才由既有 append-only reward ledger 結算 XP、Coins 與寶箱。
- 移除了「切換課程關卡即送 XP」的舊行為，避免只瀏覽內容就獲得獎勵。
- 課程卡改為語意清楚的 header + two-column body；縮圖、文字、狀態與操作各有固定欄位。玩家卡、AI 區與角色成長區亦補上圖片安全欄位及小尺寸文字截斷，避免圖片覆蓋文字。

## V5.3 Visual Finish（2026-08-28，本機驗收）

- 家長與孩子的瀏覽權限已重新切開：孩子的未來日只可看到主題、學科與開放日期提示；過去日只看自己的完成成果。家長以 PIN 解鎖後，才可完整預覽未來 90 天教材，以及回看過去教案。`App.tsx` 也會拒絕未解鎖家長直接輸入未來／過去課程 URL。
- 今天仍是唯一可建立出席、作答、任務完成與 XP／Coins／徽章獎勵的日期；家長預覽路徑沒有任何寫入入口。
- Header 改用新產製的透明 3D「小小探險隊」品牌 Logo，右上新增照顧者姓名、PIN 狀態與設定入口，所有 secondary pages 亦顯示同一狀態並可開啟 PIN 對話框。Logo 為 production WebP；Weekly Robot Rocket 另有可播放、reduced-motion 可停用的 VP9 WebM 與 WebP poster。
- Avatar 資料模型不再保留「六個 ID、兩張臉」的假選擇：正式角色為哥哥／弟弟兩種；舊 ID 在讀取時會相容映射。角色成長、圖片與門檻統一為 Lv.1／5／10／15 的四階，移除不存在圖片的 Stage 5 語意。
- 首頁新增家庭冒險等級卡；個人 Player Card 僅保留 XP 與 Coins。Weekly Progress 加入原創 Robot Rocket 圖，課程卡加上 18:30–19:00／19:05–19:35 時段，日期條改為日期／星期／Day，Hidden Reward 每天都可見。
- 文字安全欄位再次加強：Evolution、Lesson source／status 與 lock note 最低為 11px；Lesson Card 維持真正 header + two-column body，圖片和文字不共用格位。

## V5.3 內建 Image 重新製作：24 枚 Badge（2026-08-28，本機）

- 24 枚 Badge 已不再使用 V4 相容搬移圖。六張由內建 Image 工具生成的透明 2×2 production atlas，經 `scripts/crop_v53_badge_atlas.py` 拆分為 24 張 512×512 transparent WebP 與 24 張 128×128 runtime derivative，直接覆蓋正式 `public/assets/v5/badges/` runtime 路徑。
- 六組依序為：連續學習（火箭／日曆／羅盤）、口說（對話框／麥克風／句子彩帶／擴音器）、聆聽（耳朵／雷達耳機／音符羅盤／耳機皇冠）、學習（任務旗／拼圖火箭／地圖／寶藏勳章）、冒險（世界／森林／海洋／太空）、特殊成就（完美日／早起／回歸／傳奇探險）。每張設計具有不同視覺主體，而非同圖改名。
- 新增 QA 硬 Gate：24 張 master 與 24 張 runtime derivative 各自必須 SHA 24/24 unique；每張 master 皆須與 V4 同名 Badge SHA 不同。這會阻止未來再以複製相容檔案誤報「已重製」。
- 美術來源與可重現資訊：內建 Image 工具輸出的 atlas 留存於本機生成紀錄；runtime 衍生步驟為 `python3 scripts/crop_v53_badge_atlas.py <atlas.png> <四個 badge id>`。本輪沒有將生成器輸出直接當瀏覽器素材，也未使用 SVG、Emoji 或 CSS 幾何徽章。
- 家長／照顧者三張正式 1024×1024 transparent 3D Avatar 亦已由同一工具重製：爸爸、媽媽與其他照顧者各自有不同臉型、髮型與服裝，並以 `scripts/crop_v53_caregiver_atlas.py` 寫入 runtime 路徑。QA 同步要求三張 SHA unique，且與 V4 同名角色 SHA 全部不同。
- 商店世界型商品 12/12 已完成：`ship-*`、`room-*`、`robot-*`、`card-*` 四個系列各三張（一般／史詩／傳奇）。十二張均為新的 512×512 transparent 3D WebP，透過 `scripts/crop_v53_item_atlas.py` 寫入既有商品 ID，故不改動購買、裝備或資料相容邏輯。QA 要求此 12 張 SHA unique 並全數不同於 V4。
- 三個效果類商品（星星軌跡、氣泡軌跡、傳奇星塵）與火箭隊長帽也已換成新 512×512 transparent 3D Shop art。效果圖僅用於商店展示，並未恢復網站層級的持續粒子；目前新產製的 Shop asset 為 16/52。
- 五款帽子商品亦已完成重製，現在 Shop 新產製 asset 為 20/52；每件持續沿用既有商品 ID，購買、解鎖與角色裝備資料完全相容。
- 眼鏡與耳機兩個系列皆已完成 5/5；背包先完成旅行小背包與迷你火箭背包。現有新產製 Shop asset 為 32/52；火箭隊長帽已在前一組計入，不重複計數。QA 對每件驗證 512px alpha、SHA uniqueness 與 V4 同名檔差異。
- 背包與披風兩個系列完成 5/5；六款髮型與六款服裝亦完成各自獨立的衣櫥商品圖。Shop 目前為 52/52 新產製 512×512 transparent asset；實際 Avatar 穿戴仍由既有合成機制負責，故不將「商品展示圖重製」誤報為完成了逐件 3D 角色換裝 rig。
- Vocabulary 的 150 個 runtime 概念已全數重製為 640×480 transparent production asset，覆蓋食物、動物、交通、家居、場所、核心分類、比較、色彩、天氣、形狀、數字、身體部位、情緒、動作、活動指令、安全概念、家庭、日常互動、禮貌表達、學校、自然、字母、句型、提問、世界探索與中文音訊提示。課程有 161 個詞彙資料列；正式 runtime slug 會去除詞尾中文翻譯，並以 `zh-audio` 處理純中文「中文聲音」，因此正確對應為 150 個獨立教材概念。QA 會驗證 161→150 概念映射、全量尺寸、透明度、檔名完整性、SHA uniqueness 與 V4 同名檔差異；現在的 150 張均為新產製素材。

### V5.3 QA 證據

- `npm run qa:strict`、`npm run build`：PASS。
- `npm run qa:v51:art`：PASS；新增驗證品牌 Logo、Weekly Rocket Robot、四階角色與家長／孩子內容邊界來源契約。
- `npm run qa:v51:browser`：PASS；1536×1024、820×1180、390×844 均無 broken images、Bopomofo 或 horizontal overflow。Child mode 實測未來只開啟 teaser、過去只開啟成果；家長以 PIN 解鎖後實測可打開未來與過去完整九關內容；上述唯讀路徑均未改寫 progress。Weekly Robot Rocket WebM 亦實測解碼、reduced-motion 暫停。
- 本輪畫面由 `qa/screenshots/v51/` 重新輸出並人工檢視；自動 QA 的 PASS 是行為與回歸證據，不將它等同於人類美術滿分。

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
- 2026-08-29 新鮮 Desktop Lighthouse production-preview：Performance 92、FCP 675ms、LCP 1,852ms、CLS 0.000083、TBT 0ms、transfer 4,880,057 bytes。為避免首屏與 WebM 搶資源，Header LCP key art 改為同步解碼；角色、火箭、AI Robot 與 Weekly Robot 保留 poster，於首屏繪製後延後 1.2 秒播放 WebM。
- Header 已再次人工截圖複核：品牌、三名角色、Theme controls 分離，不再互相覆蓋；Evolution 舊 Grid 欄設定造成的直排與越界也已修正。

## QA 證據

- `npm run qa:v51:art`：PASS。檢查 Nav／Theme／Master／Stage SHA、V5/V40 Theme 差異、WebM container、runtime V40 source、Header 禁用 token 與 DOM integration。
- `npm run qa:v51:browser`：PASS。1536×1024、820×1180、390×844 的 overflow 均為 0；broken image 0、visible V40 media 0、Bopomofo 0；影片 readyState 4；手機三欄實測寬度均為 370px；reduced-motion reload 後所有 cinematic video paused；90 天日曆 action 均存在，未來預覽與過去複習均不會改寫 local progress。
- `npm run validate:online`：2026-08-29 重新驗證 PASS，360/360 YouTube videos playable and embeddable；結構、唯一性與 180/180 alignment 同步 PASS。
- `npm run qa:v51:performance`：PASS，Desktop Lighthouse 所有門檻通過。
- `npm run qa:v51:orbit`：自動證據覆蓋分數 100/100。這是 Gate/evidence coverage，不當作人類美感 100 分。
- `npm run qa:strict`、`npm run build`、`npm run validate`、`npm run qa:state`、`npm run qa:auth`、`npm run qa:migration`、`npm run qa:date`：PASS。
- `npx vercel build --prod`：PASS（本機 production build；正式部署結果於本輪 release 完成後補記）。

## 誠實界線

- 本輪 WebM 是具實際影格的 2.5D 關鍵幀動畫，不是 Blender 骨架／布料／口型 rig animation。
- `public/assets/v5/badges/`、`items/`、`vocab/` 與 caregivers 均已重新製作並實際寫入 V5 runtime path：24 枚 Badge、52 件 Shop item、150 個 Vocabulary concept 與 3 名照顧者角色均有透明度、尺寸、SHA uniqueness 及 V4 SHA 差異 Gate；不以「僅搬移檔案」宣稱美術完成。
- Production 已部署：`https://kids-learning-adventure-chi.vercel.app/`；首頁與 `/api/server-time` HTTP 200、未帶 Bearer 的 `/api/state` HTTP 401、未提供 PIN 的 `/api/family-session` HTTP 400。
- 診斷 Vercel local dev 時，本機 `.vercel` 內的敏感環境值曾出現於本次工具輸出，但未進入 Git；本輪使用 CLI 完成發布。Vercel Dashboard 未有登入 session，因此無法在不取得使用者登入授權下執行 Blob Store 的 OIDC 升級／長效 token 輪替；此項保留為需在 Vercel Storage Dashboard 完成的安全後續工作。
