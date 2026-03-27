import { useState, useEffect } from 'react'
import { Typography, Card, Spin, Button, Space, Tag, Modal, Input, Alert, Tooltip, Switch, Divider, Select, Tabs } from 'antd'
import {
  ApiOutlined,
  CloudOutlined,
  MessageOutlined,
  WechatOutlined,
  SlackOutlined,
  DiscordOutlined,
  GlobalOutlined,
  TeamOutlined,
  VideoCameraOutlined,
  MobileOutlined,
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
  nameEn: string
  icon: React.ReactNode
  available: boolean
  category: 'im' | 'enterprise' | 'social' | 'protocol' | 'device'
  description: string
  fields: ChannelField[]
  configExample?: string
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

// 所有官方支持的渠道
const CHANNEL_TYPES: ChannelType[] = [
  // 即时通讯
  {
    id: 'telegram',
    name: 'Telegram',
    nameEn: 'Telegram',
    icon: <MessageOutlined />,
    available: true,
    category: 'im',
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
    id: 'whatsapp',
    name: 'WhatsApp',
    nameEn: 'WhatsApp',
    icon: <MessageOutlined />,
    available: true,
    category: 'im',
    description: 'WhatsApp 即时通讯平台（基于 Baileys）',
    fields: [
      {
        key: 'enabled',
        label: '启用',
        placeholder: '',
        required: false,
        tooltip: '启用 WhatsApp 渠道',
        type: 'switch',
        defaultValue: true,
      },
    ],
  },
  {
    id: 'signal',
    name: 'Signal',
    nameEn: 'Signal',
    icon: <MessageOutlined />,
    available: true,
    category: 'im',
    description: 'Signal 加密通讯平台',
    fields: [
      {
        key: 'enabled',
        label: '启用',
        placeholder: '',
        required: false,
        tooltip: '启用 Signal 渠道（需要 signal-cli）',
        type: 'switch',
        defaultValue: true,
      },
    ],
  },
  {
    id: 'imessage',
    name: 'iMessage',
    nameEn: 'iMessage',
    icon: <MessageOutlined />,
    available: true,
    category: 'im',
    description: 'Apple iMessage（macOS 专用）',
    fields: [],
  },
  {
    id: 'bluebubbles',
    name: 'BlueBubbles',
    nameEn: 'BlueBubbles',
    icon: <MessageOutlined />,
    available: true,
    category: 'im',
    description: 'BlueBubbles iMessage 集成（推荐）',
    fields: [
      {
        key: 'serverUrl',
        label: '服务器 URL',
        placeholder: 'https://your-server.com',
        required: true,
        tooltip: 'BlueBubbles 服务器地址',
        type: 'text',
      },
      {
        key: 'password',
        label: '服务器密码',
        placeholder: 'xxxxxxxx',
        required: true,
        tooltip: 'BlueBubbles 服务器密码',
        type: 'password',
      },
    ],
  },
  {
    id: 'line',
    name: 'LINE',
    nameEn: 'LINE',
    icon: <MessageOutlined />,
    available: true,
    category: 'im',
    description: 'LINE 即时通讯平台',
    fields: [],
  },
  {
    id: 'irc',
    name: 'IRC',
    nameEn: 'IRC',
    icon: <GlobalOutlined />,
    available: true,
    category: 'im',
    description: 'IRC 聊天协议',
    fields: [],
  },

  // 企业协作
  {
    id: 'feishu',
    name: '飞书',
    nameEn: 'Feishu',
    icon: <CloudOutlined />,
    available: true,
    category: 'enterprise',
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
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    nameEn: 'Slack',
    icon: <SlackOutlined />,
    available: true,
    category: 'enterprise',
    description: 'Slack 企业协作平台（基于 Bolt）',
    fields: [
      {
        key: 'botToken',
        label: 'Bot Token',
        placeholder: 'xoxb-xxxxxxxxxxxx',
        required: true,
        tooltip: 'Slack Bot Token',
        type: 'password',
      },
      {
        key: 'appToken',
        label: 'App Token',
        placeholder: 'xapp-xxxxxxxxxxxx',
        required: true,
        tooltip: 'Slack App Token（Socket Mode）',
        type: 'password',
      },
    ],
  },
  {
    id: 'discord',
    name: 'Discord',
    nameEn: 'Discord',
    icon: <DiscordOutlined />,
    available: true,
    category: 'enterprise',
    description: 'Discord 社区平台（基于 discord.js）',
    fields: [
      {
        key: 'token',
        label: 'Bot Token',
        placeholder: 'xxxxxxxxxxxxxxxxxxxx',
        required: true,
        tooltip: 'Discord Bot Token',
        type: 'password',
      },
    ],
  },
  {
    id: 'googlechat',
    name: 'Google Chat',
    nameEn: 'Google Chat',
    icon: <MessageOutlined />,
    available: true,
    category: 'enterprise',
    description: 'Google Chat 企业通讯',
    fields: [],
  },
  {
    id: 'msteams',
    name: 'Microsoft Teams',
    nameEn: 'Microsoft Teams',
    icon: <TeamOutlined />,
    available: true,
    category: 'enterprise',
    description: 'Microsoft Teams 企业协作',
    fields: [],
  },
  {
    id: 'mattermost',
    name: 'Mattermost',
    nameEn: 'Mattermost',
    icon: <GlobalOutlined />,
    available: true,
    category: 'enterprise',
    description: 'Mattermost 开源协作平台',
    fields: [],
  },
  {
    id: 'nextcloud-talk',
    name: 'Nextcloud Talk',
    nameEn: 'Nextcloud Talk',
    icon: <GlobalOutlined />,
    available: true,
    category: 'enterprise',
    description: 'Nextcloud Talk 通讯',
    fields: [],
  },
  {
    id: 'synology-chat',
    name: 'Synology Chat',
    nameEn: 'Synology Chat',
    icon: <GlobalOutlined />,
    available: true,
    category: 'enterprise',
    description: 'Synology Chat 群晖聊天',
    fields: [],
  },

  // 社交平台
  {
    id: 'twitch',
    name: 'Twitch',
    nameEn: 'Twitch',
    icon: <VideoCameraOutlined />,
    available: true,
    category: 'social',
    description: 'Twitch 直播平台',
    fields: [],
  },
  {
    id: 'nostr',
    name: 'Nostr',
    nameEn: 'Nostr',
    icon: <GlobalOutlined />,
    available: true,
    category: 'social',
    description: 'Nostr 去中心化社交协议',
    fields: [],
  },
  {
    id: 'tlon',
    name: 'Tlon',
    nameEn: 'Tlon',
    icon: <GlobalOutlined />,
    available: true,
    category: 'social',
    description: 'Tlon 去中心化通讯',
    fields: [],
  },

  // 协议/其他
  {
    id: 'matrix',
    name: 'Matrix',
    nameEn: 'Matrix',
    icon: <GlobalOutlined />,
    available: true,
    category: 'protocol',
    description: 'Matrix 去中心化通讯协议',
    fields: [],
  },
  {
    id: 'zalo',
    name: 'Zalo',
    nameEn: 'Zalo',
    icon: <MessageOutlined />,
    available: true,
    category: 'im',
    description: 'Zalo 越南即时通讯',
    fields: [],
  },
  {
    id: 'zalouser',
    name: 'Zalo Personal',
    nameEn: 'Zalo Personal',
    icon: <MessageOutlined />,
    available: true,
    category: 'im',
    description: 'Zalo 个人版',
    fields: [],
  },

  // 微信（官方插件）
  {
    id: 'wechat',
    name: '微信',
    nameEn: 'WeChat',
    icon: <WechatOutlined />,
    available: true,
    category: 'im',
    description: '微信公众号/小程序（官方插件 @tencent-weixin/openclaw-weixin）',
    fields: [],
  },

  // WebChat
  {
    id: 'webchat',
    name: 'WebChat',
    nameEn: 'WebChat',
    icon: <GlobalOutlined />,
    available: true,
    category: 'protocol',
    description: 'Gateway 内置 WebChat（默认可用）',
    fields: [],
  },

  // 设备
  {
    id: 'macos',
    name: 'macOS',
    nameEn: 'macOS',
    icon: <MobileOutlined />,
    available: true,
    category: 'device',
    description: 'macOS 菜单栏应用',
    fields: [],
  },
  {
    id: 'ios',
    name: 'iOS',
    nameEn: 'iOS',
    icon: <MobileOutlined />,
    available: true,
    category: 'device',
    description: 'iOS 配套应用',
    fields: [],
  },
  {
    id: 'android',
    name: 'Android',
    nameEn: 'Android',
    icon: <MobileOutlined />,
    available: true,
    category: 'device',
    description: 'Android 配套应用',
    fields: [],
  },
]

// 渠道分类
const CHANNEL_CATEGORIES = [
  { key: 'im', label: '即时通讯', icon: <MessageOutlined /> },
  { key: 'enterprise', label: '企业协作', icon: <TeamOutlined /> },
  { key: 'social', label: '社交平台', icon: <GlobalOutlined /> },
  { key: 'protocol', label: '协议/其他', icon: <ApiOutlined /> },
  { key: 'device', label: '设备', icon: <MobileOutlined /> },
]

// 已配置的渠道
interface ConfiguredChannel {
  id: string
  type: string
  name: string
  enabled: boolean
}

export default function ChannelsPage() {
  const [loading, setLoading] = useState(true)
  const [channels, setChannels] = useState<ConfiguredChannel[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 模态框状态
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [selectedChannelType, setSelectedChannelType] = useState<ChannelType | null>(null)
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
          // 检查是否有实际配置
          const hasConfig = channelConfig.botToken ||
                           channelConfig.token ||
                           channelConfig.appId ||
                           channelConfig.accounts ||
                           channelConfig.enabled

          if (hasConfig) {
            configuredList.push({
              id: channelType.id,
              type: channelType.id,
              name: channelType.name,
              enabled: channelConfig.enabled !== false,
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
  const handleOpenConfig = (channelType: ChannelType) => {
    setSelectedChannelType(channelType)
    const defaults: Record<string, string | boolean> = {}
    channelType.fields.forEach(f => {
      if (f.defaultValue !== undefined) {
        defaults[f.key] = f.defaultValue
      }
    })
    setFormFields(defaults)
    setShowConfigModal(true)
  }

  // 保存配置
  const handleSaveConfig = async () => {
    if (!selectedChannelType) return

    try {
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>
      const channelsConfig = (parsed.channels as Record<string, unknown>) || {}

      // 根据渠道类型保存配置
      if (selectedChannelType.id === 'telegram') {
        channelsConfig.telegram = {
          enabled: true,
          botToken: formFields.botToken || '',
          dmPolicy: formFields.dmPolicy || 'pairing',
          groupPolicy: formFields.groupPolicy || 'open',
          commands: { native: true, nativeSkills: true },
          actions: { reactions: true, sendMessage: true, deleteMessage: true, sticker: true },
        }
      } else if (selectedChannelType.id === 'feishu') {
        const feishuConfig = (channelsConfig.feishu as Record<string, unknown>) || {}
        const accounts = (feishuConfig.accounts as Record<string, unknown>) || {}
        accounts['default'] = {
          appId: formFields.appId || '',
          appSecret: formFields.appSecret || '',
          enabled: true,
          connectionMode: formFields.connectionMode || 'websocket',
          groupPolicy: 'open',
          requireMention: true,
          threadSession: true,
          streaming: true,
        }
        feishuConfig.accounts = accounts
        channelsConfig.feishu = feishuConfig
      } else if (selectedChannelType.id === 'slack') {
        channelsConfig.slack = {
          enabled: true,
          botToken: formFields.botToken || '',
          appToken: formFields.appToken || '',
        }
      } else if (selectedChannelType.id === 'discord') {
        channelsConfig.discord = {
          enabled: true,
          token: formFields.token || '',
        }
      } else if (selectedChannelType.id === 'whatsapp') {
        channelsConfig.whatsapp = { enabled: true }
      } else if (selectedChannelType.id === 'signal') {
        channelsConfig.signal = { enabled: true }
      } else if (selectedChannelType.id === 'bluebubbles') {
        channelsConfig.bluebubbles = {
          enabled: true,
          serverUrl: formFields.serverUrl || '',
          password: formFields.password || '',
        }
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
          <Select
            value={value as string}
            onChange={(v) => setFormFields({ ...formFields, [field.key]: v })}
            options={field.options}
            style={{ width: '100%' }}
          />
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

  // 按分类组织渠道
  const channelsByCategory = CHANNEL_CATEGORIES.map(cat => ({
    ...cat,
    channels: CHANNEL_TYPES.filter(c => c.category === cat.key),
  }))

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <ApiOutlined /> 渠道配置
        </Title>
        <Space>
          <Tag color="blue">已配置: {channels.length}</Tag>
          <Tag color="default">总计: {CHANNEL_TYPES.length} 个渠道</Tag>
          <Button icon={<ReloadOutlined />} onClick={loadChannels}>刷新</Button>
        </Space>
      </div>

      {error && <Alert type="error" message={error} showIcon closable style={{ marginBottom: 16 }} />}
      {success && <Alert type="success" message={success} showIcon closable style={{ marginBottom: 16 }} />}

      {/* 渠道列表 - 按分类 */}
      <Tabs
        defaultActiveKey="im"
        items={channelsByCategory.map(cat => ({
          key: cat.key,
          label: (
            <Space>
              {cat.icon}
              {cat.label}
              <Tag>{cat.channels.length}</Tag>
            </Space>
          ),
          children: (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {cat.channels.map((channelType) => {
                const configured = channels.find(c => c.type === channelType.id)

                return (
                  <Card
                    key={channelType.id}
                    title={
                      <Space>
                        {channelType.icon}
                        <Text strong>{channelType.name}</Text>
                      </Space>
                    }
                    size="small"
                    extra={
                      configured ? (
                        <Tag color="success" icon={<CheckCircleOutlined />}>已配置</Tag>
                      ) : (
                        <Tag color="default">未配置</Tag>
                      )
                    }
                  >
                    <div style={{ lineHeight: 2 }}>
                      <div><Text type="secondary">英文名：</Text><Text>{channelType.nameEn}</Text></div>
                      <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0, minHeight: 44 }}>
                        {channelType.description}
                      </Paragraph>
                    </div>

                    <Divider style={{ margin: '12px 0' }} />

                    <Space>
                      {channelType.fields.length > 0 ? (
                        <Button
                          type={configured ? 'default' : 'primary'}
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleOpenConfig(channelType)}
                        >
                          {configured ? '编辑配置' : '配置'}
                        </Button>
                      ) : (
                        <Tooltip title="此渠道通过 CLI 或插件配置">
                          <Button size="small" disabled>
                            通过 CLI 配置
                          </Button>
                        </Tooltip>
                      )}
                    </Space>
                  </Card>
                )
              })}
            </div>
          ),
        }))}
      />

      {/* 使用说明 */}
      <Card title="使用说明" size="small" style={{ marginTop: 24 }}>
        <div style={{ lineHeight: 2.5 }}>
          <div>
            <Space>
              <QuestionCircleOutlined style={{ color: '#999' }} />
              <Text>OpenClaw 官方支持 {CHANNEL_TYPES.length} 个渠道，覆盖主流通讯平台</Text>
            </Space>
          </div>
          <div>
            <Space>
              <QuestionCircleOutlined style={{ color: '#999' }} />
              <Text>部分渠道需要通过 CLI 配置（如 WhatsApp、Signal 等），点击「通过 CLI 配置」查看文档</Text>
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
          <Alert
            type="info"
            message={selectedChannelType?.description}
            showIcon
          />

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
