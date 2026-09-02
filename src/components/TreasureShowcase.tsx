import { useState, type CSSProperties, type SyntheticEvent } from 'react';
import AvatarRenderer from './AvatarRenderer';
import { cosmeticById, equippedCosmeticForSlot } from '../cosmetics';
import { shopItemById } from '../avatarShop';
import { equipmentPreviewAssetPath, previewModeForItem, previewModeLabels } from '../equipmentPreview';

const roomScenes: Record<string, string> = {
  'room-starlab': 'room-starlab-v2.png',
  'room-ocean': 'room-ocean-v2.png',
  'room-legend': 'room-legend-v2.png',
};

function hideBrokenPreview(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.hidden = true;
}

export default function TreasureShowcase({ avatarId, xp, equippedCosmetics, learnerName, previewNames = [], focusItemId }: {
  avatarId?: string;
  xp: number;
  equippedCosmetics?: string[];
  learnerName: string;
  previewNames?: string[];
  focusItemId?: string;
}) {
  const [effectReplay, setEffectReplay] = useState(0);
  const focusItem = focusItemId ? shopItemById.get(focusItemId) : undefined;
  const mode = previewModeForItem(focusItem);
  const ship = equippedCosmeticForSlot(equippedCosmetics, 'spaceship');
  const room = equippedCosmeticForSlot(equippedCosmetics, 'room');
  const robot = equippedCosmeticForSlot(equippedCosmetics, 'robot');
  const card = equippedCosmeticForSlot(equippedCosmetics, 'card');
  const effect = equippedCosmeticForSlot(equippedCosmetics, 'effect');
  const focusLegacy = focusItem ? cosmeticById.get(focusItem.id) : undefined;
  const previewAsset = focusItem ? equipmentPreviewAssetPath(focusItem) : undefined;
  const scenePath = room ? `${import.meta.env.BASE_URL}assets/v5/scenes/${roomScenes[room.id]}` : undefined;
  const scene = scenePath ? new URL(scenePath, window.location.href).href : undefined;
  const sceneStyle = scene ? ({ '--showcase-scene': `url("${scene}")` } as CSSProperties) : undefined;

  const title = mode === 'ship' ? '我的飛船'
    : mode === 'robot' ? '我的機器夥伴'
      : mode === 'card' ? '我的收藏卡'
        : mode === 'effect' ? '我的冒險特效'
          : mode === 'world' ? '我的冒險基地'
            : `${learnerName}的新造型`;
  const instruction = focusItem
    ? `正在試試：${focusItem.name}`
    : previewNames.length ? `正在試穿：${previewNames.join('、')}` : '挑一件喜歡的寶物，這裡會立刻換給你看。';

  return <section
    className={`v63-equipment-stage mode-${mode} ${focusItem ? 'has-focus-item' : ''}`}
    aria-label={`${learnerName}的${previewModeLabels[mode]}`}
    data-preview-mode={mode}
    data-preview-item={focusItem?.id ?? 'none'}
    data-room={room?.id ?? 'base'}
    data-effect={effect?.id ?? 'none'}
    style={sceneStyle}
  >
    <div className="v63-stage-backdrop" aria-hidden="true" />
    <header className="v63-stage-heading">
      <span>{previewModeLabels[mode]}</span>
      <h2>{title}</h2>
      <p>{instruction}</p>
    </header>

    {mode === 'ship' && focusItem && previewAsset && <div className="v63-hangar-stage">
      <div className="v63-hangar-orbit" aria-hidden="true" />
      <img className="v63-ship-art" src={previewAsset} alt={`${focusItem.name}試乘預覽`} loading="eager" decoding="async" onError={hideBrokenPreview}/>
      <div className="v63-pilot-avatar"><AvatarRenderer avatarId={avatarId} xp={xp} equippedCosmetics={equippedCosmetics} size={150}/><span>{learnerName}準備登艦</span></div>
    </div>}

    {mode === 'robot' && focusItem && previewAsset && <div className="v63-companion-stage">
      <div className="v63-companion-avatar"><AvatarRenderer avatarId={avatarId} xp={xp} equippedCosmetics={equippedCosmetics} size={250}/></div>
      <img className="v63-robot-art" src={previewAsset} alt={`${focusItem.name}夥伴預覽`} loading="eager" decoding="async" onError={hideBrokenPreview}/>
      <div className="v63-companion-link" aria-hidden="true"><i/><i/><i/></div>
    </div>}

    {mode === 'card' && focusItem && previewAsset && <div className={`v63-card-viewer rarity-${focusLegacy?.rarity ?? 'common'}`}>
      <div className="v63-card-tilt">
        <img className="v63-card-art" src={previewAsset} alt={`${focusItem.name}收藏卡預覽`} loading="eager" decoding="async" onError={hideBrokenPreview}/>
        <div className="v63-card-copy"><span>{(focusLegacy?.rarity ?? 'common').toUpperCase()}</span><strong>{focusItem.name}</strong><small>小小探險隊收藏卡</small></div>
      </div>
    </div>}

    {mode === 'effect' && <div className="v63-effect-stage">
      <div key={`${effect?.id ?? focusItem?.id}:${effectReplay}`} className={`v63-effect-aura effect-${focusItem?.id ?? effect?.id ?? 'stars'}`} aria-hidden="true">{Array.from({length:8},(_,index)=><i key={index}/>)}</div>
      <AvatarRenderer avatarId={avatarId} xp={xp} equippedCosmetics={equippedCosmetics} size={310}/>
      <button type="button" className="v63-effect-replay" onClick={() => setEffectReplay((value) => value + 1)}>再看一次特效</button>
    </div>}

    {(mode === 'avatar' || mode === 'world') && <div className="v63-avatar-stage">
      <AvatarRenderer avatarId={avatarId} xp={xp} equippedCosmetics={equippedCosmetics} size={330}/>
      <span className="v63-avatar-platform" aria-hidden="true" />
      {mode === 'world' && <span className="v63-world-label">基地場景已套用</span>}
    </div>}

    {!focusItem && <div className="v63-stage-empty-note">先從右邊挑一件寶物，按「試穿看看」。</div>}

    <div className="v63-stage-status" aria-label="目前收藏預覽狀態">
      <span className={ship ? 'active' : ''}>飛船</span>
      <span className={room ? 'active' : ''}>基地</span>
      <span className={robot ? 'active' : ''}>Robot</span>
      <span className={card ? 'active' : ''}>卡面</span>
      <span className={effect ? 'active' : ''}>特效</span>
    </div>
  </section>;
}
