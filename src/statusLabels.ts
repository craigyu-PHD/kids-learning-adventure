/** Presentation of the existing cloud state. This never infers sync from time. */
export function cloudStatusLabel(status: string) {
  switch (status) {
    case 'synced': return '雲端已同步';
    case 'saving': return '同步中';
    case 'loading': return '讀取雲端';
    case 'error': return '雲端待重試';
    case 'local': return '本機模式';
    default: return '同步狀態待確認';
  }
}
