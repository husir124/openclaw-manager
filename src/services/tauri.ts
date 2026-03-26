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
