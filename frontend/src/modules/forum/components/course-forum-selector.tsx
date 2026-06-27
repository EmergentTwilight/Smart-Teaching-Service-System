import { Select, Space, Typography } from 'antd'
import { BookOutlined } from '@ant-design/icons'
import type { CourseOption } from '../types'

const { Text } = Typography

function formatCourseLabel(course: CourseOption) {
  return [course.courseCode, course.courseName].filter(Boolean).join(' · ') || course.courseOfferingId
}

interface CourseForumSelectorProps {
  courses: CourseOption[]
  value?: string
  onChange: (id: string) => void
  loading?: boolean
  allowClear?: boolean
}

export function CourseForumSelector({
  courses,
  value,
  onChange,
  loading,
  allowClear,
}: CourseForumSelectorProps) {
  return (
    <Space wrap>
      <BookOutlined style={{ color: '#6366f1' }} />
      <Text type="secondary">当前课程</Text>
      <Select
        style={{ minWidth: 260 }}
        placeholder="选择课程论坛"
        loading={loading}
        allowClear={allowClear}
        value={value || undefined}
        onChange={(v) => onChange(v ?? '')}
        options={courses.map((c) => ({
          value: c.courseOfferingId,
          label: formatCourseLabel(c),
        }))}
      />
    </Space>
  )
}
