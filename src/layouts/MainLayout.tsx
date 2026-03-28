import { useState, useEffect, useCallback } from 'react'
import { Layout, Menu, Typography, Tag, Space } from 'antd'
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

const { Header, Sider, Content } = Layout
const { Title } = Typography

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
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus>('loading')
  const [gatewayPort, setGatewayPort] = useState<number>(18789)

  // 检查是否需要显示引导
  useEffect(() => {
    const completed = localStorage.getItem('ocm-onboarding-completed')
    if (!completed) {
      setShowOnboarding(true)
    }
  }, [])

  // 检测 Gateway 状态
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
    const timer = setInterval(refreshGatewayStatus, 30000) // 30 秒刷新
    return () => clearInterval(timer)
  }, [refreshGatewayStatus])

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    refreshGatewayStatus()
  }

  const renderGatewayTag = () => {
    switch (gatewayStatus) {
      case 'loading':
        return (
          <Tag icon={<LoadingOutlined spin />} color="processing">
            检测中
          </Tag>
        )
      case 'running':
        return (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Gateway 运行中 :{gatewayPort}
          </Tag>
        )
      case 'stopped':
        return (
          <Tag icon={<CloseCircleOutlined />} color="default">
            Gateway 未运行
          </Tag>
        )
      case 'error':
        return (
          <Tag icon={<CloseCircleOutlined />} color="error">
            Gateway 检测失败
          </Tag>
        )
    }
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider width={200} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>{'{'} OC {'}'}</Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Title level={5} style={{ margin: 0 }}>OpenClaw Manager</Title>
          <Space>
            {renderGatewayTag()}
          </Space>
        </Header>
        <Content style={{ padding: 24, overflow: 'auto', background: '#fafafa' }}>
          <Outlet />
        </Content>
      </Layout>

      {showOnboarding && (
        <OnboardingGuide onComplete={handleOnboardingComplete} />
      )}
    </Layout>
  )
}
