(() => {
'use strict';

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const TAU=Math.PI*2;
const canvas=$('#earthCanvas'), ctx=canvas.getContext('2d',{alpha:false});
let W=0,H=0,DPR=1,cx=0,cy=0,R=0,mapCx=0,mapCy=0,mapW=0,mapH=0,stageTop=70,stageBottom=80;

const state={
  view:'surface', morph:0, morphTarget:0, yaw:-0.08, pitch:0.08, zoom:1,
  flatPanX:0,flatPanY:0,
  dragging:false, pointerX:0,pointerY:0, dragStartMorph:0, dragMoved:0,
  year:2013, playing:false, speed:1, trace:false,
  fall:'all', mass:'all', cls:'all', periodCenter:null,
  selected:null, hover:null, hit:[], frame:0, last:performance.now(),
  cameraTarget:null, focusUntil:0, ringAnchor:null,
  uiSize:localStorage.getItem('nca-ui-size')||'fine',lang:localStorage.getItem('nca-lang')||'zh',
  loaded:false, records:[], meta:null, filtered:[], drawRecords:[], majors:[],
  landPolygons:[], landDots:[], geographyLoaded:false, statusYear:null, projectionBand:null
};

document.body.dataset.uiSize=state.uiSize;

const impacts=[
  {name:'Barringer Crater',lat:35.03,lon:-111.02,diameter:'1.2 km',age:'~0.05 Ma',location:'Arizona, USA',note:'原稿代表性撞击结构'},
  {name:'Bosumtwi',lat:6.50,lon:-1.42,diameter:'10.5 km',age:'~1.07 Ma',location:'Ghana',note:'原稿右侧撞击结构'},
  {name:'Gosses Bluff',lat:-23.82,lon:132.31,diameter:'22 km',age:'142.5 ± 0.8 Ma',location:'Australia',note:'原稿右侧撞击结构'},
  {name:'Manicouagan',lat:51.38,lon:-68.70,diameter:'~100 km',age:'~214 Ma',location:'Québec, Canada',note:'原稿右侧撞击结构'},
  {name:'Chicxulub',lat:21.40,lon:-89.52,diameter:'~180 km',age:'~66 Ma',location:'Yucatán, Mexico',note:'原稿右侧撞击结构'},
  {name:'Mistastin Lake',lat:55.88,lon:-63.31,diameter:'28 km',age:'~36 Ma',location:'Labrador, Canada',note:'原稿右侧撞击结构'},
  {name:'Aorounga',lat:19.10,lon:19.25,diameter:'12.6 km',age:'confirmed structure',location:'Chad',note:'原稿右侧撞击结构'},
  {name:'Clearwater West',lat:56.22,lon:-74.50,diameter:'~36 km',age:'confirmed structure',location:'Québec, Canada',note:'原稿以 Clearwater Lakes 标注'}
];

const modeCopy={
  zh:{
    surface:['01','地表档案','SURFACE / 从原始二维图表进入可交互地球投影'],record:['02','记录方式','RECORD / Fell 与 Found 不是同一种记录'],time:['03','时间累积','TIME / 人类记录如何随年份逐步出现'],distribution:['04','数据分布','DISTRIBUTION / 年份 × 质量 × 纬度的数据空间'],impact:['05','撞击结构','IMPACT / 地质撞击遗迹与陨石记录分开阅读']
  },
  ja:{
    surface:['01','地表アーカイブ','SURFACE / 二次元図表から操作可能な地球投影へ'],record:['02','記録方式','RECORD / Fell と Found は異なる記録'],time:['03','時間累積','TIME / 人間の記録が年代とともに現れる過程'],distribution:['04','データ分布','DISTRIBUTION / 年代 × 質量 × 緯度'],impact:['05','衝突構造','IMPACT / 地質学的痕跡と隕石記録を分けて読む']
  },
  en:{
    surface:['01','SURFACE ARCHIVE','SURFACE / From the source chart to an interactive Earth projection'],record:['02','RECORD TYPE','RECORD / Fell and Found are different kinds of evidence'],time:['03','TIME ACCUMULATION','TIME / How human records appear over time'],distribution:['04','DATA DISTRIBUTION','DISTRIBUTION / Year × mass × latitude'],impact:['05','IMPACT STRUCTURE','IMPACT / Read geological traces separately from meteorite records']
  }
};

const projectionCopy={
  zh:{flat:['滚轮切换投影','拖拽查看地区细节；平面状态隐藏外环','WHEEL · FLAT ↔ GLOBE / DRAG · EXPLORE'],forming:['正在收拢为球体','经纬网连续弯曲，外环将在球体阶段出现','MORPHING · MAP → GLOBE'],globe:['球体档案 · 外环已开启','拖拽旋转地球，点击外环事件快速定位','GLOBE · OUTER EVENTS ACTIVE']},
  ja:{flat:['ホイールで投影を切替','ドラッグで地域を探索。平面では外周リングを非表示','WHEEL · FLAT ↔ GLOBE / DRAG · EXPLORE'],forming:['球体へ変形中','経緯線が連続して曲がり、球体で外周リングが現れます','MORPHING · MAP → GLOBE'],globe:['球体アーカイブ · 外周表示','ドラッグで回転、外周イベントをクリックして位置へ移動','GLOBE · OUTER EVENTS ACTIVE']},
  en:{flat:['WHEEL TO CHANGE PROJECTION','Drag to inspect regions; outer rings stay hidden in flat view','WHEEL · FLAT ↔ GLOBE / DRAG · EXPLORE'],forming:['FORMING THE GLOBE','The graticule bends continuously; outer rings appear in globe view','MORPHING · MAP → GLOBE'],globe:['GLOBE ARCHIVE · OUTER RINGS ON','Drag to rotate; click an outer event to locate it','GLOBE · OUTER EVENTS ACTIVE']}
};

function updateProjectionCopy(band=state.projectionBand||'flat'){
  const copy=projectionCopy[state.lang][band]||projectionCopy.zh[band];
  $('#projectionTitle').textContent=copy[0];$('#projectionCopy').textContent=copy[1];$('#projectionMode').textContent=copy[2];
}

const classColors={
  'Chondrite':'#f18424','Achondrite':'#ffc52b','Iron':'#ef4438','Stony-Iron':'#c34742','Other':'#a96f54'
};

const hover=document.createElement('div');
hover.className='hover-card ui';
hover.innerHTML='<small></small><b></b><span></span>';
document.body.appendChild(hover);
const hoverStyle=document.createElement('style');
hoverStyle.textContent=`.hover-card{position:fixed;z-index:90;pointer-events:none;min-width:145px;max-width:220px;padding:9px 10px;background:rgba(10,7,7,.94);border-left:1px solid #f0523d;box-shadow:0 12px 35px rgba(0,0,0,.35);opacity:0;transform:translate(10px,10px);transition:opacity .12s}.hover-card small{display:block;font-size:5px;letter-spacing:.12em;color:#766d69}.hover-card b{display:block;font-size:9px;font-weight:500;margin:5px 0}.hover-card span{display:block;font-size:6px;line-height:1.5;color:#827974}`;
document.head.appendChild(hoverStyle);

const textI18n={
  ja:{
    '新-天象图库':'新・天象アーカイブ','地表':'地表','记录':'記録','时间':'時間','分布':'分布','撞击':'衝突','宇宙':'宇宙','地球':'地球','物质':'物質','观察尺度':'観察尺度','解读':'解説','筛选':'絞り込み','语言':'言語','尺寸':'サイズ','资料':'資料',
    '经纬网':'経緯線','02 / 地球尺度':'02 / 地球スケール','陨石不是':'隕石は','地图上的点':'地図上の点ではない','它是一套由入射、坠落、发现、时间、地点、质量与人类记录共同构成的地表档案。':'入射、落下、発見、時間、場所、質量、そして人間の記録が構成する地表アーカイブです。',
    '总记录 / RECORDS':'総記録 / RECORDS','有效坐标 / COORDS':'有効座標 / COORDS','观测坠落 / OBSERVED':'観測落下 / OBSERVED','后来发现 / RECOVERED':'後に発見 / RECOVERED','大陆轮廓':'大陸輪郭','陨石记录':'隕石記録','观测坠落':'観測落下','后来发现':'後に発見','撞击结构':'衝突構造',
    '人类记录时间':'人間の記録年代','坠落轨迹':'落下軌跡','复位':'リセット','图表解读':'図表解説','原始图表 / ORIGINAL CHART':'原図 / ORIGINAL CHART','收起 −':'折りたたむ −','中央世界图':'中央世界図','左侧陨石环':'左側隕石リング','右侧撞击环':'右側衝突リング',
    '01 中央世界图 / SURFACE':'01 中央世界図 / SURFACE','02 陨石记录 / RECORD':'02 隕石記録 / RECORD','03 撞击结构 / IMPACT':'03 衝突構造 / IMPACT','质量与直径图例怎么读？':'質量と直径の凡例の読み方','左侧暖色六边形表示陨石质量等级：符号数量越多、颜色越趋近红色，质量越大；中间星形颜色用于 Fell 事件；右侧冷色圆点与竖条表示撞击结构及其直径等级，越偏紫、竖条越多，直径越大。两套等级属于不同数据，不能互相换算。':'左の暖色六角形は隕石の質量等級で、数が多く赤に近いほど質量が大きいことを示します。中央の星形色は Fell 事象、右の寒色点と縦線は衝突構造と直径等級を示し、紫に近く縦線が多いほど直径が大きくなります。二つの等級は別データで、相互換算できません。',
    '这张图整体在表达什么？':'この図全体は何を表すのか？','快速理解：':'要点：','FELL 和 FOUND 为什么不同？':'FELL と FOUND はなぜ異なるのか？','为什么有些地方记录特别密集？':'なぜ記録が集中する地域があるのか？','颜色、大小和形状怎么看？':'色・大きさ・形の読み方','为什么“撞击坑”不是“陨石记录”？':'なぜ「衝突クレーター」は「隕石記録」ではないのか？','时间增长代表陨石越来越多吗？':'時間とともに隕石が増えたという意味か？','网页比原图多了什么？':'ウェブ版で追加されたもの','术语 / GLOSSARY':'用語 / GLOSSARY',
    '数据筛选':'データ絞り込み','记录类型':'記録タイプ','全部 ALL':'すべて ALL','质量等级':'質量等級','全部':'すべて','物质大类':'物質分類','球粒陨石':'コンドライト','无球粒':'エイコンドライト','铁陨石':'鉄隕石','石铁':'石鉄隕石','其他':'その他','坐标':'座標','主画面只绘制具有有效经纬度的记录。数据总数仍保留在统计中。':'メイン画面には有効な経緯度を持つ記録のみ描画します。総数は統計に保持されます。','恢复全部 / RESET FILTER':'すべて復元 / RESET FILTER',
    '切换界面的主叙事语言。数据名称、正式分类和单位保持原始形式。':'表示言語を切り替えます。データ名、正式分類、単位は原表記を維持します。','界面尺寸':'UIサイズ','只改变界面文字、按钮和板块，不缩放中央数据图。':'文字・ボタン・パネルだけを変更し、中央データ図は拡大縮小しません。','精细':'精細','标准':'標準','舒适':'快適','大号':'大',
    '数据与来源':'データと出典','本页将原始 AI 图作为视觉母体，同时把“回收陨石、空中火球、撞击结构”分成三个不能混用的数据层。':'原AI図を視覚的な母体とし、「回収隕石・大気火球・衝突構造」を混同できない三つのデータ層に分けます。','火球与入射':'火球と入射','撞击结构':'衝突構造','名称、分类、质量、Fell / Found、记录年份与坐标。':'名称、分類、質量、Fell / Found、記録年、座標。','峰值亮度、位置、高度、辐射能量与估算撞击能量；作为后续动态数据层，不与回收陨石直接等同。':'最大光度、位置、高度、放射エネルギー、推定衝突エネルギー。回収隕石とは直接同一視しない動的データ層です。','经地质证据确认的结构、直径、年龄与位置。':'地質学的証拠で確認された構造、直径、年代、位置。',
    '记录档案':'記録アーカイブ','选择一个对象':'オブジェクトを選択','定位':'位置へ','仅显示同类':'同分類のみ','同期记录':'同時期の記録','进入物质尺度 ↗':'物質スケールへ ↗','滚轮浏览请使用浏览器缩放 · ESC 关闭':'拡大はブラウザズームを使用 · ESCで閉じる',
    '原稿矢量 / FALL PROCESS':'原稿ベクター / FALL PROCESS','原稿矢量 / MASS · DIAMETER GRADES':'原稿ベクター / MASS · DIAMETER GRADES','深入了解':'詳しく見る','它把“陨石抵达地球以后留下的记录”压缩进一个圆形世界图。左侧强调大型陨石记录，右侧强调巨大撞击结构，中间的点阵地球提供地理位置。':'隕石が地球に到達した後の記録を一つの円形世界図に圧縮しています。左は大型隕石、右は巨大衝突構造、中央の点描地球は位置を示します。','表示坠落过程被观察到；':'は落下が観測された記録；','表示陨石是在地表后来被发现。网页只给 Fell 绘制入射短轨迹，Found 直接从地表出现。':'は後に地表で発見された記録です。ウェブ版では Fell のみに短い入射軌跡を描き、Found は地表から現れます。','这里呈现的是':'ここに示すのは','人类记录中的陨石':'人間が記録した隕石','，不是地球真实发生过的全部坠落事件。搜索活动、人口、地表保存条件、沙漠与南极考察都会影响我们“看见”多少记录。':'であり、実際の全落下ではありません。探索、人口、保存条件、砂漠や南極の調査が記録密度を左右します。','暖色表示陨石记录；冷色表示撞击结构。陨石点大小按质量的对数尺度压缩；Fell 使用菱形/轨迹，Found 使用圆点。原稿中的大型陨石质量等级仍以左侧环形语言保留。':'暖色は隕石記録、寒色は衝突構造です。点の大きさは質量を対数圧縮し、Fell は菱形と軌跡、Found は円で示します。','陨石记录是一件被回收或观测到的天体碎片；撞击结构是地球地质表面保存的撞击遗迹。它们来自不同的数据体系，因此网页在 05 / IMPACT 中独立显示。':'隕石記録は回収・観測された天体片、衝突構造は地質面に残る痕跡です。異なるデータ体系なので 05 / IMPACT で分けて表示します。','不一定。时间模式首先表现的是':'必ずしもそうではありません。時間モードはまず','记录数量的累积':'記録数の累積','。它同时反映真实事件、发现活动和记录制度的变化，因此不能直接解释成坠落频率持续增加。':'を示します。実際の出来事だけでなく発見活動や記録制度の変化も含むため、落下頻度の増加とは直接解釈できません。','原图负责看见整体；网页允许同一条记录在地表投影、Fell/Found、时间累积和数据坐标之间保持身份，并能被选择、筛选和继续进入物质尺度。':'原図は全体を見せ、ウェブ版は同じ記録の同一性を地表投影、Fell/Found、時間累積、データ座標の間で保ち、選択・絞り込み・物質スケールへの移動を可能にします。','05 / IMPACT 设计注意事项':'05 / IMPACT デザイン上の注意','最后板块必须把“回收陨石”与“地质撞击结构”分开：冷色只表达撞击结构，直径与年龄不得套用陨石质量等级；选择结构后先定位地球坐标，再提供进入物质尺度的下一步，不把推测轨迹画成已知事实。':'最終セクションでは回収隕石と地質学的衝突構造を分けます。寒色は構造のみ、直径と年代に隕石質量等級を流用せず、まず地球上の位置を示してから次の物質スケールへ進みます。推定軌跡を事実として描きません。','被观察到实际坠落的陨石记录。':'実際の落下が観測された隕石記録。','并未观察到坠落，而是在之后被发现的样本。':'落下は観測されず、後に発見された試料。','数据集中记录的质量，网页使用对数尺度压缩视觉差异。':'データに記録された質量。表示は対数尺度で圧縮します。','Meteoritical Society 数据中的陨石分类字段。':'Meteoritical Society データの隕石分類フィールド。','经地质证据确认的地球撞击结构。':'地質学的証拠で確認された地球の衝突構造。','当前可视化本地化 45,716 条 legacy snapshot；原始体系来自 The Meteoritical Society。':'現在の可視化は 45,716 件の legacy snapshot をローカル化。原体系は The Meteoritical Society。','陨石名称、分类、正式状态、年份及 Fell / Find 记录的主数据库。':'名称、分類、正式状態、年代、Fell / Find の主要データベース。','大气层火球/火流星事件；适合未来加入真实入射高度、能量与速度，不替代陨石回收记录。':'大気火球イベント。将来の入射高度・エネルギー・速度に適し、回収隕石記録の代替ではありません。','确认的地球撞击结构；本原型先使用原稿中出现的代表性结构。':'確認済みの地球衝突構造。本プロトタイプは原稿にある代表例を使用します。','本地化的低分辨率大陆与海岸线几何，用于平面地图到球体的连续投影。':'ローカル化した低解像度の大陸・海岸線形状。平面から球体への連続投影に使用します。','NASA legacy CSV：45,716 records，其中 32,186 条具有可绘制坐标；本地可视化忽略缺失坐标与 (0,0) 占位坐标。时间模式上限按该快照的 2013 年设置。':'NASA legacy CSV は 45,716 件、うち 32,186 件が描画可能。欠損と (0,0) は除外し、時間上限は 2013 年です。','《陨石降落分布图2.ai》中的圆形世界、左右环带、质量/直径分级与落下流程被作为本页视觉结构直接引用和扩展。':'『陨石降落分布图2.ai』の円形世界、左右リング、質量・直径等級、落下フローを本ページの視覚構造として引用・拡張しています。'
  },
  en:{
    '新-天象图库':'NEW CELESTIAL ARCHIVE','地表':'SURFACE','记录':'RECORD','时间':'TIME','分布':'DISTRIBUTION','撞击':'IMPACT','宇宙':'COSMIC','地球':'EARTH','物质':'MATERIAL','观察尺度':'OBSERVATION SCALE','解读':'EXPLAIN','筛选':'FILTER','语言':'LANGUAGE','尺寸':'UI SIZE','资料':'DATA',
    '经纬网':'GRATICULE','02 / 地球尺度':'02 / EARTH SCALE','陨石不是':'METEORITES ARE NOT','地图上的点':'POINTS ON A MAP','它是一套由入射、坠落、发现、时间、地点、质量与人类记录共同构成的地表档案。':'They form a surface archive of entry, fall, discovery, time, place, mass, and human observation.',
    '总记录 / RECORDS':'TOTAL / RECORDS','有效坐标 / COORDS':'VALID / COORDS','观测坠落 / OBSERVED':'OBSERVED FALLS','后来发现 / RECOVERED':'LATER FINDS','大陆轮廓':'CONTINENT OUTLINE','陨石记录':'METEORITE RECORD','观测坠落':'OBSERVED FALL','后来发现':'LATER FIND','撞击结构':'IMPACT STRUCTURE',
    '人类记录时间':'HUMAN RECORD TIME','坠落轨迹':'FALL TRACE','复位':'RESET','图表解读':'VISUAL GUIDE','原始图表 / ORIGINAL CHART':'ORIGINAL CHART','收起 −':'COLLAPSE −','中央世界图':'CENTRAL WORLD MAP','左侧陨石环':'LEFT METEORITE RING','右侧撞击环':'RIGHT IMPACT RING',
    '01 中央世界图 / SURFACE':'01 CENTRAL WORLD / SURFACE','02 陨石记录 / RECORD':'02 METEORITE RECORD / RECORD','03 撞击结构 / IMPACT':'03 IMPACT STRUCTURE / IMPACT','质量与直径图例怎么读？':'HOW TO READ MASS AND DIAMETER GRADES','左侧暖色六边形表示陨石质量等级：符号数量越多、颜色越趋近红色，质量越大；中间星形颜色用于 Fell 事件；右侧冷色圆点与竖条表示撞击结构及其直径等级，越偏紫、竖条越多，直径越大。两套等级属于不同数据，不能互相换算。':'Warm hexagons on the left encode meteorite mass: more symbols and redder color mean greater mass. The central star colors identify Fell events. Cool dots and vertical bars on the right encode impact structures and diameter grades: more purple and more bars mean a larger diameter. These are separate data scales and cannot be converted into each other.',
    '这张图整体在表达什么？':'WHAT DOES THE WHOLE CHART SHOW?','快速理解：':'IN BRIEF:','FELL 和 FOUND 为什么不同？':'WHY ARE FELL AND FOUND DIFFERENT?','为什么有些地方记录特别密集？':'WHY ARE SOME REGIONS SO DENSE?','颜色、大小和形状怎么看？':'HOW TO READ COLOR, SIZE, AND SHAPE','为什么“撞击坑”不是“陨石记录”？':'WHY IS AN IMPACT CRATER NOT A METEORITE RECORD?','时间增长代表陨石越来越多吗？':'DOES ACCUMULATION MEAN MORE METEORITES FELL?','网页比原图多了什么？':'WHAT DOES THE WEB VERSION ADD?','术语 / GLOSSARY':'GLOSSARY',
    '数据筛选':'DATA FILTER','记录类型':'RECORD TYPE','全部 ALL':'ALL','质量等级':'MASS GRADE','全部':'ALL','物质大类':'CLASS FAMILY','球粒陨石':'CHONDRITE','无球粒':'ACHONDRITE','铁陨石':'IRON','石铁':'STONY-IRON','其他':'OTHER','坐标':'LOCATION','主画面只绘制具有有效经纬度的记录。数据总数仍保留在统计中。':'The main view draws only records with valid coordinates. The full dataset count remains in the statistics.','恢复全部 / RESET FILTER':'RESET FILTER',
    '切换界面的主叙事语言。数据名称、正式分类和单位保持原始形式。':'Switch the interface language. Data names, formal classes, and units remain in their original form.','界面尺寸':'UI SIZE','只改变界面文字、按钮和板块，不缩放中央数据图。':'Changes interface text, buttons, and panels without scaling the central data view.','精细':'FINE','标准':'STANDARD','舒适':'COMFORTABLE','大号':'LARGE',
    '数据与来源':'DATA / SOURCES','本页将原始 AI 图作为视觉母体，同时把“回收陨石、空中火球、撞击结构”分成三个不能混用的数据层。':'The source AI chart remains the visual framework, while recovered meteorites, atmospheric fireballs, and impact structures are separated into three non-interchangeable data layers.','火球与入射':'FIREBALL / ENTRY','名称、分类、质量、Fell / Found、记录年份与坐标。':'Name, class, mass, Fell / Found status, record year, and coordinates.','峰值亮度、位置、高度、辐射能量与估算撞击能量；作为后续动态数据层，不与回收陨石直接等同。':'Peak brightness, location, altitude, radiated energy, and estimated impact energy; a future dynamic layer, not equivalent to recovered meteorites.','经地质证据确认的结构、直径、年龄与位置。':'Structures, diameters, ages, and locations confirmed by geological evidence.',
    '记录档案':'OBJECT ARCHIVE','选择一个对象':'SELECT AN OBJECT','定位':'LOCATE','仅显示同类':'SAME CLASS','同期记录':'SAME PERIOD','进入物质尺度 ↗':'GO TO MATERIAL ↗','滚轮浏览请使用浏览器缩放 · ESC 关闭':'Use browser zoom to inspect · ESC to close',
    '原稿矢量 / FALL PROCESS':'SOURCE VECTOR / FALL PROCESS','原稿矢量 / MASS · DIAMETER GRADES':'SOURCE VECTOR / MASS · DIAMETER GRADES','深入了解':'READ MORE','它把“陨石抵达地球以后留下的记录”压缩进一个圆形世界图。左侧强调大型陨石记录，右侧强调巨大撞击结构，中间的点阵地球提供地理位置。':'It compresses the record left after meteorites reach Earth into one circular world map: major meteorites on the left, major impact structures on the right, and a dotted Earth for location.','表示坠落过程被观察到；':' means the fall was observed; ','表示陨石是在地表后来被发现。网页只给 Fell 绘制入射短轨迹，Found 直接从地表出现。':' means the meteorite was discovered later on the surface. Only Fell receives an entry trace; Found appears directly on the ground.','这里呈现的是':'These are ','人类记录中的陨石':'meteorites in human records','，不是地球真实发生过的全部坠落事件。搜索活动、人口、地表保存条件、沙漠与南极考察都会影响我们“看见”多少记录。':', not every fall that occurred. Search activity, population, preservation, deserts, and Antarctic fieldwork all shape what we can see.','暖色表示陨石记录；冷色表示撞击结构。陨石点大小按质量的对数尺度压缩；Fell 使用菱形/轨迹，Found 使用圆点。原稿中的大型陨石质量等级仍以左侧环形语言保留。':'Warm colors represent meteorite records; cool colors represent impact structures. Point size compresses mass logarithmically; Fell uses diamonds and traces, Found uses circles.','陨石记录是一件被回收或观测到的天体碎片；撞击结构是地球地质表面保存的撞击遗迹。它们来自不同的数据体系，因此网页在 05 / IMPACT 中独立显示。':'A meteorite record is a recovered or observed fragment; an impact structure is a geological trace preserved on Earth. They come from different data systems and remain separate in 05 / IMPACT.','不一定。时间模式首先表现的是':'Not necessarily. Time mode first shows ','记录数量的累积':'accumulated records','。它同时反映真实事件、发现活动和记录制度的变化，因此不能直接解释成坠落频率持续增加。':'. It reflects events, discovery activity, and recording systems, so it is not direct evidence of a rising fall frequency.','原图负责看见整体；网页允许同一条记录在地表投影、Fell/Found、时间累积和数据坐标之间保持身份，并能被选择、筛选和继续进入物质尺度。':'The source chart shows the whole. The web version preserves each record across surface projection, Fell/Found status, time accumulation, and data coordinates, while allowing selection, filtering, and entry into Material scale.','05 / IMPACT 设计注意事项':'05 / IMPACT DESIGN CAUTIONS','最后板块必须把“回收陨石”与“地质撞击结构”分开：冷色只表达撞击结构，直径与年龄不得套用陨石质量等级；选择结构后先定位地球坐标，再提供进入物质尺度的下一步，不把推测轨迹画成已知事实。':'The final section must separate recovered meteorites from geological impact structures. Cool colors encode structures only; diameter and age never reuse meteorite mass grades. Locate the structure first, then offer the next step into Material, and never draw a speculative path as known fact.','被观察到实际坠落的陨石记录。':'A meteorite record whose actual fall was observed.','并未观察到坠落，而是在之后被发现的样本。':'A sample found later without an observed fall.','数据集中记录的质量，网页使用对数尺度压缩视觉差异。':'Recorded mass, visually compressed with a logarithmic scale.','Meteoritical Society 数据中的陨石分类字段。':'Meteorite classification field from Meteoritical Society data.','经地质证据确认的地球撞击结构。':'An Earth impact structure confirmed by geological evidence.','当前可视化本地化 45,716 条 legacy snapshot；原始体系来自 The Meteoritical Society。':'The current view localizes a 45,716-record legacy snapshot originating from The Meteoritical Society.','陨石名称、分类、正式状态、年份及 Fell / Find 记录的主数据库。':'Primary database for meteorite names, classes, official status, years, and Fell / Find records.','大气层火球/火流星事件；适合未来加入真实入射高度、能量与速度，不替代陨石回收记录。':'Atmospheric fireball events, suitable for real entry altitude, energy, and velocity in a future layer; not a replacement for recovered meteorite records.','确认的地球撞击结构；本原型先使用原稿中出现的代表性结构。':'Confirmed Earth impact structures; this prototype uses representative structures from the source chart.','本地化的低分辨率大陆与海岸线几何，用于平面地图到球体的连续投影。':'Localized low-resolution land and coastline geometry for continuous flat-to-globe projection.','NASA legacy CSV：45,716 records，其中 32,186 条具有可绘制坐标；本地可视化忽略缺失坐标与 (0,0) 占位坐标。时间模式上限按该快照的 2013 年设置。':'NASA legacy CSV: 45,716 records, with 32,186 drawable coordinates. Missing and (0,0) placeholders are ignored; Time mode ends at 2013.','《陨石降落分布图2.ai》中的圆形世界、左右环带、质量/直径分级与落下流程被作为本页视觉结构直接引用和扩展。':'The circular world, side rings, mass/diameter grades, and fall process from 陨石降落分布图2.ai are directly reused and extended as this page’s visual structure.'
  }
};

const originalText=new WeakMap();
const dynamicTextSelector='#modeIndex,#modeTitle,#modeSub,#projectionTitle,#projectionCopy,#projectionMode,#timeEventRead,#selectedChipType,#selectedChipName,#selectedChipMeta,#objectType,#objectName,#objectMeta';
function translateStaticText(){
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode())){
    const parent=node.parentElement;if(!parent||parent.closest('script,style,'+dynamicTextSelector))continue;
    const raw=node.nodeValue,key=raw.trim();if(!key)continue;
    if(!originalText.has(node))originalText.set(node,key);
    const source=originalText.get(node),target=state.lang==='zh'?source:(textI18n[state.lang][source]||source);
    const lead=raw.match(/^\s*/)?.[0]||'',tail=raw.match(/\s*$/)?.[0]||'';node.nodeValue=lead+target+tail;
  }
}

