(() => {
  "use strict";

  const LIVE_DATA_URL = "https://raw.githubusercontent.com/xiaozhangzzza-afk/worldcast-26/main/data/live.json";
  const SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
  const SNAPSHOT_URL = "assets/data/snapshot.json";
  const REFRESH_INTERVAL = 5 * 60 * 1000;
  const SCOREBOARD_INTERVAL = 30 * 1000;
  const Normalizer = window.FM_NORMALIZER;

  const STORE = window.FM_STORE = window.FM_STORE || {
    status: "idle",
    source: null,
    sourceLabel: "",
    lastUpdated: null,
    matches: [],
    teams: [],
    predictions: {},
    errors: [],
    isSnapshot: false
  };
  // Migrate the shape left by V4.0 without losing the current page state.
  STORE.status = STORE.status || (STORE.loading ? "loading" : "idle");
  STORE.errors = Array.isArray(STORE.errors) ? STORE.errors : [];
  STORE.predictions = STORE.predictions && typeof STORE.predictions === "object" ? STORE.predictions : {};

  let syncing = false;
  let readySent = false;

  function detail() {
    return {
      status: STORE.status,
      source: STORE.source,
      sourceLabel: STORE.sourceLabel,
      lastUpdated: STORE.lastUpdated,
      matches: STORE.matches,
      teams: STORE.teams,
      predictions: STORE.predictions,
      errors: STORE.errors,
      isSnapshot: STORE.isSnapshot
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

  function fetchJson(url, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { cache: "no-store", signal: controller.signal, headers: { Accept: "application/json" } })
      .then((response) => {
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return response.json();
      })
      .finally(() => clearTimeout(timer));
  }

  function indexData(data, source = "remote", isSnapshot = false) {
    const normalized = Normalizer.normalizePayload(data);
    if (!normalized.matches.length || !normalized.teams.length) throw new Error("数据结构缺少有效比赛或球队");
    STORE.matches = normalized.matches;
    STORE.teams = normalized.teams;
    STORE.lastUpdated = normalized.updatedAt;
    STORE.source = source;
    STORE.sourceLabel = isSnapshot ? "正在展示最近一次可用数据快照" : "赛程数据已更新";
    STORE.status = isSnapshot ? "snapshot" : "ready";
    STORE.isSnapshot = isSnapshot;
    STORE.errors = [];
    STORE.predictions = Object.fromEntries(STORE.matches.flatMap((match) => {
      const prediction = window.FM_PREDICTION_SERVICE?.fromMatch(match);
      return prediction ? [[match.id, prediction]] : [];
    }));
  }

  function mergeEvent(match, event) {
    if (!event || !match) return match;
    const competition = event.competitions?.[0] || {};
    const home = competition.competitors?.find((item) => item.homeAway === "home") || {};
    const away = competition.competitors?.find((item) => item.homeAway === "away") || {};
    const state = event.status?.type?.state;
    const completed = Boolean(event.status?.type?.completed);
    const live = !completed && state === "in";
    const homeScore = Normalizer.finite(home.score?.value ?? home.score);
    const awayScore = Normalizer.finite(away.score?.value ?? away.score);
    const officialScore = (completed || live) && homeScore !== null && awayScore !== null;
    return {
      ...match,
      completed,
      live,
      homeScore: officialScore ? homeScore : match.homeScore,
      awayScore: officialScore ? awayScore : match.awayScore,
      statusText: event.status?.type?.description || match.statusText,
      statusTextZh: event.status?.type?.description || match.statusTextZh,
      statusTextEn: event.status?.type?.description || match.statusTextEn,
      displayClock: event.status?.displayClock || match.displayClock,
      clockSeconds: Normalizer.finite(event.status?.clock) ?? match.clockSeconds
    };
  }

  function compactDay(date) {
    return date.toISOString().slice(0, 10).replaceAll("-", "");
  }

  async function mergeDirectScoreboard() {
    if (!STORE.matches.length) return false;
    try {
      const start = compactDay(new Date(Date.now() - 86400000));
      const end = compactDay(new Date(Date.now() + 86400000));
      const feed = await fetchJson(`${SCOREBOARD_URL}?dates=${start}-${end}&limit=100`);
      const byId = new Map((feed.events || []).map((event) => [String(event.id), event]));
      let merged = 0;
      STORE.matches = STORE.matches.map((match) => {
        const event = byId.get(String(match.id));
        if (!event) return match;
        merged += 1;
        return mergeEvent(match, event);
      });
      if (merged) {
        STORE.source = STORE.isSnapshot ? "snapshot" : "remote-with-scoreboard";
        STORE.sourceLabel = STORE.isSnapshot ? "正在展示最近一次可用数据快照" : "数据已更新 · 远程数据 + 比分状态";
        STORE.lastUpdated = new Date().toISOString();
        markReady();
      }
      return merged > 0;
    } catch (error) {
      STORE.errors = [...new Set([...STORE.errors, `比分状态源：${error.message}`])];
      console.warn("Optional scoreboard unavailable:", error.message);
      return false;
    }
  }

  async function loadSnapshot(remoteError) {
    const data = await fetchJson(SNAPSHOT_URL);
    indexData(data, "snapshot", true);
    STORE.errors = remoteError ? [`远程主数据：${remoteError.message}`] : [];
  }

  async function loadData(manual = false) {
    if (syncing) return STORE;
    syncing = true;
    markLoading();
    try {
      const data = await fetchJson(LIVE_DATA_URL);
      indexData(data, "remote", false);
      markReady();
      await mergeDirectScoreboard();
      if (manual) window.FM?.showToast?.("数据已更新 · 远程数据");
    } catch (remoteError) {
      try {
        await loadSnapshot(remoteError);
        markReady();
        if (manual) window.FM?.showToast?.("远程源暂不可用，已展示最近数据快照");
      } catch (snapshotError) {
        STORE.status = "error";
        STORE.source = "unavailable";
        STORE.sourceLabel = "数据暂不可用";
        STORE.lastUpdated = null;
        STORE.matches = [];
        STORE.teams = [];
        STORE.predictions = {};
        STORE.errors = [`远程主数据：${remoteError.message}`, `本地快照：${snapshotError.message}`];
        emit("fm:data-error");
        if (manual) window.FM?.showToast?.("数据暂时无法读取，请稍后刷新");
      }
    } finally {
      syncing = false;
    }
    return STORE;
  }

  window.FM_DATA_SERVICE = { LIVE_DATA_URL, SCOREBOARD_URL, SNAPSHOT_URL, fetchJson, indexData, loadData, mergeDirectScoreboard, mergeEvent };

  document.addEventListener("DOMContentLoaded", () => {
    loadData(false);
    setInterval(() => loadData(false), REFRESH_INTERVAL);
    setInterval(() => mergeDirectScoreboard(), SCOREBOARD_INTERVAL);
  }, { once: true });
})();
