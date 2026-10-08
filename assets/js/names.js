(() => {
  'use strict';
  const teams = {
    'AFC Bournemouth':'伯恩茅斯','Brentford':'布伦特福德','Aston Villa':'阿斯顿维拉','Nottingham Forest':'诺丁汉森林','Chelsea':'切尔西','Hull City':'赫尔城','Crystal Palace':'水晶宫','Ipswich Town':'伊普斯维奇','Liverpool':'利物浦','Fulham':'富勒姆','Tottenham Hotspur':'托特纳姆热刺','Everton':'埃弗顿','Sunderland':'桑德兰','Arsenal':'阿森纳','Coventry City':'考文垂','Brighton & Hove Albion':'布莱顿','Manchester United':'曼联','Manchester City':'曼城','Leeds United':'利兹联','Newcastle United':'纽卡斯尔联',
    'Getafe':'赫塔费','Celta Vigo':'塞尔塔','Elche':'埃尔切','Real Sociedad':'皇家社会','Sevilla':'塞维利亚','Valencia':'瓦伦西亚','Racing Santander':'桑坦德竞技','Alavés':'阿拉维斯','Osasuna':'奥萨苏纳','Espanyol':'西班牙人','Athletic Club':'毕尔巴鄂竞技','Real Madrid':'皇家马德里','Rayo Vallecano':'巴列卡诺','Málaga':'马拉加','Levante':'莱万特','Barcelona':'巴塞罗那','Deportivo':'拉科鲁尼亚','Atlético Madrid':'马德里竞技','Villarreal':'比利亚雷亚尔','Real Betis':'皇家贝蒂斯',
    '1. FC Union Berlin':'柏林联合','Schalke 04':'沙尔克04','Borussia Dortmund':'多特蒙德','SC Paderborn 07':'帕德博恩','FC Augsburg':'奥格斯堡','Bayer Leverkusen':'勒沃库森','Mainz':'美因茨','Eintracht Frankfurt':'法兰克福','SC Freiburg':'弗赖堡','Borussia Mönchengladbach':'门兴格拉德巴赫','TSG Hoffenheim':'霍芬海姆','VfB Stuttgart':'斯图加特','FC Cologne':'科隆','Werder Bremen':'云达不来梅','RB Leipzig':'莱比锡','Hamburg SV':'汉堡','SV Elversberg':'埃尔弗斯贝格','Bayern Munich':'拜仁慕尼黑',
    'Cagliari':'卡利亚里','Lecce':'莱切','Udinese':'乌迪内斯','Lazio':'拉齐奥','Venezia':'威尼斯','Fiorentina':'佛罗伦萨','Genoa':'热那亚','Frosinone':'弗罗西诺内','AC Milan':'AC米兰','Atalanta':'亚特兰大','Monza':'蒙扎','Napoli':'那不勒斯','Bologna':'博洛尼亚','Sassuolo':'萨索洛','Juventus':'尤文图斯','Como':'科莫','Parma':'帕尔马','Torino':'都灵','AS Roma':'罗马','Internazionale':'国际米兰',
    'Stade Rennais':'雷恩','Marseille':'马赛','Strasbourg':'斯特拉斯堡','AS Monaco':'摩纳哥','AJ Auxerre':'欧塞尔','Nice':'尼斯','Le Havre AC':'勒阿弗尔','Angers':'昂热','Lorient':'洛里昂','Toulouse':'图卢兹','Paris FC':'巴黎FC','Lyon':'里昂','Lille':'里尔','Troyes':'特鲁瓦','Le Mans':'勒芒','Lens':'朗斯','Brest':'布雷斯特','Paris Saint-Germain':'巴黎圣日耳曼'
  };
  const key = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  Object.assign(teams,{'AEK Athens':'雅典AEK','Ajax Amsterdam':'阿贾克斯','Anderlecht':'安德莱赫特','AZ Alkmaar':'阿尔克马尔','Benfica':'本菲卡','Besiktas':'贝西克塔斯','Bodo/Glimt':'博德闪耀','Braga':'布拉加','Celtic':'凯尔特人','Club Brugge':'布鲁日','CSKA Sofia':'索菲亚中央陆军','Dinamo Zagreb':'萨格勒布迪纳摩','F.C. København':'哥本哈根','FC Midtjylland':'中日德兰','FC Nordsjælland':'北西兰','FC Porto':'波尔图','FC Twente':'特温特','Fenerbahce':'费内巴切','Ferencvaros':'费伦茨瓦罗斯','Feyenoord Rotterdam':'费耶诺德','Galatasaray':'加拉塔萨雷','Hajduk Split':'斯普利特海杜克','Heart of Midlothian':'哈茨','Jablonec':'亚布洛内茨','KAA Gent':'根特','Kairat Almaty':'阿拉木图凯拉特','LASK Linz':'林茨','Lech Poznan':'波兹南莱赫','Levski Sofia':'索菲亚列夫斯基','Olympiacos':'奥林匹亚科斯','Omonia Nicosia':'奥莫尼亚','Panathinaikos':'帕纳辛奈科斯','PSV Eindhoven':'埃因霍温','RB Salzburg':'萨尔茨堡红牛','Red Star Belgrade':'贝尔格莱德红星','Shakhtar Donetsk':'顿涅茨克矿工','SK Brann':'布兰','SK Sturm Graz':'格拉茨风暴','Slavia Prague':'布拉格斯拉维亚','Slovan Bratislava':'布拉迪斯拉发斯洛伐克人','Sparta Prague':'布拉格斯巴达','Sporting CP':'葡萄牙体育','Trabzonspor':'特拉布宗体育','Union St.-Gilloise':'圣吉罗斯联合','Viktoria Plzen':'比尔森胜利'});
  const lookup = new Map(Object.entries(teams).map(([name,zh])=>[key(name),zh]));
  function team(raw, language = 'zh') {
    const en = raw?.nameEn || raw?.displayName || raw?.name || String(raw || '');
    if(language === 'en') return en;
    return lookup.get(key(en)) || (/[\u3400-\u9fff]/.test(raw?.nameZh || raw?.name || '') ? raw.nameZh || raw.name : `译名待核验（${en}）`);
  }
  function player(raw, language = 'zh') {
    if(!raw) return '';
    const en = typeof raw === 'string' ? raw : raw.nameEn || raw.name || raw.player || raw.display || '';
    const zh = window.FM_PLAYER_NAMES?.[key(en)] || (typeof raw === 'object' && raw.nameZhSource !== 'auto' && /[\u3400-\u9fff]/.test(raw.nameZh || '') ? raw.nameZh : '');
    if(language === 'en') return en;
    if(zh) return en && en !== zh ? `${zh}（${en}）` : zh;
    if(/[\u3400-\u9fff]/.test(en)) return en;
    return `译名待核验（${en}）`;
  }
  function score(value) { return String(value ?? '').replace(/(\d+)\s*[-–—:]\s*(\d+)/g, '$1\u2002:\u2002$2'); }
  window.FM_NAMES = {team, player, score};
})();
