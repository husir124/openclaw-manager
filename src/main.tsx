import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { ThemeContextProvider, useTheme } from './contexts/ThemeContext'
import App from './App'
import './index.css'

function ThemedApp({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme()

  return (
    <ConfigProvider
      key={isDark ? 'dark' : 'light'}
      locale={zhCN}
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: { borderRadius: 6 },
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
        <ThemeContextProvider>
          <ThemedApp>
            <App />
          </ThemedApp>
        </ThemeContextProvider>
      </BrowserRouter>
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />)
