import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await import('../assets/js/analytics.js');
await import('../assets/js/competitions.js');
globalThis.window=globalThis;
await import('../assets/js/data-normalizer.js');
await import('../assets/js/league-normalizer.js');
const competitions=globalThis.FM_COMPETITIONS.filter(c=>!c.compact);
const base='https://site.web.api.espn.com/apis/site/v2/sports/soccer';
const start=new Date(Date.now()-8*86400000),end=new Date(Date.now()+24*86400000),months=[];
for(let date=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth(),1));date<=end;date.setUTCMonth(date.getUTCMonth()+1))months.push(date.toISOString().slice(0,7).replace('-',''));
async function get(url){
  let error;
  for(let attempt=0;attempt<3;attempt++){try{const response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('HTTP '+response.status);return await response.json();}catch(e){error=e;}}
  throw error;
}
const matches=[],teamMap=new Map();
for(const meta of competitions){
  const feeds=await Promise.all(months.map(month=>get(base+'/'+meta.id+'/scoreboard?dates='+month+'&limit=1000')));
  const events=[...new Map(feeds.flatMap(f=>f.events||[]).map(e=>[String(e.id),e])).values()];
  const normalized=globalThis.FM_LEAGUE_NORMALIZER.normalizeFeed({events},meta);
  matches.push(...normalized.matches.map(m=>({...m,clockSnapshotAt:m.live?m.clockSnapshotAt:null})));
  normalized.teams.forEach(t=>teamMap.set(t.code,t));
}
const directory=path.join(root,'assets','data');
await fs.mkdir(directory,{recursive:true});
const historyPath=path.join(directory,'prediction-history.json');
let history={schemaVersion:1,startedAt:new Date().toISOString(),records:[]};
try{history=JSON.parse(await fs.readFile(historyPath,'utf8'));}catch{}
const records=globalThis.FM_ANALYTICS.capture(history.records,matches);
if(JSON.stringify(records)!==JSON.stringify(history.records)||!history.records.length){
  await fs.writeFile(historyPath,JSON.stringify({...history,updatedAt:new Date().toISOString(),records},null,2)+'\n','utf8');
  console.log('Archived '+records.length+' pre-match predictions; completed games are never backfilled.');
}
const output={schemaVersion:1,savedAt:new Date().toISOString(),source:'ESPN public club competition snapshot',months,matches,teams:[...teamMap.values()]};
const destination=path.join(directory,'leagues-snapshot.json');
let previous=null;try{previous=JSON.parse(await fs.readFile(destination,'utf8'));}catch{}
if(previous&&JSON.stringify(previous.matches)===JSON.stringify(output.matches)&&JSON.stringify(previous.teams)===JSON.stringify(output.teams))console.log('No fixture changes; retaining the verified snapshot.');
else{await fs.writeFile(destination,JSON.stringify(output,null,2)+'\n','utf8');console.log('Saved '+matches.length+' matches across '+competitions.length+' competitions.');}
