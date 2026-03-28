# OpenClaw Manager 🦞

OpenClaw 的图形化管理桌面应用。无需命令行，完成安装、配置、监控全流程。

> 类似 Docker Desktop 之于 Docker Engine。

## 功能

| 模块 | 说明 |
|------|------|
| Dashboard | 系统概览：Gateway 状态、Agent/渠道数量、快捷操作 |
| Setup | 环境检测：Node.js、OpenClaw、Gateway，一键修复 |
| Models | 模型配置：Provider 管理、模型添加、Agent 模型选择 |
| Channels | 渠道管理：24 个消息渠道的启用和配置 |
| Agents | Agent 管理：4 步创建向导、Agent 列表 |
| Skills | Skill 市场：本地 Skill 浏览和管理 |
| Health | 健康监控：自动诊断、一键修复、日志查看 |
| Backup | 备份恢复：AES-256-GCM 加密备份 |
| Config | 配置编辑：可视化分段编辑 + 原始 JSON |
| Settings | 应用设置：Gateway、安全、主题、自动更新 |

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri 2.x |
| 前端 | React 19 + TypeScript (strict) |
| UI 库 | Ant Design 6 |
| 样式 | Tailwind CSS 4 |
| 状态管理 | React Context + Zustand |
| 后端 | Rust (Tauri commands) |
| 测试 | Vitest |
| 加密 | AES-256-GCM |

## 系统要求

- Windows 10/11（macOS/Linux 计划 v2.0）
- Node.js >= 22.14
- [OpenClaw](https://openclaw.ai) 已安装

## 安装

### 从 Release 安装（推荐）

1. 前往 [Releases](https://github.com/husir124/openclaw-manager/releases) 下载最新版本
2. 运行安装程序
3. 首次打开会自动检测环境

### 从源码构建

```bash
# 前置要求：Node.js, Rust, MSVC Build Tools
git clone https://github.com/husir124/openclaw-manager.git
cd openclaw-manager
pnpm install
pnpm tauri dev        # 开发模式
pnpm tauri build      # 生产构建
```

## 使用

1. 启动应用，首次使用会显示环境检测引导
2. 在 **Models** 页面配置 AI Provider 和模型
3. 在 **Channels** 页面启用消息渠道
4. 在 **Agents** 页面创建和管理 Agent
5. 在 **Health** 页面监控系统状态

## 项目结构

```
openclaw-manager/
├── src-tauri/src/          # Rust 后端
│   ├── main.rs             # Tauri 入口
│   ├── commands/           # Tauri 命令（系统/配置/进程/健康/备份/Skill）
│   ├── error.rs            # 统一错误类型
│   └── platform.rs         # 跨平台路径封装
├── src/                    # React 前端
│   ├── pages/              # 12 个页面组件
│   ├── components/         # 通用组件（ErrorBoundary, OnboardingGuide）
│   ├── services/           # Tauri 命令封装 + Gateway WebSocket
│   ├── layouts/            # 主布局
│   └── contexts/           # 主题/i18n 上下文
├── tests/                  # 单元测试
└── vitest.config.ts        # 测试配置
```

## 开发

```bash
pnpm tauri dev              # 启动开发服务器
pnpm vitest run             # 运行测试
cd src-tauri && cargo clippy # Rust 代码检查
npx tsc --noEmit --strict   # TypeScript 类型检查
```

## 许可证

MIT

## 相关链接

- [OpenClaw](https://openclaw.ai) — OpenClaw 官网
- [OpenClaw Docs](https://docs.openclaw.ai) — 官方文档
- [GitHub](https://github.com/husir124/openclaw-manager) — 本项目
