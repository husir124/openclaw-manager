// Gateway WebSocket 服务（单例模式）
// 正确处理 close code，区分正常关闭和异常关闭

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

  // 心跳（仅用于检测死连接，不主动断开）
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private heartbeatInterval = 30_000
  private lastMessageTime = 0

  // 请求控制
  private requestTimeout = 10_000
  private maxConcurrent = 10
  private activeRequests = 0
  private requestQueue: QueuedRequest[] = []
  private maxMessageSize = 1024 * 1024

  // 重连
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private shouldReconnect = true

  // 状态
  private _status: ConnectionStatus = 'disconnected'
  private _url = ''
  private _token = ''
  private _lastError = ''
  private statusListeners = new Set<(status: ConnectionStatus) => void>()

  private constructor() {}

  static getInstance(): GatewayService {
    if (!GatewayService.instance) {
      GatewayService.instance = new GatewayService()
    }
    return GatewayService.instance
  }

  get status(): ConnectionStatus { return this._status }
  get url(): string { return this._url }
  get lastError(): string { return this._lastError }

  private setStatus(status: ConnectionStatus): void {
    if (this._status !== status) {
      this._status = status
      this.statusListeners.forEach((l) => l(status))
    }
  }

  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener)
    return () => { this.statusListeners.delete(listener) }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  private log(msg: string): void {
    console.log(`[GatewayService] ${msg}`)
  }

  async connect(url: string, token: string): Promise<void> {
    this._url = url
    this._token = token
    this.reconnectAttempts = 0
    this.shouldReconnect = true
    this._lastError = ''
    return this.doConnect()
  }

  private doConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.setStatus('connecting')
      this.cleanup()

      try {
        // Pass token as query parameter (Gateway expects auth during WS handshake)
        const sep = this._url.includes('?') ? '&' : '?'
        const urlWithToken = `${this._url}${sep}token=${encodeURIComponent(this._token)}`
        this.ws = new WebSocket(urlWithToken)
      } catch {
        this.setStatus('disconnected')
        reject(new Error('Invalid WebSocket URL'))
        return
      }

      let resolved = false
      const connectTimeout = setTimeout(() => {
        if (!resolved && this.ws?.readyState !== WebSocket.OPEN) {
          resolved = true
          this.ws?.close()
          this.setStatus('disconnected')
          reject(new Error('Connection timeout (5s)'))
        }
      }, 5000)

      this.ws.onopen = () => {
        clearTimeout(connectTimeout)
        if (resolved) return
        resolved = true

        this.log('Connected (auth sent during handshake via query param)')
        this.setStatus('connected')
        this.reconnectAttempts = 0
        this.lastMessageTime = Date.now()
        this.startHeartbeat()
        resolve()
      }

      this.ws.onmessage = (event) => {
        this.lastMessageTime = Date.now()
        this.handleMessage(event.data as string)
      }

      this.ws.onerror = (evt) => {
        this.log(`WebSocket error: ${JSON.stringify(evt)}`)
        // Don't reject here - onclose will handle cleanup
      }

      this.ws.onclose = (evt) => {
        clearTimeout(connectTimeout)
        this.stopHeartbeat()
        this.ws = null
        this.rejectAllPending()

        this.log(`Connection closed: code=${evt.code} reason="${evt.reason}" wasClean=${evt.wasClean}`)

        // Code 1008 = Policy Violation (pairing required)
        if (evt.code === 1008) {
          this._lastError = `Gateway rejected: ${evt.reason || 'pairing required'}. Run: openclaw devices approve`
          this.setStatus('disconnected')
          this.shouldReconnect = false // Don't auto-reconnect for auth errors
          if (!resolved) {
            resolved = true
            reject(new Error(this._lastError))
          }
          return
        }

        // Code 1000 = Normal closure (user-initiated or Gateway shutdown)
        if (evt.code === 1000) {
          this.setStatus('disconnected')
          if (!resolved) {
            resolved = true
            reject(new Error('Connection closed normally'))
          }
          return
        }

        // Code 1001 = Going Away (Gateway restarting)
        // Code 1006 = Abnormal closure (network error)
        // Code 1011 = Server error
        // These are worth retrying
        if (!resolved) {
          resolved = true
          this.setStatus('disconnected')
          reject(new Error(`Connection closed: code=${evt.code} ${evt.reason}`))
          return
        }

        if (this.shouldReconnect && this._status === 'connected') {
          this.tryReconnect()
        } else {
          this.setStatus('disconnected')
        }
      }
    })
  }

  private tryReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || !this.shouldReconnect) {
      this._lastError = `Reconnection failed after ${this.maxReconnectAttempts} attempts`
      this.setStatus('disconnected')
      return
    }

    this.setStatus('reconnecting')
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000)
    this.reconnectAttempts++
    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    this.reconnectTimer = setTimeout(() => {
      this.doConnect().catch(() => {
        this.tryReconnect()
      })
    }, delay)
  }

  // 心跳：仅检测死连接，不断开
  private startHeartbeat(): void {
    this.lastMessageTime = Date.now()
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const silence = Date.now() - this.lastMessageTime
        if (silence > this.heartbeatInterval * 3) {
          // 90 秒无任何消息，连接可能已死
          this.log(`No messages for ${silence}ms, connection may be dead`)
          // Don't close - let the OS/TCP layer detect it
          // Just log the warning
        }
        // Send a lightweight message to keep the connection alive
        // Use "status" method which is a valid Gateway RPC call
        try {
          this.ws.send(JSON.stringify({
            jsonrpc: '2.0',
            id: this.generateId(),
            method: 'status',
            params: {},
          }))
        } catch {
          // Connection is dead
        }
      }
    }, this.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

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

  private handleMessage(data: string): void {
    try {
      const msg = JSON.parse(data)

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

      if (msg.method) {
        const handlers = this.eventHandlers.get(msg.method)
        if (handlers) {
          handlers.forEach((h) => h(msg.params))
        }
      }
    } catch {
      // Ignore
    }
  }

  on(event: string, handler: Function): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
    return () => { this.eventHandlers.get(event)?.delete(handler) }
  }

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
    this.stopHeartbeat()
    this.ws?.close(1000, 'User disconnect')
    this.ws = null
    this.rejectAllPending()
  }
}

export const gatewayService = GatewayService.getInstance()
