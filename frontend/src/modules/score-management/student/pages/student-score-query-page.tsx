/**
 * 学生成绩查询主页面
 *
 * 说明：
 * - 整合所有学生端成绩组件
 * - 提供完整的学生成绩查询功能
 *
 * @module score-management/student/pages
 */

import { useState, useMemo } from 'react'
import { Space } from 'antd'
import type { ScoreItem, ScoreListQuery } from '../types/score-types'
import { useStudentScores, useStudentScoreSummary, useStudentScoreAnalytics } from '../hooks'
import { CreditProgressCard, GPASummaryCard } from '../components/gpa-summary'
import { ScoreListFilters, ScoreListTable } from '../components/score-list'
import { ScoreDetailDrawer } from '../components/score-detail'

/**
 * 学生成绩查询页面
 */
export default function StudentScoreQueryPage() {
  // 筛选条件状态
  const [filters, setFilters] = useState<Partial<ScoreListQuery>>({
    page: 1,
    pageSize: 20,
  })

  // 成绩详情抽屉状态
  const [detailVisible, setDetailVisible] = useState(false)
  const [selectedScore, setSelectedScore] = useState<ScoreItem | null>(null)

  // 获取成绩列表
  const {
    data: scoreListData,
    isLoading: scoreListLoading,
    error: scoreListError,
  } = useStudentScores(filters as ScoreListQuery)

  // 获取 GPA 摘要
  const {
    data: summaryData,
    isLoading: summaryLoading,
    error: summaryError,
  } = useStudentScoreSummary()

  // 获取成绩分析
  const { data: analyticsData } = useStudentScoreAnalytics()

  // 从分析数据中提取学期选项（包含所有学期，不受筛选影响）
  const semesterOptions = useMemo(() => {
    if (!analyticsData?.semesterTrend) return []
    return analyticsData.semesterTrend.map((item) => ({
      value: item.semesterId,
      label: item.semesterName,
    }))
  }, [analyticsData])

  // 处理筛选条件变化
  const handleFiltersChange = (newFilters: Partial<ScoreListQuery>) => {
    setFilters({ ...filters, ...newFilters, page: 1 })
  }

  // 处理分页变化
  const handlePageChange = (page: number, pageSize: number) => {
    setFilters({ ...filters, page, pageSize })
  }

  // 处理查看详情 - F3 后端无单独详情接口，直接使用列表数据
  const handleShowDetail = (score: ScoreItem) => {
    setSelectedScore(score)
    setDetailVisible(true)
  }

  // 处理关闭详情
  const handleCloseDetail = () => {
    setDetailVisible(false)
    setSelectedScore(null)
  }

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 错误提示 */}
        {scoreListError && (
          <div style={{ padding: 16, background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 4 }}>
            加载成绩数据失败：{scoreListError.message}
          </div>
        )}

        {summaryError && (
          <div style={{ padding: 16, background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 4 }}>
            加载成绩摘要失败：{summaryError.message}
          </div>
        )}

        {/* GPA 摘要 */}
        {summaryData && (
          <>
            <GPASummaryCard summary={summaryData} loading={summaryLoading} />
            <CreditProgressCard summary={summaryData} loading={summaryLoading} />
          </>
        )}

        {/* 成绩列表 */}
        <div>
          <ScoreListFilters
            value={filters}
            onChange={handleFiltersChange}
            loading={scoreListLoading}
            semesterOptions={semesterOptions}
          />
          <div style={{ marginTop: 16 }}>
            <ScoreListTable
              dataSource={scoreListData?.items || []}
              loading={scoreListLoading}
              current={filters.page}
              pageSize={filters.pageSize}
              total={scoreListData?.pagination.total || 0}
              onPageChange={handlePageChange}
              onRowClick={handleShowDetail}
            />
          </div>
        </div>
      </Space>

      {/* 成绩详情抽屉 */}
      <ScoreDetailDrawer
        score={selectedScore}
        open={detailVisible}
        onClose={handleCloseDetail}
      />
    </div>
  )
}
