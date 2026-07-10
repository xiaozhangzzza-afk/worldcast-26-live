(() => {
  "use strict";

  const STORAGE = { language:"football-model-language", theme:"football-model-theme", favorites:"football-model-favorites" };
  const pages = [
    ["home","index.html","首页","Home"],
    ["predictions","predictions.html","比赛预测","Predictions"],
    ["schedule","schedule.html","完整赛程","Schedule"],
    ["teams","teams.html","球队数据库","Teams"],
    ["about","about.html","模型说明","Model"]
  ];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const safeGet = (key, fallback = "") => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
  const safeSet = (key, value) => { try { localStorage.setItem(key, value); } catch { /* unavailable */ } };
  const state = {
    page: document.body.dataset.page || "home",
    language: safeGet(STORAGE.language, "zh") === "en" ? "en" : "zh",
    theme: safeGet(STORAGE.theme, "standard") === "calm" ? "calm" : "standard",
    lastFocus: null
  };

  function html(value) {
    return String(value ?? "").replace(/[&<>"']/g, (m) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m]));
  }
  function team(code) { return window.FM_DATA.teams.find((item) => item.code === code) || window.FM_DATA.teams[0]; }
  function teamName(code) { const item = team(code); return state.language === "en" ? item.en : item.zh; }
  function stageName(match) { return state.language === "en" ? match.stageEn : match.stageZh; }
  function formatDate(value) {
    return new Intl.DateTimeFormat(state.language === "en" ? "en-GB" : "zh-CN", { timeZone:"Asia/Shanghai", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit", hour12:false }).format(new Date(value));
  }
  function formatFull(value = new Date()) {
    return new Intl.DateTimeFormat(state.language === "en" ? "en-GB" : "zh-CN", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false }).format(value);
  }
  function normalize(values) {
    const total = values.reduce((sum, value) => sum + value, 0) || 100;
    const out = values.map((value) => Math.round(value / total * 100));
    out[1] += 100 - out.reduce((sum, value) => sum + value, 0);
    return out;
  }
  function countdown(value) {
    const diff = new Date(value).getTime() - Date.now();
    if (diff <= 0) return state.language === "en" ? "waiting update" : "等待更新";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return state.language === "en" ? `${h}h ${m}m` : `${h}小时 ${m}分`;
  }
  function matchCard(match, options = {}) {
    const [home, draw, away] = normalize(match.probs);
    return `
      <article class="match-card">
        <header><span>${html(stageName(match))}</span><time datetime="${match.date}">${formatDate(match.date)}</time></header>
        <div class="match-teams">
          <b>${team(match.home).flag} ${html(teamName(match.home))}</b>
          <strong>${html(match.score)}</strong>
          <b>${team(match.away).flag} ${html(teamName(match.away))}</b>
        </div>
        <div class="probability-row" aria-label="胜平负概率">
          <span style="--w:${home}%">${state.language === "en" ? "Home" : "主胜"} ${home}%</span>
          <span style="--w:${draw}%">${state.language === "en" ? "Draw" : "平局"} ${draw}%</span>
          <span style="--w:${away}%">${state.language === "en" ? "Away" : "客胜"} ${away}%</span>
        </div>
        <p>${state.language === "en" ? "Confidence" : "模型信心"} ${match.confidence}% · ${state.language === "en" ? "Alt" : "备选比分"} ${html(match.altScore)}</p>
        ${options.compact ? "" : `<div class="tag-row">${match.factors.map((item) => `<span class="tag">${html(item)}</span>`).join("")}</div>`}
        ${options.noButton ? "" : `<div class="hero-actions"><button class="button compact" type="button" data-open-match="${match.id}">${state.language === "en" ? "Details" : "查看详情"}</button></div>`}
      </article>
    `;
  }
  function openMatch(matchId, trigger) {
    const match = window.FM_DATA.matches.find((item) => String(item.id) === String(matchId));
    const modal = $("#matchModal");
    if (!match || !modal) return;
    const [home, draw, away] = normalize(match.probs);
    $("#matchModalContent").innerHTML = `
      <p class="eyebrow">${html(stageName(match))} · MATCH ${match.id}</p>
      <h2 id="matchModalTitle">${team(match.home).flag} ${html(teamName(match.home))} vs ${team(match.away).flag} ${html(teamName(match.away))}</h2>
      <div class="detail-grid">
        <article class="detail-card"><h3>比分预测</h3><p>主比分 ${html(match.score)} · 备选 ${html(match.altScore)}</p></article>
        <article class="detail-card"><h3>胜平负概率</h3><p>主胜 ${home}% · 平局 ${draw}% · 客胜 ${away}%</p></article>
        <article class="detail-card"><h3>半全场</h3><p>${html(match.halfFull)}</p></article>
        <article class="detail-card"><h3>模型信心</h3><p>${match.confidence}%</p></article>
        <article class="detail-card"><h3>关键因素</h3><p>${match.factors.map(html).join("、")}</p></article>
        <article class="detail-card"><h3>风险边界</h3><p>临场阵容、伤病和官方公告可能在开赛前变化。</p></article>
      </div>
      <p class="compliance-note" style="color:var(--text-muted-dark)">模型演示，不构成投注或财务建议。临场阵容、官方公告与实际赛果优先。</p>
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
          <span class="data-status" id="dataStatus">${state.language === "en" ? "Demo data" : "演示数据"}</span>
        </div>
      </nav>
    `;
  }
  function renderFooter() {
    const root = $("[data-site-footer]");
    if (!root) return;
    root.innerHTML = `
      <div class="section-shell footer-grid">
        <div><a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">FM</span><span><strong>足球预测大模型</strong><small>World Cup 2026 Model</small></span></a><p>层级清晰的世界杯预测数据产品原型，适合长期浏览与后续 API 接入。</p><div class="footer-links">${pages.map(([,href,zh]) => `<a href="${href}">${zh}</a>`).join("")}</div></div>
        <div><h2>合规说明</h2><p>模型演示，不构成投注或财务建议。临场阵容、官方公告与实际赛果优先。</p></div>
        <div><h2>最后更新</h2><p><time id="footerUpdated">${formatFull()}</time></p><button class="back-top" id="backTop" type="button" aria-label="返回顶部">返回顶部</button></div>
      </div>
    `;
  }
  function applyStaticLanguage() {
    $$("[data-zh][data-en]").forEach((element) => {
      const value = state.language === "en" ? element.dataset.en : element.dataset.zh;
      if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
        element.placeholder = value;
      } else {
        element.textContent = value;
      }
    });
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
      window.dispatchEvent(new CustomEvent("fm:language"));
    });
    $("#themeToggle")?.addEventListener("click", () => {
      state.theme = state.theme === "standard" ? "calm" : "standard";
      safeSet(STORAGE.theme, state.theme);
      document.documentElement.dataset.theme = state.theme;
      renderHeader();
      bindCommon();
    });
    $("#backTop")?.addEventListener("click", () => window.scrollTo({ top:0, behavior:"smooth" }));
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
    setInterval(() => {
      const footerTime = $("#footerUpdated");
      if (footerTime) footerTime.textContent = formatFull();
    }, 60000);
  }

  window.FM = { $, $$, html, state, STORAGE, safeGet, safeSet, team, teamName, stageName, formatDate, formatFull, countdown, normalize, matchCard, openMatch, showToast };
  document.addEventListener("DOMContentLoaded", initCommon);
})();
