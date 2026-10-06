import { useEffect } from 'react';
import { Award, Check, Coins, Gem, Sparkles, Star, X, Zap } from 'lucide-react';
import AvatarRenderer from '../components/AvatarRenderer';
import GameBadge from '../components/GameBadge';
import { badgeById } from '../badges';
import { useDialogFocusTrap } from '../accessibility';
import { levelFromXp } from '../rewards';
import '../styles/components/reward.css';

export type RewardMoment = {
  id: number;
  childId: string;
  childName: string;
  kind: 'mission' | 'lesson' | 'day' | 'treasure' | 'bonus' | 'level';
  xp: number;
  coins: number;
  stars: number;
  gems: number;
  badgeIds?: string[];
  levelUp?: number;
};

export default function RewardModal({ moment, avatar, onClose }: { moment: RewardMoment; avatar?: { id?: string; xp: number; equippedCosmetics: string[] }; onClose: () => void }) {
  const dialogRef = useDialogFocusTrap<HTMLDivElement>();
  useEffect(() => {
    const timer = window.setTimeout(onClose, moment.kind === 'treasure' || moment.levelUp ? 2600 : 1900);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.clearTimeout(timer); window.removeEventListener('keydown', onKey); };
  }, [moment.id, moment.kind, moment.levelUp, onClose]);

  const badge = moment.badgeIds?.map((id) => badgeById.get(id)).find(Boolean);
  const beforeXp = avatar ? Math.max(0, avatar.xp - Math.max(0, moment.xp)) : undefined;
  const levelBefore = beforeXp !== undefined ? levelFromXp(beforeXp) : moment.levelUp ? Math.max(1, moment.levelUp - 1) : undefined;
  const levelAfter = moment.levelUp ?? (avatar ? levelFromXp(avatar.xp) : undefined);
  const title = moment.kind === 'treasure' ? '寶藏開啟了！' : moment.kind === 'bonus' ? '加碼任務完成！' : moment.levelUp ? '又長大一步！' : moment.kind === 'day' ? '今天的冒險完成！' : '任務完成了！';
  const subtitle = moment.kind === 'treasure'
    ? `${moment.childName} 打開了今天的冒險寶箱！`
    : moment.kind === 'bonus'
      ? `${moment.childName} 完成了今天的特殊加碼任務！`
      : moment.levelUp
        ? `${moment.childName} 升到 Lv.${moment.levelUp}！`
        : `${moment.childName} 完成了一段學習冒險。`;

  return <div ref={dialogRef} className={`v4-reward-scrim v653-reward-ceremony kind-${moment.kind}`} data-learner-id={moment.childId} role="dialog" aria-modal="true" aria-label="學習獎勵">
    <section className="v4-reward-modal v64-reward-with-learner">
      <button className="v4-reward-skip" onClick={onClose} aria-label="略過獎勵動畫"><X/> 略過動畫</button>
      <div className="v64-reward-content">
      <div className={`v64-reward-character v653-reward-portrait`}>{avatar && <AvatarRenderer avatarId={avatar.id} xp={avatar.xp} equippedCosmetics={avatar.equippedCosmetics} size={160} eager />}{!avatar && <img className="v653-reward-medal" src={`${import.meta.env.BASE_URL}assets/v5/badges/special-super-explorer-128.webp`} alt="" />}<span className="v653-reward-seal" aria-hidden="true"><Check /></span></div>
      <span className="v4-reward-kicker">{moment.kind === 'treasure' ? '發現新寶藏' : '每一次努力，都在進步'}</span>
      <h2>{title}</h2>
      <p>{subtitle}</p>
      <div className="v4-reward-resource-grid" data-resource-count={[moment.xp, moment.coins, moment.stars, moment.gems].filter(value => value > 0).length}>
        {moment.xp > 0 && <div><Zap/><strong>+{moment.xp}</strong><span>XP</span></div>}
        {moment.coins > 0 && <div><Coins/><strong>+{moment.coins}</strong><span>金幣</span></div>}
        {moment.stars > 0 && <div><Star/><strong>+{moment.stars}</strong><span>星星</span></div>}
        {moment.gems > 0 && <div><Gem/><strong>+{moment.gems}</strong><span>寶石</span></div>}
      </div>
      {badge && <div className="v4-new-badge"><Award/><span>獲得新徽章</span><GameBadge badge={badge} unlocked size={82} label={false}/><strong>{badge.name}</strong></div>}
      {moment.levelUp && <><div className="v64-level-transition" aria-label={`等級從 ${levelBefore ?? Math.max(1,moment.levelUp-1)} 升到 ${levelAfter ?? moment.levelUp}`}><span>Lv.{levelBefore ?? Math.max(1,moment.levelUp-1)}</span><i><b/></i><strong>Lv.{levelAfter ?? moment.levelUp}</strong>{beforeXp !== undefined && avatar && <small>{beforeXp} XP → {avatar.xp} XP</small>}</div><div className="v4-level-up-banner"><Sparkles/><span>新能力已解鎖</span><strong>Lv.{moment.levelUp}</strong></div></>}
      </div>
      <button className="v4-reward-continue" onClick={onClose}><Check/> 繼續冒險</button>
    </section>
  </div>;
}
