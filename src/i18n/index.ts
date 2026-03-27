// 语言配置文件
export const translations = {
  zh: {
    // 通用
    'common.save': '保存',
    'common.cancel': '取消',
    'common.confirm': '确认',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.refresh': '刷新',
    'common.loading': '加载中...',
    'common.success': '成功',
    'common.error': '错误',
    'common.warning': '警告',

    // 导航
    'nav.dashboard': '仪表盘',
    'nav.setup': '环境检测',
    'nav.chat': '聊天',
    'nav.models': '模型配置',
    'nav.channels': '渠道配置',
    'nav.agents': 'Agent 管理',
    'nav.skills': 'Skill 市场',
    'nav.health': '健康监控',
    'nav.backup': '备份恢复',
    'nav.config': '配置编辑',
    'nav.settings': '设置',

    // Settings
    'settings.title': '设置',
    'settings.gateway': 'Gateway 设置',
    'settings.security': '安全设置',
    'settings.interface': '界面设置',
    'settings.other': '其他设置',
    'settings.about': '关于',
    'settings.theme': '主题',
    'settings.language': '语言',
    'settings.theme.light': '浅色',
    'settings.theme.dark': '深色',
    'settings.theme.system': '跟随系统',
    'settings.saveSuccess': '设置保存成功',

    // Health
    'health.title': '健康监控',
    'health.diagnosis': '诊断结果',
    'health.logs': 'Gateway 日志',
    'health.autoRefresh': '自动刷新',
    'health.normal': '正常',
    'health.warning': '警告',
    'health.error': '异常',

    // Backup
    'backup.title': '备份恢复',
    'backup.create': '创建备份',
    'backup.restore': '恢复备份',
    'backup.password': '备份密码',
    'backup.progress': '备份进度',

    // Models
    'models.title': '模型配置',
    'models.providers': 'Provider 列表',
    'models.aliases': '模型别名',
    'models.auth': '认证配置',
    'models.global': '全局配置',

    // Channels
    'channels.title': '渠道配置',
    'channels.im': '即时通讯',
    'channels.enterprise': '企业协作',
    'channels.social': '社交平台',
    'channels.protocol': '协议/其他',
    'channels.device': '设备',

    // Agents
    'agents.title': 'Agent 管理',
    'agents.create': '创建 Agent',
    'agents.basic': '基本信息',
    'agents.platform': '选择平台',
    'agents.credentials': '配置凭证',
    'agents.confirm': '确认创建',

    // Skills
    'skills.title': 'Skill 市场',
    'skills.installed': '本地已安装',
    'skills.clawhub': 'ClawHub 热门',
    'skills.delete': '删除',
    'skills.install': '安装',
  },

  en: {
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.refresh': 'Refresh',
    'common.loading': 'Loading...',
    'common.success': 'Success',
    'common.error': 'Error',
    'common.warning': 'Warning',

    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.setup': 'Setup',
    'nav.chat': 'Chat',
    'nav.models': 'Models',
    'nav.channels': 'Channels',
    'nav.agents': 'Agents',
    'nav.skills': 'Skills',
    'nav.health': 'Health',
    'nav.backup': 'Backup',
    'nav.config': 'Config',
    'nav.settings': 'Settings',

    // Settings
    'settings.title': 'Settings',
    'settings.gateway': 'Gateway Settings',
    'settings.security': 'Security Settings',
    'settings.interface': 'Interface Settings',
    'settings.other': 'Other Settings',
    'settings.about': 'About',
    'settings.theme': 'Theme',
    'settings.language': 'Language',
    'settings.theme.light': 'Light',
    'settings.theme.dark': 'Dark',
    'settings.theme.system': 'System',
    'settings.saveSuccess': 'Settings saved successfully',

    // Health
    'health.title': 'Health Monitor',
    'health.diagnosis': 'Diagnostics',
    'health.logs': 'Gateway Logs',
    'health.autoRefresh': 'Auto Refresh',
    'health.normal': 'Normal',
    'health.warning': 'Warning',
    'health.error': 'Error',

    // Backup
    'backup.title': 'Backup & Restore',
    'backup.create': 'Create Backup',
    'backup.restore': 'Restore Backup',
    'backup.password': 'Backup Password',
    'backup.progress': 'Backup Progress',

    // Models
    'models.title': 'Model Configuration',
    'models.providers': 'Provider List',
    'models.aliases': 'Model Aliases',
    'models.auth': 'Authentication',
    'models.global': 'Global Config',

    // Channels
    'channels.title': 'Channel Configuration',
    'channels.im': 'Instant Messaging',
    'channels.enterprise': 'Enterprise',
    'channels.social': 'Social',
    'channels.protocol': 'Protocol/Other',
    'channels.device': 'Device',

    // Agents
    'agents.title': 'Agent Management',
    'agents.create': 'Create Agent',
    'agents.basic': 'Basic Info',
    'agents.platform': 'Select Platform',
    'agents.credentials': 'Configure Credentials',
    'agents.confirm': 'Confirm Creation',

    // Skills
    'skills.title': 'Skill Marketplace',
    'skills.installed': 'Installed',
    'skills.clawhub': 'ClawHub Popular',
    'skills.delete': 'Delete',
    'skills.install': 'Install',
  },
}

export type Language = 'zh' | 'en'
export type TranslationKey = keyof typeof translations.zh

// 获取翻译
export function t(key: TranslationKey, lang: Language = 'zh'): string {
  return translations[lang][key] || translations.zh[key] || key
}

// 获取当前语言
export function getCurrentLanguage(): Language {
  const saved = localStorage.getItem('ocm-language')
  return (saved === 'en' ? 'en' : 'zh') as Language
}

// 设置语言
export function setLanguage(lang: Language): void {
  localStorage.setItem('ocm-language', lang)
}
