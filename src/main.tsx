import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import './index.css'

function Root() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('ocm-theme')
    if (saved === 'dark') return true
    if (saved === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    // 监听 localStorage 变化
    const handleStorage = () => {
      const saved = localStorage.getItem('ocm-theme')
      if (saved === 'dark') setIsDark(true)
      else if (saved === 'light') setIsDark(false)
      else setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
    }

    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const saved = localStorage.getItem('ocm-theme')
      if (saved === 'system' || !saved) {
        setIsDark(mediaQuery.matches)
      }
    }

    window.addEventListener('storage', handleStorage)
    mediaQuery.addEventListener('change', handleChange)

    // 监听自定义事件（同一页面的主题切换）
    window.addEventListener('theme-change', handleStorage)

    return () => {
      window.removeEventListener('storage', handleStorage)
      mediaQuery.removeEventListener('change', handleChange)
      window.removeEventListener('theme-change', handleStorage)
    }
  }, [])

  return (
    <React.StrictMode>
      <BrowserRouter>
        <ConfigProvider
          locale={zhCN}
          theme={{
            algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          }}
        >
          <App />
        </ConfigProvider>
      </BrowserRouter>
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />)
