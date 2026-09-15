(function dataServiceFactory() {
  "use strict";

  const ESPN_BASE = "https://site.web.api.espn.com/apis/site/v2/sports/soccer";
  const WORLD_CUP_URL = "https://raw.githubusercontent.com/xiaozhangzzza-afk/worldcast-26/main/data/live.json";
  const WORLD_CUP_SNAPSHOT_URL = "assets/data/snapshot.json";
  const LEAGUE_SNAPSHOT_URL = "assets/data/leagues-snapshot.json";
  const FULL_REFRESH_INTERVAL = 15 * 60 * 1000;
  const LIVE_REFRESH_INTERVAL = 20 * 1000;
  const LAST_GOOD_KEY = "football-model-last-good-v500";
  const Normalizer = window.FM_NORMALIZER;
  const LeagueNormalizer = window.FM_LEAGUE_NORMALIZER;

  const COMPETITIONS = [
    { id: "eng.1", nameZh: "英格兰足球超级联赛", shortZh: "英超", nameEn: "Premier League", region: "英格兰", icon: "🏴" },
    { id: "esp.1", nameZh: "西班牙足球甲级联赛", shortZh: "西甲", nameEn: "LaLiga", region: "西班牙", icon: "🇪🇸" },
    { id: "ger.1", nameZh: "德国足球甲级联赛", shortZh: "德甲", nameEn: "Bundesliga", region: "德国", icon: "🇩🇪" },
    { id: "ita.1", nameZh: "意大利足球甲级联赛", shortZh: "意甲", nameEn: "Serie A", region: "意大利", icon: "🇮🇹" },
    { id: "fra.1", nameZh: "法国足球甲级联赛", shortZh: "法甲", nameEn: "Ligue 1", region: "法国", icon: "🇫🇷" },
    { id: "fifa.world", nameZh: "国际足联世界杯", shortZh: "世界杯", nameEn: "FIFA World Cup", region: "国际", icon: "🌍", compact: true }
  ];
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
      isSnapshot: STORE.isSnapshot, liveConnected: STORE.liveConnected
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

  function compactDay(date) {
    return date.toISOString().slice(0, 10).replaceAll("-", "");
  }

  function dateRange(daysBefore, daysAfter) {
    return `${compactDay(new Date(Date.now() - daysBefore * 86400000))}-${compactDay(new Date(Date.now() + daysAfter * 86400000))}`;
  }

  function scoreboardUrl(meta, range) {
    return `${ESPN_BASE}/${meta.id}/scoreboard?dates=${range}&limit=1000`;
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
      : `实时连接正常 · ${leagueCount}个联赛 · 20秒轮询`;
    hydratePredictions();
  }

  async function loadWorldCup() {
    try {
      return decorateWorldCup(await fetchJson(WORLD_CUP_URL));
    } catch (remoteError) {
      try {
        const snapshot = decorateWorldCup(await fetchJson(WORLD_CUP_SNAPSHOT_URL));
        return { ...snapshot, snapshot: true, error: `世界杯远程源：${remoteError.message}` };
      } catch (snapshotError) {
        return { matches: [], teams: [], error: `世界杯数据：${remoteError.message}；快照：${snapshotError.message}` };
      }
    }
  }

  async function fetchLeague(meta, range) {
    return LeagueNormalizer.normalizeFeed(await fetchJson(scoreboardUrl(meta, range)), meta);
  }

  async function loadLeagueSnapshot() {
    try {
      const data = await fetchJson(LEAGUE_SNAPSHOT_URL);
      if (!Array.isArray(data.matches) || !data.matches.length) throw new Error("快照为空");
      return { matches: data.matches, teams: data.teams || [], savedAt: data.savedAt || data.updatedAt };
    } catch {
      return readLastGood();
    }
  }

  async function loadData(manual = false) {
    if (syncing) return STORE;
    syncing = true;
    markLoading();
    STORE.lastLiveAttempt = new Date().toISOString();
    const worldCupPromise = loadWorldCup();
    try {
      const results = await Promise.allSettled(LEAGUES.map((meta) => fetchLeague(meta, dateRange(8, 24))));
      const leagueParts = results.filter((item) => item.status === "fulfilled").map((item) => item.value);
      const leagueErrors = results.flatMap((item, index) => item.status === "rejected" ? [`${LEAGUES[index].shortZh}：${item.reason?.message || "读取失败"}`] : []);
      const worldCup = await worldCupPromise;
      if (leagueParts.length) {
        STORE.liveUpdatedAt = new Date().toISOString();
        applyCombined(leagueParts, worldCup, {
          liveConnected: true,
          source: leagueParts.length === LEAGUES.length ? "multi-league-live" : "multi-league-partial"
        });
        STORE.errors = [...leagueErrors, ...(worldCup.error ? [worldCup.error] : [])];
        saveLastGood();
        markReady();
        if (manual) window.FM?.showToast?.(`同步完成：${STORE.matches.filter((item) => item.competitionId !== "fifa.world").length}场五大联赛比赛`);
      } else {
        const fallback = await loadLeagueSnapshot();
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
      const results = await Promise.allSettled(LEAGUES.map((meta) => fetchLeague(meta, dateRange(1, 1))));
      const successful = results.filter((item) => item.status === "fulfilled").map((item) => item.value);
      if (!successful.length) throw new Error("五大联赛实时接口均未响应");
      successful.flatMap((item) => item.matches).forEach(mergeMatch);
      STORE.teams = uniqueBy([...successful.flatMap((item) => item.teams), ...STORE.teams], "code");
      STORE.liveUpdatedAt = new Date().toISOString();
      STORE.lastUpdated = STORE.liveUpdatedAt;
      STORE.liveConnected = true;
      STORE.isSnapshot = false;
      STORE.status = "ready";
      STORE.source = "multi-league-live";
      const liveCount = STORE.matches.filter((item) => item.live).length;
      STORE.sourceLabel = liveCount ? `实时同步中 · ${liveCount}场进行中 · 20秒轮询` : "实时连接正常 · 当前无进行中比赛";
      STORE.errors = results.flatMap((item, index) => item.status === "rejected" ? [`${LEAGUES[index].shortZh}：${item.reason?.message || "读取失败"}`] : []);
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
    ESPN_BASE, WORLD_CUP_URL, WORLD_CUP_SNAPSHOT_URL, LEAGUE_SNAPSHOT_URL,
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
