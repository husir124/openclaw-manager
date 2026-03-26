use serde::{Deserialize, Serialize};
use crate::error::{AppError, ErrorCode};
use crate::platform;

#[derive(Debug, Serialize, Deserialize)]
pub struct NodeInfo {
    pub installed: bool,
    pub version: Option<String>,
    pub meets_minimum: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OpenClawInfo {
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GatewayStatus {
    pub running: bool,
    pub port: u16,
    pub pid: Option<u32>,
}

#[tauri::command]
pub async fn check_node_version() -> Result<NodeInfo, AppError> {
    match platform::run_command("node", &["--version"], 5) {
        Ok(output) => {
            let version = output.trim().to_string();
            let meets = platform::node_version_meets_minimum(&version);
            Ok(NodeInfo {
                installed: true,
                version: Some(version),
                meets_minimum: meets,
            })
        }
        Err(_) => Ok(NodeInfo {
            installed: false,
            version: None,
            meets_minimum: false,
        }),
    }
}

#[tauri::command]
pub async fn check_openclaw_installed() -> Result<OpenClawInfo, AppError> {
    let binary_name = platform::openclaw_binary_name();

    match platform::run_command(binary_name, &["--version"], 10) {
        Ok(output) => {
            let version = output.trim().to_string();
            let path = platform::openclaw_bin_path()
                .map(|p| p.to_string_lossy().to_string());
            Ok(OpenClawInfo {
                installed: true,
                version: Some(version),
                path,
            })
        }
        Err(_) => Ok(OpenClawInfo {
            installed: false,
            version: None,
            path: None,
        }),
    }
}

#[tauri::command]
pub async fn check_gateway_status() -> Result<GatewayStatus, AppError> {
    let port: u16 = 18789;

    #[cfg(target_os = "windows")]
    {
        // Windows: 用 netstat 检查端口
        match platform::run_command(
            "netstat",
            &["-ano", "-p", "TCP"],
            5,
        ) {
            Ok(output) => {
                let port_str = format!("127.0.0.1:{}", port);
                let found = output.lines().any(|line| {
                    line.contains(&port_str) && line.contains("LISTENING")
                });

                if found {
                    // 尝试获取 PID
                    let pid = output
                        .lines()
                        .find(|line| line.contains(&port_str) && line.contains("LISTENING"))
                        .and_then(|line| {
                            line.split_whitespace()
                                .last()
                                .and_then(|s| s.parse().ok())
                        });

                    Ok(GatewayStatus {
                        running: true,
                        port,
                        pid,
                    })
                } else {
                    Ok(GatewayStatus {
                        running: false,
                        port,
                        pid: None,
                    })
                }
            }
            Err(_) => Ok(GatewayStatus {
                running: false,
                port,
                pid: None,
            }),
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        // macOS/Linux: 用 lsof 检查端口
        match platform::run_command(
            "lsof",
            &["-i", &format!(":{}", port), "-P", "-n"],
            5,
        ) {
            Ok(output) => {
                let found = output.lines().count() > 1; // 跳过标题行
                if found {
                    let pid = output
                        .lines()
                        .nth(1)
                        .and_then(|line| {
                            line.split_whitespace()
                                .nth(1)
                                .and_then(|s| s.parse().ok())
                        });
                    Ok(GatewayStatus {
                        running: true,
                        port,
                        pid,
                    })
                } else {
                    Ok(GatewayStatus {
                        running: false,
                        port,
                        pid: None,
                    })
                }
            }
            Err(_) => Ok(GatewayStatus {
                running: false,
                port,
                pid: None,
            }),
        }
    }
}
