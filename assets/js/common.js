(() => {
  "use strict";

  const STORAGE = {
    language: "football-model-language",
    theme: "football-model-theme",
    favorites: "football-model-favorites",
    cacheMigrated: "football-model-cache-migrated-v401"
  };
  const pages = [
    ["home", "index.html", "首页", "Home"],
    ["predictions", "predictions.html", "比赛预测", "Predictions"],
    ["schedule", "schedule.html", "完整赛程", "Schedule"],
    ["teams", "teams.html", "球队数据库", "Teams"],
    ["about", "about.html", "模型说明", "Model"]
  ];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const safeGet = (key, fallback = "") => {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  };
  const safeSet = (key, value) => {
    try { localStorage.setItem(key, value); } catch { /* localStorage may be unavailable */ }
  };
  const state = {
    page: document.body.dataset.page || "home",
    language: safeGet(STORAGE.language, "zh") === "en" ? "en" : "zh",
    theme: safeGet(STORAGE.theme, "standard") === "calm" ? "calm" : "standard",
    lastFocus: null
  };

  function store() {
    return window.FM_STORE || { matches: [], teams: [], loading: true, error: null, source: "", lastUpdated: null };
  }

  function html(value) {
    return String(value ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  function team(code) {
    const id = String(code || "").toUpperCase();
    return store().teams.find((item) => item.code === id) || {
      code: id,
      name: id || "待定",
      nameEn: id || "TBD",
      logo: "",
      group: "—",
      attack: 0,
      midfield: 0,
      defense: 0,
      form: [],
      players: [],
      strength: "数据待更新",
      risk: "临场名单待官方确认"
    };
  }

  function teamName(code) {
    const item = team(code);
    return state.language === "en" ? (item.nameEn || item.name || item.code) : (item.name || item.nameEn || item.code);
  }

  function teamLogo(code, fallbackLogo = "") {
    const item = team(code);
    const logo = fallbackLogo || item.logo;
    if (logo && /^https?:\/\//.test(logo)) return `<img class="team-logo" src="${html(logo)}" alt="" loading="lazy">`;
    if (logo && logo.length <= 6) return `<span class="flag" aria-hidden="true">${html(logo)}</span>`;
    return `<span class="team-code" aria-hidden="true">${html(item.code || "TBD")}</span>`;
  }

  function stageName(match) {
    if (!match) return state.language === "en" ? "Schedule" : "赛程";
    return state.language === "en" ? (match.stageEn || match.stage || match.stageSlug || "Schedule") : (match.stageZh || match.stage || "赛程");
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return state.language === "en" ? "Time TBC" : "时间待定";
    return new Intl.DateTimeFormat(state.language === "en" ? "en-GB" : "zh-CN", {
      timeZone: "Asia/Shanghai",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(date);
  }

  function formatFull(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return state.language === "en" ? "Pending" : "待更新";
    return new Intl.DateTimeFormat(state.language === "en" ? "en-GB" : "zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(date);
  }

  function normalize(values) {
    if (!Array.isArray(values) || values.length < 3) return null;
    const raw = values.slice(0, 3).map((value) => Number(value)).map((value) => Number.isFinite(value) ? value : 0);
    const total = raw.reduce((sum, value) => sum + value, 0);
    if (!total) return null;
    const out = raw.map((value) => Math.round(value / total * 100));
    out[1] += 100 - out.reduce((sum, value) => sum + value, 0);
    return out;
  }

  function countdown(value) {
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) return state.language === "en" ? "time TBC" : "时间待定";
    const diff = time - Date.now();
    if (diff <= 0) return state.language === "en" ? "in progress / finished" : "进行中或已结束";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return state.language === "en" ? `${h}h ${m}m` : `${h}小时 ${m}分`;
  }

  function scoreFor(match) {
    if (!match) return "预测数据待更新";
    if ((match.completed || match.live) && Number.isFinite(match.homeScore) && Number.isFinite(match.awayScore)) {
      return `${match.homeScore}–${match.awayScore}`;
    }
    return match.predictedScore || match.score || "预测数据待更新";
  }

  function probabilityMarkup(match) {
    const values = normalize(match?.probabilities || match?.probs);
    if (!values) return `<p class="muted-line">预测数据待更新</p>`;
    const [home, draw, away] = values;
    const labels = state.language === "en" ? ["Home", "Draw", "Away"] : ["主胜", "平局", "客胜"];
    return `
      <div class="probability-row" aria-label="胜平负概率">
        <span style="--w:${home}%">${labels[0]} ${home}%</span>
        <span style="--w:${draw}%">${labels[1]} ${draw}%</span>
        <span style="--w:${away}%">${labels[2]} ${away}%</span>
      </div>
    `;
  }

  function confidenceText(match) {
    return Number.isFinite(match?.confidence) ? `${match.confidence}%` : "预测数据待更新";
  }

  function matchCard(match, options = {}) {
    if (!match) return "";
    const factors = Array.isArray(match.factors) ? match.factors : [];
    return `
      <article class="match-card">
        <header><span>${html(stageName(match))}</span><time datetime="${html(match.date)}">${formatDate(match.date)}</time></header>
        <div class="match-teams">
          <b>${teamLogo(match.homeCode || match.home, match.homeLogo)} ${html(match.homeName || teamName(match.homeCode || match.home))}</b>
          <strong>${html(scoreFor(match))}</strong>
          <b>${teamLogo(match.awayCode || match.away, match.awayLogo)} ${html(match.awayName || teamName(match.awayCode || match.away))}</b>
        </div>
        ${probabilityMarkup(match)}
        <p>${state.language === "en" ? "Confidence" : "模型信心"} ${html(confidenceText(match))} · ${state.language === "en" ? "Alt" : "备选比分"} ${html(match.alternativeScore || match.altScore || "预测数据待更新")}</p>
        ${options.compact ? "" : `<div class="tag-row">${factors.map((item) => `<span class="tag">${html(item)}</span>`).join("")}</div>`}
        ${options.noButton ? "" : `<div class="hero-actions"><button class="button compact" type="button" data-open-match="${html(match.id)}">${state.language === "en" ? "Details" : "查看详情"}</button></div>`}
      </article>
    `;
  }

  function timelineMarkup(match) {
    const items = Array.isArray(match.timeline) ? match.timeline : [];
    if (!items.length) return `<p class="muted-line">暂无实时事件；以官方赛况与赛后数据为准。</p>`;
    return `
      <ol class="timeline-list">
        ${items.slice(0, 14).map((item) => {
          const type = item.type === "goal" ? "进球" : item.type === "yellow" ? "黄牌" : item.type === "red" ? "红牌" : "事件";
          const player = item.playerZh || item.player || "球员待核验";
          const assist = item.assistZh || item.assist || "";
          const assistText = item.type === "goal" && assist ? `，助攻：${html(assist)}` : "";
          const goalKind = item.type === "goal" && item.goalKind ? `（${html(item.goalKind)}）` : "";
          return `<li><time>${html(item.minute || item.displayClock || "")}</time><span>${html(type)}：${html(player)}${goalKind}${assistText}</span></li>`;
        }).join("")}
      </ol>
    `;
  }

  function openMatch(matchId, trigger) {
    const match = store().matches.find((item) => String(item.id) === String(matchId));
    const modal = $("#matchModal");
    if (!match || !modal) return;
    const probabilities = normalize(match.probabilities || match.probs);
    const probabilityText = probabilities ? `主胜 ${probabilities[0]}% · 平局 ${probabilities[1]}% · 客胜 ${probabilities[2]}%` : "预测数据待更新";
    $("#matchModalContent").innerHTML = `
      <p class="eyebrow">${html(stageName(match))} · MATCH ${html(match.matchNo || match.id)}</p>
      <h2 id="matchModalTitle">${teamLogo(match.homeCode, match.homeLogo)} ${html(match.homeName)} vs ${teamLogo(match.awayCode, match.awayLogo)} ${html(match.awayName)}</h2>
      <div class="detail-grid">
        <article class="detail-card"><h3>比分</h3><p>当前/预测：${html(scoreFor(match))} · 备选：${html(match.alternativeScore || "预测数据待更新")}</p></article>
        <article class="detail-card"><h3>胜平负概率</h3><p>${html(probabilityText)}</p></article>
        <article class="detail-card"><h3>半全场</h3><p>${html(match.halfFull || "预测数据待更新")}</p></article>
        <article class="detail-card"><h3>模型信心</h3><p>${html(confidenceText(match))}</p></article>
        <article class="detail-card"><h3>比赛状态</h3><p>${html(match.statusText || "待更新")} ${match.displayClock ? `· ${html(match.displayClock)}` : ""}</p></article>
        <article class="detail-card"><h3>场地</h3><p>${html(match.venue || "待官方确认")}</p></article>
      </div>
      <section class="detail-card timeline-card">
        <h3>实时/赛后时间轴</h3>
        ${timelineMarkup(match)}
      </section>
      <p class="compliance-note modal-note">模型演示，不构成投注或财务建议。临场阵容、官方公告与实际赛果优先。</p>
    `;
    openModal(modal, trigger);
  }

  function openModal(modal, trigger) {
    state.lastFocus = trigger || document.activeElement;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $(".modal-panel", modal)?.focus();
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    state.lastFocus?.focus?.();
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2500);
  }

  function dataStatusText() {
    const s = store();
    if (s.loading && !s.matches.length) return state.language === "en" ? "Loading data" : "数据读取中";
    if (s.error && s.source === "error") return state.language === "en" ? "Data error" : "数据加载失败";
    if (s.error) return state.language === "en" ? "Snapshot data" : "最近快照";
    return s.source ? `${s.source} · ${formatFull(s.lastUpdated)}` : (state.language === "en" ? "Ready" : "已同步");
  }

  function updateDataStatus() {
    const el = $("#dataStatus");
    if (el) el.textContent = dataStatusText();
    const footerTime = $("#footerUpdated");
    if (footerTime) footerTime.textContent = formatFull(store().lastUpdated || new Date());
  }

  function renderHeader() {
    const root = $("[data-site-header]");
    if (!root) return;
    root.innerHTML = `
      <nav class="nav-shell" aria-label="主要导航">
        <a class="brand" href="index.html" aria-label="足球预测大模型首页"><span class="brand-mark" aria-hidden="true">FM</span><span><strong>足球预测大模型</strong><small>World Cup 2026 Model</small></span></a>
        <button class="menu-toggle" id="menuToggle" type="button" aria-label="打开导航菜单" aria-expanded="false">菜单</button>
        <div class="nav-menu" id="navMenu">${pages.map(([key, href, zh, en]) => `<a class="${state.page === key ? "active" : ""}" href="${href}" data-zh="${zh}" data-en="${en}">${state.language === "en" ? en : zh}</a>`).join("")}</div>
        <div class="nav-tools">
          <button class="tool-button" id="languageToggle" type="button" aria-label="切换语言">${state.language === "en" ? "EN" : "中文"}</button>
          <button class="tool-button" id="themeToggle" type="button" aria-label="切换主题">${state.theme === "calm" ? "舒缓" : "标准"}</button>
          <button class="tool-button" id="refreshData" type="button" aria-label="同步实时数据">同步</button>
          <span class="data-status" id="dataStatus">${dataStatusText()}</span>
        </div>
      </nav>
    `;
  }

  function renderFooter() {
    const root = $("[data-site-footer]");
    if (!root) return;
    root.innerHTML = `
      <div class="section-shell footer-grid">
        <div><a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">FM</span><span><strong>足球预测大模型</strong><small>World Cup 2026 Model</small></span></a><p>用清晰的数据表达，帮助球迷理解赛程、球队和比赛变量。</p><div class="footer-links">${pages.map(([, href, zh]) => `<a href="${href}">${zh}</a>`).join("")}</div></div>
        <div><h2>合规说明</h2><p>模型演示，不构成投注或财务建议。临场阵容、官方公告与实际赛果优先。</p></div>
        <div><h2>最后更新</h2><p><time id="footerUpdated">${formatFull(store().lastUpdated || new Date())}</time></p><button class="back-top" id="backTop" type="button" aria-label="返回顶部">返回顶部</button></div>
      </div>
    `;
  }

  function applyStaticLanguage() {
    $$("[data-zh][data-en]").forEach((element) => {
      const value = state.language === "en" ? element.dataset.en : element.dataset.zh;
      if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") element.placeholder = value;
      else element.textContent = value;
    });
  }

  async function migrateCacheOnce() {
    if (safeGet(STORAGE.cacheMigrated)) {
      if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js").catch(() => {});
      return;
    }
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith("football-model")).map((key) => caches.delete(key)));
      }
      safeSet(STORAGE.cacheMigrated, "1");
      if ("serviceWorker" in navigator) await navigator.serviceWorker.register("service-worker.js");
    } catch (error) {
      console.warn("Cache migration skipped:", error.message);
    }
  }

  function bindCommon() {
    document.addEventListener("click", (event) => {
      const close = event.target.closest("[data-close-modal]");
      if (close) return closeModal(close.closest(".modal"));
      if (event.target.classList.contains("modal-backdrop")) return closeModal(event.target.closest(".modal"));
      const openMatchButton = event.target.closest("[data-open-match]");
      if (openMatchButton) return openMatch(openMatchButton.dataset.openMatch, openMatchButton);
    });
    $("#menuToggle")?.addEventListener("click", () => {
      const menu = $("#navMenu");
      const open = menu.classList.toggle("open");
      document.body.classList.toggle("nav-open", open);
      $("#menuToggle").setAttribute("aria-expanded", String(open));
      $("#menuToggle").textContent = open ? "关闭" : "菜单";
    });
    $$("#navMenu a").forEach((link) => link.addEventListener("click", () => {
      $("#navMenu")?.classList.remove("open");
      document.body.classList.remove("nav-open");
    }));
    $("#languageToggle")?.addEventListener("click", () => {
      state.language = state.language === "zh" ? "en" : "zh";
      safeSet(STORAGE.language, state.language);
      renderHeader();
      renderFooter();
      bindCommon();
      applyStaticLanguage();
      updateDataStatus();
      window.dispatchEvent(new CustomEvent("fm:language"));
    });
    $("#themeToggle")?.addEventListener("click", () => {
      state.theme = state.theme === "standard" ? "calm" : "standard";
      safeSet(STORAGE.theme, state.theme);
      document.documentElement.dataset.theme = state.theme;
      renderHeader();
      bindCommon();
    });
    $("#refreshData")?.addEventListener("click", async () => {
      const button = $("#refreshData");
      if (button) {
        button.disabled = true;
        button.textContent = "同步中";
      }
      try { await window.FM_DATA_SERVICE?.loadData(true); }
      finally {
        if (button) {
          button.disabled = false;
          button.textContent = "同步";
        }
        updateDataStatus();
      }
    });
    $("#backTop")?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeModal($(".modal:not([hidden])"));
        $("#navMenu")?.classList.remove("open");
        document.body.classList.remove("nav-open");
      }
    });
  }

  function initCommon() {
    document.documentElement.dataset.theme = state.theme;
    renderHeader();
    renderFooter();
    applyStaticLanguage();
    bindCommon();
    updateDataStatus();
    migrateCacheOnce();
    setInterval(updateDataStatus, 60000);
  }

  window.addEventListener("fm:data-ready", updateDataStatus);
  window.addEventListener("fm:data-updated", updateDataStatus);
  window.FM = {
    $, $$, html, state, STORAGE, safeGet, safeSet, store, team, teamName, teamLogo, stageName,
    formatDate, formatFull, countdown, normalize, matchCard, openMatch, showToast, scoreFor,
    confidenceText, updateDataStatus
  };
  document.addEventListener("DOMContentLoaded", initCommon);
})();
