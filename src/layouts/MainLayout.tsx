import { useState, useEffect } from 'react'
import { Layout, Menu, Typography, Badge, Tag, Modal } from 'antd'
import {
  DashboardOutlined,
  MessageOutlined,
  CloudServerOutlined,
  ApiOutlined,
  RobotOutlined,
  AppstoreOutlined,
  HeartOutlined,
  SettingOutlined,
  RocketOutlined,
} from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useGatewayStore } from '../stores/gatewayStore'
import { checkGatewayStatus } from '../services/tauri'

const { Header, Sider, Content } = Layout
const { Title, Text } = Typography

const menuItems = [
  { key: '/setup', icon: <RocketOutlined />, label: 'Setup' },
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/chat', icon: <MessageOutlined />, label: 'Chat' },
  { key: '/models', icon: <CloudServerOutlined />, label: 'Models' },
  { key: '/channels', icon: <ApiOutlined />, label: 'Channels' },
  { key: '/agents', icon: <RobotOutlined />, label: 'Agents' },
  { key: '/skills', icon: <AppstoreOutlined />, label: 'Skills' },
  { key: '/health', icon: <HeartOutlined />, label: 'Health' },
  { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
]

export default function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { processStatus, port, pid, setProcessStatus } = useGatewayStore()
  const [showInfo, setShowInfo] = useState(false)

  // Poll Gateway status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await checkGatewayStatus()
        setProcessStatus(
          status.running ? 'running' : 'stopped',
          status.port,
          status.pid
        )
      } catch {
        setProcessStatus('unknown')
      }
    }
    checkStatus()
    const interval = setInterval(checkStatus, 10000) // Check every 10s
    return () => clearInterval(interval)
  }, [setProcessStatus])

  const statusColor = processStatus === 'running' ? 'green' : processStatus === 'stopped' ? 'default' : 'orange'
  const statusText = processStatus === 'running' ? `Gateway :${port}` : processStatus === 'stopped' ? 'Gateway stopped' : 'Checking...'

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
          <div
            style={{ cursor: 'pointer' }}
            onClick={() => setShowInfo(true)}
          >
            <Badge color={statusColor} text={<Text style={{ fontSize: 12 }}>{statusText}</Text>} />
          </div>
        </Header>
        <Content style={{ padding: 24, overflow: 'auto', background: '#fafafa' }}>
          <Outlet />
        </Content>
      </Layout>

      <Modal
        title="System Status"
        open={showInfo}
        onCancel={() => setShowInfo(false)}
        footer={null}
      >
        <div style={{ lineHeight: 2 }}>
          <div>Gateway Status: <Tag color={statusColor}>{processStatus}</Tag></div>
          <div>Port: {port}</div>
          {pid && <div>PID: {pid}</div>}
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">
              OpenClaw Manager checks Gateway status every 10 seconds via system process detection.
            </Text>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
