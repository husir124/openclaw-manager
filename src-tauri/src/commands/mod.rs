//! Tauri 命令模块 - 所有前端 invoke() 调用的入口
//! 命令命名规范：动词_名词，所有命令返回 Result<T, AppError>

pub mod system;   // 系统检测：Node.js、OpenClaw、Gateway 状态
pub mod config;   // 配置读写：openclaw.json 的读取、写入、分段
pub mod process;  // 进程管理：Gateway 启动/停止
pub mod health;   // 健康诊断：系统检查、修复、日志
pub mod backup;   // 备份恢复：加密备份、恢复、进度
pub mod skills;   // Skill 管理：列表、删除
pub mod app_info; // 应用信息：版本、磁盘使用、缓存清理
