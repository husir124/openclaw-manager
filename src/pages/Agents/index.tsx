/**
 * Agent 管理页面
 *
 * 功能：
 * - Agent 列表：显示所有已配置的 Agent（从 openclaw.json agents.list 读取）
 * - 创建向导：4 步流程（基本信息 → 选择平台 → 配置凭证 → 确认创建）
 * - 删除 Agent：从 agents.list 中移除
 *
 * Agent 配置结构：{ id, name, workspace, model, tools, bindings }
 * 创建时自动添加到 agents.list 和 bindings 数组
 */
import { useState, useEffect } from 'react'
import { Typography, Card, Spin, Button, Space, Tag, Empty, Modal, Steps, Alert } from 'antd'
import {
  RobotOutlined,
  PlusOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  MessageOutlined,
  CloudOutlined,
} from '@ant-design/icons'
import { readConfig, writeConfig } from '../../services/tauri'
import { PLATFORMS, type AgentInfo } from './platforms'
import { StepBasicInfo, StepSelectPlatform, StepCredentials, StepConfirm } from './WizardSteps'

const { Title, Text } = Typography

const getPlatformIcon = (platform?: string) => {
  switch (platform) {
    case 'feishu': return <CloudOutlined />
    case 'telegram': return <MessageOutlined />
    default: return <RobotOutlined />
  }
}

const getPlatformName = (platform?: string) =>
  PLATFORMS.find(p => p.id === platform)?.name || platform || '未知'

