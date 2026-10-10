import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

/** Apply each lesson edit to the latest stored value inside the family lock. */
export function useSharedLessonStorage<T extends object>(
  familyId: string, key: string, initialValue: () => T,
  lock: (familyId: string, task: () => void) => Promise<void>,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(initialValue);
  const currentRef = useRef(value);
  const mounted = useRef(true);
  const pending = useRef<{ action: SetStateAction<T> }[]>([]);
  const apply = (action: SetStateAction<T>, current: T): T => typeof action === 'function' ? action(current) : action;
  const replay = useCallback((current: T) => pending.current.reduce((next, entry) => apply(entry.action, next), current), []);
  const read = useCallback(() => {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as T;
    } catch { /* Keep valid in-memory data when an external write is malformed. */ }
    return currentRef.current;
  }, [key]);
  const update = useCallback<Dispatch<SetStateAction<T>>>((action) => {
    const entry = { action };
    pending.current.push(entry);
    // Immediate checkbox feedback; pending edits are replayed over incoming values.
    setValue(replay(read()));
    void lock(familyId, () => {
      if (!mounted.current) return;
      const current = read();
      const next = apply(action, current);
      const serialized = JSON.stringify(next);
      if (localStorage.getItem(key) !== serialized) localStorage.setItem(key, serialized);
      currentRef.current = next;
      pending.current = pending.current.filter(item => item !== entry);
      setValue(replay(next));
    });
  }, [familyId, key, lock, read, replay]);
  useEffect(() => {
    mounted.current = true;
    update(current => current);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key || !event.newValue) return;
      // Events can arrive after newer writes. Always read the latest stored value.
      const next = read();
      currentRef.current = next;
      setValue(replay(next));
    };
    window.addEventListener('storage', onStorage);
    return () => {
      mounted.current = false;
      window.removeEventListener('storage', onStorage);
    };
  }, [key, read, update, replay]);
  return [value, update];
}
