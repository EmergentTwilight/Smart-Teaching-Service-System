import { Alert, Button, Card, Empty, List, Space, Typography } from 'antd';
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
    return (
      <Card title="AI 辅助建议">
        <Empty description="暂无建议，可继续使用基础课程搜索与选课流程。" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    );
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
        {advice.recommendations.length === 0 ? (
          <Empty description="当前没有可推荐课程。" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
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
                  title={
                    <Space wrap>
                      <Text strong>{item.courseCode} {item.courseName}</Text>
                      <Text type="secondary">{item.teacherName}</Text>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Text type="secondary">
                        推荐分数 {item.recommendationScore.toFixed(2)} · 学分 {item.credits}
                      </Text>
                      <Text>推荐理由：{item.reasons.join('；') || '暂无推荐理由'}</Text>
                      {item.risks.length > 0 ? (
                        <Alert
                          message="风险提示"
                          description={item.risks.join('；')}
                          type="warning"
                          showIcon
                        />
                      ) : null}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Space>
    </Card>
  );
};
