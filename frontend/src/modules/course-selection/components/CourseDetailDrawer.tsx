import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  List,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import { type FC } from 'react';
import type { CourseOfferingDetail } from '../types/course';
import { extractErrorMessage } from '@/shared/utils/error';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface CourseDetailDrawerProps {
  open: boolean;
  offeringId: string | null;
  onClose: () => void;
  loadDetail: (offeringId: string) => Promise<CourseOfferingDetail>;
}

const WEEKDAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  planned: { label: '未开课', color: 'default' },
  open: { label: '开放中', color: 'green' },
  closed: { label: '已关闭', color: 'default' },
  cancelled: { label: '已取消', color: 'red' },
};

const COURSE_TYPE_LABELS: Record<string, string> = {
  required: '专业必修课',
  elective: '专业选修课',
  general: '公共课',
};

/**
 * CourseDetailDrawer - 课程详情抽屉
 *
 * 覆盖需求：FR-C-11, FR-C-19, NFR-C-07
 * - 展示课程基本信息、教师、学期、容量、排课（FR-C-11）
 * - 展示先修课程信息（FR-C-19）
 * - 展示 eligibility 可选性及原因
 * - 不展示 roster 敏感信息（名单仅教师/教务可见）
 * - 加载失败展示明确错误并支持重试（NFR-C-07）
 */
