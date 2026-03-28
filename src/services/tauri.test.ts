import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @tauri-apps/api/core
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

import { invoke } from '@tauri-apps/api/core'
import {
  checkNodeVersion,
  checkOpenClawInstalled,
  checkGatewayStatus,
  readConfig,
  writeConfig,
  readGatewayToken,
  getConfigSection,
  setConfigValue,
  listConfigSections,
  listConfigBackups,
  startGateway,
  stopGateway,
  runDiagnosis,
  fixIssue,
  getLogs,
  createBackup,
  listBackups,
  restoreBackup,
  getBackupProgress,
  listLocalSkills,
  listAllAgentsSkills,
  deleteSkill,
  getAppInfo,
  clearCache,
  getDiskUsage,
  openReleasesPage,
} from './tauri'

const mockInvoke = vi.mocked(invoke)

describe('tauri service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // === System ===
  describe('checkNodeVersion', () => {
    it('should call invoke with correct command', async () => {
      mockInvoke.mockResolvedValue({ installed: true, version: 'v24.14.0', meets_minimum: true })
      const result = await checkNodeVersion()
      expect(mockInvoke).toHaveBeenCalledWith('check_node_version')
      expect(result.installed).toBe(true)
      expect(result.version).toBe('v24.14.0')
      expect(result.meets_minimum).toBe(true)
    })

    it('should handle not installed', async () => {
      mockInvoke.mockResolvedValue({ installed: false, version: null, meets_minimum: false })
      const result = await checkNodeVersion()
      expect(result.installed).toBe(false)
    })
  })

  describe('checkOpenClawInstalled', () => {
    it('should call invoke with correct command', async () => {
      mockInvoke.mockResolvedValue({ installed: true, version: '2026.3.24', path: '/usr/bin/openclaw' })
      const result = await checkOpenClawInstalled()
      expect(mockInvoke).toHaveBeenCalledWith('check_openclaw_installed')
      expect(result.installed).toBe(true)
    })
  })

  describe('checkGatewayStatus', () => {
    it('should return gateway status', async () => {
      mockInvoke.mockResolvedValue({ running: true, port: 18789, pid: 12345 })
      const result = await checkGatewayStatus()
      expect(mockInvoke).toHaveBeenCalledWith('check_gateway_status')
      expect(result.running).toBe(true)
      expect(result.port).toBe(18789)
    })
  })

  describe('readGatewayToken', () => {
    it('should return token', async () => {
      mockInvoke.mockResolvedValue('abc123')
      const result = await readGatewayToken()
      expect(mockInvoke).toHaveBeenCalledWith('read_gateway_token')
      expect(result).toBe('abc123')
    })

    it('should return null if no token', async () => {
      mockInvoke.mockResolvedValue(null)
      const result = await readGatewayToken()
      expect(result).toBeNull()
    })
  })

  // === Config ===
  describe('readConfig', () => {
    it('should return config data', async () => {
      const configData = { raw: '{}', parsed: {}, path: '/path/openclaw.json' }
      mockInvoke.mockResolvedValue(configData)
      const result = await readConfig()
      expect(mockInvoke).toHaveBeenCalledWith('read_config')
      expect(result.raw).toBe('{}')
      expect(result.path).toBe('/path/openclaw.json')
    })
  })

  describe('writeConfig', () => {
    it('should write config content', async () => {
      mockInvoke.mockResolvedValue('ok')
      const result = await writeConfig('{"test": true}')
      expect(mockInvoke).toHaveBeenCalledWith('write_config', { content: '{"test": true}' })
      expect(result).toBe('ok')
    })
  })

  describe('getConfigSection', () => {
    it('should get section by path', async () => {
      mockInvoke.mockResolvedValue({ name: 'models', path: 'models', value: {} })
      const result = await getConfigSection('models')
      expect(mockInvoke).toHaveBeenCalledWith('get_config_section', { path: 'models' })
      expect(result.name).toBe('models')
    })
  })

  describe('setConfigValue', () => {
    it('should set value at path', async () => {
      mockInvoke.mockResolvedValue('ok')
      await setConfigValue('gateway.port', 19000)
      expect(mockInvoke).toHaveBeenCalledWith('set_config_value', { path: 'gateway.port', value: 19000 })
    })
  })

  describe('listConfigSections', () => {
    it('should return sections list', async () => {
      mockInvoke.mockResolvedValue([{ name: 'models', path: 'models', value: {} }])
      const result = await listConfigSections()
      expect(result).toHaveLength(1)
    })
  })

  describe('listConfigBackups', () => {
    it('should return backup list', async () => {
      mockInvoke.mockResolvedValue(['backup1.json', 'backup2.json'])
      const result = await listConfigBackups()
      expect(result).toHaveLength(2)
    })
  })

  // === Process ===
  describe('startGateway', () => {
    it('should start gateway', async () => {
      mockInvoke.mockResolvedValue('Gateway started')
      const result = await startGateway()
      expect(mockInvoke).toHaveBeenCalledWith('start_gateway')
      expect(result).toBe('Gateway started')
    })
  })

  describe('stopGateway', () => {
    it('should stop gateway', async () => {
      mockInvoke.mockResolvedValue('Gateway stopped')
      const result = await stopGateway()
      expect(mockInvoke).toHaveBeenCalledWith('stop_gateway')
    })
  })

  // === Health ===
  describe('runDiagnosis', () => {
    it('should return diagnostic results', async () => {
      mockInvoke.mockResolvedValue([
        { id: 'node', name: 'Node.js', status: 'ok', message: 'v24.14.0' },
      ])
      const result = await runDiagnosis()
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('ok')
    })
  })

  describe('fixIssue', () => {
    it('should fix issue by id', async () => {
      mockInvoke.mockResolvedValue('Fixed')
      await fixIssue('node')
      expect(mockInvoke).toHaveBeenCalledWith('fix_issue', { issueId: 'node' })
    })
  })

  describe('getLogs', () => {
    it('should get logs with line count', async () => {
      mockInvoke.mockResolvedValue('log line 1\nlog line 2')
      const result = await getLogs(50)
      expect(mockInvoke).toHaveBeenCalledWith('get_logs', { lines: 50 })
      expect(result).toContain('log line 1')
    })
  })

  // === Backup ===
  describe('createBackup', () => {
    it('should create encrypted backup', async () => {
      mockInvoke.mockResolvedValue('Backup created')
      await createBackup('mypassword')
      expect(mockInvoke).toHaveBeenCalledWith('create_backup', { password: 'mypassword' })
    })
  })

  describe('listBackups', () => {
    it('should return backup files', async () => {
      mockInvoke.mockResolvedValue([
        { name: 'backup.ocbak', path: '/backups/backup.ocbak', size: 1024, created_at: '2026-03-28', encrypted: true },
      ])
      const result = await listBackups()
      expect(result).toHaveLength(1)
      expect(result[0].encrypted).toBe(true)
    })
  })

  describe('restoreBackup', () => {
    it('should restore from backup', async () => {
      mockInvoke.mockResolvedValue('Restored')
      await restoreBackup('/backups/backup.ocbak', 'mypassword')
      expect(mockInvoke).toHaveBeenCalledWith('restore_backup', { filePath: '/backups/backup.ocbak', password: 'mypassword' })
    })
  })

  describe('getBackupProgress', () => {
    it('should return progress percentage', async () => {
      mockInvoke.mockResolvedValue(75)
      const result = await getBackupProgress()
      expect(result).toBe(75)
    })
  })

  // === Skills ===
  describe('listLocalSkills', () => {
    it('should list skills for agent', async () => {
      mockInvoke.mockResolvedValue({ agent_id: 'main', agent_name: 'Main', skills_path: '/skills', skills: [], error: null })
      const result = await listLocalSkills('main')
      expect(mockInvoke).toHaveBeenCalledWith('list_local_skills', { agentId: 'main' })
      expect(result.agent_id).toBe('main')
    })
  })

  describe('listAllAgentsSkills', () => {
    it('should list skills for all agents', async () => {
      mockInvoke.mockResolvedValue([{ agent_id: 'main', skills: [] }])
      const result = await listAllAgentsSkills()
      expect(result).toHaveLength(1)
    })
  })

  describe('deleteSkill', () => {
    it('should delete skill', async () => {
      mockInvoke.mockResolvedValue('Deleted')
      await deleteSkill('main', 'my-skill')
      expect(mockInvoke).toHaveBeenCalledWith('delete_skill', { agentId: 'main', skillId: 'my-skill' })
    })
  })

  // === App Info ===
  describe('getAppInfo', () => {
    it('should return app info', async () => {
      mockInvoke.mockResolvedValue({ version: '0.1.0', name: 'OpenClaw Manager', config_dir: '/config', logs_dir: '/logs', backups_dir: '/backups' })
      const result = await getAppInfo()
      expect(result.version).toBe('0.1.0')
      expect(result.name).toBe('OpenClaw Manager')
    })
  })

  describe('clearCache', () => {
    it('should clear cache files', async () => {
      mockInvoke.mockResolvedValue('Cleared 5 files')
      const result = await clearCache()
      expect(result).toContain('Cleared')
    })
  })

  describe('getDiskUsage', () => {
    it('should return disk usage', async () => {
      mockInvoke.mockResolvedValue({
        total_bytes: 1048576,
        logs_bytes: 512000,
        backups_bytes: 256000,
        workspace_bytes: 256000,
        formatted_total: '1.00 MB',
        formatted_logs: '500.00 KB',
        formatted_backups: '250.00 KB',
        formatted_workspace: '250.00 KB',
      })
      const result = await getDiskUsage()
      expect(result.formatted_total).toBe('1.00 MB')
    })
  })

  describe('openReleasesPage', () => {
    it('should return releases URL', async () => {
      mockInvoke.mockResolvedValue('https://github.com/husir124/openclaw-manager/releases')
      const result = await openReleasesPage()
      expect(result).toContain('github.com')
    })
  })

  // === Error handling ===
  describe('error handling', () => {
    it('should propagate invoke errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Command failed'))
      await expect(checkNodeVersion()).rejects.toThrow('Command failed')
    })
  })
})
