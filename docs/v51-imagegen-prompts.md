# V5.1 Image Generation Prompt Set

本輪正式素材使用 Codex 內建 ChatGPT Image 產生；角色設定表若生成為假透明格，改用純洋紅背景，再以 `scripts/v51_remove_background.swift` 的 macOS Vision 前景遮罩去背。原始生成圖仍保留於 Codex generated-images 目錄，專案內只收正式 WebP／PNG／WebM。

## 共用視覺語言

Premium polished original 3D animated-family-adventure game art; child-safe chibi proportions; PBR plastic, cloth and metal; upper-left key light, cool blue rear rim light, soft ambient fill; consistent camera and color grade; no logos, copyrighted characters, text, labels, watermarks, checkerboard, or clipped edges.

## 六枚導覽圖示

同一套 3D renderer，透明背景、置中、單一物件、512×512。六個獨立 prompt 的主體分別為：冒險小屋、打開的英文故事書、顯示日期格的日曆、金色立體星星、三柱上升圖表、藍金冒險寶箱。每張保留 Royal Blue／Cyan／Gold 色系，但輪廓與功能語意必須不同。

## 哥哥／弟弟／Robot Master

以各自 `master-front.webp` 為 reference，要求永久一致的臉型、眼睛、膚色、髮型／帽子、服裝及材質。上排輸出 front／left45／right45／profile／back；下排哥哥與弟弟輸出 smile／laugh／surprise／think／celebrate，Robot 輸出 celebrate／think／sleep。背景指定單一 `#FF00FF`，供真正 alpha 去背。

## 四階角色進化

各階以同一角色 reference 生成 1024×1024 全身透明圖。Stage 1 保留學習新手輪廓；Stage 2 加入背包與輕型冒險裝備；Stage 3 加入星際護甲與發光胸徽；Stage 4 加入傳奇披風／肩甲／金色特效。只提升服裝與姿勢，不改臉。

## 五套 Theme V2

同一哥哥、弟弟與 Robot、同一 camera/light/render；五張 1024×1024 場景分別為 space hero、mecha hangar、racing city、fantasy forest、underwater dome。只更換世界、服裝與裝備；不得重複 V40 構圖。

## Header、Rocket、Treasure 與 WebM Keyframes

Header 背景為 3072×300 cinematic space-adventure panorama，人物與文字分層。哥哥、弟弟、Robot 各以一致角色生成透明 idle keyframes；Rocket 使用透明橫幅 keyframes；Treasure 使用 closed-to-open 的藍金寶箱 keyframes。正式檔以 24fps VP9 WebM 編碼；Idle 4 秒、Rocket 15 秒循環、Treasure 2 秒一次性播放。這些是 2.5D 關鍵幀動畫，不標示為 Blender rig animation。

## V5.3 Brand Logo 與 Weekly Robot Rocket

- `little-explorers-logo-v2.webp`：透明背景、黃至金橘的中文「小小探險隊」3D 字、深橘厚描邊、深藍 extrusion、上緣亮部、柔和陰影；旁置小火箭與星星裝飾。母檔輸出至少 1600×450，前端以約 370px 寬顯示。
- `weekly-rocket-robot.webp`：透明背景、原創圓角藍色學習 Robot 站在橘白小火箭上、三顆微小星星、同一左上主光／冷色 rim light／PBR 3D renderer；不用文字、品牌 Logo、emoji 或受版權角色。母檔輸出至少 1024×1024；由 `scripts/generate_weekly_robot_webm.py` 以 Canvas/MediaRecorder 產出 3 秒透明 VP9 `weekly-rocket-robot.webm`，作小幅漂浮 motion，WebP 作 poster／reduced-motion fallback。

## V5.3 重新產製 Badge、照顧者與商店圖

