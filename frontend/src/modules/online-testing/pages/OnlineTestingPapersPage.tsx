import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import request from '@/shared/utils/request';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/authStore';

const { Title, Text } = Typography;

type QuestionType = 'singleChoice' | 'multiChoice' | 'trueFalse';
type Difficulty = 'easy' | 'medium' | 'hard';

interface TestPaperItem {
  id: string;
  courseOfferingId: string;
  creatorId: string;
  title: string;
  description?: string;
  totalPoints: string;
  durationMinutes: number;
  startTime?: string;
  endTime?: string;
  isRandom: boolean;
  status: string;
  questionCount: number;
}

interface TestPaperQuestionItem {
  testQuestionId: string;
  questionId: string;
  bankId: string;
  questionType: QuestionType;
  content: string;
  points: string;
  orderNum: number;
  difficulty?: Difficulty;
}

interface TestPaperEditorData {
  paper: TestPaperItem;
  questions: TestPaperQuestionItem[];
}

interface CreateOrUpdatePaperFormValues {
  title: string;
  description?: string;
  totalPoints: number;
  durationMinutes: number;
  startTime?: string;
  endTime?: string;
}

interface QuestionBankItem {
  id: string;
  name: string;
}

interface QuestionItem {
  id: string;
  bankId: string;
  questionType: QuestionType;
  content: string;
  defaultPoints: string;
  difficulty?: Difficulty;
}

interface QuestionListData {
  items: QuestionItem[];
}

interface ManualAddFormValues {
  bankId: string;
  questionIds: string[];
  pointsPerQuestion?: number;
}

interface AutoGenerateFormValues {
  bankId: string;
  questionType?: QuestionType;
  difficulty?: Difficulty;
  keyword?: string;
  count: number;
  pointsPerQuestion?: number;
}

