import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { curriculum } from '../src/data/curriculum';
import { videos } from '../src/data/videos';
import { cosmetics } from '../src/cosmetics';

const root = resolve(import.meta.dirname, '..');
const count = (path: string, extension: string) => readdirSync(resolve(root, path)).filter((file) => file.endsWith(extension)).length;
const taipeiDate = () => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
};

const shopSourceDir = resolve(root, 'public/assets/v5/items');
const shopSourceFiles = readdirSync(shopSourceDir)
  .filter((file) => ['.webp', '.png'].includes(extname(file).toLowerCase()))
  .sort();
const sourceBindings = shopSourceFiles.map((file) => ({ itemId: basename(file, extname(file)), path: `public/assets/v5/items/${file}` }));
const semanticSourceIds = [...new Set(sourceBindings.map((binding) => binding.itemId))].sort();
const catalogIds = cosmetics.map((item) => item.id);

const avatarManifest = JSON.parse(readFileSync(resolve(root, 'src/data/avatarAssetManifest.json'), 'utf8')) as {
  skins?: Array<{ skinId?: string; avatarId?: string; path?: string }>;
  accessories?: Array<Record<string, unknown> & { id?: string }>;
};
const worldManifest = JSON.parse(readFileSync(resolve(root, 'src/data/worldArtManifest.json'), 'utf8')) as {
  records?: Array<{ itemId?: string; delivery?: { path?: string } }>;
};
const avatarRuntimeIds = new Set<string>();
for (const row of avatarManifest.skins ?? []) if (row.skinId && row.skinId !== 'default') avatarRuntimeIds.add(row.skinId);
for (const row of avatarManifest.accessories ?? []) if (row.id) avatarRuntimeIds.add(row.id);
const worldRuntimeIds = new Set((worldManifest.records ?? []).flatMap((row) => row.itemId ? [row.itemId] : []));
const runtimeIds = [...new Set([...avatarRuntimeIds, ...worldRuntimeIds])].sort();

function semanticContractFailures(catalog: string[], sources: Array<{ itemId: string; path: string }>, runtimes: string[]) {
  const failures: string[] = [];
  const duplicateCatalog = catalog.filter((id, index) => catalog.indexOf(id) !== index);
  if (duplicateCatalog.length) failures.push(`duplicate catalog ids: ${[...new Set(duplicateCatalog)].join(',')}`);
  const catalogSet = new Set(catalog);
  const sourceIds = new Set(sources.map((binding) => binding.itemId));
  const runtimeSet = new Set(runtimes);
  const missingSources = [...catalogSet].filter((id) => !sourceIds.has(id));
  const orphanSources = [...sourceIds].filter((id) => !catalogSet.has(id));
  const missingRuntime = [...catalogSet].filter((id) => !runtimeSet.has(id));
  const orphanRuntime = [...runtimeSet].filter((id) => !catalogSet.has(id));
  const wrongSourceBindings = sources.filter((binding) => basename(binding.path, extname(binding.path)) !== binding.itemId);
  if (missingSources.length) failures.push(`missing source ids: ${missingSources.join(',')}`);
  if (orphanSources.length) failures.push(`orphan source ids: ${orphanSources.join(',')}`);
  if (missingRuntime.length) failures.push(`missing runtime ids: ${missingRuntime.join(',')}`);
  if (orphanRuntime.length) failures.push(`orphan runtime ids: ${orphanRuntime.join(',')}`);
  if (wrongSourceBindings.length) failures.push(`wrong source bindings: ${wrongSourceBindings.map((row) => `${row.itemId}->${row.path}`).join(',')}`);
  return failures;
}

const contractFailures = semanticContractFailures(catalogIds, sourceBindings, runtimeIds);
const firstId = catalogIds[0];
const secondId = catalogIds[1];
const negativeControls = {
  duplicateCatalogRejected: semanticContractFailures([...catalogIds, firstId], sourceBindings, runtimeIds).some((failure) => failure.startsWith('duplicate catalog ids')),
  missingRuntimeRejected: semanticContractFailures(catalogIds, sourceBindings, runtimeIds.filter((id) => id !== firstId)).some((failure) => failure.startsWith('missing runtime ids')),
  orphanSourceRejected: semanticContractFailures(catalogIds, [...sourceBindings, { itemId: '__orphan__', path: 'public/assets/v5/items/__orphan__.webp' }], runtimeIds).some((failure) => failure.startsWith('orphan source ids')),
  wrongBindingRejected: semanticContractFailures(catalogIds, sourceBindings.map((binding) => binding.itemId === firstId ? { ...binding, path: `public/assets/v5/items/${secondId}.webp` } : binding), runtimeIds).some((failure) => failure.startsWith('wrong source bindings')),
};

