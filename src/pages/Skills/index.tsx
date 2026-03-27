import { useState, useEffect } from 'react'
import { Typography, Card, Spin, Button, Space, Tag, Alert, Empty, Tooltip, Divider, Tabs, Modal, Select, Input, Badge, Popconfirm } from 'antd'
import {
  AppstoreOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  QuestionCircleOutlined,
  CloudDownloadOutlined,
  FolderOutlined,
  RobotOutlined,
  SearchOutlined,
  GlobalOutlined,
  SortAscendingOutlined,
  DeleteOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { listAllAgentsSkills, deleteSkill, type AgentSkillsInfo, type SkillInfo } from '../../services/tauri'

const { Title, Text, Paragraph, Link } = Typography
const { Search } = Input

// ClawHub Skill（静态数据，避免卡顿）
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
}

// 排序方式
type SortBy = 'downloads' | 'installs' | 'stars' | 'name'

// 静态 ClawHub 热门 Skills 数据
const CLAWHUB_POPULAR_SKILLS: ClawHubSkill[] = [
  { id: '1', name: 'Summarize', slug: 'summarize', description: 'Summarize URLs or files with the summarize CLI (web, PDFs, images, audio, YouTube).', author: 'steipete', version: '1.0.0', downloads: 45230, installs: 32100, stars: 892 },
  { id: '2', name: 'Skill Vetter', slug: 'skill-vetter', description: 'Security-first skill vetting for AI agents. Use before installing any skill from ClawdHub, GitHub, or other sources.', author: 'spclaudehome', version: '1.0.0', downloads: 38920, installs: 28500, stars: 756 },
  { id: '3', name: 'Weather', slug: 'weather', description: 'Get current weather and forecasts (no API key required).', author: 'steipete', version: '1.0.0', downloads: 35670, installs: 25800, stars: 682 },
  { id: '4', name: 'Github', slug: 'github', description: 'Interact with GitHub using the `gh` CLI. Use `gh issue`, `gh pr`, `gh run`, and `gh api` for issues, PRs, CI runs, and advanced queries.', author: 'steipete', version: '1.0.0', downloads: 32450, installs: 23100, stars: 645 },
  { id: '5', name: 'Gog', slug: 'gog', description: 'Google Workspace CLI for Gmail, Calendar, Drive, Contacts, Sheets, and Docs.', author: 'steipete', version: '1.0.0', downloads: 28930, installs: 20500, stars: 598 },
  { id: '6', name: 'Proactive Agent', slug: 'proactive-agent', description: 'Transform AI agents from task-followers into proactive partners that anticipate needs and continuously improve.', author: 'halthelobster', version: '3.1.0', downloads: 25670, installs: 18200, stars: 534 },
  { id: '7', name: 'Multi Search Engine', slug: 'multi-search-engine', description: 'Multi search engine integration with 17 engines (8 CN + 9 Global). Supports advanced search operators, time filters, site search.', author: 'gpyangyoujun', version: '2.0.1', downloads: 22340, installs: 16800, stars: 489 },
  { id: '8', name: 'Notion', slug: 'notion', description: 'Notion API for creating and managing pages, databases, and blocks.', author: 'steipete', version: '1.0.0', downloads: 19870, installs: 14500, stars: 445 },
  { id: '9', name: 'Obsidian', slug: 'obsidian', description: 'Work with Obsidian vaults (plain Markdown notes) and automate via obsidian-cli.', author: 'steipete', version: '1.0.0', downloads: 17560, installs: 12800, stars: 412 },
  { id: '10', name: 'Baidu Search', slug: 'baidu-search', description: 'Search the web using Baidu AI Search Engine (BDSE). Use for live information, documentation, or research topics.', author: 'ide-rea', version: '1.1.3', downloads: 15230, installs: 11200, stars: 378 },
  { id: '11', name: 'Tavily Search', slug: 'tavily-search', description: 'Web search via Tavily API (alternative to Brave). Use when the user asks to search the web.', author: 'jacky1n7', version: '0.1.0', downloads: 13450, installs: 9800, stars: 345 },
  { id: '12', name: 'Openai Whisper', slug: 'openai-whisper', description: 'Local speech-to-text with the Whisper CLI (no API key).', author: 'steipete', version: '1.0.0', downloads: 11890, installs: 8500, stars: 312 },
  { id: '13', name: 'Nano Pdf', slug: 'nano-pdf', description: 'Edit PDFs with natural-language instructions using the nano-pdf CLI.', author: 'steipete', version: '1.0.0', downloads: 10340, installs: 7200, stars: 289 },
  { id: '14', name: 'Humanizer', slug: 'humanizer', description: 'Remove signs of AI-generated writing from text. Use when editing or reviewing text to make it sound more natural.', author: 'biostartechnology', version: '1.0.0', downloads: 9120, installs: 6500, stars: 267 },
  { id: '15', name: 'API Gateway', slug: 'api-gateway', description: 'Connect to 100+ APIs (Google Workspace, Microsoft 365, GitHub, Notion, Slack, Airtable, HubSpot, etc.) with managed OAuth.', author: 'byungkyu', version: '1.0.71', downloads: 8450, installs: 5900, stars: 245 },
  { id: '16', name: 'Automation Workflows', slug: 'automation-workflows', description: 'Design and implement automation workflows to save time and scale operations as a solopreneur.', author: 'jk-0001', version: '0.1.0', downloads: 7890, installs: 5400, stars: 223 },
  { id: '17', name: 'Skill Creator', slug: 'skill-creator', description: 'Guide for creating effective skills. This skill should be used when users want to create a new skill.', author: 'chindden', version: '0.1.0', downloads: 7230, installs: 4900, stars: 198 },
  { id: '18', name: 'Polymarket', slug: 'polymarket', description: 'Query Polymarket prediction markets - check odds, trending markets, search events, track prices and momentum.', author: 'joelchance', version: '1.0.3', downloads: 6780, installs: 4500, stars: 178 },
  { id: '19', name: 'Agent Browser', slug: 'agent-browser', description: 'Headless browser automation CLI optimized for AI agents with accessibility tree snapshots and ref-based element selection.', author: 'matrixy', version: '0.1.0', downloads: 6120, installs: 4100, stars: 156 },
  { id: '20', name: 'Sonoscli', slug: 'sonoscli', description: 'Control Sonos speakers (discover/status/play/volume/group).', author: 'steipete', version: '1.0.0', downloads: 5560, installs: 3800, stars: 134 },
]

