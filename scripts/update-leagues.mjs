import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = 'https://site.web.api.espn.com/apis/site/v2/sports/soccer';
const leagues = [
  { id:'eng.1', nameZh:'英格兰足球超级联赛', nameEn:'Premier League' },
  { id:'esp.1', nameZh:'西班牙足球甲级联赛', nameEn:'LaLiga' },
  { id:'ger.1', nameZh:'德国足球甲级联赛', nameEn:'Bundesliga' },
  { id:'ita.1', nameZh:'意大利足球甲级联赛', nameEn:'Serie A' },
  { id:'fra.1', nameZh:'法国足球甲级联赛', nameEn:'Ligue 1' }
];

const compact = date => date.toISOString().slice(0, 10).replaceAll('-', '');
const range = `${compact(new Date(Date.now() - 8 * 86400000))}-${compact(new Date(Date.now() + 24 * 86400000))}`;
const finite = value => value === null || value === '' || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value);
const moneylineChance = value => { const n=finite(value); return n===null ? null : n>=0 ? 100/(n+100) : -n/(-n+100); };
function prediction(competition) {
  const line=competition?.odds?.[0]?.moneyline;
  const raw=[moneylineChance(line?.home?.close?.odds),moneylineChance(line?.draw?.close?.odds),moneylineChance(line?.away?.close?.odds)];
  if(raw.some(value=>value===null)) return {};
  const total=raw.reduce((sum,value)=>sum+value,0), p=raw.map(value=>Math.round(value/total*100)); p[2]+=100-p.reduce((sum,value)=>sum+value,0);
  const [h,d,a]=p, score=h>=58?'2–0':a>=58?'0–2':h>=43?'2–1':a>=43?'1–2':d>=32?'1–1':'1–0';
  const alt={'2–0':'2–1','0–2':'1–2','2–1':'1–0','1–2':'0–1','1–1':'0–0','1–0':'2–1'}[score] || '1–1';
  return { predictedScore:score, alternativeScore:alt, probabilities:p, confidence:Math.min(88,Math.round(58+Math.max(...p)*.32)), halfFull:`平 / ${h>a&&h>d?'胜':a>h&&a>d?'负':'平'}`, factors:['公开赛前数据换算','主客场与近期状态'] };
}

const matches=[], teamMap=new Map();
for (const meta of leagues) {
  const response=await fetch(`${base}/${meta.id}/scoreboard?dates=${range}&limit=1000`, { headers:{ accept:'application/json' } });
  if(!response.ok) throw new Error(`${meta.id}: ${response.status}`);
  const feed=await response.json();
  for (const event of feed.events || []) {
    const competition=event.competitions?.[0] || {}, home=competition.competitors?.find(item=>item.homeAway==='home') || {}, away=competition.competitors?.find(item=>item.homeAway==='away') || {};
    if(!home.team?.id || !away.team?.id || !event.date) continue;
    const state=event.status?.type?.state || 'pre', completed=Boolean(event.status?.type?.completed || state==='post'), live=!completed&&state==='in';
    for (const competitor of [home,away]) {
      const team=competitor.team, code=`${meta.id}:${team.id}`;
      teamMap.set(code,{ code,shortCode:team.abbreviation||team.id,name:team.displayName||team.name,nameZh:team.displayName||team.name,nameEn:team.displayName||team.name,logo:team.logo||'',competitionId:meta.id,competitionName:meta.nameZh,form:String(competitor.form||'').split('').filter(Boolean),players:[],strength:'近期状态随实时赛程更新',risk:'伤停与首发以俱乐部官方公告为准' });
    }
    matches.push({
      id:String(event.id),competitionId:meta.id,competitionNameZh:meta.nameZh,competitionNameEn:meta.nameEn,stageSlug:'league',stageZh:'联赛',stageEn:'League',stage:'联赛',date:new Date(event.date).toISOString(),
      homeCode:`${meta.id}:${home.team.id}`,awayCode:`${meta.id}:${away.team.id}`,homeShortCode:home.team.abbreviation,awayShortCode:away.team.abbreviation,
      homeName:home.team.displayName||home.team.name,awayName:away.team.displayName||away.team.name,homeNameZh:home.team.displayName||home.team.name,awayNameZh:away.team.displayName||away.team.name,homeNameEn:home.team.displayName||home.team.name,awayNameEn:away.team.displayName||away.team.name,
      homeLogo:home.team.logo||'',awayLogo:away.team.logo||'',venue:competition.venue?.fullName||'场地待官方确认',status:event.status?.type?.name||state,statusText:state==='pre'?'未开赛':state==='in'?'进行中':'已结束',completed,live,
      homeScore:live||completed?finite(home.score?.value??home.score):null,awayScore:live||completed?finite(away.score?.value??away.score):null,displayClock:event.status?.displayClock||'',clockSeconds:finite(event.status?.clock),clockSnapshotAt:new Date().toISOString(),timeline:[],...(live||completed?{}:prediction(competition))
    });
  }
}

const output={ schemaVersion:1,savedAt:new Date().toISOString(),source:'ESPN public soccer data snapshot',range,matches,teams:[...teamMap.values()] };
await fs.mkdir(path.join(root,'assets','data'),{recursive:true});
await fs.writeFile(path.join(root,'assets','data','leagues-snapshot.json'),JSON.stringify(output,null,2)+'\n','utf8');
console.log(`Saved ${matches.length} matches and ${teamMap.size} teams across five leagues.`);
