import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export type ThemePointerSurface = 'home' | 'semester' | 'achievements' | 'shop';

const BLOCKED_CONTEXT = '[role="dialog"],input,textarea,select,[contenteditable="true"],button:disabled,[aria-disabled="true"],.v4-quest-shell,.v4-pin-pad,.v4-settings-page';
const THEMES = new Set(['hero', 'mecha', 'racing', 'tank', 'creature']);

/** Native CSS cursors follow the OS pointer; only a short click ornament uses DOM. */
export default function ThemePointer({ surface, enabled = true }: { surface: ThemePointerSurface; enabled?: boolean }) {
  const effectsRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const effects = effectsRef.current;
    if (!effects) return;
    const root = document.documentElement;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const timers = new Map<HTMLElement, number>();
    let cursorActive = false;
    let motionActive = false;

    const removeBurst = (burst: HTMLElement) => {
      const timer = timers.get(burst);
      if (timer !== undefined) window.clearTimeout(timer);
      timers.delete(burst);
      burst.remove();
    };
    const clearBursts = () => {
      for (const burst of timers.keys()) removeBurst(burst);
    };
    const syncEnabled = () => {
      cursorActive = enabled && fine.matches && root.dataset.cursorEffects !== 'false';
      motionActive = cursorActive && !reduced.matches && root.dataset.motionEffects !== 'false';
      root.dataset.themePointer = cursorActive ? 'true' : 'false';
      effects.dataset.enabled = motionActive ? 'true' : 'false';
      if (!motionActive) clearBursts();
    };
    const onDown = (event: PointerEvent) => {
      if (!motionActive || event.button !== 0 || event.pointerType === 'touch') return;
      if (event.target instanceof Element && event.target.closest(BLOCKED_CONTEXT)) return;
      // A fixed maximum keeps rapid clicks bounded without delaying the gesture.
      if (timers.size >= 4) removeBurst(timers.keys().next().value!);
      const burst = document.createElement('span');
      const theme = root.dataset.adventureTheme ?? 'hero';
      burst.className = 'v652-theme-click';
      burst.dataset.theme = THEMES.has(theme) ? theme : 'hero';
      burst.style.left = `${event.clientX}px`;
      burst.style.top = `${event.clientY}px`;
      effects.appendChild(burst);
      burst.addEventListener('animationend', () => removeBurst(burst), { once: true });
      timers.set(burst, window.setTimeout(() => removeBurst(burst), 560));
    };
    const preferences = new MutationObserver(syncEnabled);
    preferences.observe(root, { attributes: true, attributeFilter: ['data-cursor-effects', 'data-motion-effects'] });
    fine.addEventListener('change', syncEnabled);
    reduced.addEventListener('change', syncEnabled);
    window.addEventListener('pointerdown', onDown, { passive: true });
    syncEnabled();
    return () => {
      preferences.disconnect();
      fine.removeEventListener('change', syncEnabled);
      reduced.removeEventListener('change', syncEnabled);
      window.removeEventListener('pointerdown', onDown);
      clearBursts();
      delete root.dataset.themePointer;
    };
  }, [surface, enabled]);

  return typeof document === 'undefined' ? null : createPortal(
    <span ref={effectsRef} className="v652-theme-click-layer" data-surface={surface} data-enabled="false" aria-hidden="true" />,
    document.body,
  );
}
