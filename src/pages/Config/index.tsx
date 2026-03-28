import { useState, useEffect } from 'react'
import { Typography, Card, Spin, Alert, Button, Tag, Space, Input, Divider, List, Modal, Tabs } from 'antd'
import { ReloadOutlined, SaveOutlined, CodeOutlined, AppstoreOutlined, HistoryOutlined } from '@ant-design/icons'
import { readConfig, writeConfig, listConfigSections, listConfigBackups, type ConfigSection } from '../../services/tauri'
import { useTheme } from '../../main'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

export default function ConfigPage() {
  const { isDark } = useTheme()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawContent, setRawContent] = useState('')
  const [configPath, setConfigPath] = useState('')
  const [sections, setSections] = useState<ConfigSection[]>([])
  const [backups, setBackups] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const loadConfig = async () => {
    setLoading(true)
    setError(null)
    try {
      const [config, secs, baks] = await Promise.all([
        readConfig(),
        listConfigSections(),
        listConfigBackups(),
      ])
      setRawContent(config.raw)
      setConfigPath(config.path)
      setSections(secs)
      setBackups(baks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadConfig() }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg(null)
    try {
      const msg = await writeConfig(rawContent)
      setSaveMsg(msg)
      await loadConfig()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Loading config...</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}><CodeOutlined /> Config</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadConfig}>Reload</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
            Save
          </Button>
        </Space>
      </div>

      <Text type="secondary">{configPath}</Text>

      {error && <Alert type="error" message={error} showIcon closable style={{ marginTop: 12 }} />}
      {saveMsg && <Alert type="success" message={saveMsg} showIcon closable style={{ marginTop: 12 }} />}

      <Tabs
        style={{ marginTop: 16 }}
        items={[
          {
            key: 'sections',
            label: <span><AppstoreOutlined /> Sections</span>,
            children: (
              <div>
                <Paragraph type="secondary">
                  Config sections overview. Click a section to see its value.
                </Paragraph>
                <List
                  grid={{ gutter: 12, xs: 1, sm: 2, md: 3 }}
                  dataSource={sections}
                  renderItem={(section) => (
                    <List.Item>
                      <Card
                        size="small"
                        title={
                          <Space>
                            <Tag color="blue">{section.name}</Tag>
                          </Space>
                        }
                        hoverable
                      >
                        <pre style={{
                          fontSize: 11,
                          background: isDark ? '#1f1f1f' : '#f5f5f5',
                          color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.88)',
                          padding: 8,
                          borderRadius: 4,
                          maxHeight: 120,
                          overflow: 'auto',
                          margin: 0,
                        }}>
                          {JSON.stringify(section.value, null, 2).slice(0, 300)}
                          {JSON.stringify(section.value, null, 2).length > 300 ? '\n...' : ''}
                        </pre>
                      </Card>
                    </List.Item>
                  )}
                />
              </div>
            ),
          },
          {
            key: 'raw',
            label: <span><CodeOutlined /> Raw JSON</span>,
            children: (
              <div>
                <Paragraph type="secondary">
                  Edit the raw JSON5 config. Be careful - invalid syntax will prevent Gateway from starting.
                </Paragraph>
                <TextArea
                  value={rawContent}
                  onChange={(e) => setRawContent(e.target.value)}
                  rows={30}
                  style={{ fontFamily: 'monospace', fontSize: 13 }}
                  spellCheck={false}
                />
              </div>
            ),
          },
          {
            key: 'backups',
            label: <span><HistoryOutlined /> Backups ({backups.length})</span>,
            children: (
              <div>
                <Paragraph type="secondary">
                  Automatic backups created before each config change.
                </Paragraph>
                {backups.length === 0 ? (
                  <Text type="secondary">No backups yet</Text>
                ) : (
                  <List
                    size="small"
                    bordered
                    dataSource={backups}
                    renderItem={(name) => (
                      <List.Item>
                        <Text code>{name}</Text>
                      </List.Item>
                    )}
                  />
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
