import { useState } from 'react'
import { Layout, Menu, Typography, Tag } from 'antd'
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
} from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

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
  { key: '/backup', icon: <FolderOutlined />, label: 'Backup' },
  { key: '/config', icon: <CodeOutlined />, label: 'Config' },
  { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
]

export default function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()

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
          <Tag color="green">Gateway 运行中</Tag>
        </Header>
        <Content style={{ padding: 24, overflow: 'auto', background: '#fafafa' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
