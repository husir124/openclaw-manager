import { Routes, Route, Navigate } from 'react-router-dom'
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
  )
}
