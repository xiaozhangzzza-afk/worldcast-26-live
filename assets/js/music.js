(() => {
  'use strict';
  const KEY='fm-music-playback-v1',audio=new Audio();audio.preload='metadata';audio.volume=.25;
  let tracks=[],index=0,box,button,label,select,floating,range,clock,loop,request=0,selection=0,wantPlay=false,lastSaved=0,pendingResume=null;
  const t=(zh,en)=>window.FM?.state.language==='en'?en:zh;
  const read=()=>{try{return JSON.parse(sessionStorage.getItem(KEY)||'null')}catch{return null}};
  function save(force=false){if(!tracks[index]||!force&&Date.now()-lastSaved<1000)return;lastSaved=Date.now();try{sessionStorage.setItem(KEY,JSON.stringify({key:tracks[index].url,time:pendingResume??(Number.isFinite(audio.currentTime)?audio.currentTime:0),playing:wantPlay,volume:audio.volume,loop:loop.checked}))}catch{}}
  const time=n=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
  function progress(){const duration=Number.isFinite(audio.duration)?audio.duration:0;range.max=duration;range.value=audio.currentTime||0;range.disabled=!duration;clock.textContent=`${time(audio.currentTime||0)} / ${duration?time(duration):t('官方试听','Preview')}`;save();}
  function state(text){label.textContent=text;button.textContent=audio.paused?t('播放','Play'):t('暂停','Pause');const aria=audio.paused?t('播放音乐','Play music'):t('暂停音乐','Pause music');button.setAttribute('aria-label',aria);floating.textContent=audio.paused?'♫':'Ⅱ';floating.setAttribute('aria-label',aria);floating.title=aria;}
  function localize(){
    box.setAttribute('aria-label',t('世界杯经典歌曲播放器','World Cup music player'));
    box.querySelector('strong').textContent=t('世界杯经典旋律','World Cup classics');
    box.querySelector('a').textContent=t('Apple Music 完整歌曲 ↗','Full song on Apple Music ↗');
    box.querySelector('.sr-only').textContent=t('选择歌曲','Select track');select.setAttribute('aria-label',t('选择歌曲','Select track'));
    range.setAttribute('aria-label',t('歌曲播放进度','Playback progress'));
    loop.parentElement.lastChild.textContent=t('循环整份歌单','Loop playlist');
    box.querySelector('.music-progress small').textContent=t('换页恢复原歌曲和进度；页面加载期间可能短暂停顿。单曲时长由官方试听决定。','Resume the same track and position across pages; loading may briefly interrupt playback. Track length is limited by official previews.');
  }
  async function play(){
    wantPlay=true;FM.safeSet('fm-music-paused','0');save(true);
    if(!tracks[index]?.preview){state(t('此曲暂无试听，请打开 Apple Music','Preview unavailable; open Apple Music'));return;}
    const ticket=++request;button.disabled=true;state(t('试听载入中…','Loading preview…'));
    try{await audio.play();if(ticket===request)state(t('正在连续试听 · 换页保留进度','Playing previews · progress retained across pages'));}
    catch(error){if(ticket===request)state(error.name==='NotAllowedError'?t('浏览器限制自动播放 · 点击继续','Autoplay blocked · click to resume'):t('试听暂不可用 · 可打开 Apple Music','Preview unavailable · open Apple Music'));}
    finally{if(ticket===request)button.disabled=false;}
  }
  function pause(){++request;button.disabled=false;wantPlay=false;audio.pause();FM.safeSet('fm-music-paused','1');save(true);state(t('已暂停 · 进度已保存','Paused · progress saved'));}
  function choose(i,resume=0){
    ++request;button.disabled=false;const token=++selection;index=i;pendingResume=Math.max(0,resume)||null;audio.pause();audio.src=tracks[i].preview||'';select.value=String(i);box.querySelector('a').href=tracks[i].url;
    const restore=()=>{if(token!==selection)return;if(Number.isFinite(audio.duration)&&Number.isFinite(resume))audio.currentTime=Math.min(Math.max(0,resume),Math.max(0,audio.duration-.1));pendingResume=null;progress();};
    audio.addEventListener('loadedmetadata',restore,{once:true});state(t('官方试听 · 连续歌单，非完整歌曲','Official previews · continuous playlist, not full songs'));progress();
  }
  function restore(saved){const i=tracks.findIndex(s=>s.url===saved?.key);index=i<0?0:i;loop.checked=saved?.loop!==false;if(Number.isFinite(saved?.volume))audio.volume=Math.max(0,Math.min(1,saved.volume));choose(index,i<0?0:Number(saved.time)||0);wantPlay=saved?.playing??(FM.safeGet('fm-music-paused','0')!=='1');if(wantPlay)play();}
  document.addEventListener('DOMContentLoaded',async()=>{
    box=document.createElement('section');box.className='music-mini section-shell';box.setAttribute('aria-label','世界杯经典歌曲播放器');
    box.innerHTML='<span class="music-icon" aria-hidden="true">♫</span><div class="music-copy"><strong>世界杯经典旋律</strong><small role="status" aria-live="polite">歌曲读取中…</small></div><label><span class="sr-only">选择歌曲</span><select aria-label="选择歌曲"></select></label><button type="button">播放</button><a target="_blank" rel="noopener noreferrer">Apple Music 完整歌曲 ↗</a><div class="music-progress"><input type="range" min="0" max="0" step="0.1" value="0" aria-label="歌曲播放进度" disabled><output>0:00 / 官方试听</output><label><input type="checkbox" checked>循环整份歌单</label><small>换页恢复原歌曲和进度；页面加载期间可能短暂停顿。单曲时长由官方试听决定。</small></div>';
    document.querySelector('[data-site-footer]')?.before(box);button=box.querySelector('button');label=box.querySelector('.music-copy small');select=box.querySelector('select');range=box.querySelector('[type="range"]');clock=box.querySelector('output');loop=box.querySelector('[type="checkbox"]');
    floating=document.createElement('button');floating.type='button';floating.className='music-toggle';floating.textContent='♫';floating.setAttribute('aria-label','播放或暂停音乐');floating.addEventListener('click',()=>button.click());document.body.append(floating);
    button.addEventListener('click',()=>audio.paused?play():pause());select.addEventListener('change',()=>{choose(Number(select.value));play();});range.addEventListener('input',()=>{if(Number.isFinite(audio.duration)){audio.currentTime=Number(range.value);save(true);progress();}});loop.addEventListener('change',()=>save(true));
    audio.addEventListener('timeupdate',progress);audio.addEventListener('loadedmetadata',progress);audio.addEventListener('ended',()=>{if(index===tracks.length-1&&!loop.checked){pause();return;}choose((index+1)%tracks.length);play();});audio.addEventListener('error',()=>state(t('试听无法加载 · 可打开 Apple Music','Preview unavailable · open Apple Music')));
    window.addEventListener('pagehide',()=>{save(true);audio.pause();});window.addEventListener('pageshow',e=>{if(e.persisted&&tracks.length)restore(read());});
    localize();window.addEventListener('fm:language',()=>{localize();state(audio.paused?t('点击继续 · 保留播放进度','Click to resume · progress retained'):t('正在连续试听 · 点击暂停','Continuous previews · click to pause'));progress();});
    try{const r=await fetch('assets/data/music.json');if(!r.ok)throw Error();tracks=await r.json();if(!tracks.length)throw Error();select.innerHTML=tracks.map((s,i)=>`<option value="${i}">${FM.html(s.name)} · ${FM.html(s.artist)}</option>`).join('');restore(read());}
    catch{state(t('歌曲暂不可用，请稍后重试','Music unavailable; retry later'));button.disabled=true;}
  });
})();
