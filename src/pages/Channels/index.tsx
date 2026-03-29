/**
 * 渠道配置页面
 *
 * 显示 OpenClaw 支持的所有消息渠道，按类别分组。
 * 对每个渠道：读取配置、显示状态、支持编辑。
 */
import { useState, useEffect } from 'react'
import { Typography, Card, Spin, Button, Space, Tag, Alert, Tooltip, Divider, Tabs, message } from 'antd'
import {
  ApiOutlined,
  ReloadOutlined,
  EditOutlined,
  CheckCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import { readConfig, writeConfig } from '../../services/tauri'
import type { ConfiguredChannel } from './types'
import { CHANNEL_TYPES, CHANNEL_CATEGORIES } from './data'
import ChannelEditModal from './components/ChannelEditModal'

const { Title, Text, Paragraph } = Typography

export default function ChannelsPage() {
  const [loading, setLoading] = useState(true)
  const [channels, setChannels] = useState<ConfiguredChannel[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 模态框状态
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [selectedChannelTypeId, setSelectedChannelTypeId] = useState<string | null>(null)
  const [formFields, setFormFields] = useState<Record<string, string | boolean>>({})

  const selectedChannelType = CHANNEL_TYPES.find(c => c.id === selectedChannelTypeId) || null

  const loadChannels = async () => {
    setLoading(true)
    setError(null)
    try {
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>
      const channelsConfig = (parsed.channels as Record<string, unknown>) || {}

      const configuredList: ConfiguredChannel[] = []
      for (const channelType of CHANNEL_TYPES) {
        const channelConfig = channelsConfig[channelType.id] as Record<string, unknown>
        if (channelConfig) {
          const hasConfig = channelConfig.botToken || channelConfig.token ||
                           channelConfig.appId || channelConfig.accounts || channelConfig.enabled
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

  const handleOpenConfig = (channelTypeId: string) => {
    const ct = CHANNEL_TYPES.find(c => c.id === channelTypeId)
    if (!ct) return
    setSelectedChannelTypeId(channelTypeId)
    const defaults: Record<string, string | boolean> = {}
    ct.fields.forEach(f => {
      if (f.defaultValue !== undefined) defaults[f.key] = f.defaultValue
    })
    setFormFields(defaults)
    setShowConfigModal(true)
  }

  const handleFieldChange = (key: string, value: string | boolean) => {
    setFormFields(prev => ({ ...prev, [key]: value }))
  }

  const handleSaveConfig = async () => {
    if (!selectedChannelType) return
    try {
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>
      const channelsConfig = (parsed.channels as Record<string, unknown>) || {}

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
        channelsConfig.discord = { enabled: true, token: formFields.token || '' }
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载渠道配置...</div>
      </div>
    )
  }

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
                          onClick={() => handleOpenConfig(channelType.id)}
                        >
                          {configured ? '编辑配置' : '配置'}
                        </Button>
                      ) : (
                        <Tooltip title="此渠道通过 CLI 或插件配置">
                          <Button size="small" disabled>通过 CLI 配置</Button>
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

      <Card title="使用说明" size="small" style={{ marginTop: 24 }}>
        <div style={{ lineHeight: 2.5 }}>
          <div><Space><QuestionCircleOutlined style={{ color: '#999' }} /><Text>OpenClaw 官方支持 {CHANNEL_TYPES.length} 个渠道，覆盖主流通讯平台</Text></Space></div>
          <div><Space><QuestionCircleOutlined style={{ color: '#999' }} /><Text>部分渠道需要通过 CLI 配置（如 WhatsApp、Signal 等），点击「通过 CLI 配置」查看文档</Text></Space></div>
          <div><Space><QuestionCircleOutlined style={{ color: '#999' }} /><Text>凭证信息使用密码输入框保护，不会明文显示</Text></Space></div>
          <div><Space><QuestionCircleOutlined style={{ color: '#999' }} /><Text>配置完成后需要重启 Gateway 才能生效</Text></Space></div>
        </div>
      </Card>

      <ChannelEditModal
        open={showConfigModal}
        channelType={selectedChannelType}
        formFields={formFields}
        onFieldChange={handleFieldChange}
        onOk={handleSaveConfig}
        onCancel={() => setShowConfigModal(false)}
      />
    </div>
  )
}
