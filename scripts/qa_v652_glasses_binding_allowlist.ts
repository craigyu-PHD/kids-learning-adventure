import assert from 'node:assert/strict';
import manifest from '../src/data/avatarAssetManifest.json';
import { approvedV652GlassesBinding, allowedRuntimeDetailsBinding, sha256File, V652_GLASSES_AUDIT } from './v652_glasses_binding_allowlist';

const items = ['starter-sky-glasses', 'sky-view-glasses', 'glasses-racer', 'glasses-star', 'glasses-holo', 'glasses-legend', 'sister-heart-glasses'];
const avatars = ['brother', 'younger', 'sister', 'younger-sister'];
let assertions = 0;
function check(condition: unknown, message: string): asserts condition { assertions += 1; assert(condition, message); }

for (const itemId of items) {
  const entry = manifest.accessories.find(candidate => candidate.id === itemId);
  check(entry, `manifest ${itemId}`);
  for (const avatarId of avatars) {
    const actual = (entry.variants as Record<string, string> | undefined)?.[avatarId];
    const accepted = approvedV652GlassesBinding(actual, itemId, avatarId);
    check(accepted.ok, `${itemId}/${avatarId}: ${accepted.reason}`);
  }
}

const exact = manifest.accessories.find(candidate => candidate.id === 'starter-sky-glasses')?.variants?.brother;
check(Boolean(exact), 'starter exact path exists');
check(!approvedV652GlassesBinding(exact, 'starter-sky-glasses', 'younger').ok, 'wrong avatar rejected');
check(!approvedV652GlassesBinding(exact, 'glasses-holo', 'brother').ok, 'wrong item rejected');
check(!approvedV652GlassesBinding('public/assets/v6.5.2/runtime/brother/not-reviewed.webp', 'starter-sky-glasses', 'brother').ok, 'unknown v6.5.2 path rejected');
check(!approvedV652GlassesBinding(exact, 'starter-sky-glasses', 'brother', (file) => file === exact ? '0'.repeat(64) : sha256File(file)).ok, 'asset hash drift rejected');
check(!approvedV652GlassesBinding(exact, 'starter-sky-glasses', 'brother', (file) => file === V652_GLASSES_AUDIT ? '0'.repeat(64) : sha256File(file)).ok, 'audit pin drift rejected');
check(allowedRuntimeDetailsBinding('public/assets/v6.4/runtime/brother/starter-sky-glasses.webp', 'public/assets/v6.4/runtime/brother/starter-sky-glasses.webp', 'starter-sky-glasses', 'brother').ok, 'historical binding unchanged');
check(allowedRuntimeDetailsBinding('public/assets/v6.5/runtime/brother/starter-sky-glasses.webp', 'public/assets/v6.4/runtime/brother/starter-sky-glasses.webp', 'starter-sky-glasses', 'brother').ok, 'existing v6.5 promoted binding unchanged');
check(!allowedRuntimeDetailsBinding('public/assets/v6.5.2/runtime/brother/not-reviewed.webp', 'public/assets/v6.4/runtime/brother/starter-sky-glasses.webp', 'starter-sky-glasses', 'brother').ok, 'non-target v6.5.2 binding rejected');

console.log(JSON.stringify({ status: 'PASS', assertions, scope: 'V6.5.2 exact seven-glasses stage-ledger allowlist; local runtime-details compatibility only, not release evidence or art PASS' }));
