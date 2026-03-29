# 前端重构任务 - 拆分超大页面文件

## 重要：只做代码重组，不改任何功能和 UI 外观

## 目标
将 4 个超大页面文件拆分为合理的组件结构。技术栈保持不变（React 19 + TypeScript + Ant Design 6 + Tailwind CSS 4 + Zustand 5）。

## 当前问题文件
| 文件 | 大小 | 问题 |
|------|------|------|
| src/pages/Models/index.tsx | 35KB | 类型、静态数据、UI 全在一个文件 |
| src/pages/Channels/index.tsx | 24KB | CHANNEL_TYPES 数组巨大，和UI混在一起 |
| src/pages/Skills/index.tsx | 24KB | CLAWHUB_POPULAR_SKILLS 静态数据20条硬编码 |
| src/pages/Agents/index.tsx | 23KB | PLATFORMS 平台配置和向导逻辑混在一起 |

## 重构规则（严格遵守）

### 1. 每个页面的目录结构
```
pages/Models/
  index.tsx          — 主页面（组合子组件，尽量精简）
  types.ts           — 所有 interface/type
  data.ts            — 静态常量数据
  components/        — 子组件目录
    XxxComponent.tsx
```

### 2. 具体拆分方案

#### Models 页面
- types.ts: Provider, ModelInfo, AgentModelConfig 接口定义
- data.ts: BUILTIN_PROVIDERS 常量
- components/ProviderList.tsx: Provider 列表（自定义+内置）
- components/ProviderModal.tsx: Provider 新增/编辑 Modal
- components/ModelTable.tsx: 单个 Provider 下的模型列表表格
- components/AgentModelTab.tsx: Agent 模型配置 Tab
- index.tsx: 主页面，管理 state，组合子组件

#### Channels 页面
- types.ts: ChannelType, ChannelField 接口
- data.ts: CHANNEL_TYPES 数组（这是最大的静态数据块，可能有500+行）
- components/ChannelCard.tsx: 单个渠道卡片
- components/ChannelEditModal.tsx: 渠道配置编辑 Modal
- components/ChannelGroup.tsx: 按分类分组显示
- index.tsx: 主页面

#### Skills 页面
- types.ts: ClawHubSkill 接口, SortBy 类型
- data.ts: CLAWHUB_POPULAR_SKILLS 数组
- components/LocalSkillsTab.tsx: 本地已安装 Skills Tab
- components/ClawHubTab.tsx: ClawHub 市场 Tab
- components/SkillCard.tsx: Skill 卡片组件
- index.tsx: 主页面

#### Agents 页面
- types.ts: PlatformConfig, PlatformField 接口
- data.ts: PLATFORMS 数组
- components/AgentList.tsx: Agent 列表展示
- components/CreateAgentWizard.tsx: 创建向导（Steps 流程）
- index.tsx: 主页面

### 3. 代码风格要求
- 保持原有的注释风格（中文注释）
- 保持原有的 import 方式
- 子组件用 default export
- props 用 interface 定义
- 不要引入新的依赖

### 4. 验证
- 改完后运行 `pnpm tsc --noEmit` 确保 TypeScript 编译通过
- 不需要启动 dev server，只要编译通过就行

### 5. 严禁
- ❌ 修改任何功能逻辑
- ❌ 修改任何 UI 渲染
- ❌ 添加新功能
- ❌ 修改路由、状态管理、服务层代码
- ❌ 修改 package.json 依赖
- ❌ 删除任何现有非页面文件
