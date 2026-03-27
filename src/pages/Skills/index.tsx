import { useState, useEffect } from 'react'
import { Typography, Card, Spin, Button, Space, Tag, Alert, Empty, Tooltip, Switch, Divider, List } from 'antd'
import {
  AppstoreOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  QuestionCircleOutlined,
  DownloadOutlined,
  SettingOutlined,
  CodeOutlined,
} from '@ant-design/icons'
import { readConfig } from '../../services/tauri'

const { Title, Text, Paragraph } = Typography

// Skill 信息
interface SkillInfo {
  id: string
  name: string
  description: string
  status: 'active' | 'disabled' | 'needs_setup' | 'unknown'
  version?: string
  path?: string
  dependencies?: string[]
}

export default function SkillsPage() {
  const [loading, setLoading] = useState(true)
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadSkills = async () => {
    setLoading(true)
    setError(null)
    try {
      // 从配置和文件系统中读取 Skills
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>

      // 模拟数据 - 实际应该从 ~/.openclaw/workspace/skills/ 读取
      const mockSkills: SkillInfo[] = [
        {
          id: 'weather',
          name: 'Weather',
          description: 'Get current weather and forecasts via wttr.in or Open-Meteo',
          status: 'active',
          version: '1.0.0',
          path: 'skills/weather/',
        },
        {
          id: 'coding-agent',
          name: 'Coding Agent',
          description: 'Delegate coding tasks to Codex, Claude Code, or Pi agents via background process',
          status: 'active',
          version: '1.0.0',
          path: 'skills/coding-agent/',
          dependencies: ['codex', 'claude'],
        },
        {
          id: 'feishu-bitable',
          name: '飞书多维表格',
          description: '飞书多维表格（Bitable）的创建、查询、编辑和管理工具',
          status: 'active',
          version: '1.0.0',
          path: 'skills/feishu-bitable/',
        },
        {
          id: 'feishu-calendar',
          name: '飞书日历',
          description: '飞书日历与日程管理工具集',
          status: 'active',
          version: '1.0.0',
          path: 'skills/feishu-calendar/',
        },
        {
          id: 'self-improving-agent',
          name: 'Self-Improving Agent',
          description: 'Self-improving agent system that analyzes conversation quality',
          status: 'needs_setup',
          version: '1.0.0',
          path: 'skills/self-improving-agent/',
          dependencies: ['openai'],
        },
      ]

      setSkills(mockSkills)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载 Skills 失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSkills() }, [])

  // 获取状态标签
  const getStatusTag = (status: string) => {
    switch (status) {
      case 'active':
        return <Tag color="success" icon={<CheckCircleOutlined />}>已启用</Tag>
      case 'disabled':
        return <Tag color="default" icon={<CloseCircleOutlined />}>已禁用</Tag>
      case 'needs_setup':
        return <Tag color="warning" icon={<ExclamationCircleOutlined />}>需要配置</Tag>
      default:
        return <Tag>未知</Tag>
    }
  }

  // 切换 Skill 状态
  const handleToggleSkill = async (skill: SkillInfo) => {
    // TODO: 实现切换逻辑
    setSuccess(`${skill.name} 状态已更新`)
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载 Skills...</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <AppstoreOutlined /> Skill 市场
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadSkills}>刷新</Button>
        </Space>
      </div>

      {error && <Alert type="error" message={error} showIcon closable style={{ marginBottom: 16 }} />}
      {success && <Alert type="success" message={success} showIcon closable style={{ marginBottom: 16 }} />}

      {/* 统计信息 */}
      <div style={{ marginBottom: 24 }}>
        <Space size="large">
          <Tag color="blue">总计: {skills.length}</Tag>
          <Tag color="success">已启用: {skills.filter(s => s.status === 'active').length}</Tag>
          <Tag color="warning">需配置: {skills.filter(s => s.status === 'needs_setup').length}</Tag>
          <Tag color="default">已禁用: {skills.filter(s => s.status === 'disabled').length}</Tag>
        </Space>
      </div>

      {/* Skills 列表 */}
      {skills.length === 0 ? (
        <Empty description="暂无 Skills">
          <Button type="primary" icon={<DownloadOutlined />}>
            从 ClawHub 安装
          </Button>
        </Empty>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {skills.map((skill) => (
            <Card
              key={skill.id}
              title={
                <Space>
                  <CodeOutlined />
                  <Text strong>{skill.name}</Text>
                </Space>
              }
              size="small"
              extra={getStatusTag(skill.status)}
            >
              <div style={{ lineHeight: 2 }}>
                <Paragraph
                  ellipsis={{ rows: 2 }}
                  style={{ marginBottom: 8, minHeight: 44 }}
                >
                  {skill.description}
                </Paragraph>

                {skill.version && (
                  <div>
                    <Text type="secondary">版本：</Text>
                    <Tag>{skill.version}</Tag>
                  </div>
                )}

                {skill.path && (
                  <div>
                    <Text type="secondary">路径：</Text>
                    <Text code style={{ fontSize: 11 }}>{skill.path}</Text>
                  </div>
                )}

                {skill.dependencies && skill.dependencies.length > 0 && (
                  <div>
                    <Text type="secondary">依赖：</Text>
                    <Space size={[0, 4]} wrap>
                      {skill.dependencies.map(dep => (
                        <Tag key={dep} color="orange">{dep}</Tag>
                      ))}
                    </Space>
                  </div>
                )}
              </div>

              <Divider style={{ margin: '12px 0' }} />

              <Space>
                <Tooltip title={skill.status === 'active' ? '禁用' : '启用'}>
                  <Switch
                    size="small"
                    checked={skill.status === 'active'}
                    onChange={() => handleToggleSkill(skill)}
                    disabled={skill.status === 'needs_setup'}
                  />
                </Tooltip>
                <Button size="small" icon={<SettingOutlined />}>配置</Button>
              </Space>
            </Card>
          ))}
        </div>
      )}

      {/* 使用说明 */}
      <Card title="使用说明" size="small" style={{ marginTop: 24 }}>
        <div style={{ lineHeight: 2.5 }}>
          <div>
            <Space>
              <QuestionCircleOutlined style={{ color: '#999' }} />
              <Text>Skills 是 Agent 的技能扩展，可以为 Agent 添加新功能</Text>
            </Space>
          </div>
          <div>
            <Space>
              <QuestionCircleOutlined style={{ color: '#999' }} />
              <Text>「需要配置」状态表示缺少必要的依赖或配置</Text>
            </Space>
          </div>
          <div>
            <Space>
              <QuestionCircleOutlined style={{ color: '#999' }} />
              <Text>禁用 Skill 后，Agent 将无法使用该技能</Text>
            </Space>
          </div>
          <div>
            <Space>
              <QuestionCircleOutlined style={{ color: '#999' }} />
              <Text>更多 Skills 可以从 ClawHub (clawhub.com) 安装</Text>
            </Space>
          </div>
        </div>
      </Card>
    </div>
  )
}
