# 数据来源、数据边界与致谢

核对日期：2026-09-01

## 1. 宇宙尺度

### 小天体数据

- 主要参考：NASA/JPL Small-Body Database（SBDB）及其字段结构。
- 页面运行时读取仓库内的精选本地种子，不会实时请求 JPL。
- 轨道绘制使用半长轴、偏心率、倾角、升交点经度、近地点幅角和平近点角等字段进行视觉化。
- 页面中的时间变化是近似二体推演，不等同于 JPL Horizons 的高精度星历。

来源入口：

- https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html
- https://ssd-api.jpl.nasa.gov/doc/sbdb_query.html
- https://ssd.jpl.nasa.gov/horizons/
- https://cneos.jpl.nasa.gov/about/neo_groups.html

### 深空背景影像

摄影模式引用 NASA、ESA、CSA、STScI 等机构发布的 Webb/Hubble 深空影像。背景只用于视觉氛围，不表示小天体真实处在对应影像区域，也不与太阳系坐标配准。

## 2. 地球尺度

### 陨石记录

- 主数据：NASA Open Data 的 Meteorite Landings 历史快照。
- 上游来源体系：The Meteoritical Society / Meteoritical Bulletin Database。
- 本地数据统计为 45,716 条记录，其中绘制 32,186 条有效经纬度记录。
- 数据快照的年份上限为 2013 年；它描述数据库记录，不代表地球真实坠落频率。
- 缺失坐标和 `(0,0)` 占位坐标不绘制。
- `Fell` 与 `Found` 是记录状态，不应解读为完整事件分类。

来源入口：

- https://data.nasa.gov/dataset/meteorite-landings-api
- https://www.lpi.usra.edu/meteor/

### 撞击结构

- 主要依据：Earth Impact Database。
- 当前界面只展示原始设计图中出现的 8 个代表性结构，不是全球完整撞击结构清单。
- 撞击结构是地质遗迹，不能与陨石回收记录或大气火球事件合并统计。

来源入口：

- https://www.passc.net/EarthImpactDatabase/New%20website_05-2018/Index.html

### 地球轮廓

- Natural Earth `ne_110m_land`。
- 只用于大陆与海岸线几何，不承载陨石属性。
- 数据已经本地化，网页不依赖外部地图瓦片。

来源入口：

- https://www.naturalearthdata.com/downloads/110m-physical-vectors/

## 3. 物质尺度

### 三维几何

- 唯一几何源：`material/models/8-crystals.stl`。
- STL 内八个空间分组对应等轴、六方、四方、三方、单斜、斜方、三斜和正方源模型八类晶体。
- 网页没有使用 OBJ、MTL 或 C4D 文件替换该几何。

### 矿物与光学参数

- 矿物名称、颜色和图形关系来自项目原始信息图。
- USGS Spectral Library 用于理解矿物真实光学信息应以随波长变化的光谱描述，而不是单一固定波长。
- 页面将海报默认色相映射为代表波长和色纯度，用于控制光束、粒子和色散视觉效果。
- 透光率、折射率、色散与代表波长都是交互视觉模拟参数，不是实验测量值。

参考入口：

- https://www.usgs.gov/labs/spectroscopy-lab/usgs-spectral-library

## 4. 开源软件与视觉研究

### Vercel Labs / vgpu

特别感谢 Vercel Labs 开源的 vgpu：

- https://github.com/vercel-labs/vgpu
- https://vgpu.sh/

物质尺度使用 vgpu 建立 WebGPU 渲染管线。白光经过透明体产生色散、HDR 高光、粒子闪烁、空间背景和后处理等视觉方向，参考了 vgpu 的示例与文档，再结合本项目的 STL 模型和界面系统重新设计实现。

vgpu 采用 MIT License：Copyright (c) 2025 Vercel, Inc.

### 其他开发工具

- Vite：https://github.com/vitejs/vite
- TypeScript：https://github.com/microsoft/TypeScript

详细许可见 `THIRD_PARTY_NOTICES.md`，依赖的精确版本见 `material/package-lock.json`。

## 5. 使用边界

1. 不把视觉模拟参数包装为科学测量数据。
2. 不把精选种子或代表性案例描述为完整数据库。
3. 引用网页截图或研究结论时，应同时注明相应数据来源和快照边界。
4. 第三方数据、影像和软件仍遵循各自来源网站及许可条款。