- Badge：內建 Image 工具各產出一張透明 2×2 atlas；六組主題為連續學習、口說、聆聽、學習、冒險、特殊成就。每格指定唯一物件語意與 512×512 safe crop，採 PBR toy-metal/enamel、左上暖主光、冷色 rim light；嚴禁文字、數字、Logo、水印與 checkerboard。以 `scripts/crop_v53_badge_atlas.py` 產出對應四張 master 與 128px derivative。
- Caregiver：單張透明 2×2 atlas 的三個格位依序為台灣爸爸（海軍藍開襟衫與橘色上衣）、台灣媽媽（珊瑚色開襟衫與青綠上衣）、其他照顧者（薄荷綠外襯與紫色上衣）；角色必須全身、友善、不幼態、各有不同臉型與髮型。第四格保留透明。以 `scripts/crop_v53_caregiver_atlas.py` 輸出三張 1024px runtime asset。
- Featured Shop Item：第一張透明 2×2 atlas 的四格依序為藍翼偵察艇、星光研究室、小光天空裝甲（僅裝甲 collectible，不含角色身體）、天空任務卡（留白中心）；第二張依序為彗星巡航艦、深海觀測艙、小光機甲裝甲、星雲任務卡；第三張依序為傳奇星艦、傳奇指揮艙、小光傳奇裝甲、傳奇任務卡。皆為獨立 3D 道具、不可跨格。以 `scripts/crop_v53_item_atlas.py` 輸出十二張 512px runtime asset。
- Wearable Shop Item：其餘 40 件商品依帽子、眼鏡、耳機、背包、披風、髮型與服裝分成透明 2×2 atlas。每格必須是一個獨立收納／衣櫥收藏品，無人物頭臉或 mannequin、無文字與 Logo、保留 512px safe crop。角色套裝的 runtime 實際呈現仍由 Avatar CSS composition 負責；本次是完整重製 Shop 52/52 的 raster 商品視覺，而不是宣稱已產出 52 套可 rig 的換裝角色。
- Vocabulary Food Teaching Art：第一張透明 2×2 atlas 的四格為 red apple、yellow banana、purple grape bunch、green broccoli；第二張為 orange、strawberry、ice cream cone、orange juice。每格僅一個可辨識的幼兒教材物件，無盤子、背景、文字或人物；由 `scripts/crop_v53_vocab_atlas.py` 保持置中留白後輸出至 640×480 WebP。
- Vocabulary Animal Teaching Art：第三張透明 2×2 atlas 的四格為 friendly brown dog、orange tabby cat、blue-and-yellow tropical fish、pink pig。各動物完整置中於自己的分隔格中，無背景、道具、文字或跨格重疊；同樣透過 `scripts/crop_v53_vocab_atlas.py` 輸出為 640×480 WebP。
- Vocabulary Transport Teaching Art：第四張透明 2×2 atlas 的四格為 red family car、yellow school bus、blue passenger train、red-and-blue playground ball。每個交通／遊戲物件獨立置中、無文字與品牌；生成器可能輸出非正方形畫布，裁切工具已改為依實際寬高各半切格，仍保持四格素材安全分隔與 640×480 output。
- Vocabulary Home Teaching Art：第五張透明 2×2 atlas 的四格為 child-sized bed with pale-blue blanket、light-wood table、small yellow chair、closed blue picture book。每格皆驗證有效透明 alpha 後再裁切；若預覽器把透明 RGB 殘留合成為漸層，仍以 alpha 通道與實際 crop 檢視作驗收依據。
- Vocabulary Colour Teaching Art：第六張透明 2×2 atlas 的四格為同一種無品牌、圓角堆疊玩具積木，顏色依序為 red、yellow、green、blue。每格只改變主體色，確保幼兒能把英文顏色與可見物件清楚連結；無文字、Logo 或任何受保護角色設計。
- Vocabulary Number and Emotion Teaching Art：第七、八、九張透明 2×2 atlas 依序覆蓋 one 至 four、five 至 eight、nine／ten／happy／sad。數量以相同的金色星形 token 呈現，且 prompt 硬性指定每格 token 數；happy／sad 使用原創圓形表情 token，不使用文字、emoji 字元或真實人物照片。
- Vocabulary Animals and Nature Teaching Art：第十、十一張透明 2×2 atlas 分別覆蓋 bird／cow／duck／lion 與 sun／moon／tree／flower。所有主體皆為獨立教材圖；月亮的兩枚小星星只作 moon 的附屬物，獨立 `star.webp` 仍維持既有 runtime asset，避免把裝飾誤當另一張單字圖。
- Vocabulary Clothing Teaching Art：第十二張透明 2×2 atlas 覆蓋 shirt／pants／shoes／hat。衣物均作獨立、無商標的收藏品式 3D 道具，畫面不得包含穿著者、模特兒或 mannequin，確保縮圖中只有單字的可見概念。
- Vocabulary Weather Teaching Art：第十三張透明 2×2 atlas 覆蓋 sunny／rainy／cloudy／hot，以日光、雨雲、雲朵與無讀數溫度計呈現。每個天氣意象可包含非常少量的附屬物，例如 sunny 的小白雲或 hot 的火焰，但不以文字或數字提示答案。
- Vocabulary Food and Drink Teaching Art：第十四張透明 2×2 atlas 覆蓋 pizza／soup／egg／water。食物與飲水皆使用無商標、無文字的單一主體，沒有桌面或完整情境背景，讓縮圖保留給網站文字與照顧者提示的安全閱讀空間。
- Vocabulary Transport and Adventure Teaching Art：第十五張透明 2×2 atlas 覆蓋 bike／toy／rocket／dinosaur。自行車、玩具、火箭與恐龍全部採原創玩具式 3D 設計，避免品牌與既有 IP 識別；其安全邊界也讓 `object-fit: contain` 在 Vocabulary 卡片內不遮住單字。
- Vocabulary Everyday Places Teaching Art：第十六張透明 2×2 atlas 覆蓋 jacket／school／park／store。school 和 store 均要求無招牌文字，park 收斂成可辨識的場地 token，避免用大背景場景破壞 Vocabulary 卡片的透明與排版邊界。
- Vocabulary Shape Teaching Art：第十七張透明 2×2 atlas 覆蓋 circle／square／triangle／star。每格是單一圓角、立體但輪廓清楚的教具 token；主體背後不得有背景色塊，避免孩子把光暈或畫布誤認為形狀的一部分。
- Vocabulary Home and Transport Teaching Art：第十八張透明 2×2 atlas 覆蓋 home／room／road／van。home 與 room 採切面式小型 diorama，road 只保留路段 token，van 以無品牌的家庭車呈現；四者皆限制在透明畫布內，不作全幅背景場景。
- Vocabulary Extended Colour and Weather Teaching Art：第十九張透明 2×2 atlas 覆蓋 orange／purple／pink／cold。三個色彩使用相同無品牌的圓角教具，cold 則是獨立雪花 token；四格均維持透明留白，圖卡文字不會被素材背景遮住。
- Vocabulary Alphabet Object Teaching Art：第二十張透明 2×2 atlas 覆蓋 `a-apple`／`e-egg`／`i-ice`／`o-orange`。檔名依課程的字母前綴 slug，而非一般詞彙 slug；這項規則特別納入 QA，避免把「orange（色彩）」誤寫成「o-orange（水果）」。
- Vocabulary Ocean and Space Teaching Art：第二十一張透明 2×2 atlas 覆蓋 shark／insect／ocean／space。海洋 diorama 僅包含抽象浪花、珊瑚與貝殼，避免產生具有既有動畫角色辨識度的魚種；shark、caterpillar 與 planet 均為獨立原創玩具式設計。
- Vocabulary Alphabet B-C-D-F Teaching Art：第二十二張透明 2×2 atlas 覆蓋 `b-ball`／`c-cat`／`d-dog`／`f-fish`。這些圖分別寫入字母單元的 runtime slug，不覆蓋一般 `ball`、`cat`、`dog`、`fish` 教材圖；各角色以原創動物比例與配色呈現。
- Vocabulary Alphabet G-H-J-N Teaching Art：第二十三張透明 2×2 atlas 覆蓋 `g-grape`／`h-hat`／`j-juice`／`n-nose`。nose 用獨立教具 token 而非完整人臉，讓身體部位的概念更聚焦，也避免生成新的角色身份或與哥哥／弟弟主角色混淆。
- Vocabulary Alphabet P-Q-R-S Teaching Art：第二十四張透明 2×2 atlas 覆蓋 `p-pig`／`q-queen`／`r-red`／`s-sun`。queen 以無臉的 crown-on-pedestal token 來表示，不加入皇室人物；red 與 sun 使用字母專用 runtime 檔，不覆蓋一般色彩與自然教材圖。
- Vocabulary Alphabet T-U-V-W Teaching Art：第二十五張透明 2×2 atlas 覆蓋 `t-toy`／`u-umbrella`／`v-van`／`w-water`。`v-van` 先前已是新產製 V5 路徑，本次以字母單元專用車輛圖更新該檔，故新概念計數增加三個、不重複把同一路徑算成兩張。
- Vocabulary Action and Emotion Teaching Art：第二十六張透明 2×2 atlas 覆蓋 angry／tired／jump／turn。angry、tired 使用原創表情 token；jump 使用彈簧床與球鞋，turn 使用可實際辨識的旋轉陀螺，避免以文字、Lucide 或一般 UI icon 取代教材插圖。
- Vocabulary Body Parts Teaching Art：第二十七張透明 2×2 atlas 覆蓋 head／shoulders／knees／toes。以獨立、去識別化的教具 token 表示各身體部位，不與哥哥／弟弟主角色混用；圖像不含文字，讓照顧者可配合真人指認與動作活動。
- Vocabulary Body Parts Teaching Art：第二十八張透明 2×2 atlas 覆蓋 eyes／ears／hands／feet。四項都採獨立教具 token，保留足夠透明邊界，讓 Lesson Quest 內的圖片不會壓到單字、提示或完成標準文字。
- Vocabulary Activity Cue Teaching Art：第二十九張透明 2×2 atlas 覆蓋 clean／open／close／go。clean 以收拾積木、open 以打開玩具箱、close 以合起圖畫書、go 以向前移動的玩具車呈現；所有動作線索都是畫面的一部分，沒有用文字或 UI icon 代替教材圖。
- Vocabulary Family Teaching Art：第三十張透明 2×2 atlas 覆蓋 mom／dad／brother／family。四項採同一套原創的家庭教具角色比例，與網站哥哥／弟弟的主角色資產保持不同身份；家庭圖只用於教材認詞，不會取代已設定的學習者角色或照顧者帳號。
- Vocabulary Core Categories Teaching Art：第三十一張透明 2×2 atlas 覆蓋 food／animals／colors／numbers。以可數物件、動物群組與無文字的色彩教具表示分類概念；numbers 採一至五顆星星，避免將數字字型混進教材主視覺。
- Vocabulary Category and Comparison Teaching Art：第三十二張透明 2×2 atlas 覆蓋 weather／body／big／small。weather 用日、雲、雨滴組合；body 使用去識別化的人形教具；big／small 使用同一套玩具尺度參照，讓照顧者可立即延伸大小比較活動。
- Vocabulary Everyday Interaction Teaching Art：第三十三張透明 2×2 atlas 覆蓋 hello／hi／bye／friend。四項以揮手、擊掌、紙飛機道別與碰拳等可帶做的非文字手勢呈現，讓孩子可直接跟著圖像互動而非只讀單字。
- Vocabulary Polite Expression Teaching Art：第三十四張透明 2×2 atlas 覆蓋 love／hug／please／thank-you。原始檔四角 alpha 已檢查為 0；裁切流程會保留物件自身的柔邊透明度，確保放入 Lesson Quest 時不會出現矩形背景或壓住文字。
- Vocabulary Direction and Safety Teaching Art：第三十五張透明 2×2 atlas 覆蓋 yes／no／stop／fast。符號只作為可辨識的玩具道具，沒有任何文字；可配合照顧者的肢體指令、安全路線與交通單元使用。
- Vocabulary School and Nature Teaching Art：第三十六張透明 2×2 atlas 覆蓋 teacher／sky／nose／abc。只有 abc 教學卡使用 A、B、C 字母本身；其餘都不含文字。nose 保持獨立教具，不把教材圖變成新的可辨識人物角色。
- Vocabulary Sentence Pattern Teaching Art：第三十七張透明 2×2 atlas 覆蓋 i-am／i-can／i-have／i-like。使用自我肖像、獎盃、背包與喜愛物件等可指認語意，不把英文字句直接印在插圖上；句子本身仍由介面以可讀的文字呈現。
- Vocabulary Question and Discovery Teaching Art：第三十八張透明 2×2 atlas 覆蓋 i-see／mountain／what-is-it／where-is-it。放大鏡、山、神秘箱與地圖皆為可操作的探索情境物件；問句採符號教具，不直接在插圖上排英文文字。
- Vocabulary Chinese Audio Teaching Art：第三十九張透明 atlas 僅取左上象限寫入 `zh-audio`；以喇叭、麥克風與聲波教具表示聆聽入口，完全不含中文、注音或字母。裁切工具已支援一至四個 atlas 目標，避免為單一 runtime concept 產生無意義的重複素材。
