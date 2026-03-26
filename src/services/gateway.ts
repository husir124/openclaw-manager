// Gateway WebSocket 服务
// TODO: 实现完整的 WebSocket 连接和 RPC 调用

export class GatewayService {
  private ws: WebSocket | null = null

  async connect(_url: string, _token: string): Promise<void> {
    // TODO: 实现连接
  }

  disconnect(): void {
    this.ws?.close()
    this.ws = null
  }

  async request<T>(_method: string, _params?: object): Promise<T> {
    // TODO: 实现 RPC 调用
    throw new Error('Not implemented')
  }
}

export const gatewayService = new GatewayService()
