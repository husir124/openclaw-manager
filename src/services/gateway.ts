// Gateway WebSocket 服务（单例模式）
// 心跳保活 + 并发控制 + 自动重连

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

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

export interface GatewayEvent {
  method: string
  params?: unknown
}

export class GatewayService {
  private static instance: GatewayService | null = null

  private ws: WebSocket | null = null
  private pendingRequests = new Map<string, PendingRequest>()
  private eventHandlers = new Map<string, Set<Function>>()

  // 心跳
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private heartbeatInterval = 30_000
  private missedHeartbeats = 0
  private maxMissedHeartbeats = 2

  // 重连
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  // 请求控制
  private requestTimeout = 10_000
  private maxConcurrent = 10
  private activeRequests = 0
  private requestQueue: QueuedRequest[] = []
  private maxMessageSize = 1024 * 1024

  // 状态
  private _status: ConnectionStatus = 'disconnected'
  private _url = ''
  private _token = ''
  private statusListeners = new Set<(status: ConnectionStatus) => void>()

  private constructor() {}

  static getInstance(): GatewayService {
    if (!GatewayService.instance) {
      GatewayService.instance = new GatewayService()
    }
    return GatewayService.instance
  }

  get status(): ConnectionStatus {
    return this._status
  }

  get url(): string {
    return this._url
  }

  private setStatus(status: ConnectionStatus): void {
    this._status = status
    this.statusListeners.forEach((listener) => listener(status))
  }

  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener)
    return () => { this.statusListeners.delete(listener) }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  // 连接
  async connect(url: string, token: string): Promise<void> {
    this._url = url
    this._token = token
    this.reconnectAttempts = 0
    return this.doConnect()
  }

  private doConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.setStatus('connecting')
      this.cleanup()

      try {
        this.ws = new WebSocket(this._url)
      } catch (e) {
        this.setStatus('disconnected')
        reject(new Error(`Invalid WebSocket URL: ${this._url}`))
        return
      }

      const connectTimeout = setTimeout(() => {
        this.ws?.close()
        this.setStatus('disconnected')
        reject(new Error('Connection timeout'))
      }, 5000)

      this.ws.onopen = () => {
        clearTimeout(connectTimeout)
        // Send auth
        this.ws?.send(JSON.stringify({
          jsonrpc: '2.0',
          id: this.generateId(),
          method: 'connect',
          params: { auth: { token: this._token } },
        }))
        this.setStatus('connected')
        this.reconnectAttempts = 0
        this.startHeartbeat()
        resolve()
      }

      this.ws.onmessage = (event) => {
        this.missedHeartbeats = 0
        this.handleMessage(event.data as string)
      }

      this.ws.onerror = () => {
        clearTimeout(connectTimeout)
        this.setStatus('disconnected')
        reject(new Error('WebSocket connection error'))
      }

      this.ws.onclose = () => {
        clearTimeout(connectTimeout)
        this.stopHeartbeat()
        this.ws = null
        if (this._status === 'connected') {
          this.tryReconnect()
        }
      }
    })
  }

  // 重连
  private tryReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus('disconnected')
      return
    }

    this.setStatus('reconnecting')
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(() => {
      this.doConnect().catch(() => {
        this.tryReconnect()
      })
    }, delay)
  }

  // 心跳
  private startHeartbeat(): void {
    this.missedHeartbeats = 0
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        if (this.missedHeartbeats >= this.maxMissedHeartbeats) {
          this.ws.close()
          return
        }
        this.missedHeartbeats++
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

  // RPC 调用
  async request<T>(method: string, params?: object): Promise<T> {
    if (this.activeRequests >= this.maxConcurrent) {
      return new Promise((resolve, reject) => {
        this.requestQueue.push({ method, params, resolve: resolve as (v: unknown) => void, reject })
      })
    }
    return this.doRequest<T>(method, params)
  }

  private doRequest<T>(method: string, params?: object): Promise<T> {
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
        resolve: resolve as (v: unknown) => void,
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

  // 消息处理
  private handleMessage(data: string): void {
    try {
      const msg = JSON.parse(data)

      // RPC response
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

      // Event
      if (msg.method) {
        const handlers = this.eventHandlers.get(msg.method)
        if (handlers) {
          handlers.forEach((handler) => handler(msg.params))
        }
      }
    } catch {
      // Ignore unparseable messages
    }
  }

  // 事件订阅
  on(event: string, handler: Function): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
    return () => { this.eventHandlers.get(event)?.delete(handler) }
  }

  // 断开
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.reconnectAttempts = this.maxReconnectAttempts // Prevent auto-reconnect
    this.cleanup()
    this.setStatus('disconnected')
  }

  private cleanup(): void {
    this.stopHeartbeat()
    this.ws?.close()
    this.ws = null
    this.pendingRequests.forEach((p) => {
      clearTimeout(p.timer)
      p.reject(new Error('Disconnected'))
    })
    this.pendingRequests.clear()
    this.requestQueue = []
    this.activeRequests = 0
  }
}

export const gatewayService = GatewayService.getInstance()
