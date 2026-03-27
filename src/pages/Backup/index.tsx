import { useState, useEffect } from 'react'
import { Typography, Card, Spin, Space, Tag, Button, Alert, Modal, Input, Progress, Table, Popconfirm, Checkbox, Tooltip, Radio } from 'antd'
import {
  PlusOutlined,
  SyncOutlined,
  LockOutlined,
  DeleteOutlined,
  UploadOutlined,
  SafetyOutlined,
  FolderOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  QuestionCircleOutlined,
  FileTextOutlined,
  SettingOutlined,
} from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography
const { Password } = Input

interface BackupFile {
  name: string
  path: string
  size: number
  created_at: string
  encrypted: boolean
}

// 备份配置选项
interface BackupOption {
  key: string
  label: string
  description: string
  path: string
  default: boolean
}

const BACKUP_OPTIONS: BackupOption[] = [
  {
    key: 'config',
    label: '配置文件',
    description: 'openclaw.json 及相关配置',
    path: 'openclaw.json',
    default: true,
  },
  {
    key: 'agents',
    label: 'Agent 工作区',
    description: '所有 Agent 的工作区文件（SOUL.md、MEMORY.md 等）',
    path: 'workspace-*/',
    default: true,
  },
  {
    key: 'credentials',
    label: '凭证文件',
    description: '存储的 API 密钥和认证信息',
    path: 'credentials/',
    default: true,
  },
  {
    key: 'extensions',
    label: '扩展和插件',
    description: '安装的 Skills 和插件',
    path: 'extensions/',
    default: false,
  },
  {
    key: 'logs',
    label: '日志文件',
    description: '系统运行日志',
    path: 'logs/',
    default: false,
  },
]

// 备份预设
const BACKUP_PRESETS = [
  { label: '仅配置文件', value: 'config', options: ['config'] },
  { label: '配置 + 工作区（推荐）', value: 'recommended', options: ['config', 'agents', 'credentials'] },
  { label: '完整备份', value: 'full', options: ['config', 'agents', 'credentials', 'extensions', 'logs'] },
]

