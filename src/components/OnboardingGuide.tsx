import { Steps, Button, Card, Typography, Space } from 'antd'
import {
  CheckCircleOutlined,
  CloudServerOutlined,
  RobotOutlined,
  MessageOutlined,
} from '@ant-design/icons'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const { Title, Text } = Typography

const steps = [
  {
    title: '配置模型',
    icon: <CloudServerOutlined />,
    description: '选择 AI Provider，输入 API Key',
    path: '/models',
  },
  {
    title: '创建 Agent',
    icon: <RobotOutlined />,
    description: '创建你的第一个 AI Agent',
    path: '/agents',
  },
  {
    title: '发送第一条消息',
    icon: <MessageOutlined />,
    description: '和你的 AI 助手对话',
    path: '/chat',
  },
]

interface OnboardingGuideProps {
  onComplete: () => void
}

export default function OnboardingGuide({ onComplete }: OnboardingGuideProps) {
  const [current, setCurrent] = useState(0)
  const navigate = useNavigate()

  const handleNext = () => {
    if (current < steps.length - 1) {
      setCurrent(current + 1)
    } else {
      onComplete()
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  return (
    <Card style={{ maxWidth: 600, margin: '80px auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={3}>🦞 欢迎使用 OpenClaw Manager</Title>
        <Text type="secondary">3 步快速开始，1 分钟搞定</Text>
      </div>

      <Steps
        current={current}
        items={steps.map((step) => ({
          title: step.title,
          icon: step.icon,
        }))}
        style={{ marginBottom: 32 }}
      />

      <Card style={{ textAlign: 'center', background: '#fafafa' }}>
        <Title level={4}>{steps[current].title}</Title>
        <Text>{steps[current].description}</Text>
        <div style={{ marginTop: 16 }}>
          <Button onClick={() => navigate(steps[current].path)}>
            前往设置
          </Button>
        </div>
      </Card>

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
        <Button type="text" onClick={handleSkip}>
          跳过引导
        </Button>
        <Space>
          {current > 0 && (
            <Button onClick={() => setCurrent(current - 1)}>上一步</Button>
          )}
          <Button type="primary" onClick={handleNext} icon={current === steps.length - 1 ? <CheckCircleOutlined /> : undefined}>
            {current === steps.length - 1 ? '完成' : '下一步'}
          </Button>
        </Space>
      </div>
    </Card>
  )
}