function applyLanguage(){
  if(!['zh','ja','en'].includes(state.lang))state.lang='zh';
  document.documentElement.lang=state.lang==='zh'?'zh-CN':state.lang;
  translateStaticText();
  $$('#languageSet button').forEach(b=>b.classList.toggle('active',b.dataset.lang===state.lang));
  setView(state.view,false);updateProjectionCopy();updateTimeStatus(true);
  if(state.selected){selectObject(state.selected,false);renderInspector(state.selected)}
  else $('#objectName').textContent=state.lang==='ja'?'オブジェクトを選択':state.lang==='en'?'SELECT AN OBJECT':'选择一个对象';
}

function resize(){
  DPR=Math.min(devicePixelRatio||1,1.5);
  W=innerWidth;H=innerHeight;
  canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);
  canvas.style.width=W+'px';canvas.style.height=H+'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);
  stageTop=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h'))||70;
  stageBottom=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--footer-h'))||80;
  const contentH=H-stageTop-stageBottom;
  cx=W*.545;cy=stageTop+contentH*.50;
  R=Math.min(W*.29,contentH*.38)*state.zoom;
  mapCx=W*.54;mapCy=stageTop+contentH*.50;
  mapW=Math.max(W*.90,contentH*1.94);mapH=mapW*.50;
}
addEventListener('resize',resize);resize();

