export class SnapshotConflictError extends Error {}
export class SnapshotValidationError extends Error {}

export function stableEvent(value: Record<string, unknown>) {
  return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))));
}

export function dedupeImmutableEvents(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new SnapshotValidationError(`${field} must be an array`);
  const byId = new Map<string, Record<string, unknown>>();
  for (const raw of value) {
    if (!raw || typeof raw !== 'object' || typeof (raw as Record<string, unknown>).id !== 'string') {
      throw new SnapshotValidationError(`${field} contains an invalid event`);
    }
    const event = raw as Record<string, unknown>;
    const id = String(event.id);
    const existing = byId.get(id);
    if (existing && stableEvent(existing) !== stableEvent(event)) {
      throw new SnapshotConflictError(`${field} contains conflicting immutable event ${id}`);
    }
    byId.set(id, event);
  }
  return Array.from(byId.values());
}

export function sanitizeSnapshot(payload: Record<string, unknown>) {
  const settings = payload.settings && typeof payload.settings === 'object'
    ? { ...(payload.settings as Record<string, unknown>) }
    : {};
  if (settings.cloudSync && typeof settings.cloudSync === 'object') {
    settings.cloudSync = { enabled: true, familyCode: '' };
  }
  const rawProgress = payload.progress && typeof payload.progress === 'object' ? payload.progress as Record<string, unknown> : {};
  const progress = Object.fromEntries(Object.entries(rawProgress).map(([childId, rawChild]) => {
    if (!rawChild || typeof rawChild !== 'object') return [childId, rawChild];
    const child = { ...(rawChild as Record<string, unknown>) };
    if ('rewardTransactions' in child) child.rewardTransactions = dedupeImmutableEvents(child.rewardTransactions, 'rewardTransactions');
    if ('answerEvents' in child) child.answerEvents = dedupeImmutableEvents(child.answerEvents, 'answerEvents');
    if ('purchaseTransactions' in child) child.purchaseTransactions = dedupeImmutableEvents(child.purchaseTransactions, 'purchaseTransactions');
    if ('equipmentTransactions' in child) child.equipmentTransactions = dedupeImmutableEvents(child.equipmentTransactions, 'equipmentTransactions');
    return [childId, child];
  }));
  return { ...payload, settings, progress };
}

export function assertBaseVersion(previous: unknown, baseUpdatedAt?: string | null) {
  if (!baseUpdatedAt || !previous || typeof previous !== 'object') return;
  const updatedAt = (previous as Record<string, unknown>).updatedAt;
  if (typeof updatedAt === 'string' && updatedAt !== baseUpdatedAt) {
    throw new SnapshotConflictError('Cloud state changed since the client last loaded it');
  }
}

export function assertImmutableEventsCompatible(previous: unknown, next: unknown) {
  const previousReset = previous && typeof previous === 'object' ? (previous as Record<string, unknown>).progressResetId ?? '' : '';
  const nextReset = next && typeof next === 'object' ? (next as Record<string, unknown>).progressResetId ?? '' : '';
  if (typeof nextReset !== 'string' || nextReset !== previousReset) {
    throw new SnapshotConflictError('Progress was reset; load the current family state before saving');
  }
  const previousProgress = previous && typeof previous === 'object' && (previous as Record<string, unknown>).progress && typeof (previous as Record<string, unknown>).progress === 'object'
    ? (previous as Record<string, unknown>).progress as Record<string, unknown> : {};
  const nextProgress = next && typeof next === 'object' && (next as Record<string, unknown>).progress && typeof (next as Record<string, unknown>).progress === 'object'
    ? (next as Record<string, unknown>).progress as Record<string, unknown> : {};
  // Iterate the stored events, including learners/fields omitted by a client.
  // An ordinary snapshot save is not an explicit progress deletion command.
  for (const [childId, rawPreviousChild] of Object.entries(previousProgress)) {
    if (!rawPreviousChild || typeof rawPreviousChild !== 'object') continue;
    const rawNextChild = nextProgress[childId];
    const nextChild = rawNextChild && typeof rawNextChild === 'object' ? rawNextChild as Record<string, unknown> : {};
    for (const field of ['rewardTransactions', 'answerEvents', 'purchaseTransactions', 'equipmentTransactions'] as const) {
      const oldEvents = dedupeImmutableEvents((rawPreviousChild as Record<string, unknown>)[field], field) ?? [];
      const nextEvents = dedupeImmutableEvents(nextChild[field], field) ?? [];
      const nextById = new Map(nextEvents.map((event) => [String(event.id), event]));
      for (const old of oldEvents) {
        const nextEvent = nextById.get(String(old.id));
        if (!nextEvent) {
          throw new SnapshotConflictError(`${field} event ${String(old.id)} cannot be removed by a snapshot save`);
        }
        if (stableEvent(old) !== stableEvent(nextEvent)) {
          throw new SnapshotConflictError(`${field} event ${String(old.id)} is immutable`);
        }
      }
    }
  }
}
