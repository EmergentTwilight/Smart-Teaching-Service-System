/**
 * 教室编辑/新增组件 (Drawer 形式)
 * 供教室列表页调用，处理单个教室的维护
 */
import React, { useEffect, useState } from 'react';
import {Card, Drawer, Form, Input, Select, Button, InputNumber, Switch, Space, Spin } from 'antd';
import { classroomsApi } from '../api/classrooms';
import type { ClassroomInput } from '../types/classroom';

const { Option } = Select;

interface ClassroomEditProps {
  visible: boolean;
  id: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ClassroomEdit: React.FC<ClassroomEditProps> = ({ visible, id, onClose, onSuccess }) => {
  const [form] = Form.useForm<ClassroomInput>();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!id;

  // 根据 ID 获取详情并回填表单
  useEffect(() => {
    if (visible && isEdit) {
      const fetchDetail = async () => {
        setLoading(true);
        try {
          const res = await classroomsApi.getById({id: id!});
          // 将 equipment 展平以便于 Form 直接绑定
          form.setFieldsValue({
            ...res?.classroom
          });
        } catch {
          // message.error('获取教室详情失败');
          onClose();
        } finally {
          setLoading(false);
        }
      };
      fetchDetail();
    } else if (visible && !isEdit) {
      form.resetFields();
    }
  }, [visible, id, form, onClose, isEdit]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (isEdit) {
        await classroomsApi.update({ id: id!, data: values} );
        // message.success('更新成功');
      } else {
        await classroomsApi.create(values);
        // message.success('创建成功');
      }
      onSuccess();
    } catch  {
      // Zod/接口错误会由 request 工具抛出拦截
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title={isEdit ? '编辑教室' : '新增教室'}
      width={500}
      onClose={onClose}
      open={visible}
      styles={{ body: { paddingBottom: 80 } }}
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleSubmit} loading={submitting}>
            提交
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical">
          <Form.Item name="campus" label="校区" rules={[{ required: true, message: '请输入校区' }]}>
            <Input placeholder="例如：主校区" />
          </Form.Item>
          
          <Space style={{ display: 'flex' }}>
            <Form.Item name="building" label="教学楼" rules={[{ required: true }]}>
              <Input placeholder="例如：A教学楼" />
            </Form.Item>
            <Form.Item name="roomNumber" label="教室号" rules={[{ required: true }]}>
              <Input placeholder="例如：301" />
            </Form.Item>
          </Space>

          <Space style={{ display: 'flex' }}>
             <Form.Item name="capacity" label="容量 (人)" rules={[{ required: true }]}>
               <InputNumber min={1} style={{ width: '100%' }} />
             </Form.Item>
             <Form.Item name="roomType" label="教室类型" rules={[{ required: true }]}>
               <Select style={{ width: 160 }}>
                 <Option value="LECTURE">普通教室</Option>
                 <Option value="LAB">实验室</Option>
                 <Option value="COMPUTER">机房</Option>
                 <Option value="MULTIMEDIA">多媒体教室</Option>
               </Select>
             </Form.Item>
          </Space>

          <Form.Item name="status" label="当前状态" initialValue="AVAILABLE" rules={[{ required: true }]}>
            <Select>
              <Option value="AVAILABLE">可用</Option>
              <Option value="MAINTENENCE">维护中</Option>
              <Option value="UNAVAILABLE">不可用</Option>
            </Select>
          </Form.Item>

          <Card size="small" title="设备信息" style={{ background: '#f8fafc' }}>
            <Space size="large" wrap>
              <Form.Item name="projector" label="投影仪" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch />
              </Form.Item>
              <Form.Item name="airConditioner" label="空调" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch />
              </Form.Item>
              <Form.Item name="microphone" label="麦克风" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch />
              </Form.Item>
            </Space>
            <Form.Item name="computerCount" label="电脑数量" style={{ marginTop: 16, marginBottom: 0 }}>
              <InputNumber min={0} />
            </Form.Item>
          </Card>
        </Form>
      </Spin>
    </Drawer>
  );
};