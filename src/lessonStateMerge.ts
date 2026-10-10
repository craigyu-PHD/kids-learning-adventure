import { dailyExcludedLearners } from './dailyParticipants';
import type { AttendanceMap, DayReflection, ReflectionMap } from './types';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Remote values win unless this device edited that key during the read. */
function changedKeys<T>(base: Record<string, T>, local: Record<string, T>, remote: Record<string, T>) {
  const result = { ...remote };
  for (const key of new Set([...Object.keys(base), ...Object.keys(local)])) {
    if (same(base[key], local[key])) continue;
    if (Object.hasOwn(local, key)) result[key] = local[key];
    else delete result[key];
  }
  return result;
}

export function mergeLoadedAttendance(base: AttendanceMap, local: AttendanceMap, remote: AttendanceMap): AttendanceMap {
  const result = { ...remote };
  for (const day of new Set([...Object.keys(base), ...Object.keys(local)])) {
    if (same(base[day], local[day])) continue;
    if (!Object.hasOwn(local, day)) { delete result[day]; continue; }
    const previous = new Set(base[day] ?? []);
    const current = new Set(local[day] ?? []);
    const merged = new Set(remote[day] ?? []);
    for (const id of new Set([...previous, ...current])) {
      if (previous.has(id) === current.has(id)) continue;
      if (current.has(id)) merged.add(id); else merged.delete(id);
    }
    result[day] = [...merged];
  }
  return result;
}

export function mergeLoadedReflections(base: ReflectionMap, local: ReflectionMap, remote: ReflectionMap): ReflectionMap {
  const result = { ...remote };
  for (const dayId of Object.keys(local)) {
    const before = base[dayId];
    const current = local[dayId];
    const incoming = remote[dayId];
    // Keep completed checkpoints even when they came from an offline cache.
    const next: DayReflection = {
      engagement: same(before?.engagement ?? '', current.engagement ?? '') ? incoming?.engagement ?? '' : current.engagement ?? '',
      note: same(before?.note ?? '', current.note ?? '') ? incoming?.note ?? '' : current.note ?? '',
      viewing: changedKeys(before?.viewing ?? {}, current.viewing ?? {}, incoming?.viewing ?? {}),
    };
    if (current.excludedLearnerIds || incoming?.excludedLearnerIds || before?.excludedLearnerIds) {
      const previousExcluded = new Set(dailyExcludedLearners(before));
      const localExcluded = new Set(dailyExcludedLearners(current));
      const excluded = new Set(dailyExcludedLearners(incoming));
      for (const id of new Set([...previousExcluded, ...localExcluded])) {
        if (previousExcluded.has(id) === localExcluded.has(id)) continue;
        if (localExcluded.has(id)) excluded.add(id);
        else excluded.delete(id);
      }
      next.excludedLearnerIds = [...excluded].sort();
    }
    if (current.lessonStages || incoming?.lessonStages) {
      next.lessonStages = { ...incoming?.lessonStages };
      for (const [blockId, stages] of Object.entries(current.lessonStages ?? {})) {
        next.lessonStages[blockId] = [...new Set([...(next.lessonStages[blockId] ?? []), ...stages])].sort((a, b) => a - b);
      }
    }
    if (current.dailyChallenge || incoming?.dailyChallenge) {
      next.dailyChallenge = {
        warmup: Boolean(current.dailyChallenge?.warmup || incoming?.dailyChallenge?.warmup),
        learn: Boolean(current.dailyChallenge?.learn || incoming?.dailyChallenge?.learn),
      };
    }
    if (incoming || !same(before, current) || next.lessonStages || next.dailyChallenge || next.excludedLearnerIds) result[dayId] = next;
  }
  return result;
}
