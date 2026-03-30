/**
 * API 错误处理 Hook
 * 统一处理 API 请求错误
 */
import { message } from 'antd'
import type { AxiosError } from 'axios'
import type { ApiErrorResponse } from '@/shared/types'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/shared/stores/authStore'

export function useApiError() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  const handleError = (error: unknown, fallbackMessage: string = '操作失败') => {
    const axiosError = error as AxiosError<ApiErrorResponse>

    // 401 未授权
    if (axiosError?.response?.status === 401) {
      logout()
      navigate('/login')
      return
    }

    // 403 无权限
    if (axiosError?.response?.status === 403) {
      message.error('权限不足')
      return
    }

    // 其他错误
    const errorMessage = axiosError?.response?.data?.message || fallbackMessage
    message.error(errorMessage)
  }

  return { handleError }
}
