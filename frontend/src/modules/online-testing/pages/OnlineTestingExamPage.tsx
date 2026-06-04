import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Descriptions,
  Modal,
  Progress,
  Radio,
  Result,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  ClockCircleOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import request from '@/shared/utils/request';
import { useAuthStore } from '@/shared/stores/authStore';

const { Title, Text, Paragraph } = Typography;

// ---- 类型定义 ----

type QuestionType = 'singleChoice' | 'multiChoice' | 'trueFalse';

interface ExamOption {
  id: string;
  optionText: string;
  optionOrder: number;
}

interface ExamQuestion {
  testQuestionId: string;
  questionId: string;
  questionType: QuestionType;
  content: string;
  points: string;
  orderNum: number;
  options: ExamOption[];
}

interface StartExamData {
  paperTitle: string;
  durationMinutes: number;
  questionCount: number;
  totalPoints: string;
  questions: ExamQuestion[];
  startTime: string;
  testResultId: string;
  remainingSeconds?: number;
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

interface SubmitResult {
  testResultId: string;
  totalScore: string;
  totalPoints: string;
  gradedCount: number;
  correctCount: number;
  timeSpentSeconds: number | null;
  answers: GradedAnswer[];
}

const OnlineTestingExamPage: React.FC = () => {
  const { paperId } = useParams<{ paperId: string }>();
  const navigate = useNavigate();
  const roles = useAuthStore((s) => s.user?.roles ?? []);

  const [loading, setLoading] = useState(false);
  const [examData, setExamData] = useState<StartExamData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [phase, setPhase] = useState<'idle' | 'exam' | 'finished'>('idle');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isStudent = roles.includes('student');

  // 计算结束时间
  const endTime = useMemo(() => {
    if (!examData) return 0;
    return Date.now() + timeLeft * 1000;
  }, [examData, timeLeft]);

  // 倒计时
  useEffect(() => {
    if (phase !== 'exam' || timeLeft <= 0) return;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        message.warning('考试时间已到，系统将自动交卷');
        handleSubmit();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, endTime]);

  // 开始答题
  const handleStart = useCallback(async () => {
    if (!paperId) return;
    setLoading(true);
    try {
      const data = await request.post<StartExamData, StartExamData>(
        `/online-testing/test-papers/${paperId}/start`
      );
      setExamData(data);
      setTimeLeft(data.remainingSeconds ?? data.durationMinutes * 60);
      // 恢复之前的暂存答案
      try {
        const raw = sessionStorage.getItem(draftKey);
        if (raw) {
          const draft = JSON.parse(raw);
          if (draft.testResultId === data.testResultId && draft.answers) {
            setAnswers(draft.answers);
          }
        }
      } catch { /* ignore */ }
      setPhase('exam');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '开始答题失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [paperId]);

  // sessionStorage 暂存 key
  const draftKey = `exam_draft_${paperId}`;

  // 保存答案到 sessionStorage
  const persistAnswers = (next: Record<string, string>) => {
    if (!examData) return;
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({
        testResultId: examData.testResultId,
        answers: next,
        timeLeft,
      }));
    } catch { /* ignore quota */ }
  };

  // 更新答案（同步写 sessionStorage）
  const handleAnswerChange = (testQuestionId: string, value: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [testQuestionId]: value };
      persistAnswers(next);
      return next;
    });
  };

  // 已答题数
  const answeredCount = useMemo(() => {
    return Object.keys(answers).filter((k) => answers[k] && answers[k].length > 0).length;
  }, [answers]);

  // 提交答案
  const handleSubmit = useCallback(async () => {
    if (!examData || submitting) return;
    setSubmitting(true);
    try {
      const answerList = examData.questions.map((q) => ({
        testQuestionId: q.testQuestionId,
        studentAnswer: answers[q.testQuestionId] || null,
      }));
      const result = await request.post<SubmitResult, SubmitResult>(
        `/online-testing/test-results/${examData.testResultId}/submit`,
        { answers: answerList }
      );
      setSubmitResult(result);
      setPhase('finished');
      sessionStorage.removeItem(draftKey);
      message.success('交卷成功');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '交卷失败';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  }, [examData, answers, submitting]);

  const unansweredCount = (examData?.questionCount ?? 0) - answeredCount;

  const handleOpenConfirm = () => {
    setConfirmOpen(true);
  };
  const handleConfirmOk = () => {
    setConfirmOpen(false);
    handleSubmit();
  };

  // 格式化倒计时
  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // 阶段：空闲
  if (phase === 'idle') {
    return (
      <div className="fade-in">
        <div className="page-header">
          <Title level={2}>在线答题</Title>
          <Text type="secondary">确认信息无误后点击开始答题</Text>
        </div>
        <Card style={{ borderRadius: 12, maxWidth: 600, margin: '0 auto' }}>
          {!isStudent ? (
            <Result
              status="403"
              title="无权访问"
              subTitle="只有学生可以参与在线答题"
              extra={
                <Button type="primary" onClick={() => navigate('/')}>
                  返回首页
                </Button>
              }
            />
          ) : (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <FileTextOutlined style={{ fontSize: 48, color: '#6366f1', marginBottom: 16 }} />
                <Title level={4}>准备开始答题</Title>
                <Paragraph type="secondary">
                  点击下方按钮后开始计时，请在规定时间内完成作答
                </Paragraph>
              </div>
              <Button
                type="primary"
                size="large"
                block
                loading={loading}
                onClick={handleStart}
              >
                开始答题
              </Button>
            </Space>
          )}
        </Card>
      </div>
    );
  }

  // 阶段：已完成
  if (phase === 'finished' && submitResult) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <Title level={2}>答题结果</Title>
          <Text type="secondary">{examData?.paperTitle}</Text>
        </div>
        <Card style={{ borderRadius: 12, marginBottom: 16 }}>
          <Result
            status={Number(submitResult.totalScore) >= Number(submitResult.totalPoints) * 0.6 ? 'success' : 'info'}
            title={`得分 ${submitResult.totalScore} / ${submitResult.totalPoints}`}
            subTitle={`答对 ${submitResult.correctCount} / ${submitResult.gradedCount} 题`}
          >
            <Descriptions bordered column={3} size="small">
              <Descriptions.Item label="总分">{submitResult.totalScore} / {submitResult.totalPoints}</Descriptions.Item>
              <Descriptions.Item label="正确率">
                {submitResult.gradedCount > 0
                  ? `${Math.round((submitResult.correctCount / submitResult.gradedCount) * 100)}%`
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="用时">
                {submitResult.timeSpentSeconds != null
                  ? formatTime(submitResult.timeSpentSeconds)
                  : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Result>
        </Card>

        <Card title="每题详情" style={{ borderRadius: 12 }}>
          {submitResult.answers.map((ans, idx) => (
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
                  <Tag color={ans.isCorrect ? 'success' : 'error'}>
                    {ans.isCorrect ? `+${ans.score}` : '0'}
                  </Tag>
                </Space>
              }
            >
              <Paragraph>{ans.questionContent}</Paragraph>
              <Text type="secondary">你的答案：{ans.studentAnswer || '未作答'}</Text>
              <br />
              <Text type="success">正确答案：{ans.correctAnswer}</Text>
            </Card>
          ))}
        </Card>

        <Space style={{ marginTop: 16 }}>
          <Button type="primary" onClick={() => navigate('/exam/results')}>
            查看所有成绩
          </Button>
          <Button onClick={() => navigate('/exam/papers')}>返回试卷列表</Button>
        </Space>
      </div>
    );
  }

  // 阶段：答题中
  return (
    <div className="fade-in">
      <Card
        style={{
          borderRadius: 12,
          position: 'sticky',
          top: 0,
          zIndex: 10,
          marginBottom: 16,
          background: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              {examData?.paperTitle}
            </Title>
            <Tag color="blue">{examData?.questionCount} 题</Tag>
            <Tag color="purple">{examData?.totalPoints} 分</Tag>
          </Space>
          <Space size="large">
            <Statistic
              value={formatTime(timeLeft)}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: timeLeft < 300 ? '#ef4444' : '#6366f1', fontSize: 20 }}
            />
            <Progress
              type="circle"
              percent={examData ? Math.round((answeredCount / examData.questionCount) * 100) : 0}
              size={48}
              format={() => `${answeredCount}/${examData?.questionCount}`}
            />
          </Space>
        </Space>
      </Card>

      {examData?.questions.map((q, idx) => (
        <Card
          key={q.testQuestionId}
          style={{ borderRadius: 12, marginBottom: 16 }}
          title={
            <Space>
              <Tag>{idx + 1}</Tag>
              <Text strong>{q.content}</Text>
              <Tag
                color={
                  q.questionType === 'singleChoice'
                    ? 'blue'
                    : q.questionType === 'multiChoice'
                    ? 'orange'
                    : 'green'
                }
              >
                {q.questionType === 'singleChoice'
                  ? '单选'
                  : q.questionType === 'multiChoice'
                  ? '多选'
                  : '判断'}
              </Tag>
              <Text type="secondary">({q.points} 分)</Text>
            </Space>
          }
        >
          {q.questionType === 'multiChoice' ? (
            <Checkbox.Group
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              value={answers[q.testQuestionId]
                ? answers[q.testQuestionId].split(',').map(Number)
                : []}
              onChange={(checkedValues: number[]) =>
                setAnswers((prev) => {
                  const next = { ...prev, [q.testQuestionId]: checkedValues.join(',') };
                  persistAnswers(next);
                  return next;
                })
              }
            >
              {q.options
                .sort((a, b) => a.optionOrder - b.optionOrder)
                .map((opt) => (
                  <Checkbox key={opt.id} value={opt.optionOrder}>
                    {String.fromCharCode(64 + opt.optionOrder)}. {opt.optionText}
                  </Checkbox>
                ))}
            </Checkbox.Group>
          ) : (
            <Radio.Group
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              value={answers[q.testQuestionId] || undefined}
              onChange={(e) => handleAnswerChange(q.testQuestionId, e.target.value)}
            >
              {q.options
                .sort((a, b) => a.optionOrder - b.optionOrder)
                .map((opt) => (
                  <Radio key={opt.id} value={String(opt.optionOrder)}>
                    {String.fromCharCode(64 + opt.optionOrder)}. {opt.optionText}
                  </Radio>
                ))}
            </Radio.Group>
          )}
        </Card>
      ))}

      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <Button
          type="primary"
          size="large"
          danger={answeredCount < (examData?.questionCount ?? 0)}
          loading={submitting}
          onClick={handleOpenConfirm}
        >
          交卷
        </Button>
      </div>

      <Modal
        title="确认交卷"
        open={confirmOpen}
        onOk={handleConfirmOk}
        onCancel={() => setConfirmOpen(false)}
        okText="确认交卷"
        cancelText={unansweredCount > 0 ? '继续答题' : '继续检查'}
        confirmLoading={submitting}
      >
        {unansweredCount > 0
          ? `你还有 ${unansweredCount} 道题未作答，确定要交卷吗？`
          : '确定要提交答案吗？交卷后无法修改。'}
      </Modal>
    </div>
  );
};

export default OnlineTestingExamPage;