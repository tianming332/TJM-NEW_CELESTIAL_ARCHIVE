import { compute, draw, effect, frameLoop, geometry, init, sampler, storage, surface, target, type Gpu } from "vgpu";
import { perspectiveCamera } from "vgpu/scene";
import crystalShader from "./crystal.wgsl";
import spaceShader from "./space.wgsl";
import compositeShader from "./composite.wgsl";
import causticTraceShader from "./caustic-trace.wgsl";
import causticSplatShader from "./caustic-splat.wgsl";
import { parseStlMeshes, type StlMesh } from "./stl";
import { buildMeshBvh, opticalMesh, type MeshBvh } from "./mesh-bvh";
import { fallbackMesh, projectFallbackMesh } from "./fallback-mesh";
import { crystalTypes, type Lang } from "./crystal-types";

type Mineral = {
  name: string;
  cn: string;
  type: number;
  color: string;
  wavelength: number;
  spectralPurity: number;
  transmission: number;
  ior: number;
  dispersion: number;
};


const $ = <T extends Element>(selector: string) => document.querySelector<T>(selector)!;
const $$ = <T extends Element>(selector: string) => [...document.querySelectorAll<T>(selector)];

const names = [
  "HEXAGONAL DIAMOND","CARLSBERGITE","BARRINGERITE","OSBORNITE","BREZINAITE","NININGERITE","HEIDEITE","DAUBREELITE","OLDHAMITE","ROEDDERITE",
  "MAJORITE","TRANQUILLITYITE","RINGWOODITE","MERRIHUEITE","YAGIITE","FARRINGTONITE","PANETHITE","BUCHWALDITE","BRIANITE","STANFIELDITE",
  "ORTHOFERROSILITE","BRONZITE","ENSTATITE","PIGEONITE","TITANOFASSAITE","CLINOENSTATITE","OLIVINE","PRIMITIVE ANORTHITE","BYTOWNITE","ALBITE",
  "ANORTHOCLASE","SPINEL","ILMENITE","SPHALERITE","ANATASE","GRAPHITE","GOETHITE","KAMACITE","A—CRISTOBALITE","QUARTZ",
  "CASSIDYITE","WHITLOCKITE","TROILITE","LAWRENCITE","SCHREIBERSITE","COHENITE","GEHLENITE","MERRILLITE","A—MOISSANITE","REEVESITE",
];
const cnNames = [
  "六方金刚石","卡尔斯伯格石","巴林格石","奥斯本石","布列齐纳石","宁宁格石","海德石","道布雷石","奥尔德姆石","罗德石",
  "大隅石","宁静海石","林伍德石","梅里休石","八木石","法林顿石","帕内石","布赫瓦尔德石","布里安石","斯坦菲尔德石",
  "斜方铁辉石","古铜辉石","顽火辉石","易变辉石","钛法萨石","斜顽辉石","橄榄石","原始钙长石","倍长石","钠长石",
  "歪长石","尖晶石","钛铁矿","闪锌矿","锐钛矿","石墨","针铁矿","铁纹石","α—方石英","石英",
  "卡西迪石","惠特洛克石","陨硫铁","劳伦石","磷铁镍矿","陨碳铁矿","钙铝黄长石","梅里尔石","α—碳硅石","里夫斯石",
];
const typeMap = [1,0,1,0,4,0,4,0,0,1, 0,1,0,1,1,4,4,4,4,4, 5,5,5,5,5,5,5,3,3,3, 6,0,3,0,2,1,4,0,2,1, 3,3,1,3,2,4,0,1,1,3];
const colors = [
  "#777777","#8f55bd","#5e9fd7","#f2c42f","#a56b58","#717171","#e6e6e2","#262626","#aa614b","#8a8a88",
  "#8b56bc","#a94a27","#5597d1","#58b4ba","#aaa9a4","#e1ded9","#f2c334","#dad7d2","#302f2f","#ee5c5e",
  "#174f2a","#616424","#858585","#191919","#164f2d","#8fd21b","#3e7930","#d27480","#a4d72f","#858585",
  "#d9d6d0","#8bd52e","#252525","#f0cf35","#4259b5","#201919","#512112","#2c2723","#ed5859","#8b8b88",
  "#38a84b","#7c7c79","#a5452e","#38a847","#d9d6cf","#d6d3cd","#7b7b79","#e8e5df","#35ae42","#dce838",
];

function wavelengthRgb(nm: number): [number, number, number] {
  let r = 0; let g = 0; let b = 0;
  if (nm < 440) { r = (440 - nm) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = (510 - nm) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = (645 - nm) / 65; }
  else { r = 1; }
  const factor = nm < 420 ? 0.3 + 0.7 * (nm - 380) / 40 : nm > 700 ? 0.3 + 0.7 * (720 - nm) / 20 : 1;
  const gamma = 0.8;
  return [Math.pow(Math.max(0, r * factor), gamma), Math.pow(Math.max(0, g * factor), gamma), Math.pow(Math.max(0, b * factor), gamma)];
}

function representativeSpectrum(hex: string): { wavelength: number; purity: number } {
  const [r,g,b] = hexToRgb(hex);
  const max = Math.max(r,g,b); const min = Math.min(r,g,b);
  const purity = max <= 0.001 ? 0 : (max - min) / max;
  if (purity < 0.12) return { wavelength: 560, purity: 0 };
  const target = [r/max,g/max,b/max];
  let bestNm = 560; let bestDistance = Number.POSITIVE_INFINITY;
  for (let nm = 380; nm <= 720; nm += 1) {
    const wave = wavelengthRgb(nm);
    const waveMax = Math.max(...wave) || 1;
    const distance = wave.reduce((sum,value,index)=>sum + Math.pow(value/waveMax-target[index],2),0);
    if (distance < bestDistance) { bestDistance = distance; bestNm = nm; }
  }
  return { wavelength: bestNm, purity: Math.min(1, Math.max(0, purity)) };
}

const minerals: Mineral[] = names.map((name, i) => {
  const spectrum = representativeSpectrum(colors[i]);
  return {
    name,
    cn: cnNames[i],
    type: typeMap[i],
    color: colors[i],
    wavelength: spectrum.wavelength,
    spectralPurity: spectrum.purity,
    transmission: 0.34 + ((i * 17) % 55) / 100,
    ior: 1.28 + ((i * 13) % 70) / 100,
    dispersion: 0.12 + ((i * 19) % 66) / 100,
  };
});

