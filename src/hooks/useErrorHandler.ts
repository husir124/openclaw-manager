import { notification } from 'antd'
import type { AppError } from '../types/errors'

export function useErrorHandler() {
  return (error: AppError) => {
    if (error.recoverable) {
      notification.warning({
        message: error.message,
        description: error.suggestion,
        duration: 5,
      })
    } else {
      notification.error({
        message: error.message,
        description: error.detail || error.suggestion,
        duration: 0,
      })
    }
  }
}
