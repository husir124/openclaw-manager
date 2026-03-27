import { createContext, useContext, useState, ReactNode } from 'react'

type Language = 'zh' | 'en'

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
}

const I18nContext = createContext<I18nContextType>({
  language: 'zh',
  setLanguage: () => {},
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('ocm-language')
    return (saved === 'en' ? 'en' : 'zh') as Language
  })

  const handleSetLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('ocm-language', lang)
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage: handleSetLanguage }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
