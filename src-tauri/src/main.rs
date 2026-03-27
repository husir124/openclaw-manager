mod commands;
mod error;
mod platform;
mod migration;

fn main() {
    // 启动时执行配置迁移
    run_startup_migrations();

    tauri::Builder::default()
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// 启动时执行配置迁移
fn run_startup_migrations() {
    let config_path = platform::config_file_path();

    if !config_path.exists() {
        return;
    }

    // 读取配置
    let config_str = match std::fs::read_to_string(&config_path) {
        Ok(s) => s,
        Err(_) => return,
    };

    // 解析 JSON
    let mut config: serde_json::Value = match serde_json::from_str(&config_str) {
        Ok(v) => v,
        Err(_) => return,
    };

    // 执行迁移
    match migration::run_migrations(&mut config) {
        Ok(applied) => {
            if !applied.is_empty() {
                // 写回配置
                if let Ok(new_config) = serde_json::to_string_pretty(&config) {
                    let _ = std::fs::write(&config_path, new_config);
                    println!("Applied {} migration(s):", applied.len());
                    for m in applied {
                        println!("  - {}", m);
                    }
                }
            }
        }
        Err(e) => {
            eprintln!("Migration failed: {}", e);
        }
    }
}
