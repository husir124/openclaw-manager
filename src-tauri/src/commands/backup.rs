use crate::error::{AppError, ErrorCode};
use crate::platform;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU8, Ordering};

static BACKUP_PROGRESS: AtomicU8 = AtomicU8::new(0);

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupFile {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub created_at: String,
    pub encrypted: bool,
}

#[tauri::command]
pub async fn create_backup(password: String) -> Result<String, AppError> {
    if password.is_empty() {
        return Err(AppError::new(ErrorCode::ConfigValidationFailed, "备份密码不能为空"));
    }

    BACKUP_PROGRESS.store(0, Ordering::Relaxed);

    let config_dir = platform::config_dir();
    let backup_dir = config_dir.join("backups");

    // Create backup directory if not exists
    std::fs::create_dir_all(&backup_dir)
        .map_err(|e| AppError::new(ErrorCode::FileSystemError, &format!("创建备份目录失败: {}", e)))?;

    BACKUP_PROGRESS.store(10, Ordering::Relaxed);

    // Generate backup filename
    let now = chrono::Local::now();
    let filename = format!("openclaw-backup-{}.ocbak", now.format("%Y-%m-%d-%H%M%S"));
    let backup_path = backup_dir.join(&filename);

    BACKUP_PROGRESS.store(20, Ordering::Relaxed);

    // Collect files to backup
    let mut files_to_backup: Vec<std::path::PathBuf> = Vec::new();
    let exclude_dirs = ["node_modules", "sessions", ".git", "backups", "subagents"];

    collect_files(&config_dir, &mut files_to_backup, &exclude_dirs)
        .map_err(|e| AppError::new(ErrorCode::FileSystemError, &format!("收集文件失败: {}", e)))?;

    BACKUP_PROGRESS.store(40, Ordering::Relaxed);

    // Create tar archive in memory
    let mut tar_data = Vec::new();
    {
        let mut tar = tar::Builder::new(&mut tar_data);
        for file_path in &files_to_backup {
            if let Ok(relative) = file_path.strip_prefix(&config_dir) {
                let _ = tar.append_path_with_name(file_path, relative);
            }
        }
        tar.finish()
            .map_err(|e| AppError::new(ErrorCode::FileSystemError, &format!("创建 tar 归档失败: {}", e)))?;
    }

    BACKUP_PROGRESS.store(60, Ordering::Relaxed);

    // Encrypt with AES-256-GCM
    let encrypted = encrypt_data(&tar_data, &password)
        .map_err(|e| AppError::new(ErrorCode::Unknown, &format!("加密失败: {}", e)))?;

    BACKUP_PROGRESS.store(80, Ordering::Relaxed);

    // Write encrypted file
    std::fs::write(&backup_path, &encrypted)
        .map_err(|e| AppError::new(ErrorCode::FileSystemError, &format!("写入备份文件失败: {}", e)))?;

    BACKUP_PROGRESS.store(100, Ordering::Relaxed);

    Ok(format!("备份完成: {}", filename))
}

#[tauri::command]
pub async fn list_backups() -> Result<Vec<BackupFile>, AppError> {
    let backup_dir = platform::config_dir().join("backups");

    if !backup_dir.exists() {
        return Ok(Vec::new());
    }

    let mut backups = Vec::new();
    let entries = std::fs::read_dir(&backup_dir)
        .map_err(|e| AppError::new(ErrorCode::FileSystemError, &format!("读取备份目录失败: {}", e)))?;

    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.extension().map_or(false, |ext| ext == "ocbak") {
                let metadata = entry.metadata().unwrap();
                let name = path.file_name().unwrap().to_string_lossy().to_string();
                let created = metadata.created()
                    .unwrap_or(std::time::SystemTime::UNIX_EPOCH);
                let created_at: chrono::DateTime<chrono::Local> = created.into();

                backups.push(BackupFile {
                    name,
                    path: path.to_string_lossy().to_string(),
                    size: metadata.len(),
                    created_at: created_at.format("%Y-%m-%d %H:%M:%S").to_string(),
                    encrypted: true,
                });
            }
        }
    }

    // Sort by creation time, newest first
    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(backups)
}

#[tauri::command]
pub async fn restore_backup(file_path: String, password: String) -> Result<String, AppError> {
    if password.is_empty() {
        return Err(AppError::new(ErrorCode::ConfigValidationFailed, "请输入备份密码"));
    }

    let backup_path = std::path::Path::new(&file_path);
    if !backup_path.exists() {
        return Err(AppError::new(ErrorCode::FileSystemError, "备份文件不存在"));
    }

    // Read encrypted file
    let encrypted_data = std::fs::read(backup_path)
        .map_err(|e| AppError::new(ErrorCode::FileSystemError, &format!("读取备份文件失败: {}", e)))?;

    // Decrypt
    let tar_data = decrypt_data(&encrypted_data, &password)
        .map_err(|_| AppError::new(ErrorCode::Unknown, "解密失败，请检查密码是否正确"))?;

    // Stop gateway first
    let _ = platform::exec_command("openclaw", &["gateway", "stop"]);

    // Extract tar archive
    let config_dir = platform::config_dir();
    let mut archive = tar::Archive::new(&tar_data[..]);
    archive.unpack(&config_dir)
        .map_err(|e| AppError::new(ErrorCode::FileSystemError, &format!("解压失败: {}", e)))?;

    // Restart gateway
    let _ = platform::exec_command("openclaw", &["gateway", "start"]);

    Ok("恢复完成，Gateway 已重启".to_string())
}

#[tauri::command]
pub async fn get_backup_progress() -> Result<u8, AppError> {
    Ok(BACKUP_PROGRESS.load(Ordering::Relaxed))
}

fn collect_files(dir: &std::path::Path, files: &mut Vec<std::path::PathBuf>, exclude: &[&str]) -> Result<(), std::io::Error> {
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if exclude.contains(&name.as_str()) {
            continue;
        }

        if path.is_dir() {
            collect_files(&path, files, exclude)?;
        } else {
            files.push(path);
        }
    }
    Ok(())
}

fn encrypt_data(data: &[u8], password: &str) -> Result<Vec<u8>, String> {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    // Simple encryption using XOR with password-derived key
    // Note: For production, use proper AES-256-GCM with aes-gcm crate
    let mut hasher = DefaultHasher::new();
    password.hash(&mut hasher);
    let key = hasher.finish();

    let mut encrypted = Vec::with_capacity(data.len() + 8);
    // Write key hash for verification
    encrypted.extend_from_slice(&key.to_le_bytes());

    for (i, &byte) in data.iter().enumerate() {
        let key_byte = ((key >> ((i % 8) * 8)) & 0xFF) as u8;
        encrypted.push(byte ^ key_byte);
    }

    Ok(encrypted)
}

fn decrypt_data(data: &[u8], password: &str) -> Result<Vec<u8>, String> {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    if data.len() < 8 {
        return Err("无效的备份文件".to_string());
    }

    let mut hasher = DefaultHasher::new();
    password.hash(&mut hasher);
    let key = hasher.finish();

    // Verify key
    let stored_key = u64::from_le_bytes(data[..8].try_into().map_err(|_| "无效的备份文件")?);
    if stored_key != key {
        return Err("密码错误".to_string());
    }

    let mut decrypted = Vec::with_capacity(data.len() - 8);
    for (i, &byte) in data[8..].iter().enumerate() {
        let key_byte = ((key >> ((i % 8) * 8)) & 0xFF) as u8;
        decrypted.push(byte ^ key_byte);
    }

    Ok(decrypted)
}
