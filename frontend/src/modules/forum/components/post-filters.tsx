import { Input, Select, Space } from 'antd'
import { POST_TYPE_LABELS } from '../constants/forum'
import type { PostType } from '../types'

const { Search } = Input

interface PostFiltersProps {
  keyword?: string
  postType?: PostType
  sortBy?: string
  onKeywordChange: (v: string) => void
  onPostTypeChange: (v?: PostType) => void
  onSortChange?: (v: string) => void
  showSort?: boolean
}

export function PostFilters({
  keyword,
  postType,
  sortBy = 'createdAt',
  onKeywordChange,
  onPostTypeChange,
  onSortChange,
  showSort = true,
}: PostFiltersProps) {
  const typeOptions = (Object.keys(POST_TYPE_LABELS) as PostType[]).map((k) => ({
    label: POST_TYPE_LABELS[k],
    value: k,
  }))

  return (
    <Space wrap style={{ marginBottom: 16, width: '100%' }}>
      <Search
        placeholder="搜索帖子标题或内容"
        allowClear
        defaultValue={keyword}
        style={{ width: 280 }}
        onSearch={onKeywordChange}
      />
      <Select
        allowClear
        placeholder="帖子类型"
        style={{ width: 140 }}
        options={typeOptions}
        value={postType}
        onChange={onPostTypeChange}
      />
      {showSort && onSortChange && (
        <Select
          style={{ width: 160 }}
          value={sortBy}
          onChange={onSortChange}
          options={[
            { label: '最新发布', value: 'createdAt' },
            { label: '最多浏览', value: 'viewCount' },
          ]}
        />
      )}
    </Space>
  )
}
