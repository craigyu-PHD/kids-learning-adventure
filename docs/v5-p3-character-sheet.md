# P3 — Master Character Sheet (V5)

> Pillow primitive 已凍結，正式角色必須以 3D/AI Reference 流程產生，落 `public/assets/v5/characters/*`。

## 规格
- 输出：2048×2048 透明 WebP lossless / PNG master，显示 82–94px / 98×118px
- 角度：正面 / 左45 / 右45 / 侧面 / 背面
- 表情：微笑 / 大笑 / 惊喜 / 思考 / 庆祝
- 材质：PBR 塑料/布料/金属，左上主光 + 右后蓝 Rim Light，相同 Camera/Perspective/Grading

## 角色 ID（永久一致）
- 哥哥 `brother`：V40 `nova` 演进，脸型/眼睛/肤色固定，发型棕短，服裝随 Lv 变化
- 弟弟 `younger`：V40 `rex` 演进，黄帽/绿衣，脸型固定
- Robot `robot`：V40 `avatar-robot` 演进，白蓝金属，眼睛发光

## 进化映射
- 哥哥: Lv.1 学习新手 → Lv.5 星际勇者 → Lv.10 超级英雄 → Lv.15 传奇英雄
- 弟弟: Lv.1 小探险家 → Lv.5 小勇士 → Lv.10 星际骑士 → Lv.15 宇宙英雄
- 每阶段改 服装/肩甲/鞋子/背包/胸徽/特效/姿势，脸不变

## V5.1 實作狀態
- 正式 Master Sheet 已由 ChatGPT Image 參考角色正面重製，另以 macOS Vision 做前景遮罩；不再以 V40 角色檔冒充 V5 Master。
- 每個角色保留 2048×2048 transparent WebP 與 lossless PNG，並拆出 1024×1024 角度／表情檔。
- Idle 是實際 VP9 WebM 影格與透明通道，但屬 2.5D 關鍵幀動畫，不宣稱為 Blender 骨架動畫。
- 正式驗收仍需滿足：相同 Render Style/Camera/Light/Shadow/Saturation/比例，無白邊、裁切、亂字。

## 任务清单
- [x] Brother Master Sheet 5角度×5表情
- [x] Younger Master Sheet 5角度×5表情
- [x] Robot Master Sheet 5角度×3表情
- [x] WebM Idle (512/24fps/4s) 2.5D 呼吸／眨眼／揮手／漂浮
- [x] V5 可見 runtime source 的 V40 依賴歸零
