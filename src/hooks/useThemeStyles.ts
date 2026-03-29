/**
 * 主题样式工具 Hook - 用 antd token 替代硬编码颜色
 *
 * 在需要根据主题切换样式的组件中使用：
 * const styles = useThemeStyles()
 * <div style={{ background: styles.cardBg, color: styles.text }}>
 *
 * 优先使用 antd 组件内置的 token 支持，此 hook 仅在需要自定义样式时使用
 */
import { theme as antdTheme } from 'antd'
import { useTheme } from '../contexts/ThemeContext'

export function useThemeStyles() {
  const { isDark } = useTheme()
  const { token } = antdTheme.useToken()

  return {
    /** 当前是否暗色 */
    isDark,
    /** 页面背景色 */
    pageBg: isDark ? '#000' : '#f5f5f5',
    /** 卡片/容器背景色 */
    cardBg: isDark ? token.colorBgContainer : '#fff',
    /** 主文字色 */
    text: token.colorText,
    /** 次要文字色 */
    textSecondary: token.colorTextSecondary,
    /** 边框色 */
    border: token.colorBorderSecondary,
    /** 悬浮背景色 */
    hoverBg: token.colorBgTextHover,
    /** 主题色 */
    primary: token.colorPrimary,
    /** 成功色 */
    success: token.colorSuccess,
    /** 警告色 */
    warning: token.colorWarning,
    /** 错误色 */
    error: token.colorError,
    /** antd token 对象（高级用法） */
    token,
  }
}
