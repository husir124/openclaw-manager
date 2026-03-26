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
      <Title level={3}>馃 瀹夎鍚戝</Title>
      <Text type="secondary">妫€娴嬩綘鐨勭幆澧冿紝纭繚 OpenClaw 姝ｅ父杩愯</Text>

      <Divider />

      <Steps
        current={getStepStatus()}
        status={allReady ? 'finish' : 'process'}
        items={[
          { title: 'Node.js', description: '杩愯鐜' },
          { title: 'OpenClaw', description: 'AI 鍔╂墜骞冲彴' },
          { title: 'Gateway', description: '鏈嶅姟杩愯涓? },
          { title: '瀹屾垚', description: '鍙互浣跨敤浜? },
        ]}
      />

      <div style={{ marginTop: 24 }}>
        {loading ? (
          <Card>
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
              <div style={{ marginTop: 16 }}>姝ｅ湪妫€娴嬬幆澧?..</div>
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
                  <Tag color="success" icon={<CheckCircleOutlined />}>宸插畨瑁?/Tag>
                ) : (
                  <Tag color="error" icon={<CloseCircleOutlined />}>鏈畨瑁?/Tag>
                )
              }
            >
              {nodeInfo?.installed ? (
                <Space direction="vertical">
                  <Text>鐗堟湰: <strong>{nodeInfo.version}</strong></Text>
                  {nodeInfo.meets_minimum ? (
                    <Text type="success">鉁?鐗堟湰婊¤冻鏈€浣庤姹?(鈮?22.14)</Text>
                  ) : (
                    <Alert
                      type="warning"
                      message="鐗堟湰杩囦綆锛屽缓璁崌绾у埌 Node.js 24"
                      showIcon
                    />
                  )}
                </Space>
              ) : (
                <Alert
                  type="error"
                  message="鏈娴嬪埌 Node.js"
                  description="璇峰厛瀹夎 Node.js 24+: https://nodejs.org"
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
                  <Tag color="success" icon={<CheckCircleOutlined />}>宸插畨瑁?/Tag>
                ) : (
                  <Tag color="error" icon={<CloseCircleOutlined />}>鏈畨瑁?/Tag>
                )
              }
            >
              {openclawInfo?.installed ? (
                <Space direction="vertical">
                  <Text>鐗堟湰: <strong>{openclawInfo.version}</strong></Text>
                  {openclawInfo.path && (
                    <Text type="secondary" style={{ fontSize: 12 }}>璺緞: {openclawInfo.path}</Text>
                  )}
                </Space>
              ) : (
                <Space direction="vertical">
                  <Alert
                    type="warning"
                    message="鏈娴嬪埌 OpenClaw"
                    description="闇€瑕佸厛瀹夎 OpenClaw 鎵嶈兘浣跨敤"
                    showIcon
                  />
                  <Button
                    type="primary"
                    loading={actionLoading === 'install'}
                    onClick={() => {
                      // 瀹夎鍔熻兘寰?M1 瀹屽杽
                      window.open('https://docs.openclaw.ai/start/getting-started', '_blank')
                    }}
                  >
                    鏌ョ湅瀹夎鎸囧崡
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
                  <Tag color="success" icon={<CheckCircleOutlined />}>杩愯涓?/Tag>
                ) : (
                  <Tag color="default" icon={<CloseCircleOutlined />}>鏈繍琛?/Tag>
                )
              }
            >
              {gatewayStatus?.running ? (
                <Space direction="vertical">
                  <Text>绔彛: <strong>{gatewayStatus.port}</strong></Text>
                  {gatewayStatus.pid && (
                    <Text type="secondary">PID: {gatewayStatus.pid}</Text>
                  )}
                </Space>
              ) : (
                <Space direction="vertical">
                  <Text>Gateway 鏈繍琛岋紝闇€瑕佸惎鍔ㄥ悗鎵嶈兘浣跨敤</Text>
                  <Button
                    type="primary"
                    icon={<SyncOutlined />}
                    loading={actionLoading === 'gateway'}
                    onClick={handleStartGateway}
                    disabled={!openclawInfo?.installed}
                  >
                    鍚姩 Gateway
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
            message="鎵€鏈夌幆澧冨凡灏辩华锛?
            description="浣犵殑 OpenClaw 宸茬粡鍙互姝ｅ父浣跨敤浜?
            showIcon
          />
          <Button
            type="primary"
            size="large"
            style={{ marginTop: 16 }}
            onClick={() => navigate('/dashboard')}
          >
            杩涘叆涓荤晫闈?鈫?          </Button>
        </div>
      )}

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Button type="link" onClick={detectAll} loading={loading}>
          <SyncOutlined /> 閲嶆柊妫€娴?        </Button>
      </div>
    </div>
  )
}
