/**
 * Agent 平台配置定义
 */

import React from 'react'
import { CloudOutlined, MessageOutlined, WechatOutlined } from '@ant-design/icons'

export interface PlatformField {
  key: string
  label: string
  placeholder: string
  required: boolean
  tooltip: string
  type: 'text' | 'password' | 'select'
  options?: { label: string; value: string }[]
}

export interface PlatformConfig {
  id: string
  name: string
  icon: React.ReactNode
  available: boolean
  fields: PlatformField[]
}

export interface AgentInfo {
  id: string
  name: string
  model: string
  workspace: string
  bindings: string[]
  platform?: string
}

/** 支持的平台配置 */
export const PLATFORMS: PlatformConfig[] = [
  {
    id: 'feishu',
    name: '飞书',
    icon: React.createElement(CloudOutlined),
    available: true,
    fields: [
      {
        key: 'appId',
        label: 'App ID',
        placeholder: 'cli_xxxxxxxxxxxxxxxx',
        required: true,
        tooltip: '飞书开放平台应用的 App ID，可在飞书开放平台控制台获取',
        type: 'text',
      },
      {
        key: 'appSecret',
        label: 'App Secret',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        required: true,
        tooltip: '飞书开放平台应用的 App Secret，用于身份验证，请妥善保管',
        type: 'password',
      },
    ],
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: React.createElement(MessageOutlined),
    available: true,
    fields: [
      {
        key: 'botToken',
        label: 'Bot Token',
        placeholder: '1234567890:xxxxxxxxxxxxxxxxxxxxxxxx',
        required: true,
        tooltip: '通过 Telegram @BotFather 创建机器人后获得的 Token，格式如：1234567890:ABCdef...',
        type: 'password',
      },
      {
        key: 'dmPolicy',
        label: '私聊策略',
        placeholder: '',
        required: false,
        tooltip: 'pairing：需要用户配对授权（推荐）；open：任何人可直接使用',
        type: 'select',
        options: [
          { label: '配对授权（推荐）', value: 'pairing' },
          { label: '开放模式', value: 'open' },
        ],
      },
      {
        key: 'groupPolicy',
        label: '群组策略',
        placeholder: '',
        required: false,
        tooltip: 'open：任何群组都可使用；allowlist：仅白名单群组可使用',
        type: 'select',
        options: [
          { label: '开放模式', value: 'open' },
          { label: '白名单模式', value: 'allowlist' },
        ],
      },
    ],
  },
  {
    id: 'wechat',
    name: '微信',
    icon: React.createElement(WechatOutlined),
    available: false,
    fields: [],
  },
]
