use serde::{Deserialize, Serialize};
use crate::error::{AppError, ErrorCode};
use crate::platform;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct SkillInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub version: Option<String>,
    pub path: String,
    pub agent_id: String,
    pub has_skill_md: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentSkillsInfo {
    pub agent_id: String,
    pub agent_name: String,
    pub skills_path: String,
    pub skills: Vec<SkillInfo>,
    pub error: Option<String>,
}

/// 读取指定目录下的所有 Skills
#[tauri::command]
pub async fn list_local_skills(agent_id: String) -> Result<AgentSkillsInfo, AppError> {
    let home = dirs::home_dir().unwrap_or_default();
    let skills_path = if agent_id == "main" {
        home.join(".openclaw").join("workspace").join("skills")
    } else {
        home.join(".openclaw").join(format!("workspace-{}", agent_id)).join("skills")
    };

    let agent_name = if agent_id == "main" {
        "主 Agent".to_string()
    } else {
        agent_id.clone()
    };

    // 检查路径是否存在
    if !skills_path.exists() {
        return Ok(AgentSkillsInfo {
            agent_id,
            agent_name,
            skills_path: skills_path.to_string_lossy().to_string(),
            skills: vec![],
            error: Some(format!("Skills 目录不存在: {}", skills_path.display())),
        });
    }

    // 读取目录
    let mut skills = Vec::new();
    match std::fs::read_dir(&skills_path) {
        Ok(entries) => {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let skill_id = path.file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string();

                    // 跳过隐藏目录
                    if skill_id.starts_with('.') {
                        continue;
                    }

                    let skill_md_path = path.join("SKILL.md");
                    let has_skill_md = skill_md_path.exists();

                    // 尝试读取 SKILL.md 获取名称和描述
                    let (name, description, version) = if has_skill_md {
                        parse_skill_md(&skill_md_path)
                    } else {
                        (skill_id.clone(), String::new(), None)
                    };

                    skills.push(SkillInfo {
                        id: skill_id,
                        name,
                        description,
                        version,
                        path: path.to_string_lossy().to_string(),
                        agent_id: agent_id.clone(),
                        has_skill_md,
                    });
                }
            }
        }
        Err(e) => {
            return Ok(AgentSkillsInfo {
                agent_id,
                agent_name,
                skills_path: skills_path.to_string_lossy().to_string(),
                skills: vec![],
                error: Some(format!("读取 Skills 目录失败: {}", e)),
            });
        }
    }

    // 按名称排序
    skills.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(AgentSkillsInfo {
        agent_id,
        agent_name,
        skills_path: skills_path.to_string_lossy().to_string(),
        skills,
        error: None,
    })
}

/// 获取所有 Agent 的 Skills
#[tauri::command]
pub async fn list_all_agents_skills() -> Result<Vec<AgentSkillsInfo>, AppError> {
    let home = dirs::home_dir().unwrap_or_default();
    let openclaw_dir = home.join(".openclaw");

    let mut results = Vec::new();

    // 读取主 Agent
    let main_skills = list_local_skills("main".to_string()).await?;
    results.push(main_skills);

    // 读取所有子 Agent
    if let Ok(entries) = std::fs::read_dir(&openclaw_dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with("workspace-") && name != "workspace" {
                let agent_id = name.strip_prefix("workspace-").unwrap_or(&name).to_string();
                let agent_skills = list_local_skills(agent_id).await?;
                // 只添加有 skills 目录的 agent
                if agent_skills.error.is_none() || agent_skills.skills_path.contains("skills") {
                    results.push(agent_skills);
                }
            }
        }
    }

    Ok(results)
}

/// 解析 SKILL.md 文件获取名称和描述
fn parse_skill_md(path: &PathBuf) -> (String, String, Option<String>) {
    match std::fs::read_to_string(path) {
        Ok(content) => {
            let mut name = String::new();
            let mut description = String::new();
            let mut version = None;

            // 解析 frontmatter
            if content.starts_with("---") {
                if let Some(end) = content[3..].find("---") {
                    let frontmatter = &content[3..end + 3];
                    for line in frontmatter.lines() {
                        if let Some(val) = line.strip_prefix("name:") {
                            name = val.trim().trim_matches('"').to_string();
                        } else if let Some(val) = line.strip_prefix("description:") {
                            description = val.trim().trim_matches('\'').to_string();
                        } else if let Some(val) = line.strip_prefix("version:") {
                            version = Some(val.trim().trim_matches('"').to_string());
                        }
                    }
                }
            }

            // 如果没有 frontmatter，用第一行标题
            if name.is_empty() {
                for line in content.lines() {
                    if line.starts_with("# ") {
                        name = line[2..].trim().to_string();
                        break;
                    }
                }
            }

            // 如果还是没有名称，用文件名
            if name.is_empty() {
                name = path.file_stem()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
            }

            (name, description, version)
        }
        Err(_) => (
            path.file_stem().unwrap_or_default().to_string_lossy().to_string(),
            String::new(),
            None,
        ),
    }
}

/// 删除指定 Agent 的指定 Skill
#[tauri::command]
pub async fn delete_skill(agent_id: String, skill_id: String) -> Result<String, AppError> {
    let home = dirs::home_dir().unwrap_or_default();
    let skills_path = if agent_id == "main" {
        home.join(".openclaw").join("workspace").join("skills")
    } else {
        home.join(".openclaw").join(format!("workspace-{}", agent_id)).join("skills")
    };

    let skill_path = skills_path.join(&skill_id);

    // 检查路径是否存在
    if !skill_path.exists() {
        return Err(AppError::new(
            ErrorCode::FileSystemError,
            &format!("Skill 目录不存在: {}", skill_path.display()),
        ));
    }

    // 删除目录
    std::fs::remove_dir_all(&skill_path)
        .map_err(|e| AppError::new(
            ErrorCode::FileSystemError,
            &format!("删除 Skill 失败: {}", e),
        ))?;

    Ok(format!("已删除 Skill: {}", skill_id))
}
