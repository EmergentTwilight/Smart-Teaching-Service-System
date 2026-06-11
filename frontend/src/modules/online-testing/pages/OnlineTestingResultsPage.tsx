import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Drawer,
  Descriptions,
  Result,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import request from '@/shared/utils/request';
import { useAuthStore } from '@/shared/stores/authStore';

const { Title, Text, Paragraph } = Typography;

interface PaperResultItem {
  id: string;
  studentId: string;
  studentName: string;
  totalScore: string | null;
  status: string;
  timeSpentSeconds: number | null;
  submitTime: string | null;
}

interface TestResultItem {
  id: string;
  testPaperId: string;
  paperTitle: string;
  startTime: string;
  submitTime: string | null;
  totalScore: string | null;
  status: string;
  timeSpentSeconds: number | null;
}

interface GradedAnswer {
  testQuestionId: string;
  questionContent: string;
  studentAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  score: string;
  points: string;
}

interface ResultDetail {
  testResultId: string;
  totalScore: string;
  totalPoints: string;
  gradedCount: number;
  correctCount: number;
  timeSpentSeconds: number | null;
  answers: GradedAnswer[];
}

const OnlineTestingResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paperId = searchParams.get('paperId');
  const roles = useAuthStore((s) => s.user?.roles ?? []);
  const isStudent = roles.includes('student');
  const isTeacher = !isStudent;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TestResultItem[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<ResultDetail | null>(null);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const result = await request.get<TestResultItem[], TestResultItem[]>(
        '/online-testing/test-results/my'
      );
      setData(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载成绩失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isTeacher && paperId) {
      fetchPaperResults();
    } else if (isStudent) {
      fetchResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPaperResults = async () => {
    setLoading(true);
    try {
      const result = await request.get<PaperResultItem[], PaperResultItem[]>(
        `/online-testing/test-papers/${paperId}/results`
      );
      setData(result as unknown as TestResultItem[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载成绩失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (record: TestResultItem) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const result = await request.get<ResultDetail, ResultDetail>(
        `/online-testing/test-results/${record.id}`
      );
      setDetail(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载详情失败';
      message.error(msg);
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const formatTime = (seconds: number | null): string => {
    if (seconds == null) return '-';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const statusTag = (status: string) => {
    const map: Record<string, { color: string; label: string }> = {
      in_progress: { color: 'processing', label: '答题中' },
      submitted: { color: 'warning', label: '已提交' },
      graded: { color: 'success', label: '已评分' },
      cancelled: { color: 'default', label: '已取消' },
    };
    const item = map[status] || { color: 'default', label: status };
    return <Tag color={item.color}>{item.label}</Tag>;
  };

  const columns: ColumnsType<TestResultItem> = [
    {
      title: '试卷名称',
      dataIndex: 'paperTitle',
      key: 'paperTitle',
      ellipsis: true,
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 180,
      render: (val: string) => new Date(val).toLocaleString(),
    },
    {
      title: '提交时间',
      dataIndex: 'submitTime',
      key: 'submitTime',
      width: 180,
      render: (val: string | null) => (val ? new Date(val).toLocaleString() : '-'),
    },
    {
      title: '得分',
      dataIndex: 'totalScore',
      key: 'totalScore',
      width: 100,
      align: 'center',
      render: (val: string | null) => val ?? '-',
    },
    {
      title: '用时',
      dataIndex: 'timeSpentSeconds',
      key: 'timeSpentSeconds',
      width: 90,
      align: 'center',
      render: (val: number | null) => formatTime(val),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (val: string) => statusTag(val),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      align: 'center',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => openDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/exam/exam/${record.testPaperId}`)}
          >
            再次答题
          </Button>
        </Space>
      ),
    },
  ];

  // 教师查看某试卷成绩
  if (isTeacher && paperId) {
    const paperData = data as unknown as PaperResultItem[];
    return (
      <div className="fade-in">
        <div className="page-header">
          <Title level={2}>试卷成绩</Title>
          <Text type="secondary">查看学生答题情况</Text>
        </div>
        <Card style={{ borderRadius: 12 }}>
          <Table<PaperResultItem>
            columns={[
              { title: '学生', dataIndex: 'studentName', key: 'studentName', ellipsis: true },
              { title: '得分', dataIndex: 'totalScore', key: 'totalScore', width: 100, align: 'center', render: (v: string|null) => v ?? '-' },
              { title: '状态', dataIndex: 'status', key: 'status', width: 100, align: 'center', render: (v: string) => statusTag(v) },
              { title: '用时', dataIndex: 'timeSpentSeconds', key: 'timeSpentSeconds', width: 90, align: 'center', render: (v: number|null) => formatTime(v) },
              { title: '提交时间', dataIndex: 'submitTime', key: 'submitTime', width: 180, render: (v: string|null) => v ? new Date(v).toLocaleString() : '-' },
              {
                title: '操作', key: 'actions', width: 100, align: 'center',
                render: (_, record) => (
                  <Button type="link" size="small" icon={<FileTextOutlined />} onClick={() => openDetail({ id: record.id } as TestResultItem)}>详情</Button>
                ),
              },
            ]}
            dataSource={paperData}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: '暂无学生答卷' }}
          />
        </Card>
        <Drawer
          title="答题详情"
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          width={640}
          loading={detailLoading}
        >
          {detail && (
            <>
              <Descriptions bordered column={2} size="small" style={{ marginBottom: 24 }}>
                <Descriptions.Item label="总得分"><Text strong>{detail.totalScore} / {detail.totalPoints}</Text></Descriptions.Item>
                <Descriptions.Item label="正确率">{detail.gradedCount > 0 ? `${Math.round((detail.correctCount / detail.gradedCount) * 100)}%` : '-'}</Descriptions.Item>
                <Descriptions.Item label="对题数">{detail.correctCount} / {detail.gradedCount}</Descriptions.Item>
                <Descriptions.Item label="用时">{formatTime(detail.timeSpentSeconds)}</Descriptions.Item>
              </Descriptions>
              {detail.answers.map((ans, idx) => (
                <Card key={ans.testQuestionId} size="small" style={{ marginBottom: 12 }}
                  title={<Space>{ans.isCorrect ? <CheckCircleOutlined style={{ color: '#10b981' }} /> : <CloseCircleOutlined style={{ color: '#ef4444' }} />}<Text>第 {idx + 1} 题 ({ans.points} 分)</Text></Space>}>
                  <Paragraph>{ans.questionContent}</Paragraph>
                  <Text type="secondary">学生答案：{ans.studentAnswer || '未作答'}</Text><br />
                  <Text type={ans.isCorrect ? 'success' : 'danger'}>正确答案：{ans.correctAnswer}</Text><br />
                  <Tag color={ans.isCorrect ? 'success' : 'error'}>得分：{ans.score} / {ans.points}</Tag>
                </Card>
              ))}
            </>
          )}
        </Drawer>
      </div>
    );
  }

  // 教师/管理员未指定试卷 → 引导从试卷列表进入
  if (isTeacher && !paperId) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <Title level={2}>成绩查看</Title>
          <Text type="secondary">查看学生试卷成绩与答题详情</Text>
        </div>
        <Card style={{ borderRadius: 12 }}>
          <Result
            status="info"
            title="请从试卷列表查看成绩"
            subTitle="在试卷列表页面，点击已发布试卷旁的「成绩」按钮即可查看该试卷的学生答卷。"
            extra={
              <Button type="primary" onClick={() => navigate('/exam/papers')}>
                前往试卷列表
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <Title level={2}>我的成绩</Title>
        <Text type="secondary">查看在线测试成绩与答题详情</Text>
      </div>

      <Card style={{ borderRadius: 12 }}>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暂无答题记录' }}
        />
      </Card>

      <Drawer
        title="答题详情"
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetail(null);
        }}
        width={640}
        loading={detailLoading}
      >
        {detail && (
          <>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 24 }}>
              <Descriptions.Item label="总得分">
                <Text strong>{detail.totalScore} / {detail.totalPoints}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="正确率">
                {detail.gradedCount > 0
                  ? `${Math.round((detail.correctCount / detail.gradedCount) * 100)}%`
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="对题数">
                {detail.correctCount} / {detail.gradedCount}
              </Descriptions.Item>
              <Descriptions.Item label="用时">
                {formatTime(detail.timeSpentSeconds)}
              </Descriptions.Item>
            </Descriptions>

            {detail.answers.map((ans, idx) => (
              <Card
                key={ans.testQuestionId}
                size="small"
                style={{ marginBottom: 12 }}
                title={
                  <Space>
                    {ans.isCorrect ? (
                      <CheckCircleOutlined style={{ color: '#10b981' }} />
                    ) : (
                      <CloseCircleOutlined style={{ color: '#ef4444' }} />
                    )}
                    <Text>第 {idx + 1} 题 ({ans.points} 分)</Text>
                  </Space>
                }
              >
                <Paragraph>{ans.questionContent}</Paragraph>
                <Text type="secondary">你的答案：{ans.studentAnswer || '未作答'}</Text>
                <br />
                <Text type={ans.isCorrect ? 'success' : 'danger'}>
                  正确答案：{ans.correctAnswer}
                </Text>
                <br />
                <Tag color={ans.isCorrect ? 'success' : 'error'}>
                  得分：{ans.score} / {ans.points}
                </Tag>
              </Card>
            ))}
          </>
        )}
      </Drawer>
    </div>
  );
};

export default OnlineTestingResultsPage;