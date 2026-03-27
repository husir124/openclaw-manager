import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Language, getCurrentLanguage, setLanguage, t, TranslationKey } from '../i18n'

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nContextType>({
  language: 'zh',
  setLanguage: () => {},
  t: (key) => key,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getCurrentLanguage())

  const handleSetLanguage = (lang: Language) => {
    setLanguageState(lang)
    setLanguage(lang)
    // 触发语言变化事件
    window.dispatchEvent(new CustomEvent('language-change', { detail: lang }))
  }

  useEffect(() => {
    // 监听语言变化
    const handleStorage = () => {
      setLanguageState(getCurrentLanguage())
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('language-change', handleStorage)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('language-change', handleStorage)
    }
  }, [])

  const translate = (key: TranslationKey): string => {
    return t(key, language)
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage: handleSetLanguage, t: translate }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
