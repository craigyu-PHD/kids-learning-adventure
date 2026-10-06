# Feedback candidate admission — 組裝契約

這個 gate 尚未代表候選通過。`gate-contract-r2.json` 是固定 coverage 規格；下次執行 `--contract` 可取得最新版。舊 r6 validator、原始證據、CURRENT-RELEASE、3738 public bytes 不變。只新增 prebuild kind 分支。

## CLI / Python API

```sh
python3 -B scripts/qa_v653_feedback_release.py --contract --out qa/v653/20261006/user-feedback-r2/release/gate-contract-final.json
python3 -B scripts/qa_v653_feedback_release.py --inventory --out qa/v653/20261006/user-feedback-r2/release/gate-inventory-final.json
python3 -B scripts/qa_v653_feedback_release.py --index <index-relative-path> --expected-index-sha <sha256> --out qa/v653/20261006/user-feedback-r2/release/gate-admission-final.json
python3 -B scripts/qa_v653_feedback_release.py --index <index-relative-path> --expected-index-sha <sha256> --negative-controls --out qa/v653/20261006/user-feedback-r2/release/gate-controls-final.json
```

所有輸出採 exclusive-create：不能覆寫舊檔。`validate(index_path, expected_sha=None)`、`contract()`、`inventory()`、`publication_scope(sources, live_public)`、`link(path)` 可用 `importlib.util.spec_from_file_location` 匯入。`inventory()` 回傳 root runtime/build source 與全部 local public；`publication_scope` 閉合推導 admitted public、unpublished records、literal references。`--inventory` 合併輸出，不表示 admission。

Gate 與 prebuild freeze 後才建立 toolPins。sourcePins 是真正 runtime/build inputs：所有 src/api 檔（排除 `.DS_Store`），原有 package、lock、index、vite、tsconfig。三支 gate/prebuild 另列 toolPins；不進 compiled source fingerprint。QA runner 隨各證據 ref 固定，不用後补 QA 檔重建 bundle。

## 共通 ref / assertion

ref 必須剛好 `{ "path": "repo-relative/path", "sha256": "64 lowercase hex" }`。不能指向 repo 外。所有 ref 都讀真實 bytes、驗 SHA；沒有 index-only PASS。

assertion：`{ "ref": ref, "pointer": "/JSON/pointer", "equals": expectedValue }`。一般 assertion exact-type equality；case checks 的 equals 必須是布林 true。失敗或缺失值不能以「report status PASS」覆蓋。

## Index v1

```json
{
  "schemaVersion": 1,
  "kind": "little-explorers-feedback-release",
  "sourcePins": "REF to path->SHA map",
  "baselineAvatarManifest": "REF to exact published r6 avatar manifest bytes",
  "toolPins": "REF to 3 gate/prebuild path->SHA map",
  "publicPins": "REF to admitted public path->SHA map",
  "unpublishedLocalFiles": "REF to path->{sha256,reason,status:UNPUBLISHED_LOCAL_FILE}",
  "sourceReviews": { "each changed baseline source path": "REF to source review" },
  "assetLineage": { "each new admitted public path": "asset record below" },
  "build": "REF to build receipt below",
  "evidence": { "every contract group name": ["REF to one or more group reports"] },
  "audio": "audio object below",
  "strict": { "assertion": "true assertion", "sourcePins": "same full source map REF", "runner": "REF" },
  "performance": { "lighthouse": "REF to real desktop Lighthouse JSON", "artifactPins": "same compiled REF" },
  "carry": [],
  "limitations": ["No physical mobile acceptance", "No real family cloud writes", "No all-clips human auditory acceptance", "No commit or push"]
}
```

上述帶引號的 REF 說明須換成 ref object。`sourceReviews` 每項為 `{path,beforeSHA256,afterSHA256,decision:"ACCEPT",reviewer,reason,diff:ref}`，綁定實際 source diff。白名單只容許範圍，不替代差異審查。Avatar manifest 除五個指定 item 外逐筆與 r6 原件比較；skin、base display、contract、其他 accessory、五件商品的 slot 與 supported roles 均不可漂移。prebuild 用固定舊 SHA 驗證刪除新分支後完整 bytes 仍為 r6；舊 validator SHA 必須不變。

### Public 閉合

固定原 3738 檔 + current authoritative avatar/world manifest 中的 public paths + speech manifest 514 個 AAC + `lesson-speech-provenance.json` + `KOKORO_LICENSE.txt`。新增僅允許 v6.5/audio、v6.5.3。不得自行挑漏引用。其他 local public 全保留、不刪，列 unpublished SHA/原因；若被 current src literal 引用則 FAIL。stage public 必須 exact=admitted closure。root 的本機 orphan 無須複製到 stage；stage gate 可讀原 exclusions record，並拒絕 exclusions 回到 compiled public。

asset record：`{sha256, kind:"audio"|"headwear"|"support", native:ref, provenance:ref, assertions:[assertion], manifest:{ref,pointer}}`。runtime manifest ref 必須是 sourcePins 內的正式 source；pointer 值須等於 public path、/assets path 或精確 filename。support 只允許 audio provenance/license，需 reason，免 manifest；native/source 與 transform/assertion 仍必填。每個新檔逐一驗證，不接受只列 bundle 總 SHA。

