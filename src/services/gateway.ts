/**
 * Gateway WebSocket 服务（单例模式）
 *
 * 连接 OpenClaw Gateway 的 WebSocket 服务，提供：
 * - 请求/响应模式（类似 JSON-RPC）
 * - 事件订阅（Gateway 推送的实时事件）
 * - 心跳保活（30 秒间隔）
 * - 并发控制（最多 10 个并发请求）
 * - 请求队列（超出并发的请求排队等待）
 * - 超时处理（10 秒超时自动拒绝）
 *
 * 使用方式：
 * ```ts
 * import { gatewayService } from './gateway'
 * await gatewayService.connect(token)
 * const result = await gatewayService.request('sessions.list')
 * ```
 */
import { invoke } from '@tauri-apps/api/core'

// Gateway 配置
const GATEWAY_URL = 'ws://127.0.0.1:18789'
const HEARTBEAT_INTERVAL = 30000 // 30 秒
const REQUEST_TIMEOUT = 10000 // 10 秒
const MAX_CONCURRENT = 10

// 待处理请求
interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  timer: ReturnType<typeof setTimeout>
}

// 队列请求
interface QueuedRequest {
  method: string
  params?: Record<string, unknown>
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
}

export class GatewayService {
  private static instance: GatewayService | null = null
  private ws: WebSocket | null = null
  private pendingRequests = new Map<string, PendingRequest>()
  private eventHandlers = new Map<string, Set<(data: unknown) => void>>()
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private requestQueue: QueuedRequest[] = []
  private activeRequests = 0
  private connected = false

  private constructor() {}

  static getInstance(): GatewayService {
    if (!GatewayService.instance) {
      GatewayService.instance = new GatewayService()
    }
    return GatewayService.instance
  }

  // 连接 Gateway
  async connect(token?: string): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    return new Promise((resolve, reject) => {
      try {
        const url = token ? `${GATEWAY_URL}?token=${token}` : GATEWAY_URL
        this.ws = new WebSocket(url)

        this.ws.onopen = () => {
          this.connected = true
          this.startHeartbeat()
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onclose = () => {
          this.connected = false
          this.stopHeartbeat()
          this.rejectAllPending('Connection closed')
        }

        this.ws.onerror = (error) => {
          console.error('Gateway WebSocket error:', error)
          reject(new Error('WebSocket connection failed'))
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  // 断开连接
  disconnect(): void {
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.connected = false
    this.rejectAllPending('Disconnected')
  }

  // 发送请求
  async request<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    if (!this.connected || !this.ws) {
      throw new Error('Not connected to Gateway')
    }

    if (this.activeRequests >= MAX_CONCURRENT) {
      // 加入队列
      return new Promise((resolve, reject) => {
        this.requestQueue.push({ method, params, resolve: resolve as (value: unknown) => void, reject })
      })
    }

    return this.sendRequest<T>(method, params)
  }

  // 订阅事件
  on(event: string, handler: (data: unknown) => void): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)

    // 返回取消订阅函数
    return () => {
      this.eventHandlers.get(event)?.delete(handler)
    }
  }

  // 获取连接状态
  isConnected(): boolean {
    return this.connected
  }

  // 私有方法

  private async sendRequest<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    const id = this.generateId()

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id)
        this.activeRequests--
        this.processQueue()
        reject(new Error(`Request timeout: ${method}`))
      }, REQUEST_TIMEOUT)

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      })

      this.activeRequests++

      const message = {
        type: 'req',
        id,
        method,
        params,
      }

      this.ws!.send(JSON.stringify(message))
    })
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data)

      if (message.type === 'res' && message.id) {
        // 响应
        const pending = this.pendingRequests.get(message.id)
        if (pending) {
          clearTimeout(pending.timer)
          this.pendingRequests.delete(message.id)
          this.activeRequests--
          this.processQueue()

          if (message.error) {
            pending.reject(new Error(message.error))
          } else {
            pending.resolve(message.result)
          }
        }
      } else if (message.type === 'event') {
        // 事件
        const handlers = this.eventHandlers.get(message.event)
        if (handlers) {
          handlers.forEach(handler => handler(message.data))
        }
      } else if (message.type === 'pong') {
        // 心跳响应
      }
    } catch (error) {
      console.error('Failed to parse Gateway message:', error)
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, HEARTBEAT_INTERVAL)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private rejectAllPending(reason: string): void {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer)
      pending.reject(new Error(reason))
    }
    this.pendingRequests.clear()
    this.activeRequests = 0
  }

  private processQueue(): void {
    if (this.requestQueue.length > 0 && this.activeRequests < MAX_CONCURRENT) {
      const next = this.requestQueue.shift()!
      this.sendRequest(next.method, next.params)
        .then(next.resolve)
        .catch(next.reject)
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

// 导出单例
export const gatewayService = GatewayService.getInstance()
