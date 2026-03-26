export interface NodeInfo {
  installed: boolean
  version: string | null
  meetsMinimum: boolean
}

export interface OpenClawInfo {
  installed: boolean
  version: string | null
  path: string | null
}

export interface GatewayStatus {
  running: boolean
  port: number
  pid: number | null
}

export interface SystemOverview {
  node: NodeInfo
  openclaw: OpenClawInfo
  gateway: GatewayStatus
}

export interface Agent {
  id: string
  name: string
  model: string
  workspace: string
}

export interface Channel {
  id: string
  name: string
  enabled: boolean
  connected: boolean
}

export interface Skill {
  id: string
  name: string
  status: 'ready' | 'needs_setup' | 'disabled'
  description: string
}