const runtimeMissingFiles: string[] = [];
for (const row of avatarManifest.skins ?? []) {
  if (!row.skinId || row.skinId === 'default' || !row.path) continue;
  const path = resolve(root, row.path);
  if (!existsSync(path) || statSync(path).size <= 0) runtimeMissingFiles.push(row.path);
}
for (const row of worldManifest.records ?? []) {
  const pathValue = row.delivery?.path;
  if (!pathValue) continue;
  const path = resolve(root, pathValue);
  if (!existsSync(path) || statSync(path).size <= 0) runtimeMissingFiles.push(pathValue);
}

const items = [
  ['learningDays', '學習日', curriculum.length, 90],
  ['lessons', '課程單元', curriculum.flatMap((day) => day.blocks).length, 180],
  ['missions', '互動任務', curriculum.flatMap((day) => day.blocks).flatMap((block) => block.missions).length, 360],
  ['videos', '影片指派', Object.keys(videos).length, 360],
  ['vocabulary', '單字教材圖', count('public/assets/v5/vocab', '.webp'), 150],
  ['badges', '成就徽章', count('public/assets/v5/badges', '.webp') - count('public/assets/v5/badges', '-128.webp'), 24],
  ['shopItems', '商店商品', semanticSourceIds.length, 63],
  ['animations', '互動動畫', count('public/assets/v5/animations', '.webm') + count('public/assets/v5/rewards', '.webm'), 6],
] as const;
const generated = `/** Generated by scripts/content_health_manifest.ts. Do not hand-edit. */\nexport const contentHealthManifest = {\n  checkedOn: '${taipeiDate()}',\n  items: [\n${items.map(([id, label, actual, expected]) => `    { id: '${id}', label: '${label}', actual: ${actual}, expected: ${expected}, status: ${actual === expected ? "'pass'" : "'fail'"} },`).join('\n')}\n  ],\n} as const;\n`;
const target = resolve(root, 'src/generated/contentHealthManifest.ts');
const qaDir = resolve(root, '.qa');
mkdirSync(qaDir, { recursive: true });
const evidencePath = resolve(qaDir, 'content_health_contract.json');
const evidence = {
  schemaVersion: 2,
  status: contractFailures.length === 0 && runtimeMissingFiles.length === 0 && Object.values(negativeControls).every(Boolean) ? 'PASS' : 'FAIL',
  checkedOn: taipeiDate(),
  catalog: { count: catalogIds.length, uniqueCount: new Set(catalogIds).size },
  source: { physicalFileCount: shopSourceFiles.length, semanticIdCount: semanticSourceIds.length, duplicateFormats: semanticSourceIds.filter((id) => sourceBindings.filter((binding) => binding.itemId === id).length > 1) },
  runtime: { semanticIdCount: runtimeIds.length, avatarRuntimeIdCount: avatarRuntimeIds.size, worldRuntimeIdCount: worldRuntimeIds.size, missingFiles: runtimeMissingFiles },
  failures: contractFailures,
  negativeControls,
};
writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n', 'utf8');

if (process.argv.includes('--check')) {
  if (!existsSync(target) || readFileSync(target, 'utf8') !== generated) {
    throw new Error('Content health manifest is stale. Run npm run content-health:sync and commit the result.');
  }
  if (items.some(([, , actual, expected]) => actual !== expected)) throw new Error('Content health counts do not meet the production baseline.');
  if (evidence.status !== 'PASS') throw new Error(`Shop semantic content contract failed: ${JSON.stringify(evidence)}`);
  console.log(`Content health QA: PASS (${semanticSourceIds.length} semantic Shop IDs / ${shopSourceFiles.length} physical source files; runtime ${runtimeIds.length}/63; negative controls PASS)`);
} else {
  writeFileSync(target, generated, 'utf8');
  console.log(`Content health manifest refreshed: ${target}`);
  console.log(`Shop semantic contract: ${evidence.status} (${semanticSourceIds.length} semantic IDs / ${shopSourceFiles.length} physical files)`);
}
