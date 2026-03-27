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
} from '@ant-design/icons'
import { readConfig } from '../../services/tauri'

const { Title, Text, Paragraph, Link } = Typography
const { Search } = Input

// Skill 信息
interface SkillInfo {
  id: string
  name: string
  nameZh: string
  description: string
  status: 'active' | 'disabled' | 'needs_setup' | 'unknown'
  version?: string
  path?: string
  dependencies?: string[]
  agentId: string // 属于哪个 agent
}

// ClawHub Skill
interface ClawHubSkill {
  id: string
  name: string
  nameZh: string
  description: string
  category: string
  downloads: number
  rating: number
  author: string
  installed: boolean
}

// Agent 信息
interface AgentInfo {
  id: string
  name: string
  skillsPath: string
}

// 模拟 ClawHub Skills 数据
const CLAWHUB_SKILLS: ClawHubSkill[] = [
  {
    id: 'weather',
    name: 'Weather',
    nameZh: '天气查询',
    description: '获取当前天气和天气预报，支持 wttr.in 和 Open-Meteo',
    category: '工具',
    downloads: 15420,
    rating: 4.8,
    author: 'openclaw',
    installed: true,
  },
  {
    id: 'coding-agent',
    name: 'Coding Agent',
    nameZh: '编程助手',
    description: '将编程任务委托给 Codex、Claude Code 或 Pi 代理',
    category: '开发',
    downloads: 12350,
    rating: 4.7,
    author: 'openclaw',
    installed: true,
  },
  {
    id: 'data-analysis',
    name: 'Data Analysis',
    nameZh: '数据分析',
    description: '数据分析和可视化，支持 SQL、Python、电子表格',
    category: '数据',
    downloads: 8920,
    rating: 4.6,
    author: 'openclaw',
    installed: true,
  },
  {
    id: 'rag-engineer',
    name: 'RAG Engineer',
    nameZh: 'RAG 工程师',
    description: '构建检索增强生成系统，优化嵌入和向量搜索',
    category: 'AI',
    downloads: 7650,
    rating: 4.5,
    author: 'openclaw',
    installed: true,
  },
  {
    id: 'web-scraper',
    name: 'Smart Web Scraper',
    nameZh: '智能网页抓取',
    description: '从网页提取结构化数据，支持 CSS 选择器和自动检测',
    category: '工具',
    downloads: 6890,
    rating: 4.4,
    author: 'openclaw',
    installed: true,
  },
  {
    id: 'translate',
    name: 'Translate',
    nameZh: '翻译工具',
    description: '准确翻译文本，保留格式，处理复数，适应本地化',
    category: '工具',
    downloads: 5430,
    rating: 4.3,
    author: 'openclaw',
    installed: true,
  },
  {
    id: 'image-cog',
    name: 'Image Cog',
    nameZh: 'AI 图像生成',
    description: 'AI 图像生成，支持一致角色、产品摄影、风格转换',
    category: '创意',
    downloads: 4210,
    rating: 4.2,
    author: 'openclaw',
    installed: true,
  },
  {
    id: 'news-summary',
    name: 'News Summary',
    nameZh: '新闻摘要',
    description: '获取新闻更新、每日简报，支持 RSS 源和语音摘要',
    category: '信息',
    downloads: 3890,
    rating: 4.1,
    author: 'openclaw',
    installed: true,
  },
  {
    id: 'fastapi-builder',
    name: 'FastAPI Builder',
    nameZh: 'FastAPI 接口构建',
    description: '基于 FastAPI 技术栈编写后端接口',
    category: '开发',
    downloads: 3450,
    rating: 4.0,
    author: 'openclaw',
    installed: true,
  },
  {
    id: 'senior-architect',
    name: 'Senior Architect',
    nameZh: '高级架构师',
    description: '系统架构设计，评估微服务 vs 单体，创建架构图',
    category: '架构',
    downloads: 2980,
    rating: 4.5,
    author: 'openclaw',
    installed: true,
  },
  {
    id: 'senior-data-engineer',
    name: 'Senior Data Engineer',
    nameZh: '高级数据工程师',
    description: '构建可扩展数据管道、ETL 系统和数据基础设施',
    category: '数据',
    downloads: 2650,
    rating: 4.3,
    author: 'openclaw',
    installed: true,
  },
  {
    id: 'prompt-engineering',
    name: 'Prompt Engineering Expert',
    nameZh: '提示词工程专家',
    description: '高级提示词工程，自定义指令设计和优化',
    category: 'AI',
    downloads: 2340,
    rating: 4.4,
    author: 'openclaw',
    installed: true,
  },
  {
    id: 'self-improving',
    name: 'Self-Improving Agent',
    nameZh: '自我改进代理',
    description: '分析对话质量，识别改进机会，持续优化响应策略',
    category: 'AI',
    downloads: 1980,
    rating: 4.2,
    author: 'openclaw',
    installed: false,
  },
  {
    id: 'automation-workflows',
    name: 'Automation Workflows',
    nameZh: '自动化工作流',
    description: '设计和实现自动化工作流，节省时间，扩展运营',
    category: '自动化',
    downloads: 1760,
    rating: 4.1,
    author: 'openclaw',
    installed: true,
  },
  {
    id: 'n8n-workflow',
    name: 'n8n Workflow',
    nameZh: 'n8n 工作流',
    description: '设计和输出 n8n 工作流 JSON，包含触发器、错误处理',
    category: '自动化',
    downloads: 1540,
    rating: 4.0,
    author: 'openclaw',
    installed: true,
  },
  {
    id: 'writing-assistant',
    name: 'Writing Assistant',
    nameZh: '写作助手',
    description: '写作团队管理，内容策略和创作指导',
    category: '创意',
    downloads: 1320,
    rating: 4.3,
    author: 'openclaw',
    installed: true,
  },
  {
    id: 'zhipu-search',
    name: 'Zhipu Search',
    nameZh: '智谱搜索',
    description: '使用智谱 Web Search API 进行网络搜索',
    category: '工具',
    downloads: 1100,
    rating: 4.0,
    author: 'openclaw',
    installed: true,
  },
  {
    id: 'multi-search',
    name: 'Multi Search Engine CN',
    nameZh: '国内搜索引擎',
    description: '35 个国内可用的搜索站点，无需 API 密钥',
    category: '工具',
    downloads: 980,
    rating: 4.2,
    author: 'openclaw',
    installed: true,
  },
  {
    id: 'skill-creator',
    name: 'Skill Creator',
    nameZh: '技能创建器',
    description: '创建、编辑、改进或审计 AgentSkills',
    category: '开发',
    downloads: 870,
    rating: 4.1,
    author: 'openclaw',
    installed: false,
  },
  {
    id: 'skill-vetter',
    name: 'Skill Vetter',
    nameZh: '技能审查器',
    description: '安全优先的技能审查，检查危险模式和权限',
    category: '安全',
    downloads: 760,
    rating: 4.4,
    author: 'openclaw',
    installed: true,
  },
]