const copy: Record<Lang, Record<string, string>> = {
  zh: {brand:"新-天象图库",modeSample:"样本",modeComposition:"成分",modeSpectrum:"光谱",modeCrystal:"晶系",modeCompare:"对照",camera:"视角",layers:"图层",explain:"解读",filter:"筛选",language:"语言",size:"尺寸",data:"资料",scale:"观察尺度",cosmic:"宇宙",earth:"地球",material:"物质",headline:"把陨石继续放大<br>直到看见晶体",intro:"颜色、晶系与透光不是装饰，它们共同组成一块陨石的微观档案。",dragHint:"拖动旋转 · 滚轮推进 · 点击外环切换矿物",selected:"当前选中",system:"晶体类别",color:"海报色相",transmission:"透光率",refraction:"折射率",simulationNote:"透光率、折射率及代表波长为网页视觉模拟参数，不作为矿物学测量数据。",pin:"固定到对照",optics:"光学模拟",dispersion:"色散",wavelength:"代表波长",compare:"对照",reset:"复位",cameraLead:"不同视角对应不同的晶面阅读方式。",layersLead:"把海报中的视觉变量拆开，单独阅读。",layerRing:"矿物外环",layerGrid:"晶格坐标",layerLabels:"文字标记",layerOptics:"光学色散",explainLead:"原海报负责看见整体；网页负责进入单个晶体并比较它们。",posterCaption:"陨石成分图 / 原始海报比例 3508 × 4962",explainIconTitle:"外环图标",explainIcon:"每个几何图标代表一种陨石矿物；点击后把对应色相、晶体形态和光学参数送入中央模型。",explainColorTitle:"色相与代表波长",explainColor:"无法为每种矿物指定一个固定可见波长；网页把原稿色相匹配为代表波长和色纯度，用于驱动光束与粒子，不改变矿物身份。",explainCoreTitle:"中央晶体",explainCore:"中央展示直接读取 8晶体.stl，并按模型在文件中的空间位置拆成八个真实网格；透明、折射与色散由网页材质实时计算。",explainBoundaryTitle:"数据边界",explainBoundary:"矿物真实光学特征是随波长变化的完整光谱。本页的透光、折射、色散与代表波长均为视觉模拟，不是矿物学实测数据库。",catalogCaption:"平面晶体图标与英文名称对照",filterLead:"按八类源模型或海报色系缩小外环目录。",showAll:"显示全部 / SHOW ALL",sizeLead:"只改变界面信息，不缩放中央晶体。",dataLead:"唯一三维模型源为 8晶体.stl；网页将其中八个空间分组对应到海报的八类晶体。"},
  ja: {brand:"新・天象図庫",modeSample:"標本",modeComposition:"成分",modeSpectrum:"スペクトル",modeCrystal:"晶系",modeCompare:"比較",camera:"視角",layers:"レイヤー",explain:"解説",filter:"選別",language:"言語",size:"サイズ",data:"資料",scale:"観測スケール",cosmic:"宇宙",earth:"地球",material:"物質",headline:"隕石をさらに拡大し<br>結晶まで観察する",intro:"色、晶系、透過性は装飾ではなく、隕石の微視的アーカイブを構成します。",dragHint:"ドラッグで回転 · ホイールで接近 · 外周から鉱物を選択",selected:"選択中",system:"結晶形状",color:"ポスター色",transmission:"透過率",refraction:"屈折率",simulationNote:"透過率と屈折率は視覚シミュレーション用で、鉱物学的な実測値ではありません。",pin:"比較に固定",optics:"光学シミュレーション",dispersion:"分散",wavelength:"波長",compare:"比較",reset:"リセット",cameraLead:"視点ごとに異なる結晶面の読み方を示します。",layersLead:"ポスターの視覚変数を分解して個別に読みます。",layerRing:"鉱物リング",layerGrid:"結晶格子",layerLabels:"ラベル",layerOptics:"光学分散",explainLead:"原ポスターは全体を見せ、ウェブは個別の結晶と比較へ入ります。",posterCaption:"隕石成分図 / 原ポスター比率 3508 × 4962",explainIconTitle:"外周アイコン",explainIcon:"各アイコンは隕石鉱物を表し、選択すると色、形状、光学パラメータが中央モデルへ反映されます。",explainColorTitle:"連続色環",explainColor:"色相は原稿の分類変数です。波長操作は照明応答を変えますが、鉱物の同一性は変えません。",explainCoreTitle:"中央結晶",explainCore:"中央表示は 8晶体.stl を直接読み込み、ファイル内の位置から8つの実メッシュへ分割します。透過・屈折・分散はウェブでリアルタイム計算します。",explainBoundaryTitle:"データ境界",explainBoundary:"透過・屈折・分散は視覚シミュレーションであり、鉱物学的な実測データではありません。",catalogCaption:"平面結晶アイコンと英語名の対応",filterLead:"8つの形状またはポスター色から外周を絞り込みます。",showAll:"すべて表示 / SHOW ALL",sizeLead:"中央結晶を変えず、UI情報だけを拡大します。",dataLead:"唯一の3Dモデルソースは 8晶体.stl。内部の8グループをポスターの8結晶形に対応させます。"},
  en: {brand:"NEW CELESTIAL ARCHIVE",modeSample:"Sample",modeComposition:"Composition",modeSpectrum:"Spectrum",modeCrystal:"Crystal",modeCompare:"Compare",camera:"Camera",layers:"Layers",explain:"Explain",filter:"Filter",language:"Language",size:"UI Size",data:"Data",scale:"Observation Scale",cosmic:"Cosmic",earth:"Earth",material:"Material",headline:"Magnify the meteorite<br>until crystals appear",intro:"Color, crystal form and transmission are not decoration; together they form a microscopic material archive.",dragHint:"Drag to rotate · Wheel to move · Select a mineral on the ring",selected:"Selected",system:"Crystal form",color:"Poster color",transmission:"Transmission",refraction:"Refraction",simulationNote:"Transmission and refraction are visual simulation parameters, not mineralogical measurements.",pin:"Pin to compare",optics:"Optical simulation",dispersion:"Dispersion",wavelength:"Wavelength",compare:"Compare",reset:"Reset",cameraLead:"Each camera preset reveals a different way to read the crystal facets.",layersLead:"Separate the poster's visual variables and read them independently.",layerRing:"Mineral ring",layerGrid:"Lattice grid",layerLabels:"Labels",layerOptics:"Optical dispersion",explainLead:"The poster shows the whole; the web page enters and compares individual crystals.",posterCaption:"Meteorite composition / original poster ratio 3508 × 4962",explainIconTitle:"Outer icons",explainIcon:"Each geometric icon represents a meteorite mineral. Selecting it sends its hue, form and optical parameters to the central model.",explainColorTitle:"Continuous color ring",explainColor:"Hue is a classification variable from the poster. Wavelength changes lighting response without changing mineral identity.",explainCoreTitle:"Central crystal",explainCore:"The center reads 8晶体.stl directly and separates its eight spatial groups into real meshes. Transmission, refraction and dispersion are rendered live.",explainBoundaryTitle:"Data boundary",explainBoundary:"Transmission, refraction and dispersion are visual simulations, not mineralogical measurements.",catalogCaption:"Flat crystal icons and English-name reference",filterLead:"Filter the outer ring by one of eight source forms.",showAll:"Show all",sizeLead:"Change interface scale without resizing the central crystal.",dataLead:"The only 3D source is 8晶体.stl; its eight spatial groups map to the poster's eight crystal forms."},
};

Object.assign(copy.zh, {
  collapsePanels:"收起两侧",
  layerRays:"射线",
  layerLight:"光源",
  layerGlobal:"全局灯",
  layerPaper:"白纸背景",
  explainCore:"中央展示直接读取 8晶体.stl，并按模型在文件中的空间位置拆成八个真实网格；透明、折射与色散由网页材质实时计算。",
  dataLead:"唯一三维模型源为 8晶体.stl；网页将其中八个空间分组对应到海报的八类晶体。",
  wavelength:"代表波长",
  simulationNote:"透光率、折射率及代表波长为网页视觉模拟参数，不作为矿物学测量数据。",
  explainColorTitle:"色相与代表波长",
  explainColor:"无法为每种矿物指定一个固定可见波长；网页把原稿色相匹配为代表波长和色纯度，用于驱动光束与粒子，不改变矿物身份。",
  explainBoundary:"矿物真实光学特征是随波长变化的完整光谱。本页的透光、折射、色散与代表波长均为视觉模拟，不是矿物学实测数据库。",
});
Object.assign(copy.ja, {
  collapsePanels:"両側を閉じる",
  layerRays:"光線",
  layerLight:"光源",
  layerGlobal:"全体照明",
  layerPaper:"白い紙",
  explainCore:"中央表示は 8晶体.stl を直接読み込み、ファイル内の位置から8つの実メッシュへ分割します。透過・屈折・分散はウェブでリアルタイム計算します。",
  dataLead:"唯一の3Dモデルソースは 8晶体.stl。内部の8グループをポスターの8結晶形に対応させます。",
  wavelength:"代表波長",
  simulationNote:"透過率・屈折率・代表波長は視覚シミュレーション用で、鉱物学的な実測値ではありません。",
  explainColorTitle:"色相と代表波長",
  explainColor:"鉱物ごとに固定された可視波長はありません。原稿色から代表波長と色純度を対応させ、光線と粒子の色を制御します。",
  explainBoundary:"実際の鉱物光学は波長ごとに変化するスペクトルです。本ページの光学値と代表波長は視覚シミュレーションです。",
});
Object.assign(copy.en, {
  collapsePanels:"Collapse sides",
  layerRays:"Rays",
  layerLight:"Light source",
  layerGlobal:"Global light",
  layerPaper:"White paper",
  explainCore:"The center reads 8晶体.stl directly and separates its eight spatial groups into real meshes. Transmission, refraction and dispersion are rendered live.",
  dataLead:"The only 3D source is 8晶体.stl; its eight spatial groups map to the poster's eight crystal forms.",
  wavelength:"Mapped wavelength",
  simulationNote:"Transmission, refraction and mapped wavelength are visual simulation parameters, not mineralogical measurements.",
  explainColorTitle:"Hue and mapped wavelength",
  explainColor:"Minerals do not have one fixed visible wavelength. Poster hue is mapped to a representative wavelength and color purity that drive the beam and particles.",
  explainBoundary:"Real mineral optics are spectra that vary with wavelength. Optical values and mapped wavelength on this page are visual simulations, not measured mineral data.",
});

