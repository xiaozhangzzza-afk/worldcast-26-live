import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
await import('../assets/js/analytics.js');await import('../assets/js/stat-model.js');await import('../assets/js/quality.js');await import('../assets/js/favorites.js');
const model=FM_STAT_MODEL.forecast(1.8,.9);assert.equal(model.htft.length,9);assert.ok(model.htft.every(p=>p>=0&&p<=100));assert.ok(Math.abs(model.htft.reduce((a,b)=>a+b,0)-100)<1e-8);
assert.ok(model.htft[2]>0); // Half-time home lead / full-time away win is possible.
for(let ft=0;ft<3;ft++)assert.ok(Math.abs([0,1,2].reduce((s,ht)=>s+model.htft[ht*3+ft],0)-model.probabilities[ft])<.04);
assert.equal(FM_STAT_MODEL.forecast(NaN,1),null);assert.equal(FM_STAT_MODEL.build({completed:true},[],Date.now()),null);
assert.equal(FM_FAVORITES.identity('eng.1:359'),FM_FAVORITES.identity('uefa.champions:359'));
const now=Date.now(),future=new Date(now+86400000).toISOString(),past=new Date(now-86400000).toISOString(),data=JSON.parse(await fs.readFile(new URL('../assets/data/leagues-snapshot.json',import.meta.url),'utf8'));
const enriched=FM_STAT_MODEL.enrich(data.matches,now),local=enriched.filter(m=>m.predictionSource==='local-poisson');assert.ok(local.length>0);assert.ok(local.every(m=>!m.completed&&!m.live&&new Date(m.date).getTime()>now));
assert.ok(enriched.filter(m=>m.completed).every(m=>!m.localPrediction));assert.deepEqual(FM_STAT_MODEL.enrich(enriched,now).map(m=>m.predictedScore),enriched.map(m=>m.predictedScore));
const candidate=enriched.find(m=>m.localPrediction);const original=FM_STAT_MODEL.enrich(enriched,now).find(m=>m.id===candidate.id).localPrediction;
const leaked={...enriched.find(m=>m.completed),id:'future-result',date:future,homeScore:99,awayScore:0};assert.deepEqual(FM_STAT_MODEL.enrich([...enriched,leaked],now).find(m=>m.id===candidate.id).localPrediction,original);
const record=FM_ANALYTICS.capture([], [candidate],new Date(now).toISOString());assert.equal(record.length,1);assert.equal(record[0].htft.length,9);assert.equal(FM_ANALYTICS.capture(record,[{...candidate,completed:true,date:past,homeScore:1,awayScore:1}],new Date(now).toISOString())[0].predictedScore,record[0].predictedScore);
const q=FM_QUALITY.assess({competitions:[{id:'eng.1'}],matches:[{competitionId:'eng.1',live:true}],freshness:{'eng.1':{mode:'live',lastSuccessAt:new Date(now).toISOString(),sourceUpdatedAt:new Date(now-180000).toISOString()}}},now);assert.equal(q.rows[0].state,'provider-stale');
console.log(`PASS joint HT/FT, model sum/marginals, sample minimums, no future leakage, frozen model archive, favourite identity, stale provider; ${local.length} local fallback predictions`);
