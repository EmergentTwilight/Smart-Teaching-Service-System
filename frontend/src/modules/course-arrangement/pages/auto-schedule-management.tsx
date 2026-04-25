/**
 * 自动排课管理页面 
 * 提供触发算法、查看进度、预览草稿及确认落库的闭环功能
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Progress, Steps, Table, Alert, Space, Statistic, Row, Col, Select, Typography, Tag } from 'antd';
import { RobotOutlined, CheckCircleOutlined, SyncOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { autoScheduleApi } from '../api/auto-schedule';
import type { AutoScheduleTaskStatus, AutoSchedulePreview } from '../types/auto-schedule';
import { ConstraintRuleTable } from './constraint-rule-table';

// const { Step } = Steps;
const { Text } = Typography;
const { Option } = Select;

export const AutoScheduleManagement: React.FC = () => {
  // const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);

  // 排课配置数据
  const [selectedSemester, setSelectedSemester] = useState('2025-Fall');
  const [semesters, setSemesters] = useState<{id: string; name: string; courseCount: number}[]>([]);
  const [courseCount, setCourseCount] = useState(0);
  const [classroomCount, setClassroomCount] = useState(0);

  // 任务状态
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<AutoScheduleTaskStatus | null>(null);
  const [previewData, setPreviewData] = useState<AutoSchedulePreview | null>(null);
  
  // 交互状态
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [ruleCount, setRuleCount] = useState(0);
  const [classroomLoading, setClassroomLoading] = useState(false);

  const fetchOverview = useCallback(async () => {
    try {
      setClassroomLoading(true);
      const res = await autoScheduleApi.getOverview(); // 假设 API 方法名
      setSemesters(res.semesters.map(s => ({
        id: s.id,
        name: s.name,
        courseCount: s.courseOfferings?.length || 0,
      })));
      setClassroomCount(res.classrooms?.length || 0);
      // 默认选中第一个学期
      if (res.semesters.length > 0) {
        setSelectedSemester(res.semesters[0].id);
        setCourseCount(res.semesters[0].courseOfferings?.length || 0);
      }
    } catch  {
      // ...
    } finally {
      setClassroomLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // 切换学期时获取该学期课程总数
  const handleSemesterChange = async (semesterId: string) => {
    setSelectedSemester(semesterId);
    const sem = semesters.find(s => s.id === semesterId);
    if (sem) setCourseCount(sem.courseCount);
  };

  // 轮询获取任务状态
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (taskId && currentStep === 1) {
      timer = setInterval(async () => {
        try {
          const res = await autoScheduleApi.getTaskStatus(taskId);
          setTaskStatus(res);
          // 任务完成，进入预览阶段
          if (res.status === 'completed' || res.status === 'failed') {
            clearInterval(timer);
            if (res.status === 'completed') {
              fetchPreview(taskId);
            } else {
              // message.error('排课算法执行失败，请检查系统日志');
              setCurrentStep(0); // 退回初始
            }
          }
        } catch  {
          // ...
        }
      }, 300); // 每0.3秒轮询一次
    }
    return () => clearInterval(timer);
  }, [taskId, currentStep]);

  // 获取预览数据
  const fetchPreview = async (id: string) => {
    try {
      setLoading(true);
      const res = await autoScheduleApi.getTaskPreview(id);
            setPreviewData(res);
      setCurrentStep(2);
    } catch {
      // message.error('获取排课预览结果失败');
    } finally {
      setLoading(false);
    }
  };

  // 触发排课任务
  const handleStartTask = async () => {
    try {
      // const values = await form.validateFields();
      setLoading(true);
      const res = await autoScheduleApi.createTask({
        semesterId: selectedSemester,
        // courseOfferingIds: values.courseOfferingIds ? values.courseOfferingIds.split(',') : undefined
      });
      setTaskId(res.taskId);
      setTaskStatus({ taskId: res.taskId, status: 'queued', progress: 0 });
      setCurrentStep(1);
      // message.success('排课任务已提交后台处理');
    } catch  {
      // ...
    } finally {
      setLoading(false);
    }
  };

  // 确认应用
  const handleApply = async () => {
    if (!taskId) return;
    try {
      setApplying(true);
      await autoScheduleApi.applyTask(taskId);
      // message.success(`排课结果应用成功！成功落库 ${res.appliedCount} 条，忽略 ${res.ignoredCount} 条。`);
      setCurrentStep(3);
    } catch {
      // message.error('应用排课结果失败');
    } finally {
      setApplying(false);
    }
  };

  // 重置流程
  const handleReset = () => {
    setCurrentStep(0);
    setTaskId(null);
    setTaskStatus(null);
    setPreviewData(null);
    // form.resetFields();
  };

  // 渲染失败记录表
  const failureColumns = [
    { title: '课程名称', dataIndex: 'courseName', key: 'courseName' },
    { title: '教师姓名', dataIndex: 'teacherName', key: 'teacherName' },
    { title: '失败原因', dataIndex: 'reason', key: 'reason', render: (val: string) => <Tag color="error">{val}</Tag> },
    { title: '详细说明', dataIndex: 'detail', key: 'detail' },
  ];

  return (
    <div className="fade-in">
      {/* 步骤指示器 */}
      <Card style={{ marginBottom: 16 }}>
        <Steps current={currentStep}>
          <Steps.Step title="排课配置" icon={<UnorderedListOutlined />} />
          <Steps.Step
            title="算法演算中"
            icon={currentStep === 1 ? <SyncOutlined spin /> : undefined}
          />
          <Steps.Step title="预览冲突与结果" />
          <Steps.Step title="落库完成" />
        </Steps>
      </Card>

      {/* 步骤0：排课配置 */}
      {currentStep === 0 && (
        <div>
          {/* 固定高度板块：学期和课程、教室总览 */}
          <Card
           
            style={{ marginBottom: 16, minHeight: 120 }}
            title="排课学期与课程、教室一览"
          >
            <Row gutter={[48, 24]} align="middle">
              <Col span={8}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>选择学期</Text>
                  <Select
                    value={selectedSemester}
                    onChange={handleSemesterChange}
                    style={{ width: 200 }}
                    loading={classroomLoading}
                  >
                    {semesters.map(s => (
                      <Option key={s.id} value={s.id}>{s.name}</Option>
                    ))}
                  </Select>
                </Space>
              </Col>
              <Col span={8}>
                <Statistic
                  title="当前学期课程总数"
                  value={courseCount || '—'}
                  suffix="门"
                  style={{ textAlign: 'center' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="可用教室总数"
                  value={classroomCount || '-'}
                  suffix="间"
                  style={{ textAlign: 'center' }}
                />
              </Col>
            </Row>
          </Card>

          {/* 可变高度板块：约束管理 */}
          <Card
           
            title={
              <Space>
                <UnorderedListOutlined />
                <Text strong>约束规则管理</Text>
                <Text type="secondary">（已配置 {ruleCount} 条规则）</Text>
              </Space>
            }
          >
            <ConstraintRuleTable onRuleCountChange={setRuleCount} />

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Button
                type="primary"
                size="large"
                icon={<RobotOutlined />}
                loading={loading}
                onClick={handleStartTask}
              >
                开始自动排课
              </Button>
              {ruleCount === 0 && (
                <div style={{ marginTop: 8 }}>
                  <Text type="warning" style={{ color: '#faad14' }}>
                    当前未配置约束规则，排课结果可能不完全符合预期（仅做时间/教室基本分配）
                  </Text>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* 进度展示 */}
      {currentStep === 1 && taskStatus && (
        <Card style={{ textAlign: 'center', padding: '50px 0' }}>
          <Progress type="dashboard" percent={taskStatus.progress} status="active" size={200} />
          <h2 style={{ marginTop: 24 }}>正在执行排课任务...</h2>
          <p style={{ color: '#8c8c8c' }}>当前状态: {taskStatus.status.toUpperCase()} | 这可能需要几分钟时间，请勿关闭页面</p>
        </Card>
      )}

      {/* 预览草稿 */}
      {currentStep === 2 && previewData && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="排课成功率" value={previewData.successRate} suffix="%" valueStyle={{ color: '#3f8600' }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="成功生成排课记录" value={previewData.schedules?.length || 0} suffix="条" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="冲突/失败记录" value={previewData.failures?.length || 0} suffix="条" valueStyle={{ color: '#cf1322' }} />
              </Card>
            </Col>
          </Row>

          <Card title="冲突预警与失败详情">
            {previewData.failures?.length > 0 ? (
              <Table 
                dataSource={previewData.failures} 
                columns={failureColumns} 
                rowKey="courseOfferingId"
                pagination={false}
              />
            ) : (
              <Alert message="完美！本次排课未发现任何硬冲突。" type="success" showIcon />
            )}
            
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Space size="large">
                <Button onClick={handleReset}>放弃并重新排课</Button>
                <Button type="primary" size="large" onClick={handleApply} loading={applying}>
                  确认无误，应用落库
                </Button>
              </Space>
            </div>
          </Card>
        </Space>
      )}

      {/* 完成页面 */}
      {currentStep === 3 && (
        <Card style={{ textAlign: 'center', padding: '60px 0' }}>
          <CheckCircleOutlined style={{ fontSize: 72, color: '#52c41a', marginBottom: 24 }} />
          <h2>排课数据已成功落库</h2>
          <p style={{ color: '#8c8c8c' }}>您现在可以前往【课表查询】或【排课列表】核对数据了。</p>
          <Button type="primary" onClick={handleReset} style={{ marginTop: 16 }}>
            发起新的排课任务
          </Button>
        </Card>
      )}
    </div>
  );
};

export default AutoScheduleManagement;