'use strict';
(() => {
  const M = OrbitModel;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const sun = {id:'sun',name:'Солнце',latin:'SUN',type:'ЗВЕЗДА · ЦЕНТР НАШЕЙ СИСТЕМЫ',color:'#efbb70',size:20,description:'Звезда, которая объединяет восемь планет в одну систему. Её свет задаёт ритм жизни на нашем маленьком голубом мире.',note:'Свет преодолевает расстояние от Солнца до Земли примерно за 8 минут 20 секунд.'};
  const bodies = [sun,...M.planets];
  let selected = bodies.find(p=>p.id===location.hash.slice(1)) || M.planets[2];
  let simDate = M.clampDate(Date.now()), speed = 10, direction = 1;
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let running = !motionPreference.matches, topView = false, proportional = false, labels = true, orbits = true;
  let zoom = 1, pan = {x:0,y:0}, width = 0, height = 0, stars = [], hits = [], orbitCache = [], cacheBucket = null;
  let toastTimer, lastFrame = 0, lastPaint = 0, lastUI = 0;
  const canvas = $('#solar-canvas'), context = canvas.getContext('2d');
  const portrait = $('#portrait-canvas'), portraitContext = portrait.getContext('2d');
  const nf = new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0});
  const fmt = (n,d=1)=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:d}).format(n);
  const DEG = Math.PI/180;
  function random(seed) { let n=seed;return ()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;}; }
  function toast(message) { $('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3400); }

  function makeTexture(body,index) {
    const image=document.createElement('canvas');image.width=image.height=512;
    const c=image.getContext('2d'); if(!c) return image;
    const x=256,y=256,r=100,rng=random(974+index*123);
    const ring=(front)=>{c.save();c.translate(x,y);c.rotate(-.38);for(let n=0;n<13;n++){c.beginPath();c.ellipse(0,0,r*(1.4+n*.055),r*(.4+n*.016),0,front?0:Math.PI,front?Math.PI:2*Math.PI);c.strokeStyle=n===6?'#161b2766':`rgba(191,169,132,${.18+rng()*.36})`;c.lineWidth=3;c.stroke();}c.restore();};
    if(body.id==='saturn')ring(false);
    if(body.id==='earth'||body.id==='neptune'||body.id==='uranus') {const g=c.createRadialGradient(x,y,r*.94,x,y,r*1.14);g.addColorStop(0,body.color+'88');g.addColorStop(1,body.color+'00');c.fillStyle=g;c.beginPath();c.arc(x,y,r*1.14,0,Math.PI*2);c.fill();}
    c.save();c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.clip();c.fillStyle=body.color;c.fillRect(x-r,y-r,r*2,r*2);
    if(body.id==='earth') {
      const ocean=c.createLinearGradient(x-r,y-r,x+r,y+r);ocean.addColorStop(0,'#62b1d0');ocean.addColorStop(.5,'#2b719b');ocean.addColorStop(1,'#15344d');c.fillStyle=ocean;c.fillRect(x-r,y-r,r*2,r*2);
      const land=[[[.1,-.9],[.36,-.77],[.25,-.6],[.5,-.46],[.73,-.41],[.88,-.18],[.61,-.03],[.35,-.11],[.19,.02],[.4,.24],[.31,.52],[.06,.65],[-.1,.28],[-.21,.01],[-.12,-.27],[-.34,-.32],[-.14,-.57]],[[-.94,-.48],[-.72,-.8],[-.46,-.67],[-.39,-.45],[-.57,-.22],[-.48,-.1],[-.61,.09],[-.78,-.04]],[[-.51,.12],[-.25,.22],[-.22,.4],[-.37,.75],[-.51,.87],[-.62,.54],[-.64,.28]],[[.56,.51],[.78,.43],[.94,.64],[.72,.78],[.52,.68]]];
      land.forEach(points=>{c.beginPath();points.forEach(([a,b],i)=>i?c.lineTo(x+a*r,y+b*r):c.moveTo(x+a*r,y+b*r));c.closePath();c.fillStyle='#75a082';c.fill();c.strokeStyle='#9eb19766';c.lineWidth=1;c.stroke();});
      c.fillStyle='#b6ccbd';c.beginPath();c.ellipse(x-3,y-r+5,r*.5,r*.12,.15,0,Math.PI*2);c.fill();
      for(let i=0;i<40;i++){c.beginPath();c.ellipse(x+(rng()-.5)*r*2,y+(rng()-.5)*r*2,r*(.07+rng()*.2),r*.015,rng()-.5,0,Math.PI*2);c.fillStyle=`rgba(231,239,227,${.12+rng()*.4})`;c.fill();}
    } else if(['jupiter','saturn','venus','uranus','neptune'].includes(body.id)) {
      const palettes={jupiter:['#b68d73','#d0baa4','#a98471','#e1c9aa','#a68574','#ceb298'],saturn:['#c0ab7c','#d5c49e','#a89471','#d9c89d'],venus:['#e2c08b','#c29760','#d8ad72','#eed09f'],uranus:['#a2ced0','#86b8bf','#91c4ca'],neptune:['#4674ad','#5c8fc4','#3e669b','#527faf']};
      for(let i=0;i<55;i++){const yy=y-r+i*r*2/55; c.beginPath();c.moveTo(x-r*1.1,yy);for(let j=0;j<=12;j++){const xx=x-r+j*r/6;c.lineTo(xx,yy+Math.sin(j*.9+i*.55)*r*.014);}c.lineTo(x+r*1.1,yy+r*.07);c.lineTo(x-r*1.1,yy+r*.07);c.closePath();c.fillStyle=palettes[body.id][i%palettes[body.id].length];c.globalAlpha=body.id==='uranus'?.18:.65;c.fill();}c.globalAlpha=1;
      if(body.id==='jupiter'){c.beginPath();c.ellipse(x+r*.25,y+r*.29,r*.23,r*.095,-.08,0,Math.PI*2);c.fillStyle='#9e6d5c';c.fill();c.beginPath();c.ellipse(x+r*.25,y+r*.29,r*.15,r*.05,-.08,0,Math.PI*2);c.fillStyle='#bc8b74';c.fill();}
    } else if(body.id==='sun') {
      const fill=c.createRadialGradient(x-r*.35,y-r*.4,5,x,y,r);fill.addColorStop(0,'#fff0bc');fill.addColorStop(.65,'#edbd68');fill.addColorStop(1,'#d7883e');c.fillStyle=fill;c.fillRect(x-r,y-r,r*2,r*2);
      for(let i=0;i<1800;i++){c.fillStyle=rng()>.5?'#fff6c71f':'#995b3014';c.fillRect(x+(rng()-.5)*r*2,y+(rng()-.5)*r*2,1+rng()*3,1+rng()*3);}
    } else {
      for(let i=0;i<230;i++){const xx=x+(rng()-.5)*r*2,yy=y+(rng()-.5)*r*2,rr=r*(.012+rng()*.11);c.beginPath();c.arc(xx,yy,rr,0,Math.PI*2);c.fillStyle=body.id==='mars'?'#6c392b22':'#30313228';c.fill();c.strokeStyle=body.id==='mars'?'#d6a08025':'#e6ded022';c.lineWidth=.8;c.stroke();}
      if(body.id==='mars'){c.fillStyle='#d9d3bd88';c.beginPath();c.ellipse(x,y-r+3,r*.35,r*.1,0,0,Math.PI*2);c.fill();}
    }
    if(body.id!=='sun'){const light=c.createRadialGradient(x-r*.42,y-r*.5,0,x+r*.15,y+r*.12,r*1.2);light.addColorStop(0,'#ffffff22');light.addColorStop(.45,'#00000000');light.addColorStop(.83,'#04091677');light.addColorStop(1,'#01040be8');c.fillStyle=light;c.fillRect(x-r,y-r,r*2,r*2);const shadow=c.createLinearGradient(x-r,y,x+r,y+r*.2);shadow.addColorStop(0,'#050b1600');shadow.addColorStop(.6,'#050b1622');shadow.addColorStop(1,'#02040ad9');c.fillStyle=shadow;c.fillRect(x-r,y-r,r*2,r*2);}
    c.restore();c.beginPath();c.arc(x,y,r,0,2*Math.PI);c.strokeStyle=body.id==='sun'?'#ffe6bbaa':'#b4cfdd33';c.lineWidth=1;c.stroke();
    if(body.id==='saturn')ring(true);
    return image;
  }
  const textures=new Map(bodies.map((b,i)=>[b.id,makeTexture(b,i)]));
  function buildNav() {
    const nav=$('#planet-nav');
    nav.innerHTML=bodies.map((body,i)=>`${i===1?'<div class="nav-section">ВНУТРЕННИЕ ПЛАНЕТЫ</div>':i===5?'<div class="nav-section">ВНЕШНИЕ ПЛАНЕТЫ</div>':''}<button class="planet-button" data-id="${body.id}" aria-pressed="false"><span class="planet-dot" style="--color:${body.color}"></span><span class="nav-name">${body.name}</span><span class="nav-number">${i===0?'✦':String(i).padStart(2,'0')}</span></button>`).join('');
    nav.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>selectBody(b.dataset.id)));
  }
  function formatPeriod(p) {return p.period<2?`${fmt(p.period*365.25,1)}<small>сут</small>`:`${fmt(p.period,2)}<small>лет</small>`;}
  function formatRotation(p) {const days=Math.abs(p.rotation);return days>=2?`${fmt(days,1)}<small>сут${p.rotation<0?' ↺':''}</small>`:`${fmt(days*24,1)}<small>ч${p.rotation<0?' ↺':''}</small>`;}
  function selectBody(id) {
    selected=bodies.find(b=>b.id===id)||selected;
    try {history.replaceState(null,'','#'+selected.id);}catch{/* file origins can restrict history */}
    $$('.planet-button').forEach(b=>{const active=b.dataset.id===selected.id;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
    const p=selected;
    $('#planet-title').textContent=p.name;$('#planet-latin').textContent=p.latin;$('#planet-type').textContent=p.type;$('#planet-type').style.color=p.color;$('#planet-description').textContent=p.description;$('#planet-note').textContent=p.note;
    $('#planet-index').textContent=p.id==='sun'?'01 / 01':`${String(M.planets.indexOf(p)+1).padStart(2,'0')} / 08`;
    $('#distance-label').textContent=p.id==='sun'?'РОЛЬ В СИСТЕМЕ':'СРЕДНЯЯ ОРБИТА';$('#year-label').textContent=p.id==='sun'?'ПРИМЕРНЫЙ ВОЗРАСТ':'ОРБИТАЛЬНЫЙ ПЕРИОД';$('#rotation-label').textContent=p.id==='sun'?'ТЕМПЕРАТУРА ПОВЕРХНОСТИ':'ВРАЩЕНИЕ ВОКРУГ ОСИ';
    $('#planet-distance').innerHTML=p.id==='sun'?'Звезда':`${fmt(p.base[0],2)}<small>а.е.</small>`;
    $('#planet-diameter').innerHTML=p.id==='sun'?'≈1,4<small>млн км</small>':`${nf.format(p.radius*2)}<small>км</small>`;
    $('#planet-year').innerHTML=p.id==='sun'?'4,6<small>млрд лет</small>':formatPeriod(p);
    $('#planet-day').innerHTML=p.id==='sun'?'≈5 500<small>°C</small>':formatRotation(p);
    $('#nasa-link').href=p.id==='sun'?'https://science.nasa.gov/sun/facts/':p.id==='earth'?'https://science.nasa.gov/earth/facts/':`https://science.nasa.gov/${p.id}/facts/`;
    canvas.setAttribute('aria-label',`Карта Солнечной системы. Выбрано: ${p.name}. Стрелки перемещают карту, плюс и минус меняют масштаб.`);
    renderPortrait();updateUI();
  }
  function renderPortrait() {
    if(!portraitContext)return;
    const rect=portrait.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);
    portrait.width=Math.max(1,Math.round(rect.width*dpr));portrait.height=Math.max(1,Math.round(rect.height*dpr));portraitContext.setTransform(dpr,0,0,dpr,0,0);
    const r=Math.min(rect.height*.33,rect.width*(selected.id==='saturn'?.21:.3));const d=r*5.12;
    portraitContext.clearRect(0,0,rect.width,rect.height);portraitContext.drawImage(textures.get(selected.id),rect.width/2-d/2,rect.height/2-d/2-2,d,d);
  }
  function resize() {
    const rect=$('#scene').getBoundingClientRect();width=rect.width;height=rect.height;const dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);if(context)context.setTransform(dpr,0,0,dpr,0,0);
    const rng=random(87462);stars=Array.from({length:Math.min(460,Math.floor(width*height/1700))},()=>({x:rng()*width,y:rng()*height,r:.25+rng()*.7,alpha:.12+rng()*.45}));renderPortrait();
  }
  function compactA(a) {return .17+.83*Math.log(a/.387)/Math.log(30.07/.387);}
  function project(point,a) {
    const outer=Math.min(width*.43,height*.45)*zoom;
    const scale=outer*(proportional?1/30.07:compactA(a)/a);
    const yaw=-.32,xx=point.x*Math.cos(yaw)-point.y*Math.sin(yaw),yy=point.x*Math.sin(yaw)+point.y*Math.cos(yaw),tilt=topView?1:.55;
    return {x:width*.48+pan.x+xx*scale,y:height*.56+pan.y-yy*scale*tilt-point.z*scale*Math.sqrt(1-tilt*tilt)};
  }
  function updateOrbitCache() {
    const bucket=Math.floor(simDate/(M.DAY*20));if(bucket===cacheBucket)return;cacheBucket=bucket;
    orbitCache=M.planets.map(p=>{const el=M.elementsAt(p,simDate);return {body:p,a:el.a,points:Array.from({length:161},(_,i)=>M.fromEccentric(el,i/160*Math.PI*2))};});
  }
  function draw() {
    if(!context||!width||!height)return;
    const c=context;c.clearRect(0,0,width,height);
    for(const s of stars){c.beginPath();c.arc(s.x,s.y,s.r,0,Math.PI*2);c.fillStyle=`rgba(177,193,218,${s.alpha})`;c.fill();}
    updateOrbitCache();
    const origin=project({x:0,y:0,z:0},1);
    const nebula=c.createRadialGradient(origin.x,origin.y,0,origin.x,origin.y,Math.min(width,height)*.48);nebula.addColorStop(0,'#97633a13');nebula.addColorStop(.4,'#25324a0b');nebula.addColorStop(1,'#0c122000');c.fillStyle=nebula;c.fillRect(0,0,width,height);
    if(orbits)for(const orbit of orbitCache){c.beginPath();orbit.points.forEach((p,i)=>{const pt=project(p,orbit.a);i?c.lineTo(pt.x,pt.y):c.moveTo(pt.x,pt.y);});c.strokeStyle=orbit.body===selected?'#7ba5df77':'#5a6a8837';c.lineWidth=orbit.body===selected?1.2:.65;c.stroke();}
    const bodyPositions=M.planets.map(p=>{const real=M.positionAt(p,simDate);const pt=project(real,real.a);return {body:p,...pt,real};});bodyPositions.push({body:sun,...origin});bodyPositions.sort((a,b)=>a.y-b.y);
    hits=[];
    for(const entry of bodyPositions){const p=entry.body;const r=p.size*Math.pow(zoom,.25);if(entry.x<-100||entry.y<-100||entry.x>width+100||entry.y>height+100)continue;
      if(p.id==='sun'){const g=c.createRadialGradient(entry.x,entry.y,r*.65,entry.x,entry.y,r*4);g.addColorStop(0,'#e6ae5e77');g.addColorStop(.25,'#c57e3925');g.addColorStop(1,'#c57e3900');c.fillStyle=g;c.beginPath();c.arc(entry.x,entry.y,r*4,0,Math.PI*2);c.fill();}
      if(p===selected){c.beginPath();c.arc(entry.x,entry.y,r+7,0,Math.PI*2);c.strokeStyle=p.color+'b0';c.lineWidth=.8;c.stroke();c.beginPath();c.arc(entry.x,entry.y,r+11,0,Math.PI*2);c.strokeStyle=p.color+'24';c.stroke();}
      const size=r*5.12;c.drawImage(textures.get(p.id),entry.x-size/2,entry.y-size/2,size,size);
      hits.push({id:p.id,x:entry.x,y:entry.y,r:Math.max(14,r+7)});
      if(labels){c.font=`${p===selected?'500':'400'} ${p===selected?10:8}px Manrope,system-ui,sans-serif`;c.textAlign='center';c.textBaseline='top';c.fillStyle=p===selected?'#dce6f3':p.id==='sun'?'#c9a36c':'#8a99b1';c.fillText(p.name,entry.x,entry.y+r+(p.id==='saturn'?13:10));if(p===selected&&p.id!=='sun'){c.font='6px monospace';c.fillStyle='#627997';c.fillText(`${fmt(entry.real.r,2)} а.е.`,entry.x,entry.y+r+25);}}
    }
    c.font='6px monospace';c.fillStyle='#42516b';c.textAlign='left';const ax=30,ay=height-67;c.strokeStyle='#4e607b66';c.lineWidth=.8;c.beginPath();c.moveTo(ax,ay);c.lineTo(ax+24,ay+7);c.moveTo(ax,ay);c.lineTo(ax-7,ay-17);c.moveTo(ax,ay);c.lineTo(ax,ay-24);c.stroke();c.fillText('X',ax+28,ay+6);c.fillText('Y',ax-14,ay-21);c.fillText('Z',ax-2,ay-33);
  }
  function isoDate(ms) {return new Date(ms).toISOString().slice(0,10);}
  function updateUI() {
    const date=new Date(simDate),year=date.getUTCFullYear();
    if(document.activeElement!==$('#simulation-date'))$('#simulation-date').value=isoDate(simDate);
    const jan=Date.UTC(year,0,1),next=Date.UTC(year+1,0,1);$('#day-slider').max=(next-jan)/M.DAY-1;
    if(document.activeElement!==$('#day-slider'))$('#day-slider').value=Math.floor((simDate-jan)/M.DAY);
    $('#year-start').textContent=year;$('#year-end').textContent=year+1;
    $('#live-distance').textContent=selected.id==='sun'?'0 а.е.':`${fmt(M.positionAt(selected,simDate).r,3)} а.е.`;
    $('#play-button').textContent=running?'Ⅱ':'▶';$('#play-button').setAttribute('aria-label',running?'Пауза':'Продолжить');
    $('#simulation-state').innerHTML=`<i></i> ${running?(direction===1?'Симуляция идёт':'Время идёт назад'):'На паузе'}`;$('#simulation-state').classList.toggle('paused',!running);
  }
  function setRunning(value) {running=value;lastFrame=0;updateUI();}
  function setDate(ms,pause=true) {if(!Number.isFinite(ms))return;simDate=M.clampDate(ms);cacheBucket=null;if(pause)setRunning(false);updateUI();}
  function resetView() {zoom=1;pan={x:0,y:0};$('#zoom-label').textContent='100%';}
  function zoomBy(factor,x=width*.48,y=height*.56) {const next=Math.min(3.5,Math.max(.5,zoom*factor)),ratio=next/zoom;pan.x=x-width*.48-(x-width*.48-pan.x)*ratio;pan.y=y-height*.56-(y-height*.56-pan.y)*ratio;zoom=next;$('#zoom-label').textContent=`${Math.round(zoom*100)}%`;}
  function frame(time) {
    const dt=lastFrame?Math.min(.1,(time-lastFrame)/1000):0;lastFrame=time;
    if(running){const next=simDate+dt*speed*M.DAY*direction;simDate=M.clampDate(next);if(next!==simDate){setRunning(false);toast('Достигнута граница модели. Выбери дату в диапазоне 1800–2050.');}}
    if(time-lastPaint>=1000/30){draw();lastPaint=time;}
    if(time-lastUI>=200){updateUI();lastUI=time;}
    requestAnimationFrame(frame);
  }
  const pointers=new Map();let moved=false,travel=0;
  function pointerPoint(e) {const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,pointerPoint(e));if(pointers.size===1){moved=false;travel=0;}else moved=true;canvas.classList.add('dragging');});
  canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const previous=pointers.get(e.pointerId),point=pointerPoint(e);const before=[...pointers.values()];pointers.set(e.pointerId,point);if(pointers.size>=2){const after=[...pointers.values()];const oldDistance=Math.hypot(before[0].x-before[1].x,before[0].y-before[1].y),newDistance=Math.hypot(after[0].x-after[1].x,after[0].y-after[1].y);if(oldDistance>1)zoomBy(newDistance/oldDistance,(after[0].x+after[1].x)/2,(after[0].y+after[1].y)/2);moved=true;}else{const dx=point.x-previous.x,dy=point.y-previous.y;pan.x+=dx;pan.y+=dy;travel+=Math.hypot(dx,dy);if(travel>5)moved=true;}});
  canvas.addEventListener('pointerup',e=>{const point=pointerPoint(e);if(!moved&&pointers.size===1){const hit=hits.map(h=>({...h,d:Math.hypot(point.x-h.x,point.y-h.y)})).filter(h=>h.d<h.r).sort((a,b)=>a.d-b.d)[0];if(hit)selectBody(hit.id);}pointers.delete(e.pointerId);if(!pointers.size)canvas.classList.remove('dragging');});
  canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);if(!pointers.size)canvas.classList.remove('dragging');});
  canvas.addEventListener('wheel',e=>{e.preventDefault();const p=pointerPoint(e);zoomBy(Math.exp(-e.deltaY*.0015),p.x,p.y);},{passive:false});
  canvas.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey)return;const move={ArrowLeft:[25,0],ArrowRight:[-25,0],ArrowUp:[0,25],ArrowDown:[0,-25]}[e.key];if(move){e.preventDefault();pan.x+=move[0];pan.y+=move[1];}if(e.key==='+'||e.key==='='){e.preventDefault();zoomBy(1.2);}if(e.key==='-'){e.preventDefault();zoomBy(1/1.2);}if(e.key==='Home'){e.preventDefault();resetView();}});
  $('#play-button').addEventListener('click',()=>setRunning(!running));
  $('#speed').addEventListener('change',e=>{speed=Number(e.target.value);});
  $('#reverse-button').addEventListener('click',()=>{direction*=-1;$('#reverse-button').setAttribute('aria-pressed',String(direction===-1));updateUI();});
  $('#simulation-date').addEventListener('focus',()=>setRunning(false));
  $('#simulation-date').addEventListener('change',e=>{const ms=Date.parse(e.target.value+'T12:00:00Z');if(!Number.isFinite(ms)||ms<M.MIN_DATE||ms>M.MAX_DATE){toast('Выбери дату между 1800 и 2050 годами.');e.target.value=isoDate(simDate);return;}setDate(ms);});
  $('#simulation-date').addEventListener('blur',()=>{$('#simulation-date').value=isoDate(simDate);});
  $('#today-button').addEventListener('click',()=>setDate(Date.now(),true));
  $('#day-slider').addEventListener('input',e=>{const year=new Date(simDate).getUTCFullYear();setDate(Date.UTC(year,0,1)+Number(e.target.value)*M.DAY+M.DAY/2);});
  $('#zoom-in').addEventListener('click',()=>zoomBy(1.2));$('#zoom-out').addEventListener('click',()=>zoomBy(1/1.2));$('#reset-view').addEventListener('click',resetView);
  $('#view-button').addEventListener('click',e=>{topView=!topView;$('#view-button').setAttribute('aria-pressed',String(topView));$('#view-button').innerHTML=topView?'◎ <span>Вид сверху</span>':'◈ <span>Перспектива</span>';});
  $('#labels-button').addEventListener('click',()=>{labels=!labels;$('#labels-button').setAttribute('aria-pressed',String(labels));});
  $('#orbits-button').addEventListener('click',()=>{orbits=!orbits;$('#orbits-button').setAttribute('aria-pressed',String(orbits));});
  $('#scale-button').addEventListener('click',()=>{proportional=!proportional;$('#scale-button').setAttribute('aria-pressed',String(proportional));$('#scale-button span').textContent=proportional?'Пропорциональные расстояния':'Сжатые расстояния';$('#model-note').innerHTML=proportional?'Размеры планет увеличены. Расстояния пропорциональны. <span>ⓘ</span>':'Размеры планет увеличены. Расстояния сжаты. <span>ⓘ</span>';resetView();});
  function pagePlanet(delta){const index=bodies.indexOf(selected);selectBody(bodies[(index+delta+bodies.length)%bodies.length].id);}
  $('#previous-planet').addEventListener('click',()=>pagePlanet(-1));$('#next-planet').addEventListener('click',()=>pagePlanet(1));
  $('#about-button').addEventListener('click',()=>$('#about-dialog').showModal());$('#model-note').addEventListener('click',()=>$('#about-dialog').showModal());$('#close-about').addEventListener('click',()=>$('#about-dialog').close());
  document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||$('#about-dialog').open||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(e.code==='Space'&&document.activeElement?.tagName!=='BUTTON'){e.preventDefault();setRunning(!running);}if(/^[1-8]$/.test(e.key))selectBody(M.planets[Number(e.key)-1].id);});
  document.addEventListener('visibilitychange',()=>{lastFrame=0;});
  motionPreference.addEventListener('change',e=>{if(e.matches)setRunning(false);});
  $('#speed').value=String(speed);
  buildNav();resize();selectBody(selected.id);new ResizeObserver(resize).observe($('#scene'));new ResizeObserver(renderPortrait).observe($('.planet-portrait'));
  if(!context)$('#canvas-fallback').hidden=false;
  requestAnimationFrame(frame);
})();
