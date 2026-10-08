(() => {
  'use strict';
  const audio=new Audio();audio.preload='none';audio.volume=.25;
  let tracks=[],index=0,box,button,label,select,floating,request=0;
  const t=(zh,en)=>window.FM?.state.language==='en'?en:zh;
  function state(text){label.textContent=text;button.textContent=audio.paused?t('播放','Play'):t('暂停','Pause');button.setAttribute('aria-label',audio.paused?t('播放音乐','Play music'):t('暂停音乐','Pause music'));if(floating){floating.textContent=audio.paused?'♫':'Ⅱ';floating.setAttribute('aria-label',button.getAttribute('aria-label'));floating.title=button.getAttribute('aria-label');}}
  async function play(){
    window.FM?.safeSet('fm-music-paused','0');
    if(!tracks[index]?.preview){state(t('此曲暂无试听，请打开 Apple Music','Preview unavailable; open Apple Music'));return;}
    const ticket=++request;button.disabled=true;
    try{await audio.play();if(ticket===request)state(t('正在试听 · 点击暂停','Preview playing · click to pause'));}
    catch{if(ticket===request)state(t('浏览器限制自动播放 · 点击播放','Autoplay blocked · click Play'));}
    finally{button.disabled=false;}
  }
  function choose(i){index=i;audio.pause();audio.src=tracks[i].preview||'';select.value=String(i);const link=box.querySelector('a');link.href=tracks[i].url;link.textContent=t('Apple Music 完整歌曲 ↗','Full song on Apple Music ↗');state(t('官方试听 · 非完整歌曲','Official preview · not full song'));}
  document.addEventListener('DOMContentLoaded',async()=>{
    box=document.createElement('section');box.className='music-mini section-shell';box.setAttribute('aria-label','世界杯经典歌曲播放器');
    box.innerHTML='<span class="music-icon" aria-hidden="true">♫</span><div class="music-copy"><strong>世界杯经典旋律</strong><small role="status" aria-live="polite">歌曲读取中…</small></div><label><span class="sr-only">选择歌曲</span><select aria-label="选择歌曲"></select></label><button type="button">播放</button><a target="_blank" rel="noopener noreferrer">Apple Music ↗</a>';
    document.querySelector('[data-site-footer]')?.before(box);button=box.querySelector('button');label=box.querySelector('small');select=box.querySelector('select');
    floating=document.createElement('button');floating.type='button';floating.className='music-toggle';floating.textContent='♫';floating.setAttribute('aria-label','播放或暂停音乐');floating.addEventListener('click',()=>button.click());document.body.append(floating);
    button.addEventListener('click',()=>{if(audio.paused)play();else{++request;audio.pause();FM.safeSet('fm-music-paused','1');state(t('已暂停 · 点击播放','Paused · click Play'));}});
    select.addEventListener('change',()=>{choose(Number(select.value));FM.safeSet('fm-music-paused','0');play();});
    audio.addEventListener('ended',()=>{choose((index+1)%tracks.length);play();});
    audio.addEventListener('error',()=>state(t('试听无法加载 · 可打开 Apple Music','Preview unavailable · open Apple Music')));
    window.addEventListener('fm:language',()=>{box.querySelector('strong').textContent=t('世界杯经典旋律','World Cup classics');state(audio.paused?t('点击播放官方试听','Click to play an official preview'):t('正在试听 · 点击暂停','Playing · click to pause'));});
    try{const r=await fetch('assets/data/music.json');if(!r.ok)throw Error();tracks=await r.json();if(!tracks.length)throw Error();select.innerHTML=tracks.map((s,i)=>`<option value="${i}">${FM.html(s.name)} · ${FM.html(s.artist)}</option>`).join('');choose(0);if(FM.safeGet('fm-music-paused','0')!=='1')play();}
    catch{state(t('歌曲暂不可用，请稍后重试','Music unavailable; retry later'));button.disabled=true;}
  });
})();
