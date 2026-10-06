import fs from 'node:fs';
import path from 'node:path';
import {
  SnapshotConflictError,
  assertBaseVersion,
  assertImmutableEventsCompatible,
  dedupeImmutableEvents,
  sanitizeSnapshot,
} from '../api/state-guards';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const tx = { id: 'v4-stage:day-2:block-1:0:child-1', kind: 'stage', sourceId: 'block-1:stage-1', xp: 2, coins: 0, stars: 0, gems: 0, createdAt: '2026-08-27T00:00:00.000Z' };
const duplicate = dedupeImmutableEvents([tx, { ...tx }], 'rewardTransactions') ?? [];
assert(duplicate.length === 1, 'identical transaction ids must dedupe');

let duplicateConflict = false;
try {
  dedupeImmutableEvents([tx, { ...tx, xp: 999 }], 'rewardTransactions');
} catch (error) {
  duplicateConflict = error instanceof SnapshotConflictError;
}
assert(duplicateConflict, 'conflicting duplicate transaction id must be rejected');

const previous = {
  updatedAt: '2026-08-27T00:00:00.000Z',
  progress: { 'child-1': { rewardTransactions: [tx], answerEvents: [{ id: 'answer-1', target: 'dog', answer: 'cat', correct: false }] } },
};
const compatible = {
  progress: { 'child-1': { rewardTransactions: [{ ...tx }], answerEvents: [{ id: 'answer-1', target: 'dog', answer: 'cat', correct: false }] } },
};
assertImmutableEventsCompatible(previous, compatible);

let immutableConflict = false;
try {
  assertImmutableEventsCompatible(previous, { progress: { 'child-1': { rewardTransactions: [{ ...tx, coins: 500 }] } } });
} catch (error) {
  immutableConflict = error instanceof SnapshotConflictError;
}
assert(immutableConflict, 'existing immutable transaction cannot change value');

const ledgerFields = ['answerEvents', 'rewardTransactions', 'purchaseTransactions', 'equipmentTransactions'] as const;
const allLedgers = Object.fromEntries(ledgerFields.map(field => [field, [{ id: `${field}-stored`, value: 1 }]]));
for (const field of ledgerFields) {
  const omitted = { ...allLedgers };
  delete omitted[field];
  let rejected = false;
  try { assertImmutableEventsCompatible({ progress: { 'child-1': allLedgers } }, { progress: { 'child-1': omitted } }); }
  catch (error) { rejected = error instanceof SnapshotConflictError; }
  assert(rejected, `${field} must not disappear when its field is omitted`);
}
let learnerOmissionRejected = false;
try { assertImmutableEventsCompatible({ progress: { 'child-1': allLedgers } }, { progress: {} }); }
catch (error) { learnerOmissionRejected = error instanceof SnapshotConflictError; }
assert(learnerOmissionRejected, 'omitting an entire learner must not delete their events');

assertBaseVersion(previous, previous.updatedAt);
let baseConflict = false;
try {
  assertBaseVersion(previous, '2026-08-26T23:59:00.000Z');
} catch (error) {
  baseConflict = error instanceof SnapshotConflictError;
}
assert(baseConflict, 'stale client base version must be rejected');

const sanitized = sanitizeSnapshot({
  version: 2,
  settings: { cloudSync: { enabled: true, familyCode: 'should-not-leak' } },
  progress: { 'child-1': { rewardTransactions: [tx, { ...tx }] } },
});
const settings = sanitized.settings as { cloudSync?: { familyCode?: string } };
const progress = sanitized.progress as Record<string, { rewardTransactions?: unknown[] }>;
assert(settings.cloudSync?.familyCode === '', 'familyCode must be sanitized');
assert(progress['child-1'].rewardTransactions?.length === 1, 'sanitized snapshot must dedupe immutable events');

const result = {
  status: 'PASS',
  identicalTransactionDedupe: true,
  conflictingTransactionRejected: true,
  immutableRemoteEventProtected: true,
  allFourOmittedLedgersRejected: true,
  omittedLearnerRejected: true,
  staleBaseRejected: true,
  familyCodeSanitized: true,
};
const qaDir = path.resolve(process.env.LITTLE_EXPLORERS_QA_OUTPUT_DIR ?? path.resolve(import.meta.dirname, '..', '.qa'));
fs.mkdirSync(qaDir, { recursive: true });
fs.writeFileSync(path.join(qaDir, 'v40_state_guard_result.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
