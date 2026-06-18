/**
 * 培养方案课程批量添加弹窗
 */
import React, { useEffect } from 'react';
import { Button, Form, InputNumber, Modal, Radio, Select, Space } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { Course } from '../types/courses';
import { COURSE_TYPE_LABELS } from '../types/courses';
import type { AddCurriculumCourseDTO } from '../types/curriculums';

interface BatchCourseForm {
  courses: AddCurriculumCourseDTO[];
}

interface CurriculumBatchCourseModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: AddCurriculumCourseDTO[]) => void | Promise<void>;
  courses: Course[];
}

const CurriculumBatchCourseModal: React.FC<CurriculumBatchCourseModalProps> = ({
  visible,
  onClose,
  onSubmit,
  courses,
}) => {
  const [form] = Form.useForm<BatchCourseForm>();

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        courses: [{ courseType: 'REQUIRED' } as AddCurriculumCourseDTO],
      });
    }
  }, [form, visible]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await onSubmit(values.courses);
    form.resetFields();
    onClose();
  };

  const courseOptions = courses.map((course) => ({ label: `${course.code} ${course.name}`, value: course.id }));
  const typeOptions = Object.entries(COURSE_TYPE_LABELS).map(([value, label]) => ({ label, value }));

  return (
    <Modal
      title="批量添加课程"
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="添加"
      cancelText="取消"
      width={760}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.List name="courses">
          {(fields, { add, remove }) => (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {fields.map((field, index) => (
                <Space key={field.key} align="start" style={{ display: 'flex' }}>
                  <Form.Item
                    {...field}
                    name={[field.name, 'courseId']}
                    label={index === 0 ? '课程' : undefined}
                    rules={[{ required: true, message: '请选择课程' }]}
                    style={{ width: 300, marginBottom: 0 }}
                  >
                    <Select showSearch optionFilterProp="label" placeholder="请选择课程" options={courseOptions} />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    name={[field.name, 'courseType']}
                    label={index === 0 ? '课程类型' : undefined}
                    rules={[{ required: true, message: '请选择课程类型' }]}
                    style={{ width: 180, marginBottom: 0 }}
                  >
                    <Radio.Group options={typeOptions} />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    name={[field.name, 'semesterSuggestion']}
                    label={index === 0 ? '建议学期' : undefined}
                    style={{ width: 120, marginBottom: 0 }}
                  >
                    <InputNumber min={1} max={20} precision={0} style={{ width: '100%' }} />
                  </Form.Item>
                  <Button
                    danger
                    type="text"
                    icon={<DeleteOutlined />}
                    disabled={fields.length === 1}
                    onClick={() => remove(field.name)}
                    style={{ marginTop: index === 0 ? 30 : 0 }}
                  />
                </Space>
              ))}
              <Button icon={<PlusOutlined />} onClick={() => add({ courseType: 'REQUIRED' })}>
                添加一行
              </Button>
            </Space>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};

export default CurriculumBatchCourseModal;
