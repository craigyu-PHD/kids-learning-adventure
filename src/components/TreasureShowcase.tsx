import { useState, type CSSProperties } from "react";
import AvatarRenderer from "./AvatarRenderer";
import { cosmeticAssetPath, equippedCosmeticForSlot } from "../cosmetics";

const roomScenes: Record<string, string> = {
  "room-starlab": "room-starlab-v2.png",
  "room-ocean": "room-ocean-v2.png",
  "room-legend": "room-legend-v2.png",
};

export default function TreasureShowcase({ avatarId, xp, equippedCosmetics, learnerName, previewNames = [] }: {
  avatarId?: string;
  xp: number;
  equippedCosmetics?: string[];
  learnerName: string;
  previewNames?: string[];
}) {
  const [effectReplay, setEffectReplay] = useState(0);
  const ship = equippedCosmeticForSlot(equippedCosmetics, 'spaceship');
  const room = equippedCosmeticForSlot(equippedCosmetics, 'room');
  const robot = equippedCosmeticForSlot(equippedCosmetics, 'robot');
  const card = equippedCosmeticForSlot(equippedCosmetics, 'card');
  const effect = equippedCosmeticForSlot(equippedCosmetics, 'effect');

  const scenePath = room
    ? `${import.meta.env.BASE_URL}assets/v5/scenes/${roomScenes[room.id]}`
    : undefined;
  const scene = scenePath
    ? new URL(scenePath, window.location.href).href
    : undefined;
  const sceneStyle = scene
    ? ({ "--showcase-scene": `url("${scene}")` } as CSSProperties)
    : undefined;

  return <section
    className="v6-treasure-showcase"
    aria-label={`${learnerName}的寶物即時預覽`}
    data-room={room?.id ?? "base"}
    data-card={card?.id ?? "base"}
    data-effect={effect?.id ?? "none"}
    data-xp={xp}
    style={sceneStyle}
  >
    <div className="v6-showcase-scene" aria-hidden="true" />
    <div className="v6-showcase-card-skin" aria-hidden="true" />
    {effect && <div key={`${effect.id}:${effectReplay}`} className="v6-showcase-event-effect" aria-hidden="true">{Array.from({length:18},(_,index)=><i key={index}/>)}</div>}
    {ship && <div className="v6-showcase-ship-bay" aria-label={`已部署${ship.name}`}><span className="v6-showcase-ship-beacon" aria-hidden="true"/><img className="v6-showcase-world v6-showcase-ship" src={cosmeticAssetPath(ship)} alt="" /></div>}
    <div className="v6-showcase-character">
      <AvatarRenderer avatarId={avatarId} equippedCosmetics={equippedCosmetics} size={320}/>
      <span className="v6-showcase-platform" aria-hidden="true" />
    </div>
    {robot && <div className="v6-showcase-robot-dock" aria-label={`已啟用${robot.name}`}><span aria-hidden="true"/><img className="v6-showcase-world v6-showcase-robot" src={cosmeticAssetPath(robot)} alt="" /></div>}
    <header>
      <span>LIVE LOADOUT</span>
      <h2>{learnerName}的全景裝備室</h2>
      <p>{previewNames.length ? `正在預覽 ${previewNames.length} 件：${previewNames.join('、')}` : '同時搭配不同槽位；儲存前可逐一檢查整套效果。'}</p>
    </header>
    <div className="v6-showcase-status" aria-label="目前世界寶物">
      <span className={ship ? 'active' : ''}>飛船</span>
      <span className={room ? 'active' : ''}>全景基地</span>
      <span className={robot ? 'active' : ''}>Robot</span>
      <span className={card ? 'active' : ''}>背景卡面</span>
      <span className={effect ? 'active' : ''}>事件特效</span>
    </div>
    {effect && <button type="button" className="v6-showcase-effect-replay" onClick={() => setEffectReplay((value) => value + 1)}>重播效果</button>}
  </section>;
}
