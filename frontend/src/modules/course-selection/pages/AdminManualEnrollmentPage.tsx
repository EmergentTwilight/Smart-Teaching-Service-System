import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Descriptions, Form, Input, Select, Tag, Typography } from 'antd';
import { periodsApi } from '../api/periods';
import { useUpsertSelectionPeriod } from '../hooks/useSelectionPeriod';
import type {
  ManualEnrollmentCourseOfferingOption,
  ManualEnrollmentResult,
  ManualEnrollmentStudentOption,
} from '../types/period';
import { extractErrorMessage } from '@/shared/utils/error';

const { TextArea } = Input;
const { Text } = Typography;

const LOOKUP_PAGE_SIZE = 10;

interface ManualEnrollmentFormValues {
  studentId: string;
  courseOfferingId: string;
  reason: string;
}

type SubmitFeedback =
  | {
      type: 'success' | 'error';
      message: string;
    }
  | null;

const useDebouncedValue = (value: string, delayMs: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [delayMs, value]);

  return debouncedValue;
};

const formatStudentLabel = (student: ManualEnrollmentStudentOption) =>
  `${student.studentNumber} · ${student.realName}（${student.username}）`;

const formatOfferingLabel = (offering: ManualEnrollmentCourseOfferingOption) =>
  `${offering.courseCode} ${offering.courseName} · ${offering.semester.name} · 剩余 ${offering.remainingCapacity}`;

const mergeSelectedOption = <T, K extends keyof T>(
  items: T[],
  selected: T | null,
  idKey: K
): T[] => {
  if (!selected || items.some((item) => item[idKey] === selected[idKey])) {
    return items;
  }

  return [selected, ...items];
};

/**
 * TODO(C5, FR-C-33, FR-C-34, NFR-C-04, NFR-C-12):
 * - 页面仅提供教务手动加课入口；后端必须仍走统一事务链路，默认执行容量/重复/冲突/学分/阶段/先修检查；
 * - 任何成功/失败以服务端返回为准，不在前端伪装落库。
 */
