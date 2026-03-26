// Gateway 连接状态（用于 UI 显示，不使用 WebSocket）
// Gateway 状态通过 Tauri 命令（check_gateway_status）检测

import { create } from 'zustand'

type GatewayProcessStatus = 'unknown' | 'running' | 'stopped'

interface GatewayState {
  processStatus: GatewayProcessStatus
  port: number
  pid: number | null
  setProcessStatus: (status: GatewayProcessStatus, port?: number, pid?: number | null) => void
}

export const useGatewayStore = create<GatewayState>((set) => ({
  processStatus: 'unknown',
  port: 18789,
  pid: null,
  setProcessStatus: (processStatus, port = 18789, pid = null) => set({ processStatus, port, pid }),
}))
