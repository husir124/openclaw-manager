/**
 * 仪表盘页面
 *
 * 显示 OpenClaw 运行状态概览：
 * - Gateway 状态（运行中/已停止）
 * - Agent 数量、渠道数量
 * - Node.js / OpenClaw 版本
 * - 快捷操作入口
 *
 * 数据来源：checkGatewayStatus() + readConfig()
 */
import { useState, useEffect } from 'react'
import { Typography, Card, Spin, Space, Tag, Statistic, Row, Col, Button, Alert } from 'antd'
import {
  RobotOutlined,
  CloudServerOutlined,
  ApiOutlined,
  RocketOutlined,
  LinkOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { checkNodeVersion, checkOpenClawInstalled, checkGatewayStatus, listConfigSections } from '../../services/tauri'

const { Title, Text } = Typography

interface SystemStatus {
  node: { installed: boolean; version: string | null }
  openclaw: { installed: boolean; version: string | null }
  gateway: { running: boolean; port: number }
  agentCount: number
  channelCount: number
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<SystemStatus | null>(null)

  const loadStatus = async () => {
    setLoading(true)
    try {
      const [node, oc, gw, sections] = await Promise.all([
        checkNodeVersion(),
        checkOpenClawInstalled(),
        checkGatewayStatus(),
        listConfigSections().catch(() => []),
      ])

      // Count agents and channels from config sections
      const agentsSection = sections.find((s) => s.name === 'agents')
      const channelsSection = sections.find((s) => s.name === 'channels')
      const agentList = (agentsSection?.value as Record<string, unknown>)?.list as Array<unknown> || []
      const channelKeys = Object.keys((channelsSection?.value as Record<string, unknown>) || {})

      setStatus({
        node: { installed: node.installed, version: node.version },
        openclaw: { installed: oc.installed, version: oc.version },
        gateway: { running: gw.running, port: gw.port },
        agentCount: agentList.length,
        channelCount: channelKeys.length,
      })
    } catch (err) {
      console.error('Failed to load status:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadStatus() }, [])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!status) {
    return <Alert type="error" message="Failed to load system status" />
  }

  const allReady = status.node.installed && status.openclaw.installed && status.gateway.running

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Dashboard</Title>
        <Button icon={<SyncOutlined />} onClick={loadStatus}>Refresh</Button>
      </div>

      {!allReady && (
        <Alert
          type="warning"
          message="System not fully configured"
          description="Some components are missing or not running. Go to Setup to fix."
          action={<Button size="small" type="primary" onClick={() => navigate('/setup')}>Go to Setup</Button>}
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Node.js"
              value={status.node.version || 'Not installed'}
              prefix={<CloudServerOutlined />}
              valueStyle={{ color: status.node.installed ? '#52c41a' : '#ff4d4f', fontSize: 16 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="OpenClaw"
              value={status.openclaw.version || 'Not installed'}
              prefix={<RocketOutlined />}
              valueStyle={{ color: status.openclaw.installed ? '#52c41a' : '#ff4d4f', fontSize: 16 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Gateway"
              value={status.gateway.running ? `Running :${status.gateway.port}` : 'Stopped'}
              prefix={<ApiOutlined />}
              valueStyle={{ color: status.gateway.running ? '#52c41a' : '#999', fontSize: 16 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Agents"
              value={status.agentCount}
              prefix={<RobotOutlined />}
              valueStyle={{ fontSize: 16 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card
            title="Quick Actions"
            size="small"
          >
            <Space wrap>
              <Button onClick={() => navigate('/setup')}>Setup</Button>
              <Button onClick={() => navigate('/config')}>Edit Config</Button>
              <Button onClick={() => navigate('/agents')}>Manage Agents</Button>
              {status.gateway.running && (
                <Button
                  type="primary"
                  icon={<LinkOutlined />}
                  onClick={() => window.open('http://127.0.0.1:18789', '_blank')}
                >
                  Open Control UI
                </Button>
              )}
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="System Info" size="small">
            <div style={{ lineHeight: 2 }}>
              <div>Channels: <Tag>{status.channelCount}</Tag></div>
              <div>Agents: <Tag>{status.agentCount}</Tag></div>
              <div>Gateway Port: <Tag>{status.gateway.port}</Tag></div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
