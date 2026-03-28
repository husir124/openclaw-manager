/**
 * 模型配置页面
 *
 * 两个 Tab：
 * 1. Provider 列表：显示自定义 Provider（CRUD）+ 内置 Provider（openrouter 等）
 *    - 自定义 Provider：展开显示模型列表，支持添加/编辑/删除
 *    - 内置 Provider：从 agent 模型引用中解析，只读显示
 * 2. Agent 模型配置：为每个 Agent 和全局默认设置主模型 + fallback
 *
 * 数据流：
 * loadConfig() → 读取 openclaw.json → 解析 models.providers + agents.list
 * 修改 → 直接写入 openclaw.json → loadConfig() 刷新
 *
 * 内置 Provider 识别逻辑：
 * 从 agent 模型引用（如 "openrouter/xiaomi/mimo-v2-pro"）中提取 provider 名称，
 * 与 models.providers 中的自定义 provider 对比，不在其中的视为内置 provider。
 */
import { useState, useEffect } from 'react'
import { Typography, Card, Spin, Button, Space, Tag, Modal, Input, Alert, Table, Tooltip, Select, Tabs, Collapse, message } from 'antd'
import {
  CloudServerOutlined,
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
  KeyOutlined,
  RobotOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  QuestionCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { readConfig, writeConfig } from '../../services/tauri'

const { Title, Text } = Typography
const { Password } = Input
const { Panel } = Collapse

// 已知的 OpenClaw 内置 provider
const BUILTIN_PROVIDERS: Record<string, { name: string; description: string }> = {
  openrouter: { name: 'OpenRouter', description: '多模型聚合平台，支持数百种模型' },
  openai: { name: 'OpenAI', description: 'GPT-4o, o1, Codex 等' },
  anthropic: { name: 'Anthropic', description: 'Claude 系列模型' },
  deepseek: { name: 'DeepSeek', description: 'DeepSeek 系列模型' },
  moonshot: { name: 'Moonshot (Kimi)', description: 'Kimi 系列模型' },
  google: { name: 'Google', description: 'Gemini 系列模型' },
  xiaomi: { name: 'Xiaomi', description: '小米大模型' },
  ollama: { name: 'Ollama', description: '本地模型运行' },
}

// Provider + 模型
interface ModelInfo {
  id: string
  name: string
  reasoning: boolean
  contextWindow: number
  maxTokens: number
}

interface Provider {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  api: string
  models: ModelInfo[]
  isBuiltin: boolean  // 是否为内置 provider
}

// Agent 模型配置
interface AgentModelConfig {
  id: string
  name: string
  primary: string
  fallbacks: string[]
}

export default function ModelsPage() {
  const [loading, setLoading] = useState(true)
  const [providers, setProviders] = useState<Provider[]>([])
  const [agents, setAgents] = useState<AgentModelConfig[]>([])
  const [defaultPrimary, setDefaultPrimary] = useState('')
  const [defaultFallbacks, setDefaultFallbacks] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 模态框
  const [showAddProvider, setShowAddProvider] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [showAddModel, setShowAddModel] = useState(false)
  const [targetProviderId, setTargetProviderId] = useState('')

  // Provider 表单
  const [formProviderId, setFormProviderId] = useState('')
  const [formProviderName, setFormProviderName] = useState('')
  const [formBaseUrl, setFormBaseUrl] = useState('')
  const [formApiKey, setFormApiKey] = useState('')
  const [formApi, setFormApi] = useState('openai-completions')

  // Model 表单
  const [formModelId, setFormModelId] = useState('')
  const [formModelName, setFormModelName] = useState('')
  const [formContextWindow, setFormContextWindow] = useState('128000')
  const [formMaxTokens, setFormMaxTokens] = useState('4096')

  // 测试状态
  const [testingProvider, setTestingProvider] = useState<string | null>(null)

  // 构建可用模型列表（格式：provider/modelId）
  const allModelOptions = providers.flatMap(p =>
    p.models.map(m => ({
      label: `${p.name} / ${m.name}`,
      value: `${p.id}/${m.id}`,
    }))
  )

  const loadConfig = async () => {
    setLoading(true)
    setError(null)
    try {
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>
      const modelsConfig = (parsed.models as Record<string, unknown>) || {}
      const providersConfig = (modelsConfig.providers as Record<string, unknown>) || {}
      const agentsConfig = (parsed.agents as Record<string, unknown>) || {}
      const defaultsConfig = (agentsConfig.defaults as Record<string, unknown>) || {}
      const defaultsModel = (defaultsConfig.model as Record<string, unknown>) || {}
      const agentsList = (agentsConfig.list as Array<Record<string, unknown>>) || []

      // 1. 解析自定义 providers（models.providers 中的）
      const customProviders: Provider[] = Object.entries(providersConfig).map(([id, cfg]) => {
        const c = cfg as Record<string, unknown>
        const models = (c.models as Array<Record<string, unknown>>) || []
        return {
          id,
          name: (c.name as string) || id,
          baseUrl: (c.baseUrl as string) || '',
          apiKey: (c.apiKey as string) || '',
          api: (c.api as string) || 'openai-completions',
          models: models.map(m => ({
            id: m.id as string,
            name: (m.name as string) || (m.id as string),
            reasoning: (m.reasoning as boolean) || false,
            contextWindow: (m.contextWindow as number) || 128000,
            maxTokens: (m.maxTokens as number) || 4096,
          })),
          isBuiltin: false,
        }
      })

      // 2. 从 agent 模型引用中提取所有 provider 名称
      const allPrimaryModels = [
        (defaultsModel.primary as string) || '',
        ...agentsList.map(a => {
          const m = (a.model as Record<string, unknown>) || {}
          return (m.primary as string) || ''
        }),
      ]
      const allFallbackModels = [
        ...((defaultsModel.fallbacks as string[]) || []),
        ...agentsList.flatMap(a => {
          const m = (a.model as Record<string, unknown>) || {}
          return (m.fallbacks as string[]) || []
        }),
      ]
      const allModelRefs = [...allPrimaryModels, ...allFallbackModels].filter(Boolean)

      // 3. 提取所有 provider 名称（格式 provider/modelId）
      const referencedProviderIds = new Set<string>()
      for (const ref of allModelRefs) {
        const slashIdx = ref.indexOf('/')
        if (slashIdx > 0) {
          referencedProviderIds.add(ref.substring(0, slashIdx))
        }
      }

      // 4. 提取每个内置 provider 被引用的模型 ID
      const builtinProviderModels = new Map<string, Set<string>>()
      for (const ref of allModelRefs) {
        const slashIdx = ref.indexOf('/')
        if (slashIdx > 0) {
          const providerId = ref.substring(0, slashIdx)
          const modelId = ref.substring(slashIdx + 1)
          if (!builtinProviderModels.has(providerId)) {
            builtinProviderModels.set(providerId, new Set())
          }
          builtinProviderModels.get(providerId)!.add(modelId)
        }
      }

      // 5. 合并：自定义 provider + 内置 provider
      const customProviderIds = new Set(customProviders.map(p => p.id))
      const builtinProviders: Provider[] = []

      for (const providerId of referencedProviderIds) {
        if (!customProviderIds.has(providerId)) {
          const builtinInfo = BUILTIN_PROVIDERS[providerId]
          const modelIds = builtinProviderModels.get(providerId) || new Set()
          builtinProviders.push({
            id: providerId,
            name: builtinInfo?.name || providerId,
            baseUrl: '',
            apiKey: '',
            api: 'builtin',
            models: Array.from(modelIds).map(mid => ({
              id: mid,
              name: mid,
              reasoning: false,
              contextWindow: 0,
              maxTokens: 0,
            })),
            isBuiltin: true,
          })
        }
      }

      // 6. 解析 agent 模型配置
      const agentModels: AgentModelConfig[] = agentsList.map(a => {
        const model = (a.model as Record<string, unknown>) || {}
        return {
          id: a.id as string,
          name: (a.name as string) || (a.id as string),
          primary: (model.primary as string) || '',
          fallbacks: (model.fallbacks as string[]) || [],
        }
      })

      setProviders([...customProviders, ...builtinProviders])
      setAgents(agentModels)
      setDefaultPrimary((defaultsModel.primary as string) || '')
      setDefaultFallbacks((defaultsModel.fallbacks as string[]) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载配置失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadConfig() }, [])

  // ========== Provider 操作 ==========

  const resetProviderForm = () => {
    setFormProviderId('')
    setFormProviderName('')
    setFormBaseUrl('')
    setFormApiKey('')
    setFormApi('openai-completions')
    setEditingProvider(null)
  }

  const handleSaveProvider = async () => {
    if (!formProviderId || !formBaseUrl) return
    try {
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>
      const modelsConfig = (parsed.models as Record<string, unknown>) || {}
      const providersConfig = (modelsConfig.providers as Record<string, unknown>) || {}

      if (editingProvider) {
        const existing = providersConfig[editingProvider.id] as Record<string, unknown>
        const existingModels = (existing.models as Array<Record<string, unknown>>) || []
        providersConfig[formProviderId] = {
          baseUrl: formBaseUrl,
          apiKey: formApiKey || (existing.apiKey as string) || '',
          api: formApi,
          name: formProviderName || formProviderId,
          models: existingModels,
        }
        if (formProviderId !== editingProvider.id) {
          delete providersConfig[editingProvider.id]
        }
      } else {
        if (providersConfig[formProviderId]) {
          setError(`Provider "${formProviderId}" 已存在`)
          return
        }
        providersConfig[formProviderId] = {
          baseUrl: formBaseUrl,
          apiKey: formApiKey,
          api: formApi,
          name: formProviderName || formProviderId,
          models: [],
        }
      }

      modelsConfig.providers = providersConfig
      parsed.models = modelsConfig
      await writeConfig(JSON.stringify(parsed, null, 2))
      setShowAddProvider(false)
      resetProviderForm()
      setSuccess(editingProvider ? 'Provider 更新成功' : 'Provider 添加成功')
      await loadConfig()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    }
  }

  const handleDeleteProvider = async (providerId: string) => {
    try {
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>
      const modelsConfig = (parsed.models as Record<string, unknown>) || {}
      const providersConfig = (modelsConfig.providers as Record<string, unknown>) || {}
      delete providersConfig[providerId]
      modelsConfig.providers = providersConfig
      parsed.models = modelsConfig
      await writeConfig(JSON.stringify(parsed, null, 2))
      setSuccess(`Provider "${providerId}" 已删除`)
      await loadConfig()
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
  }

  const handleEditProvider = (provider: Provider) => {
    if (provider.isBuiltin) {
      setError('内置 Provider 不可编辑，OpenClaw 自动管理')
      return
    }
    setEditingProvider(provider)
    setFormProviderId(provider.id)
    setFormProviderName(provider.name)
    setFormBaseUrl(provider.baseUrl)
    setFormApiKey('')
    setFormApi(provider.api)
    setShowAddProvider(true)
  }

  const handleDeleteModel = async (providerId: string, modelId: string) => {
    try {
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>
      const modelsConfig = (parsed.models as Record<string, unknown>) || {}
      const providersConfig = (modelsConfig.providers as Record<string, unknown>) || {}
      const provider = providersConfig[providerId] as Record<string, unknown>
      if (provider) {
        const models = (provider.models as Array<Record<string, unknown>>) || []
        provider.models = models.filter(m => m.id !== modelId)
        providersConfig[providerId] = provider
        modelsConfig.providers = providersConfig
        parsed.models = modelsConfig
        await writeConfig(JSON.stringify(parsed, null, 2))
        setSuccess(`模型 "${modelId}" 已删除`)
        await loadConfig()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
  }

  // ========== 模型操作 ==========

  const resetModelForm = () => {
    setFormModelId('')
    setFormModelName('')
    setFormContextWindow('128000')
    setFormMaxTokens('4096')
    setTargetProviderId('')
  }

  const handleAddModel = async () => {
    if (!targetProviderId || !formModelId) return
    try {
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>
      const modelsConfig = (parsed.models as Record<string, unknown>) || {}
      const providersConfig = (modelsConfig.providers as Record<string, unknown>) || {}
      const provider = providersConfig[targetProviderId] as Record<string, unknown>
      if (!provider) { setError('Provider 不存在'); return }

      const models = (provider.models as Array<Record<string, unknown>>) || []
      if (models.some(m => m.id === formModelId)) {
        setError(`模型 "${formModelId}" 已存在`)
        return
      }

      models.push({
        id: formModelId,
        name: formModelName || formModelId,
        reasoning: false,
        input: ['text'],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: parseInt(formContextWindow) || 128000,
        maxTokens: parseInt(formMaxTokens) || 4096,
      })

      provider.models = models
      providersConfig[targetProviderId] = provider
      modelsConfig.providers = providersConfig
      parsed.models = modelsConfig
      await writeConfig(JSON.stringify(parsed, null, 2))
      setShowAddModel(false)
      resetModelForm()
      setSuccess('模型添加成功')
      await loadConfig()
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败')
    }
  }

  // ========== Agent 模型配置 ==========

  const handleUpdateAgentModel = async (agentId: string, primary: string, fallbacks: string[]) => {
    try {
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>
      const agentsConfig = (parsed.agents as Record<string, unknown>) || {}

      if (agentId === '__defaults__') {
        const defaults = (agentsConfig.defaults as Record<string, unknown>) || {}
        const model = (defaults.model as Record<string, unknown>) || {}
        model.primary = primary
        model.fallbacks = fallbacks
        defaults.model = model
        agentsConfig.defaults = defaults
      } else {
        const agentsList = (agentsConfig.list as Array<Record<string, unknown>>) || []
        const agent = agentsList.find(a => a.id === agentId)
        if (agent) {
          const model = (agent.model as Record<string, unknown>) || {}
          model.primary = primary
          model.fallbacks = fallbacks
          agent.model = model
        }
      }

      parsed.agents = agentsConfig
      await writeConfig(JSON.stringify(parsed, null, 2))
      setSuccess('Agent 模型配置已保存')
      await loadConfig()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    }
  }

  // ========== 测试连通性 ==========

  const handleTestProvider = async (provider: Provider) => {
    if (provider.isBuiltin) {
      message.info('内置 Provider 的连通性由 OpenClaw 管理')
      return
    }
    setTestingProvider(provider.id)
    try {
      const response = await fetch(`${provider.baseUrl}/models`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${provider.apiKey}` },
      })
      if (response.ok) {
        setSuccess(`${provider.name} 连通性测试成功`)
      } else {
        setError(`${provider.name} 连通性测试失败: ${response.status}`)
      }
    } catch (err) {
      setError(`${provider.name} 连通性测试失败: ${err instanceof Error ? err.message : '网络错误'}`)
    } finally {
      setTestingProvider(null)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载模型配置...</div>
      </div>
    )
  }

  const customProviders = providers.filter(p => !p.isBuiltin)
  const builtinProviders = providers.filter(p => p.isBuiltin)

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* 标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <CloudServerOutlined /> 模型配置
        </Title>
        <Space>
          <Tag color="blue">{customProviders.length} 自定义</Tag>
          <Tag color="purple">{builtinProviders.length} 内置</Tag>
          <Tag color="green">{providers.reduce((s, p) => s + p.models.length, 0)} 个模型</Tag>
          <Button icon={<ReloadOutlined />} onClick={loadConfig}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { resetProviderForm(); setShowAddProvider(true) }}>
            添加 Provider
          </Button>
        </Space>
      </div>

      {error && <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} style={{ marginBottom: 16 }} />}
      {success && <Alert type="success" message={success} showIcon closable onClose={() => setSuccess(null)} style={{ marginBottom: 16 }} />}

      <Tabs
        defaultActiveKey="providers"
        items={[
          // ========== Tab 1: Provider 列表 ==========
          {
            key: 'providers',
            label: <Space><CloudServerOutlined />Provider 列表</Space>,
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* 自定义 Provider */}
                {customProviders.length > 0 && (
                  <div>
                    <Text strong style={{ marginBottom: 8, display: 'block' }}>自定义 Provider</Text>
                    <Collapse>
                      {customProviders.map(provider => (
                        <Panel
                          key={provider.id}
                          header={
                            <Space>
                              <CloudServerOutlined />
                              <Text strong>{provider.name}</Text>
                              <Tag>{provider.api}</Tag>
                              <Tag color="blue">{provider.models.length} 个模型</Tag>
                              <Text code style={{ fontSize: 12 }}>{provider.baseUrl}</Text>
                            </Space>
                          }
                          extra={
                            <Space onClick={e => e.stopPropagation()}>
                              <Tooltip title="测试连通性">
                                <Button size="small" icon={<ExperimentOutlined />}
                                  loading={testingProvider === provider.id}
                                  onClick={() => handleTestProvider(provider)} />
                              </Tooltip>
                              <Tooltip title="编辑">
                                <Button size="small" icon={<EditOutlined />}
                                  onClick={() => handleEditProvider(provider)} />
                              </Tooltip>
                              <Tooltip title="删除">
                                <Button size="small" danger icon={<DeleteOutlined />}
                                  onClick={() => handleDeleteProvider(provider.id)} />
                              </Tooltip>
                            </Space>
                          }
                        >
                          <div style={{ marginBottom: 12 }}>
                            <Space>
                              <KeyOutlined />
                              <Text type="secondary">API Key：</Text>
                              <Text>{provider.apiKey ? '••••••••••••' : <Text type="warning">未配置</Text>}</Text>
                            </Space>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text strong>模型列表</Text>
                            <Button size="small" type="link" icon={<PlusOutlined />}
                              onClick={() => { setTargetProviderId(provider.id); setShowAddModel(true) }}>
                              添加模型
                            </Button>
                          </div>

                          {provider.models.length === 0 ? (
                            <Text type="secondary">暂无模型，请先添加</Text>
                          ) : (
                            <Table
                              dataSource={provider.models}
                              rowKey="id"
                              size="small"
                              pagination={false}
                              columns={[
                                { title: '模型 ID', dataIndex: 'id', key: 'id', render: (id: string) => <Text code>{id}</Text> },
                                { title: '显示名称', dataIndex: 'name', key: 'name' },
                                { title: '上下文窗口', dataIndex: 'contextWindow', key: 'cw', render: (v: number) => <Tag>{(v / 1000).toFixed(0)}K</Tag> },
                                { title: '最大输出', dataIndex: 'maxTokens', key: 'mt', render: (v: number) => <Tag>{v}</Tag> },
                                {
                                  title: '操作', key: 'action',
                                  render: (_: unknown, record: ModelInfo) => (
                                    <Button size="small" danger onClick={() => handleDeleteModel(provider.id, record.id)}>
                                      删除
                                    </Button>
                                  ),
                                },
                              ]}
                            />
                          )}
                        </Panel>
                      ))}
                    </Collapse>
                  </div>
                )}

                {/* 内置 Provider */}
                {builtinProviders.length > 0 && (
                  <div>
                    <Space style={{ marginBottom: 8 }}>
                      <Text strong>内置 Provider</Text>
                      <Tooltip title="OpenClaw 内置的 Provider，模型在运行时动态发现，此处显示当前配置中引用的模型">
                        <InfoCircleOutlined style={{ color: '#999' }} />
                      </Tooltip>
                    </Space>
                    <Collapse>
                      {builtinProviders.map(provider => {
                        const builtinInfo = BUILTIN_PROVIDERS[provider.id]
                        return (
                          <Panel
                            key={provider.id}
                            header={
                              <Space>
                                <CloudServerOutlined />
                                <Text strong>{provider.name}</Text>
                                <Tag color="purple">内置</Tag>
                                {provider.models.length > 0 && <Tag color="blue">{provider.models.length} 个已引用模型</Tag>}
                                {builtinInfo && <Text type="secondary" style={{ fontSize: 12 }}>{builtinInfo.description}</Text>}
                              </Space>
                            }
                          >
                            {provider.models.length === 0 ? (
                              <Text type="secondary">当前配置中未引用此 Provider 的模型</Text>
                            ) : (
                              <div>
                                <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
                                  以下模型在 Agent 配置中被引用（OpenClaw 运行时自动管理完整模型列表）：
                                </Text>
                                <Space wrap>
                                  {provider.models.map(m => (
                                    <Tag key={m.id} color="blue">{m.id}</Tag>
                                  ))}
                                </Space>
                              </div>
                            )}
                          </Panel>
                        )
                      })}
                    </Collapse>
                  </div>
                )}

                {/* 空状态 */}
                {providers.length === 0 && (
                  <Card>
                    <div style={{ textAlign: 'center', padding: 40 }}>
                      <CloudServerOutlined style={{ fontSize: 48, color: '#ccc' }} />
                      <div style={{ marginTop: 16, color: '#999' }}>暂无 Provider，请先添加</div>
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => { resetProviderForm(); setShowAddProvider(true) }} style={{ marginTop: 16 }}>
                        添加 Provider
                      </Button>
                    </div>
                  </Card>
                )}
              </Space>
            )
          },

          // ========== Tab 2: Agent 模型配置 ==========
          {
            key: 'agents',
            label: <Space><RobotOutlined />Agent 模型配置</Space>,
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* 全局默认 */}
                <Card size="small" title="全局默认模型">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text>主模型</Text>
                      <Select
                        value={defaultPrimary}
                        onChange={(v) => setDefaultPrimary(v)}
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
                        onChange={(v) => setDefaultFallbacks(v)}
                        options={allModelOptions}
                        placeholder="选择 fallback 模型"
                        style={{ width: 350 }}
                        showSearch
                        optionFilterProp="label"
                      />
                    </div>
                    <Button type="primary" onClick={() => handleUpdateAgentModel('__defaults__', defaultPrimary, defaultFallbacks)}>
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
                    onSave={(primary, fallbacks) => handleUpdateAgentModel(agent.id, primary, fallbacks)}
                  />
                ))}
              </Space>
            ),
          },
        ]}
      />

      {/* ========== 添加/编辑 Provider 模态框 ========== */}
      <Modal
        title={editingProvider ? '编辑 Provider' : '添加 Provider'}
        open={showAddProvider}
        onOk={handleSaveProvider}
        onCancel={() => { setShowAddProvider(false); resetProviderForm() }}
        okText="保存"
        cancelText="取消"
        okButtonProps={{ disabled: !formProviderId || !formBaseUrl }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text>Provider ID</Text>
            <Input value={formProviderId}
              onChange={e => setFormProviderId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="my-provider" disabled={!!editingProvider} style={{ marginTop: 4 }} />
          </div>
          <div>
            <Text>显示名称</Text>
            <Input value={formProviderName} onChange={e => setFormProviderName(e.target.value)}
              placeholder="My Provider" style={{ marginTop: 4 }} />
          </div>
          <div>
            <Text>Base URL <Text type="danger">*</Text></Text>
            <Input value={formBaseUrl} onChange={e => setFormBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1" style={{ marginTop: 4 }} />
          </div>
          <div>
            <Text>API Key</Text>
            <Password value={formApiKey} onChange={e => setFormApiKey(e.target.value)}
              placeholder={editingProvider ? '留空保持不变' : 'sk-xxxxxxxx'} style={{ marginTop: 4 }}
              iconRender={v => v ? <EyeOutlined /> : <EyeInvisibleOutlined />} />
          </div>
          <div>
            <Text>API 类型</Text>
            <Select value={formApi} onChange={setFormApi} style={{ width: '100%', marginTop: 4 }}
              options={[
                { label: 'OpenAI Completions', value: 'openai-completions' },
                { label: 'Anthropic', value: 'anthropic' },
              ]} />
          </div>
        </Space>
      </Modal>

      {/* ========== 添加模型模态框 ========== */}
      <Modal
        title="添加模型"
        open={showAddModel}
        onOk={handleAddModel}
        onCancel={() => { setShowAddModel(false); resetModelForm() }}
        okText="添加"
        cancelText="取消"
        okButtonProps={{ disabled: !targetProviderId || !formModelId }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text>选择 Provider <Text type="danger">*</Text></Text>
            <Select value={targetProviderId} onChange={setTargetProviderId} placeholder="选择 Provider"
              options={customProviders.map(p => ({ label: p.name, value: p.id }))}
              style={{ width: '100%', marginTop: 4 }} />
          </div>
          <div>
            <Text>模型 ID <Text type="danger">*</Text></Text>
            <Input value={formModelId} onChange={e => setFormModelId(e.target.value)}
              placeholder="gpt-4o" style={{ marginTop: 4 }} />
          </div>
          <div>
            <Text>显示名称</Text>
            <Input value={formModelName} onChange={e => setFormModelName(e.target.value)}
              placeholder="GPT-4o" style={{ marginTop: 4 }} />
          </div>
          <div>
            <Text>上下文窗口</Text>
            <Input type="number" value={formContextWindow} onChange={e => setFormContextWindow(e.target.value)}
              placeholder="128000" style={{ marginTop: 4 }} />
          </div>
          <div>
            <Text>最大输出 Token</Text>
            <Input type="number" value={formMaxTokens} onChange={e => setFormMaxTokens(e.target.value)}
              placeholder="4096" style={{ marginTop: 4 }} />
          </div>
        </Space>
      </Modal>
    </div>
  )
}

// ========== Agent 模型配置卡片 ==========

interface AgentModelCardProps {
  agent: AgentModelConfig
  modelOptions: Array<{ label: string; value: string }>
  onSave: (primary: string, fallbacks: string[]) => void
}

function AgentModelCard({ agent, modelOptions, onSave }: AgentModelCardProps) {
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
