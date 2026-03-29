/**
 * 主题上下文 - 统一管理 light/dark/system 主题切换
 *
 * 提供：
 * - themeMode: 'light' | 'dark' | 'system' - 用户选择的模式
 * - isDark: boolean - 当前是否为暗色
 * - setThemeMode: (mode) => void - 切换主题
 *
 * 使用方式：
 * import { useTheme } from '../contexts/ThemeContext'
 * const { isDark, themeMode, setThemeMode } = useTheme()
 */
import { createContext, useContext } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemeContextValue {
  themeMode: ThemeMode
  isDark: boolean
  setThemeMode: (mode: ThemeMode) => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'system',
  isDark: false,
  setThemeMode: () => {},
})

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
