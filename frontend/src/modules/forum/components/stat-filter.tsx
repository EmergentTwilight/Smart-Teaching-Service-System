import { DatePicker, Space, Typography } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { CourseForumSelector } from './course-forum-selector'
import type { CourseOption } from '../types'

const { RangePicker } = DatePicker
const { Text } = Typography

export interface StatFilterValue {
  startDate: Dayjs
  endDate: Dayjs
  courseOfferingId?: string
}

interface StatFilterProps {
  courses: CourseOption[]
  value: StatFilterValue
  onChange: (v: StatFilterValue) => void
  loading?: boolean
}

export function StatFilter({ courses, value, onChange, loading }: StatFilterProps) {
  return (
    <Space wrap size="middle" style={{ marginBottom: 20 }}>
      <Text type="secondary">统计区间</Text>
      <RangePicker
        value={[value.startDate, value.endDate]}
        onChange={(dates) => {
          if (dates?.[0] && dates?.[1]) {
            onChange({
              ...value,
              startDate: dates[0],
              endDate: dates[1],
            })
          }
        }}
        disabledDate={(d) => d.isAfter(dayjs())}
      />
      <CourseForumSelector
        courses={courses}
        value={value.courseOfferingId}
        onChange={(id) => onChange({ ...value, courseOfferingId: id || undefined })}
        loading={loading}
        allowClear
      />
    </Space>
  )
}
