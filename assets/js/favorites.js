(() => {
  'use strict';
  const KEY='football-model-favorites';
  const identity=code=>String(code||'').includes(':')?'club:'+String(code).split(':').at(-1):'country:'+String(code||'').toUpperCase();
  function read(){try{const data=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(data)?data.filter(c=>typeof c==='string'&&c.length<100):[]}catch{return []}}
  function has(code){return read().some(c=>identity(c)===identity(code))}
  function toggle(code){const existing=read(),found=has(code),next=existing.filter(c=>identity(c)!==identity(code));if(!found)next.push(code);try{localStorage.setItem(KEY,JSON.stringify(next))}catch{}window.dispatchEvent(new CustomEvent('fm:favorites',{detail:next}));return next;}
  function teams(store){const wanted=new Set(read().map(identity)),seen=new Set();return (store.teams||[]).filter(t=>{const key=identity(t.code);if(!wanted.has(key)||seen.has(key))return false;seen.add(key);return true;});}
  function matches(store,code){const key=identity(code);return (store.matches||[]).filter(m=>[identity(m.homeCode),identity(m.awayCode)].includes(key));}
  globalThis.FM_FAVORITES={identity,read,has,toggle,teams,matches};
  if(typeof window!=='undefined')window.addEventListener('storage',e=>{if(e.key===KEY)window.dispatchEvent(new CustomEvent('fm:favorites',{detail:read()}));});
})();
