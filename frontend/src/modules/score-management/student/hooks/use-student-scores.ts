/**
 * 获取学生成绩列表 Hook
 *
 * 说明：
 * - 封装 TanStack Query，提供成绩列表数据
 * - 自动处理缓存、重试、加载状态
 *
 * @module score-management/student/hooks
 */

import { useQuery, type QueryClient } from '@tanstack/react-query'
import type { ScoreListQuery } from '../types/score-types'
import { studentScoreAPI } from '../api/student-score-api'

/**
 * 查询键工厂
 *
 * @remarks
 * 统一管理查询键，便于缓存管理和失效操作
 */
export const scoreQueryKeys = {
  /**
   * 成绩列表查询键
   */
  all: ['student-scores'] as const,
  lists: () => [...scoreQueryKeys.all, 'list'] as const,
  list: (query: ScoreListQuery) => [...scoreQueryKeys.lists(), query] as const,

  /**
   * 成绩详情查询键
   */
  details: () => [...scoreQueryKeys.all, 'detail'] as const,
  detail: (scoreId: string) => [...scoreQueryKeys.details(), scoreId] as const,
} as const

/**
 * 获取学生成绩列表 Hook
 *
 * @param query - 查询参数
 * @param options - TanStack Query 配置选项
 * @returns Query 结果
 *
 * @example
 * ```tsx
 * function ScoreListPage() {
 *   const { data, isLoading, error } = useStudentScores({
 *     page: 1,
 *     pageSize: 20,
 *     semesterId: 'semester-1'
 *   })
 *
 *   if (isLoading) return <Spin />
 *   if (error) return <Error message={error.message} />
 *
 *   return (
 *     <Table>
 *       {data?.items.map(score => (
 *         <ScoreRow key={score.id} score={score} />
 *       ))}
 *     </Table>
 *   )
 * }
 * ```
 */
export function useStudentScores(
  query: ScoreListQuery,
  options?: {
    enabled?: boolean
    refetchOnWindowFocus?: boolean
    staleTime?: number
  }
) {
  return useQuery({
    queryKey: scoreQueryKeys.list(query),
    queryFn: () => studentScoreAPI.getMyScores(query),

    // 默认配置
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 分钟内数据视为新鲜
    gcTime: 10 * 60 * 1000, // 10 分钟后清理缓存
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false, // 窗口聚焦时不自动重新获取
    enabled: options?.enabled ?? true,
  })
}

/**
 * 刷新成绩列表的辅助函数
 *
 * @remarks
 * 用于手动触发数据刷新，如提交表单后
 *
 * @example
 * ```tsx
 * const queryClient = useQueryClient()
 *
 * function handleRefresh() {
 *   refetchStudentScores(queryClient, { page: 1, pageSize: 20 })
 * }
 * ```
 */
export function refetchStudentScores(queryClient: QueryClient, query: ScoreListQuery) {
  queryClient.invalidateQueries({
    queryKey: scoreQueryKeys.list(query),
  })
}
