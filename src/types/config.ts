/**
 * 配置相关类型 - 统一定义，消除 api.ts 和 tauri.ts 的重复
 */

/** Gateway 运行状态 */
export interface GatewayStatus {
  running: boolean
  port: number
  pid?: number
  version?: string
}

/** Gateway 配置 */
export interface GatewayConfig {
  port: number
  host: string
  logLevel: string
  [key: string]: unknown
}

/** 应用配置 */
export interface AppConfig {
  name: string
  version: string
  description?: string
  author?: string
  license?: string
  [key: string]: unknown
}

/** OpenClaw 主配置 */
export interface OpenClawConfig {
  gateway?: GatewayConfig
  app?: AppConfig
  [key: string]: unknown
}

/** 健康检查数据 */
export interface HealthData {
  status: string
  uptime: number
  memory: {
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
  }
  cpu?: {
    user: number
    system: number
  }
  timestamp: string
  [key: string]: unknown
}

/** 应用日志条目 */
export interface AppLog {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  source?: string
}

/** 配置段 */
export interface ConfigSection {
  name: string
  value: unknown
}

/** Agent 配置 */
export interface AgentConfig {
  id: string
  name: string
  description?: string
  model?: string
  systemPrompt?: string
  [key: string]: unknown
}

/** Channel 配置 */
export interface ChannelConfig {
  type: string
  enabled: boolean
  [key: string]: unknown
}

/** 服务响应包装 */
export interface ServiceResponse<T> {
  success: boolean
  data?: T
  error?: string
}