Object.assign(copy.zh, {layerCaustics:"折射焦散",layerRays:"光谱示意线",qualityTitle:"渲染质量",qualityAuto:"自适应",qualityBalanced:"流畅",qualityHigh:"精细",qualityNote:"真实网格折射 · RGB 色散 · 厚度吸收 · 焦散。自适应模式根据帧率调整分辨率。",retryRenderer:"重试 WebGPU 渲染"});
Object.assign(copy.ja, {layerCaustics:"集光模様",layerRays:"スペクトル図解",qualityTitle:"描画品質",qualityAuto:"自動",qualityBalanced:"軽量",qualityHigh:"高精細",qualityNote:"実メッシュ屈折・RGB分散・厚さによる吸収・集光。自動モードは解像度を調整します。",retryRenderer:"WebGPUを再試行"});
Object.assign(copy.en, {layerCaustics:"Refracted caustics",layerRays:"Spectrum diagram",qualityTitle:"Render quality",qualityAuto:"Adaptive",qualityBalanced:"Balanced",qualityHigh:"Fine",qualityNote:"Mesh refraction · RGB dispersion · thickness absorption · caustics. Adaptive mode adjusts resolution to frame rate.",retryRenderer:"Retry WebGPU renderer"});
Object.assign(copy.zh, {layerStory:"左侧介绍",layerTypeSummary:"当前晶体名称",layerTypeList:"晶体选择列表",rendererFallback:"兼容预览：当前未启用 WebGPU，使用完整简化网格显示晶体；不模拟同等级的折射与焦散。可点击下方按钮重试。",rendererBasic:"兼容预览测试模式。点击下方按钮可尝试启用 WebGPU。",rendererLoadError:"晶体模型未能加载，请检查网络或本地服务后重试。"});
Object.assign(copy.ja, {layerStory:"左側の紹介",layerTypeSummary:"選択中の結晶名",layerTypeList:"結晶の選択リスト",rendererFallback:"互換プレビュー：WebGPUが利用できないため、完全な簡略メッシュを表示しています。同等の屈折・集光は再現しません。下のボタンで再試行できます。",rendererBasic:"互換プレビューのテストモードです。下のボタンでWebGPUを再試行できます。",rendererLoadError:"結晶モデルを読み込めません。接続またはローカルサーバーを確認してください。"});
Object.assign(copy.en, {layerStory:"Left introduction",layerTypeSummary:"Current crystal name",layerTypeList:"Crystal selector",rendererFallback:"Compatibility preview: WebGPU is not active. The complete simplified mesh is shown, without equivalent refraction or caustics. Retry below.",rendererBasic:"Compatibility preview test mode. Retry below to enable WebGPU.",rendererLoadError:"The crystal model could not load. Check the connection or local server and retry."});
Object.assign(copy.zh, {layerInspector:"当前选中卡片"});
Object.assign(copy.ja, {layerInspector:"選択中の標本カード"});
Object.assign(copy.en, {layerInspector:"Selected material card"});

const modeUi: Record<Lang, Record<string, string>> = {
  zh: {sampleTitle:"真实样本",sampleBody:"当前矿物使用对应的 STL 晶体网格，拖动观察晶面，滚轮改变距离。",compositionTitle:"成分关系",compositionBody:"相同晶系的矿物被归为一组；颜色来自原海报的分类色相。",spectrumTitle:"光谱响应",spectrumBody:"波长与色散共同改变穿过晶体的光，不改变矿物名称和类别。",crystalTitle:"八个 STL 网格",crystalBody:"点击下方任一网格，直接切换 8晶体.stl 中对应的空间分组。",compareTitle:"并置比较",compareBody:"左侧为当前选择，右侧为已固定样本；两者使用同一个画外光源。",triangles:"三角面",sameType:"同晶系",source:"模型源",slotA:"当前 A",slotB:"固定 B",loading:"正在解析 STL…"},
  ja: {sampleTitle:"実メッシュ標本",sampleBody:"STLの実形状をドラッグして結晶面を観察し、ホイールで距離を変えます。",compositionTitle:"成分関係",compositionBody:"同じ晶系の鉱物をまとめ、原ポスターの色相で分類します。",spectrumTitle:"スペクトル応答",spectrumBody:"波長と分散が透過光を変えますが、鉱物の同一性は変えません。",crystalTitle:"8つのSTLメッシュ",crystalBody:"8晶体.stl 内の空間グループを選択します。",compareTitle:"並置比較",compareBody:"左は現在、右は固定標本。同じ画面外光源で比較します。",triangles:"三角面",sameType:"同晶系",source:"ソース",slotA:"現在 A",slotB:"固定 B",loading:"STLを解析中…"},
  en: {sampleTitle:"Real mesh sample",sampleBody:"The current mineral uses its STL mesh. Drag to inspect facets; use the wheel to change distance.",compositionTitle:"Composition relation",compositionBody:"Minerals sharing a crystal form are grouped; color comes from the poster taxonomy.",spectrumTitle:"Spectral response",spectrumBody:"Wavelength and dispersion alter transmitted light without changing mineral identity.",crystalTitle:"Eight STL meshes",crystalBody:"Choose one spatial cluster parsed from 8晶体.stl.",compareTitle:"Side-by-side",compareBody:"Current and pinned samples share one offscreen light.",triangles:"Triangles",sameType:"Same form",source:"Source",slotA:"Current A",slotB:"Pinned B",loading:"Parsing STL…"},
};

const modeCaptions: Record<string, Record<Lang, string>> = {
  sample:{zh:"01 SAMPLE / 单体材质观察",ja:"01 SAMPLE / 単体材料観察",en:"01 SAMPLE / SINGLE MATERIAL"},
  composition:{zh:"02 COMPOSITION / 成分关系拆解",ja:"02 COMPOSITION / 成分分解",en:"02 COMPOSITION / MATERIAL RELATIONS"},
  spectrum:{zh:"03 SPECTRUM / 波长与色相响应",ja:"03 SPECTRUM / 波長応答",en:"03 SPECTRUM / WAVELENGTH RESPONSE"},
  crystal:{zh:"04 CRYSTAL / 八类源模型",ja:"04 CRYSTAL / 8つの形状",en:"04 CRYSTAL / EIGHT SOURCE FORMS"},
  compare:{zh:"05 COMPARE / 并置比较",ja:"05 COMPARE / 並置比較",en:"05 COMPARE / SIDE-BY-SIDE"},
};

const canvas = $("#crystalCanvas") as HTMLCanvasElement;
const DEFAULT_MINERAL = 34; // ANATASE · aligns the first view with the approved micro-layout reference.
const state = {
  selected: DEFAULT_MINERAL,
  typeIndex: minerals[DEFAULT_MINERAL].type,
  typeSelection: false,
  color: hexToRgb(minerals[DEFAULT_MINERAL].color),
  transmission: minerals[DEFAULT_MINERAL].transmission,
  ior: minerals[DEFAULT_MINERAL].ior,
  dispersion: minerals[DEFAULT_MINERAL].dispersion,
  wavelength: minerals[DEFAULT_MINERAL].wavelength,
  spectralPurity: minerals[DEFAULT_MINERAL].spectralPurity,
  pointer: [-0.12, 0.16] as [number, number],
  lightPointer: [0, 0] as [number, number],
  zoom: 1,
  autoRotate: 1,
  raysEnabled: 1,
  causticsEnabled: 1,
  opticsEnabled: 1,
  lightVisible: 1,
  globalLight: 0,
  paperBackground: 0,
  focusMode: false,
  modeIndex: 0,
  pinned: 0,
  pinnedSample: { ...minerals[0] },
  quality: "auto" as "auto" | "balanced" | "high",
  lang: ((localStorage.getItem("nca-lang") as Lang) || "zh") as Lang,
  size: localStorage.getItem("nca-ui-size") || "fine",
};

let sendGpu: (values: Record<string, unknown>) => void = () => undefined;
let fallbackFrame = 0;
let toastTimer = 0;
let stlMeshes: StlMesh[] = [];
let fallbackMeshes: StlMesh[] = [];
let rendererGeneration = 0;
let canvasPulseFrame = 0;
let activeGpu: Gpu | undefined;
let fallbackCleanup = () => {};
let meshBvhs: MeshBvh[] = [];
let sceneTime = 0;
let renderScale = 1;
// Explicit QA path; normal visitors always try WebGPU first. Retry clears it.
let basicPreviewRequested = new URLSearchParams(location.search).get("renderer") === "basic";
let rendererNoticeKey = "";
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reducedMotion) state.autoRotate = 0;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [parseInt(clean.slice(0,2),16)/255, parseInt(clean.slice(2,4),16)/255, parseInt(clean.slice(4,6),16)/255];
}

function cssShape(type: number) { return crystalTypes[type].shape; }

function buildTypeControls() {
  const rail = $("#typeRail");
  const filters = $("#filterTypes");
  crystalTypes.forEach((type, index) => {
    const button = document.createElement("button");
    button.className = "type-button";
    button.dataset.type = String(index);
    button.style.setProperty("--type-color", type.color);
    button.style.setProperty("--shape", type.shape);
    button.innerHTML = `<i class="mini-glyph"></i><b>${type.label[state.lang]}</b><small>${String(index+1).padStart(2,"0")} · ${type.code}</small>`;
    button.addEventListener("click", () => selectType(index));
    rail.append(button);

    const filter = document.createElement("button");
    filter.dataset.filterType = String(index);
    filter.innerHTML = `<b>${String(index+1).padStart(2,"0")} ${type.label[state.lang]}</b><small>${type.code}</small>`;
    filter.addEventListener("click", () => applyTypeFilter(index, filter));
    filters.append(filter);
  });
}

