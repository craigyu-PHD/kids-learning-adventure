import type { AppSettings, DayReflection } from './types';

/** Explicit daily exclusions; old attendance must never hide newly added siblings. */
export function dailyExcludedLearners(reflection?: DayReflection): string[] {
  return Array.isArray(reflection?.excludedLearnerIds)
    ? [...new Set(reflection.excludedLearnerIds.filter((id): id is string => typeof id === 'string'))]
    : [];
}

export function dailyParticipantIds(children: AppSettings['children'], reflection?: DayReflection): string[] {
  const excluded = new Set(dailyExcludedLearners(reflection));
  return children.filter(child => !child.disabled && !excluded.has(child.id)).map(child => child.id);
}
