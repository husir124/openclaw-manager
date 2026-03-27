import { useState, useEffect } from 'react'
import { Typography, Card, Spin, Space, Tag, Button, Alert, Divider, List, Progress, Modal, Input } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  BugOutlined,
  ToolOutlined,
  FileTextOutlined,
  HeartOutlined,
} from '@ant-design/icons'
import { checkNodeVersion, checkOpenClawInstalled, checkGatewayStatus, startGateway } from '../../services/tauri'

const { Title, Text, Paragraph } = Typography

interface DiagnosticItem {
  id: string
  name: string
  icon: React.ReactNode
  status: 'ok' | 'warning' | 'error'
  message: string
  fixAction?: () => Promise<void>
  fixLabel?: string
}

interface LogLine {
  time: string
  level: 'info' | 'warn' | 'error'
  message: string
}

export default function HealthPage() {
  const [loading, setLoading] = useState(true)
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([])
  const [fixing, setFixing] = useState<string | null>(null)
  const [showFixConfirm, setShowFixConfirm] = useState<DiagnosticItem | null>(null)
  const [logs, setLogs] = useState<LogLine[]>([])
  const [logLines, setLogLines] = useState(50)

  const runDiagnosis = async () => {
    setLoading(true)
    try {
      const [node, oc, gw] = await Promise.all([
        checkNodeVersion(),
        checkOpenClawInstalled(),
        checkGatewayStatus(),
      ])

      const items: DiagnosticItem[] = [
        {
          id: 'node',
          name: 'Node.js 运行环境',
          icon: <HeartOutlined />,
          status: node.installed
            ? node.meets_minimum ? 'ok' : 'warning'
            : 'error',
          message: node.installed
            ? node.meets_minimum ? `版本 ${node.version}，满足要求` : `版本 ${node.version} 过低，建议升级到 24+`
            : '未找到 Node.js，请先安装',
          fixAction: node.installed ? undefined : async () => {
            window.open('https://nodejs.org', '_blank')
          },
          fixLabel: node.installed ? undefined : '下载安装',
        },
        {
          id: 'openclaw',
          name: 'OpenClaw 平台',
          icon: <BugOutlined />,
          status: oc.installed ? 'ok' : 'error',
          message: oc.installed
            ? `已安装，版本 ${oc.version}`
            : '未安装 OpenClaw',
          fixAction: oc.installed ? undefined : async () => {
            window.open('https://docs.openclaw.ai/start/getting-started', '_blank')
          },
          fixLabel: oc.installed ? undefined : '安装指南',
        },
        {
          id: 'gateway',
          name: 'Gateway 服务',
          icon: <ToolOutlined />,
          status: gw.running ? 'ok' : 'error',
          message: gw.running
            ? `运行中，端口 ${gw.port}，PID ${gw.pid || '-'}`
            : 'Gateway 未运行',
          fixAction: gw.running ? undefined : async () => {
            if (!oc.installed) throw new Error('OpenClaw 未安装')
            await startGateway()
          },
          fixLabel: gw.running ? undefined : '启动 Gateway',
        },
      ]

      setDiagnostics(items)
    } catch (err) {
      console.error('Diagnosis failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFix = async (item: DiagnosticItem) => {
    if (!item.fixAction) return
    setShowFixConfirm(item)
  }

  const executeFix = async () => {
    const item = showFixConfirm
    if (!item?.fixAction) return
    setShowFixConfirm(null)
    setFixing(item.id)
    try {
      await item.fixAction()
      await runDiagnosis()
    } catch (err) {
      console.error('Fix failed:', err)
    } finally {
      setFixing(null)
    }
  }

  const loadLogs = async () => {
    // Simulated log loading - in real use, this calls a Tauri command
    try {
      const mockLogs: LogLine[] = [
        { time: '07:30:01', level: 'info', message: 'Gateway started on port 18789' },
        { time: '07:30:02', level: 'info', message: 'WebSocket server listening' },
        { time: '07:31:15', level: 'info', message: 'Agent "main" connected' },
        { time: '07:32:00', level: 'warn', message: 'Session timeout for idle connection' },
        { time: '07:33:45', level: 'info', message: 'New message received from webchat' },
      ]
      setLogs(mockLogs.slice(0, logLines))
    } catch (err) {
      console.error('Failed to load logs:', err)
    }
  }

  useEffect(() => {
    runDiagnosis()
    loadLogs()
  }, [])

  const okCount = diagnostics.filter(d => d.status === 'ok').length
  const errorCount = diagnostics.filter(d => d.status === 'error').length
  const warnCount = diagnostics.filter(d => d.status === 'warning').length

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'ok':
        return <Tag color="success" icon={<CheckCircleOutlined />}>正常</Tag>
      case 'warning':
        return <Tag color="warning" icon={<ExclamationCircleOutlined />}>警告</Tag>
      case 'error':
        return <Tag color="error" icon={<CloseCircleOutlined />}>异常</Tag>
      default:
        return <Tag>未知</Tag>
    }
  }

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return '#ff4d4f'
      case 'warn': return '#faad14'
      default: return '#999'
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <HeartOutlined /> 健康监控
        </Title>
        <Button icon={<SyncOutlined />} onClick={runDiagnosis} loading={loading}>
          重新诊断
        </Button>
      </div>

      {/* Summary */}
      <div style={{ marginBottom: 16 }}>
        <Space size="large">
          <Tag color="success" icon={<CheckCircleOutlined />}>正常: {okCount}</Tag>
          {warnCount > 0 && <Tag color="warning" icon={<ExclamationCircleOutlined />}>警告: {warnCount}</Tag>}
          {errorCount > 0 && <Tag color="error" icon={<CloseCircleOutlined />}>异常: {errorCount}</Tag>}
        </Space>
      </div>

      {/* Diagnostics */}
      <Card title="诊断结果" style={{ marginBottom: 24 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>正在诊断...</div>
          </div>
        ) : (
          <List
            dataSource={diagnostics}
            renderItem={(item) => (
              <List.Item
                actions={
                  item.fixAction ? [
                    <Button
                      type="primary"
                      danger={item.status === 'error'}
                      size="small"
                      icon={<ToolOutlined />}
                      loading={fixing === item.id}
                      onClick={() => handleFix(item)}
                    >
                      {item.fixLabel || '修复'}
                    </Button>
                  ] : undefined
                }
              >
                <List.Item.Meta
                  avatar={item.icon}
                  title={
                    <Space>
                      {item.name}
                      {getStatusTag(item.status)}
                    </Space>
                  }
                  description={item.message}
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* Health Tip */}
      {errorCount === 0 && warnCount === 0 && (
        <Alert
          type="success"
          title="系统运行正常"
          description="所有组件均正常工作"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Log Viewer */}
      <Card
        title={
          <Space>
            <FileTextOutlined />
            Gateway 日志
          </Space>
        }
        extra={
          <Space>
            <Input
              type="number"
              size="small"
              value={logLines}
              onChange={(e) => setLogLines(Number(e.target.value))}
              style={{ width: 80 }}
              min={10}
              max={500}
            />
            <Button size="small" onClick={loadLogs}>加载</Button>
          </Space>
        }
      >
        {logs.length === 0 ? (
          <Text type="secondary">暂无日志数据</Text>
        ) : (
          <div style={{
            background: '#1e1e1e',
            color: '#d4d4d4',
            padding: 16,
            borderRadius: 4,
            fontFamily: 'monospace',
            fontSize: 12,
            maxHeight: 400,
            overflow: 'auto',
          }}>
            {logs.map((log, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                <span style={{ color: '#666' }}>{log.time}</span>
                {' '}
                <span style={{ color: getLogLevelColor(log.level), fontWeight: log.level === 'error' ? 'bold' : 'normal' }}>
                  [{log.level.toUpperCase()}]
                </span>
                {' '}
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Fix Confirmation Modal */}
      <Modal
        title="确认修复"
        open={!!showFixConfirm}
        onOk={executeFix}
        onCancel={() => setShowFixConfirm(null)}
        okText="确认修复"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <div style={{ padding: '16px 0' }}>
          <p>即将执行修复操作:</p>
          <p><strong>{showFixConfirm?.name}</strong></p>
          <p>{showFixConfirm?.message}</p>
          <Alert
            type="warning"
            title="注意"
            description="此操作可能需要重启相关服务"
            showIcon
            style={{ marginTop: 16 }}
          />
        </div>
      </Modal>
    </div>
  )
}
