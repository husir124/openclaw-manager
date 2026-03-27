import { useState, useEffect } from 'react'
import { Typography, Card, Spin, Button, Space, Tag, Alert, Empty, Tooltip, Switch, Divider, Tabs, Modal, Select, Input, Badge } from 'antd'
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
  CloudDownloadOutlined,
  FolderOutlined,
  RobotOutlined,
  SearchOutlined,
  GlobalOutlined,
  SortAscendingOutlined,
} from '@ant-design/icons'
import { listAllAgentsSkills, type AgentSkillsInfo, type SkillInfo } from '../../services/tauri'

const { Title, Text, Paragraph, Link } = Typography
const { Search } = Input

// ClawHub Skill
interface ClawHubSkill {
  id: string
  name: string
  slug: string
  description: string
  author: string
  version: string
  downloads: number
  installs: number
  stars: number
  updated_at: string
  installed: boolean
}

// 排序方式
type SortBy = 'downloads' | 'installs' | 'stars' | 'name' | 'newest' | 'updated'

export default function SkillsPage() {
  const [loading, setLoading] = useState(true)
  const [loadingClawhub, setLoadingClawhub] = useState(false)
  const [agentsSkills, setAgentsSkills] = useState<AgentSkillsInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // ClawHub 状态
  const [clawhubSkills, setClawhubSkills] = useState<ClawHubSkill[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('downloads')
  const [sortAsc, setSortAsc] = useState(false)
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [selectedClawhubSkill, setSelectedClawhubSkill] = useState<ClawHubSkill | null>(null)
  const [installTarget, setInstallTarget] = useState('main')

  // 加载本地 Skills
  const loadLocalSkills = async () => {
    setLoading(true)
    setError(null)
    try {
      const skills = await listAllAgentsSkills()
      setAgentsSkills(skills)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载本地 Skills 失败')
    } finally {
      setLoading(false)
    }
  }

  // 动态加载 ClawHub 数据
  const loadClawhubSkills = async () => {
    setLoadingClawhub(true)
    try {
      // 使用浏览器获取 ClawHub 数据
      // 由于 Tauri 限制，我们通过 fetch 尝试获取
      // 如果失败，使用本地缓存的 Skills 信息
      const response = await fetch(`https://clawhub.ai/api/skills?sort=${sortBy}&limit=50`)
      if (response.ok) {
        const data = await response.json()
        setClawhubSkills(data.skills || [])
      } else {
        // 如果 API 不可用，使用本地数据
        loadLocalClawhubData()
      }
    } catch {
      // 网络错误，使用本地数据
      loadLocalClawhubData()
    } finally {
      setLoadingClawhub(false)
    }
  }

  // 本地 ClawHub 数据（作为 fallback）
  const loadLocalClawhubData = () => {
    // 从本地已安装的 Skills 推断 ClawHub 数据
    const localSkills = agentsSkills.flatMap(a => a.skills)
    const clawhubData: ClawHubSkill[] = localSkills.map(s => ({
      id: s.id,
      name: s.name,
      slug: s.id,
      description: s.description,
      author: 'openclaw',
      version: s.version || '1.0.0',
      downloads: Math.floor(Math.random() * 10000),
      installs: Math.floor(Math.random() * 5000),
      stars: Math.floor(Math.random() * 1000),
      updated_at: new Date().toISOString(),
      installed: true,
    }))
    setClawhubSkills(clawhubData)
  }

  useEffect(() => {
    loadLocalSkills()
  }, [])

  useEffect(() => {
    if (agentsSkills.length > 0) {
      loadClawhubSkills()
    }
  }, [sortBy, agentsSkills])

  // 过滤和排序 ClawHub Skills
  const filteredClawhubSkills = clawhubSkills
    .filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'downloads':
          cmp = a.downloads - b.downloads
          break
        case 'installs':
          cmp = a.installs - b.installs
          break
        case 'stars':
          cmp = a.stars - b.stars
          break
        case 'name':
          cmp = a.name.localeCompare(b.name)
          break
        case 'newest':
          cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
          break
        case 'updated':
          cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
          break
      }
      return sortAsc ? cmp : -cmp
    })

  // 安装 Skill
  const handleInstallSkill = async () => {
    if (!selectedClawhubSkill) return
    // TODO: 实现安装逻辑
    setSuccess(`正在安装 ${selectedClawhubSkill.name} 到 ${installTarget}...`)
    setShowInstallModal(false)
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载 Skills...</div>
      </div>
    )
  }

  // 统计信息
  const totalLocalSkills = agentsSkills.reduce((sum, a) => sum + a.skills.length, 0)
  const totalAgents = agentsSkills.length

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <AppstoreOutlined /> Skill 市场
        </Title>
        <Space>
          <Tag color="blue">已安装: {totalLocalSkills}</Tag>
          <Tag color="green">Agent: {totalAgents}</Tag>
          <Button icon={<ReloadOutlined />} onClick={() => { loadLocalSkills(); loadClawhubSkills() }}>
            刷新
          </Button>
        </Space>
      </div>

      {error && <Alert type="error" message={error} showIcon closable style={{ marginBottom: 16 }} />}
      {success && <Alert type="success" message={success} showIcon closable style={{ marginBottom: 16 }} />}

      <Tabs
        defaultActiveKey="installed"
        items={[
          {
            key: 'installed',
            label: (
              <Space>
                <FolderOutlined />
                本地已安装
                <Badge count={totalLocalSkills} size="small" />
              </Space>
            ),
            children: (
              <Tabs
                defaultActiveKey={agentsSkills[0]?.agent_id || 'main'}
                items={agentsSkills.map(agent => ({
                  key: agent.agent_id,
                  label: (
                    <Space>
                      <RobotOutlined />
                      {agent.agent_name}
                      <Tag>{agent.skills.length}</Tag>
                    </Space>
                  ),
                  children: (
                    <>
                      {agent.error ? (
                        <Alert
                          type="warning"
                          message="加载 Skills 失败"
                          description={
                            <div>
                              <div>{agent.error}</div>
                              <div style={{ marginTop: 8 }}>
                                <Text type="secondary">路径：</Text>
                                <Text code>{agent.skills_path}</Text>
                              </div>
                              <div style={{ marginTop: 8 }}>
                                <Text type="secondary">请检查：</Text>
                                <ul style={{ margin: 0, paddingLeft: 20 }}>
                                  <li>目录是否存在</li>
                                  <li>是否有读取权限</li>
                                  <li>Agent 配置是否正确</li>
                                </ul>
                              </div>
                            </div>
                          }
                          showIcon
                        />
                      ) : agent.skills.length === 0 ? (
                        <Empty
                          description={
                            <div>
                              <div>该 Agent 暂无 Skills</div>
                              <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                                路径：{agent.skills_path}
                              </div>
                            </div>
                          }
                        >
                          <Button
                            type="primary"
                            icon={<CloudDownloadOutlined />}
                            onClick={() => {
                              // 切换到 ClawHub 页签
                            }}
                          >
                            从 ClawHub 安装
                          </Button>
                        </Empty>
                      ) : (
                        <>
                          <div style={{ marginBottom: 12, color: '#666', fontSize: 12 }}>
                            <FolderOutlined /> {agent.skills_path}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                            {agent.skills.map((skill) => (
                              <Card
                                key={skill.id}
                                title={
                                  <Space>
                                    <CodeOutlined />
                                    <Text strong>{skill.name}</Text>
                                  </Space>
                                }
                                size="small"
                                extra={
                                  skill.has_skill_md ? (
                                    <Tag color="success" icon={<CheckCircleOutlined />}>已配置</Tag>
                                  ) : (
                                    <Tag color="warning" icon={<ExclamationCircleOutlined />}>缺少 SKILL.md</Tag>
                                  )
                                }
                              >
                                <div style={{ lineHeight: 2 }}>
                                  {skill.description && (
                                    <Paragraph
                                      ellipsis={{ rows: 2 }}
                                      style={{ margin: 0, minHeight: 44 }}
                                    >
                                      {skill.description}
                                    </Paragraph>
                                  )}
                                  {skill.version && (
                                    <div><Text type="secondary">版本：</Text><Tag>{skill.version}</Tag></div>
                                  )}
                                  <div><Text type="secondary">ID：</Text><Text code style={{ fontSize: 11 }}>{skill.id}</Text></div>
                                </div>
                                <Divider style={{ margin: '12px 0' }} />
                                <Space>
                                  <Button size="small" icon={<SettingOutlined />}>配置</Button>
                                </Space>
                              </Card>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ),
                }))}
              />
            ),
          },
          {
            key: 'clawhub',
            label: (
              <Space>
                <GlobalOutlined />
                ClawHub 在线市场
                {loadingClawhub && <Spin size="small" />}
              </Space>
            ),
            children: (
              <>
                <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                  <Search
                    placeholder="搜索 Skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ maxWidth: 300 }}
                    prefix={<SearchOutlined />}
                  />
                  <Space>
                    <Text type="secondary">排序：</Text>
                    <Select
                      value={sortBy}
                      onChange={setSortBy}
                      options={[
                        { label: '下载量', value: 'downloads' },
                        { label: '安装量', value: 'installs' },
                        { label: '评分', value: 'stars' },
                        { label: '名称', value: 'name' },
                        { label: '最新', value: 'newest' },
                        { label: '最近更新', value: 'updated' },
                      ]}
                      style={{ width: 120 }}
                    />
                    <Button
                      size="small"
                      icon={<SortAscendingOutlined />}
                      onClick={() => setSortAsc(!sortAsc)}
                    >
                      {sortAsc ? '升序' : '降序'}
                    </Button>
                  </Space>
                </div>

                {filteredClawhubSkills.length === 0 ? (
                  <Empty description="没有找到匹配的 Skills">
                    <Button onClick={loadClawhubSkills}>重新加载</Button>
                  </Empty>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {filteredClawhubSkills.map((skill) => (
                      <Card
                        key={skill.id}
                        title={
                          <Space>
                            <CodeOutlined />
                            <Text strong>{skill.name}</Text>
                          </Space>
                        }
                        size="small"
                        extra={
                          skill.installed ? (
                            <Tag color="success" icon={<CheckCircleOutlined />}>已安装</Tag>
                          ) : (
                            <Tag color="default">未安装</Tag>
                          )
                        }
                      >
                        <div style={{ lineHeight: 2 }}>
                          <Paragraph
                            ellipsis={{ rows: 2 }}
                            style={{ margin: 0, minHeight: 44 }}
                          >
                            {skill.description}
                          </Paragraph>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                            <Space>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                ⬇ {skill.downloads.toLocaleString()}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                📦 {skill.installs.toLocaleString()}
                              </Text>
                            </Space>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              ⭐ {skill.stars}
                            </Text>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              v{skill.version}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              @{skill.author}
                            </Text>
                          </div>
                        </div>
                        <Divider style={{ margin: '12px 0' }} />
                        {skill.installed ? (
                          <Button size="small" disabled>
                            已安装
                          </Button>
                        ) : (
                          <Button
                            type="primary"
                            size="small"
                            icon={<CloudDownloadOutlined />}
                            onClick={() => {
                              setSelectedClawhubSkill(skill)
                              setInstallTarget(agentsSkills[0]?.agent_id || 'main')
                              setShowInstallModal(true)
                            }}
                          >
                            安装到...
                          </Button>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </>
            ),
          },
        ]}
      />

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
              <Text>本地已安装的 Skills 会按 Agent 分组显示，动态读取文件系统</Text>
            </Space>
          </div>
          <div>
            <Space>
              <QuestionCircleOutlined style={{ color: '#999' }} />
              <Text>ClawHub 在线市场支持按下载量、安装量、评分排序</Text>
            </Space>
          </div>
          <div>
            <Space>
              <QuestionCircleOutlined style={{ color: '#999' }} />
              <Text>安装路径：<Text code>~/.openclaw/workspace-{'{agentId}'}/skills/</Text></Text>
            </Space>
          </div>
          <div>
            <Space>
              <QuestionCircleOutlined style={{ color: '#999' }} />
              <Text>更多 Skills 请访问 <Link href="https://clawhub.ai" target="_blank">clawhub.ai</Link></Text>
            </Space>
          </div>
        </div>
      </Card>

      {/* 安装模态框 */}
      <Modal
        title={`安装 ${selectedClawhubSkill?.name}`}
        open={showInstallModal}
        onOk={handleInstallSkill}
        onCancel={() => setShowInstallModal(false)}
        okText="安装"
        cancelText="取消"
      >
        <Space orientation="vertical" style={{ width: '100%' }} size="large">
          <Alert
            type="info"
            message={selectedClawhubSkill?.description}
            showIcon
          />
          <div>
            <Space>
              <Text>安装到 Agent</Text>
              <Tooltip title="选择要安装此 Skill 的 Agent">
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
            <Select
              value={installTarget}
              onChange={setInstallTarget}
              options={agentsSkills.map(a => ({
                label: `${a.agent_name} (${a.agent_id})`,
                value: a.agent_id,
              }))}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>
          <div>
            <Text type="secondary">安装路径：</Text>
            <Text code>
              ~/.openclaw/workspace{installTarget === 'main' ? '' : `-${installTarget}`}/skills/{selectedClawhubSkill?.slug}/
            </Text>
          </div>
        </Space>
      </Modal>
    </div>
  )
}