function massGrade(m){
  if(!Number.isFinite(m)||m<=0)return 0;
  if(m<1e3)return 0;
  if(m<1e5)return 1;
  if(m<1e6)return 2;
  if(m<1e7)return 3;
  return 4;
}
function massRadius(m){
  if(!Number.isFinite(m)||m<=0)return .65;
  return clamp(.55+Math.log10(m+1)*.31,.65,3.6);
}
function warmByMass(m){return ['#ffc52b','#f49b24','#f16b28','#ee4f33','#df263b'][massGrade(m)]}
function famColor(f){return classColors[f]||classColors.Other}
function readableMass(g){
  if(!Number.isFinite(g))return '—';
  if(g>=1e6)return (g/1e6).toFixed(g>=1e7?0:1)+' t';
  if(g>=1e3)return (g/1e3).toFixed(g>=1e5?0:1)+' kg';
  return Math.round(g)+' g';
}
function recObj(a){return {name:a[0],recclass:a[1],mass:a[2],fall:a[3],year:a[4],lat:a[5],lon:a[6],family:a[7],kind:'meteorite'}}

async function loadData(){
  try{
    const d=window.METEORITE_DATA || await (await fetch('data/meteorites.json')).json();
    state.meta=d.meta;state.records=d.records.map(recObj);state.loaded=true;
    state.majors=[...state.records].filter(x=>Number.isFinite(x.mass)).sort((a,b)=>b.mass-a.mass).slice(0,20);
    updateStats();rebuildFiltered();updateTimeStatus(true);
  }catch(e){
    console.error(e);
    $('#statGeo').textContent='DATA ERROR';
  }
}
loadData();

