use crate::error::{AppError, ErrorCode};
use crate::platform;

#[tauri::command]
pub async fn start_gateway() -> Result<String, AppError> {
    // 检查是否已安装
    if platform::openclaw_bin_path().is_none() {
        return Err(AppError::new(
            ErrorCode::OpenClawNotInstalled,
            "OpenClaw 未安装",
        )
        .with_suggestion("请先安装 OpenClaw: npm install -g openclaw@latest"));
    }

    // 检查是否已在运行
    let status = super::system::check_gateway_status().await?;
    if status.running {
        return Ok(format!("Gateway 已在运行 (端口 {}, PID {:?})", status.port, status.pid));
    }

    // 启动 Gateway（后台运行）
    let mut cmd = std::process::Command::new(binary);
    cmd.arg("gateway");

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    cmd.spawn().map_err(|e| {
        AppError::new(ErrorCode::CommandFailed, "启动 Gateway 失败")
            .with_detail(&e.to_string())
    })?;

    // 等待几秒后检查是否启动成功
    tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
    let status = super::system::check_gateway_status().await?;
    if status.running {
        Ok(format!("Gateway 启动成功 (端口 {}, PID {:?})", status.port, status.pid))
    } else {
        Err(AppError::new(
            ErrorCode::GatewayConnectionFailed,
            "Gateway 启动后未检测到运行",
        )
        .recoverable()
        .with_suggestion("请尝试手动运行: openclaw gateway"))
    }
}

#[tauri::command]
pub async fn stop_gateway() -> Result<String, AppError> {
    let binary = platform::openclaw_binary_name();

    // 检查是否在运行
    let status = super::system::check_gateway_status().await?;
    if !status.running {
        return Ok("Gateway 未在运行".to_string());
    }

    // 如果有 PID，直接 kill
    if let Some(pid) = status.pid {
        #[cfg(target_os = "windows")]
        {
            platform::run_command("taskkill", &["/PID", &pid.to_string(), "/F"], 5)?;
        }
        #[cfg(not(target_os = "windows"))]
        {
            platform::run_command("kill", &["-TERM", &pid.to_string()], 5)?;
        }
        return Ok(format!("Gateway 已停止 (PID {})", pid));
    }

    // 降级：尝试 openclaw gateway stop
    let binary_name = platform::openclaw_binary_name();
    match platform::run_command(binary_name, &["gateway", "stop"], 10) {
        Ok(output) => Ok(output),
        Err(_) => Err(AppError::new(
            ErrorCode::CommandFailed,
            "停止 Gateway 失败",
        )
        .with_suggestion("请尝试手动停止 Gateway 进程")),
    }
}
