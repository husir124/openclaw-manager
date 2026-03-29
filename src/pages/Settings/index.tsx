import { useState, useEffect } from 'react'
import { Typography, Card, Spin, Button, Space, Tag, Switch, Select, Input, Alert, Divider, Tooltip, Progress } from 'antd'
import {
  SettingOutlined,
  ReloadOutlined,
  SaveOutlined,
  QuestionCircleOutlined,
  LockOutlined,
  GlobalOutlined,
  CloudServerOutlined,
  InfoCircleOutlined,
  ClearOutlined,
  FolderOutlined,
} from '@ant-design/icons'
import { readConfig, writeConfig, startGateway, stopGateway, checkGatewayStatus, getAppInfo, clearCache, getDiskUsage, type AppInfo, type DiskUsage } from '../../services/tauri'
import { useTheme } from '../../contexts/ThemeContext'

const { Title, Text, Link } = Typography

interface AppSettings {
  gatewayPort: number
  gatewayTailscaleMode: 'off' | 'serve' | 'funnel'
  dmPolicy: 'pairing' | 'open'
  gatewayAuthMode: 'token' | 'none'
  theme: 'light' | 'dark' | 'system'
  telemetryEnabled: boolean
  autoUpdateEnabled: boolean
}

export default function SettingsPage() {
  const { setThemeMode } = useTheme()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [settings, setSettings] = useState<AppSettings>({
    gatewayPort: 18789,
    gatewayTailscaleMode: 'off',
    dmPolicy: 'pairing',
    gatewayAuthMode: 'token',
    theme: 'system',
    telemetryEnabled: false,
    autoUpdateEnabled: true,
  })

  const [gatewayRunning, setGatewayRunning] = useState(false)
  const [gatewayPort, setGatewayPort] = useState(18789)
  const [gatewayPid, setGatewayPid] = useState<number | null>(null)
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [diskUsage, setDiskUsage] = useState<DiskUsage | null>(null)
  const [clearingCache, setClearingCache] = useState(false)
  const [openclawVersion, setOpenclawVersion] = useState<string | null>(null)

  const loadSettings = async () => {
    setLoading(true)
    setError(null)
    try {
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>
      const gatewayConfig = (parsed.gateway as Record<string, unknown>) || {}
      const authConfig = (gatewayConfig.auth as Record<string, unknown>) || {}
      const tailscaleConfig = (gatewayConfig.tailscale as Record<string, unknown>) || {}
      const channelsConfig = (parsed.channels as Record<string, unknown>) || {}
      const telegramConfig = (channelsConfig.telegram as Record<string, unknown>) || {}
      const metaConfig = (parsed.meta as Record<string, unknown>) || {}

      const savedTheme = (localStorage.getItem('ocm-theme') || 'system') as AppSettings['theme']
      const savedTelemetry = localStorage.getItem('ocm-telemetry') === 'true'
      const savedAutoUpdate = localStorage.getItem('ocm-auto-update') !== 'false'

      setSettings({
        gatewayPort: (gatewayConfig.port as number) || 18789,
        gatewayTailscaleMode: ((tailscaleConfig.mode as string) || 'off') as AppSettings['gatewayTailscaleMode'],
        dmPolicy: ((telegramConfig.dmPolicy as string) || 'pairing') as AppSettings['dmPolicy'],
        gatewayAuthMode: ((authConfig.mode as string) || 'token') as AppSettings['gatewayAuthMode'],
        theme: savedTheme,
        telemetryEnabled: savedTelemetry,
        autoUpdateEnabled: savedAutoUpdate,
      })

      setThemeMode(savedTheme)

      const gwStatus = await checkGatewayStatus()
      setGatewayRunning(gwStatus.running)
      setGatewayPort(gwStatus.port)
      setGatewayPid(gwStatus.pid)

      setOpenclawVersion((metaConfig.lastTouchedVersion as string) || null)
      const info = await getAppInfo()
      setAppInfo(info)
      const usage = await getDiskUsage()
      setDiskUsage(usage)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载设置失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSettings() }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>

      const gatewayConfig = (parsed.gateway as Record<string, unknown>) || {}
      gatewayConfig.port = settings.gatewayPort
      const authConfig = (gatewayConfig.auth as Record<string, unknown>) || {}
      authConfig.mode = settings.gatewayAuthMode
      gatewayConfig.auth = authConfig
      const tailscaleConfig = (gatewayConfig.tailscale as Record<string, unknown>) || {}
      tailscaleConfig.mode = settings.gatewayTailscaleMode
      gatewayConfig.tailscale = tailscaleConfig
      parsed.gateway = gatewayConfig

      const channelsConfig = (parsed.channels as Record<string, unknown>) || {}
      const telegramConfig = (channelsConfig.telegram as Record<string, unknown>) || {}
      telegramConfig.dmPolicy = settings.dmPolicy
      channelsConfig.telegram = telegramConfig
      parsed.channels = channelsConfig

      await writeConfig(JSON.stringify(parsed, null, 2))

      localStorage.setItem('ocm-theme', settings.theme)
      localStorage.setItem('ocm-telemetry', String(settings.telemetryEnabled))
      localStorage.setItem('ocm-auto-update', String(settings.autoUpdateEnabled))

      setThemeMode(settings.theme)
      setSuccess('设置保存成功')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleGatewayToggle = async () => {
    try {
      if (gatewayRunning) {
        await stopGateway()
        setGatewayRunning(false)
      } else {
        await startGateway()
        const status = await checkGatewayStatus()
        setGatewayRunning(status.running)
        setGatewayPort(status.port)
        setGatewayPid(status.pid)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    }
  }

  const handleThemeChange = (theme: AppSettings['theme']) => {
    setSettings({ ...settings, theme })
    setThemeMode(theme)
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载设置...</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <SettingOutlined /> 设置
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadSettings}>刷新</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>保存设置</Button>
        </Space>
      </div>

      {error && <Alert type="error" message={error} showIcon closable style={{ marginBottom: 16 }} />}
      {success && <Alert type="success" message={success} showIcon closable style={{ marginBottom: 16 }} />}

      {/* Gateway */}
      <Card title={<Space><CloudServerOutlined />Gateway 设置</Space>} style={{ marginBottom: 16 }}>
        <div style={{ lineHeight: 2.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Text>Gateway 状态</Text>
              <Tag color={gatewayRunning ? 'success' : 'default'}>{gatewayRunning ? '运行中' : '已停止'}</Tag>
              {gatewayRunning && <Text type="secondary" style={{ fontSize: 12 }}>端口: {gatewayPort} | PID: {gatewayPid}</Text>}
            </Space>
            <Button type={gatewayRunning ? 'default' : 'primary'} danger={gatewayRunning} onClick={handleGatewayToggle}>
              {gatewayRunning ? '停止' : '启动'}
            </Button>
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Text>端口</Text>
              <Tooltip title="Gateway WebSocket 服务监听的端口"><QuestionCircleOutlined style={{ color: '#999' }} /></Tooltip>
            </Space>
            <Input type="number" value={settings.gatewayPort}
              onChange={(e) => setSettings({ ...settings, gatewayPort: parseInt(e.target.value) || 18789 })}
              style={{ width: 120 }} min={1024} max={65535} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Text>Tailscale 模式</Text>
              <Tooltip title="off: 不使用; serve: 局域网; funnel: 公网"><QuestionCircleOutlined style={{ color: '#999' }} /></Tooltip>
            </Space>
            <Select value={settings.gatewayTailscaleMode}
              onChange={(v) => setSettings({ ...settings, gatewayTailscaleMode: v })}
              options={[{ label: '关闭', value: 'off' }, { label: '局域网', value: 'serve' }, { label: '公网', value: 'funnel' }]}
              style={{ width: 120 }} />
          </div>
        </div>
      </Card>

      {/* 安全 */}
      <Card title={<Space><LockOutlined />安全设置</Space>} style={{ marginBottom: 16 }}>
        <div style={{ lineHeight: 2.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Text>私聊策略</Text>
              <Tooltip title="pairing: 需要配对授权; open: 任何人可使用"><QuestionCircleOutlined style={{ color: '#999' }} /></Tooltip>
            </Space>
            <Select value={settings.dmPolicy}
              onChange={(v) => setSettings({ ...settings, dmPolicy: v })}
              options={[{ label: '配对授权（推荐）', value: 'pairing' }, { label: '开放模式', value: 'open' }]}
              style={{ width: 180 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Text>Gateway 认证</Text>
              <Tooltip title="token: 使用令牌认证; none: 无认证（仅本地）"><QuestionCircleOutlined style={{ color: '#999' }} /></Tooltip>
            </Space>
            <Select value={settings.gatewayAuthMode}
              onChange={(v) => setSettings({ ...settings, gatewayAuthMode: v })}
              options={[{ label: 'Token 认证', value: 'token' }, { label: '无认证', value: 'none' }]}
              style={{ width: 180 }} />
          </div>
        </div>
      </Card>

      {/* 界面 */}
      <Card title={<Space><GlobalOutlined />界面设置</Space>} style={{ marginBottom: 16 }}>
        <div style={{ lineHeight: 2.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Text>主题</Text>
              <Tooltip title="切换即时生效"><QuestionCircleOutlined style={{ color: '#999' }} /></Tooltip>
            </Space>
            <Select value={settings.theme} onChange={handleThemeChange}
              options={[{ label: '浅色', value: 'light' }, { label: '深色', value: 'dark' }, { label: '跟随系统', value: 'system' }]}
              style={{ width: 120 }} />
          </div>
        </div>
      </Card>

      {/* 其他 */}
      <Card title={<Space><SettingOutlined />其他设置</Space>} style={{ marginBottom: 16 }}>
        <div style={{ lineHeight: 2.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Text>自动更新</Text>
              <Tooltip title="启动时检查更新"><QuestionCircleOutlined style={{ color: '#999' }} /></Tooltip>
            </Space>
            <Switch checked={settings.autoUpdateEnabled}
              onChange={(checked) => setSettings({ ...settings, autoUpdateEnabled: checked })} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Text>遥测数据</Text>
              <Tooltip title="发送匿名使用数据帮助改进产品"><QuestionCircleOutlined style={{ color: '#999' }} /></Tooltip>
            </Space>
            <Switch checked={settings.telemetryEnabled}
              onChange={(checked) => setSettings({ ...settings, telemetryEnabled: checked })} />
          </div>
        </div>
      </Card>

      {/* 关于 */}
      <Card title={<Space><InfoCircleOutlined />关于</Space>} style={{ marginBottom: 16 }}>
        <div style={{ lineHeight: 2.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text type="secondary">应用版本: </Text>
              <Tag>v{appInfo?.version || '0.1.0'}</Tag>
            </div>
            <Button size="small" onClick={async () => {
              try {
                const { openReleasesPage } = await import('../../services/tauri')
                const url = await openReleasesPage()
                window.open(url, '_blank')
              } catch { window.open('https://github.com/husir124/openclaw-manager/releases', '_blank') }
            }}>检查更新</Button>
          </div>
          {openclawVersion && <div><Text type="secondary">OpenClaw 版本: </Text><Tag color="blue">{openclawVersion}</Tag></div>}
          <div><Text type="secondary">项目地址: </Text><Link href="https://github.com/husir124/openclaw-manager" target="_blank">GitHub</Link></div>
          <div><Text type="secondary">OpenClaw 官网: </Text><Link href="https://openclaw.ai" target="_blank">openclaw.ai</Link></div>
          <div><Text type="secondary">文档: </Text><Link href="https://docs.openclaw.ai" target="_blank">docs.openclaw.ai</Link></div>
        </div>
      </Card>

      {/* 磁盘 */}
      <Card title={<Space><FolderOutlined />磁盘使用</Space>}
        extra={<Button size="small" icon={<ClearOutlined />} loading={clearingCache} onClick={async () => {
          setClearingCache(true)
          try {
            const result = await clearCache()
            setSuccess(result)
            const usage = await getDiskUsage()
            setDiskUsage(usage)
          } catch (err) { setError(err instanceof Error ? err.message : '清理失败') }
          finally { setClearingCache(false) }
        }}>清理缓存</Button>}>
        {diskUsage ? (
          <div style={{ lineHeight: 2.5 }}>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">总占用: </Text>
              <Text strong>{diskUsage.formatted_total}</Text>
              <Progress percent={Math.min(100, (diskUsage.total_bytes / (1024 * 1024 * 1024)) * 10)} size="small" style={{ marginTop: 8 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div><Text type="secondary">工作区: </Text><div>{diskUsage.formatted_workspace}</div></div>
              <div><Text type="secondary">日志: </Text><div>{diskUsage.formatted_logs}</div></div>
              <div><Text type="secondary">备份: </Text><div>{diskUsage.formatted_backups}</div></div>
            </div>
          </div>
        ) : <Spin />}
      </Card>
    </div>
  )
}