async function loadGeography(){
  try{
    const geo=await (await fetch('data/ne_110m_land.geojson')).json();
    const polygons=[];
    for(const feature of geo.features||[]){
      const geometry=feature.geometry||{};
      const groups=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];
      for(const rings of groups){
        if(!rings?.length)continue;
        const outer=rings[0];
        const xs=outer.map(p=>p[0]),ys=outer.map(p=>p[1]);
        polygons.push({rings,bbox:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]});
      }
    }
    state.landPolygons=polygons;
    state.landDots=buildLandDots(polygons);
    state.geographyLoaded=true;
  }catch(e){
    console.error('Natural Earth geography failed to load',e);
  }
}
loadGeography();

function pointInRing(lon,lat,ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const xi=ring[i][0],yi=ring[i][1],xj=ring[j][0],yj=ring[j][1];
    if(((yi>lat)!==(yj>lat))&&(lon<(xj-xi)*(lat-yi)/(yj-yi)+xi))inside=!inside;
  }
  return inside;
}
function pointInPolygon(lon,lat,poly){
  const b=poly.bbox;
  if(lon<b[0]||lon>b[2]||lat<b[1]||lat>b[3]||!pointInRing(lon,lat,poly.rings[0]))return false;
  for(let i=1;i<poly.rings.length;i++)if(pointInRing(lon,lat,poly.rings[i]))return false;
  return true;
}
function buildLandDots(polygons){
  const dots=[];let row=0;
  for(let lat=-84;lat<=84;lat+=3.6,row++){
    const offset=(row%2)*1.8;
    for(let lon=-178+offset;lon<=178;lon+=3.6){
      if(polygons.some(poly=>pointInPolygon(lon,lat,poly)))dots.push([lat,lon]);
    }
  }
  return dots;
}

function updateStats(){
  if(!state.meta)return;
  $('#statTotal').textContent=state.meta.total_records.toLocaleString();
  $('#statGeo').textContent=state.meta.geolocated_records.toLocaleString();
  $('#statFell').textContent=state.meta.fell_total.toLocaleString();
  $('#statFound').textContent=state.meta.found_total.toLocaleString();
}

function updateTimeStatus(force=false){
  if(!state.loaded)return;
  const year=Math.round(state.year);
  if(!force&&state.statusYear===year)return;
  state.statusYear=year;
  let fell=0,cumulative=0,representative=null;
  for(const o of state.records){
    if(o.year==null)continue;
    if(o.year===year&&o.fall==='Fell'){
      fell++;
      if(!representative||(o.mass||0)>(representative.mass||0))representative=o;
    }
    if(o.year<=year)cumulative++;
  }
  const el=$('#timeEventRead');
  const lead=state.lang==='ja'?`当年 FELL ${fell} · 累積 ${cumulative.toLocaleString()}`:state.lang==='en'?`FELL THIS YEAR ${fell} · CUMULATIVE ${cumulative.toLocaleString()}`:`当年 FELL ${fell} · 累计 ${cumulative.toLocaleString()}`;
  if(el)el.textContent=`${lead} · ${representative?representative.name.toUpperCase():'NO OBSERVED FALL'}`;
}

function passFilter(o){
  if(state.fall!=='all'&&o.fall!==state.fall)return false;
  if(state.cls!=='all'&&o.family!==state.cls)return false;
  if(state.mass!=='all'&&massGrade(o.mass)!==+state.mass)return false;
  if(state.periodCenter!=null){if(o.year==null||Math.abs(o.year-state.periodCenter)>10)return false;}
  return true;
}
function rebuildFiltered(){
  if(!state.loaded)return;
  state.filtered=state.records.filter(passFilter);
  // Deterministic thinning for motion/performance; all Fell are retained in Record mode.
  const max=state.view==='distribution'?9500:12500;
  if(state.filtered.length<=max) state.drawRecords=state.filtered;
  else {
    const stride=state.filtered.length/max;
    const out=[];
    for(let i=0;i<max;i++) out.push(state.filtered[Math.floor(i*stride)]);
    if(state.view==='record'){
      const fell=state.filtered.filter(o=>o.fall==='Fell');
      const names=new Set(out.map(o=>o.name));
      for(const o of fell)if(!names.has(o.name))out.push(o);
    }
    state.drawRecords=out;
  }
}

function projectFlat(lat,lon){
  const x=mapCx+state.flatPanX+(lon/180)*mapW*.5;
  const y=mapCy+state.flatPanY-(lat/90)*mapH*.5;
  return {x,y,z:1,visible:true};
}
function projectGlobe(lat,lon){
  const la=lat*Math.PI/180, lo=lon*Math.PI/180+state.yaw;
  const cl=Math.cos(la),sl=Math.sin(la),co=Math.cos(lo),so=Math.sin(lo);
  let x=cl*so,y=sl,z=cl*co;
  const cp=Math.cos(state.pitch),sp=Math.sin(state.pitch);
  const y2=y*cp-z*sp,z2=y*sp+z*cp;
  return {x:cx+x*R,y:cy-y2*R,z:z2,visible:z2>-0.025};
}
function projectBlend(lat,lon){
  const f=projectFlat(lat,lon),g=projectGlobe(lat,lon),t=state.morph;
  return {x:lerp(f.x,g.x,t),y:lerp(f.y,g.y,t),z:g.z,visible:t<.55?true:g.visible,back:t>.25?clamp((g.z+.07)/.16,0,1):1};
}

function flatFrame(){return{x:mapCx+state.flatPanX-mapW*.5,y:mapCy+state.flatPanY-mapH*.5,w:mapW,h:mapH}}

