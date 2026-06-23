import { useMemo, useState } from 'react';
import { Button, Card, Checkbox, Empty, Form, Input, InputNumber, List, Select, Space, Tag, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAiAdvisor } from '../hooks/useAiAdvisor';
import { AiAdvisorPanel, type AiAdvisorTurn } from '../components/AiAdvisorPanel';
import type {
  AiAdvicePayload,
  AiAdvisorSavedRecord,
  AiExplainPayloadResult,
  AiRecommendPayload,
  AiRecommendationCourseType,
} from '../types/ai';

const { Text } = Typography;

interface RecommendFormValues {
  maxRecommendations: number;
  targetCredits?: number;
  preferredCourseTypes?: AiRecommendationCourseType[];
  avoidEarlyMorning?: boolean;
  preferLowLoad?: boolean;
  preferRequiredCourses?: boolean;
  preferGraduationProgress?: boolean;
  riskTolerance?: 'low' | 'medium' | 'high';
  naturalLanguagePreference?: string;
}

const courseTypeLabel: Record<AiRecommendationCourseType, string> = {
  required: '必修',
  elective: '选修',
  general: '通识',
};

const formatRiskText: Record<'low' | 'medium' | 'high', string> = {
  low: '低风险',
  medium: '平衡',
  high: '进取',
};

const buildSavedAdviceTitle = (value: string): string => value.trim().slice(0, 120);

/**
 * TODO(C6, FR-C-38, FR-C-39, FR-C-40, FR-C-41, FR-C-42, NFR-C-09, NFR-C-10):
 * - 页面仅请求推荐和解释；不触发任何 Enrollment 写入动作；
 * - 推荐失败时保留基础课程搜索/选课能力；
 * - 解释结果应突出风险点与“仅供参考”边界。
 */