function buildMineralRing() {
  const ring = $("#mineralRing");
  minerals.forEach((mineral, index) => {
    const angle = -90 + index * (360 / minerals.length);
    const radians = angle * Math.PI / 180;
    const button = document.createElement("button");
    const labelSide = Math.cos(radians) < -0.15 ? " label-left" : " label-right";
    const labelEdge = Math.sin(radians) < -0.72 ? " label-top" : Math.sin(radians) > 0.72 ? " label-bottom" : "";
    button.className = `mineral-node${index % 4 === 0 ? " major" : ""}${labelSide}${labelEdge}`;
    button.dataset.index = String(index);
    button.dataset.type = String(mineral.type);
    button.dataset.label = `${mineral.name} · ${mineral.cn}`;
    button.title = `${mineral.name} / ${mineral.cn}`;
    button.setAttribute("aria-label", `${mineral.name} / ${mineral.cn}`);
    button.style.setProperty("--x", `${50 + Math.cos(radians) * 50}%`);
    button.style.setProperty("--y", `${50 + Math.sin(radians) * 50}%`);
    button.style.setProperty("--r", `${angle + 90}deg`);
    button.style.setProperty("--node-color", mineral.color);
    button.style.setProperty("--shape", cssShape(mineral.type));
    button.innerHTML = "<i></i>";
    button.addEventListener("click", () => selectMineral(index));
    ring.append(button);
  });
}

function fitMineralRing() {
  const lab = $("#crystalLab") as HTMLElement;
  const ring = $("#mineralRing") as HTMLElement;
  const scale = document.querySelector<HTMLElement>(".ring-scale");
  const header = document.querySelector<HTMLElement>(".topbar");
  const footer = document.querySelector<HTMLElement>(".control-deck");
  if (!scale || !header || !footer) return;
  const labRect = lab.getBoundingClientRect();
  const headerRect = header.getBoundingClientRect();
  const footerRect = footer.getBoundingClientRect();
  const safeTop = Math.max(labRect.top, headerRect.bottom + 30);
  const safeBottom = Math.min(labRect.bottom, footerRect.top - 30);
  const safeHeight = Math.max(260, safeBottom - safeTop);
  const diameter = Math.max(240, Math.min(700, labRect.width - 48, safeHeight - 58));
  const centerY = (safeTop + safeBottom) / 2 - labRect.top;
  [ring, scale].forEach((element) => {
    element.style.width = `${diameter}px`;
    element.style.top = `${centerY}px`;
    element.style.transform = "translate(-50%,-50%)";
  });
}

function pulseCanvasSurface() {
  cancelAnimationFrame(canvasPulseFrame);
  canvas.style.removeProperty("width");
  canvas.style.removeProperty("height");
  canvasPulseFrame = requestAnimationFrame(() => {
    fitMineralRing();
  });
}


function selectType(index: number) {
  const next = minerals.findIndex((mineral) => mineral.type === index);
  if (next >= 0) {
    const mineral = minerals[next];
    state.selected = next;
    // The eight source-form buttons are visual material studies rather than
    // mineral measurements, so keep every form transparent enough to expose
    // its internal facets and studio reflections.
    state.transmission = Math.max(.68, mineral.transmission);
    state.ior = Math.max(1.42, mineral.ior);
    state.dispersion = Math.max(.24, mineral.dispersion);
  } else {
    state.transmission = 0.68;
    state.ior = 1.52;
    state.dispersion = 0.28;
  }
  state.typeSelection = true;
  state.typeIndex = index;
  state.color = hexToRgb(crystalTypes[index].color);
  const spectrum = representativeSpectrum(crystalTypes[index].color);
  state.wavelength = spectrum.wavelength;
  state.spectralPurity = spectrum.purity;
  $$(".mineral-node").forEach((el) => el.classList.remove("active"));
  $$(".type-button").forEach((el) => el.classList.toggle("active", Number((el as HTMLElement).dataset.type) === index));
  updateInspector();
  syncOpticalControls();
  sendMaterialState();
}

function selectMineral(index: number, keepOptics = false) {
  const mineral = minerals[index];
  state.selected = index;
  state.typeSelection = false;
  state.typeIndex = mineral.type;
  state.color = hexToRgb(mineral.color);
  if (!keepOptics) {
    state.transmission = mineral.transmission;
    state.ior = mineral.ior;
    state.dispersion = mineral.dispersion;
    state.wavelength = mineral.wavelength;
    state.spectralPurity = mineral.spectralPurity;
  }
  $$(".mineral-node").forEach((el) => el.classList.toggle("active", Number((el as HTMLElement).dataset.index) === index));
  $$(".type-button").forEach((el) => el.classList.toggle("active", Number((el as HTMLElement).dataset.type) === mineral.type));
  updateInspector();
  syncOpticalControls();
  sendMaterialState();
}

function updateInspector() {
  const mineral = minerals[state.selected];
  const type = crystalTypes[state.typeIndex];
  $("#mineralNumber").textContent = state.typeSelection ? `STL ${String(state.typeIndex+1).padStart(2,"0")} / 08` : `${String(state.selected+1).padStart(2,"0")} / ${minerals.length}`;
  $("#mineralName").textContent = state.typeSelection ? type.code : mineral.name;
  $("#mineralCn").textContent = state.typeSelection ? type.label[state.lang] : state.lang === "en" ? type.code : mineral.cn;
  $("#specSystem").textContent = type.label[state.lang];
  $("#specColor").textContent = (state.typeSelection ? type.color : mineral.color).toUpperCase();
  $("#specTransmission").textContent = `${Math.round(state.transmission*100)}%`;
  $("#specIor").textContent = state.ior.toFixed(2);
  $("#activeTypeName").textContent = type.label[state.lang];
  $("#activeTypeCode").textContent = `${type.code} · STL ${String(state.typeIndex+1).padStart(2,"0")}`;
  updateModeDetail();
}

function updateModeDetail() {
  const panel = document.querySelector<HTMLElement>("#modeDetail");
  if (!panel) return;
  const ui = modeUi[state.lang];
  const mineral = minerals[state.selected];
  const type = crystalTypes[state.typeIndex];
  const mesh = stlMeshes[state.typeIndex];
  const triangles = mesh ? mesh.triangleCount.toLocaleString() : ui.loading;
  const mode = document.body.dataset.mode || "sample";
  if (mode === "composition") {
    const related = minerals.filter((item) => item.type === state.typeIndex);
    const activeColor = state.typeSelection ? type.color : mineral.color;
    panel.innerHTML = `<div class="mode-summary"><small>02 / COMPOSITION</small><b>${ui.compositionTitle}</b><p>${ui.compositionBody}</p></div><div class="mode-kpis"><span><small>${ui.sameType}</small><b>${related.length}</b></span><span><small>POSTER HUE</small><b style="color:${activeColor}">${activeColor.toUpperCase()}</b></span></div><div class="mode-tags">${related.slice(0,7).map((item)=>`<span>${item.name}</span>`).join("") || `<span>SOURCE-ONLY STL FORM</span>`}</div>`;
  } else if (mode === "spectrum") {
    const marker = ((state.wavelength - 380) / 340) * 100;
    panel.innerHTML = `<div class="mode-summary"><small>03 / SPECTRUM</small><b>${ui.spectrumTitle}</b><p>${ui.spectrumBody}</p></div><div class="spectrum-viz"><i style="left:${marker}%"></i></div><div class="mode-kpis"><span><small>POSTER-MAPPED WAVELENGTH</small><b>${Math.round(state.wavelength)} nm</b></span><span><small>COLOR PURITY / DISPERSION</small><b>${Math.round(state.spectralPurity*100)}% · ${state.dispersion.toFixed(2)}</b></span></div>`;
  } else if (mode === "crystal") {
    panel.innerHTML = `<div class="mode-summary"><small>04 / CRYSTAL</small><b>${ui.crystalTitle}</b><p>${ui.crystalBody}</p></div><div class="mode-mesh-grid">${crystalTypes.map((item,index)=>`<button class="${index===state.typeIndex?"active":""}" data-mode-type="${index}" style="--mesh-color:${item.color}" aria-label="STL ${String(index+1).padStart(2,"0")} · ${item.code}"><i style="--shape:${item.shape}"></i><span>${String(index+1).padStart(2,"0")}</span><small>${item.code}<br>${stlMeshes[index]?.triangleCount.toLocaleString() || "—"}</small></button>`).join("")}</div>`;
  } else if (mode === "compare") {
    const pinned = state.pinnedSample;
    panel.innerHTML = `<div class="mode-summary"><small>05 / COMPARE</small><b>${ui.compareTitle}</b><p>${ui.compareBody}</p></div><div class="compare-grid"><div><small>${ui.slotA}</small><b>${state.typeSelection ? type.code : mineral.name}</b><span>${type.code} · ${Math.round(state.transmission*100)}%</span></div><div><small>${ui.slotB}</small><b>${pinned.name}</b><span>${crystalTypes[pinned.type].code} · ${Math.round(pinned.transmission*100)}%</span></div></div>`;
  } else {
    panel.innerHTML = `<div class="mode-summary"><small>01 / SAMPLE</small><b>${ui.sampleTitle}</b><p>${ui.sampleBody}</p></div><div class="mode-kpis"><span><small>${ui.triangles}</small><b>${triangles}</b></span><span><small>${ui.source}</small><b>STL ${String(state.typeIndex+1).padStart(2,"0")}</b></span></div>`;
  }
}