export default function BackupPage() {
  const [loading, setLoading] = useState(false)
  const [backups, setBackups] = useState<BackupFile[]>([])
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [restoringBackup, setRestoringBackup] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRestoreModal, setShowRestoreModal] = useState<BackupFile | null>(null)
  const [backupPassword, setBackupPassword] = useState('')
  const [restorePassword, setRestorePassword] = useState('')
  const [progress, setProgress] = useState(0)
  const [progressStatus, setProgressStatus] = useState<'active' | 'success' | 'exception'>('active')

  // 备份选择状态
  const [selectedPreset, setSelectedPreset] = useState<string>('recommended')
  const [selectedOptions, setSelectedOptions] = useState<string[]>(['config', 'agents', 'credentials'])

  const loadBackups = async () => {
    setLoading(true)
    try {
      // Simulated backup list - in real use, this calls a Tauri command
      const mockBackups: BackupFile[] = [
        {
          name: 'openclaw-backup-2026-03-26-230000.ocbak',
          path: 'C:\\Users\\lhu56\\.openclaw\\backups\\openclaw-backup-2026-03-26-230000.ocbak',
          size: 2048576,
          created_at: '2026-03-26 23:00:00',
          encrypted: true,
        },
        {
          name: 'openclaw-backup-2026-03-25-200000.ocbak',
          path: 'C:\\Users\\lhu56\\.openclaw\\backups\\openclaw-backup-2026-03-25-200000.ocbak',
          size: 1843200,
          created_at: '2026-03-25 20:00:00',
          encrypted: true,
        },
      ]
      setBackups(mockBackups)
    } catch (err) {
      console.error('Failed to load backups:', err)
    } finally {
      setLoading(false)
    }
  }

  // 处理预设选择
  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset)
    const presetConfig = BACKUP_PRESETS.find(p => p.value === preset)
    if (presetConfig) {
      setSelectedOptions(presetConfig.options)
    }
  }

  // 处理单独选项选择
  const handleOptionChange = (optionKey: string, checked: boolean) => {
    const newOptions = checked
      ? [...selectedOptions, optionKey]
      : selectedOptions.filter(k => k !== optionKey)
    setSelectedOptions(newOptions)
    setSelectedPreset('custom')
  }

  const handleCreateBackup = async () => {
    setCreatingBackup(true)
    setProgress(0)
    setProgressStatus('active')
    setShowCreateModal(false)

    try {
      // Simulated backup creation with progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 300))
        setProgress(i)
      }
      setProgressStatus('success')
      await loadBackups()
    } catch (err) {
      console.error('Backup creation failed:', err)
      setProgressStatus('exception')
    } finally {
      setCreatingBackup(false)
      setBackupPassword('')
    }
  }

  const handleRestoreBackup = async () => {
    if (!showRestoreModal) return
    setRestoringBackup(showRestoreModal.name)
    setShowRestoreModal(null)

    try {
      // Simulated restore - in real use:
      // 1. Stop Gateway
      // 2. Restore files
      // 3. Restart Gateway
      await new Promise(resolve => setTimeout(resolve, 2000))
      alert('恢复完成！Gateway 已重启。')
    } catch (err) {
      console.error('Restore failed:', err)
    } finally {
      setRestoringBackup(null)
      setRestorePassword('')
    }
  }

  const handleDeleteBackup = async (backup: BackupFile) => {
    try {
      // In real use, call Tauri command to delete
      setBackups(backups.filter(b => b.name !== backup.name))
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  useEffect(() => {
    loadBackups()
  }, [])

  const columns = [
    {
      title: '备份文件',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: BackupFile) => (
        <Space>
          <SafetyOutlined style={{ color: record.encrypted ? '#52c41a' : '#999' }} />
          <Text>{name}</Text>
        </Space>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (size: number) => formatSize(size),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
    },
    {
      title: '加密',
      dataIndex: 'encrypted',
      key: 'encrypted',
      width: 80,
      render: (encrypted: boolean) => (
        encrypted
          ? <Tag color="success" icon={<LockOutlined />}>AES</Tag>
          : <Tag color="default">无</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: BackupFile) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<UploadOutlined />}
            loading={restoringBackup === record.name}
            onClick={() => setShowRestoreModal(record)}
          >
            恢复
          </Button>
          <Popconfirm
            title="确认删除此备份？"
            onConfirm={() => handleDeleteBackup(record)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <FolderOutlined /> 备份恢复
        </Title>
        <Space>
          <Button icon={<SyncOutlined />} onClick={loadBackups} loading={loading}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowCreateModal(true)}
          >
            创建备份
          </Button>
        </Space>
      </div>

      {/* Backup Progress */}
      {creatingBackup && (
        <Card style={{ marginBottom: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <Progress percent={progress} status={progressStatus} />
            <Text type="secondary">
              {progressStatus === 'success' ? '备份完成' : '正在创建加密备份...'}
            </Text>
          </div>
        </Card>
      )}

      {/* Backup List */}
      <Card title="备份列表" style={{ marginBottom: 24 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : backups.length === 0 ? (
          <Alert
            type="info"
            title="暂无备份"
            description="点击「创建备份」按钮来创建您的第一个加密备份"
            showIcon
          />
        ) : (
          <Table
            dataSource={backups}
            columns={columns}
            rowKey="name"
            pagination={false}
            size="middle"
          />
        )}
      </Card>

      {/* Backup Info */}
      <Card title="备份说明" size="small">
        <div style={{ lineHeight: 2 }}>
          <div><SafetyOutlined /> 备份格式: <Tag>.ocbak</Tag> (加密的 tar 归档)</div>
          <div><FolderOutlined /> 备份目录: <Text code>C:\Users\lhu56\.openclaw\backups\</Text></div>
          <div><LockOutlined /> 加密方式: 用户自定义密码保护</div>
        </div>
      </Card>

      {/* Create Backup Modal */}
      <Modal
        title="创建加密备份"
        open={showCreateModal}
        onOk={handleCreateBackup}
        onCancel={() => { setShowCreateModal(false); setBackupPassword(''); setSelectedPreset('recommended'); setSelectedOptions(['config', 'agents', 'credentials']) }}
        okText="开始备份"
        cancelText="取消"
        okButtonProps={{ disabled: !backupPassword || selectedOptions.length === 0 }}
        width={600}
      >
        <Space orientation="vertical" style={{ width: '100%' }} size="large">
          {/* 备份预设选择 */}
          <div>
            <Space>
              <Text strong>备份模式</Text>
              <Tooltip title="选择备份的范围，推荐使用「配置 + 工作区」模式">
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
            <Radio.Group
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              style={{ width: '100%', marginTop: 8 }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {BACKUP_PRESETS.map((preset) => (
                  <Radio key={preset.value} value={preset.value}>
                    {preset.label}
                  </Radio>
                ))}
                <Radio value="custom">自定义</Radio>
              </Space>
            </Radio.Group>
          </div>

          {/* 自定义选项 */}
          {selectedPreset === 'custom' && (
            <div>
              <Space>
                <Text strong>选择备份内容</Text>
                <Tooltip title="选择要包含在备份中的文件和目录">
                  <QuestionCircleOutlined style={{ color: '#999' }} />
                </Tooltip>
              </Space>
              <div style={{ marginTop: 8 }}>
                {BACKUP_OPTIONS.map((option) => (
                  <div key={option.key} style={{ marginBottom: 8 }}>
                    <Checkbox
                      checked={selectedOptions.includes(option.key)}
                      onChange={(e) => handleOptionChange(option.key, e.target.checked)}
                    >
                      <Space>
                        <Text>{option.label}</Text>
                        <Tooltip title={option.description}>
                          <QuestionCircleOutlined style={{ color: '#999', fontSize: 12 }} />
                        </Tooltip>
                      </Space>
                    </Checkbox>
                    <div style={{ marginLeft: 24, color: '#999', fontSize: 12 }}>
                      {option.description} ({option.path})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 密码输入 */}
          <div>
            <Space>
              <Text strong>备份密码</Text>
              <Tooltip title="设置备份密码，用于加密备份文件。请牢记密码，丢失将无法恢复">
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
            <Password
              placeholder="输入备份密码"
              value={backupPassword}
              onChange={(e) => setBackupPassword(e.target.value)}
              iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
              style={{ marginTop: 8 }}
            />
          </div>

          <Alert
            type="warning"
            title="请牢记密码"
            description="密码丢失将无法恢复备份数据"
            showIcon
          />
        </Space>
      </Modal>

      {/* Restore Confirmation Modal */}
      <Modal
        title="确认恢复"
        open={!!showRestoreModal}
        onOk={handleRestoreBackup}
        onCancel={() => { setShowRestoreModal(null); setRestorePassword('') }}
        okText="确认恢复"
        cancelText="取消"
        okButtonProps={{ danger: true, disabled: !restorePassword }}
      >
        <Space orientation="vertical" style={{ width: '100%' }} size="large">
          <Alert
            type="error"
            title="危险操作"
            description="恢复操作将覆盖当前所有配置，Gateway 将自动重启"
            showIcon
          />
          <div>
            <Text type="secondary">备份文件：</Text>
            <Text code>{showRestoreModal?.name}</Text>
          </div>
          <div>
            <Text type="secondary">创建时间：</Text>
            <Text>{showRestoreModal?.created_at}</Text>
          </div>
          <div>
            <Space>
              <Text strong>输入密码确认恢复</Text>
              <Tooltip title="请输入创建备份时设置的密码">
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
            <Password
              placeholder="输入备份密码"
              value={restorePassword}
              onChange={(e) => setRestorePassword(e.target.value)}
              iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
              style={{ marginTop: 8 }}
            />
          </div>
        </Space>
      </Modal>
    </div>
  )
}
