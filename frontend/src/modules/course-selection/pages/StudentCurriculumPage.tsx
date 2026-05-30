import { Alert, Card, Col, Empty, List, Row, Spin, Tag, Typography } from 'antd';
import { curriculumApi } from '../api/curriculum';
import type { CurriculumCourseGroup } from '../types/curriculum';
import { CreditProgressCard } from '../components/CreditProgressCard';
import { extractErrorMessage, getErrorStatus } from '@/shared/utils/error';
import { useQuery } from '@tanstack/react-query';
import { ExclamationCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const EMPTY_COURSE_GROUPS: CurriculumCourseGroup[] = [];

const COURSE_TYPE_LABELS: Record<string, string> = {
  required: '专业必修课',
  elective: '专业选修课',
  general: '公共课',
};

/**
 * StudentCurriculumPage - 我的培养方案页面
 *
 * 覆盖需求：FR-C-01 至 FR-C-07
 * - 展示学生当前培养方案、课程分组与建议修读学期（FR-C-01, FR-C-02）
 * - 展示确认流程状态，前端只接收后端返回的确认结果（FR-C-04）
 * - 课程类型与课程列表与后端字段一致（FR-C-02）
 * - 无匹配培养方案时展示明确错误（FR-C-06）
 * - 学分进展展示由 CreditProgressCard 驱动（FR-C-05）
 */
const StudentCurriculumPage: React.FC = () => {
  const includeCourses = true;

  const curriculumQuery = useQuery({
    queryKey: ['course-selection', 'curriculum', 'me', { includeCourses }],
    queryFn: () => curriculumApi.getMyCurriculum({ includeCourses }),
    retry: (failureCount, error) => {
      // 422 means no matching curriculum, no need to retry
      if (getErrorStatus(error) === 422) return false;
      return failureCount < 2;
    },
  });

  const progressQuery = useQuery({
    queryKey: ['course-selection', 'curriculum', 'progress'],
    queryFn: () => curriculumApi.getMyCurriculumProgress(),
    retry: (failureCount, error) => {
      if (getErrorStatus(error) === 422) return false;
      return failureCount < 2;
    },
  });

  const curriculum = curriculumQuery.data?.curriculum ?? null;
  const courseGroups = curriculumQuery.data?.courseGroups ?? EMPTY_COURSE_GROUPS;
  const confirmation = curriculumQuery.data?.confirmation ?? null;
  const progress = progressQuery.data ?? null;

  const curriculumError = curriculumQuery.isError
    ? extractErrorMessage(curriculumQuery.error, '培养方案加载失败')
    : null;

  const progressError = progressQuery.isError
    ? extractErrorMessage(progressQuery.error, '学分进展加载失败')
    : null;

  // --- loading state ---
  if (curriculumQuery.isLoading) {
    return (
      <div className="fade-in" style={{ textAlign: 'center', padding: 48 }}>
        <Spin tip="加载培养方案..." />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>
          我的培养方案
        </Title>
        <Text type="secondary">
          查看您的培养方案、课程安排与学分要求。
        </Text>
      </div>

      {/* ---- 培养方案匹配错误（如 422 无匹配培养方案） ---- */}
      {curriculumError && !curriculum ? (
        <Alert
          type="error"
          message="无法获取培养方案"
          description={
            <div>
              <Paragraph>{curriculumError}</Paragraph>
              <Paragraph type="secondary">
                可能原因：当前学生未关联专业/年级，或系统尚未配置对应的培养方案。请联系教务管理员确认。
              </Paragraph>
            </div>
          }
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}

      {/* ---- 确认状态提示 ---- */}
      {confirmation && !confirmation.confirmed ? (
        <Alert
          type="info"
          icon={<InfoCircleOutlined />}
          message="培养方案待确认"
          description={
            confirmation.message ?? '请先查看并确认培养方案后再进入正式选课流程。'
          }
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              curriculum
                ? `${curriculum.name}（${curriculum.major.name}）`
                : '培养方案'
            }
            extra={
              curriculum ? (
                <Tag color="blue">年度：{curriculum.year}</Tag>
              ) : null
            }
          >
            {curriculum ? (
              <>
                {courseGroups.length > 0 ? (
                  <List
                    size="small"
                    dataSource={courseGroups}
                    renderItem={(group) => (
                      <List.Item>
                        <div style={{ width: '100%' }}>
                          <Text strong style={{ fontSize: 15 }}>
                            {group.courseTypeName ??
                              COURSE_TYPE_LABELS[group.courseType] ??
                              group.courseType}
                          </Text>
                          {includeCourses ? (
                            <List
                              size="small"
                              dataSource={group.courses}
                              locale={{ emptyText: '该分类下暂无课程' }}
                              style={{ marginTop: 4 }}
                              renderItem={(course) => (
                                <List.Item>
                                  <div
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      width: '100%',
                                    }}
                                  >
                                    <span>
                                      <Text>
                                        {course.courseCode} {course.courseName}
                                      </Text>
                                      {course.status === 'archived' ? (
                                        <Tag color="default" style={{ marginLeft: 8 }}>
                                          已归档
                                        </Tag>
                                      ) : null}
                                    </span>
                                    <span>
                                      <Text type="secondary">{course.credits} 学分</Text>
                                      {course.semesterSuggestion ? (
                                        <Text
                                          type="secondary"
                                          style={{ marginLeft: 12 }}
                                        >
                                          建议第 {course.semesterSuggestion} 学期
                                        </Text>
                                      ) : null}
                                    </span>
                                  </div>
                                </List.Item>
                              )}
                            />
                          ) : (
                            <Text type="secondary" style={{ marginLeft: 8 }}>
                              已关闭课程明细展示
                            </Text>
                          )}
                        </div>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="该培养方案暂无课程分组数据" />
                )}
              </>
            ) : (
              <Empty description="未返回培养方案数据">
                <Text type="secondary">
                  当前暂无可匹配的培养方案，请联系教务管理员确认您的专业和年级信息。
                </Text>
              </Empty>
            )}
            <div style={{ marginTop: 12 }}>
              <Text type="secondary">
                培养方案数据由学校教务系统统一维护。
              </Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <CreditProgressCard
            progress={progress}
            loading={progressQuery.isLoading}
            error={progressError}
          />

          <Card title="学分要求" style={{ marginTop: 16 }}>
            {curriculum ? (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <Text>总学分要求：</Text>
                  <Text strong>{curriculum.totalCredits}</Text>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <Text>必修学分：</Text>
                  <Text strong>
                    {curriculum.requiredCredits != null
                      ? curriculum.requiredCredits
                      : '未配置'}
                  </Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>选修学分：</Text>
                  <Text strong>
                    {curriculum.electiveCredits != null
                      ? curriculum.electiveCredits
                      : '未配置'}
                  </Text>
                </div>
              </div>
            ) : (
              <Alert
                type="warning"
                icon={<ExclamationCircleOutlined />}
                message="当前学生暂无可匹配培养方案"
                description="请确认专业和年级信息已正确录入。"
                showIcon
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StudentCurriculumPage;
