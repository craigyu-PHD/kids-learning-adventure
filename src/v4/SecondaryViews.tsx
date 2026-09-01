import { useState } from 'react';
import {
  Award, CalendarDays, Check, ChevronRight, Cloud, Coins, Gem, Gift, History,
  Lock, Rocket, ShieldCheck, ShoppingBag, Star, Trophy, Video, X, Zap,
} from 'lucide-react';
import { curriculum } from '../data/curriculum';
import AvatarHero from '../components/AvatarHero';
import GameBadge from '../components/GameBadge';
import { badges } from '../badges';
import { cosmeticAssetPath, cosmeticById } from '../cosmetics';
import { shopItemAvailability, shopItemById, shopItemCanRender, shopItemStatusLabel, shopItems } from '../avatarShop';
import { calculateRewards, easterEggDays, levelFromXp, normalizeProgress } from '../rewards';
import type { AppProgress, AppSettings, CourseDay, FamilyUserProfile } from '../types';
import type { CourseDayAccess, TrustedTaipeiDate } from '../dailyChallenge';
import { addCourseWeekdaysYmd, formatTaipeiCourseDate } from '../dailyChallenge';
import { buildLearningProfile } from '../learningAnalytics';
import type { AnswerEvent } from '../types';
import { AdventureHeader, BottomStatusBar, MainNavigation, type DashboardViewKey } from './Dashboard';
import { levelTitle, playerResources, subjectLabel, youtubeThumb } from './model';
import GameImage from './GameImage';
import GameIcon from './GameIcon';
import TreasureShowcase from '../components/TreasureShowcase';
import { useDialogFocusTrap } from '../accessibility';

const shopSlotLabels: Record<string,string> = {
  hairstyle:'髮型', outfit:'服裝', hat:'帽子', glasses:'眼鏡', backpack:'背包', cape:'披風', headphones:'耳機',
  spaceship:'太空船', room:'基地房間', robot:'AI 夥伴', card:'卡片背景', effect:'互動特效',
};

const shopCategories = [
  { id: 'character', label: '角色裝備', slots: ['hairstyle', 'outfit', 'hat', 'glasses', 'backpack', 'cape', 'headphones'] },
  { id: 'spaceship', label: '飛船', slots: ['spaceship'] },
  { id: 'room', label: '基地', slots: ['room'] },
  { id: 'robot', label: 'Robot', slots: ['robot'] },
  { id: 'card', label: '卡面', slots: ['card'] },
  { id: 'effect', label: '特效', slots: ['effect'] },
] as const;

type ShopActionResult = { ok: boolean; reason?: string; equipped?: boolean; itemId?: string };

type ShellProps = {
  settings: AppSettings;
  progress?: AppProgress;
  active: DashboardViewKey;
  trustedDate: TrustedTaipeiDate;
  cloudStatus: string;
  onNavigate: (view: DashboardViewKey) => void;
  onParentArea: () => void;
  activeUser?: FamilyUserProfile;
  parentPreviewUnlocked?: boolean;
  children: React.ReactNode;
};

export function SecondaryPageShell(props: ShellProps) {
  return <div className="v4-shell v4-secondary-shell">
    <AdventureHeader settings={props.settings} progress={props.progress} activeUser={props.activeUser} parentPreviewUnlocked={props.parentPreviewUnlocked} onParentArea={props.onParentArea}/>
    <MainNavigation active={props.active} onNavigate={props.onNavigate} onParentArea={props.onParentArea}/>
    <main className="v4-secondary-main">{props.children}</main>
    <BottomStatusBar cloudStatus={props.cloudStatus} trustedDate={props.trustedDate}/>
  </div>;
}

