/**
 * 主布局组件
 *
 * 应用的整体框架：左侧导航 (Sider) + 顶部 Header + 内容区 (Outlet)
 *
 * 功能：
 * - 左侧菜单：11 个页面的导航
 * - Header：应用标题 + Gateway 状态标签（60 秒自动刷新）
 * - OnboardingGuide：首次使用引导弹窗
 * - 主题适配：通过 antd token 和 Sider theme 属性自动适配
 *
 * 所有子页面通过 <Outlet /> 渲染在内容区
 */
import { useState, useEffect, useCallback } from 'react'
import { Layout, Menu, Tag, Space, theme as antdTheme } from 'antd'
import {
  DashboardOutlined,
  MessageOutlined,
  CloudServerOutlined,
  ApiOutlined,
  RobotOutlined,
  AppstoreOutlined,
  HeartOutlined,
  FolderOutlined,
  SettingOutlined,
  RocketOutlined,
  CodeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { OnboardingGuide } from '../components/OnboardingGuide'
import { checkGatewayStatus } from '../services/tauri'
import { useTheme } from '../contexts/ThemeContext'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/setup', icon: <RocketOutlined />, label: 'Setup' },
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/chat', icon: <MessageOutlined />, label: 'Chat' },
  { key: '/models', icon: <CloudServerOutlined />, label: 'Models' },
  { key: '/channels', icon: <ApiOutlined />, label: 'Channels' },
  { key: '/agents', icon: <RobotOutlined />, label: 'Agents' },
  { key: '/skills', icon: <AppstoreOutlined />, label: 'Skills' },
  { key: '/health', icon: <HeartOutlined />, label: 'Health' },
  { key: '/backup', icon: <FolderOutlined />, label: 'Backup' },
  { key: '/config', icon: <CodeOutlined />, label: 'Config' },
  { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
]

type GatewayStatus = 'loading' | 'running' | 'stopped' | 'error'

export default function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const { token } = antdTheme.useToken()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus>('loading')
  const [gatewayPort, setGatewayPort] = useState<number>(18789)

  useEffect(() => {
    const completed = localStorage.getItem('ocm-onboarding-completed')
    if (!completed) setShowOnboarding(true)
  }, [])

  const refreshGatewayStatus = useCallback(async () => {
    try {
      const status = await checkGatewayStatus()
      setGatewayStatus(status.running ? 'running' : 'stopped')
      setGatewayPort(status.port)
    } catch {
      setGatewayStatus('error')
    }
  }, [])

  useEffect(() => {
    refreshGatewayStatus()
    const timer = setInterval(refreshGatewayStatus, 60000)
    return () => clearInterval(timer)
  }, [refreshGatewayStatus])

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    refreshGatewayStatus()
  }

  const renderGatewayTag = () => {
    switch (gatewayStatus) {
      case 'loading':
        return <Tag icon={<LoadingOutlined spin />} color="processing">检测中</Tag>
      case 'running':
        return <Tag icon={<CheckCircleOutlined />} color="success">Gateway 运行中 :{gatewayPort}</Tag>
      case 'stopped':
        return <Tag icon={<CloseCircleOutlined />} color="default">Gateway 未运行</Tag>
      case 'error':
        return <Tag icon={<CloseCircleOutlined />} color="error">Gateway 检测失败</Tag>
    }
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider
        width={200}
        theme={isDark ? 'dark' : 'light'}
        style={{ borderRight: `1px solid ${token.colorBorderSecondary}` }}
      >
        <div style={{
          padding: 16,
          textAlign: 'center',
          color: token.colorText,
          fontSize: 20,
          fontWeight: 'bold',
        }}>
          Hi OpenClaw
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          theme={isDark ? 'dark' : 'light'}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: token.colorBgContainer,
          padding: '0 24px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: token.colorText }}>
            OpenClaw Manager
          </span>
          <Space>{renderGatewayTag()}</Space>
        </Header>
        <Content style={{
          padding: 24,
          overflow: 'auto',
          background: token.colorBgLayout,
        }}>
          <Outlet />
        </Content>
      </Layout>

      {showOnboarding && (
        <OnboardingGuide onComplete={handleOnboardingComplete} />
      )}
    </Layout>
  )
}
