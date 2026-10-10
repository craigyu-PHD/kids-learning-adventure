import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Coins } from 'lucide-react';
import type { AppProgress, AppSettings } from '../types';
import type { ShopActionResult } from '../shopService';
import { shopItemById, shopItemCanRender, shopItemStatusLabel } from '../avatarShop';
import { cosmeticAssetPath, cosmeticById } from '../cosmetics';
import { calculateRewards, levelFromXp, normalizeProgress } from '../rewards';
import AvatarHero from '../components/AvatarHero';
import TreasureShowcase from '../components/TreasureShowcase';
import GameImage from './GameImage';
import '../styles/components/shop.css';
import './shop-item-detail.css';

const rarityLabels: Record<string, string> = { common: '一般', rare: '稀有', epic: '史詩', legendary: '傳奇' };
const slotLabels: Record<string, string> = {
  hairstyle: '髮型', outfit: '服裝', hat: '帽子', glasses: '眼鏡', backpack: '背包', cape: '披風',
  headphones: '耳機', spaceship: '太空船', room: '基地房間', robot: '機器夥伴', pet: '寵物', card: '收藏卡', effect: '互動特效',
};

export type ShopItemDetailProps = {
  itemId: string;
  settings: AppSettings;
  progress: AppProgress;
  selectedChildId?: string;
  onSelectChild?: (childId: string) => void;
  onBack: () => void;
  onUnlock: (childId: string, itemId: string, signal?: AbortSignal) => Promise<ShopActionResult>;
  onToggle: (childId: string, itemId: string, signal?: AbortSignal) => Promise<ShopActionResult>;
};

/** Page content; the router supplies the existing SecondaryPageShell and ledger callbacks. */
export default function ShopItemDetail(props: ShopItemDetailProps) {
  const learners = props.settings.children.filter(child => !child.disabled);
  const [selection, setSelection] = useState({ source: props.selectedChildId, id: props.selectedChildId });
  const selected = selection.source === props.selectedChildId ? selection.id : props.selectedChildId;
  const child = learners.find(learner => learner.id === selected) ?? learners[0];
  const item = shopItemById.get(props.itemId);
  const legacy = item && cosmeticById.get(item.id);
  if (!item || !legacy) return <section className="shop-item-detail shop-item-detail-empty">
    <h1>找不到這件寶物</h1><p>回到商店看看其他探險收藏。</p>
    <button type="button" onClick={props.onBack}><ArrowLeft aria-hidden="true"/>返回寶物商店</button>
  </section>;
  if (!child) return <section className="shop-item-detail shop-item-detail-empty">
    <h1>{item.name}</h1><p>新增學習者後，就能為角色試穿和收藏。</p>
    <button type="button" onClick={props.onBack}><ArrowLeft aria-hidden="true"/>返回寶物商店</button>
  </section>;
  return <DetailContent key={`${item.id}:${child.id}`} {...props} childId={child.id}
    onChooseChild={id => { setSelection({ source: props.selectedChildId, id }); props.onSelectChild?.(id); }}/>
}

