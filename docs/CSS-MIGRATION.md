# CSS Consolidation Migration

## 現況與邊界

V5.3.1 的視覺回歸依賴歷史 CSS cascade，不能為了縮檔一次刪除。自 V6 P0 起：

- `src/main.tsx` 只能載入 `src/styles/index.css`。
- 所有歷史 `styles.css`、`v2.css`、`v22.css`、`v23.css`、`v30.css`、`v40.css` 只能由 `src/styles/legacy-compat.css` 載入，且保留原本順序。
- 新規則只能新增至 `src/styles/` 對應 owner 檔案；不可再向版本號 CSS append。
- `npm run qa:architecture` 是這項邊界的硬 Gate。

## 遷移順序

1. **Foundation**：tokens、reset、accessibility、motion、responsive。
2. **Dashboard**：header、navigation、player、calendar、lesson、reward，逐一移到 `styles/components/`。目前已完成 Lesson Card family 與完整 Header family（含 desktop、tablet、mobile、reduced-motion）；其餘 family 仍由 compatibility layer 提供。
3. **Secondary pages**：semester、achievement、shop、report、parent。
4. **Compatibility removal**：每次移除一個 selector family 前，必須通過 Browser QA、資產 QA、strict type check 與視覺人工複核。

## 不可改動的相容項目

- `v4-*` 的 localStorage／reward transaction ID 是歷史資料格式，不得因 class naming 清理而改寫。
- V1–V4 遷移、family namespace、append-only ledger 與日期 guard 必須維持可讀。
- 對外元件與使用者可見版本名稱不再使用 V4；舊檔案與 selector 會分階段遷移。
