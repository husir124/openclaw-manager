import { useState, useEffect } from 'react'
import { Typography, Card, Spin, Button, Space, Tag, Switch, Select, Input, Alert, Divider, Tooltip } from 'antd'
import {
  SettingOutlined,
  ReloadOutlined,
  SaveOutlined,
  QuestionCircleOutlined,
  LockOutlined,
  GlobalOutlined,
  CloudServerOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { readConfig, writeConfig, startGateway, stopGateway, checkGatewayStatus } from '../../services/tauri'

const { Title, Text, Link } = Typography

// 应用设置
interface AppSettings {
  // Gateway
  gatewayPort: number
  gatewayTailscaleMode: 'off' | 'serve' | 'funnel'

  // 安全
  dmPolicy: 'pairing' | 'open'
  gatewayAuthMode: 'token' | 'none'

  // 界面
  theme: 'light' | 'dark' | 'system'
  language: 'zh' | 'en'

  // 其他
  telemetryEnabled: boolean
  autoUpdateEnabled: boolean
}

// 主题切换函数
function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement
  let isDark = false

  if (theme === 'system') {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  } else {
    isDark = theme === 'dark'
  }

  root.setAttribute('data-theme', isDark ? 'dark' : 'light')
  document.body.style.background = isDark ? '#141414' : '#fafafa'
  document.body.style.color = isDark ? '#fff' : '#000'

  if (isDark) {
    document.body.classList.add('dark')
    document.body.classList.remove('light')
  } else {
    document.body.classList.add('light')
    document.body.classList.remove('dark')
  }

  localStorage.setItem('ocm-theme', theme)

  // 触发自定义事件，让 main.tsx 的 ConfigProvider 响应
  window.dispatchEvent(new Event('theme-change'))
}