function DetailContent({ itemId, settings, progress, childId, onChooseChild, onBack, onUnlock, onToggle }: ShopItemDetailProps & {
  childId: string; onChooseChild: (childId: string) => void;
}) {
  const [trial, setTrial] = useState(false);
  const [pending, setPending] = useState(false);
  const request = useRef<AbortController | undefined>(undefined);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current?.abort(); request.current = undefined; };
  }, []);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string }>();
  const child = settings.children.find(learner => learner.id === childId)!;
  const item = shopItemById.get(itemId)!;
  const legacy = cosmeticById.get(itemId)!;
  const p = normalizeProgress(progress[child.id]);
  const rewards = calculateRewards(p);
  const level = Math.min(15, levelFromXp(rewards.xp));
  const owned = p.unlockedCosmetics?.includes(item.id) ?? false;
  const equipped = p.equippedCosmetics?.includes(item.id) ?? false;
  const canPreview = shopItemCanRender(item, child.avatar);
  const coinGap = Math.max(0, item.cost - rewards.coins);
  const canCollect = canPreview && !owned && level >= item.unlockLevel && coinGap === 0;
  const current = p.equippedCosmetics ?? [];
  const trialItems = [...current.filter(id => shopItemById.get(id)?.equipmentSlot !== item.equipmentSlot), item.id];
  // Match the existing shop's hairstyle inspection without mutating equipped headwear.
  const visibleTrial = item.visualSlot === 'hair'
    ? trialItems.filter(id => shopItemById.get(id)?.visualSlot !== 'headwear') : trialItems;
  const trialActive = trial && canPreview;
  const previewItems = trialActive ? visibleTrial : current;
  const focusItemId = trialActive || equipped ? item.id : undefined;
  const runAction = async (action: 'collect' | 'equip') => {
    if (request.current || (action === 'collect' ? !canCollect : !owned || (!equipped && !canPreview))) return;
    const controller = new AbortController();
    request.current = controller;
    const isCurrent = () => mounted.current && request.current === controller && !controller.signal.aborted;
    setPending(true); setFeedback(undefined);
    try {
      const result = await (action === 'collect' ? onUnlock(child.id, item.id, controller.signal) : onToggle(child.id, item.id, controller.signal));
      if (!isCurrent()) return;
      setFeedback({ ok: result.ok, message: result.ok
        ? action === 'collect' ? `${item.name}已加入${child.name}的收藏。` : result.equipped ? `${item.name}已裝備。` : `${item.name}已收回收藏。`
        : result.reason ?? '操作未完成，請再試一次。' });
      if (result.ok) setTrial(false);
    } catch {
      if (!isCurrent()) return;
      setFeedback({ ok: false, message: '操作暫時未完成，請確認連線後再試一次。' });
    } finally {
      if (isCurrent()) { request.current = undefined; setPending(false); }
    }
  };
  return <article className="shop-item-detail" data-shop-item-detail={item.id} data-selected-child={child.id}>
    <button type="button" className="shop-item-detail-back" onClick={onBack}><ArrowLeft aria-hidden="true"/>返回寶物商店</button>
    <header className="shop-item-detail-heading"><p>探險寶物 · {slotLabels[item.legacySlot] ?? '收藏'}</p><h1>{item.name}</h1><p>{item.description}</p></header>
    <div className="shop-item-detail-learners" role="group" aria-label="選擇試穿角色">
      {settings.children.filter(learner => !learner.disabled).map(learner => <button type="button" key={learner.id}
        aria-pressed={learner.id === child.id} onClick={() => onChooseChild(learner.id)}>
        <AvatarHero avatarId={learner.avatar} xp={calculateRewards(normalizeProgress(progress[learner.id])).xp}
          equippedCosmetics={progress[learner.id]?.equippedCosmetics} size={44}/><span>{learner.name}</span>
      </button>)}
    </div>
    <div className="shop-item-detail-grid">
      <section className="shop-item-detail-original" aria-label={`${item.name}商品原圖`}>
        <GameImage src={cosmeticAssetPath(legacy, child.avatar)} alt={`${item.name}商品原圖`} eager fallbackLabel="商品圖片暫時無法載入"/>
        <p>{item.name} · {rarityLabels[legacy.rarity ?? 'common']}</p>
      </section>
      <section className="shop-item-detail-info" aria-label="商品資訊與收藏操作">
        <dl><div><dt>稀有度</dt><dd>{rarityLabels[legacy.rarity ?? 'common']}</dd></div>
          <div><dt>收藏價格</dt><dd>{item.cost === 0 ? '免費領取' : `${item.cost} 金幣`}</dd></div>
          <div><dt>解鎖等級</dt><dd>Lv.{item.unlockLevel}</dd></div>
          <div><dt>{child.name}目前擁有</dt><dd><Coins aria-hidden="true"/>{rewards.coins} 金幣 · Lv.{level}</dd></div>
          <div><dt>收藏狀態</dt><dd>{equipped ? '已裝備' : owned ? '已收藏' : '尚未收藏'}</dd></div></dl>
        <p className="shop-item-detail-availability">{shopItemStatusLabel(item, child.avatar)}</p>
        <div className="shop-item-detail-actions">
          <button type="button" disabled={!canPreview || pending} aria-pressed={trialActive} onClick={() => setTrial(value => !value)}>
            {trialActive ? '取消試穿' : item.previewMode === 'avatar' ? '試穿看看' : '預覽效果'}</button>
          {owned ? <button type="button" disabled={pending || (!equipped && !canPreview)} onClick={() => void runAction('equip')}>
            {pending ? '處理中…' : equipped ? '先收起來' : item.previewMode === 'avatar' ? '立即穿上' : '立即使用'}
          </button> : <button type="button" disabled={!canCollect || pending} onClick={() => void runAction('collect')}>
            {pending ? '處理中…' : !canPreview ? '此角色尚未支援' : level < item.unlockLevel ? `Lv.${item.unlockLevel} 解鎖`
              : coinGap > 0 ? `金幣還差 ${coinGap}` : item.cost === 0 ? '免費領取' : `用 ${item.cost} 金幣收藏`}
          </button>}
        </div>
        {feedback && <p className={`shop-item-detail-feedback ${feedback.ok ? 'success' : 'error'}`} role={feedback.ok ? 'status' : 'alert'}>
          {feedback.ok && <Check aria-hidden="true"/>}{feedback.message}</p>}
      </section>
    </div>
    <section className="shop-item-detail-preview" aria-label={`${child.name}的商品效果`}>
      <h2>{trialActive ? '試穿效果' : '目前裝備'}</h2>
      <p>{trialActive ? item.visualSlot === 'hair' ? '查看髮型時，帽子暫時收起；取消試穿就會恢復。' : '看看這件寶物搭配目前角色的樣子。' : '按上方試穿或預覽按鈕，看看這件寶物的效果。'}</p>
      <TreasureShowcase avatarId={child.avatar} xp={rewards.xp} equippedCosmetics={previewItems} learnerName={child.name}
        previewing={trialActive} previewNames={trialActive ? [item.name] : []} focusItemId={focusItemId}/>
    </section>
  </article>;
}
