/**
 * 培养方案课程添加/编辑弹窗
 */
import React, { useEffect } from 'react';
import { Form, InputNumber, Modal, Radio, Select } from 'antd';
import type { Course } from '../types/courses';
import type { AddCurriculumCourseDTO, CurriculumCourse } from '../types/curriculums';
import { COURSE_TYPE_LABELS } from '../types/courses';

interface CurriculumCourseModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: AddCurriculumCourseDTO) => void | Promise<void>;
  courses: Course[];
  initialData?: CurriculumCourse;
}

const CurriculumCourseModal: React.FC<CurriculumCourseModalProps> = ({ visible, onClose, onSubmit, courses, initialData }) => {
  const [form] = Form.useForm<AddCurriculumCourseDTO>();
  const isEdit = !!initialData;

  useEffect(() => {
    if (visible && initialData) {
      form.setFieldsValue({
        courseId: initialData.courseId,
        courseType: initialData.courseType,
        semesterSuggestion: initialData.semesterSuggestion || undefined,
      });
      return;
    }
    if (visible) {
      form.resetFields();
      form.setFieldsValue({ courseType: 'REQUIRED' });
    }
  }, [form, initialData, visible]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
      form.resetFields();
      onClose();
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      window.alert(error instanceof Error ? error.message : '培养方案课程信息更新失败');
    }
  };

  const courseOptions = courses.map((course) => ({ label: `${course.code} ${course.name}`, value: course.id }));
  const typeOptions = Object.entries(COURSE_TYPE_LABELS).map(([value, label]) => ({ label, value }));

  return (
    <Modal
      title={isEdit ? `更新课程信息：${initialData.courseCode} ${initialData.courseName}` : '添加课程'}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="保存"
      cancelText="取消"
      width={520}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item name="courseId" label="课程" rules={[{ required: true, message: '请选择课程' }]}>
          <Select disabled={isEdit} showSearch optionFilterProp="label" placeholder="请选择课程" options={courseOptions} />
        </Form.Item>
        <Form.Item name="courseType" label="课程类型" rules={[{ required: true, message: '请选择课程类型' }]}>
          <Radio.Group options={typeOptions} />
        </Form.Item>
        <Form.Item name="semesterSuggestion" label="建议学期">
          <InputNumber min={1} max={20} precision={0} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CurriculumCourseModal;
