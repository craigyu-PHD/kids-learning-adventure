import { curriculum } from './data/curriculum';
import { addCourseWeekdaysYmd, courseDayAccess } from './dailyChallenge';
import type { TrustedTaipeiDate } from './dailyChallenge';
import type { AnswerEvent, AppSettings, CourseDay, SemesterId } from './types';
export const LEGACY_SEMESTER_ID: SemesterId = 'g1-s1';
export const LEGACY_SEMESTER_START = '2026-08-31';

type SemesterSlot = { id: SemesterId; label: string; grade: number; term: 1 | 2 };
export type PublishedSemester = SemesterSlot & { status: 'published'; defaultStart: string; days: CourseDay[] };
export type SemesterDefinition = PublishedSemester | (SemesterSlot & { status: 'planned' });
type SemesterSettings = Pick<AppSettings, 'semesterStart' | 'selectedSemesterId' | 'semesterStarts'>;
export type ResolvedSemester = PublishedSemester & { startDate: string };

export function validSemesterDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T12:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

/**
 * Publishing a new term requires real content and globally unique IDs.
 * Existing g1-s1 IDs are deliberately never prefixed, cloned or migrated.
 */
export function createSemesterRegistry(definitions: SemesterDefinition[]) {
  const byId = new Map<SemesterId, SemesterDefinition>();
  const ownerByDay = new Map<string, PublishedSemester>();
  const entityIds = new Set<string>();
  const published: PublishedSemester[] = [];
  for (const definition of definitions) {
    if (byId.has(definition.id)) throw new Error(`Duplicate semester: ${definition.id}`);
    if (definition.id !== `g${definition.grade}-s${definition.term}` || definition.grade < 1 || definition.grade > 6) throw new Error('Invalid semester slot');
    byId.set(definition.id, definition);
    if (definition.status !== 'published') continue;
    if (!definition.days.length || !validSemesterDate(definition.defaultStart)) throw new Error(`Published semester needs content and a valid start: ${definition.id}`);
    published.push(definition);
    definition.days.forEach((day, index) => {
      if (day.index !== index + 1 || day.week !== Math.floor(index / 5) + 1 || day.weekday !== index % 5 + 1 || day.blocks.length !== 2) {
        throw new Error(`Invalid ordered learning day: ${day.id}`);
      }
      for (const id of [day.id, ...day.blocks.flatMap(block => [block.id, ...block.missions.map(mission => mission.id)])]) {
        if (!id || entityIds.has(id)) throw new Error(`Duplicate course ID: ${id}`);
        if (definition.id !== LEGACY_SEMESTER_ID && !id.startsWith(`${definition.id}:`)) throw new Error(`New term ID needs namespace: ${id}`);
        entityIds.add(id);
      }
      ownerByDay.set(day.id, definition);
    });
  }
  const legacy = byId.get(LEGACY_SEMESTER_ID);
  if (!legacy || legacy.status !== 'published') throw new Error('The legacy semester must remain published');

  function resolve(settings: SemesterSettings, requestedId = settings.selectedSemesterId): ResolvedSemester {
    const requested = byId.get(requestedId as SemesterId);
    const definition = requested?.status === 'published' ? requested : legacy as PublishedSemester;
    // Legacy clients only know semesterStart. Keep it authoritative for g1-s1,
    // even if they edited it after a newer client wrote a semesterStarts mirror.
    const configured = definition.id === LEGACY_SEMESTER_ID
      ? settings.semesterStart
      : settings.semesterStarts?.[definition.id];
    return { ...definition, startDate: validSemesterDate(configured) ? configured : definition.defaultStart };
  }

  function normalizeSettings(raw: Partial<SemesterSettings> | null | undefined): SemesterSettings {
    const semesterStart = validSemesterDate(raw?.semesterStart) ? raw.semesterStart : LEGACY_SEMESTER_START;
    const semesterStarts: Partial<Record<SemesterId, string>> = {};
    for (const [id, value] of Object.entries(raw?.semesterStarts ?? {})) {
      if (byId.has(id as SemesterId) && validSemesterDate(value)) semesterStarts[id as SemesterId] = value;
    }
    const selected = resolve({ ...raw, semesterStart }).id;
    return { semesterStart, selectedSemesterId: selected, semesterStarts };
  }

  function select<T extends SemesterSettings>(settings: T, id: string): T {
    // Planned/unknown IDs cannot switch the app into an empty curriculum.
    if (byId.get(id as SemesterId)?.status !== 'published') return settings;
    return { ...settings, selectedSemesterId: id as SemesterId };
  }

  function setStart<T extends SemesterSettings>(settings: T, start: string): T {
    if (!validSemesterDate(start)) return settings;
    const selected = resolve(settings);
    return { ...settings,
      ...(selected.id === LEGACY_SEMESTER_ID ? { semesterStart: start } : {}),
      semesterStarts: { ...settings.semesterStarts, [selected.id]: start },
    };
  }

  function resolveRoute(settings: SemesterSettings, dayId: string, explicitSemesterId: string | null) {
    const owner = ownerByDay.get(dayId);
    if (!owner || (explicitSemesterId && explicitSemesterId !== owner.id)) return null;
    const semester = resolve(settings, owner.id);
    return { semester, day: owner.days.find(day => day.id === dayId)! };
  }

  return { definitions, published, allDays: published.flatMap(term => term.days), resolve, normalizeSettings, select, setStart, resolveRoute };
}

const slots: SemesterDefinition[] = Array.from({ length: 12 }, (_, index) => {
  const grade = Math.floor(index / 2) + 1;
  const term = (index % 2 + 1) as 1 | 2;
  const id = `g${grade}-s${term}` as SemesterId;
  const slot = { id, grade, term, label: `國小${['一', '二', '三', '四', '五', '六'][grade - 1]}年級${term === 1 ? '上' : '下'}學期` };
  return id === LEGACY_SEMESTER_ID
    ? { ...slot, status: 'published', defaultStart: LEGACY_SEMESTER_START, days: curriculum }
    : { ...slot, status: 'planned' };
});

export const semesterRegistry = createSemesterRegistry(slots);
export const semesterCatalog = semesterRegistry.definitions;
export const publishedSemesters = semesterRegistry.published;
export const allPublishedCourseDays = semesterRegistry.allDays;
export const resolveSemester = semesterRegistry.resolve;
export const normalizeSemesterSettings = semesterRegistry.normalizeSettings;
export const selectSemester = semesterRegistry.select;
export const setSelectedSemesterStart = semesterRegistry.setStart;
export const resolveSemesterRoute = semesterRegistry.resolveRoute;

export function semesterCourseDate(semester: ResolvedSemester, day: CourseDay) {
  if (!semester.days.includes(day)) throw new Error(`Day is outside selected semester: ${day.id}`);
  return addCourseWeekdaysYmd(semester.startDate, day.index - 1);
}

export function canEarnSemesterDay(semester: ResolvedSemester, day: CourseDay, trustedDate: TrustedTaipeiDate) {
  return trustedDate.verified && semester.days.includes(day)
    && courseDayAccess(semesterCourseDate(semester, day), trustedDate.ymd) === 'today';
}

export function semesterAnswerEvents(semester: ResolvedSemester, events: AnswerEvent[] = []) {
  const blocksByDay = new Map(semester.days.map(day => [day.id, new Set(day.blocks.map(block => block.id))]));
  return events.filter(event => blocksByDay.get(event.dayId)?.has(event.blockId));
}

/** egg-day-N remains byte-identical for g1-s1; new terms inherit their day namespace. */
export function courseEggId(day: CourseDay) {
  return `egg-${day.id}`;
}
