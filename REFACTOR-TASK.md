# OpenClaw Manager - 前端全面重构任务

## 目标
对 openclaw-manager 前端代码进行精益求精的全面重构，提升代码质量、架构合理性和可维护性。

## 重要约束
- **不能破坏现有功能** - 所有页面功能必须正常工作
- **不能改 Rust 后端** - 只改前端 TypeScript/CSS/React 代码
- **必须通过编译** - `npx tsc -b` 零错误
- **必须保留中文界面** - 所有用户可见文本保持中文
- **不能改 package.json 依赖** - 不加不删任何包

---

## 重构任务清单

### 1. 启用 TypeScript 严格模式
**文件**: `tsconfig.app.json`
- 取消注释 `"strict": true`
- 修复所有因此产生的类型错误（整个 src/ 目录）
- 常见问题：
  - `useState` 未指定类型参数
  - 对象属性可能为 `undefined` 未处理
  - `as` 断言不安全，改为类型守卫
  - 函数参数缺少类型注解

### 2. 消除重复类型定义
**问题**: `services/api.ts` 和 `services/tauri.ts` 定义了重复的类型（`GatewayConfig`、`AppConfig` 等）

**方案**:
- 创建 `types/config.ts` - 存放所有配置相关类型（GatewayConfig, AppConfig, GatewayStatus, HealthData, AppLog, OpenClawConfig 等）
- 创建 `types/index.ts` - 统一导出所有类型
- 修改 `services/api.ts` 和 `services/tauri.ts` 都从 `types/` 导入类型
- 删除两个 service 文件中的重复类型定义
- `types/app.ts` 已有类型保留并整合到 types/ 体系

### 3. 统一主题处理系统
**问题**: 主题逻辑散落在 main.tsx、App.tsx、Layout.tsx、各个页面中

**方案**:
- 将 ThemeContext + ThemeProvider 抽取到 `contexts/ThemeContext.tsx`
- main.tsx 只保留 `<Root>` 渲染逻辑
- 创建 `hooks/useThemeStyles.ts` - 封装主题相关样式计算（背景色、卡片色、文字色等），统一用 antd token 而非硬编码颜色
- Layout.tsx 中的 antd ConfigProvider + theme algorithm 应该在 ThemeProvider 中统一管理（已部分实现，但 Layout 中又重复了一层）
- 各页面中重复的 `isDark ? '#xxx' : '#yyy'` 样式逻辑全部替换为 `useThemeStyles()` 或 antd 组件的 style prop

### 4. Layout 组件重构
**文件**: `layouts/MainLayout.tsx`
- 简化当前的 `<Layout><Layout.Sider><Layout.Content>` 结构
- Header 部分：Logo + 品牌名 + 版本号 + 主题切换 + 刷新按钮，用 antd 的 Space/Flex 布局
- 移除内联 style 对象中的硬编码颜色，改用 antd token（`token.colorBgContainer` 等）
- 将 `menuItems` 提取为独立常量或 useMemo

### 5. 页面组件优化
**Dashboard 页面** (`pages/Dashboard.tsx`):
- 消除重复的状态轮询逻辑 - 各 section 独立调 useGatewayStatus()
- 移除 `renderJsonSection` 的递归渲染（用 `<pre><code>` 替代或保留但改善样式）
- Card 主题适配：移除硬编码的 `isDark ? 'rgba(...)' : 'white'`，改用 antd Card 的 `style` 配合 token

**Models 页面** (`pages/Models.tsx`):
- 减少任何（`any`）类型的使用
- 清理从未使用的变量和函数
- `ProviderCard` 组件从页面中抽取到 `components/ProviderCard.tsx`

**Agents 页面** (`pages/Agents.tsx`):
- `AgentEditor` 组件太大，拆分：
  - `components/agent/AgentEditor.tsx` - 主编辑器壳
  - `components/agent/AgentForm.tsx` - 基本信息表单
  - `components/agent/AgentBindings.tsx` - Binding 配置
  - `components/agent/AgentYamlEditor.tsx` - YAML 编辑器

**其他页面** (Status, Health, Logs, Skills, Cron, Sessions, Chat, Config):
- 统一主题处理（移除硬编码颜色）
- 统一 Card 布局方式
- 修复 any 类型
- 移除未使用的 import

### 6. 服务层重构
- `services/api.ts` 和 `services/tauri.ts` 中的 fetch 封装保持不变
- 但统一错误处理类型
- 确保所有 API 返回值有明确的类型定义

### 7. 通用组件增强
- `components/GatewayStatusCard.tsx` - 确保使用 antd token 而非硬编码颜色
- `components/StepsProgress.tsx` - 同上
- 确保所有组件 props 有完整类型定义

### 8. CSS 清理
- `index.css` 中的 CSS 变量保留（这是正确的做法）
- `App.css` 如果有重复/冗余样式则清理

---

## 验证步骤（重构完成后必须执行）
1. `cd C:\Users\lhu56\Projects\openclaw-manager && npx tsc -b` - 零错误
2. `npx vitest run` - 29 个测试全部通过
3. 检查所有页面没有硬编码颜色值（搜索 `isDark ?` 和 `'rgba` 和 `'#` 排除 CSS 文件和 ThemeContext）

## 参考
- 项目路径: `C:\Users\lhu56\Projects\openclaw-manager`
- 前端源码: `src/`
- 后端(不动): `src-tauri/`
