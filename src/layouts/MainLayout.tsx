import { Layout, Menu, Typography, Badge } from 'antd'
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
import { useAppStore } from '../stores/appStore'

const { Header, Sider, Content } = Layout
const { Title } = Typography

const menuItems = [
  { key: '/setup', icon: <RocketOutlined />, label: 'Setup' },
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/chat', icon: <MessageOutlined />, label: '聊天' },
  { key: '/models', icon: <CloudServerOutlined />, label: '模型配置' },
  { key: '/channels', icon: <ApiOutlined />, label: '渠道配置' },
  { key: '/agents', icon: <RobotOutlined />, label: 'Agent 管理' },
  { key: '/skills', icon: <AppstoreOutlined />, label: 'Skill 市场' },
  { key: '/health', icon: <HeartOutlined />, label: '健康监控' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
]

export default function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const connected = useAppStore((s) => s.connected)

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider width={200} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>🦞 OpenClaw</Title>
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
        <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={5} style={{ margin: 0 }}>OpenClaw Manager</Title>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge
              status={connected ? 'success' : 'error'}
              text={connected ? '已连接' : '未连接'}
            />
          </div>
        </Header>
        <Content style={{ padding: 24, overflow: 'auto', background: '#fafafa' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
