/**
 * 首次使用引导组件
 *
 * 用户首次打开应用时显示的 Modal 引导：
 * - 检测 Node.js 版本（>= 22.14）
 * - 检测 OpenClaw 是否安装
 * - 检测 Gateway 是否运行（未运行可一键启动）
 *
 * 完成后写入 localStorage('ocm-onboarding-completed')，不再显示。
 * 通过删除该 localStorage 键可重新触发引导。
 */
import { useState, useEffect } from 'react'
import { Modal, Steps, Button, Space, Alert, Spin, Tag } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  RocketOutlined,
  CloudServerOutlined,
  ApiOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { checkNodeVersion, checkOpenClawInstalled, checkGatewayStatus, startGateway } from '../services/tauri'

// Ant Design 6: Steps 使用 items 属性，不再支持 Steps.Step

interface OnboardingGuideProps {
  onComplete: () => void
}

interface CheckResult {
  status: 'loading' | 'success' | 'warning' | 'error'
  message: string
}

export function OnboardingGuide({ onComplete }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [visible, setVisible] = useState(true)

  // 检测结果
  const [nodeResult, setNodeResult] = useState<CheckResult>({ status: 'loading', message: '检测中...' })
  const [openclawResult, setOpenclawResult] = useState<CheckResult>({ status: 'loading', message: '检测中...' })
  const [gatewayResult, setGatewayResult] = useState<CheckResult>({ status: 'loading', message: '检测中...' })

  // 运行检测
  const runChecks = async () => {
    // Node.js
    setNodeResult({ status: 'loading', message: '检测中...' })
    try {
      const node = await checkNodeVersion()
      if (node.installed && node.meetsMinimum) {
        setNodeResult({ status: 'success', message: `Node.js ${node.version} 已安装` })
      } else if (node.installed) {
        setNodeResult({ status: 'warning', message: `Node.js ${node.version} 版本过低` })
      } else {
        setNodeResult({ status: 'error', message: '未找到 Node.js' })
      }
    } catch {
      setNodeResult({ status: 'error', message: '检测失败' })
    }

    // OpenClaw
    setOpenclawResult({ status: 'loading', message: '检测中...' })
    try {
      const oc = await checkOpenClawInstalled()
      if (oc.installed) {
        setOpenclawResult({ status: 'success', message: `OpenClaw ${oc.version} 已安装` })
      } else {
        setOpenclawResult({ status: 'error', message: '未安装 OpenClaw' })
      }
    } catch {
      setOpenclawResult({ status: 'error', message: '检测失败' })
    }

    // Gateway
    setGatewayResult({ status: 'loading', message: '检测中...' })
    try {
      const gw = await checkGatewayStatus()
      if (gw.running) {
        setGatewayResult({ status: 'success', message: `Gateway 运行中，端口 ${gw.port}` })
      } else {
        setGatewayResult({ status: 'warning', message: 'Gateway 未运行' })
      }
    } catch {
      setGatewayResult({ status: 'error', message: '检测失败' })
    }
  }

  useEffect(() => {
    // 检查是否已经完成过引导
    const completed = localStorage.getItem('ocm-onboarding-completed')
    if (completed) {
      setVisible(false)
      onComplete()
      return
    }

    runChecks()
  }, [onComplete])

  const handleStartGateway = async () => {
    setGatewayResult({ status: 'loading', message: '启动中...' })
    try {
      await startGateway()
      const gw = await checkGatewayStatus()
      if (gw.running) {
        setGatewayResult({ status: 'success', message: `Gateway 已启动，端口 ${gw.port}` })
      } else {
        setGatewayResult({ status: 'error', message: '启动失败' })
      }
    } catch {
      setGatewayResult({ status: 'error', message: '启动失败' })
    }
  }

  const handleComplete = () => {
    localStorage.setItem('ocm-onboarding-completed', 'true')
    setVisible(false)
    onComplete()
  }

  const handleSkip = () => {
    localStorage.setItem('ocm-onboarding-completed', 'true')
    setVisible(false)
    onComplete()
  }

  const allSuccess = nodeResult.status === 'success' &&
                     openclawResult.status === 'success' &&
                     gatewayResult.status === 'success'

  const canProceed = currentStep === 0 && allSuccess

  const getStatusIcon = (status: CheckResult['status']) => {
    switch (status) {
      case 'loading': return <Spin indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} />
      case 'success': return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'warning': return <CloseCircleOutlined style={{ color: '#faad14' }} />
      case 'error': return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
    }
  }

  const getStatusColor = (status: CheckResult['status']) => {
    switch (status) {
      case 'loading': return 'processing'
      case 'success': return 'success'
      case 'warning': return 'warning'
      case 'error': return 'error'
    }
  }

  return (
    <Modal
      title={
        <Space>
          <RocketOutlined />
          欢迎使用 OpenClaw Manager
        </Space>
      }
      open={visible}
      onCancel={handleSkip}
      width={600}
      footer={[
        <Button key="skip" onClick={handleSkip}>
          跳过
        </Button>,
        currentStep === 0 && (
          <Button
            key="next"
            type="primary"
            disabled={!canProceed}
            onClick={handleComplete}
          >
            开始使用 <RightOutlined />
          </Button>
        ),
      ]}
    >
      <Steps
        current={currentStep}
        size="small"
        style={{ marginBottom: 24 }}
        items={[
          { title: '检测环境', icon: <CloudServerOutlined /> },
          { title: '完成', icon: <CheckCircleOutlined /> },
        ]}
      />

      {currentStep === 0 && (
        <div>
          <Alert
            type="info"
            message="正在检测您的运行环境"
            description="请确保 Node.js 和 OpenClaw 已正确安装"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Node.js */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: '#fafafa',
              borderRadius: 8,
              border: '1px solid #f0f0f0',
            }}>
              <Space>
                <CloudServerOutlined />
                <span>Node.js</span>
              </Space>
              <Space>
                <Tag color={getStatusColor(nodeResult.status)}>
                  {nodeResult.message}
                </Tag>
                {getStatusIcon(nodeResult.status)}
              </Space>
            </div>

            {/* OpenClaw */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: '#fafafa',
              borderRadius: 8,
              border: '1px solid #f0f0f0',
            }}>
              <Space>
                <RocketOutlined />
                <span>OpenClaw</span>
              </Space>
              <Space>
                <Tag color={getStatusColor(openclawResult.status)}>
                  {openclawResult.message}
                </Tag>
                {getStatusIcon(openclawResult.status)}
              </Space>
            </div>

            {/* Gateway */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: '#fafafa',
              borderRadius: 8,
              border: '1px solid #f0f0f0',
            }}>
              <Space>
                <ApiOutlined />
                <span>Gateway</span>
              </Space>
              <Space>
                <Tag color={getStatusColor(gatewayResult.status)}>
                  {gatewayResult.message}
                </Tag>
                {gatewayResult.status === 'warning' && gatewayResult.message.includes('未运行') ? (
                  <Button size="small" type="primary" onClick={handleStartGateway}>
                    启动
                  </Button>
                ) : (
                  getStatusIcon(gatewayResult.status)
                )}
              </Space>
            </div>
          </div>

          {!allSuccess && (
            <Alert
              type="warning"
              message="环境未完全就绪"
              description={
                <div>
                  {nodeResult.status === 'error' && <div>• 请安装 Node.js 24+: <a href="https://nodejs.org" target="_blank">nodejs.org</a></div>}
                  {openclawResult.status === 'error' && <div>• 请安装 OpenClaw: <a href="https://docs.openclaw.ai/start/getting-started" target="_blank">安装指南</a></div>}
                  {gatewayResult.status === 'error' && <div>• Gateway 启动失败，请检查配置</div>}
                </div>
              }
              showIcon
              style={{ marginTop: 16 }}
            />
          )}

          {allSuccess && (
            <Alert
              type="success"
              message="环境检测完成"
              description="所有组件均正常，可以开始使用了！"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </div>
      )}
    </Modal>
  )
}
