import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Tauri 环境变量处理（专家建议 #11）
  envPrefix: ['VITE_', 'TAURI_'],

  // 避免 Vite 遮蔽 Tauri 的环境变量
  clearScreen: false,
  server: {
    // Tauri 在固定端口上需要 strictPort
    strictPort: true,
    port: 5173,

    // 代理 /gateway 到 OpenClaw Gateway（用于嵌入官方 Control UI）
    proxy: {
      '/gateway': {
        target: 'http://127.0.0.1:18789',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
