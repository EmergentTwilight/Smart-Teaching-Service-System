import { useState, useCallback } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Checkbox,
  Form,
  Input,
  message,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import type { OfferingsAvailableQuery } from '../types/course';
import { coursesApi } from '../api/courses';
import { enrollmentsApi } from '../api/enrollments';
import { useAvailableOfferings } from '../hooks/useAvailableOfferings';
import { useMyEnrollments } from '../hooks/useMyEnrollments';
import { curriculumApi } from '../api/curriculum';
import { CourseDetailDrawer } from '../components/CourseDetailDrawer';
import { CourseOfferingTable } from '../components/CourseOfferingTable';
import { CreditProgressCard } from '../components/CreditProgressCard';
import { extractErrorMessage } from '@/shared/utils/error';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface StudentCourseSelectionQuery extends OfferingsAvailableQuery {
  keyword?: string;
  teacher?: string;
  offeringStatus?: string;
}

/**
 * StudentCourseSelectionPage - 学生选课聚合页
 *
 * 覆盖需求：FR-C-04, FR-C-08 至 FR-C-23
 * - 展示培养方案上下文、可选课程列表、课程详情、本人选课（FR-C-13）
 * - 接入选课/退选 mutation，等待后端返回后刷新数据（FR-C-16, FR-C-21）
 * - 前端仅做预提示和渲染；所有容量/冲突/阶段/先修/学分最终校验由后端返回
 * - 错误原因透明展示，不做静默吞掉（NFR-C-07, NFR-C-13）
 * - 不发送 student_id，不伪造成功状态
 */
