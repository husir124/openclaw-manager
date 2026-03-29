/**
 * 模型列表表格组件
 * 显示单个 Provider 下的所有模型，支持删除
 */
import { Table, Tag, Button, Typography } from 'antd'

const { Text } = Typography
import type { ModelInfo, Provider } from '../types'

interface ModelTableProps {
  provider: Provider
  onDeleteModel: (providerId: string, modelId: string) => void
}

export default function ModelTable({ provider, onDeleteModel }: ModelTableProps) {
  if (provider.models.length === 0) {
    return <Text type="secondary">暂无模型，请先添加</Text>
  }

  return (
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
            <Button size="small" danger onClick={() => onDeleteModel(provider.id, record.id)}>
              删除
            </Button>
          ),
        },
      ]}
    />
  )
}