### Compiled receipt

```json
{"status":"PASS","exitCode":0,"completedAt":"ISO8601 with timezone","sourcePins":{},"publicPins":{},"artifactPins":{},"log":{},"stageRoot":"absolute isolated stage path"}
```

四個空物件替換 ref。stage 必須在 `~/.codex/project-runtime`，不得指向舊 r6。逐檔比較 stage source、stage public、dist、`.vercel/output/static`，兩個 compiled 樹完整一致；public 同 admitted SHA。gate 只讀，不 build。

各 compiled evidence report 另需 `servedArtifacts` ref，真 HTTP 採樣格式：`{status:"PASS",baseURL:"http://...",files:{"assets/index-XYZ.js":"SHA",...}}`，至少含 artifactPins 所有非 public 生成檔（JS/CSS/index 等）。不是寫上 artifact ref 就當實際讀到新 bundle。每組 observedAt 必須晚於 completedAt。

## Group report / case

```json
{
 "group":"headwearFit", "mode":"fresh", "status":"PASS", "observedAt":"ISO8601 timezone",
 "sourcePins":{}, "runner":{}, "artifactPins":{}, "servedArtifacts":{},
 "cases":[{
   "values":{"role":"brother","skin":"default","itemSet":"hair-nebula"},
   "raw":{},
   "bindings":{"role":"/rows/0/role","skin":"/rows/0/skin","itemSet":"/rows/0/itemSet"},
   "checks":{"sameBodySize":{"ref":{},"pointer":"/rows/0/sameBodySize","equals":true},"correctLayers":{"ref":{},"pointer":"/rows/0/correctLayers","equals":true},"noMissingAssets":{"ref":{},"pointer":"/rows/0/noMissingAssets","equals":true}}
 }]
}
```

所有空物件替換 ref。raw 必須與 adapter report 不同檔。每個 values 欄位都回查 raw；固定 contract expected rows 必須 exact match、不得缺漏或重複。checks 名稱也固定 exact match。需要 adapter 時不得重新宣告 PASS 代替實際觀測；保留 immutable raw，逐欄連結既有 boolean 斷言。可將多份真實測試拆多個 report refs，合併 coverage。

binding 預設是 JSON pointer。三個明確轉換可銜接舊資料：`{transform:"string",pointer:"/stage"}`；`{transform:"sorted-plus",pointer:"/itemIds"}`；`{transform:"join",pointers:["/width","/theme"],separator:"-"}`。不能任意執行運算或把常數當 raw identity。

sourcePins 至少涵蓋 gate 中每個 domain 的固定依賴，也可全 runtime map。所有 listed dependency 都須等於現在 candidate；stale report 不能只改 index 就承接。core 可 source-bound，其餘 mandatory groups 必須 compiled-bound。每個 runner 單獨 ref 固定。

visual report 另需 `reviewer`、`runtimeOperator` 且不得相同。case 另有 `images:[ref]`、`imageAssertions:[{ref,pointer,equals:imageSHA256}]`、`reviewNotes`。每張被審 image 的 SHA 必須出現在獨立 review raw 內，回查 accepted=true。可用 contact sheet 批次審查480配置，但每個配置有自己的原始身份與判斷；圖片、報告、原始身份不能互相替代。

固定組數可直接讀 `contract()['groups']`。480 = 15配置 ×4角色×8skin；80 workflow 與1024全商店為不同測試，不能相互抵數。headwearNegative 必须是 actual renderer 的 wrong-avatar/missing-layer/swapped-item/stale-candidate 四個拒收結果；`--negative-controls` 的 index mutations 不能替代。

## Audio

```json
{"renderedCorpus":{},"http":{},"corpus":{},"decoded":{},"selectedSample":{},"humanAuditoryAcceptance":"selected-slow-sample-only"}
```

renderedCorpus 用既有 `voice-reward/rendered-corpus.json` schema；http 用 http-result.json schema。逐句驗 text/textSHA/mode/file/voice/speed/native WAV SHA/HTTP200/audio/mp4/AAC SHA，514鍵 exact-match current speech manifest。decoded、corpus、selectedSample 分別直接引用既有 corpus-verification.json、corpus.json、selected-sample-preservation.json，gate 逐項核對真正 decoded measurements、curriculum/formatter SHA、每句 uses，以及使用者所選原始 WAV 的固定 SHA。voiceBrowser 11 cases另需同compiled实际播放證據。不得宣稱257句逐句人耳通過。

## 負例與發布界線

`--negative-controls` 先跑真實完整 index；基線未通過即 FAIL_CONTROLS_BASELINE_NOT_ADMITTED，不製造替代 PASS fixture。基線通過後才產出13個真 index / report mutations，含 stale source map、old artifacts、wrong avatar、missing layer check、swapped item、false pass、missing native/raw/visual 等。每個都寫證據並必須拒收。新 prebuild 分支直接用此模式，同時驗正例與13負例。原分支完全保留。

原 r6 evidence 可列 `carry:[{mode:"byte-dependency-carry-not-fresh",scope,report:ref,sourcePins:ref}]`，逐一驗 dependency 未變；不能拿來填 mandatory fresh groups。正式部署與部署後 HTTP/隔離 runtime 驗證仍由 root 負責，本 gate 不執行、不假稱。
