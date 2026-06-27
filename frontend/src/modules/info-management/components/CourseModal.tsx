/**
 * 课程新增/编辑表单弹窗
 */
import React, { useEffect } from 'react';
import { Form, Input, InputNumber, Modal, Radio, Select } from 'antd';
import type { Department } from '../types/departments';
import type { Course, CourseType, CreateCourseDTO } from '../types/courses';
import { COURSE_TYPE_LABELS } from '../types/courses';

interface CourseModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCourseDTO) => void | Promise<void>;
  initialData?: Course;
  departments: Department[];
  courses: Course[];
}

const CourseModal: React.FC<CourseModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialData,
  departments,
  courses,
}) => {
  const [form] = Form.useForm<CreateCourseDTO>();

  useEffect(() => {
    if (visible && initialData) {
      form.setFieldsValue({
        code: initialData.code,
        name: initialData.name,
        credits: initialData.credits,
        hours: initialData.hours || undefined,
        courseType: initialData.courseType,
        category: initialData.category || undefined,
        departmentId: initialData.departmentId || undefined,
        teacherId: initialData.teacherId || undefined,
      });
      return;
    }

    if (visible) {
      form.resetFields();
      form.setFieldsValue({ courseType: 'REQUIRED' });
    }
  }, [form, initialData, visible]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await onSubmit(values);
    form.resetFields();
    onClose();
  };

  const isEdit = !!initialData;
  const courseTypeOptions = Object.entries(COURSE_TYPE_LABELS).map(([value, label]) => ({
    label,
    value: value as CourseType,
  }));
  const departmentOptions = departments.map((department) => ({
    label: department.name,
    value: department.id,
  }));
  const prerequisiteOptions = courses
    .filter((course) => course.id !== initialData?.id)
    .map((course) => ({
      label: `${course.code} ${course.name}`,
      value: course.id,
    }));

  return (
    <Modal
      title={isEdit ? '编辑课程' : '新增课程'}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="保存"
      cancelText="取消"
      width={620}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        {!isEdit && (
          <Form.Item
            name="code"
            label="课程代码"
            rules={[
              { required: true, message: '请输入课程代码' },
              { max: 20, message: '课程代码不能超过20个字符' },
            ]}
          >
            <Input placeholder="请输入课程代码" />
          </Form.Item>
        )}

        <Form.Item
          name="name"
          label="课程名称"
          rules={[
            { required: true, message: '请输入课程名称' },
            { max: 100, message: '课程名称不能超过100个字符' },
          ]}
        >
          <Input placeholder="请输入课程名称" />
        </Form.Item>

        <Form.Item
          name="credits"
          label="学分"
          rules={[{ required: true, message: '请输入学分' }]}
        >
          <InputNumber min={0} max={999} step={0.5} precision={1} style={{ width: '100%' }} />
        </Form.Item>

        {!isEdit && (
          <>
            <Form.Item name="hours" label="学时">
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="courseType" label="课程类型" rules={[{ required: true, message: '请选择课程类型' }]}>
              <Radio.Group options={courseTypeOptions} />
            </Form.Item>

            <Form.Item name="category" label="课程类别">
              <Input placeholder="如：专业必修" />
            </Form.Item>

            <Form.Item name="departmentId" label="所属院系">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="请选择所属院系"
                options={departmentOptions}
              />
            </Form.Item>
          </>
        )}

        <Form.Item name="description" label="课程描述">
          <Input.TextArea rows={3} placeholder="请输入课程描述" />
        </Form.Item>

        {!isEdit && (
          <Form.Item name="assessmentMethod" label="考核方式">
            <Input placeholder="如：平时30% + 期末70%" />
          </Form.Item>
        )}

        <Form.Item name="prerequisiteIds" label="先修课程">
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="请选择先修课程"
            options={prerequisiteOptions}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CourseModal;
