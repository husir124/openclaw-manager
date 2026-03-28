import React, { useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import './index.css'

type ThemeMode = 'light' | 'dark' | 'system'

function getResolvedTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

export interface ThemeContextType {
  themeMode: ThemeMode
  isDark: boolean
  setThemeMode: (mode: ThemeMode) => void
}

// 使用 React 状态管理主题，确保 ConfigProvider 正确响应
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('ocm-theme') as ThemeMode) || 'system'
  })
  const [isDark, setIsDark] = useState(() => getResolvedTheme(
    (localStorage.getItem('ocm-theme') as ThemeMode) || 'system'
  ))

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (themeMode === 'system') {
        setIsDark(mediaQuery.matches)
      }
    }
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [themeMode])

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode)
    localStorage.setItem('ocm-theme', mode)
    setIsDark(getResolvedTheme(mode))
  }, [])

  // 应用 CSS 变量到 body（处理非 Ant Design 元素）
  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.setAttribute('data-theme', 'dark')
      document.body.style.background = '#141414'
      document.body.style.color = 'rgba(255, 255, 255, 0.88)'
    } else {
      root.setAttribute('data-theme', 'light')
      document.body.style.background = '#f5f5f5'
      document.body.style.color = 'rgba(0, 0, 0, 0.88)'
    }
  }, [isDark])

  // 暴露给 window 供其他组件读取
  useEffect(() => {
    ;(window as unknown as Record<string, unknown>).__ocm_theme__ = { themeMode, isDark, setThemeMode }
  }, [themeMode, isDark, setThemeMode])

  return (
    <ConfigProvider
      key={isDark ? 'dark' : 'light'}
      locale={zhCN}
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          borderRadius: 6,
        },
      }}
    >
      {children}
    </ConfigProvider>
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
