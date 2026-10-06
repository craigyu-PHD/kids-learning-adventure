import type { AppSettings } from '../types';

export default function DailyParticipants({ children, selectedIds, editable, onChange }: {
  children: AppSettings['children'];
  selectedIds: string[];
  editable: boolean;
  onChange: (childId: string, selected: boolean) => void;
}) {
  const learners = children.filter(child => !child.disabled);
  return <fieldset className="v64-daily-participants" disabled={!editable}>
    <legend>今天誰一起上課？</legend>
    <p>{editable ? '勾選今天參與的孩子，兩堂課共用這份名單；已留下的紀錄會保留。' : '日期確認為今天後，才能調整參與名單。'}</p>
    <div>{learners.map(child => <label key={child.id}>
      <input type="checkbox" checked={selectedIds.includes(child.id)} onChange={event => onChange(child.id, event.target.checked)} />
      <span>{child.name}</span>
    </label>)}</div>
    <p role="status">{selectedIds.length ? `今天 ${selectedIds.length} 位孩子參與` : '尚未選擇孩子，可以先看教材；勾選後再開始記錄學習。'}</p>
  </fieldset>;
}