function clear(){
  ctx.fillStyle='#090707';ctx.fillRect(0,0,W,H);
  const g=ctx.createRadialGradient(cx,cy,0,cx,cy,R*2.2);
  g.addColorStop(0,'rgba(43,24,20,.20)');g.addColorStop(.52,'rgba(18,10,9,.05)');g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(255,255,255,.08)';
  for(let i=0;i<80;i++){const x=((i*577)%991)/991*W,y=((i*233)%983)/983*H;ctx.fillRect(x,y,.55,.55)}
}

function drawEarthGeography(){
  const globe=clamp((state.morph-.18)/.68,0,1),flat=1-globe,box=flatFrame();
  ctx.save();
  if(flat>.01){
    const oceanFlat=ctx.createLinearGradient(box.x,box.y,box.x+box.w,box.y+box.h);
    oceanFlat.addColorStop(0,'rgba(18,29,34,.42)');oceanFlat.addColorStop(.55,'rgba(8,17,21,.48)');oceanFlat.addColorStop(1,'rgba(4,9,12,.68)');
    ctx.globalAlpha=flat;ctx.fillStyle=oceanFlat;ctx.fillRect(0,stageTop,W,H-stageTop-stageBottom);ctx.strokeStyle='rgba(146,193,216,.16)';ctx.lineWidth=.6;ctx.strokeRect(box.x,box.y,box.w,box.h);
  }
  if(globe>.01){
    ctx.save();ctx.globalAlpha=globe;ctx.beginPath();ctx.arc(cx,cy,R,0,TAU);ctx.clip();
    const ocean=ctx.createRadialGradient(cx-R*.28,cy-R*.34,R*.08,cx,cy,R*1.08);
    ocean.addColorStop(0,'rgba(24,34,39,.42)');ocean.addColorStop(.62,'rgba(10,18,22,.36)');ocean.addColorStop(1,'rgba(4,7,9,.72)');
    ctx.fillStyle=ocean;ctx.fillRect(cx-R,cy-R,R*2,R*2);ctx.restore();
  }
  ctx.globalAlpha=1;
  if(state.geographyLoaded){
    ctx.fillStyle=`rgba(222,214,207,${.34+state.morph*.18})`;
    const dotR=.54+state.morph*.18;
    for(const d of state.landDots){
      const p=projectBlend(d[0],d[1]);if(!p.visible||(state.morph>=.2&&p.z<=-.08))continue;
      ctx.beginPath();ctx.arc(p.x,p.y,dotR,0,TAU);ctx.fill();
    }
    ctx.strokeStyle=`rgba(226,219,213,${.40+state.morph*.22})`;ctx.lineWidth=.72;
    for(const poly of state.landPolygons){
      for(const ring of poly.rings){
        ctx.beginPath();let started=false,prev=null;
        for(const coord of ring){
          const p=projectBlend(coord[1],coord[0]);
          const jump=prev&&Math.hypot(p.x-prev.x,p.y-prev.y)>R*.56;
          if(!p.visible||(state.morph>=.2&&p.z<=-.08)||jump){started=false;prev=p;continue}
          if(!started){ctx.moveTo(p.x,p.y);started=true}else ctx.lineTo(p.x,p.y);
          prev=p;
        }
        ctx.stroke();
      }
    }
  }
  const shade=ctx.createLinearGradient(box.x,box.y,box.x+box.w,box.y+box.h);
  shade.addColorStop(0,'rgba(255,255,255,.025)');shade.addColorStop(.48,'rgba(255,255,255,0)');shade.addColorStop(1,`rgba(0,0,0,${.10+state.morph*.34})`);
  if(flat>.01){ctx.globalAlpha=flat;ctx.fillStyle=shade;ctx.fillRect(0,stageTop,W,H-stageTop-stageBottom)}
  if(globe>.01){ctx.save();ctx.globalAlpha=globe;ctx.beginPath();ctx.arc(cx,cy,R,0,TAU);ctx.clip();ctx.fillStyle=shade;ctx.fillRect(cx-R,cy-R,R*2,R*2);ctx.restore()}
  ctx.restore();
}

function drawCircleBase(){
  const reveal=clamp((state.morph-.38)/.34,0,1);if(reveal<=.001)return;
  ctx.save();ctx.globalAlpha=reveal;
  ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(cx,cy,R,0,TAU);ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.07)';ctx.beginPath();ctx.arc(cx,cy,R*1.055,0,TAU);ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.045)';ctx.beginPath();ctx.arc(cx,cy,R*.84,0,TAU);ctx.stroke();
  // Cross reference from source chart.
  ctx.strokeStyle='rgba(239,72,57,.16)';ctx.beginPath();ctx.moveTo(cx-R*1.07,cy);ctx.lineTo(cx+R*1.07,cy);ctx.stroke();
  ctx.strokeStyle='rgba(70,157,221,.13)';ctx.beginPath();ctx.moveTo(cx,cy-R*1.07);ctx.lineTo(cx,cy+R*1.07);ctx.stroke();
  ctx.restore();
}

function drawGraticule(){
  ctx.save();
  for(let lat=-75;lat<=75;lat+=15){
    const major=lat%30===0;
    ctx.beginPath();let started=false;
    for(let lon=-180;lon<=180;lon+=3){const p=projectBlend(lat,lon);if(!p.visible||(state.morph>=.2&&p.z<=-.07)){started=false;continue}if(!started){ctx.moveTo(p.x,p.y);started=true}else ctx.lineTo(p.x,p.y)}
    ctx.lineWidth=major?.82:.46;ctx.strokeStyle=major?'rgba(157,202,225,.18)':'rgba(157,202,225,.075)';ctx.stroke();
  }
  for(let lon=-180;lon<=180;lon+=15){
    const major=lon%30===0;
    ctx.beginPath();let started=false;
    for(let lat=-88;lat<=88;lat+=2.5){const p=projectBlend(lat,lon);if(!p.visible||(state.morph>=.2&&p.z<=-.07)){started=false;continue}if(!started){ctx.moveTo(p.x,p.y);started=true}else ctx.lineTo(p.x,p.y)}
    ctx.lineWidth=major?.82:.46;ctx.strokeStyle=major?'rgba(157,202,225,.17)':'rgba(157,202,225,.068)';ctx.stroke();
  }
  ctx.font='5px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='rgba(176,211,228,.58)';
  for(let lon=-120;lon<=120;lon+=60){const p=projectBlend(-72,lon);if(!p.visible||(state.morph>=.2&&p.z<.08))continue;const label=lon===0?'0°':`${Math.abs(lon)}°${lon<0?'W':'E'}`;ctx.fillText(label,p.x,p.y+8)}
  ctx.restore();
}

function drawGlyph(x,y,r,o,alpha=1){
  ctx.save();ctx.globalAlpha=alpha;
  const color=o.fall==='Fell'?'#ffc52b':warmByMass(o.mass);
  ctx.fillStyle=color;
  if(o.fall==='Fell'){
    ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.fillRect(-r*.72,-r*.72,r*1.44,r*1.44);
  }else{
    ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
  }
  ctx.restore();
}

function drawFallTrace(p,o,alpha){
  if(o.fall!=='Fell'||(!state.trace&&state.view!=='record'))return;
  const strong=state.trace, dx=(o.lon>=0?1:-1)*(strong?10:6),dy=strong?-20:-12;
  ctx.save();ctx.globalAlpha=(strong?.44:.18)*alpha;ctx.strokeStyle='#ffc52b';ctx.lineWidth=strong?.8:.55;ctx.setLineDash([1.2,2.2]);ctx.beginPath();ctx.moveTo(p.x+dx*1.8,p.y+dy*1.8);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.setLineDash([]);ctx.restore();
}

function nameHash(name){
  let h=2166136261;
  for(let i=0;i<name.length;i++){h^=name.charCodeAt(i);h=Math.imul(h,16777619)}
  return h>>>0;
}
function fallAnimationPhase(o){
  if(o.fall!=='Fell'||!Number.isFinite(o.year))return null;
  if(state.view==='time'){
    if(!state.playing)return Math.round(state.year)===o.year ? .84 : null;
    const span=Math.max(.85,state.speed*.18),delta=state.year-o.year;
    return delta>=0&&delta<span?clamp(delta/span,0,1):null;
  }
  if(state.view==='record'&&state.trace){
    const h=nameHash(o.name);
    if(h%7!==0)return null;
    return ((performance.now()/2400)+(h%997)/997)%1;
  }
  return null;
}
function drawAnimatedFall(p,o,phase,alpha){
  if(phase==null||(state.morph>=.2&&p.z<=-.08))return;
  const h=nameHash(o.name),rx=(p.x-cx)/Math.max(R,1),ry=(p.y-cy)/Math.max(R,1);
  let nx=rx*.42+(((h%23)/22)-.5)*.34,ny=-.88+ry*.28;
  const nl=Math.hypot(nx,ny)||1;nx/=nl;ny/=nl;
  const eased=1-Math.pow(1-clamp(phase/0.74,0,1),3),distance=34+Math.min(34,massGrade(o.mass)*7);
  const hx=p.x+nx*distance*(1-eased),hy=p.y+ny*distance*(1-eased),tail=12+distance*.42*(1-eased);
  if(phase<.82){
    const grad=ctx.createLinearGradient(hx+nx*tail,hy+ny*tail,hx,hy);
    grad.addColorStop(0,'rgba(255,128,35,0)');grad.addColorStop(.62,'rgba(255,93,32,.36)');grad.addColorStop(1,'rgba(255,218,94,.96)');
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=grad;ctx.lineWidth=1.1+massGrade(o.mass)*.18;ctx.beginPath();ctx.moveTo(hx+nx*tail,hy+ny*tail);ctx.lineTo(hx,hy);ctx.stroke();
    ctx.translate(hx,hy);ctx.rotate(Math.PI/4);ctx.fillStyle='#ffe170';ctx.fillRect(-1.7,-1.7,3.4,3.4);ctx.restore();
  }
  if(phase>.66){
    const q=clamp((phase-.66)/.34,0,1);
    ctx.save();ctx.globalAlpha=(1-q)*.72*alpha;ctx.strokeStyle='#ffc52b';ctx.lineWidth=.9;
    ctx.beginPath();ctx.arc(p.x,p.y,3+q*16,0,TAU);ctx.stroke();
    ctx.globalAlpha=(1-q)*.38*alpha;ctx.beginPath();ctx.arc(p.x,p.y,2+q*25,0,TAU);ctx.stroke();ctx.restore();
  }
}

