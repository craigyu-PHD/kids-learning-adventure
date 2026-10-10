import { useEffect, useState, type RefObject } from 'react';

/** One brief, decoded full-frame greeting; safe for reduced motion and missing assets. */
export function useReviewedImageBlink(ref: RefObject<HTMLImageElement | null>, base: string | undefined, candidate: string | undefined, mountKey = base) {
  const [failed, setFailed] = useState<string>();
  const [prepared, setPrepared] = useState<string>();
  const [closed, setClosed] = useState<{ base: string; candidate: string; mountKey: string | undefined }>();
  const showingBlink = !!base && !!candidate && failed !== candidate && closed?.base === base
    && closed.candidate === candidate && closed.mountKey === mountKey;

  useEffect(() => {
    const element = ref.current;
    if (!element || !base || !candidate || failed === candidate) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    let ready = false;
    let started = false;
    let disposed = false;
    let probe: HTMLImageElement | undefined;
    let timer: number | undefined;
    const cancel = () => {
      window.clearTimeout(timer);
      setClosed(undefined);
    };
    const canPlay = () => visible && !motion.matches && document.documentElement.dataset.motionEffects !== 'false' && document.visibilityState === 'visible';
    const update = () => {
      if (!canPlay()) { cancel(); return; }
      // Loading the closed frame must not immediately reopen it.
      if (started) return;
      cancel();
      if (!probe) {
        probe = new Image();
        probe.fetchPriority = 'low';
        probe.onload = async () => {
          try {
            await probe!.decode();
            if (!disposed) { ready = true; setPrepared(candidate); update(); }
          } catch { if (!disposed) setFailed(candidate); }
        };
        probe.onerror = () => { if (!disposed) setFailed(candidate); };
        probe.src = candidate;
      }
      if (!ready || !element.complete || !element.naturalWidth) return;
      timer = window.setTimeout(() => {
        if (!canPlay()) return;
        started = true;
        setClosed({ base, candidate, mountKey });
        timer = window.setTimeout(() => setClosed(undefined), 110);
      }, 1100);
    };
    const observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      update();
    });
    observer.observe(element);
    element.addEventListener('load', update);
    motion.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      observer.disconnect();
      element.removeEventListener('load', update);
      motion.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
      if (probe) { probe.onload = null; probe.onerror = null; }
    };
  }, [base, candidate, failed, ref, mountKey]);

  return {
    src: showingBlink ? candidate : base,
    frame: prepared === candidate && failed !== candidate ? candidate : undefined,
    disableFrame: () => { if (candidate) setFailed(candidate); setClosed(undefined); },
    decoding: candidate ? 'sync' as const : 'async' as const,
    /** A failed optional frame keeps the real open-eye image on screen. */
    recoverBlink: () => {
      if (!showingBlink || !candidate) return false;
      setFailed(candidate);
      setClosed(undefined);
      return true;
    },
  };
}
