/**
 * 创建向导步骤内容组件
 */
import { Typography, Input, Select, Space, Tooltip, Radio, Tag, Alert, Card } from 'antd'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { PLATFORMS } from './platforms'
import type { PlatformConfig } from './platforms'

const { Text } = Typography

interface StepProps {
  /** 步骤 0: 基本信息 */
  newId: string
  newName: string
  newModel: string
  onIdChange: (v: string) => void
  onNameChange: (v: string) => void
  onModelChange: (v: string) => void
  /** 步骤 1: 平台选择 */
  selectedPlatform: string
  onPlatformChange: (v: string) => void
  /** 步骤 2: 凭证配置 */
  platformFields: Record<string, string>
  onFieldsChange: (v: Record<string, string>) => void
}

/** 步骤 0: 基本信息 */
export function StepBasicInfo({ newId, newName, newModel, onIdChange, onNameChange, onModelChange }: StepProps) {
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <div>
        <Space>
          <Text>Agent ID</Text>
          <Tooltip title="Agent 的唯一标识符，只能包含小写字母、数字和连字符，创建后不可修改">
            <QuestionCircleOutlined style={{ color: '#999' }} />
          </Tooltip>
        </Space>
        <Input
          value={newId}
          onChange={(e) => onIdChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
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
          onChange={(e) => onNameChange(e.target.value)}
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
          onChange={(e) => onModelChange(e.target.value)}
          placeholder="openrouter/xiaomi/mimo-v2-pro"
          style={{ marginTop: 4 }}
        />
      </div>
    </Space>
  )
}

/** 步骤 1: 选择平台 */
export function StepSelectPlatform({ selectedPlatform, onPlatformChange }: StepProps) {
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
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
            onChange={(e) => onPlatformChange(e.target.value)}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {PLATFORMS.map((platform: PlatformConfig) => (
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
}

/** 步骤 2: 填写平台凭证 */
export function StepCredentials({ selectedPlatform, platformFields, onFieldsChange }: StepProps) {
  const platform = PLATFORMS.find(p => p.id === selectedPlatform)
  if (!platform || !platform.available) {
    return <Alert type="warning" message="请先选择一个可用的平台" />
  }

  const updateField = (key: string, value: string) => {
    onFieldsChange({ ...platformFields, [key]: value })
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
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
              onChange={(value) => updateField(field.key, value)}
              options={field.options}
              style={{ width: '100%', marginTop: 4 }}
            />
          ) : (
            <Input
              type={field.type === 'password' ? 'password' : 'text'}
              value={platformFields[field.key] || ''}
              onChange={(e) => updateField(field.key, e.target.value)}
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
}

/** 步骤 3: 确认 */
export function StepConfirm({ newId, newName, newModel, selectedPlatform, platformFields }: StepProps) {
  const selectedPlat = PLATFORMS.find(p => p.id === selectedPlatform)

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Alert type="success" message="请确认以下配置信息" showIcon />
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
}
