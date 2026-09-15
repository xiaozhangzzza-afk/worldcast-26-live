import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_URL = 'https://site.web.api.espn.com/apis/site/v2/sports/soccer';
const TOURNAMENT = 'fifa.world';
const TOURNAMENT_RANGE = '20260611-20260719';
const HISTORY_RANGE = '20250101-20260719';

const zh = {
  ARG:'阿根廷',ALG:'阿尔及利亚',AUS:'澳大利亚',AUT:'奥地利',BEL:'比利时',BIH:'波黑',BRA:'巴西',CAN:'加拿大',CPV:'佛得角',COL:'哥伦比亚',CRC:'哥斯达黎加',CRO:'克罗地亚',CUW:'库拉索',CZE:'捷克',COD:'刚果（金）',CIV:'科特迪瓦',ECU:'厄瓜多尔',EGY:'埃及',ENG:'英格兰',FRA:'法国',GER:'德国',GHA:'加纳',HAI:'海地',IRN:'伊朗',IRQ:'伊拉克',JPN:'日本',JOR:'约旦',KOR:'韩国',MEX:'墨西哥',MAR:'摩洛哥',NED:'荷兰',NZL:'新西兰',NOR:'挪威',PAN:'巴拿马',PAR:'巴拉圭',POR:'葡萄牙',QAT:'卡塔尔',KSA:'沙特阿拉伯',SCO:'苏格兰',SEN:'塞内加尔',RSA:'南非',ESP:'西班牙',SUI:'瑞士',SWE:'瑞典',TUN:'突尼斯',TUR:'土耳其',USA:'美国',UZB:'乌兹别克斯坦',URU:'乌拉圭'
};
const positionZh = { Goalkeeper:'门将', Defender:'后卫', Midfielder:'中场', Forward:'前锋' };
const stageZh = {'group-stage':'小组赛','round-of-32':'32强','round-of-16':'16强','quarterfinals':'四分之一决赛','semifinals':'半决赛','3rd-place-match':'三四名决赛','final':'决赛'};

async function getJson(url, retries = 3) {
  let error;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'WorldCast26/1.0' } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (e) {
      error = e;
      await new Promise(resolve => setTimeout(resolve, 600 * (i + 1)));
    }
  }
  throw error;
}

function moneylineProbability(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n > 0 ? 100 / (n + 100) : -n / (-n + 100);
}

function probabilities(odds) {
  const ml = odds?.moneyline;
  const raw = [moneylineProbability(ml?.home?.close?.odds), moneylineProbability(ml?.draw?.close?.odds), moneylineProbability(ml?.away?.close?.odds)];
  if (raw.some(v => v == null)) return [40, 30, 30];
  const total = raw.reduce((a, b) => a + b, 0);
  const p = raw.map(v => Math.round(v / total * 100));
  p[1] += 100 - p.reduce((a, b) => a + b, 0);
  return p;
}

function predictScore(p) {
  if (p[0] >= 72) return '3–0';
  if (p[0] >= 58) return '2–0';
  if (p[0] >= 45) return '2–1';
  if (p[2] >= 65) return '0–2';
  if (p[2] >= 42) return '1–2';
  return '1–1';
}

function alternativeScore(primary) {
  return ({'3–0':'2–0','2–0':'3–0','2–1':'1–0','1–0':'2–1','1–1':'0–0','0–0':'1–1','1–2':'0–1','0–1':'1–2','0–2':'0–1'})[primary] || '1–1';
}

