/**
 * 聊天页面
 *
 * OpenClaw Manager 专注于配置和管理，聊天功能通过跳转到
 * 官方 Control UI 实现（Gateway 协议过于复杂，不适合在 Manager 中重新实现）。
 */
import { Card, Typography, Button, Space, Alert } from 'antd'
import { MessageOutlined, LinkOutlined, ApiOutlined } from '@ant-design/icons'

const { Title, Paragraph } = Typography

export default function ChatPage() {
  const gatewayUrl = 'http://127.0.0.1:18789'

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Title level={3}>
        <MessageOutlined /> 聊天
      </Title>
      <Paragraph type="secondary">
        OpenClaw Manager 专注于配置和管理。与 AI 助手聊天，请使用官方 Control UI。
      </Paragraph>

      <Card style={{ marginTop: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={5}><ApiOutlined /> 官方 Control UI</Title>
            <Paragraph>
              官方 Control UI 提供完整的聊天功能，包括流式响应、工具调用可视化和会话管理。
            </Paragraph>
            <Button
              type="primary"
              icon={<LinkOutlined />}
              size="large"
              onClick={() => window.open(gatewayUrl, '_blank')}
            >
              打开 Control UI ({gatewayUrl})
            </Button>
          </div>

          <Alert
            type="info"
            message="为什么要跳转到 Control UI？"
            description="OpenClaw Gateway 使用复杂的 WebSocket 协议，包括设备身份签名、挑战-响应握手和协议版本协商。与其重新实现，OpenClaw Manager 专注于自己擅长的事情：让安装、配置和管理变得简单。"
            showIcon
          />

          <div>
            <Title level={5}>OpenClaw Manager 提供的功能</Title>
            <ul>
              <li><strong>环境检测</strong> — 检测 Node.js、安装 OpenClaw、启动 Gateway</li>
              <li><strong>配置编辑</strong> — 可视化编辑 openclaw.json</li>
              <li><strong>Agent 管理</strong> — 创建和管理 AI Agent</li>
              <li><strong>健康监控</strong> — 系统诊断和自动修复</li>
              <li><strong>备份恢复</strong> — 加密配置备份</li>
            </ul>
          </div>
        </Space>
      </Card>
    </div>
  )
}
