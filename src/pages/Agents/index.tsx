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
import { Typography, Card, Spin, Button, Space, Tag, Empty, Modal, Input, Select, Alert, Steps, Tooltip, Divider, Radio } from 'antd'
import {
  RobotOutlined,
  PlusOutlined,
  ReloadOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
  MessageOutlined,
  CloudOutlined,
  WechatOutlined,
} from '@ant-design/icons'
import { readConfig, writeConfig } from '../../services/tauri'

const { Title, Text, Paragraph } = Typography

// 平台配置定义
interface PlatformConfig {
  id: string
  name: string
  icon: React.ReactNode
  available: boolean
  fields: PlatformField[]
}

interface PlatformField {
  key: string
  label: string
  placeholder: string
  required: boolean
  tooltip: string
  type: 'text' | 'password' | 'select'
  options?: { label: string; value: string }[]
}

// 支持的平台配置
const PLATFORMS: PlatformConfig[] = [
  {
    id: 'feishu',
    name: '飞书',
    icon: <CloudOutlined />,
    available: true,
    fields: [
      {
        key: 'appId',
        label: 'App ID',
        placeholder: 'cli_xxxxxxxxxxxxxxxx',
        required: true,
        tooltip: '飞书开放平台应用的 App ID，可在飞书开放平台控制台获取',
        type: 'text',
      },
      {
        key: 'appSecret',
        label: 'App Secret',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        required: true,
        tooltip: '飞书开放平台应用的 App Secret，用于身份验证，请妥善保管',
        type: 'password',
      },
    ],
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: <MessageOutlined />,
    available: true,
    fields: [
      {
        key: 'botToken',
        label: 'Bot Token',
        placeholder: '1234567890:xxxxxxxxxxxxxxxxxxxxxxxx',
        required: true,
        tooltip: '通过 Telegram @BotFather 创建机器人后获得的 Token，格式如：1234567890:ABCdef...',
        type: 'password',
      },
      {
        key: 'dmPolicy',
        label: '私聊策略',
        placeholder: '',
        required: false,
        tooltip: 'pairing：需要用户配对授权（推荐）；open：任何人可直接使用',
        type: 'select',
        options: [
          { label: '配对授权（推荐）', value: 'pairing' },
          { label: '开放模式', value: 'open' },
        ],
      },
      {
        key: 'groupPolicy',
        label: '群组策略',
        placeholder: '',
        required: false,
        tooltip: 'open：任何群组都可使用；allowlist：仅白名单群组可使用',
        type: 'select',
        options: [
          { label: '开放模式', value: 'open' },
          { label: '白名单模式', value: 'allowlist' },
        ],
      },
    ],
  },
  {
    id: 'wechat',
    name: '微信',
    icon: <WechatOutlined />,
    available: false,
    fields: [],
  },
]