export const CourseDetailDrawer: FC<CourseDetailDrawerProps> = ({
  open,
  offeringId,
  onClose,
  loadDetail,
}) => {
  const [detail, setDetail] = useState<CourseOfferingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!open || !offeringId) {
      setDetail(null);
      setErrorMessage('');
      return;
    }

    const fetchDetail = async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        const result = await loadDetail(offeringId);
        setDetail(result);
      } catch (error: unknown) {
        setErrorMessage(extractErrorMessage(error, '课程详情加载失败，请重试'));
      } finally {
        setLoading(false);
      }
    };

    void fetchDetail();
  }, [open, offeringId, loadDetail]);

  const handleRefresh = () => {
    if (!offeringId) return;
    setLoading(true);
    setErrorMessage('');
    loadDetail(offeringId)
      .then((result) => {
        setDetail(result);
        setLoading(false);
      })
      .catch((error: unknown) => {
        setErrorMessage(extractErrorMessage(error, '课程详情加载失败，请重试'));
        setLoading(false);
      });
  };

  const statusCfg = detail ? STATUS_LABELS[detail.status] ?? { label: detail.status, color: 'default' } : null;

  return (
    <Drawer
      title={
        <Space>
          <span>课程详情</span>
          {detail ? <Text type="secondary">({detail.course.code})</Text> : null}
        </Space>
      }
      open={open}
      width={600}
      onClose={onClose}
      extra={
        offeringId ? (
          <Button
            icon={<ReloadOutlined />}
            size="small"
            loading={loading}
            onClick={handleRefresh}
          >
            刷新
          </Button>
        ) : null
      }
    >
      {!offeringId ? (
        <Empty description="请选择课程查看详情" />
      ) : loading && !detail ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin tip="加载课程详情..." />
        </div>
      ) : errorMessage ? (
        <Alert
          type="error"
          message="课程详情加载失败"
          description={errorMessage}
          showIcon
          action={
            <Button size="small" onClick={handleRefresh}>
              重试
            </Button>
          }
        />
      ) : detail ? (
        <div>
          {/* ---- 基本信息 ---- */}
          <Card size="small" title="基本信息" style={{ marginBottom: 12 }}>
            <Descriptions size="small" column={1} colon={false}>
              <Descriptions.Item label="课程名称">
                <Text strong>{detail.course.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="课程代码">
                {detail.course.code}
              </Descriptions.Item>
              <Descriptions.Item label="课程类型">
                <Tag>
                  {COURSE_TYPE_LABELS[detail.course.courseType] ?? detail.course.courseType}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="学分">
                <Text strong>{detail.course.credits}</Text>
              </Descriptions.Item>
              {detail.course.category ? (
                <Descriptions.Item label="课程分类">{detail.course.category}</Descriptions.Item>
              ) : null}
              {detail.course.assessmentMethod ? (
                <Descriptions.Item label="考核方式">{detail.course.assessmentMethod}</Descriptions.Item>
              ) : null}
              {detail.course.description ? (
                <Descriptions.Item label="课程说明">{detail.course.description}</Descriptions.Item>
              ) : null}
            </Descriptions>
          </Card>

          {/* ---- 教师与学期 ---- */}
          <Card size="small" title="开设信息" style={{ marginBottom: 12 }}>
            <Descriptions size="small" column={1} colon={false}>
              <Descriptions.Item label="授课教师">
                {detail.teacher.realName}
                {detail.teacher.title ? (
                  <Tag style={{ marginLeft: 8 }}>{detail.teacher.title}</Tag>
                ) : null}
                {detail.teacher.teacherNumber ? (
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    ({detail.teacher.teacherNumber})
                  </Text>
                ) : null}
              </Descriptions.Item>
              <Descriptions.Item label="学期">{detail.semester.name}</Descriptions.Item>
              <Descriptions.Item label="开设状态">
                <Tag color={statusCfg?.color}>{statusCfg?.label}</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* ---- 容量与可选性 ---- */}
          <Card size="small" title="容量与可选性" style={{ marginBottom: 12 }}>
            <Descriptions size="small" column={1} colon={false}>
              <Descriptions.Item label="容量">
                <Text
                  type={
                    detail.remainingCapacity === 0
                      ? 'danger'
                      : detail.remainingCapacity < 10
                        ? 'warning'
                        : undefined
                  }
                >
                  {detail.enrolledCount} / {detail.capacity}
                </Text>
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  （剩余 {detail.remainingCapacity}）
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="是否可选">
                {detail.eligibility ? (
                  detail.eligibility.isAvailable ? (
                    <Tag color="success" icon={<CheckCircleOutlined />}>
                      可选
                    </Tag>
                  ) : (
                    <Tag color="error" icon={<CloseCircleOutlined />}>
                      不可选
                    </Tag>
                  )
                ) : (
                  <Text type="secondary">未返回可选性信息</Text>
                )}
              </Descriptions.Item>
              {detail.eligibility?.reasons && detail.eligibility.reasons.length > 0 ? (
                <Descriptions.Item label="可选性说明">
                  <List
                    size="small"
                    dataSource={detail.eligibility.reasons}
                    renderItem={(reason) => (
                      <List.Item style={{ padding: '2px 0' }}>
                        <Text type={detail.eligibility?.isAvailable ? 'secondary' : 'danger'}>
                          {detail.eligibility?.isAvailable ? (
                            <InfoCircleOutlined style={{ marginRight: 6 }} />
                          ) : (
                            <WarningOutlined style={{ marginRight: 6 }} />
                          )}
                          {reason}
                        </Text>
                      </List.Item>
                    )}
                  />
                </Descriptions.Item>
              ) : null}
            </Descriptions>
          </Card>

          {/* ---- 先修课程 ---- */}
          {detail.prerequisites.length > 0 ? (
            <Card size="small" title="先修课程" style={{ marginBottom: 12 }}>
              <List
                size="small"
                dataSource={detail.prerequisites}
                renderItem={(item) => (
                  <List.Item>
                    <Text>
                      {item.courseCode} {item.courseName}
                    </Text>
                  </List.Item>
                )}
              />
            </Card>
          ) : (
            <Card size="small" title="先修课程" style={{ marginBottom: 12 }}>
              <Text type="secondary">该课程无先修要求</Text>
            </Card>
          )}

          {/* ---- 排课信息 ---- */}
          <Card size="small" title="排课信息">
            {detail.schedules.length > 0 ? (
              <Table
                size="small"
                pagination={false}
                dataSource={detail.schedules}
                rowKey={(record) => record.id ?? `${record.dayOfWeek}-${record.startPeriod}`}
                columns={[
                  {
                    title: '星期',
                    dataIndex: 'dayOfWeek',
                    key: 'dayOfWeek',
                    width: 70,
                    render: (v: number) => WEEKDAY_NAMES[v - 1] ?? `周${v}`,
                  },
                  {
                    title: '周次',
                    key: 'weeks',
                    width: 110,
                    render: (_v: unknown, record) =>
                      `${record.startWeek}-${record.endWeek} 周`,
                  },
                  {
                    title: '节次',
                    key: 'periods',
                    width: 100,
                    render: (_v: unknown, record) =>
                      `${record.startPeriod}-${record.endPeriod} 节`,
                  },
                  {
                    title: '教室',
                    key: 'classroom',
                    render: (_v: unknown, record) => {
                      if (!record.classroom) return <Text type="secondary">未安排</Text>;
                      return [
                        record.classroom.campus,
                        record.classroom.building,
                        record.classroom.roomNumber,
                      ]
                        .filter(Boolean)
                        .join(' ');
                    },
                  },
                ]}
              />
            ) : (
              <Alert
                type="warning"
                message="该课程暂无排课信息"
                description="排课数据缺失时仍可查看课程详情，但选课前请确认上课时间。"
                showIcon
              />
            )}
          </Card>

          <Divider />
          <Text type="secondary" style={{ fontSize: 12 }}>
            数据来源：/offerings/:id。前端不缓存或篡改课程状态和容量。
          </Text>
        </div>
      ) : (
        <Empty description="课程详情数据不可用" />
      )}
    </Drawer>
  );
};
