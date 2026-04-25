import { Alert, Button, Card, Input, Space, Typography } from 'antd';

interface CourseOfferingSelectorProps {
  value: string;
  loading?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function CourseOfferingSelector({
  value,
  loading = false,
  onChange,
  onSubmit,
}: CourseOfferingSelectorProps) {
  return (
    <Card>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div>
          <Typography.Title level={4} style={{ marginBottom: 4 }}>
            教师成绩录入
          </Typography.Title>
        </div>

        <Input
          addonBefore="开设课程ID"
          placeholder="请输入开设课程ID"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onPressEnter={onSubmit}
        />

        <Space>
          <Button type="primary" onClick={onSubmit} loading={loading} disabled={!value.trim()}>
            加载成绩
          </Button>
        </Space>

        <Alert
          type="info"
          showIcon
          message="当前阶段说明"
          description="这一版先保证教师页结构、编辑流程、批量操作和共享类型稳定，等 F1 接口最终落地后，再把课程选择和真实字段完全接入。"
        />
      </Space>
    </Card>
  );
}
