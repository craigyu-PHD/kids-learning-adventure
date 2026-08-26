import type { CloudSnapshot } from './types';

export function normalizeFamilyPin(value: string) {
  return value.replace(/\D/g, '').slice(0, 6);
}

export function validFamilyPin(value: string) {
  return /^\d{4,6}$/.test(normalizeFamilyPin(value));
}

async function parseJsonResponse(response: Response) {
  const type = response.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) throw new Error('雲端 API 目前不可用');
  return response.json();
}

export async function loadCloudSnapshot(familyPin: string): Promise<CloudSnapshot | null> {
  const pin = normalizeFamilyPin(familyPin);
  if (!validFamilyPin(pin)) throw new Error('家庭 PIN 必須是 4–6 位數字');
  const response = await fetch(`/api/state?t=${Date.now()}`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'X-Family-Pin': pin,
    },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`讀取家庭資料失敗（${response.status}）`);
  return parseJsonResponse(response) as Promise<CloudSnapshot>;
}

export async function saveCloudSnapshot(familyPin: string, snapshot: CloudSnapshot) {
  const pin = normalizeFamilyPin(familyPin);
  if (!validFamilyPin(pin)) throw new Error('家庭 PIN 必須是 4–6 位數字');
  const response = await fetch('/api/state', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Family-Pin': pin,
    },
    body: JSON.stringify(snapshot),
  });
  if (!response.ok) throw new Error(`寫入家庭資料失敗（${response.status}）`);
  return parseJsonResponse(response) as Promise<{ ok: boolean; updatedAt: string }>;
}
