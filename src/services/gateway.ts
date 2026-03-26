// Gateway WebSocket 服务（单例模式）
// 专家建议 #12：必须是单例，否则多个组件各自实例化会创建多个 WebSocket 连接

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
  timer: ReturnType<typeof setTimeout>
}

interface QueuedRequest {
  method: string
  params?: object
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}

export class GatewayService {
  private static instance: GatewayService | null = null

  private ws: WebSocket | null = null
  private pendingRequests = new Map<string, PendingRequest>()
  private eventHandlers = new Map<string, Set<Function>>()

  // 心跳保活（专家建议 #4）
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private heartbeatInterval = 30_000 // 30秒

  // 请求超时
  private requestTimeout = 10_000 // 10秒

  // 并发控制（专家建议 #4）
  private maxConcurrent = 10
  private activeRequests = 0
  private requestQueue: QueuedRequest[] = []

  // 消息大小限制
  private maxMessageSize = 1024 * 1024 // 1MB

  private constructor() {} // 禁止外部实例化

  static getInstance(): GatewayService {
    if (!GatewayService.instance) {
      GatewayService.instance = new GatewayService()
    }
    return GatewayService.instance
  }

  // 消息 ID 生成
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  // 连接（自动心跳）
  async connect(url: string, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        // 发送认证
        this.ws?.send(JSON.stringify({
          jsonrpc: '2.0',
          id: this.generateId(),
          method: 'connect',
          params: { auth: { token } },
        }))
        // 启动心跳
        this.startHeartbeat()
        resolve()
      }

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data)
      }

      this.ws.onerror = (error) => {
        reject(error)
      }

      this.ws.onclose = () => {
        this.stopHeartbeat()
        this.ws = null
      }
    })
  }

  // 心跳
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ jsonrpc: '2.0', method: 'ping' }))
      }
    }, this.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // RPC 调用（带超时 + 并发控制）
  async request<T>(method: string, params?: object): Promise<T> {
    // 并发控制
    if (this.activeRequests >= this.maxConcurrent) {
      return new Promise((resolve, reject) => {
        this.requestQueue.push({ method, params, resolve, reject })
      })
    }

    return this.doRequest<T>(method, params)
  }

  private async doRequest<T>(method: string, params?: object): Promise<T> {
    this.activeRequests++

    return new Promise((resolve, reject) => {
      const id = this.generateId()

      const timer = setTimeout(() => {
        this.pendingRequests.delete(id)
        this.activeRequests--
        this.processQueue()
        reject(new Error(`Request timeout: ${method}`))
      }, this.requestTimeout)

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      })

      if (this.ws?.readyState === WebSocket.OPEN) {
        const message = JSON.stringify({ jsonrpc: '2.0', id, method, params })
        if (message.length > this.maxMessageSize) {
          clearTimeout(timer)
          this.pendingRequests.delete(id)
          this.activeRequests--
          this.processQueue()
          reject(new Error('Message too large'))
          return
        }
        this.ws.send(message)
      } else {
        clearTimeout(timer)
        this.pendingRequests.delete(id)
        this.activeRequests--
        this.processQueue()
        reject(new Error('WebSocket not connected'))
      }
    })
  }

  private processQueue(): void {
    while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const req = this.requestQueue.shift()!
      this.doRequest(req.method, req.params).then(req.resolve).catch(req.reject)
    }
  }

  // 处理收到的消息
  private handleMessage(data: string): void {
    try {
      const msg = JSON.parse(data)

      // RPC 响应
      if (msg.id && this.pendingRequests.has(msg.id)) {
        const pending = this.pendingRequests.get(msg.id)!
        clearTimeout(pending.timer)
        this.pendingRequests.delete(msg.id)
        this.activeRequests--
        this.processQueue()

        if (msg.error) {
          pending.reject(msg.error)
        } else {
          pending.resolve(msg.result)
        }
        return
      }

      // 事件
      if (msg.method) {
        const handlers = this.eventHandlers.get(msg.method)
        if (handlers) {
          handlers.forEach((handler) => handler(msg.params))
        }
      }
    } catch {
      // 忽略无法解析的消息
    }
  }

  // 事件订阅
  on(event: string, handler: Function): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)

    // 返回取消订阅函数
    return () => {
      this.eventHandlers.get(event)?.delete(handler)
    }
  }

  // 断开
  disconnect(): void {
    this.stopHeartbeat()
    this.ws?.close()
    this.ws = null
    this.pendingRequests.clear()
    this.requestQueue = []
    this.activeRequests = 0
  }
}

export const gatewayService = GatewayService.getInstance()