function HistoryDayPanel({ day, date, settings, progress, showLessonDetails, onClose }: { day: CourseDay; date: string; settings: AppSettings; progress: AppProgress; showLessonDetails: boolean; onClose: () => void }) {
  const dialogRef = useDialogFocusTrap<HTMLDivElement>();
  return <div ref={dialogRef} className="v4-history-scrim" role="dialog" aria-modal="true" aria-label={`Day ${day.index} 歷史學習紀錄`}>
    <section className="v4-history-panel">
      <button className="v4-history-close" onClick={onClose} aria-label="關閉歷史紀錄"><X/></button>
      <header><div><span>{showLessonDetails ? 'PARENT REVIEW' : 'LEARNING RESULT'}</span><h2>Day {day.index} · {showLessonDetails ? day.title : '學習成果'}</h2><p>{formatTaipeiCourseDate(date)} · 過去日期只讀，不可重新挑戰或領取獎勵。</p></div><History/></header>
      {showLessonDetails && <div className="v4-history-lessons">{day.blocks.map((block,index)=><article key={block.id}><span>LESSON {index+1} · {subjectLabel(block.subject)}</span><h3>{block.title}</h3><p>{block.video.title}</p><small>{block.duration} min · {block.missions.length} missions</small></article>)}</div>}
      <div className="v4-history-learners">{settings.children.filter((child)=>!child.disabled).map((child)=>{
        const p=normalizeProgress(progress[child.id]);
        const blockDone=day.blocks.filter((block)=>p.completedBlocks.includes(block.id)).length;
        const missionIds=new Set(day.blocks.flatMap((block)=>block.missions.map((mission)=>mission.id)));
        const missionDone=p.completedMissions.filter((id)=>missionIds.has(id)).length;
        const done=p.completedDays.includes(day.id) || blockDone===2;
        const unlocks=Object.entries(p.badgeUnlocks??{}).filter(([,earned])=>earned?.startsWith(date));
        return <article key={child.id} className={done?'done':'missed'}>
          <AvatarHero avatarId={child.avatar} xp={calculateRewards(p).xp} equippedCosmetics={p.equippedCosmetics} size={78}/>
          <div><span>{child.name}</span><h3>{done?'已完成':'當日未完成'}</h3><p>課程 {blockDone}/2 · 任務 {missionDone}/{day.blocks.flatMap((b)=>b.missions).length}</p><small>{p.completionTimestamps?.[day.id] ? `完成時間 ${new Date(p.completionTimestamps[day.id]).toLocaleString('zh-TW')}` : '沒有完成時間紀錄'}</small></div>
          <div className="v4-history-badges"><Award/><strong>{unlocks.length}</strong><span>當日徽章</span></div>
        </article>;
      })}</div>
      <footer><ShieldCheck/> {showLessonDetails ? '家長可查看既有教案；這裡仍不提供任何完成或獎勵按鈕。' : '孩子只查看自己的成果；完整教案需在家長 PIN 模式中開啟。'}</footer>
    </section>
  </div>;
}

function ChildTeaserPanel({ day, date, onClose }: { day: CourseDay; date: string; onClose: () => void }) {
  const dialogRef = useDialogFocusTrap<HTMLDivElement>();
  const subjects = [...new Set(day.blocks.map((block) => subjectLabel(block.subject)))];
  return <div ref={dialogRef} className="v4-history-scrim" role="dialog" aria-modal="true" aria-label={`Day ${day.index} 主題預告`}>
    <section className="v4-history-panel v53-teaser-panel">
      <button className="v4-history-close" onClick={onClose} aria-label="關閉主題預告"><X/></button>
      <header><div><h2>Day {day.index} 的冒險主題</h2><p>{formatTaipeiCourseDate(date)} 開放後，就能和家長一起開始今天的挑戰。</p></div><Lock/></header>
      <div className="v53-teaser-theme"><Rocket/><div><strong>{day.theme}</strong><p>{day.bigIdea}</p><span>{subjects.join(' · ')}</span></div></div>
      <footer><ShieldCheck/> 先保留一點明天的驚喜。家長 PIN 模式可完整預覽 90 天教材與照顧者提示。</footer>
    </section>
  </div>;
}

