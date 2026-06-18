/**
 * 获取学生成绩分析 Hook
 *
 * 说明：
 * - 封装 TanStack Query，提供成绩分析数据
 * - 用于图表展示，数据变化频率低
 *
 * @module score-management/student/hooks
 */

import { useQuery, type QueryClient } from '@tanstack/react-query'
import { studentScoreAPI } from '../api/student-score-api'

/**
 * 查询键工厂
 *
 * @remarks
 * 成绩分析的查询键管理
 */
export const scoreAnalyticsQueryKeys = {
  all: ['student-score-analytics'] as const,
  /**
   * 当前登录学生的成绩分析
   */
  current: () => [...scoreAnalyticsQueryKeys.all, 'current'] as const,
} as const

/**
 * 获取学生个人成绩分析 Hook
 *
 * @param options - TanStack Query 配置选项
 * @returns Query 结果
 *
 * @example
 * ```tsx
 * function ScoreAnalyticsCharts() {
 *   const { data, isLoading, error } = useStudentScoreAnalytics()
 *
 *   if (isLoading) return <Skeleton />
 *   if (error) return <Error message={error.message} />
 *
 *   return (
 *     <>
 *       <SemesterTrendChart data={data?.semesterTrend} />
 *       <ScoreDistributionChart data={data?.scoreDistribution} />
 *       <CourseTypeBreakdownChart data={data?.courseTypeBreakdown} />
 *     </>
 *   )
 * }
 * ```
 */
export function useStudentScoreAnalytics(options?: {
  enabled?: boolean
  refetchOnWindowFocus?: boolean
}) {
  return useQuery({
    queryKey: scoreAnalyticsQueryKeys.current(),
    queryFn: () => studentScoreAPI.getMyScoreAnalytics(),

    // 成绩分析数据变化频率低，设置较长的缓存时间
    staleTime: 15 * 60 * 1000, // 15 分钟内数据视为新鲜
    gcTime: 30 * 60 * 1000, // 30 分钟后清理缓存
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    enabled: options?.enabled ?? true,
  })
}

/**
 * 刷新成绩分析的辅助函数
 *
 * @remarks
 * 用于手动触发数据刷新，如新增成绩后
 *
 * @example
 * ```tsx
 * const queryClient = useQueryClient()
 *
 * function handleNewScore() {
 *   // 新增成绩后刷新分析
 *   refetchStudentScoreAnalytics(queryClient)
 * }
 * ```
 */
export function refetchStudentScoreAnalytics(queryClient: QueryClient) {
  queryClient.invalidateQueries({
    queryKey: scoreAnalyticsQueryKeys.current(),
  })
}