export default function AgentsPage() {
  const [loading, setLoading] = useState(true)
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 向导表单状态
  const [newId, setNewId] = useState('')
  const [newName, setNewName] = useState('')
  const [newModel, setNewModel] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('')
  const [platformFields, setPlatformFields] = useState<Record<string, string>>({})

  const loadAgents = async () => {
    setLoading(true)
    setError(null)
    try {
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>

      const agentsList = ((parsed.agents as Record<string, unknown>)?.list as Array<Record<string, unknown>>) || []
      const bindingList = (parsed.bindings as Array<Record<string, unknown>>) || []

      // Build binding map: agentId -> list of match descriptions
      const bindingMap: Record<string, string[]> = {}
      for (const b of bindingList) {
        const agentId = b.agentId as string
        const match = b.match as Record<string, unknown> | undefined
        if (agentId && match) {
          const channel = match.channel as string || 'unknown'
          const accountId = match.accountId as string
          const desc = accountId ? `${channel} (${accountId})` : channel
          if (!bindingMap[agentId]) bindingMap[agentId] = []
          bindingMap[agentId].push(desc)
        }
      }

      const agentInfos: AgentInfo[] = agentsList.map((a) => {
        const binding = bindingList.find(b => b.agentId === a.id)
        const match = binding?.match as Record<string, unknown> | undefined
        return {
          id: a.id as string || 'unknown',
          name: (a.name as string) || (a.id as string) || 'Unknown',
          model: (a.model as Record<string, unknown>)?.primary as string || 'default',
          workspace: (a.workspace as string) || 'default',
          bindings: bindingMap[a.id as string] || [],
          platform: match?.channel as string | undefined,
        }
      })

      setAgents(agentInfos)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载 Agent 列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAgents() }, [])

  const resetForm = () => {
    setCurrentStep(0)
    setNewId('')
    setNewName('')
    setNewModel('')
    setSelectedPlatform('')
    setPlatformFields({})
    setError(null)
  }

  const handleCreate = async () => {
    if (!newId || !newName || !selectedPlatform) return

    try {
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>
      const agentsConfig = (parsed.agents as Record<string, unknown>) || {}
      const list = (agentsConfig.list as Array<Record<string, unknown>>) || []
      const bindingList = (parsed.bindings as Array<Record<string, unknown>>) || []
      const channelsConfig = (parsed.channels as Record<string, unknown>) || {}

      if (list.some((a) => a.id === newId)) {
        setError(`Agent "${newId}" 已存在`)
        return
      }

      // 1. Add new agent
      list.push({
        id: newId,
        name: newName,
        workspace: `~/.openclaw/workspace-${newId}`,
        model: {
          primary: newModel || 'openrouter/xiaomi/mimo-v2-pro',
          fallbacks: ['custom-api-edgefn-net/DeepSeek-V3.2', 'custom-coding-st0722-top/Qwen3.5-Plus'],
        },
        tools: { profile: 'full' },
      })

      // 2. Add binding
      bindingList.push({
        type: 'route',
        agentId: newId,
        match: { channel: selectedPlatform, accountId: newId },
      })

      // 3. Add channel config
      if (selectedPlatform === 'feishu') {
        const feishuConfig = (channelsConfig.feishu as Record<string, unknown>) || {}
        const accounts = (feishuConfig.accounts as Record<string, unknown>) || {}
        accounts[newId] = {
          appId: platformFields.appId || '',
          appSecret: platformFields.appSecret || '',
          enabled: true,
          connectionMode: 'websocket',
          groupPolicy: 'open',
          requireMention: true,
          threadSession: true,
          streaming: true,
        }
        feishuConfig.accounts = accounts
        channelsConfig.feishu = feishuConfig
      } else if (selectedPlatform === 'telegram') {
        const telegramConfig = (channelsConfig.telegram as Record<string, unknown>) || {}
        telegramConfig.enabled = true
        telegramConfig.botToken = platformFields.botToken || ''
        telegramConfig.dmPolicy = platformFields.dmPolicy || 'pairing'
        telegramConfig.groupPolicy = platformFields.groupPolicy || 'open'
        telegramConfig.commands = { native: true, nativeSkills: true }
        telegramConfig.actions = { reactions: true, sendMessage: true, deleteMessage: true, sticker: true }
        channelsConfig.telegram = telegramConfig
      }

      // 4. Write config
      parsed.agents = agentsConfig
      parsed.bindings = bindingList
      parsed.channels = channelsConfig

      await writeConfig(JSON.stringify(parsed, null, 2))

      setShowCreate(false)
      resetForm()
      setSuccess(`Agent "${newName}" 创建成功！请重启 Gateway 使其生效。`)
      await loadAgents()
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建 Agent 失败')
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!(newId && newName)
      case 1: return !!(selectedPlatform && PLATFORMS.find(p => p.id === selectedPlatform)?.available)
      case 2: {
        const platform = PLATFORMS.find(p => p.id === selectedPlatform)
        if (!platform) return false
        return platform.fields.filter(f => f.required).every(f => platformFields[f.key])
      }
      case 3: return true
      default: return false
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载 Agent 列表...</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}><RobotOutlined /> Agent 管理</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadAgents}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreate(true)}>
            创建 Agent
          </Button>
        </Space>
      </div>

      {error && <Alert type="error" message={error} showIcon closable style={{ marginBottom: 16 }} />}
      {success && <Alert type="success" message={success} showIcon closable style={{ marginBottom: 16 }} />}

      {agents.length === 0 ? (
        <Empty description="暂无 Agent 配置">
          <Button type="primary" onClick={() => setShowCreate(true)}>创建第一个 Agent</Button>
        </Empty>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {agents.map((agent) => (
            <Card
              key={agent.id}
              title={
                <Space>
                  {getPlatformIcon(agent.platform)}
                  <Text strong>{agent.name}</Text>
                  {agent.id === 'main' && <Tag color="gold">主 Agent</Tag>}
                </Space>
              }
              size="small"
            >
              <div style={{ lineHeight: 2.2 }}>
                <div><Text type="secondary">ID：</Text><Text code>{agent.id}</Text></div>
                <div><Text type="secondary">平台：</Text><Tag>{getPlatformName(agent.platform)}</Tag></div>
                <div><Text type="secondary">模型：</Text><Tag color="blue">{agent.model.split('/').pop()}</Tag></div>
                <div><Text type="secondary">工作区：</Text><Text style={{ fontSize: 12 }}>{agent.workspace}</Text></div>
                {agent.bindings.length > 0 && (
                  <div>
                    <Text type="secondary">绑定：</Text>
                    <div style={{ marginTop: 4 }}>
                      {agent.bindings.map((b, i) => (
                        <Tag key={i} color="green" style={{ marginBottom: 4 }}>{b}</Tag>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        title="创建新 Agent"
        open={showCreate}
        onCancel={() => { setShowCreate(false); resetForm() }}
        width={600}
        footer={[
          <Button key="cancel" onClick={() => { setShowCreate(false); resetForm() }}>取消</Button>,
          currentStep > 0 && (
            <Button key="back" onClick={() => setCurrentStep(currentStep - 1)}>上一步</Button>
          ),
          currentStep < 3 ? (
            <Button key="next" type="primary" disabled={!canProceed()} onClick={() => setCurrentStep(currentStep + 1)}>
              下一步
            </Button>
          ) : (
            <Button key="create" type="primary" onClick={handleCreate}>
              <CheckCircleOutlined /> 确认创建
            </Button>
          ),
        ]}
      >
        <Steps
          current={currentStep}
          size="small"
          style={{ marginBottom: 24 }}
          items={[
            { title: '基本信息' },
            { title: '选择平台' },
            { title: '配置凭证' },
            { title: '确认创建' },
          ]}
        />

        {(() => {
          const stepProps = { newId, newName, newModel, selectedPlatform, platformFields,
            onIdChange: setNewId, onNameChange: setNewName, onModelChange: setNewModel,
            onPlatformChange: setSelectedPlatform, onFieldsChange: setPlatformFields }
          switch (currentStep) {
            case 0: return <StepBasicInfo {...stepProps} />
            case 1: return <StepSelectPlatform {...stepProps} />
            case 2: return <StepCredentials {...stepProps} />
            case 3: return <StepConfirm {...stepProps} />
            default: return null
          }
        })()}
      </Modal>
    </div>
  )
}
