import { useState, useEffect, useCallback } from 'react'
import { gatewayService } from '../services/gateway'

export interface GatewayState {
  connected: boolean
  connecting: boolean
  error: string | null
}

export function useGateway() {
  const [state, setState] = useState<GatewayState>({
    connected: false,
    connecting: false,
    error: null,
  })

  // 连接 Gateway
  const connect = useCallback(async (token?: string) => {
    setState(prev => ({ ...prev, connecting: true, error: null }))

    try {
      await gatewayService.connect(token)
      setState({ connected: true, connecting: false, error: null })
    } catch (error) {
      setState({
        connected: false,
        connecting: false,
        error: error instanceof Error ? error.message : '连接失败',
      })
    }
  }, [])

  // 断开连接
  const disconnect = useCallback(() => {
    gatewayService.disconnect()
    setState({ connected: false, connecting: false, error: null })
  }, [])

  // 发送请求
  const request = useCallback(async <T>(method: string, params?: Record<string, unknown>): Promise<T> => {
    return gatewayService.request<T>(method, params)
  }, [])

  // 订阅事件
  const on = useCallback((event: string, handler: (data: unknown) => void): (() => void) => {
    return gatewayService.on(event, handler)
  }, [])

  // 检查连接状态
  useEffect(() => {
    const checkConnection = () => {
      setState(prev => ({
        ...prev,
        connected: gatewayService.isConnected(),
      }))
    }

    checkConnection()
    const interval = setInterval(checkConnection, 5000)

    return () => clearInterval(interval)
  }, [])

  return {
    ...state,
    connect,
    disconnect,
    request,
    on,
  }
}
