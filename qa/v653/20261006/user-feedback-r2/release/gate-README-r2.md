# Gate R2：四款保留耳機精確配對、prebuild／final-output

本文件補充 R1 `gate-README.md`；R1 freeze 與 validator/prebuild 原件均另存，未覆寫。R2 尚非候選發布 PASS。

## 1. 精確擴充範圍

只有 `phones-racer`、`phones-ai`、`story-headphones`、`phones-legend` 可在 r6 原 accessory record 上增加：

```json
{
  "requiredHairstyleFits": ["hair-nebula"],
  "hairstyleSplitVariants": {
    "hair-nebula": {
      "brother": {
        "default": {"back":"public/assets/v6.5.3/NEW_NATIVE_BACK.webp","front":"EXACT_OLD_FRONT_PATH"}
      }
    }
  }
}
```

實際須完整四角色×八skin；只能有 back/front，不能有第二種髮型。`front` 必須直接引用 r6 原 role/skin 的 front path，且 public bytes 等於 r6；不接受換檔同名。back 必須新 v6.5.3 配對資產。原 catalog、default/skin back/front、renderer、slot、supportedAvatars 與其他 metadata 逐欄完全不變。新 back 仍逐檔走 native→runtime lineage。

新增 mandatory compiled groups：

- `retainedEarwearHairFit`：128 rows，values = role、skin、itemSet（排序的 `hair-nebula+earphone-id`）。checks = sameBodySize、correctLayers、noMissingAssets、frontPreserved，全部指向真 raw boolean。
- `retainedEarwearHairVisual`：同128 rows，checks = accepted；独立reviewer、圖片SHA binding與review notes沿用原規則。

原 480 fit、480 visual、80 workflow、1024 shop rows，以及其他所有 gate 完整保留。新增四款不是全面重製造型或擴大 avatar manifest 白名單。

## 2. 兩個 phase

### prebuild（預設，永遠不可部署）

```sh
python3 -B scripts/qa_v653_feedback_release.py \
 --phase prebuild --index <same-index.json> --expected-index-sha <sha> \
 --negative-controls --out qa/v653/20261006/user-feedback-r2/release/gate-prebuild-r2-result.json
```

完整 sources/public/protected15、manifest lineage、所有 compiled runtime／獨立 visual／voice／core／strict／performance、受測 dist exact checks 全部執行。只把尚未產生的 `.vercel/output` 檢查放到下一階段。新 npm prebuild 分支明確指定此 phase，仍執行15個真 index負例，結果為 `PASS_PREBUILD_NOT_DEPLOYABLE` 且 `deployable:false`。不得略過 npm lifecycle。

### 正常 Vercel build

照常執行實際 CLI `build --prod`，保留 npm prebuild。CLI 可先清 `.vercel/output`，然後重建 dist/static/functions。此步退出0不等於可部署；若新 dist bytes 與受測 artifact 不同，必須重新處理，不可更新artifact pins直接冒稱舊QA仍適用。

### final-output

```sh
python3 -B scripts/qa_v653_feedback_release.py \
 --phase final-output --index <same-index.json> --expected-index-sha <same-sha> \
 --vercel-output-receipt <output-receipt.json> --expected-output-sha <receipt-sha> \
 --negative-controls --out qa/v653/20261006/user-feedback-r2/release/gate-final-output-r2-result.json
```

使用同一個 index，不為事後 functions pins 改寫 index。重新執行所有 prebuild 檢查；dist 與新 static 必須逐檔 exact 等於受測 artifact map。routing/config 必須等於 r6；六個 expected functions 目錄不可缺少或多出，全部檔案對完整functionPins。核對handler、runtime=nodejs24.x、.vc-config SHA、handler SHA，並逐個 API source map 的 sourcesContent SHA 對 protected API source。receipt、CLI package、實際 lifecycle log、exit0、時間與來源都綁定。

只有 `--negative-controls --phase final-output` 全通過，才輸出 `PASS_FINAL_OUTPUT_ADMISSION_NOT_DEPLOYED` 與 `deployable:true`。未加負例模式的單次 final-output 檢查即使全綠，也只回 `PASS_FINAL_OUTPUT_CHECKS_CONTROLS_PENDING`、`deployable:false`。這些欄位不取代使用者發布授權，工具不部署。

## 3. Output receipt v1

下列 REF 一律 `{path,sha256}`，存於repo內。CLI package可複製實際使用CLI的package.json為證据，不能從版本字串自行捏造。

```json
{
 "schemaVersion":1,
 "kind":"little-explorers-vercel-output",
 "index":"REF to exact same prebuild index",
 "sourcePins":"same REF as index",
 "publicPins":"same REF as index",
 "artifactPins":"same REF as tested candidate build",
 "stageRoot":"absolute same stage",
 "target":"production",
 "builder":{
   "command":["node","ABS_CACHED_VERCEL_CLI","build","--prod"],
   "exitCode":0,
   "startedAt":"ISO8601 timezone",
   "completedAt":"ISO8601 timezone",
   "cliVersion":"actual version",
   "cliPackage":"REF to actual CLI package.json",
   "log":"REF to actual complete Vercel build log"
 },
 "configSHA256":"SHA of stage/.vercel/output/config.json",
 "functionPins":"REF to map of every file relative to output/functions",
 "functionBindings":{
  "api/state.func":{
   "sourcePath":"api/state.ts",
   "sourceSHA256":"protected source SHA",
   "handler":"api/state.js",
   "handlerSHA256":"SHA of output/functions/api/state.func/api/state.js",
   "configSHA256":"SHA of output/functions/api/state.func/.vc-config.json"
  }
 }
}
```

functionBindings 必須完整六筆：family-auth、family-session、server-time、state-guards、state、time。所有 function 內 dependency 檔亦必須列入 functionPins；不是只有六個handler。

Python：`validate(index_path, expected_sha, phase='prebuild', output_ref=None)`；`negatives(index_path,out,expected_sha,phase='prebuild',output_ref=None)`。final-output 的 output_ref 是receipt `{path,sha256}`；缺receipt必FAIL。單次 validate 永遠不給deployable=true。

## 4. 本輪驗證與邊界

`gate-r2-unit-result.json`：31項unit檢查，包括正確精確metadata接受、10種越權/缺資料配對拒收、front SHA變動拒收、原矩陣不變、六functions/source-map形狀及錯handler/config/bytes拒收。另以明標 UNIT ONLY 的 tiny dist證明prebuild可在output尚不存在時檢查dist；不是發布候選。

正式15個 index負例 + 9個 final-output receipt負例需完整真候選先通過，現在尚未跑，不能宣稱PASS。新 group缺失、舊runtime/visual不相符、缺output、缺functions、stale artifact皆FAIL。獨立 renderer wrong-avatar/missing-layer/swapped/stale實測仍是另外mandatory gate，不能用index mutations抵充。

舊版本保留：gate-validator-r1-frozen.py、gate-prebuild-r1-frozen.py、gate-freeze.json。CURRENT-RELEASE、runtime、asset、stage與部署均未由此任務修改。
