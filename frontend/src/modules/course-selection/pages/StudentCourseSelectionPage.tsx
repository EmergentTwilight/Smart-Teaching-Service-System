import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Checkbox,
  Form,
  Input,
  Row,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import type { OfferingsAvailableQuery } from '../types/course';
import { coursesApi } from '../api/courses';
import { useAvailableOfferings } from '../hooks/useAvailableOfferings';
import { useMyEnrollments } from '../hooks/useMyEnrollments';
import { curriculumApi } from '../api/curriculum';
import { CourseDetailDrawer } from '../components/CourseDetailDrawer';
import { CourseOfferingTable } from '../components/CourseOfferingTable';
import { CreditProgressCard } from '../components/CreditProgressCard';
import { extractErrorMessage } from '@/shared/utils/error';
import { useQuery } from '@tanstack/react-query';

const { Text } = Typography;

interface StudentCourseSelectionQuery extends OfferingsAvailableQuery {
  keyword?: string;
  teacher?: string;
  offeringStatus?: string;
}

/**
 * TODO(C1, C2, C3, FR-C-04, FR-C-13, FR-C-16, FR-C-22, NFR-C-07, NFR-C-13):
 * - 学生课程选择页聚合培养方案确认状态、课程搜索、可选列表、课程详情、选课结果展示；
 * - 前端仅做查询参数提示与渲染，所有容量/冲突/阶段等最终校验必须由后端服务返回；
 * - 错误原因须在失败响应中透明展示，不做静默吞吐。
 */