export function SemesterPage({ settings, progress, trustedDate, cloudStatus, courseDateKey, accessForDay, isDayDone, onOpenLesson, onNavigate, onParentArea, parentPreviewUnlocked, activeUser }:{
  settings:AppSettings; progress:AppProgress; trustedDate:TrustedTaipeiDate; cloudStatus:string; courseDateKey:(day:CourseDay)=>string; accessForDay:(day:CourseDay)=>CourseDayAccess; isDayDone:(day:CourseDay)=>boolean; onOpenLesson:(day:CourseDay,index:0|1)=>void; onNavigate:(view:DashboardViewKey)=>void; onParentArea:()=>void; parentPreviewUnlocked:boolean; activeUser?:FamilyUserProfile;
}) {
  const [historyDay,setHistoryDay]=useState<CourseDay|null>(null);
  const [teaserDay,setTeaserDay]=useState<CourseDay|null>(null);
  return <SecondaryPageShell settings={settings} progress={progress} active="semester" trustedDate={trustedDate} cloudStatus={cloudStatus} onNavigate={onNavigate} onParentArea={onParentArea} activeUser={activeUser} parentPreviewUnlocked={parentPreviewUnlocked}>
    <section className="v4-page-heading"><div><h1>學期日曆</h1><p>{parentPreviewUnlocked ? '家長備課已解鎖：可完整預覽未來教材與回看過去教案。' : '孩子可先看未來主題、回顧自己的成果；完整教材由家長 PIN 解鎖。'}</p></div><div className="v4-page-kpi"><GameIcon size="lg"><CalendarDays/></GameIcon><strong>{curriculum.filter(isDayDone).length}</strong><span>/ 90 完成</span></div></section>
    <div className="v4-semester-weeks">{Array.from({length:18},(_,weekIndex)=>{
      const days=curriculum.filter((day)=>day.week===weekIndex+1); const done=days.filter(isDayDone).length;
      return <section className="v4-week-strip" key={weekIndex}><header><span>WEEK {String(weekIndex+1).padStart(2,'0')}</span><h2>{days[0]?.theme}<small>｜{days[0]?.bigIdea}</small></h2><strong>{done}/5</strong></header><div>{days.map((day)=>{
        const access=accessForDay(day); const completed=isDayDone(day); const special=easterEggDays.has(day.index); const date=courseDateKey(day);
        return <article className={`v4-semester-day ${completed?'done':access} ${special?'special':''}`} key={day.id}>
          <div className="v4-semester-orb"><GameImage className="v6-semester-preview" src={youtubeThumb(day.blocks[0].video.videoId)} alt={`Day ${day.index} 第 1 節影片預覽`}/></div>
          <strong>Day {day.index}</strong><span>{formatTaipeiCourseDate(date)}</span><small>{completed?'已完成':access==='today'?'今日課程':access==='future'?'尚未開放':'歷史紀錄'}</small>{special&&<b><Gift/></b>}
          <div className="v4-semester-actions">
            {access==='today' && trustedDate.verified ? <><button onClick={()=>onOpenLesson(day,0)}>開始第 1 節 <ChevronRight/></button><button className="secondary" onClick={()=>onOpenLesson(day,1)}>開始第 2 節 <ChevronRight/></button></> : parentPreviewUnlocked ? <><button onClick={()=>onOpenLesson(day,0)}>完整第 1 節 <ChevronRight/></button><button className="secondary" onClick={()=>onOpenLesson(day,1)}>完整第 2 節 <ChevronRight/></button></> : access==='future' ? <button className="teaser" onClick={()=>setTeaserDay(day)}><Video/> 查看主題預告 <ChevronRight/></button> : <button className="history" onClick={()=>setHistoryDay(day)}>查看學習成果 <History/></button>}
            {access==='past'&&parentPreviewUnlocked&&<button className="history" onClick={()=>setHistoryDay(day)}>完整學習紀錄 <History/></button>}
          </div>
        </article>;
      })}</div></section>;
    })}</div>
    {historyDay&&<HistoryDayPanel day={historyDay} date={courseDateKey(historyDay)} settings={settings} progress={progress} showLessonDetails={parentPreviewUnlocked} onClose={()=>setHistoryDay(null)}/>}
    {teaserDay&&<ChildTeaserPanel day={teaserDay} date={courseDateKey(teaserDay)} onClose={()=>setTeaserDay(null)}/>}
  </SecondaryPageShell>;
}

