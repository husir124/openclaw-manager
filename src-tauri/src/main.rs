//! OpenClaw Manager - Tauri 后端入口
//!
//! 本应用为 OpenClaw 提供图形化管理界面，通过 Tauri IPC 桥接
//! 前端 React UI 与系统命令、文件操作、进程管理等功能。
//!
//! 模块说明：
//! - commands: 所有 Tauri 命令（前端通过 invoke() 调用）
//! - error: 统一错误类型 AppError
//! - platform: 跨平台路径和命令封装

mod commands;
mod error;
mod platform;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            // System detection
            commands::system::check_node_version,
            commands::system::check_openclaw_installed,
            commands::system::check_gateway_status,
            commands::system::read_gateway_token,
            // Config management
            commands::config::read_config,
            commands::config::get_config_section,
            commands::config::write_config,
            commands::config::set_config_value,
            commands::config::list_config_sections,
            commands::config::list_config_backups,
            // Process management
            commands::process::start_gateway,
            commands::process::stop_gateway,
            // Health monitoring
            commands::health::run_diagnosis,
            commands::health::fix_issue,
            commands::health::get_logs,
            // Backup & Restore
            commands::backup::create_backup,
            commands::backup::list_backups,
            commands::backup::restore_backup,
            commands::backup::get_backup_progress,
            // Skills
            commands::skills::list_local_skills,
            commands::skills::list_all_agents_skills,
            commands::skills::delete_skill,
            // App Info
            commands::app_info::get_app_info,
            commands::app_info::clear_cache,
            commands::app_info::get_disk_usage,
            commands::app_info::open_releases_page,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
