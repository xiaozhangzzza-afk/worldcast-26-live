(() => {
  "use strict";

  const STORAGE = {
    language: "football-model-language",
    theme: "football-model-theme",
    favorites: "football-model-favorites",
    cacheMigrated: "football-model-cache-migrated-v570"
  };
  const pages = [
    ["home", "index.html", "首页", "Home"],
    ["predictions", "predictions.html", "比赛预测", "Predictions"],
    ["schedule", "schedule.html", "完整赛程", "Schedule"],
    ["teams", "teams.html", "球队数据库", "Teams"],
    ["about", "about.html", "模型说明", "Model"]
  ];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const safeGet = (key, fallback = "") => {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  };
  const safeSet = (key, value) => {
    try { localStorage.setItem(key, value); } catch { /* localStorage may be unavailable */ }
  };
  const state = {
    page: document.body.dataset.page || "home",
    language: safeGet(STORAGE.language, "zh") === "en" ? "en" : "zh",
    theme: safeGet(STORAGE.theme, "standard") === "calm" ? "calm" : "standard",
    lastFocus: null
  };

  function store() {
    return window.FM_STORE || { status: "loading", source: null, sourceLabel: "", matches: [], teams: [], competitions: [], errors: [], lastUpdated: null, liveUpdatedAt: null, isSnapshot: false, liveConnected: false };
  }

  function html(value) {
    if (/^\d+\s*[-–—:]\s*\d+$/.test(String(value ?? ""))) value = window.FM_NAMES.score(value);
    return String(value ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  function team(code) {
    const rawId = String(code || "");
    const id = rawId.toUpperCase();
    return store().teams.find((item) => String(item.code || "").toUpperCase() === id) || {
      code: id,
      shortCode: id.split(":").pop(),
      name: id || "待定",
      nameEn: id || "TBD",
      logo: "",
      group: "待分组",
      attack: 0,
      midfield: 0,
      defense: 0,
      form: [],
      players: [],
      strength: "数据待更新",
      risk: "临场名单待官方确认"
    };
  }

  function teamName(code) {
    const item = team(code);
    return window.FM_NAMES.team(item, state.language);
  }

  function nameFor(match, side) {
    const known = store().teams.find(t => t.code === match[side + "Code"]);
    return window.FM_NAMES.team({nameEn: match[side + "NameEn"] || known?.nameEn || match[side + "Name"], name: known?.name || match[side + "Name"], nameZh: known?.nameZh}, state.language);
  }

  function inCompetition(item,selection){
    if(selection==='all')return true;
    const meta=store().competitions.find(c=>c.id===item.competitionId);
    return selection==='top5'?meta?.category==='domestic':selection==='europe'?meta?.category==='europe':item.competitionId===selection;
  }

  function teamLogo(code, fallbackLogo = "") {
    const item = team(code);
    const logo = fallbackLogo || item.logo;
    if (logo && /^https?:\/\//.test(logo)) return `<img class="team-logo" src="${html(logo)}" alt="" loading="lazy">`;
    if (logo && logo.length <= 6) return `<span class="flag" aria-hidden="true">${html(logo)}</span>`;
    return `<span class="team-code" aria-hidden="true">${html(item.code || "TBD")}</span>`;
  }

  function stageName(match) {
    if (!match) return state.language === "en" ? "Schedule" : "赛程";
    return state.language === "en" ? (match.stageEn || match.stage || match.stageSlug || "Schedule") : (match.stageZh || match.stage || "赛程");
  }

  function competitionName(match) {
    if (!match) return state.language === "en" ? "Competition" : "赛事";
    const meta = store().competitions?.find((item) => item.id === match.competitionId);
    return state.language === "en"
      ? (match.competitionNameEn || meta?.nameEn || "Competition")
      : (meta?.shortZh || match.competitionNameZh || "赛事");
  }

  function liveClock(match) {
    if(!match)return '';
    return window.FM_PRESENTATION.status(match,store(),Date.now(),state.language).clock;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return state.language === "en" ? "Time TBC" : "时间待定";
    return new Intl.DateTimeFormat(state.language === "en" ? "en-GB" : "zh-CN", {
      timeZone: "Asia/Shanghai",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(date);
  }

  function formatFull(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return state.language === "en" ? "Pending" : "待更新";
    return new Intl.DateTimeFormat(state.language === "en" ? "en-GB" : "zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(date);
  }

  function formatCheck(value){const date=new Date(value);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat(state.language==='en'?'en-GB':'zh-CN',{timeZone:'Asia/Shanghai',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(date):(state.language==='en'?'Unverified':'待核验');}

  function normalize(values) {
    if (!Array.isArray(values) || values.length < 3) return null;
    const raw = values.slice(0, 3).map((value) => Number(value)).map((value) => Number.isFinite(value) ? value : 0);
    const total = raw.reduce((sum, value) => sum + value, 0);
    if (!total) return null;
    const out = raw.map((value) => Math.round(value / total * 100));
    out[1] += 100 - out.reduce((sum, value) => sum + value, 0);
    return out;
  }

  function countdown(value) {
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) return state.language === "en" ? "time TBC" : "时间待定";
    const diff = time - Date.now();
    if (diff <= 0) return state.language === "en" ? "in progress / finished" : "进行中或已结束";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return state.language === "en" ? `${h}h ${m}m` : `${h}小时 ${m}分`;
  }

  function scoreFor(match) {
    if (!match) return "预测数据待更新";
    if ((match.completed || match.live) && Number.isFinite(match.homeScore) && Number.isFinite(match.awayScore)) {
      return `${match.homeScore}–${match.awayScore}`;
    }
    if(match.completed||match.live)return state.language==='en'?'Score awaiting source confirmation':'比分待源确认';
    return match.predictedScore || match.score || (state.language==='en'?'No prediction published':'尚无有效预测');
  }

  function scoreKind(match) {
    if (!match) return "比分待更新";
    if (match.completed) return match.extraTime?(state.language==='en'?'After extra time':'加时后比分'):(state.language==='en'?'Final score':'正式比分');
    if (match.live) return state.language==='en'?'Source score':'源返回比分';
    if (match.predictedScore) return state.language==='en'?'Predicted score':'预测比分';
    return state.language==='en'?'Prediction unavailable':'未提供预测';
  }

  function archivedPrediction(match){return (window.FM_HISTORY?.records||[]).find(r=>String(r.id)===String(match?.id)&&r.homeCode===match.homeCode&&r.awayCode===match.awayCode&&new Date(r.date).getTime()===new Date(match.date).getTime()&&window.FM_ANALYTICS?.validRecord(r))||null;}
  function predictionMissing(match){return state.language==='en'?(match?.completed||match?.live?'No frozen pre-match record; showing actual match data.':'Source has not provided a prediction and statistical samples are insufficient.'):(match?.completed||match?.live?'未留存赛前预测，当前显示实际赛况。':'源未提供预测，且统计样本不足；不是页面加载失败。');}
  function predictionNote(match){const en=state.language==='en',past=match.completed||match.live,r=past?archivedPrediction(match):match;if(!r?.predictedScore)return '';
    const model=window.FM_PRESENTATION.model(match,past?r:null,state.language);
    return `<p class="prediction-basis"><span class="model-origin" data-model="${model.kind}">${html(model.label)}</span>${past?' · '+(en?'Frozen before kickoff':'开赛前冻结'):''}${!past&&model.kind==='local'&&match.localPrediction?` · ${en?'Home/away samples':'两队样本'} ${match.localPrediction.homeSample}/${match.localPrediction.awaySample}`:''}</p>`;
  }

  function probabilityMarkup(match) {
    const valueMatch=match?.completed||match?.live?archivedPrediction(match):match;
    const values = normalize(valueMatch?.probabilities || valueMatch?.probs);
    if (!values) return `<p class="muted-line">${predictionMissing(match)}</p>`;
    const [home, draw, away] = values;
    const labels = state.language === "en" ? ["Home", "Draw", "Away"] : ["主胜", "平局", "客胜"];
    return `
      <div class="probability-row" aria-label="胜平负概率">
        <span style="--w:${home}%">${labels[0]} ${home}%</span>
        <span style="--w:${draw}%">${labels[1]} ${draw}%</span>
        <span style="--w:${away}%">${labels[2]} ${away}%</span>
      </div>
    `;
  }

  function confidenceText(match) {
    return state.language==='en'?'No calibrated accuracy available':'尚无经验证的准确率';
  }

  function freshnessLine(match){
    const s=window.FM_PRESENTATION.status(match,store(),Date.now(),state.language),en=state.language==='en',t=(zh,eng)=>en?eng:zh;
    return `<div class="match-data-state" data-state="${s.sourceState}" data-match-state="${html(match.id)}"><div><span class="phase-badge" data-phase="${s.phase}">${html(s.label)}${match.live&&s.clock?` · <span data-live-clock="${html(match.id)}">${html(s.clock)}</span>`:''}</span><span class="source-badge">${html(s.sourceLabel)}</span></div><p>${s.checkedAt?t('核验','Checked')+' '+`<time datetime="${html(s.checkedAt)}" title="${html(formatFull(s.checkedAt))} UTC+8">${formatCheck(s.checkedAt)}</time>`:t('尚无成功核验时间','No successful check time')}${s.sourceUpdatedAt?' · '+t('源更新','Source update')+' '+formatCheck(s.sourceUpdatedAt):' · '+t('源更新时间未提供','Source time unavailable')}${s.snapshotAt?' · '+t('快照','Snapshot')+' '+formatCheck(s.snapshotAt):''}</p>${['stale','snapshot'].includes(s.sourceState)?`<small>${html(s.note)}</small>`:''}</div>`;
  }

  function comparisonMarkup(match){
    const r=archivedPrediction(match),en=state.language==='en',t=(zh,eng)=>en?eng:zh;
    if(!r)return `<p class="card-comparison">${t('未留存赛前记录，未作事后预测。','No pre-match archive; no retrospective prediction.')}</p>`;
    const result=window.FM_ANALYTICS.evaluationResult(match),pred=String(r.predictedScore).match(/\d+/g)?.slice(0,2).map(Number),same=result&&pred?.[0]===result.homeScore&&pred?.[1]===result.awayScore;
    return `<p class="card-comparison">${t('赛前','Pre-match')} ${html(r.predictedScore)} · ${match.completed?(result?(same?t('主比分一致','Exact-score match'):t('主比分不一致','Exact score differed')):t('90分钟赛果待确认','90-minute result unconfirmed')):t('开赛前冻结，待结算','Frozen before kickoff; pending')}</p>`;
  }

  function cupSummary(match){
    if(!match.isCup)return '';
    const en=state.language==='en';
    if(!match.completed&&!match.live)return `<p class="freshness-line">${en?'Prediction covers 90 minutes, excluding extra time and shootout.':'预测按90分钟口径，不含加时和点球决胜。'}</p>`;
    const scope=match.scoreScope==='regulation'?(en?'90-minute score':'90分钟比分'):match.extraTime?(en?'Score after extra time':'加时后比分'):(en?'Provider final score':'数据源最终比分');
    return `<p class="freshness-line">${scope}${match.penalties?` · ${en?'Shootout':'点球决胜'} ${html(`${match.homePenalties??'待确认'}-${match.awayPenalties??'待确认'}`)}`:''}${match.winnerCode?` · ${en?'Match winner':'本场胜方'} ${html(teamName(match.winnerCode))}`:''}</p>`;
  }

  function matchCard(match, options = {}) {
    if (!match) return "";
    const past=match.completed||match.live;
    return `
      <article class="match-card" data-match-card="${html(match.id)}">
        <header><span>${html(competitionName(match))} · ${html(stageName(match))}</span><time datetime="${html(match.date)}">${formatDate(match.date)}</time></header>
        <div class="match-teams">
          <b><small class="team-side">${state.language==='en'?'Home':'主队'}</small>${teamLogo(match.homeCode || match.home, match.homeLogo)} <span>${html(nameFor(match, "home"))}</span></b>
          <strong class="card-score ${!match.predictedScore&&!past?'score-unavailable':''}"><small class="score-label">${html(scoreKind(match))}</small><span>${html(scoreFor(match))}</span></strong>
          <b><small class="team-side">${state.language==='en'?'Away':'客队'}</small>${teamLogo(match.awayCode || match.away, match.awayLogo)} <span>${html(nameFor(match, "away"))}</span></b>
        </div>
        ${!past&&match.alternativeScore?`<p class="card-alternative">${state.language==='en'?'Alternative score':'备选比分'} <b>${html(match.alternativeScore)}</b></p>`:''}
        ${past?comparisonMarkup(match):probabilityMarkup(match)}
        ${freshnessLine(match)}
        ${predictionNote(match)}
        <p class="card-disclaimer">${state.language==='en'?'Model demonstration, not betting or financial advice. Official lineups, announcements and results take priority.':'模型演示，不构成投注或财务建议。临场阵容、官方公告与实际赛果优先。'}</p>
        ${options.noButton ? "" : `<div class="hero-actions"><button class="button compact" type="button" data-open-match="${html(match.id)}">${state.language === "en" ? "Details" : "查看详情"}</button></div>`}
      </article>
    `;
  }

  function timelineMarkup(match) {
    const items = Array.isArray(match.timeline) ? match.timeline : [];
    if (!items.length) return `<p class="muted-line">暂无实时事件；以官方赛况与赛后数据为准。</p>`;
    return `
      <details open><summary>${state.language==='en'?'All match events':'完整比赛事件'} · ${items.length}</summary>
      <ol class="timeline-list">
        ${items.map((item) => {
          const type = item.type === "goal" ? "进球" : item.type === "yellow" ? "黄牌" : item.type === "red" ? "红牌" : "事件";
          const player = FM_NAMES.player({nameEn:item.player || item.playerEn, nameZh:item.playerZh}, state.language);
          const assist = item.assist || item.assistZh ? FM_NAMES.player({nameEn:item.assist || item.assistEn, nameZh:item.assistZh}, state.language) : "";
          const assistText = item.type === "goal" && assist ? `，助攻：${html(assist)}` : "";
          const goalKind = item.type === "goal" && item.goalKind ? `（${html(item.goalKind)}）` : "";
          return `<li><time>${html(item.minute || item.displayClock || "")}</time><span>${html(type)}：${html(player)}${goalKind}${assistText}</span></li>`;
        }).join("")}
      </ol>
      </details>
    `;
  }

  async function openMatch(matchId, trigger, skipFetch = false) {
    const match = store().matches.find((item) => String(item.id) === String(matchId));
    const modal = $("#matchModal");
    if (!match || !modal) return;
    const wasOpen=!modal.hidden&&modal.dataset.matchId===String(match.id),content=$('#matchModalContent');
    const previousDetails=wasOpen?$$('details',content).map(d=>d.open):[];
    const focusIndex=wasOpen?$$('summary',content).indexOf(document.activeElement):-1;
    const previousScroll=modal.scrollTop;
    modal.dataset.matchId = String(match.id);
    const pm=match.completed||match.live?archivedPrediction(match):match;
    const probabilities = normalize(pm?.probabilities || pm?.probs);
    const en=state.language==='en',t=(zh,eng)=>en?eng:zh;
    const probabilityText = probabilities ? `${t('主胜','Home')} ${probabilities[0]}% · ${t('平局','Draw')} ${probabilities[1]}% · ${t('客胜','Away')} ${probabilities[2]}%${match.completed||match.live?' · '+t('赛前冻结记录','Frozen pre-match record'):''}` : predictionMissing(match);
    $("#matchModalContent").innerHTML = `
      <p class="eyebrow">${html(competitionName(match))} · ${html(stageName(match))} · MATCH ${html(match.matchNo || match.id)}</p>
      <h2 id="matchModalTitle">${teamLogo(match.homeCode, match.homeLogo)} ${html(nameFor(match, "home"))} vs ${teamLogo(match.awayCode, match.awayLogo)} ${html(nameFor(match, "away"))}</h2>
      <div class="detail-grid">
        ${match.isCup?`<article class="detail-card"><h3>${state.language==='en'?'Cup result scope':'杯赛比分口径'}</h3>${cupSummary(match)}<p>${state.language==='en'?'Advancement':'晋级说明'}：${html(match.advancementText||(state.language==='en'?'Awaiting explicit source confirmation':'等待数据源明确确认，不按单场胜负推断'))}</p>${match.aggregateHomeScore!=null&&match.aggregateAwayScore!=null?`<p>总比分 ${html(`${match.aggregateHomeScore}-${match.aggregateAwayScore}`)}</p>`:''}</article>`:''}
        <article class="detail-card"><h3>${html(scoreKind(match))}</h3><p class="detail-score">${html(scoreFor(match))}</p>${match.completed||match.live?comparisonMarkup(match):''}${pm?.alternativeScore?`<p>${t('备选比分','Alternative score')} ${html(pm.alternativeScore)}</p>`:''}${predictionNote(match)}</article>
        <article class="detail-card"><h3>${t('胜平负概率','Result probabilities')}</h3><p>${html(probabilityText)}</p><small>${t('概率不是准确率，尚无经验证的模型命中率。','Probabilities are not accuracy; no validated model accuracy is available.')}</small></article>
        <article class="detail-card"><h3>${state.language === 'en' ? 'HT/FT · Local statistical baseline' : '半全场 · 本地统计参考'}</h3>${window.FM_EXTERNAL_PICKS?.markup(match) || '<p>统计模块尚未载入</p>'}</article>
        <article class="detail-card"><h3>${t('比赛状态与数据来源','Match status and source')}</h3>${freshnessLine(match)}<small>${t('北京时间 UTC+8；分钟仅显示数据源返回值，不自行模拟走时。','Times use UTC+8; match clocks show source values, not simulated elapsed time.')}</small></article>
        <article class="detail-card"><h3>${t('场地','Venue')}</h3><p>${html(match.venue || t('待官方确认','Awaiting official confirmation'))}</p></article>
      </div>
      <details class="prediction-analysis"><summary>${t('分析依据与模型边界','Analysis and model limitations')}</summary>${predictionNote(match)}<p>${t('尚无经验证的准确率；公开概率与本地统计模型分开标注，比分为模型参考，不保证结果。','No validated accuracy is available. Public probabilities and local statistical models are labelled separately; predicted scores are references, not guarantees.')}</p>${Array.isArray(match.factors)&&match.factors.length?`<ul>${match.factors.map(f=>`<li>${html(f)}</li>`).join('')}</ul>`:`<p>${t('该场暂无额外分析因素。','No additional factors supplied for this match.')}</p>`}<a href="about.html#statistical-model">${t('查看模型说明','Read model documentation')} ↗</a></details>
      <section class="detail-card timeline-card">
        <h3>实时/赛后时间轴</h3>
        ${timelineMarkup(match)}
        ${freshnessLine(match)}
      </section>
      <p class="compliance-note modal-note">模型演示，不构成投注或财务建议。临场阵容、官方公告与实际赛果优先。</p>
    `;
    if(wasOpen){$$('details',content).forEach((d,i)=>{if(previousDetails[i]!==undefined)d.open=previousDetails[i];});if(focusIndex>=0)$$('summary',content)[focusIndex]?.focus({preventScroll:true});modal.scrollTop=previousScroll;}
    else openModal(modal, trigger);
    window.FM_DATA_SERVICE?.setActiveDetail?.(match.id);
    if (!skipFetch && match.competitionId !== "fifa.world") {
      const fresh = await window.FM_DATA_SERVICE?.loadMatchDetails?.(match.id, false);
      if (fresh && !modal.hidden) openMatch(match.id, trigger, true);
    }
  }

  function openModal(modal, trigger) {
    state.lastFocus = trigger || document.activeElement;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $(".modal-panel", modal)?.focus();
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    window.FM_DATA_SERVICE?.setActiveDetail?.("");
    state.lastFocus?.focus?.();
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2500);
  }

  function dataStatusText() {
    const s = store();
    if (s.status === "loading" && !s.matches.length) return state.language === "en" ? "Loading data" : "正在加载数据";
    if (s.status === "error") return state.language === "en" ? "Data unavailable" : "数据暂不可用";
    if (s.status === "snapshot" || s.isSnapshot) return state.language === "en" ? "Latest snapshot" : "最近数据快照";
    const quality=window.FM_QUALITY?.assess(s);
    if(quality?.warnings)return state.language==='en'?'Some data overdue / cached':'部分过旧或快照';
    if (s.status === "ready") return state.language === "en" ? "Sources checked" : "接口已核验";
    return state.language === "en" ? "Preparing" : "准备中";
  }

  function updateDataStatus() {
    const el = $("#dataStatus");
    if (el) el.textContent = dataStatusText();
    const hero = $("#heroStatus");
    if (hero) hero.textContent = dataStatusText();
    const footerTime = $("#footerUpdated");
    const latest=(Object.values(store().freshness||{}).filter(m=>m.mode!=='archive').map(m=>m.lastSuccessAt).filter(Boolean).sort().at(-1));
    if (footerTime) footerTime.textContent = latest?formatFull(latest):state.language==='en'?'No successful check; source time unavailable':'尚无成功核验；不代表源更新时间';
    const header=$("[data-site-header]");
    if(header){let panel=$('#dataFreshness');if(!panel){panel=document.createElement('details');panel.id='dataFreshness';panel.className='data-freshness section-shell';header.after(panel);}const open=panel.open,en=state.language==='en',t=(zh,eng)=>en?eng:zh;
      panel.innerHTML=`<summary>${t('数据新鲜度 · 查看核验与来源时间','Data freshness · View checks and source times')}</summary>${(store().competitions||[]).map(c=>{const meta=store().freshness?.[c.id],f=window.FM_ANALYTICS?.freshness(meta);return `<p><strong>${html(en?c.nameEn:c.shortZh)}</strong> · ${t('最近请求','Latest request')}：${meta?.checkedAt?formatFull(meta.checkedAt):t('待请求','Pending')}<br>${t('数据源更新时间','Source updated')}：${meta?.sourceUpdatedAt?formatFull(meta.sourceUpdatedAt):t('源未提供，核验时间不等于源更新时间','Not supplied; request time is not source update time')}<br>${t('状态','Status')}：${({fresh:t('最近核验成功','Recently verified'),partial:t('部分数据使用快照','Partly cached'),stale:t('核验超时，请同步','Verification overdue; sync'),snapshot:t('请求失败，保留最近数据','Request failed; keeping snapshot'),archive:t('归档数据','Archive'),unknown:t('等待核验','Pending')})[f?.state||'unknown']}${meta?.snapshotRecordedAt?' · '+t('快照保存于','Snapshot saved')+' '+formatFull(meta.snapshotRecordedAt):''}</p>`;}).join('')}`;panel.open=open;
    }
  }

  function renderHeader() {
    const root = $("[data-site-header]");
    if (!root) return;
    root.innerHTML = `
      <nav class="nav-shell" aria-label="主要导航">
        <a class="brand" href="index.html" aria-label="足球预测大模型首页"><span class="brand-mark" aria-hidden="true"><img src="assets/img/football.svg" alt=""></span><span><strong>足球预测大模型</strong><small>联赛 · 欧战 · 世界杯</small></span></a>
        <button class="menu-toggle" id="menuToggle" type="button" aria-label="打开导航菜单" aria-expanded="false">菜单</button>
        <div class="nav-menu" id="navMenu">${pages.map(([key, href, zh, en]) => `<a class="${state.page === key ? "active" : ""}" href="${href}" data-zh="${zh}" data-en="${en}">${state.language === "en" ? en : zh}</a>`).join("")}</div>
        <div class="nav-tools">
          <button class="tool-button" id="languageToggle" type="button" aria-label="切换语言">${state.language === "en" ? "EN" : "中文"}</button>
          <button class="tool-button" id="themeToggle" type="button" aria-label="切换主题">${state.theme === "calm" ? "舒缓" : "标准"}</button>
          <button class="tool-button" id="refreshData" type="button" aria-label="同步实时数据">同步</button>
          <span class="data-status" id="dataStatus">${dataStatusText()}</span>
        </div>
      </nav>
    `;
  }

  function renderFooter() {
    const root = $("[data-site-footer]");
    if (!root) return;
    root.innerHTML = `
      <div class="section-shell footer-grid">
        <div><a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true"><img src="assets/img/football.svg" alt=""></span><span><strong>足球预测大模型</strong><small>联赛 · 欧战 · 世界杯</small></span></a><p>用清晰的数据表达，帮助球迷理解赛程、球队和比赛变量。</p><div class="footer-links">${pages.map(([, href, zh]) => `<a href="${href}">${zh}</a>`).join("")}</div></div>
        <div><h2>合规说明</h2><p>模型演示，不构成投注或财务建议。临场阵容、官方公告与实际赛果优先。</p></div>
        <div><h2>${state.language==='en'?'Last successful source check':'最近成功核验 · 非源更新时间'}</h2><p><time id="footerUpdated">${state.language==='en'?'Awaiting check':'等待核验'}</time></p><button class="back-top" id="backTop" type="button" aria-label="返回顶部">返回顶部</button></div>
      </div>
    `;
  }

  function applyStaticLanguage() {
    $$("[data-zh][data-en]").forEach((element) => {
      const value = state.language === "en" ? element.dataset.en : element.dataset.zh;
      if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") element.placeholder = value;
      else element.textContent = value;
    });
  }

  async function migrateCacheOnce() {
    if (safeGet(STORAGE.cacheMigrated)) {
      if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js?v=5.7.0").catch(() => {});
      return;
    }
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith("football-model")).map((key) => caches.delete(key)));
      }
      safeSet(STORAGE.cacheMigrated, "1");
      if ("serviceWorker" in navigator) await navigator.serviceWorker.register("service-worker.js?v=5.7.0");
    } catch (error) {
      console.warn("Cache migration skipped:", error.message);
    }
  }

  function bindCommon() {
    document.onclick = (event) => {
      const close = event.target.closest("[data-close-modal]");
      if (close) return closeModal(close.closest(".modal"));
      if (event.target.classList.contains("modal-backdrop")) return closeModal(event.target.closest(".modal"));
      const openMatchButton = event.target.closest("[data-open-match]");
      if (openMatchButton) return openMatch(openMatchButton.dataset.openMatch, openMatchButton);
    };
    $("#menuToggle")?.addEventListener("click", () => {
      const menu = $("#navMenu");
      const open = menu.classList.toggle("open");
      document.body.classList.toggle("nav-open", open);
      $("#menuToggle").setAttribute("aria-expanded", String(open));
      $("#menuToggle").textContent = open ? "关闭" : "菜单";
    });
    $$("#navMenu a").forEach((link) => link.addEventListener("click", () => {
      $("#navMenu")?.classList.remove("open");
      document.body.classList.remove("nav-open");
    }));
    $("#languageToggle")?.addEventListener("click", () => {
      state.language = state.language === "zh" ? "en" : "zh";
      safeSet(STORAGE.language, state.language);
      renderHeader();
      renderFooter();
      bindCommon();
      applyStaticLanguage();
      updateDataStatus();
      window.dispatchEvent(new CustomEvent("fm:language"));
    });
    $("#themeToggle")?.addEventListener("click", () => {
      state.theme = state.theme === "standard" ? "calm" : "standard";
      safeSet(STORAGE.theme, state.theme);
      document.documentElement.dataset.theme = state.theme;
      renderHeader();
      bindCommon();
    });
    $("#refreshData")?.addEventListener("click", async () => {
      const button = $("#refreshData");
      if (button) {
        button.disabled = true;
        button.textContent = state.language==='en'?'Checking…':'核验中…';
      }
      try { await Promise.allSettled([window.FM_DATA_SERVICE?.loadData(true),window.FM_HISTORY?.load?.()]); }
      finally {
        if (button) {
          button.disabled = false;
          button.textContent = state.language==='en'?'Check':'同步';
        }
        updateDataStatus();
      }
    });
    $("#backTop")?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    document.onkeydown = (event) => {
      const modal=$('.modal:not([hidden])');
      if(event.key==='Tab'&&modal){const controls=$$('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),summary,[tabindex="0"]',modal).filter(e=>e.getClientRects().length),first=controls[0],last=controls.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement=== $('.modal-panel',modal))){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
      if (event.key === "Escape") {
        closeModal($(".modal:not([hidden])"));
        $("#navMenu")?.classList.remove("open");
        document.body.classList.remove("nav-open");
      }
    };
  }

  function initCommon() {
    document.documentElement.dataset.theme = state.theme;
    renderHeader();
    renderFooter();
    applyStaticLanguage();
    bindCommon();
    updateDataStatus();
    migrateCacheOnce();
    setInterval(updateDataStatus, 60000);
    setInterval(() => {if(document.hidden)return;$$('[data-match-state]').forEach(element=>{const match=store().matches.find(m=>String(m.id)===element.dataset.matchState);if(match)element.outerHTML=freshnessLine(match);});updateDataStatus();},15000);
  }

  window.addEventListener("fm:language", () => {const m=$("#matchModal");if(m && !m.hidden && m.dataset.matchId)openMatch(m.dataset.matchId, state.lastFocus, true);});
  window.addEventListener("fm:data-ready", updateDataStatus);
  window.addEventListener("fm:data-updated", updateDataStatus);
  window.addEventListener("fm:data-updated", () => {
    const modal = $("#matchModal");
    if (modal && !modal.hidden && modal.dataset.matchId) openMatch(modal.dataset.matchId, state.lastFocus, true);
  });
  window.addEventListener("fm:data-loading", updateDataStatus);
  window.addEventListener("fm:data-error", updateDataStatus);
  window.FM = {
    $, $$, html, state, STORAGE, safeGet, safeSet, store, team, teamName, teamLogo, stageName,
    formatDate, formatFull, countdown, normalize, matchCard, openMatch, showToast, scoreFor,
    confidenceText, scoreKind, competitionName, liveClock, updateDataStatus, nameFor, inCompetition, freshnessLine, comparisonMarkup
  };
  document.addEventListener("DOMContentLoaded", initCommon);
})();
