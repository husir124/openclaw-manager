import { useState, useEffect } from 'react'
import { Typography, Card, Spin, Space, Tag, Button, Alert, List, Modal, Input, Progress, Divider, Table, Popconfirm } from 'antd'
import {
  PlusOutlined,
  SyncOutlined,
  LockOutlined,
  UnlockOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
  SafetyOutlined,
  FolderOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
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
          <div><SafetyOutlined /> 备份格式: <Tag>.ocbak</Tag> (AES-256-GCM 加密的 tar 归档)</div>
          <div><FolderOutlined /> 备份目录: <Text code>C:\Users\lhu56\.openclaw\backups\</Text></div>
          <div><LockOutlined /> 加密方式: 用户自定义密码 + AES-256-GCM</div>
        </div>
      </Card>

      {/* Create Backup Modal */}
      <Modal
        title="创建加密备份"
        open={showCreateModal}
        onOk={handleCreateBackup}
        onCancel={() => { setShowCreateModal(false); setBackupPassword('') }}
        okText="开始备份"
        cancelText="取消"
        okButtonProps={{ disabled: !backupPassword }}
      >
        <div style={{ padding: '16px 0' }}>
          <Paragraph>设置备份密码，用于加密您的配置数据。</Paragraph>
          <Password
            placeholder="输入备份密码"
            value={backupPassword}
            onChange={(e) => setBackupPassword(e.target.value)}
            iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
            style={{ marginBottom: 16 }}
          />
          <Alert
            type="warning"
            title="请牢记密码"
            description="密码丢失将无法恢复备份数据"
            showIcon
          />
        </div>
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
        <div style={{ padding: '16px 0' }}>
          <Alert
            type="error"
            title="危险操作"
            description="恢复操作将覆盖当前所有配置，Gateway 将自动重启"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Paragraph>
            备份文件: <Text code>{showRestoreModal?.name}</Text>
          </Paragraph>
          <Paragraph>
            创建时间: {showRestoreModal?.created_at}
          </Paragraph>
          <Password
            placeholder="输入备份密码以确认恢复"
            value={restorePassword}
            onChange={(e) => setRestorePassword(e.target.value)}
            iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
          />
        </div>
      </Modal>
    </div>
  )
}
