(() => {
  "use strict";

  const LIVE_DATA_URL = "https://raw.githubusercontent.com/xiaozhangzzza-afk/worldcast-26/main/data/live.json";
  const SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
  const SNAPSHOT_URL = "assets/data/snapshot.json";
  const REFRESH_INTERVAL = 5 * 60 * 1000;
  const SCOREBOARD_INTERVAL = 30 * 1000;

  const STORE = window.FM_STORE = window.FM_STORE || {
    matches: [],
    teams: [],
    lastUpdated: null,
    source: "",
    loading: true,
    error: null
  };

  let syncing = false;
  let readySent = false;

  function emit(name) {
    window.dispatchEvent(new CustomEvent(name, { detail: STORE }));
  }

  function markUpdated() {
    emit(readySent ? "fm:data-updated" : "fm:data-ready");
    readySent = true;
  }

  function cacheBusted(url) {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}t=${Date.now()}`;
  }

  async function fetchJson(url, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(cacheBusted(url), { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function normalizeProbabilities(input) {
    if (!Array.isArray(input) || input.length < 3) return null;
    const raw = input.slice(0, 3).map((value) => Number(value)).map((value) => Number.isFinite(value) && value >= 0 ? value : 0);
    const total = raw.reduce((sum, value) => sum + value, 0);
    if (!total) return null;
    const result = raw.map((value) => Math.round(value / total * 100));
    result[1] += 100 - result.reduce((sum, value) => sum + value, 0);
    return result;
  }

  function numberOrNull(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function scoreText(homeScore, awayScore) {
    return Number.isFinite(homeScore) && Number.isFinite(awayScore) ? `${homeScore}–${awayScore}` : "";
  }

  function isLiveStatus(fixture) {
    const raw = `${fixture.status || ""} ${fixture.statusText || ""}`.toLowerCase();
    return raw.includes("in_progress") || raw.includes("live") || raw.includes("halftime") || raw.includes("half time") || raw.includes("1st") || raw.includes("2nd");
  }

  function normalizeStageSlug(value = "") {
    const text = String(value).toLowerCase();
    if (["group", "group-stage", "groups"].includes(text) || text.includes("小组")) return "group";
    if (["round-of-32", "r32", "32"].includes(text) || text.includes("32")) return "r32";
    if (["round-of-16", "r16", "16"].includes(text) || text.includes("16")) return "r16";
    if (["quarterfinal", "quarter-final", "qf"].includes(text) || text.includes("quarter") || text.includes("1/4") || text.includes("四分")) return "qf";
    if (["semifinal", "semi-final", "sf"].includes(text) || text.includes("semi") || text.includes("半决")) return "sf";
    if (["final"].includes(text) || text.includes("决赛")) return "final";
    return text || "other";
  }

  function stageLabel(slug, original) {
    const zh = { group: "小组赛", r32: "32强", r16: "16强", qf: "1/4决赛", sf: "半决赛", final: "决赛" };
    return original || zh[slug] || "赛程";
  }

  function teamArray(rawTeams) {
    if (Array.isArray(rawTeams)) return rawTeams;
    if (rawTeams && typeof rawTeams === "object") return Object.values(rawTeams);
    return [];
  }

  function normalizePlayer(player) {
    if (typeof player === "string") return player;
    const zh = player?.nameZh || player?.zh || "";
    const en = player?.name || player?.shortName || "";
    const position = player?.position ? ` · ${player.position}` : "";
    const number = player?.number ? ` #${player.number}` : "";
    return `${zh || en}${en && zh ? `（${en}）` : ""}${number}${position}`.trim();
  }

  function formFromRecent(recent = []) {
    if (!Array.isArray(recent)) return [];
    return recent.slice(0, 5).map((item) => item.result || item.outcome || item.score || "").filter(Boolean);
  }

  function stableRating(seed, base) {
    const text = String(seed || "");
    const offset = Array.from(text).reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 10;
    return Math.min(95, Math.max(60, base + offset));
  }

  function normalizeTeam(team, key = "") {
    const code = String(team.code || team.abbreviation || key || "").toUpperCase();
    const players = Array.isArray(team.players) ? team.players.map(normalizePlayer).filter(Boolean) : [];
    return {
      code,
      name: team.name || team.zh || code,
      nameEn: team.nameEn || team.en || team.displayName || team.name || code,
      logo: team.logo || team.flag || "",
      group: team.group || "—",
      ranking: numberOrNull(team.ranking ?? team.rank),
      attack: numberOrNull(team.attack) ?? stableRating(code, 72),
      midfield: numberOrNull(team.midfield) ?? stableRating(`${code}-m`, 70),
      defense: numberOrNull(team.defense) ?? stableRating(`${code}-d`, 69),
      form: Array.isArray(team.form) ? team.form : formFromRecent(team.recent),
      players,
      strength: team.strength || "公开数据档案",
      risk: team.risk || (Array.isArray(team.injuries) && team.injuries.length ? "存在伤停记录" : "临场名单待官方确认"),
      raw: team
    };
  }

  function normalizeMatch(fixture, teamsByCode) {
    const homeCode = String(fixture.homeCode || fixture.home || fixture.homeTeam?.abbreviation || "").toUpperCase();
    const awayCode = String(fixture.awayCode || fixture.away || fixture.awayTeam?.abbreviation || "").toUpperCase();
    const homeTeam = teamsByCode.get(homeCode);
    const awayTeam = teamsByCode.get(awayCode);
    const homeScore = numberOrNull(fixture.homeScore);
    const awayScore = numberOrNull(fixture.awayScore);
    const completed = Boolean(fixture.completed || String(fixture.status || "").includes("FULL_TIME"));
    const live = !completed && isLiveStatus(fixture);
    const probabilities = normalizeProbabilities(fixture.probabilities);
    const confidence = numberOrNull(fixture.confidence) ?? (probabilities ? Math.max(...probabilities) : null);
    const stageSlug = normalizeStageSlug(fixture.stageSlug || fixture.stage);
    const actualScore = scoreText(homeScore, awayScore);
    const sourceScore = fixture.predictedScore || fixture.score || "";
    const predictedScore = completed || live ? (actualScore || sourceScore) : (sourceScore || "预测数据待更新");
    const alternativeScore = fixture.alternativeScore || fixture.altScore || (completed || live ? "" : "预测数据待更新");
    const stage = stageLabel(stageSlug, fixture.stage);

    return {
      id: String(fixture.id || fixture.matchNo || `${homeCode}-${awayCode}-${fixture.date || ""}`),
      matchNo: fixture.matchNo || "",
      stage,
      stageSlug,
      group: fixture.group || "",
      date: fixture.date || "",
      homeCode,
      awayCode,
      homeName: fixture.homeName || homeTeam?.name || homeCode || "待定",
      awayName: fixture.awayName || awayTeam?.name || awayCode || "待定",
      homeLogo: fixture.homeLogo || homeTeam?.logo || "",
      awayLogo: fixture.awayLogo || awayTeam?.logo || "",
      venue: fixture.venue || fixture.city || "待官方确认",
      completed,
      live,
      homeScore,
      awayScore,
      predictedScore,
      alternativeScore,
      probabilities,
      confidence,
      statusText: fixture.statusText || fixture.status || (completed ? "完赛" : live ? "进行中" : "未开赛"),
      displayClock: fixture.displayClock || "",
      factors: Array.isArray(fixture.factors) && fixture.factors.length ? fixture.factors : ["球队强度", "近期状态", "赛程环境"],
      halfFull: fixture.halfFull || (completed ? "赛果待核验" : "预测数据待更新"),
      timeline: Array.isArray(fixture.timeline) ? fixture.timeline : [],
      raw: fixture,

      // Backward-compatible aliases for the V4 page layer.
      home: homeCode,
      away: awayCode,
      score: predictedScore,
      altScore: alternativeScore,
      probs: probabilities,
      stageZh: stage,
      stageEn: stage
    };
  }

  function indexData(data, source = "live") {
    const teams = teamArray(data.teams).map((team, index) => normalizeTeam(team, team.code || index));
    const teamsByCode = new Map(teams.map((team) => [team.code, team]));
    const matches = (data.fixtures || data.matches || []).map((fixture) => normalizeMatch(fixture, teamsByCode));

    STORE.matches = matches.filter((match) => match.date && match.homeCode && match.awayCode);
    STORE.teams = teams.filter((team) => team.code);
    STORE.lastUpdated = data.updatedAt || data.lastUpdated || new Date().toISOString();
    STORE.source = source;
    STORE.loading = false;
    STORE.error = null;
    STORE.raw = data;
  }

  function compactDay(date) {
    return date.toISOString().slice(0, 10).replaceAll("-", "");
  }

  function mergeEvent(match, event) {
    if (!event) return match;
    const competition = event.competitions?.[0] || {};
    const home = competition.competitors?.find((item) => item.homeAway === "home") || {};
    const away = competition.competitors?.find((item) => item.homeAway === "away") || {};
    const completed = Boolean(event.status?.type?.completed);
    const live = event.status?.type?.state === "in";
    const homeScore = numberOrNull(home.score?.value ?? home.score) ?? match.homeScore;
    const awayScore = numberOrNull(away.score?.value ?? away.score) ?? match.awayScore;
    const currentScore = scoreText(homeScore, awayScore);

    return {
      ...match,
      completed,
      live,
      homeScore,
      awayScore,
      predictedScore: completed || live ? currentScore : match.predictedScore,
      score: completed || live ? currentScore : match.score,
      statusText: event.status?.type?.description || match.statusText,
      displayClock: event.status?.displayClock || match.displayClock,
      clockSeconds: numberOrNull(event.status?.clock) ?? match.clockSeconds,
      clockSnapshotAt: new Date().toISOString()
    };
  }

  async function mergeDirectScoreboard() {
    if (!STORE.matches.length) return;
    try {
      const start = compactDay(new Date(Date.now() - 86400000));
      const end = compactDay(new Date(Date.now() + 86400000));
      const feed = await fetchJson(`${SCOREBOARD_URL}?dates=${start}-${end}&limit=100`);
      const byId = new Map((feed.events || []).map((event) => [String(event.id), event]));
      STORE.matches = STORE.matches.map((match) => mergeEvent(match, byId.get(String(match.id))));
      STORE.lastUpdated = new Date().toISOString();
      if (STORE.source && !STORE.source.includes("ESPN")) STORE.source = `${STORE.source}+ESPN`;
      markUpdated();
    } catch (error) {
      console.warn("Direct scoreboard unavailable:", error.message);
    }
  }

  async function loadSnapshot(remoteError) {
    const data = await fetchJson(SNAPSHOT_URL);
    indexData(data, "最近快照");
    STORE.error = remoteError ? `实时源暂不可用：${remoteError.message}` : null;
  }

  async function loadData(manual = false) {
    if (syncing) return;
    syncing = true;
    STORE.loading = true;
    STORE.error = null;
    emit("fm:data-updated");
    try {
      const data = await fetchJson(LIVE_DATA_URL);
      indexData(data, "live.json");
      markUpdated();
      await mergeDirectScoreboard();
      if (manual) window.FM?.showToast?.("实时数据同步成功");
    } catch (remoteError) {
      console.warn("Live data refresh failed:", remoteError.message);
      try {
        await loadSnapshot(remoteError);
        markUpdated();
        await mergeDirectScoreboard();
        if (manual) window.FM?.showToast?.("实时源暂不可用，已显示最近快照");
      } catch (snapshotError) {
        STORE.matches = [];
        STORE.teams = [];
        STORE.loading = false;
        STORE.error = `数据加载失败：${snapshotError.message}`;
        STORE.source = "error";
        STORE.lastUpdated = new Date().toISOString();
        markUpdated();
        if (manual) window.FM?.showToast?.("数据加载失败，请稍后重试");
      }
    } finally {
      syncing = false;
    }
  }

  window.FM_DATA_SERVICE = {
    LIVE_DATA_URL,
    SCOREBOARD_URL,
    SNAPSHOT_URL,
    fetchJson,
    indexData,
    loadData,
    mergeDirectScoreboard,
    mergeEvent,
    normalizeProbabilities
  };

  document.addEventListener("DOMContentLoaded", () => {
    loadData(false);
    setInterval(() => loadData(false), REFRESH_INTERVAL);
    setInterval(() => mergeDirectScoreboard(), SCOREBOARD_INTERVAL);
  });
})();
