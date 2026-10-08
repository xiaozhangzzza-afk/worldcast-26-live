(() => {
  "use strict";

  const state = { competition: new URLSearchParams(location.search).get("competition") || "top5", stage: "all", status: "upcoming", query: "", view:'schedule' };

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
      const competitionOk = FM.inCompetition(item,state.competition);
      const stageOk = state.stage === "all" || (state.stage==='knockout'?!['league-phase','group-stage'].includes(item.stageSlug):item.stageSlug === state.stage);
      const statusOk = state.status === "all" || (state.status === "live" ? item.live : state.status === "completed" ? item.completed : !item.live && !item.completed && new Date(item.date).getTime() >= Date.now());
      return statusOk && competitionOk && stageOk && (!query || haystack(item).includes(query));
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  function renderSchedule() {
    const root = FM.$("#scheduleGrid");
    if (!root) return;
    const isWorldCup = state.competition === "fifa.world";
    const isEurope=state.competition==='europe'||FM.store().competitions.find(c=>c.id===state.competition)?.category==='europe';
    const tableView=!isWorldCup&&(!isEurope||state.view==='standings');
    const view=FM.$('#scheduleView');if(view)view.hidden=!isEurope;
    for (const selector of ["#stageFilter", "#scheduleStatus"]) { const el=FM.$(selector);if(el)el.hidden=tableView; }
    FM.$$('#stageFilter button').forEach(b=>{b.hidden=isEurope?['league','group-stage','round-of-32','third-place'].includes(b.dataset.stage):['league-phase','knockout'].includes(b.dataset.stage);});
    if (tableView) { window.FM_STANDINGS?.render(root,state.competition,state.query);return; }
    window.FM_STANDINGS?.render(root,"fifa.world",state.query);
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
    const groups = new Map();
    matches.forEach(item => {
      const day = new Intl.DateTimeFormat("zh-CN", {timeZone:"Asia/Shanghai",year:"numeric",month:"long",day:"numeric",weekday:"long"}).format(new Date(item.date));
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day).push(item);
    });
    root.innerHTML = matches.length ? [...groups].map(([day,items]) => `<section class="schedule-day"><h2>${FM.html(day)}</h2><div>${items.map(item => {
      const played = item.live || item.completed;
      const time = new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Shanghai",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(item.date));
      return `<article class="schedule-card"><div class="fixture-row"><div class="fixture-time"><time datetime="${FM.html(item.date)}">${time}</time><small>北京时间</small></div><div class="fixture-teams"><div class="fixture-team">${FM.teamLogo(item.homeCode,item.homeLogo)}<span>${FM.html(FM.nameFor(item, "home"))}</span><small>主队</small><b>${played ? FM.html(item.homeScore ?? "待确认") : ""}</b></div><div class="fixture-team">${FM.teamLogo(item.awayCode,item.awayLogo)}<span>${FM.html(FM.nameFor(item, "away"))}</span><small>客队</small><b>${played ? FM.html(item.awayScore ?? "待确认") : ""}</b></div></div><div class="fixture-state ${item.live ? "live" : ""}"><span>${FM.html(item.statusText || "未开赛")} ${item.live ? `<span data-live-clock="${FM.html(item.id)}">${FM.html(FM.liveClock(item))}</span>` : ""}</span><button class="fixture-link" type="button" data-open-match="${FM.html(item.id)}" aria-label="查看 ${FM.html(FM.nameFor(item, "home"))} 对 ${FM.html(FM.nameFor(item, "away"))} 详情">比赛详情 ↗</button></div></div><div class="fixture-bottom"><span>${FM.html(FM.competitionName(item))} · ${FM.html(FM.stageName(item))}</span><span>${FM.html(item.venue || "场地待确认")}</span></div></article>`;
    }).join("")}</div></section>`).join("") : '<div class="empty-state">当前筛选暂无比赛，可切换“全部”或其他赛事。</div>';
  }

  function bind() {
    const view=document.createElement('div');view.id='scheduleView';view.className='schedule-status';view.setAttribute('role','group');view.setAttribute('aria-label','欧战视图');view.innerHTML='<button type="button" class="active" data-view="schedule">比赛赛程</button><button type="button" data-view="standings">联赛阶段积分</button><button type="button" data-view="knockout">淘汰赛</button>';FM.$('#stageFilter').before(view);view.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(!b)return;state.view=b.dataset.view==='standings'?'standings':'schedule';state.stage=b.dataset.view==='knockout'?'knockout':'all';state.status='all';view.querySelectorAll('button').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});renderSchedule();});
    if(state.competition === "fifa.world") state.status="all";
    const filter=document.createElement("div"); filter.id="scheduleStatus"; filter.className="schedule-status"; filter.setAttribute("role","group"); filter.setAttribute("aria-label","比赛状态筛选");
    filter.innerHTML=[["upcoming","即将开赛"],["live","进行中"],["completed","已结束"],["all","全部"]].map(([key,label])=>`<button type="button" data-status="${key}" class="${state.status===key?"active":""}" aria-pressed="${state.status===key}">${label}</button>`).join("");
    FM.$("#scheduleSearch").closest("label").before(filter);
    filter.addEventListener("click",event=>{const button=event.target.closest("[data-status]");if(!button)return;state.status=button.dataset.status;filter.querySelectorAll("button").forEach(b=>{b.classList.toggle("active",b===button);b.setAttribute("aria-pressed",String(b===button));});renderSchedule();});
    renderSchedule();
    FM.$("#competitionFilter")?.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-competition]");
      if (!button) return;
      state.competition = button.dataset.competition;
      state.stage = "all";
      state.view = "schedule";
      view.querySelectorAll('button').forEach(b=>{b.classList.toggle('active',b.dataset.view==='schedule');b.setAttribute('aria-pressed',String(b.dataset.view==='schedule'));});
      state.status = state.competition === "fifa.world" ? "all" : "upcoming";
      FM.$$("#stageFilter button").forEach(b=>b.classList.toggle("active",b.dataset.stage==="all"));
      filter.querySelectorAll("button").forEach(b=>{b.classList.toggle("active",b.dataset.status===state.status);b.setAttribute("aria-pressed",String(b.dataset.status===state.status));});
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
