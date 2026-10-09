/* Presentation-only facts. Request success never implies a new live event. */
(() => {
  'use strict';
  const timestamp=value=>value&&Number.isFinite(new Date(value).getTime())?value:null;
  function status(match,store={},now=Date.now(),language='zh'){
    const en=language==='en',t=(zh,eng)=>en?eng:zh,meta=store.freshness?.[match.competitionId]||{};
    const checkedAt=timestamp(match.dataCheckedAt)||timestamp(meta.lastSuccessAt);
    const sourceUpdatedAt=timestamp(match.sourceUpdatedAt); // Never borrow a different event's update time.
    const snapshotAt=timestamp(match.snapshotRecordedAt)||timestamp(meta.snapshotRecordedAt);
    const directCheck=timestamp(match.dataCheckedAt)&&!match.snapshotRecordedAt&&new Date(match.dataCheckedAt).getTime()>new Date(meta.checkedAt||0).getTime();
    const freshness=globalThis.FM_ANALYTICS?.freshness({...meta,mode:directCheck?'live':meta.mode,lastSuccessAt:checkedAt||meta.lastSuccessAt},match.live,now)?.state||'unknown';
    const sourceStale=Boolean(match.live&&sourceUpdatedAt&&now-new Date(sourceUpdatedAt).getTime()>120000);
    const phase=match.completed?'completed':match.live?'live':new Date(match.date).getTime()>now?'upcoming':'awaiting';
    const exceptional=/POSTPON|CANCEL|ABANDON|SUSPEND|DELAY/i.test(match.status||'')?(en?match.statusTextEn:match.statusTextZh)||match.statusText:null;
    const sourceState=match.competitionId==='fifa.world'||meta.mode==='archive'?'archive':store.isSnapshot&&!directCheck||match.snapshotRecordedAt||freshness==='snapshot'?'snapshot':sourceStale||freshness==='stale'?'stale':freshness==='partial'?'partial':freshness;
    return {phase,sourceState,checkedAt,sourceUpdatedAt,snapshotAt,
      label:exceptional||({completed:t('已完赛','Final'),live:t('进行中','In progress'),upcoming:t('未开赛','Upcoming'),awaiting:t('开赛状态待确认','Start status unconfirmed')})[phase],
      sourceLabel:({archive:t('归档赛果','Archived result'),snapshot:t('最近快照','Last snapshot'),stale:t('数据过旧','Data overdue'),partial:t('部分核验','Partial check'),fresh:t('最近核验','Recently checked'),unknown:t('等待核验','Unverified')})[sourceState]||t('等待核验','Unverified'),
      clock:match.displayClock||(match.live&&Number.isFinite(match.clockSeconds)?Math.floor(match.clockSeconds/60)+'′':''),
      note:sourceState==='snapshot'?t('源暂不可用，保留最近可信数据。','Source unavailable; retaining the last available data.'):sourceState==='stale'?t('数据可能滞后，请勿视为当前实时赛况。','Data may be delayed; do not treat it as current live action.'):sourceState==='archive'?t('历史赛果，不是当前直播。','Historical result, not a live feed.'):!sourceUpdatedAt?t('源更新时间未提供；核验成功不代表源已更新。','Source update time unavailable; a successful check does not mean new data.'):t('核验时间与源更新时间分开记录。','Check time and source update time are recorded separately.')};
  }
  function model(match,record,language='zh'){
    const en=language==='en',t=(zh,eng)=>en?eng:zh,past=match.completed||match.live,value=past?record:match;
    if(!value?.predictedScore)return {kind:'missing',label:past?t('未留存赛前记录','No pre-match record'):t('尚无有效预测','Prediction unavailable'),value:null};
    const local=value.predictionSource==='local-poisson'||value.modelVersion==='local-poisson-v1';
    return {kind:local?'local':'public',label:local?t('本地统计模型','Local statistical model'):t('公开概率参考','Public probability reference'),value,frozen:Boolean(past)};
  }
  function changes(before,after){
    const facts=m=>JSON.stringify([m.date,m.status,m.live,m.completed,m.homeScore,m.awayScore,m.displayClock,(m.timeline||[]).map(e=>[e.id,e.type,e.minute,e.player,e.assist,e.goalKind])]);
    const previous=new Map(before.map(m=>[String(m.id),facts(m)]));
    return after.filter(m=>previous.get(String(m.id))!==facts(m)).length;
  }
  globalThis.FM_PRESENTATION={status,model,changes};
})();
