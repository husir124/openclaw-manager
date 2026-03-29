/**
 * Models 页面类型定义
 */

export interface ModelInfo {
  id: string
  name: string
  reasoning: boolean
  contextWindow: number
  maxTokens: number
}

export interface Provider {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  api: string
  models: ModelInfo[]
  isBuiltin: boolean
}

export interface AgentModelConfig {
  id: string
  name: string
  primary: string
  fallbacks: string[]
}
