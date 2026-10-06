import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHA256 = /^[0-9a-f]{64}$/;

export const V652_OCEAN_PLAN = 'qa/v652/sol/ocean-integration-plan-r1.json';
export const V652_OCEAN_PLAN_SHA256 = '84aa8a59cb603405923209a8969482902cf57b323ac81b1894319f645ce030ba';
export const V652_OCEAN_ITEM_ID = 'hat-ocean';
export const V652_OCEAN_AVATARS = ['brother', 'younger', 'sister', 'younger-sister'] as const;
export const V652_OCEAN_SKINS = [
  'outfit-cadet', 'outfit-legend', 'outfit-mage',
  'outfit-mecha', 'outfit-ocean', 'sister-bloom-outfit',
] as const;
export const V652_OCEAN_LEGACY_VARIANTS = {
  brother: 'public/assets/v6.4/runtime/brother/hat-ocean.webp',
  younger: 'public/assets/v6.4/runtime/younger/hat-ocean.webp',
  sister: 'public/assets/v6.4/runtime/sister/hat-ocean.webp',
  'younger-sister': 'public/assets/v6.4/runtime/younger-sister/hat-ocean.webp',
} as const;

type EvidenceLink = { path?: string; sha256?: string; size?: number[]; reportShaMatches?: boolean };
type OceanOperation = {
  kind?: string;
  itemId?: string;
  avatarId?: string;
  skinId?: string;
  source?: string;
  sha256?: string;
  target?: string;
  canvasTopPadding?: number;
  hairVisibilityMask?: unknown;
};
type OceanPlan = {
  schemaVersion?: string;
  status?: string;
  itemId?: string;
  canvasTopPadding?: number;
  sourceBindings?: {
    acceptedInventory?: EvidenceLink;
    losslessDeliveryReport?: EvidenceLink;
  };
  operations?: OceanOperation[];
  manifestPatchScope?: { allowedFields?: string[] };
};
type OceanDetail = { overlay?: string; hairVisibilityMask?: string; canvasTopPadding?: number };
export type OceanManifestEntry = {
  id?: string;
  slot?: string;
  renderer?: string;
  supportedAvatars?: string[];
  variants?: Record<string, string>;
  skinVariants?: unknown;
  defaultSkinDetails?: Record<string, OceanDetail>;
  skinDetails?: Record<string, Record<string, OceanDetail>>;
  catalogPath?: string;
};
export type HashFile = (relativePath: string) => string | undefined;
export type OceanGateOptions = { hashFile?: HashFile; verifyTargets?: boolean };

export function sha256OceanFile(relativePath: string) {
  const file = path.join(ROOT, relativePath);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return undefined;
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function readJson(relativePath: string) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8')) as Record<string, any>;
}

function exactLink(link: EvidenceLink | undefined, label: string, hashFile: HashFile) {
  assert(link?.path && link.sha256 && SHA256.test(link.sha256), `invalid evidence link: ${label}`);
  assert.equal(hashFile(link.path), link.sha256, `hash drift: ${label}: ${link.path}`);
}

function expectedTarget(row: OceanOperation) {
  assert.equal(row.itemId, V652_OCEAN_ITEM_ID);
  if (row.kind === 'catalog') return 'public/assets/v6.5.2/catalog/hats/hat-ocean.webp';
  assert(V652_OCEAN_AVATARS.includes(row.avatarId as typeof V652_OCEAN_AVATARS[number]));
  assert.equal(row.canvasTopPadding, 256);
  assert.equal(row.hairVisibilityMask, null);
  if (row.kind === 'defaultSkinDetail') {
    assert.equal(row.skinId, undefined);
    return `public/assets/v6.5.2/runtime/${row.avatarId}/hat-ocean--detail.webp`;
  }
  assert.equal(row.kind, 'skinDetail');
  assert(V652_OCEAN_SKINS.includes(row.skinId as typeof V652_OCEAN_SKINS[number]));
  return `public/assets/v6.5.2/runtime/${row.avatarId}/hat-ocean--${row.skinId}--detail.webp`;
}

