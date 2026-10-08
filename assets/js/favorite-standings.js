(() => {
  'use strict';
  let busy=false;
  async function render(){
    if(busy||document.body.dataset.page!=='home'||!window.FM_STANDINGS)return;busy=true;
    try{const elements=[...document.querySelectorAll('[data-standing-code]')];await Promise.allSettled(elements.map(async element=>{
      const code=element.dataset.standingCode,team=FM.team(code),en=FM.state.language==='en',t=(zh,eng)=>en?eng:zh;
      if(!code.includes(':')){element.textContent=t('国家队不使用联赛积分','National teams do not use league points');return;}
      const data=await FM_STANDINGS.load(team.competitionId),row=data?.rows.find(r=>r.id===code.split(':').at(-1));if(!row){element.textContent=t('暂无可读取的积分记录','No standings available');return;}
      const storage='fm-favourite-standing-'+code;let old;try{old=JSON.parse(FM.safeGet(storage,'null'))}catch{}
      let change=t('首次记录，暂无变化基线','First observation; no comparison baseline');
      if(old?.season&&data.season&&old.season===data.season&&Number.isFinite(row.points)&&Number.isFinite(old.points)){
        const dp=row.points-old.points,dr=old.rank-row.rank;change=`${t('相较上次有效记录','Since previous observation')} ${dp>0?'+':''}${dp} ${t('分','pts')}${Number.isFinite(dr)?' · '+(dr>0?t('排名上升','rank up'):dr<0?t('排名下降','rank down'):t('排名不变','rank unchanged'))+(dr?Math.abs(dr):''):''}`;
      }
      if(data.snapshot)change=t('最近积分快照，不确认新变化','Cached standings; no new change confirmed');
      if(!data.snapshot&&old?.checked!==data.updated){FM.safeSet(storage,JSON.stringify({season:data.season,points:row.points,rank:row.rank,checked:data.updated,change}));}
      else if(!data.snapshot&&old?.change)change=old.change;
      if(element.isConnected)element.textContent=`${t('排名','Rank')} ${row.rank??t('待确认','pending')} · ${row.points??t('待确认','pending')} ${t('积分','points')} · ${change}`;
    }));}finally{busy=false;}
  }
  window.FM_FAVORITE_STANDINGS={render};document.addEventListener('DOMContentLoaded',render);setInterval(()=>{if(!document.hidden)render()},60000);
})();
