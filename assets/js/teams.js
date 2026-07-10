(() => {
  "use strict";
  const FAV_KEY = FM.STORAGE.favorites;
  const state = { query:"", favorites:new Set(readFavorites()) };
  function readFavorites() {
    try { const value = JSON.parse(FM.safeGet(FAV_KEY, "[]")); return Array.isArray(value) ? value : []; } catch { return []; }
  }
  function saveFavorites() { FM.safeSet(FAV_KEY, JSON.stringify(Array.from(state.favorites))); }
  function rating(label, value) {
    return `<div><span>${label}</span><i style="--w:${Math.min(100, value)}%"></i><b>${Math.min(100, value)}</b></div>`;
  }
  function renderTeams() {
    const query = state.query.trim().toLowerCase();
    const teams = window.FM_DATA.teams.filter((item) => [item.code, item.zh, item.en, item.group, item.players.join(" ")].join(" ").toLowerCase().includes(query));
    const root = FM.$("#teamGrid");
    if (root) {
      root.innerHTML = teams.length ? teams.map((item) => {
        const active = state.favorites.has(item.code);
        return `
          <article class="team-card">
            <button class="favorite-button ${active ? "active" : ""}" type="button" data-favorite="${item.code}" aria-label="${active ? "取消关注" : "关注"} ${FM.html(item.zh)}">★</button>
            <button class="team-title" type="button" data-open-team="${item.code}" aria-label="查看${FM.html(item.zh)}详情">
              <span class="flag" aria-hidden="true">${item.flag}</span>
              <span><h3>${FM.html(FM.state.language === "en" ? item.en : item.zh)}</h3><p>${item.code} · 小组 ${FM.html(item.group)}</p></span>
            </button>
            <div class="rating-bars">${rating("进攻", item.attack)}${rating("中场", item.midfield)}${rating("防守", item.defense)}</div>
            <p>核心球员：${item.players.slice(0, 2).map(FM.html).join("、")}</p>
            <p>近期状态：${item.form.join(" · ")}</p>
            <div class="tag-row"><span class="tag">${FM.html(item.strength)}</span><span class="tag">${FM.html(item.risk)}</span></div>
          </article>
        `;
      }).join("") : `<div class="empty-state">没有找到相关球队。</div>`;
    }
    renderFavorites();
  }
  function renderFavorites() {
    const codes = Array.from(state.favorites).filter((code) => window.FM_DATA.teams.some((item) => item.code === code));
    const hint = FM.$("#favoriteHint");
    if (hint) hint.hidden = codes.length > 0;
    const root = FM.$("#favoriteTeams");
    if (root) root.innerHTML = codes.map((code) => `<button class="favorite-chip" type="button" data-open-team="${code}">${FM.team(code).flag} ${FM.html(FM.teamName(code))}</button>`).join("");
  }
  function openTeam(code, trigger) {
    const item = FM.team(code);
    const modal = FM.$("#teamModal");
    if (!modal) return;
    FM.$("#teamModalContent").innerHTML = `
      <p class="eyebrow">TEAM ${FM.html(item.code)}</p>
      <h2 id="teamModalTitle">${item.flag} ${FM.html(FM.state.language === "en" ? item.en : item.zh)}</h2>
      <div class="detail-grid">
        <article class="detail-card"><h3>攻中防评分</h3><p>进攻 ${item.attack} · 中场 ${item.midfield} · 防守 ${item.defense}</p></article>
        <article class="detail-card"><h3>核心球员</h3><p>${item.players.map(FM.html).join("、")}</p></article>
        <article class="detail-card"><h3>近期状态</h3><p>${item.form.join(" · ")}</p></article>
        <article class="detail-card"><h3>风险标签</h3><p>${FM.html(item.risk)}</p></article>
      </div>
    `;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    FM.$(".modal-panel", modal)?.focus();
    window.__fmLastFocus = trigger;
  }
  function bind() {
    FM.$("#teamSearch")?.addEventListener("input", (event) => {
      state.query = event.target.value;
      renderTeams();
    });
    document.addEventListener("click", (event) => {
      const fav = event.target.closest("[data-favorite]");
      if (fav) {
        const code = fav.dataset.favorite;
        state.favorites.has(code) ? state.favorites.delete(code) : state.favorites.add(code);
        saveFavorites();
        renderTeams();
        FM.showToast("关注球队已更新");
      }
      const team = event.target.closest("[data-open-team]");
      if (team) openTeam(team.dataset.openTeam, team);
    });
  }
  document.addEventListener("DOMContentLoaded", () => { renderTeams(); bind(); });
  window.addEventListener("fm:language", renderTeams);
})();
