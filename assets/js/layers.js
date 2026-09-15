(() => {
  'use strict';
  let mode = 'result', openedToday = false, returnFocus;
  const en = () => FM.state.language === 'en';
  const t = (zh, english) => en() ? english : zh;
  const modes = ['result', 'score', 'half'];
  const labels = () => [t('胜平负','Match result'), t('比分','Score'), t('半全场','Half / full time')];
  function candidates() {
    const now = Date.now();
    return FM.store().matches.filter(m => !m.completed && !m.live && new Date(m.date).getTime() > now && new Date(m.date).getTime() < now + 72*3600000 && Array.isArray(m.probabilities) && m.probabilities.length === 3 && m.probabilities.every(p => Number.isFinite(p) && p >= 0 && p <= 100))
      .sort((a,b) => Math.max(...b.probabilities)-Math.max(...a.probabilities) || new Date(a.date)-new Date(b.date)).slice(0,2);
  }
  function renderPair() {
    const root = document.querySelector('#pairContent');
    if (!root) return;
    const matches = candidates();
    root.innerHTML = `<p class="pair-eyebrow">${t('未来72小时 · 两场组合观察','Next 72 hours · Two-match selection')}</p><h2 id="pairTitle">${t('每日二串一建议','Daily two-match picks')}</h2><p>${t('按已提供的赛前概率筛选；主客队与比赛时间如下。','Selected from available pre-match probabilities.')}</p><div class="pair-tabs" role="group" aria-label="${t('建议类型','Pick type')}">${modes.map((key,i)=>`<button type="button" data-pair-mode="${key}" aria-pressed="${key===mode}">${labels()[i]}</button>`).join('')}</div><div class="pair-grid">${matches.map((m,i)=> {
      const best = m.probabilities.indexOf(Math.max(...m.probabilities));
      const value = mode === 'result' ? `${[t('主胜','Home win'),t('平局','Draw'),t('客胜','Away win')][best]} · ${m.probabilities[best]}%` : mode === 'score' ? m.predictedScore || t('比分待更新','Score pending') : t('暂无经核验的半全场预测','Verified half/full prediction unavailable');
      return `<article><span class="pair-eyebrow">0${i+1} · ${FM.html(FM.competitionName(m))}</span><p>${FM.formatFull(m.date)}</p><h3>${FM.teamLogo(m.homeCode,m.homeLogo)} ${FM.html(m.homeName)} <small>${t('主队','Home')}</small></h3><h3>${FM.teamLogo(m.awayCode,m.awayLogo)} ${FM.html(m.awayName)} <small>${t('客队','Away')}</small></h3><strong class="pair-pick">${FM.html(value)}</strong><button type="button" data-pair-match="${FM.html(m.id)}">${t('查看比赛详情','Match details')}</button></article>`;
    }).join('')}</div>${matches.length<2?`<p class="empty-state">${t('当前不足两场有预测数据的未开赛比赛，暂不组成二串一。','Not enough eligible upcoming matches for a pair.')}</p>`:''}<p class="pair-note">${t('胜平负概率来自公开赛前数据换算，比分为演示推算；组合命中率未经校准。模型演示，不构成投注或财务建议。临场阵容、官方公告与实际赛果优先。','Probabilities derive from public pre-match data; scores are illustrative. Combined accuracy is not calibrated. Model demonstration, not betting or financial advice.')}</p><button type="button" class="button primary" data-pair-next>${t('切换下一种建议','Next pick type')}</button>`;
  }
  function openPair() { const dialog=document.querySelector('#pairDialog'); returnFocus=document.activeElement; renderPair(); if(!dialog.open) dialog.showModal(); }
  function renderLeagues() {
    const root = document.querySelector('#leagueLayers'); if(!root) return;
    const openIds = [...root.querySelectorAll('details[open]')].map(x=>x.dataset.league);
    root.innerHTML = FM.store().competitions.filter(c=>!c.compact).map(c=>{
      const items=FM.store().matches.filter(m=>m.competitionId===c.id);
      const live=items.filter(m=>m.live).length;
      return `<details data-league="${c.id}" ${openIds.includes(c.id)?'open':''}><summary><span>${FM.html(c.icon)} ${FM.html(en()?c.nameEn:c.shortZh)}</span><small>${items.length} ${t('场近期赛程','fixtures')} · ${live} ${t('直播','live')}</small></summary><div class="league-actions"><a class="button" href="predictions.html?competition=${c.id}">${t('比赛预测','Predictions')}</a><a class="button" href="schedule.html?competition=${c.id}">${t('赛程与比分','Schedule')}</a><a class="button" href="teams.html?competition=${c.id}">${t('球队档案','Teams')}</a></div></details>`;
    }).join('');
  }
  function init() {
    if (!document.querySelector('#matchModal')) {
      const modal=document.createElement('div'); modal.className='modal'; modal.id='matchModal'; modal.hidden=true; modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true'); modal.setAttribute('aria-labelledby','matchModalTitle'); modal.setAttribute('aria-hidden','true'); modal.innerHTML='<div class="modal-backdrop" data-close-modal></div><section class="modal-panel" tabindex="-1"><button type="button" class="modal-close" aria-label="关闭" data-close-modal>关闭</button><div id="matchModalContent"></div></section>'; document.body.append(modal);
    }
    document.body.classList.add('layer-layout');
    const sections=[...document.querySelectorAll('main > section')].filter(section=>!section.classList.contains('hero')&&!section.classList.contains('page-hero'));
    sections.forEach((section,i)=>{
      const title=section.querySelector('h2'); if(!title) return;
      const details=document.createElement('details'); details.className='content-layer'; details.open=i===0;
      const summary=document.createElement('summary'); summary.innerHTML=`<span class="layer-number">${String(i+1).padStart(2,'0')}</span><span>${FM.html(title.textContent)}</span><small>${t('点击展开 / 收起','Expand / collapse')}</small>`;
      section.before(details); details.append(summary,section);
    });
    const hero=document.querySelector('main > section');
    if(document.body.dataset.page==='home'&&hero) { const root=document.createElement('nav'); root.className='league-layers section-shell'; root.id='leagueLayers'; root.setAttribute('aria-label','赛事入口'); hero.after(root); }
    const dialog=document.createElement('dialog'); dialog.id='pairDialog'; dialog.className='pair-dialog'; dialog.setAttribute('aria-labelledby','pairTitle'); dialog.innerHTML='<button type="button" class="pair-close" aria-label="关闭">关闭</button><div id="pairContent"></div>';
    document.body.append(dialog);
    const trigger=document.createElement('button'); trigger.type='button'; trigger.className='pair-launcher'; trigger.textContent=t('每日二串一 · 展开','Daily picks · Open'); trigger.addEventListener('click',openPair); document.body.append(trigger);
    dialog.querySelector('.pair-close').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();const choice=e.target.closest('[data-pair-mode]');if(choice){mode=choice.dataset.pairMode;renderPair();}if(e.target.closest('[data-pair-next]')){mode=modes[(modes.indexOf(mode)+1)%3];renderPair();}const match=e.target.closest('[data-pair-match]');if(match){dialog.close();FM.openMatch(match.dataset.pairMatch,trigger);}});
    dialog.addEventListener('close',()=>returnFocus?.focus());
    renderLeagues();
  }
  function update() {renderLeagues(); if(document.querySelector('#pairDialog')?.open)renderPair(); if(document.body.dataset.page==='home'&&!openedToday&&FM.store().status!=='loading'){openedToday=true;const day=new Date().toLocaleDateString('en-CA');try{if(sessionStorage.getItem('fm-pair-day')===day)return;sessionStorage.setItem('fm-pair-day',day);}catch{}openPair();}}
  document.addEventListener('DOMContentLoaded',init);
  ['fm:data-ready','fm:data-updated','fm:data-error'].forEach(event=>window.addEventListener(event,update));
  window.addEventListener('fm:language',()=>{renderLeagues();renderPair();document.querySelector('.pair-launcher').textContent=t('每日二串一 · 展开','Daily picks · Open');});
})();
