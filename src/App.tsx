/**
 * 应用路由配置
 *
 * 所有页面嵌套在 MainLayout 中（左侧导航 + 顶部 Header + 内容区）。
 * ErrorBoundary 捕获渲染错误，防止整个应用白屏。
 *
 * 路由表：
 * / → 重定向到 /dashboard
 * /setup     - 环境检测
 * /dashboard - 仪表盘
 * /chat      - 聊天（跳转官方 Control UI）
 * /models    - 模型配置
 * /channels  - 渠道配置
 * /agents    - Agent 管理
 * /skills    - Skill 市场
 * /health    - 健康监控
 * /backup    - 备份恢复
 * /config    - 配置编辑
 * /settings  - 设置
 */
import { Routes, Route, Navigate } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import MainLayout from './layouts/MainLayout'
import SetupPage from './pages/Setup'
import DashboardPage from './pages/Dashboard'
import ChatPage from './pages/Chat'
import ModelsPage from './pages/Models'
import ChannelsPage from './pages/Channels'
import AgentsPage from './pages/Agents'
import SkillsPage from './pages/Skills'
import HealthPage from './pages/Health'
import BackupPage from './pages/Backup'
import ConfigPage from './pages/Config'
import SettingsPage from './pages/Settings'

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/models" element={<ModelsPage />} />
          <Route path="/channels" element={<ChannelsPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="/backup" element={<BackupPage />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}
