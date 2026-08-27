import fs from 'node:fs';
import path from 'node:path';
import { createHmac } from 'node:crypto';
import { familyIdFromPin, issueFamilySession, verifyFamilySessionToken } from '../api/family-auth';
import familySessionApi from '../api/family-session';

const ROOT = path.resolve(import.meta.dirname, '..');
const QA = path.join(ROOT, '.qa');
fs.mkdirSync(QA, { recursive: true });
process.env.FAMILY_PIN_PEPPER = 'v40-family-auth-qa-pepper-32-bytes-minimum';

const pin = '2468';
const fixedNow = Date.parse('2026-08-27T11:15:00.000Z');
const familyId = familyIdFromPin(pin);
const expectedLegacyNamespace = createHmac('sha256', process.env.FAMILY_PIN_PEPPER)
  .update(`kids-learning:${pin}`)
  .digest('hex');
const session = issueFamilySession(pin, fixedNow);
if (!familyId || !session) throw new Error('Unable to issue family session');

const verified = verifyFamilySessionToken(session.token, fixedNow + 1_000);
const tampered = verifyFamilySessionToken(`${session.token.slice(0, -1)}x`, fixedNow + 1_000);
const expired = verifyFamilySessionToken(session.token, fixedNow + 31 * 24 * 60 * 60 * 1000);
const invalidPin = issueFamilySession('12', fixedNow);
const endpointResponse = await familySessionApi.fetch(new Request('https://example.test/api/family-session', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.10' }, body: JSON.stringify({ pin }),
}));
const endpointSession = await endpointResponse.json() as { familyId?: string; token?: string };
const endpointInvalid = await familySessionApi.fetch(new Request('https://example.test/api/family-session', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.11' }, body: JSON.stringify({ pin: '12' }),
}));
const endpointMethod = await familySessionApi.fetch(new Request('https://example.test/api/family-session', { method: 'GET' }));
let rateLimitedResponse: Response | null = null;
for (let attempt = 0; attempt < 11; attempt += 1) {
  rateLimitedResponse = await familySessionApi.fetch(new Request('https://example.test/api/family-session', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.12' }, body: JSON.stringify({ pin: '1111' }),
  }));
}

const stateSource = fs.readFileSync(path.join(ROOT, 'api/state.ts'), 'utf8');
const appSource = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');
const settingsSource = fs.readFileSync(path.join(ROOT, 'src/v4/ParentSettings.tsx'), 'utf8');
const cloudSource = fs.readFileSync(path.join(ROOT, 'src/cloud.ts'), 'utf8');

const checks = {
  legacyNamespaceStable: familyId === expectedLegacyNamespace,
  signedSessionValid: verified?.familyId === familyId,
  tamperedRejected: tampered === null,
  expiredRejected: expired === null,
  invalidPinRejected: invalidPin === null,
  endpointPostWorks: endpointResponse.status === 200 && endpointSession.familyId === familyId && typeof endpointSession.token === 'string',
  endpointRejectsInvalidPin: endpointInvalid.status === 400,
  endpointRejectsWrongMethod: endpointMethod.status === 405,
  endpointNoStoreCors: endpointResponse.headers.get('cache-control')?.includes('no-store') === true && endpointResponse.headers.get('access-control-allow-origin') === '*',
  endpointRateLimitsPinAttempts: rateLimitedResponse?.status === 429 && Number(rateLimitedResponse.headers.get('retry-after')) > 0,
  stateUsesBearerOnly: stateSource.includes("request.headers.get('authorization')") && stateSource.includes('verifyFamilySessionToken') && !stateSource.includes('x-family-pin'),
  clientUsesBearer: cloudSource.includes('Authorization: `Bearer ${session.token}`') && !cloudSource.includes("'X-Family-Pin'"),
  noActivePinWrite: !appSource.includes('localStorage.setItem(ACTIVE_PIN_KEY') && appSource.includes('star-learning-active-family-session-v40'),
  v40FamilyNamespace: appSource.includes('`star-learning-v40:${familyId}:${kind}`'),
  settingsHidePin: !settingsSource.includes('目前家庭管理者 PIN') && !settingsSource.includes('複製管理者 PIN') && settingsSource.includes('PIN 不會儲存在瀏覽器'),
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const result = { status: failures.length ? 'FAIL' : 'PASS', ...checks, failures };
fs.writeFileSync(path.join(QA, 'v40_family_auth_result.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
