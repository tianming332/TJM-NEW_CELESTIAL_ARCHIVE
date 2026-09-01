# TJM-NEW_CELESTIAL_ARCHIVE

新-天象图库是一个围绕陨石建立的三尺度交互视觉档案：从太阳系小天体的轨道与族群，进入地球上的陨石记录和撞击结构，再继续放大到陨石内部的矿物、晶系与透明晶体。

项目把原有信息图与作者制作的 `8晶体.stl` 转换为可交互网页。物质尺度使用 WebGPU 实时呈现八类晶体、色相映射、透光、折射、色散、摄影棚灯光、星空背景和镜面倒影。

## 三个板块

- `cosmic/`：太阳系小天体、轨道、族群、光谱和时间推演。
- `earth/`：全球陨石记录、代表性撞击结构和地球分布。
- `material/`：读取同一个 `8-crystals.stl` 中的八个网格，进行透明晶体和光学视觉实验。

根目录 `index.html` 默认进入天体尺度。三个板块顶部导航可以互相切换。

## 本地预览

WebGPU、JSON 和 STL 读取需要 HTTP 服务，不建议直接双击 HTML。

Windows：双击 `START_LOCAL_PREVIEW.bat`，然后浏览器会打开：

```text
http://127.0.0.1:8782/
```

也可以在仓库目录运行：

```bash
py -m http.server 8782
```

推荐使用支持 WebGPU 的新版 Chrome 或 Edge。无法使用 WebGPU 时，物质尺度会切换到 Canvas 回退渲染。

## 物质板块开发

仓库同时保留了物质尺度的 TypeScript 与 WGSL 源码。已构建文件位于 `material/js/material-vgpu.js`，因此部署静态站点时不要求安装依赖。

```bash
cd material
npm ci
npm run build
npm run check:shader
```

不要提交 `node_modules`、npm 缓存或临时构建缓存；这些路径已经写入 `.gitignore`。

## GitHub 创建与上传

双击：

```text
01_CREATE_GITHUB_REPO_AND_OPEN_DESKTOP.bat
```

脚本会：

1. 在当前目录初始化 Git，并建立 `main` 分支。
2. 添加当前精简版文件并尝试创建首次提交。
3. 如果 GitHub CLI 尚未登录，询问是否启动 GitHub 官方网页登录；登录成功后自动创建名为 `TJM-NEW_CELESTIAL_ARCHIVE` 的私人仓库并推送。
4. 随后打开 GitHub Desktop。
5. 如果 CLI 未登录，则打开 GitHub Desktop 与当前文件夹；在 Desktop 中选择 **Add Local Repository**，再点击 **Publish repository**。

自动创建默认使用私人仓库，避免未经确认公开作品；需要公开时可在 GitHub 仓库设置中修改可见性。

## 数据口径

本项目区分“真实来源数据”“作者视觉编码”和“实时视觉模拟”：

- 天体正式名称与部分轨道/物理字段来自 NASA/JPL Small-Body Database 结构的本地精选种子，不是实时星历服务。
- 地球尺度使用 NASA Open Data 的 Meteorite Landings 历史快照、Meteoritical Bulletin Database 来源体系、Natural Earth 陆地轮廓，以及 Earth Impact Database 的代表性撞击结构。
- 矿物色相来自项目原信息图。每种矿物没有一个固定的可见光波长；页面中的代表波长由海报颜色映射得到。
- 透光率、折射率、色散和代表波长是网页视觉模拟参数，不应作为矿物学实测数据引用。
- `8-crystals.stl` 是本项目唯一的晶体三维几何源，文件内八个空间分组对应八类晶体。

完整说明见 [DATA_SOURCES_AND_CREDITS.md](DATA_SOURCES_AND_CREDITS.md)。

## 开源项目致谢

特别感谢 [Vercel Labs / vgpu](https://github.com/vercel-labs/vgpu)。物质尺度的 WebGPU 渲染管线，以及白光、色散、HDR、高光和粒子视觉研究受到 vgpu 示例与文档启发。vgpu 使用 MIT License，版权归 Vercel, Inc. 所有。

同时感谢 Vite、TypeScript，以及为本项目提供公开科学数据和底图的 NASA/JPL、The Meteoritical Society、Natural Earth、Earth Impact Database 与 USGS。

第三方许可与声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 版权说明

除明确标注的第三方数据、软件和影像外，项目中的原创视觉设计、交互设计、文字、图表整理、三维晶体模型及拍摄/渲染资产，其权利归项目作者所有。本仓库未自动授予对原创资产进行再分发或商业使用的许可。
