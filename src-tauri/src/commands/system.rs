use serde::{Deserialize, Serialize};

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
pub async fn check_node_version() -> Result<NodeInfo, String> {
    // TODO: 实现真实检测
    Ok(NodeInfo {
        installed: true,
        version: Some("v24.14.0".to_string()),
        meets_minimum: true,
    })
}

#[tauri::command]
pub async fn check_openclaw_installed() -> Result<OpenClawInfo, String> {
    // TODO: 实现真实检测
    Ok(OpenClawInfo {
        installed: true,
        version: Some("2026.3.24".to_string()),
        path: None,
    })
}

#[tauri::command]
pub async fn check_gateway_status() -> Result<GatewayStatus, String> {
    // TODO: 实现真实检测
    Ok(GatewayStatus {
        running: false,
        port: 18789,
        pid: None,
    })
}
