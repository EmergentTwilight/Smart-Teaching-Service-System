import { useMemo } from 'react';
import { Card, Col, Empty, List, Row, Spin, Tag, Typography } from 'antd';
import { curriculumApi } from '../api/curriculum';
import type { CurriculumCourseItem } from '../types/curriculum';
import { CreditProgressCard } from '../components/CreditProgressCard';
import { useQuery } from '@tanstack/react-query';

const { Title, Text } = Typography;
const EMPTY_COURSE_GROUPS: CurriculumCourseItem[] = [];

/**
 * TODO(C1, FR-C-01, FR-C-02, FR-C-04, FR-C-05):
 * - 显示学生当前培养方案、课程组与建议修读阶段；
 * - “确认”流程需与后台联动（前端只接收确认结果，不做越权或替代校验）；
 * - 课程类型（必修/选修/公共课）展示与课程列表应与后端字段一致。
 */
const StudentCurriculumPage: React.FC = () => {
  const includeCourses = true;

  const curriculumQuery = useQuery({
    queryKey: ['course-selection', 'curriculum', 'me', { includeCourses }],
    queryFn: () => curriculumApi.getMyCurriculum({ includeCourses }),
  });

  const progressQuery = useQuery({
    queryKey: ['course-selection', 'curriculum', 'progress'],
    queryFn: () => curriculumApi.getMyCurriculumProgress(),
  });

  const curriculum = curriculumQuery.data?.curriculum;
  const courseGroups = curriculumQuery.data?.courseGroups ?? EMPTY_COURSE_GROUPS;
  const progress = progressQuery.data?.progress || null;

  const groupedCourses = useMemo(() => {
    const grouped = new Map<string, CurriculumCourseItem[]>();
    for (const course of courseGroups) {
      const key = course.courseType || 'GENERAL';
      const list = grouped.get(key) || [];
      grouped.set(key, [...list, course]);
    }
    return grouped;
  }, [courseGroups]);

  const renderGroupTitle = (type: string) =>
    ({
      REQUIRED: '专业必修',
      ELECTIVE: '专业选修',
      GENERAL: '公共课程',
    })[type] || type;

  if (curriculumQuery.isLoading || progressQuery.isLoading) {
    return (
      <div className="fade-in">
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
        <Text type="secondary">页面用于查看培养方案与学分结构，不进行后端可选课程计算。</Text>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title={curriculum ? `${curriculum.name}（${curriculum.majorName}）` : '培养方案'}
            extra={
              <Tag color={curriculum ? 'blue' : 'default'}>
                {curriculum ? `年度：${curriculum.year}` : '待加载'}
              </Tag>
            }
          >
            {curriculum ? (
              <List
                size="small"
                dataSource={Array.from(groupedCourses.entries())}
                renderItem={([type, courses]) => (
                  <List.Item>
                    <div style={{ width: '100%' }}>
                      <Text strong>{renderGroupTitle(type)}</Text>
                      {includeCourses ? (
                        <List
                          size="small"
                          dataSource={courses}
                          renderItem={(course) => (
                            <List.Item>
                              <Text>
                                {course.courseCode} {course.courseName}
                              </Text>
                              <Text type="secondary" style={{ marginLeft: 8 }}>
                                {course.credits} 学分
                              </Text>
                              {course.semesterSuggestion ? (
                                <Text type="secondary" style={{ marginLeft: 8 }}>
                                  建议学期：{course.semesterSuggestion}
                                </Text>
                              ) : null}
                            </List.Item>
                          )}
                        />
                      ) : (
                        <Text type="secondary">已关闭课程明细展示</Text>
                      )}
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="未返回培养方案数据" />
            )}
            <Text type="secondary">
              注：培养方案来源于系统主数据，C 组不维护课程与专业数据副本（FR-C-07）。
            </Text>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <CreditProgressCard progress={progress} />
          <Card title="学分要求" style={{ marginTop: 16 }}>
            {curriculum ? (
              <div>
                <Text>总学分要求：</Text>
                <Text strong style={{ marginLeft: 4 }}>
                  {curriculum.totalCredits}
                </Text>
                <br />
                <Text>必修学分：</Text>
                <Text strong style={{ marginLeft: 4 }}>
                  {curriculum.requiredCredits ?? '未配置'}
                </Text>
                <br />
                <Text>选修学分：</Text>
                <Text strong style={{ marginLeft: 4 }}>
                  {curriculum.electiveCredits ?? '未配置'}
                </Text>
              </div>
            ) : (
              <Text type="secondary">当前学生暂无可匹配培养方案（FR-C-06）。</Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StudentCurriculumPage;
