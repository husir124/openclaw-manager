use serde::Serialize;
use std::fmt;

#[derive(Debug, Serialize, Clone)]
pub struct AppError {
    pub code: ErrorCode,
    pub message: String,
    pub detail: Option<String>,
    pub recoverable: bool,
    pub suggestion: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCode {
    NodeNotFound,
    NodeVersionTooLow,
    OpenClawNotInstalled,
    GatewayNotRunning,
    GatewayConnectionFailed,
    GatewayTimeout,
    ConfigNotFound,
    ConfigParseError,
    ConfigValidationFailed,
    ConfigConflict,
    PermissionDenied,
    CommandFailed,
    FileSystemError,
    Unknown,
}

impl AppError {
    pub fn new(code: ErrorCode, message: &str) -> Self {
        Self {
            code,
            message: message.to_string(),
            detail: None,
            recoverable: false,
            suggestion: None,
        }
    }

    pub fn with_detail(mut self, detail: &str) -> Self {
        self.detail = Some(detail.to_string());
        self
    }

    pub fn with_suggestion(mut self, suggestion: &str) -> Self {
        self.suggestion = Some(suggestion.to_string());
        self
    }

    pub fn recoverable(mut self) -> Self {
        self.recoverable = true;
        self
    }
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[{:?}] {}", self.code, self.message)
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::new(
            ErrorCode::FileSystemError,
            &format!("文件系统错误: {}", err),
        )
        .with_detail(&err.to_string())
    }
}

impl From<String> for AppError {
    fn from(msg: String) -> Self {
        AppError::new(ErrorCode::Unknown, &msg)
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::new(
            ErrorCode::ConfigParseError,
            "配置文件解析失败",
        )
        .with_detail(&err.to_string())
        .with_suggestion("请检查 openclaw.json 格式是否正确")
    }
}
