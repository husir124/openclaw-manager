// Gateway WebSocket 协议类型

export interface GatewayMessage {
  jsonrpc: '2.0'
  id?: string
  method?: string
  params?: Record<string, unknown>
  result?: unknown
  error?: { code: number; message: string }
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface SessionInfo {
  key: string
  agentId: string
  channelId?: string
  lastMessage?: string
  lastActiveAt: number
}