function syncOpticalControls() {
  const transmission = $("#transmissionRange") as HTMLInputElement;
  const ior = $("#iorRange") as HTMLInputElement;
  const dispersion = $("#dispersionRange") as HTMLInputElement;
  const wavelength = $("#wavelengthRange") as HTMLInputElement;
  transmission.value = String(Math.round(state.transmission*100));
  ior.value = String(Math.round(state.ior*100));
  dispersion.value = String(Math.round(state.dispersion*100));
  wavelength.value = String(Math.round(state.wavelength));
  $("#transmissionOut").textContent = `${transmission.value}%`;
  $("#iorOut").textContent = (Number(ior.value)/100).toFixed(2);
  $("#dispersionOut").textContent = (Number(dispersion.value)/100).toFixed(2);
  $("#wavelengthOut").textContent = `${Math.round(state.wavelength)} nm`;
  $("#specTransmission").textContent = `${transmission.value}%`;
  $("#specIor").textContent = (Number(ior.value)/100).toFixed(2);
}

function sendMaterialState() {
  sendGpu({
    typeIndex: state.typeIndex,
    pointer: state.pointer,
    color: state.color,
    transmission: state.transmission,
    ior: state.ior,
    dispersion: state.dispersion,
    wavelength: state.wavelength,
    spectralPurity: state.spectralPurity,
    zoom: state.zoom,
    autoRotate: state.autoRotate,
    raysEnabled: state.raysEnabled,
    modeIndex: state.modeIndex,
  });
}

function applyTypeFilter(type: number, button: Element) {
  const already = button.classList.contains("active");
  $$("#filterTypes button").forEach((el) => el.classList.remove("active"));
  $$(".mineral-node").forEach((el) => el.classList.remove("filtered-out"));
  if (already) return;
  button.classList.add("active");
  $$(".mineral-node").forEach((el) => el.classList.toggle("filtered-out", Number((el as HTMLElement).dataset.type) !== type));
}

function setMode(mode: string) {
  const buttons = $$("#modeNav button");
  const current = buttons.findIndex((button) => (button as HTMLElement).dataset.mode === mode);
  state.modeIndex = Math.max(0,current);
  document.body.dataset.mode = mode;
  buttons.forEach((button) => button.classList.toggle("active", (button as HTMLElement).dataset.mode === mode));
  $("#modeCaption").textContent = modeCaptions[mode][state.lang];
  if (mode === "spectrum") state.dispersion = Math.max(state.dispersion,0.58);
  if (mode === "crystal") state.transmission = Math.max(state.transmission,0.62);
  syncOpticalControls();
  updateModeDetail();
  sendMaterialState();
}

function applyLanguage(lang: Lang) {
  state.lang = lang;
  localStorage.setItem("nca-lang",lang);
  document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
  $$<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n!;
    if (copy[lang][key]) el.innerHTML = copy[lang][key];
  });
  $$("#languageSet button").forEach((button) => button.classList.toggle("active", (button as HTMLElement).dataset.lang === lang));
  $$(".type-button").forEach((button, index) => {
    const label = button.querySelector("b"); if (label) label.textContent = crystalTypes[index].label[lang];
  });
  $$("#filterTypes button").forEach((button, index) => {
    const label = button.querySelector("b"); if (label) label.textContent = `${String(index+1).padStart(2,"0")} ${crystalTypes[index].label[lang]}`;
  });
  const mode = document.body.dataset.mode || "sample";
  $("#modeCaption").textContent = modeCaptions[mode][lang];
  if(state.focusMode) $("#focusToggle [data-i18n='collapsePanels']").textContent=lang==="zh"?"展开两侧":lang==="ja"?"両側を開く":"Expand sides";
  updateInspector();
  updateModeDetail();
  updateRendererNotice();
}

function updateRendererNotice() {
  const notice = $("#rendererNotice") as HTMLElement;
  notice.hidden = !rendererNoticeKey;
  notice.textContent = rendererNoticeKey ? copy[state.lang][rendererNoticeKey] : "";
}

function syncContentLayers() {
  const panels = [
    ["story", "#materialStory"],
    ["type-summary", "#focusToggle"],
    ["type-list", "#typeRail"],
    ["inspector", "#materialInspector"],
  ] as const;
  panels.forEach(([layer, selector]) => {
    const enabled = !document.body.classList.contains(`hide-${layer}`);
    const target = $<HTMLElement>(selector);
    target.inert = !enabled || ((layer === "type-list" || layer === "inspector") && state.focusMode);
    target.setAttribute("aria-hidden", String(target.inert));
  });
  $<HTMLElement>(".stage-copy").classList.toggle("all-content-hidden",
    panels.filter(([layer]) => layer !== "inspector")
      .every(([layer]) => document.body.classList.contains(`hide-${layer}`)));
}

function setFocusMode(enabled: boolean) {
  state.focusMode=enabled;
  document.body.classList.toggle("focus-mode",enabled);
  $("#focusToggle").setAttribute("aria-expanded",String(!enabled));
  $("#focusToggle [data-i18n='collapsePanels']").textContent=enabled
    ? (state.lang==="zh"?"展开两侧":state.lang==="ja"?"両側を開く":"Expand sides")
    : copy[state.lang].collapsePanels;
  syncContentLayers();
  requestAnimationFrame(()=>{fitMineralRing();pulseCanvasSurface();});
}

