import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import { I18nProvider, useI18n } from './contexts/I18nContext'
import App from './App'
import './index.css'

function AntdProvider({ children }: { children: React.ReactNode }) {
  const { language } = useI18n()
  const antdLocale = language === 'en' ? enUS : zhCN
  return <ConfigProvider locale={antdLocale}>{children}</ConfigProvider>
}

function Root() {
  return (
    <React.StrictMode>
      <BrowserRouter>
        <I18nProvider>
          <AntdProvider>
            <App />
          </AntdProvider>
        </I18nProvider>
      </BrowserRouter>
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />)
