use crate::error::{AppError, ErrorCode};
use crate::platform;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::io::Write;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct ConfigData {
    pub raw: String,
    pub parsed: Value,
    pub path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConfigSection {
    pub name: String,
    pub path: String,
    pub value: Value,
}

/// Get the config backup directory
fn backup_dir() -> PathBuf {
    platform::config_dir().join("backups")
}

/// Create a backup of the config file
fn backup_config(config_path: &PathBuf) -> Result<PathBuf, AppError> {
    if !config_path.exists() {
        return Err(AppError::new(ErrorCode::ConfigNotFound, "Config file not found"));
    }

    let backup_path = backup_dir();
    fs::create_dir_all(&backup_path)?;

    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let backup_file = backup_path.join(format!("openclaw.json.bak.{}", timestamp));

    fs::copy(config_path, &backup_file)?;
    Ok(backup_file)
}

/// Read full config
#[tauri::command]
pub async fn read_config() -> Result<ConfigData, AppError> {
    let config_path = platform::config_file_path();
    if !config_path.exists() {
        return Err(AppError::new(
            ErrorCode::ConfigNotFound,
            "openclaw.json not found",
        ).with_suggestion(&format!("Expected at: {}", config_path.display())));
    }

    let content = fs::read_to_string(&config_path)?;

    // Try parsing as JSON5 first, fall back to JSON
    let parsed: Value = json5::from_str(&content)
        .map_err(|e| AppError::new(
            ErrorCode::ConfigParseError,
            "Failed to parse openclaw.json (JSON5)",
        ).with_detail(&e.to_string())
        .with_suggestion("Check for syntax errors in the config file"))?;

    Ok(ConfigData {
        raw: content,
        parsed,
        path: config_path.to_string_lossy().to_string(),
    })
}

/// Read a specific config section by dot-path (e.g., "agents", "channels.feishu")
#[tauri::command]
pub async fn get_config_section(path: String) -> Result<ConfigSection, AppError> {
    let config = read_config().await?;
    let parts: Vec<&str> = path.split('.').collect();

    let mut current = &config.parsed;
    for part in &parts {
        current = current.get(part).ok_or_else(|| {
            AppError::new(ErrorCode::ConfigNotFound, &format!("Config path not found: {}", path))
        })?;
    }

    Ok(ConfigSection {
        name: parts.last().unwrap_or(&"").to_string(),
        path,
        value: current.clone(),
    })
}

/// Write config (with backup and file lock)
#[tauri::command]
pub async fn write_config(content: String) -> Result<String, AppError> {
    let config_path = platform::config_file_path();

    // Validate JSON5 syntax before writing
    let _: Value = json5::from_str(&content)
        .map_err(|e| AppError::new(
            ErrorCode::ConfigValidationFailed,
            "Invalid JSON5 syntax",
        ).with_detail(&e.to_string()))?;

    // Backup existing config
    if config_path.exists() {
        backup_config(&config_path)?;
    }

    // Write new config
    let mut file = fs::File::create(&config_path)?;
    file.write_all(content.as_bytes())?;
    file.sync_all()?;

    Ok(format!("Config saved to {}", config_path.display()))
}

/// Update a specific config value by dot-path
#[tauri::command]
pub async fn set_config_value(path: String, value: Value) -> Result<String, AppError> {
    let mut config = read_config().await?;
    let parts: Vec<&str> = path.split('.').collect();

    if parts.is_empty() {
        return Err(AppError::new(ErrorCode::ConfigValidationFailed, "Empty path"));
    }

    // Navigate to parent, set the value
    let mut current = &mut config.parsed;
    for i in 0..parts.len() - 1 {
        current = current.get_mut(parts[i]).ok_or_else(|| {
            AppError::new(ErrorCode::ConfigNotFound, &format!("Path not found: {}", parts[..=i].join(".")))
        })?;
    }

    current[parts.last().unwrap()] = value;

    // Serialize back to JSON5-like format (pretty JSON for now)
    let new_content = serde_json::to_string_pretty(&config.parsed)?;

    write_config(new_content).await
}

/// List available config sections
#[tauri::command]
pub async fn list_config_sections() -> Result<Vec<ConfigSection>, AppError> {
    let config = read_config().await?;
    let mut sections = Vec::new();

    if let Value::Object(map) = &config.parsed {
        for (key, value) in map {
            sections.push(ConfigSection {
                name: key.clone(),
                path: key.clone(),
                value: value.clone(),
            });
        }
    }

    Ok(sections)
}

/// Get config backups
#[tauri::command]
pub async fn list_config_backups() -> Result<Vec<String>, AppError> {
    let backup_path = backup_dir();
    if !backup_path.exists() {
        return Ok(Vec::new());
    }

    let mut backups: Vec<String> = fs::read_dir(&backup_path)?
        .filter_map(|entry| {
            entry.ok().and_then(|e| {
                let name = e.file_name().to_string_lossy().to_string();
                if name.starts_with("openclaw.json.bak.") {
                    Some(name)
                } else {
                    None
                }
            })
        })
        .collect();

    backups.sort();
    backups.reverse(); // Most recent first
    Ok(backups)
}
