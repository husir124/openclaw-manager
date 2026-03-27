use crate::error::AppError;
use serde_json::Value;

/// 迁移定义
pub struct Migration {
    pub from_version: &'static str,
    pub to_version: &'static str,
    pub description: &'static str,
    pub execute: fn(config: &mut Value) -> Result<(), AppError>,
}

/// 所有迁移
pub const MIGRATIONS: &[Migration] = &[
    Migration {
        from_version: "1.0",
        to_version: "1.1",
        description: "添加 meta.configVersion 字段",
        execute: migrate_1_0_to_1_1,
    },
    Migration {
        from_version: "1.1",
        to_version: "1.2",
        description: "确保所有 Agent 有 workspace 字段",
        execute: migrate_1_1_to_1_2,
    },
];

/// 执行迁移
pub fn run_migrations(config: &mut Value) -> Result<Vec<String>, AppError> {
    let mut applied = Vec::new();

    // 获取当前版本
    let current_version = config
        .get("meta")
        .and_then(|m| m.get("configVersion"))
        .and_then(|v| v.as_str())
        .unwrap_or("1.0")
        .to_string();

    // 按顺序执行迁移
    for migration in MIGRATIONS {
        if migration.from_version == current_version {
            // 备份当前配置
            let backup_path = crate::platform::config_dir().join(format!(
                "openclaw.json.migration-backup-{}",
                chrono::Local::now().format("%Y%m%d-%H%M%S")
            ));
            let _ = std::fs::write(&backup_path, serde_json::to_string_pretty(config).unwrap_or_default());

            // 执行迁移
            (migration.execute)(config)?;

            applied.push(format!(
                "v{} -> v{}: {}",
                migration.from_version, migration.to_version, migration.description
            ));
        }
    }

    Ok(applied)
}

/// 迁移 1.0 -> 1.1
fn migrate_1_0_to_1_1(config: &mut Value) -> Result<(), AppError> {
    // 确保 meta 存在
    if config.get("meta").is_none() {
        config["meta"] = serde_json::json!({});
    }

    // 添加 configVersion
    config["meta"]["configVersion"] = Value::from("1.1");
    config["meta"]["lastMigrationAt"] = Value::from(chrono::Local::now().to_rfc3339());

    Ok(())
}

/// 迁移 1.1 -> 1.2
fn migrate_1_1_to_1_2(config: &mut Value) -> Result<(), AppError> {
    // 确保 agents.list 中每个 agent 都有 workspace
    if let Some(agents) = config.get_mut("agents") {
        if let Some(list) = agents.get_mut("list") {
            if let Some(arr) = list.as_array_mut() {
                for agent in arr {
                    if let Some(id) = agent.get("id").and_then(|v| v.as_str()) {
                        if agent.get("workspace").is_none() {
                            let workspace = if id == "main" {
                                "~/.openclaw/workspace".to_string()
                            } else {
                                format!("~/.openclaw/workspace-{}", id)
                            };
                            agent["workspace"] = Value::from(workspace);
                        }
                    }
                }
            }
        }
    }

    // 更新版本
    config["meta"]["configVersion"] = Value::from("1.2");

    Ok(())
}
