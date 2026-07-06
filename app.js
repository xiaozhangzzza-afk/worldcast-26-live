/* 足球预测大模型 · V2.0 Professional Upgrade */
(() => {
  'use strict';

  // ---------- Configuration & state ----------
  const LIVE_DATA_URL = 'https://raw.githubusercontent.com/xiaozhangzzza-afk/worldcast-26/main/data/live.json';
  const SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
  const STORAGE = { language: 'football-model-language', theme: 'football-model-theme', favorites: 'football-model-favorites' };
  const state = {
    data: null,
    fixtures: [],
    teams: {},
    dateFilter: 'focus',
    stageFilter: 'all',
    scheduleQuery: '',
    teamQuery: '',
    language: localStorage.getItem(STORAGE.language) === 'en' ? 'en' : 'zh',
    theme: localStorage.getItem(STORAGE.theme) || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'),
    favorites: new Set(JSON.parse(localStorage.getItem(STORAGE.favorites) || '[]')),
    activeTrack: -1,
    syncing: false
  };

  const translations = {
    zh: { translation: {
      nav:{predictions:'比赛预测',schedule:'全赛程图谱',teams:'球队数据库',scores:'比分频次',about:'说明'},
      theme:{dark:'深色',light:'浅色'},status:{loading:'数据读取中',refresh:'同步数据',lastUpdated:'最后更新',synced:'已同步'},
      hero:{overline:'2026 世界杯 · AI 数据观察站',title:'让每场比赛，<br><span>都有数据答案</span>',description:'基于球队强度、近期表现、攻防能力、赛场环境与模拟模型生成比赛预测，帮助球迷快速理解关键变量。',todayCta:'查看今日预测',scheduleCta:'打开赛程图谱',noPaywall:'无需登录',officialLinks:'仅正规观赛入口',disclaimer:'模型演示，非投注建议'},
      metrics:{schedule:'完整赛程',matches:'场比赛',upcoming:'未来 72 小时',upcomingUnit:'场待赛',confidence:'平均模型信心',demo:'模型指标',teams:'球队档案',teamUnit:'支球队'},
      predictions:{overline:'比赛情报',title:'今日焦点比赛',subtitle:'倒计时、预测比分与胜平负概率均集中在一张卡片中。'},
      daily:{open:'每日模型观察',title:'每日模型观察',subtitle:'两场组合观点，用于展示模型思路与风险边界。'},
      filters:{focus:'焦点',today:'今天',tomorrow:'明天',next:'后天'},
      schedule:{overline:'104 场完整赛程',title:'全赛程图谱',subtitle:'从 A–L 组到决赛，按阶段筛选并快速搜索球队。',timezone:'默认显示北京时间；设备可通过系统设置换算时区。',searchLabel:'搜索球队',bracket:'淘汰赛阶段图',visual:'视觉预览'},
      stages:{all:'全部',groups:'小组赛',r32:'32强',r16:'16强',qf:'四分之一决赛',sf:'半决赛',final:'决赛'},
      teams:{overline:'球队情报库',title:'球队数据库',subtitle:'查看攻中防评分、近期状态与核心球员；星标会保存在本机。',searchLabel:'搜索球队'},
      favorites:{title:'我的关注',empty:'点击球队卡片上的星标，把关注球队放在这里。'},
      method:{overline:'模型说明',title:'模型如何计算？',intro:'它不是“预知结果”，而是把公开信息整理成更容易理解的概率视图。',strength:'球队强度',strengthNote:'攻中防评分与阵容深度',form:'近期状态',formNote:'近十场结果与进失球趋势',context:'赛程环境',contextNote:'场地、休息时间与比赛阶段',history:'历史表现',historyNote:'仅作弱权重参考'},
      watch:{overline:'官方与正规入口',title:'正规观赛与赛事资讯入口',subtitle:'不提供盗版直播；实际可用性取决于地区、版权与账号权限。'},
      music:{title:'世界杯经典旋律',subtitle:'按需加载试听，不自动播放，不影响首屏性能。',open:'展开歌单',close:'收起歌单',now:'正在选择'},
      footer:{tagline:'用清晰的数据表达，帮助球迷理解比赛。',boundary:'数据边界',boundaryText:'赛程与比分来自公开聚合源；概率、预测比分与信心属于模型演示。',links:'外链说明',linksText:'外部平台在新窗口打开，可用性取决于地区与账号权限。',updated:'最后更新时间'},
      common:{disclaimer:'模型演示，不构成投注或财务建议。临场阵容与官方数据优先。'},
      scores:{title:'比分频次与模型分布',subtitle:'已完赛统计与后续模型推演分开呈现。'}
    }},
    en: { translation: {
      nav:{predictions:'Predictions',schedule:'Full Schedule',teams:'Team Database',scores:'Scorelines',about:'Method'},
      theme:{dark:'Dark',light:'Light'},status:{loading:'Loading data',refresh:'Sync Data',lastUpdated:'Last updated',synced:'Synced'},
      hero:{overline:'2026 WORLD CUP · AI MATCH INTELLIGENCE',title:'Every match,<br><span>explained by data</span>',description:'Match forecasts generated from team strength, recent form, attack and defence, venue context and model simulation.',todayCta:"Today's Predictions",scheduleCta:'Open Full Schedule',noPaywall:'No sign-in required',officialLinks:'Trusted viewing links only',disclaimer:'Model demo, not betting advice'},
      metrics:{schedule:'Full schedule',matches:'matches',upcoming:'Next 72 hours',upcomingUnit:'upcoming',confidence:'Average confidence',demo:'model metric',teams:'Team profiles',teamUnit:'teams'},
      predictions:{overline:'MATCH INTELLIGENCE',title:"Today's Featured Matches",subtitle:'Kick-off status, predicted score and 1X2 probabilities in one clear view.'},
      daily:{open:'Daily Model Watch',title:'Daily Model Watch',subtitle:'A two-match model view designed to show reasoning and risk boundaries.'},
      filters:{focus:'Featured',today:'Today',tomorrow:'Tomorrow',next:'Day After'},
      schedule:{overline:'ALL 104 MATCHES',title:'Full Schedule Map',subtitle:'Filter every match from Groups A–L through the final and search any team.',timezone:'Times default to China Standard Time; use your device settings for conversion.',searchLabel:'Search teams',bracket:'Knockout Map',visual:'Visual preview'},
      stages:{all:'All',groups:'Group Stage',r32:'Round of 32',r16:'Round of 16',qf:'Quarterfinals',sf:'Semifinals',final:'Finals'},
      teams:{overline:'TEAM INTELLIGENCE',title:'Team Database',subtitle:'Compare unit ratings, recent form and key players. Stars are saved on this device.',searchLabel:'Search teams'},
      favorites:{title:'Following',empty:'Use the star on a team card to add it here.'},
      method:{overline:'MODEL NOTES',title:'How does the model work?',intro:'It does not “know” the result. It turns public information into a clearer probability view.',strength:'Team strength',strengthNote:'Unit ratings and squad depth',form:'Recent form',formNote:'Last ten results and goal trends',context:'Match context',contextNote:'Venue, rest and tournament stage',history:'Historical form',historyNote:'Used as a low-weight reference'},
      watch:{overline:'OFFICIAL & TRUSTED',title:'Trusted Viewing & Match Information',subtitle:'No pirated streams. Availability depends on region, rights and account access.'},
      music:{title:'World Cup Classics',subtitle:'Previews load only on demand and never autoplay.',open:'Open playlist',close:'Close playlist',now:'Now selected'},
      footer:{tagline:'Clear data to help supporters understand each match.',boundary:'Data boundaries',boundaryText:'Fixtures and scores use public aggregate sources; probabilities, score picks and confidence are model demonstrations.',links:'External links',linksText:'External platforms open in a new tab and may vary by region or account.',updated:'Last updated'},
      common:{disclaimer:'Model demonstration only. Not betting or financial advice. Official lineups and results take priority.'},
      scores:{title:'Scoreline Frequency & Model Distribution',subtitle:'Completed-match statistics and future model projections are shown separately.'}
    }}
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const getPath = (object, path) => path.split('.').reduce((value, key) => value?.[key], object);
  const t = (key, values = {}) => {
    let result = window.i18next?.isInitialized ? window.i18next.t(key, values) : getPath(translations[state.language].translation, key) || key;
    for (const [name, value] of Object.entries(values)) result = String(result).replaceAll(`{{${name}}}`, value);
    return result;
  };
  const chinaDay = date => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
  const formatDateTime = value => new Intl.DateTimeFormat(state.language === 'en' ? 'en-GB' : 'zh-CN', {timeZone:'Asia/Shanghai',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));
  const formatTime = value => new Intl.DateTimeFormat(state.language === 'en' ? 'en-GB' : 'zh-CN', {timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));
  const formatFreshness = value => new Intl.DateTimeFormat(state.language === 'en' ? 'en-GB' : 'zh-CN', {timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(value));
  const stageNames = {
    zh:{'group-stage':'小组赛','round-of-32':'32强','round-of-16':'16强','quarterfinals':'四分之一决赛','semifinals':'半决赛','3rd-place-match':'三四名决赛','final':'决赛'},
    en:{'group-stage':'Group Stage','round-of-32':'Round of 32','round-of-16':'Round of 16','quarterfinals':'Quarterfinal','semifinals':'Semifinal','3rd-place-match':'Third-place Playoff','final':'Final'}
  };
  const stageName = fixture => stageNames[state.language][fixture.stageSlug] || fixture.stage || 'World Cup';
  const teamName = code => state.language === 'en' ? (state.teams[code]?.nameEn || state.teams[code]?.name || code) : (state.teams[code]?.name || code);
  const teamFlag = code => state.teams[code]?.logo ? `<img src="${escapeHtml(state.teams[code].logo)}" alt="${escapeHtml(teamName(code))}">` : '<span aria-hidden="true">🏳️</span>';
  const normalizeProbabilities = input => {
    const raw = Array.isArray(input) ? input.map(Number) : [40,30,30];
    const total = raw.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0) || 100;
    const result = raw.map(value => Math.round(value / total * 100));
    result[1] += 100 - result.reduce((sum, value) => sum + value, 0);
    return result;
  };
  const scoreNumbers = score => (String(score).match(/\d+/g) || [0,0]).slice(0,2).map(Number);
  const confidenceFor = fixture => Math.max(...normalizeProbabilities(fixture.probabilities));
  const resultLabel = probabilities => ['主胜','平局','客胜'][probabilities.indexOf(Math.max(...probabilities))];
  const resultLabelLocalized = probabilities => state.language === 'en' ? ['Home','Draw','Away'][probabilities.indexOf(Math.max(...probabilities))] : resultLabel(probabilities);

  // ---------- Language & theme ----------
  function applyLanguage() {
    document.documentElement.lang = state.language === 'en' ? 'en' : 'zh-CN';
    document.title = state.language === 'en' ? '足球预测大模型 | 2026 World Cup Schedule & Predictions' : '足球预测大模型｜2026世界杯赛程、比分预测与球队数据';
    $$('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
    $$('[data-i18n-html]').forEach(element => { element.innerHTML = t(element.dataset.i18nHtml); });
    const languageButton = $('#languageToggle');
    $('b', languageButton).textContent = state.language === 'en' ? 'English' : '中文';
    languageButton.setAttribute('aria-label', state.language === 'en' ? '切换到中文' : 'Switch to English');
    $('#scheduleSearch').placeholder = state.language === 'en' ? 'Search Chinese, English or team code' : '搜索中文、英文或国家简称';
    $('#teamSearch').placeholder = state.language === 'en' ? 'Search team name or code' : '搜索球队名称或简称';
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    const label = $('#themeToggle b');
    label.textContent = state.theme === 'dark' ? t('theme.dark') : t('theme.light');
    $('meta[name="theme-color"]').content = state.theme === 'dark' ? '#07110f' : '#f3f5f1';
  }

  async function setLanguage(language) {
    state.language = language;
    localStorage.setItem(STORAGE.language, language);
    if (window.i18next) await window.i18next.changeLanguage(language);
    applyLanguage(); applyTheme(); renderAll();
  }

  // ---------- Data loading & live merge ----------
  async function fetchJson(url) {
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, {cache:'no-store'});
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  }

  function indexData(data) {
    state.data = data;
    state.fixtures = (data.fixtures || []).map(fixture => ({...fixture, probabilities: normalizeProbabilities(fixture.probabilities)}));
    state.teams = data.teams || {};
  }

  async function loadData(manual = false) {
    if (state.syncing) return;
    state.syncing = true;
    const button = $('#refreshData');
    button.disabled = true;
    button.lastElementChild.textContent = state.language === 'en' ? 'Syncing…' : '同步中…';
    try {
      const data = await fetchJson(LIVE_DATA_URL);
      indexData(data);
      renderAll();
      await mergeDirectScoreboard();
      const now = new Date();
      updateFreshness(now);
      if (manual) showToast(`${state.language === 'en' ? 'Live data synced' : '实时数据同步成功'} · ${formatFreshness(now)}`);
    } catch (error) {
      console.warn('Data refresh failed:', error.message);
      showToast(state.language === 'en' ? 'Live source unavailable; showing the latest snapshot.' : '实时源暂不可用，继续展示最近一次数据。', false);
      if (!state.data) renderErrorState();
    } finally {
      state.syncing = false;
      button.disabled = false;
      button.lastElementChild.textContent = t('status.refresh');
    }
  }

  const compactDay = date => date.toISOString().slice(0,10).replaceAll('-','');
  async function mergeDirectScoreboard() {
    if (!state.fixtures.length) return;
    try {
      const start = compactDay(new Date(Date.now() - 86400000));
      const end = compactDay(new Date(Date.now() + 86400000));
      const feed = await fetchJson(`${SCOREBOARD_URL}?dates=${start}-${end}&limit=50`);
      const byId = new Map((feed.events || []).map(event => [String(event.id), event]));
      state.fixtures = state.fixtures.map(fixture => mergeEvent(fixture, byId.get(String(fixture.id))));
      renderMatches(); renderSchedule(); renderScoreDistribution(); renderDailyObservation();
    } catch (error) {
      console.warn('Direct scoreboard unavailable:', error.message);
    }
  }

  function mergeEvent(fixture, event) {
    if (!event) return fixture;
    const competition = event.competitions?.[0] || {};
    const home = competition.competitors?.find(item => item.homeAway === 'home') || {};
    const away = competition.competitors?.find(item => item.homeAway === 'away') || {};
    const completed = Boolean(event.status?.type?.completed);
    const live = event.status?.type?.state === 'in';
    const homeScore = Number(home.score?.value ?? home.score ?? 0);
    const awayScore = Number(away.score?.value ?? away.score ?? 0);
    return {
      ...fixture,
      completed,
      homeScore,
      awayScore,
      score: completed || live ? `${homeScore}–${awayScore}` : fixture.score,
      scoreType: completed ? '赛果' : live ? '实时比分' : fixture.scoreType,
      displayClock: event.status?.displayClock || fixture.displayClock,
      statusText: event.status?.type?.description || fixture.statusText,
      clockSeconds: Number(event.status?.clock || fixture.clockSeconds || 0),
      clockSnapshotAt: new Date().toISOString()
    };
  }

  function updateFreshness(date) {
    const label = formatFreshness(date);
    $('#headerFreshness span').textContent = `${t('status.synced')} ${label}`;
    $('#heroUpdated').textContent = label;
    $('#footerUpdated').textContent = label;
  }

  // ---------- Render: metrics & matches ----------
  function renderMetrics() {
    const now = Date.now();
    const upcoming = state.fixtures.filter(item => !item.completed && new Date(item.date).getTime() >= now && new Date(item.date).getTime() <= now + 72*3600000);
    const predictions = state.fixtures.filter(item => !item.completed).map(confidenceFor);
    const average = predictions.length ? Math.round(predictions.reduce((a,b)=>a+b,0) / predictions.length) : 0;
    $('#metricFixtures').textContent = state.fixtures.length || 104;
    $('#metricUpcoming').textContent = upcoming.length;
    $('#metricConfidence').textContent = `${average}%`;
    $('#metricTeams').textContent = Object.keys(state.teams).length || 48;
  }

  function fixtureDayKey(fixture) {
    const day = chinaDay(new Date(fixture.date));
    const today = chinaDay(new Date());
    if (day === today) return 'today';
    if (day === chinaDay(new Date(Date.now()+86400000))) return 'tomorrow';
    if (day === chinaDay(new Date(Date.now()+2*86400000))) return 'next';
    return 'other';
  }

  function filteredFocusFixtures() {
    const sorted = [...state.fixtures].sort((a,b)=>new Date(a.date)-new Date(b.date));
    if (state.dateFilter !== 'focus') return sorted.filter(item => fixtureDayKey(item) === state.dateFilter);
    const relevant = sorted.filter(item => !item.completed && new Date(item.date).getTime() > Date.now()-3*3600000);
    return (relevant.length ? relevant : sorted.filter(item => item.completed).slice(-6)).slice(0,6);
  }

  function statusFor(fixture) {
    if (fixture.completed) return {className:'finished', label:state.language === 'en' ? 'Full Time' : '已结束'};
    if (fixture.scoreType === '实时比分') return {className:'live', label:`${state.language === 'en' ? 'LIVE' : '进行中'} ${fixture.displayClock || ''}`};
    const delta = new Date(fixture.date).getTime() - Date.now();
    if (delta > 0 && delta < 3600000) return {className:'upcoming', label:state.language === 'en' ? 'Starting Soon' : '即将开始'};
    return {className:'upcoming', label:state.language === 'en' ? 'Not Started' : '未开始'};
  }

  function renderMatches() {
    const fixtures = filteredFocusFixtures();
    const grid = $('#matchGrid');
    if (!fixtures.length) {
      grid.innerHTML = `<div class="empty-state">${state.language === 'en' ? 'No matches found for this date.' : '该日期暂无比赛，试试“焦点”筛选。'}</div>`;
      return;
    }
    grid.innerHTML = fixtures.map(fixture => matchCard(fixture)).join('');
  }

  function matchCard(fixture) {
    const status = statusFor(fixture);
    const probabilities = normalizeProbabilities(fixture.probabilities);
    const scoreLabel = fixture.completed ? (state.language === 'en' ? 'Final Score' : '最终比分') : fixture.scoreType === '实时比分' ? (state.language === 'en' ? 'Live Score' : '实时比分') : (state.language === 'en' ? 'Predicted Score' : '预测比分');
    const confidence = confidenceFor(fixture);
    return `<article class="match-card ${status.className}" data-match-id="${fixture.id}">
      <div class="match-meta"><span>${escapeHtml(stageName(fixture))} · ${state.language === 'en' ? 'Match' : '第'} ${fixture.matchNo}</span><span class="status-badge ${status.className}">${escapeHtml(status.label)}</span></div>
      <div class="match-versus">
        <div class="match-team">${teamFlag(fixture.home)}<b>${escapeHtml(teamName(fixture.home))}</b><small>${state.language === 'en' ? 'HOME' : '主队'}</small></div>
        <div class="score-block"><small>${scoreLabel}</small><strong>${escapeHtml(fixture.score || (state.language === 'en' ? 'Awaiting data' : '等待数据'))}</strong></div>
        <div class="match-team">${teamFlag(fixture.away)}<b>${escapeHtml(teamName(fixture.away))}</b><small>${state.language === 'en' ? 'AWAY' : '客队'}</small></div>
      </div>
      <div class="probability-box"><div class="probability-labels"><span>${state.language === 'en'?'Home':'主胜'}<b>${probabilities[0]}%</b></span><span>${state.language === 'en'?'Draw':'平局'}<b>${probabilities[1]}%</b></span><span>${state.language === 'en'?'Away':'客胜'}<b>${probabilities[2]}%</b></span></div><div class="probability-bar" aria-label="1X2 probabilities"><span style="width:${probabilities[0]}%"></span><span style="width:${probabilities[1]}%"></span><span style="width:${probabilities[2]}%"></span></div></div>
      <div class="match-footer"><span>${formatDateTime(fixture.date)} · ${state.language === 'en' ? 'Confidence' : '模型信心'} ${confidence}%</span><button type="button" data-open-match="${fixture.id}">${state.language === 'en' ? 'View details →' : '查看详情 →'}</button></div>
      ${!fixture.completed && fixture.scoreType !== '实时比分' ? `<span class="sr-only countdown" data-kickoff="${escapeHtml(fixture.date)}"></span>` : ''}
    </article>`;
  }

  function updateCountdowns() {
    $$('[data-kickoff]').forEach(element => {
      const delta = new Date(element.dataset.kickoff).getTime() - Date.now();
      if (delta <= 0) { element.textContent = state.language === 'en' ? 'Starting' : '即将开始'; return; }
      const days = Math.floor(delta / 86400000), hours = Math.floor(delta % 86400000 / 3600000), minutes = Math.floor(delta % 3600000 / 60000), seconds = Math.floor(delta % 60000 / 1000);
      const card = element.closest('.match-card');
      const badge = $('.status-badge', card);
      badge.textContent = `${state.language === 'en' ? 'Starts in' : '距开赛'} ${days?`${days}${state.language==='en'?'d':'天'} `:''}${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
    });
  }

  // ---------- Render: schedule ----------
  function stageMatchesFilter(fixture) {
    if (state.stageFilter === 'all') return true;
    if (state.stageFilter === 'finals') return ['3rd-place-match','final'].includes(fixture.stageSlug);
    return fixture.stageSlug === state.stageFilter;
  }

  function searchMatchesFilter(fixture) {
    const query = state.scheduleQuery.trim().toLowerCase();
    if (!query) return true;
    const haystack = [fixture.home,fixture.away,fixture.homeName,fixture.awayName,state.teams[fixture.home]?.nameEn,state.teams[fixture.away]?.nameEn].join(' ').toLowerCase();
    return haystack.includes(query);
  }

  function renderSchedule() {
    const fixtures = state.fixtures.filter(stageMatchesFilter).filter(searchMatchesFilter).sort((a,b)=>new Date(a.date)-new Date(b.date));
    const list = $('#scheduleList');
    if (!fixtures.length) { list.innerHTML = `<div class="empty-state">${state.language === 'en' ? 'No matching fixtures or teams.' : '没有找到相关比赛或球队。'}</div>`; return; }
    list.innerHTML = fixtures.map(fixture => {
      const status = statusFor(fixture);
      return `<button class="schedule-item" type="button" data-open-match="${fixture.id}"><span class="schedule-time">${formatTime(fixture.date)}<br>${escapeHtml(stageName(fixture))}</span><span class="schedule-teams"><b>${escapeHtml(teamName(fixture.home))} · ${escapeHtml(teamName(fixture.away))}</b><span>${escapeHtml(fixture.venue || (state.language === 'en'?'Venue pending':'场地待定'))}</span></span><span class="schedule-score">${fixture.completed || fixture.scoreType==='实时比分' ? escapeHtml(fixture.score) : status.label}</span></button>`;
    }).join('');
  }

  function renderBracket() {
    const rounds = [['round-of-32','32强','Round of 32'],['round-of-16','16强','Round of 16'],['quarterfinals','四分之一决赛','Quarterfinals'],['semifinals','半决赛','Semifinals'],['final','决赛','Final']];
    $('#bracketMini').innerHTML = rounds.map(([slug,zh,en]) => {
      const matches = state.fixtures.filter(item => item.stageSlug === slug);
      const samples = matches.slice(0,2).map(item => `${escapeHtml(teamName(item.home))} vs ${escapeHtml(teamName(item.away))}`).join('</div><div>') || (state.language === 'en' ? 'Awaiting qualification' : '等待晋级球队');
      return `<section class="bracket-round"><h4>${state.language==='en'?en:zh} · ${matches.length}</h4><div>${samples}</div></section>`;
    }).join('');
  }

  // ---------- Render: teams & favorites ----------
  function teamRatings(team) {
    const recent = team.recent || [];
    const wins = recent.filter(item => item.result === 'W').length;
    const base = Math.max(68, Math.min(94, 74 + wins*2));
    return {attack:base, midfield:Math.max(67,base-1), defense:Math.max(66,base-3)};
  }

  function renderTeams() {
    const query = state.teamQuery.trim().toLowerCase();
    const entries = Object.entries(state.teams).filter(([code,team]) => [code,team.name,team.nameEn].join(' ').toLowerCase().includes(query)).sort((a,b)=>a[1].name.localeCompare(b[1].name,'zh-CN'));
    $('#teamGrid').innerHTML = entries.length ? entries.map(([code,team]) => teamCard(code,team)).join('') : `<div class="empty-state">${state.language==='en'?'No matching teams.':'没有找到相关比赛或球队。'}</div>`;
    renderFavorites();
  }

  function teamCard(code, team) {
    const ratings = teamRatings(team), form = (team.recent || []).slice(0,5);
    return `<article class="team-card"><button class="favorite-button ${state.favorites.has(code)?'active':''}" type="button" data-favorite="${code}" aria-label="${state.favorites.has(code)?'取消关注':'关注'} ${escapeHtml(teamName(code))}">★</button><button class="team-card-main" type="button" data-open-team="${code}">${teamFlag(code)}<span><h3>${escapeHtml(teamName(code))}</h3><p>${code} · ${team.players?.length||0} ${state.language==='en'?'players':'名球员'}</p></span></button><div class="rating-grid"><div><span>${state.language==='en'?'Attack':'进攻'}</span><b>${ratings.attack}</b></div><div><span>${state.language==='en'?'Midfield':'中场'}</span><b>${ratings.midfield}</b></div><div><span>${state.language==='en'?'Defence':'防守'}</span><b>${ratings.defense}</b></div></div><div class="form-dots" aria-label="Recent form">${form.map(item=>`<i class="${item.result}" title="${item.result}"></i>`).join('')}</div></article>`;
  }

  function renderFavorites() {
    const codes = [...state.favorites].filter(code => state.teams[code]);
    $('#favoriteTeams').innerHTML = codes.map(code => `<button class="favorite-chip" type="button" data-open-team="${code}">★ ${escapeHtml(teamName(code))}</button>`).join('');
    $('#favoritesHint').hidden = codes.length > 0;
  }

  function toggleFavorite(code) {
    state.favorites.has(code) ? state.favorites.delete(code) : state.favorites.add(code);
    localStorage.setItem(STORAGE.favorites, JSON.stringify([...state.favorites]));
    renderTeams();
    showToast(state.language==='en'?'Following updated.':'关注列表已更新。');
  }

  // ---------- Dialog content ----------
  function openDialog(id) {
    const dialog = document.getElementById(id);
    if (dialog && !dialog.open) dialog.showModal();
  }

  function openMatchDialog(id) {
    const fixture = state.fixtures.find(item => String(item.id) === String(id));
    if (!fixture) return;
    const probabilities = normalizeProbabilities(fixture.probabilities);
    const teamInjuries = [...(state.teams[fixture.home]?.injuries||[]),...(state.teams[fixture.away]?.injuries||[])];
    const timeline = fixture.timeline || [];
    $('#matchDialogContent').innerHTML = `<div class="dialog-heading"><p class="overline">${escapeHtml(stageName(fixture))} · MATCH ${fixture.matchNo}</p><h2 id="matchDialogTitle">${escapeHtml(teamName(fixture.home))} vs ${escapeHtml(teamName(fixture.away))}</h2><p>${formatDateTime(fixture.date)} · ${escapeHtml(fixture.venue||'—')}</p></div><div class="detail-hero"><div class="detail-versus"><div class="detail-team">${teamFlag(fixture.home)}<b>${escapeHtml(teamName(fixture.home))}</b><small>${state.language==='en'?'HOME':'主队'}</small></div><div class="detail-score"><small>${fixture.completed?(state.language==='en'?'FINAL':'赛果'):(state.language==='en'?'MODEL':'模型')}</small><strong>${escapeHtml(fixture.score||'—')}</strong><small>${escapeHtml(fixture.alternativeScore ? `${state.language==='en'?'Alt':'备选'} ${fixture.alternativeScore}` : '')}</small></div><div class="detail-team">${teamFlag(fixture.away)}<b>${escapeHtml(teamName(fixture.away))}</b><small>${state.language==='en'?'AWAY':'客队'}</small></div></div><div class="probability-box"><div class="probability-labels"><span>${state.language==='en'?'Home':'主胜'}<b>${probabilities[0]}%</b></span><span>${state.language==='en'?'Draw':'平局'}<b>${probabilities[1]}%</b></span><span>${state.language==='en'?'Away':'客胜'}<b>${probabilities[2]}%</b></span></div><div class="probability-bar"><span style="width:${probabilities[0]}%"></span><span style="width:${probabilities[1]}%"></span><span style="width:${probabilities[2]}%"></span></div></div></div><div class="detail-grid"><section class="detail-panel"><h3>${state.language==='en'?'Prediction path':'预测路径'}</h3><p>${state.language==='en'?'Primary score':'主预测比分'} ${escapeHtml(fixture.score)} · ${state.language==='en'?'HT/FT':'半全场'} ${escapeHtml(fixture.halfFull||'—')}</p></section><section class="detail-panel"><h3>${state.language==='en'?'Possible score range':'可能比分分布'}</h3><div class="factor-chips"><span>${escapeHtml(fixture.score)}</span>${fixture.alternativeScore?`<span>${escapeHtml(fixture.alternativeScore)}</span>`:''}<span>${resultLabelLocalized(probabilities)}</span></div></section><section class="detail-panel"><h3>${state.language==='en'?'Key factors':'关键影响因素'}</h3><div class="factor-chips"><span>${state.language==='en'?'Recent form':'近期状态'}</span><span>${state.language==='en'?'Unit strength':'攻防评分'}</span><span>${escapeHtml(fixture.venue||'Venue')}</span><span>${escapeHtml(stageName(fixture))}</span></div></section><section class="detail-panel"><h3>${state.language==='en'?'Squad & injury note':'阵容与伤停提示'}</h3><p>${teamInjuries.length ? teamInjuries.slice(0,3).map(item=>`${escapeHtml(item.player)}：${escapeHtml(item.status)}`).join('；') : (state.language==='en'?'No verified injury records in the current source. Official team news takes priority.':'当前数据源暂无可核验伤停记录，赛前官方名单优先。')}</p></section></div><section class="detail-panel" style="margin-top:12px"><h3>${state.language==='en'?'Match timeline':'比赛时间轴'}</h3>${timeline.length?`<div class="timeline">${timeline.map(event=>`<div class="timeline-event"><b>${escapeHtml(event.minute||'')}</b> ${escapeHtml(event.playerZh||event.player||event.description||'Event')} · ${escapeHtml(event.goalKind||event.type||'')}</div>`).join('')}</div>`:`<p>${fixture.completed?(state.language==='en'?'The source has not returned verified event details.':'数据源暂未返回可核验事件。'):(state.language==='en'?'Events will appear after kick-off.':'开赛后显示进球与红黄牌事件。')}</p>`}</section><p class="model-disclaimer">${t('common.disclaimer')}</p>`;
    openDialog('matchDialog');
  }

  function openTeamDialog(code) {
    const team = state.teams[code]; if (!team) return;
    const ratings = teamRatings(team), recent = team.recent || [], players = team.players || [];
    const related = state.fixtures.filter(item => item.home===code || item.away===code).slice(-4);
    $('#teamDialogContent').innerHTML = `<div class="dialog-heading"><p class="overline">TEAM ${code}</p><h2 id="teamDialogTitle">${teamFlag(code)} ${escapeHtml(teamName(code))}</h2><p>${state.language==='en'?'Squad profile, model strengths and recent form.':'球队简介、模型优势与近期状态。'}</p></div><div class="rating-grid"><div><span>${state.language==='en'?'Attack':'进攻'}</span><b>${ratings.attack}</b></div><div><span>${state.language==='en'?'Midfield':'中场'}</span><b>${ratings.midfield}</b></div><div><span>${state.language==='en'?'Defence':'防守'}</span><b>${ratings.defense}</b></div></div><div class="detail-grid"><section class="detail-panel"><h3>${state.language==='en'?'Key players':'核心球员'}</h3><div class="factor-chips">${players.slice(0,8).map(player=>`<span>${escapeHtml(state.language==='en'?player.name:(player.nameZh||player.name))}</span>`).join('')||'<span>—</span>'}</div></section><section class="detail-panel"><h3>${state.language==='en'?'Model strengths':'模型优势'}</h3><p>${ratings.attack>=ratings.defense?(state.language==='en'?'Attacking output and chance creation rate above the squad baseline.':'进攻输出与机会创造高于球队基准。'):(state.language==='en'?'Defensive structure is the more stable model signal.':'防守结构是更稳定的模型信号。')}</p></section><section class="detail-panel"><h3>${state.language==='en'?'Risk points':'风险点'}</h3><p>${team.injuries?.length?(state.language==='en'?`${team.injuries.length} injury records require confirmation.`:`${team.injuries.length} 条伤停记录需要临场确认。`):(state.language==='en'?'Lineups and player availability may change before kick-off.':'首发与球员可用性可能在赛前变化。')}</p></section><section class="detail-panel"><h3>${state.language==='en'?'Recent form':'近期状态'}</h3><div class="factor-chips">${recent.slice(0,6).map(item=>`<span>${escapeHtml(item.score)} · ${item.result}</span>`).join('')||'<span>—</span>'}</div></section></div><section class="detail-panel" style="margin-top:12px"><h3>${state.language==='en'?'Related matches':'相关比赛'}</h3><div class="factor-chips">${related.map(item=>`<span>${escapeHtml(teamName(item.home))} vs ${escapeHtml(teamName(item.away))}</span>`).join('')||'<span>—</span>'}</div></section>`;
    openDialog('teamDialog');
  }

  function computeScoreSummary() {
    const completed = state.fixtures.filter(item => item.completed), future = state.fixtures.filter(item => !item.completed), counts = new Map(), additions = new Map();
    completed.forEach(item => counts.set(item.score,(counts.get(item.score)||0)+1));
    future.forEach(item => { if(item.score)additions.set(item.score,(additions.get(item.score)||0)+.65); if(item.alternativeScore)additions.set(item.alternativeScore,(additions.get(item.alternativeScore)||0)+.35); });
    const scores = new Set([...counts.keys(),...additions.keys()]);
    return {completed,totalGoals:completed.reduce((sum,item)=>sum+Number(item.homeScore||0)+Number(item.awayScore||0),0),rows:[...scores].map(score=>({score,count:counts.get(score)||0,projected:(counts.get(score)||0)+(additions.get(score)||0)})).sort((a,b)=>b.count-a.count||b.projected-a.projected).slice(0,10)};
  }

  function renderScoreDistribution() {
    const summary = computeScoreSummary(), max = Math.max(1,...summary.rows.map(row=>row.projected));
    $('#scoreDistribution').innerHTML = `<div class="score-kpis"><article><span>${state.language==='en'?'Completed matches':'已统计比赛'}</span><b>${summary.completed.length}</b></article><article><span>${state.language==='en'?'Total goals':'累计进球'}</span><b>${summary.totalGoals}</b></article><article><span>${state.language==='en'?'Most common':'最高频比分'}</span><b>${summary.rows[0]?.score||'—'}</b></article></div><div class="score-distribution">${summary.rows.map(row=>`<article class="score-item"><header><strong>${escapeHtml(row.score)}</strong><small>${row.count} ${state.language==='en'?'completed':'次赛果'}</small></header><div class="score-meter"><i style="width:${Math.max(5,row.projected/max*100)}%"></i></div><small>${state.language==='en'?'Future model weight':'后续模型权重'} +${Math.max(0,row.projected-row.count).toFixed(1)}</small></article>`).join('')}</div><p class="model-disclaimer">${state.language==='en'?'Completed-match counts are real feed statistics; future weights are model projections.':'已完赛次数来自赛果统计；后续权重属于模型推演，两者分开呈现。'}</p>`;
  }

  function renderDailyObservation() {
    const eligible = state.fixtures.filter(item => !item.completed && item.scoreType !== '实时比分' && new Date(item.date)>new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date));
    const firstDay = eligible[0] ? chinaDay(new Date(eligible[0].date)) : '';
    const candidates = eligible.filter(item=>chinaDay(new Date(item.date))===firstDay).sort((a,b)=>confidenceFor(b)-confidenceFor(a)).slice(0,2);
    const root = $('#dailyObservation');
    if (candidates.length<2) { root.innerHTML=`<div class="empty-state">${state.language==='en'?'Fewer than two eligible matches on the next matchday.':'下一比赛日不足两场可形成组合观察。'}</div>`; return; }
    root.innerHTML = `<div class="daily-observation">${candidates.map((fixture,index)=>{const probabilities=normalizeProbabilities(fixture.probabilities),goals=scoreNumbers(fixture.score).reduce((a,b)=>a+b,0);return `<article class="observation-card"><header><h3>0${index+1} · ${escapeHtml(teamName(fixture.home))} vs ${escapeHtml(teamName(fixture.away))}</h3><span>${state.language==='en'?'HOME / AWAY':'主 / 客'}</span></header><p>${formatDateTime(fixture.date)} · ${escapeHtml(stageName(fixture))}</p><div class="observation-grid"><div><span>${state.language==='en'?'Steady view':'稳健观察'}</span><b>${resultLabelLocalized(probabilities)}</b></div><div><span>${state.language==='en'?'Goal tendency':'进球数倾向'}</span><b>${goals>=3?'2.5+':'0–2'}</b></div><div><span>${state.language==='en'?'Score range':'比分区间'}</span><b>${escapeHtml(fixture.score)} / ${escapeHtml(fixture.alternativeScore||'—')}</b></div><div><span>${state.language==='en'?'First-half tempo':'半场节奏'}</span><b>${escapeHtml(fixture.halfFull||'—')}</b></div></div></article>`}).join('')}<div class="risk-note">${state.language==='en'?'Risk note: model views are for entertainment and analysis only. Confirm starting lineups before kick-off.':'风险提示：组合观点仅用于娱乐与模型展示，临场阵容优先，不构成投注建议。'}</div></div>`;
  }

  // ---------- Music ----------
  const tracks = [
    ['Waka Waka','Shakira','2010','https://music.apple.com/us/album/waka-waka-this-time-for-africa-the-official-2010-fifa/371784865?i=371784883'],
    ["Wavin' Flag","K'naan",'2010','https://music.apple.com/us/album/wavin-flag/1445842067?i=1445842229'],
    ['The Cup of Life','Ricky Martin','1998','https://music.apple.com/us/album/the-cup-of-life/895837199?i=895837208'],
    ['We Are One (Ole Ola)','Pitbull feat. Jennifer Lopez','2014','https://music.apple.com/us/album/we-are-one-ole-ola/863447149?i=863447277'],
    ['La La La (Brazil 2014)','Shakira','2014','https://music.apple.com/us/album/la-la-la-brazil-2014/880761297?i=880761366'],
    ['Live It Up','Nicky Jam feat. Will Smith','2018','https://music.apple.com/us/album/live-it-up/1388445955?i=1388446741'],
    ['Hayya Hayya','Trinidad Cardona, Davido & AISHA','2022','https://music.apple.com/us/album/hayya-hayya/1616734969?i=1616734971'],
    ['Dreamers','Jung Kook','2022','https://music.apple.com/us/album/dreamers/1655441867?i=1655441868'],
    ['Tukoh Taka','Nicki Minaj, Maluma & Myriam Fares','2022','https://music.apple.com/us/album/tukoh-taka/1653032708?i=1653032710'],
    ['Colors','Jason Derulo','2018','https://music.apple.com/us/album/colors/1356224861?i=1356224875']
  ];
  function renderTracks() { $('#trackList').innerHTML = tracks.map((track,index)=>`<a class="track-button" href="${track[3]}" target="_blank" rel="noopener noreferrer"><b>${String(index+1).padStart(2,'0')}</b><span>${escapeHtml(track[0])}<small>${escapeHtml(track[1])}</small></span><small>${track[2]} ↗</small></a>`).join(''); }

  // ---------- Events ----------
  function bindEvents() {
    document.addEventListener('click', event => {
      const matchButton = event.target.closest('[data-open-match]'); if (matchButton) { openMatchDialog(matchButton.dataset.openMatch); return; }
      const teamButton = event.target.closest('[data-open-team]'); if (teamButton) { openTeamDialog(teamButton.dataset.openTeam); return; }
      const favoriteButton = event.target.closest('[data-favorite]'); if (favoriteButton) { toggleFavorite(favoriteButton.dataset.favorite); return; }
      const dialogButton = event.target.closest('[data-dialog]'); if (dialogButton) { if(dialogButton.dataset.dialog==='scoreDialog')renderScoreDistribution(); if(dialogButton.dataset.dialog==='dailyDialog')renderDailyObservation(); openDialog(dialogButton.dataset.dialog); return; }
      const closeButton = event.target.closest('[data-close-dialog]'); if (closeButton) { closeButton.closest('dialog').close(); return; }
      const navLink = event.target.closest('.nav-menu a'); if(navLink) { $('#navMenu').classList.remove('open'); $('#menuToggle').setAttribute('aria-expanded','false'); }
    });
    $$('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
    $('#menuToggle').addEventListener('click', () => { const open=$('#navMenu').classList.toggle('open'); $('#menuToggle').setAttribute('aria-expanded',String(open)); });
    $('#languageToggle').addEventListener('click', () => setLanguage(state.language==='zh'?'en':'zh'));
    $('#themeToggle').addEventListener('click', () => { state.theme=state.theme==='dark'?'light':'dark';localStorage.setItem(STORAGE.theme,state.theme);applyTheme(); });
    $('#refreshData').addEventListener('click', () => loadData(true));
    $('#dateFilters').addEventListener('click', event => { const button=event.target.closest('[data-date-filter]');if(!button)return;state.dateFilter=button.dataset.dateFilter;$$('[data-date-filter]').forEach(item=>item.classList.toggle('active',item===button));renderMatches(); });
    $('#stageFilters').addEventListener('click', event => { const button=event.target.closest('[data-stage]');if(!button)return;state.stageFilter=button.dataset.stage;$$('[data-stage]').forEach(item=>item.classList.toggle('active',item===button));renderSchedule(); });
    $('#scheduleSearch').addEventListener('input', event => { state.scheduleQuery=event.target.value;renderSchedule(); });
    $('#teamSearch').addEventListener('input', event => { state.teamQuery=event.target.value;renderTeams(); });
    $('#musicToggle').addEventListener('click', () => { const player=$('#musicPlayer'),open=player.hidden;player.hidden=!open;$('#musicToggle').setAttribute('aria-expanded',String(open));$('#musicToggle').textContent=open?t('music.close'):t('music.open');if(open)renderTracks(); });
    document.addEventListener('visibilitychange', () => { if(document.visibilityState==='visible')mergeDirectScoreboard().then(()=>updateFreshness(new Date())); });
  }

  function showToast(message, ok = true) { const toast=$('#toast');toast.textContent=message;toast.style.borderColor=ok?'var(--green)':'var(--danger)';toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('show'),4500); }
  function renderErrorState() { $('#matchGrid').innerHTML=`<div class="empty-state">${state.language==='en'?'Data could not be loaded. Use Sync Data to try again.':'数据暂时无法读取，请点击“同步数据”重试。'}</div>`; }

  function renderAll() { if(!state.data)return;renderMetrics();renderMatches();renderSchedule();renderBracket();renderTeams();renderScoreDistribution();renderDailyObservation();updateFreshness(state.data.updatedAt||new Date()); }

  async function init() {
    try {
      if (window.i18next) await window.i18next.init({lng:state.language,fallbackLng:'zh',resources:translations,interpolation:{escapeValue:false}});
      applyLanguage(); applyTheme(); bindEvents();
      $('#dailyObservation').innerHTML=`<div class="empty-state">${state.language==='en'?'Loading model observations…':'正在读取模型观察…'}</div>`;
      openDialog('dailyDialog');
      await loadData(false);
      setInterval(updateCountdowns,1000);
      setInterval(mergeDirectScoreboard,30000);
      setInterval(()=>loadData(false),300000);
      if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(()=>{});
    } catch (error) {
      console.warn('Application initialization failed:', error.message);
      renderErrorState();
    }
  }

  init();
})();
