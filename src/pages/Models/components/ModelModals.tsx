/**
 * Provider 添加/编辑 + 模型添加 模态框
 */
import { Modal, Space, Input, Select, Typography } from 'antd'
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'
import type { Provider } from '../types'

const { Text } = Typography
const { Password } = Input

interface ProviderFormModalProps {
  open: boolean
  editingProvider: Provider | null
  formProviderId: string
  formProviderName: string
  formBaseUrl: string
  formApiKey: string
  formApi: string
  onProviderIdChange: (v: string) => void
  onProviderNameChange: (v: string) => void
  onBaseUrlChange: (v: string) => void
  onApiKeyChange: (v: string) => void
  onApiChange: (v: string) => void
  onOk: () => void
  onCancel: () => void
}

export function ProviderFormModal({
  open,
  editingProvider,
  formProviderId,
  formProviderName,
  formBaseUrl,
  formApiKey,
  formApi,
  onProviderIdChange,
  onProviderNameChange,
  onBaseUrlChange,
  onApiKeyChange,
  onApiChange,
  onOk,
  onCancel,
}: ProviderFormModalProps) {
  return (
    <Modal
      title={editingProvider ? '编辑 Provider' : '添加 Provider'}
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      okText="保存"
      cancelText="取消"
      okButtonProps={{ disabled: !formProviderId || !formBaseUrl }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Text>Provider ID</Text>
          <Input value={formProviderId}
            onChange={e => onProviderIdChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="my-provider" disabled={!!editingProvider} style={{ marginTop: 4 }} />
        </div>
        <div>
          <Text>显示名称</Text>
          <Input value={formProviderName} onChange={e => onProviderNameChange(e.target.value)}
            placeholder="My Provider" style={{ marginTop: 4 }} />
        </div>
        <div>
          <Text>Base URL <Text type="danger">*</Text></Text>
          <Input value={formBaseUrl} onChange={e => onBaseUrlChange(e.target.value)}
            placeholder="https://api.example.com/v1" style={{ marginTop: 4 }} />
        </div>
        <div>
          <Text>API Key</Text>
          <Password value={formApiKey} onChange={e => onApiKeyChange(e.target.value)}
            placeholder={editingProvider ? '留空保持不变' : 'sk-xxxxxxxx'} style={{ marginTop: 4 }}
            iconRender={v => v ? <EyeOutlined /> : <EyeInvisibleOutlined />} />
        </div>
        <div>
          <Text>API 类型</Text>
          <Select value={formApi} onChange={onApiChange} style={{ width: '100%', marginTop: 4 }}
            options={[
              { label: 'OpenAI Completions', value: 'openai-completions' },
              { label: 'Anthropic', value: 'anthropic' },
            ]} />
        </div>
      </Space>
    </Modal>
  )
}

interface AddModelModalProps {
  open: boolean
  targetProviderId: string
  formModelId: string
  formModelName: string
  formContextWindow: string
  formMaxTokens: string
  customProviders: Provider[]
  onTargetProviderChange: (v: string) => void
  onModelIdChange: (v: string) => void
  onModelNameChange: (v: string) => void
  onContextWindowChange: (v: string) => void
  onMaxTokensChange: (v: string) => void
  onOk: () => void
  onCancel: () => void
}

export function AddModelModal({
  open,
  targetProviderId,
  formModelId,
  formModelName,
  formContextWindow,
  formMaxTokens,
  customProviders,
  onTargetProviderChange,
  onModelIdChange,
  onModelNameChange,
  onContextWindowChange,
  onMaxTokensChange,
  onOk,
  onCancel,
}: AddModelModalProps) {
  return (
    <Modal
      title="添加模型"
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      okText="添加"
      cancelText="取消"
      okButtonProps={{ disabled: !targetProviderId || !formModelId }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Text>选择 Provider <Text type="danger">*</Text></Text>
          <Select value={targetProviderId} onChange={onTargetProviderChange} placeholder="选择 Provider"
            options={customProviders.map(p => ({ label: p.name, value: p.id }))}
            style={{ width: '100%', marginTop: 4 }} />
        </div>
        <div>
          <Text>模型 ID <Text type="danger">*</Text></Text>
          <Input value={formModelId} onChange={e => onModelIdChange(e.target.value)}
            placeholder="gpt-4o" style={{ marginTop: 4 }} />
        </div>
        <div>
          <Text>显示名称</Text>
          <Input value={formModelName} onChange={e => onModelNameChange(e.target.value)}
            placeholder="GPT-4o" style={{ marginTop: 4 }} />
        </div>
        <div>
          <Text>上下文窗口</Text>
          <Input type="number" value={formContextWindow} onChange={e => onContextWindowChange(e.target.value)}
            placeholder="128000" style={{ marginTop: 4 }} />
        </div>
        <div>
          <Text>最大输出 Token</Text>
          <Input type="number" value={formMaxTokens} onChange={e => onMaxTokensChange(e.target.value)}
            placeholder="4096" style={{ marginTop: 4 }} />
        </div>
      </Space>
    </Modal>
  )
}