export default function SkillsPage() {
  const [loading, setLoading] = useState(true)
  const [agentsSkills, setAgentsSkills] = useState<AgentSkillsInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // ClawHub 状态（使用静态数据，避免卡顿）
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('downloads')
  const [sortAsc, setSortAsc] = useState(false)
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [selectedClawhubSkill, setSelectedClawhubSkill] = useState<ClawHubSkill | null>(null)
  const [installTarget, setInstallTarget] = useState('main')

  // 删除状态
  const [deleting, setDeleting] = useState<string | null>(null)

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

  useEffect(() => {
    loadLocalSkills()
  }, [])

  // 过滤和排序 ClawHub Skills
  const filteredClawhubSkills = CLAWHUB_POPULAR_SKILLS
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
      }
      return sortAsc ? cmp : -cmp
    })

  // 检查 Skill 是否已安装
  const isSkillInstalled = (skillSlug: string): boolean => {
    return agentsSkills.some(a => a.skills.some(s => s.id === skillSlug))
  }

  // 删除 Skill
  const handleDeleteSkill = async (agentId: string, skillId: string, skillName: string) => {
    setDeleting(skillId)
    try {
      await deleteSkill(agentId, skillId)
      setSuccess(`已删除 Skill: ${skillName}`)
      await loadLocalSkills()
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    } finally {
      setDeleting(null)
    }
  }

  // 安装 Skill（预留）
  const handleInstallSkill = async () => {
    if (!selectedClawhubSkill) return
    // TODO: 实现安装逻辑
    setSuccess(`安装功能预留 - ${selectedClawhubSkill.name}`)
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
          <Button icon={<ReloadOutlined />} onClick={loadLocalSkills}>
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
                                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                    <Text strong>{skill.name}</Text>
                                  </Space>
                                }
                                size="small"
                                extra={
                                  skill.has_skill_md ? (
                                    <Tag color="success">已配置</Tag>
                                  ) : (
                                    <Tag color="warning">缺少 SKILL.md</Tag>
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
                                  <Popconfirm
                                    title="确认删除此 Skill？"
                                    description="删除后将从文件系统中移除，不可恢复"
                                    onConfirm={() => handleDeleteSkill(agent.agent_id, skill.id, skill.name)}
                                    okText="删除"
                                    cancelText="取消"
                                    okButtonProps={{ danger: true, loading: deleting === skill.id }}
                                  >
                                    <Button
                                      size="small"
                                      danger
                                      icon={<DeleteOutlined />}
                                      loading={deleting === skill.id}
                                    >
                                      删除
                                    </Button>
                                  </Popconfirm>
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
                ClawHub 热门 Skills
              </Space>
            ),
            children: (
              <>
                <Alert
                  type="info"
                  message="ClawHub 热门 Skills"
                  description="以下是从 ClawHub 获取的热门 Skills 列表。安装功能即将上线，敬请期待。"
                  showIcon
                  style={{ marginBottom: 16 }}
                />

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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {filteredClawhubSkills.map((skill) => (
                    <Card
                      key={skill.id}
                      title={
                        <Space>
                          <CheckCircleOutlined style={{ color: isSkillInstalled(skill.slug) ? '#52c41a' : '#d9d9d9' }} />
                          <Text strong>{skill.name}</Text>
                        </Space>
                      }
                      size="small"
                      extra={
                        isSkillInstalled(skill.slug) ? (
                          <Tag color="success">已安装</Tag>
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
                      {isSkillInstalled(skill.slug) ? (
                        <Button size="small" disabled>
                          已安装
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          icon={<CloudDownloadOutlined />}
                          disabled
                          title="安装功能即将上线"
                        >
                          安装（即将上线）
                        </Button>
                      )}
                    </Card>
                  ))}
                </div>
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
              <Text>本地已安装的 Skills 会动态读取文件系统</Text>
            </Space>
          </div>
          <div>
            <Space>
              <QuestionCircleOutlined style={{ color: '#999' }} />
              <Text>删除 Skill 会从文件系统中移除对应目录</Text>
            </Space>
          </div>
          <div>
            <Space>
              <QuestionCircleOutlined style={{ color: '#999' }} />
              <Text>安装路径：<Text code>~/.openclaw/workspace{''}/skills/</Text> 或 <Text code>~/.openclaw/workspace-{'{agentId}'}/skills/</Text></Text>
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

      {/* 安装模态框（预留） */}
      <Modal
        title={`安装 ${selectedClawhubSkill?.name}`}
        open={showInstallModal}
        onOk={handleInstallSkill}
        onCancel={() => setShowInstallModal(false)}
        okText="安装"
        cancelText="取消"
        okButtonProps={{ disabled: true }}
      >
        <Alert
          type="info"
          message="安装功能即将上线"
          description="敬请期待 ClawHub Skills 一键安装功能"
          showIcon
        />
      </Modal>
    </div>
  )
}
