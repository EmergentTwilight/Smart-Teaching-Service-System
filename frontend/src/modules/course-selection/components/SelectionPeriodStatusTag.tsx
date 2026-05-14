import { Tag } from 'antd';
import { type FC } from 'react';

interface SelectionPeriodStatusTagProps {
  isActive: boolean;
  startTime?: string;
  endTime?: string;
}

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
}) => {
  const subtitle = startTime && endTime ? `${startTime} - ${endTime}` : undefined;

  return (
    <Tag color={isActive ? 'green' : 'default'}>
      {isActive ? '当前启用' : '未启用'}
      {subtitle ? ` (${subtitle})` : ''}
    </Tag>
  );
};
