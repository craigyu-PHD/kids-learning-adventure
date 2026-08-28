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
