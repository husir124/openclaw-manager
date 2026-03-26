// 嵌入 OpenClaw 官方 Control UI
// Gateway 在 127.0.0.1:18789 上同时提供 HTTP 和 WebSocket
// 我们用 iframe 直接嵌入官方 UI，利用它已经实现的完整协议

import { useState, useEffect, useRef } from 'react'
import { Spin, Alert, Button, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'

const { Text } = Typography

export default function ChatPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const gatewayUrl = 'http://127.0.0.1:18789'

  useEffect(() => {
    // Check if Gateway is reachable
    const checkGateway = async () => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 3000)
        await fetch(gatewayUrl, { signal: controller.signal })
        clearTimeout(timeout)
        setLoading(false)
      } catch {
        setError('Gateway is not running on port 18789')
        setLoading(false)
      }
    }
    checkGateway()
  }, [])

  if (error) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Alert
          type="warning"
          message="Cannot connect to Gateway"
          description={error}
          showIcon
        />
        <Button
          icon={<ReloadOutlined />}
          style={{ marginTop: 16 }}
          onClick={() => { setError(null); setLoading(true) }}
        >
          Retry
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
        <Text style={{ marginLeft: 16 }}>Connecting to Gateway...</Text>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <iframe
        ref={iframeRef}
        src={gatewayUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: 8,
        }}
        title="OpenClaw Control UI"
      />
    </div>
  )
}