export function AchievementsPage({ settings, progress, trustedDate, cloudStatus, onNavigate, onParentArea, activeUser, parentPreviewUnlocked }:{settings:AppSettings;progress:AppProgress;trustedDate:TrustedTaipeiDate;cloudStatus:string;onNavigate:(view:DashboardViewKey)=>void;onParentArea:()=>void;activeUser?:FamilyUserProfile;parentPreviewUnlocked?:boolean}) {
  const learners = settings.children.filter((learner)=>!learner.disabled);
  const [activeLearnerId, setActiveLearnerId] = useState(learners[0]?.id ?? '');
  const child = learners.find((learner)=>learner.id===activeLearnerId) ?? learners[0];
  if (!child) return null;
  const p=progress[child.id]; const r=playerResources(p); const unlocks=p?.badgeUnlocks??{};
  return <SecondaryPageShell settings={settings} progress={progress} active="achievements" trustedDate={trustedDate} cloudStatus={cloudStatus} onNavigate={onNavigate} onParentArea={onParentArea} activeUser={activeUser} parentPreviewUnlocked={parentPreviewUnlocked}>
    <section className="v4-page-heading"><div><h1>成就獎勵</h1><p>每個孩子的徽章、Stars 與 Gems 都獨立保存。</p></div><div className="v4-page-kpi purple"><GameIcon tone="purple" size="lg"><Award/></GameIcon><strong>24</strong><span>原創徽章</span></div></section>
    <div className="v6-achievement-tabs" role="tablist" aria-label="選擇學習者">{learners.map((learner)=><button key={learner.id} type="button" role="tab" aria-selected={learner.id===child.id} className={learner.id===child.id?'active':''} onClick={()=>setActiveLearnerId(learner.id)}><AvatarHero avatarId={learner.avatar} xp={playerResources(progress[learner.id]).xp} equippedCosmetics={progress[learner.id]?.equippedCosmetics} size={42}/><span>{learner.name}</span></button>)}</div>
    <section className="v4-achievement-card v6-achievement-wall"><header><AvatarHero avatarId={child.avatar} xp={r.xp} equippedCosmetics={p?.equippedCosmetics} size={104}/><div><span>BADGE COLLECTION</span><h2>{child.name}的獎盃牆</h2><p>已收集 {Object.keys(unlocks).length} / {badges.length} 枚徽章</p></div><div className="v4-achievement-resources"><span><Star/>{r.stars}</span><span><Gem/>{r.gems}</span></div></header><div className="v4-full-badge-grid">{badges.map((badge)=><GameBadge key={badge.id} badge={badge} unlocked={Boolean(unlocks[badge.id])} earnedDate={unlocks[badge.id]} />)}</div></section>
  </SecondaryPageShell>;
}

