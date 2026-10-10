import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const AVATARS = ['brother', 'younger', 'sister', 'younger-sister'] as const;
const SKINS = ['base', 'outfit-cadet', 'outfit-mecha', 'outfit-ocean', 'outfit-mage',
  'outfit-legend', 'sister-bloom-outfit'] as const;
type Link = { path: string; sha256: string; size?: number[] };
type Detail = { overlay: string; canvasTopPadding: number; hairVisibilityMask?: string };
type Entry = { id: string; slot: string; renderer: string; supportedAvatars: string[];
  variants: Record<string, string>; defaultSkinDetails: Record<string, Detail>;
  skinDetails: Record<string, Record<string, Detail>>; catalogPath: string; skinVariants?: unknown };
type Pair = { avatarId: string; skinId: string; acceptanceStatus?: string;
  source?: Link; sourceMap?: Link; reviewEvidence?: Link[];
  detail: { overlay: Link; hairVisibilityMask: Link | null; canvasTopPadding: number };
  proposedPublic: { overlay: string; hairVisibilityMask: string | null } };
type Mapping = { itemId: string; nativeMaster?: Link; nativeMasters?: Link[]; reviewEvidence?: Link[]; pairs: Pair[];
  catalog: { source: Link; proposedPublic: string }; technicalReport?: string;
  nullMaskNormalization?: { originalMask: Link; changedCompositePixelCount: number }[] };
type Completion = { itemId: string; status: string; pairs: number; finalMap: Link;
  evidence: Link[]; releaseAcceptance: boolean; limits: string[] };
type Contract = { itemId: string; slot: string; catalogGroup: string; mapping: Link;
  completion: Link; completionStatus: string; legacySha256: Record<string, string>;
  technicalReport?: Link; integratedCompletion?: boolean };

