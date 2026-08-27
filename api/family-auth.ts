import { createHmac, timingSafeEqual } from 'node:crypto';

const PIN_RE = /^\d{4,6}$/;
const FAMILY_ID_RE = /^[a-f0-9]{64}$/;
const TOKEN_VERSION = 'v1';
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

function authSecret() {
  const secret = process.env.FAMILY_PIN_PEPPER;
  if (!secret || secret.length < 24) throw new Error('FAMILY_PIN_PEPPER is not configured');
  return secret;
}

export function normalizeServerPin(value: string) {
  return value.replace(/\D/g, '').slice(0, 6);
}

export function familyIdFromPin(pinValue: string) {
  const pin = normalizeServerPin(pinValue);
  if (!PIN_RE.test(pin)) return null;
  // Keep the exact V2.2 namespace derivation so existing Vercel Blob data stays in place.
  return createHmac('sha256', authSecret()).update(`kids-learning:${pin}`).digest('hex');
}

function tokenSignature(familyId: string, expiresAt: number) {
  return createHmac('sha256', authSecret())
    .update(`kids-learning-session:${TOKEN_VERSION}:${familyId}:${expiresAt}`)
    .digest('base64url');
}

export type FamilySession = {
  familyId: string;
  token: string;
  expiresAt: string;
};

export function issueFamilySession(pinValue: string, now = Date.now()): FamilySession | null {
  const familyId = familyIdFromPin(pinValue);
  if (!familyId) return null;
  const expiresAtSeconds = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
  const signature = tokenSignature(familyId, expiresAtSeconds);
  return {
    familyId,
    token: `${TOKEN_VERSION}.${familyId}.${expiresAtSeconds}.${signature}`,
    expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
  };
}

export function verifyFamilySessionToken(tokenValue: string, now = Date.now()) {
  const [version, familyId, expiresRaw, signature] = tokenValue.trim().split('.');
  if (version !== TOKEN_VERSION || !FAMILY_ID_RE.test(familyId ?? '') || !/^\d{10,12}$/.test(expiresRaw ?? '') || !signature) return null;
  const expiresAtSeconds = Number(expiresRaw);
  if (!Number.isSafeInteger(expiresAtSeconds) || expiresAtSeconds * 1000 <= now) return null;
  const expected = tokenSignature(familyId, expiresAtSeconds);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  return { familyId, expiresAt: new Date(expiresAtSeconds * 1000).toISOString() };
}
