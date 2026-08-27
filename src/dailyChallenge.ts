export const TAIPEI_TIME_ZONE = 'Asia/Taipei';
export const PRODUCTION_TIME_ENDPOINT = 'https://kids-learning-adventure-chi.vercel.app/api/time';

export type CourseDayAccess = 'past' | 'today' | 'future';
export type TrustedTaipeiDate = {
  ymd: string;
  verified: boolean;
  source: 'server' | 'device-fallback';
  serverNow?: string;
};

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function taipeiYmd(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TAIPEI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function addCourseWeekdaysYmd(start: string, offset: number) {
  const [year, month, day] = start.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 4, 0, 0));
  let left = Math.max(0, offset);
  while (left > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    const weekday = date.getUTCDay();
    if (weekday !== 0 && weekday !== 6) left -= 1;
  }
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function ymdToTaipeiDate(value: string) {
  return new Date(`${value}T12:00:00+08:00`);
}

export function compareYmd(a: string, b: string) {
  return a === b ? 0 : a < b ? -1 : 1;
}

export function courseDayAccess(courseYmd: string, todayYmd: string): CourseDayAccess {
  const order = compareYmd(courseYmd, todayYmd);
  return order < 0 ? 'past' : order > 0 ? 'future' : 'today';
}

export function shortUnlockDate(value: string) {
  const [, month, day] = value.split('-').map(Number);
  return `${month} 月 ${day} 日解鎖`;
}

export function formatTaipeiCourseDate(value: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: TAIPEI_TIME_ZONE,
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(ymdToTaipeiDate(value));
}

async function readTimeEndpoint(url: string) {
  const response = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`time endpoint ${response.status}`);
  const data = await response.json() as { taipeiDate?: string; now?: string };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.taipeiDate ?? '')) throw new Error('invalid taipeiDate');
  return { ymd: data.taipeiDate!, now: data.now };
}

export async function fetchTrustedTaipeiDate(): Promise<TrustedTaipeiDate> {
  const sameOrigin = `${window.location.origin}/api/time`;
  const endpoints = window.location.hostname.endsWith('github.io')
    ? [PRODUCTION_TIME_ENDPOINT]
    : [sameOrigin, PRODUCTION_TIME_ENDPOINT];
  for (const endpoint of Array.from(new Set(endpoints))) {
    try {
      const result = await readTimeEndpoint(endpoint);
      return { ymd: result.ymd, verified: true, source: 'server', serverNow: result.now };
    } catch {
      // Try the next trusted endpoint. Formal rewards remain locked if all trusted sources fail.
    }
  }
  return { ymd: taipeiYmd(), verified: false, source: 'device-fallback' };
}
