(() => {
  "use strict";
  function renderFaq() {
    const root = FM.$("#faqList");
    if (!root) return;
    root.innerHTML = window.FM_DATA.faq.map(([question, answer], index) => `
      <article class="faq-item">
        <button type="button" aria-expanded="${index === 0 ? "true" : "false"}" data-faq="${index}">
          <strong>${FM.html(question)}</strong><span>${index === 0 ? "收起" : "展开"}</span>
        </button>
        <p ${index === 0 ? "" : "hidden"}>${FM.html(answer)}</p>
      </article>
    `).join("");
  }
  function bind() {
    FM.$("#faqList")?.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-faq]");
      if (!button) return;
      const item = button.closest(".faq-item");
      const answer = FM.$("p", item);
      const open = answer.hidden;
      answer.hidden = !open;
      button.setAttribute("aria-expanded", String(open));
      FM.$("span", button).textContent = open ? "收起" : "展开";
    });
  }
  document.addEventListener("DOMContentLoaded", () => { renderFaq(); bind(); });
})();
