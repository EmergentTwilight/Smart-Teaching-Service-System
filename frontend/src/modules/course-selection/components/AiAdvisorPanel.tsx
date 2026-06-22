import { Alert, Button, Card, Collapse, Empty, List, Space, Spin, Tag, Typography } from 'antd';
import { type FC } from 'react';
import type { AiAdvicePayload, AiCourseScoreBreakdown, AiExplainPayloadResult, AiRecommendation } from '../types/ai';

const { Text } = Typography;

type AiAdvisorTurnType = 'question' | 'recommend' | 'explain' | 'notice' | 'loading';

interface AiAdvisorTurnBase {
  id: string;
  type: AiAdvisorTurnType;
}

interface AiAdvisorQuestionTurn extends AiAdvisorTurnBase {
  type: 'question';
  content: string;
}

interface AiAdvisorLoadingTurn extends AiAdvisorTurnBase {
  type: 'loading';
  content: string;
}

interface AiAdvisorNoticeTurn extends AiAdvisorTurnBase {
  type: 'notice';
  status: 'info' | 'warning' | 'error' | 'success';
  content: string;
  description?: string;
}

interface AiAdvisorRecommendTurn extends AiAdvisorTurnBase {
  type: 'recommend';
  advice: AiAdvicePayload;
}

interface AiAdvisorExplainTurn extends AiAdvisorTurnBase {
  type: 'explain';
  courseName: string;
  explanation: AiExplainPayloadResult;
}

export type AiAdvisorTurn =
  | AiAdvisorQuestionTurn
  | AiAdvisorRecommendTurn
  | AiAdvisorExplainTurn
  | AiAdvisorNoticeTurn
  | AiAdvisorLoadingTurn;

interface AiAdvisorPanelProps {
  turns: AiAdvisorTurn[];
  loading?: boolean;
  onExplain: (offeringId: string, courseName: string) => void;
  onGoToSelection?: () => void;
}

/**
 * TODO(C6, FR-C-38, FR-C-39, FR-C-41, NFR-C-09, NFR-C-10):
 * - 推荐与解释仅用于说明，禁止直接触发选课动作；
 * - 任何风险提示应可见且可回传到选课页；
 * - AI 不可用时页面应展示降级提示并保留基础操作能力。
 */
const renderScoreBreakdown = (scoreBreakdown?: AiCourseScoreBreakdown) => {
  if (!scoreBreakdown) {
    return null;
  }

  return (
    <Text type="secondary">
      评分构成：培养方案 {scoreBreakdown.curriculumMatch.toFixed(2)} · 学分缺口{' '}
      {scoreBreakdown.creditGapFit.toFixed(2)} · 课表 {scoreBreakdown.scheduleFit.toFixed(2)} · 偏好{' '}
      {scoreBreakdown.preferenceFit.toFixed(2)} · 容量 {scoreBreakdown.capacityFit.toFixed(2)} · 风险{' '}
      {scoreBreakdown.riskInverse.toFixed(2)}
    </Text>
  );
};

const RecommendationListItem = ({
  item,
  onExplain,
  onGoToSelection,
}: {
  item: AiRecommendation;
  onExplain: (offeringId: string, courseName: string) => void;
  onGoToSelection?: () => void;
}) => {
  return (
    <List.Item
      actions={[
        onGoToSelection ? (
          <Button key={`${item.courseOfferingId}-select`} size="small" onClick={onGoToSelection}>
            前往选课
          </Button>
        ) : null,
        <Button
          key={`${item.courseOfferingId}-explain`}
          size="small"
          onClick={() => onExplain(item.courseOfferingId, item.courseName)}
        >
          查看解释
        </Button>,
      ]}
    >
      <List.Item.Meta
        title={
          <Space wrap>
            <Text strong>
              {item.courseCode} {item.courseName}
            </Text>
            <Text type="secondary">{item.teacherName}</Text>
          </Space>
        }
        description={
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <Text type="secondary">
              推荐分数 {item.recommendationScore.toFixed(2)} · 学分 {item.credits}
              {item.eligibilitySnapshot?.remainingCapacity !== undefined
                ? ` · 剩余名额 ${item.eligibilitySnapshot.remainingCapacity}`
                : ''}
            </Text>
            {renderScoreBreakdown(item.scoreBreakdown)}
            <Text>推荐理由：{item.reasons.join('；') || '暂无推荐理由'}</Text>
            {item.risks.length > 0 ? <Alert message={item.risks.join('；')} type="warning" showIcon /> : null}
          </Space>
        }
      />
    </List.Item>
  );
};

