import fs from 'node:fs';
import path from 'node:path';
import {
  courseDayAccess,
  msUntilNextTaipeiMidnight,
  taipeiYmd,
} from '../src/dailyChallenge';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

// 2026-08-27 23:59:59.500 Asia/Taipei = 2026-08-27T15:59:59.500Z.
const beforeMidnight = '2026-08-27T15:59:59.500Z';
const delay = msUntilNextTaipeiMidnight(beforeMidnight);
assert(delay >= 700 && delay <= 900, `midnight timer expected ~750ms, got ${delay}`);

// 00:00:00 in Taipei must already resolve to the new active date.
const afterMidnight = new Date('2026-08-27T16:00:00.000Z');
assert(taipeiYmd(afterMidnight) === '2026-08-28', 'Taipei date must roll to 2026-08-28 at exact midnight');
assert(courseDayAccess('2026-08-27', '2026-08-28') === 'past', 'yesterday must become past');
assert(courseDayAccess('2026-08-28', '2026-08-28') === 'today', 'new day must become today');
assert(courseDayAccess('2026-08-29', '2026-08-28') === 'future', 'tomorrow must stay future');

const result = {
  status: 'PASS',
  simulatedTaipeiTime: '2026-08-27 23:59:59.500 → 2026-08-28 00:00:00.000',
  scheduledDelayMs: delay,
  yesterdayLocks: true,
  newDayUnlocks: true,
  futureStaysLocked: true,
};
const qaDir = path.resolve(import.meta.dirname, '..', '.qa');
fs.mkdirSync(qaDir, { recursive: true });
fs.writeFileSync(path.join(qaDir, 'v40_date_engine_result.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
