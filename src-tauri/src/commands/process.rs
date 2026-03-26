#[tauri::command]
pub async fn start_gateway() -> Result<String, String> {
    // TODO: 实现真实启动
    Err("Not implemented".to_string())
}

#[tauri::command]
pub async fn stop_gateway() -> Result<String, String> {
    // TODO: 实现真实停止
    Err("Not implemented".to_string())
}
