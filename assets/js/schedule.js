(() => {
  "use strict";

  const state = { competition: new URLSearchParams(location.search).get("competition") || "top5", stage: "all", query: "" };

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
      const competitionOk = state.competition === "all" || (state.competition === "top5" ? item.competitionId !== "fifa.world" : item.competitionId === state.competition);
      const stageOk = state.stage === "all" || item.stageSlug === state.stage;
      return competitionOk && stageOk && (!query || haystack(item).includes(query));
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  function renderSchedule() {
    const root = FM.$("#scheduleGrid");
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
    const count = FM.$("#scheduleCount");
    if (count) count.textContent = s.status === "snapshot" ? `当前筛选：${matches.length}场 · 最近数据快照` : `当前筛选：${matches.length}场`;
    root.innerHTML = matches.length ? matches.map((item) => `
      <article class="schedule-card ${item.stageSlug === "final" ? "final-card" : ""}">
        <header><span>${FM.html(FM.competitionName(item))} · ${FM.html(FM.stageName(item))}${item.group ? ` · ${FM.html(item.group)}组` : ""}</span><time datetime="${FM.html(item.date)}">${FM.formatDate(item.date)}</time></header>
        <h3>${FM.teamLogo(item.homeCode, item.homeLogo)} ${FM.html(item.homeName)} vs ${FM.teamLogo(item.awayCode, item.awayLogo)} ${FM.html(item.awayName)}</h3>
        <p>场地：${FM.html(item.venue || "待官方确认")}</p>
        <p>状态：${FM.html(item.statusText || "待更新")} ${item.live ? `· <span class="live-clock" data-live-clock="${FM.html(item.id)}">${FM.html(FM.liveClock(item))}</span>` : ""} · ${FM.html(FM.scoreKind(item))}：${FM.html(FM.scoreFor(item))}</p>
      </article>
    `).join("") : `<div class="empty-state">没有找到相关赛程。</div>`;
  }

  function bind() {
    FM.$("#competitionFilter")?.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-competition]");
      if (!button) return;
      state.competition = button.dataset.competition;
      FM.$$("#competitionFilter button").forEach((item) => item.classList.toggle("active", item === button));
      renderSchedule();
    });
    FM.$$("#competitionFilter button").forEach((item) => item.classList.toggle("active", item.dataset.competition === state.competition));
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
  window.addEventListener("fm:data-ready", renderSchedule);
  window.addEventListener("fm:data-updated", renderSchedule);
  window.addEventListener("fm:data-error", renderSchedule);
  window.addEventListener("fm:data-loading", renderSchedule);
  window.addEventListener("fm:language", renderSchedule);
})();
