import { useEffect, useCallback } from 'react'
import { gatewayService } from '../services/gateway'
import { useGatewayStore } from '../stores/gatewayStore'
import { readGatewayToken } from '../services/tauri'

export function useGateway() {
  const { status, url, token, setStatus, setToken, setError } = useGatewayStore()

  useEffect(() => {
    const unsub = gatewayService.onStatusChange((newStatus) => {
      setStatus(newStatus)
      // Check for errors from the service
      if (gatewayService.lastError) {
        setError(gatewayService.lastError)
      }
    })
    return unsub
  }, [setStatus, setError])

  useEffect(() => {
    const autoConnect = async () => {
      let currentToken = token
      if (!currentToken) {
        try {
          const result = await readGatewayToken()
          if (result) {
            currentToken = result
            setToken(result)
          }
        } catch {
          // Token not available
        }
      }

      if (currentToken) {
        try {
          await gatewayService.connect(url, currentToken)
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Connection failed'
          setError(msg)
        }
      }
    }

    autoConnect()

    return () => {
      gatewayService.disconnect()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const connect = useCallback(async (connectUrl: string, connectToken: string) => {
    setError(null)
    try {
      await gatewayService.connect(connectUrl, connectToken)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed'
      setError(msg)
      throw err
    }
  }, [setError])

  const disconnect = useCallback(() => {
    gatewayService.disconnect()
  }, [])

  const request = useCallback(<T,>(method: string, params?: object): Promise<T> => {
    return gatewayService.request<T>(method, params)
  }, [])

  const on = useCallback((event: string, handler: Function): (() => void) => {
    return gatewayService.on(event, handler)
  }, [])

  return {
    connected: status === 'connected',
    status,
    connect,
    disconnect,
    request,
    on,
  }
}
