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
import { checkNodeVersion, checkOpenClawInstalled, checkGatewayStatus, startGateway } from '../services/tauri'
import type { NodeInfo, OpenClawInfo, GatewayStatus } from '../types/openclaw'

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
      <Title level={3}>🦞 安装向导</Title>
      <Text type="secondary">检测你的环境，确保 OpenClaw 正常运行</Text>

      <Divider />

      <Steps
        current={getStepStatus()}
        status={allReady ? 'finish' : 'process'}
        items={[
          { title: 'Node.js', description: '运行环境' },
          { title: 'OpenClaw', description: 'AI 助手平台' },
          { title: 'Gateway', description: '服务运行中' },
          { title: '完成', description: '可以使用了' },
        ]}
      />

      <div style={{ marginTop: 24 }}>
        {loading ? (
          <Card>
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
              <div style={{ marginTop: 16 }}>正在检测环境...</div>
            </div>
          </Card>
        ) : (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* Node.js */}
            <Card
              title={
                <Space>
                  <CloudServerOutlined />
                  Node.js
                </Space>
              }
              extra={
                nodeInfo?.installed ? (
                  <Tag color="success" icon={<CheckCircleOutlined />}>已安装</Tag>
                ) : (
                  <Tag color="error" icon={<CloseCircleOutlined />}>未安装</Tag>
                )
              }
            >
              {nodeInfo?.installed ? (
                <Space direction="vertical">
                  <Text>版本: <strong>{nodeInfo.version}</strong></Text>
                  {nodeInfo.meets_minimum ? (
                    <Text type="success">✅ 版本满足最低要求 (≥ 22.14)</Text>
                  ) : (
                    <Alert
                      type="warning"
                      message="版本过低，建议升级到 Node.js 24"
                      showIcon
                    />
                  )}
                </Space>
              ) : (
                <Alert
                  type="error"
                  message="未检测到 Node.js"
                  description="请先安装 Node.js 24+: https://nodejs.org"
                  showIcon
                />
              )}
            </Card>

            {/* OpenClaw */}
            <Card
              title={
                <Space>
                  <RocketOutlined />
                  OpenClaw
                </Space>
              }
              extra={
                openclawInfo?.installed ? (
                  <Tag color="success" icon={<CheckCircleOutlined />}>已安装</Tag>
                ) : (
                  <Tag color="error" icon={<CloseCircleOutlined />}>未安装</Tag>
                )
              }
            >
              {openclawInfo?.installed ? (
                <Space direction="vertical">
                  <Text>版本: <strong>{openclawInfo.version}</strong></Text>
                  {openclawInfo.path && (
                    <Text type="secondary" style={{ fontSize: 12 }}>路径: {openclawInfo.path}</Text>
                  )}
                </Space>
              ) : (
                <Space direction="vertical">
                  <Alert
                    type="warning"
                    message="未检测到 OpenClaw"
                    description="需要先安装 OpenClaw 才能使用"
                    showIcon
                  />
                  <Button
                    type="primary"
                    loading={actionLoading === 'install'}
                    onClick={() => {
                      // 安装功能待 M1 完善
                      window.open('https://docs.openclaw.ai/start/getting-started', '_blank')
                    }}
                  >
                    查看安装指南
                  </Button>
                </Space>
              )}
            </Card>

            {/* Gateway */}
            <Card
              title={
                <Space>
                  <ApiOutlined />
                  Gateway
                </Space>
              }
              extra={
                gatewayStatus?.running ? (
                  <Tag color="success" icon={<CheckCircleOutlined />}>运行中</Tag>
                ) : (
                  <Tag color="default" icon={<CloseCircleOutlined />}>未运行</Tag>
                )
              }
            >
              {gatewayStatus?.running ? (
                <Space direction="vertical">
                  <Text>端口: <strong>{gatewayStatus.port}</strong></Text>
                  {gatewayStatus.pid && (
                    <Text type="secondary">PID: {gatewayStatus.pid}</Text>
                  )}
                </Space>
              ) : (
                <Space direction="vertical">
                  <Text>Gateway 未运行，需要启动后才能使用</Text>
                  <Button
                    type="primary"
                    icon={<SyncOutlined />}
                    loading={actionLoading === 'gateway'}
                    onClick={handleStartGateway}
                    disabled={!openclawInfo?.installed}
                  >
                    启动 Gateway
                  </Button>
                </Space>
              )}
            </Card>
          </Space>
        )}
      </div>

      {allReady && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Alert
            type="success"
            message="所有环境已就绪！"
            description="你的 OpenClaw 已经可以正常使用了"
            showIcon
          />
          <Button
            type="primary"
            size="large"
            style={{ marginTop: 16 }}
            onClick={() => navigate('/dashboard')}
          >
            进入主界面 →
          </Button>
        </div>
      )}

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Button type="link" onClick={detectAll} loading={loading}>
          <SyncOutlined /> 重新检测
        </Button>
      </div>
    </div>
  )
}