interface AgentInfo {
  id: string
  name: string
  model: string
  workspace: string
  bindings: string[]
  platform?: string
}

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
      const channelsConfig = (parsed.channels as Record<string, unknown>) || {}

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

      // Detect platform from channels config
      const getPlatform = (agentId: string): string | undefined => {
        const binding = bindingList.find(b => b.agentId === agentId)
        const match = binding?.match as Record<string, unknown> | undefined
        return match?.channel as string | undefined
      }

      const agentInfos: AgentInfo[] = agentsList.map((a) => ({
        id: a.id as string || 'unknown',
        name: (a.name as string) || (a.id as string) || 'Unknown',
        model: (a.model as Record<string, unknown>)?.primary as string || 'default',
        workspace: (a.workspace as string) || 'default',
        bindings: bindingMap[a.id as string] || [],
        platform: getPlatform(a.id as string),
      }))

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

      // Check for duplicate
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
        match: {
          channel: selectedPlatform,
          accountId: newId,
        },
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
        telegramConfig.actions = {
          reactions: true,
          sendMessage: true,
          deleteMessage: true,
          sticker: true,
        }
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

  const getPlatformIcon = (platform?: string) => {
    switch (platform) {
      case 'feishu': return <CloudOutlined />
      case 'telegram': return <MessageOutlined />
      default: return <RobotOutlined />
    }
  }

  const getPlatformName = (platform?: string) => {
    const p = PLATFORMS.find(p => p.id === platform)
    return p?.name || platform || '未知'
  }

  // 渲染向导步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // 基本信息
        return (
          <Space orientation="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Space>
                <Text>Agent ID</Text>
                <Tooltip title="Agent 的唯一标识符，只能包含小写字母、数字和连字符，创建后不可修改">
                  <QuestionCircleOutlined style={{ color: '#999' }} />
                </Tooltip>
              </Space>
              <Input
                value={newId}
                onChange={(e) => setNewId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="my-agent"
                style={{ marginTop: 4 }}
              />
            </div>
            <div>
              <Space>
                <Text>显示名称</Text>
                <Tooltip title="Agent 的显示名称，用于界面展示，支持中文">
                  <QuestionCircleOutlined style={{ color: '#999' }} />
                </Tooltip>
              </Space>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="我的助手"
                style={{ marginTop: 4 }}
              />
            </div>
            <div>
              <Space>
                <Text>模型（可选）</Text>
                <Tooltip title="Agent 使用的 AI 模型，留空则使用默认模型">
                  <QuestionCircleOutlined style={{ color: '#999' }} />
                </Tooltip>
              </Space>
              <Input
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                placeholder="openrouter/xiaomi/mimo-v2-pro"
                style={{ marginTop: 4 }}
              />
            </div>
          </Space>
        )

      case 1: // 选择平台
        return (
          <Space orientation="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Space>
                <Text>选择接入平台</Text>
                <Tooltip title="选择 Agent 要接入的通讯平台，不同平台需要不同的配置信息">
                  <QuestionCircleOutlined style={{ color: '#999' }} />
                </Tooltip>
              </Space>
              <div style={{ marginTop: 12 }}>
                <Radio.Group
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {PLATFORMS.map((platform) => (
                      <Radio
                        key={platform.id}
                        value={platform.id}
                        disabled={!platform.available}
                        style={{
                          display: 'block',
                          padding: '12px 16px',
                          border: selectedPlatform === platform.id ? '2px solid #1677ff' : '1px solid #d9d9d9',
                          borderRadius: 8,
                          marginBottom: 8,
                          width: '100%',
                        }}
                      >
                        <Space>
                          {platform.icon}
                          <Text strong>{platform.name}</Text>
                          {!platform.available && <Tag color="default">即将支持</Tag>}
                        </Space>
                      </Radio>
                    ))}
                  </Space>
                </Radio.Group>
              </div>
            </div>
          </Space>
        )

      case 2: // 填写平台凭证
        const platform = PLATFORMS.find(p => p.id === selectedPlatform)
        if (!platform || !platform.available) {
          return <Alert type="warning" title="请先选择一个可用的平台" />
        }

        return (
          <Space orientation="vertical" style={{ width: '100%' }} size="large">
            <Alert
              type="info"
              message={`配置 ${platform.name} 平台凭证`}
              description={`请填写 ${platform.name} 平台的配置信息，带 * 的为必填项`}
              showIcon
            />
            {platform.fields.map((field) => (
              <div key={field.key}>
                <Space>
                  <Text>
                    {field.label}
                    {field.required && <Text type="danger"> *</Text>}
                  </Text>
                  <Tooltip title={field.tooltip}>
                    <QuestionCircleOutlined style={{ color: '#999' }} />
                  </Tooltip>
                </Space>
                {field.type === 'select' ? (
                  <Select
                    value={platformFields[field.key] || field.options?.[0]?.value}
                    onChange={(value) => setPlatformFields({ ...platformFields, [field.key]: value })}
                    options={field.options}
                    style={{ width: '100%', marginTop: 4 }}
                  />
                ) : (
                  <Input
                    type={field.type === 'password' ? 'password' : 'text'}
                    value={platformFields[field.key] || ''}
                    onChange={(e) => setPlatformFields({ ...platformFields, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    style={{ marginTop: 4 }}
                  />
                )}
              </div>
            ))}

            {selectedPlatform === 'telegram' && (
              <Alert
                type="warning"
                message="配置前请完成以下步骤"
                description={
                  <div style={{ marginTop: 8 }}>
                    <div>1. 在 Telegram 搜索 @BotFather，执行 /newbot 创建机器人</div>
                    <div>2. 获取 Bot Token</div>
                    <div style={{ color: '#faad14', fontWeight: 'bold' }}>3. ⚠️ 关闭 Group Privacy（关键！否则群组消息无法接收）</div>
                    <div>4. 重启 Gateway 后，如需配对，执行：openclaw pairing approve telegram {'<配对码>'}</div>
                  </div>
                }
                showIcon
              />
            )}

            {selectedPlatform === 'feishu' && (
              <Alert
                type="info"
                message="配置提示"
                description="请在飞书开放平台创建应用，获取 App ID 和 App Secret。配置完成后重启 Gateway 即可生效。"
                showIcon
              />
            )}
          </Space>
        )

      case 3: // 确认
        const selectedPlat = PLATFORMS.find(p => p.id === selectedPlatform)
        return (
          <Space orientation="vertical" style={{ width: '100%' }} size="large">
            <Alert
              type="success"
              message="请确认以下配置信息"
              showIcon
            />
            <Card size="small" title="基本信息">
              <div style={{ lineHeight: 2 }}>
                <div><Text type="secondary">Agent ID：</Text><Text code>{newId}</Text></div>
                <div><Text type="secondary">显示名称：</Text><Text>{newName}</Text></div>
                <div><Text type="secondary">模型：</Text><Text>{newModel || 'openrouter/xiaomi/mimo-v2-pro'}</Text></div>
                <div><Text type="secondary">工作区：</Text><Text code>~/.openclaw/workspace-{newId}</Text></div>
              </div>
            </Card>
            <Card size="small" title="平台配置">
              <div style={{ lineHeight: 2 }}>
                <div>
                  <Text type="secondary">平台：</Text>
                  <Tag color="blue">{selectedPlat?.icon} {selectedPlat?.name}</Tag>
                </div>
                {selectedPlat?.fields.map((field) => (
                  <div key={field.key}>
                    <Text type="secondary">{field.label}：</Text>
                    <Text>{field.type === 'password' ? '******' : (platformFields[field.key] || field.options?.[0]?.label || '默认')}</Text>
                  </div>
                ))}
              </div>
            </Card>
            <Alert
              type="info"
              message="创建后操作"
              description="Agent 创建完成后，需要重启 Gateway 才能生效。如果配置了配对授权（pairing），用户首次使用时需要进行配对。"
              showIcon
            />
          </Space>
        )

      default:
        return null
    }
  }

  // 检查当前步骤是否可以继续
  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return newId && newName
      case 1:
        return selectedPlatform && PLATFORMS.find(p => p.id === selectedPlatform)?.available
      case 2:
        const platform = PLATFORMS.find(p => p.id === selectedPlatform)
        if (!platform) return false
        return platform.fields
          .filter(f => f.required)
          .every(f => platformFields[f.key])
      case 3:
        return true
      default:
        return false
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

      {/* 创建向导弹窗 */}
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
            <Button
              key="next"
              type="primary"
              disabled={!canProceed()}
              onClick={() => setCurrentStep(currentStep + 1)}
            >
              下一步
            </Button>
          ) : (
            <Button
              key="create"
              type="primary"
              onClick={handleCreate}
            >
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

        {renderStepContent()}
      </Modal>
    </div>
  )
}
