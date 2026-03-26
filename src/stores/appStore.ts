import { create } from 'zustand'

interface AppState {
  connected: boolean
  gatewayUrl: string
  version: string | null
  darkMode: boolean
  setConnected: (connected: boolean) => void
  setGatewayUrl: (url: string) => void
  setVersion: (version: string) => void
  toggleDarkMode: () => void
}

export const useAppStore = create<AppState>((set) => ({
  connected: false,
  gatewayUrl: 'ws://127.0.0.1:18789',
  version: null,
  darkMode: false,
  setConnected: (connected) => set({ connected }),
  setGatewayUrl: (url) => set({ gatewayUrl: url }),
  setVersion: (version) => set({ version }),
  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
}))
