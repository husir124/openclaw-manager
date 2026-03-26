import { useEffect, useCallback } from 'react'
import { gatewayService } from '../services/gateway'
import { useGatewayStore } from '../stores/gatewayStore'
import { readGatewayToken } from '../services/tauri'

export function useGateway() {
  const { status, url, token, setStatus, setToken, setError } = useGatewayStore()

  // Listen to status changes from the service
  useEffect(() => {
    const unsub = gatewayService.onStatusChange((newStatus) => {
      setStatus(newStatus)
    })
    return unsub
  }, [setStatus])

  // Auto-connect on mount
  useEffect(() => {
    const autoConnect = async () => {
      // Try to read token from openclaw.json if not set
      let currentToken = token
      if (!currentToken) {
        try {
          const result = await readGatewayToken()
          if (result) {
            currentToken = result
            setToken(result)
          }
        } catch {
          // Token not available, user needs to enter it manually
        }
      }

      if (currentToken) {
        try {
          await gatewayService.connect(url, currentToken)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Connection failed')
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
      setError(err instanceof Error ? err.message : 'Connection failed')
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
