use crate::error::{AppError, ErrorCode};

#[tauri::command]
pub async fn backup_config() -> Result<String, AppError> {
    // TODO: M10 模块实现
    Err(AppError::new(ErrorCode::Unknown, "备份功能尚未实现"))
}

#[tauri::command]
pub async fn restore_config(backup_path: String) -> Result<String, AppError> {
    // TODO: M10 模块实现
    Err(AppError::new(ErrorCode::Unknown, &format!("恢复功能尚未实现: {}", backup_path)))
}
