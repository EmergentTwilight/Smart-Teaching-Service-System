import React, { useEffect, useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import request from '@/shared/utils/request';

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
  answer: string;
  explanation?: string;
  defaultPoints: number;
  difficulty?: Difficulty;
  knowledgePoint?: string;
}

const OnlineTestingQuestionsPage: React.FC = () => {
  const [form] = Form.useForm<QuestionFormValues>();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<QuestionListData>({
    items: [],
    pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionItem | null>(null);

  const fetchQuestions = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const result = await request.get<QuestionListData, QuestionListData>('/online-testing/questions', {
        params: { page, pageSize },
      });
      setData(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载题目失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ questionType: 'singleChoice', defaultPoints: 2 });
    setModalOpen(true);
  };

  const openEdit = (item: QuestionItem) => {
    setEditing(item);
    form.setFieldsValue({
      bankId: item.bankId,
      questionType: item.questionType,
      content: item.content,
      answer: item.answer,
      explanation: item.explanation,
      defaultPoints: Number(item.defaultPoints),
      difficulty: item.difficulty,
      knowledgePoint: item.knowledgePoint,
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

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        defaultPoints: values.defaultPoints.toString(),
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
          <Space>
            <Button type="primary" onClick={openCreate}>
              新建题目
            </Button>
            <Button onClick={() => fetchQuestions(data.pagination.page, data.pagination.pageSize)}>
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
              onChange: (page, pageSize) => fetchQuestions(page, pageSize),
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
          <Form.Item name="bankId" label="题库 ID" rules={[{ required: true, message: '请输入题库 ID' }]}>
            <Input placeholder="请输入题库ID" />
          </Form.Item>
          <Form.Item name="questionType" label="题型" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'singleChoice', label: '单选' },
                { value: 'multiChoice', label: '多选' },
                { value: 'trueFalse', label: '判断' },
              ]}
            />
          </Form.Item>
          <Form.Item name="content" label="题干" rules={[{ required: true, message: '请输入题干' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="answer" label="答案" rules={[{ required: true, message: '请输入答案' }]}>
            <Input />
          </Form.Item>
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
    </div>
  );
};

export default OnlineTestingQuestionsPage;
