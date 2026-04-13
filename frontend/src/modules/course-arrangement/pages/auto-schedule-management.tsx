/**
 * 自动排课管理页面 
 * 提供触发算法、查看进度、预览草稿及确认落库的闭环功能
 */
import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Progress, Steps, Table, Alert, Space, Statistic, Row, Col, message, Tag } from 'antd';
import { RobotOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { autoScheduleApi } from '../api/auto-schedule';
import type { AutoScheduleTaskStatus, AutoSchedulePreview } from '../types/auto-schedule';

const { Step } = Steps;

export const AutoScheduleManagement: React.FC = () => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  
  // 任务状态
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<AutoScheduleTaskStatus | null>(null);
  const [previewData, setPreviewData] = useState<AutoSchedulePreview | null>(null);
  
  // 交互状态
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

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
              message.error('排课算法执行失败，请检查系统日志');
              setCurrentStep(0); // 退回初始
            }
          }
        } catch (error) {
          console.error('轮询状态失败', error);
        }
      }, 3000); // 每3秒轮询一次
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
      message.error('获取排课预览结果失败');
    } finally {
      setLoading(false);
    }
  };

  // 触发排课任务
  const handleStartTask = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const res = await autoScheduleApi.createTask({
        semesterId: values.semesterId,
        courseOfferingIds: values.courseOfferingIds ? values.courseOfferingIds.split(',') : undefined
      });
      setTaskId(res.taskId);
      setTaskStatus({ taskId: res.taskId, status: 'queued', progress: 0 });
      setCurrentStep(1);
      message.success('排课任务已提交后台处理');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 确认应用
  const handleApply = async () => {
    if (!taskId) return;
    try {
      setApplying(true);
      const res = await autoScheduleApi.applyTask(taskId);
      message.success(`排课结果应用成功！成功落库 ${res.appliedCount} 条，忽略 ${res.ignoredCount} 条。`);
      setCurrentStep(3);
    } catch {
      message.error('应用排课结果失败');
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
    form.resetFields();
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
      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Steps current={currentStep}>
          <Step title="配置排课范围" />
          <Step title="算法演算中" icon={currentStep === 1 ? <SyncOutlined spin /> : undefined} />
          <Step title="预览冲突与结果" />
          <Step title="落库完成" />
        </Steps>
      </Card>

      {/* 配置并启动 */}
      {currentStep === 0 && (
        <Card bordered={false} title="创建自动排课任务">
          <Form form={form} layout="vertical" style={{ maxWidth: 600 }}>
            <Form.Item 
              name="semesterId" 
              label="目标学期" 
              rules={[{ required: true, message: '请指定目标学期' }]}
            >
              <Input placeholder="输入学期ID，例如：2026-Spring" />
            </Form.Item>
            <Form.Item 
              name="courseOfferingIds" 
              label="指定课程开设ID (选填)" 
              tooltip="输入特定课程ID进行局部排课，多个ID用英文逗号分隔。留空则执行全量排课。"
            >
              <Input.TextArea rows={3} placeholder="选填，留空则全量排课" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" size="large" icon={<RobotOutlined />} onClick={handleStartTask} loading={loading}>
                开始智能排课
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )}

      {/* 进度展示 */}
      {currentStep === 1 && taskStatus && (
        <Card bordered={false} style={{ textAlign: 'center', padding: '50px 0' }}>
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

          <Card title="冲突预警与失败详情" bordered={false}>
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
        <Card bordered={false} style={{ textAlign: 'center', padding: '60px 0' }}>
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