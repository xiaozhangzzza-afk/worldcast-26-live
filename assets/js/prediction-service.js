(() => {
  "use strict";
  function normalize(value) {
    return window.FM_NORMALIZER?.probabilities(value) || null;
  }
  function fromMatch(match) {
    if (!match || (!match.predictedScore && !match.probabilities && match.confidence === null)) return null;
    return {
      predictedScore: match.predictedScore || "",
      alternativeScore: match.alternativeScore || "",
      probabilities: normalize(match.probabilities),
      confidence: match.confidence !== null && match.confidence !== "" && Number.isFinite(Number(match.confidence)) ? Number(match.confidence) : null,
      factors: Array.isArray(match.factors) ? match.factors : [],
      halfFull: match.halfFull || ""
    };
  }
  window.FM_PREDICTION_SERVICE = { normalize, fromMatch };
})();
