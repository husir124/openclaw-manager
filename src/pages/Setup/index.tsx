import { useState, useEffect } from 'react'
import { Card, Typography, Tag, Button, Spin, Space, Steps, Divider, Alert } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  CloudServerOutlined,
  ApiOutlined,
  RocketOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { checkNodeVersion, checkOpenClawInstalled, checkGatewayStatus, startGateway } from '../../services/tauri'
import type { NodeInfo, OpenClawInfo, GatewayStatus } from '../../types/openclaw'

const { Title, Text } = Typography

export default function SetupPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [nodeInfo, setNodeInfo] = useState<NodeInfo | null>(null)
  const [openclawInfo, setOpenclawInfo] = useState<OpenClawInfo | null>(null)
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const detectAll = async () => {
    setLoading(true)
    try {
      const [node, oc, gw] = await Promise.all([
        checkNodeVersion(),
        checkOpenClawInstalled(),
        checkGatewayStatus(),
      ])
      setNodeInfo(node)
      setOpenclawInfo(oc)
      setGatewayStatus(gw)
    } catch (err) {
      console.error('Detection failed:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    detectAll()
  }, [])

  const handleStartGateway = async () => {
    setActionLoading('gateway')
    try {
      await startGateway()
      await detectAll()
    } catch (err) {
      console.error('Start gateway failed:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const allReady = nodeInfo?.meets_minimum && openclawInfo?.installed && gatewayStatus?.running

  const getStepStatus = () => {
    if (!nodeInfo?.installed) return 0
    if (!openclawInfo?.installed) return 1
    if (!gatewayStatus?.running) return 2
    return 3
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Title level={3}>OpenClaw Manager - Setup</Title>
      <Text type="secondary">Detect your environment</Text>

      <Divider />

      <Steps
        current={getStepStatus()}
        status={allReady ? 'finish' : 'process'}
        items={[
          { title: 'Node.js', description: 'Runtime' },
          { title: 'OpenClaw', description: 'AI Platform' },
          { title: 'Gateway', description: 'Service Running' },
          { title: 'Done', description: 'Ready to use' },
        ]}
      />

      <div style={{ marginTop: 24 }}>
        {loading ? (
          <Card>
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
              <div style={{ marginTop: 16 }}>Detecting environment...</div>
            </div>
          </Card>
        ) : (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* Node.js */}
            <Card
              title={<Space><CloudServerOutlined /> Node.js</Space>}
              extra={
                nodeInfo?.installed ? (
                  <Tag color="success" icon={<CheckCircleOutlined />}>Installed</Tag>
                ) : (
                  <Tag color="error" icon={<CloseCircleOutlined />}>Not Found</Tag>
                )
              }
            >
              {nodeInfo?.installed ? (
                <Space direction="vertical">
                  <Text>Version: <strong>{nodeInfo.version}</strong></Text>
                  {nodeInfo.meets_minimum ? (
                    <Text type="success">{'Version OK (>= 22.14)'}</Text>
                  ) : (
                    <Alert type="warning" message="Version too low, upgrade to Node.js 24" showIcon />
                  )}
                </Space>
              ) : (
                <Alert type="error" message="Node.js not found" description="Install Node.js 24+: https://nodejs.org" showIcon />
              )}
            </Card>

            {/* OpenClaw */}
            <Card
              title={<Space><RocketOutlined /> OpenClaw</Space>}
              extra={
                openclawInfo?.installed ? (
                  <Tag color="success" icon={<CheckCircleOutlined />}>Installed</Tag>
                ) : (
                  <Tag color="error" icon={<CloseCircleOutlined />}>Not Found</Tag>
                )
              }
            >
              {openclawInfo?.installed ? (
                <Space direction="vertical">
                  <Text>Version: <strong>{openclawInfo.version}</strong></Text>
                  {openclawInfo.path && (
                    <Text type="secondary" style={{ fontSize: 12 }}>Path: {openclawInfo.path}</Text>
                  )}
                </Space>
              ) : (
                <Space direction="vertical">
                  <Alert type="warning" message="OpenClaw not installed" showIcon />
                  <Button type="primary" onClick={() => window.open('https://docs.openclaw.ai/start/getting-started', '_blank')}>
                    Installation Guide
                  </Button>
                </Space>
              )}
            </Card>

            {/* Gateway */}
            <Card
              title={<Space><ApiOutlined /> Gateway</Space>}
              extra={
                gatewayStatus?.running ? (
                  <Tag color="success" icon={<CheckCircleOutlined />}>Running</Tag>
                ) : (
                  <Tag color="default" icon={<CloseCircleOutlined />}>Stopped</Tag>
                )
              }
            >
              {gatewayStatus?.running ? (
                <Space direction="vertical">
                  <Text>Port: <strong>{gatewayStatus.port}</strong></Text>
                  {gatewayStatus.pid && <Text type="secondary">PID: {gatewayStatus.pid}</Text>}
                </Space>
              ) : (
                <Space direction="vertical">
                  <Text>Gateway is not running</Text>
                  <Button
                    type="primary"
                    icon={<SyncOutlined />}
                    loading={actionLoading === 'gateway'}
                    onClick={handleStartGateway}
                    disabled={!openclawInfo?.installed}
                  >
                    Start Gateway
                  </Button>
                </Space>
              )}
            </Card>
          </Space>
        )}
      </div>

      {allReady && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Alert type="success" message="All environment ready!" showIcon />
          <Button type="primary" size="large" style={{ marginTop: 16 }} onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      )}

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Button type="link" onClick={detectAll} loading={loading}>
          <SyncOutlined /> Re-detect
        </Button>
      </div>
    </div>
  )
}
