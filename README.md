# Trae DS Page Assist

一个基于 React 和 Vite 构建的现代化聊天应用，支持与 AI 模型进行对话交互。

## 项目介绍

这是一个功能丰富的聊天界面应用，允许用户与 DeepSeek 等大型语言模型进行对话。应用支持 Markdown 渲染、代码高亮、暗色/亮色主题切换以及聊天历史记录管理等功能。

## 功能特点

-   💬 实时流式响应的 AI 聊天界面
-   🌓 支持暗色/亮色主题切换
-   📝 支持 Markdown 和代码高亮显示
-   📚 聊天历史记录管理
-   🔄 多模型支持和切换
-   🔒 用户认证系统

## 技术栈

-   **前端框架**: React 18
-   **构建工具**: Vite
-   **路由**: React Router
-   **样式**: Tailwind CSS
-   **UI 组件**: Heroicons
-   **Markdown 渲染**: React Markdown + remark-gfm
-   **代码高亮**: React Syntax Highlighter

## 安装与运行

### 前提条件

-   Node.js (推荐 v18 或更高版本)
-   npm 或 yarn

### 安装步骤

1. 克隆仓库

```bash
git clone <仓库URL>
cd trae-ds-page-assist
```

2. 安装依赖

```bash
npm install
# 或
yarn
```

3. 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

4. 构建生产版本

```bash
npm run build
# 或
yarn build
```

## 项目结构

```
src/
├── App.jsx         # 主应用组件
├── Login.jsx       # 登录页面组件
├── ThemeContext.jsx # 主题上下文管理
├── main.jsx        # 应用入口
├── index.css       # 全局样式
└── assets/         # 静态资源
```

## 后端 API

建议配合 github 项目[trae-ds-go-backend](https://github.com/hust-lzj/trae-ds-go-backend)使用

应用通过 Vite 代理连接到本地后端服务：

-   `/api/stream-chat` - 流式聊天 API
-   `/api/models` - 获取可用模型列表
-   `/api/chat-histories` - 管理聊天历史记录

## 贡献指南

欢迎提交问题和拉取请求。对于重大更改，请先开 issue 讨论您想要更改的内容。

## 许可证

[MIT](LICENSE)

---

## Vite 相关信息

这个项目使用 Vite 作为构建工具，提供了快速的开发体验和高效的构建过程。

目前，两个官方插件可用：

-   [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) 使用[Babel](https://babeljs.io/)实现 Fast Refresh
-   [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) 使用[SWC](https://swc.rs/)实现 Fast Refresh

### ESLint 配置扩展

如果您正在开发生产应用程序，我们建议使用 TypeScript 并启用类型感知的 lint 规则。查看[TS 模板](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts)以在您的项目中集成 TypeScript 和[`typescript-eslint`](https://typescript-eslint.io)。
