# 方向导数与梯度可视化

这是一个用于数学分析课程大作业的网页演示项目。它通过可交互三维曲面帮助理解显式曲面 `z=f(x,y)`、梯度、单位方向向量和方向导数之间的关系。

## 功能

- 输入显式函数 `z=f(x,y)`，支持 `sin`、`cos`、`tan`、`exp`、`log`、`sqrt`、`abs`、`pi`、`e` 等常见数学语法。
- 在三维坐标系中绘制函数曲面，支持鼠标拖拽旋转、滚轮缩放、右键平移。
- 输入点 `(x₀,y₀)` 后自动吸附到曲面点 `(x₀,y₀,f(x₀,y₀))`。
- 输入二维方向向量 `(vx,vy)`，自动单位化为 `u`，计算并展示 `Dᵤf(P₀)=∇f(P₀)·u`。
- 可视化选定点、方向切向箭头、梯度箭头、方向截线和底面参考直线。
- 提供常见函数预设，便于课堂演示时快速切换图像。
- 提供采样范围、采样精度、高度截断设置，避免函数局部发散导致图像不可读。

## 运行方法

请先确认本机已安装 Node.js。推荐 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

启动后在浏览器打开终端提示的本地地址，通常是：

```text
http://localhost:5173/
```

## 构建与预览

```bash
npm run build
npm run preview
npm run check
```

`npm run build` 会生成生产环境文件到 `dist/`，`npm run preview` 用于本地预览构建结果。`npm run check` 当前等价于生产构建，便于交付前快速验证。

## GitHub Pages 部署

本项目已配置 GitHub Pages 自动部署：

- Vite `base` 已设置为 `/multivariable-func-visualizer/`，对应仓库地址 `https://github.com/Nanny0901/multivariable-func-visualizer`。
- 自动部署 workflow 位于 `.github/workflows/deploy.yml`。
- 推送到 `main` 分支后，GitHub Actions 会执行 `npm ci`、`npm run build`，并将 `dist/` 发布到 GitHub Pages。

首次启用时，需要在 GitHub 仓库页面完成一次设置：

1. 打开仓库 `Settings`。
2. 进入 `Pages`。
3. 在 `Build and deployment` 中将 `Source` 设为 `GitHub Actions`。
4. 推送 `main` 分支后，等待 `Actions` 页面中的 `Deploy to GitHub Pages` 工作流完成。

部署完成后访问：

```text
https://nanny0901.github.io/multivariable-func-visualizer/
```

## 演示验证例子

选择预设函数“抛物面”：

- 函数：`z = x^2 + y^2`
- 点：`(1, 1)`
- 方向：`(1, 0)`
- 梯度：`∇f(1,1) = (2, 2)`
- 单位方向：`u = (1, 0)`
- 方向导数：`Dᵤf = (2,2)·(1,0) = 2`

## 技术栈

- Vue 3 + Vite
- Three.js
- Math.js
