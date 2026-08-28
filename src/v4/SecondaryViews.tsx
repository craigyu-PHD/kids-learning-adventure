import { useState } from 'react';
import {
  Award, CalendarDays, Check, ChevronRight, Cloud, Coins, Gem, Gift, History,
  Lock, Rocket, ShieldCheck, ShoppingBag, Star, Trophy, Video, X, Zap,
} from 'lucide-react';
import { curriculum } from '../data/curriculum';
import AvatarHero from '../components/AvatarHero';
import GameBadge from '../components/GameBadge';
import { badges } from '../badges';
import { cosmetics } from '../cosmetics';
import { calculateRewards, easterEggDays, levelFromXp, normalizeProgress } from '../rewards';
import type { AppProgress, AppSettings, CourseDay, FamilyUserProfile } from '../types';
import type { CourseDayAccess, TrustedTaipeiDate } from '../dailyChallenge';
import { addCourseWeekdaysYmd, formatTaipeiCourseDate } from '../dailyChallenge';
import { AdventureHeader, BottomStatusBar, MainNavigation, type ViewKey } from './Dashboard';
import { levelTitle, playerResources, subjectLabel } from './model';
import GameImage from './GameImage';
import GameIcon from './GameIcon';

const shopSlotLabels: Record<string,string> = {
  hairstyle:'髮型', outfit:'服裝', hat:'帽子', glasses:'眼鏡', backpack:'背包', cape:'披風', headphones:'耳機',
  spaceship:'太空船', room:'基地房間', robot:'AI 夥伴', card:'卡片背景', effect:'互動特效',
};

type ShellProps = {
  settings: AppSettings;
  progress?: AppProgress;
  active: ViewKey;
  trustedDate: TrustedTaipeiDate;
  cloudStatus: string;
  onNavigate: (view: ViewKey) => void;
  onParentArea: () => void;
  activeUser?: FamilyUserProfile;
  parentPreviewUnlocked?: boolean;
  children: React.ReactNode;
};

export function V4PageShell(props: ShellProps) {
  return <div className="v4-shell v4-secondary-shell">
    <AdventureHeader settings={props.settings} progress={props.progress} activeUser={props.activeUser} parentPreviewUnlocked={props.parentPreviewUnlocked} onParentArea={props.onParentArea}/>
    <MainNavigation active={props.active} onNavigate={props.onNavigate} onParentArea={props.onParentArea}/>
    <main className="v4-secondary-main">{props.children}</main>
    <BottomStatusBar cloudStatus={props.cloudStatus} trustedDate={props.trustedDate}/>
  </div>;
}

function HistoryDayPanel({ day, date, settings, progress, showLessonDetails, onClose }: { day: CourseDay; date: string; settings: AppSettings; progress: AppProgress; showLessonDetails: boolean; onClose: () => void }) {
  return <div className="v4-history-scrim" role="dialog" aria-modal="true" aria-label={`Day ${day.index} 歷史學習紀錄`}>
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
  const subjects = [...new Set(day.blocks.map((block) => subjectLabel(block.subject)))];
  return <div className="v4-history-scrim" role="dialog" aria-modal="true" aria-label={`Day ${day.index} 主題預告`}>
    <section className="v4-history-panel v53-teaser-panel">
      <button className="v4-history-close" onClick={onClose} aria-label="關閉主題預告"><X/></button>
      <header><div><span>ADVENTURE TEASER</span><h2>Day {day.index} 的冒險主題</h2><p>{formatTaipeiCourseDate(date)} 開放後，就能和家長一起開始今天的挑戰。</p></div><Lock/></header>
      <div className="v53-teaser-theme"><Rocket/><div><strong>{day.theme}</strong><p>{day.bigIdea}</p><span>{subjects.join(' · ')}</span></div></div>
      <footer><ShieldCheck/> 先保留一點明天的驚喜。家長 PIN 模式可完整預覽 90 天教材與照顧者提示。</footer>
    </section>
  </div>;
}

