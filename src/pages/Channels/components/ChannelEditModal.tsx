/**
 * 渠道配置编辑模态框
 * 根据渠道类型动态渲染配置表单
 */
import { Modal, Space, Input, Select, Switch, Alert, Tooltip, Typography } from 'antd'
import { QuestionCircleOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'
import type { ChannelType, ChannelField } from '../types'

const { Text, Paragraph } = Typography
const { Password } = Input

interface ChannelEditModalProps {
  open: boolean
  channelType: ChannelType | null
  formFields: Record<string, string | boolean>
  onFieldChange: (key: string, value: string | boolean) => void
  onOk: () => void
  onCancel: () => void
}

function renderField(field: ChannelField, value: string | boolean, onChange: (v: string | boolean) => void) {
  switch (field.type) {
    case 'password':
      return (
        <Password
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          iconRender={(v) => (v ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
        />
      )
    case 'select':
      return (
        <Select
          value={value as string}
          onChange={(v) => onChange(v)}
          options={field.options}
          style={{ width: '100%' }}
        />
      )
    case 'switch':
      return (
        <Switch
          checked={value as boolean}
          onChange={(checked) => onChange(checked)}
        />
      )
    default:
      return (
        <Input
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      )
  }
}

export default function ChannelEditModal({
  open,
  channelType,
  formFields,
  onFieldChange,
  onOk,
  onCancel,
}: ChannelEditModalProps) {
  return (
    <Modal
      title={`配置 ${channelType?.name}`}
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      okText="保存"
      cancelText="取消"
      width={500}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Alert type="info" message={channelType?.description} showIcon />

        {channelType?.id === 'telegram' && (
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

        {channelType?.fields.map((field) => (
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
              {renderField(field, formFields[field.key] ?? '', (v) => onFieldChange(field.key, v))}
            </div>
          </div>
        ))}
      </Space>
    </Modal>
  )
}
