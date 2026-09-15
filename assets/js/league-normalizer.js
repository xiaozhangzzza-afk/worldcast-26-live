(() => {
  "use strict";

  const finite = (value) => window.FM_NORMALIZER.finite(value);
  const normalizeProbabilities = (value) => window.FM_NORMALIZER.probabilities(value);
  const STATUS_ZH = { pre: "未开赛", in: "进行中", post: "已结束" };

  function moneylineChance(value) {
    const n = finite(value);
    if (n === null) return null;
    return n >= 0 ? 100 / (n + 100) : -n / (-n + 100);
  }

  function predictionFromCompetition(competition) {
    const moneyline = competition?.odds?.[0]?.moneyline;
    const raw = [
      moneylineChance(moneyline?.home?.close?.odds ?? moneyline?.home?.open?.odds),
      moneylineChance(moneyline?.draw?.close?.odds ?? moneyline?.draw?.open?.odds),
      moneylineChance(moneyline?.away?.close?.odds ?? moneyline?.away?.open?.odds)
    ];
    if (raw.some((item) => item === null)) return null;
    const probabilities = normalizeProbabilities(raw.map((item) => item * 100));
    const [home, draw, away] = probabilities;
    const primary = home >= 58 ? "2–0" : away >= 58 ? "0–2" : home >= 43 ? "2–1" : away >= 43 ? "1–2" : draw >= 32 ? "1–1" : "1–0";
    const alternatives = { "2–0": "2–1", "0–2": "1–2", "2–1": "1–0", "1–2": "0–1", "1–1": "0–0", "1–0": "2–1" };
    const result = home > away && home > draw ? "胜" : away > home && away > draw ? "负" : "平";
    return {
      probabilities,
      predictedScore: primary,
      alternativeScore: alternatives[primary] || "1–1",
      confidence: Math.min(88, Math.round(58 + Math.max(home, draw, away) * .32)),
      halfFull: `平 / ${result}`,
      factors: ["公开赛前数据换算", "主客场与近期状态"]
    };
  }

  function timelineFromCompetition(competition, homeId, awayId) {
    return (competition?.details || [])
      .filter((item) => item.scoringPlay || /card/i.test(item.type?.type || ""))
      .map((item) => {
        const typeText = String(item.type?.type || "");
        const isGoal = Boolean(item.scoringPlay);
        const type = isGoal ? "goal" : /red/i.test(typeText) ? "red" : "yellow";
        const people = (item.participants || []).map((person) => person.athlete?.displayName).filter(Boolean);
        const teamId = String(item.team?.id || "");
        const ownGoal = Boolean(item.ownGoal) || /own goal/i.test(item.text || "");
        const penalty = Boolean(item.penaltyKick) || /penalty/i.test(`${typeText} ${item.text || ""}`);
        return {
          id: String(item.id || `${item.clock?.value}-${type}-${teamId}`),
          minute: String(item.clock?.displayValue || ""),
          clock: finite(item.clock?.value) || 0,
          type,
          side: teamId === homeId ? "home" : teamId === awayId ? "away" : "neutral",
          player: people[0] || "球员待确认",
          playerZh: people[0] || "球员待确认",
          assist: isGoal && !ownGoal ? people[1] || "" : "",
          assistZh: isGoal && !ownGoal ? people[1] || "" : "",
          goalKind: isGoal ? ownGoal ? "乌龙球" : penalty ? "点球" : "正常进球" : "",
          ownGoal,
          description: String(item.text || "")
        };
      })
      .sort((a, b) => a.clock - b.clock);
  }

  function normalizeTeam(competitor, meta) {
    const raw = competitor?.team || {};
    if (!raw.id) return null;
    const code = `${meta.id}:${raw.id}`;
    const leaders = [...new Map((competitor.leaders || [])
      .flatMap((group) => group.leaders || [])
      .map((item) => item.athlete)
      .filter(Boolean)
      .map((athlete) => [String(athlete.id || athlete.displayName), athlete])).values()];
    return {
      code,
      shortCode: String(raw.abbreviation || raw.shortDisplayName || raw.id).toUpperCase(),
      name: raw.displayName || raw.name || raw.abbreviation,
      nameZh: raw.displayName || raw.name || raw.abbreviation,
      nameEn: raw.displayName || raw.name || raw.abbreviation,
      logo: raw.logo || "",
      flag: raw.logo || "",
      competitionId: meta.id,
      competitionName: meta.nameZh,
      group: "",
      ranking: null,
      attack: null,
      midfield: null,
      defense: null,
      form: String(competitor.form || "").split("").filter(Boolean),
      players: leaders.map((athlete) => ({
        id: String(athlete.id || ""),
        nameZh: athlete.displayName || athlete.shortName || "球员待更新",
        nameEn: athlete.displayName || athlete.shortName || "Player pending",
        number: athlete.jersey || "",
        position: athlete.position?.abbreviation || "",
        injuries: [],
        display: athlete.displayName || athlete.shortName || "球员待更新"
      })),
      strength: "近期状态随实时赛程更新",
      risk: "伤停与首发以俱乐部官方公告为准",
      injuries: []
    };
  }

  function normalizeEvent(event, meta) {
    const competition = event?.competitions?.[0] || {};
    const home = competition.competitors?.find((item) => item.homeAway === "home") || {};
    const away = competition.competitors?.find((item) => item.homeAway === "away") || {};
    const date = window.FM_NORMALIZER.isoDate(event?.date);
    if (!home.team?.id || !away.team?.id || !date) return null;
    const state = event.status?.type?.state || competition.status?.type?.state || "pre";
    const completed = Boolean(event.status?.type?.completed || competition.status?.type?.completed || state === "post");
    const live = !completed && state === "in";
    const prediction = !live && !completed ? predictionFromCompetition(competition) : null;
    const homeCode = `${meta.id}:${home.team.id}`;
    const awayCode = `${meta.id}:${away.team.id}`;
    const homeScore = live || completed ? finite(home.score?.value ?? home.score) : null;
    const awayScore = live || completed ? finite(away.score?.value ?? away.score) : null;
    return {
      id: String(event.id),
      matchNo: null,
      competitionId: meta.id,
      competitionNameZh: meta.nameZh,
      competitionNameEn: meta.nameEn,
      stageSlug: "league",
      stageZh: "联赛",
      stageEn: "League",
      stage: "联赛",
      group: "",
      date,
      timezone: "UTC",
      homeCode,
      awayCode,
      homeShortCode: home.team.abbreviation || "HOME",
      awayShortCode: away.team.abbreviation || "AWAY",
      homeNameZh: home.team.displayName || home.team.name || home.team.abbreviation,
      homeNameEn: home.team.displayName || home.team.name || home.team.abbreviation,
      awayNameZh: away.team.displayName || away.team.name || away.team.abbreviation,
      awayNameEn: away.team.displayName || away.team.name || away.team.abbreviation,
      homeName: home.team.displayName || home.team.name || home.team.abbreviation,
      awayName: away.team.displayName || away.team.name || away.team.abbreviation,
      homeLogo: home.team.logo || "",
      awayLogo: away.team.logo || "",
      venue: competition.venue?.fullName || "场地待官方确认",
      status: event.status?.type?.name || state,
      statusTextZh: STATUS_ZH[state] || event.status?.type?.description || "状态待更新",
      statusTextEn: event.status?.type?.description || state,
      statusText: STATUS_ZH[state] || event.status?.type?.description || "状态待更新",
      completed,
      live,
      homeScore,
      awayScore,
      displayClock: event.status?.displayClock || competition.status?.displayClock || "",
      clockSeconds: finite(event.status?.clock ?? competition.status?.clock),
      clockSnapshotAt: new Date().toISOString(),
      predictedScore: prediction?.predictedScore || "",
      alternativeScore: prediction?.alternativeScore || "",
      probabilities: prediction?.probabilities || null,
      confidence: prediction?.confidence ?? null,
      factors: prediction?.factors || [],
      halfFull: prediction?.halfFull || "",
      timeline: timelineFromCompetition(competition, String(home.team.id), String(away.team.id))
    };
  }

  function normalizeFeed(feed, meta) {
    const teams = new Map();
    const matches = (feed?.events || []).map((event) => {
      for (const competitor of event?.competitions?.[0]?.competitors || []) {
        const team = normalizeTeam(competitor, meta);
        if (team) teams.set(team.code, team);
      }
      return normalizeEvent(event, meta);
    }).filter(Boolean);
    return { matches, teams: [...teams.values()] };
  }

  window.FM_LEAGUE_NORMALIZER = { normalizeFeed, normalizeEvent, normalizeTeam, timelineFromCompetition, predictionFromCompetition };
})();