const verifiedPlayerZh = {
  'Lionel Messi':'利昂内尔·梅西','Cristiano Ronaldo':'克里斯蒂亚诺·罗纳尔多','Kylian Mbappé':'基利安·姆巴佩','Neymar':'内马尔','Vinícius Júnior':'维尼修斯·儒尼奥尔','Jude Bellingham':'裘德·贝林厄姆','Harry Kane':'哈里·凯恩','Bukayo Saka':'布卡约·萨卡','Phil Foden':'菲尔·福登','Lamine Yamal':'拉明·亚马尔','Pedri':'佩德里','Gavi':'加维','Rodri':'罗德里','Jamal Musiala':'贾马尔·穆西亚拉','Florian Wirtz':'弗洛里安·维尔茨','Joshua Kimmich':'约书亚·基米希','Kai Havertz':'凯·哈弗茨','Antoine Griezmann':'安托万·格列兹曼','Ousmane Dembélé':'奥斯曼·登贝莱','William Saliba':'威廉·萨利巴','Virgil van Dijk':'维吉尔·范戴克','Cody Gakpo':'科迪·加克波','Frenkie de Jong':'弗兰基·德容','Bruno Fernandes':'布鲁诺·费尔南德斯','Bernardo Silva':'贝尔纳多·席尔瓦','Rafael Leão':'拉斐尔·莱奥','João Félix':'若昂·菲利克斯','Federico Valverde':'费德里科·巴尔韦德','Luis Suárez':'路易斯·苏亚雷斯','Darwin Núñez':'达尔文·努涅斯','Lautaro Martínez':'劳塔罗·马丁内斯','Julián Álvarez':'胡利安·阿尔瓦雷斯','Emiliano Martínez':'埃米利亚诺·马丁内斯','Alexis Mac Allister':'亚历克西斯·麦卡利斯特','Enzo Fernández':'恩佐·费尔南德斯','Raphinha':'拉菲尼亚','Marquinhos':'马尔基尼奥斯','Alisson':'阿利松','Ederson':'埃德森','Son Heung-Min':'孙兴慜','Kim Min-Jae':'金玟哉','Takefusa Kubo':'久保建英','Kaoru Mitoma':'三笘薰','Daichi Kamada':'镰田大地','Alphonso Davies':'阿方索·戴维斯','Jonathan David':'乔纳森·戴维','Christian Pulisic':'克里斯蒂安·普利西奇','Weston McKennie':'韦斯顿·麦肯尼','Guillermo Ochoa':'吉列尔莫·奥乔亚','Raúl Jiménez':'劳尔·希门尼斯','Santiago Giménez':'圣地亚哥·希门尼斯','Achraf Hakimi':'阿什拉夫·哈基米','Hakim Ziyech':'哈基姆·齐耶赫','Mohamed Salah':'穆罕默德·萨拉赫'
};

const communityPlayerZh = new Map();
const normalizePlayerKey = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').replace(/\s+/g,' ').trim();

async function loadCommunityPlayerNames() {
  const sources = [
    ['https://raw.githubusercontent.com/cairongquan/world_cup_2026/c92b8425be66cbd8d36ac0a41bcda993d3f1899f/scripts/lib/player-meta.mjs', /'([^']+)'\s*:\s*\{\s*zh:\s*'([^']+)'/g],
    ['https://raw.githubusercontent.com/cshandsome-top/worldcup2026/6c173f4efc3186c9db329263d6ebe4c22001574c/js/zh-names.js', /"([^"]+)"\s*:\s*"([^"]+)"/g]
  ];
  for (const [url, pattern] of sources) {
    try {
      const text = await (await fetch(url, { headers:{ 'user-agent':'WorldCast26/1.0' } })).text();
      for (const match of text.matchAll(pattern)) if (match[1] && match[2]) communityPlayerZh.set(normalizePlayerKey(match[1]), match[2]);
    } catch {}
  }
}

function chinesePlayerName(name) {
  if (verifiedPlayerZh[name]) return verifiedPlayerZh[name];
  if (communityPlayerZh.has(normalizePlayerKey(name))) return communityPlayerZh.get(normalizePlayerKey(name));
  const chunks = {'sch':'施','sh':'什','ch':'奇','th':'特','ph':'菲','ll':'利','qu':'库','gu':'古','jo':'若','ja':'哈','je':'耶','ji':'吉','ca':'卡','co':'科','cu':'库','ce':'塞','ci':'西','ra':'拉','re':'雷','ri':'里','ro':'罗','ru':'鲁','la':'拉','le':'莱','li':'利','lo':'洛','lu':'卢','ma':'马','me':'梅','mi':'米','mo':'莫','mu':'穆','na':'纳','ne':'内','ni':'尼','no':'诺','nu':'努','sa':'萨','se':'塞','si':'西','so':'索','su':'苏','ta':'塔','te':'特','ti':'蒂','to':'托','tu':'图','va':'瓦','ve':'维','vi':'维','vo':'沃','za':'扎','ze':'泽','zi':'齐','a':'阿','b':'布','c':'克','d':'德','e':'埃','f':'弗','g':'格','h':'赫','i':'伊','j':'杰','k':'克','l':'尔','m':'姆','n':'恩','o':'奥','p':'普','q':'库','r':'尔','s':'斯','t':'特','u':'乌','v':'维','w':'沃','x':'克斯','y':'伊','z':'兹'};
  return String(name || '球员').split(/[\s-]+/).filter(Boolean).map(word => {
    let value = word.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,''), output = '';
    while (value) {
      const key = [3,2,1].map(size => value.slice(0,size)).find(part => chunks[part]);
      if (!key) { value=value.slice(1); continue; }
      output += chunks[key]; value=value.slice(key.length);
    }
    return output || '球员';
  }).join('·');
}

