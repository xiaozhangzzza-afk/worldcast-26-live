(() => {
  "use strict";

  function orderedMatches() {
    const now = Date.now();
    const favorite=code=>window.FM_FAVORITES?.has(code);
    return FM.store().matches.filter((item) => item.competitionId !== "fifa.world").sort((a, b) => {
      if (Boolean(a.live) !== Boolean(b.live)) return a.live ? -1 : 1;
      const at = new Date(a.date).getTime();
      const bt = new Date(b.date).getTime();
      const aFuture = at >= now && !a.completed;
      const bFuture = bt >= now && !b.completed;
      if (aFuture !== bFuture) return aFuture ? -1 : 1;
      if(aFuture&&bFuture){const af=favorite(a.homeCode)||favorite(a.awayCode),bf=favorite(b.homeCode)||favorite(b.awayCode);if(af!==bf)return af?-1:1;}
      return Math.abs(at - now) - Math.abs(bt - now);
    });
  }

  function nextMatch() {
    const now = Date.now();
    return FM.store().matches
      .filter((item) => item.competitionId !== "fifa.world" && !item.completed && !item.live && new Date(item.date).getTime() >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null;
  }

  function future72(matches) {
    const now = Date.now();
    const end = now + 72 * 3600000;
    return matches.filter((item) => {
      const time = new Date(item.date).getTime();
      return Number.isFinite(time) && time >= now && time <= end && !item.completed && !item.live;
    }).length;
  }

  function renderNext() {
    const root = FM.$("#nextMatchCard");
    if (!root) return;
    const s = FM.store();
    if (s.status === "loading" && !s.matches.length) {
      root.innerHTML = `<div class="empty-state">数据读取中…</div>`;
      return;
    }
    if (s.status === "error" && !s.matches.length) {
      root.innerHTML = `<div class="empty-state">数据暂时无法读取，静态说明页面仍可正常浏览</div>`;
      return;
    }
    const next = nextMatch();
    const metrics = `
      <div class="metric-row">
        <article><strong>${s.matches.filter((item) => item.competitionId !== "fifa.world").length}</strong><small>联赛与欧战比赛</small></article>
        <article><strong>${new Set(s.teams.filter(t=>t.competitionId!=='fifa.world').map(t=>t.code.split(':').at(-1))).size}</strong><small>俱乐部 · 去重</small></article>
        <article><strong>${future72(s.matches.filter((item) => item.competitionId !== "fifa.world"))}</strong><small>未来72小时</small></article>
        <article><strong>${s.matches.filter(m=>!m.live&&!m.completed&&new Date(m.date)>new Date()&&m.predictedScore&&m.probabilities).length}</strong><small>${FM.state.language==='en'?'Available pre-match forecasts':'有效赛前预测 · 非准确率'}</small></article>
      </div>
    `;
    if (!next) {
      root.innerHTML = `<article class="next-match-card"><div class="empty-state">当前暂无近期赛程</div>${metrics}</article>`;
      return;
    }
    root.innerHTML = `
      <article class="next-match-card">
        <div class="next-teams">
          <span><b>${FM.teamLogo(next.homeCode, next.homeLogo)} ${FM.html(FM.nameFor(next, "home"))}</b>主队</span>
          <span><b>${FM.teamLogo(next.awayCode, next.awayLogo)} ${FM.html(FM.nameFor(next, "away"))}</b>客队</span>
        </div>
        <div class="next-score"><small class="score-label">${FM.html(FM.scoreKind(next))}</small>${FM.html(FM.scoreFor(next))}</div>
        <p>${FM.html(FM.competitionName(next))} · ${FM.formatDate(next.date)} · ${FM.countdown(next.date)}</p>
        ${next.alternativeScore?`<p class="card-alternative">${FM.state.language==='en'?'Alternative':'备选比分'} ${FM.html(next.alternativeScore)}</p>`:''}
        ${FM.freshnessLine(next)}
        ${metrics}
      </article>
    `;
  }

  function renderMatches() {
    const root = FM.$("#homeMatchGrid");
    if (!root) return;
    const s = FM.store();
    if (s.status === "loading" && !s.matches.length) {
      root.innerHTML = `<div class="empty-state">数据读取中…</div>`;
      return;
    }
    const matches = orderedMatches().slice(0, 3);
    root.innerHTML = matches.length ? matches.map((item) => FM.matchCard(item, { compact: true })).join("") : `<div class="empty-state">当前暂无近期赛程</div>`;
  }

  function renderInsights() {
    const root = FM.$("#homeInsightGrid");
    if (!root) return;
    const insights = window.FM_DATA?.insights || [];
    root.innerHTML = insights.slice(0, 3).map((item) => `
      <article class="insight-card">
        <header><span>${FM.html(item.type)}</span><strong>${FM.html(item.confidence)}</strong></header>
        <h3>${FM.html(item.title)}</h3>
        <p><strong>${FM.html(item.range)}</strong></p>
        <p>${FM.html(item.reason)}</p>
      </article>
    `).join("");
  }

  function renderWorldCupMini() {
    const root = FM.$("#worldCupMini");
    if (!root) return;
    const matches = FM.store().matches
      .filter((item) => item.competitionId === "fifa.world")
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3);
    root.innerHTML = matches.length
      ? matches.map((item) => FM.matchCard(item, { compact: true })).join("")
      : `<div class="empty-state">世界杯数据暂未载入。</div>`;
  }

  function renderHome() {
    renderMyTeams();
    renderNext();
    renderMatches();
    renderInsights();
    renderWorldCupMini();
  }

  function renderMyTeams(){
    const root=FM.$('#myTeams');if(!root||!window.FM_FAVORITES)return;
    const en=FM.state.language==='en',t=(zh,eng)=>en?eng:zh,s=FM.store(),teams=FM_FAVORITES.teams(s);
    if(!teams.length){root.innerHTML=`<p class="history-note">${t('关注球队后，这里会显示下一场、近期赛果和可读取的积分变化。','Follow clubs to see their next fixture, recent results and available standings changes.')} <a href="teams.html">${t('选择球队','Choose clubs')} ↗</a></p>`;return;}
    root.innerHTML=teams.slice(0,6).map(team=>{const matches=FM_FAVORITES.matches(s,team.code),next=matches.filter(m=>m.live||!m.completed&&new Date(m.date)>new Date()).sort((a,b)=>Number(b.live)-Number(a.live)||new Date(a.date)-new Date(b.date))[0],recent=matches.filter(m=>m.completed).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,3);
      return `<article class="my-team-card"><header>${FM.teamLogo(team.code,team.logo)}<h4>${FM.html(FM.teamName(team.code))}</h4><button type="button" data-unfollow="${FM.html(team.code)}" aria-label="${t('取消关注','Unfollow')} ${FM.html(FM.teamName(team.code))}">★</button></header><p class="favorite-standing" data-standing-code="${FM.html(team.code)}">${t('积分暂未读取','Standings not checked yet')}</p><strong>${t('下一场','Next fixture')}</strong>${next?`<p>${FM.html(FM.nameFor(next,'home'))} vs ${FM.html(FM.nameFor(next,'away'))}</p><p>${FM.formatDate(next.date)} · ${FM.html(FM.competitionName(next))}</p><button class="fixture-link" type="button" data-open-match="${FM.html(next.id)}">${t('查看比赛','Match details')} ↗</button>`:`<p>${t('当前已载入赛程暂无下一场','No next fixture in loaded schedule')}</p>`}<div class="favorite-results"><small>${t('近期赛果 · 当前已载入样本','Recent results · loaded fixtures')}</small>${recent.length?recent.map(m=>`<button type="button" data-open-match="${FM.html(m.id)}">${FM.html(FM.nameFor(m,'home'))} ${FM.html(FM.scoreFor(m))} ${FM.html(FM.nameFor(m,'away'))}</button>`).join(''):`<p>${t('暂无近期赛果','No recent results loaded')}</p>`}</div></article>`;
    }).join('')+(teams.length>6?`<p class="history-note">${t('首页展示前6支，全部关注请到球队数据库查看。','Showing six clubs; see Teams for all favourites.')}</p>`:'');
    window.FM_FAVORITE_STANDINGS?.render?.();
  }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-unfollow]');if(b)FM_FAVORITES.toggle(b.dataset.unfollow);});

  document.addEventListener("DOMContentLoaded", renderHome);
  window.addEventListener("fm:favorites", renderHome);
  window.addEventListener("fm:data-ready", renderHome);
  window.addEventListener("fm:data-updated", renderHome);
  window.addEventListener("fm:data-error", renderHome);
  window.addEventListener("fm:data-loading", renderHome);
  window.addEventListener("fm:language", renderHome);
})();