export function ShopPage({ settings, progress, trustedDate, cloudStatus, onNavigate, onParentArea, onUnlock, onToggle, activeUser, parentPreviewUnlocked }:{
  settings:AppSettings;
  progress:AppProgress;
  trustedDate:TrustedTaipeiDate;
  cloudStatus:string;
  onNavigate:(view:DashboardViewKey)=>void;
  onParentArea:()=>void;
  onUnlock:(childId:string,itemId:string)=>Promise<ShopActionResult>;
  onToggle:(childId:string,itemId:string)=>Promise<ShopActionResult>;
  activeUser?:FamilyUserProfile;
  parentPreviewUnlocked?:boolean;
}) {
  const [previewByChild, setPreviewByChild] = useState<Record<string, Record<string, string>>>({});
  const [pendingItems, setPendingItems] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ childId:string; itemId:string; kind:'purchase'|'equip'; message:string } | null>(null);
  const learners = settings.children.filter((learner)=>!learner.disabled);
  const [activeLearnerId, setActiveLearnerId] = useState(learners[0]?.id ?? '');
  const [activeCategoryId, setActiveCategoryId] = useState<(typeof shopCategories)[number]['id']>('character');
  const child = learners.find((learner)=>learner.id===activeLearnerId) ?? learners[0];
  const activeCategory = shopCategories.find((category)=>category.id===activeCategoryId) ?? shopCategories[0];
  if (!child) return null;

  const p=normalizeProgress(progress[child.id]);
  const reward=calculateRewards(p);
  const owned=new Set(p.unlockedCosmetics??[]);
  const equipped=new Set(p.equippedCosmetics??[]);
  const level=Math.min(15,levelFromXp(reward.xp));
  const previewSlots=previewByChild[child.id] ?? {};
  const previewItems=Object.values(previewSlots).flatMap((id)=>{
    const item=shopItemById.get(id);
    return item&&shopItemCanRender(item, child.avatar)?[item]:[];
  });
  const previewIds=new Set(previewItems.map((item)=>item.id));
  const avatarCosmetics=Array.from(new Set([
    ...(p.equippedCosmetics??[]).filter((id)=>!previewItems.some((item)=>shopItemById.get(id)?.equipmentSlot===item.equipmentSlot)),
    ...previewItems.map((item)=>item.id),
  ]));
  const visibleItems = shopItems.filter((item)=>activeCategory.slots.includes(item.legacySlot as never));

  const runAction = async (itemId:string, action:'purchase'|'equip') => {
    setPendingItems((current)=>({...current,[itemId]:true}));
    try {
      const result = action==='purchase' ? await onUnlock(child.id,itemId) : await onToggle(child.id,itemId);
      const item=shopItemById.get(itemId);
      if (result.ok) {
        setFeedback({ childId:child.id, itemId, kind:action, message:action==='purchase' ? `${item?.name??'商品'}已加入 Inventory；是否現在裝備？` : result.equipped ? `${item?.name??'裝備'}已套用到角色。` : `${item?.name??'裝備'}已卸下。` });
      } else {
        setFeedback({ childId:child.id, itemId, kind:action, message:result.reason??'操作未完成' });
      }
    } finally {
      setPendingItems((current)=>({...current,[itemId]:false}));
    }
  };

  return <SecondaryPageShell settings={settings} progress={progress} active="shop" trustedDate={trustedDate} cloudStatus={cloudStatus} onNavigate={onNavigate} onParentArea={onParentArea} activeUser={activeUser} parentPreviewUnlocked={parentPreviewUnlocked}>
    <section className="v4-page-heading"><div><h1>寶物商店</h1><p>Browse → Try-on → Purchase → Equip。購買與裝備是兩個獨立操作；Coins 僅來自學習完成紀錄。</p></div><div className="v4-page-kpi gold"><GameIcon tone="gold" size="lg"><ShoppingBag/></GameIcon><strong>{shopItems.length}</strong><span>冒險商品</span></div></section>
    <div className="v6-shop-tabs" role="tablist" aria-label="選擇學習者">{learners.map((learner)=><button key={learner.id} type="button" role="tab" aria-selected={learner.id===child.id} className={learner.id===child.id?'active':''} onClick={()=>{setActiveLearnerId(learner.id);setFeedback(null);}}><AvatarHero avatarId={learner.avatar} xp={playerResources(progress[learner.id]).xp} equippedCosmetics={progress[learner.id]?.equippedCosmetics} size={42}/><span>{learner.name}</span></button>)}</div>
    <section className="v4-shop-card v6-shop-studio">
      <div className="v6-shop-preview-column">
        <TreasureShowcase avatarId={child.avatar} xp={reward.xp} equippedCosmetics={avatarCosmetics} learnerName={child.name} previewNames={previewItems.map((item)=>item.name)}/>
        {previewItems.length>0&&<div className="v6-preview-integrity" role="status">此預覽只使用完整角色 Skin、標準化 Effect 或世界物件；未符合 Avatar Asset Contract 的舊素材不會硬貼在人物上。</div>}
        {previewItems.length>0&&<button type="button" className="v6-clear-preview" onClick={()=>setPreviewByChild((current)=>({...current,[child.id]:{}}))}>清除全部試穿（{previewItems.length}）</button>}
        {feedback?.childId===child.id&&<div className={`v6-shop-feedback ${feedback.kind}`} role="status"><strong>{feedback.kind==='purchase'?'購買完成':'裝備更新'}</strong><span>{feedback.message}</span><div>{feedback.kind==='purchase'&&owned.has(feedback.itemId)&&!equipped.has(feedback.itemId)&&shopItemAvailability(shopItemById.get(feedback.itemId)!,child.avatar)==='available'&&<button type="button" disabled={pendingItems[feedback.itemId]} onClick={()=>void runAction(feedback.itemId,'equip')}>Equip Now</button>}<button type="button" className="secondary" onClick={()=>setFeedback(null)}>繼續瀏覽</button></div></div>}
        <div className="v6-shop-wallet-row"><div><strong>Lv.{level}</strong><span>{levelTitle(level)}</span></div><div className="v4-wallet"><Coins/><strong>{reward.coins}</strong><span>Coins</span></div></div>
      </div>
      <div className="v6-shop-catalog">
        <div className="v6-shop-category-tabs" role="tablist" aria-label="商品分類">{shopCategories.map((category)=><button type="button" role="tab" aria-selected={category.id===activeCategory.id} className={category.id===activeCategory.id?'active':''} key={category.id} onClick={()=>setActiveCategoryId(category.id)}>{category.label}</button>)}</div>
        <div className="v6-shop-category-heading"><span>{activeCategory.label}</span><strong>{visibleItems.length} 件商品</strong></div>
        <div className="v4-shop-grid">{visibleItems.map((item)=>{
          const legacy=cosmeticById.get(item.id);
          if (!legacy) return null;
          const availability=shopItemAvailability(item,child.avatar);
          const has=owned.has(item.id);
          const using=equipped.has(item.id);
          const pending=Boolean(pendingItems[item.id]);
          const canBuy=availability==='available'&&reward.coins>=item.cost&&level>=item.unlockLevel&&!pending;
          const canPreview=shopItemCanRender(item,child.avatar)&&!pending;
          const previewing=previewIds.has(item.id);
          const status=using?'Equipped':has?'Owned':availability==='incompatible'?'Incompatible':availability==='unavailable'?'Unavailable':level<item.unlockLevel?`Lv.${item.unlockLevel} Required`:reward.coins<item.cost?'Insufficient Coins':'Not Owned';
          return <article key={item.id} className={`${has?'owned':''} ${using?'equipped':''} ${previewing?'previewing':''} ${availability} rarity-${legacy.rarity??'common'}`}>
            <div className={`v4-item-art slot-${legacy.slot}`}><GameImage src={cosmeticAssetPath(legacy)} alt={item.name}/></div>
            <span>{legacy.rarity??'common'}</span>
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            <small>Lv.{item.unlockLevel} · {shopSlotLabels[legacy.slot] ?? legacy.slot}</small>
            <strong className={`v6-shop-item-status ${status.toLowerCase().replaceAll(' ','-')}`}>{status}</strong>
            <small className="v6-shop-contract">{shopItemStatusLabel(item,child.avatar)}</small>
            <button className="v6-preview-button" disabled={!canPreview} onClick={()=>setPreviewByChild((current)=>{const slots=current[child.id]??{};return {...current,[child.id]:previewing?Object.fromEntries(Object.entries(slots).filter(([slot])=>slot!==item.equipmentSlot)):{...slots,[item.equipmentSlot]:item.id}};})}>{availability!=='available'?'預覽不可用':previewing?'取消試穿':'Live Try-on'}</button>
            {has
              ? <button disabled={pending||(!using&&availability!=='available')} onClick={()=>void runAction(item.id,'equip')}>{pending?'處理中…':using?'卸下':'立即裝備'}</button>
              : <button disabled={!canBuy} onClick={()=>void runAction(item.id,'purchase')}><Coins/>{item.cost} {pending?'購買中…':availability==='unavailable'?'Unavailable':availability==='incompatible'?'Incompatible':level<item.unlockLevel?'尚未解鎖':reward.coins<item.cost?'Coins 不足':'購買'}</button>}
          </article>;
        })}</div>
      </div>
    </section>
  </SecondaryPageShell>;
}

