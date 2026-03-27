import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import { I18nProvider } from './contexts/I18nContext'
import { getCurrentLanguage, Language } from './i18n'
import App from './App'
import './index.css'

function Root() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('ocm-theme')
    if (saved === 'dark') return true
    if (saved === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const [language, setLanguageState] = useState<Language>(getCurrentLanguage)

  useEffect(() => {
    // 监听 localStorage 变化
    const handleStorage = () => {
      const saved = localStorage.getItem('ocm-theme')
      if (saved === 'dark') setIsDark(true)
      else if (saved === 'light') setIsDark(false)
      else setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches)

      setLanguageState(getCurrentLanguage())
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

    // 监听自定义事件（同一页面的主题/语言切换）
    window.addEventListener('theme-change', handleStorage)
    window.addEventListener('language-change', handleStorage)

    return () => {
      window.removeEventListener('storage', handleStorage)
      mediaQuery.removeEventListener('change', handleChange)
      window.removeEventListener('theme-change', handleStorage)
      window.removeEventListener('language-change', handleStorage)
    }
  }, [])

  return (
    <React.StrictMode>
      <BrowserRouter>
        <ConfigProvider
          locale={language === 'en' ? enUS : zhCN}
          theme={{
            algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          }}
        >
          <I18nProvider>
            <App />
          </I18nProvider>
        </ConfigProvider>
      </BrowserRouter>
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />)
