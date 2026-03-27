use std::path::PathBuf;
use std::process::Command;

/// OpenClaw 配置目录
pub fn config_dir() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join(".openclaw")
}

/// openclaw.json 配置文件路径
pub fn config_file_path() -> PathBuf {
    config_dir().join("openclaw.json")
}

/// npm 全局 bin 目录
pub fn npm_global_bin() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let appdata = std::env::var("APPDATA").unwrap_or_default();
        PathBuf::from(appdata).join("npm")
    }
    #[cfg(target_os = "macos")]
    {
        PathBuf::from("/usr/local/bin")
    }
    #[cfg(target_os = "linux")]
    {
        PathBuf::from("/usr/bin")
    }
}

/// openclaw 可执行文件名
pub fn openclaw_binary_name() -> &'static str {
    #[cfg(target_os = "windows")]
    {
        "openclaw.cmd"
    }
    #[cfg(not(target_os = "windows"))]
    {
        "openclaw"
    }
}

/// 检测 openclaw 可执行文件的完整路径
pub fn openclaw_bin_path() -> Option<PathBuf> {
    // 先检查 PATH 中是否有
    let cmd_name = if cfg!(target_os = "windows") { "where" } else { "which" };
    let arg = openclaw_binary_name();

    if let Ok(output) = Command::new(cmd_name).arg(arg).output() {
        if output.status.success() {
            let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path_str.is_empty() {
                // Windows 的 where 可能返回多行，取第一行
                let first_line = path_str.lines().next().unwrap_or(&path_str).trim();
                let path = PathBuf::from(first_line);
                if path.exists() {
                    return Some(path);
                }
            }
        }
    }

    // 检查 npm 全局目录
    let npm_path = npm_global_bin().join(openclaw_binary_name());
    if npm_path.exists() {
        return Some(npm_path);
    }

    None
}

/// 执行命令并返回输出（带超时）
pub fn run_command(program: &str, args: &[&str], _timeout_secs: u64) -> Result<String, super::error::AppError> {
    exec_command(program, args)
}

/// 执行命令并返回输出（简洁版本）
pub fn exec_command(program: &str, args: &[&str]) -> Result<String, super::error::AppError> {
    use super::error::{AppError, ErrorCode};

    let mut cmd = Command::new(program);
    cmd.args(args);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let output = cmd
        .output()
        .map_err(|e| {
            AppError::new(
                ErrorCode::CommandFailed,
                &format!("执行命令失败: {} {}", program, args.join(" ")),
            )
            .with_detail(&e.to_string())
        })?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(AppError::new(
            ErrorCode::CommandFailed,
            &format!("命令执行失败: {}", program),
        )
        .with_detail(&stderr))
    }
}

/// 解析版本号（支持 "v24.14.0" 或 "2026.3.24" 格式）
pub fn parse_version(version_str: &str) -> Option<(u32, u32, u32)> {
    let cleaned = version_str.trim().trim_start_matches('v');
    let parts: Vec<&str> = cleaned.split('.').collect();
    if parts.len() >= 2 {
        let major = parts[0].parse().ok()?;
        let minor = parts[1].parse().ok()?;
        let patch = if parts.len() >= 3 { parts[2].parse().ok()? } else { 0 };
        Some((major, minor, patch))
    } else {
        None
    }
}

/// 比较 Node.js 版本是否满足最低要求 (>= 22.14)
pub fn node_version_meets_minimum(version_str: &str) -> bool {
    if let Some((major, minor, _)) = parse_version(version_str) {
        major > 22 || (major == 22 && minor >= 14)
    } else {
        false
    }
}
