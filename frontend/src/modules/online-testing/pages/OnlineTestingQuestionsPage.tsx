import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
  Result,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import request from '@/shared/utils/request';
import { useAuthStore } from '@/shared/stores/authStore';

const { Title, Text } = Typography;

type QuestionType = 'singleChoice' | 'multiChoice' | 'trueFalse';
type Difficulty = 'easy' | 'medium' | 'hard';

interface QuestionItem {
  id: string;
  bankId: string;
  questionType: QuestionType;
  content: string;
  answer: string;
  explanation?: string;
  defaultPoints: string;
  difficulty?: Difficulty;
  knowledgePoint?: string;
  createdAt: string;
  options: Array<{
    id: string;
    optionText: string;
    optionOrder: number;
    isCorrect: boolean;
  }>;
}

interface QuestionListData {
  items: QuestionItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface QuestionFormValues {
  bankId: string;
  questionType: QuestionType;
  content: string;
  explanation?: string;
  defaultPoints: number;
  difficulty?: Difficulty;
  knowledgePoint?: string;
  optionCount: number;
  optionTexts: string[];
  correctOptionOrders: number[] | number;
}

interface QuestionBankItem {
  id: string;
  name: string;
  description?: string;
  status: string;
  questionCount: number;
}

interface QuestionBankFormValues {
  name: string;
  description?: string;
}

const OnlineTestingQuestionsPage: React.FC = () => {
  const roles = useAuthStore((s) => s.user?.roles ?? []);
  const isStudent = roles.includes('student');

  // 学生不能访问题库管理
  if (isStudent) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <Title level={2}>题库管理</Title>
          <Text type="secondary">管理和维护在线测试题库</Text>
        </div>
        <Card style={{ borderRadius: 12 }}>
          <Result
            status="403"
            title="无权访问"
            subTitle="题库管理功能仅对教师和管理员开放"
          />
        </Card>
      </div>
    );
  }

  const [form] = Form.useForm<QuestionFormValues>();
  const [bankForm] = Form.useForm<QuestionBankFormValues>();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bankSubmitting, setBankSubmitting] = useState(false);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [banks, setBanks] = useState<QuestionBankItem[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string | undefined>(undefined);
  const [data, setData] = useState<QuestionListData>({
    items: [],
    pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionItem | null>(null);
  const currentType = Form.useWatch('questionType', form) || 'singleChoice';
  const optionCount = Form.useWatch('optionCount', form) || 2;

  const normalizeOptionTexts = (raw: string[] | undefined, count: number): string[] => {
    const source = raw ?? [];
    return Array.from({ length: count }, (_, idx) => source[idx] ?? '');
  };

  const parseAnswerOrders = (answer: string): number[] => {
    return answer
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);
  };

  const fetchQuestions = async (page = 1, pageSize = 10, bankId = selectedBankId) => {
    setLoading(true);
    try {
      const result = await request.get<QuestionListData, QuestionListData>('/online-testing/questions', {
        params: { page, page_size: pageSize, bank_id: bankId },
      });
      setData(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载题目失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestionBanks = async () => {
    const result = await request.get<QuestionBankItem[], QuestionBankItem[]>('/online-testing/question-banks');
    setBanks(result);
    setSelectedBankId((prev) => {
      if (prev && result.some((bank) => bank.id === prev)) return prev;
      return result[0]?.id;
    });
    return result;
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const fetchedBanks = await fetchQuestionBanks();
        if (fetchedBanks.length > 0) {
          form.setFieldValue('bankId', fetchedBanks[0].id);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : '加载题库失败';
        message.error(msg);
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    if (selectedBankId) {
      fetchQuestions(1, data.pagination.pageSize, selectedBankId);
    } else {
      setData((prev) => ({
        ...prev,
        items: [],
        pagination: { ...prev.pagination, page: 1, total: 0, totalPages: 0 },
      }));
    }
  }, [selectedBankId]);

  const openCreate = () => {
    setEditing(null);
    if (!banks.length) {
      message.warning('请先创建题库');
      return;
    }
    form.resetFields();
    form.setFieldsValue({
      bankId: selectedBankId ?? banks[0]?.id,
      questionType: 'singleChoice',
      defaultPoints: 2,
      optionCount: 4,
      optionTexts: ['', '', '', ''],
      correctOptionOrders: 1,
    });
    setModalOpen(true);
  };

  const openEdit = (item: QuestionItem) => {
    const sortedOptions = [...item.options].sort((a, b) => a.optionOrder - b.optionOrder);
    const fallbackCount = item.questionType === 'trueFalse' ? 2 : 4;
    const count = sortedOptions.length > 0 ? sortedOptions.length : fallbackCount;
    const optionTexts =
      sortedOptions.length > 0
        ? sortedOptions.map((option) => option.optionText)
        : item.questionType === 'trueFalse'
          ? ['正确', '错误']
          : Array.from({ length: count }, () => '');
    const parsedAnswerOrders = parseAnswerOrders(item.answer);
    const correctOptionOrders =
      sortedOptions.length > 0
        ? sortedOptions.filter((option) => option.isCorrect).map((option) => option.optionOrder)
        : parsedAnswerOrders.length > 0
          ? parsedAnswerOrders
          : [1];

    setEditing(item);
    form.setFieldsValue({
      bankId: item.bankId,
      questionType: item.questionType,
      content: item.content,
      explanation: item.explanation,
      defaultPoints: Number(item.defaultPoints),
      difficulty: item.difficulty,
      knowledgePoint: item.knowledgePoint,
      optionCount: count,
      optionTexts,
      correctOptionOrders: item.questionType === 'multiChoice' ? correctOptionOrders : correctOptionOrders[0] ?? 1,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await request.delete(`/online-testing/questions/${id}`);
      message.success('删除成功');
      fetchQuestions(data.pagination.page, data.pagination.pageSize);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '删除失败';
      message.error(msg);
    }
  };

  const openCreateBank = () => {
    bankForm.resetFields();
    setBankModalOpen(true);
  };

  const handleCreateBank = async () => {
    const values = await bankForm.validateFields();
    setBankSubmitting(true);
    try {
      const created = await request.post<QuestionBankItem, QuestionBankItem>('/online-testing/question-banks', values);
      message.success('题库创建成功');
      setBankModalOpen(false);
      const latest = await fetchQuestionBanks();
      setSelectedBankId(created.id ?? latest[0]?.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '创建题库失败';
      message.error(msg);
    } finally {
      setBankSubmitting(false);
    }
  };

  const handleDeleteBank = async () => {
    if (!selectedBankId) return;
    try {
      await request.delete(`/online-testing/question-banks/${selectedBankId}`);
      message.success('题库删除成功');
      const latest = await fetchQuestionBanks();
      setSelectedBankId(latest[0]?.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '删除题库失败';
      message.error(msg);
    }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const count = values.questionType === 'trueFalse' ? 2 : values.optionCount;
      const optionTexts = normalizeOptionTexts(values.optionTexts, count).map((value) => value.trim());
      const correctOptionOrders = Array.isArray(values.correctOptionOrders)
        ? values.correctOptionOrders
        : [values.correctOptionOrders];
      const payload = {
        bankId: values.bankId,
        questionType: values.questionType,
        content: values.content,
        explanation: values.explanation,
        defaultPoints: values.defaultPoints.toString(),
        difficulty: values.difficulty,
        knowledgePoint: values.knowledgePoint,
        optionCount: count,
        optionTexts,
        correctOptionOrders,
      };
      if (editing) {
        await request.put(`/online-testing/questions/${editing.id}`, payload);
      } else {
        await request.post('/online-testing/questions', payload);
      }
      message.success(editing ? '更新成功' : '创建成功');
      setModalOpen(false);
      fetchQuestions(data.pagination.page, data.pagination.pageSize);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '提交失败';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuestionTypeChange = (questionType: QuestionType) => {
    if (questionType === 'trueFalse') {
      form.setFieldsValue({
        questionType,
        optionCount: 2,
        optionTexts: ['正确', '错误'],
        correctOptionOrders: 1,
      });
      return;
    }

    const currentCount = Number(form.getFieldValue('optionCount')) || 4;
    const normalizedCount = Math.max(2, currentCount);
    const normalizedTexts = normalizeOptionTexts(form.getFieldValue('optionTexts'), normalizedCount);
    const currentCorrect = form.getFieldValue('correctOptionOrders');
    const normalizedCorrect = Array.isArray(currentCorrect) ? currentCorrect : [Number(currentCorrect || 1)];

    form.setFieldsValue({
      questionType,
      optionCount: normalizedCount,
      optionTexts: normalizedTexts,
      correctOptionOrders: questionType === 'multiChoice' ? normalizedCorrect : normalizedCorrect[0] ?? 1,
    });
  };

  const handleOptionCountChange = (nextCount?: number | null) => {
    const count = Math.max(2, Number(nextCount || 2));
    const normalizedTexts = normalizeOptionTexts(form.getFieldValue('optionTexts'), count);
    const currentCorrect = form.getFieldValue('correctOptionOrders');
    const correctList = (Array.isArray(currentCorrect) ? currentCorrect : [Number(currentCorrect || 1)]).filter(
      (value) => value >= 1 && value <= count
    );
    const fallbackCorrect = correctList.length > 0 ? correctList : [1];

    form.setFieldsValue({
      optionCount: count,
      optionTexts: normalizedTexts,
      correctOptionOrders: currentType === 'multiChoice' ? fallbackCorrect : fallbackCorrect[0],
    });
  };

  const optionOrderOptions = Array.from({ length: Math.max(2, optionCount) }, (_, idx) => ({
    label: `第 ${idx + 1} 项`,
    value: idx + 1,
  }));

  const columns: ColumnsType<QuestionItem> = [
    {
      title: '题干',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
    },
    {
      title: '题型',
      dataIndex: 'questionType',
      key: 'questionType',
      render: (value: QuestionType) => {
        const map: Record<QuestionType, string> = {
          singleChoice: '单选',
          multiChoice: '多选',
          trueFalse: '判断',
        };
        return <Tag>{map[value]}</Tag>;
      },
    },
    {
      title: '分值',
      dataIndex: 'defaultPoints',
      key: 'defaultPoints',
      width: 90,
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 90,
      render: (value?: Difficulty) => {
        if (!value) return '-';
        const map: Record<Difficulty, string> = { easy: '简单', medium: '中等', hard: '困难' };
        return map[value];
      },
    },
    {
      title: '选项数',
      key: 'optionCount',
      width: 90,
      render: (_, record) => record.options.length || '-',
    },
    {
      title: '正确序号',
      key: 'correctOrders',
      width: 120,
      render: (_, record) => {
        const orders = record.options
          .filter((option) => option.isCorrect)
          .map((option) => option.optionOrder)
          .sort((a, b) => a - b);
        return orders.length ? orders.join(',') : '-';
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除这道题？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <Title level={2} style={{ margin: 0 }}>
          题目管理
        </Title>
        <Text type="secondary">基于 Question 模型的 CRUD 示例（E 组 Rust API）</Text>
      </div>

      <Card style={{ borderRadius: 12 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space direction="vertical" size={4}>
              <Text strong>题库管理</Text>
              <Space>
                <Select
                  style={{ width: 360 }}
                  placeholder="请选择题库"
                  value={selectedBankId}
                  onChange={setSelectedBankId}
                  options={banks.map((bank) => ({
                    label: `${bank.name}（${bank.questionCount} 题）`,
                    value: bank.id,
                  }))}
                />
                <Button onClick={openCreateBank}>新建题库</Button>
                <Popconfirm
                  title="确认删除当前题库？"
                  description="若题库下有题目将无法删除"
                  onConfirm={handleDeleteBank}
                  okButtonProps={{ danger: true }}
                >
                  <Button danger disabled={!selectedBankId}>
                    删除题库
                  </Button>
                </Popconfirm>
                <Button onClick={() => fetchQuestionBanks()}>刷新题库</Button>
              </Space>
            </Space>
          </Space>

          <Space>
            <Button type="primary" onClick={openCreate}>
              新建题目
            </Button>
            <Button onClick={() => fetchQuestions(data.pagination.page, data.pagination.pageSize, selectedBankId)}>
              刷新
            </Button>
          </Space>

          <Table<QuestionItem>
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={data.items}
            pagination={{
              current: data.pagination.page,
              pageSize: data.pagination.pageSize,
              total: data.pagination.total,
              onChange: (page, pageSize) => fetchQuestions(page, pageSize, selectedBankId),
            }}
          />
        </Space>
      </Card>

      <Modal
        title={editing ? '编辑题目' : '新建题目'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="bankId" label="题库" rules={[{ required: true, message: '请选择题库' }]}>
            <Select
              placeholder="请选择题库"
              options={banks.map((bank) => ({
                label: `${bank.name} (${bank.id.slice(0, 8)}...)`,
                value: bank.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="questionType" label="题型" rules={[{ required: true }]}>
            <Select
              onChange={handleQuestionTypeChange}
              options={[
                { value: 'singleChoice', label: '单选' },
                { value: 'multiChoice', label: '多选' },
                { value: 'trueFalse', label: '判断' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="optionCount"
            label="选项数量"
            rules={[{ required: true, message: '请输入选项数量' }]}
            extra={currentType === 'trueFalse' ? '判断题固定 2 个选项' : undefined}
          >
            <InputNumber
              min={2}
              max={8}
              disabled={currentType === 'trueFalse'}
              onChange={handleOptionCountChange}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item name="content" label="题干" rules={[{ required: true, message: '请输入题干' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.List name="optionTexts">
            {(fields) => (
              <>
                {fields.slice(0, Math.max(2, optionCount)).map((field, idx) => {
                  const { key, ...restField } = field;
                  return (
                    <Form.Item
                      key={key}
                      {...restField}
                      label={`选项 ${idx + 1}`}
                      rules={[{ required: true, message: `请输入选项 ${idx + 1} 文本` }]}
                    >
                      <Input placeholder={`请输入选项 ${idx + 1} 文本`} />
                    </Form.Item>
                  );
                })}
              </>
            )}
          </Form.List>
          {currentType === 'multiChoice' ? (
            <Form.Item
              name="correctOptionOrders"
              label="正确选项序号"
              rules={[{ required: true, message: '请选择正确选项序号' }]}
            >
              <Select mode="multiple" options={optionOrderOptions} placeholder="请选择正确选项（可多选）" />
            </Form.Item>
          ) : (
            <Form.Item
              name="correctOptionOrders"
              label="正确选项序号"
              rules={[{ required: true, message: '请选择正确选项序号' }]}
            >
              <Radio.Group
                options={optionOrderOptions}
                optionType="button"
                buttonStyle="solid"
              />
            </Form.Item>
          )}
          <Form.Item name="defaultPoints" label="分值" rules={[{ required: true, message: '请输入分值' }]}>
            <InputNumber min={0.5} max={100} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="difficulty" label="难度">
            <Select
              allowClear
              options={[
                { value: 'easy', label: '简单' },
                { value: 'medium', label: '中等' },
                { value: 'hard', label: '困难' },
              ]}
            />
          </Form.Item>
          <Form.Item name="knowledgePoint" label="知识点">
            <Input />
          </Form.Item>
          <Form.Item name="explanation" label="解析">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新建题库"
        open={bankModalOpen}
        onCancel={() => setBankModalOpen(false)}
        onOk={handleCreateBank}
        confirmLoading={bankSubmitting}
        destroyOnClose
      >
        <Form form={bankForm} layout="vertical">
          <Form.Item name="name" label="题库名称" rules={[{ required: true, message: '请输入题库名称' }]}>
            <Input maxLength={100} placeholder="请输入题库名称" />
          </Form.Item>
          <Form.Item name="description" label="题库描述">
            <Input.TextArea rows={3} placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OnlineTestingQuestionsPage;