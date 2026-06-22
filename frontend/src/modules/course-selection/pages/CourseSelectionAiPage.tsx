import { useMemo, useState } from 'react';
import { Button, Card, Checkbox, Form, Input, InputNumber, Select, Space, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAiAdvisor } from '../hooks/useAiAdvisor';
import { AiAdvisorPanel, type AiAdvisorTurn } from '../components/AiAdvisorPanel';
import type { AiRecommendPayload, AiRecommendationCourseType } from '../types/ai';

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

/**
 * TODO(C6, FR-C-38, FR-C-39, FR-C-40, FR-C-41, FR-C-42, NFR-C-09, NFR-C-10):
 * - 页面仅请求推荐和解释；不触发任何 Enrollment 写入动作；
 * - 推荐失败时保留基础课程搜索/选课能力；
 * - 解释结果应突出风险点与“仅供参考”边界。
 */
const CourseSelectionAiPage: React.FC = () => {
  const [recommendForm] = Form.useForm<RecommendFormValues>();
  const [conversation, setConversation] = useState<AiAdvisorTurn[]>([]);

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

  const appendTurn = (turn: AiAdvisorTurn) => {
    setConversation((prev) => [...prev, turn]);
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

    appendTurn({
      id: questionTurnId,
      type: 'question',
      content: requestText,
    });

    appendTurn({
      id: loadingTurnId,
      type: 'loading',
      content: '我正在根据你的偏好生成候选课程...',
    });

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

    appendTurn({
      id: questionTurnId,
      type: 'question',
      content: `我想确认“${courseName}”是否适合本学期选。`,
    });

    appendTurn({
      id: loadingTurnId,
      type: 'loading',
      content: `正在分析“${courseName}”...`,
    });

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

  const isBusy = aiAdvisor.recommend.isPending || aiAdvisor.explain.isPending;

  return (
    <div className="fade-in">
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

      <AiAdvisorPanel
        turns={conversation}
        loading={isBusy}
        onExplain={handleExplain}
        onGoToSelection={() => navigate('/selection/courses')}
      />
    </div>
  );
};

export default CourseSelectionAiPage;

