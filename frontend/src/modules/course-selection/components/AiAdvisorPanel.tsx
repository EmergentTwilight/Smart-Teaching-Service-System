import { Alert, Button, Card, Col, Collapse, Empty, List, Row, Space, Spin, Tag, Typography } from 'antd';
import { EyeInvisibleOutlined, EyeOutlined, SaveOutlined, WarningOutlined } from '@ant-design/icons';
import { type FC, useEffect, useMemo, useState } from 'react';
import type {
  AiAdvicePayload,
  AiCourseScoreBreakdown,
  AiDebugInfo,
  AiDebugStage,
  AiExplainPayloadResult,
  AiFallbackInfo,
  AiRecommendation,
} from '../types/ai';

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
  startedAt?: number;
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
  onSaveTurn?: (turn: AiAdvisorTurn, question?: string) => void;
  savedTurnIds?: string[];
  savingTurnId?: string | null;
  readOnly?: boolean;
  debugMode?: boolean;
}

interface UserFallbackNotice {
  message: string;
  description: string;
  type: 'info' | 'warning';
}

interface RiskSection {
  key: string;
  title: string;
  items: string[];
  color: string;
}

interface AiConversationGroup {
  id: string;
  question?: AiAdvisorQuestionTurn;
  responses: AiAdvisorTurn[];
}

const DEBUG_FRONTEND_TIMEOUT_MS = 1_210_000;
const DEBUG_LLM_STAGE_TIMEOUT_MS = 600_000;

