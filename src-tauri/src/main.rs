mod commands;
mod error;
mod platform;

fn main() {
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
