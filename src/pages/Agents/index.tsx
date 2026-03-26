import { useState, useEffect } from 'react'
import { Typography, Card, Spin, Button, Space, Tag, Empty, Modal, Input, Select, Alert, Divider } from 'antd'
import { RobotOutlined, PlusOutlined, ReloadOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { readConfig, setConfigValue, type ConfigData } from '../../services/tauri'

const { Title, Text, Paragraph } = Typography

interface AgentInfo {
  id: string
  name: string
  model: string
  workspace: string
  bindings: string[]
}

export default function AgentsPage() {
  const [loading, setLoading] = useState(true)
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [bindings, setBindings] = useState<Record<string, string[]>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [newId, setNewId] = useState('')
  const [newName, setNewName] = useState('')
  const [newModel, setNewModel] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loadAgents = async () => {
    setLoading(true)
    setError(null)
    try {
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>

      // Parse agents list
      const agentsList = ((parsed.agents as Record<string, unknown>)?.list as Array<Record<string, unknown>>) || []
      const bindingList = (parsed.bindings as Array<Record<string, unknown>>) || []

      // Build binding map: agentId -> list of match descriptions
      const bindingMap: Record<string, string[]> = {}
      for (const b of bindingList) {
        const agentId = b.agentId as string
        const match = b.match as Record<string, unknown> | undefined
        if (agentId && match) {
          const desc = match.accountId
            ? `${match.channel} (${match.accountId})`
            : `${match.channel}`
          if (!bindingMap[agentId]) bindingMap[agentId] = []
          bindingMap[agentId].push(desc)
        }
      }

      const agentInfos: AgentInfo[] = agentsList.map((a) => ({
        id: a.id as string || 'unknown',
        name: (a.name as string) || (a.id as string) || 'Unknown',
        model: (a.model as Record<string, unknown>)?.primary as string || 'default',
        workspace: (a.workspace as string) || 'default',
        bindings: bindingMap[a.id as string] || [],
      }))

      setAgents(agentInfos)
      setBindings(bindingMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAgents() }, [])

  const handleCreate = async () => {
    if (!newId || !newName) return
    try {
      const config = await readConfig()
      const parsed = config.parsed as Record<string, unknown>
      const agentsConfig = (parsed.agents as Record<string, unknown>) || {}
      const list = (agentsConfig.list as Array<Record<string, unknown>>) || []

      // Check for duplicate
      if (list.some((a) => a.id === newId)) {
        setError(`Agent "${newId}" already exists`)
        return
      }

      // Add new agent
      list.push({
        id: newId,
        name: newName,
        workspace: `~/.openclaw/workspace-${newId}`,
        model: {
          primary: newModel || 'openrouter/xiaomi/mimo-v2-pro',
          fallbacks: [],
        },
        tools: { profile: 'full' },
      })

      agentsConfig.list = list
      parsed.agents = agentsConfig

      // Write back
      const { writeConfig } = await import('../../services/tauri')
      await writeConfig(JSON.stringify(parsed, null, 2))

      setShowCreate(false)
      setNewId('')
      setNewName('')
      setNewModel('')
      await loadAgents()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent')
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Loading agents...</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}><RobotOutlined /> Agents</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadAgents}>Reload</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreate(true)}>
            New Agent
          </Button>
        </Space>
      </div>

      {error && <Alert type="error" message={error} showIcon closable style={{ marginBottom: 16 }} />}

      {agents.length === 0 ? (
        <Empty description="No agents configured">
          <Button type="primary" onClick={() => setShowCreate(true)}>Create your first agent</Button>
        </Empty>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {agents.map((agent) => (
            <Card
              key={agent.id}
              title={
                <Space>
                  <RobotOutlined />
                  <Text strong>{agent.name}</Text>
                  {agent.id === 'main' && <Tag color="gold">Main</Tag>}
                </Space>
              }
              size="small"
            >
              <div style={{ lineHeight: 2 }}>
                <div><Text type="secondary">ID:</Text> <Text code>{agent.id}</Text></div>
                <div><Text type="secondary">Model:</Text> <Tag>{agent.model.split('/').pop()}</Tag></div>
                <div><Text type="secondary">Workspace:</Text> <Text style={{ fontSize: 12 }}>{agent.workspace}</Text></div>
                {agent.bindings.length > 0 && (
                  <div>
                    <Text type="secondary">Bindings:</Text>
                    <div style={{ marginTop: 4 }}>
                      {agent.bindings.map((b, i) => (
                        <Tag key={i} color="blue" style={{ marginBottom: 4 }}>{b}</Tag>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        title="Create New Agent"
        open={showCreate}
        onOk={handleCreate}
        onCancel={() => setShowCreate(false)}
        okText="Create"
        okButtonProps={{ disabled: !newId || !newName }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text type="secondary">Agent ID (lowercase, no spaces)</Text>
            <Input
              value={newId}
              onChange={(e) => setNewId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="my-agent"
            />
          </div>
          <div>
            <Text type="secondary">Display Name</Text>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="My Agent"
            />
          </div>
          <div>
            <Text type="secondary">Model (optional)</Text>
            <Input
              value={newModel}
              onChange={(e) => setNewModel(e.target.value)}
              placeholder="openrouter/xiaomi/mimo-v2-pro"
            />
          </div>
          <Alert
            type="info"
            message="After creation, restart Gateway to load the new agent."
            showIcon
          />
        </Space>
      </Modal>
    </div>
  )
}