function drawRecords(){
  state.hit=[];
  const alphaBase=state.view==='record'?.50:state.view==='time'?.48:.28;
  for(let i=0;i<state.drawRecords.length;i++){
    const o=state.drawRecords[i];
    if(state.view==='time'&&o.year!=null&&o.year>state.year)continue;
    const p=projectBlend(o.lat,o.lon);if(!p.visible)continue;
    const back=p.back==null?1:p.back;
    let a=alphaBase*back;
    if(state.view==='record') a*=o.fall==='Fell'?1.55:.55;
    const r=massRadius(o.mass)*(state.view==='record'&&o.fall==='Fell'?1.22:1);
    drawFallTrace(p,o,back);
    drawGlyph(p.x,p.y,r,o,a);
    drawAnimatedFall(p,o,fallAnimationPhase(o),back);
    if(r>2.1||o.fall==='Fell') state.hit.push({x:p.x,y:p.y,r:Math.max(7,r+4),obj:o});
  }
  // Major records are always legible.
  for(const o of state.majors){
    if(!passFilter(o))continue;
    const p=projectBlend(o.lat,o.lon);if(!p.visible)continue;
    const r=4.3+massGrade(o.mass)*.8;
    drawGlyph(p.x,p.y,r,o,.92*(p.back??1));
    ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=.55;ctx.beginPath();ctx.arc(p.x,p.y,r+3,0,TAU);ctx.stroke();
    state.hit.push({x:p.x,y:p.y,r:r+6,obj:o});
  }
}

function drawSourceRing(){
  const reveal=clamp((state.morph-.72)/.16,0,1);if(!state.majors.length||reveal<=.001)return;
  const left=state.majors.slice(0,15);
  const rr=R*1.14;
  ctx.save();ctx.globalAlpha=reveal;ctx.textBaseline='middle';
  left.forEach((o,i)=>{
    const a=(Math.PI*.60)+(i/(left.length-1))*Math.PI*.82;
    const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;
    const x2=cx+Math.cos(a)*R*1.02,y2=cy+Math.sin(a)*R*1.02;
    ctx.strokeStyle='rgba(236,132,108,.32)';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x,y);ctx.stroke();
    const active=sameObject(state.selected,o),col=o.fall==='Fell'?'#ffc52b':warmByMass(o.mass),markerR=2.5+massGrade(o.mass)*.48;
    drawGlyph(x2,y2,markerR,o,reveal*(active?1:.9));
    if(active){ctx.strokeStyle='#fff';ctx.lineWidth=.7;ctx.beginPath();ctx.arc(x2,y2,markerR+4,0,TAU);ctx.stroke();state.ringAnchor={x:x2,y:y2,color:col}}
    const flipped=a>Math.PI/2&&a<Math.PI*1.5,tx=flipped?-6:6;
    ctx.save();ctx.translate(x,y);ctx.rotate(flipped?a+Math.PI:a);ctx.textAlign=flipped?'right':'left';ctx.fillStyle=active?'#fff':'rgba(220,211,206,.78)';ctx.font=active?'700 6.5px Arial':'6px Arial';ctx.fillText(o.name.toUpperCase(),tx,-2.5);ctx.fillStyle=active?col:'rgba(151,141,136,.62)';ctx.font='5px Arial';ctx.fillText(`${o.fall.toUpperCase()} · ${o.year||'—'} · M${massGrade(o.mass)+1}`,tx,5);ctx.restore();
    if(reveal>.72&&(state.view==='record'||state.view==='surface')){
      state.hit.push({x:x2,y:y2,r:10,obj:o,outer:true});
      state.hit.push({x,y,r:22,obj:o,outer:true});
    }
  });
  ctx.restore();
}

function impactColor(i){return ['#2099d7','#347fca','#3e68bd','#554aa9','#6b3c9d','#77308f'][i%6]}
function drawImpactRing(){
  const reveal=clamp((state.morph-.72)/.16,0,1);if(reveal<=.001)return;
  const rr=R*1.14;
  ctx.save();ctx.globalAlpha=reveal;ctx.textBaseline='middle';
  impacts.forEach((o,i)=>{
    const a=(-Math.PI*.50)+(i/(impacts.length-1))*Math.PI*.82;
    const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;
    const x2=cx+Math.cos(a)*R*1.02,y2=cy+Math.sin(a)*R*1.02;
    ctx.strokeStyle='rgba(93,162,216,.36)';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x,y);ctx.stroke();
    const obj={...o,kind:'impact'},active=sameObject(state.selected,obj),col=impactColor(i);
    ctx.fillStyle=col;roundRect(ctx,x2-(active?3.8:2.8),y2-(active?7:5.5),active?7.6:5.6,active?14:11,2);ctx.fill();
    if(active){ctx.strokeStyle='#fff';ctx.lineWidth=.7;ctx.beginPath();ctx.arc(x2,y2,9,0,TAU);ctx.stroke();state.ringAnchor={x:x2,y:y2,color:col}}
    ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=active?'#fff':'rgba(207,214,223,.76)';ctx.font=active?'700 6.5px Arial':'6px Arial';ctx.textAlign='left';ctx.fillText(o.name.toUpperCase(),6,-2.5);ctx.fillStyle=active?col:'rgba(132,151,166,.64)';ctx.font='5px Arial';ctx.fillText(`IMPACT · ${o.diameter||'—'}`,6,5);ctx.restore();
    if(reveal>.72&&(state.view==='impact'||state.view==='surface')){
      state.hit.push({x:x2,y:y2,r:11,obj,outer:true});
      state.hit.push({x,y,r:22,obj,outer:true});
    }
  });ctx.restore();
}
function roundRect(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}

function sameObject(a,b){return !!a&&!!b&&a.name===b.name&&(a.kind||'meteorite')===(b.kind||'meteorite')}

function drawFocusOverlay(){
  const o=state.selected;if(!o||state.view==='distribution')return;
  const p=projectBlend(o.lat,o.lon);if(!p.visible||(state.morph>=.2&&p.z<=-.07))return;
  const impact=o.kind==='impact',color=impact?'#3ba1e8':o.fall==='Fell'?'#ffc52b':warmByMass(o.mass);
  const phase=(performance.now()%1300)/1300,pulse=8+phase*18;
  ctx.save();
  if(state.ringAnchor){
    const a=state.ringAnchor,mx=(a.x+p.x)*.5,my=(a.y+p.y)*.5-R*.12;
    ctx.strokeStyle=color;ctx.globalAlpha=.48;ctx.lineWidth=.8;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo(mx,my,p.x,p.y);ctx.stroke();ctx.setLineDash([]);
  }
  ctx.globalAlpha=.85;ctx.strokeStyle=color;ctx.lineWidth=1;
  ctx.beginPath();ctx.arc(p.x,p.y,7,0,TAU);ctx.stroke();
  ctx.globalAlpha=.46*(1-phase);ctx.beginPath();ctx.arc(p.x,p.y,pulse,0,TAU);ctx.stroke();
  ctx.globalAlpha=.72;ctx.beginPath();ctx.moveTo(p.x-12,p.y);ctx.lineTo(p.x+12,p.y);ctx.moveTo(p.x,p.y-12);ctx.lineTo(p.x,p.y+12);ctx.stroke();
  const title=o.name.toUpperCase(),meta=impact?`IMPACT · ${o.diameter||'—'} · ${o.location||''}`:`${o.fall} · ${o.year||'—'} · ${readableMass(o.mass)}`;
  const coord=`LAT ${Math.abs(o.lat).toFixed(2)}°${o.lat<0?'S':'N'}  /  LON ${Math.abs(o.lon).toFixed(2)}°${o.lon<0?'W':'E'}`;
  ctx.font='700 7px Arial';const width=Math.max(142,ctx.measureText(title).width+20,ctx.measureText(meta).width+20);let lx=p.x+15;if(lx+width>W-18)lx=p.x-width-15;let ly=clamp(p.y-34,82,H-148);
  ctx.globalAlpha=.94;ctx.fillStyle='rgba(9,7,7,.92)';roundRect(ctx,lx,ly,width,44,3);ctx.fill();ctx.strokeStyle=color;ctx.globalAlpha=.68;ctx.stroke();
  ctx.globalAlpha=1;ctx.fillStyle='#f1ece9';ctx.fillText(title,lx+9,ly+13);ctx.font='5.5px Arial';ctx.fillStyle=color;ctx.fillText(meta,lx+9,ly+25);ctx.fillStyle='rgba(184,202,211,.72)';ctx.fillText(coord,lx+9,ly+36);
  ctx.restore();
}

