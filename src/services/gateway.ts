// Gateway WebSocket 服务（单例模式）
// 不主动断开连接，靠 WebSocket 底层检测死连接

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

export class GatewayService {
  private static instance: GatewayService | null = null

  private ws: WebSocket | null = null
  private pendingRequests = new Map<string, PendingRequest>()
  private eventHandlers = new Map<string, Set<Function>>()

  // 请求控制
  private requestTimeout = 10_000
  private maxConcurrent = 10
  private activeRequests = 0
  private requestQueue: QueuedRequest[] = []
  private maxMessageSize = 1024 * 1024

  // 重连
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private shouldReconnect = true

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
    if (this._status !== status) {
      this._status = status
      this.statusListeners.forEach((listener) => listener(status))
    }
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
    this.shouldReconnect = true
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
        reject(new Error('Invalid WebSocket URL'))
        return
      }

      const connectTimeout = setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          this.ws?.close()
          this.setStatus('disconnected')
          reject(new Error('Connection timeout'))
        }
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
        resolve()
      }

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data as string)
      }

      this.ws.onerror = () => {
        clearTimeout(connectTimeout)
        // Don't reject here - onclose will handle it
      }

      this.ws.onclose = () => {
        clearTimeout(connectTimeout)
        this.ws = null
        this.rejectAllPending()

        if (this.shouldReconnect && this._status === 'connected') {
          this.tryReconnect()
        } else if (this._status !== 'reconnecting') {
          this.setStatus('disconnected')
        }
      }
    })
  }

  // 重连（指数退避）
  private tryReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || !this.shouldReconnect) {
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

  private rejectAllPending(): void {
    this.pendingRequests.forEach((p) => {
      clearTimeout(p.timer)
      p.reject(new Error('Connection lost'))
    })
    this.pendingRequests.clear()
    this.requestQueue.forEach((req) => req.reject(new Error('Connection lost')))
    this.requestQueue = []
    this.activeRequests = 0
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

  // 断开（用户主动断开，不触发重连）
  disconnect(): void {
    this.shouldReconnect = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.cleanup()
    this.setStatus('disconnected')
  }

  private cleanup(): void {
    this.ws?.close()
    this.ws = null
    this.rejectAllPending()
  }
}

export const gatewayService = GatewayService.getInstance()