const StudentCourseSelectionPage: React.FC = () => {
  const [filterForm] = Form.useForm<StudentCourseSelectionQuery>();
  const [offeringIdInDrawer, setOfferingIdInDrawer] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [search, setSearch] = useState<StudentCourseSelectionQuery>({
    includeUnavailable: true,
    page: 1,
    pageSize: 20,
  });

  const queryClient = useQueryClient();

  const { available: availableOfferingsQuery } = useAvailableOfferings(search);

  const myEnrollmentsQuery = useMyEnrollments({ page: 1, pageSize: 100 });
  const curriculumProgressQuery = useQuery({
    queryKey: ['course-selection', 'curriculum', 'progress'],
    queryFn: () => curriculumApi.getMyCurriculumProgress({ includeDropped: false }),
  });

  const offeringRows = availableOfferingsQuery.data?.items ?? [];
  const pagination = availableOfferingsQuery.data?.pagination ?? null;

  const studentProgress = curriculumProgressQuery.data ?? null;
  const progressError = curriculumProgressQuery.isError
    ? extractErrorMessage(curriculumProgressQuery.error, '学分进展加载失败')
    : null;

  const enrollments = myEnrollmentsQuery.data?.items ?? [];
  const hasActiveEnrollments = enrollments.some((item) => item.status === 'enrolled');

  // Build a map from courseOfferingId -> enrollmentId for drop operations
  const enrollmentByOfferingId = new Map<string, string>();
  for (const e of enrollments) {
    if (e.status === 'enrolled' && e.courseOffering?.id) {
      enrollmentByOfferingId.set(e.courseOffering.id, e.enrollmentId);
    }
  }

  // ---- Invalidate related queries after mutation ----
  const invalidateSelectionData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['course-selection', 'offerings', 'available'] });
    queryClient.invalidateQueries({ queryKey: ['course-selection', 'enrollments'] });
    queryClient.invalidateQueries({ queryKey: ['course-selection', 'timetable'] });
    queryClient.invalidateQueries({ queryKey: ['course-selection', 'curriculum', 'progress'] });
  }, [queryClient]);

  // ---- Enroll mutation (FR-C-14 ~ FR-C-23) ----
  const enrollMutation = useMutation({
    mutationFn: (courseOfferingId: string) =>
      enrollmentsApi.createEnrollment({
        courseOfferingId,
        clientRequestId: `enroll-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      }),
    onSuccess: (data) => {
      message.success(
        `选课成功！已选 ${data.courseOffering.courseName}（${data.courseOffering.courseCode}）。当前已选学分：${data.creditSummary?.currentSelectedCredits ?? '—'} / ${data.creditSummary?.maxCredits ?? '—'}`
      );
      invalidateSelectionData();
    },
    onError: (error: unknown) => {
      const errMsg = extractErrorMessage(error, '选课失败，请重试');
      message.error(errMsg);
    },
    onSettled: () => {
      setEnrollingId(null);
    },
  });

  // ---- Drop mutation (FR-C-14, FR-C-21) ----
  const dropMutation = useMutation({
    mutationFn: (variables: { enrollmentId: string; offeringName: string }) =>
      enrollmentsApi.dropEnrollment(variables.enrollmentId, {
        reason: undefined,
        clientRequestId: `drop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      }),
    onSuccess: (_data, variables) => {
      message.success(`已退选 ${variables.offeringName}`);
      invalidateSelectionData();
    },
    onError: (error: unknown) => {
      const errMsg = extractErrorMessage(error, '退选失败，请重试');
      message.error(errMsg);
    },
    onSettled: () => {
      setEnrollingId(null);
    },
  });

  // ---- Enroll handler with confirmation ----
  const handleEnroll = useCallback(
    (offeringId: string) => {
      const offering = offeringRows.find((r) => r.courseOfferingId === offeringId);
      const courseLabel = offering
        ? `${offering.courseName}（${offering.courseCode}）`
        : offeringId;

      Modal.confirm({
        title: '确认选课',
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>
              确认选择课程：<Text strong>{courseLabel}</Text>
            </p>
            <p>
              学分：{offering?.credits ?? '—'} | 教师：
              {offering?.teacherName ?? '—'}
            </p>
            <Alert
              type="warning"
              message="温馨提示"
              description="选课结果取决于当前选课阶段、课程容量、时间冲突、先修课程和学分上限等条件，提交后请留意系统反馈。"
              showIcon
              style={{ marginTop: 8 }}
            />
          </div>
        ),
        okText: '确认选课',
        cancelText: '取消',
        onOk: () => {
          setEnrollingId(offeringId);
          enrollMutation.mutate(offeringId);
        },
      });
    },
    [offeringRows, enrollMutation]
  );

  // ---- Drop handler with confirmation ----
  const handleDrop = useCallback(
    ({ offeringId }: { offeringId: string }) => {
      const enrollmentId = enrollmentByOfferingId.get(offeringId);
      if (!enrollmentId) {
        message.error('未找到对应的选课记录，无法退选');
        return;
      }

      const offering = offeringRows.find((r) => r.courseOfferingId === offeringId);
      const courseLabel = offering
        ? `${offering.courseName}（${offering.courseCode}）`
        : offeringId;

      Modal.confirm({
        title: '确认退选',
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>
              确认退选课程：<Text strong>{courseLabel}</Text>
            </p>
            <Alert
              type="warning"
              message="退选后将释放课程名额"
              description="退选后如需重新选课，需再次提交选课申请并通过校验。"
              showIcon
              style={{ marginTop: 8 }}
            />
          </div>
        ),
        okText: '确认退选',
        okButtonProps: { danger: true },
        cancelText: '取消',
        onOk: () => {
          setEnrollingId(offeringId);
          dropMutation.mutate({ enrollmentId, offeringName: courseLabel });
        },
      });
    },
    [offeringRows, enrollmentByOfferingId, dropMutation]
  );

  // ---- Pagination handler ----
  const handlePageChange = useCallback(
    (page: number, pageSize: number) => {
      setSearch((prev) => ({ ...prev, page, pageSize }));
    },
    []
  );

  // ---- Search / Reset ----
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
      includeUnavailable: prev.includeUnavailable ?? true,
      page: 1,
      pageSize: prev.pageSize || 20,
    }));
  };

  const loadOfferingDetail = async (id: string) => {
    return coursesApi.getOfferingDetail(id);
  };

  const offeringTableLoading = availableOfferingsQuery.isLoading || availableOfferingsQuery.isFetching;

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>
          学生选课
        </Title>
        <Text type="secondary">
          搜索并选择本学期课程，系统将自动校验选课条件。
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title="课程筛选"
            extra={
              hasActiveEnrollments ? (
                <Tag color="success">当前已有选课记录，可继续补选</Tag>
              ) : undefined
            }
            styles={{ body: { padding: 24 } }}
          >
            <Form
              form={filterForm}
              layout="inline"
              onFinish={handleSearch}
              initialValues={{ includeUnavailable: true }}
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
                <Select
                  placeholder="课程类型"
                  style={{ width: 160 }}
                  allowClear
                >
                  <Select.Option value="required">必修</Select.Option>
                  <Select.Option value="elective">选修</Select.Option>
                  <Select.Option value="general">公共课</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="offeringStatus" style={{ minWidth: 160 }}>
                <Select placeholder="课程状态" allowClear>
                  <Select.Option value="open">开放</Select.Option>
                  <Select.Option value="planned">未开课</Select.Option>
                  <Select.Option value="closed">已关闭</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="includeUnavailable" valuePropName="checked">
                <Checkbox>包含不可选课程</Checkbox>
              </Form.Item>
              <Space>
                <Button type="primary" onClick={handleSearch}>
                  查询
                </Button>
                <Button onClick={resetSearch}>重置</Button>
              </Space>
            </Form>

            {/* ---- Error alert for offerings query ---- */}
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
              <CourseOfferingTable
                offerings={offeringRows}
                loading={offeringTableLoading}
                pagination={pagination}
                onPageChange={handlePageChange}
                onEnroll={handleEnroll}
                onDrop={handleDrop}
                onViewDetail={setOfferingIdInDrawer}
                enrollLoading={enrollingId}
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <CreditProgressCard
            progress={studentProgress}
            loading={curriculumProgressQuery.isLoading}
            error={progressError}
          />

          <Card title="选课说明" style={{ marginTop: 16 }}>
            <Alert
              type="info"
              message="选课须知"
              description={
                <div>
                  <p>选课时系统会自动检查课程容量、上课时间、先修课程和学分上限。</p>
                  <p style={{ marginBottom: 0 }}>
                    选课结果以系统返回为准，成功后数据自动刷新。
                  </p>
                </div>
              }
            />
          </Card>

          {/* ---- My current enrollments summary ---- */}
          <Card title="我的当前选课" style={{ marginTop: 16 }}>
            {myEnrollmentsQuery.isLoading ? (
              <Text type="secondary">加载中...</Text>
            ) : myEnrollmentsQuery.isError ? (
              <Alert
                type="error"
                message="选课记录加载失败"
                description={extractErrorMessage(
                  myEnrollmentsQuery.error,
                  '加载选课记录失败'
                )}
                showIcon
              />
            ) : enrollments.length === 0 ? (
              <Empty description="暂无选课记录，请从课程列表发起选课" />
            ) : (
              <>
                {myEnrollmentsQuery.data?.summary ? (
                  <div style={{ marginBottom: 12 }}>
                    <Text>
                      已选{' '}
                      <Text strong>
                        {myEnrollmentsQuery.data.summary.enrolledCount}
                      </Text>{' '}
                      门课，合计{' '}
                      <Text strong>
                        {myEnrollmentsQuery.data.summary.enrolledCredits}
                      </Text>{' '}
                      学分
                    </Text>
                  </div>
                ) : null}
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {enrollments.map((item) => (
                    <li key={item.enrollmentId} style={{ marginBottom: 6 }}>
                      <Text>
                        {item.courseOffering.courseName}（{item.courseOffering.courseCode}）
                      </Text>
                      <Tag
                        color={item.status === 'enrolled' ? 'green' : 'default'}
                        style={{ marginLeft: 8 }}
                      >
                        {item.status === 'enrolled'
                          ? '已选'
                          : item.status === 'dropped'
                            ? '已退选'
                            : item.status}
                      </Tag>
                      <Text type="secondary" style={{ marginLeft: 4 }}>
                        {item.courseOffering.credits} 学分
                      </Text>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </Col>
      </Row>

      <CourseDetailDrawer
        open={Boolean(offeringIdInDrawer)}
        offeringId={offeringIdInDrawer}
        onClose={() => setOfferingIdInDrawer(null)}
        loadDetail={loadOfferingDetail}
      />
    </div>
  );
};

export default StudentCourseSelectionPage;
