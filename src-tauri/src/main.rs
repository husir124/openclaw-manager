mod commands;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::system::check_node_version,
            commands::system::check_openclaw_installed,
            commands::system::check_gateway_status,
            commands::config::read_config,
            commands::process::start_gateway,
            commands::process::stop_gateway,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
