import { useState } from 'react'
import { Layout, Menu, Typography, Badge, Modal, Input, Button, Space, Alert } from 'antd'
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
  LinkOutlined,
  DisconnectOutlined,
} from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useGatewayStore } from '../stores/gatewayStore'
import { useGateway } from '../hooks/useGateway'

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

const statusConfig = {
  disconnected: { color: '#ff4d4f', text: 'Disconnected' },
  connecting: { color: '#faad14', text: 'Connecting...' },
  connected: { color: '#52c41a', text: 'Connected' },
  reconnecting: { color: '#faad14', text: 'Reconnecting...' },
}

export default function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { status, url, token, error, setUrl, setToken } = useGatewayStore()
  const { connect, disconnect } = useGateway()
  const [modalOpen, setModalOpen] = useState(false)
  const [connectLoading, setConnectLoading] = useState(false)
  const [inputUrl, setInputUrl] = useState(url)
  const [inputToken, setInputToken] = useState(token)

  const handleConnect = async () => {
    setConnectLoading(true)
    try {
      setUrl(inputUrl)
      setToken(inputToken)
      await connect(inputUrl, inputToken)
      setModalOpen(false)
    } catch {
      // error is handled by the hook
    } finally {
      setConnectLoading(false)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setModalOpen(false)
  }

  const sc = statusConfig[status]

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider width={200} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>{'{'} OpenClaw {'}'}</Title>
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
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            onClick={() => {
              setInputUrl(url)
              setInputToken(token)
              setModalOpen(true)
            }}
          >
            <Badge color={sc.color} text={<Text style={{ fontSize: 12 }}>{sc.text}</Text>} />
          </div>
        </Header>
        <Content style={{ padding: 24, overflow: 'auto', background: '#fafafa' }}>
          <Outlet />
        </Content>
      </Layout>

      <Modal
        title="Gateway Connection"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={480}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text type="secondary">WebSocket URL</Text>
            <Input
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="ws://127.0.0.1:18789"
            />
          </div>
          <div>
            <Text type="secondary">Gateway Token</Text>
            <Input.Password
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              placeholder="Token from openclaw.json"
            />
          </div>

          {error && <Alert type="error" message={error} showIcon />}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {status === 'connected' && (
              <Button icon={<DisconnectOutlined />} onClick={handleDisconnect}>
                Disconnect
              </Button>
            )}
            <Button
              type="primary"
              icon={<LinkOutlined />}
              loading={connectLoading}
              onClick={handleConnect}
              disabled={!inputUrl || !inputToken}
            >
              {status === 'connected' ? 'Reconnect' : 'Connect'}
            </Button>
          </div>
        </Space>
      </Modal>
    </Layout>
  )
}
