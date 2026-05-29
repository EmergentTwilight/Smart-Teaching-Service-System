import { Select, Space, Typography } from 'antd'
import { BookOutlined } from '@ant-design/icons'
import type { CourseOption } from '../types'

const { Text } = Typography

interface CourseForumSelectorProps {
  courses: CourseOption[]
  value?: string
  onChange: (id: string) => void
  loading?: boolean
}

export function CourseForumSelector({
  courses,
  value,
  onChange,
  loading,
}: CourseForumSelectorProps) {
  return (
    <Space wrap>
      <BookOutlined style={{ color: '#6366f1' }} />
      <Text type="secondary">当前课程</Text>
      <Select
        style={{ minWidth: 260 }}
        placeholder="选择课程论坛"
        loading={loading}
        value={value || undefined}
        onChange={onChange}
        options={courses.map((c) => ({
          value: c.courseOfferingId,
          label: `${c.courseCode} · ${c.courseName}`,
        }))}
      />
    </Space>
  )
}
