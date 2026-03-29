/**
 * OpenClaw Manager - 前端入口
 *
 * 渲染层次：React.StrictMode → BrowserRouter → ThemeProvider → App
 *
 * ThemeProvider 管理 isDark 状态（light/dark/system），
 * 通过 ConfigProvider 的 key={String(isDark)} 强制重建，确保 antd 暗色算法完全生效。
 */
import React, { useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { ThemeContext, type ThemeMode } from './contexts/ThemeContext'
import App from './App'
import './index.css'

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
