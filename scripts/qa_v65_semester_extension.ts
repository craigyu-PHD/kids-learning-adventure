import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { curriculum } from '../src/data/curriculum';
import {
  semesterCatalog, publishedSemesters, allPublishedCourseDays, createSemesterRegistry,
  normalizeSemesterSettings, resolveSemester, selectSemester, setSelectedSemesterStart,
  semesterCourseDate, canEarnSemesterDay, semesterAnswerEvents, courseEggId, resolveSemesterRoute,
} from '../src/semesters';
import type { PublishedSemester, SemesterDefinition } from '../src/semesters';
import type { AnswerEvent, AppSettings, CloudSnapshot, CourseDay } from '../src/types';
import { addCourseWeekdaysYmd, courseDayAccess, taipeiYmd } from '../src/dailyChallenge';
import { calculateRewards, normalizeProgress } from '../src/rewards';
import { mergeProgressMaps } from '../src/stateMerge';
import { sanitizeSnapshot, assertImmutableEventsCompatible } from '../api/state-guards';

const OUT = path.resolve('qa/v65/semester-extension');
fs.mkdirSync(OUT, { recursive: true });
const rows: Array<{ name: string; pass: boolean; detail?: string }> = [];
function test(name: string, run: () => void) {
  try { run(); rows.push({ name, pass: true }); }
  catch (error) { rows.push({ name, pass: false, detail: String(error) }); }
}
const legacy: AppSettings = {
  theme: 'light', visualTheme: 'hero', semesterStart: '2026-09-07',
  children: [{ id: 'child-1', name: '哥哥', avatar: 'brother' }], users: [],
  cloudSync: { enabled: false, familyCode: '' },
};
const initial = JSON.stringify(curriculum);
const current = resolveSemester(legacy);
const event = (id: string, day: CourseDay): AnswerEvent => ({
  id, dayId: day.id, blockId: day.blocks[0].id, stage: 5,
  target: id, answer: id, correct: true, createdAt: '2026-09-07T04:00:00.000Z',
});
// Test-only cloned content never enters the production catalog or repository curriculum.
const futureDays: CourseDay[] = curriculum.slice(0, 5).map(day => ({
  ...day, id: `g1-s2:${day.id}`,
  blocks: day.blocks.map(block => ({
    ...block, id: `g1-s2:${block.id}`,
    missions: block.missions.map(mission => ({ ...mission, id: `g1-s2:${mission.id}` })),
  })) as CourseDay['blocks'],
}));
const future: PublishedSemester = {
  id: 'g1-s2', grade: 1, term: 2, label: 'TEST ONLY', status: 'published',
  defaultStart: '2027-02-08', days: futureDays,
};
const definitions = semesterCatalog.map(term => term.id === future.id ? future : term);
const extended = createSemesterRegistry(definitions);

