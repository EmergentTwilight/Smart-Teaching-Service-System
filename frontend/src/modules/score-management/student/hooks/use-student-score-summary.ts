/**
 * 获取学生 GPA 与学分摘要 Hook
 *
 * 说明：
 * - 封装 TanStack Query，提供 GPA 摘要数据
 * - 数据变化频率低，设置较长的缓存时间
 *
 * @module score-management/student/hooks
 */

import { useQuery, type QueryClient } from '@tanstack/react-query'
import { studentScoreAPI } from '../api/student-score-api'

/**
 * 查询键工厂
 *
 * @remarks
 * GPA 摘要的查询键管理
 */
export const scoreSummaryQueryKeys = {
  all: ['student-score-summary'] as const,
  /**
   * 当前登录学生的 GPA 摘要
   */
  current: () => [...scoreSummaryQueryKeys.all, 'current'] as const,
} as const

/**
 * 获取学生 GPA 与学分摘要 Hook
 *
 * @param options - TanStack Query 配置选项
 * @returns Query 结果
 *
 * @example
 * ```tsx
 * function GPASummaryCard() {
 *   const { data, isLoading, error } = useStudentScoreSummary()
 *
 *   if (isLoading) return <Skeleton />
 *   if (error) return <Error message={error.message} />
 *
 *   return (
 *     <Card>
 *       <Statistic title="GPA" value={data?.gpa} />
 *       <Statistic title="平均分" value={data?.averageScore} />
 *       <Progress
 *         percent={(data?.earnedCredits / data?.totalRequiredCredits) * 100}
 *         status="active"
 *       />
 *     </Card>
 *   )
 * }
 * ```
 */
export function useStudentScoreSummary(options?: {
  enabled?: boolean
  refetchOnWindowFocus?: boolean
}) {
  return useQuery({
    queryKey: scoreSummaryQueryKeys.current(),
    queryFn: () => studentScoreAPI.getMyScoreSummary(),

    // GPA 摘要变化频率低，设置较长的缓存时间
    staleTime: 10 * 60 * 1000, // 10 分钟内数据视为新鲜
    gcTime: 30 * 60 * 1000, // 30 分钟后清理缓存
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    enabled: options?.enabled ?? true,
  })
}

/**
 * 刷新 GPA 摘要的辅助函数
 *
 * @remarks
 * 用于手动触发数据刷新，如成绩更新后
 *
 * @example
 * ```tsx
 * const queryClient = useQueryClient()
 *
 * function handleScoreUpdate() {
 *   // 更新成绩后刷新 GPA
 *   refetchStudentScoreSummary(queryClient)
 * }
 * ```
 */
export function refetchStudentScoreSummary(queryClient: QueryClient) {
  queryClient.invalidateQueries({
    queryKey: scoreSummaryQueryKeys.current(),
  })
}