// Deliberate admission list. A later promotion needs its own immutable final map,
// completion boundary, legacy pins and negative tests; unpromoted hair items do not enter here.
export const V652_CURRENT_DETAIL_CONTRACTS: readonly Contract[] = [
  {
    itemId: 'sunny-explorer-hat', slot: 'headwear', catalogGroup: 'hats',
    mapping: { path: 'qa/v652/root/sunny-activation-20260926/legend-repair-activation/integration-map.json',
      sha256: '35ebe33189c8313400761a03d9f3a2414d633aa52191950785e3f0540ad5a8a5' },
    completion: { path: 'qa/v652/root/sunny-activation-20260926/completion.json',
      sha256: '96a61b9ca3a716f45b31a51ed54d8a995d3ae6a4e323d154d4e65188be0af161' },
    completionStatus: 'PASS_LOCAL_SCOPED_SUNNY_28',
    technicalReport: { path: 'qa/v652/sol/20260926-sunny-completion-r2/final-24-technical.json',
      sha256: 'b74449d9b119e4458345a3aac328db14c4b241190e1cfc4f38e7a0fc52f291f9' },
    legacySha256: {
      brother: 'd3394d94c757257b8516c49ed0ca3f85b8ccc6865d0668f49ba7ecea3f877638',
      younger: '60873ec74eec906bc0a48f59be829078fd5767d8aad96c15d1473a26941f76c9',
      sister: 'd1cf087a5360cc910c36956303871062d714e60a55dcea676e3ad74d26b69e47',
      'younger-sister': '554b3994d6488ad826216944f83e3716a6bbc2c8e9e8eac66841024d6d7aa772',
    },
  },
  {
    itemId: 'hair-cloud', slot: 'hair', catalogGroup: 'hairstyles',
    mapping: { path: 'qa/v652/root/cloud-activation-20260926/integration-map.json',
      sha256: 'fc1801933d58919b4d79bc52937c27ac9bb91d80bb7bf8d8de0ea0aacc90c6a6' },
    completion: { path: 'qa/v652/root/cloud-activation-20260926/completion.json',
      sha256: '188598ca7dac0007d42aca9bf13017bcbb472ba0f269bb6371407f2b4e159f43' },
    completionStatus: 'PASS_LOCAL_SCOPED_CLOUD_28',
    legacySha256: {
      brother: 'bc3c303e96a2feda82a6b39c9ac0a6545de36aacff2dd595b38ed584ae1e1daa',
      younger: 'f47901e395c86d8b0081a7e6da160880dc0020b6dc01e9ebccd5213be28ed6f0',
      sister: 'eb058f68c0645c786880f428eb91b3633b5ffa8c170f95c4bd4d1b120ee53a75',
      'younger-sister': 'efb0b980fad652c94f571c40bf93440080f7c2c13cfc6032d544cdeb34c8c608',
    },
  },
  {
  "itemId": "hair-nebula",
  "slot": "hair",
  "catalogGroup": "hairstyles",
  "mapping": {
    "path": "qa/v652/root/nebula-activation-20260927/integration-map.json",
    "sha256": "c7ac6f11aa1e6821f70ac365f5f0d6c1512de203f80ddcdedc78ac803324cd9c"
  },
  "completion": {
    "path": "qa/v652/root/nebula-activation-20260927/completion.json",
    "sha256": "10ce4daf9cba331a78e3b34791a47129095177fb4b642798d62638b778714fc9"
  },
  "completionStatus": "PASS_SCOPED_LOCAL_INTEGRATED",
  "integratedCompletion": true,
  "legacySha256": {
    "brother": "36335fb2a0f08c9204c5857f24d9df82fb3e83e8c8b4c4bdbc8133906e50d1a6",
    "younger": "28580b37d280bda746ff045efea19be38aecbf3dac83d5b0b2a6bb8b80efc9d7",
    "sister": "dca91d105421f9d252f9ba60f10ea5b1c1cafc60ae9c6b00c6fc803e3a205706",
    "younger-sister": "4a23b4ffd1f9dfb37398e58c67b811ddd7fa24eeefc06a96b7acb9645a38597f"
  }
},
  {
  "itemId": "hair-legend",
  "slot": "hair",
  "catalogGroup": "hairstyles",
  "mapping": {
    "path": "qa/v652/root/legend-activation-20260927/integration-map.json",
    "sha256": "dd5641143fee1e6ca34ec41faf36b1075251c466ff270fd09dc1425375eee555"
  },
  "completion": {
    "path": "qa/v652/root/legend-activation-20260927/completion.json",
    "sha256": "b5fc3f60e7302481337f85acaa39f87fa2eb5f02a81d726d0c89da5caffea459"
  },
  "completionStatus": "PASS_SCOPED_LOCAL_INTEGRATED",
  "integratedCompletion": true,
  "legacySha256": {
    "brother": "80be5f14b6187e12f548a97befe58b01ada6f859116ad718c7f3cd346c0558e1",
    "younger": "77508f3fc998ca5402d2a9b633c961e96ad5216a8e22b9fc64db28b13db8da3a",
    "sister": "a4ce41f9b7f2943894510b9c049ec077bda493b441712dcb2742ac57365e4f2d",
    "younger-sister": "e623b6cf0a1033f8e9826cfac293d451e13e8be60c8323797e16b23a6c16fafd"
  }
},
];

export type ReadAdmissionFile = (relative: string) => Buffer;
export const readAdmissionFile: ReadAdmissionFile = relative => {
  assert(relative.startsWith('qa/v652/') || relative.startsWith('public/assets/'), 'unscoped admission file');
  const absolute = path.resolve(ROOT, relative);
  assert(absolute.startsWith(`${ROOT}${path.sep}`), 'admission path escapes root');
  assert.equal(path.relative(ROOT, absolute).split(path.sep).join('/'), relative, 'noncanonical admission path');
  const stat = fs.statSync(absolute);
  assert(stat.isFile() && !(stat.size > 0 && stat.blocks === 0), `missing/dataless admission file: ${relative}`);
  return fs.readFileSync(absolute);
};

// Header dimensions supplement exact byte pins. Existing visual/decode reviews
// remain pinned evidence; this helper does not produce a new visual acceptance.
function dimensions(bytes: Buffer): number[] {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    assert.equal(bytes.toString('ascii', 12, 16), 'IHDR');
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  }
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', 'expected PNG/WebP');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  const kind = bytes.toString('ascii', 12, 16);
  if (kind === 'VP8X') return [bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1];
  if (kind === 'VP8L') {
    assert.equal(bytes[20], 0x2f);
    const packed = bytes.readUInt32LE(21);
    return [(packed & 0x3fff) + 1, ((packed >>> 14) & 0x3fff) + 1];
  }
  assert.equal(kind, 'VP8 '); assert.equal(bytes.subarray(23, 26).toString('hex'), '9d012a');
  return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
}

