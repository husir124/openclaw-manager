use serde::{Deserialize, Serialize};
use crate::error::AppError;
use crate::platform;

#[derive(Debug, Serialize, Deserialize)]
pub struct DiagnosticItem {
    pub id: String,
    pub name: String,
    pub status: String, // "ok" | "warning" | "error"
    pub message: String,
}

#[tauri::command]
pub async fn run_diagnosis() -> Result<Vec<DiagnosticItem>, AppError> {
    let mut results = Vec::new();

    // Check Node.js
    let node_output = platform::exec_command("node", &["--version"]);
    match node_output {
        Ok(version) => {
            let version = version.trim().to_string();
            let meets_min = version.starts_with("v24") || version.starts_with("v22.14") || version.starts_with("v22.15") || version.starts_with("v22.16");
            results.push(DiagnosticItem {
                id: "node".to_string(),
                name: "Node.js 运行环境".to_string(),
                status: if meets_min { "ok".to_string() } else { "warning".to_string() },
                message: if meets_min {
                    format!("版本 {}，满足要求", version)
                } else {
                    format!("版本 {} 过低，建议升级到 24+", version)
                },
            });
        }
        Err(_) => {
            results.push(DiagnosticItem {
                id: "node".to_string(),
                name: "Node.js 运行环境".to_string(),
                status: "error".to_string(),
                message: "未找到 Node.js".to_string(),
            });
        }
    }

    // Check OpenClaw
    let oc_output = platform::exec_command("openclaw", &["--version"]);
    match oc_output {
        Ok(version) => {
            results.push(DiagnosticItem {
                id: "openclaw".to_string(),
                name: "OpenClaw 平台".to_string(),
                status: "ok".to_string(),
                message: format!("已安装，版本 {}", version.trim()),
            });
        }
        Err(_) => {
            results.push(DiagnosticItem {
                id: "openclaw".to_string(),
                name: "OpenClaw 平台".to_string(),
                status: "error".to_string(),
                message: "未安装 OpenClaw".to_string(),
            });
        }
    }

    // Check Gateway
    let gateway_running = check_gateway_running();
    match gateway_running {
        Ok((running, port, pid)) => {
            results.push(DiagnosticItem {
                id: "gateway".to_string(),
                name: "Gateway 服务".to_string(),
                status: if running { "ok".to_string() } else { "error".to_string() },
                message: if running {
                    format!("运行中，端口 {}，PID {:?}", port, pid)
                } else {
                    "Gateway 未运行".to_string()
                },
            });
        }
        Err(_) => {
            results.push(DiagnosticItem {
                id: "gateway".to_string(),
                name: "Gateway 服务".to_string(),
                status: "error".to_string(),
                message: "无法检测 Gateway 状态".to_string(),
            });
        }
    }

    Ok(results)
}

#[tauri::command]
pub async fn fix_issue(issue_id: String) -> Result<String, AppError> {
    match issue_id.as_str() {
        "gateway" => {
            // Start gateway
            let result = platform::exec_command("openclaw", &["gateway", "start"]);
            match result {
                Ok(output) => Ok(format!("Gateway 启动成功: {}", output.trim())),
                Err(e) => Err(AppError::new(
                    crate::error::ErrorCode::CommandFailed,
                    &format!("启动 Gateway 失败: {}", e),
                )),
            }
        }
        _ => Err(AppError::new(
            crate::error::ErrorCode::Unknown,
            &format!("未知的修复项: {}", issue_id),
        )),
    }
}

#[tauri::command]
pub async fn get_logs(lines: usize) -> Result<String, AppError> {
    let logs_dir = platform::config_dir().join("logs");
    if !logs_dir.exists() {
        return Ok("暂无日志".to_string());
    }

    // Find the latest log file
    let mut log_files: Vec<_> = std::fs::read_dir(&logs_dir)
        .map_err(|e| AppError::new(crate::error::ErrorCode::FileSystemError, &format!("读取日志目录失败: {}", e)))?
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            entry.path().extension().is_some_and(|ext| ext == "log")
        })
        .collect();

    log_files.sort_by_key(|entry| {
        entry.metadata().and_then(|m| m.modified()).unwrap_or(std::time::SystemTime::UNIX_EPOCH)
    });

    let latest_log = log_files.last().ok_or_else(|| {
        AppError::new(crate::error::ErrorCode::FileSystemError, "未找到日志文件")
    })?;

    let content = std::fs::read_to_string(latest_log.path())
        .map_err(|e| AppError::new(crate::error::ErrorCode::FileSystemError, &format!("读取日志失败: {}", e)))?;

    // Sanitize API keys and tokens
    let sanitized = sanitize_logs(&content);

    // Get last N lines
    let all_lines: Vec<&str> = sanitized.lines().collect();
    let start = if all_lines.len() > lines { all_lines.len() - lines } else { 0 };
    let result = all_lines[start..].join("\n");

    Ok(result)
}

fn check_gateway_running() -> Result<(bool, u16, Option<u32>), AppError> {
    // Try to check if port 18789 is in use
    let output = platform::exec_command("netstat", &["-ano"]);
    match output {
        Ok(netstat) => {
            let running = netstat.contains(":18789");
            // Try to extract PID
            let pid = if running {
                netstat.lines()
                    .find(|line| line.contains(":18789") && line.contains("LISTENING"))
                    .and_then(|line| line.split_whitespace().last())
                    .and_then(|pid_str| pid_str.parse::<u32>().ok())
            } else {
                None
            };
            Ok((running, 18789, pid))
        }
        Err(_) => Ok((false, 18789, None)),
    }
}

fn sanitize_logs(content: &str) -> String {
    // Replace API keys and tokens with ***
    let mut result = content.to_string();

    // Simple regex-free sanitization for common patterns
    for keyword in &["api_key", "apiKey", "token", "secret", "password"] {
        let patterns_to_check = [
            format!("{}=", keyword),
            format!("{}: ", keyword),
            format!("{}\":", keyword),
        ];
        for pattern in &patterns_to_check {
            while let Some(pos) = result.find(pattern.as_str()) {
                let start = pos + pattern.len();
                if start < result.len() {
                    // Find the end of the value (next comma, quote, or newline)
                    let end = result[start..].find([',', '"', '\n', '}'])
                        .map(|e| start + e)
                        .unwrap_or(result.len());
                    result.replace_range(start..end, "***");
                }
            }
        }
    }

    result
}
