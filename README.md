# snapPrompt

基于 Vite + pnpm + React + TypeScript + TailwindCSS + shadcn/ui 的多页项目模板，默认适配 GitHub Pages。

## 技术栈

- Vite
- pnpm
- React 19 + TypeScript
- TailwindCSS
- shadcn/ui（配置与示例基础组件）
- React Router（Hash 路由）

## 本地开发

```bash
pnpm install
pnpm dev
```

## 构建与预览

```bash
pnpm build
pnpm preview
```

## 目录说明

```text
src/
  app/
    router.tsx                # Hash 路由配置
  components/
    ui/
      button.tsx              # shadcn 风格基础组件
  features/
    shared/                   # 端无关公共模块
    h5/                       # 移动端页面片段
    pc/                       # 桌面端页面片段
  hooks/
    useIsMobile.ts            # 设备判定 Hook
  lib/
    utils.ts                  # 工具函数
  pages/
    HomePage.tsx
    FeaturesPage.tsx
    AboutPage.tsx
```

## H5/PC 分割策略

- 同一路由，按设备切换渲染（URL 不变）
- 页面层只做组装，具体实现分别放到 `features/h5` 与 `features/pc`
- 公共结构放在 `features/shared`

## GitHub Pages 部署

- Vite `base` 已配置为 `/snapPrompt/`
- 已提供 GitHub Actions 工作流：`.github/workflows/deploy.yml`
- 在仓库设置中启用 Pages，Source 选择 `GitHub Actions`

部署触发条件：推送到 `main` 分支。
