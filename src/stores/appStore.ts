import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  connected: boolean
  gatewayUrl: string
  version: string | null
  setConnected: (connected: boolean) => void
  setGatewayUrl: (url: string) => void
  setVersion: (version: string) => void
}

// 注意: darkMode 已由 main.tsx 的 ThemeProvider + localStorage 管理，这里不再重复
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      connected: false,
      gatewayUrl: 'ws://127.0.0.1:18789',
      version: null,
      setConnected: (connected) => set({ connected }),
      setGatewayUrl: (url) => set({ gatewayUrl: url }),
      setVersion: (version) => set({ version }),
    }),
    {
      name: 'openclaw-manager-app',
      partialize: (state) => ({ gatewayUrl: state.gatewayUrl }),
    }
  )
)
