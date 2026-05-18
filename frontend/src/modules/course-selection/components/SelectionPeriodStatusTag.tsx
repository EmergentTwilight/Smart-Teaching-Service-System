import { Tag } from 'antd';
import { type FC } from 'react';
import type { SelectionPeriodServerStatus } from '../types/period';

interface SelectionPeriodStatusTagProps {
  isActive: boolean;
  startTime?: string;
  endTime?: string;
  serverStatus?: SelectionPeriodServerStatus;
}

const SERVER_STATUS_LABELS: Record<SelectionPeriodServerStatus, { label: string; color: string }> = {
  not_started: { label: '未开始', color: 'blue' },
  open: { label: '开放中', color: 'green' },
  ended: { label: '已结束', color: 'default' },
};

/**
 * TODO(C5, FR-C-30, FR-C-31, NFR-C-14): 显示阶段状态应与后端生效规则一致
 * - 展示当前是否生效；
 * - 当前时间不在窗口内也应返回明确提示；
 * - 阶段是否冲突的判断由后端完成，不在前端硬编码。
 */
export const SelectionPeriodStatusTag: FC<SelectionPeriodStatusTagProps> = ({
  isActive,
  startTime,
  endTime,
  serverStatus,
}) => {
  const subtitle = startTime && endTime ? `${startTime} - ${endTime}` : undefined;
  const status = serverStatus ? SERVER_STATUS_LABELS[serverStatus] : undefined;

  return (
    <Tag color={isActive ? status?.color ?? 'green' : 'default'}>
      {isActive ? status?.label ?? '当前启用' : '未启用'}
      {subtitle ? ` (${subtitle})` : ''}
    </Tag>
  );
};
