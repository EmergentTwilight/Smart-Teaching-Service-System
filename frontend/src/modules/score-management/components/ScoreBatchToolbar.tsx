import { Button, Card, Space, Typography } from 'antd';

interface ScoreBatchToolbarProps {
  selectedCount: number;
  dirtyCount: number;
  disabled?: boolean;
  loading?: boolean;
  onRefresh: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}

export function ScoreBatchToolbar({
  selectedCount,
  dirtyCount,
  disabled = false,
  loading = false,
  onRefresh,
  onSaveDraft,
  onSubmit,
}: ScoreBatchToolbarProps) {
  return (
    <Card size="small">
      <Space
        align="center"
        size={12}
        style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}
      >
        <Space size={12} wrap>
          <Typography.Text>已选中 {selectedCount} 条</Typography.Text>
          <Typography.Text type="secondary">本地待保存 {dirtyCount} 条</Typography.Text>
        </Space>

        <Space wrap>
          <Button onClick={onRefresh} loading={loading}>
            刷新
          </Button>
          <Button onClick={onSaveDraft} disabled={disabled} loading={loading}>
            保存草稿
          </Button>
          <Button type="primary" onClick={onSubmit} disabled={disabled} loading={loading}>
            提交成绩
          </Button>
        </Space>
      </Space>
    </Card>
  );
}
