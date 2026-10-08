(function dataServiceFactory() {
  "use strict";

  const ESPN_BASE = "https://site.web.api.espn.com/apis/site/v2/sports/soccer";
  const WORLD_CUP_URL = "data/live.json";
  const WORLD_CUP_REMOTE_URL = "https://raw.githubusercontent.com/xiaozhangzzza-afk/worldcast-26/main/data/live.json";
  const WORLD_CUP_SNAPSHOT_URL = "assets/data/snapshot.json";
  const LEAGUE_SNAPSHOT_URL = "assets/data/leagues-snapshot.json";
  const FULL_REFRESH_INTERVAL = 5 * 60 * 1000;
  const LIVE_REFRESH_INTERVAL = 20 * 1000;
  const LAST_GOOD_KEY = "football-model-last-good-v500";
  const Normalizer = window.FM_NORMALIZER;
  const LeagueNormalizer = window.FM_LEAGUE_NORMALIZER;

  const COMPETITIONS = window.FM_COMPETITIONS;
  const LEAGUES = COMPETITIONS.filter((item) => !item.compact);

  const STORE = window.FM_STORE = window.FM_STORE || {};
  Object.assign(STORE, {
    status: STORE.status || "idle",
    source: STORE.source || null,
    sourceLabel: STORE.sourceLabel || "",
    lastUpdated: STORE.lastUpdated || null,
    liveUpdatedAt: STORE.liveUpdatedAt || null,
    lastLiveAttempt: STORE.lastLiveAttempt || null,
    matches: Array.isArray(STORE.matches) ? STORE.matches : [],
    teams: Array.isArray(STORE.teams) ? STORE.teams : [],
    competitions: COMPETITIONS,
    predictions: STORE.predictions && typeof STORE.predictions === "object" ? STORE.predictions : {},
    errors: Array.isArray(STORE.errors) ? STORE.errors : [],
    isSnapshot: Boolean(STORE.isSnapshot),
    liveConnected: false
  });
  STORE.freshness = STORE.freshness || {};

  let syncing = false;
  let liveSyncing = false;
  let readySent = false;
  let activeDetailId = "";

  function detail() {
    return {
      status: STORE.status, source: STORE.source, sourceLabel: STORE.sourceLabel,
      lastUpdated: STORE.lastUpdated, liveUpdatedAt: STORE.liveUpdatedAt,
      lastLiveAttempt: STORE.lastLiveAttempt, matches: STORE.matches, teams: STORE.teams,
      competitions: STORE.competitions, predictions: STORE.predictions, errors: STORE.errors,
      isSnapshot: STORE.isSnapshot, liveConnected: STORE.liveConnected, freshness: STORE.freshness
    };
  }

  function emit(name) {
    window.dispatchEvent(new CustomEvent(name, { detail: detail() }));
  }

  function markReady() {
    emit(readySent ? "fm:data-updated" : "fm:data-ready");
    readySent = true;
  }

  function markLoading() {
    STORE.status = "loading";
    STORE.errors = [];
    emit("fm:data-loading");
  }

  async function fetchJson(url, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const separator = url.includes("?") ? "&" : "?";
      const response = await fetch(`${url}${separator}_fm=${Date.now()}`, {
        cache: "no-store",
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const data = await response.json();
      if (!data || typeof data !== "object") throw new Error("返回内容不是有效 JSON");
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  function monthRange(daysBefore, daysAfter) {
    const start = new Date(Date.now() - daysBefore * 86400000);
    const end = new Date(Date.now() + daysAfter * 86400000);
    const months = [];
    for (let date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)); date <= end; date.setUTCMonth(date.getUTCMonth() + 1)) {
      months.push(date.toISOString().slice(0, 7).replace("-", ""));
    }
    return months;
  }

  function scoreboardUrl(meta, month) {
    return `${ESPN_BASE}/${meta.id}/scoreboard?dates=${month}&limit=1000`;
  }

  function uniqueBy(items, key) {
    return [...new Map(items.filter(Boolean).map((item) => [item[key], item])).values()];
  }

  function decorateWorldCup(data) {
    const normalized = Normalizer.normalizePayload(data);
    const competition = COMPETITIONS.find((item) => item.id === "fifa.world");
    return {
      matches: normalized.matches.map((item) => ({
        ...item, competitionId: "fifa.world",
        competitionNameZh: competition.nameZh, competitionNameEn: competition.nameEn
      })),
      teams: normalized.teams.map((item) => ({
        ...item, shortCode: item.shortCode || item.code,
        competitionId: "fifa.world", competitionName: competition.nameZh
      })),
      updatedAt: normalized.updatedAt
    };
  }

  function hydratePredictions() {
    STORE.predictions = Object.fromEntries(STORE.matches.flatMap((match) => {
      const prediction = window.FM_PREDICTION_SERVICE?.fromMatch(match);
      return prediction ? [[match.id, prediction]] : [];
    }));
  }

  function saveLastGood() {
    try {
      localStorage.setItem(LAST_GOOD_KEY, JSON.stringify({
        savedAt: new Date().toISOString(),
        matches: STORE.matches.filter((item) => item.competitionId !== "fifa.world"),
        teams: STORE.teams.filter((item) => item.competitionId !== "fifa.world")
      }));
    } catch {}
  }

  function readLastGood() {
    try {
      const value = JSON.parse(localStorage.getItem(LAST_GOOD_KEY) || "null");
      return value && Array.isArray(value.matches) && value.matches.length ? value : null;
    } catch {
      return null;
    }
  }

  function applyCombined(leagueParts, worldCup, options = {}) {
    const leagueMatches = leagueParts.flatMap((item) => item.matches || []);
    const leagueTeams = leagueParts.flatMap((item) => item.teams || []);
    STORE.matches = uniqueBy([...leagueMatches, ...(worldCup?.matches || [])], "id")
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    STORE.teams = uniqueBy([...leagueTeams, ...(worldCup?.teams || [])], "code");
    STORE.lastUpdated = options.lastUpdated || new Date().toISOString();
    STORE.source = options.source || "multi-league-live";
    STORE.status = options.snapshot ? "snapshot" : "ready";
    STORE.isSnapshot = Boolean(options.snapshot);
    STORE.liveConnected = Boolean(options.liveConnected);
    const leagueCount = new Set(leagueMatches.map((item) => item.competitionId)).size;
    STORE.sourceLabel = options.snapshot
      ? "实时源暂不可用 · 正在展示最近数据"
      : `实时连接正常 · ${leagueCount}项赛事 · 20秒核验`;
    hydratePredictions();
  }

  async function loadWorldCup() {
    try {
      return decorateWorldCup(await fetchJson(WORLD_CUP_URL));
    } catch (localError) {
      try {
        const remote = decorateWorldCup(await fetchJson(WORLD_CUP_REMOTE_URL));
        return { ...remote, snapshot: true, error: `世界杯本站数据：${localError.message}` };
      } catch (remoteError) {
        try {
          const snapshot = decorateWorldCup(await fetchJson(WORLD_CUP_SNAPSHOT_URL));
          return { ...snapshot, snapshot: true, error: `世界杯本站数据：${localError.message}；远程源：${remoteError.message}` };
        } catch (snapshotError) {
          return { matches: [], teams: [], error: `世界杯本站数据：${localError.message}；远程源：${remoteError.message}；快照：${snapshotError.message}` };
        }
      }
    }
  }

  async function fetchLeague(meta, months) {
    const results = await Promise.allSettled(months.map(month => fetchJson(scoreboardUrl(meta, month))));
    const feeds = results.filter(item => item.status === "fulfilled").map(item => LeagueNormalizer.normalizeFeed(item.value, meta));
    if (!feeds.length) throw new Error(`按月赛程请求失败：${results[0]?.reason?.message || "数据源未响应"}`);
    return {
      matches: uniqueBy(feeds.flatMap(item => item.matches), "id"),
      teams: uniqueBy(feeds.flatMap(item => item.teams), "code"),
      partialMonths: feeds.length !== months.length,
      checkedAt: new Date().toISOString(),
      sourceUpdatedAt: results.filter(r=>r.status==='fulfilled').flatMap(r=>[r.value.lastUpdated,r.value.updatedAt,...(r.value.events||[]).map(e=>e.lastUpdated)]).filter(t=>t&&Number.isFinite(new Date(t).getTime())).sort((a,b)=>new Date(b)-new Date(a))[0]||null
    };
  }

  function recordChecks(results){
    results.forEach((r,i)=>{const id=LEAGUES[i].id,old=STORE.freshness[id]||{};
      STORE.freshness[id]=r.status==='fulfilled'?{...old,checkedAt:r.value.checkedAt,lastSuccessAt:r.value.checkedAt,sourceUpdatedAt:r.value.sourceUpdatedAt,mode:r.value.partialMonths?'partial':'live',error:null}:{...old,checkedAt:new Date().toISOString(),mode:'snapshot',error:r.reason?.message||'Request failed'};
    });
  }

  async function loadLeagueSnapshot() {
    const recent = readLastGood();
    try {
      const data = await fetchJson(LEAGUE_SNAPSHOT_URL);
      if (!Array.isArray(data.matches) || !data.matches.length) throw new Error("快照为空");
      const published = { matches: data.matches.map(item => ({...item, halfFull: ""})), teams: data.teams || [], savedAt: data.savedAt || data.updatedAt };
      return recent && new Date(recent.savedAt).getTime() > new Date(published.savedAt).getTime() ? recent : published;
    } catch {
      return recent;
    }
  }

  async function loadData(manual = false) {
    if (syncing) return STORE;
    syncing = true;
    const before=new Map(STORE.matches.map(m=>[String(m.id),JSON.stringify([m.date,m.status,m.homeScore,m.awayScore])]));
    markLoading();
    STORE.lastLiveAttempt = new Date().toISOString();
    const worldCupPromise = loadWorldCup();
    try {
      const results = await Promise.allSettled(LEAGUES.map((meta) => fetchLeague(meta, monthRange(8, 24))));
      recordChecks(results);
      const leagueParts = results.filter((item) => item.status === "fulfilled").map((item) => item.value);
      const leagueErrors = results.flatMap((item, index) => item.status === "rejected" ? [`${LEAGUES[index].shortZh}：${item.reason?.message || "读取失败"}`] : []);
      const worldCup = await worldCupPromise;
      STORE.freshness['fifa.world']={checkedAt:new Date().toISOString(),sourceUpdatedAt:worldCup.updatedAt||null,mode:'archive'};
      if (leagueParts.length) {
        const partialMonths = leagueParts.some(item => item.partialMonths);
        if (partialMonths) {
          const snapshot = await loadLeagueSnapshot();
          if (snapshot) leagueParts.unshift(snapshot);
        }
        if (leagueErrors.length) {
          const fallback = await loadLeagueSnapshot();
          const missing = LEAGUES.filter((_, i) => results[i].status === "rejected").map(item => item.id);
          leagueParts.push({matches: (fallback?.matches || STORE.matches).filter(item => missing.includes(item.competitionId)), teams: (fallback?.teams || STORE.teams).filter(item => missing.includes(item.competitionId))});
        }
        STORE.liveUpdatedAt = new Date().toISOString();
        applyCombined(leagueParts, worldCup, {
          liveConnected: true,
          source: !leagueErrors.length&&!partialMonths ? "multi-league-live" : "multi-league-partial"
        });
        STORE.errors = [...leagueErrors, ...(worldCup.error ? [worldCup.error] : [])];
        if (leagueErrors.length) STORE.sourceLabel = `部分实时连接 · ${LEAGUES.length - leagueErrors.length}/${LEAGUES.length}项赛事在线 · 其余保留快照`;
        else if (partialMonths) STORE.sourceLabel = "部分月份已核验 · 缺失赛程使用最近快照";
        saveLastGood();
        markReady();
        if (manual) {const changed=STORE.matches.filter(m=>before.get(String(m.id))!==JSON.stringify([m.date,m.status,m.homeScore,m.awayScore])).length;window.FM?.showToast?.(`核验完成 · ${changed?changed+'场赛程/赛况有变化':'赛程与赛况无变化'} · ${leagueErrors.length?'部分数据源不可用':LEAGUES.length+'项赛事已响应'}`);}
      } else {
        const fallback = await loadLeagueSnapshot();
        LEAGUES.forEach(meta=>{STORE.freshness[meta.id]={...STORE.freshness[meta.id],snapshotRecordedAt:fallback?.savedAt||null};});
        if (!fallback?.matches?.length && !worldCup.matches.length) throw new Error("实时源与本地快照均不可用");
        applyCombined(fallback ? [{ matches: fallback.matches, teams: fallback.teams || [] }] : [], worldCup, {
          snapshot: true, source: "snapshot", lastUpdated: fallback?.savedAt || worldCup.updatedAt || null
        });
        STORE.errors = [...leagueErrors, ...(worldCup.error ? [worldCup.error] : [])];
        markReady();
        if (manual) window.FM?.showToast?.("实时源暂不可用，已切换到最近快照");
      }
    } catch (error) {
      STORE.status = "error";
      STORE.source = "unavailable";
      STORE.sourceLabel = "数据暂不可用";
      STORE.matches = [];
      STORE.teams = [];
      STORE.predictions = {};
      STORE.liveConnected = false;
      STORE.errors = [error.message];
      emit("fm:data-error");
      if (manual) window.FM?.showToast?.("同步失败，请检查网络后重试");
    } finally {
      syncing = false;
    }
    return STORE;
  }

  function mergeMatch(incoming) {
    const index = STORE.matches.findIndex((item) => String(item.id) === String(incoming.id));
    if (index < 0) {
      STORE.matches.push(incoming);
      return;
    }
    const current = STORE.matches[index];
    STORE.matches[index] = {
      ...current, ...incoming,
      homeLogo: incoming.homeLogo || current.homeLogo,
      awayLogo: incoming.awayLogo || current.awayLogo,
      homeName: incoming.homeName || current.homeName,
      awayName: incoming.awayName || current.awayName,
      venue: incoming.venue && incoming.venue !== "场地待官方确认" ? incoming.venue : current.venue,
      predictedScore: incoming.predictedScore || current.predictedScore,
      alternativeScore: incoming.alternativeScore || current.alternativeScore,
      probabilities: incoming.probabilities || current.probabilities,
      confidence: incoming.confidence ?? current.confidence,
      factors: incoming.factors?.length ? incoming.factors : current.factors,
      halfFull: incoming.halfFull || current.halfFull,
      timeline: incoming.timeline?.length ? incoming.timeline : current.timeline
    };
  }

  async function loadMatchDetails(matchId, notify = true) {
    const match = STORE.matches.find((item) => String(item.id) === String(matchId));
    if (!match || match.competitionId === "fifa.world") return match || null;
    try {
      const summary = await fetchJson(`${ESPN_BASE}/${match.competitionId}/summary?event=${encodeURIComponent(match.id)}`, 10000);
      const competition = summary?.header?.competitions?.[0] || {};
      const meta = COMPETITIONS.find((item) => item.id === match.competitionId);
      const normalized = LeagueNormalizer.normalizeEvent({
        id: match.id,
        date: competition.date || match.date,
        season:{slug:match.stageSlug},
        status: competition.status,
        competitions: [{ ...competition, details: summary?.keyEvents || competition.details || [] }]
      }, meta);
      if (normalized) {
        mergeMatch(normalized);
        STORE.liveUpdatedAt = new Date().toISOString();
        if (notify) markReady();
      }
      return STORE.matches.find((item) => String(item.id) === String(matchId)) || match;
    } catch (error) {
      STORE.errors = [...new Set([...STORE.errors, `比赛详情：${error.message}`])];
      return match;
    }
  }

  async function refreshLiveScores(manual = false) {
    if (liveSyncing || syncing) return false;
    liveSyncing = true;
    STORE.lastLiveAttempt = new Date().toISOString();
    try {
      const results = await Promise.allSettled(LEAGUES.map((meta) => fetchLeague(meta, monthRange(0, 0))));
      recordChecks(results);
      const successful = results.filter((item) => item.status === "fulfilled").map((item) => item.value);
      if (!successful.length) throw new Error("俱乐部赛事实时接口均未响应");
      successful.flatMap((item) => item.matches).forEach(mergeMatch);
      STORE.teams = uniqueBy([...STORE.teams, ...successful.flatMap((item) => item.teams)], "code");
      STORE.liveUpdatedAt = new Date().toISOString();
      STORE.lastUpdated = STORE.liveUpdatedAt;
      STORE.liveConnected = true;
      STORE.isSnapshot = false;
      STORE.status = "ready";
      STORE.source = "multi-league-live";
      const liveCount = STORE.matches.filter((item) => item.live).length;
      STORE.sourceLabel = liveCount ? `实时同步中 · ${liveCount}场进行中 · 20秒轮询` : "实时连接正常 · 当前无进行中比赛";
      STORE.errors = results.flatMap((item, index) => item.status === "rejected" ? [`${LEAGUES[index].shortZh}：${item.reason?.message || "读取失败"}`] : []);
      if (successful.length < LEAGUES.length) STORE.sourceLabel = `部分实时连接 · ${successful.length}/${LEAGUES.length}项赛事在线 · 其余保留最近数据`;
      else if (successful.some(item => item.dailyFallback)) STORE.sourceLabel = "近三日实时核验 · 远期赛程使用最近快照";
      hydratePredictions();
      if (activeDetailId) await loadMatchDetails(activeDetailId, false);
      markReady();
      if (manual) window.FM?.showToast?.(`实时比分已核对 · ${new Date().toLocaleTimeString("zh-CN", { hour12: false })}`);
      return true;
    } catch (error) {
      STORE.liveConnected = false;
      STORE.errors = [...new Set([...STORE.errors, `实时比分：${error.message}`])];
      STORE.sourceLabel = "实时连接中断 · 页面保留最近数据";
      emit("fm:data-updated");
      if (manual) window.FM?.showToast?.("实时比分连接失败，已保留最近数据");
      return false;
    } finally {
      liveSyncing = false;
    }
  }

  function setActiveDetail(matchId) {
    activeDetailId = String(matchId || "");
  }

  window.FM_DATA_SERVICE = {
    ESPN_BASE, WORLD_CUP_URL, WORLD_CUP_REMOTE_URL, WORLD_CUP_SNAPSHOT_URL, LEAGUE_SNAPSHOT_URL,
    COMPETITIONS, fetchJson, loadData, refreshLiveScores, loadMatchDetails, setActiveDetail
  };

  document.addEventListener("DOMContentLoaded", () => {
    loadData(false);
    setInterval(() => { if (!document.hidden) loadData(false); }, FULL_REFRESH_INTERVAL);
    setInterval(() => { if (!document.hidden) refreshLiveScores(false); }, LIVE_REFRESH_INTERVAL);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && Date.now() - new Date(STORE.liveUpdatedAt || 0).getTime() > LIVE_REFRESH_INTERVAL) refreshLiveScores(false);
    });
    window.addEventListener("online", () => loadData(false));
  }, { once: true });
})();
