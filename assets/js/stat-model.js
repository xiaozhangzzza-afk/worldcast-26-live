/* Independently implemented Poisson baseline; no third-party forecasts or synthetic fixtures. */
(() => {
  'use strict';
  const VERSION='local-poisson-v1',key=c=>String(c||'').split(':').at(-1),outcome=d=>d>0?0:d===0?1:2;
  function pmf(lambda,max=12){const p=[Math.exp(-lambda)];for(let k=1;k<=max;k++)p.push(p[k-1]*lambda/k);return p;}
  function percentages(values){const total=values.reduce((a,b)=>a+b,0);if(!(total>0))return null;const n=values.map(v=>Math.round(v/total*10000));n[n.indexOf(Math.max(...n))]+=10000-n.reduce((a,b)=>a+b,0);return n.map(v=>v/100);}
  function forecast(home,away){
    if(!Number.isFinite(home)||!Number.isFinite(away)||home<=0||away<=0||home>4||away>4)return null;
    const h=pmf(home),a=pmf(away),scores=[],result=[0,0,0];for(let i=0;i<h.length;i++)for(let j=0;j<a.length;j++){const p=h[i]*a[j];scores.push({score:i+'–'+j,p});result[outcome(i-j)]+=p;}
    const diff=lambda=>{const hp=pmf(lambda[0]),ap=pmf(lambda[1]),map=new Map();for(let i=0;i<hp.length;i++)for(let j=0;j<ap.length;j++)map.set(i-j,(map.get(i-j)||0)+hp[i]*ap[j]);return map;};
    // Uniform-rate, independent halves. HT/FT is joint, not a product of HT and FT marginals.
    const first=diff([home*.5,away*.5]),second=diff([home*.5,away*.5]),joint=Array(9).fill(0);
    for(const [d1,p1]of first)for(const [d2,p2]of second)joint[outcome(d1)*3+outcome(d1+d2)]+=p1*p2;
    scores.sort((x,y)=>y.p-x.p||x.score.localeCompare(y.score));return {probabilities:percentages(result),predictedScore:scores[0].score,alternativeScore:scores[1].score,htft:percentages(joint),lambdaHome:home,lambdaAway:away,modelVersion:VERSION};
  }
  function history(matches,now){return [...new Map(matches.filter(m=>m.competitionId!=='fifa.world'&&new Date(m.date).getTime()<now&&globalThis.FM_ANALYTICS.evaluationResult(m)).map(m=>[String(m.id),{...m,...globalThis.FM_ANALYTICS.evaluationResult(m)}])).values()].sort((a,b)=>new Date(b.date)-new Date(a.date));}
  function build(match,completed,now){
    if(match.completed||match.live||new Date(match.date).getTime()<=now||match.competitionId==='fifa.world')return null;
    const pool=completed.filter(m=>m.competitionId===match.competitionId);if(pool.length<20)return null;
    const recent=code=>completed.filter(m=>[key(m.homeCode),key(m.awayCode)].includes(key(code))).slice(0,8),h=recent(match.homeCode),a=recent(match.awayCode);if(h.length<3||a.length<3)return null;
    const baseH=pool.reduce((s,m)=>s+m.homeScore,0)/pool.length,baseA=pool.reduce((s,m)=>s+m.awayScore,0)/pool.length,base=(baseH+baseA)/2;if(base<=0||baseH<=0||baseA<=0)return null;
    const rate=(list,code,conceded)=>{const sum=list.reduce((s,m)=>{const home=key(m.homeCode)===key(code);return s+(conceded?(home?m.awayScore:m.homeScore):(home?m.homeScore:m.awayScore))},0);return (sum+6*base)/(list.length+6)/base;};
    const lh=Math.max(.15,Math.min(4,baseH*rate(h,match.homeCode,false)*rate(a,match.awayCode,true))),la=Math.max(.15,Math.min(4,baseA*rate(a,match.awayCode,false)*rate(h,match.homeCode,true)));
    return {...forecast(lh,la),homeSample:h.length,awaySample:a.length,competitionSample:pool.length,trainingThrough:completed[0]?.date||null,source:'ESPN completed regulation-time results',assumption:'Independent Poisson; uniform 50/50 half intensity; six-match mean shrinkage; no injuries or lineups'};
  }
  function enrich(matches,now=Date.now()){
    const completed=history(matches,now);
    return matches.map(m=>{const clean={...m};if(clean.predictionSource==='local-poisson'){clean.predictedScore='';clean.alternativeScore='';clean.probabilities=null;clean.confidence=null;clean.factors=[];delete clean.predictionSource;}
      delete clean.localPrediction;const model=build(clean,completed,now);if(!model)return clean;
      clean.localPrediction=model;
      if(!clean.predictedScore&&!clean.probabilities){Object.assign(clean,{predictedScore:model.predictedScore,alternativeScore:model.alternativeScore,probabilities:model.probabilities,confidence:null,predictionSource:'local-poisson',factors:['本地泊松统计参考，非外部专家预测','真实完赛样本；未考虑阵容伤停；未经历史校准']});}
      else clean.predictionSource=clean.predictionSource||'public-odds';
      return clean;
    });
  }
  globalThis.FM_STAT_MODEL={VERSION,pmf,forecast,enrich,build,history};
})();
