import { useLayoutEffect, useState, type RefObject } from 'react';
import { computeAvatarRigFrame, type AvatarRigFrame } from './avatarCanvasGeometry';

type FrameState = { padding: number; frame?: AvatarRigFrame };

export function readAvatarLayoutBox(element: Pick<HTMLElement, 'clientWidth' | 'clientHeight'>, style?: Pick<CSSStyleDeclaration, 'width' | 'height' | 'boxSizing' | 'paddingLeft' | 'paddingRight' | 'paddingTop' | 'paddingBottom' | 'borderLeftWidth' | 'borderRightWidth' | 'borderTopWidth' | 'borderBottomWidth'>) {
  if (style) {
    const px = (value: string) => Number.parseFloat(value) || 0;
    const borderBox = style.boxSizing === 'border-box';
    const width = Number.parseFloat(style.width) + (borderBox
      ? -px(style.borderLeftWidth) - px(style.borderRightWidth)
      : px(style.paddingLeft) + px(style.paddingRight));
    const height = Number.parseFloat(style.height) + (borderBox
      ? -px(style.borderTopWidth) - px(style.borderBottomWidth)
      : px(style.paddingTop) + px(style.paddingBottom));
    if (Number.isFinite(width) && Number.isFinite(height)) return { width, height };
  }
  return { width: element.clientWidth, height: element.clientHeight };
}

/** Observe geometry only for an active extended-canvas detail. */
export function useAvatarRigFrame(ref: RefObject<HTMLElement | null>, canvasTopPadding: number) {
  const [state, setState] = useState<FrameState>({ padding: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (canvasTopPadding <= 0 || !element || typeof ResizeObserver === 'undefined') {
      setState(current => current.padding === canvasTopPadding && !current.frame
        ? current : { padding: canvasTopPadding });
      return;
    }
    const update = () => {
      // Preserve fractional layout-space CSS pixels: clientHeight rounds them.
      // A screen-space rect would instead apply ancestor transforms twice.
      const bounds = readAvatarLayoutBox(element, getComputedStyle(element));
      const frame = computeAvatarRigFrame(bounds.width, bounds.height, canvasTopPadding);
      setState(current => {
        if (current.padding === canvasTopPadding && current.frame && frame
          && Object.keys(frame).every(key => current.frame?.[key as keyof AvatarRigFrame] === frame[key as keyof AvatarRigFrame])) return current;
        return { padding: canvasTopPadding, frame };
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [canvasTopPadding, ref]);
  return state.padding === canvasTopPadding ? state.frame : undefined;
}
