# Day 2：OpenClaw 检测安装 + 基础设施

> 日期：2026-03-27
> 目标：实现 M1（真实系统检测）+ 错误处理 + 跨平台路径
> 交付物：Setup 页面能真实检测 Node/OpenClaw/Gateway 状态

---

## 任务清单

### Task 2.1：创建统一错误类型（Rust）

**文件**：`src-tauri/src/error.rs`

**要求**：
- 创建 `AppError` 结构体，包含：code（ErrorCode 枚举）、message（中文）、detail（英文，可选）、recoverable（bool）、suggestion（可选）
- ErrorCode 枚举包含：NodeNotFound、NodeVersionTooLow、OpenClawNotInstalled、GatewayNotRunning、GatewayConnectionFailed、ConfigNotFound、ConfigParseError、PermissionDenied、CommandFailed、Unknown
- 实现 `From<String>` 和 `From<std::io::Error>` trait，方便转换
- 修改 main.rs 中 `tauri::generate_handler!` 注册的命令签名，全部改为 `Result<T, AppError>`

### Task 2.2：创建跨平台路径模块（Rust）

**文件**：`src-tauri/src/platform.rs`

**要求**：
- `config_dir() -> PathBuf`：返回 OpenClaw 配置目录（Windows: `~/.openclaw`，macOS/Linux: `~/.openclaw`）
- `npm_global_bin() -> PathBuf`：返回 npm 全局 bin 目录（Windows: `%APPDATA%\npm`，macOS: `/usr/local/bin`，Linux: `/usr/bin`）
- `openclaw_binary_name() -> &'static str`：Windows 返回 `"openclaw.cmd"`，其他返回 `"openclaw"`
- `openclaw_bin_path() -> Option<PathBuf>`：检测 openclaw 可执行文件的完整路径
- 使用 `#[cfg(target_os = "...")]` 条件编译

### Task 2.3：实现真实系统检测命令（Rust）

**文件**：`src-tauri/src/commands/system.rs`

**要求**：
- `check_node_version()`：执行 `node --version`，解析输出，判断是否 >= 22.14
- `check_openclaw_installed()`：执行 `openclaw --version`，解析版本号
- `check_gateway_status()`：检查端口 18789 是否有进程监听（Windows 用 `netstat`，其他用 `lsof`）
- 所有命令使用 `std::process::Command` 执行外部命令
- 命令执行失败时返回 `AppError`，包含清晰的中文错误信息和修复建议
- 超时设置：5 秒

### Task 2.4：创建前端错误类型和处理 Hook

**文件**：
- `src/types/errors.ts` — TypeScript 错误类型定义
- `src/hooks/useErrorHandler.ts` — 统一错误处理 Hook

**要求**：
- `AppError` 接口与 Rust 侧一致
- `useErrorHandler()` 返回一个处理函数，根据 `recoverable` 显示 warning 或 error 通知
- 使用 Ant Design 的 `notification` 组件

### Task 2.5：实现 Setup 页面真实 UI

**文件**：`src/pages/Setup/index.tsx`

**要求**：
- 3 个检测卡片：Node.js / OpenClaw / Gateway
- 每个卡片显示：状态图标（✅/❌）、版本号、描述
- "安装 OpenClaw" 按钮（调用 Tauri 命令）
- "启动 Gateway" 按钮
- 检测完成后显示"下一步"按钮，跳转到 /dashboard
- 使用 Ant Design 的 Card、Steps、Button、Tag、Spin 组件

### Task 2.6：完善 Tauri 命令注册

**文件**：`src-tauri/src/main.rs`

**要求**：
- 注册 error.rs 和 platform.rs 模块
- 确保所有命令使用 `AppError` 作为错误类型
- 补充未注册的命令（start_gateway, stop_gateway）

---

## AI Prompt 模板

```
【项目背景】
我在开发一个名为 OpenClaw Manager 的 Tauri + React 桌面应用，
用于图形化管理 OpenClaw（一个 AI 助手平台）。
技术栈：Tauri 2.x + React 18 + TypeScript + Ant Design + Zustand。
Day 1 已完成脚手架搭建，现在需要实现系统检测功能。

【当前任务】
实现 M1 模块：OpenClaw 检测与安装。

【已有文件】
- src-tauri/src/commands/system.rs（占位命令）
- src-tauri/src/commands/mod.rs（模块导出）
- src-tauri/src/main.rs（Tauri 入口）
- src/pages/Setup/index.tsx（占位页面）
- src/types/openclaw.ts（NodeInfo/OpenClawInfo/GatewayStatus 类型）
- src/services/tauri.ts（Tauri 命令封装）

【需要创建的文件】
1. src-tauri/src/error.rs — 统一错误类型
2. src-tauri/src/platform.rs — 跨平台路径

【需要修改的文件】
1. src-tauri/src/commands/system.rs — 实现真实检测
2. src-tauri/src/commands/mod.rs — 导出新模块
3. src-tauri/src/main.rs — 注册新命令
4. src/pages/Setup/index.tsx — 真实 UI
5. src/types/errors.ts — 新建
6. src/hooks/useErrorHandler.ts — 新建
7. src/services/tauri.ts — 补充新命令

【约束与禁忌】
- 不要使用 class 组件
- 不要引入额外的依赖
- 所有 Rust 错误返回 AppError，不要用 String
- 系统命令执行超时 5 秒
- 不要在前端硬编码路径
- Windows 用 netstat 检测端口，macOS/Linux 用 lsof

【验收标准】
1. cargo check 通过
2. TypeScript 编译通过
3. Setup 页面显示 3 个检测卡片
4. 检测结果与实际系统状态一致
5. 点击"安装 OpenClaw"能触发安装流程
```

---

## 验收标准

### 编译
- [ ] `cargo check` 通过
- [ ] `npx tsc --noEmit` 通过
- [ ] `pnpm build` 通过

### 功能
- [ ] Setup 页面显示 3 个检测卡片（Node.js / OpenClaw / Gateway）
- [ ] Node.js 检测显示正确版本号
- [ ] OpenClaw 检测显示正确版本号
- [ ] Gateway 状态检测准确（运行中/未运行）
- [ ] 点击"安装 OpenClaw"按钮能触发安装
- [ ] 点击"启动 Gateway"按钮能触发启动

### 代码质量
- [ ] Rust 中没有 `Result<T, String>`，全部用 `AppError`
- [ ] platform.rs 中没有硬编码路径
- [ ] 错误信息中文可读，包含修复建议

---

*Day 2 任务文档结束*