const StudentCourseSelectionPage: React.FC = () => {
  const [filterForm] = Form.useForm<StudentCourseSelectionQuery>();
  const [offeringIdInDrawer, setOfferingIdInDrawer] = useState<string | null>(null);
  const [search, setSearch] = useState<StudentCourseSelectionQuery>({
    onlyAvailable: true,
    includeConflictReasons: true,
    page: 1,
    pageSize: 20,
  });

  const {
    available: availableOfferingsQuery,
    enroll: enrollMutation,
    drop: dropMutation,
  } = useAvailableOfferings(search);

  const myEnrollmentsQuery = useMyEnrollments({ page: 1, pageSize: 20 });
  const curriculumProgressQuery = useQuery({
    queryKey: ['course-selection', 'curriculum', 'progress'],
    queryFn: () => curriculumApi.getMyCurriculumProgress({ includeDropped: false }),
  });

  const offeringRows = availableOfferingsQuery.data?.items || [];

  const studentProgress = curriculumProgressQuery.data?.progress ?? null;

  const enrollments = myEnrollmentsQuery.data?.items || [];
  const hasActiveEnrollments = enrollments.some((item) => item.status === 'ENROLLED');

  const handleSearch = async () => {
    const values = await filterForm.validateFields().catch(() => null);
    if (!values) {
      return;
    }

    setSearch({
      ...search,
      ...values,
      page: 1,
    });
  };

  const resetSearch = () => {
    filterForm.resetFields();
    setSearch((prev) => ({
      onlyAvailable: prev.onlyAvailable,
      includeConflictReasons: prev.includeConflictReasons,
      page: 1,
      pageSize: prev.pageSize || 20,
    }));
  };

  const loadOfferingDetail = async (id: string) => {
    return coursesApi.getOfferingDetail(id);
  };

  const handleEnroll = (offeringId: string) => {
    enrollMutation.mutate(offeringId, {
      onSuccess: () => {
        void curriculumProgressQuery.refetch();
        void message.success('选课请求已提交，等待后端校验返回结果');
      },
      onError: (error) => {
        message.error(extractErrorMessage(error, '选课失败，请重试'));
      },
    });
  };

  // TODO(C4, FR-C-24): 当前仅作为教学性展示，退课入口应复用学生“我的结果/课表”页执行
  const handleDrop = (enrollmentId: string) => {
    dropMutation.mutate(
      { enrollmentId },
      {
        onSuccess: () => {
          void message.success('退课请求已提交');
        },
        onError: (error) => {
          message.error(extractErrorMessage(error, '退课失败，请重试'));
        },
      }
    );
  };

  const offeringTableLoading = availableOfferingsQuery.isLoading;
  const courseOfferingTable = useMemo(
    () => (
      <CourseOfferingTable
        offerings={offeringRows}
        loading={offeringTableLoading}
        onEnroll={handleEnroll}
        onViewDetail={setOfferingIdInDrawer}
      />
    ),
    [offeringRows, offeringTableLoading]
  );

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: 24 }}>
          学生选课
        </Text>
        <Text type="secondary">仅支持查看与本人身份相关且经过系统校验后的结果。</Text>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title="课程筛选"
            extra={
              hasActiveEnrollments ? <Text type="success">当前已有选课记录，可继续补选</Text> : undefined
            }
            styles={{ body: { padding: 24 } }}
          >
            <Form
              form={filterForm}
              layout="inline"
              onFinish={handleSearch}
              initialValues={{ onlyAvailable: true, includeConflictReasons: true }}
            >
              <Form.Item name="keyword" style={{ minWidth: 220 }}>
                <Input
                  placeholder="课程名称/代码/关键字"
                  allowClear
                  onPressEnter={() => handleSearch()}
                />
              </Form.Item>
              <Form.Item name="teacher">
                <Input placeholder="教师姓名/工号" allowClear />
              </Form.Item>
              <Form.Item name="courseType">
                <Select placeholder="课程类型" style={{ width: 160 }} allowClear>
                  <Select.Option value="REQUIRED">必修</Select.Option>
                  <Select.Option value="ELECTIVE">选修</Select.Option>
                  <Select.Option value="GENERAL">公共课</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="offeringStatus" style={{ minWidth: 160 }}>
                <Select placeholder="课程状态" allowClear>
                  <Select.Option value="OPEN">开放</Select.Option>
                  <Select.Option value="PLANNED">未开课</Select.Option>
                  <Select.Option value="CLOSED">已关闭</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="onlyAvailable" valuePropName="checked">
                <Checkbox>仅显示可选</Checkbox>
              </Form.Item>
              <Space>
                <Button type="primary" onClick={handleSearch}>
                  查询
                </Button>
                <Button onClick={resetSearch}>重置</Button>
              </Space>
            </Form>

            <div style={{ marginTop: 16 }}>
              {courseOfferingTable}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <CreditProgressCard progress={studentProgress} />

          <Card title="选课说明" style={{ marginTop: 16 }}>
            <Alert
              type="info"
              message="选课事务边界"
              description="前端仅展示课程与提示，选课/退课最终规则（阶段、容量、冲突、先修、学分）由后端统一校验，失败将返回精确原因。"
            />
          </Card>
        </Col>
      </Row>

      <CourseDetailDrawer
        open={Boolean(offeringIdInDrawer)}
        offeringId={offeringIdInDrawer}
        onClose={() => setOfferingIdInDrawer(null)}
        loadDetail={loadOfferingDetail}
      />

      {availableOfferingsQuery.isError ? (
        <Alert
          message="课程列表加载失败"
          description={extractErrorMessage(
            availableOfferingsQuery.error,
            '加载可选课程列表失败，请稍后重试'
          )}
          type="error"
          showIcon
          style={{ marginTop: 16 }}
        />
      ) : null}
      <div style={{ marginTop: 16 }}>
        <Card title="我的当前选课（仅用于上下文展示）">
          {myEnrollmentsQuery.isLoading ? (
            <Text type="secondary">加载中...</Text>
          ) : enrollments.length === 0 ? (
            <Empty description="暂无选课记录，先从课程列表发起选课" />
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {enrollments.slice(0, 4).map((item) => (
                <li key={item.id}>
                  {item.offering.courseName}（{item.status}）
                  {item.status === 'ENROLLED' ? (
                    <Button
                      size="small"
                      style={{ marginLeft: 8 }}
                      onClick={() => handleDrop(item.id)}
                    >
                      退课
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

export default StudentCourseSelectionPage;
