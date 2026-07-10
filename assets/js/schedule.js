(() => {
  "use strict";
  const state = { stage:"all", query:"" };
  function renderSchedule() {
    const query = state.query.trim().toLowerCase();
    const matches = window.FM_DATA.matches.filter((item) => {
      const stageOk = state.stage === "all" || item.stage === state.stage;
      const haystack = [item.stageZh, item.stageEn, item.venue, item.home, item.away, FM.team(item.home).zh, FM.team(item.home).en, FM.team(item.away).zh, FM.team(item.away).en].join(" ").toLowerCase();
      return stageOk && (!query || haystack.includes(query));
    });
    const root = FM.$("#scheduleGrid");
    if (!root) return;
    root.innerHTML = matches.length ? matches.map((item) => `
      <article class="schedule-card ${item.stage === "final" ? "final-card" : ""}">
        <header><span>${FM.html(FM.stageName(item))}</span><time datetime="${item.date}">${FM.formatDate(item.date)}</time></header>
        <h3>${FM.team(item.home).flag} ${FM.html(FM.teamName(item.home))} vs ${FM.team(item.away).flag} ${FM.html(FM.teamName(item.away))}</h3>
        <p>场地：${FM.html(item.venue)}</p>
        <p>状态：${FM.html(item.status)} · 预测：${FM.html(item.score)}</p>
      </article>
    `).join("") : `<div class="empty-state">没有找到相关赛程。</div>`;
  }
  function bind() {
    FM.$("#stageFilter")?.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-stage]");
      if (!button) return;
      state.stage = button.dataset.stage;
      FM.$$("#stageFilter button").forEach((item) => item.classList.toggle("active", item === button));
      renderSchedule();
    });
    FM.$("#scheduleSearch")?.addEventListener("input", (event) => {
      state.query = event.target.value;
      renderSchedule();
    });
  }
  document.addEventListener("DOMContentLoaded", () => { renderSchedule(); bind(); });
  window.addEventListener("fm:language", renderSchedule);
})();