export default function SkillsPage() {
  const [loading, setLoading] = useState(true)
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // ClawHub 状态
  const [clawhubSkills] = useState<ClawHubSkill[]>(CLAWHUB_SKILLS)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [selectedClawhubSkill, setSelectedClawhubSkill] = useState<ClawHubSkill | null>(null)
  const [installTarget, setInstallTarget] = useState('main')

  const loadSkills = async () => {
    setLoading(true)
    setError(null)
    try {
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>

      // 解析 agents
      const agentsConfig = (parsed.agents as Record<string, unknown>) || {}
      const agentsList = (agentsConfig.list as Array<Record<string, unknown>>) || []

      const agentInfos: AgentInfo[] = agentsList.map(a => ({
        id: a.id as string,
        name: (a.name as string) || (a.id as string),
        skillsPath: `~/.openclaw/workspace-${a.id}/skills/`,
      }))

      setAgents(agentInfos)

      // 模拟 Skills 数据
      const mockSkills: SkillInfo[] = CLAWHUB_SKILLS
        .filter(s => s.installed)
        .map(s => ({
          id: s.id,
          name: s.name,
          nameZh: s.nameZh,
          description: s.description,
          status: 'active',
          version: '1.0.0',
          path: `skills/${s.id}/`,
          agentId: 'main', // 默认在主 agent
        }))

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

  // 过滤 ClawHub Skills
  const filteredClawhubSkills = clawhubSkills.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.nameZh.includes(searchQuery) ||
    s.description.includes(searchQuery)
  )

  // 按 agent 分组 Skills
  const skillsByAgent = agents.map(agent => ({
    ...agent,
    skills: skills.filter(s => s.agentId === agent.id),
  }))

  // 安装 Skill
  const handleInstallSkill = async () => {
    if (!selectedClawhubSkill) return
    // TODO: 实现安装逻辑
    setSuccess(`正在安装 ${selectedClawhubSkill.nameZh} 到 ${installTarget}...`)
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

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <AppstoreOutlined /> Skill 市场
        </Title>
        <Space>
          <Tag color="blue">已安装: {skills.length}</Tag>
          <Tag color="green">可用: {clawhubSkills.length}</Tag>
          <Button icon={<ReloadOutlined />} onClick={loadSkills}>刷新</Button>
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
                <Badge count={skills.length} size="small" />
              </Space>
            ),
            children: (
              <Tabs
                defaultActiveKey="main"
                items={skillsByAgent.map(agent => ({
                  key: agent.id,
                  label: (
                    <Space>
                      <RobotOutlined />
                      {agent.name}
                      <Tag>{agent.skills.length}</Tag>
                    </Space>
                  ),
                  children: agent.skills.length === 0 ? (
                    <Empty description="该 Agent 暂无 Skills">
                      <Button type="primary" onClick={() => {}}>
                        从 ClawHub 安装
                      </Button>
                    </Empty>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                      {agent.skills.map((skill) => (
                        <Card
                          key={skill.id}
                          title={
                            <Space>
                              <CodeOutlined />
                              <Text strong>{skill.nameZh}</Text>
                            </Space>
                          }
                          size="small"
                          extra={getStatusTag(skill.status)}
                        >
                          <div style={{ lineHeight: 2 }}>
                            <div><Text type="secondary">英文名：</Text><Text>{skill.name}</Text></div>
                            <Paragraph
                              ellipsis={{ rows: 2 }}
                              style={{ margin: 0, minHeight: 44 }}
                            >
                              {skill.description}
                            </Paragraph>
                            {skill.version && (
                              <div><Text type="secondary">版本：</Text><Tag>{skill.version}</Tag></div>
                            )}
                            {skill.path && (
                              <div><Text type="secondary">路径：</Text><Text code style={{ fontSize: 11 }}>{skill.path}</Text></div>
                            )}
                          </div>
                          <Divider style={{ margin: '12px 0' }} />
                          <Space>
                            <Tooltip title={skill.status === 'active' ? '禁用' : '启用'}>
                              <Switch size="small" checked={skill.status === 'active'} />
                            </Tooltip>
                            <Button size="small" icon={<SettingOutlined />}>配置</Button>
                          </Space>
                        </Card>
                      ))}
                    </div>
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
              </Space>
            ),
            children: (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Search
                    placeholder="搜索 Skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ maxWidth: 400 }}
                    prefix={<SearchOutlined />}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {filteredClawhubSkills.map((skill) => (
                    <Card
                      key={skill.id}
                      title={
                        <Space>
                          <CodeOutlined />
                          <Text strong>{skill.nameZh}</Text>
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
                        <div><Text type="secondary">英文名：</Text><Text>{skill.name}</Text></div>
                        <Paragraph
                          ellipsis={{ rows: 2 }}
                          style={{ margin: 0, minHeight: 44 }}
                        >
                          {skill.description}
                        </Paragraph>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                          <Space>
                            <Tag color="blue">{skill.category}</Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              ⬇ {skill.downloads.toLocaleString()}
                            </Text>
                          </Space>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            ⭐ {skill.rating}
                          </Text>
                        </div>
                        <div>
                          <Text type="secondary">作者：</Text>
                          <Text>{skill.author}</Text>
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
                            setShowInstallModal(true)
                          }}
                        >
                          安装到...
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
              <Text>本地已安装的 Skills 可以按 Agent 分组查看</Text>
            </Space>
          </div>
          <div>
            <Space>
              <QuestionCircleOutlined style={{ color: '#999' }} />
              <Text>ClawHub 在线市场提供丰富的 Skills，可以安装到指定 Agent</Text>
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
              <Text>更多 Skills 请访问 <Link href="https://clawhub.com" target="_blank">clawhub.com</Link></Text>
            </Space>
          </div>
        </div>
      </Card>

      {/* 安装模态框 */}
      <Modal
        title={`安装 ${selectedClawhubSkill?.nameZh}`}
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
              options={agents.map(a => ({ label: `${a.name} (${a.id})`, value: a.id }))}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>
          <div>
            <Text type="secondary">安装路径：</Text>
            <Text code>~/.openclaw/workspace-{installTarget}/skills/{selectedClawhubSkill?.id}/</Text>
          </div>
        </Space>
      </Modal>
    </div>
  )
}
