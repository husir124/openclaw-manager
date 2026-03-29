/**
 * Channels 页面类型定义
 */
import type { ReactNode } from 'react'

export interface ChannelField {
  key: string
  label: string
  placeholder: string
  required: boolean
  tooltip: string
  type: 'text' | 'password' | 'select' | 'switch'
  options?: { label: string; value: string }[]
  defaultValue?: string | boolean
}

export interface ChannelType {
  id: string
  name: string
  nameEn: string
  icon: ReactNode
  available: boolean
  category: 'im' | 'enterprise' | 'social' | 'protocol' | 'device'
  description: string
  fields: ChannelField[]
  configExample?: string
}

export interface ConfiguredChannel {
  id: string
  type: string
  name: string
  enabled: boolean
}

export interface ChannelCategory {
  key: string
  label: string
  icon: ReactNode
}
