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

  const totalRequired = requirements.totalCredits || 0;
  const totalSelected = selected.totalCredits || 0;
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
            已选 {totalSelected} / 要求 {totalRequired} 学分
          </Text>
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
          const pct = req > 0 ? Math.round((sel / req) * 100) : sel > 0 ? 100 : 0;
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
                    <Text strong>{sel}</Text>
                    {req > 0 ? <Text type="secondary"> / {req} 学分</Text> : null}
                  </Text>
                </div>
                <Progress
                  percent={pct}
                  strokeColor={color}
                  size="small"
                  format={() => (req > 0 ? `${pct}%` : `${sel} 学分`)}
                />
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
