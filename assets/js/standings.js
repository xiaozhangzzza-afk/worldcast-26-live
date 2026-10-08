(() => {
  'use strict';
  const cache = new Map(), pending = new Map(), fixtures = new Map();
  let active = 'top5', query = '', target, selection = 0;
  const t = (zh,en) => FM.state.language === 'en' ? en : zh;
  const leagues = () => FM.store().competitions.filter(item=>!item.compact);
  const selected = (m,id) => id==='all'||(id==='top5'?m.category==='domestic':id==='europe'?m.category==='europe':m.id===id);
  const cell = value => value == null ? t('待确认','Pending') : FM.html(value);
  function entries(payload) {
    const output=[];
    const visit=node=>{if(node.standings?.entries)output.push(...node.standings.entries);for(const child of node.children||[])visit(child);};visit(payload);
    return output.map((entry,index)=>{const stats=Object.fromEntries((entry.stats||[]).map(s=>[s.name,s.value]));return {id:String(entry.team.id),nameEn:entry.team.displayName,logo:entry.team.logos?.[0]?.href||'',rank:stats.rank??index+1,played:stats.gamesPlayed,wins:stats.wins,draws:stats.ties,losses:stats.losses,gf:stats.pointsFor,ga:stats.pointsAgainst,gd:stats.pointDifferential,points:stats.points};}).sort((a,b)=>a.rank-b.rank);
  }
  async function load(id, force=false) {
    if(pending.has(id))return pending.get(id);
    if(!force&&cache.has(id)&&Date.now()-cache.get(id).checked<60000)return cache.get(id);
    const job=(async()=>{try{
      const data=await FM_DATA_SERVICE.fetchJson(`https://site.web.api.espn.com/apis/v2/sports/soccer/${id}/standings`);
      const rows=entries(data);if(!rows.length)throw new Error('Empty standings');
      const table={rows,season:data.season?.displayName||'',updated:new Date().toISOString(),checked:Date.now(),snapshot:false};cache.set(id,table);FM.safeSet(`fm-standings-${id}`,JSON.stringify(table));
    }catch(error){let previous=cache.get(id);if(!previous){try{previous=JSON.parse(FM.safeGet(`fm-standings-${id}`,'null'));}catch{}}
      cache.set(id,previous?.rows?.length?{...previous,checked:Date.now(),snapshot:true}:{rows:[],checked:Date.now(),error:true});
    }finally{pending.delete(id);}return cache.get(id);})();pending.set(id,job);return job;
  }
  function draw() {
    if(!target || document.body.dataset.page!=='schedule')return;
    const list=leagues().filter(m=>selected(m,active));
    target.innerHTML=`<p class="standings-colour-key">${t('金/银/铜渐变：当前前三名；蓝色渐变与★：关注球队。胜/负数字以绿/红区分；颜色不代表已确认晋级或降级资格。','Gold/silver/bronze: current top three; blue and star: followed clubs. Win/loss numbers use green/red. Colours do not confirm qualification or relegation.')}</p>`+list.map(meta=>{const data=cache.get(meta.id);const title=FM.state.language==='en'?meta.nameEn:meta.shortZh;
      if(!data)return `<section class="standings-section"><h2>${FM.html(title)}</h2><p>${t('积分榜加载中…','Loading standings…')}</p></section>`;
      if(data.error)return `<section class="standings-section"><h2>${FM.html(title)}</h2><p>${t('积分源暂不可用，点击顶部同步重试。','Standings unavailable. Use Sync to retry.')}</p></section>`;
      const rows=data.rows.filter(r=>`${r.nameEn} ${FM_NAMES.team(r,'zh')}`.toLowerCase().includes(query.toLowerCase()));
      return `<section class="standings-section"><header><div><p class="eyebrow">${FM.html(data.season)}</p><h2>${FM.html(title)} · ${t('积分榜','Standings')}</h2></div><p>${data.snapshot?t('最近积分快照','Cached standings'):t('积分源已核验','Standings checked')} · ${FM.formatFull(data.updated)}</p></header><p class="standings-note">${t('每60秒核验；积分以数据源公布为准，不提前加入未确认赛果。点击球队查看未来赛程。','Checked every 60 seconds; points follow the provider. Select a club for upcoming fixtures.')}</p><div class="standings-scroll"><table><caption class="sr-only">${FM.html(title)} ${t('积分榜','standings')}</caption><thead><tr>${[t('排名','Rank'),t('球队','Club'),t('场','P'),t('胜','W'),t('平','D'),t('负','L'),t('进','GF'),t('失','GA'),t('净胜','GD'),t('积分','Pts')].map(label=>`<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr data-rank="${FM.html(r.rank)}" data-favourite="${window.FM_FAVORITES?.has(meta.id+':'+r.id)?'true':'false'}"><td>${cell(r.rank)}</td><th scope="row"><button type="button" data-standings-team="${FM.html(r.id)}" data-league-id="${meta.id}">${r.logo?`<img src="${FM.html(r.logo)}" alt="" loading="lazy">`:''}<span>${FM.html(FM_NAMES.team(r,FM.state.language))}</span><span aria-hidden="true">›</span></button></th>${[r.played,r.wins,r.draws,r.losses,r.gf,r.ga,r.gd,r.points].map((v,i)=>`<td${i===7?' class="points"':''}>${cell(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${rows.length?'':`<p>${t('没有匹配的球队','No matching clubs')}</p>`}</section>`;
    }).join('');
    document.querySelector('#scheduleCount').textContent=t('联赛积分 · 点击球队查看未来比赛','League standings · Select a club for fixtures');
  }
  async function render(root,competition,search='') {
    target=root;active=competition;query=search;
    if(competition==='fifa.world')return;
    draw();await Promise.allSettled(leagues().filter(m=>selected(m,competition)).map(m=>load(m.id)));
    if(active!=='fifa.world')draw();
  }
  function upcomingMarkup(matches) {return matches.map(m=>`<article class="club-fixture"><time>${FM.formatFull(m.date)}</time><p>${FM.html(FM_NAMES.team({nameEn:m.homeNameEn,name:m.homeName},FM.state.language))} <small>${t('主','H')}</small> <span class="versus">vs</span> ${FM.html(FM_NAMES.team({nameEn:m.awayNameEn,name:m.awayName},FM.state.language))} <small>${t('客','A')}</small></p><button class="fixture-link" data-club-match="${FM.html(m.id)}">${t('比赛详情','Details')}</button></article>`).join('');}
  async function openTeam(id,league,refresh=false) {
    const token=++selection,meta=leagues().find(m=>m.id===league),row=cache.get(league)?.rows.find(r=>r.id===id);if(!row||!meta)return;
    let dialog=document.querySelector('#clubFixtures');if(!dialog){dialog=document.createElement('dialog');dialog.id='clubFixtures';dialog.className='pair-dialog club-dialog';dialog.setAttribute('aria-labelledby','clubTitle');document.body.append(dialog);dialog.addEventListener('click',e=>{if(e.target===dialog||e.target.closest('[data-club-close]'))dialog.close();const b=e.target.closest('[data-club-match]');if(b){dialog.close();FM.openMatch(b.dataset.clubMatch,document.querySelector(`[data-standings-team="${id}"]`));}});}
    dialog.dataset.team=id;dialog.dataset.league=league;
    dialog.innerHTML=`<button class="pair-close" data-club-close aria-label="${t('关闭','Close')}">${t('关闭','Close')}</button><h2 id="clubTitle">${FM.html(FM_NAMES.team(row,FM.state.language))}</h2><p>${t('排名','Rank')} ${cell(row.rank)} · ${cell(row.points)} ${t('积分','points')} · ${cell(row.played)} ${t('场','played')}</p><h3>${t('未来比赛','Upcoming fixtures')}</h3><div id="clubUpcoming" aria-live="polite">${t('正在读取球队赛程…','Loading fixtures…')}</div>`;
    if(!dialog.open)dialog.showModal();
    const key=`${league}:${id}`;
    try{
      if(!fixtures.has(key)||Date.now()-fixtures.get(key).checked>60000){const feed=await FM_DATA_SERVICE.fetchJson(`${FM_DATA_SERVICE.ESPN_BASE}/${league}/teams/${id}/schedule?fixture=true`);const normalized=FM_LEAGUE_NORMALIZER.normalizeFeed(feed,meta);fixtures.set(key,{matches:normalized.matches,checked:Date.now()});
        for(const team of normalized.teams)if(!FM.store().teams.some(t=>t.code===team.code))FM.store().teams.push(team);
        for(const match of normalized.matches)if(!FM.store().matches.some(m=>m.id===match.id))FM.store().matches.push(match);
      }
      for(const match of fixtures.get(key).matches)if(!FM.store().matches.some(m=>m.id===match.id))FM.store().matches.push(match);
      if(token!==selection)return;
      const matches=fixtures.get(key).matches.filter(m=>!m.completed&&!m.live&&new Date(m.date)>new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date));
      document.querySelector('#clubUpcoming').innerHTML=matches.length?upcomingMarkup(matches):`<p>${t('数据源暂无已公布的未来比赛。','No upcoming fixtures published by the source.')}</p>`;
    }catch(error){if(token!==selection)return;const matches=FM.store().matches.filter(m=>[m.homeCode,m.awayCode].includes(key)&&!m.completed&&new Date(m.date)>new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date));document.querySelector('#clubUpcoming').innerHTML=`<p>${t('球队完整赛程暂不可用，以下为本地已载入赛程。','Full team schedule unavailable; showing loaded fixtures.')}</p>`+upcomingMarkup(matches);}
  }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-standings-team]');if(b)openTeam(b.dataset.standingsTeam,b.dataset.leagueId);if(document.body.dataset.page==='schedule'&&e.target.closest('#refreshData')){Promise.allSettled(leagues().map(m=>load(m.id,true))).then(()=>{if(active!=='fifa.world')draw();});}});
  window.addEventListener('fm:language',()=>{const d=document.querySelector('#clubFixtures');if(d?.open)openTeam(d.dataset.team,d.dataset.league);});
  setInterval(()=>{if(!document.hidden&&target&&active!=='fifa.world')render(target,active,query);},60000);
  window.FM_STANDINGS={render,entries,load};
})();
