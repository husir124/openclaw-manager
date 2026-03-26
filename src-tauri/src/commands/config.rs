use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ConfigData {
    pub raw: String,
}

#[tauri::command]
pub async fn read_config() -> Result<ConfigData, String> {
    // TODO: 实现真实读取
    Err("Not implemented".to_string())
}
