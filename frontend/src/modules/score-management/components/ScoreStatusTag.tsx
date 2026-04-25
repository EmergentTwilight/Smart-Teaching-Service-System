import { Space, Tag } from 'antd';
import { getScoreStatusColor, isValidScoreStatus } from '../shared';
import type { TeacherScoreStatus } from '../teacher/types';

interface ScoreStatusTagProps {
  status: TeacherScoreStatus;
  hasPendingModificationRequest?: boolean;
}

function getStatusLabel(status: TeacherScoreStatus): string {
  if (status === 'EMPTY') {
    return '未录入';
  }

  if (status === 'DRAFT') {
    return '草稿';
  }

  if (status === 'SUBMITTED') {
    return '已提交';
  }

  return '已确认';
}

export function ScoreStatusTag({
  status,
  hasPendingModificationRequest = false,
}: ScoreStatusTagProps) {
  const statusColor = isValidScoreStatus(status) ? getScoreStatusColor(status) : 'default';

  return (
    <Space size={4} wrap>
      <Tag color={statusColor}>{getStatusLabel(status)}</Tag>
      {hasPendingModificationRequest ? <Tag color="warning">申请中</Tag> : null}
    </Space>
  );
}
