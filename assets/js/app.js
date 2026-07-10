(() => {
  "use strict";

  const BRAND = "足球预测大模型";
  const VERSION = "V3.0";
  const STORAGE = {
    language: "football-model-language",
    theme: "football-model-theme",
    favorites: "football-model-favorites"
  };

  const safeStorage = {
    get(key, fallback = "") {
      try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch { /* localStorage may be disabled */ }
    }
  };

  const translations = {
    zh: {
      "nav.home": "首页",
      "nav.today": "今日预测",
      "nav.schedule": "赛程",
      "nav.teams": "球队",
      "nav.method": "模型说明",
      "nav.watch": "观赛入口",
      "hero.title": "让每场比赛，<span>都有数据答案</span>",
      "hero.lead": "基于球队强度、近期状态、进攻防守、赛程环境和演示模型，生成 2026 世界杯预测视图。",
      "hero.ctaPrimary": "查看今日预测",
      "hero.ctaSecondary": "打开完整赛程",
      "hero.nextMatch": "下一场焦点战",
      "metric.fixtures": "完整赛程",
      "metric.upcoming": "未来 72 小时",
      "metric.upcomingUnit": "场焦点赛",
      "metric.confidence": "平均模型信心",
      "metric.demo": "演示指标",
      "metric.teams": "球队档案",
      "metric.teamUnit": "支球队",
      "status.updated": "最后更新",
      "matches.title": "今日焦点比赛",
      "matches.subtitle": "至少 3 场焦点赛，展示阶段、时间、球队、预测比分、胜平负概率和模型信心。",
      "insights.title": "每日模型观察",
      "insights.subtitle": "弱化投注感，只展示模型视角、置信度、理由和风险边界。",
      "scores.title": "比分频次与模型分布",
      "scores.subtitle": "以下为演示模型分布，不代表真实赛果。模型更偏向谨慎比分区间。",
      "schedule.title": "全赛程图谱",
      "schedule.subtitle": "筛选小组赛到决赛阶段，搜索中文、英文或球队简称。时间默认以北京时间展示。",
      "teams.title": "球队数据库",
      "teams.subtitle": "12 支示例球队档案，包含评分、近期状态、核心球员和风险标签。收藏会保存在本机。",
      "method.title": "模型如何计算",
      "method.subtitle": "这是演示模型，不声称接入真实商业数据源，也不替代临场信息。",
      "watch.title": "正规观赛与赛事资讯入口",
      "watch.subtitle": "只保留正规平台或资讯入口。可用性取决于地区、版权和账号权限。",
      "music.title": "世界杯经典旋律",
      "music.subtitle": "按需展开，不自动播放，不加载重资源。",
      "faq.title": "常见问题",
      "common.disclaimer": "模型演示，不构成投注或财务建议。临场阵容、官方公告与实际赛果优先。"
    },
    en: {
      "nav.home": "Home",
      "nav.today": "Predictions",
      "nav.schedule": "Schedule",
      "nav.teams": "Teams",
      "nav.method": "Method",
      "nav.watch": "Watch",
      "hero.title": "Every match, <span>explained by data</span>",
      "hero.lead": "A demo model view for the 2026 World Cup, based on team strength, recent form, attacking and defensive structure, match context and score simulation.",
      "hero.ctaPrimary": "View predictions",
      "hero.ctaSecondary": "Open schedule",
      "hero.nextMatch": "Next featured match",
      "metric.fixtures": "Full schedule",
      "metric.upcoming": "Next 72 hours",
      "metric.upcomingUnit": "featured",
      "metric.confidence": "Average confidence",
      "metric.demo": "demo metric",
      "metric.teams": "Team profiles",
      "metric.teamUnit": "teams",
      "status.updated": "Last updated",
      "matches.title": "Featured Matches",
      "matches.subtitle": "At least three match cards with stage, time, teams, score pick, 1X2 probabilities and model confidence.",
      "insights.title": "Daily Model Watch",
      "insights.subtitle": "A product-style model view with confidence, reasoning and risk boundaries.",
      "scores.title": "Scoreline Frequency & Model Distribution",
      "scores.subtitle": "Demo model distribution only. It does not represent actual results.",
      "schedule.title": "Full Schedule Map",
      "schedule.subtitle": "Filter stages and search by Chinese name, English name or team code. Times are shown in China Standard Time.",
      "teams.title": "Team Database",
      "teams.subtitle": "Twelve sample team profiles with ratings, form, key players and risk tags. Favorites are saved locally.",
      "method.title": "How the model works",
      "method.subtitle": "This is a demo model. It does not claim access to proprietary live data and does not replace matchday information.",
      "watch.title": "Trusted Viewing & Match Information",
      "watch.subtitle": "Only official platforms or information entrances are listed. Availability depends on region, rights and account access.",
      "music.title": "World Cup Classics",
      "music.subtitle": "Open on demand. No autoplay and no heavy media load.",
      "faq.title": "FAQ",
      "common.disclaimer": "Model demonstration only. Not betting or financial advice. Official lineups, announcements and results take priority."
    }
  };

  const teams = [
    team("ARG", "阿根廷", "Argentina", "🇦🇷", "A", [92, 88, 84], ["梅西 Lionel Messi", "劳塔罗 Lautaro Martínez", "恩佐 Enzo Fernández"], "控球与终结稳定", "年龄结构与高强度对抗"),
    team("BRA", "巴西", "Brazil", "🇧🇷", "B", [91, 86, 82], ["维尼修斯 Vinícius Júnior", "罗德里戈 Rodrygo", "吉马良斯 Bruno Guimarães"], "边路爆点充足", "防线转换保护"),
    team("FRA", "法国", "France", "🇫🇷", "C", [90, 87, 86], ["姆巴佩 Kylian Mbappé", "格列兹曼 Antoine Griezmann", "琼阿梅尼 Aurélien Tchouaméni"], "速度与防守覆盖", "临场阵容变化"),
    team("ENG", "英格兰", "England", "🏴", "D", [88, 89, 83], ["贝林厄姆 Jude Bellingham", "凯恩 Harry Kane", "福登 Phil Foden"], "中前场选择丰富", "关键战节奏管理"),
    team("GER", "德国", "Germany", "🇩🇪", "E", [86, 88, 82], ["穆西亚拉 Jamal Musiala", "维尔茨 Florian Wirtz", "基米希 Joshua Kimmich"], "中场推进质量", "防线身后空间"),
    team("ESP", "西班牙", "Spain", "🇪🇸", "F", [85, 90, 84], ["罗德里 Rodri", "佩德里 Pedri", "亚马尔 Lamine Yamal"], "传控压制力", "禁区效率波动"),
    team("POR", "葡萄牙", "Portugal", "🇵🇹", "G", [87, 86, 82], ["C罗 Cristiano Ronaldo", "B费 Bruno Fernandes", "莱奥 Rafael Leão"], "定位球与射门点", "攻守平衡选择"),
    team("NED", "荷兰", "Netherlands", "🇳🇱", "H", [83, 85, 87], ["范戴克 Virgil van Dijk", "德容 Frenkie de Jong", "加克波 Cody Gakpo"], "防守结构清晰", "阵地战破密防"),
    team("ITA", "意大利", "Italy", "🇮🇹", "I", [80, 84, 86], ["巴雷拉 Nicolò Barella", "多纳鲁马 Gianluigi Donnarumma", "基耶萨 Federico Chiesa"], "防守韧性", "持续进攻火力"),
    team("USA", "美国", "United States", "🇺🇸", "J", [78, 80, 77], ["普利西奇 Christian Pulisic", "麦肯尼 Weston McKennie", "雷纳 Gio Reyna"], "体能与主场氛围", "大赛经验"),
    team("MEX", "墨西哥", "Mexico", "🇲🇽", "K", [77, 79, 78], ["希门尼斯 Raúl Jiménez", "洛萨诺 Hirving Lozano", "阿尔瓦雷斯 Edson Álvarez"], "压迫强度", "终结稳定性"),
    team("CAN", "加拿大", "Canada", "🇨🇦", "L", [76, 78, 75], ["戴维 Jonathan David", "阿方索 Davies", "欧斯塔基奥 Stephen Eustáquio"], "速度冲击", "后场抗压")
  ];

  const matches = [
    match(1, "group", 3, "ARG", "POR", "小组赛", "Group Stage", "2-1", "1-1", [45, 28, 27], 79, "梅赛德斯-奔驰体育场", ["进攻效率", "定位球", "赛程体能"], "胜/胜"),
    match(2, "group", 8, "FRA", "USA", "小组赛", "Group Stage", "1-0", "2-0", [52, 25, 23], 81, "大都会人寿体育场", ["防守稳定", "边路速度", "主场氛围"], "平/胜"),
    match(3, "group", 13, "BRA", "JPN", "小组赛", "Group Stage", "2-0", "2-1", [58, 24, 18], 82, "索菲体育场", ["前场创造", "转换速度", "控球压制"], "胜/胜"),
    match(4, "group", 28, "ENG", "MEX", "小组赛", "Group Stage", "2-1", "1-0", [50, 27, 23], 78, "AT&T 体育场", ["中场推进", "定位球", "防线回收"], "平/胜"),
    match(5, "group", 36, "GER", "CAN", "小组赛", "Group Stage", "2-0", "1-0", [56, 25, 19], 80, "林肯金融球场", ["控球质量", "边路身后", "经验差"], "胜/胜"),
    match(6, "group", 52, "ESP", "NED", "小组赛", "Group Stage", "1-1", "1-0", [39, 32, 29], 74, "硬石体育场", ["传控节奏", "防守组织", "射门质量"], "平/平"),
    match(7, "r32", 68, "ITA", "ARG", "32强", "Round of 32", "0-1", "1-1", [26, 31, 43], 76, "箭头体育场", ["防守韧性", "关键球员", "淘汰赛压力"], "平/负"),
    match(8, "r16", 92, "FRA", "BRA", "16强", "Round of 16", "1-1", "1-2", [34, 31, 35], 73, "玫瑰碗", ["强强对话", "反击速度", "细节波动"], "平/平"),
    match(9, "qf", 130, "ENG", "ESP", "1/4决赛", "Quarterfinal", "1-1", "0-1", [33, 34, 33], 71, "卢门球场", ["中场对抗", "控球质量", "定位球"], "平/平"),
    match(10, "sf", 176, "POR", "FRA", "半决赛", "Semifinal", "1-2", "1-1", [28, 29, 43], 77, "NRG 体育场", ["速度空间", "定位球", "临场调整"], "平/负"),
    match(11, "final", 228, "ARG", "FRA", "决赛", "Final", "未开赛", "待定", [36, 31, 33], 72, "大都会人寿体育场", ["决赛压力", "球星效率", "防守细节"], "待确认")
  ];

  const scoreDistribution = [
    ["1-0", 18, "低比分", "防守占优时更常见"],
    ["1-1", 16, "平局区间", "强弱接近时模型权重较高"],
    ["2-1", 15, "谨慎胜出", "热门队伍的小胜路径"],
    ["2-0", 13, "低风险扩大", "控球优势转化为第二球"],
    ["0-0", 9, "低比分", "开局谨慎或终结效率偏低"],
    ["3-1", 7, "高比分", "早段进球改变节奏"]
  ];

  const modelInsights = [
    ["稳健观察", "阿根廷 vs 葡萄牙", "主比分 2-1，备选 1-1", "79%", "两队都有稳定得分点，模型更看重阿根廷中前场连续性。", "若临场轮换幅度较大，比分区间可能下修。"],
    ["进球数倾向", "法国 vs 美国", "1-0 或 2-0", "81%", "法国防线评分和转换效率更稳定，模型倾向低到中比分。", "主场氛围可能提升美国反击质量。"],
    ["平局区间", "西班牙 vs 荷兰", "1-1 或 1-0", "74%", "双方控球和防守组织接近，模型认为前 60 分钟节奏偏谨慎。", "早段进球会明显拉高总进球区间。"]
  ];

  const watchLinks = [
    ["FIFA 官方赛程", "官方赛事信息", "查看赛程、场地、球队与官方公告。", "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026"],
    ["央视体育", "国内正规资讯", "国内体育资讯、专题内容与赛事新闻入口。", "https://sports.cctv.com/"],
    ["央视网世界杯专题", "国内专题入口", "如持权内容开放，可通过正规平台查询。", "https://worldcup.cctv.com/"],
    ["懂球帝", "足球资讯平台", "中文足球资讯、数据和赛程讨论入口。", "https://www.dongqiudi.com/"],
    ["直播吧", "赛事资讯平台", "赛程、文字资讯与体育新闻入口，不提供本站直播源。", "https://www.zhibo8.com/"]
  ];

  const tracks = [
    ["Waka Waka", "Shakira", "https://music.apple.com/us/search?term=Waka%20Waka%20Shakira"],
    ["Wavin' Flag", "K'naan", "https://music.apple.com/us/search?term=Wavin%20Flag%20Knaan"],
    ["The Cup of Life", "Ricky Martin", "https://music.apple.com/us/search?term=The%20Cup%20of%20Life%20Ricky%20Martin"],
    ["We Are One", "Pitbull / Jennifer Lopez", "https://music.apple.com/us/search?term=We%20Are%20One%20Ole%20Ola"],
    ["Dreamers", "Jung Kook", "https://music.apple.com/us/search?term=Dreamers%20Jung%20Kook"],
    ["Hayya Hayya", "Trinidad Cardona", "https://music.apple.com/us/search?term=Hayya%20Hayya"],
    ["Live It Up", "Nicky Jam", "https://music.apple.com/us/search?term=Live%20It%20Up%20World%20Cup"],
    ["Colors", "Jason Derulo", "https://music.apple.com/us/search?term=Colors%20Jason%20Derulo"]
  ];

  const faq = [
    ["这个网站的数据是真实的吗？", "当前为演示模型数据，后续可以接入真实赛程、阵容、赛果与事件 API。"],
    ["预测结果可以用于投注吗？", "不可以。模型演示不构成投注、投资或财务建议。"],
    ["赛程时间准确吗？", "以官方发布为准，本站当前展示为数据产品演示，时间默认按北京时间呈现。"],
    ["是否提供直播源？", "不提供盗版直播源，只提供正规观赛与赛事资讯入口说明。"],
    ["可以添加到手机桌面吗？", "支持 PWA 的浏览器可以通过菜单添加到桌面。"]
  ];

  const state = {
    language: safeStorage.get(STORAGE.language, "zh") === "en" ? "en" : "zh",
    theme: safeStorage.get(STORAGE.theme, "") || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"),
    stage: "all",
    scheduleQuery: "",
    teamQuery: "",
    favorites: new Set(readFavorites()),
    lastFocus: null
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const html = (value) => String(value ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const now = () => new Date();
  const t = (key) => translations[state.language][key] || translations.zh[key] || key;
  const teamByCode = (code) => teams.find((item) => item.code === code) || teams[0];
  const teamLabel = (code) => state.language === "en" ? teamByCode(code).nameEn : teamByCode(code).nameZh;
  const stageLabel = (item) => state.language === "en" ? item.stageEn : item.stageZh;
  const formatDate = (date) => new Intl.DateTimeFormat(state.language === "en" ? "en-GB" : "zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
  const formatFull = (date) => new Intl.DateTimeFormat(state.language === "en" ? "en-GB" : "zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);

  function team(code, nameZh, nameEn, flag, group, ratings, players, strength, risk) {
    return {
      code, nameZh, nameEn, flag, group,
      attack: ratings[0], midfield: ratings[1], defense: ratings[2],
      form: ["胜", "平", "胜", "负", "胜"],
      players,
      strength,
      risk
    };
  }

  function match(id, stage, offsetHours, home, away, stageZh, stageEn, score, altScore, probabilities, confidence, venue, factors, halfFull) {
    return {
      id, stage, offsetHours, home, away, stageZh, stageEn, score, altScore, probabilities, confidence, venue, factors, halfFull,
      date: new Date(Date.now() + offsetHours * 60 * 60 * 1000)
    };
  }

  function readFavorites() {
    try {
      const parsed = JSON.parse(safeStorage.get(STORAGE.favorites, "[]"));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveFavorites() {
    safeStorage.set(STORAGE.favorites, JSON.stringify(Array.from(state.favorites)));
  }

  function init() {
    applyTheme();
    applyLanguage();
    bindEvents();
    renderAll();
    updateClock();
    setInterval(updateClock, 1000);
    setInterval(updateFreshnessOnly, 5 * 60 * 1000);
    registerServiceWorker();
  }

  function applyLanguage() {
    document.documentElement.lang = state.language === "en" ? "en" : "zh-CN";
    document.title = state.language === "en"
      ? `${BRAND} | 2026 World Cup Schedule, Score Picks & Team Database`
      : `${BRAND}｜2026世界杯赛程、比分预测与球队数据`;
    $$("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    $("#languageToggle").textContent = state.language === "en" ? "English" : "中文";
    $("#languageToggle").setAttribute("aria-label", state.language === "en" ? "切换到中文" : "Switch to English");
    $("#themeToggle").textContent = state.theme === "dark"
      ? (state.language === "en" ? "Dark" : "深色")
      : (state.language === "en" ? "Light" : "浅色");
    $("#refreshButton").textContent = state.language === "en" ? "Refresh demo data" : "刷新 Demo 数据";
    $("#dataStatus").textContent = state.language === "en" ? "Demo data loaded" : "Demo 数据已加载";
    $("#musicToggle").textContent = $("#trackList").hidden
      ? (state.language === "en" ? "Open playlist" : "展开歌单")
      : (state.language === "en" ? "Close playlist" : "收起歌单");
    $("#scheduleSearch").placeholder = state.language === "en" ? "Search team, stage or venue" : "搜索球队、阶段或场地";
    $("#teamSearch").placeholder = state.language === "en" ? "Search team name or code" : "搜索球队名称或简称";
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    const metaTheme = $("meta[name='theme-color']");
    if (metaTheme) metaTheme.content = state.theme === "dark" ? "#0b1f3a" : "#f5f8fb";
  }

  function renderAll() {
    renderMetrics();
    renderNextMatch();
    renderMatches();
    renderInsights();
    renderScores();
    renderSchedule();
    renderTeams();
    renderWatchLinks();
    renderFaq();
  }

  function renderMetrics() {
    $("#metricFixtures").textContent = "104";
    $("#metricUpcoming").textContent = "6";
    $("#metricConfidence").textContent = "78.4%";
    $("#metricTeams").textContent = "48";
  }

  function renderNextMatch() {
    const next = matches.find((item) => item.date > now()) || matches[0];
    $("#nextMatchCard").innerHTML = `
      <div class="teams-line"><span>${teamByCode(next.home).flag} ${html(teamLabel(next.home))}</span><strong>vs</strong><span>${teamByCode(next.away).flag} ${html(teamLabel(next.away))}</span></div>
      <div class="score-pick">${html(next.score)}</div>
      <p>${html(stageLabel(next))} · ${formatDate(next.date)} · <span data-countdown="${next.id}">${countdownText(next.date)}</span></p>
      <meter min="0" max="100" value="${next.confidence}">${next.confidence}%</meter>
      <small>${state.language === "en" ? "Model confidence" : "模型信心"} ${next.confidence}%</small>
    `;
  }

  function renderMatches() {
    $("#matchGrid").innerHTML = matches.slice(0, 6).map((item) => matchCard(item)).join("");
  }

  function matchCard(item) {
    const [home, draw, away] = normalizeProbs(item.probabilities);
    return `
      <article class="match-card">
        <header><span>${html(stageLabel(item))}</span><time datetime="${item.date.toISOString()}">${formatDate(item.date)}</time></header>
        <div class="match-teams">
          <b>${teamByCode(item.home).flag} ${html(teamLabel(item.home))}</b>
          <strong>${html(item.score)}</strong>
          <b>${teamByCode(item.away).flag} ${html(teamLabel(item.away))}</b>
        </div>
        <div class="probability-row" aria-label="胜平负概率">
          <span style="--w:${home}%">${state.language === "en" ? "Home" : "主胜"} ${home}%</span>
          <span style="--w:${draw}%">${state.language === "en" ? "Draw" : "平局"} ${draw}%</span>
          <span style="--w:${away}%">${state.language === "en" ? "Away" : "客胜"} ${away}%</span>
        </div>
        <p>${state.language === "en" ? "Confidence" : "模型信心"} ${item.confidence}% · ${state.language === "en" ? "Alt score" : "备选比分"} ${html(item.altScore)}</p>
        <div class="tag-row">${item.factors.map((factor) => `<span class="tag">${html(factor)}</span>`).join("")}</div>
        <div class="hero-actions"><button class="button small" type="button" data-open-match="${item.id}">${state.language === "en" ? "View details" : "查看详情"}</button></div>
      </article>
    `;
  }

  function renderInsights() {
    $("#insightGrid").innerHTML = modelInsights.map(([type, title, range, confidence, reason, risk]) => `
      <article class="insight-card">
        <header><span>${html(type)}</span><strong>${html(confidence)}</strong></header>
        <h3>${html(title)}</h3>
        <p><strong>${html(range)}</strong></p>
        <p>${html(reason)}</p>
        <p>${state.language === "en" ? "Risk" : "风险提示"}：${html(risk)}</p>
        <p class="compliance-note">${t("common.disclaimer")}</p>
      </article>
    `).join("");
  }

  function renderScores() {
    const max = Math.max(...scoreDistribution.map((item) => item[1]));
    $("#scoreDistribution").innerHTML = scoreDistribution.map(([score, weight, tag, note]) => `
      <article class="score-card">
        <strong class="score-name">${html(score)}</strong>
        <div>
          <div class="score-meter"><i style="width:${Math.max(8, Math.round(weight / max * 100))}%"></i></div>
          <p>${html(tag)} · ${html(note)}</p>
        </div>
        <b>${weight}%</b>
      </article>
    `).join("") + `<p class="compliance-note">Demo data for product prototype。以下为演示模型分布，不代表真实赛果。</p>`;
  }

  function renderSchedule() {
    const query = state.scheduleQuery.trim().toLowerCase();
    const filtered = matches.filter((item) => {
      const stageOk = state.stage === "all" || item.stage === state.stage;
      const haystack = [
        item.stageZh, item.stageEn, item.venue, item.home, item.away,
        teamByCode(item.home).nameZh, teamByCode(item.home).nameEn,
        teamByCode(item.away).nameZh, teamByCode(item.away).nameEn
      ].join(" ").toLowerCase();
      return stageOk && (!query || haystack.includes(query));
    });
    $("#scheduleGrid").innerHTML = filtered.length ? filtered.map((item) => `
      <article class="schedule-card ${item.stage === "final" ? "final-card" : ""}">
        <header><span>${html(stageLabel(item))}</span><time datetime="${item.date.toISOString()}">${formatDate(item.date)}</time></header>
        <h3>${teamByCode(item.home).flag} ${html(teamLabel(item.home))} vs ${teamByCode(item.away).flag} ${html(teamLabel(item.away))}</h3>
        <p>${html(item.venue)} · ${item.score === "未开赛" ? "未开赛" : `${state.language === "en" ? "Prediction" : "预测"} ${html(item.score)}`}</p>
        <button class="button small" type="button" data-open-match="${item.id}">${state.language === "en" ? "Details" : "详情"}</button>
      </article>
    `).join("") : `<div class="empty-state">${state.language === "en" ? "No matching matches. Try a different team or stage." : "没有找到相关赛程，请换一个球队、阶段或场地关键词。"}</div>`;
  }

  function renderTeams() {
    const query = state.teamQuery.trim().toLowerCase();
    const filtered = teams.filter((item) => {
      const haystack = [item.code, item.nameZh, item.nameEn, item.group, item.players.join(" ")].join(" ").toLowerCase();
      return !query || haystack.includes(query);
    });
    $("#teamGrid").innerHTML = filtered.length ? filtered.map((item) => teamCard(item)).join("") : `<div class="empty-state">${state.language === "en" ? "No matching teams." : "没有找到相关球队。"}</div>`;
    renderFavorites();
  }

  function teamCard(item) {
    const active = state.favorites.has(item.code);
    return `
      <article class="team-card">
        <button class="favorite-button ${active ? "active" : ""}" type="button" data-favorite="${item.code}" aria-label="${active ? "取消关注" : "关注"} ${html(item.nameZh)}">★</button>
        <button class="team-title" type="button" data-open-team="${item.code}" aria-label="查看${html(item.nameZh)}详情">
          <span class="flag" aria-hidden="true">${item.flag}</span>
          <span><h3>${html(state.language === "en" ? item.nameEn : item.nameZh)}</h3><p>${item.code} · ${state.language === "en" ? "Group" : "小组"} ${html(item.group)}</p></span>
        </button>
        <div class="rating-bars">
          ${rating("进攻", item.attack)}
          ${rating("中场", item.midfield)}
          ${rating("防守", item.defense)}
        </div>
        <p>${state.language === "en" ? "Key players" : "核心球员"}：${item.players.slice(0, 2).map(html).join("、")}</p>
        <div class="tag-row"><span class="tag">${html(item.strength)}</span><span class="tag">${html(item.risk)}</span></div>
      </article>
    `;
  }

  function rating(label, value) {
    const en = { "进攻": "Attack", "中场": "Midfield", "防守": "Defence" };
    return `<div><span>${state.language === "en" ? en[label] : label}</span><i style="--w:${Math.min(100, value)}%"></i><b>${Math.min(100, value)}</b></div>`;
  }

  function renderFavorites() {
    const favoriteCodes = Array.from(state.favorites).filter((code) => teams.some((item) => item.code === code));
    $("#favoriteHint").hidden = favoriteCodes.length > 0;
    $("#favoriteTeams").innerHTML = favoriteCodes.map((code) => `<button class="favorite-chip" type="button" data-open-team="${code}">${teamByCode(code).flag} ${html(teamLabel(code))}</button>`).join("");
  }

  function renderWatchLinks() {
    $("#watchLinks").innerHTML = watchLinks.map(([name, type, note, url]) => `
      <article class="watch-card">
        <div><span class="tag">${html(type)}</span><h3>${html(name)}</h3><p>${html(note)}</p></div>
        <a class="button small" href="${html(url)}" target="_blank" rel="noopener noreferrer">${state.language === "en" ? "Visit" : "访问入口"}</a>
      </article>
    `).join("");
  }

  function renderTracks() {
    $("#trackList").innerHTML = tracks.map(([name, artist, url], index) => `
      <a href="${html(url)}" target="_blank" rel="noopener noreferrer">
        <b>${String(index + 1).padStart(2, "0")}</b>
        <span>${html(name)}<br><small>${html(artist)}</small></span>
      </a>
    `).join("");
  }

  function renderFaq() {
    $("#faqList").innerHTML = faq.map(([question, answer], index) => `
      <article class="faq-item">
        <button type="button" aria-expanded="${index === 0 ? "true" : "false"}" data-faq="${index}">
          <strong>${html(question)}</strong><span>${index === 0 ? "收起" : "展开"}</span>
        </button>
        <p ${index === 0 ? "" : "hidden"}>${html(answer)}</p>
      </article>
    `).join("");
  }

  function openMatch(id, trigger) {
    const item = matches.find((matchItem) => String(matchItem.id) === String(id));
    if (!item) return;
    const [home, draw, away] = normalizeProbs(item.probabilities);
    const h = teamByCode(item.home);
    const a = teamByCode(item.away);
    $("#matchModalContent").innerHTML = `
      <p class="eyebrow">${html(stageLabel(item))} · MATCH ${item.id}</p>
      <h2 id="matchModalTitle">${h.flag} ${html(teamLabel(item.home))} vs ${a.flag} ${html(teamLabel(item.away))}</h2>
      <div class="detail-grid">
        <article class="detail-card"><h3>${state.language === "en" ? "Score picks" : "比分推荐"}</h3><p>${state.language === "en" ? "Primary" : "主比分"} ${html(item.score)} · ${state.language === "en" ? "Alternative" : "备选比分"} ${html(item.altScore)}</p></article>
        <article class="detail-card"><h3>${state.language === "en" ? "HT/FT lean" : "半全场倾向"}</h3><p>${html(item.halfFull)}</p></article>
        <article class="detail-card"><h3>${state.language === "en" ? "1X2 probabilities" : "胜平负概率"}</h3><p>${state.language === "en" ? "Home" : "主胜"} ${home}% · ${state.language === "en" ? "Draw" : "平局"} ${draw}% · ${state.language === "en" ? "Away" : "客胜"} ${away}%</p></article>
        <article class="detail-card"><h3>${state.language === "en" ? "Model confidence" : "模型信心"}</h3><p>${item.confidence}%</p></article>
        <article class="detail-card"><h3>${state.language === "en" ? "Key factors" : "关键因素"}</h3><p>${item.factors.map(html).join("、")}</p></article>
        <article class="detail-card"><h3>${state.language === "en" ? "Risk factors" : "风险因素"}</h3><p>${state.language === "en" ? "Lineups, injuries and official announcements may change before kick-off." : "临场阵容、伤病和官方公告可能在开赛前变化。"}</p></article>
      </div>
      <section class="detail-card" style="margin-top:12px">
        <h3>${state.language === "en" ? "Live timeline demo" : "实时进度时间轴演示"}</h3>
        <p>${state.language === "en" ? "When a real event API is connected, goals, assists and cards can be rendered here in sync with the match." : "接入真实事件 API 后，可在此同步进球、助攻、乌龙、黄牌与红牌节点。"}</p>
      </section>
      <p class="compliance-note">${t("common.disclaimer")}</p>
    `;
    openModal("matchModal", trigger);
  }

  function openTeam(code, trigger) {
    const item = teamByCode(code);
    $("#teamModalContent").innerHTML = `
      <p class="eyebrow">TEAM ${html(item.code)}</p>
      <h2 id="teamModalTitle">${item.flag} ${html(state.language === "en" ? item.nameEn : item.nameZh)}</h2>
      <div class="detail-grid">
        <article class="detail-card"><h3>${state.language === "en" ? "Unit ratings" : "球队评分"}</h3><p>${state.language === "en" ? "Attack" : "进攻"} ${item.attack} · ${state.language === "en" ? "Midfield" : "中场"} ${item.midfield} · ${state.language === "en" ? "Defence" : "防守"} ${item.defense}</p></article>
        <article class="detail-card"><h3>${state.language === "en" ? "Recent form" : "近期状态"}</h3><p>${item.form.join(" · ")}</p></article>
        <article class="detail-card"><h3>${state.language === "en" ? "Key players" : "核心球员"}</h3><p>${item.players.map(html).join("、")}</p></article>
        <article class="detail-card"><h3>${state.language === "en" ? "Model strength" : "模型优势"}</h3><p>${html(item.strength)}</p></article>
        <article class="detail-card"><h3>${state.language === "en" ? "Risk tag" : "风险标签"}</h3><p>${html(item.risk)}</p></article>
        <article class="detail-card"><h3>${state.language === "en" ? "Related matches" : "相关比赛"}</h3><p>${matches.filter((m) => m.home === code || m.away === code).slice(0, 3).map((m) => `${teamLabel(m.home)} vs ${teamLabel(m.away)}`).join("；") || "暂无相关演示赛程"}</p></article>
      </div>
    `;
    openModal("teamModal", trigger);
  }

  function openModal(id, trigger) {
    state.lastFocus = trigger || document.activeElement;
    const modal = document.getElementById(id);
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $(".modal-panel", modal).focus();
  }

  function closeModal(modal) {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (state.lastFocus && typeof state.lastFocus.focus === "function") state.lastFocus.focus();
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const matchButton = event.target.closest("[data-open-match]");
      if (matchButton) return openMatch(matchButton.dataset.openMatch, matchButton);

      const teamButton = event.target.closest("[data-open-team]");
      if (teamButton) return openTeam(teamButton.dataset.openTeam, teamButton);

      const favoriteButton = event.target.closest("[data-favorite]");
      if (favoriteButton) {
        const code = favoriteButton.dataset.favorite;
        state.favorites.has(code) ? state.favorites.delete(code) : state.favorites.add(code);
        saveFavorites();
        renderTeams();
        return showToast(state.language === "en" ? "Favorites updated" : "关注球队已更新");
      }

      const close = event.target.closest("[data-close-modal]");
      if (close) return closeModal(close.closest(".modal"));

      const faqButton = event.target.closest("[data-faq]");
      if (faqButton) return toggleFaq(faqButton);
    });

    $("#menuToggle").addEventListener("click", () => {
      const open = $("#navMenu").classList.toggle("open");
      $("#menuToggle").setAttribute("aria-expanded", String(open));
      $("#menuToggle").textContent = open ? "关闭" : "菜单";
    });

    $$("#navMenu a").forEach((link) => {
      link.addEventListener("click", () => {
        $("#navMenu").classList.remove("open");
        $("#menuToggle").setAttribute("aria-expanded", "false");
        $("#menuToggle").textContent = "菜单";
      });
    });

    $("#languageToggle").addEventListener("click", () => {
      state.language = state.language === "zh" ? "en" : "zh";
      safeStorage.set(STORAGE.language, state.language);
      applyLanguage();
      renderAll();
      updateClock();
    });

    $("#themeToggle").addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      safeStorage.set(STORAGE.theme, state.theme);
      applyTheme();
      applyLanguage();
    });

    $("#refreshButton").addEventListener("click", () => {
      updateFreshnessOnly();
      showToast(state.language === "en" ? "Demo data refreshed with local time" : "已按本地时间刷新 Demo 数据");
    });

    $("#stageFilter").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-stage]");
      if (!button) return;
      state.stage = button.dataset.stage;
      $$("#stageFilter button").forEach((item) => item.classList.toggle("active", item === button));
      renderSchedule();
    });

    $("#scheduleSearch").addEventListener("input", debounce((event) => {
      state.scheduleQuery = event.target.value;
      renderSchedule();
    }, 120));

    $("#teamSearch").addEventListener("input", debounce((event) => {
      state.teamQuery = event.target.value;
      renderTeams();
    }, 120));

    $("#musicToggle").addEventListener("click", () => {
      const list = $("#trackList");
      const shouldOpen = list.hidden;
      if (shouldOpen && !list.children.length) renderTracks();
      list.hidden = !shouldOpen;
      $("#musicToggle").setAttribute("aria-expanded", String(shouldOpen));
      $("#musicToggle").textContent = shouldOpen
        ? (state.language === "en" ? "Close playlist" : "收起歌单")
        : (state.language === "en" ? "Open playlist" : "展开歌单");
    });

    $("#backTop").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        const openModalElement = $(".modal:not([hidden])");
        if (openModalElement) closeModal(openModalElement);
        $("#navMenu").classList.remove("open");
        $("#menuToggle").setAttribute("aria-expanded", "false");
      }
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        $$("#navMenu a").forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`));
      });
    }, { rootMargin: "-35% 0px -55% 0px", threshold: 0.01 });
    $$("main section[id]").forEach((section) => observer.observe(section));
  }

  function toggleFaq(button) {
    const item = button.closest(".faq-item");
    const answer = $("p", item);
    const open = answer.hidden;
    answer.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    $("span", button).textContent = open ? "收起" : "展开";
  }

  function normalizeProbs(values) {
    const total = values.reduce((sum, value) => sum + value, 0) || 100;
    const normalized = values.map((value) => Math.round(value / total * 100));
    normalized[1] += 100 - normalized.reduce((sum, value) => sum + value, 0);
    return normalized;
  }

  function countdownText(date) {
    const diff = date.getTime() - Date.now();
    if (diff <= 0) return state.language === "en" ? "waiting for update" : "等待更新";
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return state.language === "en"
      ? `${hours}h ${minutes}m ${seconds}s`
      : `${hours}小时 ${minutes}分 ${seconds}秒`;
  }

  function updateClock() {
    $$("[data-countdown]").forEach((el) => {
      const item = matches.find((matchItem) => String(matchItem.id) === el.dataset.countdown);
      if (item) el.textContent = countdownText(item.date);
    });
    updateFreshnessOnly(false);
  }

  function updateFreshnessOnly(showStatus = true) {
    const label = formatFull(now());
    $("#lastUpdated").textContent = label;
    $("#footerUpdated").textContent = label;
    if (showStatus) $("#dataStatus").textContent = state.language === "en" ? `Updated ${label}` : `已更新 ${label}`;
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function debounce(fn, wait) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("service-worker.js").catch(() => {
      console.warn("Service worker registration failed.");
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