const formatDuration = (value?: number) => {
  if (value === undefined || !Number.isFinite(value)) {
    return '-';
  }

  if (value < 1000) {
    return `${value}ms`;
  }

  const seconds = Math.round(value / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return restSeconds > 0 ? `${minutes}min ${restSeconds}s` : `${minutes}min`;
};

const classifyDebugStage = (stage: AiDebugStage): { label: string; color: string } => {
  const reason = stage.reason?.toLowerCase() ?? '';
  const message = stage.providerMessage?.toLowerCase() ?? '';

  if (stage.status === 'success') {
    return { label: '正常返回', color: 'green' };
  }
  if (stage.status === 'skipped') {
    return { label: '未触发', color: 'default' };
  }
  if (reason.includes('timeout') || message.includes('timeout')) {
    return { label: '超时', color: 'red' };
  }
  if (stage.statusCode === 429 || stage.retryAfter) {
    return { label: '限流/排队', color: 'orange' };
  }
  if (stage.statusCode === 401 || stage.statusCode === 403 || reason.includes('missing_api_key')) {
    return { label: '配置/权限', color: 'purple' };
  }
  if (stage.statusCode && stage.statusCode >= 500) {
    return { label: '服务异常', color: 'red' };
  }
  if (reason.includes('network')) {
    return { label: '网络异常', color: 'red' };
  }
  if (reason.includes('validation') || reason.includes('invalid') || reason.includes('empty')) {
    return { label: '输出不可用', color: 'gold' };
  }

  return { label: '规则回退', color: 'blue' };
};

const DebugInfoPanel = ({ debugInfo }: { debugInfo?: AiDebugInfo }) => {
  if (!debugInfo) {
    return null;
  }

  return (
    <Collapse
      size="small"
      items={[
        {
          key: 'debug',
          label: (
            <Space size="small" wrap>
              <Text strong>AI 调试状态</Text>
              <Tag color={debugInfo.endpoint === 'recommend' ? 'blue' : 'purple'}>{debugInfo.endpoint}</Tag>
              <Text type="secondary">阶段 {debugInfo.stages.length}</Text>
            </Space>
          ),
          children: (
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text type="secondary">
                requestId {debugInfo.requestId} · 单阶段上限 {formatDuration(debugInfo.llmTimeoutMs)} ·{' '}
                {new Date(debugInfo.generatedAt).toLocaleString()}
              </Text>
              <List
                size="small"
                dataSource={debugInfo.stages}
                renderItem={(stage) => {
                  const classified = classifyDebugStage(stage);
                  return (
                    <List.Item>
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Space wrap size="small">
                          <Tag color={classified.color}>{classified.label}</Tag>
                          <Tag>{stage.stage}</Tag>
                          <Text type="secondary">{stage.status}</Text>
                          {stage.statusCode ? <Tag color={stage.statusCode >= 400 ? 'red' : 'green'}>HTTP {stage.statusCode}</Tag> : null}
                          {stage.retryAfter ? <Tag color="orange">retry-after {stage.retryAfter}s</Tag> : null}
                        </Space>
                        <Text type="secondary">
                          model {stage.model ?? '-'} · duration {formatDuration(stage.durationMs)} · tokens{' '}
                          {stage.totalTokens ?? '-'} · prompt {stage.promptTokens ?? '-'} · completion{' '}
                          {stage.completionTokens ?? '-'} · reasoning {stage.reasoningTokens ?? '-'}
                        </Text>
                        <Text type="secondary">
                          reason {stage.reason ?? '-'} · providerCode {stage.providerCode ?? '-'} · finish{' '}
                          {stage.finishReason ?? '-'} / {stage.nativeFinishReason ?? '-'}
                        </Text>
                        {stage.providerMessage ? (
                          <Text type="secondary">providerMessage {stage.providerMessage}</Text>
                        ) : null}
                        {stage.providerRawErrorSummary ? (
                          <pre
                            aria-label="provider raw error summary"
                            style={{
                              width: '100%',
                              maxHeight: 140,
                              overflow: 'auto',
                              margin: 0,
                              padding: 8,
                              border: '1px solid #d9d9d9',
                              borderRadius: 6,
                              background: '#fafafa',
                              color: '#595959',
                              fontSize: 12,
                              lineHeight: 1.5,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}
                          >
                            {stage.providerRawErrorSummary}
                          </pre>
                        ) : null}
                      </Space>
                    </List.Item>
                  );
                }}
              />
            </Space>
          ),
        },
      ]}
    />
  );
};

const LoadingBubble = ({ turn, debugMode }: { turn: AiAdvisorLoadingTurn; debugMode?: boolean }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!debugMode) {
      return undefined;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [debugMode]);

  const elapsed = turn.startedAt ? now - turn.startedAt : undefined;

  return (
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      <Space>
        <Spin size="small" />
        <Text type="secondary">{turn.content}</Text>
      </Space>
      {debugMode ? (
        <Alert
          message="AI 调试状态"
          description={`前端已等待 ${formatDuration(elapsed)}；前端请求上限 ${formatDuration(
            DEBUG_FRONTEND_TIMEOUT_MS
          )}；后端单阶段上限 ${formatDuration(
            DEBUG_LLM_STAGE_TIMEOUT_MS
          )}。后端返回前只能确认仍在等待，返回后会显示是否超时、限流、权限异常或输出校验失败。`}
          type="info"
          showIcon
        />
      ) : null}
    </Space>
  );
};

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

const formatFallbackNotice = (fallbackInfo?: AiFallbackInfo, degradedMode?: string): UserFallbackNotice | null => {
  if (!fallbackInfo && degradedMode === 'full') {
    return null;
  }

  if (!fallbackInfo) {
    return degradedMode && degradedMode !== 'full'
      ? {
          message: '已使用规则推荐',
          description: '当前建议由系统规则和课程数据生成，普通搜索与选课流程不受影响。',
          type: 'info',
        }
      : null;
  }

  const reason = fallbackInfo.reason || '';
  const lowerReason = reason.toLowerCase();
  const source = fallbackInfo.source;
  const diagnostics = fallbackInfo.diagnostics;
  const statusCode = diagnostics?.statusCode;

  let reasonText = '智能生成暂时没有返回可直接展示的完整方案。';

  if (source === 'rule') {
    reasonText = reason || '当前课程容量、阶段、冲突或培养方案条件限制了可推荐课程。';
  } else if (statusCode === 429) {
    reasonText = '智能生成服务当前触发免费模型限流或额度限制。';
  } else if (statusCode === 401 || statusCode === 403) {
    reasonText = '智能生成服务认证或模型访问权限异常。';
  } else if (statusCode && statusCode >= 500) {
    reasonText = '智能生成服务当前响应异常。';
  } else if (lowerReason.includes('timeout') || reason.includes('超时')) {
    reasonText = '智能生成响应超时。';
  } else if (lowerReason.includes('missing_api_key')) {
    reasonText = '智能生成服务尚未配置可用 API Key。';
  } else if (lowerReason.includes('provider_disabled')) {
    reasonText = '智能生成服务当前未启用。';
  } else if (lowerReason.includes('provider_error')) {
    reasonText = '智能生成服务返回错误。';
  } else if (reason.includes('不可用') || lowerReason.includes('unavailable')) {
    reasonText = '智能生成服务暂时不可用。';
  } else if (
    fallbackInfo.code.includes('policy') ||
    reason.includes('校验') ||
    lowerReason.includes('validation')
  ) {
    reasonText = '智能生成结果没有通过系统校验。';
  }

  const isConfigurationIssue =
    statusCode === 401 ||
    statusCode === 403 ||
    lowerReason.includes('missing_api_key') ||
    lowerReason.includes('provider_disabled');
  const nextStep = isConfigurationIssue
    ? '这通常需要维护人员检查配置或模型权限，单纯刷新页面通常不能恢复；普通选课不受影响。'
    : fallbackInfo.retriable === false
      ? '这通常由当前课程数据或硬性规则决定，短时间重试通常不会改变结果；可以直接按规则推荐继续查看或手动选课。'
      : '当前已按系统规则给出可用建议，普通选课不受影响；如果想要更完整的智能解释，可以稍后重试。';

  return {
    message: source === 'rule' ? '已按规则生成建议' : '已切换为规则推荐',
    description: `${reasonText}${nextStep}`,
    type: fallbackInfo.retriable === false ? 'info' : 'warning',
  };
};

const collectRiskSections = (advice: AiAdvicePayload): RiskSection[] => {
  const sections: RiskSection[] = [];

  if (advice.conflictNotes.length > 0) {
    sections.push({
      key: 'conflicts',
      title: '冲突',
      color: 'red',
      items: advice.conflictNotes.map((item) => `${item.courseName}：${item.message}`),
    });
  }

  if (advice.capacityRisks && advice.capacityRisks.length > 0) {
    sections.push({
      key: 'capacity',
      title: '容量',
      color: 'orange',
      items: advice.capacityRisks.map(
        (item) => `${item.courseName}：剩余 ${item.remainingCapacity} 人，${item.riskReason}`
      ),
    });
  }

  if (advice.scheduleLoad?.notes.length) {
    sections.push({
      key: 'schedule',
      title: '课表',
      color: advice.scheduleLoad.loadLevel === 'high' ? 'red' : advice.scheduleLoad.loadLevel === 'medium' ? 'orange' : 'blue',
      items: advice.scheduleLoad.notes,
    });
  }

  const courseRiskItems = advice.recommendations.flatMap((item) =>
    item.risks.map((risk) => `${item.courseName}：${risk}`)
  );

  if (courseRiskItems.length > 0) {
    sections.push({
      key: 'course-risks',
      title: '课程风险',
      color: 'gold',
      items: courseRiskItems,
    });
  }

  return sections;
};

const groupTurns = (turns: AiAdvisorTurn[]): AiConversationGroup[] => {
  const groups: AiConversationGroup[] = [];
  let current: AiConversationGroup | null = null;

  turns.forEach((turn) => {
    if (turn.type === 'question') {
      current = {
        id: turn.id,
        question: turn,
        responses: [],
      };
      groups.push(current);
      return;
    }

    if (!current) {
      groups.push({
        id: turn.id,
        responses: [turn],
      });
      return;
    }

    current.responses.push(turn);
  });

  return groups;
};

const RecommendationListItem = ({
  item,
  onExplain,
  onGoToSelection,
  readOnly,
}: {
  item: AiRecommendation;
  onExplain: (offeringId: string, courseName: string) => void;
  onGoToSelection?: () => void;
  readOnly?: boolean;
}) => {
  return (
    <List.Item
      actions={
        readOnly
          ? []
          : [
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
            ]
      }
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
  readOnly,
  debugMode,
}: {
  advice: AiAdvicePayload;
  onExplain: (offeringId: string, courseName: string) => void;
  onGoToSelection?: () => void;
  readOnly?: boolean;
  debugMode?: boolean;
}) => {
  const [riskPanelOpen, setRiskPanelOpen] = useState(true);
  const riskSections = useMemo(() => collectRiskSections(advice), [advice]);
  const riskCount = riskSections.reduce((sum, section) => sum + section.items.length, 0);
  const fallbackNotice = formatFallbackNotice(advice.fallbackInfo, advice.degradedMode);

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
          renderItem={(item) => (
            <RecommendationListItem
              item={item}
              onExplain={onExplain}
              onGoToSelection={onGoToSelection}
              readOnly={readOnly}
            />
          )}
        />
      ),
    })) ?? [];

  const riskPanel = (
    <div
      style={{
        border: '1px solid #f0f0f0',
        borderRadius: 8,
        padding: 12,
        background: '#fafafa',
      }}
    >
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space size="small">
            <WarningOutlined />
            <Text strong>风险与限制</Text>
            <Tag color={riskCount > 0 ? 'orange' : 'green'}>{riskCount} 项</Tag>
          </Space>
          <Button
            size="small"
            type="text"
            icon={<EyeInvisibleOutlined />}
            onClick={() => setRiskPanelOpen(false)}
          >
            隐藏
          </Button>
        </Space>
        <div
          role="region"
          aria-label="风险与限制明细"
          style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}
        >
          {riskSections.length === 0 ? (
            <Text type="secondary">当前无显式冲突风险。</Text>
          ) : (
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              {riskSections.map((section) => (
                <div key={section.key}>
                  <Space size="small" style={{ marginBottom: 4 }}>
                    <Tag color={section.color}>{section.title}</Tag>
                    <Text type="secondary">{section.items.length} 项</Text>
                  </Space>
                  <List
                    size="small"
                    dataSource={section.items}
                    renderItem={(item) => (
                      <List.Item style={{ padding: '4px 0' }}>
                        <Text>{item}</Text>
                      </List.Item>
                    )}
                  />
                </div>
              ))}
            </Space>
          )}
        </div>
      </Space>
    </div>
  );

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
        <Text strong>推荐建议</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          仅供参考 · {modeText}
        </Text>
      </Space>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Alert message={advice.disclaimer} type="info" showIcon />
        {fallbackNotice ? (
          <Alert message={fallbackNotice.message} description={fallbackNotice.description} type={fallbackNotice.type} showIcon />
        ) : null}
        {debugMode ? <DebugInfoPanel debugInfo={advice.debugInfo} /> : null}
        {advice.recommendationSummary ? <Alert message={advice.recommendationSummary} type="success" showIcon /> : null}
        <Text type="secondary">
          学分说明：已完成 {advice.creditProgressSummary.completedCredits ?? 0} · 在修{' '}
          {advice.creditProgressSummary.inProgressCredits ?? advice.creditProgressSummary.currentSelectedCredits} · 预计{' '}
          {advice.creditProgressSummary.projectedCredits ?? advice.creditProgressSummary.currentSelectedCredits} / 目标{' '}
          {advice.creditProgressSummary.targetCredits} · 本阶段上限 {advice.creditProgressSummary.maxCredits}
        </Text>

        <Row gutter={[16, 16]} align="top">
          <Col xs={24} lg={riskPanelOpen ? 16 : 24}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
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

              {planItems.length > 0 ? (
                <div>
                  <Text strong>三套方案</Text>
                  <Collapse size="small" style={{ marginTop: 8 }} items={planItems} />
                </div>
              ) : null}

              <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Text strong>推荐课程</Text>
                {!riskPanelOpen ? (
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => setRiskPanelOpen(true)}
                  >
                    显示风险与限制
                  </Button>
                ) : null}
              </Space>
              {advice.recommendations.length === 0 ? (
                <Empty description="当前没有可推荐课程。" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List
                  size="small"
                  dataSource={advice.recommendations}
                  renderItem={(item) => (
                    <RecommendationListItem
                      item={item}
                      onExplain={onExplain}
                      onGoToSelection={onGoToSelection}
                      readOnly={readOnly}
                    />
                  )}
                />
              )}
            </Space>
          </Col>

          {riskPanelOpen ? (
            <Col xs={24} lg={8}>
              {riskPanel}
            </Col>
          ) : null}
        </Row>
      </Space>
    </Space>
  );
};

