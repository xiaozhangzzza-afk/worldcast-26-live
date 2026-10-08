(() => {
  'use strict';
  const validScore = value => /^\d+\s*[-–:]\s*\d+$/.test(String(value || ''));
  const scoreKey = value => String(value).match(/\d+/g)?.slice(0,2).map(Number).join('-') || '';
  const official = m => m?.completed && Number.isInteger(m.homeScore) && m.homeScore >= 0 && Number.isInteger(m.awayScore) && m.awayScore >= 0;
  const outcome = (home,away) => home>away ? 0 : home===away ? 1 : 2;
  function evaluationResult(m){
    if(!official(m))return null;
    if(!m.isCup||m.scoreScope==='regulation')return {homeScore:m.homeScore,awayScore:m.awayScore};
    return Number.isInteger(m.regulationHomeScore)&&Number.isInteger(m.regulationAwayScore)?{homeScore:m.regulationHomeScore,awayScore:m.regulationAwayScore}:null;
  }
  function validRecord(r) {
    return r && new Date(r.capturedAt)<new Date(r.date) && validScore(r.predictedScore) && Array.isArray(r.probabilities) && r.probabilities.length===3 && r.probabilities.every(n=>Number.isFinite(n)&&n>=0&&n<=100) && Math.abs(r.probabilities.reduce((a,b)=>a+b,0)-100)<0.01;
  }
  function capture(records,matches,now=new Date().toISOString()) {
    const archive=new Map((records||[]).filter(validRecord).map(r=>[String(r.id),r]));
    for(const m of matches){
      const existing=archive.get(String(m.id));
      if(!m.completed&&!m.live&&new Date(m.date)>new Date(now)&&(!existing||new Date(existing.date)>new Date(now))){
        const record={id:String(m.id),competitionId:m.competitionId,date:m.date,homeCode:m.homeCode,awayCode:m.awayCode,homeName:m.homeNameEn||m.homeName,awayName:m.awayNameEn||m.awayName,predictedScore:m.predictedScore,alternativeScore:m.alternativeScore||'',probabilities:m.probabilities,capturedAt:now,modelVersion:'odds-rule-v1',basis:'public pre-match odds + illustrative score rules',isCup:Boolean(m.isCup)};
        if(validRecord(record)){
          const unchanged=existing&&existing.date===record.date&&existing.predictedScore===record.predictedScore&&existing.alternativeScore===record.alternativeScore&&JSON.stringify(existing.probabilities)===JSON.stringify(record.probabilities);
          archive.set(record.id,unchanged?existing:record);
        }
      }
      const r=archive.get(String(m.id));
      if(r&&official(m)&&r.homeCode===m.homeCode&&r.awayCode===m.awayCode){const result=evaluationResult(m);archive.set(r.id,{...r,result,excludedReason:result?null:'90-minute score unavailable',settledAt:r.settledAt||now});}
    }
    return [...archive.values()].sort((a,b)=>new Date(a.date)-new Date(b.date));
  }
  function results(records,matches){
    const current=new Map(matches.map(m=>[String(m.id),m]));
    return (records||[]).filter(validRecord).flatMap(r=>{
      const m=current.get(String(r.id));
      const result=official(m)&&m.homeCode===r.homeCode&&m.awayCode===r.awayCode?evaluationResult(m):r.result;
      if(!Number.isInteger(result?.homeScore)||!Number.isInteger(result?.awayScore))return [];
      const key=`${result.homeScore}-${result.awayScore}`;
      return [{...r,result,win:r.probabilities.indexOf(Math.max(...r.probabilities))===outcome(result.homeScore,result.awayScore),exact:scoreKey(r.predictedScore)===key,alternative:scoreKey(r.predictedScore)===key||scoreKey(r.alternativeScore)===key}];
    });
  }
  function distribution(matches){
    const completed=[...new Map(matches.filter(official).map(m=>[String(m.id),m])).values()];
    const counts=new Map();for(const m of completed){const key=`${m.homeScore}-${m.awayScore}`;counts.set(key,(counts.get(key)||0)+1);}
    return {total:completed.length,rows:[...counts].map(([score,count])=>({score,count,share:Math.round(count/completed.length*1000)/10})).sort((a,b)=>b.count-a.count||a.score.localeCompare(b.score)),start:completed.map(m=>m.date).sort()[0],end:completed.map(m=>m.date).sort().at(-1)};
  }
  function freshness(meta,live=false,now=Date.now()){
    if(!meta)return {state:'unknown',age:null};
    if(meta.mode==='archive')return {state:'archive',age:null};
    const age=meta.lastSuccessAt?Math.max(0,now-new Date(meta.lastSuccessAt).getTime()):null;
    return {state:meta.mode==='snapshot'||meta.mode==='failed'?'snapshot':age===null?'unknown':age>(live?60000:600000)?'stale':meta.mode==='partial'?'partial':'fresh',age};
  }
  const api={capture,results,distribution,freshness,validRecord,evaluationResult};
  globalThis.FM_ANALYTICS=api;
  if(typeof window!=='undefined'){
    window.FM_HISTORY={records:[],loading:true,error:null};
    let loading=false;
    const load=async()=>{
      if(loading)return;loading=true;
      try{const response=await fetch('assets/data/prediction-history.json?_fm='+Date.now(),{cache:'no-store'});if(!response.ok)throw Error('History unavailable');const data=await response.json();if(!Array.isArray(data.records))throw Error('Invalid history');window.FM_HISTORY.records=data.records.filter(validRecord);window.FM_HISTORY.error=null;}
      catch(e){window.FM_HISTORY.error=e.message;}
      finally{loading=false;window.FM_HISTORY.loading=false;window.dispatchEvent(new CustomEvent('fm:history-ready'));}
    };
    window.FM_HISTORY.load=load;
    document.addEventListener('DOMContentLoaded',()=>{load();setInterval(()=>{if(!document.hidden)load();},300000);});
  }
})();
