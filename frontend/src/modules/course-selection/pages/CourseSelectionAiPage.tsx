import { useState } from 'react';
import { Alert, Button, Card, Form, InputNumber, Space, Tag, Typography } from 'antd';
import { useAiAdvisor } from '../hooks/useAiAdvisor';
import { AiAdvisorPanel } from '../components/AiAdvisorPanel';
import type { AiRecommendPayload } from '../types/ai';

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

  const aiAdvisor = useAiAdvisor();

  const handleRecommend = async () => {
    const values = await recommendForm.validateFields().catch(() => null);
    if (!values) {
      return;
    }

    setRecommendFeedback(null);

    const payload: AiRecommendPayload = {
      maxRecommendations: values.maxRecommendations || 5,
    };

    aiAdvisor.recommend.mutate(payload, {
      onSuccess: () => {
        setRecommendFeedback({
          type: 'success',
          message: 'AI 推荐已更新',
          description: '推荐结果仅供参考，最终是否可选仍以后端规则校验为准。',
        });
      },
      onError: (error) => {
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
        onError: (error) => {
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
          initialValues={{ maxRecommendations: 5 }}
        >
          <Form.Item
            name="maxRecommendations"
            label="返回数量"
            rules={[{ required: true, message: '请输入返回数量' }]}
          >
            <InputNumber min={1} max={10} />
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
            </Space>
            <Text>{explainResult.explanation}</Text>
            <Alert message={explainResult.disclaimer} type="info" showIcon />
          </Space>
        </Card>
      ) : null}
    </div>
  );
};

export default CourseSelectionAiPage;