const ExplainBubble = ({ turn, debugMode }: { turn: AiAdvisorExplainTurn; debugMode?: boolean }) => {
  return (
    <div>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Text strong>课程解释：{turn.courseName}</Text>
        <Space wrap>
          <Tag color={turn.explanation.hardRuleResult.isSelectableNow ? 'green' : 'red'}>
            {turn.explanation.hardRuleResult.isSelectableNow ? '当前可选' : '当前不可选'}
          </Tag>
          <Tag color={turn.explanation.degradedMode === 'full' ? 'blue' : 'gold'}>
            {turn.explanation.degradedMode ?? 'rule_only'}
          </Tag>
        </Space>
        <Text>{turn.explanation.explanation}</Text>
        {debugMode ? <DebugInfoPanel debugInfo={turn.explanation.debugInfo} /> : null}
        {turn.explanation.hardRuleResult.reasons.length > 0 ? (
          <List
            size="small"
            dataSource={turn.explanation.hardRuleResult.reasons}
            renderItem={(item) => <List.Item>{item}</List.Item>}
          />
        ) : null}
        <Alert message={turn.explanation.disclaimer} type="info" showIcon />
      </Space>
    </div>
  );
};

const renderResponseTurn = (
  turn: AiAdvisorTurn,
  onExplain: (offeringId: string, courseName: string) => void,
  onGoToSelection?: () => void,
  readOnly?: boolean,
  debugMode?: boolean
) => {
  if (turn.type === 'loading') {
    return <LoadingBubble turn={turn} debugMode={debugMode} />;
  }

  if (turn.type === 'notice') {
    return <Alert message={turn.content} description={turn.description} type={turn.status} showIcon />;
  }

  if (turn.type === 'explain') {
    return <ExplainBubble turn={turn} debugMode={debugMode} />;
  }

  if (turn.type === 'recommend') {
    return (
      <AdviceBubble
        advice={turn.advice}
        onExplain={onExplain}
        onGoToSelection={onGoToSelection}
        readOnly={readOnly}
        debugMode={debugMode}
      />
    );
  }

  return null;
};

