(() => {
  "use strict";

  const FAV_KEY = FM.STORAGE.favorites;
  const state = { query: "", favorites: new Set(readFavorites()) };

  function readFavorites() {
    try {
      const value = JSON.parse(FM.safeGet(FAV_KEY, "[]"));
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function saveFavorites() {
    FM.safeSet(FAV_KEY, JSON.stringify(Array.from(state.favorites)));
  }

  function rating(label, value) {
    const n = Number.isFinite(Number(value)) ? Math.min(100, Math.max(0, Number(value))) : 0;
    return `<div><span>${label}</span><i style="--w:${n}%"></i><b>${n || "—"}</b></div>`;
  }

  function playerText(players, limit = 2) {
    const list = Array.isArray(players) ? players.filter(Boolean) : [];
    return list.length ? list.slice(0, limit).map(FM.html).join("、") : "球员数据待更新";
  }

  function filteredTeams() {
    const query = state.query.trim().toLowerCase();
    return FM.store().teams.filter((item) => [
      item.code,
      item.name,
      item.nameEn,
      item.group,
      (item.players || []).join(" ")
    ].join(" ").toLowerCase().includes(query)).sort((a, b) => a.code.localeCompare(b.code));
  }

  function renderTeams() {
    const root = FM.$("#teamGrid");
    const s = FM.store();
    if (root) {
      if (s.loading && !s.teams.length) {
        root.innerHTML = `<div class="empty-state">数据读取中…</div>`;
      } else if (s.error && !s.teams.length) {
        root.innerHTML = `<div class="empty-state">${FM.html(s.error)}</div>`;
      } else {
        const teams = filteredTeams();
        root.innerHTML = teams.length ? teams.map((item) => {
          const active = state.favorites.has(item.code);
          return `
            <article class="team-card">
              <button class="favorite-button ${active ? "active" : ""}" type="button" data-favorite="${FM.html(item.code)}" aria-label="${active ? "取消关注" : "关注"} ${FM.html(item.name)}">★</button>
              <button class="team-title" type="button" data-open-team="${FM.html(item.code)}" aria-label="查看${FM.html(item.name)}详情">
                ${FM.teamLogo(item.code, item.logo)}
                <span><h3>${FM.html(FM.state.language === "en" ? item.nameEn : item.name)}</h3><p>${FM.html(item.code)} · 小组 ${FM.html(item.group || "—")}</p></span>
              </button>
              <div class="rating-bars">${rating("进攻", item.attack)}${rating("中场", item.midfield)}${rating("防守", item.defense)}</div>
              <p>核心球员：${playerText(item.players, 2)}</p>
              <p>近期状态：${(item.form || []).length ? item.form.map(FM.html).join(" · ") : "近期数据待更新"}</p>
              <div class="tag-row"><span class="tag">${FM.html(item.strength)}</span><span class="tag">${FM.html(item.risk)}</span></div>
            </article>
          `;
        }).join("") : `<div class="empty-state">没有找到相关球队。</div>`;
      }
    }
    renderFavorites();
  }

  function renderFavorites() {
    const codes = Array.from(state.favorites).filter((code) => FM.store().teams.some((item) => item.code === code));
    const hint = FM.$("#favoriteHint");
    if (hint) hint.hidden = codes.length > 0;
    const root = FM.$("#favoriteTeams");
    if (root) root.innerHTML = codes.map((code) => `<button class="favorite-chip" type="button" data-open-team="${FM.html(code)}">${FM.teamLogo(code)} ${FM.html(FM.teamName(code))}</button>`).join("");
  }

  function openTeam(code, trigger) {
    const item = FM.team(code);
    const modal = FM.$("#teamModal");
    if (!modal) return;
    FM.$("#teamModalContent").innerHTML = `
      <p class="eyebrow">TEAM ${FM.html(item.code)}</p>
      <h2 id="teamModalTitle">${FM.teamLogo(item.code, item.logo)} ${FM.html(FM.state.language === "en" ? item.nameEn : item.name)}</h2>
      <div class="detail-grid">
        <article class="detail-card"><h3>攻中防评分</h3><p>进攻 ${FM.html(item.attack)} · 中场 ${FM.html(item.midfield)} · 防守 ${FM.html(item.defense)}</p></article>
        <article class="detail-card"><h3>核心球员</h3><p>${playerText(item.players, 12)}</p></article>
        <article class="detail-card"><h3>近期状态</h3><p>${(item.form || []).length ? item.form.map(FM.html).join(" · ") : "近期数据待更新"}</p></article>
        <article class="detail-card"><h3>风险标签</h3><p>${FM.html(item.risk)}</p></article>
      </div>
    `;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    FM.$(".modal-panel", modal)?.focus();
    FM.state.lastFocus = trigger;
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
  window.addEventListener("fm:data-ready", renderTeams);
  window.addEventListener("fm:data-updated", renderTeams);
  window.addEventListener("fm:language", renderTeams);
})();
