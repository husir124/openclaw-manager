import { create } from 'zustand'
import type { ConnectionStatus } from '../services/gateway'

interface GatewayState {
  status: ConnectionStatus
  url: string
  token: string
  error: string | null
  connectedAt: number | null
  setStatus: (status: ConnectionStatus) => void
  setUrl: (url: string) => void
  setToken: (token: string) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useGatewayStore = create<GatewayState>((set) => ({
  status: 'disconnected',
  url: 'ws://127.0.0.1:18789',
  token: '',
  error: null,
  connectedAt: null,
  setStatus: (status) => set({
    status,
    connectedAt: status === 'connected' ? Date.now() : null,
    error: status === 'disconnected' ? null : undefined,
  }),
  setUrl: (url) => set({ url }),
  setToken: (token) => set({ token }),
  setError: (error) => set({ error }),
  reset: () => set({
    status: 'disconnected',
    error: null,
    connectedAt: null,
  }),
}))
