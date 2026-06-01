import { Alert, Button, Card, List, Space, Typography } from 'antd';
import { type FC } from 'react';
import type { AiAdvicePayload } from '../types/ai';

const { Text } = Typography;

interface AiAdvisorPanelProps {
  advice: AiAdvicePayload | null;
  loading?: boolean;
  onExplain: (offeringId: string) => void;
}

/**
 * TODO(C6, FR-C-38, FR-C-39, FR-C-41, NFR-C-09, NFR-C-10):
 * - 推荐与解释仅用于说明，禁止直接触发选课动作；
 * - 任何风险提示应可见且可回传到选课页；
 * - AI 不可用时页面应展示降级提示并保留基础操作能力。
 */
export const AiAdvisorPanel: FC<AiAdvisorPanelProps> = ({ advice, loading, onExplain }) => {
  if (loading) {
    return <Card title="AI 辅助建议">加载中...</Card>;
  }

  if (!advice) {
    return <Card title="AI 辅助建议">暂无建议（接口未返回数据）</Card>;
  }

  return (
    <Card
      title="AI 辅助建议"
      extra={
        <Text type="secondary" style={{ fontSize: 12 }}>
          仅供参考
        </Text>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Alert message={advice.disclaimer} type="info" />
        <Text type="secondary">
          学分说明：当前 {advice.creditProgressSummary.currentSelectedCredits} / 目标{' '}
          {advice.creditProgressSummary.targetCredits} / 上限 {advice.creditProgressSummary.maxCredits}
        </Text>
        <div>
          <Text strong>冲突/风险提示：</Text>
          {advice.conflictNotes.length === 0 ? (
            <div style={{ color: '#52c41a', marginTop: 8 }}>当前无显式冲突风险</div>
          ) : (
            <List
              size="small"
              dataSource={advice.conflictNotes}
              renderItem={(item) => <List.Item>{item.courseName}：{item.message}</List.Item>}
            />
          )}
        </div>
        <Text strong>推荐课程</Text>
        <List
          size="small"
          dataSource={advice.recommendations}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  key={item.courseOfferingId}
                  size="small"
                  onClick={() => onExplain(item.courseOfferingId)}
                >
                  查看解释
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={`${item.courseCode} ${item.courseName}`}
                description={`${item.teacherName} · 分数 ${item.recommendationScore.toFixed(2)} · ${item.reasons.join('；')}`}
              />
            </List.Item>
          )}
        />
      </Space>
    </Card>
  );
};