function assertLiveLineage(plan: OceanPlan, hashFile: HashFile) {
  exactLink(plan.sourceBindings?.acceptedInventory, 'accepted inventory', hashFile);
  exactLink(plan.sourceBindings?.losslessDeliveryReport, 'lossless delivery report', hashFile);
  const inventoryPath = plan.sourceBindings!.acceptedInventory!.path!;
  const deliveryPath = plan.sourceBindings!.losslessDeliveryReport!.path!;
  const inventory = readJson(inventoryPath);
  const delivery = readJson(deliveryPath);

  assert.equal(inventory.status, 'QA_INVENTORY_ONLY_NOT_A_PROMOTION_OR_MUTATION_PLAN');
  assert.equal(inventory.acceptedPairs?.length, 28);
  exactLink(inventory.master, 'inventory.master', hashFile);
  exactLink(inventory.catalog?.source, 'inventory.catalog.source', hashFile);
  exactLink(inventory.catalog?.output, 'inventory.catalog.output', hashFile);
  exactLink(inventory.catalog?.independentReview, 'inventory.catalog.independentReview', hashFile);
  exactLink(inventory.catalog?.reportEvidence, 'inventory.catalog.reportEvidence', hashFile);
  for (const row of inventory.acceptedPairs as Record<string, any>[]) {
    assert.equal(row.canvasTopPadding, 256);
    assert.equal(row.mask, null);
    assert.equal(row.sourcePixelsUnchangedAfterPadding, true);
    assert.notEqual(row.skinId, 'outfit-racer');
    exactLink(row.source, `inventory.${row.avatar}.${row.skinId}.source`, hashFile);
    exactLink(row.overlay, `inventory.${row.avatar}.${row.skinId}.overlay`, hashFile);
    exactLink(row.independentReview, `inventory.${row.avatar}.${row.skinId}.independentReview`, hashFile);
    exactLink(row.reportEvidence, `inventory.${row.avatar}.${row.skinId}.reportEvidence`, hashFile);
  }

  assert.equal(delivery.status, 'QA_DELIVERY_ONLY_PENDING_INTEGRATION_AUDIT');
  assert.equal(delivery.deliveries?.length, 28);
  assert.deepEqual(delivery.excludedSkins, ['outfit-racer']);
  assert.deepEqual(
    (inventory.acceptedPairs as Record<string, any>[]).map(row => `${row.avatar}:${row.skinId}`).sort(),
    (delivery.deliveries as Record<string, any>[]).map(row => `${row.avatar}:${row.skinId}`).sort(),
  );
  for (const row of delivery.deliveries as Record<string, any>[]) {
    assert.equal(row.canvasTopPadding, 256);
    assert.equal(row.mask, null);
    assert.equal(row.rgbaExact, true);
    assert.deepEqual(row.source?.size, [1024, 1792]);
    exactLink(row.source, `delivery.${row.avatar}.${row.skinId}.source`, hashFile);
    exactLink({ path: row.path, sha256: row.sha256 }, `delivery.${row.avatar}.${row.skinId}.output`, hashFile);
    exactLink(row.independentReview, `delivery.${row.avatar}.${row.skinId}.independentReview`, hashFile);
  }
  assert.deepEqual(delivery.catalog?.size, [512, 512]);
  exactLink(delivery.catalog, 'delivery.catalog', hashFile);
  return delivery;
}

