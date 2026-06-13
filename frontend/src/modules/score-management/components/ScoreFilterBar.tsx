import { Input, Select, Space } from 'antd';
import type { TeacherScoreStatus } from '../teacher/types';

const STATUS_OPTIONS: { label: string; value: TeacherScoreStatus | '' }[] = [
  { label: '全部状态', value: '' },
  { label: '未录入', value: 'EMPTY' },
  { label: '草稿', value: 'DRAFT' },
  { label: '已提交', value: 'SUBMITTED' },
  { label: '已确认', value: 'CONFIRMED' },
];

interface ScoreFilterBarProps {
  keyword: string;
  status: TeacherScoreStatus | '';
  disabled?: boolean;
  onKeywordChange: (value: string) => void;
  onStatusChange: (value: TeacherScoreStatus | '') => void;
}

export function ScoreFilterBar({
  keyword,
  status,
  disabled = false,
  onKeywordChange,
  onStatusChange,
}: ScoreFilterBarProps) {
  return (
    <Space>
      <Input
        placeholder="按学号或姓名搜索"
        allowClear
        disabled={disabled}
        value={keyword}
        onChange={(e) => onKeywordChange(e.target.value)}
        style={{ width: 200 }}
      />
      <Select<TeacherScoreStatus | ''>
        value={status}
        options={STATUS_OPTIONS}
        disabled={disabled}
        onChange={onStatusChange}
        style={{ width: 140 }}
      />
    </Space>
  );
}
