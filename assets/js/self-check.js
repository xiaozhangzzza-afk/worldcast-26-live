(() => {
  "use strict";
  window.FM_SELF_CHECK = function runSelfCheck() {
    const store = window.FM_STORE;
    const problems = [];
    if (!store) problems.push("FM_STORE missing");
    if (store && !Array.isArray(store.matches)) problems.push("matches is not an array");
    if (store && !Array.isArray(store.teams)) problems.push("teams is not an array");
    const ids = new Set();
    (store?.matches || []).forEach((match) => {
      if (ids.has(match.id)) problems.push(`duplicate match id: ${match.id}`);
      ids.add(match.id);
      if (!match.date || Number.isNaN(new Date(match.date).getTime())) problems.push(`invalid date: ${match.id}`);
      if (match.completed && match.live) problems.push(`completed/live conflict: ${match.id}`);
      if (match.probabilities && match.probabilities.reduce((sum, value) => sum + value, 0) !== 100) problems.push(`probability total: ${match.id}`);
    });
    if (problems.length) console.warn("Football model self-check:", problems);
    return problems;
  };
})();