function chinesePlayerNameSource(name) {
  return verifiedPlayerZh[name] ? 'verified' : communityPlayerZh.has(normalizePlayerKey(name)) ? 'community' : 'auto';
}

function resultLabel(home, away) {
  return home > away ? '胜' : home < away ? '负' : '平';
}

function scoreNumbers(score) {
  const values = String(score).match(/\d+/g)?.map(Number) || [];
  return values.length >= 2 ? values.slice(0, 2) : [0, 0];
}

function predictedHalfFull(p, score) {
  const [home, away] = scoreNumbers(score);
  const full = resultLabel(home, away);
  const half = full === '胜' && p[0] >= 62 ? '胜' : full === '负' && p[2] >= 62 ? '负' : '平';
  return `${half} / ${full}`;
}

function actualHalfTime(competition, home, away) {
  const details = competition.details;
  if (!Array.isArray(details)) return null;
  let homeGoals = 0, awayGoals = 0;
  for (const play of details) {
    if (!play.scoringPlay || play.shootout || Number(play.clock?.value) > 2700) continue;
    if (String(play.team?.id) === String(home.team?.id)) homeGoals += Number(play.scoreValue || 1);
    if (String(play.team?.id) === String(away.team?.id)) awayGoals += Number(play.scoreValue || 1);
  }
  return { home:homeGoals, away:awayGoals, score:`${homeGoals}–${awayGoals}`, result:resultLabel(homeGoals, awayGoals) };
}

function normalizeTimeline(summary, event) {
  const competition = event.competitions?.[0] || {};
  const home = competition.competitors?.find(t => t.homeAway === 'home') || {};
  const away = competition.competitors?.find(t => t.homeAway === 'away') || {};
  return (summary.keyEvents || []).filter(play => play.scoringPlay || ['yellow-card','red-card'].includes(play.type?.type)).map(play => {
    const rawType = play.type?.type || '';
    const text = play.text || '';
    const ownGoal = Boolean(play.ownGoal) || /own goal/i.test(text) || /own-goal/i.test(rawType);
    const penalty = Boolean(play.penaltyKick) || /penalty/i.test(rawType) || /penalty/i.test(text);
    const header = /header/i.test(rawType) || /header/i.test(text);
    const type = play.scoringPlay ? 'goal' : rawType === 'red-card' ? 'red' : 'yellow';
    const people = (play.participants || []).map(p => p.athlete?.displayName).filter(Boolean);
    const teamId = String(play.team?.id || '');
    return {
      id:play.id || `${play.clock?.value}-${type}-${teamId}`,
      minute:play.clock?.displayValue || '',
      clock:Number(play.clock?.value || 0),
      period:Number(play.period?.number || 0),
      type,
      team:teamId === String(home.team?.id) ? home.team?.abbreviation : teamId === String(away.team?.id) ? away.team?.abbreviation : '',
      side:teamId === String(home.team?.id) ? 'home' : teamId === String(away.team?.id) ? 'away' : 'neutral',
      player:people[0] || '球员待确认',
      playerZh:chinesePlayerName(people[0] || ''),
      assist:type === 'goal' && !ownGoal ? people[1] || '' : '',
      assistZh:type === 'goal' && !ownGoal && people[1] ? chinesePlayerName(people[1]) : '',
      goalKind:type === 'goal' ? ownGoal ? '乌龙球' : penalty ? '点球' : header ? '头球' : '正常进球' : '',
      ownGoal,
      description:text
    };
  }).sort((a, b) => a.clock - b.clock);
}

