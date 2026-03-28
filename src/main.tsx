/**
 * OpenClaw Manager - 前端入口
 *
 * 渲染层次：React.StrictMode → BrowserRouter → ThemeProvider → ConfigProvider → App
 *
 * 主题切换原理：
 * - ThemeProvider 管理 isDark 状态（light/dark/system）
 * - ConfigProvider 通过 key={String(isDark)} 强制重建，确保 antd 暗色算法完全生效
 * - 所有组件通过 useTheme() hook 读取当前主题
 */
import React, { useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import './index.css'

// === Theme ===
type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextType {
  themeMode: ThemeMode
  isDark: boolean
  setThemeMode: (mode: ThemeMode) => void
}

const ThemeContext = React.createContext<ThemeContextType>({
  themeMode: 'system',
  isDark: false,
  setThemeMode: () => {},
})

export function useTheme() {
  return React.useContext(ThemeContext)
}

function resolveTheme(mode: ThemeMode): boolean {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return mode === 'dark'
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() =>
    (localStorage.getItem('ocm-theme') as ThemeMode) || 'system'
  )
  const [isDark, setIsDark] = useState(() =>
    resolveTheme((localStorage.getItem('ocm-theme') as ThemeMode) || 'system')
  )

  useEffect(() => {
    if (themeMode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => setIsDark(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [themeMode])

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode)
    localStorage.setItem('ocm-theme', mode)
    setIsDark(resolveTheme(mode))
  }, [])

  // Apply body styles
  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.setAttribute('data-theme', 'dark')
      document.body.style.background = '#141414'
      document.body.style.color = 'rgba(255,255,255,0.88)'
    } else {
      root.setAttribute('data-theme', 'light')
      document.body.style.background = '#f5f5f5'
      document.body.style.color = 'rgba(0,0,0,0.88)'
    }
  }, [isDark])

  const value = useMemo(() => ({ themeMode, isDark, setThemeMode }), [themeMode, isDark, setThemeMode])

  // Use boolean key to force full remount on theme change
  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider
        key={String(isDark)}
        locale={zhCN}
        theme={{
          algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: { borderRadius: 6 },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  )
}

function Root() {
  return (
    <React.StrictMode>
      <BrowserRouter>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />)
