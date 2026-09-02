import fs from 'node:fs';
import path from 'node:path';
import manifest from '../src/data/avatarAssetManifest.json';
import { cosmetics } from '../src/cosmetics';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'qa', 'visual-audit', '2026-09-02-v64', 'art-acceptance.json');
const AVATARS = ['brother', 'younger', 'sister', 'younger-sister'] as const;
const wearableSlots = new Set(['outfit','hairstyle','hat','glasses','headphones','backpack','cape']);
const worldSlots = new Set(['spaceship','room','robot','card','effect']);
const runtimeById = new Map<string, any>();
for (const entry of manifest.accessories) runtimeById.set(entry.id, entry);
for (const entry of manifest.skins) runtimeById.set(entry.id, entry);

const scoreTemplate = {
  characterIdentity: null,
  anatomy: null,
  equipmentAlignment: null,
  lightingConsistency: null,
  materialQuality: null,
  occlusion: null,
  visualAppeal: null,
  childAppeal: null,
  rarityReadability: null,
  overallPolish: null,
};

const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { records: [], worldRecords: [] };
const previousWearable = new Map((previous.records ?? []).map((r: any) => [`${r.itemId}:${r.avatarId}`, r]));
const previousWorld = new Map((previous.worldRecords ?? []).map((r: any) => [r.itemId, r]));

const records: any[] = [];
for (const item of cosmetics.filter((item) => wearableSlots.has(item.slot))) {
  const runtime = runtimeById.get(item.id);
  for (const avatarId of AVATARS) {
    const key = `${item.id}:${avatarId}`;
    const old: any = previousWearable.get(key) ?? {};
    const runtimeLayer = runtime?.variants?.[avatarId] ?? runtime?.assets?.[avatarId] ?? null;
    records.push({
      itemId: item.id,
      itemName: item.name,
      slot: item.slot,
      avatarId,
      masterReference: `public/assets/v5/characters/${avatarId}/wardrobe/base-body.png`,
      heroComposite: `public/assets/v6.4/hero-composites/${avatarId}/${item.id}.webp`,
      runtimeLayer,
      imageGenerationEvidence: old.imageGenerationEvidence ?? null,
      visualScores: { ...scoreTemplate, ...(old.visualScores ?? {}) },
      previewPass: old.previewPass ?? null,
      combinationPass: old.combinationPass ?? null,
      productionUrlPass: old.productionUrlPass ?? null,
      reviewerNotes: old.reviewerNotes ?? '',
      status: old.status ?? 'PENDING',
    });
  }
}

const worldRecords: any[] = [];
for (const item of cosmetics.filter((item) => worldSlots.has(item.slot))) {
  const old: any = previousWorld.get(item.id) ?? {};
  worldRecords.push({
    itemId: item.id,
    itemName: item.name,
    slot: item.slot,
    masterReference: null,
    heroArt: `public/assets/v6.4/world/${item.slot}/${item.id}.webp`,
    imageGenerationEvidence: old.imageGenerationEvidence ?? null,
    visualScores: { ...scoreTemplate, ...(old.visualScores ?? {}) },
    previewPass: old.previewPass ?? null,
    productionUrlPass: old.productionUrlPass ?? null,
    reviewerNotes: old.reviewerNotes ?? '',
    status: old.status ?? 'PENDING',
  });
}

const payload = {
  version: '6.4-art-acceptance-v1',
  generatedAt: new Date().toISOString(),
  sourceMasterContract: 'Original website character base-body.png is the mandatory identity reference for every wearable Hero Composite.',
  requiredVisualMinimum: 8,
  requiredOverallMinimum: 8.5,
  wearableRecordCount: records.length,
  expectedWearableRecordCount: 48 * 4,
  worldRecordCount: worldRecords.length,
  records,
  worldRecords,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');
console.log(`Wrote ${path.relative(ROOT, OUT)}: wearables=${records.length}, world=${worldRecords.length}`);
