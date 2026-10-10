import assert from 'node:assert/strict';
import {
  approvedV652HeadphonesBinding,
  approvedV652HeadphonesBindingAgainstAudit,
  allowedRuntimeDetailsHeadphonesBinding,
  allowedRuntimeDetailsHeadphonesHeadwearBinding,
  validateV652HeadphonesAudit,
  V652_HEADPHONES_AVATAR_IDS,
  V652_HEADPHONES_ITEM_IDS,
  V652_HEADPHONES_SKIN_PROFILES,
  V652_HEADPHONES_AUDIT_SHA256,
  type HeadphonesAudit,
  type HeadphonesOperation,
} from './v652_headphones_binding_allowlist';

const HASH = 'a'.repeat(64);
const PLAN_HASH = 'b'.repeat(64);
let assertions = 0;
function check(condition: unknown, message: string): asserts condition { assertions += 1; assert(condition, message); }

function row(kind: string, itemId: string, avatarId?: string, skinId?: string, headwearId?: string): HeadphonesOperation {
  let target: string;
  if (kind === 'catalog') target = `public/assets/v6.5.2/catalog/headphones/${itemId}.webp`;
  else if (kind === 'skin') target = `public/assets/v6.5.2/runtime/${avatarId}/${itemId}--${skinId}.webp`;
  else if (kind === 'headwear') target = `public/assets/v6.5.2/runtime/${avatarId}/starter-buddy-headphones--starter-sun-cap-front.webp`;
  else target = `public/assets/v6.5.2/runtime/${avatarId}/${itemId}.webp`;
  return { kind, itemId, avatarId, skinId, headwearId, source: `qa/v652/fixture/${kind}-${itemId}-${avatarId ?? 'catalog'}-${skinId ?? headwearId ?? 'base'}.webp`, sha256: HASH, target };
}

const operations: HeadphonesOperation[] = [];
for (const itemId of V652_HEADPHONES_ITEM_IDS) {
  for (const avatarId of V652_HEADPHONES_AVATAR_IDS) operations.push(row('base', itemId, avatarId));
  for (const profile of V652_HEADPHONES_SKIN_PROFILES) {
    const [avatarId, skinId] = profile.split(':');
    operations.push(row('skin', itemId, avatarId, skinId));
  }
  operations.push(row('catalog', itemId));
}
for (const avatarId of V652_HEADPHONES_AVATAR_IDS) operations.push(row('headwear', 'starter-buddy-headphones', avatarId, undefined, 'starter-sun-cap'));

const audit: HeadphonesAudit = {
  status: 'PASS_LOCAL_INTEGRATION_ONLY',
  planSha256: PLAN_HASH,
  permittedOperations: operations,
  manifestBefore: { path: 'qa/v652/fixture/manifest-before.json', sha256: HASH },
};
const fixtureHash = (relativePath: string) => relativePath.startsWith('qa/v652/fixture/') || relativePath.startsWith('public/assets/v6.5.2/') ? HASH : undefined;

check(validateV652HeadphonesAudit(audit).ok, '74-operation fixture audit accepted');
let acceptedBase = 0;
for (const itemId of V652_HEADPHONES_ITEM_IDS) for (const avatarId of V652_HEADPHONES_AVATAR_IDS) {
  const target = `public/assets/v6.5.2/runtime/${avatarId}/${itemId}.webp`;
  check(approvedV652HeadphonesBindingAgainstAudit(target, itemId, avatarId, { kind: 'base' }, audit, fixtureHash).ok, `base ${itemId}/${avatarId}`);
  acceptedBase += 1;
}
let acceptedHeadwear = 0;
for (const avatarId of V652_HEADPHONES_AVATAR_IDS) {
  const target = `public/assets/v6.5.2/runtime/${avatarId}/starter-buddy-headphones--starter-sun-cap-front.webp`;
  check(approvedV652HeadphonesBindingAgainstAudit(target, 'starter-buddy-headphones', avatarId, { kind: 'headwear', headwearId: 'starter-sun-cap' }, audit, fixtureHash).ok, `cap ${avatarId}`);
  acceptedHeadwear += 1;
}

