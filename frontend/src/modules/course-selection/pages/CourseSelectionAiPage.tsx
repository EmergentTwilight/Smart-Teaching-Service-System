import { Button, Card, Form, Input, InputNumber, Space, Typography, message } from 'antd';
import { useAiAdvisor } from '../hooks/useAiAdvisor';
import { AiAdvisorPanel } from '../components/AiAdvisorPanel';
import { useQuery } from '@tanstack/react-query';
import { coursesApi } from '../api/courses';
import type { AiRecommendPayload } from '../types/ai';
import { extractErrorMessage } from '@/shared/utils/error';
import { useState } from 'react';

const { Text } = Typography;

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
  const [offeringsKeyword, setOfferingsKeyword] = useState('');

  const aiAdvisor = useAiAdvisor();
  const availabilityQuery = useQuery({
    queryKey: ['course-selection', 'offerings', 'available', 'search', offeringsKeyword],
    queryFn: () =>
      coursesApi.listAvailableOfferings({
        includeUnavailable: true,
        keyword: offeringsKeyword || undefined,
      }),
    staleTime: 30 * 1000,
  });

  const handleRecommend = async () => {
    const values = await recommendForm.validateFields().catch(() => null);
    if (!values) {
      return;
    }

    const payload: AiRecommendPayload = {
      maxRecommendations: values.maxRecommendations || 5,
    };

    aiAdvisor.recommend.mutate(payload, {
      onError: (error) => {
        message.error(extractErrorMessage(error, 'AI 推荐失败，系统将继续提供基础课程选课能力'));
      },
    });
  };

  const handleExplain = (offeringId: string) => {
    aiAdvisor.explain.mutate(
      {
        offeringId,
      },
      {
        onError: (error) => {
          message.error(extractErrorMessage(error, 'AI 解释失败'));
        },
      }
    );
  };

  const candidateCourses = availabilityQuery.data?.items || [];

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
        <Form
          form={recommendForm}
          layout="inline"
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
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={aiAdvisor.recommend.isPending}>
              生成建议
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="可解释课程清单" style={{ marginBottom: 16 }}>
        <Input.Search
          allowClear
          placeholder="按课程名称/代码搜索课程上下文"
          value={offeringsKeyword}
          onChange={(event) => setOfferingsKeyword(event.target.value)}
          onSearch={setOfferingsKeyword}
          style={{ marginBottom: 12, maxWidth: 420 }}
        />
        {availabilityQuery.isLoading ? (
          <Text type="secondary">课程列表加载中...</Text>
        ) : candidateCourses.length === 0 ? (
          <Text type="secondary">暂无可选课程，AI 解释按钮会被限制到推荐结果内。</Text>
        ) : (
          <div>
            {candidateCourses.slice(0, 6).map((course) => (
              <Space key={course.courseOfferingId} style={{ marginBottom: 8, width: '100%' }} direction="vertical">
                <Space>
                  <Text>
                    {course.courseCode} - {course.courseName}
                  </Text>
                  <Text type="secondary">[{course.status}]</Text>
                </Space>
                <Button size="small" onClick={() => handleExplain(course.courseOfferingId)}>
                  解释课程可行性
                </Button>
              </Space>
            ))}
          </div>
        )}
      </Card>

      <AiAdvisorPanel
        advice={aiAdvisor.recommend.data ?? null}
        loading={aiAdvisor.recommend.isPending}
        onExplain={(offeringId) => {
          handleExplain(offeringId);
        }}
      />

      {aiAdvisor.explain.data ? (
        <Card title="AI 课程解释" style={{ marginTop: 16 }}>
          <Text>{aiAdvisor.explain.data.explanation}</Text>
          {aiAdvisor.explain.data.disclaimer ? (
            <div style={{ marginTop: 12 }}>
              <Text type="secondary">{aiAdvisor.explain.data.disclaimer}</Text>
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card title="后处理说明" style={{ marginTop: 16 }}>
        <Text type="secondary">
          解释动作以返回的课程ID为准，最终选课仍需使用“课程选择”页面执行正式提交；AI不可用时不影响该流程（FR-C-42）。
        </Text>
      </Card>
    </div>
  );
};

export default CourseSelectionAiPage;
