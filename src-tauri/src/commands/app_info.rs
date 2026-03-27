use crate::error::AppError;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AppInfo {
    pub version: String,
    pub name: String,
    pub config_dir: String,
    pub logs_dir: String,
    pub backups_dir: String,
}

/// 获取应用信息
#[tauri::command]
pub async fn get_app_info() -> Result<AppInfo, AppError> {
    let config_dir = crate::platform::config_dir();

    Ok(AppInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        name: "OpenClaw Manager".to_string(),
        config_dir: config_dir.to_string_lossy().to_string(),
        logs_dir: config_dir.join("logs").to_string_lossy().to_string(),
        backups_dir: config_dir.join("backups").to_string_lossy().to_string(),
    })
}

/// 清理应用缓存
#[tauri::command]
pub async fn clear_cache() -> Result<String, AppError> {
    let config_dir = crate::platform::config_dir();
    let cache_dirs = ["canvas", "browser", "media"];

    let mut cleared = 0;
    for dir_name in cache_dirs {
        let dir_path = config_dir.join(dir_name);
        if dir_path.exists() {
            if let Ok(entries) = std::fs::read_dir(&dir_path) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() {
                        let _ = std::fs::remove_file(&path);
                        cleared += 1;
                    }
                }
            }
        }
    }

    Ok(format!("已清理 {} 个缓存文件", cleared))
}

/// 获取磁盘使用情况
#[tauri::command]
pub async fn get_disk_usage() -> Result<DiskUsage, AppError> {
    let config_dir = crate::platform::config_dir();

    let total_size = calculate_dir_size(&config_dir).unwrap_or(0);

    // 获取各目录大小
    let logs_size = calculate_dir_size(&config_dir.join("logs")).unwrap_or(0);
    let backups_size = calculate_dir_size(&config_dir.join("backups")).unwrap_or(0);
    let workspace_size = calculate_dir_size(&config_dir.join("workspace")).unwrap_or(0);

    Ok(DiskUsage {
        total_bytes: total_size,
        logs_bytes: logs_size,
        backups_bytes: backups_size,
        workspace_bytes: workspace_size,
        formatted_total: format_bytes(total_size),
        formatted_logs: format_bytes(logs_size),
        formatted_backups: format_bytes(backups_size),
        formatted_workspace: format_bytes(workspace_size),
    })
}

/// 检查更新（预留，打开 GitHub Releases 页面）
#[tauri::command]
pub async fn open_releases_page() -> Result<String, AppError> {
    // 打开浏览器跳转到 GitHub Releases
    Ok("https://github.com/husir124/openclaw-manager/releases".to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiskUsage {
    pub total_bytes: u64,
    pub logs_bytes: u64,
    pub backups_bytes: u64,
    pub workspace_bytes: u64,
    pub formatted_total: String,
    pub formatted_logs: String,
    pub formatted_backups: String,
    pub formatted_workspace: String,
}

fn calculate_dir_size(path: &std::path::Path) -> Option<u64> {
    if !path.exists() {
        return Some(0);
    }

    let mut total = 0u64;
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            if entry_path.is_file() {
                if let Ok(metadata) = entry_path.metadata() {
                    total += metadata.len();
                }
            } else if entry_path.is_dir() {
                total += calculate_dir_size(&entry_path).unwrap_or(0);
            }
        }
    }
    Some(total)
}

fn format_bytes(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.2} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}