function bindUi() {
  $$("#modeNav button").forEach((button) => button.addEventListener("click", () => setMode((button as HTMLElement).dataset.mode!)));
  $$(".top-tools button[data-panel]").forEach((button) => button.addEventListener("click", () => toggleDrawer((button as HTMLElement).dataset.panel!)));
  $$<HTMLElement>("[data-close]").forEach((button) => button.addEventListener("click", () => button.closest(".drawer")?.classList.remove("open")));
  $$("#languageSet button").forEach((button) => button.addEventListener("click", () => applyLanguage((button as HTMLElement).dataset.lang as Lang)));
  $$("#sizeSet button").forEach((button) => button.addEventListener("click", () => {
    state.size = (button as HTMLElement).dataset.size!; localStorage.setItem("nca-ui-size",state.size); document.body.dataset.uiSize = state.size;
    $$("#sizeSet button").forEach((el) => el.classList.toggle("active",el === button));
    requestAnimationFrame(fitMineralRing);
  }));
  $$("#cameraPresets button").forEach((button) => button.addEventListener("click", () => {
    const preset = (button as HTMLElement).dataset.camera;
    const camera = preset === "front" ? [0,0,1] : preset === "edge" ? [0.76,-0.18,1.03] : preset === "macro" ? [-0.32,0.24,1.32] : [-0.12,0.16,1];
    state.pointer = [camera[0],camera[1]]; state.zoom = camera[2]; sendMaterialState();
    $$("#cameraPresets button").forEach((el)=>el.classList.toggle("active",el===button));
  }));
  $("#focusToggle").addEventListener("click",()=>{
    setFocusMode(!state.focusMode);
    showToast(state.focusMode?"FOCUS · PANELS COLLAPSED":"PANELS · RESTORED");
  });
  $$("#layerSet button").forEach((button) => {
    button.setAttribute("aria-pressed",String(button.classList.contains("active")));
    button.addEventListener("click", () => {
    button.classList.toggle("active"); const layer = (button as HTMLElement).dataset.layer!;
    button.setAttribute("aria-pressed",String(button.classList.contains("active")));
    document.body.classList.toggle(`hide-${layer}`,!button.classList.contains("active"));
    // Explicitly showing either panel overrides quick-focus, but preserves other layer choices.
    if((layer==="type-list"||layer==="inspector")&&button.classList.contains("active")&&state.focusMode) setFocusMode(false);
    if (["story","type-summary","type-list","inspector"].includes(layer)) syncContentLayers();
    if(layer==="rays") { state.raysEnabled=button.classList.contains("active")?1:0; sendMaterialState(); }
    if(layer==="caustics") { state.causticsEnabled=button.classList.contains("active")?1:0; sendMaterialState(); }
    if(layer==="optics") { state.opticsEnabled=button.classList.contains("active")?1:0; sendMaterialState(); }
    if(layer==="light") { state.lightVisible=button.classList.contains("active")?1:0; sendMaterialState(); }
    if(layer==="global-light") {
      state.globalLight=button.classList.contains("active")?1:0;
      document.body.classList.toggle("global-light",state.globalLight>0);
      sendMaterialState();
    }
    if(layer==="paper") {
      state.paperBackground=button.classList.contains("active")?1:0;
      document.body.classList.toggle("paper-background",state.paperBackground>0);
      sendMaterialState();
    }
    });
  });
  $("#clearFilter").addEventListener("click",()=>{ $$("#filterTypes button").forEach(el=>el.classList.remove("active")); $$(".mineral-node").forEach(el=>el.classList.remove("filtered-out")); });
  $("#playBtn").addEventListener("click",()=>{ state.autoRotate = state.autoRotate > 0 ? 0 : 1; $("#playBtn").classList.toggle("active",state.autoRotate>0); $("#playBtn b").textContent=state.autoRotate>0?"Ⅱ":"▶"; sendMaterialState(); });
  $("#resetBtn").addEventListener("click",()=>{ state.pointer=[-0.12,0.16];state.lightPointer=[0,0];state.zoom=1;selectMineral(DEFAULT_MINERAL);syncOpticalControls();showToast("RESET · ANATASE"); });
  $("#pinBtn").addEventListener("click",()=>{
    state.pinned=state.selected;
    state.pinnedSample={...minerals[state.selected], type:state.typeIndex,
      name:state.typeSelection?crystalTypes[state.typeIndex].code:minerals[state.selected].name,
      color:state.typeSelection?crystalTypes[state.typeIndex].color:minerals[state.selected].color,
      transmission:state.transmission,ior:state.ior,dispersion:state.dispersion,
      wavelength:state.wavelength,spectralPurity:state.spectralPurity};
    showToast(`${state.pinnedSample.name} · PINNED`); setMode("compare");
  });
  $("#compareBtn").addEventListener("click",()=>setMode("compare"));
  $("#modeDetail").addEventListener("click",(event)=>{
    const button=(event.target as Element).closest<HTMLElement>("[data-mode-type]");
    if(button) selectType(Number(button.dataset.modeType));
  });

  const sliderBindings: Array<[string,(value:number)=>void]> = [
    ["#transmissionRange",v=>state.transmission=v/100], ["#iorRange",v=>state.ior=v/100], ["#dispersionRange",v=>state.dispersion=v/100], ["#wavelengthRange",v=>{state.wavelength=v;state.spectralPurity=1}],
  ];
  sliderBindings.forEach(([selector,assign]) => $(selector).addEventListener("input",(event)=>{assign(Number((event.target as HTMLInputElement).value));syncOpticalControls();updateModeDetail();sendMaterialState();}));

  const lab = $("#crystalLab") as HTMLElement;
  let dragging = false; let lastX = 0; let lastY = 0;
  const finishDrag = () => { dragging = false; document.body.classList.remove("crystal-dragging"); lab.classList.remove("is-dragging"); };
  lab.addEventListener("selectstart",(event)=>event.preventDefault());
  lab.addEventListener("pointerdown",(event)=>{if((event.target as Element).closest(".ui,button,input,label,a"))return;event.preventDefault();document.getSelection()?.removeAllRanges();dragging=true;document.body.classList.add("crystal-dragging");lab.classList.add("is-dragging");lastX=event.clientX;lastY=event.clientY;lab.setPointerCapture(event.pointerId)});
  lab.addEventListener("pointermove",(event)=>{
    const bounds=lab.getBoundingClientRect();
    state.lightPointer=[
      Math.max(-1,Math.min(1,((event.clientX-bounds.left)/Math.max(1,bounds.width))*2-1)),
      Math.max(-1,Math.min(1,1-((event.clientY-bounds.top)/Math.max(1,bounds.height))*2)),
    ];
    if(!dragging)return;
    event.preventDefault();
    state.pointer[0]+= (event.clientX-lastX)/360;
    state.pointer[1]+= (event.clientY-lastY)/360;
    state.pointer[1]=Math.max(-0.7,Math.min(0.7,state.pointer[1]));
    lastX=event.clientX;lastY=event.clientY;sendMaterialState();
  });
  lab.addEventListener("pointerup",finishDrag);lab.addEventListener("pointercancel",finishDrag);lab.addEventListener("lostpointercapture",finishDrag);
  lab.addEventListener("wheel",(event)=>{event.preventDefault();state.zoom=Math.max(.72,Math.min(1.42,state.zoom-event.deltaY*.00065));sendMaterialState()},{passive:false});
  const observer = new ResizeObserver(fitMineralRing);
  observer.observe(lab);
  observer.observe($(".topbar"));
  observer.observe($(".control-deck"));
  addEventListener("resize",fitMineralRing);
  $$<HTMLButtonElement>("[data-quality]").forEach(button=>button.addEventListener("click",()=>{
    state.quality=button.dataset.quality as typeof state.quality;
    $$("[data-quality]").forEach(el=>el.classList.toggle("active",el===button));
    void startRenderer();
  }));
  $("#retryRenderer").addEventListener("click",()=>{basicPreviewRequested=false;void startRenderer();});
  document.addEventListener("keydown",(event)=>{if(event.key==="Escape")$$<HTMLElement>(".drawer.open").forEach(el=>el.classList.remove("open"))});
  document.addEventListener("dragstart",(event)=>event.preventDefault());
}

function toggleDrawer(name: string) {
  const drawer = $<HTMLElement>(`[data-drawer="${name}"]`);
  const shouldOpen = !drawer.classList.contains("open");
  $$<HTMLElement>(".drawer.open").forEach((el)=>el.classList.remove("open"));
  $$(".top-tools button").forEach((el)=>el.classList.remove("active"));
  if (shouldOpen) { drawer.classList.add("open"); $<HTMLElement>(`.top-tools button[data-panel="${name}"]`).classList.add("active"); }
}

function showToast(message: string) {
  const toast = $("#toast"); toast.textContent = message; toast.classList.add("visible");
  window.clearTimeout(toastTimer); toastTimer = window.setTimeout(()=>toast.classList.remove("visible"),1800);
}

async function loadStlMeshes(): Promise<StlMesh[]> {
  const response = await fetch("models/8-crystals.stl?v=material-r15-20260928");
  if (!response.ok) throw new Error(`STL ${response.status}`);
  return parseStlMeshes(await response.arrayBuffer());
}

function normalize3(vector:[number,number,number]):[number,number,number] {
  const length=Math.hypot(...vector)||1;
  return [vector[0]/length,vector[1]/length,vector[2]/length];
}

function crystalUniform(timeValue:number, lightDirection:[number,number,number], viewProjection:Float32Array, cameraPosition:[number,number,number], secondary=false) {
  const mineral=secondary?state.pinnedSample:minerals[state.selected];
  const compare=(document.body.dataset.mode||"sample")==="compare";
  return {
    viewProjection,cameraPosition,time:timeValue,lightDirection,
    transmission:secondary?mineral.transmission:state.transmission,
    color:secondary?hexToRgb(mineral.color):state.color,ior:secondary?mineral.ior:state.ior,
    rotation:[state.pointer[0]*2.1+timeValue*.12,state.pointer[1]*1.7+.24],
    dispersion:secondary?mineral.dispersion:state.dispersion,wavelength:secondary?mineral.wavelength:state.wavelength,
    spectralPurity:secondary?mineral.spectralPurity:state.spectralPurity,
    raysEnabled:state.raysEnabled,lightVisible:state.lightVisible,globalLight:state.globalLight,paperBackground:state.paperBackground,
    pointer:state.lightPointer,
    floorY:-1.08,
    causticsEnabled:state.causticsEnabled,opticsEnabled:state.opticsEnabled,
    photonGrid:state.quality==="high"?96:64,maxBounces:state.quality==="high"?6:state.quality==="balanced"?2:4,
    positionOffset:compare?[secondary ? (innerWidth<=700?.47:.72) : -(innerWidth<=700?.47:.72),innerWidth<=700?.18:0]:[0,innerWidth<=700?.18:0],
    scale:innerWidth<=700?(compare?.38:.47):(compare?.58:.70),
    modeIndex:state.modeIndex,
  };
}