const isSavableTurn = (turn: AiAdvisorTurn) => turn.type === 'recommend' || turn.type === 'explain';

const ConversationGroup = ({
  group,
  onExplain,
  onGoToSelection,
  onSaveTurn,
  savedTurnIds = [],
  savingTurnId,
  readOnly,
  debugMode,
}: {
  group: AiConversationGroup;
  onExplain: (offeringId: string, courseName: string) => void;
  onGoToSelection?: () => void;
  onSaveTurn?: (turn: AiAdvisorTurn, question?: string) => void;
  savedTurnIds?: string[];
  savingTurnId?: string | null;
  readOnly?: boolean;
  debugMode?: boolean;
}) => {
  return (
    <section
      role="article"
      aria-label="AI 问答会话"
      style={{
        border: '1px solid #d9e2ec',
        borderRadius: 8,
        background: '#f8fafc',
        padding: 16,
      }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {group.question ? (
          <div
            style={{
              border: '1px solid #c7ddf7',
              borderRadius: 8,
              background: '#eef6ff',
              padding: '10px 12px',
            }}
          >
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text strong style={{ color: '#1f4f82' }}>
                你
              </Text>
              <Text>{group.question.content}</Text>
            </Space>
          </div>
        ) : null}

        <div
          style={{
            borderTop: group.question ? '1px solid #d9e2ec' : undefined,
            paddingTop: group.question ? 12 : 0,
          }}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Text strong style={{ color: '#344054' }}>
              AI 助理
            </Text>
            {group.responses.length === 0 ? (
              <Text type="secondary">暂无回复。</Text>
            ) : (
              group.responses.map((turn) => (
                <div key={turn.id}>
                  {!readOnly && onSaveTurn && isSavableTurn(turn) ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                      <Button
                        size="small"
                        icon={<SaveOutlined />}
                        aria-label={savedTurnIds.includes(turn.id) ? '已保存' : '保存'}
                        loading={savingTurnId === turn.id}
                        disabled={savedTurnIds.includes(turn.id)}
                        onClick={() => onSaveTurn(turn, group.question?.content)}
                      >
                        {savedTurnIds.includes(turn.id) ? '已保存' : '保存'}
                      </Button>
                    </div>
                  ) : null}
                  {renderResponseTurn(turn, onExplain, onGoToSelection, readOnly, debugMode)}
                </div>
              ))
            )}
          </Space>
        </div>
      </Space>
    </section>
  );
};

export const AiAdvisorPanel: FC<AiAdvisorPanelProps> = ({
  turns,
  loading,
  onExplain,
  onGoToSelection,
  onSaveTurn,
  savedTurnIds,
  savingTurnId,
  readOnly,
  debugMode,
}) => {
  if (turns.length === 0 && !loading) {
    return (
      <Card title="AI 助理">
        <Empty description="暂无建议，可继续使用基础课程搜索与选课流程。" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    );
  }

  const groups = groupTurns(turns);

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {groups.map((group) => (
        <ConversationGroup
          key={group.id}
          group={group}
          onExplain={onExplain}
          onGoToSelection={onGoToSelection}
          onSaveTurn={onSaveTurn}
          savedTurnIds={savedTurnIds}
          savingTurnId={savingTurnId}
          readOnly={readOnly}
          debugMode={debugMode}
        />
      ))}

      {loading && turns.length === 0 ? (
        <Card size="small" title="AI 助理" styles={{ body: { padding: '12px 16px' } }}>
          <Space>
            <Spin size="small" />
            <Text type="secondary">AI 正在补全更多说明...</Text>
          </Space>
        </Card>
      ) : null}
    </Space>
  );
};
