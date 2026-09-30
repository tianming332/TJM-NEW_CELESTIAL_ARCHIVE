export type Lang = "zh" | "ja" | "en";

type CrystalType = {
  id: string;
  code: string;
  label: Record<Lang, string>;
  color: string;
  shape: string;
  source: string;
};

// Array positions stay aligned with the original STL clusters and mineral typeMap.
// Names and model slots retain the approved mapping; colors and 3D geometry stay unchanged.
// Glyphs use only the reference image's outer silhouettes, fitted proportionally
// into a square icon box. Interior transmission-level lines are deliberately omitted.
export const crystalTypes: CrystalType[] = [
  { id: "monoclinic", code: "MONOCLINIC", label: { zh: "单斜晶体", ja: "単斜晶系", en: "Monoclinic" }, color: "#8b60c8", shape: "polygon(51% 0,76% 0,76% 100%,24% 100%)", source: "8晶体.stl · CLUSTER 01" },
  { id: "isometric", code: "ISOMETRIC", label: { zh: "等轴晶体", ja: "等軸晶系", en: "Isometric" }, color: "#52a9d5", shape: "polygon(50% 0,100% 50%,50% 100%,0 50%)", source: "8晶体.stl · CLUSTER 02" },
  { id: "hexagonal", code: "HEXAGONAL", label: { zh: "六方晶体", ja: "六方晶系", en: "Hexagonal" }, color: "#4e6fc7", shape: "polygon(25% 7%,75% 7%,100% 50%,75% 93%,25% 93%,0 50%)", source: "8晶体.stl · CLUSTER 03" },
  { id: "trigonal", code: "TRIGONAL", label: { zh: "三方晶体", ja: "三方晶系", en: "Trigonal" }, color: "#f0c635", shape: "polygon(0 8%,100% 8%,50% 92%)", source: "8晶体.stl · CLUSTER 04" },
  { id: "triclinic", code: "TRICLINIC", label: { zh: "三斜晶体", ja: "三斜晶系", en: "Triclinic" }, color: "#d95b5f", shape: "polygon(77% 0,89% 100%,11% 100%)", source: "8晶体.stl · CLUSTER 05" },
  { id: "tetragonal", code: "TETRAGONAL", label: { zh: "四方晶体", ja: "正方晶系", en: "Tetragonal" }, color: "#47aa51", shape: "polygon(10% 0,90% 0,90% 100%,10% 100%)", source: "8晶体.stl · CLUSTER 06" },
  { id: "square", code: "SQUARE", label: { zh: "正方晶体", ja: "正方結晶", en: "Square" }, color: "#9da43e", shape: "polygon(0 0,100% 0,100% 100%,0 100%)", source: "8晶体.stl · CLUSTER 07" },
  { id: "orthorhombic", code: "ORTHORHOMBIC", label: { zh: "斜方晶体", ja: "斜方晶系", en: "Orthorhombic" }, color: "#a3684f", shape: "polygon(48% 0,96% 0,52% 100%,4% 100%)", source: "8晶体.stl · CLUSTER 08" },
];
