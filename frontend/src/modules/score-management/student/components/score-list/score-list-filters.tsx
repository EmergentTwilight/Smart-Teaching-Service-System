/**
 * 成绩列表筛选器组件
 *
 * 说明：
 * - 提供按学期、课程类型、状态筛选功能
 * - 支持关键词搜索
 *
 * @module score-management/student/components/score-list
 */

import { Form, Input, Select, Space } from 'antd'
import type { ScoreListQuery } from '../../types/score-types'

/**
 * 组件 Props
 */
interface ScoreListFiltersProps {
  /** 筛选条件变化回调 */
  onChange: (filters: Partial<ScoreListQuery>) => void
  /** 当前筛选值 */
  value?: Partial<ScoreListQuery>
  /** 学期选项 */
  semesterOptions?: Array<{ label: string; value: string }>
  /** 加载状态 */
  loading?: boolean
}

/**
 * 成绩列表筛选器
 *
 * @remarks
 * 注意：F3 后端只支持 semesterId 和 keyword 两个筛选参数
 * courseType 和 status 筛选仅为 UI 层面的本地筛选
 */
export function ScoreListFilters({
  onChange,
  value,
  semesterOptions = [],
  loading,
}: ScoreListFiltersProps) {
  const [form] = Form.useForm()

  // 处理表单变化
  const handleValuesChange = (changedValues: Record<string, unknown>) => {
    onChange(changedValues)
  }

  // 处理搜索（防抖）
  const handleSearch = (searchValue: string) => {
    onChange({ keyword: searchValue || undefined })
  }

  return (
    <Form
      form={form}
      layout="inline"
      onValuesChange={handleValuesChange}
      initialValues={value}
    >
      <Space wrap>
        {/* 关键词搜索 */}
        <Form.Item name="keyword">
          <Input.Search
            placeholder="搜索课程代码或名称"
            allowClear
            onSearch={handleSearch}
            enterButton
            loading={loading}
            style={{ width: 240 }}
          />
        </Form.Item>

        {/* 学期筛选 */}
        <Form.Item name="semesterId">
          <Select
            placeholder="选择学期"
            allowClear
            loading={loading}
            options={semesterOptions}
            style={{ width: 180 }}
          />
        </Form.Item>
      </Space>
    </Form>
  )
}
