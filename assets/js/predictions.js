(() => {
  "use strict";

  const state = { stage:"all", date:"all", query:"" };

  function dateBucket(match) {
    const now = new Date();
    const d = new Date(match.date);
    const day = (value) => new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Shanghai", year:"numeric", month:"2-digit", day:"2-digit" }).format(value);
    if (day(d) === day(now)) return "today";
    if (day(d) === day(new Date(Date.now() + 86400000))) return "tomorrow";
    return "later";
  }
  function renderPredictions() {
    const query = state.query.trim().toLowerCase();
    const matches = window.FM_DATA.matches.filter((item) => {
      const stageOk = state.stage === "all" || item.stage === state.stage;
      const dateOk = state.date === "all" || dateBucket(item) === state.date;
      const haystack = [item.stageZh, item.stageEn, item.venue, item.home, item.away, FM.team(item.home).zh, FM.team(item.home).en, FM.team(item.away).zh, FM.team(item.away).en].join(" ").toLowerCase();
      return stageOk && dateOk && (!query || haystack.includes(query));
    });
    const root = FM.$("#predictionGrid");
    if (root) root.innerHTML = matches.length ? matches.map((item) => FM.matchCard(item)).join("") : `<div class="empty-state">没有找到相关比赛。</div>`;
  }
  function renderScores() {
    const root = FM.$("#scoreDistribution");
    if (!root) return;
    const max = Math.max(...window.FM_DATA.scoreDistribution.map((item) => item[1]));
    root.innerHTML = window.FM_DATA.scoreDistribution.map(([score, weight, tag, note]) => `
      <article class="score-card">
        <strong class="score-name">${FM.html(score)}</strong>
        <div><div class="score-meter"><i style="width:${Math.max(8, Math.round(weight / max * 100))}%"></i></div><p>${FM.html(tag)} · ${FM.html(note)}</p></div>
        <b>${weight}%</b>
      </article>
    `).join("") + `<p style="color:var(--text-muted-dark)">Demo data for product prototype。以上为演示模型分布，不代表真实赛果。</p>`;
  }
  function renderInsights() {
    const root = FM.$("#modelInsightGrid");
    if (!root) return;
    root.innerHTML = window.FM_DATA.insights.map((item) => `
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
  function init() { renderPredictions(); renderScores(); renderInsights(); bind(); }
  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("fm:language", renderPredictions);
})();
