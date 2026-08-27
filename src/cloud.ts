import type { CloudSnapshot } from './types';

export const PRODUCTION_CLOUD_ORIGIN = 'https://kids-learning-adventure-chi.vercel.app';

export type FamilySession = {
  familyId: string;
  token: string;
  expiresAt: string;
};

const FAMILY_ID_RE = /^[a-f0-9]{64}$/;

export function normalizeFamilyPin(value: string) {
  return value.replace(/\D/g, '').slice(0, 6);
}

export function validFamilyPin(value: string) {
  return /^\d{4,6}$/.test(normalizeFamilyPin(value));
}

export function validFamilySession(value: unknown): value is FamilySession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<FamilySession>;
  return FAMILY_ID_RE.test(session.familyId ?? '')
    && typeof session.token === 'string'
    && session.token.length >= 32
    && typeof session.expiresAt === 'string'
    && Number.isFinite(new Date(session.expiresAt).getTime())
    && new Date(session.expiresAt).getTime() > Date.now();
}

function apiUrl(path: string) {
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) return `${PRODUCTION_CLOUD_ORIGIN}${path}`;
  return path;
}

async function parseJsonResponse(response: Response) {
  const type = response.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) throw new Error('雲端 API 目前不可用');
  return response.json();
}

export async function createFamilySession(pinValue: string): Promise<FamilySession> {
  const pin = normalizeFamilyPin(pinValue);
  if (!validFamilyPin(pin)) throw new Error('家庭 PIN 必須是 4–6 位數字');
  const response = await fetch(apiUrl('/api/family-session'), {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ pin }),
  });
  if (!response.ok) throw new Error(`建立家庭安全工作階段失敗（${response.status}）`);
  const data = await parseJsonResponse(response) as FamilySession;
  if (!validFamilySession(data)) throw new Error('家庭安全工作階段格式無效');
  return data;
}

export async function loadCloudSnapshot(session: FamilySession): Promise<CloudSnapshot | null> {
  if (!validFamilySession(session)) throw new Error('家庭安全工作階段已失效，請重新輸入管理者 PIN');
  const response = await fetch(`${apiUrl('/api/state')}?t=${Date.now()}`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${session.token}`,
    },
  });
  if (response.status === 404) return null;
  if (response.status === 401) throw new Error('家庭安全工作階段已失效，請重新輸入管理者 PIN');
  if (!response.ok) throw new Error(`讀取家庭資料失敗（${response.status}）`);
  return parseJsonResponse(response) as Promise<CloudSnapshot>;
}

export async function saveCloudSnapshot(session: FamilySession, snapshot: CloudSnapshot, baseUpdatedAt?: string | null) {
  if (!validFamilySession(session)) throw new Error('家庭安全工作階段已失效，請重新輸入管理者 PIN');
  const response = await fetch(apiUrl('/api/state'), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${session.token}`,
      ...(baseUpdatedAt ? { 'X-Family-Base-Updated-At': baseUpdatedAt } : {}),
    },
    body: JSON.stringify(snapshot),
  });
  if (response.status === 401) throw new Error('家庭安全工作階段已失效，請重新輸入管理者 PIN');
  if (response.status === 409) throw new Error('雲端已有較新的家庭資料，已停止覆寫；請先重新載入最新進度。');
  if (!response.ok) throw new Error(`寫入家庭資料失敗（${response.status}）`);
  return parseJsonResponse(response) as Promise<{ ok: boolean; updatedAt: string }>;
}
