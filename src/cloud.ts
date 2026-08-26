import type { CloudSnapshot } from './types';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateFamilyCode(length = 14) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
}

export function normalizeFamilyCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 24);
}

async function parseJsonResponse(response: Response) {
  const type = response.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) throw new Error('雲端 API 目前不可用');
  return response.json();
}

export async function loadCloudSnapshot(familyCode: string): Promise<CloudSnapshot | null> {
  const code = normalizeFamilyCode(familyCode);
  if (code.length < 10) throw new Error('家庭同步碼格式不正確');
  const response = await fetch(`/api/state?familyCode=${encodeURIComponent(code)}&t=${Date.now()}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`讀取雲端資料失敗（${response.status}）`);
  return parseJsonResponse(response) as Promise<CloudSnapshot>;
}

export async function saveCloudSnapshot(familyCode: string, snapshot: CloudSnapshot) {
  const code = normalizeFamilyCode(familyCode);
  if (code.length < 10) throw new Error('家庭同步碼格式不正確');
  const response = await fetch(`/api/state?familyCode=${encodeURIComponent(code)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(snapshot),
  });
  if (!response.ok) throw new Error(`寫入雲端資料失敗（${response.status}）`);
  return parseJsonResponse(response) as Promise<{ ok: boolean; updatedAt: string }>;
}
