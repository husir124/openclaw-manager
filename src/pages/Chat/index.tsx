// Chat 页面：管理聊天相关配置，聊天本身跳转到官方 Control UI
import { Card, Typography, Button, Space, Alert } from 'antd'
import { MessageOutlined, LinkOutlined, ApiOutlined } from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

export default function ChatPage() {
  const gatewayUrl = 'http://127.0.0.1:18789'

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Title level={3}>
        <MessageOutlined /> Chat
      </Title>
      <Paragraph type="secondary">
        OpenClaw Manager focuses on configuration and management.
        For chatting with your AI assistant, use the official Control UI.
      </Paragraph>

      <Card style={{ marginTop: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={5}><ApiOutlined /> Official Control UI</Title>
            <Paragraph>
              The official Control UI provides full chat functionality including
              streaming responses, tool call visualization, and session management.
            </Paragraph>
            <Button
              type="primary"
              icon={<LinkOutlined />}
              size="large"
              onClick={() => window.open(gatewayUrl, '_blank')}
            >
              Open Control UI ({gatewayUrl})
            </Button>
          </div>

          <Alert
            type="info"
            message="Why a separate Control UI?"
            description="OpenClaw Gateway uses a complex WebSocket protocol with device identity signing, challenge-response handshake, and protocol version negotiation. Rather than reimplementing this, OpenClaw Manager focuses on what it does best: making setup, configuration, and management easy."
            showIcon
          />

          <div>
            <Title level={5}>What OpenClaw Manager provides</Title>
            <ul>
              <li><strong>Setup Wizard</strong> - Detect Node.js, install OpenClaw, start Gateway</li>
              <li><strong>Config Editor</strong> - Visual editor for openclaw.json</li>
              <li><strong>Agent Manager</strong> - Create and manage AI agents</li>
              <li><strong>Health Monitor</strong> - Diagnostics and auto-repair</li>
              <li><strong>Backup & Restore</strong> - Encrypted config backups</li>
            </ul>
          </div>
        </Space>
      </Card>
    </div>
  )
}