async function startRenderer() {
  const generation = ++rendererGeneration;
  cancelAnimationFrame(fallbackFrame);
  fallbackCleanup();
  activeGpu?.dispose();
  activeGpu = undefined;
  canvas.style.visibility = "visible";
  document.body.dataset.render = "loading";
  rendererNoticeKey = "";updateRendererNotice();
  $("#retryRenderer").setAttribute("hidden","");
  $("#renderStatus").textContent = "WEBGPU · BUILDING OPTICAL BVH";
  let gpu: Gpu | undefined;
  try {
    if (!stlMeshes.length) stlMeshes = await loadStlMeshes();
    if (generation !== rendererGeneration) return;
    updateModeDetail();
    if (!fallbackMeshes.length) {
      try {
        const simplified = await Promise.all(stlMeshes.map(mesh => opticalMesh(mesh.vertices)));
        if (generation !== rendererGeneration) return;
        fallbackMeshes = stlMeshes.map((mesh,index) => fallbackMesh(mesh,simplified[index]));
        meshBvhs = simplified.map(vertices => buildMeshBvh(vertices));
      } catch (error) {
        // Preserve the entire source surface even if optional simplification fails.
        fallbackMeshes = stlMeshes;
        throw error;
      }
    }
    if (basicPreviewRequested) { startFallback(generation);return; }
    if (!navigator.gpu) throw new Error("WebGPU unavailable");
    if (!meshBvhs.length) meshBvhs = await Promise.all(stlMeshes.map(async mesh => buildMeshBvh(await opticalMesh(mesh.vertices))));
    if (generation !== rendererGeneration) return;
    gpu = await init({powerPreference:"high-performance"});
    if (generation !== rendererGeneration) { gpu.dispose(); return; }
    activeGpu = gpu;
    const currentGpu = gpu;
    let failed = false;
    const fail = (error: unknown) => {
      if (failed || generation !== rendererGeneration) return;
      failed = true;
      console.warn("Material optical renderer unavailable", error);
      // Do not dispose resources while a render pass is still encoding.
      window.setTimeout(() => {
        if (generation !== rendererGeneration) return;
        currentGpu.dispose();
        activeGpu = undefined;
        startFallback(generation);
      }, 0);
    };
    gpu.onError(fail);
    void gpu.gpu.lost.then(info => { if (!currentGpu.disposed) fail(info.message); });
    const canvasSurface = surface(gpu, canvas, {dpr:[1,1.65],label:"NCA optical surface"});
    renderScale = state.quality === "high" ? 1 : state.quality === "balanced" ? 0.72 : 0.90;
    const opticalSize = (): [number,number] => [
      Math.max(1,Math.round(canvasSurface.size[0]*renderScale)),
      Math.max(1,Math.round(canvasSurface.size[1]*renderScale)),
    ];
    const skyTarget = target(gpu,{size:opticalSize(),format:"rgba16float",label:"NCA HDR environment and caustics"});
    const crystalTarget = target(gpu,{size:opticalSize(),format:"rgba16float",depth:true,msaa:4,label:"NCA refractive STL"});
    const sceneSampler = sampler(gpu,{minFilter:"linear",magFilter:"linear"});
    const sky = effect(gpu,spaceShader,{set:{space:{right:[1,0,0],tanHalfFov:Math.tan(45*Math.PI/360),up:[0,1,0],aspect:canvasSurface.size[0]/canvasSurface.size[1],forward:[0,0,-1],time:0,lightDirection:[-.5,1.5,.8],modeIndex:0,posterColor:state.color,wavelength:state.wavelength,dispersion:state.dispersion,spectralPurity:state.spectralPurity,transmission:state.transmission,raysEnabled:state.raysEnabled,pointer:state.lightPointer,lightVisible:state.lightVisible,paperBackground:state.paperBackground}}});
    const composite = effect(gpu,compositeShader,{set:{skyTexture:skyTarget.color,crystalTexture:crystalTarget.color,sceneSampler}});
    const camera = perspectiveCamera({fov:45,aspect:canvasSurface.size[0]/canvasSurface.size[1],near:.1,far:50,position:[0,0,4.4],target:[0,0,0]});
    const initialLight:[number,number,number]=normalize3([-.5,1.5,.8]);
    const resources = stlMeshes.map((mesh,index)=>{
      const acceleration = meshBvhs[index];
      const bvhNodes=storage(currentGpu,acceleration.nodes.byteLength,"read");
      const bvhTriangles=storage(currentGpu,acceleration.triangles.byteLength,"read");
      bvhNodes.write(acceleration.nodes); bvhTriangles.write(acceleration.triangles);
      const geo=geometry(currentGpu,{buffers:[{data:mesh.vertices,stride:24,attributes:{position:{format:"float32x3",offset:0,location:0},normal:{format:"float32x3",offset:12,location:1}}}],vertexCount:mesh.vertexCount});
      return {bvhNodes,bvhTriangles,geometry:geo};
    });
    // Only the two visible specimens need draw/compute state, not 32 live copies.
    const slots = [false,true].map(secondary=>{
      const index=secondary?state.pinnedSample.type:state.typeIndex;
      const resource=resources[index];
      const uniform=crystalUniform(sceneTime,initialLight,camera.viewProjection,[0,0,4.4],secondary);
      const photons=storage(currentGpu,96*96*3*32,"read-write");
      const tracer=compute(currentGpu,causticTraceShader,{set:{crystal:uniform,photons,bvhNodes:resource.bvhNodes,bvhTriangles:resource.bvhTriangles}});
      const splat=draw(currentGpu,{shader:causticSplatShader,vertices:6,blend:{color:{src:"one",dst:"one"},alpha:{src:"zero",dst:"one"}},depth:false,set:{viewProjection:camera.viewProjection,photons}});
      // Geometry is immutable for a draw, but all types share shader pipelines.
      const draws=resources.map((item,i)=>draw(currentGpu,{shader:crystalShader,geometry:item.geometry,cull:"back",set:{crystal:uniform,bvhNodes:item.bvhNodes,bvhTriangles:item.bvhTriangles},label:`BVH crystal ${secondary?"B":"A"} ${i+1}`}));
      return {tracer,splat,draws};
    });
    const resizeTargets=()=>{skyTarget.resize(opticalSize());crystalTarget.resize(opticalSize());composite.set({skyTexture:skyTarget.color,crystalTexture:crystalTarget.color});};
    let pendingResize=false;
    canvasSurface.onResize(resizeTargets);
    let previous=performance.now(), frames=0, measuredAt=previous, slowWindows=0;
    let fps=0, statusSecond=-1, lastStillState="";
    frameLoop(currentGpu,frame=>{
      if (generation!==rendererGeneration || failed || document.hidden) { previous=performance.now();frame.cancel();return; }
      if(pendingResize){resizeTargets();pendingResize=false;}
      const now=performance.now();
      const delta=Math.min((now-previous)/1000,.06); previous=now;
      if (state.autoRotate===0) {
        const stillState=JSON.stringify([state,canvasSurface.size,renderScale]);
        if(stillState===lastStillState){frame.cancel();return;}
        lastStillState=stillState;
      } else { lastStillState=""; }
      sceneTime+=delta*state.autoRotate;
      const t=sceneTime;
      const sunAngle=t*.085+1.15;
      const lightDirection=normalize3([-.65+Math.cos(sunAngle)*.16+state.lightPointer[0]*.35,1.5+state.lightPointer[1]*.25,.85+Math.sin(sunAngle)*.16]);
      const distance=4.4/Math.max(.72,state.zoom);
      camera.set({aspect:canvasSurface.size[0]/Math.max(1,canvasSurface.size[1]),position:[0,0,distance]});
      const viewProjection=camera.viewProjection;
      sky.set({space:{aspect:canvasSurface.size[0]/Math.max(1,canvasSurface.size[1]),time:t,lightDirection,modeIndex:state.modeIndex,posterColor:state.color,wavelength:state.wavelength,dispersion:state.dispersion*state.opticsEnabled,spectralPurity:state.spectralPurity,transmission:state.transmission,raysEnabled:state.raysEnabled,pointer:state.lightPointer,lightVisible:state.lightVisible,paperBackground:state.paperBackground}});
      const compare=document.body.dataset.mode==="compare";
      const types=[state.typeIndex,state.pinnedSample.type];
      const grid=state.quality==="high"?96:64;
      const caustics=state.causticsEnabled>0&&state.lightVisible>0;
      slots.forEach((slot,i)=>{
        if(i===1&&!compare)return;
        const index=types[i];
        const uniform=crystalUniform(t,lightDirection,viewProjection,[0,0,distance],i===1);
        slot.draws[index].set({crystal:uniform});
        if(caustics){
          slot.tracer.set({crystal:uniform,bvhNodes:resources[index].bvhNodes,bvhTriangles:resources[index].bvhTriangles});
          slot.tracer.dispatch(Math.ceil(grid*grid*3/64));
          slot.splat.set({viewProjection});
        }
      });
      frame.pass({target:skyTarget,clear:[0,0,0,1]},pass=>{
        pass.draw(sky);
        if(caustics){pass.draw(slots[0].splat,{instances:grid*grid*3});if(compare)pass.draw(slots[1].splat,{instances:grid*grid*3});}
      });
      frame.pass({target:crystalTarget,clear:[0,0,0,0],clearDepth:1},pass=>{
        pass.draw(slots[0].draws[types[0]]);
        if(compare)pass.draw(slots[1].draws[types[1]]);
      });
      frame.pass(canvasSurface,composite);
      frames++;
      if(now-measuredAt>1800){
        fps=frames*1000/(now-measuredAt);frames=0;measuredAt=now;
        // Sustained slow frames lower only render resolution, never mesh fidelity.
        slowWindows=fps<28?slowWindows+1:0;
        if(state.quality==="auto"&&slowWindows>=2&&renderScale>.55){renderScale=Math.max(.55,renderScale-.12);pendingResize=true;slowWindows=0;}
      }
      const second=Math.floor(now/1000);
      if(second!==statusSecond){
        statusSecond=second;
        $("#sunStatus").textContent=`LIGHT ${String(Math.round(sunAngle*180/Math.PI)%360).padStart(3,"0")}° · ${state.lightVisible?"KEY ON":"KEY OFF"}${state.globalLight?" + FILL":""}`;
        $("#renderStatus").textContent=`WEBGPU · BVH / RGB · ${state.quality.toUpperCase()} ${Math.round(renderScale*100)}%${fps?` · ${Math.round(fps)} FPS`:""}`;
      }
    });
    document.body.dataset.render="webgpu";
    $("#rendererLabel").textContent="WEBGPU · SPECTRAL REFRACTION / CAUSTICS";
    $("#retryRenderer").setAttribute("hidden","");
    rendererNoticeKey = "";updateRendererNotice();
  } catch (error) {
    gpu?.dispose();
    if (generation !== rendererGeneration) return;
    activeGpu=undefined;
    console.warn("WebGPU fallback",error);
    startFallback(generation);
  }
}

