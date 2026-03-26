// Tauri 命令封装
import { invoke } from '@tauri-apps/api/core'
import type { NodeInfo, OpenClawInfo, GatewayStatus } from '../types/openclaw'

export async function checkNodeVersion(): Promise<NodeInfo> {
  return invoke('check_node_version')
}

export async function checkOpenClawInstalled(): Promise<OpenClawInfo> {
  return invoke('check_openclaw_installed')
}

export async function checkGatewayStatus(): Promise<GatewayStatus> {
  return invoke('check_gateway_status')
}

export async function readConfig(): Promise<{ raw: string }> {
  return invoke('read_config')
}

export async function startGateway(): Promise<string> {
  return invoke('start_gateway')
}

export async function stopGateway(): Promise<string> {
  return invoke('stop_gateway')
}

export async function readGatewayToken(): Promise<string | null> {
  return invoke('read_gateway_token')
}
