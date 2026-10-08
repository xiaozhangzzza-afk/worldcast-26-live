(() => {
  'use strict';
  function assess(store,now=Date.now()){
    const rows=(store.competitions||[]).filter(c=>!c.compact).map(c=>{const matches=(store.matches||[]).filter(m=>m.competitionId===c.id),live=matches.some(m=>m.live),meta=store.freshness?.[c.id],fresh=globalThis.FM_ANALYTICS.freshness(meta,live,now),updated=meta?.sourceUpdatedAt?new Date(meta.sourceUpdatedAt).getTime():NaN,sourceAge=Number.isFinite(updated)?Math.max(0,now-updated):null;
      return {id:c.id,live,state:sourceAge!==null&&live&&sourceAge>120000&&['fresh','partial'].includes(fresh.state)?'provider-stale':fresh.state,requestAge:fresh.age,sourceAge,responseTimeMs:meta?.responseTimeMs??null};});
    const upcoming=(store.matches||[]).filter(m=>m.competitionId!=='fifa.world'&&!m.completed&&!m.live&&new Date(m.date).getTime()>now);
    return {rows,online:rows.filter(r=>['fresh','partial'].includes(r.state)).length,total:rows.length,warnings:rows.filter(r=>['provider-stale','stale','snapshot'].includes(r.state)).length,upcoming:upcoming.length,publicPredictions:upcoming.filter(m=>m.predictedScore&&m.predictionSource!=='local-poisson').length,localPredictions:upcoming.filter(m=>m.predictionSource==='local-poisson').length,htft:upcoming.filter(m=>m.localPrediction?.htft?.length===9).length,unknownSourceTimes:rows.filter(r=>r.sourceAge===null).length};
  }
  globalThis.FM_QUALITY={assess};
  if(typeof document==='undefined')return;
  function render(){
    const s=window.FM?.store();if(!s)return;const q=assess(s),en=FM.state.language==='en',t=(zh,eng)=>en?eng:zh;
    let root=document.querySelector('#qualityBar');if(!root){root=document.createElement('div');root.id='qualityBar';root.className='quality-bar section-shell';root.setAttribute('role','status');document.querySelector('[data-site-header]')?.after(root);}
    const loading=['idle','loading'].includes(s.status)&&!s.matches.length;
    root.dataset.state=s.status==='error'?'error':q.warnings?'warning':'checked';root.innerHTML=loading?`<p>${t('赛程与数据源核验中…','Checking fixtures and sources…')}</p>`:`<strong>${s.status==='error'?t('数据暂不可用','Data unavailable'):q.warnings?t('部分数据过旧或使用快照','Some data overdue or cached'):t('接口已核验 · 非逐秒直播','Sources checked · not second-by-second live')}</strong><span>${t('近期公开预测','Public predictions')} ${q.publicPredictions}/${q.upcoming}</span><span>${t('本地统计补充','Local statistical fallback')} ${q.localPredictions}</span><span>${t('半全场统计参考','HT/FT baseline')} ${q.htft}</span><small>${q.unknownSourceTimes?t('源未提供更新时间，无法确认真实赛况延迟；刷新成功不代表源已更新。','Source timestamps are missing; actual live latency cannot be verified. Successful requests do not mean the source changed.'):t('核验时间、请求耗时与源数据时间分开统计。','Request time, response duration and source time are distinct.')}</small>`;
    const panel=document.querySelector('#dataFreshness');if(panel){let details=panel.querySelector('.quality-details');if(!details){details=document.createElement('div');details.className='quality-details';panel.append(details);}details.innerHTML=q.rows.map(r=>`<p>${FM.html((s.competitions||[]).find(c=>c.id===r.id)?.[en?'nameEn':'shortZh']||r.id)} · ${t('请求耗时','Response time')} ${Number.isFinite(r.responseTimeMs)?(r.responseTimeMs/1000).toFixed(2)+'s':t('未记录','not recorded')} · ${t('源数据年龄','Source age')} ${r.sourceAge!==null?Math.floor(r.sourceAge/1000)+'s':t('未知，不能用请求时间代替','unknown, not request time')}${r.state==='provider-stale'?' · '+t('比赛源数据已过旧','Live source is stale'):''}</p>`).join('');}
  }
  document.addEventListener('DOMContentLoaded',()=>{render();setInterval(()=>{if(!document.hidden)render()},15000)});['fm:data-ready','fm:data-updated','fm:data-loading','fm:data-error','fm:language'].forEach(e=>window.addEventListener(e,render));
})();
