export const AVATAR_CANVAS_WIDTH = 1024;
export const AVATAR_CANVAS_HEIGHT = 1536;
export const AVATAR_SUPPORTED_TOP_PADDING = 256;

export type AvatarRigFrame = {
  sceneLeft: number;
  sceneTop: number;
  sceneWidth: number;
  sceneHeight: number;
  bodyLeft: number;
  bodyTop: number;
  bodyWidth: number;
  bodyHeight: number;
  scale: number;
};

export function isSupportedAvatarCanvasTopPadding(value: unknown): value is 0 | 256 {
  return value === 0 || value === AVATAR_SUPPORTED_TOP_PADDING;
}

/** One contain transform for the original body canvas and an opt-in taller detail. */
export function computeAvatarRigFrame(width: number, height: number, canvasTopPadding: number): AvatarRigFrame | undefined {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0
    || !isSupportedAvatarCanvasTopPadding(canvasTopPadding)) return undefined;
  const extendedHeight = AVATAR_CANVAS_HEIGHT + canvasTopPadding;
  const scale = Math.min(width / AVATAR_CANVAS_WIDTH, height / extendedHeight);
  const sceneWidth = AVATAR_CANVAS_WIDTH * scale;
  const sceneHeight = extendedHeight * scale;
  const sceneLeft = (width - sceneWidth) / 2;
  const sceneTop = (height - sceneHeight) / 2;
  return {
    sceneLeft,
    sceneTop,
    sceneWidth,
    sceneHeight,
    bodyLeft: sceneLeft,
    bodyTop: sceneTop + canvasTopPadding * scale,
    bodyWidth: sceneWidth,
    bodyHeight: AVATAR_CANVAS_HEIGHT * scale,
    scale,
  };
}
