(() => {
  "use strict";

  const state = { stage: "all", query: "" };

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
      return stageOk && (!query || haystack(item).includes(query));
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
    if (count) count.textContent = s.status === "snapshot" ? `比赛总数：${s.matches.length} · 最近数据快照` : `比赛总数：${s.matches.length}`;
    root.innerHTML = matches.length ? matches.map((item) => `
      <article class="schedule-card ${item.stageSlug === "final" ? "final-card" : ""}">
        <header><span>${FM.html(FM.stageName(item))}${item.group ? ` · ${FM.html(item.group)}组` : ""}</span><time datetime="${FM.html(item.date)}">${FM.formatDate(item.date)}</time></header>
        <h3>${FM.teamLogo(item.homeCode, item.homeLogo)} ${FM.html(item.homeName)} vs ${FM.teamLogo(item.awayCode, item.awayLogo)} ${FM.html(item.awayName)}</h3>
        <p>场地：${FM.html(item.venue || "待官方确认")}</p>
        <p>状态：${FM.html(item.statusText || "待更新")} ${item.displayClock ? `· ${FM.html(item.displayClock)}` : ""} · 比分/预测：${FM.html(FM.scoreFor(item))}</p>
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
  window.addEventListener("fm:data-ready", renderSchedule);
  window.addEventListener("fm:data-updated", renderSchedule);
  window.addEventListener("fm:data-error", renderSchedule);
  window.addEventListener("fm:data-loading", renderSchedule);
  window.addEventListener("fm:language", renderSchedule);
})();
