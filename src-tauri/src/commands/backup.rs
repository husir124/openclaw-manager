#[tauri::command]
pub async fn backup_config() -> Result<String, String> {
    // TODO: 实现真实备份
    Err("Not implemented".to_string())
}

#[tauri::command]
pub async fn restore_config(backup_path: String) -> Result<String, String> {
    // TODO: 实现真实恢复
    Err(format!("Not implemented: {}", backup_path))
}
