/** Check all configured TypeScript inputs; frozen V6.4 QA uses its own manifest types. */
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const historicalManifest = path.join(root, 'qa/v653/20261005/recovery/avatarAssetManifest.frozen-production.json');
const expectedManifest = '1414e4226a2ecd5599da579711df7096dc893416c73c6c6ccf8f3f961fdbd622';
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
if (hash(historicalManifest) !== expectedManifest) throw new Error('Historical manifest changed');
const originalGate = path.join(root, 'scripts/qa_v64_runtime_details.ts');
const pins = JSON.parse(fs.readFileSync(path.join(root, 'qa/v653/20261005/release-art/legacy-gate-pins.json'), 'utf8'));
if (hash(originalGate) !== pins['scripts/qa_v64_runtime_details.ts']) throw new Error('Archived gate changed');
const configFile = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
if (configFile.error) throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root, {
  noEmit: true, noUnusedLocals: true, noUnusedParameters: true,
});
const host = ts.createCompilerHost(config.options);
host.resolveModuleNames = (names, containingFile) => names.map(name => {
  // This historical gate is archived against V6.4 and is never used to admit
  // native V6.5.3 art. Only its direct JSON import resolves to its frozen input.
  if (path.resolve(containingFile) === originalGate && name === '../src/data/avatarAssetManifest.json') {
    return { resolvedFileName: historicalManifest, extension: ts.Extension.Json };
  }
  return ts.resolveModuleName(name, containingFile, config.options, host).resolvedModule;
});
const program = ts.createProgram(config.fileNames, config.options, host);
const diagnostics = [...config.errors, ...ts.getPreEmitDiagnostics(program)];
const output = process.argv[2] ?? 'qa/v653/20261005/build/strict-formal-r3/result.json';
const result = {
  status: diagnostics.length ? 'FAIL' : 'PASS_CURRENT_AND_ARCHIVED_TYPECHECK',
  roots: config.fileNames.length, noEmit: true, noUnusedLocals: true, noUnusedParameters: true,
  historicalGateTypeInput: { path: path.relative(root, historicalManifest), sha256: expectedManifest },
  historicalGate: { path: path.relative(root, originalGate), sha256: hash(originalGate) },
  currentManifestSha256: hash(path.join(root, 'src/data/avatarAssetManifest.json')),
  diagnostics: diagnostics.map(d => ({file:d.file ? path.relative(root,d.file.fileName) : null,
    message:ts.flattenDiagnosticMessageText(d.messageText,'\n'),code:d.code})),
  limits:['typecheck only','historical gate not executed','no old acceptance claim'],
};
const target = path.resolve(root, output);
if (!target.startsWith(path.join(root,'qa/v653/20261005/build/'))) throw new Error('Owned build output required');
fs.mkdirSync(path.dirname(target), {recursive:true});
fs.writeFileSync(target, JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,roots:result.roots,diagnostics:result.diagnostics}));
process.exitCode = diagnostics.length ? 1 : 0;
