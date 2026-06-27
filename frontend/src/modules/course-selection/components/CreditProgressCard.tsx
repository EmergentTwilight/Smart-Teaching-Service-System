import { Alert, Card, List, Progress, Space, Tag, Typography } from 'antd';
import { type FC } from 'react';
import type { CurriculumProgress } from '../types/curriculum';
import {
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface CreditProgressCardProps {
  progress: CurriculumProgress | null;
  loading?: boolean;
  error?: string | null;
}

const COURSE_TYPE_LABELS: Record<string, string> = {
  required: '必修',
  elective: '选修',
  general: '公共课',
};

const COURSE_TYPE_COLORS: Record<string, string> = {
  required: '#1890ff',
  elective: '#52c41a',
  general: '#faad14',
};

const COMPLETED_COLOR = '#52c41a';
const IN_PROGRESS_COLOR = '#1677ff';
const REMAINING_COLOR = '#f0f0f0';

const WARNING_ICON_MAP: Record<string, React.ReactNode> = {
  info: <InfoCircleOutlined style={{ color: '#1890ff' }} />,
  warning: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
};

function warningSeverity(code: string): 'info' | 'warning' {
  if (code.includes('NOT_MODELED') || code.includes('UNKNOWN')) {
    return 'info';
  }
  return 'warning';
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function StackedCreditBar({
  completedCredits,
  inProgressCredits,
  requirementCredits,
}: {
  completedCredits: number;
  inProgressCredits: number;
  requirementCredits: number;
}) {
  const denominator = requirementCredits > 0 ? requirementCredits : completedCredits + inProgressCredits;
  const completedPct = denominator > 0 ? clampPercent((completedCredits / denominator) * 100) : 0;
  const inProgressPct = denominator > 0 ? clampPercent((inProgressCredits / denominator) * 100) : 0;
  const remainingPct = clampPercent(100 - completedPct - inProgressPct);

  return (
    <div
      aria-label={`已修读 ${completedCredits} 学分，正在修读 ${inProgressCredits} 学分`}
      style={{
        display: 'flex',
        width: '100%',
        height: 8,
        borderRadius: 999,
        overflow: 'hidden',
        background: REMAINING_COLOR,
      }}
    >
      {completedPct > 0 ? (
        <div style={{ width: `${completedPct}%`, background: COMPLETED_COLOR }} />
      ) : null}
      {inProgressPct > 0 ? (
        <div style={{ width: `${inProgressPct}%`, background: IN_PROGRESS_COLOR }} />
      ) : null}
      {remainingPct > 0 ? (
        <div style={{ width: `${remainingPct}%`, background: REMAINING_COLOR }} />
      ) : null}
    </div>
  );
}

/**
 * CreditProgressCard - 学分进展卡片
 *
 * 展示学生培养方案学分进展，包括：
 * - 必修/选修/公共课各类型已选学分与要求学分对比（FR-C-05）
 * - 总进度百分比可视化（NFR-C-06）
 * - 后端 warnings 透明展示（NFR-C-07）
 * - loading / error / empty 状态处理
 *
 * 所有数据来源于后端 /curriculum/me/progress，前端不做本地推算。
 */
export const CreditProgressCard: FC<CreditProgressCardProps> = ({ progress, loading, error }) => {
  // --- loading state ---
  if (loading) {
    return (
      <Card title="学分进展">
        <Text type="secondary">加载中...</Text>
      </Card>
    );
  }

  // --- error state ---
  if (error) {
    return (
      <Card title="学分进展">
        <Alert
          type="error"
          message="学分进展加载失败"
          description={error}
          showIcon
        />
      </Card>
    );
  }

  // --- empty / no-data state ---
  if (!progress) {
    return (
      <Card title="学分进展">
        <Alert
          type="warning"
          message="暂无学分进展数据"
          description="请确认已匹配培养方案且存在有效选课记录。若问题持续，请联系教务管理员。"
          showIcon
        />
      </Card>
    );
  }

  const { requirements, selected, remaining, byCourseType, warnings } = progress;
  const completed = progress.completed ?? selected;
  const inProgress = progress.inProgress ?? {
    totalCredits: 0,
    requiredCredits: 0,
    electiveCredits: 0,
    generalCredits: 0,
  };

  const totalRequired = requirements.totalCredits || 0;
  const totalSelected = selected.totalCredits || 0;
  const totalCompleted = completed.totalCredits || 0;
  const totalInProgress = inProgress.totalCredits || 0;
  const totalRatio = totalRequired > 0 ? Math.round((totalSelected / totalRequired) * 100) : 0;

  return (
    <Card title="学分进展">
      {/* ---- 总进度 ---- */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <Progress
          type="dashboard"
          percent={totalRatio}
          format={() => (
            <span>
              <span style={{ fontSize: 20, fontWeight: 600 }}>{totalSelected}</span>
              <span style={{ fontSize: 12, color: '#8c8c8c' }}>/{totalRequired}</span>
            </span>
          )}
          size={140}
        />
        <div style={{ marginTop: 4 }}>
          <Text type="secondary">
            已修读 {totalCompleted} + 正在修读 {totalInProgress} / 要求 {totalRequired} 学分
          </Text>
        </div>
        <div style={{ marginTop: 12 }}>
          <StackedCreditBar
            completedCredits={totalCompleted}
            inProgressCredits={totalInProgress}
            requirementCredits={totalRequired}
          />
          <Space size={8} wrap style={{ marginTop: 8 }}>
            <Tag color={COMPLETED_COLOR}>已修读 {totalCompleted}</Tag>
            <Tag color={IN_PROGRESS_COLOR}>正在修读 {totalInProgress}</Tag>
            <Tag color="default">剩余 {Math.max(0, totalRequired - totalSelected)}</Tag>
          </Space>
        </div>
      </div>

      {/* ---- 各课程类型进度 ---- */}
      <List
        size="small"
        dataSource={byCourseType}
        locale={{ emptyText: '暂无分类型进度数据' }}
        renderItem={(item) => {
          const req = item.requirementCredits ?? 0;
          const sel = item.selectedCredits || 0;
          const completedCredits = item.completedCredits ?? sel;
          const inProgressCredits = item.inProgressCredits ?? 0;
          const color = COURSE_TYPE_COLORS[item.courseType] ?? '#8c8c8c';
          const label = COURSE_TYPE_LABELS[item.courseType] ?? item.courseType;

          return (
            <List.Item>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Space>
                    <Tag color={color}>{label}</Tag>
                    <Text>{item.courseCount} 门课</Text>
                  </Space>
                  <Text>
                    <Text strong>{completedCredits}</Text>
                    {inProgressCredits > 0 ? (
                      <Text style={{ color: IN_PROGRESS_COLOR }}> + {inProgressCredits}</Text>
                    ) : null}
                    {req > 0 ? <Text type="secondary"> / {req} 学分</Text> : null}
                  </Text>
                </div>
                <StackedCreditBar
                  completedCredits={completedCredits}
                  inProgressCredits={inProgressCredits}
                  requirementCredits={req}
                />
                <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
                  已修读 {completedCredits} 学分
                  {inProgressCredits > 0 ? `，正在修读 ${inProgressCredits} 学分` : ''}
                </Text>
              </div>
            </List.Item>
          );
        }}
      />

      {/* ---- 剩余学分 ---- */}
      {remaining && (remaining.totalCredits !== undefined || remaining.requiredCredits !== undefined) ? (
        <div style={{ marginTop: 12, padding: '8px 12px', background: '#fafafa', borderRadius: 6 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            待完成：
            {remaining.requiredCredits !== undefined && (
              <span style={{ marginRight: 12 }}>必修 {remaining.requiredCredits} 学分</span>
            )}
            {remaining.electiveCredits !== undefined && (
              <span style={{ marginRight: 12 }}>选修 {remaining.electiveCredits} 学分</span>
            )}
            {remaining.totalCredits !== undefined && (
              <span>合计 {remaining.totalCredits} 学分</span>
            )}
          </Text>
        </div>
      ) : null}

      {/* ---- 后端 warnings ---- */}
      {warnings && warnings.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          {warnings.map((w) => (
            <Alert
              key={w.code}
              type={warningSeverity(w.code) === 'info' ? 'info' : 'warning'}
              message={w.message}
              showIcon
              icon={WARNING_ICON_MAP[warningSeverity(w.code)] ?? undefined}
              style={{ marginBottom: 6 }}
            />
          ))}
        </div>
      ) : null}
    </Card>
  );
};
