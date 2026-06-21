import { useState } from 'react';
import { Alert, Button, Card, Checkbox, Form, Input, InputNumber, Select, Space, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAiAdvisor } from '../hooks/useAiAdvisor';
import { AiAdvisorPanel } from '../components/AiAdvisorPanel';
import type { AiRecommendPayload, AiRecommendationCourseType } from '../types/ai';

const { Text } = Typography;

type SubmitFeedback =
  | {
      type: 'success' | 'error' | 'warning' | 'info';
      message: string;
      description?: string;
    }
  | null;

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

/**
 * TODO(C6, FR-C-38, FR-C-39, FR-C-40, FR-C-41, FR-C-42, NFR-C-09, NFR-C-10):
 * - 页面仅请求推荐和解释；不触发任何 Enrollment 写入动作；
 * - 推荐失败时保留基础课程搜索/选课能力；
 * - 解释结果应突出风险点与“仅供参考”边界。
 */
const CourseSelectionAiPage: React.FC = () => {
  const [recommendForm] = Form.useForm<RecommendFormValues>();
  const [recommendFeedback, setRecommendFeedback] = useState<SubmitFeedback>(null);
  const [explainFeedback, setExplainFeedback] = useState<SubmitFeedback>(null);
  const navigate = useNavigate();

  const aiAdvisor = useAiAdvisor();

  const handleRecommend = async () => {
    const values = await recommendForm.validateFields().catch(() => null);
    if (!values) {
      return;
    }

    setRecommendFeedback(null);

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

    aiAdvisor.recommend.mutate(payload, {
      onSuccess: (result) => {
        const isFull = result.degradedMode === 'full';

        setRecommendFeedback({
          type: isFull ? 'success' : 'warning',
          message: isFull ? 'AI 推荐已更新' : 'AI 建议已降级',
          description: isFull
            ? '推荐结果仅供参考，最终是否可选仍以后端规则校验为准。'
            : `当前处于降级模式（${result.degradedMode}），已返回模板或规则说明。`,
        });
      },
      onError: (_error) => {
        setRecommendFeedback({
          type: 'warning',
          message: 'AI 推荐失败，已降级为基础课程查询',
          description: 'AI 推荐服务暂时不可用，系统将继续保留基础课程查询与正式选课流程。',
        });
      },
    });
  };

  const handleExplain = (offeringId: string) => {
    setExplainFeedback(null);
    aiAdvisor.explain.mutate(
      {
        offeringId,
      },
      {
        onSuccess: () => {
          setExplainFeedback({
            type: 'info',
            message: 'AI 解释已更新',
            description: '解释基于当前学生上下文生成，不会直接写入选课记录。',
          });
        },
        onError: (_error) => {
          setExplainFeedback({
            type: 'warning',
            message: 'AI 解释失败',
            description: 'AI 解释服务暂时不可用，请稍后重试或直接使用普通选课流程。',
          });
        },
      }
    );
  };

  const explainResult = aiAdvisor.explain.data;

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

      <Card title="建议参数" style={{ marginBottom: 16 }}>
        {recommendFeedback ? (
          <Alert
            message={recommendFeedback.message}
            description={recommendFeedback.description}
            type={recommendFeedback.type}
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : null}
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
            <Input.TextArea rows={3} maxLength={300} placeholder="例如：这学期想稳妥一点，不要课太满，也尽量别影响毕业进度。" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={aiAdvisor.recommend.isPending}>
              生成建议
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <AiAdvisorPanel
        advice={aiAdvisor.recommend.data ?? null}
        loading={aiAdvisor.recommend.isPending}
        onExplain={(offeringId) => {
          handleExplain(offeringId);
        }}
        onGoToSelection={() => navigate('/selection/courses')}
      />

      {explainFeedback ? (
        <Alert
          message={explainFeedback.message}
          description={explainFeedback.description}
          type={explainFeedback.type}
          showIcon
          style={{ marginTop: 16 }}
        />
      ) : null}

      {explainResult ? (
        <Card title="AI 课程解释" style={{ marginTop: 16 }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap>
              <Text strong>{explainResult.courseName}</Text>
              <Tag color={explainResult.hardRuleResult.isSelectableNow ? 'green' : 'red'}>
                {explainResult.hardRuleResult.isSelectableNow ? '当前可选' : '当前不可选'}
              </Tag>
              <Tag color={explainResult.degradedMode === 'full' ? 'blue' : 'gold'}>
                {explainResult.degradedMode ?? 'rule_only'}
              </Tag>
            </Space>
            <Text>{explainResult.explanation}</Text>
            {explainResult.llmUsed === false ? null : (
              <Text type="secondary">模型：{explainResult.model || '未返回'}</Text>
            )}
            <Alert message={explainResult.disclaimer} type="info" showIcon />
          </Space>
        </Card>
      ) : null}
    </div>
  );
};

export default CourseSelectionAiPage;
