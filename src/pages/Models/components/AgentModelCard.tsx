/**
 * Agent 模型配置卡片
 * 为单个 Agent 或全局默认设置主模型 + fallback
 */
import { useState, useEffect } from 'react'
import { Card, Space, Select, Button, Tag, Tooltip, Typography } from 'antd'
import { RobotOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import type { AgentModelConfig } from '../types'

const { Text } = Typography

interface AgentModelCardProps {
  agent: AgentModelConfig
  modelOptions: Array<{ label: string; value: string }>
  onSave: (primary: string, fallbacks: string[]) => void
}

export default function AgentModelCard({ agent, modelOptions, onSave }: AgentModelCardProps) {
  const [primary, setPrimary] = useState(agent.primary)
  const [fallbacks, setFallbacks] = useState<string[]>(agent.fallbacks)

  useEffect(() => {
    setPrimary(agent.primary)
    setFallbacks(agent.fallbacks)
  }, [agent.primary, agent.fallbacks])

  const changed = primary !== agent.primary || JSON.stringify(fallbacks) !== JSON.stringify(agent.fallbacks)

  return (
    <Card
      size="small"
      title={
        <Space>
          <RobotOutlined />
          <Text strong>{agent.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>({agent.id})</Text>
        </Space>
      }
      extra={changed ? <Tag color="orange">未保存</Tag> : null}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Text>主模型</Text>
            <Tooltip title="Agent 使用的主要模型，格式：provider/modelId">
              <QuestionCircleOutlined style={{ color: '#999' }} />
            </Tooltip>
          </Space>
          <Select
            value={primary}
            onChange={setPrimary}
            options={modelOptions}
            placeholder="选择主模型"
            style={{ width: 350 }}
            showSearch
            optionFilterProp="label"
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Text>Fallback</Text>
            <Tooltip title="主模型不可用时的备选模型">
              <QuestionCircleOutlined style={{ color: '#999' }} />
            </Tooltip>
          </Space>
          <Select
            mode="multiple"
            value={fallbacks}
            onChange={setFallbacks}
            options={modelOptions}
            placeholder="选择 fallback 模型"
            style={{ width: 350 }}
            showSearch
            optionFilterProp="label"
          />
        </div>
        <Button type="primary" size="small" onClick={() => onSave(primary, fallbacks)}>
          保存
        </Button>
      </Space>
    </Card>
  )
}