// 语言切换函数
function applyLanguage(language: 'zh' | 'en') {
  localStorage.setItem('ocm-language', language)
  // 注意：完整的 i18n 需要额外的库，这里先存储偏好
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 设置状态
  const [settings, setSettings] = useState<AppSettings>({
    gatewayPort: 18789,
    gatewayTailscaleMode: 'off',
    dmPolicy: 'pairing',
    gatewayAuthMode: 'token',
    theme: 'system',
    language: 'zh',
    telemetryEnabled: false,
    autoUpdateEnabled: true,
  })

  // Gateway 状态
  const [gatewayRunning, setGatewayRunning] = useState(false)
  const [gatewayPort, setGatewayPort] = useState(18789)
  const [gatewayPid, setGatewayPid] = useState<number | null>(null)

  // 版本信息
  const [appVersion] = useState('0.1.0')
  const [openclawVersion, setOpenclawVersion] = useState<string | null>(null)

  const loadSettings = async () => {
    setLoading(true)
    setError(null)
    try {
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>

      // 读取 Gateway 配置
      const gatewayConfig = (parsed.gateway as Record<string, unknown>) || {}
      const authConfig = (gatewayConfig.auth as Record<string, unknown>) || {}
      const tailscaleConfig = (gatewayConfig.tailscale as Record<string, unknown>) || {}

      // 读取 channels 配置
      const channelsConfig = (parsed.channels as Record<string, unknown>) || {}
      const telegramConfig = (channelsConfig.telegram as Record<string, unknown>) || {}

      // 读取 meta
      const metaConfig = (parsed.meta as Record<string, unknown>) || {}

      // 从 localStorage 读取 UI 设置
      const savedTheme = (localStorage.getItem('ocm-theme') || 'system') as AppSettings['theme']
      const savedLanguage = (localStorage.getItem('ocm-language') || 'zh') as AppSettings['language']
      const savedTelemetry = localStorage.getItem('ocm-telemetry') === 'true'
      const savedAutoUpdate = localStorage.getItem('ocm-auto-update') !== 'false' // 默认 true

      setSettings({
        gatewayPort: (gatewayConfig.port as number) || 18789,
        gatewayTailscaleMode: ((tailscaleConfig.mode as string) || 'off') as AppSettings['gatewayTailscaleMode'],
        dmPolicy: ((telegramConfig.dmPolicy as string) || 'pairing') as AppSettings['dmPolicy'],
        gatewayAuthMode: ((authConfig.mode as string) || 'token') as AppSettings['gatewayAuthMode'],
        theme: savedTheme,
        language: savedLanguage,
        telemetryEnabled: savedTelemetry,
        autoUpdateEnabled: savedAutoUpdate,
      })

      // 应用已保存的主题
      applyTheme(savedTheme)

      // 获取 Gateway 状态
      const gwStatus = await checkGatewayStatus()
      setGatewayRunning(gwStatus.running)
      setGatewayPort(gwStatus.port)
      setGatewayPid(gwStatus.pid)

      // 获取版本
      setOpenclawVersion((metaConfig.lastTouchedVersion as string) || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载设置失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSettings() }, [])

  // 保存设置
  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>

      // 1. 更新 Gateway 配置
      const gatewayConfig = (parsed.gateway as Record<string, unknown>) || {}
      gatewayConfig.port = settings.gatewayPort

      const authConfig = (gatewayConfig.auth as Record<string, unknown>) || {}
      authConfig.mode = settings.gatewayAuthMode
      gatewayConfig.auth = authConfig

      const tailscaleConfig = (gatewayConfig.tailscale as Record<string, unknown>) || {}
      tailscaleConfig.mode = settings.gatewayTailscaleMode
      gatewayConfig.tailscale = tailscaleConfig

      parsed.gateway = gatewayConfig

      // 2. 更新 channels 配置
      const channelsConfig = (parsed.channels as Record<string, unknown>) || {}
      const telegramConfig = (channelsConfig.telegram as Record<string, unknown>) || {}
      telegramConfig.dmPolicy = settings.dmPolicy
      channelsConfig.telegram = telegramConfig
      parsed.channels = channelsConfig

      // 3. 写入配置文件
      await writeConfig(JSON.stringify(parsed, null, 2))

      // 4. 保存 UI 设置到 localStorage
      localStorage.setItem('ocm-theme', settings.theme)
      localStorage.setItem('ocm-language', settings.language)
      localStorage.setItem('ocm-telemetry', String(settings.telemetryEnabled))
      localStorage.setItem('ocm-auto-update', String(settings.autoUpdateEnabled))

      // 5. 应用主题
      applyTheme(settings.theme)

      // 6. 应用语言
      applyLanguage(settings.language)

      setSuccess('设置保存成功')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 启动/停止 Gateway
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

  // 主题变更即时预览
  const handleThemeChange = (theme: AppSettings['theme']) => {
    setSettings({ ...settings, theme })
    applyTheme(theme)
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
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
          >
            保存设置
          </Button>
        </Space>
      </div>

      {error && <Alert type="error" message={error} showIcon closable style={{ marginBottom: 16 }} />}
      {success && <Alert type="success" message={success} showIcon closable style={{ marginBottom: 16 }} />}

      {/* Gateway 设置 */}
      <Card
        title={
          <Space>
            <CloudServerOutlined />
            Gateway 设置
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <div style={{ lineHeight: 2.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Text>Gateway 状态</Text>
              <Tag color={gatewayRunning ? 'success' : 'default'}>
                {gatewayRunning ? '运行中' : '已停止'}
              </Tag>
              {gatewayRunning && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  端口: {gatewayPort} | PID: {gatewayPid}
                </Text>
              )}
            </Space>
            <Button
              type={gatewayRunning ? 'default' : 'primary'}
              danger={gatewayRunning}
              onClick={handleGatewayToggle}
            >
              {gatewayRunning ? '停止' : '启动'}
            </Button>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Text>端口</Text>
              <Tooltip title="Gateway WebSocket 服务监听的端口">
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
            <Input
              type="number"
              value={settings.gatewayPort}
              onChange={(e) => setSettings({ ...settings, gatewayPort: parseInt(e.target.value) || 18789 })}
              style={{ width: 120 }}
              min={1024}
              max={65535}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Text>Tailscale 模式</Text>
              <Tooltip title="off：不使用 Tailscale；serve：仅限局域网；funnel：公网访问">
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
            <Select
              value={settings.gatewayTailscaleMode}
              onChange={(v) => setSettings({ ...settings, gatewayTailscaleMode: v })}
              options={[
                { label: '关闭', value: 'off' },
                { label: '局域网', value: 'serve' },
                { label: '公网', value: 'funnel' },
              ]}
              style={{ width: 120 }}
            />
          </div>
        </div>
      </Card>

      {/* 安全设置 */}
      <Card
        title={
          <Space>
            <LockOutlined />
            安全设置
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <div style={{ lineHeight: 2.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Text>私聊策略</Text>
              <Tooltip title="pairing：需要配对授权；open：任何人可使用">
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
            <Select
              value={settings.dmPolicy}
              onChange={(v) => setSettings({ ...settings, dmPolicy: v })}
              options={[
                { label: '配对授权（推荐）', value: 'pairing' },
                { label: '开放模式', value: 'open' },
              ]}
              style={{ width: 180 }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Text>Gateway 认证</Text>
              <Tooltip title="token：使用令牌认证；none：无认证（仅本地）">
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
            <Select
              value={settings.gatewayAuthMode}
              onChange={(v) => setSettings({ ...settings, gatewayAuthMode: v })}
              options={[
                { label: 'Token 认证', value: 'token' },
                { label: '无认证', value: 'none' },
              ]}
              style={{ width: 180 }}
            />
          </div>
        </div>
      </Card>

      {/* 界面设置 */}
      <Card
        title={
          <Space>
            <GlobalOutlined />
            界面设置
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <div style={{ lineHeight: 2.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Text>主题</Text>
              <Tooltip title="切换后即时预览，保存后持久化">
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
            <Select
              value={settings.theme}
              onChange={handleThemeChange}
              options={[
                { label: '浅色', value: 'light' },
                { label: '深色', value: 'dark' },
                { label: '跟随系统', value: 'system' },
              ]}
              style={{ width: 120 }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Text>语言</Text>
              <Tooltip title="界面显示语言（保存后生效）">
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
            <Select
              value={settings.language}
              onChange={(v) => setSettings({ ...settings, language: v })}
              options={[
                { label: '中文', value: 'zh' },
                { label: 'English', value: 'en' },
              ]}
              style={{ width: 120 }}
            />
          </div>
        </div>
      </Card>

      {/* 其他设置 */}
      <Card
        title={
          <Space>
            <SettingOutlined />
            其他设置
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <div style={{ lineHeight: 2.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Text>自动更新</Text>
              <Tooltip title="启动时检查更新">
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
            <Switch
              checked={settings.autoUpdateEnabled}
              onChange={(checked) => setSettings({ ...settings, autoUpdateEnabled: checked })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Text>遥测数据</Text>
              <Tooltip title="发送匿名使用数据帮助改进产品">
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
            <Switch
              checked={settings.telemetryEnabled}
              onChange={(checked) => setSettings({ ...settings, telemetryEnabled: checked })}
            />
          </div>
        </div>
      </Card>

      {/* 关于 */}
      <Card
        title={
          <Space>
            <InfoCircleOutlined />
            关于
          </Space>
        }
      >
        <div style={{ lineHeight: 2.5 }}>
          <div>
            <Text type="secondary">应用版本：</Text>
            <Tag>v{appVersion}</Tag>
          </div>
          {openclawVersion && (
            <div>
              <Text type="secondary">OpenClaw 版本：</Text>
              <Tag color="blue">{openclawVersion}</Tag>
            </div>
          )}
          <div>
            <Text type="secondary">项目地址：</Text>
            <Link href="https://github.com/husir124/openclaw-manager" target="_blank">
              GitHub
            </Link>
          </div>
          <div>
            <Text type="secondary">OpenClaw 官网：</Text>
            <Link href="https://openclaw.ai" target="_blank">
              openclaw.ai
            </Link>
          </div>
          <div>
            <Text type="secondary">文档：</Text>
            <Link href="https://docs.openclaw.ai" target="_blank">
              docs.openclaw.ai
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
