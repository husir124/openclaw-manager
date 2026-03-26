use crate::error::AppError;
use crate::platform;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ConfigData {
    pub raw: String,
}

#[tauri::command]
pub async fn read_config() -> Result<ConfigData, AppError> {
    let config_path = platform::config_file_path();
    if !config_path.exists() {
        return Err(AppError::new(
            crate::error::ErrorCode::ConfigNotFound,
            "未找到 openclaw.json 配置文件",
        )
        .with_suggestion(&format!("请检查路径: {}", config_path.display())));
    }

    let content = std::fs::read_to_string(&config_path)?;
    Ok(ConfigData { raw: content })
}
