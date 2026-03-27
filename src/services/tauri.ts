// Tauri 命令封装
import { invoke } from '@tauri-apps/api/core'

// System
export async function checkNodeVersion(): Promise<{
  installed: boolean; version: string | null; meets_minimum: boolean
}> {
  return invoke('check_node_version')
}

export async function checkOpenClawInstalled(): Promise<{
  installed: boolean; version: string | null; path: string | null
}> {
  return invoke('check_openclaw_installed')
}

export async function checkGatewayStatus(): Promise<{
  running: boolean; port: number; pid: number | null
}> {
  return invoke('check_gateway_status')
}

export async function readGatewayToken(): Promise<string | null> {
  return invoke('read_gateway_token')
}

// Config
export interface ConfigData {
  raw: string
  parsed: Record<string, unknown>
  path: string
}

export interface ConfigSection {
  name: string
  path: string
  value: unknown
}

export async function readConfig(): Promise<ConfigData> {
  return invoke('read_config')
}

export async function getConfigSection(path: string): Promise<ConfigSection> {
  return invoke('get_config_section', { path })
}

export async function writeConfig(content: string): Promise<string> {
  return invoke('write_config', { content })
}

export async function setConfigValue(path: string, value: unknown): Promise<string> {
  return invoke('set_config_value', { path, value })
}

export async function listConfigSections(): Promise<ConfigSection[]> {
  return invoke('list_config_sections')
}

export async function listConfigBackups(): Promise<string[]> {
  return invoke('list_config_backups')
}

// Process
export async function startGateway(): Promise<string> {
  return invoke('start_gateway')
}

export async function stopGateway(): Promise<string> {
  return invoke('stop_gateway')
}

// Health
export interface DiagnosticResult {
  id: string
  name: string
  status: 'ok' | 'warning' | 'error'
  message: string
}

export async function runDiagnosis(): Promise<DiagnosticResult[]> {
  return invoke('run_diagnosis')
}

export async function fixIssue(issueId: string): Promise<string> {
  return invoke('fix_issue', { issueId })
}

export async function getLogs(lines: number): Promise<string> {
  return invoke('get_logs', { lines })
}

// Backup
export interface BackupFile {
  name: string
  path: string
  size: number
  created_at: string
  encrypted: boolean
}

export async function createBackup(password: string): Promise<string> {
  return invoke('create_backup', { password })
}

export async function listBackups(): Promise<BackupFile[]> {
  return invoke('list_backups')
}

export async function restoreBackup(filePath: string, password: string): Promise<string> {
  return invoke('restore_backup', { filePath, password })
}

export async function getBackupProgress(): Promise<number> {
  return invoke('get_backup_progress')
}

// Skills
export interface SkillInfo {
  id: string
  name: string
  description: string
  version: string | null
  path: string
  agent_id: string
  has_skill_md: boolean
}

export interface AgentSkillsInfo {
  agent_id: string
  agent_name: string
  skills_path: string
  skills: SkillInfo[]
  error: string | null
}

export async function listLocalSkills(agentId: string): Promise<AgentSkillsInfo> {
  return invoke('list_local_skills', { agentId })
}

export async function listAllAgentsSkills(): Promise<AgentSkillsInfo[]> {
  return invoke('list_all_agents_skills')
}

export async function deleteSkill(agentId: string, skillId: string): Promise<string> {
  return invoke('delete_skill', { agentId, skillId })
}

// App Info
export interface AppInfo {
  version: string
  name: string
  config_dir: string
  logs_dir: string
  backups_dir: string
}

export interface DiskUsage {
  total_bytes: number
  logs_bytes: number
  backups_bytes: number
  workspace_bytes: number
  formatted_total: string
  formatted_logs: string
  formatted_backups: string
  formatted_workspace: string
}

export async function getAppInfo(): Promise<AppInfo> {
  return invoke('get_app_info')
}

export async function clearCache(): Promise<string> {
  return invoke('clear_cache')
}

export async function getDiskUsage(): Promise<DiskUsage> {
  return invoke('get_disk_usage')
}