const AdminManualEnrollmentPage: React.FC = () => {
  const [form] = Form.useForm<ManualEnrollmentFormValues>();
  const { manualEnroll } = useUpsertSelectionPeriod();
  const [submitFeedback, setSubmitFeedback] = useState<SubmitFeedback>(null);
  const [lastResult, setLastResult] = useState<ManualEnrollmentResult | null>(null);
  const [studentKeyword, setStudentKeyword] = useState('');
  const [offeringKeyword, setOfferingKeyword] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<ManualEnrollmentStudentOption | null>(null);
  const [selectedOffering, setSelectedOffering] = useState<ManualEnrollmentCourseOfferingOption | null>(null);
  const debouncedStudentKeyword = useDebouncedValue(studentKeyword.trim(), 300);
  const debouncedOfferingKeyword = useDebouncedValue(offeringKeyword.trim(), 300);

  const submitButtonDisabled = manualEnroll.isPending;
  const studentsQuery = useQuery({
    queryKey: ['course-selection', 'manual-enrollment', 'students', debouncedStudentKeyword],
    queryFn: () =>
      periodsApi.listManualEnrollmentStudents({
        keyword: debouncedStudentKeyword,
        pageSize: LOOKUP_PAGE_SIZE,
      }),
    enabled: debouncedStudentKeyword.length > 0,
    staleTime: 30 * 1000,
  });
  const offeringsQuery = useQuery({
    queryKey: ['course-selection', 'manual-enrollment', 'course-offerings', debouncedOfferingKeyword],
    queryFn: () =>
      periodsApi.listManualEnrollmentCourseOfferings({
        keyword: debouncedOfferingKeyword,
        pageSize: LOOKUP_PAGE_SIZE,
      }),
    enabled: debouncedOfferingKeyword.length > 0,
    staleTime: 30 * 1000,
  });
  const studentItems = mergeSelectedOption(
    studentsQuery.data?.items || [],
    selectedStudent,
    'studentId'
  );
  const offeringItems = mergeSelectedOption(
    offeringsQuery.data?.items || [],
    selectedOffering,
    'courseOfferingId'
  );
  const studentOptions = studentItems.map((student) => ({
    value: student.studentId,
    label: formatStudentLabel(student),
  }));
  const offeringOptions = offeringItems.map((offering) => ({
    value: offering.courseOfferingId,
    label: formatOfferingLabel(offering),
  }));

  const handleSubmitError = (error: unknown) => {
    setLastResult(null);
    setSubmitFeedback({
      type: 'error',
      message: extractErrorMessage(error, '手动加课提交失败，请重试'),
    });
  };

  const handleSubmit = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) {
      return;
    }

    setSubmitFeedback(null);
    setLastResult(null);

    manualEnroll.mutate(
      {
        studentId: values.studentId.trim(),
        courseOfferingId: values.courseOfferingId.trim(),
        reason: values.reason.trim(),
      },
      {
        onSuccess: (result) => {
          setLastResult(result);
          setSubmitFeedback({
            type: 'success',
            message: '手动加课成功。',
          });
          form.resetFields();
          setSelectedStudent(null);
          setSelectedOffering(null);
          setStudentKeyword('');
          setOfferingKeyword('');
        },
        onError: (error) => {
          handleSubmitError(error);
        },
      }
    );
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <h2>手动加课</h2>
        <Text type="secondary">当前页面作为教务加课入口，实际权限以后端教务授权校验为准。</Text>
      </div>

      <Card title="发起手动加课">
        {submitFeedback ? (
          <Alert
            message={submitFeedback.message}
            type={submitFeedback.type}
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : null}
        <Form<ManualEnrollmentFormValues>
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ reason: '' }}
        >
          <Form.Item
            name="studentId"
            label="学生"
            rules={[{ required: true, message: '请选择学生' }]}
          >
            <Select
              showSearch
              allowClear
              filterOption={false}
              placeholder="输入学生姓名、学号或用户名搜索"
              options={studentOptions}
              loading={studentsQuery.isFetching}
              notFoundContent={debouncedStudentKeyword ? '暂无匹配学生' : '请输入关键词搜索学生'}
              onSearch={setStudentKeyword}
              onClear={() => setSelectedStudent(null)}
              onChange={(value) => {
                const student = studentItems.find((item) => item.studentId === value) || null;
                setSelectedStudent(student);
              }}
              disabled={submitButtonDisabled}
            />
          </Form.Item>

          <Form.Item
            name="courseOfferingId"
            label="课程开设"
            rules={[{ required: true, message: '请选择课程开设' }]}
          >
            <Select
              showSearch
              allowClear
              filterOption={false}
              placeholder="输入课程名称、课程代码或教师姓名搜索"
              options={offeringOptions}
              loading={offeringsQuery.isFetching}
              notFoundContent={debouncedOfferingKeyword ? '暂无匹配课程开设' : '请输入关键词搜索课程'}
              onSearch={setOfferingKeyword}
              onClear={() => setSelectedOffering(null)}
              onChange={(value) => {
                const offering = offeringItems.find((item) => item.courseOfferingId === value) || null;
                setSelectedOffering(offering);
              }}
              disabled={submitButtonDisabled}
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="加课原因"
            rules={[
              { required: true, whitespace: true, message: '请填写操作原因' },
              { max: 500, message: '原因长度不能超过500字符' },
            ]}
          >
            <TextArea rows={4} placeholder="请输入具体原因，作为审计字段保留" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitButtonDisabled} disabled={submitButtonDisabled}>
              提交手动加课
            </Button>
          </Form.Item>
        </Form>

        {lastResult ? (
          <Card title="最近一次处理结果" size="small" style={{ marginTop: 16 }}>
            <Descriptions size="small" column={1} colon={false}>
              <Descriptions.Item label="Enrollment ID">{lastResult.enrollment.id}</Descriptions.Item>
              <Descriptions.Item label="学生 ID">{lastResult.enrollment.studentId}</Descriptions.Item>
              <Descriptions.Item label="课程开设 ID">{lastResult.enrollment.courseOfferingId}</Descriptions.Item>
              <Descriptions.Item label="选课状态">
                <Tag color={lastResult.enrollment.status === 'enrolled' ? 'green' : 'default'}>
                  {lastResult.enrollment.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="加课时间">{lastResult.enrollment.enrolledAt}</Descriptions.Item>
              <Descriptions.Item label="课程容量">{lastResult.courseOffering.capacity}</Descriptions.Item>
              <Descriptions.Item label="已选人数">{lastResult.courseOffering.enrolledCount}</Descriptions.Item>
              <Descriptions.Item label="剩余容量">{lastResult.courseOffering.remainingCapacity}</Descriptions.Item>
              <Descriptions.Item label="审计日志">
                <Tag color={lastResult.audit.logged ? 'green' : 'default'}>
                  {lastResult.audit.logged ? '已记录' : '未记录'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="审计动作">{lastResult.audit.action}</Descriptions.Item>
            </Descriptions>
          </Card>
        ) : null}
      </Card>
    </div>
  );
};

export default AdminManualEnrollmentPage;
