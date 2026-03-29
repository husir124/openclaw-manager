/**
 * Provider 列表组件
 * 显示自定义 Provider（展开含模型表格）+ 内置 Provider（只读）
 */
import { Space, Collapse, Tag, Button, Tooltip, Typography } from 'antd'
import {
  CloudServerOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  KeyOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import type { Provider } from '../types'
import { BUILTIN_PROVIDERS } from '../data'
import ModelTable from './ModelTable'

const { Text } = Typography
const { Panel } = Collapse

interface ProviderListProps {
  customProviders: Provider[]
  builtinProviders: Provider[]
  testingProvider: string | null
  onEditProvider: (provider: Provider) => void
  onDeleteProvider: (providerId: string) => void
  onTestProvider: (provider: Provider) => void
  onAddModel: (providerId: string) => void
  onDeleteModel: (providerId: string, modelId: string) => void
}

export default function ProviderList({
  customProviders,
  builtinProviders,
  testingProvider,
  onEditProvider,
  onDeleteProvider,
  onTestProvider,
  onAddModel,
  onDeleteModel,
}: ProviderListProps) {
  return (
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
                        onClick={() => onTestProvider(provider)} />
                    </Tooltip>
                    <Tooltip title="编辑">
                      <Button size="small" icon={<EditOutlined />}
                        onClick={() => onEditProvider(provider)} />
                    </Tooltip>
                    <Tooltip title="删除">
                      <Button size="small" danger icon={<DeleteOutlined />}
                        onClick={() => onDeleteProvider(provider.id)} />
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
                    onClick={() => onAddModel(provider.id)}>
                    添加模型
                  </Button>
                </div>

                <ModelTable provider={provider} onDeleteModel={onDeleteModel} />
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
    </Space>
  )
}
