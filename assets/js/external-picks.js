(() => {
  'use strict';
  const source='https://www.forebet.com/en/football-predictions/predictions-htft/2026-09-18/by-league';
  const records=[
    {id:'401879275',homeCode:'eng.1:337',awayCode:'eng.1:363',date:'2026-09-18T19:00:00.000Z',ht:'X',ft:'X',probability:16},
    {id:'401884790',homeCode:'ger.1:132',awayCode:'ger.1:598',date:'2026-09-18T18:30:00.000Z',ht:'1',ft:'1',probability:53}
  ];
  function get(match){return records.find(r=>r.id===String(match?.id)&&r.homeCode===match.homeCode&&r.awayCode===match.awayCode&&new Date(r.date).getTime()===new Date(match.date).getTime()&&!match.completed&&!match.live&&Date.now()<new Date(r.date).getTime())||null;}
  function label(match,lang='zh'){const r=get(match);if(!r)return lang==='en'?'No verified external pick':'暂无已核验外部预测';const dict=lang==='en'?{'1':'Home','X':'Draw','2':'Away'}:{'1':'胜','X':'平','2':'负'};return `${dict[r.ht]} / ${dict[r.ft]}`;}
  function markup(match){const r=get(match),en=window.FM?.state.language==='en';return `<p>${label(match,en?'en':'zh')}</p>${r?`<p>${en?'Source estimate':'来源给出的组合概率'}：${r.probability}% · ${en?'not historical accuracy':'非历史命中率'}</p>`:''}<p class="light-note">Forebet · ${r?(en?'Manually checked 2026-09-17; not an automatic subscription.':'人工核验于2026-09-17；非自动订阅。'):(en?'No current match-specific pick verified. Follow the source link; automatic imports are not enabled.':'当前未核验到本场有效预测，可查看原站；尚未接通自动导入。')}</p><a class="fixture-link" href="${r?source:'https://www.forebet.com/en/football-tips-and-predictions-for-today/predictions-ht-ft'}" target="_blank" rel="noopener noreferrer">${en?'Read original HT/FT predictions ↗':'查看半全场原始预测 ↗'}</a>`;}
  window.FM_EXTERNAL_PICKS={get,label,markup};
})();