function drawImpactMode(){
  drawEarthGeography();drawCircleBase();drawGraticule();
  // Meteorite records as quiet context.
  ctx.save();ctx.globalAlpha=.12;
  const old=state.view; // draw directly for performance
  for(let i=0;i<state.drawRecords.length;i+=2){const o=state.drawRecords[i],p=projectBlend(o.lat,o.lon);if(!p.visible)continue;ctx.fillStyle='#ba4e37';ctx.fillRect(p.x,p.y,.7,.7)}
  ctx.restore();
  state.hit=[];
  impacts.forEach((o,i)=>{
    const p=projectBlend(o.lat,o.lon);if(!p.visible)return;
    const size=5.5+i%3*1.3;ctx.save();ctx.fillStyle=impactColor(i);ctx.globalAlpha=.95;ctx.beginPath();ctx.arc(p.x,p.y,size,0,TAU);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=.6;ctx.beginPath();ctx.arc(p.x,p.y,size+4,0,TAU);ctx.stroke();ctx.restore();
    ctx.fillStyle='rgba(225,226,230,.8)';ctx.font='7px Arial';ctx.fillText(o.name,p.x+9,p.y-6);
    state.hit.push({x:p.x,y:p.y,r:size+8,obj:{...o,kind:'impact'}});
  });
  drawImpactRing();
  drawFocusOverlay();
}

function drawDistribution(){
  state.hit=[];
  const box=Math.min(W*.58,H*.62);const ox=cx,oy=cy+8;
  const yaw=state.yaw*.65+0.35,pitch=state.pitch*.7+0.55,cp=Math.cos(pitch),sp=Math.sin(pitch),cyw=Math.cos(yaw),syw=Math.sin(yaw);
  function proj3(x,y,z){
    let x1=x*cyw+z*syw,z1=-x*syw+z*cyw;
    let y1=y*cp-z1*sp,z2=y*sp+z1*cp;
    const s=box*.37*(1+z2*.07);return {x:ox+x1*s,y:oy-y1*s,z:z2};
  }
  // cube axes
  const O=proj3(-1,-1,-1),X=proj3(1,-1,-1),Y=proj3(-1,1,-1),Z=proj3(-1,-1,1);
  ctx.strokeStyle='rgba(255,255,255,.24)';ctx.lineWidth=.7;for(const p of [X,Y,Z]){ctx.beginPath();ctx.moveTo(O.x,O.y);ctx.lineTo(p.x,p.y);ctx.stroke()}
  ctx.fillStyle='rgba(215,207,202,.72)';ctx.font='7px Arial';ctx.fillText('YEAR →',X.x+6,X.y);ctx.fillText('↑ MASS / LOG',Y.x-18,Y.y-6);ctx.fillText('LATITUDE / CLASS',Z.x+6,Z.y);
  ctx.fillStyle='rgba(120,111,106,.5)';ctx.font='6px Arial';ctx.fillText('1800',O.x-10,O.y+14);ctx.fillText('2013',X.x-8,X.y+14);
  const arr=state.drawRecords;
  for(let i=0;i<arr.length;i++){
    const o=arr[i];if(o.year==null)continue;
    const xn=clamp((o.year-1800)/(2013-1800),0,1)*2-1;
    const mn=clamp(Math.log10((o.mass||1)+1)/8,0,1)*2-1;
    const zn=clamp(o.lat/90,-1,1);
    const p=proj3(xn,mn,zn);const a=.23+clamp((p.z+1)/2,0,1)*.28;
    ctx.globalAlpha=a;ctx.fillStyle=o.fall==='Fell'?'#ffc52b':famColor(o.family);const r=massRadius(o.mass)*.68;ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);ctx.fill();ctx.globalAlpha=1;
    if(r>1.9||o.fall==='Fell')state.hit.push({x:p.x,y:p.y,r:6,obj:o});
  }
  // Label selected if present.
  if(state.selected?.kind==='meteorite'){
    const o=state.selected;if(o.year!=null){const p=proj3(clamp((o.year-1800)/(2013-1800),0,1)*2-1,clamp(Math.log10((o.mass||1)+1)/8,0,1)*2-1,clamp(o.lat/90,-1,1));ctx.strokeStyle='#fff';ctx.beginPath();ctx.arc(p.x,p.y,8,0,TAU);ctx.stroke();ctx.fillStyle='#fff';ctx.font='7px Arial';ctx.fillText(o.name,p.x+12,p.y-8)}
  }
}

function drawSurfaceLike(){
  drawEarthGeography();drawCircleBase();drawGraticule();drawRecords();
  if(state.view==='surface'){drawSourceRing();drawImpactRing();}
  if(state.view==='record')drawSourceRing();
  drawFocusOverlay();
}

function render(now){
  const dt=Math.min(.05,(now-state.last)/1000);state.last=now;
  if(state.playing&&state.view==='time'){
    state.year+=dt*state.speed*3.2;if(state.year>=2013){state.year=2013;state.playing=false;$('#playBtn').classList.remove('on');$('#playBtn').textContent='▶'}
    $('#yearRange').value=Math.round(state.year);$('#yearRead').textContent=Math.round(state.year);updateTimeStatus();
  }
  if(state.cameraTarget){
    const t=1-Math.pow(.0004,dt),dyaw=Math.atan2(Math.sin(state.cameraTarget.yaw-state.yaw),Math.cos(state.cameraTarget.yaw-state.yaw));
    state.yaw+=dyaw*t;state.pitch=lerp(state.pitch,state.cameraTarget.pitch,t);
    if(Math.abs(dyaw)<.002&&Math.abs(state.pitch-state.cameraTarget.pitch)<.002)state.cameraTarget=null;
  }
  state.morph=lerp(state.morph,state.morphTarget,1-Math.pow(.001,dt));
  const band=state.morph<.34?'flat':state.morph<.72?'forming':'globe';
  if(state.projectionBand!==band){
    state.projectionBand=band;document.body.dataset.projection=band;
    updateProjectionCopy(band);
  }
  state.ringAnchor=null;
  clear();
  if(state.view==='distribution')drawDistribution();
  else if(state.view==='impact')drawImpactMode();
  else drawSurfaceLike();
  state.frame++;requestAnimationFrame(render);
}
requestAnimationFrame(render);

