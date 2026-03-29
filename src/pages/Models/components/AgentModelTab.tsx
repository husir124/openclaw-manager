/**
 * Agent 模型配置 Tab
 * 包含全局默认 + 各 Agent 的模型选择
 */
import { Space, Card, Select, Button, Typography } from 'antd'
import type { AgentModelConfig } from '../types'
import AgentModelCard from './AgentModelCard'

const { Text } = Typography

interface AgentModelTabProps {
  defaultPrimary: string
  defaultFallbacks: string[]
  agents: AgentModelConfig[]
  allModelOptions: Array<{ label: string; value: string }>
  onDefaultPrimaryChange: (v: string) => void
  onDefaultFallbacksChange: (v: string[]) => void
  onUpdateAgentModel: (agentId: string, primary: string, fallbacks: string[]) => void
}

export default function AgentModelTab({
  defaultPrimary,
  defaultFallbacks,
  agents,
  allModelOptions,
  onDefaultPrimaryChange,
  onDefaultFallbacksChange,
  onUpdateAgentModel,
}: AgentModelTabProps) {
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {/* 全局默认 */}
      <Card size="small" title="全局默认模型">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>主模型</Text>
            <Select
              value={defaultPrimary}
              onChange={onDefaultPrimaryChange}
              options={allModelOptions}
              placeholder="选择主模型"
              style={{ width: 350 }}
              showSearch
              optionFilterProp="label"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>Fallback 模型</Text>
            <Select
              mode="multiple"
              value={defaultFallbacks}
              onChange={onDefaultFallbacksChange}
              options={allModelOptions}
              placeholder="选择 fallback 模型"
              style={{ width: 350 }}
              showSearch
              optionFilterProp="label"
            />
          </div>
          <Button type="primary" onClick={() => onUpdateAgentModel('__defaults__', defaultPrimary, defaultFallbacks)}>
            保存全局默认
          </Button>
        </Space>
      </Card>

      {/* 各 Agent 配置 */}
      {agents.map(agent => (
        <AgentModelCard
          key={agent.id}
          agent={agent}
          modelOptions={allModelOptions}
          onSave={(primary, fallbacks) => onUpdateAgentModel(agent.id, primary, fallbacks)}
        />
      ))}
    </Space>
  )
}