function normalizeEvent(event, matchNo) {
  const competition = event.competitions?.[0] || {};
  const home = competition.competitors?.find(t => t.homeAway === 'home') || {};
  const away = competition.competitors?.find(t => t.homeAway === 'away') || {};
  const p = probabilities(competition.odds?.[0]);
  const completed = Boolean(event.status?.type?.completed);
  const live = event.status?.type?.state === 'in';
  const prediction = predictScore(p);
  const alternative = alternativeScore(prediction);
  const halfTime = actualHalfTime(competition, home, away);
  const finalHome = Number(home.score || 0), finalAway = Number(away.score || 0);
  const halfFull = completed
    ? halfTime ? `${halfTime.result} / ${resultLabel(finalHome, finalAway)}` : '暂无半场数据'
    : live
      ? Number(event.status?.period || 0) >= 2 && halfTime ? `${halfTime.result} / 进行中` : '半场进行中'
      : predictedHalfFull(p, prediction);
  return {
    id: event.id,
    matchNo,
    date: event.date,
    stage: stageZh[event.season?.slug] || event.season?.slug || '世界杯',
    stageSlug: event.season?.slug || '',
    group: (competition.altGameNote?.match(/Group\s+([A-L])/i) || [])[1]?.toUpperCase() || '',
    status: event.status?.type?.name || '',
    statusText: event.status?.type?.description || '',
    completed,
    period:Number(event.status?.period || 0),
    displayClock:event.status?.displayClock || '',
    clockSeconds:Number(event.status?.clock || 0),
    clockSnapshotAt:new Date().toISOString(),
    progress:completed ? 100 : live ? Math.max(1, Math.min(99, Math.round(Number(event.status?.clock || 0) / 54))) : 0,
    home: home.team?.abbreviation || 'TBD',
    away: away.team?.abbreviation || 'TBD',
    homeName: zh[home.team?.abbreviation] || home.team?.displayName || '待定',
    awayName: zh[away.team?.abbreviation] || away.team?.displayName || '待定',
    homeScore: finalHome,
    awayScore: finalAway,
    score: completed || live ? `${home.score || 0}–${away.score || 0}` : prediction,
    alternativeScore:completed || live ? '' : alternative,
    scoreType: completed ? '赛果' : live ? '实时比分' : '预测比分',
    probabilities: p,
    halfTimeScore: halfTime?.score || '',
    halfFull,
    halfFullType: completed ? 'actual' : live ? 'live' : 'prediction',
    halfFullLabel: completed ? '半全场赛果' : live ? '半全场状态' : '半全场预测',
    venue: competition.venue?.fullName || '场地待定',
    city: competition.venue?.address?.city || '',
    broadcast: competition.broadcasts?.flatMap(b => b.names || []) || []
  };
}

function recentForTeam(data, code) {
  return (data.events || []).filter(event => {
    const competitors = event.competitions?.[0]?.competitors || [];
    return new Date(event.date) < new Date() && competitors.length === 2 && competitors.every(c => c.score?.value != null || Number.isFinite(Number(c.score)));
  }).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10).map(event => {
    const competitors = event.competitions?.[0]?.competitors || [];
    const self = competitors.find(c => c.team?.abbreviation === code) || {};
    const opponent = competitors.find(c => c.team?.abbreviation !== code) || {};
    const own = Number(self.score?.value ?? self.score ?? 0), other = Number(opponent.score?.value ?? opponent.score ?? 0);
    return { date:event.date, opponent:zh[opponent.team?.abbreviation] || opponent.team?.displayName || '未知', score:`${own}-${other}`, result:own > other ? 'W' : own === other ? 'D' : 'L', competition:event.season?.name || '' };
  });
}

