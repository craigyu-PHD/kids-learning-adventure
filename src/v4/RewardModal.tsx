import { useEffect } from 'react';
import { Award, Check, Coins, Gem, Gift, Rocket, Sparkles, Star, Trophy, X, Zap } from 'lucide-react';
import GameBadge from '../components/GameBadge';
import { badgeById } from '../badges';

export type V4RewardMoment = {
  id: number;
  childName: string;
  kind: 'mission' | 'lesson' | 'day' | 'treasure' | 'bonus' | 'level';
  xp: number;
  coins: number;
  stars: number;
  gems: number;
  badgeIds?: string[];
  levelUp?: number;
};

export default function RewardModal({ moment, onClose }: { moment: V4RewardMoment; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, moment.kind === 'treasure' || moment.levelUp ? 2600 : 1900);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.clearTimeout(timer); window.removeEventListener('keydown', onKey); };
  }, [moment.id, moment.kind, moment.levelUp, onClose]);

  const badge = moment.badgeIds?.map((id) => badgeById.get(id)).find(Boolean);
  const title = moment.kind === 'treasure' ? 'TREASURE OPEN!' : moment.kind === 'bonus' ? 'BONUS COMPLETE!' : moment.levelUp ? 'LEVEL UP!' : moment.kind === 'day' ? 'PERFECT ADVENTURE!' : 'MISSION COMPLETE!';
  const subtitle = moment.kind === 'treasure'
    ? `${moment.childName} 打開了今天的冒險寶箱！`
    : moment.kind === 'bonus'
      ? `${moment.childName} 完成了今天的特殊加碼任務！`
      : moment.levelUp
        ? `${moment.childName} 升到 Lv.${moment.levelUp}！`
        : `${moment.childName} 完成了一段學習冒險。`;

  return <div className={`v4-reward-scrim kind-${moment.kind}`} role="dialog" aria-modal="true" aria-label="學習獎勵">
    <div className="v4-reward-particles" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i}/>)}</div>
    <section className="v4-reward-modal">
      <button className="v4-reward-skip" onClick={onClose} aria-label="略過獎勵動畫"><X/> Skip</button>
      <div className="v4-reward-emblem">{moment.kind === 'treasure' ? <Gift/> : moment.levelUp ? <Rocket/> : <Trophy/>}</div>
      <span className="v4-reward-kicker">{moment.kind === 'treasure' ? 'SPECIAL REWARD' : 'ADVENTURE REWARD'}</span>
      <h2>{title}</h2>
      <p>{subtitle}</p>
      <div className="v4-reward-resource-grid">
        {moment.xp > 0 && <div><Zap/><strong>+{moment.xp}</strong><span>XP</span></div>}
        {moment.coins > 0 && <div><Coins/><strong>+{moment.coins}</strong><span>Coins</span></div>}
        {moment.stars > 0 && <div><Star/><strong>+{moment.stars}</strong><span>Stars</span></div>}
        {moment.gems > 0 && <div><Gem/><strong>+{moment.gems}</strong><span>Gems</span></div>}
      </div>
      {badge && <div className="v4-new-badge"><Award/><span>NEW BADGE</span><GameBadge badge={badge} unlocked size={82} label={false}/><strong>{badge.name}</strong></div>}
      {moment.levelUp && <div className="v4-level-up-banner"><Sparkles/><span>新能力已解鎖</span><strong>Lv.{moment.levelUp}</strong></div>}
      <button className="v4-reward-continue" onClick={onClose}><Check/> Continue Adventure</button>
    </section>
  </div>;
}
