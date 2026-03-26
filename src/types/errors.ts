export type ErrorCode =
  | 'node_not_found'
  | 'node_version_too_low'
  | 'openclaw_not_installed'
  | 'gateway_not_running'
  | 'gateway_connection_failed'
  | 'gateway_timeout'
  | 'config_not_found'
  | 'config_parse_error'
  | 'config_validation_failed'
  | 'config_conflict'
  | 'permission_denied'
  | 'command_failed'
  | 'file_system_error'
  | 'unknown'

export interface AppError {
  code: ErrorCode
  message: string
  detail?: string
  recoverable: boolean
  suggestion?: string
}
