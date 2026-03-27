import { useState, useEffect } from 'react'
import { Typography, Card, Spin, Button, Space, Tag, Modal, Input, Alert, Divider, Table, Tooltip, Select, message } from 'antd'
import {
  CloudServerOutlined,
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  ExperimentOutlined,
  KeyOutlined,
} from '@ant-design/icons'
import { readConfig, writeConfig } from '../../services/tauri'

const { Title, Text, Paragraph } = Typography
const { Password } = Input

// Provider 配置
interface Provider {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  api: string
  models: Model[]
}

interface Model {
  id: string
  name: string
  reasoning: boolean
  contextWindow: number
  maxTokens: number
}

// 模型别名
interface ModelAlias {
  modelId: string
  alias: string
}

export default function ModelsPage() {
  const [loading, setLoading] = useState(true)
  const [providers, setProviders] = useState<Provider[]>([])
  const [modelAliases, setModelAliases] = useState<ModelAlias[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 模态框状态
  const [showAddProvider, setShowAddProvider] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [showAddModel, setShowAddModel] = useState(false)
  const [targetProviderId, setTargetProviderId] = useState<string>('')

  // 表单状态
  const [formProviderId, setFormProviderId] = useState('')
  const [formProviderName, setFormProviderName] = useState('')
  const [formBaseUrl, setFormBaseUrl] = useState('')
  const [formApiKey, setFormApiKey] = useState('')
  const [formApi, setFormApi] = useState('openai-completions')

  // 模型表单
  const [formModelId, setFormModelId] = useState('')
  const [formModelName, setFormModelName] = useState('')
  const [formContextWindow, setFormContextWindow] = useState('128000')
  const [formMaxTokens, setFormMaxTokens] = useState('4096')

  // 测试状态
  const [testingProvider, setTestingProvider] = useState<string | null>(null)

  const loadConfig = async () => {
    setLoading(true)
    setError(null)
    try {
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>
      const modelsConfig = (parsed.models as Record<string, unknown>) || {}
      const providersConfig = (modelsConfig.providers as Record<string, unknown>) || {}
      const aliasesConfig = (modelsConfig.models as Record<string, unknown>) || {}

      // 解析 providers
      const providerList: Provider[] = Object.entries(providersConfig).map(([id, config]) => {
        const cfg = config as Record<string, unknown>
        const models = (cfg.models as Array<Record<string, unknown>>) || []
        return {
          id,
          name: (cfg.name as string) || id,
          baseUrl: (cfg.baseUrl as string) || '',
          apiKey: (cfg.apiKey as string) || '',
          api: (cfg.api as string) || 'openai-completions',
          models: models.map(m => ({
            id: m.id as string,
            name: (m.name as string) || (m.id as string),
            reasoning: (m.reasoning as boolean) || false,
            contextWindow: (m.contextWindow as number) || 128000,
            maxTokens: (m.maxTokens as number) || 4096,
          })),
        }
      })

      // 解析 aliases
      const aliasList: ModelAlias[] = Object.entries(aliasesConfig).map(([modelId, config]) => {
        const cfg = config as Record<string, unknown>
        return {
          modelId,
          alias: (cfg.alias as string) || '',
        }
      })

      setProviders(providerList)
      setModelAliases(aliasList)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载配置失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadConfig() }, [])

  // 重置表单
  const resetProviderForm = () => {
    setFormProviderId('')
    setFormProviderName('')
    setFormBaseUrl('')
    setFormApiKey('')
    setFormApi('openai-completions')
    setEditingProvider(null)
  }

  const resetModelForm = () => {
    setFormModelId('')
    setFormModelName('')
    setFormContextWindow('128000')
    setFormMaxTokens('4096')
    setTargetProviderId('')
  }

  // 添加/编辑 Provider
  const handleSaveProvider = async () => {
    if (!formProviderId || !formBaseUrl) return

    try {
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>
      const modelsConfig = (parsed.models as Record<string, unknown>) || {}
      const providersConfig = (modelsConfig.providers as Record<string, unknown>) || {}

      if (editingProvider) {
        // 编辑现有 Provider
        const existing = providersConfig[editingProvider.id] as Record<string, unknown>
        providersConfig[formProviderId] = {
          ...existing,
          baseUrl: formBaseUrl,
          apiKey: formApiKey,
          api: formApi,
          name: formProviderName || formProviderId,
        }
        // 如果 ID 变了，删除旧的
        if (formProviderId !== editingProvider.id) {
          delete providersConfig[editingProvider.id]
        }
      } else {
        // 添加新 Provider
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

  // 删除 Provider
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

  // 添加模型
  const handleAddModel = async () => {
    if (!targetProviderId || !formModelId) return

    try {
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>
      const modelsConfig = (parsed.models as Record<string, unknown>) || {}
      const providersConfig = (modelsConfig.providers as Record<string, unknown>) || {}
      const provider = providersConfig[targetProviderId] as Record<string, unknown>

      if (!provider) {
        setError('Provider 不存在')
        return
      }

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

  // 测试 API 连通性
  const handleTestProvider = async (provider: Provider) => {
    setTestingProvider(provider.id)
    try {
      // 简单测试：发送一个请求到 API
      const response = await fetch(`${provider.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
        },
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

  // 编辑 Provider
  const handleEditProvider = (provider: Provider) => {
    setEditingProvider(provider)
    setFormProviderId(provider.id)
    setFormProviderName(provider.name)
    setFormBaseUrl(provider.baseUrl)
    setFormApiKey(provider.apiKey)
    setFormApi(provider.api)
    setShowAddProvider(true)
  }

  // Provider 表格列
  const providerColumns = [
    {
      title: 'Provider',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Provider) => (
        <Space>
          <CloudServerOutlined />
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>({record.id})</Text>
        </Space>
      ),
    },
    {
      title: 'Base URL',
      dataIndex: 'baseUrl',
      key: 'baseUrl',
      render: (url: string) => (
        <Text code style={{ fontSize: 12 }}>{url}</Text>
      ),
    },
    {
      title: 'API Key',
      dataIndex: 'apiKey',
      key: 'apiKey',
      render: (key: string) => (
        <Space>
          <KeyOutlined />
          <Text>{key ? '••••••••' : '未配置'}</Text>
        </Space>
      ),
    },
    {
      title: '模型数量',
      key: 'modelCount',
      render: (_: unknown, record: Provider) => (
        <Tag color="blue">{record.models.length} 个模型</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Provider) => (
        <Space>
          <Tooltip title="测试连通性">
            <Button
              size="small"
              icon={<ExperimentOutlined />}
              loading={testingProvider === record.id}
              onClick={() => handleTestProvider(record)}
            >
              测试
            </Button>
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditProvider(record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteProvider(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载模型配置...</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <CloudServerOutlined /> 模型配置
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadConfig}>刷新</Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { resetProviderForm(); setShowAddProvider(true) }}
          >
            添加 Provider
          </Button>
        </Space>
      </div>

      {error && <Alert type="error" message={error} showIcon closable style={{ marginBottom: 16 }} />}
      {success && <Alert type="success" message={success} showIcon closable style={{ marginBottom: 16 }} />}

      {/* Provider 列表 */}
      <Card title="Provider 列表" style={{ marginBottom: 24 }}>
        <Table
          dataSource={providers}
          columns={providerColumns}
          rowKey="id"
          pagination={false}
          size="middle"
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ padding: '0 24px' }}>
                <Text strong>模型列表：</Text>
                <div style={{ marginTop: 8 }}>
                  {record.models.length === 0 ? (
                    <Text type="secondary">暂无模型</Text>
                  ) : (
                    <Space wrap>
                      {record.models.map((model) => (
                        <Tag key={model.id} color="blue">
                          {model.name}
                          <Text type="secondary" style={{ marginLeft: 4, fontSize: 11 }}>
                            ({model.contextWindow / 1000}K)
                          </Text>
                        </Tag>
                      ))}
                    </Space>
                  )}
                </div>
              </div>
            ),
          }}
        />
      </Card>

      {/* 快速添加模型 */}
      <Card
        title="快速添加模型"
        size="small"
        extra={
          <Button
            type="link"
            icon={<PlusOutlined />}
            onClick={() => setShowAddModel(true)}
          >
            添加到 Provider
          </Button>
        }
      >
        <Text type="secondary">
          点击「添加到 Provider」可以为指定 Provider 添加新的模型。
        </Text>
      </Card>

      {/* 使用说明 */}
      <Card title="使用说明" size="small" style={{ marginTop: 16 }}>
        <div style={{ lineHeight: 2 }}>
          <div>
            <Space>
              <QuestionCircleOutlined style={{ color: '#999' }} />
              <Text>Provider 是 AI 模型的提供商，如 OpenAI、Anthropic、或自定义 API</Text>
            </Space>
          </div>
          <div>
            <Space>
              <QuestionCircleOutlined style={{ color: '#999' }} />
              <Text>每个 Provider 可以配置多个模型，Agent 可以选择使用哪个模型</Text>
            </Space>
          </div>
          <div>
            <Space>
              <QuestionCircleOutlined style={{ color: '#999' }} />
              <Text>API Key 使用密码输入框保护，不会明文显示</Text>
            </Space>
          </div>
          <div>
            <Space>
              <QuestionCircleOutlined style={{ color: '#999' }} />
              <Text>测试连通性会发送请求到 API 验证配置是否正确</Text>
            </Space>
          </div>
        </div>
      </Card>

      {/* 添加/编辑 Provider 模态框 */}
      <Modal
        title={editingProvider ? '编辑 Provider' : '添加 Provider'}
        open={showAddProvider}
        onOk={handleSaveProvider}
        onCancel={() => { setShowAddProvider(false); resetProviderForm() }}
        okText="保存"
        cancelText="取消"
        okButtonProps={{ disabled: !formProviderId || !formBaseUrl }}
      >
        <Space orientation="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Space>
              <Text>Provider ID</Text>
              <Tooltip title="Provider 的唯一标识符，只能包含小写字母、数字和连字符">
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
            <Input
              value={formProviderId}
              onChange={(e) => setFormProviderId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="my-provider"
              disabled={!!editingProvider}
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <Space>
              <Text>显示名称</Text>
              <Tooltip title="Provider 的显示名称，用于界面展示">
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
            <Input
              value={formProviderName}
              onChange={(e) => setFormProviderName(e.target.value)}
              placeholder="My Provider"
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <Space>
              <Text>Base URL <Text type="danger">*</Text></Text>
              <Tooltip title="API 的基础 URL，如 https://api.openai.com/v1">
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
            <Input
              value={formBaseUrl}
              onChange={(e) => setFormBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <Space>
              <Text>API Key</Text>
              <Tooltip title="API 密钥，用于身份验证。请妥善保管，不要泄露">
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
            <Password
              value={formApiKey}
              onChange={(e) => setFormApiKey(e.target.value)}
              placeholder="sk-xxxxxxxxxxxxxxxx"
              iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <Space>
              <Text>API 类型</Text>
              <Tooltip title="API 的协议类型，大多数提供商使用 OpenAI 兼容格式">
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
            <Select
              value={formApi}
              onChange={setFormApi}
              options={[
                { label: 'OpenAI Completions', value: 'openai-completions' },
                { label: 'OpenAI Responses', value: 'openai-responses' },
                { label: 'Anthropic', value: 'anthropic' },
              ]}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>
        </Space>
      </Modal>

      {/* 添加模型模态框 */}
      <Modal
        title="添加模型"
        open={showAddModel}
        onOk={handleAddModel}
        onCancel={() => { setShowAddModel(false); resetModelForm() }}
        okText="添加"
        cancelText="取消"
        okButtonProps={{ disabled: !targetProviderId || !formModelId }}
      >
        <Space orientation="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Space>
              <Text>选择 Provider <Text type="danger">*</Text></Text>
              <Tooltip title="选择要添加模型的 Provider">
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
            <Select
              value={targetProviderId}
              onChange={setTargetProviderId}
              placeholder="选择 Provider"
              options={providers.map(p => ({ label: p.name, value: p.id }))}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>
          <div>
            <Space>
              <Text>模型 ID <Text type="danger">*</Text></Text>
              <Tooltip title="模型的唯一标识符，如 gpt-4、claude-3-opus">
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
            <Input
              value={formModelId}
              onChange={(e) => setFormModelId(e.target.value)}
              placeholder="gpt-4"
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <Space>
              <Text>显示名称</Text>
              <Tooltip title="模型的显示名称，用于界面展示">
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
            <Input
              value={formModelName}
              onChange={(e) => setFormModelName(e.target.value)}
              placeholder="GPT-4"
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <Space>
              <Text>上下文窗口</Text>
              <Tooltip title="模型支持的最大上下文长度（token 数）">
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
            <Input
              type="number"
              value={formContextWindow}
              onChange={(e) => setFormContextWindow(e.target.value)}
              placeholder="128000"
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <Space>
              <Text>最大输出 Token</Text>
              <Tooltip title="模型单次输出的最大 token 数">
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
            <Input
              type="number"
              value={formMaxTokens}
              onChange={(e) => setFormMaxTokens(e.target.value)}
              placeholder="4096"
              style={{ marginTop: 4 }}
            />
          </div>
        </Space>
      </Modal>
    </div>
  )
}
