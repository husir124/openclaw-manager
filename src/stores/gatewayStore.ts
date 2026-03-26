import { create } from 'zustand'
import type { ConnectionStatus } from '../services/gateway'

interface GatewayState {
  status: ConnectionStatus
  url: string
  token: string
  error: string | null
  connectedAt: number | null
  lastCloseCode: number | null
  setStatus: (status: ConnectionStatus) => void
  setUrl: (url: string) => void
  setToken: (token: string) => void
  setError: (error: string | null) => void
  setLastCloseCode: (code: number | null) => void
  reset: () => void
}

export const useGatewayStore = create<GatewayState>((set) => ({
  status: 'disconnected',
  url: 'ws://127.0.0.1:18789',
  token: '',
  error: null,
  connectedAt: null,
  lastCloseCode: null,
  setStatus: (status) => set({
    status,
    connectedAt: status === 'connected' ? Date.now() : null,
  }),
  setUrl: (url) => set({ url }),
  setToken: (token) => set({ token }),
  setError: (error) => set({ error }),
  setLastCloseCode: (code) => set({ lastCloseCode: code }),
  reset: () => set({
    status: 'disconnected',
    error: null,
    connectedAt: null,
    lastCloseCode: null,
  }),
}))
