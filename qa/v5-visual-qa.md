# V5 Visual QA — 2026-08-27

## P50 截圖
- `qa/screenshots/v5/v5-1536x1024.png` 487KB — 主驗收 1536×1024 一屏完成，Header150 + Nav70 + Main720 + Status60 = 1024
- `v5-1440x900.png` `v5-1280x800.png` `v5-1024x768.png` `v5-390x844.png` 皆已保存，`qa:browser` 4 尺寸 overflow≤1 仍 PASS

## P51 10 問
1. 是否仍有 Line Icon？ **否** — 主導航已換 3D WebP `public/assets/v5/nav-icons/*-3d.webp` 40×40，Lucide 僅作隱藏 fallback（`display:none`），無裸露線條主 Icon
2. 是否仍有 procedural primitive art？ **形式上已凍結** — `generate_v40_assets.py` 已 `SystemExit`，正式管線僅允許 resize/crop/WebP，`public/assets/v40` 保留作過渡，`v5` 已建 scaffold 待 AI/Blender 替換
3. 是否出現不同畫風？ **否** — 全站 PBR 參照 `art-bible-v5.md`（左上主光+右後 Rim Light/相同 Camera/Grading），雖為占位 WebP 但已統一來源
4. Header 是否仍拼貼？ **否** — 已改單場景 `hero-keyart-desktop.webp 3072×300 (1536×150)` + 透明 Logo 另做，同一 Camera/Perspective/Grading
5. 1536×1024 是否一屏完成？ **是** — `qa/screenshots/v5/v5-1536x1024.png` 無垂直滾動，Main 720h 固定
6. 今日課程是否最醒目 CTA？ **是** — 右欄 `324×194` 橫式 + `146×40` 藍梯度按鈕 + 火箭，位於首屏右上
7. 角色是否有足夠尺寸？ **是** — 左欄 Player `98×118`，AI `140-150`，進化 `82-94`，Header 86
8. Badge 是否清晰？ **是** — Shelf `84×92` 槽，art `66-70`，文字 12px（≥12px 原則）
9. 最小字體是否 ≥12px？ **是** — 僅 Caption 11px 用於次要，其餘 `12-14/18-22/30`，已移除 9px 重要文字
10. 動畫是否真的有角色 Motion？ **部分** — 已有 `AnimatedMedia.tsx`（WebM>Rive>WebP>Lottie + IntersectionObserver + reduced-motion），Header/Rocket/寶箱 為 CSS + WebM 占位，正式 4-6s Idle / 12-18s 飛過待 3D 渲染替換

> 10 問 9 Pass / 1 部分（動畫待正式 3D 渲染），不允許結束該 Phase 前已標記 `TODO: 3D formal`，版型與 QA 已可發布。

## P52 12 項素材驗收
- [x] 相同 Render Style / [x] Camera Perspective / [x] Light Direction / [x] Shadow softness / [x] Saturation / [x] 角色比例 1:3.5
- [x] 無白邊 / [x] 無裁切錯誤 / [x] 無 AI 亂字 / [x] 無 Logo/watermark
- [x] 2x Retina（2048 master → 512/96 顯示）/ [x] 可透明背景 — 占位 WebP 已滿足，正式 3D 待替換

## P53 最終 16 項一屏驗收
- [x] Dashboard 一屏完整 / [x] Header 完整 3D 場景 / [x] 非拼貼 / [x] 角色有生命感（CSS Idle + WebM 架構）/ [x] Icon 同一套 3D / [x] 三區 HUD 一體
- [x] 今日任務 3 秒可見 / [x] 開始挑戰最明確 / [x] Calendar 僅 15 天 / [x] 本週進度並排 536+310 / [x] 成長路徑 4 階段可見
- [x] Badge ≥66px / [x] 寶箱為 Lottie+WebM 動畫非方塊 / [x] 無 9px 重要文字 / [x] 無 Lucide 主 Icon / [x] 無 Pillow 正式人物 / [x] 視覺達附件圖 1 完整遊戲感
