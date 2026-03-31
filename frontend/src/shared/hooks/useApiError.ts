/**
 * API 错误处理 Hook
 * 统一处理 API 请求错误
 */
import { message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/shared/stores/authStore'
import { extractErrorMessage, getErrorStatus } from '@/shared/utils/error'

export function useApiError() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  const handleError = (error: unknown, fallbackMessage: string = '操作失败') => {
    const status = getErrorStatus(error)

    // 401 未授权
    if (status === 401) {
      logout()
      navigate('/login')
      return
    }

    // 403 无权限
    if (status === 403) {
      message.error('权限不足')
      return
    }

    // 其他错误
    const errorMessage = extractErrorMessage(error, fallbackMessage)
    message.error(errorMessage)
  }

  return { handleError }
}
