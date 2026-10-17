'use strict';
// Keplerian elements and rates: NASA/JPL SSD, Table 1 (1800–2050).
// Order: a [AU], e, I [deg], L [deg], longitude of perihelion [deg], ascending node [deg].
// Physical values: JPL Planetary Physical Parameters. Rotation is sidereal, not solar day.
((root) => {
  const DAY = 86400000, AU_KM = 149597870.7, J2000 = Date.UTC(2000,0,1,12);
  const MIN_DATE = Date.UTC(1800,0,1), MAX_DATE = Date.UTC(2051,0,1)-1;
  const RAD = Math.PI/180;
  const planets = [
    {id:'mercury',name:'Меркурий',latin:'MERCURY',type:'ПЛАНЕТА ЗЕМНОЙ ГРУППЫ',color:'#aaa49c',radius:2440.53,period:0.2408467,rotation:58.6462,size:5,
      description:'Первый мир от Солнца и самая маленькая из восьми планет. Его каменная поверхность хранит следы древних ударов.',note:'Меркурий проходит свою орбиту чуть меньше чем за 88 земных суток — быстрее любой другой планеты.',
      base:[0.38709927,0.20563593,7.00497902,252.25032350,77.45779628,48.33076593],rate:[0.00000037,0.00001906,-0.00594749,149472.67411175,0.16047689,-0.12534081]},
    {id:'venus',name:'Венера',latin:'VENUS',type:'ПЛАНЕТА ЗЕМНОЙ ГРУППЫ',color:'#d3ac73',radius:6051.8,period:0.61519726,rotation:-243.018,size:8,
      description:'Мир, близкий к Земле по размеру, но совершенно иной по условиям. Плотные облака скрывают его поверхность.',note:'Венера вращается в обратную сторону. Полный оборот вокруг оси занимает дольше, чем один оборот вокруг Солнца.',
      base:[0.72333566,0.00677672,3.39467605,181.97909950,131.60246718,76.67984255],rate:[0.00000390,-0.00004107,-0.00078890,58517.81538729,0.00268329,-0.27769418]},
    {id:'earth',name:'Земля',latin:'EARTH',type:'ПЛАНЕТА ЗЕМНОЙ ГРУППЫ',color:'#6c9ecf',radius:6378.1366,period:1.0000174,rotation:0.99726968,size:9,
      description:'Наш голубой дом. Океаны, облака и континенты делают этот небольшой мир особенным среди соседей.',note:'Среднее расстояние от Земли до Солнца — примерно одна астрономическая единица, или 149,6 миллиона километров.',
      base:[1.00000261,0.01671123,-0.00001531,100.46457166,102.93768193,0],rate:[0.00000562,-0.00004392,-0.01294668,35999.37244981,0.32327364,0]},
    {id:'mars',name:'Марс',latin:'MARS',type:'ПЛАНЕТА ЗЕМНОЙ ГРУППЫ',color:'#c57352',radius:3396.19,period:1.8808476,rotation:1.02595676,size:6.5,
      description:'Красный сосед Земли. Каменистый мир с тонкой атмосферой, пустынными равнинами и полярными шапками.',note:'Год на Марсе длится почти вдвое дольше земного, а оборот вокруг оси — лишь немного дольше земных суток.',
      base:[1.52371034,0.09339410,1.84969142,-4.55343205,-23.94362959,49.55953891],rate:[0.00001847,0.00007882,-0.00813131,19140.30268499,0.44441088,-0.29257343]},
    {id:'jupiter',name:'Юпитер',latin:'JUPITER',type:'ГАЗОВЫЙ ГИГАНТ',color:'#c5a281',radius:71492,period:11.862615,rotation:0.41354,size:21,
      description:'Самая большая планета Солнечной системы. Светлые и тёмные облачные пояса обнимают этот огромный газовый мир.',note:'Несмотря на размеры, Юпитер делает оборот вокруг оси примерно за 10 часов — быстрее остальных планет.',
      base:[5.20288700,0.04838624,1.30439695,34.39644051,14.72847983,100.47390909],rate:[-0.00011607,-0.00013253,-0.00183714,3034.74612775,0.21252668,0.20469106]},
    {id:'saturn',name:'Сатурн',latin:'SATURN',type:'ГАЗОВЫЙ ГИГАНТ',color:'#c6b58c',radius:60268,period:29.447498,rotation:0.44401,size:18,
      description:'Мир светлых облаков и широких колец. Второй по размеру гигант медленно движется по далёкой орбите.',note:'Один круг Сатурна вокруг Солнца занимает почти 30 земных лет. Ускорь время, чтобы заметить его движение.',
      base:[9.53667594,0.05386179,2.48599187,49.95424423,92.59887831,113.66242448],rate:[-0.00125060,-0.00050991,0.00193609,1222.49362201,-0.41897216,-0.28867794]},
    {id:'uranus',name:'Уран',latin:'URANUS',type:'ЛЕДЯНОЙ ГИГАНТ',color:'#8bbdc2',radius:25559,period:84.016846,rotation:-0.71833,size:13,
      description:'Спокойный на вид голубовато-зелёный мир. Его далёкая орбита лежит далеко за газовыми гигантами.',note:'Урану нужно около 84 земных лет на один оборот вокруг Солнца. Как и Венера, он имеет ретроградное вращение.',
      base:[19.18916464,0.04725744,0.77263783,313.23810451,170.95427630,74.01692503],rate:[-0.00196176,-0.00004397,-0.00242939,428.48202785,0.40805281,0.04240589]},
    {id:'neptune',name:'Нептун',latin:'NEPTUNE',type:'ЛЕДЯНОЙ ГИГАНТ',color:'#547fbf',radius:24764,period:164.79132,rotation:0.67125,size:12.5,
      description:'Последняя из восьми планет. Холодный ледяной гигант завершает наш маршрут по Солнечной системе.',note:'Нептун находится примерно в 30 раз дальше от Солнца, чем Земля. Его год длится почти 165 земных лет.',
      base:[30.06992276,0.00859048,1.77004347,-55.12002969,44.96476227,131.78422574],rate:[0.00026291,0.00005105,0.00035372,218.45945325,-0.32241464,-0.00508664]}
  ];
  function clampDate(ms) { return Math.max(MIN_DATE,Math.min(MAX_DATE,ms)); }
  function elementsAt(planet,ms) { const T=(ms-J2000)/(36525*DAY); const [a,e,I,L,peri,node]=planet.base.map((n,i)=>n+planet.rate[i]*T); return {a,e,I:I*RAD,L:L*RAD,peri:peri*RAD,node:node*RAD}; }
  function solveKepler(mean,e) { const M=((mean+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI; let E=M; for(let i=0;i<20;i++){const delta=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));E-=delta;if(Math.abs(delta)<1e-12)break;}return E; }
  function fromEccentric(elements,E) {
    const {a,e,I,peri,node}=elements; const w=peri-node;
    const xp=a*(Math.cos(E)-e),yp=a*Math.sqrt(1-e*e)*Math.sin(E);
    const cw=Math.cos(w),sw=Math.sin(w),cn=Math.cos(node),sn=Math.sin(node),ci=Math.cos(I),si=Math.sin(I);
    const x=(cw*cn-sw*sn*ci)*xp+(-sw*cn-cw*sn*ci)*yp;
    const y=(cw*sn+sw*cn*ci)*xp+(-sw*sn+cw*cn*ci)*yp;
    const z=sw*si*xp+cw*si*yp;
    return {x,y,z,r:Math.hypot(x,y,z)};
  }
  function positionAt(planet,ms) {const elements=elementsAt(planet,ms);return {...fromEccentric(elements,solveKepler(elements.L-elements.peri,elements.e)),a:elements.a};}
  const api={planets,DAY,AU_KM,J2000,MIN_DATE,MAX_DATE,clampDate,elementsAt,solveKepler,fromEccentric,positionAt};
  root.OrbitModel=api;
  if(typeof module!=='undefined' && module.exports) module.exports=api;
})(globalThis);
