import { Button, Card, Select, Space, Typography } from 'antd';
import type { CourseOfferingListItem } from '@/modules/course-selection/types/course';

interface CourseOfferingSelectorProps {
  value: string;
  offerings: CourseOfferingListItem[];
  loading?: boolean;
  optionsLoading?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function CourseOfferingSelector({
  value,
  offerings,
  loading = false,
  optionsLoading = false,
  onChange,
  onSubmit,
}: CourseOfferingSelectorProps) {
  const options = offerings.map((offering) => ({
    value: offering.courseOfferingId,
    label: `${offering.course.code} ${offering.course.name} · ${offering.semester.name}`,
    searchText: `${offering.course.code} ${offering.course.name} ${offering.semester.name}`,
  }));

  return (
    <Card>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div>
          <Typography.Title level={4} style={{ marginBottom: 4 }}>
            教师成绩录入
          </Typography.Title>
        </div>

        <Select
          showSearch
          allowClear
          placeholder="请选择任课课程"
          value={value}
          options={options}
          loading={optionsLoading}
          optionFilterProp="searchText"
          style={{ width: '100%' }}
          onChange={(nextValue) => onChange(nextValue ?? '')}
          notFoundContent={optionsLoading ? '加载中' : '暂无任课课程'}
        />

        <Space>
          <Button type="primary" onClick={onSubmit} loading={loading} disabled={!value}>
            加载成绩
          </Button>
        </Space>

      </Space>
    </Card>
  );
}