const CourseSelectionAiPage: React.FC = () => {
  const [recommendForm] = Form.useForm<RecommendFormValues>();
  const [conversation, setConversation] = useState<AiAdvisorTurn[]>([]);
  const [savedTurnIds, setSavedTurnIds] = useState<string[]>([]);
  const [savingTurnId, setSavingTurnId] = useState<string | null>(null);
  const [messageApi, messageContextHolder] = message.useMessage();

  const navigate = useNavigate();
  const aiAdvisor = useAiAdvisor();

  const preferenceSummary = (payload: AiRecommendPayload): string => {
    const preferences = payload.preferences ?? {};
    const chunks: string[] = [];

    chunks.push(`我希望本次给我推荐 ${payload.maxRecommendations} 门课程。`);

    if (preferences.targetCredits) {
      chunks.push(`先考虑到目标学分 ${preferences.targetCredits}。`);
    }

    if (preferences.preferredCourseTypes?.length) {
      chunks.push(`课程类型优先 ${preferences.preferredCourseTypes.map((type) => courseTypeLabel[type]).join('、')}。`);
    }

    if (preferences.avoidEarlyMorning) {
      chunks.push('尽量避开早课。');
    }

    if (preferences.preferLowLoad) {
      chunks.push('更偏好课业负担轻一些。');
    }

    if (preferences.preferRequiredCourses === false) {
      chunks.push('不优先必修课。');
    }

    if (preferences.preferGraduationProgress === false) {
      chunks.push('毕业进度权重不高。');
    }

    chunks.push(`风险偏好：${formatRiskText[preferences.riskTolerance ?? 'low']}。`);

    if (preferences.naturalLanguagePreference) {
      chunks.push(`补充偏好：${preferences.naturalLanguagePreference}`);
    }

    return chunks.join('\n');
  };

  const prependTurns = (turns: AiAdvisorTurn[]) => {
    setConversation((prev) => [...turns, ...prev]);
  };

  const replaceTurn = (turnId: string, next: AiAdvisorTurn) => {
    setConversation((prev) => prev.map((item) => (item.id === turnId ? next : item)));
  };

  const buildUniqueId = useMemo(
    () => () => `turn-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`,
    []
  );

  const handleRecommend = async () => {
    const values = await recommendForm.validateFields().catch(() => null);
    if (!values) {
      return;
    }

    const payload: AiRecommendPayload = {
      maxRecommendations: values.maxRecommendations || 5,
      preferences: {
        targetCredits: values.targetCredits,
        preferredCourseTypes: values.preferredCourseTypes,
        avoidEarlyMorning: Boolean(values.avoidEarlyMorning),
        preferLowLoad: Boolean(values.preferLowLoad),
        preferRequiredCourses: values.preferRequiredCourses !== false,
        preferGraduationProgress: values.preferGraduationProgress !== false,
        riskTolerance: values.riskTolerance ?? 'low',
        naturalLanguagePreference: values.naturalLanguagePreference?.trim() || undefined,
      },
    };

    const requestText = preferenceSummary(payload);
    const questionTurnId = buildUniqueId();
    const loadingTurnId = buildUniqueId();

    prependTurns([
      {
        id: questionTurnId,
        type: 'question',
        content: requestText,
      },
      {
        id: loadingTurnId,
        type: 'loading',
        content: '我正在根据你的偏好生成候选课程...',
      },
    ]);

    aiAdvisor.recommend.mutate(payload, {
      onSuccess: (result) => {
        replaceTurn(loadingTurnId, {
          id: loadingTurnId,
          type: 'recommend',
          advice: result,
        });
      },
      onError: () => {
        replaceTurn(loadingTurnId, {
          id: loadingTurnId,
          type: 'notice',
          status: 'warning',
          content: 'AI 推荐失败，已降级为基础课程查询',
          description: 'AI 推荐服务暂时不可用，系统将继续保留基础课程搜索与正式选课流程。',
        });
      },
    });
  };

  const handleExplain = (offeringId: string, courseName = '该课程') => {
    const questionTurnId = buildUniqueId();
    const loadingTurnId = buildUniqueId();

    prependTurns([
      {
        id: questionTurnId,
        type: 'question',
        content: `我想确认“${courseName}”是否适合本学期选。`,
      },
      {
        id: loadingTurnId,
        type: 'loading',
        content: `正在分析“${courseName}”...`,
      },
    ]);

    aiAdvisor.explain.mutate(
      {
        offeringId,
      },
      {
        onSuccess: (result) => {
          replaceTurn(loadingTurnId, {
            id: loadingTurnId,
            type: 'explain',
            courseName,
            explanation: result,
          });
        },
        onError: () => {
          replaceTurn(loadingTurnId, {
            id: loadingTurnId,
            type: 'notice',
            status: 'warning',
            content: 'AI 解释失败',
            description: 'AI 解释服务暂时不可用，请稍后重试或直接使用普通选课流程。',
          });
        },
      }
    );
  };

  const handleSaveTurn = (turn: AiAdvisorTurn, question?: string) => {
    if (turn.type !== 'recommend' && turn.type !== 'explain') {
      return;
    }

    setSavingTurnId(turn.id);

    const payload =
      turn.type === 'recommend'
        ? {
            recordType: 'recommendation' as const,
            title: 'AI 推荐建议',
            question,
            requestPayload: question ? { question } : null,
            resultPayload: turn.advice as unknown as Record<string, unknown>,
          }
        : {
            recordType: 'explanation' as const,
            title: buildSavedAdviceTitle(`课程解释：${turn.courseName}`),
            question,
            courseOfferingId: turn.explanation.courseOfferingId,
            requestPayload: question ? { question } : null,
            resultPayload: turn.explanation as unknown as Record<string, unknown>,
          };

    aiAdvisor.saveRecord.mutate(payload, {
      onSuccess: () => {
        setSavedTurnIds((prev) => Array.from(new Set([...prev, turn.id])));
        messageApi.success('已保存到个人 AI 建议');
      },
      onError: () => {
        messageApi.warning('保存失败，请稍后重试');
      },
      onSettled: () => {
        setSavingTurnId(null);
      },
    });
  };

  const handleShowSavedRecord = (record: AiAdvisorSavedRecord) => {
    const questionTurn: AiAdvisorTurn = {
      id: buildUniqueId(),
      type: 'question',
      content: record.question || `查看已保存：${record.title}`,
    };

    const responseTurn: AiAdvisorTurn =
      record.recordType === 'recommendation'
        ? {
            id: buildUniqueId(),
            type: 'recommend',
            advice: record.resultPayload as unknown as AiAdvicePayload,
          }
        : {
            id: buildUniqueId(),
            type: 'explain',
            courseName:
              typeof record.resultPayload.courseName === 'string'
                ? record.resultPayload.courseName
                : record.title.replace(/^课程解释：/, ''),
            explanation: record.resultPayload as unknown as AiExplainPayloadResult,
          };

    prependTurns([questionTurn, responseTurn]);
  };

  const handleDeleteSavedRecord = (id: string) => {
    aiAdvisor.deleteRecord.mutate(id, {
      onSuccess: () => {
        messageApi.success('已删除保存记录');
      },
      onError: () => {
        messageApi.warning('删除失败，请稍后重试');
      },
    });
  };

  const isBusy = aiAdvisor.recommend.isPending || aiAdvisor.explain.isPending;
  const savedRecords = aiAdvisor.savedRecords.data?.items ?? [];

  return (
    <div className="fade-in">
      {messageContextHolder}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: 24 }}>
          AI 课程推荐
        </Text>
        <Text type="secondary" style={{ marginLeft: 8 }}>
          仅展示解释与建议，不会写入选课记录。
        </Text>
      </div>

      <Card title="你想怎么选" style={{ marginBottom: 16 }}>
        <Form
          form={recommendForm}
          layout="vertical"
          onFinish={handleRecommend}
          initialValues={{
            maxRecommendations: 5,
            preferredCourseTypes: ['required', 'elective', 'general'],
            preferRequiredCourses: true,
            preferGraduationProgress: true,
            riskTolerance: 'low',
          }}
        >
          <Space wrap align="start" size="large">
            <Form.Item
              name="maxRecommendations"
              label="返回数量"
              rules={[{ required: true, message: '请输入返回数量' }]}
            >
              <InputNumber min={1} max={10} />
            </Form.Item>
            <Form.Item name="targetCredits" label="目标学分">
              <InputNumber min={1} max={40} />
            </Form.Item>
            <Form.Item name="riskTolerance" label="风险偏好">
              <Select
                style={{ width: 140 }}
                options={[
                  { value: 'low', label: '低风险' },
                  { value: 'medium', label: '适中' },
                  { value: 'high', label: '可接受较高风险' },
                ]}
              />
            </Form.Item>
          </Space>
          <Form.Item name="preferredCourseTypes" label="课程类型偏好">
            <Select
              mode="multiple"
              options={[
                { value: 'required', label: '必修' },
                { value: 'elective', label: '选修' },
                { value: 'general', label: '通识' },
              ]}
            />
          </Form.Item>
          <Space wrap>
            <Form.Item name="avoidEarlyMorning" valuePropName="checked">
              <Checkbox>避免早课</Checkbox>
            </Form.Item>
            <Form.Item name="preferLowLoad" valuePropName="checked">
              <Checkbox>偏好轻负担</Checkbox>
            </Form.Item>
            <Form.Item name="preferRequiredCourses" valuePropName="checked">
              <Checkbox>优先必修</Checkbox>
            </Form.Item>
            <Form.Item name="preferGraduationProgress" valuePropName="checked">
              <Checkbox>优先毕业进度</Checkbox>
            </Form.Item>
          </Space>
          <Form.Item name="naturalLanguagePreference" label="偏好说明">
            <Input.TextArea
              rows={3}
              maxLength={300}
              placeholder="例如：这学期想稳妥一点，不要课太满，也尽量别影响毕业进度。"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={aiAdvisor.recommend.isPending}>
              发送提问
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title="已保存建议"
        extra={
          aiAdvisor.savedRecords.isFetching ? (
            <Text type="secondary">刷新中...</Text>
          ) : (
            <Text type="secondary">{savedRecords.length} 条</Text>
          )
        }
        style={{ marginBottom: 16 }}
      >
        {savedRecords.length === 0 ? (
          <Empty description="暂无保存记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            size="small"
            dataSource={savedRecords}
            renderItem={(record) => (
              <List.Item
                actions={[
                  <Button
                    key={`${record.id}-view`}
                    size="small"
                    aria-label="查看"
                    onClick={() => handleShowSavedRecord(record)}
                  >
                    查看
                  </Button>,
                  <Button
                    key={`${record.id}-delete`}
                    size="small"
                    danger
                    aria-label="删除"
                    loading={aiAdvisor.deleteRecord.isPending}
                    onClick={() => handleDeleteSavedRecord(record.id)}
                  >
                    删除
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space wrap>
                      <Text strong>{record.title}</Text>
                      <Tag color={record.recordType === 'recommendation' ? 'blue' : 'purple'}>
                        {record.recordType === 'recommendation' ? '推荐' : '解释'}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Text type="secondary">
                      {new Date(record.createdAt).toLocaleString()} · 保存内容仅供回看，正式选课会重新校验
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <AiAdvisorPanel
        turns={conversation}
        loading={isBusy}
        onExplain={handleExplain}
        onGoToSelection={() => navigate('/selection/courses')}
        onSaveTurn={handleSaveTurn}
        savedTurnIds={savedTurnIds}
        savingTurnId={savingTurnId}
      />
    </div>
  );
};

export default CourseSelectionAiPage;