export function V4SemesterPage({ settings, progress, trustedDate, cloudStatus, courseDateKey, accessForDay, isDayDone, onOpenLesson, onNavigate, onParentArea, parentPreviewUnlocked, activeUser }:{
  settings:AppSettings; progress:AppProgress; trustedDate:TrustedTaipeiDate; cloudStatus:string; courseDateKey:(day:CourseDay)=>string; accessForDay:(day:CourseDay)=>CourseDayAccess; isDayDone:(day:CourseDay)=>boolean; onOpenLesson:(day:CourseDay,index:0|1)=>void; onNavigate:(view:ViewKey)=>void; onParentArea:()=>void; parentPreviewUnlocked:boolean; activeUser?:FamilyUserProfile;
}) {
  const [historyDay,setHistoryDay]=useState<CourseDay|null>(null);
  const [teaserDay,setTeaserDay]=useState<CourseDay|null>(null);
  return <V4PageShell settings={settings} progress={progress} active="semester" trustedDate={trustedDate} cloudStatus={cloudStatus} onNavigate={onNavigate} onParentArea={onParentArea} activeUser={activeUser} parentPreviewUnlocked={parentPreviewUnlocked}>
    <section className="v4-page-heading"><div><span>18 WEEKS · 90 DAYS</span><h1>學期日曆</h1><p>{parentPreviewUnlocked ? '家長備課已解鎖：可完整預覽未來教材與回看過去教案；只有 server verified 的今天才會結算獎勵。' : '孩子可先看未來主題、回顧自己的成果；完整教材由家長 PIN 模式保護。'}</p></div><div className="v4-page-kpi"><GameIcon size="lg"><CalendarDays/></GameIcon><strong>{curriculum.filter(isDayDone).length}</strong><span>/ 90 完成</span></div></section>
    <div className="v4-semester-weeks">{Array.from({length:18},(_,weekIndex)=>{
      const days=curriculum.filter((day)=>day.week===weekIndex+1); const done=days.filter(isDayDone).length;
      return <section className="v4-week-strip" key={weekIndex}><header><span>WEEK {String(weekIndex+1).padStart(2,'0')}</span><h2>{days[0]?.theme}</h2><strong>{done}/5</strong></header><div>{days.map((day)=>{
        const access=accessForDay(day); const completed=isDayDone(day); const special=easterEggDays.has(day.index); const date=courseDateKey(day);
        return <article className={`v4-semester-day ${completed?'done':access} ${special?'special':''}`} key={day.id}>
          <div className="v4-semester-orb">{completed?<Check/>:access==='today'?<Rocket/>:access==='future'?<Video/>:<History/>}</div>
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
  </V4PageShell>;
}

export function V4AchievementsPage({ settings, progress, trustedDate, cloudStatus, onNavigate, onParentArea, activeUser, parentPreviewUnlocked }:{settings:AppSettings;progress:AppProgress;trustedDate:TrustedTaipeiDate;cloudStatus:string;onNavigate:(view:ViewKey)=>void;onParentArea:()=>void;activeUser?:FamilyUserProfile;parentPreviewUnlocked?:boolean}) {
  return <V4PageShell settings={settings} progress={progress} active="achievements" trustedDate={trustedDate} cloudStatus={cloudStatus} onNavigate={onNavigate} onParentArea={onParentArea} activeUser={activeUser} parentPreviewUnlocked={parentPreviewUnlocked}>
    <section className="v4-page-heading"><div><span>BADGE COLLECTION</span><h1>成就獎勵</h1><p>每個孩子的徽章、Stars 與 Gems 都獨立保存。</p></div><div className="v4-page-kpi purple"><GameIcon tone="purple" size="lg"><Award/></GameIcon><strong>24</strong><span>原創徽章</span></div></section>
    <div className="v4-achievement-learners">{settings.children.filter((child)=>!child.disabled).map((child)=>{ const p=progress[child.id]; const r=playerResources(p); const unlocks=p?.badgeUnlocks??{}; return <section className="v4-achievement-card" key={child.id}><header><AvatarHero avatarId={child.avatar} xp={r.xp} equippedCosmetics={p?.equippedCosmetics} size={104}/><div><span>PLAYER</span><h2>{child.name}</h2><p>Lv.{r.level} · {levelTitle(r.level)}</p></div><div className="v4-achievement-resources"><span><Star/>{r.stars}</span><span><Gem/>{r.gems}</span></div></header><div className="v4-full-badge-grid">{badges.map((badge)=><GameBadge key={badge.id} badge={badge} unlocked={Boolean(unlocks[badge.id])} earnedDate={unlocks[badge.id]}/>)}</div></section>; })}</div>
  </V4PageShell>;
}

export function V4ShopPage({ settings, progress, trustedDate, cloudStatus, onNavigate, onParentArea, onUnlock, onToggle, activeUser, parentPreviewUnlocked }:{settings:AppSettings;progress:AppProgress;trustedDate:TrustedTaipeiDate;cloudStatus:string;onNavigate:(view:ViewKey)=>void;onParentArea:()=>void;onUnlock:(childId:string,itemId:string)=>void;onToggle:(childId:string,itemId:string)=>void;activeUser?:FamilyUserProfile;parentPreviewUnlocked?:boolean}) {
  return <V4PageShell settings={settings} progress={progress} active="shop" trustedDate={trustedDate} cloudStatus={cloudStatus} onNavigate={onNavigate} onParentArea={onParentArea} activeUser={activeUser} parentPreviewUnlocked={parentPreviewUnlocked}>
    <section className="v4-page-heading"><div><span>COIN SHOP · NO REAL MONEY</span><h1>寶物商店</h1><p>Coins 只來自學習完成紀錄。購買後立即加入角色裝備，不含真實金錢與抽卡。</p></div><div className="v4-page-kpi gold"><GameIcon tone="gold" size="lg"><ShoppingBag/></GameIcon><strong>{cosmetics.length}</strong><span>冒險商品</span></div></section>
    <div className="v4-shop-learners">{settings.children.filter((child)=>!child.disabled).map((child)=>{
      const p=progress[child.id]; const reward=calculateRewards(p); const owned=new Set(p?.unlockedCosmetics??[]); const equipped=new Set(p?.equippedCosmetics??[]); const level=Math.min(15,levelFromXp(reward.xp));
      return <section className="v4-shop-card" key={child.id}><header><AvatarHero avatarId={child.avatar} xp={reward.xp} equippedCosmetics={p?.equippedCosmetics} size={120}/><div><span>SHOPPING FOR</span><h2>{child.name}</h2><p>Lv.{level} · {levelTitle(level)}</p></div><div className="v4-wallet"><Coins/><strong>{reward.coins}</strong><span>Coins</span></div></header><div className="v4-shop-grid">{cosmetics.map((item)=>{
        const has=owned.has(item.id); const using=equipped.has(item.id); const canBuy=reward.coins>=item.cost&&level>=item.unlockLevel;
        return <article key={item.id} className={`${has?'owned':''} ${using?'equipped':''} rarity-${item.rarity??'common'}`}><div className={`v4-item-art slot-${item.slot}`}><GameImage src={`${import.meta.env.BASE_URL}assets/v5/items/${item.id}.webp`} alt={item.name}/></div><span>{item.rarity??'common'}</span><h3>{item.name}</h3><p>{item.description}</p><small>Lv.{item.unlockLevel} · {shopSlotLabels[item.slot] ?? item.slot}</small>{has?<button onClick={()=>onToggle(child.id,item.id)}>{using?'卸下':'立即裝備'}</button>:<button disabled={!canBuy} onClick={()=>onUnlock(child.id,item.id)}><Coins/>{item.cost} {canBuy?'購買':'尚未解鎖'}</button>}</article>;
      })}</div></section>;
    })}</div>
  </V4PageShell>;
}

export function V4ReportPage({ settings, progress, trustedDate, cloudStatus, isChildDayDone, onNavigate, onParentArea, onSettings, activeUser, parentPreviewUnlocked }:{settings:AppSettings;progress:AppProgress;trustedDate:TrustedTaipeiDate;cloudStatus:string;isChildDayDone:(childId:string,day:CourseDay)=>boolean;onNavigate:(view:ViewKey)=>void;onParentArea:()=>void;onSettings:()=>void;activeUser?:FamilyUserProfile;parentPreviewUnlocked?:boolean}) {
  return <V4PageShell settings={settings} progress={progress} active="report" trustedDate={trustedDate} cloudStatus={cloudStatus} onNavigate={onNavigate} onParentArea={onParentArea} activeUser={activeUser} parentPreviewUnlocked={parentPreviewUnlocked}>
    <section className="v4-page-heading"><div><span>PARENT ANALYTICS · PIN PROTECTED</span><h1>學習報表</h1><p>用遊戲品牌語言呈現完成率、科目、學習時間與成長，不做 Excel 風格後台。</p></div><button className="v4-settings-link" onClick={onSettings}><ShieldCheck/> 家長設定</button></section>
    <div className="v4-report-grid">{settings.children.filter((child)=>!child.disabled).map((child)=>{
      const r=playerResources(progress[child.id]); const doneDays=curriculum.filter((day)=>isChildDayDone(child.id,day)); const doneBlocks=new Set(progress[child.id]?.completedBlocks??[]); const subjectCounts=new Map<string,number>(); curriculum.flatMap((day)=>day.blocks).forEach((block)=>{ if(doneBlocks.has(block.id)) subjectCounts.set(block.subject,(subjectCounts.get(block.subject)??0)+1); }); const pct=Math.round(doneDays.length/curriculum.length*100); const datedDays=curriculum.map((day)=>({day,date:addCourseWeekdaysYmd(settings.semesterStart,day.index-1)})); const availableDays=datedDays.filter(({date})=>date<=trustedDate.ymd); const currentWeek=availableDays.at(-1)?.day.week??1; const availableWeek=availableDays.filter(({day})=>day.week===currentWeek); const weekDone=availableWeek.filter(({day})=>isChildDayDone(child.id,day)).length; const weekRate=availableWeek.length?Math.round(weekDone/availableWeek.length*100):0; const monthKey=trustedDate.ymd.slice(0,7); const availableMonth=availableDays.filter(({date})=>date.startsWith(monthKey)); const monthDone=availableMonth.filter(({day})=>isChildDayDone(child.id,day)).length; const monthRate=availableMonth.length?Math.round(monthDone/availableMonth.length*100):0; const minutes=doneBlocks.size*30; const answerEvents=progress[child.id]?.answerEvents??[]; const correctAnswers=answerEvents.filter((event)=>event.correct).length; const accuracy=answerEvents.length?Math.round(correctAnswers/answerEvents.length*100):null; const wrongCounts=new Map<string,number>(); answerEvents.filter((event)=>!event.correct).forEach((event)=>wrongCounts.set(event.target,(wrongCounts.get(event.target)??0)+1)); const mostWrong=Array.from(wrongCounts.entries()).sort((a,b)=>b[1]-a[1])[0];
      return <section className="v4-report-player" key={child.id}><header><AvatarHero avatarId={child.avatar} xp={r.xp} equippedCosmetics={progress[child.id]?.equippedCosmetics} size={110}/><div><span>LEARNER</span><h2>{child.name}</h2><p>Lv.{r.level} · {levelTitle(r.level)}</p></div><div className="v4-report-score"><strong>{pct}%</strong><span>學期完成率</span></div></header><div className="v4-report-kpis"><article><Check/><strong>{doneDays.length}</strong><span>完成天數</span></article><article><Zap/><strong>{r.xp}</strong><span>XP 成長</span></article><article><Coins/><strong>{r.coins}</strong><span>Coins</span></article><article><Award/><strong>{Object.keys(progress[child.id]?.badgeUnlocks??{}).length}</strong><span>徽章</span></article></div><div className="v4-report-kpis secondary"><article><CalendarDays/><strong>{Math.round(minutes/60*10)/10}</strong><span>學習小時</span></article><article><Star/><strong>{r.stars}</strong><span>Stars</span></article><article><Gem/><strong>{r.gems}</strong><span>Gems</span></article><article><Trophy/><strong>{weekDone}/{availableWeek.length||0}</strong><span>本週完成</span></article></div><div className="v4-report-periods"><article><span>THIS WEEK</span><strong>{weekRate}%</strong><small>本週完成率 · {weekDone}/{availableWeek.length||0} 個已開放學習日</small></article><article><span>THIS MONTH</span><strong>{monthRate}%</strong><small>本月完成率 · {monthDone}/{availableMonth.length||0} 個已開放學習日</small></article></div><div className="v4-answer-analytics"><article><span>QUICK CHECK ACCURACY</span><strong>{accuracy===null?'—':`${accuracy}%`}</strong><small>{answerEvents.length?`${correctAnswers}/${answerEvents.length} 次答對`:'完成互動題後開始統計'}</small></article><article><span>MOST MISSED WORD</span><strong>{mostWrong?.[0]??'—'}</strong><small>{mostWrong?`答錯 ${mostWrong[1]} 次`:'目前沒有錯題紀錄'}</small></article></div><div className="v4-subject-bars">{['English','Math','Zhuyin','Life','Science','Review'].map((subject)=>{ const count=subjectCounts.get(subject)??0; return <div key={subject}><span>{subject==='Zhuyin'?'中文語音':subject}</span><div><i style={{width:`${Math.min(100,count/30*100)}%`}}/></div><strong>{count}</strong></div>; })}</div><footer><span><Cloud/> 雲端 {cloudStatus}</span><span><Video/> 影片教材 360 unique</span><span><ShieldCheck/> PIN protected</span></footer></section>;
    })}</div>
  </V4PageShell>;
}
