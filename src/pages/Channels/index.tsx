import { useState, useEffect } from 'react'
import { Typography, Card, Spin, Button, Space, Tag, Modal, Input, Alert, Tooltip, Switch, Divider } from 'antd'
import {
  ApiOutlined,
  CloudOutlined,
  MessageOutlined,
  WechatOutlined,
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { readConfig, writeConfig } from '../../services/tauri'

const { Title, Text, Paragraph } = Typography
const { Password } = Input

// 渠道类型定义
interface ChannelType {
  id: string
  name: string
  icon: React.ReactNode
  available: boolean
  description: string
  fields: ChannelField[]
}

interface ChannelField {
  key: string
  label: string
  placeholder: string
  required: boolean
  tooltip: string
  type: 'text' | 'password' | 'select' | 'switch'
  options?: { label: string; value: string }[]
  defaultValue?: string | boolean
}

// 支持的渠道类型
const CHANNEL_TYPES: ChannelType[] = [
  {
    id: 'feishu',
    name: '飞书',
    icon: <CloudOutlined />,
    available: true,
    description: '飞书企业通讯平台',
    fields: [
      {
        key: 'appId',
        label: 'App ID',
        placeholder: 'cli_xxxxxxxxxxxxxxxx',
        required: true,
        tooltip: '飞书开放平台应用的 App ID',
        type: 'text',
      },
      {
        key: 'appSecret',
        label: 'App Secret',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        required: true,
        tooltip: '飞书开放平台应用的 App Secret',
        type: 'password',
      },
      {
        key: 'connectionMode',
        label: '连接模式',
        placeholder: '',
        required: false,
        tooltip: 'websocket：实时推送；webhook：需配置回调地址',
        type: 'select',
        options: [
          { label: 'WebSocket（推荐）', value: 'websocket' },
          { label: 'Webhook', value: 'webhook' },
        ],
        defaultValue: 'websocket',
      },
      {
        key: 'groupPolicy',
        label: '群组策略',
        placeholder: '',
        required: false,
        tooltip: 'open：任何群组可使用；allowlist：仅白名单群组',
        type: 'select',
        options: [
          { label: '开放模式', value: 'open' },
          { label: '白名单模式', value: 'allowlist' },
        ],
        defaultValue: 'open',
      },
      {
        key: 'requireMention',
        label: '需要 @提及',
        placeholder: '',
        required: false,
        tooltip: '开启后，群组中需要 @机器人 才会响应',
        type: 'switch',
        defaultValue: true,
      },
    ],
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: <MessageOutlined />,
    available: true,
    description: 'Telegram 即时通讯平台',
    fields: [
      {
        key: 'botToken',
        label: 'Bot Token',
        placeholder: '1234567890:xxxxxxxxxxxxxxxxxxxxxxxx',
        required: true,
        tooltip: '通过 @BotFather 创建机器人后获得的 Token',
        type: 'password',
      },
      {
        key: 'dmPolicy',
        label: '私聊策略',
        placeholder: '',
        required: false,
        tooltip: 'pairing：需要配对授权；open：任何人可使用',
        type: 'select',
        options: [
          { label: '配对授权（推荐）', value: 'pairing' },
          { label: '开放模式', value: 'open' },
        ],
        defaultValue: 'pairing',
      },
      {
        key: 'groupPolicy',
        label: '群组策略',
        placeholder: '',
        required: false,
        tooltip: 'open：任何群组可使用；allowlist：仅白名单群组',
        type: 'select',
        options: [
          { label: '开放模式', value: 'open' },
          { label: '白名单模式', value: 'allowlist' },
        ],
        defaultValue: 'open',
      },
    ],
  },
  {
    id: 'wechat',
    name: '微信',
    icon: <WechatOutlined />,
    available: false,
    description: '微信公众号/小程序（即将支持）',
    fields: [],
  },
]

// 已配置的渠道
interface ConfiguredChannel {
  id: string
  type: string
  name: string
  enabled: boolean
  accounts: number
}

export default function ChannelsPage() {
  const [loading, setLoading] = useState(true)
  const [channels, setChannels] = useState<ConfiguredChannel[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 模态框状态
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [selectedChannelType, setSelectedChannelType] = useState<ChannelType | null>(null)
  const [editingAccountId, setEditingAccountId] = useState<string>('')
  const [formFields, setFormFields] = useState<Record<string, string | boolean>>({})

  const loadChannels = async () => {
    setLoading(true)
    setError(null)
    try {
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>
      const channelsConfig = (parsed.channels as Record<string, unknown>) || {}

      // 解析已配置的渠道
      const configuredList: ConfiguredChannel[] = []

      for (const channelType of CHANNEL_TYPES) {
        const channelConfig = channelsConfig[channelType.id] as Record<string, unknown>
        if (channelConfig) {
          const accounts = channelConfig.accounts as Record<string, unknown> || {}
          const accountCount = Object.keys(accounts).length

          // 对于 telegram，检查是否有 botToken
          if (channelType.id === 'telegram' && channelConfig.botToken) {
            configuredList.push({
              id: channelType.id,
              type: channelType.id,
              name: channelType.name,
              enabled: channelConfig.enabled !== false,
              accounts: 1,
            })
          } else if (accountCount > 0) {
            configuredList.push({
              id: channelType.id,
              type: channelType.id,
              name: channelType.name,
              enabled: true,
              accounts: accountCount,
            })
          }
        }
      }

      setChannels(configuredList)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载渠道配置失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadChannels() }, [])

  // 打开配置模态框
  const handleOpenConfig = (channelType: ChannelType, accountId?: string) => {
    setSelectedChannelType(channelType)
    setEditingAccountId(accountId || '')

    // 加载现有配置
    if (accountId) {
      // TODO: 加载现有配置
    } else {
      // 设置默认值
      const defaults: Record<string, string | boolean> = {}
      channelType.fields.forEach(f => {
        if (f.defaultValue !== undefined) {
          defaults[f.key] = f.defaultValue
        }
      })
      setFormFields(defaults)
    }

    setShowConfigModal(true)
  }

  // 保存配置
  const handleSaveConfig = async () => {
    if (!selectedChannelType) return

    try {
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>
      const channelsConfig = (parsed.channels as Record<string, unknown>) || {}

      if (selectedChannelType.id === 'telegram') {
        // Telegram 配置
        channelsConfig.telegram = {
          enabled: true,
          botToken: formFields.botToken || '',
          dmPolicy: formFields.dmPolicy || 'pairing',
          groupPolicy: formFields.groupPolicy || 'open',
          commands: { native: true, nativeSkills: true },
          actions: {
            reactions: true,
            sendMessage: true,
            deleteMessage: true,
            sticker: true,
          },
        }
      } else if (selectedChannelType.id === 'feishu') {
        // 飞书配置
        const feishuConfig = (channelsConfig.feishu as Record<string, unknown>) || {}
        const accounts = (feishuConfig.accounts as Record<string, unknown>) || {}
        const accountId = editingAccountId || 'default'

        accounts[accountId] = {
          appId: formFields.appId || '',
          appSecret: formFields.appSecret || '',
          enabled: true,
          connectionMode: formFields.connectionMode || 'websocket',
          groupPolicy: formFields.groupPolicy || 'open',
          requireMention: formFields.requireMention !== false,
          threadSession: true,
          streaming: true,
        }

        feishuConfig.accounts = accounts
        channelsConfig.feishu = feishuConfig
      }

      parsed.channels = channelsConfig
      await writeConfig(JSON.stringify(parsed, null, 2))

      setShowConfigModal(false)
      setSuccess(`${selectedChannelType.name} 配置保存成功`)
      await loadChannels()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    }
  }

  // 渲染表单字段
  const renderField = (field: ChannelField) => {
    const value = formFields[field.key]

    switch (field.type) {
      case 'password':
        return (
          <Password
            value={value as string}
            onChange={(e) => setFormFields({ ...formFields, [field.key]: e.target.value })}
            placeholder={field.placeholder}
            iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
          />
        )
      case 'select':
        return (
          <Input.Group compact>
            <select
              value={value as string}
              onChange={(e) => setFormFields({ ...formFields, [field.key]: e.target.value })}
              style={{ width: '100%', padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: 6 }}
            >
              {field.options?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </Input.Group>
        )
      case 'switch':
        return (
          <Switch
            checked={value as boolean}
            onChange={(checked) => setFormFields({ ...formFields, [field.key]: checked })}
          />
        )
      default:
        return (
          <Input
            value={value as string}
            onChange={(e) => setFormFields({ ...formFields, [field.key]: e.target.value })}
            placeholder={field.placeholder}
          />
        )
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载渠道配置...</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <ApiOutlined /> 渠道配置
        </Title>
        <Button icon={<ReloadOutlined />} onClick={loadChannels}>刷新</Button>
      </div>

      {error && <Alert type="error" message={error} showIcon closable style={{ marginBottom: 16 }} />}
      {success && <Alert type="success" message={success} showIcon closable style={{ marginBottom: 16 }} />}

      {/* 渠道类型列表 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {CHANNEL_TYPES.map((channelType) => {
          const configured = channels.find(c => c.type === channelType.id)

          return (
            <Card
              key={channelType.id}
              title={
                <Space>
                  {channelType.icon}
                  <Text strong>{channelType.name}</Text>
                  {!channelType.available && <Tag color="default">即将支持</Tag>}
                </Space>
              }
              size="small"
              extra={
                channelType.available && (
                  configured ? (
                    <Tag color="success" icon={<CheckCircleOutlined />}>已配置</Tag>
                  ) : (
                    <Tag color="default">未配置</Tag>
                  )
                )
              }
            >
              <div style={{ lineHeight: 2 }}>
                <div><Text type="secondary">说明：</Text><Text>{channelType.description}</Text></div>
                {configured && (
                  <>
                    <div>
                      <Text type="secondary">状态：</Text>
                      <Tag color={configured.enabled ? 'success' : 'default'}>
                        {configured.enabled ? '已启用' : '已禁用'}
                      </Tag>
                    </div>
                    {configured.accounts > 0 && (
                      <div><Text type="secondary">账户数：</Text><Tag>{configured.accounts}</Tag></div>
                    )}
                  </>
                )}
              </div>

              <Divider style={{ margin: '12px 0' }} />

              <Space>
                {channelType.available && (
                  <Button
                    type={configured ? 'default' : 'primary'}
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleOpenConfig(channelType)}
                  >
                    {configured ? '编辑配置' : '配置'}
                  </Button>
                )}
              </Space>
            </Card>
          )
        })}
      </div>

      {/* 使用说明 */}
      <Card title="使用说明" size="small" style={{ marginTop: 24 }}>
        <div style={{ lineHeight: 2.5 }}>
          <div>
            <Space>
              <QuestionCircleOutlined style={{ color: '#999' }} />
              <Text>每个渠道是一个独立的通讯平台，配置后 Agent 可以通过该渠道接收和发送消息</Text>
            </Space>
          </div>
          <div>
            <Space>
              <QuestionCircleOutlined style={{ color: '#999' }} />
              <Text>飞书支持多个账户，每个账户可以连接不同的飞书应用</Text>
            </Space>
          </div>
          <div>
            <Space>
              <QuestionCircleOutlined style={{ color: '#999' }} />
              <Text>Telegram 只需要配置一个 Bot Token，所有 Agent 共用</Text>
            </Space>
          </div>
          <div>
            <Space>
              <QuestionCircleOutlined style={{ color: '#999' }} />
              <Text>凭证信息使用密码输入框保护，不会明文显示</Text>
            </Space>
          </div>
          <div>
            <Space>
              <QuestionCircleOutlined style={{ color: '#999' }} />
              <Text>配置完成后需要重启 Gateway 才能生效</Text>
            </Space>
          </div>
        </div>
      </Card>

      {/* 配置模态框 */}
      <Modal
        title={`配置 ${selectedChannelType?.name}`}
        open={showConfigModal}
        onOk={handleSaveConfig}
        onCancel={() => setShowConfigModal(false)}
        okText="保存"
        cancelText="取消"
        width={500}
      >
        <Space orientation="vertical" style={{ width: '100%' }} size="large">
          {selectedChannelType?.id === 'telegram' && (
            <Alert
              type="warning"
              message="配置前请完成以下步骤"
              description={
                <div style={{ marginTop: 8 }}>
                  <div>1. 在 Telegram 搜索 @BotFather，执行 /newbot</div>
                  <div>2. 获取 Bot Token</div>
                  <div style={{ color: '#faad14', fontWeight: 'bold' }}>3. ⚠️ 关闭 Group Privacy（关键！）</div>
                </div>
              }
              showIcon
            />
          )}

          {selectedChannelType?.fields.map((field) => (
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
              <div style={{ marginTop: 4 }}>
                {renderField(field)}
              </div>
            </div>
          ))}
        </Space>
      </Modal>
    </div>
  )
}
