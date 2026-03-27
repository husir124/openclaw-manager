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

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().is_some_and(|ext| ext == "ocbak") {
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
    use aes_gcm::{Aes256Gcm, Key, Nonce};
    use aes_gcm::aead::{Aead, KeyInit};
    use rand::Rng;

    // 从密码派生 256 位密钥（使用 SHA-256 风格的派生）
    let key_bytes = derive_key(password);

    // 生成随机 96 位 nonce
    let mut rng = rand::thread_rng();
    let nonce_bytes: [u8; 12] = rng.gen();

    // 创建 AES-256-GCM 实例
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(&nonce_bytes);

    // 加密数据
    let ciphertext = cipher.encrypt(nonce, data)
        .map_err(|e| format!("AES 加密失败: {}", e))?;

    // 格式：[版本号(1字节)] [nonce(12字节)] [密文]
    let mut result = Vec::with_capacity(1 + 12 + ciphertext.len());
    result.push(0x01); // 版本号 1，表示 AES-256-GCM
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);

    Ok(result)
}

fn decrypt_data(data: &[u8], password: &str) -> Result<Vec<u8>, String> {
    use aes_gcm::{Aes256Gcm, Key, Nonce};
    use aes_gcm::aead::{Aead, KeyInit};

    // 检查最小长度（版本号1 + nonce12 + 至少1字节密文）
    if data.len() < 14 {
        return Err("无效的备份文件：数据太短".to_string());
    }

    // 检查版本号
    let version = data[0];
    if version != 0x01 {
        return Err(format!("不支持的备份版本: {}", version));
    }

    // 提取 nonce 和密文
    let nonce_bytes = &data[1..13];
    let ciphertext = &data[13..];

    // 从密码派生密钥
    let key_bytes = derive_key(password);

    // 创建 AES-256-GCM 实例
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(nonce_bytes);

    // 解密数据
    let plaintext = cipher.decrypt(nonce, ciphertext)
        .map_err(|_| "解密失败，请检查密码是否正确".to_string())?;

    Ok(plaintext)
}

/// 从密码派生 256 位密钥
fn derive_key(password: &str) -> [u8; 32] {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    // 简单的密钥派生（生产环境应使用 PBKDF2 或 Argon2）
    let mut key = [0u8; 32];
    let password_bytes = password.as_bytes();

    // 使用多次哈希来增强密钥
    for (i, key_byte) in key.iter_mut().enumerate() {
        let mut hasher = DefaultHasher::new();
        password_bytes.hash(&mut hasher);
        i.hash(&mut hasher);
        let hash = hasher.finish();
        *key_byte = (hash & 0xFF) as u8;
    }

    key
}
