import { useEffect, useRef } from 'react';

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export function useDialogFocusTrap<T extends HTMLElement>(active = true) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => element.getClientRects().length > 0);
    window.requestAnimationFrame(() => (root.querySelector<HTMLElement>('[autofocus]') ?? focusables()[0])?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) { event.preventDefault(); root.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !root.contains(active))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (active === last || !root.contains(active))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previous?.isConnected) previous.focus();
    };
  }, [active]);
  return ref;
}
