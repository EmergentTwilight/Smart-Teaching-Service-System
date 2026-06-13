/**
 * 成绩详情抽屉组件
 *
 * 说明：
 * - 展示单条成绩的详细信息
 * - 基于 ScoreItem 类型，F3 后端没有单独的详情接口
 *
 * @module score-management/student/components/score-detail
 */

import { Drawer, Descriptions, Tag, Divider, Row, Col, Statistic } from 'antd'
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
  formatDateTime,
} from '../../../shared/utils/score-formatter'

/**
 * 组件 Props
 */
interface ScoreDetailDrawerProps {
  /** 成绩数据 */
  score: ScoreItem | null
  /** 抽屉是否可见 */
  open: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 加载状态 */
  loading?: boolean
}

/**
 * 成绩详情抽屉
 *
 * @remarks
 * F3 后端没有单独的详情接口，成绩列表已包含所有需要的信息
 */
export function ScoreDetailDrawer({ score, open, onClose, loading }: ScoreDetailDrawerProps) {
  if (!score) return null

  return (
    <Drawer
      title="成绩详情"
      placement="right"
      width={560}
      open={open}
      onClose={onClose}
      loading={loading}
    >
      {/* 课程基本信息 */}
      <Divider orientation="left">课程信息</Divider>
      <Descriptions column={2} bordered size="small">
        <Descriptions.Item label="课程代码">{score.courseCode}</Descriptions.Item>
        <Descriptions.Item label="课程名称">{score.courseName}</Descriptions.Item>
        <Descriptions.Item label="课程类型">
          <Tag color={getCourseTypeColor(score.courseType)}>
            {formatCourseType(score.courseType)}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="学分">{formatCredits(score.credits)}</Descriptions.Item>
        <Descriptions.Item label="学期" span={2}>{score.semesterName}</Descriptions.Item>
      </Descriptions>

      {/* 成绩构成 */}
      <Divider orientation="left">成绩构成</Divider>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Statistic
            title="平时成绩"
            value={formatScore(score.usualScore)}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="期中成绩"
            value={formatScore(score.midtermScore)}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="期末成绩"
            value={formatScore(score.finalScore)}
          />
        </Col>
      </Row>

      {/* 总评成绩 */}
      <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="总评成绩">
          <span style={{
            color: score.totalScore && score.totalScore >= 60 ? '#3f8600' : '#cf1322',
            fontWeight: 'bold',
            fontSize: 16
          }}>
            {formatScore(score.totalScore)}
          </span>
        </Descriptions.Item>
        <Descriptions.Item label="等级">
          <Tag color={score.totalScore && score.totalScore >= 60 ? 'success' : 'error'}>
            {formatGradeLetter(score.gradeLetter)}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="绩点">
          {formatGradePoint(score.gradePoint)}
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={getScoreStatusColor(score.status)}>
            {formatScoreStatus(score.status)}
          </Tag>
        </Descriptions.Item>
      </Descriptions>

      {/* 录入信息 */}
      {score.enteredAt && (
        <>
          <Divider orientation="left">录入信息</Divider>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="录入时间">
              {formatDateTime(score.enteredAt, 'datetime')}
            </Descriptions.Item>
            {score.modifiedAt && (
              <Descriptions.Item label="最后修改">
                {formatDateTime(score.modifiedAt, 'datetime')}
              </Descriptions.Item>
            )}
          </Descriptions>
        </>
      )}

      {/* 待处理通知 */}
      {score.hasPendingModificationRequest && (
        <div style={{ marginTop: 16 }}>
          <Tag color="warning" style={{ fontSize: 14, padding: '4px 12px' }}>
            此成绩有待处理的改分申请
          </Tag>
        </div>
      )}
    </Drawer>
  )
}
