(() => {
  "use strict";

  const STAGES = {
    group: "group-stage",
    "group-stage": "group-stage",
    groups: "group-stage",
    r32: "round-of-32",
    "round-of-32": "round-of-32",
    r16: "round-of-16",
    "round-of-16": "round-of-16",
    qf: "quarterfinals",
    quarterfinal: "quarterfinals",
    quarterfinals: "quarterfinals",
    sf: "semifinals",
    semifinal: "semifinals",
    semifinals: "semifinals",
    "third-place": "third-place",
    third: "third-place",
    final: "final"
  };
  const STAGE_ZH = {
    "group-stage": "小组赛",
    "round-of-32": "32强",
    "round-of-16": "16强",
    quarterfinals: "1/4决赛",
    semifinals: "半决赛",
    "third-place": "季军赛",
    final: "决赛"
  };

  const finite = (value) => {
    if (value === null || value === "" || typeof value === "undefined") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  function probabilities(value) {
    if (!Array.isArray(value) || value.length < 3) return null;
    const values = value.slice(0, 3).map(finite);
    if (values.some((item) => item === null || item < 0 || item > 100)) return null;
    const total = values.reduce((sum, item) => sum + item, 0);
    if (!total) return null;
    const output = values.map((item) => Math.round(item / total * 100));
    output[2] += 100 - output.reduce((sum, item) => sum + item, 0);
    return output;
  }

  function isoDate(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : "";
  }

  function stageSlug(value) {
    const text = String(value || "").toLowerCase().trim();
    if (STAGES[text]) return STAGES[text];
    if (text.includes("小组") || text.includes("group")) return "group-stage";
    if (text.includes("32")) return "round-of-32";
    if (text.includes("16")) return "round-of-16";
    if (text.includes("quarter") || text.includes("1/4") || text.includes("四分")) return "quarterfinals";
    if (text.includes("semi") || text.includes("半决")) return "semifinals";
    if (text.includes("third") || text.includes("季军")) return "third-place";
    if (text.includes("final") || text.includes("决赛")) return "final";
    return "other";
  }

  function normalizePlayer(player) {
    if (typeof player === "string") return { nameZh: player, nameEn: player, display: player };
    const nameZh = String(player?.nameZh || player?.zh || player?.name || "球员待更新");
    const nameEn = String(player?.name || player?.nameEn || player?.shortName || nameZh);
    return {
      id: player?.id ? String(player.id) : "",
      nameZh,
      nameEn,
      number: player?.number || "",
      position: player?.position || "",
      injuries: Array.isArray(player?.injuries) ? player.injuries : [],
      display: `${nameZh}${nameEn && nameEn !== nameZh ? `（${nameEn}）` : ""}`
    };
  }

  function normalizeTeam(team, key = "") {
    const code = String(team?.code || team?.abbreviation || key || "").toUpperCase();
    const nameZh = String(team?.nameZh || team?.name || team?.zh || code || "待定");
    const nameEn = String(team?.nameEn || team?.en || team?.displayName || code || nameZh);
    const players = Array.isArray(team?.players) ? team.players.map(normalizePlayer) : [];
    return {
      code,
      nameZh,
      nameEn,
      name: nameZh,
      logo: String(team?.logo || team?.flag || ""),
      flag: String(team?.flag || team?.logo || ""),
      group: String(team?.group || ""),
      ranking: finite(team?.ranking ?? team?.rank),
      attack: finite(team?.attack),
      midfield: finite(team?.midfield),
      defense: finite(team?.defense),
      form: Array.isArray(team?.form) ? team.form : (Array.isArray(team?.recent) ? team.recent.slice(0, 10).map((item) => item.result || "").filter(Boolean) : []),
      players,
      strength: String(team?.strength || ""),
      risk: String(team?.risk || (Array.isArray(team?.injuries) && team.injuries.length ? "存在伤停记录" : "")),
      injuries: Array.isArray(team?.injuries) ? team.injuries : [],
      raw: team
    };
  }

  function normalizeMatch(fixture, teamsByCode = new Map()) {
    const homeCode = String(fixture?.homeCode || fixture?.home || fixture?.homeTeam?.abbreviation || "").toUpperCase();
    const awayCode = String(fixture?.awayCode || fixture?.away || fixture?.awayTeam?.abbreviation || "").toUpperCase();
    const homeTeam = teamsByCode.get(homeCode);
    const awayTeam = teamsByCode.get(awayCode);
    const date = isoDate(fixture?.date);
    const completed = Boolean(fixture?.completed || String(fixture?.status || "").toUpperCase().includes("FULL_TIME"));
    const rawStatus = String(fixture?.status || "").toLowerCase();
    const live = !completed && (Boolean(fixture?.live) || rawStatus.includes("progress") || rawStatus.includes("live") || rawStatus.includes("halftime"));
    const homeScore = finite(fixture?.homeScore);
    const awayScore = finite(fixture?.awayScore);
    const hasOfficialScore = (completed || live) && homeScore !== null && awayScore !== null;
    const predictionMode = String(fixture?.scoreType || "").includes("预测") || Boolean(fixture?.predictedScore);
    const predictedScore = !hasOfficialScore && predictionMode ? String(fixture?.predictedScore || fixture?.score || "") : "";
    const probabilitiesValue = predictionMode ? probabilities(fixture?.probabilities) : null;
    const stage = stageSlug(fixture?.stageSlug || fixture?.stage);
    const statusText = fixture?.statusText || fixture?.status || (completed ? "已结束" : live ? "进行中" : "未开赛");
    return {
      id: String(fixture?.id || fixture?.matchNo || `${homeCode}-${awayCode}-${date}`),
      matchNo: fixture?.matchNo ?? null,
      stageSlug: stage,
      stageZh: STAGE_ZH[stage] || String(fixture?.stage || "赛程"),
      stageEn: stage,
      stage: STAGE_ZH[stage] || String(fixture?.stage || "赛程"),
      group: String(fixture?.group || ""),
      date,
      timezone: "UTC",
      homeCode,
      awayCode,
      homeNameZh: String(fixture?.homeNameZh || fixture?.homeName || homeTeam?.nameZh || homeCode || "待定"),
      homeNameEn: String(fixture?.homeNameEn || homeTeam?.nameEn || homeCode || "TBD"),
      awayNameZh: String(fixture?.awayNameZh || fixture?.awayName || awayTeam?.nameZh || awayCode || "待定"),
      awayNameEn: String(fixture?.awayNameEn || awayTeam?.nameEn || awayCode || "TBD"),
      homeName: String(fixture?.homeNameZh || fixture?.homeName || homeTeam?.nameZh || homeCode || "待定"),
      awayName: String(fixture?.awayNameZh || fixture?.awayName || awayTeam?.nameZh || awayCode || "待定"),
      homeLogo: String(fixture?.homeLogo || homeTeam?.logo || ""),
      awayLogo: String(fixture?.awayLogo || awayTeam?.logo || ""),
      venue: String(fixture?.venue || fixture?.city || "待官方确认"),
      status: String(fixture?.status || ""),
      statusTextZh: String(statusText),
      statusTextEn: String(statusText),
      statusText: String(statusText),
      completed,
      live,
      homeScore: hasOfficialScore ? homeScore : null,
      awayScore: hasOfficialScore ? awayScore : null,
      displayClock: String(fixture?.displayClock || ""),
      predictedScore,
      alternativeScore: predictionMode ? String(fixture?.alternativeScore || fixture?.altScore || "") : "",
      probabilities: probabilitiesValue,
      confidence: predictionMode ? finite(fixture?.confidence) : null,
      factors: Array.isArray(fixture?.factors) ? fixture.factors : [],
      halfFull: predictionMode ? String(fixture?.halfFull || "") : "",
      timeline: Array.isArray(fixture?.timeline) ? fixture.timeline : [],
      raw: fixture
    };
  }

  function normalizePayload(data) {
    const teamValues = Array.isArray(data?.teams) ? data.teams : Object.values(data?.teams || {});
    const teams = teamValues.map((item, index) => normalizeTeam(item, item?.code || index)).filter((item) => item.code);
    const teamsByCode = new Map(teams.map((item) => [item.code, item]));
    const seen = new Set();
    const matches = (data?.fixtures || data?.matches || []).map((item) => normalizeMatch(item, teamsByCode)).filter((item) => {
      if (!item.id || !item.date || !item.homeCode || !item.awayCode || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    return { matches, teams, updatedAt: data?.updatedAt || data?.lastUpdated || data?.generatedAt || null, raw: data };
  }

  window.FM_NORMALIZER = { finite, probabilities, isoDate, stageSlug, normalizeTeam, normalizeMatch, normalizePayload, STAGE_ZH };
})();
