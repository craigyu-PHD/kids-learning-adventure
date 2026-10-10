export type ShopActionLockOptions = {
  signal?: AbortSignal;
  /** Maximum time waiting to acquire the lock; acquired work is not timed out. */
  waitMs?: number;
};

/** Cancel queued shop actions without leaving a mutation that can run later. */
export async function withShopActionLock<T>(
  familyId: string,
  task: () => Promise<T> | T,
  { signal, waitMs = 5000 }: ShopActionLockOptions = {},
): Promise<T> {
  signal?.throwIfAborted();
  if (!Number.isFinite(waitMs) || waitMs < 0) throw new RangeError('Invalid shop lock wait duration');
  if (typeof navigator === 'undefined' || !navigator.locks) return task();

  const controller = new AbortController();
  const onAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(
    new DOMException('Family progress lock wait timed out', 'TimeoutError'),
  ), waitMs);
  const clearAdmission = () => {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  };

  try {
    return await navigator.locks.request(
      `little-explorers:progress:${familyId}`,
      { signal: controller.signal },
      () => {
        clearAdmission();
        controller.signal.throwIfAborted();
        return task();
      },
    );
  } finally {
    clearAdmission();
  }
}