const OnlineTestingPapersPage: React.FC = () => {
  const [createForm] = Form.useForm<CreateOrUpdatePaperFormValues>();
  const navigate = useNavigate();
  const roles = useAuthStore((s) => s.user?.roles ?? []);
  const isStudent = roles.includes('student');
  const [editForm] = Form.useForm<CreateOrUpdatePaperFormValues>();
  const [manualForm] = Form.useForm<ManualAddFormValues>();
  const [autoForm] = Form.useForm<AutoGenerateFormValues>();
  const [papers, setPapers] = useState<TestPaperItem[]>([]);
  const [banks, setBanks] = useState<QuestionBankItem[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<QuestionItem[]>([]);
  const [submittedPaperIds, setSubmittedPaperIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSubmitting, setEditorSubmitting] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<TestPaperEditorData | null>(null);
  const [manualBankId, setManualBankId] = useState<string | undefined>(undefined);

  const fetchPapers = async () => {
    const result = await request.get<TestPaperItem[], TestPaperItem[]>('/online-testing/test-papers');
    setPapers(result);
  };

  const fetchBanks = async () => {
    const result = await request.get<QuestionBankItem[], QuestionBankItem[]>('/online-testing/question-banks');
    setBanks(result);
    if (result.length > 0) {
      manualForm.setFieldValue('bankId', result[0].id);
      autoForm.setFieldValue('bankId', result[0].id);
      setManualBankId(result[0].id);
    }
  };

  const fetchAvailableQuestions = async (bankId: string) => {
    if (!bankId) {
      setAvailableQuestions([]);
      return;
    }
    const result = await request.get<QuestionListData, QuestionListData>('/online-testing/questions', {
      params: { page: 1, page_size: 100, bank_id: bankId },
    });
    setAvailableQuestions(result.items);
  };

  const fetchPaperDetail = async (paperId: string) => {
    const detail = await request.get<TestPaperEditorData, TestPaperEditorData>(`/online-testing/test-papers/${paperId}`);
    setSelectedPaper(detail);
    editForm.setFieldsValue({
      title: detail.paper.title,
      description: detail.paper.description,
      totalPoints: Number(detail.paper.totalPoints),
      durationMinutes: detail.paper.durationMinutes,
      startTime: detail.paper.startTime || undefined,
      endTime: detail.paper.endTime || undefined,
    });
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const tasks = [fetchPapers()];
        if (!isStudent) {
          tasks.push(fetchBanks());
        } else {
          // 学生加载已提交试卷状态
          request.get<{ testPaperId: string }[], { testPaperId: string }[]>('/online-testing/test-results/my')
            .then((results) => {
              setSubmittedPaperIds(new Set(results.map((r) => r.testPaperId)));
            })
            .catch(() => { /* ignore */ });
        }
        await Promise.all(tasks);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '初始化失败';
        message.error(msg);
      }
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (manualBankId) {
      fetchAvailableQuestions(manualBankId).catch((err) => {
        const msg = err instanceof Error ? err.message : '加载题库题目失败';
        message.error(msg);
      });
    }
  }, [manualBankId]);

  const handleCreatePaper = async () => {
    const values = await createForm.validateFields();
    setSubmitting(true);
    try {
      const fmtTime = (v: unknown): string | undefined => {
        if (v && typeof v === 'object' && 'toISOString' in (v as object)) return (v as { toISOString(): string }).toISOString();
        return v ? String(v) : undefined;
      };
      await request.post('/online-testing/test-papers', {
        title: values.title,
        description: values.description,
        totalPoints: values.totalPoints.toString(),
        durationMinutes: values.durationMinutes,
        startTime: fmtTime(values.startTime),
        endTime: fmtTime(values.endTime),
      });
      message.success('试卷创建成功');
      createForm.resetFields();
      createForm.setFieldsValue({ totalPoints: 100, durationMinutes: 90 });
      await fetchPapers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '创建试卷失败';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditor = async (paperId: string) => {
    setEditorLoading(true);
    setEditorOpen(true);
    try {
      await fetchPaperDetail(paperId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载试卷详情失败';
      message.error(msg);
      setEditorOpen(false);
    } finally {
      setEditorLoading(false);
    }
  };

  const handleUpdatePaper = async () => {
    if (!selectedPaper) return;
    const values = await editForm.validateFields();
    setEditorSubmitting(true);
    try {
      const fmtTime = (v: unknown): string | undefined => {
        if (v && typeof v === 'object' && 'toISOString' in (v as object)) return (v as { toISOString(): string }).toISOString();
        return v ? String(v) : undefined;
      };
      await request.put(`/online-testing/test-papers/${selectedPaper.paper.id}`, {
        title: values.title,
        description: values.description,
        totalPoints: values.totalPoints.toString(),
        durationMinutes: values.durationMinutes,
        startTime: fmtTime(values.startTime),
        endTime: fmtTime(values.endTime),
      });
      message.success('试卷信息已更新');
      await Promise.all([fetchPapers(), fetchPaperDetail(selectedPaper.paper.id)]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '更新试卷失败';
      message.error(msg);
    } finally {
      setEditorSubmitting(false);
    }
  };

  const handleManualAdd = async () => {
    if (!selectedPaper) return;
    const values = await manualForm.validateFields();
    setEditorSubmitting(true);
    try {
      await request.post(`/online-testing/test-papers/${selectedPaper.paper.id}/questions`, {
        questionIds: values.questionIds,
        pointsPerQuestion:
          values.pointsPerQuestion !== undefined ? values.pointsPerQuestion.toString() : undefined,
      });
      message.success('题目已加入试卷');
      manualForm.setFieldValue('questionIds', []);
      await Promise.all([fetchPapers(), fetchPaperDetail(selectedPaper.paper.id)]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '手动添加题目失败';
      message.error(msg);
    } finally {
      setEditorSubmitting(false);
    }
  };

  const handleAutoGenerate = async () => {
    if (!selectedPaper) return;
    const values = await autoForm.validateFields();
    setEditorSubmitting(true);
    try {
      await request.post(`/online-testing/test-papers/${selectedPaper.paper.id}/auto-generate`, {
        bankId: values.bankId,
        questionType: values.questionType,
        difficulty: values.difficulty,
        keyword: values.keyword,
        count: values.count,
        pointsPerQuestion:
          values.pointsPerQuestion !== undefined ? values.pointsPerQuestion.toString() : undefined,
      });
      message.success('已按条件批量加入题目');
      await Promise.all([fetchPapers(), fetchPaperDetail(selectedPaper.paper.id)]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '批量生成失败';
      message.error(msg);
    } finally {
      setEditorSubmitting(false);
    }
  };

  const handleRemovePaperQuestion = async (testQuestionId: string) => {
    if (!selectedPaper) return;
    setEditorSubmitting(true);
    try {
      await request.delete(`/online-testing/test-papers/${selectedPaper.paper.id}/questions/${testQuestionId}`);
      message.success('题目已移除');
      await Promise.all([fetchPapers(), fetchPaperDetail(selectedPaper.paper.id)]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '移除题目失败';
      message.error(msg);
    } finally {
      setEditorSubmitting(false);
    }
  };

  // 发布试卷
  const handlePublishPaper = async (paperId: string) => {
    try {
      await request.post(`/online-testing/test-papers/${paperId}/publish`);
      message.success('试卷已发布');
      await fetchPapers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '发布失败';
      message.error(msg);
    }
  };

  // 关闭试卷
  const handleClosePaper = async (paperId: string) => {
    try {
      await request.post(`/online-testing/test-papers/${paperId}/close`);
      message.success('试卷已关闭');
      await fetchPapers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '关闭失败';
      message.error(msg);
    }
  };

  const paperColumns: ColumnsType<TestPaperItem> = [
    { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
    { title: '总分', dataIndex: 'totalPoints', key: 'totalPoints', width: 90 },
    { title: '时长(分)', dataIndex: 'durationMinutes', key: 'durationMinutes', width: 100 },
    { title: '题目数', dataIndex: 'questionCount', key: 'questionCount', width: 90 },
    {
      title: '考试时间',
      key: 'timeWindow',
      width: 200,
      ellipsis: true,
      render: (_, r) => {
        if (!r.startTime && !r.endTime) return <Text type="secondary">不限</Text>;
        const fmt = (s?: string) => s ? new Date(s).toLocaleString() : '不限';
        return `${fmt(r.startTime)} ~ ${fmt(r.endTime)}`;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: string) => <Tag color={value === 'draft' ? 'gold' : 'blue'}>{value}</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      width: isStudent ? 120 : 200,
      render: (_, record) => (
        <Space size="small">
          {isStudent && record.status === 'published' && submittedPaperIds.has(record.id) && (
            <Tag color="success">已交卷</Tag>
          )}
          {isStudent && record.status === 'published' && !submittedPaperIds.has(record.id) && (
            <Button size="small" type="primary" onClick={() => navigate(`/exam/exam/${record.id}`)}>
              开始答题
            </Button>
          )}
          {!isStudent && record.status === 'draft' && (
            <>
              <Button size="small" onClick={() => openEditor(record.id)}>
                编辑配置
              </Button>
              <Popconfirm title="确认发布试卷？发布后学生可开始答题" onConfirm={() => handlePublishPaper(record.id)}>
                <Button size="small" type="primary">
                  发布
                </Button>
              </Popconfirm>
            </>
          )}
          {!isStudent && (record.status === 'published' || record.status === 'closed') && (
            <Button size="small" onClick={() => navigate(`/exam/results?paperId=${record.id}`)}>
              成绩
            </Button>
          )}
          {!isStudent && record.status === 'published' && (
            <Popconfirm title="确认关闭试卷？关闭后学生无法答题" onConfirm={() => handleClosePaper(record.id)}>
              <Button size="small" danger>
                关闭
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const selectedPaperQuestionColumns: ColumnsType<TestPaperQuestionItem> = [
    { title: '题号', dataIndex: 'orderNum', key: 'orderNum', width: 70 },
    { title: '题干', dataIndex: 'content', key: 'content', ellipsis: true },
    { title: '题型', dataIndex: 'questionType', key: 'questionType', width: 100 },
    { title: '分值', dataIndex: 'points', key: 'points', width: 90 },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Popconfirm title="确认移除该题目？" onConfirm={() => handleRemovePaperQuestion(record.testQuestionId)}>
          <Button size="small" danger>
            移除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <Title level={2} style={{ margin: 0 }}>
          {isStudent ? '试卷列表' : '组卷管理'}
        </Title>
        <Text type="secondary">
          {isStudent ? '选择试卷开始在线答题' : '创建、编辑试卷，并支持手动/按条件批量配置题目'}
        </Text>
      </div>

      {!isStudent && (
      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Form
            form={createForm}
            layout="vertical"
            initialValues={{ totalPoints: 100, durationMinutes: 90 }}
          >
            <Form.Item name="title" label="试卷标题" rules={[{ required: true, message: '请输入试卷标题' }]}>
              <Input maxLength={200} placeholder="例如：软件工程期中测试卷" />
            </Form.Item>
            <Form.Item name="description" label="试卷说明">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="totalPoints" label="总分" rules={[{ required: true, message: '请输入总分' }]}>
              <InputNumber min={1} max={999} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="durationMinutes" label="时长（分钟）" rules={[{ required: true, message: '请输入考试时长' }]}>
              <InputNumber min={1} max={600} style={{ width: '100%' }} />
            </Form.Item>
            <Space size="large">
              <Form.Item name="startTime" label="开始时间（可选）" style={{ marginBottom: 0 }}>
                <DatePicker showTime format="YYYY-MM-DD HH:mm" placeholder="不限" />
              </Form.Item>
              <Form.Item name="endTime" label="结束时间（可选）" style={{ marginBottom: 0 }}>
                <DatePicker showTime format="YYYY-MM-DD HH:mm" placeholder="不限" />
              </Form.Item>
            </Space>
            <Space>
              <Button type="primary" loading={submitting} onClick={handleCreatePaper}>
                创建试卷
              </Button>
              <Button onClick={() => fetchPapers()}>刷新列表</Button>
            </Space>
          </Form>
        </Space>
      </Card>
      )}

      <Card style={{ borderRadius: 12 }}>
        <Table<TestPaperItem> rowKey="id" columns={paperColumns} dataSource={papers} pagination={false} />
      </Card>

      {!isStudent && (
      <Modal
        title="编辑试卷与题目配置"
        open={editorOpen}
        onCancel={() => setEditorOpen(false)}
        footer={null}
        width={1100}
        destroyOnClose
      >
        {selectedPaper && !editorLoading && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Card size="small" title="试卷基础信息">
              <Form form={editForm} layout="vertical">
                <Form.Item name="title" label="试卷标题" rules={[{ required: true, message: '请输入试卷标题' }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="description" label="试卷说明">
                  <Input.TextArea rows={2} />
                </Form.Item>
                <Form.Item name="totalPoints" label="总分" rules={[{ required: true, message: '请输入总分' }]}>
                  <InputNumber min={1} max={999} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="durationMinutes" label="时长（分钟）" rules={[{ required: true, message: '请输入时长' }]}>
                  <InputNumber min={1} max={600} style={{ width: '100%' }} />
                </Form.Item>
                <Space size="large">
                  <Form.Item name="startTime" label="开始时间（可选）" style={{ marginBottom: 0 }}>
                    <DatePicker showTime format="YYYY-MM-DD HH:mm" placeholder="不限" />
                  </Form.Item>
                  <Form.Item name="endTime" label="结束时间（可选）" style={{ marginBottom: 0 }}>
                    <DatePicker showTime format="YYYY-MM-DD HH:mm" placeholder="不限" />
                  </Form.Item>
                </Space>
                <Button type="primary" loading={editorSubmitting} onClick={handleUpdatePaper}>
                  保存试卷信息
                </Button>
              </Form>
            </Card>

            <Card size="small" title={`已配置题目（${selectedPaper.questions.length}）`}>
              <Table<TestPaperQuestionItem>
                rowKey="testQuestionId"
                columns={selectedPaperQuestionColumns}
                dataSource={selectedPaper.questions}
                pagination={false}
                size="small"
              />
            </Card>

            <Card size="small" title="手动从题库加入题目">
              <Form form={manualForm} layout="vertical">
                <Form.Item name="bankId" label="题库" rules={[{ required: true, message: '请选择题库' }]}>
                  <Select
                    options={banks.map((bank) => ({ label: bank.name, value: bank.id }))}
                    onChange={(value) => {
                      setManualBankId(value);
                    }}
                  />
                </Form.Item>
                <Form.Item name="questionIds" label="选择题目" rules={[{ required: true, message: '请选择题目' }]}>
                  <Select
                    mode="multiple"
                    options={availableQuestions.map((item) => ({
                      label: `${item.content.slice(0, 36)}${item.content.length > 36 ? '...' : ''}`,
                      value: item.id,
                    }))}
                  />
                </Form.Item>
                <Form.Item name="pointsPerQuestion" label="统一分值（可选）">
                  <InputNumber min={0.5} max={100} step={0.5} style={{ width: '100%' }} />
                </Form.Item>
                <Button loading={editorSubmitting} onClick={handleManualAdd}>
                  加入选中题目
                </Button>
              </Form>
            </Card>

            <Card size="small" title="按条件批量生成题目">
              <Form
                form={autoForm}
                layout="vertical"
                initialValues={{ count: 1 }}
              >
                <Form.Item name="bankId" label="题库" rules={[{ required: true, message: '请选择题库' }]}>
                  <Select options={banks.map((bank) => ({ label: bank.name, value: bank.id }))} />
                </Form.Item>
                <Form.Item name="questionType" label="题型">
                  <Select
                    allowClear
                    options={[
                      { label: '单选', value: 'singleChoice' },
                      { label: '多选', value: 'multiChoice' },
                      { label: '判断', value: 'trueFalse' },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="difficulty" label="难度">
                  <Select
                    allowClear
                    options={[
                      { label: '简单', value: 'easy' },
                      { label: '中等', value: 'medium' },
                      { label: '困难', value: 'hard' },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="keyword" label="题干关键词">
                  <Input />
                </Form.Item>
                <Form.Item name="count" label="抽题数量" rules={[{ required: true, message: '请输入抽题数量' }]}>
                  <InputNumber min={1} max={200} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="pointsPerQuestion" label="统一分值（可选）">
                  <InputNumber min={0.5} max={100} step={0.5} style={{ width: '100%' }} />
                </Form.Item>
                <Button type="primary" loading={editorSubmitting} onClick={handleAutoGenerate}>
                  按条件批量加入
                </Button>
              </Form>
            </Card>
          </Space>
        )}
        {editorLoading && <Divider>加载中...</Divider>}
      </Modal>
      )}
    </div>
  );
};

export default OnlineTestingPapersPage;