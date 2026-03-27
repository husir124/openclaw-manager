import React from 'react'
import { Empty, Button, Space } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
    type?: 'primary' | 'default'
    icon?: React.ReactNode
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({
  title = '暂无数据',
  description,
  icon,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <Empty
      image={icon || Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>{title}</div>
          {description && (
            <div style={{ color: '#999', fontSize: 14 }}>{description}</div>
          )}
        </div>
      }
    >
      <Space>
        {action && (
          <Button
            type={action.type || 'primary'}
            icon={action.icon || <PlusOutlined />}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button
            icon={<ReloadOutlined />}
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </Button>
        )}
      </Space>
    </Empty>
  )
}