function setView(v,fromUser=true){
  if(!modeCopy.zh[v])return;state.view=v;document.body.dataset.view=v;
  $$('.mode-nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
  const c=modeCopy[state.lang][v];$('#modeIndex').textContent=c[0];$('#modeTitle').textContent=c[1];$('#modeSub').textContent=c[2];
  if(v==='surface')state.morphTarget=0;
  else if(v==='record')state.morphTarget=.84;
  else if(v==='time')state.morphTarget=.88;
  else if(v==='impact')state.morphTarget=.92;
  $('#projectionHint').style.opacity=v==='surface'||v==='record'?'.82':'0';
  $('#timeline').classList.toggle('emphasis',v==='time');
  rebuildFiltered();
}
$$('.mode-nav button').forEach(b=>b.onclick=()=>setView(b.dataset.view));

function canvasPoint(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
canvas.addEventListener('pointerdown',e=>{
  const p=canvasPoint(e);state.dragging=true;state.pointerX=p.x;state.pointerY=p.y;state.dragStartMorph=state.morphTarget;state.dragMoved=0;canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
  const p=canvasPoint(e);
  if(state.dragging){
    const dx=p.x-state.pointerX,dy=p.y-state.pointerY;state.dragMoved+=Math.abs(dx)+Math.abs(dy);state.pointerX=p.x;state.pointerY=p.y;
    if(state.view==='distribution'){state.yaw+=dx*.006;state.pitch=clamp(state.pitch+dy*.005,-1.0,1.1);}
    else if(state.morphTarget<.55){
      state.flatPanX=clamp(state.flatPanX+dx,-mapW*.28,mapW*.28);
      state.flatPanY=clamp(state.flatPanY+dy,-mapH*.22,mapH*.22);
    }else{state.yaw+=dx*.0045;state.pitch=clamp(state.pitch+dy*.0038,-.95,.95)}
  }else updateHover(p,e);
});
canvas.addEventListener('pointerup',e=>{
  const p=canvasPoint(e);state.dragging=false;if(state.dragMoved<8)selectAt(p);canvas.releasePointerCapture(e.pointerId);
});
canvas.addEventListener('pointerleave',()=>{if(!state.dragging){hover.style.opacity=0;state.hover=null}});
canvas.addEventListener('wheel',e=>{
  e.preventDefault();
  state.morphTarget=clamp(state.morphTarget+e.deltaY*.00125,0,1);
},{passive:false});

function nearest(p){
  let best=null,bd=1e9;for(const h of state.hit){const dx=p.x-h.x,dy=p.y-h.y,d=dx*dx+dy*dy;if(d<h.r*h.r&&d<bd){bd=d;best=h}}return best;
}
function updateHover(p,e){
  const h=nearest(p);state.hover=h?.obj||null;canvas.style.cursor=h?'pointer':state.dragging?'grabbing':'grab';if(!h){hover.style.opacity=0;return}
  const o=h.obj;hover.querySelector('small').textContent=o.kind==='impact'?'IMPACT STRUCTURE':`${o.fall||''} · ${o.family||''}`;
  hover.querySelector('b').textContent=o.name;
  hover.querySelector('span').textContent=o.kind==='impact'?`${o.location||''} · ${o.diameter||''}`:`${o.year||'—'} · ${readableMass(o.mass)} · ${o.recclass||''}`;
  hover.style.left=Math.min(innerWidth-230,e.clientX+10)+'px';hover.style.top=Math.min(innerHeight-100,e.clientY+10)+'px';hover.style.opacity=1;
}
function selectAt(p){const h=nearest(p);if(!h)return;if(h.outer){selectObject(h.obj,false);focusObject(h.obj)}else selectObject(h.obj)}

function selectObject(o,showInspector=true){
  state.selected=o;$('#selectedChip').hidden=false;$('#selectedChipName').textContent=o.name;
  const located=state.lang==='ja'?'位置指定':state.lang==='en'?'LOCATED':'已定位',open=state.lang==='ja'?'記録を開く ↙':state.lang==='en'?'OPEN RECORD ↙':'打开档案 ↙';
  $('#selectedChipType').textContent=o.kind==='impact'?`IMPACT STRUCTURE / ${located}`:`METEORITE RECORD / ${located}`;
  $('#selectedChipMeta').textContent=o.kind==='impact'?`${o.location||'—'} · ${o.diameter||'—'} · ${open}`:`${o.fall} · ${o.year||'—'} · ${readableMass(o.mass)} · ${open}`;
  renderInspector(o);if(showInspector)openDrawer($('#inspector'));hover.style.opacity=0;
}
function focusObject(o){
  const targetView=o.kind==='impact'?'impact':'surface';setView(targetView);closeDrawers();state.morphTarget=.96;state.cameraTarget={yaw:-o.lon*Math.PI/180,pitch:clamp(o.lat*Math.PI/180,-.92,.92)};state.zoom=1.12;resize();state.focusUntil=performance.now()+2400;
  if(o.kind!=='impact'&&o.year){state.year=clamp(o.year,1800,2013);$('#yearRange').value=state.year;$('#yearRead').textContent=state.year;updateTimeStatus(true)}
}
function renderInspector(o){
  const impactLabel=state.lang==='ja'?'衝突構造':state.lang==='en'?'IMPACT STRUCTURE':'撞击结构';
  $('#objectType').textContent=o.kind==='impact'?`IMPACT STRUCTURE / ${impactLabel}`:`${o.fall||''} / METEORITE RECORD`;
  $('#objectName').textContent=o.name;
  const L=state.lang==='ja'?{location:'場所',coordinates:'座標',diameter:'直径',age:'年代',source:'出典',type:'記録タイプ',year:'年代',mass:'質量',class:'分類',family:'系統'}:state.lang==='en'?{location:'LOCATION',coordinates:'COORDINATES',diameter:'DIAMETER',age:'AGE',source:'SOURCE',type:'RECORD TYPE',year:'YEAR',mass:'MASS',class:'CLASS',family:'FAMILY'}:{location:'地点',coordinates:'坐标',diameter:'直径',age:'年龄',source:'来源',type:'记录类型',year:'年份',mass:'质量',class:'分类',family:'大类'};
  const rows=o.kind==='impact'?
  [[L.location,o.location||'—'],[L.coordinates,`${o.lat.toFixed(2)}°, ${o.lon.toFixed(2)}°`],[L.diameter,o.diameter||'—'],[L.age,o.age||'—'],[L.source,'Earth Impact Database / source-chart selection']]:
  [[L.type,o.fall||'—'],[L.year,o.year||'—'],[L.location,`${o.lat.toFixed(3)}°, ${o.lon.toFixed(3)}°`],[L.mass,readableMass(o.mass)],[L.class,o.recclass||'—'],[L.family,o.family||'—'],[L.source,'NASA Meteorite Landings / Meteoritical Society']];
  $('#objectMeta').innerHTML=rows.map(x=>`<div><small>${x[0]}</small><b>${x[1]}</b></div>`).join('');
  $('#sameClassBtn').disabled=o.kind==='impact';$('#samePeriodBtn').disabled=o.kind==='impact'||!o.year;
}
$('#selectedChip').onclick=()=>{if(state.selected){renderInspector(state.selected);openDrawer($('#inspector'))}};
$('#locateBtn').onclick=()=>{
  const o=state.selected;if(!o)return;focusObject(o);
};
$('#sameClassBtn').onclick=()=>{const o=state.selected;if(!o||o.kind==='impact')return;state.cls=o.family;state.periodCenter=null;syncFilterButtons();rebuildFiltered();setView('surface')};
$('#samePeriodBtn').onclick=()=>{const o=state.selected;if(!o||!o.year)return;state.periodCenter=o.year;state.year=Math.min(2013,o.year+10);$('#yearRead').textContent=state.year;$('#yearRange').value=state.year;setView('time');rebuildFiltered()};

// Drawers
const drawers=$$('.drawer');
function closeDrawers(){drawers.forEach(d=>d.classList.remove('open'));$$('.tools button').forEach(b=>b.classList.remove('on'))}
function openDrawer(d,btn=null){closeDrawers();d.classList.add('open');if(btn)btn.classList.add('on')}
$$('[data-close]').forEach(b=>b.onclick=()=>closeDrawers());
const pairs=[['#explainBtn','#explainPanel'],['#filterBtn','#filterPanel'],['#langBtn','#langPanel'],['#sizeBtn','#sizePanel'],['#dataBtn','#dataPanel']];
for(const [bs,ps] of pairs){const b=$(bs),p=$(ps);b.onclick=()=>p.classList.contains('open')?closeDrawers():openDrawer(p,b)}

// Explain/source interactions.
$$('[data-jump]').forEach(b=>b.onclick=()=>{setView(b.dataset.jump);closeDrawers()});
$('#sourceFigure img').onclick=()=>{$('#lightbox').hidden=false};$('#lightboxClose').onclick=()=>{$('#lightbox').hidden=true};
$('#lightbox').onclick=e=>{if(e.target===$('#lightbox'))$('#lightbox').hidden=true};addEventListener('keydown',e=>{if(e.key==='Escape'){$('#lightbox').hidden=true;closeDrawers()}});

// Filters.
function buttonGroup(container,key,val){
  $$(container+' button').forEach(b=>b.classList.toggle('active',b.dataset[key]===String(val)));
}
function syncFilterButtons(){buttonGroup('#fallFilter','fall',state.fall);buttonGroup('#massFilter','mass',state.mass);buttonGroup('#classFilter','class',state.cls)}
$$('#fallFilter button').forEach(b=>b.onclick=()=>{state.fall=b.dataset.fall;state.periodCenter=null;syncFilterButtons();rebuildFiltered()});
$$('#massFilter button').forEach(b=>b.onclick=()=>{state.mass=b.dataset.mass;state.periodCenter=null;syncFilterButtons();rebuildFiltered()});
$$('#classFilter button').forEach(b=>b.onclick=()=>{state.cls=b.dataset.class;state.periodCenter=null;syncFilterButtons();rebuildFiltered()});
$('#filterReset').onclick=()=>{state.fall='all';state.mass='all';state.cls='all';state.periodCenter=null;syncFilterButtons();rebuildFiltered()};

// UI size inherited from 06.4 visual system.
$$('#sizeSet button').forEach(b=>b.onclick=()=>{state.uiSize=b.dataset.size;document.body.dataset.uiSize=state.uiSize;localStorage.setItem('nca-ui-size',state.uiSize);$$('#sizeSet button').forEach(x=>x.classList.toggle('active',x===b));resize()});
$$('#sizeSet button').forEach(b=>b.classList.toggle('active',b.dataset.size===state.uiSize));

// Shared language preference with the approved celestial 06 interface.
$$('#languageSet button').forEach(b=>b.onclick=()=>{state.lang=b.dataset.lang;localStorage.setItem('nca-lang',state.lang);applyLanguage()});

// Timeline.
$('#yearRange').oninput=e=>{state.year=+e.target.value;$('#yearRead').textContent=Math.round(state.year);state.playing=false;$('#playBtn').classList.remove('on');$('#playBtn').textContent='▶';updateTimeStatus(true);if(state.view!=='time')setView('time')};
$('#playBtn').onclick=()=>{if(state.view!=='time')setView('time');if(state.year>=2013){state.year=1800;$('#yearRead').textContent='1800';$('#yearRange').value=1800;updateTimeStatus(true)}state.playing=!state.playing;$('#playBtn').classList.toggle('on',state.playing);$('#playBtn').textContent=state.playing?'Ⅱ':'▶'};
$$('#speedSet button').forEach(b=>b.onclick=()=>{state.speed=+b.dataset.speed;$$('#speedSet button').forEach(x=>x.classList.toggle('active',x===b))});
$('#traceBtn').onclick=()=>{state.trace=!state.trace;$('#traceBtn').classList.toggle('active',state.trace);if(state.trace&&state.view!=='record')setView('record')};
$('#resetBtn').onclick=()=>{state.view='surface';state.morph=0;state.morphTarget=0;state.yaw=-.08;state.pitch=.08;state.zoom=1;state.flatPanX=0;state.flatPanY=0;state.cameraTarget=null;state.year=2013;state.playing=false;state.speed=1;state.trace=false;state.fall='all';state.mass='all';state.cls='all';state.periodCenter=null;state.selected=null;$('#selectedChip').hidden=true;$('#yearRange').value=2013;$('#yearRead').textContent='2013';$('#playBtn').textContent='▶';$('#playBtn').classList.remove('on');$('#traceBtn').classList.remove('active');$$('#speedSet button').forEach(b=>b.classList.toggle('active',b.dataset.speed==='1'));syncFilterButtons();updateTimeStatus(true);setView('surface');resize();closeDrawers()};

// Timeline visually de-emphasized outside TIME but remains usable.
const style=document.createElement('style');style.textContent=`body:not([data-view="time"]) .timeline-axis{opacity:.54}body:not([data-view="time"]) .time-read{opacity:.72}.timeline.emphasis{box-shadow:0 -18px 45px rgba(0,0,0,.22)}.object-actions button:disabled{opacity:.28;cursor:not-allowed}`;document.head.appendChild(style);

applyLanguage();
})();