async function concurrentMap(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      try { results[index] = await worker(items[index], index); }
      catch (error) { results[index] = { error: error.message }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

await loadCommunityPlayerNames();
const scoreboard = await getJson(`${DATA_URL}/${TOURNAMENT}/scoreboard?dates=${TOURNAMENT_RANGE}&limit=200`);
const sortedEvents = [...(scoreboard.events || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
const fixtures = sortedEvents.map((event, index) => normalizeEvent(event, index + 1));
const timelineEvents = sortedEvents.filter(event => ['in','post'].includes(event.status?.type?.state));
const timelineData = await concurrentMap(timelineEvents, 8, async event => {
  const summary = await getJson(`${DATA_URL}/${TOURNAMENT}/summary?event=${event.id}`);
  return { id:event.id, timeline:normalizeTimeline(summary, event) };
});
const timelineById = new Map(timelineData.filter(item => item && !item.error).map(item => [item.id, item.timeline]));
for (const fixture of fixtures) fixture.timeline = timelineById.get(fixture.id) || [];
const teamIndex = new Map();
for (const event of sortedEvents) {
  for (const competitor of event.competitions?.[0]?.competitors || []) {
    const team = competitor.team;
    if (team?.id && team?.abbreviation && zh[team.abbreviation]) teamIndex.set(team.abbreviation, { id:team.id, code:team.abbreviation, name:zh[team.abbreviation], nameEn:team.displayName, logo:team.logo || '', color:team.color || '24496b' });
  }
}

const teamList = [...teamIndex.values()];
const details = await concurrentMap(teamList, 6, async team => {
  const [roster, schedule] = await Promise.all([
    getJson(`${DATA_URL}/${TOURNAMENT}/teams/${team.id}/roster`),
    getJson(`${DATA_URL}/all/teams/${team.id}/schedule?dates=${HISTORY_RANGE}`)
  ]);
  const players = (roster.athletes || []).map(a => ({
    id:a.id, name:a.displayName, nameZh:chinesePlayerName(a.displayName), nameZhSource:chinesePlayerNameSource(a.displayName), shortName:a.shortName, number:a.jersey || '', position:positionZh[a.position?.displayName] || a.position?.displayName || '球员', age:a.age || null,
    injuries:(a.injuries || []).map(i => ({ status:i.status || i.type?.description || '伤情待确认', detail:i.details || i.detail || i.description || '', date:i.date || '' }))
  }));
  return { ...team, players, injuries:players.flatMap(p => p.injuries.map(i => ({ player:p.name, ...i }))), recent:recentForTeam(schedule, team.code) };
});

const teams = Object.fromEntries(teamList.map((team, index) => [team.code, details[index]?.error ? { ...team, players:[], injuries:[], recent:[], fetchError:details[index].error } : details[index]]));
function buildScoreSummary(items) {
  const completed = items.filter(f => f.completed), future = items.filter(f => !f.completed && f.halfFullType === 'prediction'), counts = new Map(), additions = new Map();
  for (const fixture of completed) counts.set(fixture.score, (counts.get(fixture.score) || 0) + 1);
  for (const fixture of future) {
    additions.set(fixture.score, (additions.get(fixture.score) || 0) + .65);
    additions.set(fixture.alternativeScore, (additions.get(fixture.alternativeScore) || 0) + .35);
  }
  const scores = new Set([...counts.keys(), ...additions.keys()]);
  return {
    completedMatches:completed.length,
    futureMatches:future.length,
    totalGoals:completed.reduce((sum, f) => sum + f.homeScore + f.awayScore, 0),
    distribution:[...scores].map(score => ({ score, count:counts.get(score) || 0, share:completed.length ? Math.round((counts.get(score) || 0) / completed.length * 1000) / 10 : 0, expectedAdditional:Math.round((additions.get(score) || 0) * 10) / 10, projected:Math.round(((counts.get(score) || 0) + (additions.get(score) || 0)) * 10) / 10 })).sort((a,b) => b.count-a.count || b.expectedAdditional-a.expectedAdditional || a.score.localeCompare(b.score)),
    method:'后续增量按主预测比分 65%、备选比分 35% 加权估算，不代表确定赛果。'
  };
}
const output = {
  schemaVersion:1,
  updatedAt:new Date().toISOString(),
  source:{ name:'ESPN public soccer data', tournament:'FIFA World Cup', url:'https://www.espn.com/soccer/league/_/name/fifa.world', playerNameReferences:['https://github.com/cairongquan/world_cup_2026','https://github.com/cshandsome-top/worldcup2026'] },
  refreshPolicy:'Every 5 minutes during the tournament via GitHub Actions',
  fixtures,
  teams,
  scoreSummary:buildScoreSummary(fixtures)
};

await fs.mkdir(path.join(root, 'data'), { recursive:true });
await fs.writeFile(path.join(root, 'data', 'live.json'), JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(`Updated ${fixtures.length} fixtures and ${Object.keys(teams).length} teams at ${output.updatedAt}`);
