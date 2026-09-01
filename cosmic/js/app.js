(() => {
  'use strict';

  window.addEventListener('error', (e) => {
    console.error('[NEW CELESTIAL ARCHIVE 06.2]', e.error || e.message);
  });

  const canvas = document.getElementById('field');
  const ctx = canvas.getContext('2d', {alpha:false, desynchronized:true});
  const exposureCanvas = document.getElementById('exposure');
  const ectx = exposureCanvas.getContext('2d', {alpha:true, desynchronized:true});
  const languageBtn=document.getElementById('languageBtn'), languagePanel=document.getElementById('languagePanel');
  const sizeBtn=document.getElementById('sizeBtn'), sizePanel=document.getElementById('sizePanel'), sizeSet=document.getElementById('sizeSet');
  const photoSettingsBtn=document.getElementById('photoSettingsBtn'), photoPanel=document.getElementById('photoPanel');
  const selectedChip=document.getElementById('selectedChip'), objectOrbitBtn=document.getElementById('objectOrbitBtn'), objectClearBtn=document.getElementById('objectClearBtn');
  const TWO_PI = Math.PI*2, AU = 69, DEFAULT_EPOCH_JD = 2460800.5;
  const TEST_MODE = new URLSearchParams(location.search).has('test');

  // Source-AI-derived visual grammar: shape = spectral glyph, color switchable.
  const typePalette={D:'#ef3d46',E:'#f0e5e2',M:'#ef8d36',S:'#68c964',C:'#6256b8',OTHER:'#8a7d7b'};
  const typeOrder=['D','E','M','S','C','OTHER'];
  const groups=[
    {key:'Hungaria',label:'Hungaria Group',color:'#9b45a8',a:[1.78,2.02],e:[.02,.18],i:[16,34],count:120,types:['E','S','C']},
    {key:'Flora',label:'Flora Family',color:'#63b961',a:[2.12,2.34],e:[.03,.22],i:[1,9],count:160,types:['S','C','M']},
    {key:'Main Belt',label:'Main Belt',color:'#2f86bd',a:[2.20,3.20],e:[.02,.27],i:[0,24],count:500,types:['C','S','M','D','E']},
    {key:'Cybele',label:'Cybele Group',color:'#cf493b',a:[3.25,3.55],e:[.05,.28],i:[0,22],count:125,types:['C','D','M']},
    {key:'Hilda',label:'Hilda Group',color:'#b92c58',a:[3.70,4.20],e:[.08,.30],i:[0,24],count:130,types:['D','C','M']},
    {key:'Trojan',label:'Trojan Group',color:'#75314b',a:[5.05,5.38],e:[.02,.22],i:[0,36],count:175,types:['D','C','M']}
  ];
  const groupColor=Object.fromEntries(groups.map(g=>[g.key,g.color])); groupColor['NEO / AMOR']='#ee6543';
  const planets=[
    {name:'水星',en:'MERCURY',a:.387,c:'#ddd3ce',r:2.2,p:87.97,phase:.65},
    {name:'金星',en:'VENUS',a:.723,c:'#dcb739',r:3,p:224.7,phase:2.2},
    {name:'地球',en:'EARTH',a:1,c:'#32a9d8',r:3.2,p:365.26,phase:4.1},
    {name:'火星',en:'MARS',a:1.524,c:'#e54a51',r:2.8,p:686.98,phase:1.2},
    {name:'木星',en:'JUPITER',a:5.203,c:'#b99025',r:6.4,p:4332.6,phase:5.5}
  ];

  const realObjects=(window.REAL_ASTEROIDS||[]).map((o,index)=>({...o,spec:o.tax||'OTHER',context:false,selectable:true,index}));
  function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
  const rnd=mulberry32(20260817), rr=(a,b)=>a+(b-a)*rnd(), choose=a=>a[(rnd()*a.length)|0];
  function gauss(){let u=0,v=0;while(!u)u=rnd();while(!v)v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(TWO_PI*v)}
  const contextObjects=[]; let fid=0;
  groups.forEach((g,gi)=>{for(let n=0;n<g.count;n++){
    let ma=rr(0,360); if(g.key==='Trojan')ma=(rnd()<.5?60:300)+gauss()*17;
    const spec=choose(g.types),a=rr(...g.a),e=rr(...g.e),inc=Math.max(0,rr(...g.i)+gauss());
    contextObjects.push({id:`FIELD-${++fid}`,name:'FIELD',group:g.key,gi,spec,a,e,i:inc,om:rr(0,360),w:rr(0,360),ma,period:Math.sqrt(a*a*a)*365.256,diameter:Math.max(.4,Math.pow(rnd(),4)*90),albedo:Math.max(.02,Math.min(.6,({C:.07,S:.22,D:.05,M:.17,E:.38}[spec]||.12)+gauss()*.03)),context:true,selectable:false});
  }});
  const objects=[...contextObjects,...realObjects];

  const state={view:'atlas',yaw:-.18,pitch:.30,zoom:.96,targetYaw:-.18,targetPitch:.30,targetZoom:.96,morph:1,drag:false,hover:null,selected:null,
    group:'ALL',type:'ALL',minDiameter:0,colorMode:'type',time:0,playing:false,speed:1,exposure:false,fade:62,quality:'display',traceOnly:false,focus:false,
    layers:{objects:true,orbits:true,groups:false,spectrum:false,distance:true,wavelength:false},
    cameraPreset:'instrument',lang:'zh',background:'black',uiSize:localStorage.getItem('nca-ui-size')||'fine',fps:0,lastFpsAt:performance.now(),frames:0,accumTick:0};
  const viewCfg={
    atlas:{pitch:.30,yaw:-.18,zoom:.96,title:'天象图谱',sub:'ATLAS / 原图整体 + 空间深度',idx:'01'},
    orbit:{pitch:.63,yaw:.34,zoom:.96,title:'轨道分析',sub:'ORBIT / 倾斜椭圆与黄道面',idx:'02'},
    group:{pitch:.49,yaw:-.43,zoom:.90,title:'族群结构',sub:'GROUP / 动力学区域的空间剖面',idx:'03'},
    spectrum:{pitch:.49,yaw:.28,zoom:.92,title:'光谱空间',sub:'SPECTRUM / 距离 × 反照率 × 分类',idx:'04'},
    time:{pitch:.56,yaw:.18,zoom:.95,title:'时间曝光',sub:'TIME / 轨道运动与星轨累积',idx:'05'}
  };
  const cameraCfg={
    original:{view:'atlas',pitch:.035,yaw:0,zoom:1.02},
    instrument:{view:'atlas',pitch:.30,yaw:-.18,zoom:.96},
    ecliptic:{view:'orbit',pitch:1.13,yaw:.18,zoom:.92},
    deep:{view:'orbit',pitch:.38,yaw:1.02,zoom:1.28},
    data:{view:'spectrum',pitch:.34,yaw:.18,zoom:1.03},
    exposure:{view:'time',pitch:.57,yaw:-.46,zoom:1.04}
  };

  let W=0,H=0,DPR=1,cx=0,cy=0,exposureScale=.65;
  function qualityConfig(){return state.quality==='display'?{dpr:1,context:760,glow:false,expScale:.52}:state.quality==='balanced'?{dpr:Math.min(devicePixelRatio||1,1.35),context:1100,glow:true,expScale:.65}:{dpr:Math.min(devicePixelRatio||1,1.6),context:contextObjects.length,glow:true,expScale:.78}}
  function resize(){const q=qualityConfig();DPR=q.dpr;exposureScale=q.expScale;W=innerWidth;H=innerHeight;cx=W*.5;cy=H*.51;canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0);exposureCanvas.width=Math.max(1,Math.round(W*exposureScale));exposureCanvas.height=Math.max(1,Math.round(H*exposureScale));exposureCanvas.style.width=W+'px';exposureCanvas.style.height=H+'px';clearExposureCanvas();}
  addEventListener('resize',resize);resize();

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,rad=d=>d*Math.PI/180,ease=t=>1-Math.pow(1-t,3);
  function rgb(h){const n=parseInt(h.slice(1),16);return[(n>>16)&255,(n>>8)&255,n&255]}
  function rgba(h,a){const [r,g,b]=rgb(h);return`rgba(${r},${g},${b},${a})`}
  function mix(a,b,t){const A=rgb(a),B=rgb(b);return'#'+A.map((v,i)=>Math.round(lerp(v,B[i],t)).toString(16).padStart(2,'0')).join('')}
  function colorOf(o){return state.colorMode==='type'?(typePalette[o.spec]||typePalette.OTHER):(groupColor[o.group]||'#8f8582')}
  const backgroundSources={
    cliffs:'assets/bg-cosmic-cliffs.jpg',
    deepfield:'assets/bg-webb-deep-field.jpg',
    pillars:'assets/bg-pillars.jpg',
    xdf:'assets/bg-xdf.jpg'
  };
  const backgroundImages={};
  Object.entries(backgroundSources).forEach(([k,src])=>{const im=new Image();im.src=src;backgroundImages[k]=im});
  const ink=a=>`rgba(255,255,255,${a})`;
  const solidInk=()=> '#fff';
  const BASE_EPOCH_JD=(realObjects.find(o=>Number.isFinite(+o.epoch))?.epoch)||DEFAULT_EPOCH_JD;
  function jdToDate(jd){const ms=(jd-2440587.5)*86400000;return new Date(ms)}
  function modelDate(){return jdToDate(BASE_EPOCH_JD+state.time*365.256)}
  function formatModelDate(){const d=modelDate(),y=d.getUTCFullYear(),m=String(d.getUTCMonth()+1).padStart(2,'0'),day=String(d.getUTCDate()).padStart(2,'0');return `${y}.${m}.${day}`}

  function kepler(o,time=state.time){const period=o.period||Math.sqrt(o.a**3)*365.256;const M=rad((((o.ma||0)+(time*365.256/period)*360)%360+360)%360);let E=M;for(let j=0;j<7;j++)E=M+o.e*Math.sin(E);const xv=o.a*(Math.cos(E)-o.e),yv=o.a*Math.sqrt(1-o.e*o.e)*Math.sin(E),v=Math.atan2(yv,xv),r=Math.hypot(xv,yv),O=rad(o.om||0),w=rad(o.w||0),i=rad(o.i||0),u=v+w;return{x:r*(Math.cos(O)*Math.cos(u)-Math.sin(O)*Math.sin(u)*Math.cos(i))*AU,y:r*(Math.sin(O)*Math.cos(u)+Math.cos(O)*Math.sin(u)*Math.cos(i))*AU,z:r*Math.sin(u)*Math.sin(i)*AU}}
  function planetPos(p,time=state.time){const a=p.phase+time*365.256/p.p*TWO_PI;return{x:Math.cos(a)*p.a*AU,y:Math.sin(a)*p.a*AU,z:0}}
  function modePos(o,mode=state.view,time=state.time){const p=kepler(o,time);if(mode==='atlas')return{x:p.x,y:p.y,z:p.z*.13};if(mode==='orbit'||mode==='time')return p;if(mode==='group'){let gi=groups.findIndex(g=>g.key===o.group);if(gi<0)gi=2.5;const a=rad((o.ma||0)*.72+(o.om||0)*.2),r=62+(o.a-1.7)*20;return{x:Math.cos(a)*r*1.55,y:Math.sin(a)*r*.72,z:(gi-2.5)*64+(o.i-10)}}const si=Math.max(0,typeOrder.indexOf(o.spec));return{x:(o.a-3.1)*112,y:(o.albedo-.16)*470,z:(si-2.45)*69}}
  objects.forEach(o=>{o.current=modePos(o,'atlas');o.from={...o.current};o.screen={x:0,y:0,d:0,visible:false}});

  function project(p){const c=Math.cos(state.yaw),s=Math.sin(state.yaw),x=c*p.x-s*p.y,y=s*p.x+c*p.y,z=p.z,cp=Math.cos(state.pitch),sp=Math.sin(state.pitch),y2=cp*y-sp*z,z2=sp*y+cp*z,persp=(state.view==='atlas'||state.view==='spectrum')?1:Math.max(.55,1-z2/1450),sc=state.zoom*persp;return{x:cx+x*sc,y:cy+y2*sc,d:z2,sc}}
  function visible(o){return(state.group==='ALL'||o.group===state.group)&&(state.type==='ALL'||o.spec===state.type)&&(o.context||((o.diameter||0)>=state.minDiameter))}
  function line3(points,stroke,width=1,dash=null){if(points.length<2)return;ctx.save();if(dash)ctx.setLineDash(dash);ctx.beginPath();points.forEach((p,i)=>{const q=project(p);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();ctx.restore()}
  function orbitPts(o,steps=120){const out=[],old=o.ma;for(let k=0;k<=steps;k++){o.ma=k/steps*360;out.push(modePos(o,state.view));}o.ma=old;return out}

  function drawBackground(){
    const im=backgroundImages[state.background];
    if(state.background!=='black'&&im&&im.complete&&im.naturalWidth){
      const ir=im.naturalWidth/im.naturalHeight,wr=W/H;
      let sx=0,sy=0,sw=im.naturalWidth,sh=im.naturalHeight;
      if(ir>wr){sw=sh*wr;sx=(im.naturalWidth-sw)/2}else{sh=sw/wr;sy=(im.naturalHeight-sh)/2}
      ctx.drawImage(im,sx,sy,sw,sh,0,0,W,H);
      ctx.fillStyle='rgba(3,4,8,.64)';ctx.fillRect(0,0,W,H);
      const vg=ctx.createRadialGradient(cx,cy,Math.min(W,H)*.08,cx,cy,Math.min(W,H)*.72);
      vg.addColorStop(0,'rgba(0,0,0,.02)');vg.addColorStop(1,'rgba(0,0,0,.56)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
      return;
    }
    ctx.fillStyle='#0b0808';ctx.fillRect(0,0,W,H);
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.min(W,H)*.65);
    g.addColorStop(0,'rgba(45,30,28,.20)');g.addColorStop(.65,'rgba(16,10,10,.05)');g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.fillStyle='rgba(255,255,255,.11)';
    for(let i=0;i<100;i++){const x=(i*7919%997)/997*W,y=(i*3571%991)/991*H;ctx.fillRect(x,y,i%23===0?1:.45,i%23===0?1:.45)}
  }
  function drawGauge(){if(state.view!=='atlas'||!state.layers.distance)return;const R=Math.min(W,H)*.40;ctx.strokeStyle=ink(.38);ctx.lineWidth=.7;ctx.beginPath();ctx.arc(cx,cy,R,0,TWO_PI);ctx.stroke();for(let d=0;d<360;d+=5){const a=rad(d-90),major=d%30===0,r0=R-(major?13:6);ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0);ctx.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);ctx.strokeStyle=major?ink(.55):ink(.27);ctx.stroke();if(major){ctx.save();ctx.translate(cx+Math.cos(a)*(R-28),cy+Math.sin(a)*(R-28));ctx.rotate(a+Math.PI/2);ctx.font='7px Arial';ctx.fillStyle=ink(.72);ctx.textAlign='center';ctx.fillText(String(d),0,0);ctx.restore()}}}
  function drawReference(){if(!state.layers.orbits||state.view==='group'||state.view==='spectrum')return;[.39,.72,1,1.52,2,3,4,5.2].forEach((r,i)=>{const pts=[];for(let k=0;k<=84;k++){const a=k/84*TWO_PI;pts.push({x:Math.cos(a)*r*AU,y:Math.sin(a)*r*AU,z:0})}line3(pts,i<4?ink(.18):ink(.08),i===2?.9:.55)});if(state.view==='orbit'||state.view==='time'){for(let d=0;d<360;d+=30){const a=rad(d);line3([{x:0,y:0,z:0},{x:Math.cos(a)*5.55*AU,y:Math.sin(a)*5.55*AU,z:0}],ink(.035),.5)}line3([{x:-5.55*AU,y:0,z:0},{x:5.55*AU,y:0,z:0}],'rgba(255,68,80,.28)',.8,[3,6])}}
  function drawGroupBands(){
    if(!state.layers.groups||state.view!=='atlas')return;
    const arcs=[['Hungaria',1.95,-.2,.8],['Flora',2.25,.7,2.05],['Main Belt',2.75,1.65,3.72],['Cybele',3.4,2.95,4.13],['Hilda',3.95,4.05,5.2],['Trojan',5.2,5.0,6.12]];
    arcs.forEach(([key,r,a0,a1],idx)=>{
      const pts=[];for(let k=0;k<=42;k++){const a=lerp(a0,a1,k/42);pts.push({x:Math.cos(a)*r*AU,y:Math.sin(a)*r*AU,z:(idx%2?2:-2)})}
      line3(pts,rgba(groupColor[key],.24),idx===2?1.25:.8);
      const mid=(a0+a1)/2,p=project({x:Math.cos(mid)*r*AU,y:Math.sin(mid)*r*AU,z:0});
      ctx.fillStyle=rgba(groupColor[key],.75);ctx.font='6px Arial';ctx.fillText(key.toUpperCase(),p.x+4,p.y-4)
    })
  }

  function drawSpectralBelt(){
    if(!state.layers.spectrum||(state.view!=='atlas'&&state.view!=='orbit'))return;
    const r=2.58*AU,steps=160,cols=['#245cb3','#2da7a3','#65bd57','#d4c039','#ee7d3b','#df394e','#9b3e91','#465bbb'];
    for(let k=0;k<steps;k++){
      const a0=k/steps*TWO_PI,a1=(k+1)/steps*TWO_PI,t=k/(steps-1),u=t*(cols.length-1),ci=Math.min(cols.length-2,Math.floor(u)),lt=u-ci;
      const c=mix(cols[ci],cols[ci+1],lt),p0={x:Math.cos(a0)*r,y:Math.sin(a0)*r,z:0},p1={x:Math.cos(a1)*r,y:Math.sin(a1)*r,z:0};
      line3([p0,p1],rgba(c,.66),5.2)
    }
    if(state.view==='atlas'){const p=project({x:r*.72,y:-r*.69,z:0});ctx.fillStyle=ink(.58);ctx.font='6px Arial';ctx.fillText('光谱带 / SPECTRAL BELT',p.x,p.y)}
  }

  function drawSunPlanets(){if(state.view==='group'||state.view==='spectrum')return;const q=qualityConfig(),sun=project({x:0,y:0,z:0});if(q.glow){const g=ctx.createRadialGradient(sun.x,sun.y,0,sun.x,sun.y,30);g.addColorStop(0,'rgba(255,180,115,.75)');g.addColorStop(.3,'rgba(244,117,48,.18)');g.addColorStop(1,'rgba(244,100,20,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(sun.x,sun.y,30,0,TWO_PI);ctx.fill()}ctx.fillStyle='#ef8756';ctx.beginPath();ctx.arc(sun.x,sun.y,7,0,TWO_PI);ctx.fill();ctx.strokeStyle=ink(.65);ctx.beginPath();ctx.arc(sun.x,sun.y,10,0,TWO_PI);ctx.stroke();planets.forEach(p=>{const s=project(planetPos(p)),r=p.r*Math.max(.8,s.sc);ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(s.x,s.y,r,0,TWO_PI);ctx.fill();if(q.glow){ctx.strokeStyle=rgba(p.c,.34);ctx.lineWidth=4;ctx.beginPath();ctx.arc(s.x,s.y,r+2,0,TWO_PI);ctx.stroke()}if(state.view==='atlas'){ctx.font='6px Arial';ctx.fillStyle=ink(.65);ctx.fillText(p.name,s.x+6,s.y-5)}})}

  function polygon(x,y,r,n,rot=0){return Array.from({length:n},(_,k)=>[x+Math.cos(rot+k*TWO_PI/n)*r,y+Math.sin(rot+k*TWO_PI/n)*r])}
  function fillPoly(pts,c){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=c;ctx.fill()}
  function glyph(o,x,y,r,a=1){const c=colorOf(o);ctx.save();ctx.globalAlpha=a;const dx=Math.max(1,r*.22)*Math.cos(state.yaw+.8),dy=-Math.max(1,r*.22)*(.6+Math.sin(state.pitch)*.25);if(o.spec==='S'){ctx.fillStyle=rgba(c,.32);ctx.beginPath();ctx.ellipse(x+dx,y+dy,r*1.18,r*.40,-.08,0,TWO_PI);ctx.fill();ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,r*1.18,r*.42,-.08,0,TWO_PI);ctx.fill();ctx.strokeStyle=ink(.28);ctx.lineWidth=.45;ctx.stroke();ctx.restore();return}let pts;if(o.spec==='D')pts=polygon(x,y,r,4,Math.PI/4);else if(o.spec==='E')pts=[[x-r*.95,y+r*.22],[x-r*.15,y-r*.76],[x+r*.96,y-r*.2],[x+r*.14,y+r*.75]];else if(o.spec==='M')pts=[[x,y-r],[x+r*.92,y+r*.82],[x-r*.92,y+r*.82]];else if(o.spec==='C')pts=polygon(x,y,r,6,0);else{ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r*.5,0,TWO_PI);ctx.fill();ctx.restore();return}const back=pts.map(([px,py])=>[px+dx,py+dy]);ctx.globalAlpha=a*.34;fillPoly(back,mix(c,'#000000',.5));ctx.globalAlpha=a;fillPoly(pts,c);ctx.strokeStyle=ink(.25);ctx.lineWidth=.45;ctx.stroke();ctx.restore()}

  function drawAxes(){if(state.view==='group'){if(!state.layers.groups)return;groups.forEach((g,gi)=>{const z=(gi-2.5)*64,p=project({x:-185,y:-110,z});ctx.fillStyle=g.color;ctx.font='8px Arial';ctx.fillText(`${String(gi+1).padStart(2,'0')}  ${g.label}`,p.x,p.y);line3([{x:-175,y:-100,z},{x:185,y:-100,z}],rgba(g.color,.18),.7)});ctx.fillStyle='#ff4d58';ctx.font='8px Arial';ctx.fillText('分析空间 / ANALYTICAL SPACE',28,112)}else if(state.view==='spectrum'){const xmin=-235,xmax=285,ymin=-150,ymax=180,zmin=-185,zmax=190;line3([{x:xmin,y:ymin,z:zmin},{x:xmax,y:ymin,z:zmin}],ink(.28),.8);line3([{x:xmin,y:ymin,z:zmin},{x:xmin,y:ymax,z:zmin}],ink(.28),.8);line3([{x:xmin,y:ymin,z:zmin},{x:xmin,y:ymin,z:zmax}],ink(.28),.8);typeOrder.forEach((t,ti)=>{const z=(ti-2.45)*69;line3([{x:xmin,y:ymin,z},{x:xmax,y:ymin,z}],ink(.055),.5);const p=project({x:xmin-18,y:ymin,z});ctx.fillStyle=typePalette[t];ctx.font='8px Arial';ctx.fillText(t,p.x,p.y)});ctx.fillStyle='#7b7270';ctx.font='7px Arial';let p=project({x:xmax,y:ymin,z:zmin});ctx.fillText('轨道距离 ORBITAL DISTANCE →',p.x-110,p.y+16);p=project({x:xmin,y:ymax,z:zmin});ctx.fillText('↑ 反照率 ALBEDO',p.x-8,p.y-7)}}

  function drawSelectedOrbit(){if(!state.selected||state.view==='group'||state.view==='spectrum')return;line3(orbitPts(state.selected,150),ink(.72),1);if(state.traceOnly){line3(orbitPts(state.selected,150),rgba(colorOf(state.selected),.85),1.3,[2,4])}}
  function drawRepOrbits(){if(!state.layers.orbits||(state.view!=='orbit'&&state.view!=='time'))return;const list=state.selected?[state.selected]:realObjects;list.forEach(o=>{if(visible(o))line3(orbitPts(o,90),state.selected?ink(.6):rgba(colorOf(o),.12),state.selected?1:.55)})}

  function updatePositions(){const t=ease(Math.min(1,state.morph));for(const o of objects){const target=modePos(o);o.current.x=lerp(o.from.x,target.x,t);o.current.y=lerp(o.from.y,target.y,t);o.current.z=lerp(o.from.z,target.z,t)}}
  function drawObjects(){if(!state.layers.objects)return;const q=qualityConfig(),limit=q.context,arr=[];let used=0;for(const o of objects){if(o.context&&used++>=limit)continue;const p=project(o.current);o.screen=p;o.screen.visible=visible(o)&&p.x>-30&&p.x<W+30&&p.y>-30&&p.y<H+30;if(o.screen.visible)arr.push(o)}arr.sort((a,b)=>a.screen.d-b.screen.d);for(const o of arr){if(!o.context)continue;const a=state.selected?.08:(state.view==='spectrum'?.33:.52),r=(1.1+Math.min(1.4,Math.log10((o.diameter||1)+1)*.38))*Math.max(.68,o.screen.sc);glyph(o,o.screen.x,o.screen.y,r,a)}for(const o of arr){if(o.context)continue;const sel=state.selected===o,hov=state.hover===o;let a=state.selected&&!sel?.16:1;const r=(4.1+clamp(Math.log10((o.diameter||8)+2),.8,2.8))*Math.max(.75,o.screen.sc)*(sel?1.35:1);if(q.glow&&(sel||hov)){const c=colorOf(o),g=ctx.createRadialGradient(o.screen.x,o.screen.y,0,o.screen.x,o.screen.y,r*3);g.addColorStop(0,rgba(c,sel?.22:.12));g.addColorStop(1,rgba(c,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(o.screen.x,o.screen.y,r*3,0,TWO_PI);ctx.fill()}glyph(o,o.screen.x,o.screen.y,r,a);if(sel||hov){ctx.strokeStyle=sel?ink(.82):ink(.38);ctx.lineWidth=.7;ctx.beginPath();ctx.arc(o.screen.x,o.screen.y,r+6,0,TWO_PI);ctx.stroke()}}if(state.selected?.screen?.visible){const p=state.selected.screen;ctx.strokeStyle=ink(.34);ctx.beginPath();ctx.moveTo(p.x+8,p.y-8);ctx.lineTo(p.x+38,p.y-38);ctx.lineTo(Math.min(W-350,p.x+115),p.y-38);ctx.stroke();ctx.fillStyle=solidInk();ctx.font='8px Arial';ctx.fillText(state.selected.name,Math.min(W-345,p.x+43),p.y-44)}}

  // PERFORMANCE-OPTIMIZED EXPOSURE ENGINE
  // We accumulate tiny current-position strokes into a low-res offscreen canvas.
  // No per-object history arrays, no hundreds of line segments recalculated each frame.
  function clearExposureCanvas(){ectx.setTransform(1,0,0,1,0,0);ectx.clearRect(0,0,exposureCanvas.width,exposureCanvas.height)}
  function exposurePoint(world,color,size,alpha){const p=project(world),sx=p.x*exposureScale,sy=p.y*exposureScale;ectx.globalCompositeOperation='lighter';ectx.fillStyle=rgba(color,alpha);ectx.beginPath();ectx.arc(sx,sy,size*exposureScale,0,TWO_PI);ectx.fill()}
  function accumulateExposure(){if(!state.exposure||!state.playing||(state.view!=='time'&&state.view!=='orbit'&&state.view!=='atlas'))return;state.accumTick++;const stride=state.quality==='photo'?1:2;if(state.accumTick%stride)return;const fadeKeep=.993-(100-state.fade)*.00075;ectx.globalCompositeOperation='destination-in';ectx.fillStyle=`rgba(0,0,0,${clamp(fadeKeep,.91,.997)})`;ectx.fillRect(0,0,exposureCanvas.width,exposureCanvas.height);ectx.globalCompositeOperation='lighter';for(const p of planets)exposurePoint(planetPos(p),p.c,state.quality==='photo'?1.25:.85,.12);const list=state.selected?[state.selected]:realObjects;for(const o of list){if(!visible(o))continue;exposurePoint(modePos(o,state.view),colorOf(o),state.selected?1.4:.72,state.selected?.18:.08)}if(state.quality==='photo'&&!state.selected){let n=0;for(const o of contextObjects){if((n++%13)!==0||!visible(o))continue;exposurePoint(modePos(o,state.view),colorOf(o),.42,.018)}}}

  function render(){state.frames++;const now=performance.now();if(now-state.lastFpsAt>650){state.fps=Math.round(state.frames*1000/(now-state.lastFpsAt));state.frames=0;state.lastFpsAt=now;document.getElementById('fpsRead').textContent=state.fps+' FPS'}if(state.morph<1)state.morph=Math.min(1,state.morph+.026);state.yaw=lerp(state.yaw,state.targetYaw,.075);state.pitch=lerp(state.pitch,state.targetPitch,.075);state.zoom=lerp(state.zoom,state.targetZoom,.08);if(state.playing){state.time+=.00043*state.speed;if(state.time>20)state.time=-20;document.getElementById('timeRange').value=state.time}updatePositions();drawBackground();drawGauge();drawReference();drawSpectralBelt();drawGroupBands();drawRepOrbits();drawSelectedOrbit();drawSunPlanets();drawAxes();drawObjects();accumulateExposure();updateWavelengthLegend();document.getElementById('timeRead').textContent=formatModelDate();if(!TEST_MODE)requestAnimationFrame(render)}

  function setView(v){
    if(v!==state.view){state.view=v;state.morph=0;objects.forEach(o=>o.from={...o.current})}
    const c=viewCfg[v];state.targetPitch=c.pitch;state.targetYaw=c.yaw;state.targetZoom=c.zoom;
    if(v==='group')state.layers.groups=true;
    if(v==='spectrum')state.colorMode='type';
    document.querySelectorAll('.view-nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
    document.getElementById('modeIndex').textContent=c.idx;const L=I18N[state.lang]||I18N.zh;const mt={atlas:[L.modeAtlas,L.modeAtlasSub],orbit:[L.modeOrbit,L.modeOrbitSub],group:[L.modeGroup,L.modeGroupSub],spectrum:[L.modeSpectrum,L.modeSpectrumSub],time:[L.modeTime,L.modeTimeSub]}[v];document.getElementById('modeTitle').textContent=mt[0];document.getElementById('modeSub').textContent=mt[1];
    updateLayerButtons();updateColorButtons();clearExposureCanvas()
  }
  document.querySelectorAll('.view-nav button').forEach(b=>b.onclick=()=>setView(b.dataset.view));

  function ptr(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
  canvas.addEventListener('pointerdown',e=>{state.drag=true;state.px=e.clientX;state.py=e.clientY;canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(state.drag){const dx=e.clientX-state.px,dy=e.clientY-state.py;state.px=e.clientX;state.py=e.clientY;state.targetYaw+=dx*.006;state.targetPitch=clamp(state.targetPitch+dy*.005,-.08,1.32);clearExposureCanvas();return}const m=ptr(e);let best=null,bd=18;for(const o of realObjects){if(!o.screen.visible)continue;const d=Math.hypot(m.x-o.screen.x,m.y-o.screen.y);if(d<bd){bd=d;best=o}}state.hover=best;const card=document.getElementById('hoverCard');if(best){card.classList.add('visible');card.style.left=Math.min(W-220,m.x+16)+'px';card.style.top=Math.min(H-110,m.y+16)+'px';hoverGroup.textContent=best.group+' / '+(best.taxRaw||best.spec);hoverName.textContent=best.name;hoverMeta.textContent=`a ${best.a.toFixed(3)} AU · i ${best.i.toFixed(2)}° · ${(best.diameter||0).toFixed(1)} km`}else card.classList.remove('visible')});
  canvas.addEventListener('pointerup',()=>state.drag=false);canvas.addEventListener('pointercancel',()=>state.drag=false);canvas.addEventListener('wheel',e=>{e.preventDefault();state.targetZoom=clamp(state.targetZoom*Math.exp(-e.deltaY*.0008),.42,2.6);clearExposureCanvas()},{passive:false});canvas.addEventListener('click',()=>{if(state.hover)selectObject(state.hover)});

  const fmt=(v,d=2)=>Number.isFinite(+v)?(+v).toFixed(d):'—';
  function updateSelectedChip(){
    const chip=document.getElementById('selectedChip');
    if(!chip)return;
    chip.classList.toggle('visible',!!state.selected);
    if(state.selected){chip.querySelector('b').textContent=state.selected.name;chip.querySelector('small').textContent=`${state.selected.id} · SELECTED OBJECT`}
  }
  function selectObject(o){
    state.selected=o;closeDrawers(objectPanel);document.getElementById('objectPanel').classList.add('open');syncDrawerState();
    objectId.textContent=`${o.id} / ${o.orbitClass||'OBJECT'}`;objectName.textContent=o.name;const c=colorOf(o);
    objectTags.innerHTML=`<span style="border-color:${c}88;color:${c}">${o.taxRaw||o.spec}</span><span>${o.group}</span><span>${o.orbitClass||'—'}</span>`;
    const ms=[['轨道半长轴','SEMI-MAJOR AXIS',fmt(o.a,3)+' AU'],['偏心率','ECCENTRICITY',fmt(o.e,4)],['轨道倾角','INCLINATION',fmt(o.i,2)+'°'],['升交点经度','ASCENDING NODE',fmt(o.om,2)+'°'],['近日点幅角','ARG. PERIHELION',fmt(o.w,2)+'°'],['轨道周期','ORBIT PERIOD',fmt(o.period,0)+' d'],['直径','DIAMETER',fmt(o.diameter,2)+' km'],['反照率','ALBEDO',fmt(o.albedo,4)],['绝对星等','H MAGNITUDE',fmt(o.H,2)]];
    metrics.innerHTML=ms.map(([cn,en,v])=>`<div class="metric"><span>${cn}<small>${en}</small></span><b>${v}</b></div>`).join('');updateSelectedChip()
  }
  function clearSelected(){state.selected=null;state.traceOnly=false;objectPanel.classList.remove('open');traceBtn.classList.remove('active');updateSelectedChip();syncDrawerState();clearExposureCanvas()}
  closeObject.onclick=()=>{objectPanel.classList.remove('open');syncDrawerState()};
  focusBtn.onclick=()=>{if(!state.selected)return;state.targetZoom=Math.min(2.4,state.zoom*1.5);state.traceOnly=true;traceBtn.classList.add('active');clearExposureCanvas()};
  traceBtn.onclick=()=>{state.traceOnly=!state.traceOnly;traceBtn.classList.toggle('active',state.traceOnly);clearExposureCanvas()};
  objectOrbitBtn.onclick=()=>{if(!state.selected)return;setView('orbit');state.targetZoom=Math.max(1.08,state.zoom);clearExposureCanvas()};
  objectClearBtn.onclick=clearSelected;
  selectedChip.onclick=()=>{if(!state.selected)return;closeDrawers(objectPanel);objectPanel.classList.add('open');syncDrawerState()};

  function syncDrawerState(){document.body.classList.toggle('drawer-open',!!document.querySelector('.drawer.open'))}
  function closeDrawers(except=null){document.querySelectorAll('.drawer.open').forEach(p=>{if(p!==except)p.classList.remove('open')});syncDrawerState()}
  function drawer(btn,panel){btn.onclick=()=>{const next=!panel.classList.contains('open');closeDrawers(panel);panel.classList.toggle('open',next);syncDrawerState()}}
  drawer(filterBtn,filterPanel);drawer(cameraBtn,cameraPanel);drawer(layersBtn,layersPanel);drawer(explainBtn,explainPanel);drawer(languageBtn,languagePanel);drawer(sizeBtn,sizePanel);drawer(refsBtn,refsPanel);drawer(photoSettingsBtn,photoPanel);
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{const panel=document.getElementById(b.dataset.close+'Panel');if(panel)panel.classList.remove('open');syncDrawerState()});

  function updateColorButtons(){colorMode.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x.dataset.color===state.colorMode))}
  function updateLayerButtons(){layerControls.querySelectorAll('button').forEach(b=>b.classList.toggle('active',!!state.layers[b.dataset.layer]))}
  function updateWavelengthLegend(){wavelengthLegend.classList.toggle('visible',state.layers.wavelength&&state.view==='spectrum')}

  cameraPresets.querySelectorAll('button').forEach(b=>b.onclick=()=>{
    const key=b.dataset.camera,c=cameraCfg[key];state.cameraPreset=key;
    setView(c.view);state.targetPitch=c.pitch;state.targetYaw=c.yaw;state.targetZoom=c.zoom;
    cameraPresets.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));
    if(key==='exposure'){state.quality='photo';state.speed=48;state.exposure=true;state.playing=true;playBtn.textContent='Ⅱ';exposureBtn.classList.add('active');qualitySet.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x.dataset.quality==='photo'));speedSet.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x.dataset.speed==='48'));resize();closeDrawers(photoPanel);photoPanel.classList.add('open');syncDrawerState()}
    clearExposureCanvas()
  });

  layerControls.querySelectorAll('button').forEach(b=>b.onclick=()=>{
    const k=b.dataset.layer;state.layers[k]=!state.layers[k];updateLayerButtons();clearExposureCanvas()
  });

  document.querySelectorAll('.explain-go').forEach(b=>b.onclick=()=>{explainPanel.classList.remove('open');syncDrawerState();setView(b.dataset.go)});
  document.querySelectorAll('.explain-layer').forEach(b=>b.onclick=()=>{const k=b.dataset.layerGo;state.layers[k]=true;updateLayerButtons();explainPanel.classList.remove('open');syncDrawerState();setView('atlas')});

  function buildFilters(){groupFilters.innerHTML=`<button class="active" data-group="ALL">全部 / ALL</button>`+groups.map(g=>`<button data-group="${g.key}" style="border-left-color:${g.color}">${g.label}</button>`).join('')+`<button data-group="NEO / AMOR">NEO / AMOR</button>`;groupFilters.querySelectorAll('button').forEach(b=>b.onclick=()=>{state.group=b.dataset.group;groupFilters.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));clearExposureCanvas()});typeFilters.innerHTML=`<button class="active" data-type="ALL">ALL</button>`+typeOrder.slice(0,5).map(t=>`<button data-type="${t}"><i style="background:${typePalette[t]}"></i>${t}</button>`).join('')+`<button data-type="OTHER">OTHER</button>`;typeFilters.querySelectorAll('button').forEach(b=>b.onclick=()=>{state.type=b.dataset.type;typeFilters.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));clearExposureCanvas()})}
  buildFilters();diamRange.oninput=e=>{state.minDiameter=+e.target.value;diamOut.textContent=state.minDiameter+' km'};colorMode.querySelectorAll('button').forEach(b=>b.onclick=()=>{state.colorMode=b.dataset.color;updateColorButtons();clearExposureCanvas()});

  playBtn.onclick=()=>{state.playing=!state.playing;playBtn.textContent=state.playing?'Ⅱ':'▶'};timeRange.oninput=e=>{state.time=+e.target.value;clearExposureCanvas()};speedSet.querySelectorAll('button').forEach(b=>b.onclick=()=>{state.speed=+b.dataset.speed;speedSet.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));if(state.speed>=48&&!state.exposure){state.exposure=true;exposureBtn.classList.add('active')}});exposureBtn.onclick=()=>{state.exposure=!state.exposure;exposureBtn.classList.toggle('active',state.exposure);if(!state.exposure)clearExposureCanvas()};fadeRange.oninput=e=>state.fade=+e.target.value;document.getElementById('clearExposure').onclick=()=>clearExposureCanvas();
  qualitySet.querySelectorAll('button').forEach(b=>b.onclick=()=>{state.quality=b.dataset.quality;qualitySet.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));resize()});


  const I18N={
    zh:{
      brand:'新-天象图库', atlas:'天象',orbit:'轨道',group:'族群',spectrum:'光谱',time:'时间',
      camera:'视角',layers:'图层',explain:'解读',filter:'筛选',language:'语言',size:'尺寸',data:'资料',photoSettings:'摄影设置',
      lang:'语言',background:'背景',black:'黑',light:'白',space:'宇宙',
      vertical:'宇宙中的<br>小行星分布', annotation:'把遥远之物<br>重新放回星空',
      scale:'观察尺度',cosmic:'宇宙',earth:'地球',material:'物质',
      filterHead:'数据筛选',cameraHead:'视角预设',layersHead:'信息图层',explainHead:'图表解读',sizeHead:'界面尺寸',sizeLead:'只改变界面文字、按钮和板块，不缩放中央数据图。',sizeNames:['精细','标准','舒适','大号'],refsHead:'数据与参考',
      modelTime:'轨道推演时间', exposure:'时间曝光',trail:'残影',clear:'清空残影',reset:'复位',
      quality:'渲染质量',display:'展示',balanced:'平衡',photo:'摄影',
      cameraLead:'视角不是装饰，而是不同的信息阅读方式。',
      c1:'01 原稿',c1d:'回到二维主视觉的正投影视角。',
      c2:'02 仪器',c2d:'默认斜视，兼顾整体与空间深度。',
      c3:'03 黄道侧视',c3d:'压低相机，观察轨道倾角与黄道面。',
      c4:'04 深空',c4d:'进入小行星带内部，强调纵深关系。',
      c5:'05 数据空间',c5d:'使用三分之四正交投影：X=轨道距离、Y=反照率、Z=类型。正视会压扁一个维度，因此采用斜视。',
      c6:'06 摄影',c6d:'时间模式 + 长曝光构图，用于动态展示。',
      modeAtlas:'天象图谱',modeAtlasSub:'ATLAS / 原图整体 + 空间深度',
      modeOrbit:'轨道分析',modeOrbitSub:'ORBIT / 倾斜椭圆与黄道面',
      modeGroup:'族群结构',modeGroupSub:'GROUP / 动力学区域的空间剖面',
      modeSpectrum:'光谱空间',modeSpectrumSub:'SPECTRUM / 距离 × 反照率 × 分类',
      modeTime:'时间曝光',modeTimeSub:'TIME / 轨道运动与星轨累积'
    },
    ja:{
      brand:'新・天象アーカイブ', atlas:'天象',orbit:'軌道',group:'群',spectrum:'スペクトル',time:'時間',
      camera:'視点',layers:'レイヤー',explain:'解説',filter:'絞込',language:'言語',size:'サイズ',data:'資料',photoSettings:'撮影設定',
      lang:'言語',background:'背景',black:'黒',light:'白',space:'宇宙',
      vertical:'宇宙における<br>小惑星の分布', annotation:'遥かな天体を<br>再び星空へ',
      scale:'観測スケール',cosmic:'宇宙',earth:'地球',material:'物質',
      filterHead:'データ絞り込み',cameraHead:'視点プリセット',layersHead:'情報レイヤー',explainHead:'図表解説',sizeHead:'UIサイズ',sizeLead:'文字・ボタン・パネルだけを変更し、中央データ図は拡大縮小しません。',sizeNames:['精細','標準','快適','大'],refsHead:'データと参考',
      modelTime:'軌道モデル時間', exposure:'時間露光',trail:'残像',clear:'残像を消去',reset:'リセット',
      quality:'描画品質',display:'表示',balanced:'バランス',photo:'撮影',
      cameraLead:'視点は装飾ではなく、情報の読み方そのものです。',
      c1:'01 原図',c1d:'二次元ポスターの正投影に戻ります。',
      c2:'02 インストルメント',c2d:'全体構成と空間の奥行きを同時に読む標準視点。',
      c3:'03 黄道側面',c3d:'カメラを低くし、軌道傾斜と黄道面を観察。',
      c4:'04 深宇宙',c4d:'小惑星帯の内側へ入り、奥行きを強調。',
      c5:'05 データ空間',c5d:'X=軌道距離、Y=アルベド、Z=分類を同時に読むための3/4正投影。正面では1軸が重なるため斜視を使用。',
      c6:'06 撮影',c6d:'時間モードと長時間露光を組み合わせた展示視点。',
      modeAtlas:'天象図',modeAtlasSub:'ATLAS / 原図全体 + 空間奥行き',
      modeOrbit:'軌道解析',modeOrbitSub:'ORBIT / 傾斜楕円と黄道面',
      modeGroup:'群構造',modeGroupSub:'GROUP / 力学領域の空間断面',
      modeSpectrum:'スペクトル空間',modeSpectrumSub:'SPECTRUM / 距離 × アルベド × 分類',
      modeTime:'時間露光',modeTimeSub:'TIME / 軌道運動と星跡の蓄積'
    },
    en:{
      brand:'NEW CELESTIAL ARCHIVE', atlas:'Atlas',orbit:'Orbit',group:'Group',spectrum:'Spectrum',time:'Time',
      camera:'Camera',layers:'Layers',explain:'Explain',filter:'Filter',language:'Language',size:'UI Size',data:'Data',photoSettings:'Photo Settings',
      lang:'Language',background:'Background',black:'Black',light:'White',space:'Space',
      vertical:'ASTEROID DISTRIBUTION<br>IN THE SOLAR SYSTEM', annotation:'RETURN DISTANT OBJECTS<br>TO THE SKY',
      scale:'Observation Scale',cosmic:'Cosmic',earth:'Earth',material:'Material',
      filterHead:'Data Filter',cameraHead:'Camera Presets',layersHead:'Data Layers',explainHead:'Visual Logic',sizeHead:'UI Size',sizeLead:'Changes interface text, buttons, and panels without scaling the central data view.',sizeNames:['Fine','Standard','Comfortable','Large'],refsHead:'Data / References',
      modelTime:'Orbit Model Time', exposure:'Exposure',trail:'Trail',clear:'Clear Trail',reset:'Reset',
      quality:'Render Quality',display:'Display',balanced:'Balanced',photo:'Photo',
      cameraLead:'Camera presets are different ways of reading the same information, not decoration.',
      c1:'01 Original',c1d:'Return to the orthographic composition of the original chart.',
      c2:'02 Instrument',c2d:'Default oblique view balancing overall composition and spatial depth.',
      c3:'03 Ecliptic',c3d:'Lower the camera to read inclination against the ecliptic plane.',
      c4:'04 Deep Field',c4d:'Enter the asteroid belt and emphasize depth relationships.',
      c5:'05 Data Field',c5d:'Three-quarter orthographic projection: X=orbital distance, Y=albedo, Z=class. A frontal view would collapse one dimension.',
      c6:'06 Exposure',c6d:'Time mode with long-exposure composition for presentation.',
      modeAtlas:'Celestial Atlas',modeAtlasSub:'ATLAS / original overview + spatial depth',
      modeOrbit:'Orbital Analysis',modeOrbitSub:'ORBIT / inclined ellipses + ecliptic plane',
      modeGroup:'Group Structure',modeGroupSub:'GROUP / analytical section of dynamical regions',
      modeSpectrum:'Spectral Space',modeSpectrumSub:'SPECTRUM / distance × albedo × class',
      modeTime:'Long Exposure',modeTimeSub:'TIME / orbital motion + accumulated trails'
    }
  };
  function setTxt(sel,txt,html=false){const el=document.querySelector(sel);if(el)html?el.innerHTML=txt:el.textContent=txt}
  function applyLanguage(){
    const L=I18N[state.lang]||I18N.zh;
    document.documentElement.lang=state.lang==='ja'?'ja':state.lang==='en'?'en':'zh-CN';
    setTxt('.brand strong',L.brand);
    ['atlas','orbit','group','spectrum','time'].forEach(k=>setTxt(`.view-nav button[data-view="${k}"] b`,L[k]));
    setTxt('#cameraBtn',`${L.camera} <small>CAMERA</small>`,true);setTxt('#layersBtn',`${L.layers} <small>LAYERS</small>`,true);
    setTxt('#explainBtn',`${L.explain} <small>EXPLAIN</small>`,true);setTxt('#filterBtn',`${L.filter} <small>FILTER</small>`,true);
    setTxt('#languageBtn',`${L.language||L.lang} <small>LANGUAGE</small>`,true);setTxt('#sizeBtn',`${L.size} <small>UI SIZE</small>`,true);setTxt('#refsBtn',`${L.data} <small>DATA</small>`,true);setTxt('#photoSettingsBtn',`${L.photoSettings||L.photo} <small>PHOTO</small>`,true);
    setTxt('.vertical-title strong',L.vertical,true);setTxt('.left-annotation strong',L.annotation,true);
    setTxt('.scale-nav>span',`${L.scale} <small>OBSERVATION SCALE</small>`,true);
    const scale=document.querySelectorAll('.scale-nav a strong');if(scale.length>=3){scale[0].textContent=L.cosmic;scale[1].textContent=L.earth;scale[2].textContent=L.material}
    setTxt('#filterPanel .drawer-head span',`${L.filterHead} <small>DATA FILTER</small>`,true);
    setTxt('#cameraPanel .drawer-head span',`${L.cameraHead} <small>CAMERA PRESETS</small>`,true);
    setTxt('#layersPanel .drawer-head span',`${L.layersHead} <small>DATA LAYERS</small>`,true);
    setTxt('#explainPanel .drawer-head span',`${L.explainHead} <small>VISUAL LOGIC</small>`,true);
    setTxt('#sizePanel .drawer-head span',`${L.sizeHead} <small>UI SIZE</small>`,true);setTxt('#sizePanel .panel-lead',L.sizeLead);
    sizeSet?.querySelectorAll('button b').forEach((b,i)=>{if(L.sizeNames[i])b.textContent=L.sizeNames[i]});
    setTxt('#refsPanel .drawer-head span',`${L.refsHead} <small>DATA / REFERENCES</small>`,true);setTxt('#languagePanel .drawer-head span',`${L.language||L.lang} <small>LANGUAGE</small>`,true);setTxt('#photoPanel .drawer-head span',`${L.photoSettings||L.photo} <small>PHOTOGRAPHY</small>`,true);
    setTxt('#cameraPanel .panel-lead',L.cameraLead);
    const cps=document.querySelectorAll('#cameraPresets button');const cvs=[[L.c1,L.c1d],[L.c2,L.c2d],[L.c3,L.c3d],[L.c4,L.c4d],[L.c5,L.c5d],[L.c6,L.c6d]];
    cps.forEach((b,i)=>{if(!cvs[i])return;const bb=b.querySelector('b'),sp=b.querySelector('span');if(bb)bb.textContent=cvs[i][0];if(sp)sp.textContent=cvs[i][1]});
    setTxt('.quality>span',`${L.quality} <small>QUALITY</small>`,true);
    const qb=document.querySelectorAll('#qualitySet button');if(qb.length===3){qb[0].textContent=L.display;qb[1].textContent=L.balanced;qb[2].textContent=L.photo}
    setTxt('.time-read span',`${L.modelTime} <small>MODEL TIME · SBDB EPOCH</small>`,true);
    setTxt('#exposureBtn',`${L.exposure} <small>EXPOSURE</small>`,true);
    setTxt('.exposure-life',`${L.trail} <input id="fadeRange" type="range" min="1" max="100" value="${state.fade}" />`,true);const fr=document.getElementById('fadeRange');if(fr)fr.oninput=e=>state.fade=+e.target.value;
    const clr=document.getElementById('clearExposure');if(clr)clr.textContent=L.clear;const rst=document.getElementById('resetBtn');if(rst)rst.textContent=L.reset;
    const mode={atlas:[L.modeAtlas,L.modeAtlasSub],orbit:[L.modeOrbit,L.modeOrbitSub],group:[L.modeGroup,L.modeGroupSub],spectrum:[L.modeSpectrum,L.modeSpectrumSub],time:[L.modeTime,L.modeTimeSub]}[state.view];
    if(mode){document.getElementById('modeTitle').textContent=mode[0];document.getElementById('modeSub').textContent=mode[1]}
  }

  const languageSet=document.getElementById('languageSet');
  const backgroundSet=document.getElementById('backgroundSet');
  const backgroundCurrent=document.getElementById('backgroundCurrent');
  const bgLabels={black:'深黑 / DEEP BLACK',cliffs:'宇宙悬崖 / COSMIC CLIFFS',deepfield:'韦布深场 / WEBB DEEP FIELD',pillars:'创生之柱 / PILLARS',xdf:'极深场 / HUBBLE XDF'};
  function applyBackground(key){state.background=backgroundSources[key]?key:'black';backgroundSet?.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.bg===state.background));if(backgroundCurrent)backgroundCurrent.textContent=bgLabels[state.background]||bgLabels.black;clearExposureCanvas();localStorage.setItem('nca-bg',state.background)}
  if(languageSet) languageSet.querySelectorAll('button').forEach(b=>b.onclick=()=>{state.lang=b.dataset.lang;languageSet.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));applyLanguage();localStorage.setItem('nca-lang',state.lang)});
  if(sizeSet) sizeSet.querySelectorAll('button').forEach(b=>b.onclick=()=>{state.uiSize=b.dataset.size;document.body.dataset.uiSize=state.uiSize;localStorage.setItem('nca-ui-size',state.uiSize);sizeSet.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));resize()});
  if(backgroundSet) backgroundSet.querySelectorAll('button').forEach(b=>b.onclick=()=>applyBackground(b.dataset.bg));

  // Original-chart lightbox with wheel zoom and drag.
  const chartLightbox=document.getElementById('chartLightbox'), chartLightboxImage=document.getElementById('chartLightboxImage'), chartLightboxClose=document.getElementById('chartLightboxClose');
  let chartZoom=1,chartTX=0,chartTY=0,chartDrag=false,chartPX=0,chartPY=0;
  function applyChartTransform(){if(chartLightboxImage)chartLightboxImage.style.transform=`translate(${chartTX}px,${chartTY}px) scale(${chartZoom})`}
  function openChart(){chartZoom=1;chartTX=chartTY=0;applyChartTransform();chartLightbox.classList.add('open');chartLightbox.setAttribute('aria-hidden','false')}
  function closeChart(){chartLightbox.classList.remove('open');chartLightbox.setAttribute('aria-hidden','true')}
  document.querySelectorAll('.chart-zoomable').forEach(img=>img.addEventListener('click',e=>{if(e.target.closest('.chart-hotspot'))return;openChart()}));
  chartLightboxClose?.addEventListener('click',closeChart);
  chartLightbox?.addEventListener('click',e=>{if(e.target===chartLightbox)closeChart()});
  chartLightbox?.addEventListener('wheel',e=>{e.preventDefault();chartZoom=clamp(chartZoom*Math.exp(-e.deltaY*.001),.7,5);applyChartTransform()},{passive:false});
  chartLightboxImage?.addEventListener('pointerdown',e=>{chartDrag=true;chartPX=e.clientX;chartPY=e.clientY;chartLightboxImage.classList.add('dragging');chartLightboxImage.setPointerCapture(e.pointerId)});
  chartLightboxImage?.addEventListener('pointermove',e=>{if(!chartDrag)return;chartTX+=e.clientX-chartPX;chartTY+=e.clientY-chartPY;chartPX=e.clientX;chartPY=e.clientY;applyChartTransform()});
  chartLightboxImage?.addEventListener('pointerup',()=>{chartDrag=false;chartLightboxImage.classList.remove('dragging')});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeChart()});

  function reset(){closeDrawers();state.selected=null;state.hover=null;state.group='ALL';state.type='ALL';state.minDiameter=0;state.time=0;state.playing=false;state.exposure=false;state.speed=1;state.colorMode='type';state.traceOnly=false;state.view='atlas';state.layers={objects:true,orbits:true,groups:false,spectrum:false,distance:true,wavelength:false};state.cameraPreset='instrument';state.targetYaw=-.18;state.targetPitch=.30;state.targetZoom=.96;state.yaw=-.18;state.pitch=.30;state.zoom=.96;document.getElementById('objectPanel').classList.remove('open');updateSelectedChip();diamRange.value=0;diamOut.textContent='0 km';timeRange.value=0;playBtn.textContent='▶';exposureBtn.classList.remove('active');speedSet.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.speed==='1'));updateColorButtons();updateLayerButtons();cameraPresets.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.camera==='instrument'));buildFilters();setView('atlas');clearExposureCanvas()}
  resetBtn.onclick=reset;brandReset.onclick=reset;
  function enter(){intro.classList.add('hidden')}enterBtn.onclick=enter;skipBtn.onclick=enter;if(TEST_MODE)intro.classList.add('hidden');

  updateLayerButtons();updateColorButtons();updateWavelengthLegend();

  state.lang=localStorage.getItem('nca-lang')||'zh';
  state.background=localStorage.getItem('nca-bg')||'black';
  document.body.dataset.uiSize=state.uiSize;
  languageSet?.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.lang===state.lang));
  sizeSet?.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.size===state.uiSize));
  applyBackground(state.background);applyLanguage();updateSelectedChip();

  render();
})();
