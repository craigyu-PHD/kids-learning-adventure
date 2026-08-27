# Art Bible V5 — 小小探險隊 Premium 3D

> 附件圖 1 占 80%（首頁 Dashboard），附件圖 2 占 20%（課程/設定/任務）。禁止「網頁卡片+卡通圖」拼接。

## 全站 3D Style
- Premium 3D animated children's adventure game, Disney/Pixar 質感方向（不模仿特定角色）
- Chibi 1:3.3–1:3.8，大眼睛、柔和臉型、圓潤造型
- PBR 塑膠/布料/金屬，高飽和不螢光過曝
- 光源：左上方主光 + 右後方藍色 Rim Light + 柔和環境光
- 全部人物相同 Camera Perspective / 光源 / Color Grading / 眼睛-皮膚-頭髮材質系統

## 固定色盤
```
Space Navy       #061D57
Deep Blue        #073B91
Royal Blue       #1347C6
Electric Blue    #2E89FF
Cyan Glow        #19C9FF
Gold             #FFD83D
Orange           #FF8A34
Reward Purple    #A54BFF
Success Green    #20C968
Card White       #F9FBFF
Soft Blue        #EAF3FF
Text Navy        #0D2A62
Disabled         #C7D1E0
```

## 角色 Master Sheet
- 哥哥/弟弟/Robot 各 2048×2048 透明 WebP lossless + 512 顯示，含 正面/左45/右45/側面/背面 + 微笑/大笑/驚喜/思考/慶祝
- 臉永久一致：同一 character ID 髮型/眼睛比例/臉型/膚色，後續所有圖以 Master 為 reference
- 進化每階段改 服裝/肩甲/鞋子/背包/胸徽/特效/姿勢，臉不變

## 進化 Lane
- 哥哥: Lv.1 學習新手 → Lv.5 星際勇者 → Lv.10 超級英雄 → Lv.15 傳奇英雄
- 弟弟: Lv.1 小探險家 → Lv.5 小勇士 → Lv.10 星際騎士 → Lv.15 宇宙英雄
- 單區 422×154，每角色 82–94px，箭頭 28px，文字 12–13px

## 版型 (1536×1024 一屏完成)
```
Header 150 | Nav 70 | Gap 12 | Main 720 | Gap 12 | Status 60 = 1024
Main: 260 + 12 + 880 + 12 + 344 = 1508 (margin 14)
Outer Game Panel: #073B91→#052B70, 2px #19C9FF, 22px, inset 0 0 20 rgba(25,201,255,.16)
Inner Card: #F9FBFF, 1.5px #D8E9FA, 16px
```

## Header Key Art
- Desktop 3072×300 (顯示 1536×150)，人物背景同 3D Scene 同 Camera/光源/Perspective/Grading；Logo 1000×280 透明另做，黃橘 3D 字深橘描邊金高光深藍陰影 68–76px，副標 18px
- 動畫: 哥哥 512/24fps/4s loop 呼吸眨眼微移握拳微笑；弟弟眨眼微移揮手；Robot 512/4-5s 眨眼偏頭揮手漂浮；Rocket 每 12-18s 飛過

## 動畫格式 (禁止 GIF 為主)
1. WebM Alpha 2. Rive 3. Animated WebP 4. Lottie 5. GIF fallback (<320, <2s, 裝飾)
- Header 主人物/大寶箱/進化禁止 GIF
- 元件: `<video autoplay muted loop playsinline poster>` + IntersectionObserver + reduced-motion static

## Nav 3D Icons
- 256×256 透明，顯示 40×40：3D 房子/打開書/日曆/星星/柱狀圖/寶箱；整列 1536×70, padding 7/14, gap 8, button 54h/27r/18/800, Active #FFE65A→#FFC928 / #102E78

## 素材規則
- 相同 Render Style / Camera / Light / Shadow / Saturation / 比例，無白邊/裁切/亂字/watermark，2x Retina，透明背景，否則重生成