function LearningMasteryPanel({ events, todayYmd }: { events: AnswerEvent[]; todayYmd: string }) {
  const profile = buildLearningProfile(events, todayYmd);
  const bandLabel = { 'not-assessed': '尚未評量', 'needs-review': '優先複習', learning: '學習中', developing: '逐步建立', mastered: '已掌握' } as const;
  return <section className="learning-mastery-panel" aria-label="學習能力掌握度">
    <header><h3>能力掌握度</h3><span>僅依真實互動與口說作答計算</span></header>
    <div className="learning-mastery-grid">{profile.skills.map((skill) => <article className={`learning-mastery-skill ${skill.band}`} key={skill.id}><span>{skill.label}</span><strong>{skill.score === null ? '—' : `${Math.round(skill.score)}%`}</strong><small>{skill.score === null ? '完成題目後開始評量' : `${bandLabel[skill.band]} · ${skill.correct}/${skill.attempts} 答對`}</small></article>)}</div>
    <p className="learning-review-summary">{profile.suggestion}</p>
    {profile.reviewTargets.length > 0 && <ul className="learning-review-list" aria-label="優先複習內容">{profile.reviewTargets.slice(0, 3).map((target) => <li key={target.target}>{target.target} · {target.incorrect ? `${target.incorrect} 次答錯` : '鞏固複習'}</li>)}</ul>}
  </section>;
}

