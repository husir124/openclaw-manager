import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'

type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextType {
  themeMode: ThemeMode
  isDark: boolean
  setThemeMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  isDark: false,
  setThemeMode: () => {},
})

function getResolvedTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

export function ThemeContextProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('ocm-theme') as ThemeMode) || 'system'
  })

  const [isDark, setIsDark] = useState(() =>
    getResolvedTheme((localStorage.getItem('ocm-theme') as ThemeMode) || 'system')
  )

  // 监听系统主题变化
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (themeMode === 'system') {
        setIsDark(mq.matches)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [themeMode])

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode)
    localStorage.setItem('ocm-theme', mode)
    setIsDark(getResolvedTheme(mode))
  }, [])

  // 应用 body 样式
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

  const value = useMemo(() => ({ themeMode, isDark, setThemeMode }), [themeMode, isDark, setThemeMode])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
