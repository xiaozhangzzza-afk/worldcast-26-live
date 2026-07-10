window.FM_DATA = (() => {
  const makeDate = (hours) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  const teams = [
    { code:"ARG", zh:"阿根廷", en:"Argentina", flag:"🇦🇷", group:"A", attack:92, midfield:88, defense:84, players:["梅西 Lionel Messi","劳塔罗 Lautaro Martínez","恩佐 Enzo Fernández"], form:["胜","平","胜","负","胜"], strength:"控球与终结稳定", risk:"年龄结构与高强度对抗" },
    { code:"BRA", zh:"巴西", en:"Brazil", flag:"🇧🇷", group:"B", attack:91, midfield:86, defense:82, players:["维尼修斯 Vinícius Júnior","罗德里戈 Rodrygo","吉马良斯 Bruno Guimarães"], form:["胜","胜","平","胜","负"], strength:"边路爆点充足", risk:"防线转换保护" },
    { code:"FRA", zh:"法国", en:"France", flag:"🇫🇷", group:"C", attack:90, midfield:87, defense:86, players:["姆巴佩 Kylian Mbappé","格列兹曼 Antoine Griezmann","琼阿梅尼 Aurélien Tchouaméni"], form:["胜","胜","胜","平","负"], strength:"速度与防守覆盖", risk:"临场阵容变化" },
    { code:"ENG", zh:"英格兰", en:"England", flag:"🏴", group:"D", attack:88, midfield:89, defense:83, players:["贝林厄姆 Jude Bellingham","凯恩 Harry Kane","福登 Phil Foden"], form:["平","胜","胜","平","胜"], strength:"中前场选择丰富", risk:"关键战节奏管理" },
    { code:"GER", zh:"德国", en:"Germany", flag:"🇩🇪", group:"E", attack:86, midfield:88, defense:82, players:["穆西亚拉 Jamal Musiala","维尔茨 Florian Wirtz","基米希 Joshua Kimmich"], form:["胜","负","胜","胜","平"], strength:"中场推进质量", risk:"防线身后空间" },
    { code:"ESP", zh:"西班牙", en:"Spain", flag:"🇪🇸", group:"F", attack:85, midfield:90, defense:84, players:["罗德里 Rodri","佩德里 Pedri","亚马尔 Lamine Yamal"], form:["胜","平","胜","胜","平"], strength:"传控压制力", risk:"禁区效率波动" },
    { code:"POR", zh:"葡萄牙", en:"Portugal", flag:"🇵🇹", group:"G", attack:87, midfield:86, defense:82, players:["C罗 Cristiano Ronaldo","B费 Bruno Fernandes","莱奥 Rafael Leão"], form:["胜","胜","负","胜","平"], strength:"定位球与射门点", risk:"攻守平衡选择" },
    { code:"NED", zh:"荷兰", en:"Netherlands", flag:"🇳🇱", group:"H", attack:83, midfield:85, defense:87, players:["范戴克 Virgil van Dijk","德容 Frenkie de Jong","加克波 Cody Gakpo"], form:["平","胜","胜","负","胜"], strength:"防守结构清晰", risk:"阵地战破密防" },
    { code:"ITA", zh:"意大利", en:"Italy", flag:"🇮🇹", group:"I", attack:80, midfield:84, defense:86, players:["巴雷拉 Nicolò Barella","多纳鲁马 Gianluigi Donnarumma","基耶萨 Federico Chiesa"], form:["平","胜","负","平","胜"], strength:"防守韧性", risk:"持续进攻火力" },
    { code:"USA", zh:"美国", en:"United States", flag:"🇺🇸", group:"J", attack:78, midfield:80, defense:77, players:["普利西奇 Christian Pulisic","麦肯尼 Weston McKennie","雷纳 Gio Reyna"], form:["胜","平","负","胜","平"], strength:"体能与主场氛围", risk:"大赛经验" },
    { code:"JPN", zh:"日本", en:"Japan", flag:"🇯🇵", group:"J", attack:79, midfield:81, defense:78, players:["三笘薰 Kaoru Mitoma","久保建英 Takefusa Kubo","远藤航 Wataru Endo"], form:["胜","胜","平","负","胜"], strength:"团队速度与技术", risk:"身体对抗强度" },
    { code:"MEX", zh:"墨西哥", en:"Mexico", flag:"🇲🇽", group:"K", attack:77, midfield:79, defense:78, players:["希门尼斯 Raúl Jiménez","洛萨诺 Hirving Lozano","阿尔瓦雷斯 Edson Álvarez"], form:["负","胜","平","胜","负"], strength:"压迫强度", risk:"终结稳定性" },
    { code:"CAN", zh:"加拿大", en:"Canada", flag:"🇨🇦", group:"L", attack:76, midfield:78, defense:75, players:["戴维 Jonathan David","阿方索 Davies","欧斯塔基奥 Stephen Eustáquio"], form:["胜","负","平","胜","平"], strength:"速度冲击", risk:"后场抗压" }
  ];
  const matches = [
    { id:1, stage:"group", stageZh:"小组赛", stageEn:"Group Stage", date:makeDate(3), home:"ARG", away:"POR", score:"2-1", altScore:"1-1", probs:[45,28,27], confidence:79, venue:"梅赛德斯-奔驰体育场", status:"未开赛", factors:["进攻效率","定位球","赛程体能"], halfFull:"胜/胜" },
    { id:2, stage:"group", stageZh:"小组赛", stageEn:"Group Stage", date:makeDate(8), home:"FRA", away:"USA", score:"1-0", altScore:"2-0", probs:[52,25,23], confidence:81, venue:"大都会人寿体育场", status:"未开赛", factors:["防守稳定","边路速度","主场氛围"], halfFull:"平/胜" },
    { id:3, stage:"group", stageZh:"小组赛", stageEn:"Group Stage", date:makeDate(13), home:"BRA", away:"JPN", score:"2-0", altScore:"2-1", probs:[58,24,18], confidence:82, venue:"索菲体育场", status:"未开赛", factors:["前场创造","转换速度","控球压制"], halfFull:"胜/胜" },
    { id:4, stage:"group", stageZh:"小组赛", stageEn:"Group Stage", date:makeDate(28), home:"ENG", away:"MEX", score:"2-1", altScore:"1-0", probs:[50,27,23], confidence:78, venue:"AT&T 体育场", status:"未开赛", factors:["中场推进","定位球","防线回收"], halfFull:"平/胜" },
    { id:5, stage:"group", stageZh:"小组赛", stageEn:"Group Stage", date:makeDate(36), home:"GER", away:"CAN", score:"2-0", altScore:"1-0", probs:[56,25,19], confidence:80, venue:"林肯金融球场", status:"未开赛", factors:["控球质量","边路身后","经验差"], halfFull:"胜/胜" },
    { id:6, stage:"group", stageZh:"小组赛", stageEn:"Group Stage", date:makeDate(52), home:"ESP", away:"NED", score:"1-1", altScore:"1-0", probs:[39,32,29], confidence:74, venue:"硬石体育场", status:"未开赛", factors:["传控节奏","防守组织","射门质量"], halfFull:"平/平" },
    { id:7, stage:"r32", stageZh:"32强", stageEn:"Round of 32", date:makeDate(68), home:"ITA", away:"ARG", score:"0-1", altScore:"1-1", probs:[26,31,43], confidence:76, venue:"箭头体育场", status:"待定席位", factors:["防守韧性","关键球员","淘汰赛压力"], halfFull:"平/负" },
    { id:8, stage:"r16", stageZh:"16强", stageEn:"Round of 16", date:makeDate(92), home:"FRA", away:"BRA", score:"1-1", altScore:"1-2", probs:[34,31,35], confidence:73, venue:"玫瑰碗", status:"待定席位", factors:["强强对话","反击速度","细节波动"], halfFull:"平/平" },
    { id:9, stage:"qf", stageZh:"1/4决赛", stageEn:"Quarterfinal", date:makeDate(130), home:"ENG", away:"ESP", score:"1-1", altScore:"0-1", probs:[33,34,33], confidence:71, venue:"卢门球场", status:"待定席位", factors:["中场对抗","控球质量","定位球"], halfFull:"平/平" },
    { id:10, stage:"sf", stageZh:"半决赛", stageEn:"Semifinal", date:makeDate(176), home:"POR", away:"FRA", score:"1-2", altScore:"1-1", probs:[28,29,43], confidence:77, venue:"NRG 体育场", status:"待定席位", factors:["速度空间","定位球","临场调整"], halfFull:"平/负" },
    { id:11, stage:"final", stageZh:"决赛", stageEn:"Final", date:makeDate(228), home:"ARG", away:"FRA", score:"未开赛", altScore:"待定", probs:[36,31,33], confidence:72, venue:"大都会人寿体育场", status:"待定席位", factors:["决赛压力","球星效率","防守细节"], halfFull:"待确认" }
  ];
  const scoreDistribution = [
    ["1-0",18,"低比分","防守占优时更常见"],
    ["1-1",16,"平局区间","强弱接近时模型权重较高"],
    ["2-1",15,"谨慎胜出","热门队伍的小胜路径"],
    ["2-0",13,"低风险扩大","控球优势转化为第二球"],
    ["0-0",9,"低比分","开局谨慎或终结效率偏低"],
    ["3-1",7,"高比分","早段进球改变节奏"]
  ];
  const insights = [
    { type:"稳健观察", title:"阿根廷 vs 葡萄牙", range:"主比分 2-1，备选 1-1", confidence:"79%", reason:"两队都有稳定得分点，模型更看重阿根廷中前场连续性。", risk:"若临场轮换幅度较大，比分区间可能下修。" },
    { type:"进球数倾向", title:"法国 vs 美国", range:"1-0 或 2-0", confidence:"81%", reason:"法国防线评分和转换效率更稳定，模型倾向低到中比分。", risk:"主场氛围可能提升美国反击质量。" },
    { type:"平局区间", title:"西班牙 vs 荷兰", range:"1-1 或 1-0", confidence:"74%", reason:"双方控球和防守组织接近，模型认为前 60 分钟节奏偏谨慎。", risk:"早段进球会明显拉高总进球区间。" }
  ];
  const faq = [
    ["这个网站的数据是真实的吗？","当前为演示模型数据，后续可以接入真实赛程、阵容、赛果与事件 API。"],
    ["预测结果可以用于投注吗？","不可以。模型演示不构成投注、投资或财务建议。"],
    ["赛程时间准确吗？","以官方发布为准，本站当前展示为数据产品演示，时间默认按北京时间呈现。"],
    ["是否提供直播源？","不提供盗版直播源，只提供正规观赛与赛事资讯入口说明。"],
    ["可以添加到手机桌面吗？","支持 PWA 的浏览器可以通过菜单添加到桌面。"]
  ];
  return { teams, matches, scoreDistribution, insights, faq };
})();