function loadVerifiedPlan(hashFile: HashFile) {
  assert.equal(hashFile(V652_OCEAN_PLAN), V652_OCEAN_PLAN_SHA256, 'Ocean plan hash drift');
  const plan = readJson(V652_OCEAN_PLAN) as OceanPlan;
  assert.equal(plan.schemaVersion, 'v6.5.2-ocean-local-integration-plan-r1');
  assert.equal(plan.status, 'DRAFT_QA_ONLY_NOT_STAGED_NOT_RELEASE_READY');
  assert.equal(plan.itemId, V652_OCEAN_ITEM_ID);
  assert.equal(plan.canvasTopPadding, 256);
  assert.deepEqual([...(plan.manifestPatchScope?.allowedFields ?? [])].sort(),
    ['catalogPath', 'defaultSkinDetails', 'skinDetails']);
  const operations = plan.operations;
  assert(Array.isArray(operations) && operations.length === 29);
  assert.equal(new Set(operations.map(row => row.target)).size, 29);
  for (const row of operations) {
    assert.equal(row.target, expectedTarget(row));
    assert(row.source?.startsWith('qa/v652/'));
    assert(row.sha256 && SHA256.test(row.sha256));
  }
  const delivery = assertLiveLineage(plan, hashFile);
  const expected: OceanOperation[] = (delivery.deliveries as Record<string, any>[]).map(row => {
    const base = row.skinId === 'base';
    return {
      kind: base ? 'defaultSkinDetail' : 'skinDetail', itemId: V652_OCEAN_ITEM_ID,
      avatarId: row.avatar, ...(!base ? { skinId: row.skinId } : {}),
      source: row.path, sha256: row.sha256,
      target: base
        ? `public/assets/v6.5.2/runtime/${row.avatar}/hat-ocean--detail.webp`
        : `public/assets/v6.5.2/runtime/${row.avatar}/hat-ocean--${row.skinId}--detail.webp`,
      canvasTopPadding: 256, hairVisibilityMask: null,
    };
  });
  expected.push({ kind: 'catalog', itemId: V652_OCEAN_ITEM_ID,
    source: delivery.catalog.path, sha256: delivery.catalog.sha256,
    target: 'public/assets/v6.5.2/catalog/hats/hat-ocean.webp' });
  assert.deepEqual(operations, expected, 'Ocean plan operations drift from lossless deliveries');
  return plan as OceanPlan & { operations: OceanOperation[] };
}

export function expectedV652OceanManifestFields(hashFile: HashFile = sha256OceanFile) {
  const plan = loadVerifiedPlan(hashFile);
  const defaultSkinDetails: Record<string, OceanDetail> = {};
  const skinDetails: Record<string, Record<string, OceanDetail>> = {};
  let catalogPath: string | undefined;
  for (const row of plan.operations) {
    if (row.kind === 'defaultSkinDetail') {
      defaultSkinDetails[row.avatarId!] = { overlay: row.target, canvasTopPadding: 256 };
    } else if (row.kind === 'skinDetail') {
      (skinDetails[row.avatarId!] ??= {})[row.skinId!] = { overlay: row.target, canvasTopPadding: 256 };
    } else {
      catalogPath = row.target;
    }
  }
  return { defaultSkinDetails, skinDetails, catalogPath, plan };
}

export function assertV652OceanDetailContract(
  entryValue: unknown,
  options: OceanGateOptions = {},
) {
  const entry = entryValue as OceanManifestEntry;
  const hashFile = options.hashFile ?? sha256OceanFile;
  const verifyTargets = options.verifyTargets ?? true;
  const expected = expectedV652OceanManifestFields(hashFile);
  assert.equal(entry.id, V652_OCEAN_ITEM_ID);
  assert.equal(entry.slot, 'headwear');
  assert.equal(entry.renderer, 'aligned-overlay');
  assert.deepEqual(entry.supportedAvatars, [...V652_OCEAN_AVATARS]);
  assert.deepEqual(entry.variants, V652_OCEAN_LEGACY_VARIANTS, 'legacy 1536px variants changed');
  assert.equal(Object.hasOwn(entry, 'skinVariants'), false, 'Ocean must not use skinVariants');
  assert.deepEqual(entry.defaultSkinDetails, expected.defaultSkinDetails);
  assert.deepEqual(entry.skinDetails, expected.skinDetails);
  assert.equal(entry.catalogPath, expected.catalogPath);
  assert.equal(entry.skinDetails?.brother?.['outfit-racer'], undefined, 'Racer detail inheritance');
  for (const avatar of V652_OCEAN_AVATARS) {
    assert.deepEqual(Object.keys(entry.skinDetails?.[avatar] ?? {}).sort(), [...V652_OCEAN_SKINS].sort());
    for (const detail of Object.values(entry.skinDetails?.[avatar] ?? {})) {
      assert.equal(Object.hasOwn(detail, 'hairVisibilityMask'), false);
    }
  }
  if (verifyTargets) {
    for (const row of expected.plan.operations) {
      assert.equal(hashFile(row.target!), row.sha256, `Ocean target hash drift: ${row.target}`);
    }
  }
  return { detailCount: 28, catalogPath: expected.catalogPath };
}
