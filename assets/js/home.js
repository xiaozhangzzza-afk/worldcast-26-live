(() => {
  "use strict";

  function orderedMatches() {
    const now = Date.now();
    return FM.store().matches.filter((item) => item.competitionId !== "fifa.world").sort((a, b) => {
      const at = new Date(a.date).getTime();
      const bt = new Date(b.date).getTime();
      const aFuture = at >= now && !a.completed;
      const bFuture = bt >= now && !b.completed;
      if (aFuture !== bFuture) return aFuture ? -1 : 1;
      return Math.abs(at - now) - Math.abs(bt - now);
    });
  }

  function nextMatch() {
    const now = Date.now();
    return FM.store().matches
      .filter((item) => item.competitionId !== "fifa.world" && !item.completed && new Date(item.date).getTime() >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null;
  }

  function averageConfidence(matches) {
    const values = matches.map((item) => item.confidence).filter((value) => value !== null && value !== "" && Number.isFinite(Number(value))).map(Number);
    if (!values.length) return "预测数据待更新";
    return `${(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)}%`;
  }

  function future72(matches) {
    const now = Date.now();
    const end = now + 72 * 3600000;
    return matches.filter((item) => {
      const time = new Date(item.date).getTime();
      return Number.isFinite(time) && time >= now && time <= end && !item.completed;
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
        <article><strong>${s.matches.filter((item) => item.competitionId !== "fifa.world").length}</strong><small>五大联赛比赛</small></article>
        <article><strong>${s.teams.filter((item) => item.competitionId !== "fifa.world").length}</strong><small>俱乐部档案</small></article>
        <article><strong>${future72(s.matches.filter((item) => item.competitionId !== "fifa.world"))}</strong><small>未来72小时</small></article>
        <article><strong>${averageConfidence(s.matches.filter((item) => item.competitionId !== "fifa.world"))}</strong><small>平均模型信心</small></article>
      </div>
    `;
    if (!next) {
      root.innerHTML = `<article class="next-match-card"><div class="empty-state">当前暂无近期赛程</div>${metrics}</article>`;
      return;
    }
    root.innerHTML = `
      <article class="next-match-card">
        <div class="next-teams">
          <span><b>${FM.teamLogo(next.homeCode, next.homeLogo)} ${FM.html(next.homeName)}</b>主队</span>
          <span><b>${FM.teamLogo(next.awayCode, next.awayLogo)} ${FM.html(next.awayName)}</b>客队</span>
        </div>
        <div class="next-score"><small class="score-label">${FM.html(FM.scoreKind(next))}</small>${FM.html(FM.scoreFor(next))}</div>
        <p>${FM.html(FM.competitionName(next))} · ${FM.formatDate(next.date)} · ${FM.countdown(next.date)}</p>
        <p class="muted-line">${FM.html(next.statusText || "未开赛")} ${next.live ? `· <span class="live-clock" data-live-clock="${FM.html(next.id)}">${FM.html(FM.liveClock(next))}</span>` : ""}</p>
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
    renderNext();
    renderMatches();
    renderInsights();
    renderWorldCupMini();
  }

  document.addEventListener("DOMContentLoaded", renderHome);
  window.addEventListener("fm:data-ready", renderHome);
  window.addEventListener("fm:data-updated", renderHome);
  window.addEventListener("fm:data-error", renderHome);
  window.addEventListener("fm:data-loading", renderHome);
  window.addEventListener("fm:language", renderHome);
})();
