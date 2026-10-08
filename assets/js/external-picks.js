/* Legacy API name retained for compatibility. This is a LOCAL baseline, not external expert picks. */
(() => {
  'use strict';
  const symbols=['1','X','2'];
  function get(match){const model=match?.localPrediction;if(!model?.htft||model.htft.length!==9||match.completed||match.live||new Date(match.date)<=new Date())return null;const index=model.htft.indexOf(Math.max(...model.htft));return {ht:symbols[Math.floor(index/3)],ft:symbols[index%3],probability:model.htft[index],matrix:model.htft,model};}
  function label(match,lang='zh'){const r=get(match);if(!r)return lang==='en'?'Insufficient samples for HT/FT':'半全场样本不足，暂不计算';const dict=lang==='en'?{'1':'Home','X':'Draw','2':'Away'}:{'1':'主胜','X':'平','2':'客胜'};return `${dict[r.ht]} / ${dict[r.ft]}`;}
  function markup(match){const r=get(match),en=window.FM?.state.language==='en',t=(zh,eng)=>en?eng:zh;
    if(match?.completed||match?.live)return `<p>${t('比赛已开赛，不补生成赛前半全场预测。','Match started; pre-match HT/FT picks are not backfilled.')}</p>`;
    const labels=en?['Home','Draw','Away']:['主胜','平','客胜'];
    return `<p><strong>${label(match,en?'en':'zh')}</strong></p>${r?`<p>${t('该组合统计概率','Estimated joint probability')} ${r.probability}% · ${t('不是历史命中率','not historical accuracy')}</p><p class="history-note">${t('免费本地泊松模型 · 完赛数据来自ESPN','Free local Poisson baseline · completed results from ESPN')} · ${t('主/客队样本','Home/away samples')} ${r.model.homeSample}/${r.model.awaySample} · ${t('赛事基线样本','Competition baseline')} ${r.model.competitionSample}</p><details class="htft-details"><summary>${t('查看全部9种组合','All nine combinations')}</summary><div class="htft-grid">${r.matrix.map((p,i)=>`<span>${labels[Math.floor(i/3)]} / ${labels[i%3]}<b>${p}%</b></span>`).join('')}</div></details><p class="history-note">${t('假设上下半场各50%进球强度且相互独立；强度由真实90分钟赛果估计。未考虑首发、伤停和战术，不是外部专家预测，未经回测校准。','Assumes independent halves with 50/50 goal intensity, estimated from regulation-time results. No lineups, injuries or tactics; not expert picks and not backtest-calibrated.')}</p>`:`<p class="history-note">${t('至少需要两队各3场有效完赛样本和赛事20场基线；目前数据不足，不输出虚构预测。','Requires three completed samples per club and 20 competition samples; no fabricated output when insufficient.')}</p>`}<a class="fixture-link" href="about.html#statistical-model">${t('查看方法、来源与边界','Method, sources and limitations')} ↗</a>`;
  }
  window.FM_EXTERNAL_PICKS={get,label,markup};
})();
