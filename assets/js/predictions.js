(() => {
  "use strict";

    const state = { competition: new URLSearchParams(location.search).get("competition") || "top5", stage: "all", date: "all", query: "", status:'upcoming' };

  function chinaDay(date) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  }

  function dateBucket(match) {
    const d = new Date(match.date);
    if (Number.isNaN(d.getTime())) return "later";
    const now = new Date();
    if (chinaDay(d) === chinaDay(now)) return "today";
    if (chinaDay(d) === chinaDay(new Date(Date.now() + 86400000))) return "tomorrow";
    return d.getTime() > now.getTime() ? "later" : "past";
  }

  function haystack(match) {
    return [
      match.stage,
      match.competitionNameZh,
      match.competitionNameEn,
      match.stageSlug,
      match.group,
      match.venue,
      match.homeCode,
      match.awayCode,
      match.homeName,
      match.awayName,
      FM.team(match.homeCode).nameEn,
      FM.team(match.awayCode).nameEn
    ].join(" ").toLowerCase();
  }

  function filteredMatches() {
    const query = state.query.trim().toLowerCase();
    return FM.store().matches.filter((item) => {
      const competitionOk = FM.inCompetition(item,state.competition);
      const stageOk = state.stage === "all" || (state.stage==='knockout' ? item.isCup&&!['league-phase','group-stage'].includes(item.stageSlug) : item.stageSlug === state.stage);
      const dateOk = state.date === "all" || dateBucket(item) === state.date;
      const statusOk=state.status==='all'||(state.status==='completed'?item.completed:state.status==='live'?item.live:!item.completed&&!item.live&&new Date(item.date)>new Date());
      return statusOk && competitionOk && stageOk && dateOk && (!query || haystack(item).includes(query));
    }).sort((a,b)=>{const group=m=>m.live?0:!m.completed&&new Date(m.date)>new Date()?1:2;return group(a)-group(b)||(group(a)===2?new Date(b.date)-new Date(a.date):new Date(a.date)-new Date(b.date));});
  }

  function renderPredictions() {
    const labels={upcoming:['待赛预测','Upcoming'],live:['进行中','Live'],completed:['已完赛','Completed'],all:['全部','All']};
    FM.$$('#predictionStatus [data-status]').forEach(b=>{b.textContent=labels[b.dataset.status][FM.state.language==='en'?1:0];});
    const european=state.competition==='europe'||FM.store().competitions.find(c=>c.id===state.competition)?.category==='europe';
    FM.$$('#stageFilter button').forEach(b=>{const key=b.dataset.stage;b.hidden=key!=='all'&&(state.competition==='top5'||FM.store().competitions.find(c=>c.id===state.competition)?.category==='domestic'?key!=='league':european?['league','group-stage','round-of-32','third-place'].includes(key):['league','league-phase','knockout'].includes(key));});
    const root = FM.$("#predictionGrid");
    if (!root) return;
    const s = FM.store();
    if (s.status === "loading" && !s.matches.length) {
      root.innerHTML = `<div class="empty-state">${FM.state.language==='en'?'Loading data…':'数据读取中…'}</div>`;
      return;
    }
    if (s.status === "error" && !s.matches.length) {
      root.innerHTML = `<div class="empty-state">${FM.state.language==='en'?'Data unavailable; please retry later.':'数据暂时无法读取，请稍后刷新。'}</div>`;
      return;
    }
    const matches = filteredMatches();
    const count=FM.$('#predictionCoverage');if(count){const n=matches.filter(m=>m.predictedScore&&m.probabilities).length;count.textContent=FM.state.language==='en'?`${matches.length} fixtures · ${n} with public or local baseline predictions; missing outputs are explicit.`:`当前 ${matches.length} 场 · ${n} 场有公开或本地统计预测；样本不足的场次明确提示，不填假数据。`;}
    root.innerHTML = matches.length ? matches.map((item) => FM.matchCard(item)).join("") : `<div class="empty-state">${FM.state.language==='en'?'No matching fixtures.':'没有找到相关比赛。'}</div>`;
  }

  function renderScores() {
    const root = FM.$("#scoreDistribution");
    if (!root) return;
    const selected=FM.store().matches.filter(m=>FM.inCompetition(m,state.competition));
    const data=FM_ANALYTICS.distribution(selected);
    const max = Math.max(...data.rows.map(item=>item.count),1);
    root.innerHTML = data.rows.map(({score,count,share}) => `
      <article class="score-card">
        <strong class="score-name">${FM.html(FM_NAMES.score(score))}</strong>
        <div><div class="score-meter"><i style="width:${Math.round(count / max * 100)}%"></i></div><p>${count} ${FM.state.language==='en'?'completed matches':'场已完赛'} · ${share}%</p></div>
        <b>${count}</b>
      </article>
    `).join("") + `<p class="history-note">${FM.state.language==='en'?'Official-score sample':'正式比分样本'}：${data.total} ${FM.state.language==='en'?'matches; home score first. Only the currently loaded schedule is covered, not the whole season.':'场；主队比分在前。统计所选联赛当前已载入的赛程，非全赛季统计。'} ${data.total?FM.formatDate(data.start)+' — '+FM.formatDate(data.end):''}</p>`;
    renderHistory();
  }

  function renderHistory(){
    const root=FM.$('#predictionHistory');if(!root)return;
    const en=FM.state.language==='en',t=(zh,eng)=>en?eng:zh,h=window.FM_HISTORY;
    if(!h||h.loading){root.innerHTML=`<p>${t('预测档案读取中…','Loading prediction archive…')}</p>`;return;}
    if(h.error){root.innerHTML=`<p>${t('预测档案暂不可用，请同步后重试。','Prediction archive unavailable; retry after sync.')}</p>`;return;}
    const records=h.records.filter(r=>FM.inCompetition(r,state.competition));
    const settled=FM_ANALYTICS.results(records,FM.store().matches),n=settled.length;
    const rate=key=>n?(settled.filter(r=>r[key]).length/n*100).toFixed(1)+'%':t('等待赛果','Awaiting results');
    const byId=new Map(settled.map(r=>[r.id,r]));
    const opened=root.querySelector('details')?.open;root.innerHTML=`<details class="prediction-comparison" ${opened?'open':''}><summary>${t('预测 vs 实际','Prediction vs actual')} · ${n} ${t('场已结算','settled')} · ${t('胜平负','Result')} ${rate('win')}<span>${t('展开对比','View comparison')}</span></summary><div class="history-metrics"><article><strong>${n}</strong><small>${t('已结算样本','Settled samples')} · ${records.length} ${t('条赛前记录','pre-match records')}</small></article><article><strong>${rate('win')}</strong><small>${t('胜平负命中率','Result accuracy')}</small></article><article><strong>${rate('exact')}</strong><small>${t('主比分命中率','Exact-score accuracy')} · ${t('主/备选任一命中','Primary or alternative hit')} ${rate('alternative')}</small></article></div><p class="history-note">${t('从本版发布开始保存赛前预测，开赛后锁定；已结束比赛不补录。当前为公开概率/规则与本地泊松两类模型的混合统计，不是信心指标。半全场分布已保存，缺少正式半场赛果时不结算。','Records begin with this release and freeze at kickoff; completed matches are not backfilled. Aggregate results mix public odds/rules and local Poisson baselines, not confidence scores. HT/FT records are stored but not settled without official half-time scores.')}</p><div class="history-rows"><table><thead><tr><th>${t('比赛','Match')}</th><th>${t('模型','Model')}</th><th>${t('记录时间','Recorded')}</th><th>${t('主/备选比分','Primary / alternative')}</th><th>${t('赛果','Result')}</th></tr></thead><tbody>${[...records].sort((a,b)=>Number(byId.has(b.id))-Number(byId.has(a.id))||new Date(b.date)-new Date(a.date)).slice(0,12).map(r=>{const s=byId.get(r.id);return `<tr><td>${FM.html(FM_NAMES.team({nameEn:r.homeName},FM.state.language))} vs ${FM.html(FM_NAMES.team({nameEn:r.awayName},FM.state.language))}</td><td>${r.modelVersion==='local-poisson-v1'?t('本地泊松','Local Poisson'):t('公开概率/规则','Public odds/rules')}</td><td>${FM.formatFull(r.capturedAt)}</td><td>${FM.html(FM_NAMES.score(r.predictedScore))} / ${FM.html(FM_NAMES.score(r.alternativeScore))}</td><td>${s?FM.html(FM_NAMES.score(`${s.result.homeScore}-${s.result.awayScore}`))+' · '+(s.exact?t('主比分一致','Exact score matched'):s.alternative?t('备选比分一致','Alternative matched'):t('比分不一致','Score differed')):r.excludedReason?t('90分钟比分待确认，未计入','90-minute result unconfirmed; excluded'):t('待结算','Pending')}</td></tr>`;}).join('')}</tbody></table></div>${records.length?'':`<p>${t('当前尚无有效赛前记录，等待数据源提供预测字段。','No valid pre-match records yet; awaiting source predictions.')}</p>`}</details>`;
  }

  function renderInsights() {
    const root = FM.$("#modelInsightGrid");
    if (!root) return;
    const insights = window.FM_DATA?.insights || [];
    root.innerHTML = insights.map((item) => `
      <article class="insight-card">
        <header><span>${FM.html(item.type)}</span><strong>${FM.html(item.confidence)}</strong></header>
        <h3>${FM.html(item.title)}</h3>
        <p><strong>${FM.html(item.range)}</strong></p>
        <p>${FM.html(item.reason)}</p>
        <p>风险提示：${FM.html(item.risk)}</p>
      </article>
    `).join("");
  }

  function bind() {
    const filter=document.createElement('div');filter.id='predictionStatus';filter.className='schedule-status';filter.setAttribute('role','group');filter.setAttribute('aria-label','比赛状态筛选');filter.innerHTML=[['upcoming','待赛预测'],['live','进行中'],['completed','已完赛'],['all','全部']].map(([key,label])=>`<button type="button" data-status="${key}" aria-pressed="${state.status===key}" class="${state.status===key?'active':''}">${label}</button>`).join('');FM.$('#dateFilter')?.before(filter);filter.addEventListener('click',e=>{const b=e.target.closest('[data-status]');if(!b)return;state.status=b.dataset.status;filter.querySelectorAll('button').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});renderPredictions();});
    const count=document.createElement('p');count.id='predictionCoverage';count.className='history-note';FM.$('#predictionGrid')?.before(count);renderPredictions();
    FM.$("#competitionFilter")?.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-competition]");
      if (!button) return;
      state.competition = button.dataset.competition;
      state.stage = 'all';
      FM.$$('#stageFilter button').forEach(b=>b.classList.toggle('active',b.dataset.stage==='all'));
      FM.$$("#competitionFilter button").forEach((item) => item.classList.toggle("active", item === button));
      renderAll();
    });
    FM.$$("#competitionFilter button").forEach((item) => item.classList.toggle("active", item.dataset.competition === state.competition));
    FM.$("#stageFilter")?.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-stage]");
      if (!button) return;
      state.stage = button.dataset.stage;
      FM.$$("#stageFilter button").forEach((item) => item.classList.toggle("active", item === button));
      renderPredictions();
    });
    FM.$("#dateFilter")?.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-date]");
      if (!button) return;
      state.date = button.dataset.date;
      FM.$$("#dateFilter button").forEach((item) => item.classList.toggle("active", item === button));
      renderPredictions();
    });
    FM.$("#predictionSearch")?.addEventListener("input", (event) => {
      state.query = event.target.value;
      renderPredictions();
    });
  }

  function renderAll() {
    renderPredictions();
    renderScores();
    renderInsights();
  }

  document.addEventListener("DOMContentLoaded", () => { renderAll(); bind(); });
  window.addEventListener("fm:data-ready", renderAll);
  window.addEventListener("fm:data-updated", renderAll);
  window.addEventListener("fm:data-error", renderAll);
  window.addEventListener("fm:data-loading", renderAll);
  window.addEventListener("fm:language", renderAll);
  window.addEventListener("fm:history-ready", renderHistory);
})();