function startFallback(generation = rendererGeneration) {
  cancelAnimationFrame(fallbackFrame);
  fallbackCleanup();
  document.body.dataset.render="fallback";
  rendererNoticeKey = !stlMeshes.length ? "rendererLoadError" : basicPreviewRequested ? "rendererBasic" : "rendererFallback";
  updateRendererNotice();
  $("#rendererLabel").textContent="CPU · BASIC STL PREVIEW";
  $("#renderStatus").textContent=stlMeshes.length ? "CPU · BASIC PREVIEW / WEBGPU REQUIRED FOR OPTICS" : "STL LOAD FAILED · RETRY IN CAMERA";
  $("#retryRenderer").removeAttribute("hidden");
  // A canvas cannot switch from a WebGPU context to 2D after GPU initialization.
  const fallbackCanvas=document.createElement("canvas");
  fallbackCanvas.id="fallbackCanvas";
  fallbackCanvas.setAttribute("aria-label","晶体基础预览；完整折射与焦散需要 WebGPU");
  document.body.prepend(fallbackCanvas);
  canvas.style.visibility="hidden";
  const fallbackContext=fallbackCanvas.getContext("2d");
  if (!fallbackContext) return;
  const stars=Array.from({length:620},(_,index)=>({x:(Math.sin(index*91.713)*43758.5453)%1,y:(Math.sin(index*37.217)*17621.923)%1,r:.45+(index%11)/6,a:.16+(index%7)/11,phase:index*.731,speed:.42+(index%9)/11})).map(star=>({...star,x:Math.abs(star.x),y:Math.abs(star.y)}));
  const resize=()=>{const dpr=Math.min(devicePixelRatio||1,1.6);fallbackCanvas.width=innerWidth*dpr;fallbackCanvas.height=innerHeight*dpr;fallbackContext.setTransform(dpr,0,0,dpr,0,0);};
  addEventListener("resize",resize);resize(); sendGpu=()=>undefined;
  fallbackCleanup=()=>{removeEventListener("resize",resize);fallbackCanvas.remove();};
  const drawMesh=(mesh:StlMesh,centerX:number,centerY:number,scale:number,color:[number,number,number],yaw:number,pitch:number,lightX:number,lightY:number)=>{
    const light=normalize3([lightX,-lightY,.8]);
    // Fill every LOD face, rather than punching holes by skipping source faces.
    for (const triangle of projectFallbackMesh(mesh,yaw,pitch)) {
      const facing=Math.abs(triangle.normal[2]);
      const diffuse=Math.max(0,triangle.normal[0]*light[0]+triangle.normal[1]*light[1]+triangle.normal[2]*light[2]);
      const shine=Math.pow(Math.max(0,triangle.normal[0]*.22+triangle.normal[1]*.48+triangle.normal[2]*.85),18);
      const shade=.22+diffuse*.64+state.globalLight*.22;
      const edgeTint=(1-facing)*.06;
      const rgb=color.map(value=>Math.round(Math.min(1,value*shade+shine*.48+edgeTint)*255));
      const points=triangle.points;
      fallbackContext.beginPath();
      fallbackContext.moveTo(centerX+points[0]*scale,centerY+points[1]*scale);
      fallbackContext.lineTo(centerX+points[2]*scale,centerY+points[3]*scale);
      fallbackContext.lineTo(centerX+points[4]*scale,centerY+points[5]*scale);
      fallbackContext.closePath();
      fallbackContext.fillStyle=`rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
      fallbackContext.fill();
      fallbackContext.strokeStyle=fallbackContext.fillStyle;
      fallbackContext.lineWidth=.5;
      fallbackContext.stroke();
    }
  };
  let previous=performance.now(), lastDraw=0, lastStillState="";
  const renderLoop=()=>{
    if (generation !== rendererGeneration) return;
    fallbackFrame=requestAnimationFrame(renderLoop);
    const now=performance.now(),delta=Math.min((now-previous)/1000,.06);previous=now;
    if(document.hidden)return;
    sceneTime+=delta*state.autoRotate;
    if(now-lastDraw<1000/30)return;
    const signature=JSON.stringify([state.typeIndex,state.pointer,state.zoom,state.modeIndex,state.paperBackground,state.globalLight,state.lightPointer,state.raysEnabled,state.lightVisible,state.dispersion,state.pinnedSample,state.color,innerWidth,innerHeight,devicePixelRatio]);
    if(state.autoRotate===0&&signature===lastStillState)return;
    lastStillState=signature;lastDraw=now;
    const w=innerWidth,h=innerHeight,t=sceneTime;
    if(state.paperBackground>0){fallbackContext.fillStyle="#f2eee6";fallbackContext.fillRect(0,0,w,h);fallbackContext.strokeStyle="rgba(82,72,62,.045)";fallbackContext.lineWidth=.55;for(let i=0;i<180;i++){const y=(i*73.17)%h;fallbackContext.beginPath();fallbackContext.moveTo(0,y);fallbackContext.lineTo(w,y+Math.sin(i)*2);fallbackContext.stroke();}}else{fallbackContext.fillStyle="#020305";fallbackContext.fillRect(0,0,w,h);stars.forEach((star)=>{const pulse=.42+.58*(.5+.5*Math.sin(t*star.speed*1.35+star.phase));const alpha=star.a*pulse;fallbackContext.fillStyle=`rgba(238,244,255,${alpha})`;fallbackContext.beginPath();fallbackContext.arc(star.x*w,star.y*h,star.r*(.88+pulse*.20),0,Math.PI*2);fallbackContext.fill();});}
    const sunAngle=t*.085+1.15;
    if(state.raysEnabled>0&&state.lightVisible>0){fallbackContext.save();fallbackContext.globalCompositeOperation=state.paperBackground>0?"source-over":"lighter";const cx=w*.5,cy=h*.49,aimY=cy-state.lightPointer[1]*h*.12,sourceY=cy-h*.08-state.lightPointer[1]*h*.16;const beam=fallbackContext.createLinearGradient(w*1.04,sourceY,cx,aimY);beam.addColorStop(0,"rgba(255,255,255,0)");beam.addColorStop(.62,state.paperBackground>0?"rgba(120,126,136,.28)":"rgba(255,255,255,.34)");beam.addColorStop(1,"rgba(255,255,255,.95)");fallbackContext.strokeStyle=beam;fallbackContext.lineWidth=8;fallbackContext.beginPath();fallbackContext.moveTo(w*1.04,sourceY);fallbackContext.lineTo(cx,aimY);fallbackContext.stroke();const spectrum=["#6f45ff","#3285ff","#36d8e5","#58d86a","#f3df47","#ff8a3a","#ff3f5b"];spectrum.forEach((color,index)=>{fallbackContext.strokeStyle=color;fallbackContext.globalAlpha=.22+state.dispersion*.38;fallbackContext.lineWidth=3.2;fallbackContext.beginPath();fallbackContext.moveTo(cx,aimY);fallbackContext.lineTo(-w*.04,cy+h*.08+state.lightPointer[1]*h*.18+(index-3)*state.dispersion*23);fallbackContext.stroke()});fallbackContext.restore();}
    const compare=(document.body.dataset.mode||"sample")==="compare",baseScale=Math.min(w,h)*.205*state.zoom,yaw=state.pointer[0]*2.1+t*.12,pitch=state.pointer[1]*1.7+.24,lightX=Math.cos(sunAngle),lightY=Math.sin(sunAngle);
    const current=(fallbackMeshes.length?fallbackMeshes:stlMeshes)[state.typeIndex];if(current)drawMesh(current,w*.5+(compare?-baseScale*.72:0),h*.49,baseScale*(compare?.62:1),state.color,yaw,pitch,lightX,lightY);
    const pinned=(fallbackMeshes.length?fallbackMeshes:stlMeshes)[state.pinnedSample.type];if(compare&&pinned)drawMesh(pinned,w*.5+baseScale*.72,h*.49,baseScale*.62,hexToRgb(state.pinnedSample.color),yaw,pitch,lightX,lightY);
    const sun=document.querySelector("#sunStatus");if(sun)sun.textContent=`LIGHT ${String(Math.round((sunAngle*180/Math.PI)%360)).padStart(3,"0")}° · ${state.lightVisible>0?"OFFSCREEN":"SPOT OFF"}${state.globalLight>0?" + GLOBAL":""}`;
  };renderLoop();
}

function recoverCanvasAfterMove() {
  fitMineralRing();
  pulseCanvasSurface();
}

document.addEventListener("visibilitychange",()=>{
  if (!document.hidden) recoverCanvasAfterMove();
});
addEventListener("pageshow",recoverCanvasAfterMove);
addEventListener("focus",recoverCanvasAfterMove);

buildTypeControls();buildMineralRing();bindUi();syncContentLayers();document.body.dataset.uiSize=state.size;applyLanguage(state.lang);selectMineral(DEFAULT_MINERAL);fitMineralRing();void startRenderer();
$("#playBtn").classList.toggle("active",state.autoRotate>0);
$("#playBtn b").textContent=state.autoRotate>0?"Ⅱ":"▶";

addEventListener("beforeunload",()=>{rendererGeneration++;activeGpu?.dispose();fallbackCleanup();cancelAnimationFrame(fallbackFrame);cancelAnimationFrame(canvasPulseFrame)});