test('legacy curriculum objects and all IDs preserved without content mutation', () => {
  assert.equal(current.days, curriculum);
  assert.deepEqual(current.days.map(day => day.id), Array.from({ length: 90 }, (_, i) => `day-${i + 1}`));
  assert.equal(current.days[0].blocks[0].id, 'w1d1b1');
  assert.equal(allPublishedCourseDays.length, 90);
  assert.equal(JSON.stringify(curriculum), initial);
});
test('12 unique slots, only one real nonempty published choice', () => {
  assert.equal(semesterCatalog.length, 12);
  assert.equal(new Set(semesterCatalog.map(term => term.id)).size, 12);
  assert.deepEqual(publishedSemesters.map(term => term.id), ['g1-s1']);
  assert.equal(semesterCatalog.filter(term => term.status === 'planned').length, 11);
  assert(semesterCatalog.filter(term => term.status === 'planned').every(term => !('days' in term)));
});
test('legacy custom start and all 90 scheduled dates remain identical', () => {
  assert.equal(current.startDate, legacy.semesterStart);
  for (const day of curriculum) assert.equal(semesterCourseDate(current, day), addCourseWeekdaysYmd(legacy.semesterStart, day.index - 1));
  assert.equal(resolveSemester({ ...legacy, semesterStarts: { 'g1-s1': '2030-01-01' } }).startDate, legacy.semesterStart);
});
test('planned and unknown selection cannot expose an empty curriculum', () => {
  assert.equal(selectSemester(legacy, 'g1-s2'), legacy);
  assert.equal(selectSemester(legacy, 'unknown'), legacy);
  assert.equal(resolveSemester({ ...legacy, selectedSemesterId: 'g6-s2' }).id, 'g1-s1');
  assert.equal(normalizeSemesterSettings({ ...legacy, selectedSemesterId: 'g1-s2' }).selectedSemesterId, 'g1-s1');
});
test('invalid dates are rejected, leap dates accepted, future per-term starts retained', () => {
  assert.equal(setSelectedSemesterStart(legacy, '2027-02-29'), legacy);
  assert.equal(setSelectedSemesterStart(legacy, ''), legacy);
  assert.equal(setSelectedSemesterStart(legacy, '2028-02-29').semesterStart, '2028-02-29');
  assert.equal(normalizeSemesterSettings(null).semesterStart, '2026-08-31');
  const normalized = normalizeSemesterSettings({ ...legacy, semesterStarts: { 'g1-s2': '2027-02-08', 'g6-s2': 'not-a-date' } });
  assert.deepEqual(normalized.semesterStarts, { 'g1-s2': '2027-02-08' });
});
test('trusted-date reward guard remains today-only and rejects another term', () => {
  const trusted = { ymd: '2026-09-07', verified: true, source: 'server' as const };
  assert(canEarnSemesterDay(current, curriculum[0], trusted));
  assert(!canEarnSemesterDay(current, curriculum[0], { ...trusted, verified: false }));
  assert(!canEarnSemesterDay(current, curriculum[1], trusted));
  assert(!canEarnSemesterDay(current, curriculum[0], { ...trusted, ymd: '2026-09-08' }));
  assert(!canEarnSemesterDay(current, futureDays[0], trusted));
  const midnight = taipeiYmd(new Date('2026-09-07T16:00:00Z'));
  assert.equal(courseDayAccess(semesterCourseDate(current, curriculum[0]), midnight), 'past');
  assert.equal(courseDayAccess(semesterCourseDate(current, curriculum[1]), midnight), 'today');
});
test('future publication resolves its own schedule without changing g1-s1 or cloning runtime state', () => {
  const selected = extended.select(legacy, 'g1-s2');
  assert.equal(selected.semesterStart, legacy.semesterStart);
  assert.equal(extended.resolve(selected).days, futureDays);
  const changed = extended.setStart(selected, '2027-02-15');
  assert.equal(extended.resolve(changed).startDate, '2027-02-15');
  assert.equal(extended.resolve(extended.select(changed, 'g1-s1')).startDate, legacy.semesterStart);
  assert.equal(extended.allDays.length, 95);
});
test('old deep links resolve g1-s1 even when another published term is selected', () => {
  const settings = extended.select(legacy, 'g1-s2');
  assert.equal(extended.resolveRoute(settings, 'day-1', null)?.semester.id, 'g1-s1');
  assert.equal(extended.resolveRoute(settings, 'g1-s2:day-1', null)?.semester.id, 'g1-s2');
  assert.equal(extended.resolveRoute(settings, 'day-1', 'g1-s2'), null);
  assert.equal(resolveSemesterRoute(legacy, 'g1-s2:day-1', null), null);
});
test('report event isolation uses the day/block pair and retains all stored telemetry', () => {
  const events = [event('old', curriculum[0]), event('future', futureDays[0]), { ...event('wrong-pair', curriculum[0]), blockId: futureDays[0].blocks[0].id }];
  assert.deepEqual(semesterAnswerEvents(current, events).map(e => e.id), ['old']);
  assert.deepEqual(semesterAnswerEvents(extended.resolve(extended.select(legacy, 'g1-s2')), events).map(e => e.id), ['future']);
  assert.equal(events.length, 3);
});
test('future treasure IDs do not collide; legacy egg IDs are byte-identical', () => {
  assert.equal(courseEggId(curriculum[6]), 'egg-day-7');
  assert.equal(courseEggId(futureDays[0]), 'egg-g1-s2:day-1');
  assert.notEqual(courseEggId(futureDays[0]), courseEggId(curriculum[0]));
});
test('empty publication, reused IDs and missing namespaces are rejected', () => {
  const replaceFuture = (value: PublishedSemester): SemesterDefinition[] => definitions.map(term => term.id === future.id ? value : term);
  assert.throws(() => createSemesterRegistry(replaceFuture({ ...future, days: [] })), /needs content/);
  assert.throws(() => createSemesterRegistry(replaceFuture({ ...future, days: curriculum.slice(0, 5) })), /Duplicate|namespace/);
  const duplicate = structuredClone(futureDays);
  duplicate[1].blocks[0].missions[0].id = duplicate[0].blocks[0].missions[0].id;
  assert.throws(() => createSemesterRegistry(replaceFuture({ ...future, days: duplicate })), /Duplicate/);
});
test('snapshot v2, immutable ledgers, learner isolation and cumulative rewards survive settings roundtrip', () => {
  const progress = normalizeProgress({
    completedDays: ['day-1'], completedBlocks: [curriculum[0].blocks[0].id],
    completedMissions: [curriculum[0].blocks[0].missions[0].id], claimedEggs: ['egg-day-7'],
    rewardTransactions: [{ id: 'history', kind: 'bonus', sourceId: 'day-1', xp: 50, coins: 30, stars: 1, gems: 1, createdAt: '2026-09-07T00:00:00Z' }],
    purchaseTransactions: [{ id: 'buy', childId: 'child-1', itemId: 'story-headphones', cost: 5, source: 'purchase', createdAt: '2026-09-07T00:00:00Z' }],
    equipmentTransactions: [{ id: 'equip', childId: 'child-1', itemId: 'story-headphones', slot: 'earwear', action: 'equip', createdAt: '2026-09-07T00:00:01Z' }],
    answerEvents: [event('old-answer', curriculum[0])],
  });
  const before: CloudSnapshot = { version: 2, updatedAt: '2026-09-07T00:00:00Z', settings: legacy, progress: { 'child-1': progress, 'child-2': normalizeProgress({}) }, attendance: { 'day-1': ['child-1'] }, reflections: { 'day-1': { engagement: 'great', note: 'keep', viewing: {} } } };
  const next = sanitizeSnapshot(JSON.parse(JSON.stringify({ ...before, settings: extended.setStart(extended.select(legacy, 'g1-s2'), '2027-02-15') }))) as unknown as CloudSnapshot;
  assert.equal(next.version, 2);
  assertImmutableEventsCompatible(before, next);
  assert.deepEqual(next.progress, before.progress);
  assert.deepEqual(next.attendance, before.attendance);
  assert.deepEqual(next.reflections, before.reflections);
  assert.deepEqual(calculateRewards(next.progress['child-1']), calculateRewards(progress));
  assert.equal(calculateRewards(next.progress['child-2']).xp, 0);
  assert.deepEqual(mergeProgressMaps(before.progress, next.progress), before.progress);
  assert.equal(extended.resolve(next.settings).startDate, '2027-02-15');
});
const result = { status: rows.every(row => row.pass) ? 'PASS' : 'FAIL', testCount: rows.length, rows, futureContentIsTestOnly: true };
fs.writeFileSync(path.join(OUT, 'compatibility.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'PASS') process.exitCode = 1;
