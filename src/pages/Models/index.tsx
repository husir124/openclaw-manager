/**
 * 模型配置页面
 *
 * 两个 Tab：
 * 1. Provider 列表：显示自定义 Provider（CRUD）+ 内置 Provider（openrouter 等）
 * 2. Agent 模型配置：为每个 Agent 和全局默认设置主模型 + fallback
 *
 * 数据流：
 * loadConfig() → 读取 openclaw.json → 解析 models.providers + agents.list
 * 修改 → 直接写入 openclaw.json → loadConfig() 刷新
 */
import { useState, useEffect } from 'react'
import { Typography, Spin, Button, Space, Tag, Alert, Tabs, message } from 'antd'
import { CloudServerOutlined, PlusOutlined, ReloadOutlined, RobotOutlined } from '@ant-design/icons'
import { readConfig, writeConfig } from '../../services/tauri'
import type { Provider, AgentModelConfig } from './types'
import { BUILTIN_PROVIDERS } from './data'
import ProviderList from './components/ProviderList'
import { ProviderFormModal, AddModelModal } from './components/ModelModals'
import AgentModelTab from './components/AgentModelTab'

const { Title } = Typography

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

  // 构建可用模型列表
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

      // 1. 解析自定义 providers
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

      // 2. 从 agent 模型引用中提取 provider 和模型
      const allModelRefs = [
        (defaultsModel.primary as string) || '',
        ...((defaultsModel.fallbacks as string[]) || []),
        ...agentsList.flatMap(a => {
          const m = (a.model as Record<string, unknown>) || {}
          return [(m.primary as string) || '', ...((m.fallbacks as string[]) || [])]
        }),
      ].filter(Boolean)

      const referencedProviderIds = new Set<string>()
      const builtinProviderModels = new Map<string, Set<string>>()
      for (const ref of allModelRefs) {
        const slashIdx = ref.indexOf('/')
        if (slashIdx > 0) {
          const providerId = ref.substring(0, slashIdx)
          const modelId = ref.substring(slashIdx + 1)
          referencedProviderIds.add(providerId)
          if (!builtinProviderModels.has(providerId)) {
            builtinProviderModels.set(providerId, new Set())
          }
          builtinProviderModels.get(providerId)!.add(modelId)
        }
      }

      // 3. 合并：自定义 + 内置 provider
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
              id: mid, name: mid, reasoning: false, contextWindow: 0, maxTokens: 0,
            })),
            isBuiltin: true,
          })
        }
      }

      // 4. 解析 agent 模型配置
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

  const resetProviderForm = () => {
    setFormProviderId(''); setFormProviderName(''); setFormBaseUrl('')
    setFormApiKey(''); setFormApi('openai-completions'); setEditingProvider(null)
  }

  const resetModelForm = () => {
    setFormModelId(''); setFormModelName('')
    setFormContextWindow('128000'); setFormMaxTokens('4096'); setTargetProviderId('')
  }

  // ========== Provider 操作 ==========

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
        if (formProviderId !== editingProvider.id) delete providersConfig[editingProvider.id]
      } else {
        if (providersConfig[formProviderId]) { setError(`Provider "${formProviderId}" 已存在`); return }
        providersConfig[formProviderId] = {
          baseUrl: formBaseUrl, apiKey: formApiKey, api: formApi,
          name: formProviderName || formProviderId, models: [],
        }
      }
      modelsConfig.providers = providersConfig; parsed.models = modelsConfig
      await writeConfig(JSON.stringify(parsed, null, 2))
      setShowAddProvider(false); resetProviderForm()
      setSuccess(editingProvider ? 'Provider 更新成功' : 'Provider 添加成功')
      await loadConfig()
    } catch (err) { setError(err instanceof Error ? err.message : '保存失败') }
  }

  const handleDeleteProvider = async (providerId: string) => {
    try {
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>
      const modelsConfig = (parsed.models as Record<string, unknown>) || {}
      const providersConfig = (modelsConfig.providers as Record<string, unknown>) || {}
      delete providersConfig[providerId]
      modelsConfig.providers = providersConfig; parsed.models = modelsConfig
      await writeConfig(JSON.stringify(parsed, null, 2))
      setSuccess(`Provider "${providerId}" 已删除`); await loadConfig()
    } catch (err) { setError(err instanceof Error ? err.message : '删除失败') }
  }

  const handleEditProvider = (provider: Provider) => {
    if (provider.isBuiltin) { setError('内置 Provider 不可编辑，OpenClaw 自动管理'); return }
    setEditingProvider(provider)
    setFormProviderId(provider.id); setFormProviderName(provider.name)
    setFormBaseUrl(provider.baseUrl); setFormApiKey(''); setFormApi(provider.api)
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
        providersConfig[providerId] = provider; modelsConfig.providers = providersConfig
        parsed.models = modelsConfig
        await writeConfig(JSON.stringify(parsed, null, 2))
        setSuccess(`模型 "${modelId}" 已删除`); await loadConfig()
      }
    } catch (err) { setError(err instanceof Error ? err.message : '删除失败') }
  }

  // ========== 模型操作 ==========

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
      if (models.some(m => m.id === formModelId)) { setError(`模型 "${formModelId}" 已存在`); return }
      models.push({
        id: formModelId, name: formModelName || formModelId, reasoning: false,
        input: ['text'], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: parseInt(formContextWindow) || 128000, maxTokens: parseInt(formMaxTokens) || 4096,
      })
      provider.models = models; providersConfig[targetProviderId] = provider
      modelsConfig.providers = providersConfig; parsed.models = modelsConfig
      await writeConfig(JSON.stringify(parsed, null, 2))
      setShowAddModel(false); resetModelForm()
      setSuccess('模型添加成功'); await loadConfig()
    } catch (err) { setError(err instanceof Error ? err.message : '添加失败') }
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
        model.primary = primary; model.fallbacks = fallbacks
        defaults.model = model; agentsConfig.defaults = defaults
      } else {
        const agentsList = (agentsConfig.list as Array<Record<string, unknown>>) || []
        const agent = agentsList.find(a => a.id === agentId)
        if (agent) {
          const model = (agent.model as Record<string, unknown>) || {}
          model.primary = primary; model.fallbacks = fallbacks; agent.model = model
        }
      }
      parsed.agents = agentsConfig
      await writeConfig(JSON.stringify(parsed, null, 2))
      setSuccess('Agent 模型配置已保存'); await loadConfig()
    } catch (err) { setError(err instanceof Error ? err.message : '保存失败') }
  }

  // ========== 测试连通性 ==========

  const handleTestProvider = async (provider: Provider) => {
    if (provider.isBuiltin) { message.info('内置 Provider 的连通性由 OpenClaw 管理'); return }
    setTestingProvider(provider.id)
    try {
      const response = await fetch(`${provider.baseUrl}/models`, {
        method: 'GET', headers: { 'Authorization': `Bearer ${provider.apiKey}` },
      })
      if (response.ok) setSuccess(`${provider.name} 连通性测试成功`)
      else setError(`${provider.name} 连通性测试失败: ${response.status}`)
    } catch (err) {
      setError(`${provider.name} 连通性测试失败: ${err instanceof Error ? err.message : '网络错误'}`)
    } finally { setTestingProvider(null) }
  }

  // ========== 渲染 ==========

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
          {
            key: 'providers',
            label: <Space><CloudServerOutlined />Provider 列表</Space>,
            children: (
              <ProviderList
                customProviders={customProviders}
                builtinProviders={builtinProviders}
                testingProvider={testingProvider}
                onEditProvider={handleEditProvider}
                onDeleteProvider={handleDeleteProvider}
                onTestProvider={handleTestProvider}
                onAddModel={(id) => { setTargetProviderId(id); setShowAddModel(true) }}
                onDeleteModel={handleDeleteModel}
              />
            ),
          },
          {
            key: 'agents',
            label: <Space><RobotOutlined />Agent 模型配置</Space>,
            children: (
              <AgentModelTab
                defaultPrimary={defaultPrimary}
                defaultFallbacks={defaultFallbacks}
                agents={agents}
                allModelOptions={allModelOptions}
                onDefaultPrimaryChange={setDefaultPrimary}
                onDefaultFallbacksChange={setDefaultFallbacks}
                onUpdateAgentModel={handleUpdateAgentModel}
              />
            ),
          },
        ]}
      />

      <ProviderFormModal
        open={showAddProvider}
        editingProvider={editingProvider}
        formProviderId={formProviderId}
        formProviderName={formProviderName}
        formBaseUrl={formBaseUrl}
        formApiKey={formApiKey}
        formApi={formApi}
        onProviderIdChange={setFormProviderId}
        onProviderNameChange={setFormProviderName}
        onBaseUrlChange={setFormBaseUrl}
        onApiKeyChange={setFormApiKey}
        onApiChange={setFormApi}
        onOk={handleSaveProvider}
        onCancel={() => { setShowAddProvider(false); resetProviderForm() }}
      />

      <AddModelModal
        open={showAddModel}
        targetProviderId={targetProviderId}
        formModelId={formModelId}
        formModelName={formModelName}
        formContextWindow={formContextWindow}
        formMaxTokens={formMaxTokens}
        customProviders={customProviders}
        onTargetProviderChange={setTargetProviderId}
        onModelIdChange={setFormModelId}
        onModelNameChange={setFormModelName}
        onContextWindowChange={setFormContextWindow}
        onMaxTokensChange={setFormMaxTokens}
        onOk={handleAddModel}
        onCancel={() => { setShowAddModel(false); resetModelForm() }}
      />
    </div>
  )
}