export function assertV652CurrentDetailAdmission(
  entries: unknown[], options: { readFile?: ReadAdmissionFile } = {},
) {
  const readFile = options.readFile ?? readAdmissionFile;
  const checked = new Map<string, { sha256: string; bytes: Buffer }>();
  function exact(link: Link) {
    assert(link && typeof link.path === 'string' && /^[0-9a-f]{64}$/.test(link.sha256), 'invalid evidence link');
    assert(link.path.startsWith('qa/v652/') || link.path.startsWith('public/assets/'), 'unscoped evidence');
    assert(!link.path.split('/').includes('..'), 'evidence path escape');
    let found = checked.get(link.path);
    if (!found) {
      const bytes = readFile(link.path);
      found = { bytes, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
      checked.set(link.path, found);
    }
    assert.equal(found.sha256, link.sha256, `hash drift: ${link.path}`);
    if (link.size) assert.deepEqual(dimensions(found.bytes), link.size, `image size: ${link.path}`);
    return found.bytes;
  }
  const admittedItemIds = new Set<string>();
  for (const contract of V652_CURRENT_DETAIL_CONTRACTS) {
    const matches = entries.filter(value => (value as Entry).id === contract.itemId);
    assert.equal(matches.length, 1, `missing/duplicate item: ${contract.itemId}`);
    const entry = matches[0] as Entry;
    const mapping = JSON.parse(exact(contract.mapping).toString('utf8')) as Mapping;
    const completion = JSON.parse(exact(contract.completion).toString('utf8')) as Completion;
    assert.equal(mapping.itemId, contract.itemId); assert.equal(completion.itemId, contract.itemId);
    assert.equal(completion.status, contract.completionStatus);
    if (contract.integratedCompletion) {
      const activation = completion as unknown as { freshCompletion: Link; productionDeployed: boolean };
      assert.equal(activation.productionDeployed, false);
      const fresh = JSON.parse(exact(activation.freshCompletion).toString('utf8')) as {
        status: string; mapping: Link; reports: Record<string, Link> | Link[]; reviews?: Link[];
        manifestInterception?: boolean; pinsBeforeEqualAfter?: boolean; allPinsStableAndCurrent?: boolean;
      };
      assert.equal(fresh.status, contract.itemId === 'hair-nebula' ? 'FRESH_PUBLIC_GATE_PASS' : 'PASS_SCOPED_FRESH_INTEGRATED');
      assert.deepEqual(fresh.mapping, contract.mapping);
      if (contract.itemId === 'hair-nebula') {
        assert.equal(fresh.manifestInterception, false); assert.equal(fresh.allPinsStableAndCurrent, true);
      } else assert.equal(fresh.pinsBeforeEqualAfter, true);
      for (const link of Object.values(fresh.reports)) exact(link);
      for (const link of fresh.reviews ?? []) exact(link);
      assert.equal(mapping.nativeMasters?.length, 3);
      for (const link of mapping.nativeMasters!) exact(link);
      assert(mapping.reviewEvidence?.length);
      for (const link of mapping.reviewEvidence!) exact(link);
    } else {
      assert.equal(completion.pairs, 28); assert.deepEqual(completion.finalMap, contract.mapping);
      assert.equal(completion.releaseAcceptance, false, 'scoped acceptance must not become release acceptance');
      assert(completion.limits.length > 0 && completion.evidence.length > 0);
      for (const evidence of completion.evidence) exact(evidence);
      assert(mapping.nativeMaster); exact(mapping.nativeMaster);
    }
    if (contract.technicalReport) {
      assert.equal(mapping.technicalReport, contract.technicalReport.path); exact(contract.technicalReport);
    }
    for (const normalized of mapping.nullMaskNormalization ?? []) {
      exact(normalized.originalMask); assert.equal(normalized.changedCompositePixelCount, 0);
    }
    assert.equal(entry.slot, contract.slot); assert.equal(entry.renderer, 'aligned-overlay');
    assert.deepEqual(entry.supportedAvatars, [...AVATARS]);
    const variants = Object.fromEntries(AVATARS.map(avatar =>
      [avatar, `public/assets/v6.4/runtime/${avatar}/${contract.itemId}.webp`]));
    assert.deepEqual(entry.variants, variants, 'legacy variants changed');
    for (const avatar of AVATARS) exact({ path: variants[avatar], sha256: contract.legacySha256[avatar] });
    assert.equal(Object.hasOwn(entry, 'skinVariants'), false, 'unreviewed skinVariants');
    assert.equal(mapping.pairs.length, 28, 'exact 28-pair admission required');
    const identities = new Set<string>(); const publicPaths = new Set<string>();
    const bases: Record<string, Detail> = {}; const skins: Record<string, Record<string, Detail>> = {};
    for (const row of mapping.pairs) {
      assert(AVATARS.includes(row.avatarId as typeof AVATARS[number]), 'wrong avatar');
      assert(SKINS.includes(row.skinId as typeof SKINS[number]), 'unadmitted skin/Racer');
      const identity = `${row.avatarId}:${row.skinId}`;
      assert(!identities.has(identity), `duplicate pair ${identity}`); identities.add(identity);
      if (contract.slot === 'hair') {
        assert.equal(row.acceptanceStatus, 'ACCEPTED'); assert(row.source && row.sourceMap);
        assert(row.reviewEvidence && row.reviewEvidence.length > 0);
        if (contract.integratedCompletion) {
          const nativeRow = row as Pair & { nativeMaster: Link; rootAcceptanceStatus: string };
          assert.equal(nativeRow.rootAcceptanceStatus, 'PASS_SCOPED_CANDIDATE'); exact(nativeRow.nativeMaster);
        }
        exact(row.source); exact(row.sourceMap); for (const review of row.reviewEvidence) exact(review);
      }
      const detail = row.detail; assert([0, 256].includes(detail.canvasTopPadding), 'padding admission');
      assert.deepEqual(detail.overlay.size, [1024, 1536 + detail.canvasTopPadding]); exact(detail.overlay);
      const suffix = row.skinId === 'base' ? '' : `--${row.skinId}`;
      const extension = path.extname(detail.overlay.path); assert(['.png', '.webp'].includes(extension));
      const overlay = `public/assets/v6.5.2/runtime/${row.avatarId}/${contract.itemId}${suffix}--detail${extension}`;
      assert.equal(row.proposedPublic.overlay, overlay, 'public overlay target');
      assert(!publicPaths.has(overlay), 'duplicate public overlay'); publicPaths.add(overlay);
      exact({ path: overlay, sha256: detail.overlay.sha256, size: detail.overlay.size });
      const admitted: Detail = { overlay, canvasTopPadding: detail.canvasTopPadding };
      if (detail.hairVisibilityMask === null) {
        assert.equal(row.proposedPublic.hairVisibilityMask, null, 'null mask target');
      } else {
        assert(detail.hairVisibilityMask, 'missing mask declaration');
        assert.deepEqual(detail.hairVisibilityMask.size, [1024, 1536]); exact(detail.hairVisibilityMask);
        const mask = `public/assets/v6.5.2/runtime-masks/${row.avatarId}/${contract.itemId}${suffix}--hair-visibility-mask.png`;
        assert.equal(row.proposedPublic.hairVisibilityMask, mask, 'public mask target');
        assert(!publicPaths.has(mask), 'duplicate public mask'); publicPaths.add(mask);
        exact({ path: mask, sha256: detail.hairVisibilityMask.sha256, size: detail.hairVisibilityMask.size });
        admitted.hairVisibilityMask = mask;
      }
      if (row.skinId === 'base') bases[row.avatarId] = admitted;
      else (skins[row.avatarId] ??= {})[row.skinId] = admitted;
    }
    for (const avatar of AVATARS) for (const skin of SKINS) assert(identities.has(`${avatar}:${skin}`));
    assert.deepEqual(entry.defaultSkinDetails, bases, 'base detail admission mismatch');
    assert.deepEqual(entry.skinDetails, skins, 'skin detail admission mismatch');
    const catalog = `public/assets/v6.5.2/catalog/${contract.catalogGroup}/${contract.itemId}.webp`;
    assert.equal(mapping.catalog.proposedPublic, catalog, 'catalog target');
    assert.deepEqual(mapping.catalog.source.size, [512, 512]); exact(mapping.catalog.source);
    assert.equal(entry.catalogPath, catalog, 'catalog admission mismatch');
    exact({ path: catalog, sha256: mapping.catalog.source.sha256, size: [512, 512] });
    admittedItemIds.add(contract.itemId);
  }
  return { detailCount: admittedItemIds.size * 28, admittedItemIds, checkedFileCount: checked.size,
    releaseAcceptance: false as const };
}
