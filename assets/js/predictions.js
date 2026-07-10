(() => {
  "use strict";

  const state = { stage: "all", date: "all", query: "" };

  function chinaDay(date) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  }

  function dateBucket(match) {
    const d = new Date(match.date);
    if (Number.isNaN(d.getTime())) return "later";
    const now = new Date();
    if (chinaDay(d) === chinaDay(now)) return "today";
    if (chinaDay(d) === chinaDay(new Date(Date.now() + 86400000))) return "tomorrow";
    return "later";
  }

  function haystack(match) {
    return [
      match.stage,
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
      const stageOk = state.stage === "all" || item.stageSlug === state.stage;
      const dateOk = state.date === "all" || dateBucket(item) === state.date;
      return stageOk && dateOk && (!query || haystack(item).includes(query));
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  function renderPredictions() {
    const root = FM.$("#predictionGrid");
    if (!root) return;
    const s = FM.store();
    if (s.status === "loading" && !s.matches.length) {
      root.innerHTML = `<div class="empty-state">数据读取中…</div>`;
      return;
    }
    if (s.status === "error" && !s.matches.length) {
      root.innerHTML = `<div class="empty-state">数据暂时无法读取，请稍后刷新。</div>`;
      return;
    }
    const matches = filteredMatches();
    root.innerHTML = matches.length ? matches.map((item) => FM.matchCard(item)).join("") : `<div class="empty-state">没有找到相关比赛。</div>`;
  }

  function renderScores() {
    const root = FM.$("#scoreDistribution");
    if (!root) return;
    const source = window.FM_DATA?.scoreDistribution || [];
    const max = Math.max(...source.map((item) => item[1]), 1);
    root.innerHTML = source.map(([score, weight, tag, note]) => `
      <article class="score-card">
        <strong class="score-name">${FM.html(score)}</strong>
        <div><div class="score-meter"><i style="width:${Math.max(8, Math.round(weight / max * 100))}%"></i></div><p>${FM.html(tag)} · ${FM.html(note)}</p></div>
        <b>${weight}%</b>
      </article>
    `).join("") + `<p class="light-note">以上为模型分布展示；真实赛果以赛后数据源为准。</p>`;
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
})();
