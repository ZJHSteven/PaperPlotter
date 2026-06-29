# PaperPlotter

PaperPlotter 是一个面向写字机的纸面排版与 G-code 生成工具。它的目标不是替代完整矢量编辑器，也不是直接控制串口，而是帮助用户把真实纸张照片、纸面坐标、机器坐标和最终落笔路径对齐起来，然后导出可以交给外部 sender 执行的 `.gcode` 文件。

GitHub 仓库描述：

```text
写字机纸面排版与 G-code 生成工具：支持照片标定、机器参考线标定、Z 落笔标定和单线字体路径导出
```

## 当前状态

- 软件侧 MVP 已完成：照片导入、纸张四角标定、机器参考线标定、纸面对象编辑、G-code 导出、G92 归零提示、单点 Z 标定、假字体和基础中文笔画字库均已实现。
- 当前正在进行实机验收：需要在真实写字机和外部 sender 中执行导出的 G-code，确认预览位置、纸张位置、机器输出位置三者稳定对应。
- 本项目第一版不包含串口发送器；用户需要使用已有的 Timesoft、LaserGRBL、UGS 或其他 G-code sender 执行导出文件。

## 主要功能

- 纸张配置：支持 A4、A5、B5、自定义尺寸，以及横向 / 纵向切换。
- 照片标定：导入真实纸张照片，依次点选左上、右上、右下、左下四个纸角，生成校正后的纸面背景。
- 机器方向标定：点选一条与机器 X 轴或 Y 轴平行的参考线，计算纸张坐标到机器坐标的旋转关系。
- 纸面编辑：在毫米坐标纸面上放置测试方框、十字、网格和文本对象，支持对象选择与拖动。
- 单线字体：内置假字体和基础中文笔画字库，可用于验证“你好”“实验报告”等测试文本的单线路径导出。
- G-code 导出：根据纸面路径、机器参数和 Z 标定结果生成 `.gcode` 文件。
- Z 单点标定：通过“点粗找 + 线细调”的方式辅助找到可用落笔高度。
- 机器参数配置：支持工作区、Y 轴方向、Z 轴方向、移动速度、写字速度、抬笔 / 落笔高度和命令模板配置。

## 技术栈

- Vite
- React
- TypeScript
- SVG DOM
- Zustand
- Vitest

## 本地启动

请先确保本机已经安装 Node.js。推荐使用当前 LTS 或更新版本。

```powershell
npm install
npm run dev
```

默认情况下，Vite 会启动本地开发服务器。终端会显示类似下面的地址：

```text
http://localhost:5173/
```

如果需要固定监听地址和端口，可以使用：

```powershell
npm run dev -- --host 127.0.0.1 --port 5173
```

然后在浏览器中打开：

```text
http://127.0.0.1:5173/
```

## 构建与预览

生产构建：

```powershell
npm run build
```

本地预览生产构建结果：

```powershell
npm run preview
```

## 测试与质量检查

类型检查：

```powershell
npm run typecheck
```

单元测试和组件测试：

```powershell
npm run test
```

完整本机验收建议按下面顺序执行：

```powershell
npm run typecheck
npm run test
npm run build
```

## 云端部署

这个项目是标准 Vite 前端项目，构建产物位于 `dist/` 目录。部署到 GitHub Pages、Cloudflare Pages、Vercel 或 Netlify 时，通常使用下面配置：

```text
Install command: npm install
Build command: npm run build
Output directory: dist
```

如果使用 Cloudflare Pages：

1. 在 Cloudflare Pages 中连接 GitHub 仓库。
2. Framework preset 选择 `Vite`。
3. Build command 填写 `npm run build`。
4. Build output directory 填写 `dist`。
5. 保存并部署。

如果使用 GitHub Pages：

1. 先执行 `npm run build` 生成 `dist/`。
2. 使用 GitHub Pages 支持的静态部署方式发布 `dist/`。
3. 如果仓库不是部署在域名根路径，后续可能需要在 `vite.config.ts` 中配置 `base`，让静态资源路径匹配 GitHub Pages 的子路径。

## 实机验收流程

1. 打开本项目页面，确认纸张尺寸与真实纸张一致。
2. 导入真实纸张照片，按顺序点选四个纸角。
3. 在校正后的纸面中点选机器参考线两端，并选择它代表机器 X 轴还是 Y 轴。
4. 手动移动写字机笔头到真实纸张左上角。
5. 在外部 sender 中执行：

```gcode
G92 X0 Y0
```

6. 回到 PaperPlotter，先导出 20mm 方框或十字测试路径。
7. 在外部 sender 中运行导出的 `.gcode` 文件。
8. 观察机器写出的图案是否落在预览对应位置。
9. 使用 Z 单点标定面板生成点粗找和线细调 G-code，选择第一条“连续、清楚、无明显压痕”的候选线。
10. 保存落笔高度后，再导出中文示例或其他文本对象进行复验。

## 注意事项

- 运行导出的 G-code 前，必须先执行 `G92 X0 Y0`，否则机器坐标原点不会对应纸张左上角。
- 本项目默认使用毫米单位，导出的 G-code 会包含 `G21` 和 `G90`。
- 如果机器方向、Y 轴正反、Z 轴正反与预期不一致，请先在机器设置中调整参数，再重新导出。
- Z 标定不是自动调平；它只是帮助用户用肉眼反馈找到当前纸张和笔夹状态下可用的落笔高度。
- 内置中文笔画字库只覆盖 MVP 验收词，后续如果要写更多中文，需要扩展字形数据或接入更完整的 stroke 字库。

## 项目文档

- `计划书.md`：完整 MVP 目标、技术路线和验收定义。
- `PLANS.md`：当前执行计划和阶段状态。
- `PROGRESS.md`：项目状态快照、关键决策和常见坑。