export function ReportPage({ settings, progress, trustedDate, cloudStatus, isChildDayDone, onNavigate, onParentArea, onSettings, activeUser, parentPreviewUnlocked }:{settings:AppSettings;progress:AppProgress;trustedDate:TrustedTaipeiDate;cloudStatus:string;isChildDayDone:(childId:string,day:CourseDay)=>boolean;onNavigate:(view:DashboardViewKey)=>void;onParentArea:()=>void;onSettings:()=>void;activeUser?:FamilyUserProfile;parentPreviewUnlocked?:boolean}) {
  return <SecondaryPageShell settings={settings} progress={progress} active="report" trustedDate={trustedDate} cloudStatus={cloudStatus} onNavigate={onNavigate} onParentArea={onParentArea} activeUser={activeUser} parentPreviewUnlocked={parentPreviewUnlocked}>
    <section className="v4-page-heading"><div><h1>學習報表</h1><p>用遊戲品牌語言呈現完成率、科目、學習時間與成長，不做 Excel 風格後台。</p></div><button className="v4-settings-link" onClick={onSettings}><ShieldCheck/> 家長設定</button></section>
    <div className="v4-report-grid">{settings.children.filter((child)=>!child.disabled).map((child)=>{
      const r=playerResources(progress[child.id]); const doneDays=curriculum.filter((day)=>isChildDayDone(child.id,day)); const doneBlocks=new Set(progress[child.id]?.completedBlocks??[]); const subjectCounts=new Map<string,number>(); curriculum.flatMap((day)=>day.blocks).forEach((block)=>{ if(doneBlocks.has(block.id)) subjectCounts.set(block.subject,(subjectCounts.get(block.subject)??0)+1); }); const pct=Math.round(doneDays.length/curriculum.length*100); const datedDays=curriculum.map((day)=>({day,date:addCourseWeekdaysYmd(settings.semesterStart,day.index-1)})); const availableDays=datedDays.filter(({date})=>date<=trustedDate.ymd); const currentWeek=availableDays.at(-1)?.day.week??1; const availableWeek=availableDays.filter(({day})=>day.week===currentWeek); const weekDone=availableWeek.filter(({day})=>isChildDayDone(child.id,day)).length; const weekRate=availableWeek.length?Math.round(weekDone/availableWeek.length*100):0; const monthKey=trustedDate.ymd.slice(0,7); const availableMonth=availableDays.filter(({date})=>date.startsWith(monthKey)); const monthDone=availableMonth.filter(({day})=>isChildDayDone(child.id,day)).length; const monthRate=availableMonth.length?Math.round(monthDone/availableMonth.length*100):0; const minutes=doneBlocks.size*30; const answerEvents=progress[child.id]?.answerEvents??[]; const correctAnswers=answerEvents.filter((event)=>event.correct).length; const accuracy=answerEvents.length?Math.round(correctAnswers/answerEvents.length*100):null; const wrongCounts=new Map<string,number>(); answerEvents.filter((event)=>!event.correct).forEach((event)=>wrongCounts.set(event.target,(wrongCounts.get(event.target)??0)+1)); const mostWrong=Array.from(wrongCounts.entries()).sort((a,b)=>b[1]-a[1])[0];
      return <section className="v4-report-player" key={child.id}><header><AvatarHero avatarId={child.avatar} xp={r.xp} equippedCosmetics={progress[child.id]?.equippedCosmetics} size={110}/><div><h2>{child.name}</h2><p>Lv.{r.level} · {levelTitle(r.level)}</p></div><div className="v4-report-score"><strong>{pct}%</strong><span>學期完成率</span></div></header><div className="v4-report-kpis"><article><Check/><strong>{doneDays.length}</strong><span>完成天數</span></article><article><Zap/><strong>{r.xp}</strong><span>XP 成長</span></article><article><Coins/><strong>{r.coins}</strong><span>Coins</span></article><article><Award/><strong>{Object.keys(progress[child.id]?.badgeUnlocks??{}).length}</strong><span>徽章</span></article></div><div className="v4-report-kpis secondary"><article><CalendarDays/><strong>{Math.round(minutes/60*10)/10}</strong><span>學習小時</span></article><article><Star/><strong>{r.stars}</strong><span>Stars</span></article><article><Gem/><strong>{r.gems}</strong><span>Gems</span></article><article><Trophy/><strong>{weekDone}/{availableWeek.length||0}</strong><span>本週完成</span></article></div><div className="v4-report-periods"><article><span>本週</span><strong>{weekRate}%</strong><small>本週完成率 · {weekDone}/{availableWeek.length||0} 個已開放學習日</small></article><article><span>本月</span><strong>{monthRate}%</strong><small>本月完成率 · {monthDone}/{availableMonth.length||0} 個已開放學習日</small></article></div><div className="v4-answer-analytics"><article><span>互動答題準確率</span><strong>{accuracy===null?'—':`${accuracy}%`}</strong><small>{answerEvents.length?`${correctAnswers}/${answerEvents.length} 次答對`:'完成互動題後開始統計'}</small></article><article><span>本期最常答錯</span><strong>{mostWrong?.[0]??'—'}</strong><small>{mostWrong?`答錯 ${mostWrong[1]} 次`:'目前沒有錯題紀錄'}</small></article></div><LearningMasteryPanel events={answerEvents} todayYmd={trustedDate.ymd}/><div className="v4-subject-bars">{['English','Math','Zhuyin','Life','Science','Review'].map((subject)=>{ const count=subjectCounts.get(subject)??0; return <div key={subject}><span>{subject==='Zhuyin'?'中文語音':subject}</span><div><i style={{width:`${Math.min(100,count/30*100)}%`}}/></div><strong>{count}</strong></div>; })}</div><footer><span><Cloud/> 雲端已同步</span><span><Video/> 影片教材已備妥</span><span><ShieldCheck/> 家長 PIN 保護</span></footer></section>;
    })}</div>
  </SecondaryPageShell>;
}
