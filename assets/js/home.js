(() => {
  "use strict";

  function renderHome() {
    const { matches, insights } = window.FM_DATA;
    const next = matches.find((item) => new Date(item.date) > new Date()) || matches[0];
    const nextRoot = FM.$("#nextMatchCard");
    if (nextRoot) {
      nextRoot.innerHTML = `
        <article class="next-match-card">
          <div class="next-teams">
            <span><b>${FM.team(next.home).flag} ${FM.html(FM.teamName(next.home))}</b>主队</span>
            <span><b>${FM.team(next.away).flag} ${FM.html(FM.teamName(next.away))}</b>客队</span>
          </div>
          <div class="next-score">${FM.html(next.score)}</div>
          <p>${FM.html(FM.stageName(next))} · ${FM.formatDate(next.date)} · ${FM.countdown(next.date)}</p>
          <div class="metric-row">
            <article><strong>${next.confidence}%</strong><small>模型信心</small></article>
            <article><strong>${FM.html(next.altScore)}</strong><small>备选比分</small></article>
            <article><strong>${FM.html(next.halfFull)}</strong><small>半全场</small></article>
          </div>
        </article>
      `;
    }
    const matchRoot = FM.$("#homeMatchGrid");
    if (matchRoot) matchRoot.innerHTML = matches.slice(0, 3).map((item) => FM.matchCard(item, { compact:true })).join("");
    const insightRoot = FM.$("#homeInsightGrid");
    if (insightRoot) {
      insightRoot.innerHTML = insights.slice(0, 3).map((item) => `
        <article class="insight-card">
          <header><span>${FM.html(item.type)}</span><strong>${FM.html(item.confidence)}</strong></header>
          <h3>${FM.html(item.title)}</h3>
          <p><strong>${FM.html(item.range)}</strong></p>
          <p>${FM.html(item.reason)}</p>
        </article>
      `).join("");
    }
  }

  document.addEventListener("DOMContentLoaded", renderHome);
  window.addEventListener("fm:language", renderHome);
})();