const AdviceBubble = ({
  advice,
  onExplain,
  onGoToSelection,
}: {
  advice: AiAdvicePayload;
  onExplain: (offeringId: string, courseName: string) => void;
  onGoToSelection?: () => void;
}) => {
  const modeText =
    advice.degradedMode === 'full'
      ? 'AI 全量推理'
      : advice.degradedMode === 'template_only'
        ? '模板降级'
        : '规则兜底';

  const planItems =
    advice.plans?.map((plan) => ({
      key: plan.id,
      label: (
        <Space size="small" wrap>
          <Text strong>{plan.title}</Text>
          <Tag color={plan.riskLevel === 'high' ? 'red' : plan.riskLevel === 'medium' ? 'orange' : 'green'}>
            {plan.riskLevel === 'low' ? '低风险' : plan.riskLevel === 'medium' ? '中风险' : '高风险'}
          </Tag>
          <Text type="secondary">合计学分 {plan.projectedCredits}</Text>
          <Text type="secondary">{plan.recommendations.length} 门课程</Text>
        </Space>
      ),
      children: (
        <List
          size="small"
          dataSource={plan.recommendations}
          renderItem={(item) => <RecommendationListItem item={item} onExplain={onExplain} onGoToSelection={onGoToSelection} />}
        />
      ),
    })) ?? [];

  return (
    <Card
      title="AI 助理"
      size="small"
      extra={
        <Text type="secondary" style={{ fontSize: 12 }}>
          仅供参考 · {modeText}
        </Text>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Alert message={advice.disclaimer} type="info" showIcon />
        {advice.fallbackInfo ? (
          <Alert
            message={`降级提示：${advice.fallbackInfo.code}`}
            description={advice.fallbackInfo.reason}
            type="warning"
            showIcon
          />
        ) : null}
        <Text type="secondary">
          学分说明：当前 {advice.creditProgressSummary.currentSelectedCredits} / 目标 {advice.creditProgressSummary.targetCredits} /
          上限 {advice.creditProgressSummary.maxCredits}
        </Text>
        {advice.progressAudit ? (
          <Space direction="vertical" size={4}>
            <Text strong>培养方案缺口</Text>
            {advice.progressAudit.priorityGaps.length === 0 ? (
              <Text type="secondary">当前未识别出明确学分类别缺口。</Text>
            ) : (
              <Space wrap>
                {advice.progressAudit.priorityGaps.map((gap) => (
                  <Tag key={gap.courseType} color={gap.urgency === 'high' ? 'red' : gap.urgency === 'medium' ? 'orange' : 'blue'}>
                    {gap.courseType === 'required' ? '必修' : gap.courseType === 'elective' ? '选修' : '通识'}缺口 {gap.gapCredits}
                  </Tag>
                ))}
              </Space>
            )}
          </Space>
        ) : null}
        {advice.scheduleLoad ? (
          <Alert
            message={`课表负担：${advice.scheduleLoad.loadLevel === 'high' ? '较高' : advice.scheduleLoad.loadLevel === 'medium' ? '中等' : '较低'}`}
            description={advice.scheduleLoad.notes.join('；')}
            type={advice.scheduleLoad.loadLevel === 'high' ? 'warning' : 'info'}
            showIcon
          />
        ) : null}
        {advice.recommendationSummary ? <Alert message={advice.recommendationSummary} type="success" showIcon /> : null}
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

        {planItems.length > 0 ? (
          <div>
            <Text strong>三套方案</Text>
            <Collapse size="small" style={{ marginTop: 8 }} items={planItems} />
          </div>
        ) : null}

        <Text strong>推荐课程</Text>
        {advice.recommendations.length === 0 ? (
          <Empty description="当前没有可推荐课程。" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            size="small"
            dataSource={advice.recommendations}
            renderItem={(item) => (
              <RecommendationListItem item={item} onExplain={onExplain} onGoToSelection={onGoToSelection} />
            )}
          />
        )}
      </Space>
    </Card>
  );
};

const ExplainBubble = ({ turn }: { turn: AiAdvisorExplainTurn }) => {
  return (
    <Card title={`课程解释：${turn.courseName}`} size="small">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap>
          <Tag color={turn.explanation.hardRuleResult.isSelectableNow ? 'green' : 'red'}>
            {turn.explanation.hardRuleResult.isSelectableNow ? '当前可选' : '当前不可选'}
          </Tag>
          <Tag color={turn.explanation.degradedMode === 'full' ? 'blue' : 'gold'}>
            {turn.explanation.degradedMode ?? 'rule_only'}
          </Tag>
        </Space>
        <Text>{turn.explanation.explanation}</Text>
        {turn.explanation.hardRuleResult.reasons.length > 0 ? (
          <List
            size="small"
            dataSource={turn.explanation.hardRuleResult.reasons}
            renderItem={(item) => <List.Item>{item}</List.Item>}
          />
        ) : null}
        <Alert message={turn.explanation.disclaimer} type="info" showIcon />
      </Space>
    </Card>
  );
};

export const AiAdvisorPanel: FC<AiAdvisorPanelProps> = ({ turns, loading, onExplain, onGoToSelection }) => {
  if (turns.length === 0 && !loading) {
    return (
      <Card title="AI 助理">
        <Empty description="暂无建议，可继续使用基础课程搜索与选课流程。" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    );
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {turns.map((turn) => {
        if (turn.type === 'question') {
          return (
            <Card key={turn.id} size="small" title="你" bodyStyle={{ padding: '12px 16px' }}>
              <Text>{turn.content}</Text>
            </Card>
          );
        }

        if (turn.type === 'loading') {
          return (
            <Card key={turn.id} size="small" title="AI 助理" bodyStyle={{ padding: '12px 16px' }}>
              <Space>
                <Spin size="small" />
                <Text type="secondary">{turn.content}</Text>
              </Space>
            </Card>
          );
        }

        if (turn.type === 'notice') {
          return (
            <Card key={turn.id} size="small" title="AI 助理" bodyStyle={{ padding: '12px 16px' }}>
              <Alert message={turn.content} description={turn.description} type={turn.status} showIcon />
            </Card>
          );
        }

        if (turn.type === 'explain') {
          return <ExplainBubble key={turn.id} turn={turn} />;
        }

        return <AdviceBubble key={turn.id} advice={turn.advice} onExplain={onExplain} onGoToSelection={onGoToSelection} />;
      })}

      {loading && turns.length === 0 ? (
        <Card size="small" title="AI 助理" bodyStyle={{ padding: '12px 16px' }}>
          <Space>
            <Spin size="small" />
            <Text type="secondary">AI 正在补全更多说明...</Text>
          </Space>
        </Card>
      ) : null}
    </Space>
  );
};