const brotherBase = 'public/assets/v6.5.2/runtime/brother/starter-buddy-headphones.webp';
const invalidAuditHash = approvedV652HeadphonesBinding(brotherBase, 'starter-buddy-headphones', 'brother', { kind: 'base' }, () => '0'.repeat(64));
check(!invalidAuditHash.ok, 'missing approval or wrong audit digest always rejected');
check(invalidAuditHash.reason === (V652_HEADPHONES_AUDIT_SHA256.startsWith('PENDING') ? 'audit-pin-pending' : 'audit-pin-drift'), 'approval rejection reason is explicit');
check(!approvedV652HeadphonesBindingAgainstAudit(brotherBase, 'phones-ai', 'brother', { kind: 'base' }, audit, fixtureHash).ok, 'wrong item rejected');
check(!approvedV652HeadphonesBindingAgainstAudit(brotherBase, 'starter-buddy-headphones', 'younger', { kind: 'base' }, audit, fixtureHash).ok, 'wrong avatar rejected');
const brotherBaseSource = operations.find(candidate => candidate.kind === 'base' && candidate.itemId === 'starter-buddy-headphones' && candidate.avatarId === 'brother')!.source!;
check(approvedV652HeadphonesBindingAgainstAudit(brotherBase, 'starter-buddy-headphones', 'brother', { kind: 'base' }, audit, (path) => path === brotherBaseSource ? '0'.repeat(64) : fixtureHash(path)).reason === 'source-hash-drift', 'source hash drift rejected');
check(!approvedV652HeadphonesBindingAgainstAudit(brotherBase, 'starter-buddy-headphones', 'brother', { kind: 'base' }, audit, (path) => path === brotherBase ? '0'.repeat(64) : fixtureHash(path)).ok, 'target hash drift rejected');
const duplicateAudit = structuredClone(audit);
duplicateAudit.permittedOperations![1] = structuredClone(duplicateAudit.permittedOperations![0]);
check(!validateV652HeadphonesAudit(duplicateAudit).ok, 'duplicate identity/target rejected');
const draftAudit = { ...audit, status: 'DRAFT_QA_ONLY' };
check(!validateV652HeadphonesAudit(draftAudit).ok, 'non-pass audit rejected');
const changedAudit = structuredClone(audit);
changedAudit.permittedOperations![0].target = 'public/assets/v6.5.2/runtime/brother/not-allowlisted.webp';
check(!validateV652HeadphonesAudit(changedAudit).ok, 'audit exact-target drift rejected');

check(allowedRuntimeDetailsHeadphonesBinding('public/assets/v6.4/runtime/brother/starter-buddy-headphones.webp', 'public/assets/v6.4/runtime/brother/starter-buddy-headphones.webp', 'starter-buddy-headphones', 'brother').ok, 'historical base unchanged');
check(allowedRuntimeDetailsHeadphonesBinding('public/assets/v6.5/runtime/brother/starter-buddy-headphones.webp', 'public/assets/v6.4/runtime/brother/starter-buddy-headphones.webp', 'starter-buddy-headphones', 'brother').ok, 'existing v6.5 base unchanged');
const oldCap = 'public/assets/v6.4/runtime/brother/starter-buddy-headphones--starter-sun-cap-front.webp';
check(allowedRuntimeDetailsHeadphonesHeadwearBinding(oldCap, oldCap, 'starter-buddy-headphones', 'brother', 'starter-sun-cap').ok, 'historical cap unchanged');
check(!allowedRuntimeDetailsHeadphonesHeadwearBinding('public/assets/v6.5/runtime/brother/arbitrary-cap.webp', oldCap, 'starter-buddy-headphones', 'brother', 'starter-sun-cap').ok, 'arbitrary cap path rejected');

assert.equal(acceptedBase, 28);
assert.equal(acceptedHeadwear, 4);
console.log(JSON.stringify({ status: 'PASS', assertions, acceptedBase, acceptedHeadwear, fixtureOperations: operations.length, scope: 'Fixture contract tests plus approval-pin rejection only; no live target approval, staging, manifest write, or release claim' }));
