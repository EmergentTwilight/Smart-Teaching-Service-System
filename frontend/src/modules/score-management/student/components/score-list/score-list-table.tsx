/**
 * 成绩列表表格组件
 *
 * 说明：
 * - 展示学生的成绩列表
 * - 支持分页
 * - 可点击查看详情
 *
 * @module score-management/student/components/score-list
 */

import { Table, Tag, Button } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { ScoreItem } from '../../types/score-types'
import {
  formatScore,
  formatGradeLetter,
  formatGradePoint,
  formatCourseType,
  formatCredits,
  formatScoreStatus,
  getScoreStatusColor,
  getCourseTypeColor,
} from '../../../shared/utils/score-formatter'

/**
 * 组件 Props
 */
interface ScoreListTableProps {
  /** 成绩列表数据 */
  dataSource: ScoreItem[]
  /** 加载状态 */
  loading?: boolean
  /** 当前页码 */
  current?: number
  /** 每页数量 */
  pageSize?: number
  /** 总记录数 */
  total?: number
  /** 页码变化回调 */
  onPageChange: (page: number, pageSize: number) => void
  /** 点击行查看详情回调 */
  onRowClick?: (score: ScoreItem) => void
}

/**
 * 成绩列表表格
 */
export function ScoreListTable({
  dataSource,
  loading,
  current = 1,
  pageSize = 20,
  total = 0,
  onPageChange,
  onRowClick,
}: ScoreListTableProps) {
  // 表格列定义
  const columns: ColumnsType<ScoreItem> = [
    {
      title: '学期',
      dataIndex: 'semesterName',
      key: 'semesterName',
      width: 120,
      fixed: 'left',
    },
    {
      title: '课程代码',
      dataIndex: 'courseCode',
      key: 'courseCode',
      width: 120,
    },
    {
      title: '课程名称',
      dataIndex: 'courseName',
      key: 'courseName',
      width: 200,
    },
    {
      title: '课程类型',
      dataIndex: 'courseType',
      key: 'courseType',
      width: 100,
      render: (courseType) => (
        <Tag color={getCourseTypeColor(courseType)}>
          {formatCourseType(courseType)}
        </Tag>
      ),
    },
    {
      title: '学分',
      dataIndex: 'credits',
      key: 'credits',
      width: 80,
      align: 'center',
      render: (credits) => formatCredits(credits),
    },
    {
      title: '平时成绩',
      dataIndex: 'usualScore',
      key: 'usualScore',
      width: 100,
      align: 'center',
      render: (score) => formatScore(score),
    },
    {
      title: '期中成绩',
      dataIndex: 'midtermScore',
      key: 'midtermScore',
      width: 100,
      align: 'center',
      render: (score) => formatScore(score),
    },
    {
      title: '期末成绩',
      dataIndex: 'finalScore',
      key: 'finalScore',
      width: 100,
      align: 'center',
      render: (score) => formatScore(score),
    },
    {
      title: '总评成绩',
      key: 'totalScore',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <div>
          <div>{formatScore(record.totalScore)}</div>
          <div style={{ fontSize: 12, color: '#888' }}>
            {formatGradeLetter(record.gradeLetter)} / {formatGradePoint(record.gradePoint)}
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status, record) => (
        <>
          <Tag color={getScoreStatusColor(status)}>
            {formatScoreStatus(status)}
          </Tag>
          <Tag color={record.isEffective ? 'success' : 'default'}>
            {record.isEffective ? '计入统计' : '不计入统计'}
          </Tag>
        </>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => onRowClick?.(record)}
        >
          查看详情
        </Button>
      ),
    },
  ]

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      loading={loading}
      rowKey="scoreId"
      scroll={{ x: 1400 }}
      pagination={{
        current,
        pageSize,
        total,
        onChange: onPageChange,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 条`,
        pageSizeOptions: [10, 20, 50, 100],
      }}
      onRow={(record) => ({
        onDoubleClick: () => onRowClick?.(record),
        style: { cursor: onRowClick ? 'pointer' : 'default' },
      })}
    />
  )
}
