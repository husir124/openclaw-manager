import { Empty, Button } from 'antd'
import { useNavigate } from 'react-router-dom'

interface EmptyStateProps {
  title: string
  description: string
  actionText?: string
  actionPath?: string
  icon?: React.ReactNode
}

export default function EmptyState({ title, description, actionText, actionPath, icon }: EmptyStateProps) {
  const navigate = useNavigate()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Empty
        image={icon || Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{title}</div>
            <div style={{ color: '#999' }}>{description}</div>
          </div>
        }
      >
        {actionText && actionPath && (
          <Button type="primary" onClick={() => navigate(actionPath)}>
            {actionText}
          </Button>
        )}
      </Empty>
    </div>
  )
}
