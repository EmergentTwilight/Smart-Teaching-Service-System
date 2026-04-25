/**
 * 排课编辑/新增组件 (Drawer)
 * 填时间 -> 推算可用教室 -> 预校验 -> 落库
 */
import React, { useEffect, useState } from 'react';
import { Drawer, Form, Select, Button, Space, InputNumber, Alert, Input, Spin } from 'antd';
import { useDebounceFn } from 'ahooks'; // 需要安装 ahooks: pnpm add ahooks
import { schedulesApi } from '../api/schedules';
import { classroomsApi } from '../api/classrooms';
import type { Schedule, ScheduleConflict } from '../types/schedule';
import type { Classroom } from '../types/classroom';

const { Option } = Select;
const { TextArea } = Input;

interface ScheduleEditProps {
  visible: boolean;
  id: string | null;            // 排课记录 ID，null 表示新增
  initialCourseId?: string | null; // 供排课任务看板传入，用于自动填充课程 ID
  onClose: () => void;
  onSuccess: () => void;
}

export const ScheduleEdit: React.FC<ScheduleEditProps> = ({ 
  visible, 
  id, 
  initialCourseId, 
  onClose, 
  onSuccess 
}) => {
  const [form] = Form.useForm();
  
  // 状态管理
  const [submitting, setSubmitting] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [availableClassrooms, setAvailableClassrooms] = useState<Classroom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);

  const isEdit = !!id;

  useEffect(() => {
    if (visible) {
      setConflicts([]);
      if (isEdit) {
        // 编辑模式：获取排课详情并回填
        setLoadingForm(true);
        schedulesApi.getById(id!).then(res => {
          form.setFieldsValue(res);
          // 为了确保编辑时下拉框里有当前教室，我们可以在拉取详情后，直接把当前教室塞入候选项
          if (res.classroom) {
            setAvailableClassrooms([res.classroom as Classroom]);
          }
        }).catch(() => {
          // message.error('获取排课详情失败');
        }).finally(() => {
          setLoadingForm(false);
        });
      } else {
        // 清空表单，并填入外部传来的初始课程ID
        form.resetFields();
        if (initialCourseId) {
          form.setFieldsValue({ courseOfferingId: initialCourseId });
        }
        setAvailableClassrooms([]);
      }
    }
  }, [visible, id, initialCourseId, form]);

  // 监听时间字段的变化
  const watchTimeFields = Form.useWatch((values) => {
    return {
      dayOfWeek: values.dayOfWeek,
      startWeek: values.startWeek,
      endWeek: values.endWeek,
      startPeriod: values.startPeriod,
      endPeriod: values.endPeriod
    };
  }, form);

  // 获取真实空闲教室的逻辑
  const { run: fetchAvailableRooms } = useDebounceFn(async (timeParams) => {
    // 只有时间全填满了，才去拉取可用教室
    if (
      timeParams?.dayOfWeek && 
      timeParams?.startWeek && 
      timeParams?.endWeek && 
      timeParams?.startPeriod && 
      timeParams?.endPeriod
    ) {
      setLoadingRooms(true);
      try {
        const rooms = await classroomsApi.getAvailable(timeParams);
        setAvailableClassrooms(rooms);
        
        // 如果当前选中的教室不在新拉取的可用列表里，需要清空用户的选择
        const currentRoomId = form.getFieldValue('classroomId');
        if (currentRoomId && !rooms.find(r => r.id === currentRoomId)) {
          form.setFieldsValue({ classroomId: undefined });
          // message.info('时间范围已更改，请重新选择可用教室');
        }
      } catch  {
        // ...
      } finally {
        setLoadingRooms(false);
      }
    } else {
      setAvailableClassrooms([]); // 时间没填完，清空教室列表
    }
  }, { wait: 500 });

  // 当时间字段变化时，触发空闲教室查询
  useEffect(() => {
    if (visible) {
      fetchAvailableRooms(watchTimeFields);
    }
  }, [watchTimeFields, visible, fetchAvailableRooms]);

  // 先经过预校验 /validate
  const handleValidateAndSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      setConflicts([]);

      if (values.startWeek > values.endWeek) {
        // message.error('开始周次不能大于结束周次');
        setSubmitting(false);
        return;
      }
      if (values.startPeriod > values.endPeriod) {
        // message.error('开始节次不能大于结束节次');
        setSubmitting(false);
        return;
      }

      // 预校验
      const validation = await schedulesApi.validate({
        courseOfferingId: values.courseOfferingId,
        classroomId: values.classroomId,
        dayOfWeek: values.dayOfWeek,
        startWeek: values.startWeek,
        endWeek: values.endWeek,
        startPeriod: values.startPeriod,
        endPeriod: values.endPeriod,
      });

      // 处理校验结果
      if (!validation.valid) {
        setConflicts(validation.conflicts || []);
        // message.warning('排课存在冲突，请检查提示信息');
        setSubmitting(false);
        return;
      }

      // 校验通过，执行写入操作
      if (isEdit) {
        await schedulesApi.update(id!, values);
        // message.success('调整排课成功');
      } else {
        await schedulesApi.create(values as Omit<Schedule, 'id'>);
        // message.success('新增排课成功');
      }
      onSuccess();
    } catch  {
      // 表单校验失败或其他网络错误
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title={isEdit ? '调整排课' : '手动排课'}
      width={500}
      onClose={onClose}
      open={visible}
      destroyOnHidden
      maskClosable={false}
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleValidateAndSubmit} loading={submitting}>
            校验并保存
          </Button>
        </Space>
      }
    >
      <Spin spinning={loadingForm}>
        {/* 冲突提示区域 */}
        {conflicts.length > 0 && (
          <Alert
            message="发现时间冲突"
            description={
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                {conflicts.map((c, idx) => (
                  <li key={idx}>{c.message}</li>
                ))}
              </ul>
            }
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Form form={form} layout="vertical">
          <Form.Item 
            name="courseOfferingId" 
            label="课程开设 ID" 
            rules={[{ required: true, message: '请输入或选择课程' }]}
            tooltip="跨模块关联，通常由系统自动带入"
          >
            <Input placeholder="输入 CourseOffering ID" disabled={!!initialCourseId} />
          </Form.Item>

          {/* 时间输入区放前面 */}
          <Form.Item name="dayOfWeek" label="上课星期" rules={[{ required: true, message: '请选择星期' }]}>
            <Select placeholder="请选择">
              <Option value={1}>星期一</Option>
              <Option value={2}>星期二</Option>
              <Option value={3}>星期三</Option>
              <Option value={4}>星期四</Option>
              <Option value={5}>星期五</Option>
              <Option value={6}>星期六</Option>
              <Option value={7}>星期日</Option>
            </Select>
          </Form.Item>

          <Space style={{ display: 'flex' }}>
            <Form.Item name="startWeek" label="开始周次" rules={[{ required: true, message: '必填' }]}>
              <InputNumber min={1} max={20} style={{ width: '100%' }} placeholder="第几周" />
            </Form.Item>
            <Form.Item name="endWeek" label="结束周次" rules={[{ required: true, message: '必填' }]}>
              <InputNumber min={1} max={20} style={{ width: '100%' }} placeholder="第几周" />
            </Form.Item>
          </Space>

          <Space style={{ display: 'flex' }}>
            <Form.Item name="startPeriod" label="开始节次" rules={[{ required: true, message: '必填' }]}>
              <InputNumber min={1} max={13} style={{ width: '100%' }} placeholder="第几节" />
            </Form.Item>
            <Form.Item name="endPeriod" label="结束节次" rules={[{ required: true, message: '必填' }]}>
              <InputNumber min={1} max={13} style={{ width: '100%' }} placeholder="第几节" />
            </Form.Item>
          </Space>

          {/* 依赖时间的动态教室选择器 */}
          <Form.Item 
            name="classroomId" 
            label="安排教室" 
            rules={[{ required: true, message: '请选择可用教室' }]}
            tooltip="请先填写完整上课时间，系统将自动推算空闲教室"
          >
            <Select 
              placeholder={availableClassrooms.length === 0 ? "请先填写上方时间获取可用教室" : "请选择空闲教室"}
              loading={loadingRooms}
              disabled={availableClassrooms.length === 0 && !loadingRooms && !isEdit}
              showSearch
              optionFilterProp="children"
            >
              {availableClassrooms.map(room => (
                <Option key={room.id} value={room.id}>
                  {room.building} - {room.roomNumber} (容量: {room.capacity})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="notes" label="备注说明">
            <TextArea rows={3} placeholder="选填，例如：单双周说明、调课备注等" />
          </Form.Item>
        </Form>
      </Spin>
    </Drawer>
  );
};